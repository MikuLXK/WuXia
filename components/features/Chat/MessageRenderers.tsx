
import React from 'react';

type JudgmentModifier = {
    key: string;
    label: string;
    value: number | null;
    reason?: string;
    raw: string;
};

type ParsedJudgment = {
    eventName: string;
    result: string;
    target: string;
    score: number;
    difficulty: number;
    modifiers: JudgmentModifier[];
};

const createEmptyJudgment = (): ParsedJudgment => ({
    eventName: '判定事件',
    result: '未知',
    target: '自身',
    score: 0,
    difficulty: 0,
    modifiers: []
});

const MODIFIER_LABELS: Record<string, string> = {
    基础: '基础',
    环境: '环境',
    状态: '状态',
    幸运: '幸运',
    装备: '装备'
};

const parseModifier = (part: string): JudgmentModifier | null => {
    const modifierMatch = part.match(/^(基础|环境|状态|幸运|装备)\s*([+\-]?\d+(?:\.\d+)?)(?:\s*\((.+)\))?$/);
    if (!modifierMatch) return null;

    const [, key, valueRaw, reason] = modifierMatch;
    return {
        key,
        label: MODIFIER_LABELS[key] || key,
        value: Number(valueRaw),
        reason: reason?.trim(),
        raw: part
    };
};

const parseJudgmentText = (text: string): ParsedJudgment => {
    const parts = text.split('｜').map(s => s.trim()).filter(Boolean);
    if (parts.length === 0) return createEmptyJudgment();

    const parsed: ParsedJudgment = {
        ...createEmptyJudgment(),
        modifiers: [],
        eventName: parts[0] || '判定事件'
    };

    const isResultToken = (token: string) => /(成功|失败|大成功|大失败|极成功|极失败)/.test(token);

    if (parts[1] && isResultToken(parts[1])) {
        parsed.result = parts[1];
    }

    for (let i = 1; i < parts.length; i++) {
        const part = parts[i];

        if (isResultToken(part)) {
            parsed.result = part;
            continue;
        }

        const targetMatch = part.match(/^触发对象\s*(.+)$/);
        if (targetMatch) {
            parsed.target = targetMatch[1].trim() || parsed.target;
            continue;
        }

        const scoreDiffMatch = part.match(/^判定值\s*([+\-]?\d+(?:\.\d+)?)\s*\/\s*难度\s*([+\-]?\d+(?:\.\d+)?)$/);
        if (scoreDiffMatch) {
            parsed.score = Number(scoreDiffMatch[1]);
            parsed.difficulty = Number(scoreDiffMatch[2]);
            continue;
        }

        const modifier = parseModifier(part);
        if (modifier) {
            parsed.modifiers.push(modifier);
            continue;
        }
    }

    return parsed;
};

// --- 1. Narrator Renderer (Wuxia/Novel Style) ---
export const NarratorRenderer: React.FC<{ text: string }> = ({ text }) => (
    <div className="w-full my-6 px-6 py-4 bg-gradient-to-r from-black/60 via-black/40 to-transparent border-l-4 border-gray-600 text-gray-300 font-serif leading-loose italic relative overflow-hidden rounded-r-lg">
        {/* Subtle background deco */}
        <div className="absolute top-0 right-0 text-[100px] text-white/5 font-serif leading-none select-none pointer-events-none -translate-y-8 translate-x-4">
            "
        </div>
        <p className="relative z-10">{text}</p>
    </div>
);

// --- 2. Persona 5 Style Character Dialogue (Updated to Rounded) ---
export const CharacterRenderer: React.FC<{ sender: string; text: string }> = ({ sender, text }) => {
    // Generate a consistent pseudo-random color based on name
    const colors = ['bg-red-800', 'bg-blue-800', 'bg-emerald-800', 'bg-violet-800', 'bg-amber-800'];
    const colorIdx = sender.charCodeAt(0) % colors.length;
    const bgClass = colors[colorIdx];

    return (
        <div className="flex w-full my-6 items-start group pl-2">
            
            {/* Left Column: Avatar & Name */}
            <div className="flex flex-col items-center mr-4 relative z-20 shrink-0">
                {/* Avatar Placeholder (Rounded Box) */}
                <div className={`w-14 h-14 ${bgClass} rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-[0_4px_10px_rgba(0,0,0,0.5)] border border-white/20 relative overflow-hidden transition-transform group-hover:scale-105 duration-300`}>
                     {/* Inner noise texture */}
                     <div className="absolute inset-0 bg-noise opacity-30 mix-blend-overlay"></div>
                     <span className="relative z-10 drop-shadow-md">{sender[0]}</span>
                </div>

                {/* Name Tag */}
                <div className="mt-2 bg-black/80 border border-gray-700 px-2 py-0.5 rounded-md shadow-md z-20 max-w-[80px] text-center backdrop-blur-sm">
                    <span className="text-gray-200 text-[10px] font-sans font-bold tracking-wider truncate block">
                        {sender}
                    </span>
                </div>
            </div>

            {/* Speech Bubble - Removed mt-1 for better alignment */}
            <div className="relative flex-1">
                {/* Bubble Body - Removed tail */}
                <div className="relative bg-[#EAEAEA] text-[#1A1A1A] px-5 py-4 rounded-2xl shadow-lg border border-gray-400/50 z-10 min-h-[60px] flex items-center">
                     
                    <p className="font-sans font-medium text-base leading-relaxed relative z-10 tracking-wide">
                        {text}
                    </p>
                </div>
            </div>
        </div>
    );
};

// --- 3. Judgment Renderer (Refined Visuals - Rounded, Event, Target, Distinct Numbers) ---
export const JudgmentRenderer: React.FC<{ text: string; isNsfw?: boolean }> = ({ text, isNsfw }) => {
    const parsed = parseJudgmentText(text);
    const scoreValue = parsed.score;
    const difficultyValue = parsed.difficulty;
    const result = parsed.result;

    const isSuccess = /(成功|大成功|极成功)/.test(result) && !/(失败|大失败|极失败)/.test(result);
    const isCrit = /(大成功|极成功|大失败|极失败)/.test(result);
    
    // Theme Config
    const theme = isNsfw 
        ? {
            border: 'border-pink-500/50',
            bg: 'bg-gradient-to-br from-pink-950/90 to-purple-900/90',
            accent: 'text-pink-400',
            successColor: 'text-pink-300',
            bar: 'bg-pink-500',
            icon: '❤'
          }
        : {
            border: isSuccess ? 'border-wuxia-gold/50' : 'border-gray-600/50',
            bg: isSuccess ? 'bg-gradient-to-br from-[#1a1500]/90 to-black/90' : 'bg-gradient-to-br from-gray-900/90 to-black/90',
            accent: isSuccess ? 'text-wuxia-gold' : 'text-gray-400',
            successColor: isSuccess ? 'text-yellow-200' : 'text-gray-300',
            bar: isSuccess ? 'bg-wuxia-gold' : 'bg-gray-500',
            icon: '🎲'
          };

    return (
        <div className={`w-full my-6 relative group transition-all duration-300 transform hover:scale-[1.01] flex justify-center`}>
            {/* Main Card Container - Width 2/3 */}
            <div className={`relative z-10 w-2/3 border ${theme.border} rounded-xl shadow-lg overflow-hidden ${theme.bg} backdrop-blur-sm`}>
                
                {/* Header: Event & Action */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-black/20">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">{theme.icon}</span>
                        <span className={`font-bold text-sm tracking-wider ${theme.accent}`}>{parsed.eventName}</span>
                    </div>
                    {/* Target Badge */}
                    <div className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-gray-400 border border-white/5">
                        <span className="opacity-50 mr-1">触发对象:</span>
                        <span className="text-gray-200">{parsed.target}</span>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="p-4 flex flex-col items-center">
                    
                    {/* Numeric Display (Row) */}
                    <div className="flex items-center gap-6 mb-4">
                        {/* Requirement */}
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-mono mb-1">难度</span>
                            <div className="w-12 h-12 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center text-gray-400 font-mono font-bold text-lg shadow-inner">
                                {difficultyValue}
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="text-gray-600 font-thin text-2xl">/</div>

                        {/* Actual Roll */}
                        <div className="flex flex-col items-center relative">
                            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-mono mb-1">判定值</span>
                            <div className={`w-16 h-16 rounded-xl border-2 ${isSuccess ? theme.border : 'border-gray-700'} ${isSuccess ? 'bg-white/10' : 'bg-black/40'} flex items-center justify-center font-serif font-black text-3xl shadow-[0_0_15px_rgba(0,0,0,0.5)] ${theme.successColor} relative overflow-hidden`}>
                                {scoreValue}
                                {/* Shine effect */}
                                {isSuccess && <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tr from-transparent via-white/10 to-transparent"></div>}
                            </div>
                        </div>
                    </div>

                    {/* Result & Details */}
                    <div className="w-full flex flex-col items-center text-center">
                         <div className={`text-2xl font-black italic tracking-widest mb-3 ${theme.successColor}`}>
                             {parsed.result}
                         </div>
                         
                         {/* Modifiers Chips */}
                         <div className="flex flex-wrap gap-1.5 justify-center">
                             {parsed.modifiers.map((detail, i) => (
                                 <span key={`${detail.key}-${i}`} className={`text-[9px] px-2 py-0.5 rounded border border-white/10 bg-white/5 text-gray-300 whitespace-nowrap`}>
                                     {detail.value === null ? detail.raw : `${detail.label} ${detail.value >= 0 ? `+${detail.value}` : detail.value}${detail.reason ? ` (${detail.reason})` : ''}`}
                                 </span>
                             ))}
                         </div>
                    </div>
                </div>
            </div>

            {/* Critical Visual Flair */}
            {isCrit && (
                <div className={`absolute inset-0 w-2/3 mx-auto rounded-xl bg-gradient-to-r ${isNsfw ? 'from-pink-500/20' : 'from-wuxia-gold/20'} to-transparent blur-md -z-10`}></div>
            )}
        </div>
    );
};
