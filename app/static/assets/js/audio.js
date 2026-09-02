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

        this.createSynthesizers();

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
    },

    setInstrumentVolume(instId, volume) {
        if (this.channels[instId]) {
            const db = this.calculateDb(volume);
            this.channels[instId].volume.rampTo(db, 0.03);
        }
    },

    createSynthesizers() {
        const surdoConfig = {
            pitchDecay: 0.05, octaves: 4, oscillator: { type: "sine" },
            envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 0.5 }
        };
        this.synths.surdo1 = new Tone.MembraneSynth(surdoConfig);
        this.synths.surdo2 = new Tone.MembraneSynth(surdoConfig);
        this.synths.surdo3 = new Tone.MembraneSynth(surdoConfig);

        this.synths.caixaPele = new Tone.MembraneSynth({
            pitchDecay: 0.02, octaves: 3, oscillator: { type: "triangle" },
            envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.15 }
        });

        this.synths.caixaEsteira = new Tone.NoiseSynth({
            noise: { type: "white" },
            envelope: { attack: 0.001, decay: 0.14, sustain: 0 }
        });

        this.synths.repique = new Tone.MembraneSynth({
            pitchDecay: 0.03, octaves: 5, oscillator: { type: "sine" },
            envelope: { attack: 0.001, decay: 0.18, sustain: 0.01, release: 0.2 }
        });

        const rimshotConfig = {
            frequency: 320, envelope: { attack: 0.001, decay: 0.06, release: 0.05 },
            harmonicity: 4.1, modulationIndex: 28, resonance: 2500, octaves: 1.2
        };
        this.synths.rimshotCaixa = new Tone.MetalSynth(rimshotConfig);
        this.synths.rimshotRepique = new Tone.MetalSynth(rimshotConfig);

        const aroConfig = {
            pitchDecay: 0.01, octaves: 2, oscillator: { type: "square" },
            envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.04 }
        };
        this.synths.aroCaixa = new Tone.MembraneSynth(aroConfig);
        this.synths.aroRepique = new Tone.MembraneSynth(aroConfig);

        this.chocalhoFilter = new Tone.Filter(3500, "highpass").toDestination();
        this.synths.chocalho = new Tone.NoiseSynth({
            noise: { type: "pink" },
            envelope: { attack: 0.008, decay: 0.05, sustain: 0 }
        }).connect(this.chocalhoFilter);

        this.synths.tamborim = new Tone.MembraneSynth({
            pitchDecay: 0.04, octaves: 4, oscillator: { type: "triangle" },
            envelope: { attack: 0.001, decay: 0.09, sustain: 0.01, release: 0.08 }
        });
    },

    triggerStroke(inst, stroke, time) {
        if (!stroke || inst.volume <= 0) return;

        const execTime = time || Tone.now();
        const channel = this.channels[inst.id] || Tone.Destination;
        const baseType = inst.id.split("_")[0];

        switch (baseType) {
            case "surdo1":
                this.synths.surdo1.disconnect().connect(channel);
                if (stroke === "pele-aberto") {
                    this.synths.surdo1.triggerAttackRelease("C1", "4n", execTime, 1.0);
                } else if (stroke === "abafado") {
                    this.synths.surdo1.triggerAttackRelease("D1", "16n", execTime, 0.5);
                }
                break;

            case "surdo2":
                this.synths.surdo2.disconnect().connect(channel);
                if (stroke === "pele-aberto") {
                    this.synths.surdo2.triggerAttackRelease("G1", "4n", execTime, 0.95);
                } else if (stroke === "abafado") {
                    this.synths.surdo2.triggerAttackRelease("A1", "16n", execTime, 0.5);
                }
                break;

            case "surdo3":
                this.synths.surdo3.disconnect().connect(channel);
                if (stroke === "pele-aberto") {
                    this.synths.surdo3.triggerAttackRelease("C2", "8n", execTime, 0.9);
                } else if (stroke === "abafado") {
                    this.synths.surdo3.triggerAttackRelease("D2", "16n", execTime, 0.45);
                }
                break;

            case "caixa":
                this.synths.caixaPele.disconnect().connect(channel);
                this.synths.caixaEsteira.disconnect().connect(channel);
                this.synths.aroCaixa.disconnect().connect(channel);
                this.synths.rimshotCaixa.disconnect().connect(channel);

                if (stroke === "pele-aberto") {
                    this.synths.caixaPele.triggerAttackRelease("F2", "16n", execTime, 0.9);
                    this.synths.caixaEsteira.triggerAttackRelease("16n", execTime, 0.6);
                } else if (stroke === "fantasma") {
                    this.synths.caixaPele.triggerAttackRelease("E2", "32n", execTime, 0.3);
                    this.synths.caixaEsteira.triggerAttackRelease("32n", execTime, 0.15);
                } else if (stroke === "aro") {
                    this.synths.aroCaixa.triggerAttackRelease("A4", "32n", execTime, 0.6);
                } else if (stroke === "rimshot") {
                    this.synths.caixaPele.triggerAttackRelease("A2", "16n", execTime, 1.0);
                    this.synths.rimshotCaixa.triggerAttackRelease("16n", execTime, 0.85);
                } else if (stroke === "rufo") {
                    for (let r = 0; r < 3; r++) {
                        const subTime = Tone.Time(execTime).toSeconds() + (r * 0.025);
                        this.synths.caixaEsteira.triggerAttackRelease(0.015, subTime, 0.4 - (r * 0.08));
                    }
                }
                break;

            case "repique":
                this.synths.repique.disconnect().connect(channel);
                this.synths.aroRepique.disconnect().connect(channel);
                this.synths.rimshotRepique.disconnect().connect(channel);

                if (stroke === "pele-aberto") {
                    this.synths.repique.triggerAttackRelease("D3", "16n", execTime, 0.95);
                } else if (stroke === "rimshot") {
                    this.synths.repique.triggerAttackRelease("F3", "16n", execTime, 1.0);
                    this.synths.rimshotRepique.triggerAttackRelease("32n", execTime, 0.7);
                } else if (stroke === "aro") {
                    this.synths.aroRepique.triggerAttackRelease("B4", "32n", execTime, 0.65);
                } else if (stroke === "slap") {
                    this.synths.repique.triggerAttackRelease("G3", "32n", execTime, 1.0);
                    this.synths.aroRepique.triggerAttackRelease("D5", "32n", execTime, 0.5);
                } else if (stroke === "rufo") {
                    for (let r = 0; r < 3; r++) {
                        const subTime = Tone.Time(execTime).toSeconds() + (r * 0.022);
                        this.synths.repique.triggerAttackRelease("D3", 0.015, subTime, 0.5);
                    }
                }
                break;

            case "chocalho":
                this.chocalhoFilter.disconnect().connect(channel);
                if (stroke === "chocalho-frente") {
                    this.chocalhoFilter.frequency.setValueAtTime(4200, execTime);
                    this.synths.chocalho.triggerAttackRelease("16n", execTime, 0.85);
                } else if (stroke === "chocalho-tras") {
                    this.chocalhoFilter.frequency.setValueAtTime(3200, execTime);
                    this.synths.chocalho.triggerAttackRelease("32n", execTime, 0.5);
                }
                break;

            case "tamborim":
                this.synths.tamborim.disconnect().connect(channel);
                if (stroke === "tamborim-chapado") {
                    this.synths.tamborim.triggerAttackRelease("A3", "16n", execTime, 1.0);
                } else if (stroke === "tamborim-ponta") {
                    this.synths.tamborim.triggerAttackRelease("F#3", "16n", execTime, 0.75);
                } else if (stroke === "abafado") {
                    this.synths.tamborim.triggerAttackRelease("A3", "32n", execTime, 0.4);
                } else if (stroke === "aro") {
                    this.synths.tamborim.triggerAttackRelease("E4", "32n", execTime, 0.6);
                }
                break;
        }
    },

    async previewStroke(instId, strokeType) {
        if (!strokeType) return;
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

        while (m < scoreState.measuresCount) {
            const repeat = scoreState.repeats?.find(r => r.start <= m && r.end >= m);

            if (repeat && repeat.end === m) {
                for (let count = 0; count < (repeat.times || 2); count++) {
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
                // Configura o loop nativo por Ticks do Tone.js (sem engasgo de audio)
                Tone.Transport.loop = true;
                Tone.Transport.loopStart = Tone.Time(startTicks, "i").toSeconds();
                Tone.Transport.loopEnd = Tone.Time(endTicks, "i").toSeconds();
            }
        } else {
            Tone.Transport.loop = false;
        }
    },

    schedulePlaybackLoop() {
        if (this.loopEventId !== null) {
            Tone.Transport.clear(this.loopEventId);
            this.loopEventId = null;
        }

        const ppq = Tone.Transport.PPQ;

        this.loopEventId = Tone.Transport.scheduleRepeat((time) => {
            let currentTicks = Math.round(Tone.Transport.ticks);
            const sequence = this.getPlaybackSequence();

            // Ajuste nativo de ticks em loop
            if (scoreState.loopState.active) {
                const { startTicks, endTicks } = this.getLoopTickLimits();
                const loopDuration = endTicks - startTicks;
                if (loopDuration > 0 && currentTicks >= startTicks) {
                    currentTicks = startTicks + ((currentTicks - startTicks) % loopDuration);
                }
            }

            let accumulatedTicks = 0;
            let currentSequenceIndex = -1;
            let ticksIntoMeasure = 0;

            for (let i = 0; i < sequence.length; i++) {
                const mIdx = sequence[i];
                const sig = scoreState.measuresConfig?.[mIdx]?.timeSignature || scoreState.timeSignature || "4/4";
                const cfg = TIME_SIGNATURES[sig] || TIME_SIGNATURES["4/4"];
                const measureTicks = cfg.beats * ppq;

                if (currentTicks >= accumulatedTicks && currentTicks < accumulatedTicks + measureTicks) {
                    currentSequenceIndex = i;
                    ticksIntoMeasure = currentTicks - accumulatedTicks;
                    break;
                }

                accumulatedTicks += measureTicks;
            }

            if (currentSequenceIndex === -1 && !scoreState.loopState.active) {
                Tone.Draw.schedule(() => {
                    this.stop();
                    const btnPlay = document.getElementById("btn-play");
                    const playIconImg = document.getElementById("play-icon-img");
                    if (btnPlay) btnPlay.classList.remove("active");
                    if (playIconImg) playIconImg.src = "assets/icons/play.svg";
                }, time);
                return;
            }

            if (currentSequenceIndex === -1) return;

            const actualMeasure = sequence[currentSequenceIndex];
            const currentSig = scoreState.measuresConfig?.[actualMeasure]?.timeSignature || scoreState.timeSignature || "4/4";
            const config = TIME_SIGNATURES[currentSig] || TIME_SIGNATURES["4/4"];

            const currentBeatInMeasure = Math.floor(ticksIntoMeasure / ppq);

            if (currentBeatInMeasure >= config.beats) return;

            scoreState.instruments.forEach(inst => {
                if (inst.hidden) return;
                const measureData = inst.pattern && inst.pattern[actualMeasure];
                if (!measureData || !measureData[currentBeatInMeasure]) return;

                const beatObj = measureData[currentBeatInMeasure];
                const secondsPerBeat = 60 / scoreState.bpm;
                const stepTimeInterval = secondsPerBeat / beatObj.subdivisions;

                for (let s = 0; s < beatObj.subdivisions; s++) {
                    const stroke = beatObj.notes[s];
                    if (stroke) {
                        const noteTime = time + (s * stepTimeInterval);
                        this.triggerStroke(inst, stroke, noteTime);
                    }
                }
            });
        }, "4n");
    },

    async start() {
        if (!this.isInitialized) this.init();
        await Tone.start();

        this.updateTransportSettings();
        this.schedulePlaybackLoop();

        if (!this.isPaused && scoreState.loopState.active) {
            const { startTicks } = this.getLoopTickLimits();
            Tone.Transport.ticks = startTicks;
        }

        Tone.Transport.start();
        this.isPlaying = true;
        this.isPaused = false;

        if (window.startPlayheadAnimation) window.startPlayheadAnimation();
    },

    pause() {
        if (!this.isPlaying) return;
        Tone.Transport.pause();
        this.isPlaying = false;
        this.isPaused = true;
        if (window.pausePlayheadAnimation) window.pausePlayheadAnimation();
    },

    stop() {
        Tone.Transport.stop();
        this.isPlaying = false;
        this.isPaused = false;

        this.schedulePlaybackLoop();

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