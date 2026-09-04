import { scoreState } from './state.js';
import { TIME_SIGNATURES } from './constants.js';
import { showToast } from './ui/toast.js';

function bufferToWav(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1;
    const bitDepth = 16;

    let result;
    if (numChannels === 2) {
        const left = buffer.getChannelData(0);
        const right = buffer.getChannelData(1);
        result = interleave(left, right);
    } else {
        result = buffer.getChannelData(0);
    }

    return encodeWAV(result, numChannels, sampleRate, bitDepth);
}

function interleave(left, right) {
    const length = left.length + right.length;
    const result = new Float32Array(length);
    let inputIndex = 0;

    for (let index = 0; index < length;) {
        result[index++] = left[inputIndex];
        result[index++] = right[inputIndex];
        inputIndex++;
    }
    return result;
}

function encodeWAV(samples, numChannels, sampleRate, bitDepth) {
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
    const view = new DataView(buffer);

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * bytesPerSample, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, 'data');
    view.setUint32(40, samples.length * bytesPerSample, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

export async function exportScoreToAudio() {
    try {
        if (typeof showToast === "function") {
            showToast("Gerando áudio em segundo plano... aguarde.");
        }

        const bpm = scoreState.bpm || 120;
        const secondsPerBeat = 60 / bpm;
        let totalBeats = 0;

        for (let m = 0; m < scoreState.measuresCount; m++) {
            const sig = scoreState.measuresConfig?.[m]?.timeSignature || scoreState.timeSignature || "4/4";
            const config = TIME_SIGNATURES[sig] || TIME_SIGNATURES["4/4"];
            totalBeats += config.beats;
        }

        const durationInSeconds = (totalBeats * secondsPerBeat) + 1.0;

        // Passamos 'context' na callback do Tone.Offline
        const renderedBuffer = await Tone.Offline(async (offlineContext) => {
            const offlineSynths = {};

            // O Tone.Offline define temporariamente o contexto ativo como offlineContext.
            // Para garantir isolamento completo, instanciamos usando a fábrica do audioEngine.
            scoreState.instruments.forEach(inst => {
                if (!inst.hidden && inst.volume > 0 && window.audioEngine) {
                    offlineSynths[inst.id] = window.audioEngine.createSynthsForInstrument(inst.id, true);
                }
            });

            let currentTime = 0;

            for (let m = 0; m < scoreState.measuresCount; m++) {
                const sig = scoreState.measuresConfig?.[m]?.timeSignature || scoreState.timeSignature || "4/4";
                const config = TIME_SIGNATURES[sig] || TIME_SIGNATURES["4/4"];

                for (let b = 0; b < config.beats; b++) {
                    const beatTime = currentTime + (b * secondsPerBeat);

                    scoreState.instruments.forEach(inst => {
                        if (inst.hidden || inst.volume === 0) return;

                        const beatData = inst.pattern?.[m]?.[b];
                        if (!beatData || !beatData.notes) return;

                        const subdivs = beatData.subdivisions || config.subdivisions;
                        const subdivDuration = secondsPerBeat / subdivs;

                        beatData.notes.forEach((stroke, step) => {
                            if (stroke && offlineSynths[inst.id]) {
                                const noteTime = beatTime + (step * subdivDuration);
                                triggerOfflineSynthStroke(offlineSynths[inst.id], inst.id, stroke, noteTime);
                            }
                        });
                    });
                }

                currentTime += config.beats * secondsPerBeat;
            }
        }, durationInSeconds);

        const wavBlob = bufferToWav(renderedBuffer);
        const url = URL.createObjectURL(wavBlob);

        const fileName = (scoreState.title || "audio-easygroove")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "-")
            .replace(/-+/g, "-");

        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${fileName}.wav`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);

        if (typeof showToast === "function") {
            showToast("Áudio .WAV exportado com sucesso!");
        }
    } catch (err) {
        console.error("Erro na geração do áudio:", err);
        alert("Ocorreu um erro ao gerar o arquivo de áudio.");
    }
}

// Disparador de síntese dedicado para a rede offline isolada
function triggerOfflineSynthStroke(instSynths, instId, stroke, execTime) {
    if (!instSynths || !stroke) return;

    const baseType = instId.split("_")[0];

    if (baseType.startsWith("surdo")) {
        if (stroke === "pele-aberto") {
            instSynths.main?.triggerAttackRelease(instSynths.defaultPitch || "C1", "4n", execTime, 1.0);
        } else if (stroke === "abafado") {
            instSynths.main?.triggerAttackRelease("D1", "16n", execTime, 0.5);
        }
    } else if (baseType === "caixa") {
        if (stroke === "pele-aberto") {
            instSynths.pele?.triggerAttackRelease("F2", "16n", execTime, 0.9);
            instSynths.esteira?.triggerAttackRelease("16n", execTime, 0.6);
        } else if (stroke === "fantasma") {
            instSynths.pele?.triggerAttackRelease("E2", "32n", execTime, 0.3);
            instSynths.esteira?.triggerAttackRelease("32n", execTime, 0.15);
        } else if (stroke === "aro") {
            instSynths.aro?.triggerAttackRelease("A4", "32n", execTime, 0.6);
        } else if (stroke === "rimshot") {
            instSynths.pele?.triggerAttackRelease("A2", "16n", execTime, 1.0);
            instSynths.rimshot?.triggerAttackRelease("16n", execTime, 0.85);
        } else if (stroke === "rufo") {
            for (let r = 0; r < 3; r++) {
                const subTime = execTime + (r * 0.025);
                instSynths.esteira?.triggerAttackRelease(0.015, subTime, 0.4 - (r * 0.08));
            }
        }
    } else if (baseType === "repique") {
        if (stroke === "pele-aberto") {
            instSynths.main?.triggerAttackRelease("D3", "16n", execTime, 0.95);
        } else if (stroke === "rimshot") {
            instSynths.main?.triggerAttackRelease("F3", "16n", execTime, 1.0);
            instSynths.rimshot?.triggerAttackRelease("32n", execTime, 0.7);
        } else if (stroke === "aro") {
            instSynths.aro?.triggerAttackRelease("B4", "32n", execTime, 0.65);
        } else if (stroke === "slap") {
            instSynths.main?.triggerAttackRelease("G3", "32n", execTime, 1.0);
            instSynths.aro?.triggerAttackRelease("D5", "32n", execTime, 0.5);
        } else if (stroke === "rufo") {
            for (let r = 0; r < 3; r++) {
                const subTime = execTime + (r * 0.022);
                instSynths.main?.triggerAttackRelease("D3", 0.015, subTime, 0.5);
            }
        }
    } else if (baseType === "chocalho") {
        if (stroke === "chocalho-frente") {
            if (instSynths.filter) instSynths.filter.frequency.setValueAtTime(4200, execTime);
            instSynths.noise?.triggerAttackRelease("16n", execTime, 0.85);
        } else if (stroke === "chocalho-tras") {
            if (instSynths.filter) instSynths.filter.frequency.setValueAtTime(3200, execTime);
            instSynths.noise?.triggerAttackRelease("32n", execTime, 0.5);
        }
    } else if (baseType === "tamborim") {
        if (stroke === "tamborim-chapado") {
            instSynths.main?.triggerAttackRelease("A3", "16n", execTime, 1.0);
        } else if (stroke === "tamborim-ponta") {
            instSynths.main?.triggerAttackRelease("F#3", "16n", execTime, 0.75);
        } else if (stroke === "abafado") {
            instSynths.main?.triggerAttackRelease("A3", "32n", execTime, 0.4);
        } else if (stroke === "aro") {
            instSynths.main?.triggerAttackRelease("E4", "32n", execTime, 0.6);
        }
    }
}