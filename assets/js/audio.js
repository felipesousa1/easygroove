// ==========================================
// MOTOR DE ÁUDIO (TONE.JS)
// ==========================================

const audioEngine = {
    isInitialized: false,
    isPlaying: false,
    currentGlobalStep: 0,
    synths: {},

    init() {
        if (this.isInitialized) return;

        // Síntese percussiva básica para pré-escuta
        this.synths = {
            surdo1: new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 4, oscillator: { type: "sine" } }).toDestination(),
            caixa: new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.001, decay: 0.15, sustain: 0 } }).toDestination(),
            chocalho: new Tone.NoiseSynth({ noise: { type: "pink" }, envelope: { attack: 0.005, decay: 0.05, sustain: 0 } }).toDestination(),
            tamborim: new Tone.MembraneSynth({ pitchDecay: 0.01, octaves: 8, oscillator: { type: "triangle" } }).toDestination()
        };

        audioEngine.updateTransportSettings(); // <-- Chamada direta pelo objeto

        // Agenda o disparo do áudio em cada semicolcheia (16n)
        Tone.Transport.scheduleRepeat((time) => {
            audioEngine.onStep(time);
        }, "16n");

        this.isInitialized = true;
    },

    updateTransportSettings() {
        Tone.Transport.bpm.value = scoreState.bpm;
        Tone.Transport.timeSignature = [scoreState.beatsPerMeasure, 4];

        // Configura o loop do Transport para a quantidade total de compassos (ex: "3m")
        Tone.Transport.loop = true;
        Tone.Transport.loopStart = 0;
        Tone.Transport.loopEnd = `${scoreState.measuresCount}m`;
    },

    onStep(time) {
        const totalStepsPerMeasure = scoreState.beatsPerMeasure * scoreState.subdivisions; // 8 passos
        const totalGlobalSteps = scoreState.measuresCount * totalStepsPerMeasure;

        const currentMeasure = Math.floor(this.currentGlobalStep / totalStepsPerMeasure);
        const currentStepInMeasure = this.currentGlobalStep % totalStepsPerMeasure;

        // Disparo de áudio
        scoreState.instruments.forEach((inst) => {
            if (!inst.pattern[currentMeasure]) return;

            const stroke = inst.pattern[currentMeasure][currentStepInMeasure];
            if (stroke) {
                this.triggerStroke(inst.id, stroke, time);
            }
        });

        // Incremento do passo
        this.currentGlobalStep = (this.currentGlobalStep + 1) % totalGlobalSteps;
    },

    triggerStroke(instId, stroke, time) {
        const synth = this.synths[instId];
        if (!synth) return;

        switch (instId) {
            case "surdo1":
                synth.triggerAttackRelease(stroke === "accent" ? "C2" : "C1", "8n", time, stroke === "accent" ? 1.0 : 0.7);
                break;

            case "caixa":
                if (stroke === "accent") {
                    synth.triggerAttackRelease("16n", time, 1.0);
                } else if (stroke === "ghost") {
                    synth.triggerAttackRelease("32n", time, 0.3);
                } else {
                    synth.triggerAttackRelease("16n", time, 0.7);
                }
                break;

            case "chocalho":
                synth.triggerAttackRelease("32n", time, stroke === "chevron-accent" ? 0.8 : 0.4);
                break;

            case "tamborim":
                synth.triggerAttackRelease(stroke === "accent" ? "G4" : "E4", "16n", time, stroke === "accent" ? 1.0 : 0.7);
                break;
        }
    },

    async start() {
        await Tone.start();
        if (!this.isInitialized) this.init();

        audioEngine.updateTransportSettings();
        Tone.Transport.position = 0;
        this.currentGlobalStep = 0;
        Tone.Transport.start();
        this.isPlaying = true;

        if (window.startPlayheadAnimation) {
            window.startPlayheadAnimation();
        }
    },

    stop() {
        Tone.Transport.stop();
        Tone.Transport.position = 0;
        this.currentGlobalStep = 0;
        this.isPlaying = false;

        if (window.stopPlayheadAnimation) {
            window.stopPlayheadAnimation();
        }
    }
};