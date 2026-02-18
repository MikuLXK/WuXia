import React from 'react';
import { 剧情系统结构 } from '../../../models/story';

interface Props {
    story: 剧情系统结构;
    onClose: () => void;
}

const MobileStory: React.FC<Props> = ({ story, onClose }) => {
    const [revealNext, setRevealNext] = React.useState(false);
    const pressTimerRef = React.useRef<number | null>(null);

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-3 md:hidden animate-fadeIn">
            <div className="bg-ink-black/95 border border-wuxia-gold/30 w-full max-w-[640px] h-[86vh] flex flex-col shadow-[0_0_60px_rgba(0,0,0,0.8)] relative overflow-hidden rounded-2xl">
                <div className="h-12 shrink-0 border-b border-gray-800/60 bg-black/40 flex items-center justify-between px-4">
                    <div>
                        <div className="text-wuxia-gold font-serif font-bold text-base tracking-[0.2em]">江湖卷宗</div>
                        <div className="text-[9px] text-gray-500 font-mono mt-0.5">当前篇章 · {story.当前章节.标题}</div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-black/50 border border-gray-700 text-gray-400 hover:text-wuxia-red hover:border-wuxia-red transition-all"
                    >
                        ×
                    </button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 space-y-4 bg-ink-wash/5">
                    <div className="bg-black/40 border border-gray-800 rounded-xl p-4">
                        <div className="text-xl text-wuxia-gold font-serif font-bold mb-2">{story.当前章节.标题}</div>
                        <p className="text-sm text-gray-300 font-serif leading-relaxed">
                            {story.当前章节.背景故事}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-gray-500">
                            <span className="px-2 py-1 bg-black/30 border border-gray-700 rounded">序章 {story.当前章节.序号}</span>
                            <span className="px-2 py-1 bg-black/30 border border-gray-700 rounded">历史 {story.历史卷宗.length} 卷</span>
                        </div>
                    </div>

                    <div className="bg-black/40 border border-gray-800 rounded-xl p-4 space-y-3">
                        <div>
                            <div className="text-[10px] text-wuxia-red tracking-[0.3em] mb-1">主要矛盾</div>
                            <p className="text-sm text-gray-300">{story.当前章节.主要矛盾}</p>
                        </div>
                        <div>
                            <div className="text-[10px] text-wuxia-cyan tracking-[0.3em] mb-1">暗线伏笔</div>
                            <ul className="space-y-1 text-[11px] text-gray-400">
                                {story.当前章节.伏笔列表.map((hint, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-wuxia-cyan/60"></span>
                                        <span>{hint}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className="bg-black/40 border border-gray-800 rounded-xl p-4">
                        <div className="text-[10px] text-wuxia-gold/70 tracking-[0.3em] mb-2">本章破局条件</div>
                        <div className="space-y-2">
                            {story.当前章节.结束条件.map((cond, i) => {
                                let isMet = false;
                                if (cond.对应变量键名 && story.剧情变量) {
                                    const currentVal = story.剧情变量[cond.对应变量键名];
                                    if (currentVal === cond.判定值) isMet = true;
                                }
                                return (
                                    <div key={i} className={`flex items-start gap-3 p-3 rounded border ${
                                        isMet ? 'bg-wuxia-gold/10 border-wuxia-gold/40' : 'bg-black/30 border-gray-800'
                                    }`}>
                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] ${
                                            isMet ? 'border-wuxia-gold bg-wuxia-gold text-black' : 'border-gray-600 text-transparent'
                                        }`}>
                                            ✓
                                        </div>
                                        <div className="flex-1">
                                            <div className={`text-[11px] ${isMet ? 'text-wuxia-gold line-through' : 'text-gray-200'}`}>
                                                {cond.描述}
                                            </div>
                                            <div className="text-[9px] text-gray-500 mt-1">{cond.类型}</div>
                                        </div>
                                        <div className="text-[10px] text-gray-500">{isMet ? '已达成' : '进行中'}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-black/40 border border-gray-800 rounded-xl p-4">
                        <div className="text-[10px] text-wuxia-gold/70 tracking-[0.3em] mb-2">往事如烟</div>
                        <div className="max-h-28 overflow-y-auto custom-scrollbar pr-1 space-y-2">
                            {story.历史卷宗.length > 0 ? (
                                [...story.历史卷宗].reverse().map((arc, i) => (
                                    <div key={i} className="border-l border-gray-800 pl-3">
                                        <div className="text-[11px] text-gray-200 font-serif font-bold">{arc.标题}</div>
                                        <div className="text-[10px] text-gray-500 italic">“{arc.结语}”</div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-[11px] text-gray-600 italic">尚无过往之事。</div>
                            )}
                        </div>
                    </div>

                    <div className="bg-black/40 border border-gray-800 rounded-xl p-4 text-center">
                        <div className="text-[10px] text-gray-500 tracking-[0.3em] mb-2">下一章预告</div>
                        <div
                            className="relative overflow-hidden rounded-lg border border-gray-800 bg-black/30 px-3 py-4 select-none"
                            onMouseDown={() => {
                                if (pressTimerRef.current) window.clearTimeout(pressTimerRef.current);
                                pressTimerRef.current = window.setTimeout(() => setRevealNext(true), 450);
                            }}
                            onMouseUp={() => {
                                if (pressTimerRef.current) window.clearTimeout(pressTimerRef.current);
                                pressTimerRef.current = null;
                                setRevealNext(false);
                            }}
                            onMouseLeave={() => {
                                if (pressTimerRef.current) window.clearTimeout(pressTimerRef.current);
                                pressTimerRef.current = null;
                                setRevealNext(false);
                            }}
                            onTouchStart={() => {
                                if (pressTimerRef.current) window.clearTimeout(pressTimerRef.current);
                                pressTimerRef.current = window.setTimeout(() => setRevealNext(true), 450);
                            }}
                            onTouchEnd={() => {
                                if (pressTimerRef.current) window.clearTimeout(pressTimerRef.current);
                                pressTimerRef.current = null;
                                setRevealNext(false);
                            }}
                            onTouchCancel={() => {
                                if (pressTimerRef.current) window.clearTimeout(pressTimerRef.current);
                                pressTimerRef.current = null;
                                setRevealNext(false);
                            }}
                        >
                            {!revealNext && (
                                <div className="absolute inset-0 backdrop-blur-[6px] bg-black/40 flex flex-col items-center justify-center text-center">
                                    <div className="text-[9px] text-gray-400 tracking-[0.35em] border border-gray-700 px-3 py-1 rounded">
                                        天机不可泄露
                                    </div>
                                    <div className="mt-1 text-[9px] text-gray-500">长按查看原文</div>
                                </div>
                            )}
                            <div className={`transition-all ${revealNext ? 'blur-0 opacity-100' : 'blur-[2px] opacity-60'}`}>
                                <div className="text-sm text-gray-200 font-serif font-bold mb-1">{story.下一章预告.标题}</div>
                                <p className="text-[11px] text-gray-500">{story.下一章预告.大纲}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MobileStory;
