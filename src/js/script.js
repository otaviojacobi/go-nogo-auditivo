const wordSequence = [
    "nao", "chao", "dor", "sol", "mar", "cor", "luz", "faz", "lar", "nos",
    "vem", "pe", "rei", "sou", "pao", "bom", "vou", "nao", "mao", "um",
    "mal", "nao", "vos", "nao", "nao", "cor", "pe", "nao", "mar", "sou"
];

const WORD_LABELS = {
    "nao": "Não", "nos": "Nós", "rei": "Rei", "pe": "Pé",
    "chao": "Chão", "faz": "Faz", "luz": "Luz", "dor": "Dor",
    "pao": "Pão", "cor": "Cor", "mar": "Mar", "sol": "Sol",
    "lar": "Lar", "vem": "Vem", "sou": "Sou", "bom": "Bom",
    "vou": "Vou", "mao": "Mão", "um": "Um", "mal": "Mal",
    "vos": "Vós"
};

const INTERVAL_TIME = 1500;

let currentIdx = 0;
let results = [];
let reactionStartTime = 0;
let hasResponded = false;
let testActive = false;
let presentationWindowOpen = false;
let audioPlayingTest = false;
let audioPlayed = false;

const TEST_WORDS = ["nao", "pe", "dor"];

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

const audioGrid = document.getElementById('audio-options');
const audioList = ["nao", "nos", "rei", "pe", "chao", "faz", "luz", "dor", "pao", "cor"];

audioList.forEach(word => {
    const btn = document.createElement('div');
    btn.className = 'btn-opt';
    btn.dataset.word = word;
    btn.innerText = WORD_LABELS[word] || word;
    btn.onclick = () => {
        btn.classList.toggle('selected');
        checkAudioSelection();
    };
    audioGrid.appendChild(btn);
});

function checkAudioSelection() {
    const selected = new Set(
        [...document.querySelectorAll('#audio-options .btn-opt.selected')].map(b => b.dataset.word)
    );
    const correct = TEST_WORDS.length === selected.size && TEST_WORDS.every(w => selected.has(w));
    document.getElementById('btn-start-instructions').classList.toggle('hidden', !(audioPlayed && correct));
}

function playSequentially(sounds, idx, onDone) {
    if (idx >= sounds.length) { onDone(); return; }
    const audio = new Audio(`src/audio/${sounds[idx]}.mp3`);
    audio.onended = () => playSequentially(sounds, idx + 1, onDone);
    audio.onerror = () => playSequentially(sounds, idx + 1, onDone);
    audio.play().catch(() => playSequentially(sounds, idx + 1, onDone));
}

document.getElementById('btn-play-test').onclick = () => {
    if (audioPlayingTest) return;
    audioPlayingTest = true;
    document.getElementById('btn-play-test').disabled = true;
    playSequentially(TEST_WORDS, 0, () => {
        audioPlayingTest = false;
        document.getElementById('btn-play-test').disabled = false;
        audioPlayed = true;
        checkAudioSelection();
    });
};

document.getElementById('btn-start-instructions').onclick = () => {
    showScreen('screen-instructions');
};

document.getElementById('btn-start-test').onclick = startTest;

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        if (!document.getElementById('screen-instructions').classList.contains('hidden') && !testActive) {
            e.preventDefault();
            startTest();
            return;
        }
        if (testActive && !hasResponded && presentationWindowOpen) {
            e.preventDefault();
            const rt = Date.now() - reactionStartTime;
            hasResponded = true;
            recordData(true, rt);
        }
    }
});

function startTest() {
    showScreen('screen-test-area');
    setTimeout(startMainTest, 2000);
}

function startMainTest() {
    testActive = true;
    runTrial();
}

function runTrial() {
    if (currentIdx >= wordSequence.length) {
        finishTest();
        return;
    }

    const currentWord = wordSequence[currentIdx];
    const audio = new Audio(`src/audio/${currentWord}.mp3`);

    hasResponded = false;
    presentationWindowOpen = true;
    reactionStartTime = Date.now();

    audio.play().catch(() => {});

    audio.onended = () => {
        presentationWindowOpen = false;
        if (!hasResponded) recordData(false, 0);
        currentIdx++;
        setTimeout(runTrial, INTERVAL_TIME);
    };

    audio.onerror = () => {
        presentationWindowOpen = false;
        if (!hasResponded) recordData(false, 0);
        currentIdx++;
        setTimeout(runTrial, INTERVAL_TIME);
    };
}

function recordData(pressed, rt) {
    const word = wordSequence[currentIdx];
    const isNoGo = (word === "nao");
    const status = isNoGo ? (pressed ? "E" : "OK") : (pressed ? "A" : "O");
    results.push({ word, isNoGo, pressed, reactionTime: rt, status });
}

function finishTest() {
    testActive = false;
    showScreen('screen-results');

    const hits = results.filter(r => r.status === "A");
    const avg = hits.length ? (hits.reduce((s, r) => s + r.reactionTime, 0) / hits.length).toFixed(0) : 0;
    const omissions = results.filter(r => r.status === "O").length;
    const falseAlarms = results.filter(r => r.status === "E").length;

    const half = Math.floor(results.length / 2);
    const errorsFirst = results.slice(0, half).filter(r => r.status === "O" || r.status === "E").length;
    const errorsSecond = results.slice(half).filter(r => r.status === "O" || r.status === "E").length;
    const vigilanceDecline = errorsSecond - errorsFirst;

    document.getElementById('metrics-display').innerHTML = [
        { label: "Acertos", val: hits.length },
        { label: "Média RT", val: avg + ' ms' },
        { label: "Erro de omissão", val: omissions },
        { label: "Erro de ação", val: falseAlarms },
        { label: "Decréscimo da Vigilância", val: vigilanceDecline }
    ].map(m => `
        <div class="card">
            <span class="card-label">${m.label}</span>
            <span class="card-value">${m.val}</span>
        </div>
    `).join('');

    drawChart();
    renderDetails();
}

function drawChart() {
    const svg = document.getElementById('rt-chart');
    const container = svg.parentElement;
    const w = container.clientWidth, h = container.clientHeight || 200;
    svg.innerHTML = '';
    const padL = 40, padB = 25, chartH = h - 50, chartW = w - 55;
    let points = [];
    results.forEach((r, i) => {
        const x = padL + (i * (chartW / (results.length - 1 || 1)));
        let y, color;
        if (r.status === "A") {
            color = "#22c55e";
            y = h - padB - ((Math.min(Math.max(r.reactionTime, 100), 500) - 100) / 400 * chartH);
            points.push(`${x},${y}`);
        } else if (r.status === "O") { color = "#facc15"; y = 15; }
        else if (r.status === "E") { color = "#ef4444"; y = h - padB; }
        if (color) {
            const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            c.setAttribute("cx", x); c.setAttribute("cy", y); c.setAttribute("r", "3");
            c.setAttribute("fill", color); svg.appendChild(c);
        }
    });
    if (points.length > 1) {
        const p = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
        p.setAttribute("points", points.join(" "));
        p.setAttribute("fill", "none"); p.setAttribute("stroke", "rgba(34,197,94,0.3)");
        svg.prepend(p);
    }
}

function renderDetails() {
    const rows = results.map((r, i) => {
        const label = WORD_LABELS[r.word] || r.word;
        const statusLabel = { A: 'Acerto', O: 'Erro de omissão', E: 'Erro de ação', OK: 'Correto' }[r.status];
        const color = { A: '#22c55e', O: '#facc15', E: '#ef4444', OK: '#94a3b8' }[r.status];
        return `<tr>
            <td>${i + 1}</td>
            <td>${label}</td>
            <td>${r.isNoGo ? 'No-Go' : 'Go'}</td>
            <td style="color:${color}">${statusLabel}</td>
            <td>${r.status === 'A' ? r.reactionTime + ' ms' : '-'}</td>
        </tr>`;
    }).join('');
    document.getElementById('detalhes-resultados').innerHTML = `
        <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:0.9rem">
            <thead><tr><th>#</th><th>Palavra</th><th>Tipo</th><th>Resultado</th><th>RT</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
}
