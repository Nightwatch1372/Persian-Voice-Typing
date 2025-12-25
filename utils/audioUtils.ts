
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

export const playPCM = async (
  base64Audio: string, 
  sampleRate = 24000, 
  onEnded?: () => void
): Promise<AudioBufferSourceNode> => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate });
    const bytes = decodeBase64(base64Audio);
    
    // Convert Uint8Array bytes to Float32Array PCM (assuming 16-bit Little Endian)
    const dataInt16 = new Int16Array(bytes.buffer);
    const buffer = ctx.createBuffer(1, dataInt16.length, sampleRate);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) {
        channelData[i] = dataInt16[i] / 32768.0;
    }
    
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    
    // Slightly lower playback rate to make voice sound "thicker" and deeper
    source.playbackRate.value = 0.92; 

    source.connect(ctx.destination);
    
    source.onended = () => {
        if (onEnded) onEnded();
        ctx.close(); // Clean up context
    };

    source.start(0);
    return source; 
};
