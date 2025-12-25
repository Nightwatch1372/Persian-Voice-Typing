import React, { useState, useEffect, useRef } from 'react';
import { LiveServerMessage, Modality } from '@google/genai';
import { getLiveClient } from '../services/geminiService';
import { MODEL_NAMES } from '../constants';
import { createAudioContext } from '../utils/audioUtils';
import { MicrophoneIcon, StopIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';

// Helper for PCM encoding
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper for Audio Decoding
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// Helper for base64 decode
function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

function createBlob(data: Float32Array): { data: string, mimeType: string } {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    return {
      data: encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
}

export const LiveConversation: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState("آماده برای مکالمه");
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Refs for audio handling to avoid re-renders
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const inputNodeRef = useRef<GainNode | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

  const startSession = async () => {
    setError(null);
    try {
      setStatus("در حال اتصال...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const inputCtx = createAudioContext(16000);
      const outputCtx = createAudioContext(24000);
      
      inputContextRef.current = inputCtx;
      outputContextRef.current = outputCtx;

      const inputNode = inputCtx.createGain();
      const outputNode = outputCtx.createGain();
      outputNode.connect(outputCtx.destination);
      
      inputNodeRef.current = inputNode;
      outputNodeRef.current = outputNode;

      const liveClient = getLiveClient();

      // Connect to Gemini Live
      const sessionPromise = liveClient.connect({
        model: MODEL_NAMES.LIVE,
        callbacks: {
          onopen: () => {
            setStatus("متصل شد! صحبت کنید...");
            setIsActive(true);
            setError(null);

            // Setup Microphone Stream
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              
              // Simple volume visualization
              let sum = 0;
              for(let i=0; i<inputData.length; i++) sum += Math.abs(inputData[i]);
              setVolume(Math.min(100, (sum / inputData.length) * 500));

              const pcmBlob = createBlob(inputData);
              sessionPromise.then((session) => {
                 session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination); // Required for script processor to run
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              const outputCtx = outputContextRef.current!;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              
              const audioBuffer = await decodeAudioData(
                decode(base64Audio),
                outputCtx,
                24000,
                1
              );
              
              const source = outputCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputNodeRef.current!);
              
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
              });

              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            // Handle Interruption
            if (message.serverContent?.interrupted) {
               sourcesRef.current.forEach(src => {
                 try { src.stop(); } catch(e){}
               });
               sourcesRef.current.clear();
               nextStartTimeRef.current = 0;
            }
          },
          onclose: () => {
            console.log("Session closed");
            stopSession();
          },
          onerror: (err) => {
            console.error("Session error", err);
            setError("ارتباط با سرویس قطع شد. لطفاً اتصال اینترنت خود را بررسی کنید.");
            setStatus("خطا در ارتباط");
            stopSession();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
          },
          systemInstruction: "You are a helpful Persian AI assistant. Speak Persian fluently and naturally. Engage in a friendly conversation.",
        }
      });
      
      sessionRef.current = sessionPromise;

    } catch (e: any) {
      console.error("Connection Error:", e);
      setIsActive(false);
      setStatus("خطا در اتصال");
      
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        setError("دسترسی به میکروفون مسدود شده است. لطفاً از نوار آدرس مرورگر مجوز میکروفون را فعال کنید.");
      } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
        setError("هیچ میکروفونی یافت نشد. لطفاً اتصال سخت‌افزاری خود را بررسی کنید.");
      } else if (e.name === 'NotReadableError' || e.name === 'TrackStartError') {
        setError("میکروفون قابل خواندن نیست. ممکن است توسط برنامه دیگری در حال استفاده باشد.");
      } else {
        setError("خطایی رخ داد: " + (e.message || "مشکل ناشناخته در برقراری ارتباط"));
      }
    }
  };

  const stopSession = () => {
    setIsActive(false);
    setStatus("مکالمه پایان یافت");
    setVolume(0);

    // Stop streams
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
    }
    
    // Disconnect script processor
    if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
    }

    // Close Contexts
    if (inputContextRef.current) inputContextRef.current.close();
    if (outputContextRef.current) outputContextRef.current.close();

    // Close session if possible
    if(sessionRef.current) {
        sessionRef.current.then((s: any) => {
            if(s.close) s.close();
        }).catch(() => {});
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
        stopSession();
    };
  }, []);

  return (
    <div className="flex flex-col h-full items-center justify-center p-6 bg-gradient-to-b from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-indigo-950 transition-colors duration-200">
      
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-800 p-4 rounded-xl flex items-start gap-3 max-w-sm w-full animate-fade-in" dir="rtl">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-200 leading-relaxed">{error}</p>
        </div>
      )}

      <div className="w-full max-w-sm aspect-square bg-white dark:bg-gray-800 rounded-full shadow-2xl flex items-center justify-center relative mb-8 transition-colors duration-200">
        {/* Visualizer Rings */}
        {isActive && (
          <>
            <div className="absolute inset-0 rounded-full border-4 border-indigo-100 dark:border-indigo-900 animate-ping opacity-75" style={{ animationDuration: '2s' }}></div>
            <div className="absolute inset-4 rounded-full border-4 border-indigo-200 dark:border-indigo-800 animate-ping opacity-50" style={{ animationDuration: '1.5s' }}></div>
          </>
        )}
        
        {/* Active State Graphic */}
        <div 
            className={`w-32 h-32 rounded-full transition-all duration-200 flex items-center justify-center ${isActive ? 'bg-indigo-600 shadow-indigo-400/50 shadow-lg' : 'bg-gray-300 dark:bg-gray-600'}`}
            style={{ transform: `scale(${1 + volume / 50})` }}
        >
             <MicrophoneIcon className="w-16 h-16 text-white" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2 transition-colors duration-200">{status}</h2>
      <p className="text-gray-500 dark:text-gray-400 text-center max-w-xs mb-8 transition-colors duration-200">
        با هوش مصنوعی به صورت زنده صحبت کنید. برای شروع روی دکمه زیر بزنید.
      </p>

      <button
        onClick={isActive ? stopSession : startSession}
        className={`px-8 py-4 rounded-2xl font-bold text-lg flex items-center gap-3 shadow-lg transition-transform transform active:scale-95 ${
          isActive 
            ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/30' 
            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/30'
        }`}
      >
        {isActive ? (
          <>
            <StopIcon className="w-6 h-6" />
            پایان مکالمه
          </>
        ) : (
          <>
            <MicrophoneIcon className="w-6 h-6" />
            شروع مکالمه
          </>
        )}
      </button>
    </div>
  );
};