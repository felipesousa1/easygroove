// assets/js/audio.js - MOTOR DE ÁUDIO (TONE.JS)

import { scoreState } from './state.js';
import { TIME_SIGNATURES } from './constants.js';

export const audioEngine = {
    isPlaying: false,
    isPaused: false,
    isInitialized: false,
    loopEventId: null,

    channels: {},
    synths: {},

    init() {
        if (this.isInitialized) return;

        scoreState.instruments.forEach(inst => {
            this.initInstrumentChannel(inst);
        });

        Tone.Transport.bpm.value = scoreState.bpm;
        this.isInitialized = true;
    },

    calculateDb(volume) {
        if (volume <= 0) return -Infinity;
        return ((volume - 50) / 50) * 24 - 4.5;
    },

    initInstrumentChannel(inst) {
        if (!this.channels[inst.id]) {
            this.channels[inst.id] = new Tone.Volume(this.calculateDb(inst.volume)).toDestination();
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

        // Quando offline, ignoramos este.channels (que pertence ao contexto online) e conectamos diretamente em Tone.getDestination()
        const channel = isOffline ? Tone.getDestination() : (this.channels[instId] || Tone.getDestination());

        if (baseType.startsWith("surdo")) {
            const pitch = baseType === "surdo1" ? "C1" : baseType === "surdo2" ? "G1" : "C2";
            const surdoConfig = {
                pitchDecay: 0.05, octaves: 4, oscillator: { type: "sine" },
                envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 0.5 }
            };
            const synth = new Tone.PolySynth(Tone.MembraneSynth, surdoConfig).connect(channel);
            return { main: synth, defaultPitch: pitch };
        }

        if (baseType === "caixa") {
            const rimshotConfig = {
                frequency: 320, envelope: { attack: 0.001, decay: 0.06, release: 0.05 },
                harmonicity: 4.1, modulationIndex: 28, resonance: 2500, octaves: 1.2
            };
            const aroConfig = {
                pitchDecay: 0.01, octaves: 2, oscillator: { type: "square" },
                envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.04 }
            };

            return {
                pele: new Tone.PolySynth(Tone.MembraneSynth, {
                    pitchDecay: 0.02, octaves: 3, oscillator: { type: "triangle" },
                    envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.15 }
                }).connect(channel),
                esteira: new Tone.NoiseSynth({
                    noise: { type: "white" },
                    envelope: { attack: 0.001, decay: 0.14, sustain: 0 }
                }).connect(channel),
                aro: new Tone.PolySynth(Tone.MembraneSynth, aroConfig).connect(channel),
                rimshot: new Tone.MetalSynth(rimshotConfig).connect(channel)
            };
        }

        if (baseType === "repique") {
            const rimshotConfig = {
                frequency: 320, envelope: { attack: 0.001, decay: 0.06, release: 0.05 },
                harmonicity: 4.1, modulationIndex: 28, resonance: 2500, octaves: 1.2
            };
            const aroConfig = {
                pitchDecay: 0.01, octaves: 2, oscillator: { type: "square" },
                envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.04 }
            };

            return {
                main: new Tone.PolySynth(Tone.MembraneSynth, {
                    pitchDecay: 0.03, octaves: 5, oscillator: { type: "sine" },
                    envelope: { attack: 0.001, decay: 0.18, sustain: 0.01, release: 0.2 }
                }).connect(channel),
                aro: new Tone.PolySynth(Tone.MembraneSynth, aroConfig).connect(channel),
                rimshot: new Tone.MetalSynth(rimshotConfig).connect(channel)
            };
        }

        if (baseType === "chocalho") {
            const chocalhoFilter = new Tone.Filter(3500, "highpass").connect(channel);
            return {
                filter: chocalhoFilter,
                noise: new Tone.NoiseSynth({
                    noise: { type: "pink" },
                    envelope: { attack: 0.008, decay: 0.05, sustain: 0 }
                }).connect(chocalhoFilter)
            };
        }

        if (baseType === "tamborim") {
            return {
                main: new Tone.PolySynth(Tone.MembraneSynth, {
                    pitchDecay: 0.04, octaves: 4, oscillator: { type: "triangle" },
                    envelope: { attack: 0.001, decay: 0.09, sustain: 0.01, release: 0.08 }
                }).connect(channel)
            };
        }

        return {};
    },

    triggerStroke(inst, stroke, time) {
        if (!stroke || inst.volume <= 0) return;

        const execTime = time || Tone.now();
        const instSynths = this.synths[inst.id];
        if (!instSynths) return;

        const baseType = inst.id.split("_")[0];

        if (baseType.startsWith("surdo")) {
            if (stroke === "pele-aberto") {
                instSynths.main.triggerAttackRelease(instSynths.defaultPitch, "4n", execTime, 1.0);
            } else if (stroke === "abafado") {
                instSynths.main.triggerAttackRelease("D1", "16n", execTime, 0.5);
            }
        } else if (baseType === "caixa") {
            if (stroke === "pele-aberto") {
                instSynths.pele.triggerAttackRelease("F2", "16n", execTime, 0.9);
                instSynths.esteira.triggerAttackRelease("16n", execTime, 0.6);
            } else if (stroke === "fantasma") {
                instSynths.pele.triggerAttackRelease("E2", "32n", execTime, 0.3);
                instSynths.esteira.triggerAttackRelease("32n", execTime, 0.15);
            } else if (stroke === "aro") {
                instSynths.aro.triggerAttackRelease("A4", "32n", execTime, 0.6);
            } else if (stroke === "rimshot") {
                instSynths.pele.triggerAttackRelease("A2", "16n", execTime, 1.0);
                instSynths.rimshot.triggerAttackRelease("16n", execTime, 0.85);
            } else if (stroke === "rufo") {
                for (let r = 0; r < 3; r++) {
                    const subTime = Tone.Time(execTime).toSeconds() + (r * 0.025);
                    instSynths.esteira.triggerAttackRelease(0.015, subTime, 0.4 - (r * 0.08));
                }
            }
        } else if (baseType === "repique") {
            if (stroke === "pele-aberto") {
                instSynths.main.triggerAttackRelease("D3", "16n", execTime, 0.95);
            } else if (stroke === "rimshot") {
                instSynths.main.triggerAttackRelease("F3", "16n", execTime, 1.0);
                instSynths.rimshot.triggerAttackRelease("32n", execTime, 0.7);
            } else if (stroke === "aro") {
                instSynths.aro.triggerAttackRelease("B4", "32n", execTime, 0.65);
            } else if (stroke === "slap") {
                instSynths.main.triggerAttackRelease("G3", "32n", execTime, 1.0);
                instSynths.aro.triggerAttackRelease("D5", "32n", execTime, 0.5);
            } else if (stroke === "rufo") {
                for (let r = 0; r < 3; r++) {
                    const subTime = Tone.Time(execTime).toSeconds() + (r * 0.022);
                    instSynths.main.triggerAttackRelease("D3", 0.015, subTime, 0.5);
                }
            }
        } else if (baseType === "chocalho") {
            if (stroke === "chocalho-frente") {
                if (instSynths.filter) instSynths.filter.frequency.setValueAtTime(4200, execTime);
                instSynths.noise.triggerAttackRelease("16n", execTime, 0.85);
            } else if (stroke === "chocalho-tras") {
                if (instSynths.filter) instSynths.filter.frequency.setValueAtTime(3200, execTime);
                instSynths.noise.triggerAttackRelease("32n", execTime, 0.5);
            }
        } else if (baseType === "tamborim") {
            if (stroke === "tamborim-chapado") {
                instSynths.main.triggerAttackRelease("A3", "16n", execTime, 1.0);
            } else if (stroke === "tamborim-ponta") {
                instSynths.main.triggerAttackRelease("F#3", "16n", execTime, 0.75);
            } else if (stroke === "abafado") {
                instSynths.main.triggerAttackRelease("A3", "32n", execTime, 0.4);
            } else if (stroke === "aro") {
                instSynths.main.triggerAttackRelease("E4", "32n", execTime, 0.6);
            }
        }
    },

    // Dispara o som de um toque em um tempo específico durante a renderização offline
    triggerOfflineStroke(inst, stroke, time) {
        if (!this.isInitialized) {
            this.init();
        }
        this.triggerStroke(inst, stroke, time);
    },

    async previewStroke(instId, strokeType) {
        if (this.isPlaying || !strokeType) return;

        if (!this.isInitialized) {
            this.init();
        }
        await Tone.start();

        const inst = scoreState.instruments.find(i => i.id === instId);
        if (!inst) return;

        const effectiveInst = inst.volume > 0 ? inst : { ...inst, volume: 80 };
        if (inst.volume <= 0) {
            this.initInstrumentChannel(effectiveInst);
        }

        this.triggerStroke(effectiveInst, strokeType, Tone.now());
    },

    getPlaybackSequence() {
        const sequence = [];
        let m = 0;

        // Garante array ordenado para evitar conflitos de índices
        const repeats = (scoreState.repeats || []).slice().sort((a, b) => a.start - b.start);

        while (m < scoreState.measuresCount) {
            // Encontra um ritornelo que COMEÇA exatamente no compasso atual m
            const repeat = repeats.find(r => r.start === m);

            if (repeat && repeat.end >= repeat.start && repeat.end < scoreState.measuresCount) {
                const repeatCount = repeat.times || 2;

                // Adiciona a sequência inteira do ritornelo (do start ao end) N vezes
                for (let count = 0; count < repeatCount; count++) {
                    for (let stepM = repeat.start; stepM <= repeat.end; stepM++) {
                        sequence.push(stepM);
                    }
                }
                // Avança o ponteiro principal para logo após o término do ritornelo
                m = repeat.end + 1;
            } else {
                sequence.push(m);
                m++;
            }
        }

        return sequence;
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

            if (mIdx < scoreState.loopState.startMeasure) {
                startTicks += measureTicks;
            }
            if (mIdx < scoreState.loopState.endMeasure) {
                endTicks += measureTicks;
            }
        }

        return { startTicks, endTicks };
    },

    updateTransportSettings() {
        if (!this.isInitialized) return;
        Tone.Transport.bpm.value = scoreState.bpm;

        if (scoreState.loopState.active) {
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

    // Função para cortar instantaneamente qualquer som residual (caudas de prato, etc)
    cutAllSound() {
        Object.values(this.synths).forEach(synthGroup => {
            if (!synthGroup) return;
            Object.values(synthGroup).forEach(synth => {
                if (synth && typeof synth.releaseAll === 'function') {
                    try { synth.releaseAll(); } catch (e) { }
                }
            });
        });
    },

    // Novo Agendamento Nativo (Substitui o schedulePlaybackLoop antigo)
    schedulePlaybackSequence() {
        // Limpa a linha do tempo inteira antes de reagendar
        Tone.Transport.cancel(0);

        const sequence = this.getPlaybackSequence();
        const ppq = Tone.Transport.PPQ;
        let accumulatedTicks = 0;

        for (let i = 0; i < sequence.length; i++) {
            const mIdx = sequence[i];
            const sig = scoreState.measuresConfig?.[mIdx]?.timeSignature || scoreState.timeSignature || "4/4";
            const cfg = TIME_SIGNATURES[sig] || TIME_SIGNATURES["4/4"];
            const measureTicks = cfg.beats * ppq;

            scoreState.instruments.forEach(inst => {
                if (inst.hidden) return;
                const measureData = inst.pattern && inst.pattern[mIdx];
                if (!measureData) return;

                for (let b = 0; b < cfg.beats; b++) {
                    const beatObj = measureData[b];
                    if (!beatObj) continue;

                    const ticksPerSub = ppq / beatObj.subdivisions;

                    for (let s = 0; s < beatObj.subdivisions; s++) {
                        const stroke = beatObj.notes[s];
                        if (stroke) {
                            // Calcula o tick exato desta nota na linha do tempo global
                            const noteTick = accumulatedTicks + (b * ppq) + Math.round(s * ticksPerSub);

                            // Agenda a nota nativamente no Transport
                            Tone.Transport.schedule((time) => {
                                this.triggerStroke(inst, stroke, time);
                            }, noteTick + "i");
                        }
                    }
                }
            });

            accumulatedTicks += measureTicks;
        }

        // Se não estiver em loop, agenda o Stop automático no exato tick final do arranjo
        if (!scoreState.loopState.active) {
            Tone.Transport.schedule((time) => {
                Tone.Draw.schedule(() => {
                    this.stop();
                    const btnPlay = document.getElementById("btn-play");
                    const playIconImg = document.getElementById("play-icon-img");
                    if (btnPlay) btnPlay.classList.remove("active");
                    if (playIconImg) playIconImg.src = "assets/icons/play.svg";
                }, time);
            }, accumulatedTicks + "i");
        }
    },

    async start() {
        if (!this.isInitialized) this.init();
        await Tone.start();

        this.updateTransportSettings();

        // Só reagenda as notas se for um Play do zero (não um despause)
        if (!this.isPaused) {
            this.schedulePlaybackSequence();

            if (scoreState.loopState.active) {
                const { startTicks } = this.getLoopTickLimits();
                Tone.Transport.ticks = startTicks;
            } else {
                Tone.Transport.ticks = 0;
            }
        }

        Tone.Transport.start();
        this.isPlaying = true;
        this.isPaused = false;

        if (window.startPlayheadAnimation) window.startPlayheadAnimation();
    },

    pause() {
        if (!this.isPlaying) return;

        Tone.Transport.pause(); // Pausa o relógio instantaneamente
        this.cutAllSound();     // Corta caldas sonoras residuais

        this.isPlaying = false;
        this.isPaused = true;
        if (window.pausePlayheadAnimation) window.pausePlayheadAnimation();
    },

    stop() {
        Tone.Transport.stop();
        this.cutAllSound();

        this.isPlaying = false;
        this.isPaused = false;

        // Retorna a agulha para o início correto
        if (scoreState.loopState.active) {
            const { startTicks } = this.getLoopTickLimits();
            Tone.Transport.ticks = startTicks;
        } else {
            Tone.Transport.ticks = 0;
        }

        if (window.stopPlayheadAnimation) window.stopPlayheadAnimation();
    }
};

window.audioEngine = audioEngine;