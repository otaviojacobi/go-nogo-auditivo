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

function downloadCSV() {
    const fields = ['indice', 'palavra', 'tipo', 'pressionou', 'tempo_reacao_ms', 'status'];
    const rows = state.results.map((r, i) => [
        i + 1,
        r.word,
        r.isNoGo ? 'No-Go' : 'Go',
        r.pressed ? 'sim' : 'nao',
        r.reactionTime,
        r.status
    ]);
    const headerRow = ['campo', ...rows.map((_, i) => i + 1)];
    const fieldRows = fields.map((field, fi) => [field, ...rows.map(row => row[fi])]);
    const csv = [headerRow, ...fieldRows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resultados-go-nogo-auditivo-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

document.getElementById('btn-download-csv').onclick = downloadCSV;
