
import React, { useState, useRef, useEffect } from 'react';
import { MicrophoneIcon, StopIcon, SparklesIcon, DocumentDuplicateIcon, TrashIcon, CheckIcon, BookOpenIcon, SpeakerWaveIcon, LanguageIcon, PencilSquareIcon, PauseIcon, BoltIcon, LanguageIcon as DiacriticIcon, FaceSmileIcon } from '@heroicons/react/24/solid';
import { transcribeAudio, smartCorrectText, generateSpeech, translateText, addTextDiacritics } from '../services/geminiService';
import { playPCM } from '../utils/audioUtils';
import { AudioState } from '../types';
import { Sidebar, Replacement } from './Sidebar';
import { VirtualKeyboard } from './VirtualKeyboard';
import { AudioVisualizer } from './AudioVisualizer';

const DEFAULT_REPLACEMENTS: Replacement[] = [
  { id: '1', keyword: 'نقطه', replacement: '.' },
  { id: '2', keyword: 'ویرگول', replacement: '،' },
  { id: '3', keyword: 'دو نقطه', replacement: ':' },
  { id: '4', keyword: 'علامت سوال', replacement: '؟' },
  { id: '5', keyword: 'علامت تعجب', replacement: '!' },
  { id: '6', keyword: 'خط بعد', replacement: '\n' },
  { id: '7', keyword: 'پرانتز باز', replacement: '(' },
  { id: '8', keyword: 'پرانتز بسته', replacement: ')' },
  { id: '9', keyword: 'گیومه', replacement: '«' },
  { id: '10', keyword: 'گیومه بسته', replacement: '»' },
];

export const SmartWriter: React.FC<{ isOnline?: boolean }> = ({ isOnline = true }) => {
  const [text, setText] = useState(() => {
    try {
      return localStorage.getItem('smartWriter_draft') || '';
    } catch (e) {
      return '';
    }
  });

  const [replacements, setReplacements] = useState<Replacement[]>(() => {
    try {
      const savedReplacements = localStorage.getItem('smartWriter_replacements');
      return savedReplacements ? JSON.parse(savedReplacements) : DEFAULT_REPLACEMENTS;
    } catch (e) {
      return DEFAULT_REPLACEMENTS;
    }
  });

  const [state, setState] = useState<AudioState>(AudioState.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [ttsSpeed, setTtsSpeed] = useState(1.0);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [currentAudioElement, setCurrentAudioElement] = useState<HTMLAudioElement | null>(null);
  
  // Persist Auto Fix state
  const [autoFix, setAutoFix] = useState(() => {
    try {
        return localStorage.getItem('smartWriter_autofix') === 'true';
    } catch (e) {
        return false;
    }
  });

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const mimeTypeRef = useRef<string>('audio/webm');

  useEffect(() => {
    localStorage.setItem('smartWriter_draft', text);
  }, [text]);

  useEffect(() => {
    localStorage.setItem('smartWriter_replacements', JSON.stringify(replacements));
  }, [replacements]);

  useEffect(() => {
    localStorage.setItem('smartWriter_autofix', String(autoFix));
  }, [autoFix]);


  const applyReplacements = (inputText: string) => {
    let processed = inputText;
    replacements.forEach(({ keyword, replacement }) => {
        const regex = new RegExp(keyword, 'g');
        processed = processed.replace(regex, replacement);
    });
    return processed;
  };

  const startRecording = async () => {
    try {
      setError(null);

      // Offline Fallback using Web Speech API
      if (!isOnline) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setError("مرورگر شما از تایپ صوتی آفلاین پشتیبانی نمی‌کند.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'fa-IR';
        recognition.interimResults = true;
        recognition.continuous = true;

        recognition.onstart = () => {
            setState(AudioState.RECORDING);
        };

        recognition.onresult = (event: any) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            if (finalTranscript) {
                const processed = applyReplacements(finalTranscript);
                setText((prev) => (prev ? prev + ' ' + processed : processed));
            }
        };

        recognition.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            if (event.error !== 'aborted') {
                setError("خطا در تشخیص صدا: " + event.error);
            }
            setState(AudioState.IDLE);
        };

        recognition.onend = () => {
            setState(AudioState.IDLE);
        };

        (window as any).currentRecognition = recognition;
        recognition.start();
        return;
      }

      // Online Mode using MediaRecorder and Gemini
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Determine supported mime type (safari support)
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        mimeType = 'audio/ogg';
      }
      mimeTypeRef.current = mimeType;

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      setAudioStream(stream);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
        stream.getTracks().forEach(track => track.stop());
        setAudioStream(null);
        await handleTranscription(blob);
      };

      mediaRecorder.start();
      setState(AudioState.RECORDING);
    } catch (err) {
      setError("دسترسی به میکروفون امکان‌پذیر نیست.");
      console.error(err);
    }
  };

  const stopRecording = () => {
    if (!isOnline) {
        if ((window as any).currentRecognition) {
            (window as any).currentRecognition.stop();
            (window as any).currentRecognition = null;
        }
        setState(AudioState.IDLE);
        return;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setState(AudioState.PROCESSING);
      setAudioStream(null);
    }
  };

  const handleTranscription = async (blob: Blob) => {
    if (blob.size < 100) {
        setState(AudioState.IDLE);
        return;
    }

    try {
      let result = await transcribeAudio(blob);
      if (result) {
          result = applyReplacements(result);
          
          if (autoFix) {
              // Automatically run smart correct if enabled
              result = await smartCorrectText(result);
          }
          
          setText((prev) => (prev ? prev + ' ' + result : result));
      }
    } catch (err: any) {
      console.error(err);
      if (err.message === 'MISSING_API_KEY') {
        setError("کلید API یافت نشد. لطفاً فایل .env را تنظیم کنید.");
      } else {
        setError("خطا در ارتباط با سرور. لطفاً اتصال اینترنت یا اعتبار کلید API را بررسی کنید.");
      }
    } finally {
      setState(AudioState.IDLE);
    }
  };

  const handleSmartCorrect = async () => {
    if (!text.trim()) return;
    setError(null);
    setState(AudioState.PROCESSING);
    try {
      const corrected = await smartCorrectText(text);
      if (corrected) {
        setText(corrected);
      }
    } catch (err: any) {
      if (err.message === 'MISSING_API_KEY') {
        setError("کلید API یافت نشد.");
      } else {
        setError("خطا در اصلاح متن.");
      }
    } finally {
      setState(AudioState.IDLE);
    }
  };
  
  const handleDiacritics = async () => {
      if (!text.trim()) return;
      setError(null);
      setState(AudioState.PROCESSING);
      try {
          const processed = await addTextDiacritics(text);
          if (processed) {
              setText(processed);
          }
      } catch (err: any) {
          if (err.message === 'MISSING_API_KEY') {
              setError("کلید API یافت نشد.");
          } else {
              setError("خطا در اعراب‌گذاری.");
          }
      } finally {
          setState(AudioState.IDLE);
      }
  };

  const handleTTS = async () => {
      if (isPlayingTTS) {
          if (audioSourceRef.current) {
              try { audioSourceRef.current.stop(); } catch(e) {}
          }
          setIsPlayingTTS(false);
          return;
      }
      if (!text.trim()) return;
      setError(null);
      
      try {
          setIsPlayingTTS(true);
          const pcmData = await generateSpeech(text);
          // Pass the current ttsSpeed to playPCM
          const source = await playPCM(pcmData, 24000, () => {
              setIsPlayingTTS(false);
              setCurrentAudioElement(null);
          }, ttsSpeed);
          audioSourceRef.current = source;
          if (source.audioElement) {
              setCurrentAudioElement(source.audioElement);
          }
      } catch (err: any) {
          if (err.message === 'MISSING_API_KEY') {
            setError("کلید API یافت نشد.");
          } else {
            setError("خطا در پخش صدا.");
          }
          setIsPlayingTTS(false);
      }
  };
  
  const cycleSpeed = () => {
      const speeds = [0.75, 1.0, 1.25, 1.5, 2.0];
      const nextIndex = (speeds.indexOf(ttsSpeed) + 1) % speeds.length;
      setTtsSpeed(speeds[nextIndex]);
  };

  const handleTranslate = async () => {
      if (!text.trim()) return;
      setError(null);
      setState(AudioState.PROCESSING);
      try {
          const translated = await translateText(text);
          setText(translated);
      } catch (err: any) {
        if (err.message === 'MISSING_API_KEY') {
            setError("کلید API یافت نشد.");
        } else {
            setError("خطا در ترجمه.");
        }
      } finally {
          setState(AudioState.IDLE);
      }
  };

  const copyToClipboard = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError("کپی خودکار انجام نشد.");
    }
  };

  const handleDeleteClick = () => {
      if (showDeleteConfirm) {
          setText('');
          localStorage.removeItem('smartWriter_draft');
          setShowDeleteConfirm(false);
      } else {
          setShowDeleteConfirm(true);
          setTimeout(() => setShowDeleteConfirm(false), 3000);
      }
  };

  const insertAtCursor = (val: string) => {
    if (!textAreaRef.current) {
        setText(prev => prev + val);
        return;
    }
    const start = textAreaRef.current.selectionStart;
    const end = textAreaRef.current.selectionEnd;
    const newText = text.substring(0, start) + val + text.substring(end);
    setText(newText);
    setTimeout(() => {
        if(textAreaRef.current) {
            textAreaRef.current.selectionStart = textAreaRef.current.selectionEnd = start + val.length;
            textAreaRef.current.focus();
        }
    }, 0);
  };

  const handleBackspace = () => {
      if (!textAreaRef.current) return;
      const start = textAreaRef.current.selectionStart;
      const end = textAreaRef.current.selectionEnd;
      if (start === end && start > 0) {
          setText(text.substring(0, start - 1) + text.substring(end));
      } else if (start !== end) {
          setText(text.substring(0, start) + text.substring(end));
      }
      setTimeout(() => textAreaRef.current?.focus(), 0);
  };

  const handleMoveCursor = (dir: 'left' | 'right' | 'up' | 'down') => {
      if (!textAreaRef.current) return;
      const input = textAreaRef.current;
      const currentPos = input.selectionStart;
      let newPos = currentPos;
      
      if (dir === 'left') newPos = Math.max(0, currentPos - 1);
      if (dir === 'right') newPos = Math.min(input.value.length, currentPos + 1);
      
      input.selectionStart = input.selectionEnd = newPos;
      input.focus();
  };

  return (
    <div className="flex flex-col h-full p-4 gap-4 relative">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
        replacements={replacements}
        setReplacements={setReplacements}
      />

      {/* Toolbar */}
      <div className="flex justify-between items-center px-2">
         <div className="flex gap-2">
             <button 
                onClick={() => setIsSidebarOpen(true)}
                className="flex items-center gap-2 text-xs md:text-sm text-indigo-600 dark:text-indigo-400 font-bold hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-3 py-2 rounded-lg transition-colors"
             >
                <BookOpenIcon className="w-5 h-5" />
                اِعراب ها
             </button>
             
             <button
                onClick={() => setAutoFix(!autoFix)}
                disabled={!isOnline}
                className={`flex items-center gap-2 text-xs md:text-sm font-bold px-3 py-2 rounded-lg transition-colors border ${
                    !isOnline 
                    ? 'bg-gray-100 text-gray-400 border-gray-200 dark:bg-zinc-800 dark:text-zinc-600 dark:border-zinc-700 cursor-not-allowed'
                    : autoFix 
                    ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800' 
                    : 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
                }`}
                title={!isOnline ? "در حالت آفلاین در دسترس نیست" : "وقتی فعال باشد، متن بلافاصله پس از تایپ اصلاح می‌شود"}
             >
                <BoltIcon className="w-5 h-5" />
                {autoFix ? 'اصلاح آنی: روشن' : 'اصلاح آنی: خاموش'}
             </button>
         </div>
      </div>

      <div className="flex-1 bg-white dark:bg-zinc-900/50 rounded-2xl shadow-inner border border-gray-200 dark:border-zinc-800 p-4 relative overflow-hidden transition-colors duration-300 backdrop-blur-sm">
        <textarea
          ref={textAreaRef}
          className={`w-full h-full resize-none outline-none text-lg leading-relaxed text-gray-800 dark:text-zinc-200 bg-transparent placeholder-gray-400 dark:placeholder-zinc-600 text-right transition-all duration-300 ${isKeyboardOpen ? 'pb-72' : 'pb-4'}`}
          placeholder={isOnline ? "شروع به صحبت کنید..." : "تایپ کنید (حالت آفلاین)..."}
          value={text}
          onChange={(e) => setText(e.target.value)}
          dir="rtl"
        />
        {state === AudioState.PROCESSING && (
          <div className="absolute inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 dark:border-indigo-500"></div>
              <span className="text-indigo-800 dark:text-indigo-300 font-medium animate-pulse">
                  {autoFix ? 'درحال تایپ و اصلاح هوشمند...' : 'درحال پردازش...'}
              </span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="text-red-600 dark:text-red-300 text-sm font-medium text-center bg-red-100 dark:bg-red-900/40 border border-red-200 dark:border-red-800 p-3 rounded-xl shadow-sm" dir="rtl">
          {error}
        </div>
      )}

      {/* Audio Visualizer */}
      <div className={`transition-all duration-500 overflow-hidden flex items-center justify-center ${state === AudioState.RECORDING || isPlayingTTS ? 'h-16 opacity-100 mb-2' : 'h-0 opacity-0 mb-0'}`}>
         <AudioVisualizer 
             stream={audioStream} 
             audioElement={currentAudioElement} 
             isActive={state === AudioState.RECORDING || isPlayingTTS}
             barColor={state === AudioState.RECORDING ? '#4f46e5' : '#ea580c'} 
         />
      </div>

      <div className="flex flex-col gap-3">
        {/* Tools */}
        <div className="grid grid-cols-5 gap-2">
            <div className="relative flex">
                 <button
                    onClick={handleTTS}
                    disabled={(!text.trim() && !isPlayingTTS) || !isOnline}
                    className={`flex-1 flex items-center justify-center p-3 rounded-r-xl transition-colors z-10 ${
                        !isOnline 
                        ? 'bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-600 cursor-not-allowed'
                        : isPlayingTTS 
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-600 animate-pulse border border-red-200' 
                        : 'bg-orange-100 dark:bg-zinc-800 text-orange-600 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-zinc-700'
                    }`}
                >
                    {isPlayingTTS ? <PauseIcon className="w-5 h-5" /> : <SpeakerWaveIcon className="w-5 h-5" />}
                </button>
                <button
                    onClick={cycleSpeed}
                    disabled={!isOnline}
                    className={`flex items-center justify-center px-2 rounded-l-xl text-xs font-bold transition-colors border-l ${
                        !isOnline
                        ? 'bg-gray-200 dark:bg-zinc-700 text-gray-400 dark:text-zinc-600 border-gray-300 dark:border-zinc-600 cursor-not-allowed'
                        : 'bg-orange-200 dark:bg-zinc-700 text-orange-800 dark:text-orange-200 hover:bg-orange-300 dark:hover:bg-zinc-600 border-orange-300 dark:border-zinc-600'
                    }`}
                    title="سرعت پخش"
                >
                    {ttsSpeed}x
                </button>
            </div>
            
            <button
                onClick={handleTranslate}
                disabled={!text.trim() || state !== AudioState.IDLE || !isOnline}
                className={`flex items-center justify-center p-3 rounded-xl ${
                    !isOnline
                    ? 'bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-600 cursor-not-allowed'
                    : 'bg-blue-100 dark:bg-zinc-800 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-zinc-700'
                }`}
            >
                <LanguageIcon className="w-5 h-5" />
            </button>
            
             <button
                onClick={() => setIsKeyboardOpen(!isKeyboardOpen)}
                className={`flex items-center justify-center p-3 rounded-xl transition-colors ${
                    isKeyboardOpen
                    ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                    : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-700'
                }`}
                title="ایموجی و علائم"
            >
                <FaceSmileIcon className="w-5 h-5" />
            </button>

            <button
                onClick={copyToClipboard}
                disabled={!text.trim()}
                className={`flex items-center justify-center p-3 rounded-xl transition-colors ${
                    copied 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                    : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-700'
                }`}
            >
                {copied ? <CheckIcon className="w-5 h-5" /> : <DocumentDuplicateIcon className="w-5 h-5" />}
            </button>

            <button
                onClick={handleDeleteClick}
                disabled={!text.trim()}
                className={`flex items-center justify-center p-3 rounded-xl transition-colors ${
                    showDeleteConfirm 
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-red-100 dark:bg-zinc-800 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-zinc-700'
                }`}
            >
                <TrashIcon className="w-5 h-5" />
            </button>
        </div>
        
        {/* Manual Fix & Diacritics Buttons Split */}
        {!autoFix && (
            <div className="grid grid-cols-2 gap-3">
                 <button
                    onClick={handleDiacritics}
                    disabled={!text.trim() || state !== AudioState.IDLE || !isOnline}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 ${
                        !isOnline
                        ? 'bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-600 cursor-not-allowed'
                        : 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 hover:bg-teal-200 dark:hover:bg-teal-800/50'
                    }`}
                >
                    <DiacriticIcon className="w-5 h-5" />
                    اِعراب‌گذاری
                </button>
                <button
                    onClick={handleSmartCorrect}
                    disabled={!text.trim() || state !== AudioState.IDLE || !isOnline}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 ${
                        !isOnline
                        ? 'bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-600 cursor-not-allowed'
                        : 'bg-purple-100 dark:bg-zinc-800 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-zinc-700'
                    }`}
                >
                    <SparklesIcon className="w-5 h-5" />
                    اصلاح دستی
                </button>
            </div>
        )}

        {/* Record Button */}
        <button
          onClick={state === AudioState.RECORDING ? stopRecording : startRecording}
          disabled={state === AudioState.PROCESSING}
          className={`w-full py-5 rounded-2xl flex items-center justify-center gap-3 text-white font-bold text-xl shadow-lg transition-all transform active:scale-95 ${
            !isOnline
              ? state === AudioState.RECORDING
                ? 'bg-red-500 hover:bg-red-600 animate-pulse shadow-red-500/30 dark:shadow-red-900/50'
                : 'bg-gray-500 hover:bg-gray-600 shadow-gray-500/30 dark:shadow-gray-900/50 dark:bg-zinc-700 dark:hover:bg-zinc-600'
              : state === AudioState.RECORDING
              ? 'bg-red-500 hover:bg-red-600 animate-pulse shadow-red-500/30 dark:shadow-red-900/50'
              : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30 dark:shadow-indigo-900/50 dark:bg-indigo-700 dark:hover:bg-indigo-600'
          }`}
        >
          {state === AudioState.RECORDING ? (
            <>
              <div className="w-3 h-3 rounded-full bg-white animate-ping absolute left-10"></div>
              <StopIcon className="w-8 h-8" />
              توقف ضبط
            </>
          ) : (
            <>
              <MicrophoneIcon className="w-8 h-8" />
              {!isOnline ? 'شروع صحبت (آفلاین)' : autoFix ? 'صحبت کنید (اصلاح هوشمند)' : 'شروع صحبت'}
            </>
          )}
        </button>
      </div>

      {isKeyboardOpen && (
        <VirtualKeyboard 
            onInsert={insertAtCursor}
            onDelete={handleBackspace}
            onSpace={() => insertAtCursor(' ')}
            onEnter={() => insertAtCursor('\n')}
            onMoveCursor={handleMoveCursor}
            onClose={() => setIsKeyboardOpen(false)}
        />
      )}
    </div>
  );
};
