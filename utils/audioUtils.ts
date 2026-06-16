
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error('Failed to convert blob to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const createAudioContext = (sampleRate: number) => {
  return new (window.AudioContext || (window as any).webkitAudioContext)({
    sampleRate,
  });
};

export const decodeBase64 = (base64: string) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

/**
 * Adds a canonical WAV header to raw PCM data to make it playable by HTML5 Audio
 */
const writeWavHeader = (samples: Int16Array, sampleRate: number): ArrayBuffer => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    /* RIFF identifier */
    writeString(view, 0, 'RIFF');
    /* RIFF chunk length */
    view.setUint32(4, 36 + samples.length * 2, true);
    /* RIFF type */
    writeString(view, 8, 'WAVE');
    /* format chunk identifier */
    writeString(view, 12, 'fmt ');
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (raw) */
    view.setUint16(20, 1, true);
    /* channel count */
    view.setUint16(22, 1, true);
    /* sample rate */
    view.setUint32(24, sampleRate, true);
    /* byte rate (sample rate * block align) */
    view.setUint32(28, sampleRate * 2, true);
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, 2, true);
    /* bits per sample */
    view.setUint16(34, 16, true);
    /* data chunk identifier */
    writeString(view, 36, 'data');
    /* data chunk length */
    view.setUint32(40, samples.length * 2, true);

    // Write the PCM samples
    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
        view.setInt16(offset, samples[i], true);
    }

    return buffer;
};

const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
};

// Global reference to track current audio instance
let currentAudio: HTMLAudioElement | null = null;

export const playPCM = async (
  base64Audio: string, 
  sampleRate = 24000, 
  onEnded?: () => void,
  playbackRate = 1.0
): Promise<any> => {
    // Stop any currently playing audio
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
    }

    const bytes = decodeBase64(base64Audio);
    const dataInt16 = new Int16Array(bytes.buffer);
    
    // Add WAV Header
    const wavBuffer = writeWavHeader(dataInt16, sampleRate);
    const blob = new Blob([wavBuffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    
    const audio = new Audio(url);
    currentAudio = audio;
    
    // Set playback rate (HTML5 Audio preserves pitch by default in modern browsers)
    audio.playbackRate = playbackRate;
    // Explicitly ensure pitch preservation is on (standard property)
    (audio as any).preservesPitch = true; 
    (audio as any).mozPreservesPitch = true;
    (audio as any).webkitPreservesPitch = true;

    audio.onended = () => {
        URL.revokeObjectURL(url); // Clean up memory
        if (onEnded) onEnded();
    };
    
    audio.onerror = (e) => {
        console.error("Audio Playback Error", e);
        if (onEnded) onEnded();
    };

    await audio.play();
    
    // Return an object that mimics the old source node interface for compatibility
    return {
        stop: () => {
            audio.pause();
            audio.currentTime = 0;
            URL.revokeObjectURL(url);
        },
        audioElement: audio
    };
};
