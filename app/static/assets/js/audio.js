// audio.js - MOTOR DE ÁUDIO (TONE.JS)

const audioEngine = {
    isPlaying: false,
    isPaused: false,
    isInitialized: false,
    loopEventId: null,

    channels: {}, // Tone.Volume por instrumento
    synths: {},   // Sintetizadores compartilhados

    init() {
        if (this.isInitialized) return;

        scoreState.instruments.forEach(inst => {
            this.initInstrumentChannel(inst);
        });

        this.createSynthesizers();
        this.schedulePlaybackLoop();

        Tone.Transport.bpm.value = scoreState.bpm;
        this.isInitialized = true;
    },

    calculateDb(volume) {
        if (volume <= 0) return -Infinity;
        return (volume / 100) * 40 - 36; // 1 a 100 mapeado para -36dB a +4dB
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
            this.channels[instId].volume.rampTo(db, 0.03); // Transição suave sem estalo
        }
    },

    createSynthesizers() {
        // Surdos
        this.synths.surdo = new Tone.MembraneSynth({
            pitchDecay: 0.05,
            octaves: 4,
            oscillator: { type: "sine" },
            envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 0.5 }
        });

        // Caixa
        this.synths.caixaPele = new Tone.MembraneSynth({
            pitchDecay: 0.02,
            octaves: 3,
            oscillator: { type: "triangle" },
            envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.15 }
        });

        this.synths.caixaEsteira = new Tone.NoiseSynth({
            noise: { type: "white" },
            envelope: { attack: 0.001, decay: 0.14, sustain: 0 }
        });

        // Repique
        this.synths.repique = new Tone.MembraneSynth({
            pitchDecay: 0.03,
            octaves: 5,
            oscillator: { type: "sine" },
            envelope: { attack: 0.001, decay: 0.18, sustain: 0.01, release: 0.2 }
        });

        // Aro / Rimshot / Slap
        this.synths.rimshot = new Tone.MetalSynth({
            frequency: 320,
            envelope: { attack: 0.001, decay: 0.06, release: 0.05 },
            harmonicity: 4.1,
            modulationIndex: 28,
            resonance: 2500,
            octaves: 1.2
        });

        this.synths.aro = new Tone.MembraneSynth({
            pitchDecay: 0.01,
            octaves: 2,
            oscillator: { type: "square" },
            envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.04 }
        });

        // Chocalho
        this.chocalhoFilter = new Tone.Filter(3500, "highpass").toDestination();
        this.synths.chocalho = new Tone.NoiseSynth({
            noise: { type: "pink" },
            envelope: { attack: 0.008, decay: 0.05, sustain: 0 }
        }).connect(this.chocalhoFilter);

        // Tamborim
        this.synths.tamborim = new Tone.MembraneSynth({
            pitchDecay: 0.04,
            octaves: 4,
            oscillator: { type: "triangle" },
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
                this.synths.surdo.disconnect().connect(channel);
                if (stroke === "pele-aberto") {
                    this.synths.surdo.triggerAttackRelease("C1", "4n", execTime, 1.0);
                } else if (stroke === "surdo-abafado") {
                    this.synths.surdo.triggerAttackRelease("D1", "16n", execTime, 0.5);
                }
                break;

            case "surdo2":
                this.synths.surdo.disconnect().connect(channel);
                if (stroke === "pele-aberto") {
                    this.synths.surdo.triggerAttackRelease("G1", "4n", execTime, 0.95);
                } else if (stroke === "surdo-abafado") {
                    this.synths.surdo.triggerAttackRelease("A1", "16n", execTime, 0.5);
                }
                break;

            case "surdo3":
                this.synths.surdo.disconnect().connect(channel);
                if (stroke === "pele-aberto") {
                    this.synths.surdo.triggerAttackRelease("C2", "8n", execTime, 0.9);
                } else if (stroke === "surdo-abafado") {
                    this.synths.surdo.triggerAttackRelease("D2", "16n", execTime, 0.45);
                }
                break;

            case "caixa":
                this.synths.caixaPele.disconnect().connect(channel);
                this.synths.caixaEsteira.disconnect().connect(channel);
                this.synths.aro.disconnect().connect(channel);
                this.synths.rimshot.disconnect().connect(channel);

                if (stroke === "pele-aberto") {
                    this.synths.caixaPele.triggerAttackRelease("F2", "16n", execTime, 0.9);
                    this.synths.caixaEsteira.triggerAttackRelease("16n", execTime, 0.6);
                } else if (stroke === "fantasma") {
                    this.synths.caixaPele.triggerAttackRelease("E2", "32n", execTime, 0.3);
                    this.synths.caixaEsteira.triggerAttackRelease("32n", execTime, 0.15);
                } else if (stroke === "aro") {
                    this.synths.aro.triggerAttackRelease("A4", "32n", execTime, 0.6);
                } else if (stroke === "rimshot") {
                    this.synths.caixaPele.triggerAttackRelease("A2", "16n", execTime, 1.0);
                    this.synths.rimshot.triggerAttackRelease("16n", execTime, 0.85);
                } else if (stroke === "rufo") {
                    for (let r = 0; r < 3; r++) {
                        const subTime = Tone.Time(execTime).toSeconds() + (r * 0.025);
                        this.synths.caixaEsteira.triggerAttackRelease("64n", subTime, 0.4 - (r * 0.08));
                    }
                }
                break;

            case "repique":
                this.synths.repique.disconnect().connect(channel);
                this.synths.aro.disconnect().connect(channel);
                this.synths.rimshot.disconnect().connect(channel);

                if (stroke === "pele-aberto") {
                    this.synths.repique.triggerAttackRelease("D3", "16n", execTime, 0.95);
                } else if (stroke === "rimshot") {
                    this.synths.repique.triggerAttackRelease("F3", "16n", execTime, 1.0);
                    this.synths.rimshot.triggerAttackRelease("32n", execTime, 0.7);
                } else if (stroke === "aro") {
                    this.synths.aro.triggerAttackRelease("B4", "32n", execTime, 0.65);
                } else if (stroke === "slap") {
                    this.synths.repique.triggerAttackRelease("G3", "32n", execTime, 1.0);
                    this.synths.aro.triggerAttackRelease("D5", "32n", execTime, 0.5);
                } else if (stroke === "rufo") {
                    for (let r = 0; r < 3; r++) {
                        const subTime = Tone.Time(execTime).toSeconds() + (r * 0.022);
                        this.synths.repique.triggerAttackRelease("D3", "64n", subTime, 0.5);
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
                if (stroke === "tamborim-cima") {
                    this.synths.tamborim.triggerAttackRelease("A3", "16n", execTime, 1.0);
                } else if (stroke === "tamborim-baixo") {
                    this.synths.tamborim.triggerAttackRelease("F#3", "16n", execTime, 0.75);
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

        // Se o instrumento estiver mutado, usamos volume moderado para feedback de preview
        const effectiveInst = inst.volume > 0 ? inst : { ...inst, volume: 80 };
        if (inst.volume <= 0) {
            this.initInstrumentChannel(effectiveInst);
        }

        this.triggerStroke(effectiveInst, strokeType, Tone.now());
    },

    schedulePlaybackLoop() {
        if (this.loopEventId !== null) {
            Tone.Transport.clear(this.loopEventId);
            this.loopEventId = null;
        }

        this.loopEventId = Tone.Transport.scheduleRepeat((time) => {
            const timeStr = Tone.Transport.position.split('.')[0];
            const parts = timeStr.split(':');
            const measure = parseInt(parts[0], 10);
            const beat = parseInt(parts[1], 10);
            const sixteenth = parseInt(parts[2], 10);

            const stepIndex = (beat * scoreState.subdivisions) + sixteenth;

            // Tratamento de fim de partitura sem loop
            if (!scoreState.loopState.active && measure >= scoreState.measuresCount) {
                Tone.Draw.schedule(() => {
                    this.stop();
                    const btnPlay = document.getElementById("btn-play");
                    const playIconImg = document.getElementById("play-icon-img");
                    if (btnPlay) btnPlay.classList.remove("active");
                    if (playIconImg) playIconImg.src = "assets/icons/play.svg";
                }, time);
                return;
            }

            scoreState.instruments.forEach(inst => {
                if (inst.pattern && inst.pattern[measure]) {
                    const stroke = inst.pattern[measure][stepIndex];
                    if (stroke) {
                        this.triggerStroke(inst, stroke, time);
                    }
                }
            });
        }, "16n");
    },

    updateTransportSettings() {
        if (!this.isInitialized) return;
        Tone.Transport.bpm.value = scoreState.bpm;

        // Clamping da posição atual caso compassos tenham sido deletados durante a reprodução
        const currentMeasure = parseInt(Tone.Transport.position.split(':')[0], 10);
        if (currentMeasure >= scoreState.measuresCount) {
            Tone.Transport.position = scoreState.loopState.active
                ? `${scoreState.loopState.startMeasure}:0:0`
                : "0:0:0";
            if (window.updatePlayheadPosition) window.updatePlayheadPosition();
        }

        if (scoreState.loopState.active) {
            Tone.Transport.loop = true;
            Tone.Transport.setLoopPoints(
                `${scoreState.loopState.startMeasure}m`,
                `${scoreState.loopState.endMeasure}m`
            );

            if (currentMeasure < scoreState.loopState.startMeasure || currentMeasure >= scoreState.loopState.endMeasure) {
                Tone.Transport.position = `${scoreState.loopState.startMeasure}:0:0`;
                if (window.updatePlayheadPosition) window.updatePlayheadPosition();
            }
        } else {
            Tone.Transport.loop = false;
        }
    },

    async start() {
        if (!this.isInitialized) this.init();
        await Tone.start();
        this.updateTransportSettings();

        if (!this.isPaused && scoreState.loopState.active) {
            Tone.Transport.position = `${scoreState.loopState.startMeasure}:0:0`;
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

        if (scoreState.loopState.active) {
            Tone.Transport.position = `${scoreState.loopState.startMeasure}:0:0`;
        } else {
            Tone.Transport.position = "0:0:0";
        }

        if (window.stopPlayheadAnimation) window.stopPlayheadAnimation();
    }
};

window.audioEngine = audioEngine;