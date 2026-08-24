// ==========================================
// MOTOR DE ÁUDIO (TONE.JS)
// ==========================================

const audioEngine = {
    isPlaying: false,
    isInitialized: false,
    loopEventId: null,

    channels: {}, // Controle de Volume / Ganho individual por instrumento
    synths: {},   // Sintetizadores por tipo de instrumento

    init() {
        if (this.isInitialized) return;

        // 1. Inicializa os canais de áudio de cada instrumento presente na partitura
        scoreState.instruments.forEach(inst => {
            this.initInstrumentChannel(inst);
        });

        // 2. Cria os sintetizadores dedicados para cada família de timbre
        this.createSynthesizers();

        // 3. Configura o agendamento em loop no Transport do Tone.js
        this.schedulePlaybackLoop();

        Tone.Transport.bpm.value = scoreState.bpm;
        this.isInitialized = true;
    },

    calculateDb(volume) {
        if (volume <= 0) return -Infinity;
        return (volume / 100) * 40 - 36; // Converte 1-100 para -36dB a +4dB
    },

    initInstrumentChannel(inst) {
        if (!this.channels[inst.id]) {
            this.channels[inst.id] = new Tone.Volume(this.calculateDb(inst.volume)).toDestination();
        }
    },

    setInstrumentVolume(instId, volume) {
        if (this.channels[instId]) {
            this.channels[instId].volume.value = this.calculateDb(volume);
        }
    },

    createSynthesizers() {
        // 1. Surdos (Membranas com ressonância profunda)
        this.synths.surdo = new Tone.MembraneSynth({
            pitchDecay: 0.05,
            octaves: 4,
            oscillator: { type: "sine" },
            envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 0.5 }
        });

        // 2. Caixa - Pele e Fantasma (Corpo tonal + esteira com ruído)
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

        // 3. Repique (Agudo, estalado e seco)
        this.synths.repique = new Tone.MembraneSynth({
            pitchDecay: 0.03,
            octaves: 5,
            oscillator: { type: "sine" },
            envelope: { attack: 0.001, decay: 0.18, sustain: 0.01, release: 0.2 }
        });

        // 4. Aro / Rimshot / Slap (Ataques metálicos e transientes secos)
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

        // 5. Chocalho (Filtrado para dar o 'shk-shk' característico)
        this.chocalhoFilter = new Tone.Filter(3500, "highpass").toDestination();
        this.synths.chocalho = new Tone.NoiseSynth({
            noise: { type: "pink" },
            envelope: { attack: 0.008, decay: 0.05, sustain: 0 }
        }).connect(this.chocalhoFilter);

        // 6. Tamborim (Ataque agudíssimo e estalado)
        this.synths.tamborim = new Tone.MembraneSynth({
            pitchDecay: 0.04,
            octaves: 4,
            oscillator: { type: "triangle" },
            envelope: { attack: 0.001, decay: 0.09, sustain: 0.01, release: 0.08 }
        });
    },

    // Roteamento e execução dos toques por instrumento
    triggerStroke(inst, stroke, time) {
        if (!stroke || inst.volume <= 0) return;

        const channel = this.channels[inst.id] || Tone.Destination;
        const baseType = inst.id.split("_")[0]; // Identifica o tipo base (surdo1, caixa, etc.)

        switch (baseType) {
            // -------------------------------------------------------------
            // SURDOS (1ª: Mais grave/ressonante, 2ª: Médio, 3ª: Agudo/curto)
            // -------------------------------------------------------------
            case "surdo1":
                this.synths.surdo.disconnect().connect(channel);
                if (stroke === "pele-aberto") {
                    this.synths.surdo.triggerAttackRelease("C1", "4n", time, 1.0);
                } else if (stroke === "surdo-abafado") {
                    this.synths.surdo.triggerAttackRelease("D1", "16n", time, 0.5);
                }
                break;

            case "surdo2":
                this.synths.surdo.disconnect().connect(channel);
                if (stroke === "pele-aberto") {
                    this.synths.surdo.triggerAttackRelease("G1", "4n", time, 0.95);
                } else if (stroke === "surdo-abafado") {
                    this.synths.surdo.triggerAttackRelease("A1", "16n", time, 0.5);
                }
                break;

            case "surdo3":
                this.synths.surdo.disconnect().connect(channel);
                if (stroke === "pele-aberto") {
                    this.synths.surdo.triggerAttackRelease("C2", "8n", time, 0.9);
                } else if (stroke === "surdo-abafado") {
                    this.synths.surdo.triggerAttackRelease("D2", "16n", time, 0.45);
                }
                break;

            // -------------------------------------------------------------
            // CAIXA
            // -------------------------------------------------------------
            case "caixa":
                this.synths.caixaPele.disconnect().connect(channel);
                this.synths.caixaEsteira.disconnect().connect(channel);
                this.synths.aro.disconnect().connect(channel);
                this.synths.rimshot.disconnect().connect(channel);

                if (stroke === "pele-aberto") {
                    this.synths.caixaPele.triggerAttackRelease("F2", "16n", time, 0.9);
                    this.synths.caixaEsteira.triggerAttackRelease("16n", time, 0.6);
                } else if (stroke === "fantasma") {
                    this.synths.caixaPele.triggerAttackRelease("E2", "32n", time, 0.3);
                    this.synths.caixaEsteira.triggerAttackRelease("32n", time, 0.15);
                } else if (stroke === "aro") {
                    this.synths.aro.triggerAttackRelease("A4", "32n", time, 0.6);
                } else if (stroke === "rimshot") {
                    this.synths.caixaPele.triggerAttackRelease("A2", "16n", time, 1.0);
                    this.synths.rimshot.triggerAttackRelease("16n", time, 0.85);
                } else if (stroke === "rufo") {
                    // Trinado rápido de 32avos
                    for (let r = 0; r < 3; r++) {
                        const subTime = Tone.Time(time).toSeconds() + (r * 0.025);
                        this.synths.caixaEsteira.triggerAttackRelease("64n", subTime, 0.4 - (r * 0.08));
                    }
                }
                break;

            // -------------------------------------------------------------
            // REPIQUE
            // -------------------------------------------------------------
            case "repique":
                this.synths.repique.disconnect().connect(channel);
                this.synths.aro.disconnect().connect(channel);
                this.synths.rimshot.disconnect().connect(channel);

                if (stroke === "pele-aberto") {
                    this.synths.repique.triggerAttackRelease("D3", "16n", time, 0.95);
                } else if (stroke === "rimshot") {
                    this.synths.repique.triggerAttackRelease("F3", "16n", time, 1.0);
                    this.synths.rimshot.triggerAttackRelease("32n", time, 0.7);
                } else if (stroke === "aro") {
                    this.synths.aro.triggerAttackRelease("B4", "32n", time, 0.65);
                } else if (stroke === "slap") {
                    this.synths.repique.triggerAttackRelease("G3", "32n", time, 1.0);
                    this.synths.aro.triggerAttackRelease("D5", "32n", time, 0.5);
                } else if (stroke === "rufo") {
                    for (let r = 0; r < 3; r++) {
                        const subTime = Tone.Time(time).toSeconds() + (r * 0.022);
                        this.synths.repique.triggerAttackRelease("D3", "64n", subTime, 0.5);
                    }
                }
                break;

            // -------------------------------------------------------------
            // CHOCALHO
            // -------------------------------------------------------------
            case "chocalho":
                this.chocalhoFilter.disconnect().connect(channel);
                if (stroke === "chocalho-frente") {
                    this.chocalhoFilter.frequency.setValueAtTime(4200, time);
                    this.synths.chocalho.triggerAttackRelease("16n", time, 0.85);
                } else if (stroke === "chocalho-tras") {
                    this.chocalhoFilter.frequency.setValueAtTime(3200, time);
                    this.synths.chocalho.triggerAttackRelease("32n", time, 0.5);
                }
                break;

            // -------------------------------------------------------------
            // TAMBORIM
            // -------------------------------------------------------------
            case "tamborim":
                this.synths.tamborim.disconnect().connect(channel);
                if (stroke === "tamborim-cima") {
                    this.synths.tamborim.triggerAttackRelease("A3", "16n", time, 1.0);
                } else if (stroke === "tamborim-baixo") {
                    this.synths.tamborim.triggerAttackRelease("F#3", "16n", time, 0.75);
                }
                break;
        }
    },

    schedulePlaybackLoop() {
        if (this.loopEventId !== null) {
            Tone.Transport.clear(this.loopEventId);
        }

        const totalSteps = scoreState.measuresCount * scoreState.beatsPerMeasure * scoreState.subdivisions;
        const loopDuration = `${scoreState.measuresCount}m`;

        Tone.Transport.loop = true;
        Tone.Transport.loopStart = "0:0:0";
        Tone.Transport.loopEnd = loopDuration;

        // Agenda a leitura de cada subdivisão (16n)
        this.loopEventId = Tone.Transport.scheduleRepeat((time) => {
            const currentSeconds = Tone.Transport.seconds % Tone.Time(loopDuration).toSeconds();
            const progress = currentSeconds / Tone.Time(loopDuration).toSeconds();
            const currentGlobalStep = Math.floor(progress * totalSteps);

            const measureIndex = Math.floor(currentGlobalStep / (scoreState.beatsPerMeasure * scoreState.subdivisions));
            const stepIndex = currentGlobalStep % (scoreState.beatsPerMeasure * scoreState.subdivisions);

            scoreState.instruments.forEach(inst => {
                if (inst.pattern[measureIndex]) {
                    const stroke = inst.pattern[measureIndex][stepIndex];
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
        this.schedulePlaybackLoop();
    },

    async start() {
        if (!this.isInitialized) this.init();
        await Tone.start();
        this.updateTransportSettings();
        Tone.Transport.start();
        this.isPlaying = true;
        if (window.startPlayheadAnimation) window.startPlayheadAnimation();
    },

    stop() {
        Tone.Transport.stop();
        Tone.Transport.seconds = 0;
        this.isPlaying = false;
        if (window.stopPlayheadAnimation) window.stopPlayheadAnimation();
    }
};

window.audioEngine = audioEngine;