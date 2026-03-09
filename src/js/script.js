// Configurações baseadas nos PDFs
const wordSequence = [
    "nao", "chao", "dor", "sol", "mar", "cor", "luz", "faz", "lar", "nos",
    "vem", "pe", "rei", "sou", "pao", "bom", "vou", "nao", "mao", "um",
    "mal", "nao", "vos", "nao", "nao", "cor", "pe", "nao", "mar", "sou"
]; // 30 primeiras palavras conforme solicitado

const PRESENTATION_TIME = 500; // ms [cite: 33, 38, 42]
const INTERVAL_TIME = 1500;    // ms [cite: 36, 38, 42]
const TOTAL_TRIAL_TIME = PRESENTATION_TIME + INTERVAL_TIME; // 2000ms 

let currentIdx = 0;
let results = [];
let reactionStartTime = 0;
let hasResponded = false;
let testActive = false;

// --- NAVEGAÇÃO ---
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

// --- TESTE DE ÁUDIO ---
const audioGrid = document.getElementById('audio-options');
const audioList = ["nao", "nos", "rei", "pe", "chao", "faz", "luz", "dor", "pao", "cor"]; // [cite: 27]

audioList.forEach(word => {
    const btn = document.createElement('div');
    btn.className = 'btn-opt';
    btn.innerText = word;
    btn.onclick = () => btn.classList.toggle('selected');
    audioGrid.appendChild(btn);
});

document.getElementById('btn-play-test').onclick = () => {
    const testSounds = ["nao", "pe", "dor"]; // [cite: 26]
    testSounds.forEach((s, i) => {
        setTimeout(() => new Audio(`src/audio/${s}.mp3`).play(), i * 800);
    });
    // Simulação de validação para habilitar o teste
    setTimeout(() => document.getElementById('btn-start-real-test').classList.remove('hidden'), 2000);
};

document.getElementById('btn-start-real-test').onclick = () => {
    showScreen('screen-test-area');
    setTimeout(startMainTest, 2000);
};

// --- LOGICA DO TESTE ---
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
    reactionStartTime = Date.now();
    
    audio.play();

    // Janela de resposta: do início do áudio até o próximo item [cite: 41, 44]
    setTimeout(() => {
        if (!hasResponded) {
            recordData(false, 0); // Omissão ou No-Go correto
        }
        currentIdx++;
        setTimeout(runTrial, INTERVAL_TIME);
    }, PRESENTATION_TIME);
}

// Captura de Teclado
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && testActive && !hasResponded) {
        const rt = Date.now() - reactionStartTime;
        hasResponded = true;
        recordData(true, rt);
    }
});

function recordData(pressed, rt) {
    const word = wordSequence[currentIdx];
    const isNoGo = (word === "nao");
    
    results.push({
        word: word,
        isNoGo: isNoGo,
        pressed: pressed,
        reactionTime: rt,
        // Acerto Go: Pressionou | Acerto No-Go: Não pressionou [cite: 41, 44]
        correct: isNoGo ? !pressed : pressed 
    });
}

// --- MÉTRICAS FINAIS ---
function finishTest() {
    testActive = false;
    showScreen('screen-results');
    
    // Filtros para cálculos
    const goItems = results.filter(r => !r.isNoGo);
    const nogoItems = results.filter(r => r.isNoGo);
    const correctGo = goItems.filter(r => r.pressed);
    
    // 1. Tempo médio de reação (Itens Go Corretos) [cite: 50]
    const avgRT = correctGo.length > 0 
        ? (correctGo.reduce((a, b) => a + b.reactionTime, 0) / correctGo.length).toFixed(2) 
        : 0;

    // 2. Totais [cite: 51, 52, 53]
    const acertosA = correctGo.length;
    const errosOmissaoO = goItems.filter(r => !r.pressed).length;
    const errosAcaoE = nogoItems.filter(r => r.pressed).length;

    // 3. Decréscimo da Vigilância 
    // Comparação: primeiros 15 vs últimos 15 (já que o teste atual tem 30)
    const firstHalf = results.slice(0, 15);
    const lastHalf = results.slice(-15);
    const errorsFirst = firstHalf.filter(r => !r.correct).length;
    const errorsLast = lastHalf.filter(r => !r.correct).length;
    const vigilancia = errorsLast - errorsFirst;

    renderMetrics(avgRT, acertosA, errosOmissaoO, errosAcaoE, vigilancia);
}

function renderMetrics(rt, a, o, e, v) {
    const display = document.getElementById('metrics-display');
    const data = [
        { label: "Média Reação (Go)", val: rt + " ms" },
        { label: "Acertos (A)", val: a },
        { label: "Erros Omissão (O)", val: o },
        { label: "Erros Ação (E)", val: e },
        { label: "Vigilância (Δ Erros)", val: v }
    ];

    display.innerHTML = data.map(item => `
        <div class="metric-card">
            <span class="metric-label">${item.label}</span>
            <span class="metric-value">${item.val}</span>
        </div>
    `).join('');
}