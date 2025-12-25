
import React, { useState, useRef, useEffect } from 'react';
import { MicrophoneIcon, StopIcon, SparklesIcon, DocumentDuplicateIcon, TrashIcon, CheckIcon, BookOpenIcon, SpeakerWaveIcon, LanguageIcon, PencilSquareIcon, PauseIcon } from '@heroicons/react/24/solid';
import { transcribeAudio, smartCorrectText, generateSpeech, translateText } from '../services/geminiService';
import { playPCM } from '../utils/audioUtils';
import { AudioState } from '../types';
import { Sidebar, Replacement } from './Sidebar';
import { VirtualKeyboard } from './VirtualKeyboard';

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

export const SmartWriter: React.FC = () => {
  // State with Lazy Initialization for Persistence
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
      console.error("Error loading replacements:", e);
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

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // --- Auto Save ---
  useEffect(() => {
    localStorage.setItem('smartWriter_draft', text);
  }, [text]);

  useEffect(() => {
    localStorage.setItem('smartWriter_replacements', JSON.stringify(replacements));
  }, [replacements]);

  // Auto-scroll (only if user is not manually editing significantly up)
  useEffect(() => {
    if (textAreaRef.current && state === AudioState.IDLE && !isKeyboardOpen) {
      // Gentle check to avoid jumping while editing
    }
  }, [text, state]);


  // --- Logic ---

  const applyReplacements = (inputText: string) => {
    let processed = inputText;
    replacements.forEach(({ keyword, replacement }) => {
        // Regex to match whole words/phrases loosely
        const regex = new RegExp(keyword, 'g');
        processed = processed.replace(regex, replacement);
    });
    return processed;
  };

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = []; // Reset chunks

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        // Stop all tracks immediately
        stream.getTracks().forEach(track => track.stop());
        
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
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setState(AudioState.PROCESSING);
    }
  };

  const handleTranscription = async (blob: Blob) => {
    // Only process if blob has significant size
    if (blob.size < 100) {
        setState(AudioState.IDLE);
        return;
    }

    try {
      const transcribedText = await transcribeAudio(blob);
      if (transcribedText) {
          // Apply user replacements immediately after transcription
          const final = applyReplacements(transcribedText);
          setText((prev) => (prev ? prev + ' ' + final : final));
      }
    } catch (err) {
      console.error(err);
      setError("خطا در ارتباط با سرور. لطفاً مجدد تلاش کنید.");
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
    } catch (err) {
      console.error(err);
      setError("خطا در اصلاح هوشمند. لطفا اتصال اینترنت را بررسی کنید.");
    } finally {
      setState(AudioState.IDLE);
    }
  };

  const handleTTS = async () => {
      // Toggle Stop logic
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
          const source = await playPCM(pcmData, 24000, () => {
              setIsPlayingTTS(false);
          });
          audioSourceRef.current = source;
      } catch (err) {
          console.error(err);
          setError("خطا در پخش صدا.");
          setIsPlayingTTS(false);
      }
  };

  const handleTranslate = async () => {
      if (!text.trim()) return;
      setError(null);
      setState(AudioState.PROCESSING);
      try {
          const translated = await translateText(text);
          setText(translated);
      } catch (err) {
          console.error(err);
          setError("خطا در ترجمه.");
      } finally {
          setState(AudioState.IDLE);
      }
  };

  const copyToClipboard = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      showCopySuccess();
    } catch (err) {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        showCopySuccess();
      } catch (fallbackErr) {
        setError("کپی خودکار انجام نشد.");
      }
    }
  };

  const showCopySuccess = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteClick = () => {
      if (showDeleteConfirm) {
          setText('');
          localStorage.removeItem('smartWriter_draft');
          setShowDeleteConfirm(false);
      } else {
          setShowDeleteConfirm(true);
          setTimeout(() => setShowDeleteConfirm(false), 3000); // Reset after 3s if not confirmed
      }
  };

  // --- Keyboard Helpers ---
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
          setTimeout(() => {
            if(textAreaRef.current) {
                textAreaRef.current.selectionStart = textAreaRef.current.selectionEnd = start - 1;
                textAreaRef.current.focus();
            }
          }, 0);
      } else if (start !== end) {
          setText(text.substring(0, start) + text.substring(end));
          setTimeout(() => {
             if(textAreaRef.current) {
                textAreaRef.current.selectionStart = textAreaRef.current.selectionEnd = start;
                textAreaRef.current.focus();
            }
          }, 0);
      }
  };

  const handleMoveCursor = (dir: 'left' | 'right' | 'up' | 'down') => {
      if (!textAreaRef.current) return;
      const input = textAreaRef.current;
      const currentPos = input.selectionStart;
      
      let newPos = currentPos;
      
      if (dir === 'left') newPos = Math.max(0, currentPos - 1);
      if (dir === 'right') newPos = Math.min(input.value.length, currentPos + 1);
      if (dir === 'up') {
          const lastLineBreak = input.value.lastIndexOf('\n', currentPos - 1);
          if (lastLineBreak !== -1) {
               const prevLineBreak = input.value.lastIndexOf('\n', lastLineBreak - 1);
               const offset = currentPos - lastLineBreak;
               newPos = prevLineBreak + offset;
          } else {
              newPos = 0;
          }
      }
      if (dir === 'down') {
           const nextLineBreak = input.value.indexOf('\n', currentPos);
           if (nextLineBreak !== -1) {
               newPos = nextLineBreak + 1;
           } else {
               newPos = input.value.length;
           }
      }

      if (newPos < 0) newPos = 0;
      if (newPos > input.value.length) newPos = input.value.length;

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

      {/* Toolbar / Header within Writer */}
      <div className="flex justify-between items-center px-2">
         <button 
           onClick={() => setIsSidebarOpen(true)}
           className="flex items-center gap-2 text-xs md:text-sm text-indigo-600 dark:text-indigo-400 font-bold hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-3 py-2 rounded-lg transition-colors"
         >
            <BookOpenIcon className="w-5 h-5" />
            اِعراب ها 📌
         </button>
      </div>

      <div className="flex-1 bg-white dark:bg-zinc-900/50 rounded-2xl shadow-inner border border-gray-200 dark:border-zinc-800 p-4 relative overflow-hidden transition-colors duration-300 backdrop-blur-sm">
        <textarea
          ref={textAreaRef}
          className={`w-full h-full resize-none outline-none text-lg leading-relaxed text-gray-800 dark:text-zinc-200 bg-transparent placeholder-gray-400 dark:placeholder-zinc-600 text-right transition-all duration-300 ${isKeyboardOpen ? 'pb-80 md:pb-96' : 'pb-4'}`}
          placeholder="شروع به صحبت کنید، متن شما اینجا تایپ می‌شود..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          dir="rtl"
          style={{ direction: 'rtl', textAlign: 'right' }} 
        />
        {state === AudioState.PROCESSING && (
          <div className="absolute inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 dark:border-indigo-500 mb-2"></div>
              <span className="text-indigo-800 dark:text-indigo-300 font-medium">   رِفیق دَرحالِ پَردازِشَم 🙂...</span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="text-red-500 dark:text-red-400 text-sm text-center bg-red-50 dark:bg-red-950/30 border dark:border-red-900/50 p-2 rounded-lg" dir="rtl">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {/* Action Buttons Row 1: Tools */}
        <div className="grid grid-cols-5 gap-2">
             <button
                onClick={handleTTS}
                disabled={!text.trim() && !isPlayingTTS}
                className={`flex items-center justify-center p-3 rounded-xl transition-colors ${
                    isPlayingTTS 
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 animate-pulse border border-red-200' 
                    : 'bg-orange-100 dark:bg-zinc-800 text-orange-600 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-zinc-700'
                }`}
                title={isPlayingTTS ? "توقف" : "پخش متن"}
            >
                {isPlayingTTS ? <PauseIcon className="w-5 h-5" /> : <SpeakerWaveIcon className="w-5 h-5" />}
            </button>
            
            <button
                onClick={handleTranslate}
                disabled={!text.trim() || state !== AudioState.IDLE}
                className="flex items-center justify-center p-3 rounded-xl bg-blue-100 dark:bg-zinc-800 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-zinc-700 transition-colors"
                title="ترجمه (فارسی/انگلیسی)"
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
                title="کیبورد مجازی"
            >
                <PencilSquareIcon className="w-5 h-5" />
            </button>

            <button
                onClick={copyToClipboard}
                disabled={!text.trim()}
                className={`flex items-center justify-center p-3 rounded-xl transition-colors ${
                    copied 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                    : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-700'
                }`}
                title="کپی متن"
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
                title="پاک کردن"
            >
                <TrashIcon className="w-5 h-5" />
            </button>
        </div>
        
        {/* Action Buttons Row 2: AI Fix */}
        <button
            onClick={handleSmartCorrect}
            disabled={!text.trim() || state !== AudioState.IDLE}
            className="flex items-center justify-center gap-2 bg-purple-100 dark:bg-zinc-800 text-purple-700 dark:text-purple-300 py-3 rounded-xl font-medium hover:bg-purple-200 dark:hover:bg-zinc-700 disabled:opacity-50 transition-colors border border-transparent dark:border-zinc-700"
        >
            <SparklesIcon className="w-5 h-5" />
            اصلاح هوشمند (نِگارِش و ِاِملاٰء)
        </button>

        {/* Record Button */}
        <button
          onClick={state === AudioState.RECORDING ? stopRecording : startRecording}
          disabled={state === AudioState.PROCESSING}
          className={`w-full py-5 rounded-2xl flex items-center justify-center gap-3 text-white font-bold text-xl shadow-lg transition-all transform active:scale-95 ${
            state === AudioState.RECORDING
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
              شروع صحبت
            </>
          )}
        </button>
      </div>

      {/* Fixed Keyboard at Bottom (Moved outside main container but logically here) */}
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
