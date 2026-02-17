
import React from 'react';
import { 聊天记录结构 } from '../../../types';
import TurnItem from './TurnItem';

interface Props {
    history: 聊天记录结构[];
    loading: boolean;
    scrollRef: React.RefObject<HTMLDivElement>;
    onUpdateHistory?: (index: number, newJson: string) => void;
    renderCount?: number; // New Prop
}

const ChatList: React.FC<Props> = ({ history, loading, scrollRef, onUpdateHistory, renderCount = 30 }) => {
    // Helper to calculate turn number based on previous assistant messages
    const getTurnNumber = (currentIndex: number) => {
        let count = 0;
        for (let i = 0; i < currentIndex; i++) {
            if (history[i].role === 'assistant' && history[i].structuredResponse) {
                count++;
            }
        }
        return count;
    };

    // Rendering Logic:
    // Determine the start index based on renderCount (number of TURNS, approx 2 messages per turn)
    // 30 turns ~= 60 messages.
    const sliceIndex = Math.max(0, history.length - (renderCount * 2));
    const visibleHistory = history.slice(sliceIndex);
    const hiddenCount = sliceIndex;

    return (
        <div 
            className="flex-1 overflow-y-auto px-4 md:px-12 py-6 space-y-8 scroll-smooth custom-scrollbar bg-black/20" 
            ref={scrollRef}
        >
            {history.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full opacity-30">
                    <div className="text-6xl font-serif text-wuxia-gold mb-4 select-none">江湖</div>
                    <div className="text-sm font-sans tracking-[0.5em] text-paper-white">等待侠士出招</div>
                </div>
            )}

            {hiddenCount > 0 && (
                <div className="w-full text-center py-4">
                    <div className="inline-block px-4 py-1 rounded-full bg-white/5 border border-gray-700 text-xs text-gray-500 font-serif italic">
                        已隐藏早期 {hiddenCount} 条记录 (请在设置-互动历史中查看)
                    </div>
                </div>
            )}
            
            {visibleHistory.map((msg, relativeIdx) => {
                const absoluteIdx = sliceIndex + relativeIdx;
                
                // 1. If it's a Structured Game Response (The new format)
                if (msg.role === 'assistant' && msg.structuredResponse) {
                    const turnNum = getTurnNumber(absoluteIdx);
                    return (
                        <TurnItem 
                            key={absoluteIdx} 
                            response={msg.structuredResponse} 
                            turnNumber={turnNum}
                            rawJson={msg.rawJson}
                            onSaveEdit={(newJson) => onUpdateHistory && onUpdateHistory(absoluteIdx, newJson)}
                        />
                    );
                }
                
                // 2. User Input (Right aligned)
                if (msg.role === 'user') {
                    return (
                         <div key={absoluteIdx} className="flex w-full justify-end animate-slide-in mb-8">
                            <div className="relative max-w-[80%] bg-ink-gray text-wuxia-gold p-4 clip-message-right shadow-lg border-r-2 border-wuxia-gold">
                                <p className="whitespace-pre-wrap leading-relaxed font-serif text-lg">
                                    {msg.content}
                                </p>
                                <div className="text-[9px] text-gray-500 mt-2 text-right font-mono">
                                    PLAYER ACTION
                                </div>
                            </div>
                        </div>
                    );
                }

                // 3. Fallback for old System/Assistant messages or Errors
                return (
                    <div key={absoluteIdx} className="flex w-full justify-center mb-4 opacity-70">
                        <div className="bg-red-900/20 text-red-400 text-xs px-4 py-1 border border-red-900/50 font-mono">
                            [{msg.role.toUpperCase()}] {msg.content}
                        </div>
                    </div>
                );
            })}

            {loading && (
                <div className="flex flex-col items-center space-y-2 mt-4 opacity-80">
                   <div className="flex space-x-1">
                        <div className="w-2 h-8 bg-wuxia-gold animate-[glitch_0.5s_infinite]"></div>
                        <div className="w-2 h-8 bg-wuxia-red animate-[glitch_0.7s_infinite]"></div>
                        <div className="w-2 h-8 bg-wuxia-cyan animate-[glitch_0.6s_infinite]"></div>
                   </div>
                   <span className="font-mono text-xs text-wuxia-gold tracking-[0.3em] animate-pulse">
                       CALCULATING FATE...
                   </span>
                </div>
            )}
        </div>
    );
};

export default ChatList;
