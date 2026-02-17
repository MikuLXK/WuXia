
import React, { useState } from 'react';
import { GameResponse, GameLog } from '../../../types';
import { NarratorRenderer, CharacterRenderer, JudgmentRenderer } from './MessageRenderers';
import GameButton from '../../ui/GameButton';

interface Props {
    response: GameResponse;
    turnNumber: number;
    rawJson?: string; // Original raw string for editing
    onSaveEdit: (newJson: string) => void;
}

const TurnItem: React.FC<Props> = ({ response, turnNumber, rawJson, onSaveEdit }) => {
    const formatRawJson = (raw?: string) => {
        if (!raw) return JSON.stringify(response, null, 2);
        try {
            return JSON.stringify(JSON.parse(raw), null, 2);
        } catch {
            return raw;
        }
    };

    const [showThinking, setShowThinking] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(formatRawJson(rawJson));
    const [parseError, setParseError] = useState<string | null>(null);

    const handleSave = () => {
        try {
            JSON.parse(editValue); // Validate JSON
            onSaveEdit(editValue);
            setIsEditing(false);
            setParseError(null);
        } catch (e: any) {
            setParseError(e.message);
        }
    };

    if (isEditing) {
        return (
            <div className="w-full bg-black/80 border border-wuxia-gold p-4 my-4 relative z-50">
                <h4 className="text-wuxia-gold mb-2 font-mono text-xs">/// DEBUG: EDIT RESPONSE JSON ///</h4>
                <textarea
                    className="w-full h-96 bg-gray-900 text-green-400 font-mono text-xs p-4 outline-none border border-gray-700 resize-y"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                />
                {parseError && <div className="text-red-500 text-xs mt-2">Error: {parseError}</div>}
                <div className="flex justify-end gap-2 mt-2">
                    <GameButton variant="secondary" onClick={() => setIsEditing(false)} className="py-1 px-3 text-xs">取消</GameButton>
                    <GameButton variant="primary" onClick={handleSave} className="py-1 px-3 text-xs">重解析渲染</GameButton>
                </div>
            </div>
        );
    }

    // Turn Display Logic
    const turnDisplay = turnNumber === 0 ? "开场剧情" : `第 ${turnNumber} 回合`;

    return (
        <div className="w-full mb-12 relative animate-slide-in group/turn">
            
             {/* Top Turn Header Container */}
             <div className="flex items-center justify-center gap-4 mb-6 relative">
                 
                 {/* Left: Thinking Toggle Icon */}
                 {response.thinking_pre && (
                    <button 
                        onClick={() => setShowThinking(!showThinking)}
                        className={`p-1.5 rounded-full border transition-all ${showThinking ? 'bg-wuxia-cyan/20 border-wuxia-cyan text-wuxia-cyan' : 'border-gray-700 text-gray-500 hover:text-wuxia-cyan hover:border-wuxia-cyan'}`}
                        title="查看思考过程"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 2.625v-8.192a.75.75 0 00-.75-.75h-1.5a.75.75 0 00-.75.75v8.192m0 0a3.018 3.018 0 00-1.632.712m0 0L8.25 17.25m2.25 1.5a3.018 3.018 0 010-3m0 0l-2.25 2.25m8.995-2.625l2.25 2.25m0 0l-2.25 2.25m2.25-2.25a3.018 3.018 0 010 3" />
                        </svg>
                    </button>
                 )}
                 {!response.thinking_pre && <div className="w-7"></div>} {/* Spacer if no thinking */}


                 {/* Center: Badge */}
                 <div className="bg-black/50 border border-wuxia-gold/30 px-6 py-1.5 rounded-full backdrop-blur-sm shadow-sm min-w-[120px] text-center">
                     <span className="text-[12px] text-wuxia-gold font-serif font-bold tracking-[0.2em] uppercase block text-center">
                         {turnDisplay}
                     </span>
                 </div>

                 {/* Right: Edit/Source Icon */}
                 <button 
                    onClick={() => {
                        setEditValue(formatRawJson(rawJson));
                        setIsEditing(true);
                    }}
                    className="p-1.5 rounded-full border border-gray-700 text-gray-500 hover:text-wuxia-gold hover:border-wuxia-gold transition-all"
                    title="查看/编辑原文"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                    </svg>
                 </button>
            </div>

            {/* Thinking Process (Pre) - Collapsible */}
             {showThinking && response.thinking_pre && (
                 <div className="mb-6 mx-4 p-4 bg-gray-900/80 border-t border-b border-wuxia-cyan/30 text-xs text-gray-300 font-mono leading-relaxed whitespace-pre-wrap shadow-inner relative">
                    <div className="absolute top-0 left-0 w-1 h-full bg-wuxia-cyan/50"></div>
                    <span className="text-wuxia-cyan/50 block mb-2 font-bold text-[10px] tracking-widest">/// NEURAL PROCESS LOG ///</span>
                    {response.thinking_pre}
                </div>
            )}

            {/* Main Logs Rendering */}
            <div className="space-y-2">
                {response.logs.map((log, idx) => {
                    if (log.sender === '旁白') {
                        return <NarratorRenderer key={idx} text={log.text} />;
                    } else if (log.sender === '【判定】') {
                        return <JudgmentRenderer key={idx} text={log.text} />;
                    } else if (log.sender === '【NSFW判定】') {
                        return <JudgmentRenderer key={idx} text={log.text} isNsfw={true} />;
                    } else {
                        return <CharacterRenderer key={idx} sender={log.sender} text={log.text} />;
                    }
                })}
            </div>

            {/* Thinking Process (Post) */}
            {showThinking && response.thinking_post && (
                <div className="mt-4 p-3 bg-gray-900/50 border-l border-wuxia-cyan/30 text-xs text-gray-400 font-mono leading-relaxed whitespace-pre-wrap">
                    <span className="text-wuxia-cyan/50 block mb-1">{'>>> THINKING_POST'}</span>
                    {response.thinking_post}
                </div>
            )}

            {/* Footer / Info only */}
            <div className="mt-2 flex justify-end items-center opacity-0 group-hover/turn:opacity-100 transition-opacity duration-300 gap-4">
                {response.shortTerm && (
                    <span className="text-[9px] text-gray-600 max-w-[200px] truncate" title={response.shortTerm}>
                        Mem: {response.shortTerm}
                    </span>
                )}
            </div>

             {/* Divider */}
             <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-16 h-px bg-gray-800"></div>
        </div>
    );
};

export default TurnItem;
