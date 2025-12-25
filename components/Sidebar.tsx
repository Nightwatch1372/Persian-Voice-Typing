import React, { useState, useEffect } from 'react';
import { XMarkIcon, PlusIcon, TrashIcon, ArrowPathIcon } from '@heroicons/react/24/solid';

export interface Replacement {
  id: string;
  keyword: string;
  replacement: string;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  replacements: Replacement[];
  setReplacements: (items: Replacement[]) => void;
}

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

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, replacements, setReplacements }) => {
  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('');

  const resetDefaults = () => {
    if(window.confirm('آیا مطمئن هستید؟ لیست به تنظیمات اولیه برمی‌گردد.')) {
      setReplacements(DEFAULT_REPLACEMENTS);
    }
  };

  const addItem = () => {
    if (newKey && newVal) {
      setReplacements([...replacements, { id: Date.now().toString(), keyword: newKey, replacement: newVal }]);
      setNewKey('');
      setNewVal('');
    }
  };

  const deleteItem = (id: string) => {
    setReplacements(replacements.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: 'keyword' | 'replacement', value: string) => {
    setReplacements(replacements.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  return (
    <div className={`fixed inset-y-0 left-0 w-80 bg-white dark:bg-zinc-900 shadow-2xl transform transition-transform duration-300 ease-in-out z-50 border-r dark:border-zinc-800 flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      
      {/* Header */}
      <div className="p-4 bg-indigo-600 dark:bg-zinc-950 text-white flex justify-between items-center shadow-md">
        <h3 className="font-bold"> راهنَمایِ اِعراب ها</h3>
        <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
          <XMarkIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Info */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 text-xs leading-5 border-b dark:border-blue-900/30" dir="rtl">
        در هنگام صحبت، اگر این کلمات را بگویید، به صورت خودکار با علامت مقابل جایگزین می‌شوند. می‌توانید آن‌ها را تغییر دهید.
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {replacements.map((item) => (
          <div key={item.id} className="flex gap-2 items-center bg-gray-50 dark:bg-zinc-800/50 p-2 rounded-lg border border-gray-100 dark:border-zinc-700/50">
             <button onClick={() => deleteItem(item.id)} className="text-red-400 hover:text-red-600 dark:hover:text-red-300 p-1">
              <TrashIcon className="w-4 h-4" />
            </button>
            <input 
              value={item.replacement}
              onChange={(e) => updateItem(item.id, 'replacement', e.target.value)}
              className="w-14 text-center bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded p-1 text-sm font-['Vazirmatn'] text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-indigo-500"
              placeholder="علامت"
              style={{ fontFamily: 'Vazirmatn, sans-serif' }}
            />
            <span className="text-gray-400">←</span>
            <input 
              value={item.keyword}
              onChange={(e) => updateItem(item.id, 'keyword', e.target.value)}
              className="flex-1 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded p-1 text-sm text-right font-['Vazirmatn'] text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-indigo-500"
              placeholder="کلمه گفتاری"
              dir="rtl"
              style={{ fontFamily: 'Vazirmatn, sans-serif' }}
            />
          </div>
        ))}
      </div>

      {/* Add New */}
      <div className="p-4 bg-gray-100 dark:bg-zinc-950 border-t dark:border-zinc-800 space-y-3">
        <div className="text-xs font-bold text-gray-500 dark:text-gray-400 text-right">افزودن مورد جدید:</div>
        <div className="flex gap-2">
            <input 
                value={newVal}
                onChange={(e) => setNewVal(e.target.value)}
                className="w-16 text-center border rounded p-2 text-sm bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 font-['Vazirmatn'] text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                placeholder="علامت"
                style={{ fontFamily: 'Vazirmatn, sans-serif' }}
            />
            <input 
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                className="flex-1 border rounded p-2 text-sm text-right bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 font-['Vazirmatn'] text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                placeholder="کلمه (مثلا: خط تیره)"
                dir="rtl"
                style={{ fontFamily: 'Vazirmatn, sans-serif' }}
            />
        </div>
        <div className="flex gap-2">
            <button onClick={resetDefaults} className="flex-1 py-2 text-gray-500 text-xs flex items-center justify-center gap-1 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded">
                <ArrowPathIcon className="w-3 h-3" />
                بازنشانی
            </button>
            <button onClick={addItem} className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded flex items-center justify-center gap-1 text-sm font-bold shadow-lg shadow-indigo-200 dark:shadow-none">
                <PlusIcon className="w-4 h-4" />
                افزودن
            </button>
        </div>
      </div>
    </div>
  );
};