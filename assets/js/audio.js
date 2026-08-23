// ==========================================
// MOTOR DE ÁUDIO (TONE.JS)
// ==========================================

const audioEngine = {
    isInitialized: false,
    isPlaying: false,
    currentGlobalStep: 0,
    players: null,

    // 1. Mapeamento de Samples de Teste (Buffers curtos gerados ou URLs locais)
    // Usaremos samples percussivos sintetizados via Tone.MembraneSynth/NoiseSynth
    // como fallback caso você ainda não tenha colocado arquivos .wav em assets/samples/
    synths: {},

    init() {
        if (this.isInitialized) return;

        // Sintetizadores de teste para cada instrumento
        this.synths = {
            surdo1: new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 4, oscillator: { type: "sine" } }).toDestination(),
            caixa: new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.001, decay: 0.15, sustain: 0 } }).toDestination(),
            chocalho: new Tone.NoiseSynth({ noise: { type: "pink" }, envelope: { attack: 0.005, decay: 0.05, sustain: 0 } }).toDestination(),
            tamborim: new Tone.MembraneSynth({ pitchDecay: 0.01, octaves: 8, oscillator: { type: "triangle" } }).toDestination()
        };

        // Configura o BPM inicial e o loop
        Tone.Transport.bpm.value = scoreState.bpm;

        // Agenda o loop de 16 avos (semicolcheias)
        Tone.Transport.scheduleRepeat((time) => {
            this.onStep(time);
        }, "16n");

        this.isInitialized = true;
        console.log("AudioEngine inicializado.");
    },

    // 2. Disparo de cada semicolcheia
    onStep(time) {
        const totalStepsPerMeasure = scoreState.beatsPerMeasure * scoreState.subdivisions; // 8 passos
        const totalMeasures = scoreState.measuresCount;
        const totalGlobalSteps = totalMeasures * totalStepsPerMeasure; 

        const currentMeasure = Math.floor(this.currentGlobalStep / totalStepsPerMeasure);
        const currentStepInMeasure = this.currentGlobalStep % totalStepsPerMeasure;

        // Varre os instrumentos e toca quem tiver nota ativa neste passo
        scoreState.instruments.forEach((inst) => {
            if (!inst.pattern[currentMeasure]) return;

            const stroke = inst.pattern[currentMeasure][currentStepInMeasure];
            if (stroke) {
                this.triggerStroke(inst.id, stroke, time);
            }
        });

        // Incrementa ou reseta o passo global (Loop)
        this.currentGlobalStep = (this.currentGlobalStep + 1) % totalGlobalSteps;
    },

    // 3. Lógica de articulação e volume
    triggerStroke(instId, stroke, time) {
        const synth = this.synths[instId];
        if (!synth) return;

        switch (instId) {
            case "surdo1":
                if (stroke === "accent") {
                    synth.triggerAttackRelease("C2", "8n", time, 1.0);
                } else {
                    synth.triggerAttackRelease("C1", "8n", time, 0.7);
                }
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

        Tone.Transport.start();
        this.isPlaying = true;
    },

    stop() {
        Tone.Transport.stop();
        this.currentGlobalStep = 0;
        this.isPlaying = false;
    }
};