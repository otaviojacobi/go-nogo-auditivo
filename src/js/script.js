const SEQ_TRIAL = [
    "luz","mao","pao","sim","chao","sim","pe","mar","rei","sou",
    "lar","sim","faz","dor","cor","sol","nos","bom","sim","sim"
];

const SEQ_OFICIAL = [
    "sim","chao","dor","sol","mar","cor","luz","faz","lar","nos",
    "vem","pe","rei","sou","pao","bom","vou","sim","mao","um",
    "mal","sim","vos","sim","sim","cor","pe","sim","mar","sou",
    "luz","dor","sol","rei","nos","faz","sim","vos","vou","mao",
    "sim","lar","pao","vem","chao","sim","bom","um","sim","sim",
    "sim","mao","dor","mar","sol","vou","lar","nos","luz","cor",
    "faz","sou","pe","pao","sim","chao","rei","bom","sim","sim",
    "um","sim","sim","vos","vem","sim","sim","sim","vou","luz",
    "mao","pao","sim","chao","sim","pe","mar","rei","sou","lar",
    "sim","faz","dor","cor","sol","nos","bom","sim","sim","um",
    "sim","um","vos","sim","sim","sim","pao","luz","lar","dor",
    "cor","mar","sol","faz","mao","sim","vou","chao","sim","nos",
    "bom","sou","pe","sim","vem","sim","rei","sim","um","sim",
    "sim","sim","pao","vou","luz","dor","mao","lar","cor","sim",
    "sol","mar","nos","faz","sim","pe","bom","chao","sim","sou",
    "rei","sim","sim","vem","sim","sim","sim","um","sim","vos",
    "sim","sim","sim","pao","dor","luz","mao","vou","lar","cor",
    "sol","mar","faz","nos","sim","pe","bom","sim","chao","sou",
    "rei","sim","sim","vem","sim","um","vos","sim","sim","sim",
    "pao","luz","mao","vou","dor","lar","cor","sol","mar","faz",
    "rei","sim","sim","vem","sim","um","vos","sim","sim","sim",
    "dor","pao","luz","mao","vou","lar","cor","sol","mar","faz",
    "nos","sim","pe","bom","sim","chao","sou","sim","rei","sim",
    "vem","sim","um","sim","vos","sim","sim","sim","dor","pao",
    "luz","mao","vou","lar","cor","sol","mar","faz","nos","sim",
    "pe","bom","sim","chao","sou","sim","rei","sim","vem","sim",
    "um","sim","vos","sim","sim","sim","dor","pao","luz","mao",
    "vou","lar","cor","sol","mar","faz","nos","sim","pe","bom",
    "chao","sou","rei","sim","sim","vem","sim","um","sim","vos",
    "sim","sim","vou","mao","dor","pao","luz","sim","vou","lar"
];

const WORD_LABELS = {
    "sim": "Sim", "nao": "Não", "nos": "Nós", "rei": "Rei", "pe": "Pé",
    "chao": "Chão", "faz": "Faz", "luz": "Luz", "dor": "Dor",
    "pao": "Pão", "cor": "Cor", "mar": "Mar", "sol": "Sol",
    "lar": "Lar", "vem": "Vem", "sou": "Sou", "bom": "Bom",
    "vou": "Vou", "mao": "Mão", "um": "Um", "mal": "Mal",
    "vos": "Vós"
};

const INTERVAL_TIME = 1500;
const TEST_WORDS = ["sim", "pe", "dor"];

let state = {
    currentIdx: 0,
    results: [],
    seq: [],
    isOfficial: false,
    isRunning: false,
    lockNavigation: false,
    reactionStartTime: 0,
    hasResponded: false,
    testActive: false,
    presentationWindowOpen: false,
    aborted: false
};

let audioPlayingTest = false;
let audioPlayed = false;
let currentAudio = null;

const ABORT_CODE = "end42";
let abortBuffer = "";
let abortBufferTimer = null;

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

const audioGrid = document.getElementById('audio-options');
const audioList = ["sim", "nos", "rei", "pe", "chao", "faz", "luz", "dor", "pao", "cor"];

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

document.getElementById('btn-start-test').onclick = startTrialPhase;
document.getElementById('btn-start-official').onclick = () => {
    if (!state.lockNavigation && !state.isRunning) startOfficialPhase();
};

window.addEventListener('keydown', (e) => {
    if (e.code !== 'Space') return;

    if (state.testActive && !state.hasResponded && state.presentationWindowOpen) {
        e.preventDefault();
        const rt = Date.now() - state.reactionStartTime;
        state.hasResponded = true;
        recordData(true, rt);
        return;
    }

    if (state.isRunning) return;

    if (!document.getElementById('screen-instructions').classList.contains('hidden')) {
        e.preventDefault();
        startTrialPhase();
        return;
    }

    if (!document.getElementById('screen-post-trial').classList.contains('hidden') && !state.lockNavigation) {
        e.preventDefault();
        startOfficialPhase();
    }
});

function startTrialPhase() {
    if (state.isRunning) return;
    state.seq = SEQ_TRIAL;
    state.isOfficial = false;
    state.currentIdx = 0;
    state.results = [];
    state.isRunning = true;
    state.aborted = false;
    showScreen('screen-test-area');
    setTimeout(startMainTest, 2000);
}

function startOfficialPhase() {
    if (state.isRunning) return;
    state.seq = SEQ_OFICIAL;
    state.isOfficial = true;
    state.currentIdx = 0;
    state.results = [];
    state.isRunning = true;
    state.aborted = false;
    showScreen('screen-test-area');
    setTimeout(startMainTest, 2000);
}

function startMainTest() {
    state.testActive = true;
    runTrial();
}

function runTrial() {
    if (state.aborted) return;
    if (state.currentIdx >= state.seq.length) {
        finishTest();
        return;
    }

    const currentWord = state.seq[state.currentIdx];
    const audio = new Audio(`src/audio/${currentWord}.mp3`);
    currentAudio = audio;

    state.hasResponded = false;
    state.presentationWindowOpen = true;
    state.reactionStartTime = Date.now();

    audio.play().catch(() => {});

    const advance = () => {
        if (state.aborted) return;
        state.presentationWindowOpen = false;
        if (!state.hasResponded) recordData(false, 0);
        state.currentIdx++;
        setTimeout(runTrial, INTERVAL_TIME);
    };

    audio.onended = advance;
    audio.onerror = advance;
}

function recordData(pressed, rt) {
    const word = state.seq[state.currentIdx];
    const isNoGo = (word === "sim");
    const status = isNoGo ? (pressed ? "E" : "OK") : (pressed ? "A" : "O");
    state.results.push({ word, isNoGo, pressed, reactionTime: rt, status });
}

function finishTest() {
    state.testActive = false;
    state.isRunning = false;
    currentAudio = null;

    if (state.isOfficial) {
        showScreen('screen-results');
        renderResults();
    } else {
        startCoolDown();
    }
}

function abortTest() {
    if (!state.isRunning) return;
    state.aborted = true;
    state.testActive = false;
    state.presentationWindowOpen = false;
    state.isRunning = false;
    if (currentAudio) {
        currentAudio.onended = null;
        currentAudio.onerror = null;
        try { currentAudio.pause(); } catch (_) {}
        currentAudio = null;
    }
    if (!state.results.length) {
        location.reload();
        return;
    }
    showScreen('screen-results');
    renderResults();
}

window.addEventListener('keydown', (e) => {
    if (e.key.length !== 1 || !/[a-z0-9]/i.test(e.key)) return;
    abortBuffer = (abortBuffer + e.key.toLowerCase()).slice(-ABORT_CODE.length);
    clearTimeout(abortBufferTimer);
    abortBufferTimer = setTimeout(() => { abortBuffer = ""; }, 2000);
    if (abortBuffer === ABORT_CODE) {
        abortBuffer = "";
        abortTest();
    }
});

function startCoolDown() {
    state.lockNavigation = true;
    showScreen('screen-post-trial');

    const btnOfficial = document.getElementById('btn-start-official');
    let timer = 10;
    btnOfficial.disabled = true;
    btnOfficial.style.opacity = "0.5";
    btnOfficial.innerText = `AGUARDE (${timer}s)`;

    const countdown = setInterval(() => {
        timer--;
        btnOfficial.innerText = `AGUARDE (${timer}s)`;
        if (timer <= 0) {
            clearInterval(countdown);
            state.lockNavigation = false;
            btnOfficial.disabled = false;
            btnOfficial.style.opacity = "1";
            btnOfficial.innerText = "ESPAÇO";
        }
    }, 1000);
}

function renderResults() {
    const results = state.results;
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
    const results = state.results;
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
    const rows = state.results.map((r, i) => {
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
