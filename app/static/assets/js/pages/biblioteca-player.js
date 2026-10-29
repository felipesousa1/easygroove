// Ouvir um arranjo direto da biblioteca (botão play no card).
// Reaproveita o motor de áudio do editor. Tone.js e o motor são pré-carregados quando a página fica
// ociosa (ou ao passar o mouse no play), e o JSON do arranjo é pré-buscado, para o clique ser imediato.
import { scoreState } from '../core/state.js';
import { TIME_SIGNATURES } from '../core/constants.js';

const TONE_URL = "https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js";
const LOAD_TIMEOUT_MS = 10000;
const UNLOCK_TIMEOUT_MS = 5000;
const CACHE_TTL_MS = 5 * 60 * 1000;

let engine = null;
let tonePromise = null;
let enginePromise = null;
let activeCard = null;
let monitor = null;
let watchdog = null;
let outputMeter = null;
const arrangementCache = new Map(); // id -> { promise, time }

function showError(message) {
    window.libActions?.showToast(message, { isError: true, duration: 5000 });
}

// Nenhuma etapa pode ficar pendente para sempre (senão a fila de plays trava)
function withTimeout(promise, ms, message) {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function loadTone() {
    if (window.Tone) return Promise.resolve();
    if (!tonePromise) {
        tonePromise = new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = TONE_URL;
            script.onload = resolve;
            script.onerror = () => {
                tonePromise = null; // permite tentar de novo no próximo play
                script.remove();
                reject(new Error("Não foi possível carregar o áudio. Verifique sua conexão."));
            };
            document.head.appendChild(script);
        });
    }
    return tonePromise;
}

function getEngine() {
    if (engine) return Promise.resolve(engine);
    if (!enginePromise) {
        enginePromise = loadTone()
            .then(() => import("../audio/audio.js"))
            .then(module => {
                engine = module.audioEngine;
                return engine;
            })
            .catch(err => {
                enginePromise = null;
                throw err;
            });
    }
    return enginePromise;
}

// Arranjo em cache (pré-buscado no hover); falhas não ficam guardadas
function fetchArrangement(id) {
    const cached = arrangementCache.get(id);
    if (cached && Date.now() - cached.time < CACHE_TTL_MS) return cached.promise;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), LOAD_TIMEOUT_MS);

    const promise = fetch(`/api/arrangements/${id}`, { credentials: "same-origin", signal: controller.signal })
        .then(res => {
            if (!res.ok) throw new Error("Não foi possível carregar o arranjo.");
            return res.json();
        })
        .catch(err => {
            arrangementCache.delete(id);
            throw err.name === "AbortError" ? new Error("Tempo esgotado ao carregar o arranjo.") : err;
        })
        .finally(() => clearTimeout(timer));

    arrangementCache.set(id, { promise, time: Date.now() });
    return promise;
}

function resetCard() {
    clearInterval(monitor);
    clearInterval(watchdog);
    monitor = null;
    watchdog = null;
    if (activeCard) {
        activeCard.classList.remove("is-playing");
        activeCard.querySelector(".lib-card-play")?.classList.remove("is-loading");
    }
    activeCard = null;
}

// Cada pedido de play/stop recebe um número; respostas de pedidos antigos (rede, áudio) são descartadas
let requestId = 0;
let queue = Promise.resolve();

function stopPlayback() {
    requestId++;
    if (engine && (engine.isPlaying || engine.isPaused)) engine.stop();
    resetCard();
}

// Carrega o arranjo no estado usado pelo motor de áudio (sem herdar dados do anterior)
function applyArrangement(data) {
    Object.assign(scoreState, {
        bpm: 90,
        timeSignature: "4/4",
        measuresCount: 1,
        measuresConfig: [],
        repeats: [],
    }, data);

    scoreState.loopState = {
        active: false, mode: "measures", empty: false,
        startMeasure: 0, endMeasure: scoreState.measuresCount, startUnit: 0, endUnit: 0,
    };
}

// Há alguma nota em instrumento audível (não oculto e com volume)? Evita "tocar" em silêncio sem explicar
function hasAudibleNotes() {
    return scoreState.instruments.some(inst => {
        if (inst.hidden || inst.volume <= 0) return false;
        return (inst.pattern || []).some(measure =>
            Array.isArray(measure) && measure.some(beat =>
                (beat?.notes || []).some(stroke => stroke && stroke !== "empty")
            )
        );
    });
}

// Cria o grafo de áudio do arranjo carregado e inicia a reprodução
async function startEngine(audio) {
    if (!audio.isInitialized) audio.init();
    scoreState.instruments.forEach(inst => {
        audio.initInstrumentChannel(inst);
        audio.setInstrumentVolume(inst.id, inst.volume);
    });
    await audio.start();
}

// Segundos até a primeira nota audível (para saber quando já deveria haver som)
function firstNoteSeconds(audio) {
    const ppq = Tone.Transport.PPQ;
    let ticks = 0;
    for (const mIdx of audio.getPlaybackSequence()) {
        const sig = scoreState.measuresConfig?.[mIdx]?.timeSignature || scoreState.timeSignature || "4/4";
        const beats = (TIME_SIGNATURES[sig] || TIME_SIGNATURES["4/4"]).beats;
        for (let b = 0; b < beats; b++) {
            for (const inst of scoreState.instruments) {
                if (inst.hidden || inst.volume <= 0) continue;
                const beat = inst.pattern?.[mIdx]?.[b];
                const slot = (beat?.notes || []).findIndex(n => n && n !== "empty");
                if (slot >= 0) return ((ticks + b * ppq + (slot / beat.subdivisions) * ppq) / ppq) * (60 / scoreState.bpm);
            }
        }
        ticks += beats * ppq;
    }
    return 0;
}

// Vigia a saída: se o arranjo tem notas mas nada soa, reconstrói o motor e tenta de novo (uma vez)
function watchForSilence(audio, card, id, attempt = 0) {
    if (!outputMeter) {
        outputMeter = new Tone.Meter({ smoothing: 0 });
        Tone.getDestination().connect(outputMeter);
    }

    const deadline = Math.min(firstNoteSeconds(audio) + 1.2, 10); // segundos após iniciar
    const startedAt = performance.now();
    let peak = -Infinity;

    clearInterval(watchdog);
    watchdog = setInterval(async () => {
        if (id !== requestId) return clearInterval(watchdog);
        const level = outputMeter.getValue();
        if (typeof level === "number" && level > peak) peak = level;

        if (peak > -60) return clearInterval(watchdog); // há som
        if (document.visibilityState !== "visible") return; // timers lentos em aba oculta: não conclui nada
        if ((performance.now() - startedAt) / 1000 < deadline) return;

        clearInterval(watchdog);
        console.warn("[EasyGroove] Reprodução silenciosa detectada", {
            attempt, ctx: Tone.context.state, transport: Tone.Transport.state, ticks: Tone.Transport.ticks,
        });

        if (attempt >= 1) {
            audio.stop();
            resetCard();
            showError("Não foi possível reproduzir o áudio deste arranjo. Recarregue a página e tente de novo.");
            return;
        }

        // Tentativa de recuperação: motor novo, mesmo arranjo
        try {
            audio.stop();
            audio.reset();
            await withTimeout(Tone.start(), UNLOCK_TIMEOUT_MS, "O navegador bloqueou o áudio.");
            if (id !== requestId) return;
            await startEngine(audio);
            if (id !== requestId) return audio.stop();
            watchForSilence(audio, card, id, attempt + 1);
        } catch (err) {
            if (id !== requestId) return;
            resetCard();
            showError(err.message || "Não foi possível reproduzir o áudio.");
        }
    }, 30);
}

async function play(card, id) {
    const isStale = () => id !== requestId;
    if (isStale()) return; // pedido antigo: sai da fila na hora

    try {
        const [audio, arrangement] = await withTimeout(
            Promise.all([getEngine(), fetchArrangement(card.dataset.cardId)]),
            LOAD_TIMEOUT_MS,
            "Tempo esgotado ao carregar o arranjo."
        );
        if (isStale()) return;

        // Recomeça sempre de um motor limpo: o resultado é idêntico ao da primeira reprodução depois de
        // carregar a página (estado antigo de nós/Transport era a causa de segundas reproduções mudas)
        audio.stop();
        audio.reset();

        applyArrangement(arrangement.score_data || {});
        audio.metronomeEnabled = false;

        if (!hasAudibleNotes()) {
            throw new Error("Este arranjo não tem notas audíveis (instrumentos mudos, ocultos ou vazios).");
        }

        // O navegador pode manter o áudio bloqueado: confirma que o contexto está ativo antes de tocar
        await withTimeout(Tone.start(), UNLOCK_TIMEOUT_MS, "O navegador bloqueou o áudio. Clique no play novamente.");
        if (isStale()) return;

        await startEngine(audio);

        // Outro card foi acionado (ou o play foi cancelado) enquanto o áudio iniciava
        if (isStale()) {
            audio.stop();
            return;
        }

        if (Tone.context.state !== "running") {
            audio.stop();
            throw new Error("O navegador bloqueou o áudio. Clique no play novamente.");
        }

        card.querySelector(".lib-card-play")?.classList.remove("is-loading");
        card.classList.add("is-playing");

        // O motor se para sozinho ao fim do arranjo: volta o botão para "play"
        monitor = setInterval(() => {
            if (!audio.isPlaying && !audio.isPaused) resetCard();
        }, 400);

        watchForSilence(audio, card, id);
    } catch (err) {
        if (isStale()) return;
        resetCard();
        showError(err.message || "Não foi possível tocar o arranjo.");
    }
}

document.addEventListener("click", (e) => {
    const button = e.target.closest(".lib-card-play");
    if (!button) return;

    e.stopPropagation();
    e.preventDefault();

    const card = button.closest(".lib-card");
    if (card === activeCard) {
        // Só para se já estiver tocando; durante o carregamento o clique extra é ignorado
        if (card.classList.contains("is-playing")) stopPlayback();
        return;
    }

    // Libera o áudio dentro do gesto do clique (o navegador só permite assim)
    if (window.Tone && Tone.context.state !== "running") Tone.start().catch(() => { });

    // Parar o anterior imediatamente e iniciar o novo em fila (um por vez, sem corrida entre eles)
    stopPlayback();
    const id = requestId;
    activeCard = card;
    button.classList.add("is-loading");
    queue = queue.then(() => play(card, id)).catch(() => { });
}, true);

// Pré-carregamento: motor de áudio quando a página fica ociosa; arranjo ao passar o mouse no play
function preloadEngine() {
    getEngine().catch(() => { });
}

document.addEventListener("pointerover", (e) => {
    const button = e.target.closest(".lib-card-play");
    if (!button) return;
    preloadEngine();
    fetchArrangement(button.closest(".lib-card").dataset.cardId).catch(() => { });
});

function schedulePreload() {
    if ("requestIdleCallback" in window) requestIdleCallback(preloadEngine, { timeout: 3000 });
    else setTimeout(preloadEngine, 1500);
}

if (document.readyState === "complete") schedulePreload();
else window.addEventListener("load", schedulePreload, { once: true });

// Exportar o arranjo em .wav (renderização offline, a mesma do editor)
let exporting = false;

document.addEventListener("click", async (e) => {
    const button = e.target.closest(".btn-action-export-wav");
    if (!button) return;

    e.stopPropagation();
    document.querySelectorAll(".lib-card-dropdown.active").forEach(d => d.classList.remove("active"));
    if (exporting) return;
    exporting = true;

    try {
        stopPlayback();

        const res = await fetch(`/api/arrangements/${button.dataset.id}`, { credentials: "same-origin" });
        if (!res.ok) throw new Error("Não foi possível carregar o arranjo.");
        const arrangement = await res.json();

        const audio = await getEngine();
        const { exportScoreToAudio } = await import("../services/export.js");

        applyArrangement(arrangement.score_data || {});
        scoreState.title = arrangement.name;
        if (!audio.isInitialized) audio.init();

        await exportScoreToAudio();
    } catch (err) {
        showError(err.message || "Não foi possível exportar o áudio.");
    } finally {
        exporting = false;
    }
});

// Para o áudio quando a lista é refeita (o card tocando pode sair da tela) e ao sair da página
document.body.addEventListener("htmx:beforeSwap", (e) => {
    if (e.target.id === "arrangements-grid") {
        stopPlayback();
        arrangementCache.clear();
    }
});
window.addEventListener("pagehide", stopPlayback);
