
import React, { useState, useEffect } from 'react';
import { SmartWriter } from './components/SmartWriter';
import { MoonIcon, SunIcon, WifiIcon } from '@heroicons/react/24/solid';

const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Toggle Dark Mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Monitor Online Status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="flex flex-col h-full max-w-md mx-auto bg-white dark:bg-black shadow-2xl md:max-w-2xl lg:max-w-4xl w-full transition-colors duration-300 border-x dark:border-zinc-900">
      {/* Header */}
      <header className="bg-indigo-600 dark:bg-zinc-950 text-white p-4 shadow-md z-10 flex justify-between items-center transition-colors duration-300 border-b dark:border-zinc-900">
        <div className="flex-1 flex items-center gap-2">
             <span className="text-[10px] opacity-60 font-mono">🎙🎧 v2.1.0</span>
             {!isOnline && (
               <span className="flex items-center gap-1 text-[10px] bg-red-500/20 text-red-200 px-2 py-0.5 rounded-full border border-red-500/50 animate-pulse">
                 <WifiIcon className="w-3 h-3" />
                 آفلاین
               </span>
             )}
        </div> 
        <div className="text-center">
          <h1 className="text-xl font-bold dark:text-zinc-100">تایپ صوتی هوشمند</h1>
          <p className="text-xs text-indigo-200 dark:text-zinc-400 mt-1">
            تبدیل گفتار به متن با دقت بالا و اصلاح هوشمند
          </p>
        </div>
        <div className="flex-1 flex justify-end">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 bg-indigo-500 dark:bg-zinc-800 rounded-full hover:bg-indigo-400 dark:hover:bg-zinc-700 transition-colors border border-transparent dark:border-zinc-700"
          >
            {isDarkMode ? <SunIcon className="w-5 h-5 text-yellow-400" /> : <MoonIcon className="w-5 h-5 text-indigo-100" />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative bg-gray-50 dark:bg-black transition-colors duration-300">
        <SmartWriter isOnline={isOnline} />
      </main>
    </div>
  );
};

export default App;
