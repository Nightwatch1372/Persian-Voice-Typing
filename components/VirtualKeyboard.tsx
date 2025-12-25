
import React, { useState } from 'react';
import { XMarkIcon, ChevronUpIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, FaceSmileIcon, BackspaceIcon, PencilSquareIcon } from '@heroicons/react/24/solid';

interface VirtualKeyboardProps {
    onInsert: (char: string) => void;
    onDelete: () => void;
    onSpace: () => void;
    onEnter: () => void;
    onClose: () => void;
    onMoveCursor: (direction: 'left' | 'right' | 'up' | 'down') => void;
}

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({ onInsert, onDelete, onSpace, onEnter, onClose, onMoveCursor }) => {
    const [isShift, setIsShift] = useState(false);
    const [isEmojiMode, setIsEmojiMode] = useState(false);
    
    // Standard Persian Keyboard Mapping
    const row1 = [
        { normal: 'Esc', type: 'esc' },
        { normal: '1', shift: '!' }, { normal: '2', shift: '@' }, { normal: '3', shift: '#' },
        { normal: '4', shift: '$' }, { normal: '5', shift: '%' }, { normal: '6', shift: '^' },
        { normal: '7', shift: '&' }, { normal: '8', shift: '*' }, { normal: '9', shift: '(' },
        { normal: '0', shift: ')' }, { normal: '-', shift: '_' }, { normal: '=', shift: '+' },
        { normal: 'Backspace', type: 'backspace' }
    ];

    const row2 = [
        { normal: 'Tab', type: 'tab' },
        { normal: 'ض', shift: 'ْ' }, { normal: 'ص', shift: 'ٌ' }, { normal: 'ث', shift: 'ٍ' },
        { normal: 'ق', shift: 'ً' }, { normal: 'ف', shift: 'ُ' }, { normal: 'غ', shift: 'ِ' },
        { normal: 'ع', shift: 'َ' }, { normal: 'ه', shift: 'ۀ' }, { normal: 'خ', shift: ']' },
        { normal: 'ح', shift: '        ' }, { normal: 'ج', shift: '}' }, { normal: 'چ', shift: '{' },
        { normal: '\\', shift: '|' }
    ];

    const row3 = [
        { normal: 'Caps', type: 'caps' },
        { normal: 'ش', shift: 'ؤ' }, { normal: 'س', shift: 'ئ' }, { normal: 'ی', shift: 'ي' },
        { normal: 'ب', shift: 'إ' }, { normal: 'ل', shift: 'أ' }, { normal: 'ا', shift: 'آ' },
        { normal: 'ت', shift: 'ة' }, { normal: 'ن', shift: '»' }, { normal: 'م', shift: '«' },
        { normal: 'ک', shift: ':' }, { normal: 'گ', shift: '"' },
        { normal: 'Enter', type: 'enter' }
    ];

    const row4 = [
        { normal: 'Shift', type: 'shift' },
        { normal: 'ظ', shift: 'ك' }, { normal: 'ط', shift: 'ٓ' }, { normal: 'ز', shift: 'ژ' },
        { normal: 'ر', shift: 'ٰ' }, { normal: 'ذ', shift: 'ذ' }, { normal: 'د', shift: 'ٔ' },
        { normal: 'پ', shift: 'پ' }, { normal: 'و', shift: 'ء' }, { normal: '.', shift: '>' },
        { normal: '/', shift: '؟' },
        { normal: 'Shift', type: 'shift' }
    ];

    const emojis = [
          '😀','😃','😄','😁','😆','😅','😂','🤣',
          '😊','😇','🙂','🙃','😉','😌','😍','🥰',
          '😘','😗','😙','😚','😋','😛','😜','🤪',
          '😝','🤑','🤗','🤭','🤫','🤔','🤐','😐',
          '😑','😶','🙄','😏','😣','😥','😮','🤐',
          '😔','😪','🤤','😴','😷','🤒','🤕','🤢',
          '🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠',
          '🥳','😎','🤓','🧐','😕','😟','🙁','☹️',
          '😮','😯','😲','😳','🥺','😦','😧','😨',
          '😰','😥','😢','😭','😱','😖','😣','😞',
          '😓','😩','😫','😤','😡','😠','🤬','👋',
          '🤚','🖐','✋','🖖','👌','🤌','🤏','✌️',
          '🤞','🤟','🤘','🤙','👈','👉','👆','👇',
          '☝️','👍','👎','✊','👊','🤛','🤜','👏',
          '🙌','👐','🤲','🙏','🤝','✍️','💅','🤳',
          '👀','👁️','👅','👄','👶','🧒','👦','👧',
          '🧑','👨','👩','🧔','👱','👨‍🦰','👩‍🦰','👨‍🦱',
          '👩‍🦱','👨‍🦳','👩‍🦳','👨‍🦲','👩‍🦲','🧓','👴','👵',
          '🙍','🙎','🙅','🙆','💁','🙋','🧏','🙇',
          '🤦','🤷','🧑‍⚕️','🧑‍🎓','🧑‍🏫','🧑‍⚖️','🧑‍🔧','🧑‍🏭','🧑‍💼','🧑‍🔬',
          '🧑‍🎨','🧑‍🚒','👮','🕵️','💂','👷','🤴','👸','👳',
          '👲','🧕','🤵','👰','🤰','🤱','🧑‍🍼',
          '🧎','🧍','🚶','🏃','🧑‍🦯','🧑‍🦼','🧑‍🦽','🦾',
          '🦿','🦵','🦶','💪','🦻','🧠','🦷','🦴',
          '💯','📌','📍','💻','🚀','🎤','💦','🍳',
          '❗','❓','‼️','⁉️'
    ];

    const KeyButton: React.FC<{ k: any, w?: number }> = ({ k, w = 1 }) => {
        const isSpecial = k.type !== undefined;
        let label = isShift && k.shift ? k.shift : k.normal;

        // Visual overrides for special keys
        if (k.type === 'backspace') label = <BackspaceIcon className="w-5 h-5 mx-auto" />;
        if (k.type === 'enter') label = 'Enter';
        if (k.type === 'shift') label = 'Shift';
        if (k.type === 'caps') label = 'Caps';
        if (k.type === 'tab') label = 'Tab';
        if (k.type === 'esc') label = 'Esc';

        const handleClick = (e: any) => {
            e.preventDefault();
            if (k.type === 'esc') onClose();
            else if (k.type === 'backspace') onDelete();
            else if (k.type === 'enter') onEnter();
            else if (k.type === 'shift') setIsShift(!isShift);
            else if (k.type === 'caps') setIsShift(!isShift);
            else if (k.type === 'tab') onInsert('    ');
            else onInsert(label);
        };

        return (
            <button
                onClick={handleClick}
                className={`
                    h-10 md:h-12 rounded shadow-sm text-sm md:text-base font-bold active:scale-95 transition-all select-none
                    ${isSpecial ? 'bg-gray-300 dark:bg-zinc-600 text-gray-800 dark:text-gray-100' : 'bg-white dark:bg-zinc-700 text-gray-800 dark:text-white hover:bg-indigo-50 dark:hover:bg-zinc-600'}
                    ${k.type === 'shift' && isShift ? 'bg-indigo-500 !text-white' : ''}
                `}
                style={{ flex: w }}
            >
                {label}
            </button>
        );
    };

    return (
        <div 
            className="fixed bottom-0 left-0 right-0 z-50 w-full bg-gray-200 dark:bg-zinc-800 shadow-[0_-4px_20px_rgba(0,0,0,0.3)] border-t border-gray-300 dark:border-zinc-700 font-['Vazirmatn']"
            dir="ltr"
        >
            {/* Header */}
            <div className="flex justify-between items-center px-3 py-2 bg-gray-300 dark:bg-zinc-700 border-b border-gray-400 dark:border-zinc-600">
                 <div className="flex items-center gap-2">
                     <PencilSquareIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                     <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                        {isEmojiMode ? 'ایموجی' : 'کیبورد فارسی'}
                     </span>
                 </div>
                 <button 
                    onClick={onClose} 
                    className="p-1 bg-red-500 rounded hover:bg-red-600 text-white transition-colors"
                 >
                    <XMarkIcon className="w-4 h-4"/>
                 </button>
            </div>

            <div className="p-2 max-w-5xl mx-auto">
                {isEmojiMode ? (
                    <div className="grid grid-cols-8 md:grid-cols-10 gap-1 p-2 h-56 overflow-y-auto">
                        {emojis.map((e, i) => (
                            <button key={i} onClick={() => onInsert(e)} className="text-2xl hover:bg-gray-300 dark:hover:bg-zinc-600 rounded p-2 transition-colors">{e}</button>
                        ))}
                        <div className="col-span-full flex justify-center mt-2">
                            <button onClick={() => setIsEmojiMode(false)} className="px-6 py-2 bg-indigo-500 text-white rounded-md text-sm font-bold">بازگشت به حروف</button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-1.5 pb-2">
                        {/* Row 1 */}
                        <div className="flex gap-1">
                            {row1.map((k, i) => <KeyButton key={i} k={k} w={k.type === 'backspace' ? 1.5 : 1} />)}
                        </div>
                        {/* Row 2 */}
                        <div className="flex gap-1">
                            {row2.map((k, i) => <KeyButton key={i} k={k} w={k.type === 'tab' ? 1.2 : 1} />)}
                        </div>
                        {/* Row 3 */}
                        <div className="flex gap-1">
                            {row3.map((k, i) => <KeyButton key={i} k={k} w={k.type === 'enter' ? 1.5 : (k.type === 'caps' ? 1.3 : 1)} />)}
                        </div>
                        {/* Row 4 */}
                        <div className="flex gap-1">
                            {row4.map((k, i) => <KeyButton key={i} k={k} w={k.type === 'shift' ? 1.8 : 1} />)}
                        </div>
                        {/* Row 5: Controls & Space & Arrows */}
                        <div className="flex gap-1 h-10 md:h-12">
                            <button className="flex-1 bg-gray-300 dark:bg-zinc-600 rounded text-xs font-bold text-gray-700 dark:text-gray-200">Ctrl</button>
                            <button onClick={() => setIsEmojiMode(true)} className="flex-1 bg-gray-300 dark:bg-zinc-600 rounded flex items-center justify-center hover:bg-gray-400 dark:hover:bg-zinc-500">
                                <FaceSmileIcon className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                            </button>
                            <button className="flex-1 bg-gray-300 dark:bg-zinc-600 rounded text-xs font-bold text-gray-700 dark:text-gray-200">Alt</button>
                            <button onClick={(e) => {e.preventDefault(); onSpace()}} className="flex-[4] bg-white dark:bg-zinc-700 rounded shadow-sm text-xs hover:bg-indigo-50 dark:hover:bg-zinc-600"></button>
                            <button className="flex-1 bg-gray-300 dark:bg-zinc-600 rounded text-xs font-bold text-gray-700 dark:text-gray-200">Alt</button>
                            <button className="flex-1 bg-gray-300 dark:bg-zinc-600 rounded text-xs font-bold text-gray-700 dark:text-gray-200">Ctrl</button>
                            
                            {/* Arrows */}
                            <div className="flex-[1.5] flex gap-0.5">
                                <button onClick={() => onMoveCursor('left')} className="flex-1 bg-gray-700 dark:bg-zinc-600 text-white rounded flex items-center justify-center active:bg-black"><ChevronLeftIcon className="w-3 h-3" /></button>
                                <div className="flex flex-col flex-1 gap-0.5">
                                    <button onClick={() => onMoveCursor('up')} className="flex-1 bg-gray-700 dark:bg-zinc-600 text-white rounded flex items-center justify-center active:bg-black"><ChevronUpIcon className="w-3 h-3" /></button>
                                    <button onClick={() => onMoveCursor('down')} className="flex-1 bg-gray-700 dark:bg-zinc-600 text-white rounded flex items-center justify-center active:bg-black"><ChevronDownIcon className="w-3 h-3" /></button>
                                </div>
                                <button onClick={() => onMoveCursor('right')} className="flex-1 bg-gray-700 dark:bg-zinc-600 text-white rounded flex items-center justify-center active:bg-black"><ChevronRightIcon className="w-3 h-3" /></button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
