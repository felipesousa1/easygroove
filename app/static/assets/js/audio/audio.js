// assets/js/audio.js - MOTOR DE ÁUDIO (TONE.JS)

import { scoreState } from '../core/state.js';
import { TIME_SIGNATURES } from '../core/constants.js';

// MetalSynth (rimshot) usa a assinatura (nota, duração, tempo, velocidade); sem a nota, "tempo" e
// "velocidade" eram lidos como duração/tempo e os disparos lançavam "Start time must be strictly greater..."
const RIMSHOT_NOTE = 320;

export const audioEngine = {
    isPlaying: false,
    isPaused: false,
    hasSeekPosition: false, // playhead posicionado manualmente enquanto parado
    runId: 0, // identifica cada execução; eventos agendados por uma execução antiga não afetam a nova
    isInitialized: false,
    metronomeEnabled: false,
    metronomeVolume: 100,
    loopEventId: null,

    masterLimiter: null,
    masterBus: null,
    channels: {},
    synths: {},
    metronomeSynth: null,

    init() {
        if (this.isInitialized) return;

        // Limiter Master para evitar estouro de áudio em rajadas rápidas
        this.masterLimiter = new Tone.Limiter(-3).toDestination();
        // Bus mestre antes do limitador: a soma de vários instrumentos tocando juntos passava de 0 dB
        this.masterBus = new Tone.Volume(0).connect(this.masterLimiter);

        scoreState.instruments.forEach(inst => {
            this.initInstrumentChannel(inst);
        });

        // Sintetizador do Metrônomo
        this.metronomeSynth = new Tone.MembraneSynth({
            pitchDecay: 0.005,
            octaves: 2,
            oscillator: { type: "sine" },
            envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 }
        }).connect(this.masterLimiter);

        Tone.Transport.bpm.value = scoreState.bpm;
        this.updateMasterGain();
        this.isInitialized = true;
    },

    // Compensa a soma dos instrumentos audíveis (≈ -5 dB por década de instrumentos: 7 => -4 dB; 1 => 0 dB)
    updateMasterGain() {
        if (!this.masterBus) return;
        const audible = scoreState.instruments.filter(i => !i.hidden && i.volume > 0).length;
        this.masterBus.volume.rampTo(-5 * Math.log10(Math.max(1, audible)), 0.05);
    },

    // Descarta todo o grafo de áudio e o estado do Transport. Depois do reset, o próximo init()/start()
    // reconstrói tudo do zero (idêntico à primeira reprodução após carregar a página).
    reset() {
        this.runId++;
        try {
            Tone.Transport.stop();
            Tone.Transport.cancel(0);
            Tone.Transport.ticks = 0;
            Tone.Transport.loop = false;
        } catch (e) { }

        const dispose = (node) => { try { node?.dispose?.(); } catch (e) { } };
        Object.values(this.synths).forEach(group => group && Object.values(group).forEach(dispose));
        Object.values(this.channels).forEach(dispose);
        dispose(this.metronomeSynth);
        dispose(this.masterBus);
        dispose(this.masterLimiter);

        this.synths = {};
        this.channels = {};
        this.metronomeSynth = null;
        this.masterBus = null;
        this.masterLimiter = null;
        this.isInitialized = false;
        this.isPlaying = false;
        this.isPaused = false;
        this.hasSeekPosition = false;
    },

    toggleMetronome() {
        this.metronomeEnabled = !this.metronomeEnabled;
        const btnMetronome = document.getElementById("btn-metronome");
        const toggleInput = document.getElementById("popover-metronome-toggle");

        if (btnMetronome) btnMetronome.classList.toggle("active", this.metronomeEnabled);
        if (toggleInput) toggleInput.checked = this.metronomeEnabled;

        return this.metronomeEnabled;
    },

    setMetronomeVolume(vol) {
        this.metronomeVolume = Math.min(Math.max(vol, 0), 100);
    },

    triggerMetronomeClick(isAccent, time) {
        if (!this.metronomeEnabled || !this.metronomeSynth || this.metronomeVolume <= 0) return;

        const pitch = isAccent ? "C5" : "C4";
        const volFactor = this.metronomeVolume / 100;
        const velocity = (isAccent ? 1.0 : 0.6) * volFactor;

        this.metronomeSynth.triggerAttackRelease(pitch, "32n", time, velocity);
    },

    calculateDb(volume) {
        if (volume <= 0) return -Infinity;
        return ((volume - 50) / 50) * 24 - 4.5;
    },

    initInstrumentChannel(inst) {
        const destination = this.masterBus || this.masterLimiter || Tone.getDestination();

        if (!this.channels[inst.id]) {
            this.channels[inst.id] = new Tone.Volume(this.calculateDb(inst.volume)).connect(destination);
        } else {
            this.setInstrumentVolume(inst.id, inst.volume);
        }

        if (!this.synths[inst.id]) {
            this.synths[inst.id] = this.createSynthsForInstrument(inst.id);
        }
    },

    setInstrumentVolume(instId, volume) {
        if (this.channels[instId]) {
            const db = this.calculateDb(volume);
            this.channels[instId].volume.rampTo(db, 0.03);
        }
    },

    createSynthsForInstrument(instId, isOffline = false) {
        const baseType = instId.split("_")[0];
        const destination = this.masterLimiter || Tone.getDestination();
        const channel = isOffline ? Tone.getDestination() : (this.channels[instId] || onlineDestination);
        
        if (baseType.startsWith("surdo")) {
            const pitch = baseType === "surdo1" ? "C1" : baseType === "surdo2" ? "G1" : "C2";
            // MembraneSynth monofônico dedicado evita acúmulo de vozes sobrepostas
            const synth = new Tone.MembraneSynth({
                pitchDecay: 0.02,
                octaves: 2.5,
                oscillator: { type: "sine" },
                envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.04 }
            }).connect(channel);

            return { main: synth, defaultPitch: pitch };
        }

        if (baseType === "caixa") {
            const rimshotConfig = {
                frequency: 320, envelope: { attack: 0.001, decay: 0.05, release: 0.04 },
                harmonicity: 4.1, modulationIndex: 28, resonance: 2500, octaves: 1.2
            };
            const aroConfig = {
                pitchDecay: 0.01, octaves: 2, oscillator: { type: "square" },
                envelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.03 }
            };

            return {
                pele: new Tone.MembraneSynth({
                    pitchDecay: 0.02, octaves: 2.5, oscillator: { type: "triangle" },
                    envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.04 }
                }).connect(channel),
                esteira: new Tone.NoiseSynth({
                    noise: { type: "white" },
                    envelope: { attack: 0.001, decay: 0.06, sustain: 0 }
                }).connect(channel),
                aro: new Tone.MembraneSynth(aroConfig).connect(channel),
                rimshot: new Tone.MetalSynth(rimshotConfig).connect(channel)
            };
        }

        if (baseType === "repique") {
            const rimshotConfig = {
                frequency: 320, envelope: { attack: 0.001, decay: 0.05, release: 0.04 },
                harmonicity: 4.1, modulationIndex: 28, resonance: 2500, octaves: 1.2
            };
            const aroConfig = {
                pitchDecay: 0.01, octaves: 2, oscillator: { type: "square" },
                envelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.03 }
            };

            return {
                main: new Tone.MembraneSynth({
                    pitchDecay: 0.02, octaves: 3, oscillator: { type: "sine" },
                    envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.04 }
                }).connect(channel),
                aro: new Tone.MembraneSynth(aroConfig).connect(channel),
                rimshot: new Tone.MetalSynth(rimshotConfig).connect(channel)
            };
        }

        if (baseType === "chocalho") {
            const chocalhoFilter = new Tone.Filter(3500, "highpass").connect(channel);
            return {
                filter: chocalhoFilter,
                noise: new Tone.NoiseSynth({
                    noise: { type: "pink" },
                    envelope: { attack: 0.003, decay: 0.03, sustain: 0 }
                }).connect(chocalhoFilter)
            };
        }

        if (baseType === "tamborim") {
            return {
                main: new Tone.MembraneSynth({
                    pitchDecay: 0.02, octaves: 2.5, oscillator: { type: "triangle" },
                    envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.03 }
                }).connect(channel)
            };
        }

        return {};
    },

    // O Tone lança "Start time must be strictly greater than previous start time" se uma mesma fonte for
    // reiniciada no mesmo instante (ou em instante já passado, que ele corrige para o relógio atual).
    // Garante tempos estritamente crescentes por sintetizador, mesmo quando um disparo chega atrasado.
    startTime(synth, time) {
        this._lastStart = this._lastStart || new WeakMap();
        // Folga de 15 ms sobre o relógio: o currentTime avança durante o próprio callback e o Tone
        // "corrige" tempos já passados para o relógio atual, o que igualaria disparos seguidos.
        let t = Math.max(time, Tone.context.currentTime + 0.015);
        const last = this._lastStart.get(synth);
        // O Tone compara com tolerância (~1e-6): diferenças de ponto flutuante (1.956 × 1.9560000000000002)
        // contam como "mesmo instante" e lançam o erro, então o passo mínimo precisa ser folgado (2 ms)
        if (last !== undefined && t < last + 0.002) t = last + 0.002;
        this._lastStart.set(synth, t);
        return t;
    },

    triggerStroke(inst, stroke, time) {
        if (!stroke || inst.volume <= 0) return;

        const execTime = time || Tone.now();
        const instSynths = this.synths[inst.id];
        if (!instSynths) return;

        const baseType = inst.id.split("_")[0];

        if (baseType.startsWith("surdo")) {
            if (stroke === "pele-aberto") {
                instSynths.main.triggerAttackRelease(instSynths.defaultPitch, "32n", this.startTime(instSynths.main, execTime), 0.9);
            } else if (stroke === "abafado") {
                instSynths.main.triggerAttackRelease("D1", "32n", this.startTime(instSynths.main, execTime), 0.5);
            }
        } else if (baseType === "caixa") {
            if (stroke === "pele-aberto") {
                instSynths.pele.triggerAttackRelease("F2", "32n", this.startTime(instSynths.pele, execTime), 0.85);
                instSynths.esteira.triggerAttackRelease("32n", this.startTime(instSynths.esteira, execTime), 0.55);
            } else if (stroke === "fantasma") {
                instSynths.pele.triggerAttackRelease("E2", "32n", this.startTime(instSynths.pele, execTime), 0.25);
                instSynths.esteira.triggerAttackRelease("32n", this.startTime(instSynths.esteira, execTime), 0.12);
            } else if (stroke === "aro") {
                instSynths.aro.triggerAttackRelease("A4", "32n", this.startTime(instSynths.aro, execTime), 0.55);
            } else if (stroke === "rimshot") {
                instSynths.pele.triggerAttackRelease("A2", "32n", this.startTime(instSynths.pele, execTime), 0.95);
                instSynths.rimshot.triggerAttackRelease(RIMSHOT_NOTE, "32n", this.startTime(instSynths.rimshot, execTime), 0.8);
            } else if (stroke === "rufo") {
                for (let r = 0; r < 3; r++) {
                    const subTime = Tone.Time(execTime).toSeconds() + (r * 0.02);
                    instSynths.esteira.triggerAttackRelease("32n", this.startTime(instSynths.esteira, subTime), 0.35 - (r * 0.07));
                }
            }
        } else if (baseType === "repique") {
            if (stroke === "pele-aberto") {
                instSynths.main.triggerAttackRelease("D3", "32n", this.startTime(instSynths.main, execTime), 0.9);
            } else if (stroke === "rimshot") {
                instSynths.main.triggerAttackRelease("F3", "32n", this.startTime(instSynths.main, execTime), 0.95);
                instSynths.rimshot.triggerAttackRelease(RIMSHOT_NOTE, "32n", this.startTime(instSynths.rimshot, execTime), 0.65);
            } else if (stroke === "aro") {
                instSynths.aro.triggerAttackRelease("B4", "32n", this.startTime(instSynths.aro, execTime), 0.6);
            } else if (stroke === "slap") {
                instSynths.main.triggerAttackRelease("G3", "32n", this.startTime(instSynths.main, execTime), 0.95);
                instSynths.aro.triggerAttackRelease("D5", "32n", this.startTime(instSynths.aro, execTime), 0.45);
            } else if (stroke === "rufo") {
                for (let r = 0; r < 3; r++) {
                    const subTime = Tone.Time(execTime).toSeconds() + (r * 0.02);
                    instSynths.main.triggerAttackRelease("D3", "32n", this.startTime(instSynths.main, subTime), 0.45);
                }
            }
        } else if (baseType === "chocalho") {
            if (stroke === "chocalho-frente") {
                if (instSynths.filter) instSynths.filter.frequency.setValueAtTime(4200, execTime);
                instSynths.noise.triggerAttackRelease("32n", this.startTime(instSynths.noise, execTime), 0.8);
            } else if (stroke === "chocalho-tras") {
                if (instSynths.filter) instSynths.filter.frequency.setValueAtTime(3200, execTime);
                instSynths.noise.triggerAttackRelease("32n", this.startTime(instSynths.noise, execTime), 0.45);
            }
        } else if (baseType === "tamborim") {
            if (stroke === "tamborim-chapado") {
                instSynths.main.triggerAttackRelease("A3", "32n", this.startTime(instSynths.main, execTime), 0.9);
            } else if (stroke === "tamborim-ponta") {
                instSynths.main.triggerAttackRelease("F#3", "32n", this.startTime(instSynths.main, execTime), 0.7);
            } else if (stroke === "abafado") {
                instSynths.main.triggerAttackRelease("A3", "32n", this.startTime(instSynths.main, execTime), 0.35);
            } else if (stroke === "aro") {
                instSynths.main.triggerAttackRelease("E4", "32n", this.startTime(instSynths.main, execTime), 0.55);
            }
        }
    },

    triggerOfflineStroke(inst, stroke, time) {
        if (!this.isInitialized) this.init();
        this.triggerStroke(inst, stroke, time);
    },

    async previewStroke(instId, strokeType) {
        if (this.isPlaying || !strokeType) return;
        if (!this.isInitialized) this.init();
        await Tone.start();

        const inst = scoreState.instruments.find(i => i.id === instId);
        if (!inst) return;

        const effectiveInst = inst.volume > 0 ? inst : { ...inst, volume: 80 };
        if (inst.volume <= 0) this.initInstrumentChannel(effectiveInst);

        this.triggerStroke(effectiveInst, strokeType, Tone.now());
    },

    getPlaybackSequence() {
        const sequence = [];
        let m = 0;
        const repeats = (scoreState.repeats || []).slice().sort((a, b) => a.start - b.start);

        while (m < scoreState.measuresCount) {
            const repeat = repeats.find(r => r.start === m);

            if (repeat && repeat.end >= repeat.start && repeat.end < scoreState.measuresCount) {
                const repeatCount = repeat.times || 2;
                for (let count = 0; count < repeatCount; count++) {
                    for (let stepM = repeat.start; stepM <= repeat.end; stepM++) {
                        sequence.push(stepM);
                    }
                }
                m = repeat.end + 1;
            } else {
                sequence.push(m);
                m++;
            }
        }

        return sequence;
    },

    // Loop "armado" (ativo, mas ainda sem intervalo escolhido) não repete nada
    isLoopActive() {
        return scoreState.loopState.active && !scoreState.loopState.empty;
    },

    getLoopTickLimits() {
        const ppq = Tone.Transport.PPQ;
        let startTicks = 0;
        let endTicks = 0;

        const sequence = this.getPlaybackSequence();

        for (let i = 0; i < sequence.length; i++) {
            const mIdx = sequence[i];
            const sig = scoreState.measuresConfig?.[mIdx]?.timeSignature || scoreState.timeSignature || "4/4";
            const cfg = TIME_SIGNATURES[sig] || TIME_SIGNATURES["4/4"];
            const measureTicks = cfg.beats * ppq;

            if (mIdx < scoreState.loopState.startMeasure) startTicks += measureTicks;
            if (mIdx < scoreState.loopState.endMeasure) endTicks += measureTicks;
        }

        // Modo livre: soma o deslocamento (em subdivisões) dentro do compasso inicial/final
        const unitTicks = (m) => {
            const sig = scoreState.measuresConfig?.[m]?.timeSignature || scoreState.timeSignature || "4/4";
            const cfg = TIME_SIGNATURES[sig] || TIME_SIGNATURES["4/4"];
            return ppq / cfg.subdivisions;
        };
        const { startMeasure, endMeasure, startUnit = 0, endUnit = 0 } = scoreState.loopState;
        if (sequence.includes(startMeasure)) startTicks += Math.round(startUnit * unitTicks(startMeasure));
        if (sequence.includes(endMeasure)) endTicks += Math.round(endUnit * unitTicks(endMeasure));

        return { startTicks, endTicks };
    },

    updateTransportSettings() {
        if (!this.isInitialized) return;
        Tone.Transport.bpm.value = scoreState.bpm;

        if (this.isLoopActive()) {
            const { startTicks, endTicks } = this.getLoopTickLimits();
            if (endTicks > startTicks) {
                Tone.Transport.loop = true;
                Tone.Transport.loopStart = Tone.Time(startTicks, "i").toSeconds();
                Tone.Transport.loopEnd = Tone.Time(endTicks, "i").toSeconds();
            }
        } else {
            Tone.Transport.loop = false;
        }
    },

    cutAllSound() {
        Object.values(this.synths).forEach(synthGroup => {
            if (!synthGroup) return;
            Object.values(synthGroup).forEach(synth => {
                if (!synth) return;
                try {
                    if (typeof synth.releaseAll === 'function') synth.releaseAll();
                    else if (typeof synth.triggerRelease === 'function') synth.triggerRelease(Tone.now());
                } catch (e) { }
            });
        });
    },

    // Assinatura da estrutura (compassos, métricas e repetições): só ela exige reagendar a reprodução.
    // Notas, volumes, instrumentos ocultos etc. são lidos do scoreState no momento em que cada tempo toca.
    getStructureSignature() {
        const sigs = [];
        for (let m = 0; m < scoreState.measuresCount; m++) {
            sigs.push(scoreState.measuresConfig?.[m]?.timeSignature || scoreState.timeSignature || "4/4");
        }
        const repeats = (scoreState.repeats || []).map(r => [r.start, r.end, r.times]);
        // Quantas subdivisões cada tempo usa define em quais ticks os eventos são agendados
        const subdivisions = sigs.map((_, m) => this.getBeatSubdivisionOptions(m).map(opts => opts.join("")).join(","));
        return JSON.stringify([scoreState.measuresCount, sigs, repeats, subdivisions, this.isLoopActive()]);
    },

    // Para cada tempo do compasso, a lista de subdivisões distintas usadas pelos instrumentos
    getBeatSubdivisionOptions(mIdx) {
        const sig = scoreState.measuresConfig?.[mIdx]?.timeSignature || scoreState.timeSignature || "4/4";
        const cfg = TIME_SIGNATURES[sig] || TIME_SIGNATURES["4/4"];
        const result = [];
        for (let b = 0; b < cfg.beats; b++) {
            const subs = new Set();
            scoreState.instruments.forEach(inst => {
                const beatObj = inst.pattern?.[mIdx]?.[b];
                if (beatObj?.subdivisions) subs.add(beatObj.subdivisions);
            });
            result.push([...subs].sort((a, c) => a - c));
        }
        return result;
    },

    // Toca uma posição (subdivisão) lendo o estado atual da partitura no instante em que ela soa,
    // o que permite editar durante a reprodução. Cada posição tem seu próprio evento no Transport
    // (nada é agendado para o futuro no áudio), então pausar/parar corta o som imediatamente.
    playSlot(mIdx, b, subdivisions, s, time) {
        scoreState.instruments.forEach(inst => {
            if (inst.hidden) return;
            const beatObj = inst.pattern?.[mIdx]?.[b];
            if (!beatObj || beatObj.subdivisions !== subdivisions) return;

            const stroke = beatObj.notes[s];
            if (!stroke) return;
            // Instrumentos criados/duplicados durante a reprodução ainda não têm canal de áudio
            if (!this.synths[inst.id]) this.initInstrumentChannel(inst);

            // Um erro em um instrumento não pode calar os outros nem interromper o relógio do Transport
            try {
                this.triggerStroke(inst, stroke, time);
            } catch (err) {
                this.reportStrokeError(inst, stroke, err);
            }
        });
    },

    // Registra cada tipo de erro de síntese só uma vez, para não inundar o console
    reportStrokeError(inst, stroke, err) {
        this._reportedErrors = this._reportedErrors || new Set();
        const key = `${inst.id.split("_")[0]}:${stroke}:${err?.message}`;
        if (this._reportedErrors.has(key)) return;
        this._reportedErrors.add(key);
        console.warn(`[EasyGroove] Falha ao tocar "${stroke}" em ${inst.name || inst.id}:`, err);
    },

    schedulePlaybackSequence() {
        Tone.Transport.cancel(0);

        const sequence = this.getPlaybackSequence();
        const ppq = Tone.Transport.PPQ;
        let accumulatedTicks = 0;

        this.scheduledSequence = [];
        this.scheduleSignature = this.getStructureSignature();
        const runId = this.runId;

        for (let i = 0; i < sequence.length; i++) {
            const mIdx = sequence[i];
            const sig = scoreState.measuresConfig?.[mIdx]?.timeSignature || scoreState.timeSignature || "4/4";
            const cfg = TIME_SIGNATURES[sig] || TIME_SIGNATURES["4/4"];
            const measureTicks = cfg.beats * ppq;

            const subdivisionOptions = this.getBeatSubdivisionOptions(mIdx);

            for (let b = 0; b < cfg.beats; b++) {
                const beatTick = accumulatedTicks + b * ppq;

                Tone.Transport.schedule((time) => {
                    this.triggerMetronomeClick(b === 0, time);
                }, beatTick + "i");

                subdivisionOptions[b].forEach(subdivisions => {
                    for (let slot = 0; slot < subdivisions; slot++) {
                        const slotTick = beatTick + Math.round(slot * ppq / subdivisions);
                        Tone.Transport.schedule((time) => {
                            this.playSlot(mIdx, b, subdivisions, slot, time);
                        }, slotTick + "i");
                    }
                });
            }

            this.scheduledSequence.push({ mIdx, ticks: measureTicks });
            accumulatedTicks += measureTicks;
        }

        if (!this.isLoopActive()) {
            Tone.Transport.schedule((time) => {
                Tone.Draw.schedule(() => {
                    // Se outra execução já começou (troca rápida), este fim não pode parar a nova
                    if (runId !== this.runId) return;
                    this.stop();
                    const btnPlay = document.getElementById("btn-play");
                    const playIconImg = document.getElementById("play-icon-img");
                    if (btnPlay) btnPlay.classList.remove("active");
                    if (playIconImg) playIconImg.src = "assets/icons/play.svg";
                }, time);
            }, accumulatedTicks + "i");
        }
    },

    // Chamado após qualquer alteração na partitura: se a estrutura mudou durante a reprodução (ou pausa),
    // reagenda e mantém o cursor no mesmo compasso/posição em vez de quebrar ou reiniciar
    syncWithScore() {
        if (!this.isInitialized || !(this.isPlaying || this.isPaused)) return;
        if (this.getStructureSignature() === this.scheduleSignature) return;

        const oldSequence = this.scheduledSequence || [];
        let oldIdx = -1;
        let ticksInto = 0;
        let acc = 0;
        const currentTicks = Tone.Transport.ticks;

        for (let i = 0; i < oldSequence.length; i++) {
            if (currentTicks < acc + oldSequence[i].ticks) {
                oldIdx = i;
                ticksInto = currentTicks - acc;
                break;
            }
            acc += oldSequence[i].ticks;
        }
        const oldMeasure = oldIdx >= 0 ? oldSequence[oldIdx].mIdx : 0;

        this.schedulePlaybackSequence();
        this.updateTransportSettings();

        const seq = this.scheduledSequence;
        if (seq.length === 0) return;

        // Prefere a mesma posição na sequência; senão a primeira ocorrência do compasso; senão o mais próximo
        let newIdx = oldIdx >= 0 && seq[oldIdx]?.mIdx === oldMeasure ? oldIdx : seq.findIndex(s => s.mIdx === oldMeasure);
        if (newIdx < 0) newIdx = seq.findIndex(s => s.mIdx >= oldMeasure);
        if (newIdx < 0) newIdx = seq.length - 1;

        let newTicks = seq.slice(0, newIdx).reduce((sum, s) => sum + s.ticks, 0)
            + Math.min(ticksInto, seq[newIdx].ticks - 1);

        if (this.isLoopActive()) {
            const { startTicks, endTicks } = this.getLoopTickLimits();
            if (endTicks > startTicks && (newTicks < startTicks || newTicks >= endTicks)) newTicks = startTicks;
        }

        Tone.Transport.ticks = newTicks;
        if (window.updatePlayheadPosition) window.updatePlayheadPosition();
    },

    // Limites (em ticks) em que o playhead pode ficar: dentro do loop ativo ou do arranjo inteiro
    getSeekLimits() {
        if (this.isLoopActive()) {
            const { startTicks, endTicks } = this.getLoopTickLimits();
            return { min: startTicks, max: Math.max(startTicks, endTicks - 1) };
        }
        const total = this.getPlaybackSequence().length
            ? this.scheduledSequenceTotalTicks()
            : 0;
        return { min: 0, max: Math.max(0, total - 1) };
    },

    scheduledSequenceTotalTicks() {
        const ppq = Tone.Transport.PPQ;
        return this.getPlaybackSequence().reduce((sum, mIdx) => {
            const sig = scoreState.measuresConfig?.[mIdx]?.timeSignature || scoreState.timeSignature || "4/4";
            return sum + (TIME_SIGNATURES[sig] || TIME_SIGNATURES["4/4"]).beats * ppq;
        }, 0);
    },

    // Converte {compasso, subdivisão} em ticks; com repetições, usa a passada mais próxima do cursor
    getTickForPosition(measure, unit) {
        const ppq = Tone.Transport.PPQ;
        const current = Tone.Transport.ticks;
        let acc = 0;
        let best = null;

        this.getPlaybackSequence().forEach(mIdx => {
            const sig = scoreState.measuresConfig?.[mIdx]?.timeSignature || scoreState.timeSignature || "4/4";
            const cfg = TIME_SIGNATURES[sig] || TIME_SIGNATURES["4/4"];
            const measureTicks = cfg.beats * ppq;

            if (mIdx === measure) {
                const distance = current < acc ? acc - current : Math.max(0, current - (acc + measureTicks));
                if (!best || distance < best.distance) {
                    best = { distance, tick: acc + Math.round(unit * ppq / cfg.subdivisions) };
                }
            }
            acc += measureTicks;
        });

        return best ? best.tick : null;
    },

    // Move o cursor de reprodução (tocando, pausado ou parado), respeitando loop e limites do arranjo
    seekToTicks(ticks) {
        const { min, max } = this.getSeekLimits();
        const target = Math.min(Math.max(Math.round(ticks), min), max);

        Tone.Transport.ticks = target;
        if (!this.isPlaying && !this.isPaused) this.hasSeekPosition = true;

        if (window.updatePlayheadPosition) window.updatePlayheadPosition();
    },

    async start() {
        if (!this.isInitialized) this.init();
        if (!this.isPaused) this.runId++; // retomar após pausa continua a mesma execução
        await Tone.start();

        this.updateTransportSettings();
        this.updateMasterGain();

        if (!this.isPaused) {
            this.schedulePlaybackSequence();

            if (this.hasSeekPosition) {
                // Começa de onde o playhead foi posicionado manualmente (dentro dos limites atuais)
                const { min, max } = this.getSeekLimits();
                Tone.Transport.ticks = Math.min(Math.max(Tone.Transport.ticks, min), max);
            } else if (this.isLoopActive()) {
                const { startTicks } = this.getLoopTickLimits();
                Tone.Transport.ticks = startTicks;
            } else {
                Tone.Transport.ticks = 0;
            }
            this.hasSeekPosition = false;
        }

        // Um pequeno adiantamento evita que o primeiro tempo seja agendado "no passado"
        Tone.Transport.start("+0.05");
        this.isPlaying = true;
        this.isPaused = false;

        if (window.startPlayheadAnimation) window.startPlayheadAnimation();
    },

    pause() {
        if (!this.isPlaying) return;

        Tone.Transport.pause();
        this.cutAllSound();

        this.isPlaying = false;
        this.isPaused = true;
        if (window.pausePlayheadAnimation) window.pausePlayheadAnimation();
    },

    stop() {
        this.runId++;
        Tone.Transport.stop();
        this.cutAllSound();

        this.isPlaying = false;
        this.isPaused = false;
        this.hasSeekPosition = false;

        if (this.isLoopActive()) {
            const { startTicks } = this.getLoopTickLimits();
            Tone.Transport.ticks = startTicks;
        } else {
            Tone.Transport.ticks = 0;
        }

        if (window.stopPlayheadAnimation) window.stopPlayheadAnimation();
    }
};

window.audioEngine = audioEngine;