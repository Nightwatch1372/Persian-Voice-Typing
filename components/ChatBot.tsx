import React, { useState, useRef, useEffect } from 'react';
import { createChatSession, searchWeb } from '../services/geminiService';
import { PaperAirplaneIcon, GlobeAltIcon, SparklesIcon } from '@heroicons/react/24/solid';
import { Message } from '../types';

export const ChatBot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'سلام! من دستیار هوشمند شما هستم. چطور می‌تونم کمکتون کنم؟' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const chatSession = useRef(createChatSession());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      if (isSearchMode) {
        // Search Mode (Flash)
        const result = await searchWeb(userMsg.text);
        let responseText = result.text;
        
        if (result.links && result.links.length > 0) {
            responseText += "\n\nمنابع:\n" + result.links.map((l: any) => `- [${l.title}](${l.uri})`).join('\n');
        }
        
        setMessages(prev => [...prev, { role: 'model', text: responseText }]);
      } else {
        // Standard Chat Mode (Pro)
        const result = await chatSession.current.sendMessage({ message: userMsg.text });
        setMessages(prev => [...prev, { role: 'model', text: result.text || "بدون پاسخ." }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: "متاسفانه خطایی رخ داد. لطفا دوباره تلاش کنید.", isError: true }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Mode Toggle */}
      <div className="p-2 bg-white dark:bg-gray-800 shadow-sm flex justify-center border-b border-gray-100 dark:border-gray-700">
        <button
          onClick={() => setIsSearchMode(!isSearchMode)}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            isSearchMode 
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-800' 
              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          {isSearchMode ? <GlobeAltIcon className="w-4 h-4" /> : <SparklesIcon className="w-4 h-4" />}
          {isSearchMode ? "جستجو در گوگل (فعال)" : "چت هوشمند (Pro)"}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl p-3 text-sm md:text-base whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-none'
                  : msg.isError 
                    ? 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 rounded-bl-none'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-none shadow-sm'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-2xl rounded-bl-none shadow-sm">
              <div className="flex space-x-1 space-x-reverse">
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={isSearchMode ? "سوال خود را برای جستجو بپرسید..." : "پیام خود را بنویسید..."}
            className="flex-1 bg-gray-100 dark:bg-gray-700 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all outline-none"
            dir="rtl"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none"
          >
            <PaperAirplaneIcon className="w-6 h-6 transform rotate-180" />
          </button>
        </div>
      </div>
    </div>
  );
};