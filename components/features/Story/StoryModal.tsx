
import React from 'react';
import { 剧情系统结构 } from '../../../models/story';

interface Props {
    story: 剧情系统结构;
    onClose: () => void;
}

const StoryModal: React.FC<Props> = ({ story, onClose }) => {
    const [revealNext, setRevealNext] = React.useState(false);
    const pressTimerRef = React.useRef<number | null>(null);

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[200] hidden md:flex items-center justify-center p-4 animate-fadeIn">
            {/* Modal Container - Resized to max-w-5xl h-[650px] */}
            <div className="bg-ink-black/95 border border-wuxia-gold/30 w-full max-w-5xl h-[650px] flex flex-col shadow-[0_0_80px_rgba(0,0,0,0.9)] relative overflow-hidden rounded-2xl">
                
                {/* Texture Overlays */}
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/black-linen.png')] pointer-events-none z-0"></div>
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-radial from-wuxia-gold/5 to-transparent opacity-30 pointer-events-none z-0"></div>

                {/* --- Header --- */}
                <div className="h-16 shrink-0 border-b border-gray-800/50 bg-black/40 flex items-center justify-between px-6 relative z-50">
                    <div className="flex items-center gap-4">
                         <div className="w-10 h-10 bg-wuxia-red/10 border border-wuxia-red/50 rounded-full flex items-center justify-center text-xl font-serif font-bold text-wuxia-red shadow-[0_0_15px_rgba(163,24,24,0.2)]">
                            卷
                        </div>
                        <div>
                            <h3 className="text-wuxia-gold font-serif font-bold text-xl tracking-[0.2em] drop-shadow-md">江湖卷宗</h3>
                            <div className="flex items-center gap-3 text-[10px] font-mono mt-0.5">
                                <span className="text-gray-500">当前篇章</span>
                                <span className="text-gray-500">/</span>
                                <span className="text-gray-300 border-b border-gray-600 pb-0.5">{story.当前章节.标题}</span>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-black/50 border border-gray-700 text-gray-400 hover:text-wuxia-red hover:border-wuxia-red transition-all ml-4 group"
                    >
                        <span className="group-hover:rotate-90 transition-transform duration-300">×</span>
                    </button>
                </div>

                {/* --- Main Content --- */}
                <div className="flex-1 flex overflow-hidden relative z-10">
                    
                    {/* Left Sidebar: Timeline Archive */}
                    <div className="w-64 bg-black/20 border-r border-gray-800/50 flex flex-col relative">
                        <div className="p-4 border-b border-gray-800/50 flex justify-between items-center">
                            <h4 className="text-gray-500 font-bold text-xs uppercase tracking-widest">往事如烟</h4>
                            <span className="text-[10px] bg-gray-800 px-2 py-0.5 rounded text-gray-400">{story.历史卷宗.length} 卷</span>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
                             {/* Render History */}
                             {story.历史卷宗.length > 0 ? (
                                 [...story.历史卷宗].reverse().map((arc, i) => (
                                     <div key={i} className="relative pl-4 border-l-2 border-gray-800 opacity-60 hover:opacity-100 transition-opacity">
                                         <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-gray-600"></div>
                                         <div className="text-xs font-serif font-bold text-gray-300 mb-1">{arc.标题}</div>
                                         <div className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed italic">
                                             "{arc.结语}"
                                         </div>
                                     </div>
                                 ))
                             ) : (
                                 <div className="text-center py-10 text-gray-700 text-xs italic font-serif">
                                     初入江湖，白纸一张。<br/>尚无过往之事。
                                 </div>
                             )}

                             {/* Current Chapter Indicator */}
                             <div className="relative pl-4 border-l-2 border-wuxia-gold">
                                 <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-wuxia-gold shadow-[0_0_10px_rgba(230,200,110,0.8)] animate-pulse"></div>
                                 <div className="text-[10px] text-wuxia-gold uppercase tracking-widest mb-1 font-bold">正在发生</div>
                                 <div className="text-sm font-serif font-bold text-white mb-1">{story.当前章节.标题}</div>
                                 <div className="text-[9px] text-gray-500">序章 {story.当前章节.序号}</div>
                             </div>
                        </div>
                    </div>

                    {/* Right Content: The Scroll */}
                    <div className="flex-1 bg-ink-wash/5 p-6 overflow-y-auto custom-scrollbar relative">
                        {/* Background Watermark Number */}
                        <div className="absolute top-0 right-10 text-[180px] font-serif text-black/5 pointer-events-none select-none z-0 leading-none">
                            {['零','壹','贰','叁','肆','伍','陆','柒','捌','玖','拾'][story.当前章节.序号] || story.当前章节.序号}
                        </div>

                        <div className="relative z-10 max-w-3xl mx-auto space-y-8 pb-10">
                            
                            {/* Section 1: Introduction */}
                            <div className="text-center relative py-6 border-b border-gray-800/50">
                                <h2 className="text-4xl font-black font-serif text-transparent bg-clip-text bg-gradient-to-b from-wuxia-gold to-wuxia-gold-dark mb-6 tracking-[0.1em] drop-shadow-sm">
                                    {story.当前章节.标题}
                                </h2>
                                <div className="text-sm leading-loose font-serif text-gray-300 text-justify px-8 relative">
                                    <span className="absolute left-2 top-0 text-3xl text-gray-600 font-serif opacity-30">“</span>
                                    {story.当前章节.背景故事}
                                    <span className="absolute right-2 bottom-0 text-3xl text-gray-600 font-serif opacity-30">”</span>
                                </div>
                            </div>

                            {/* Section 2: Conflict & Clues (Two Columns) */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Main Conflict */}
                                <div className="bg-gradient-to-br from-black/40 to-black/60 border border-gray-800 p-5 rounded-xl relative overflow-hidden group hover:border-wuxia-red/30 transition-colors">
                                    <div className="absolute top-0 right-0 p-2 opacity-20 text-5xl text-wuxia-red font-serif pointer-events-none group-hover:opacity-40 transition-opacity">
                                        争
                                    </div>
                                    <h4 className="text-wuxia-red font-bold text-[10px] uppercase tracking-[0.2em] mb-3 flex items-center gap-3">
                                        <span className="w-6 h-px bg-wuxia-red"></span>
                                        主要矛盾
                                    </h4>
                                    <p className="text-gray-300 text-xs leading-6 font-serif">
                                        {story.当前章节.主要矛盾}
                                    </p>
                                </div>

                                {/* Hints */}
                                <div className="bg-gradient-to-br from-black/40 to-black/60 border border-gray-800 p-5 rounded-xl relative overflow-hidden group hover:border-wuxia-cyan/30 transition-colors">
                                    <div className="absolute top-0 right-0 p-2 opacity-20 text-5xl text-wuxia-cyan font-serif pointer-events-none group-hover:opacity-40 transition-opacity">
                                        隐
                                    </div>
                                    <h4 className="text-wuxia-cyan font-bold text-[10px] uppercase tracking-[0.2em] mb-3 flex items-center gap-3">
                                        <span className="w-6 h-px bg-wuxia-cyan"></span>
                                        暗线伏笔
                                    </h4>
                                    <ul className="space-y-2">
                                        {story.当前章节.伏笔列表.map((hint, i) => (
                                            <li key={i} className="text-xs text-gray-400 flex items-start gap-2">
                                                <span className="text-gray-600 mt-1.5 w-1 h-1 rounded-full bg-wuxia-cyan/50 block shrink-0"></span>
                                                <span className="italic">{hint}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            {/* Section 3: Objectives (The Scroll List) */}
                            <div className="bg-[#1a1816] relative p-1 rounded-lg shadow-lg">
                                {/* Decorative border */}
                                <div className="absolute inset-0 border border-wuxia-gold/20 rounded-lg pointer-events-none"></div>
                                
                                <div className="bg-gradient-to-b from-black/80 to-black/90 p-5 rounded-lg">
                                    <h4 className="text-wuxia-gold font-bold text-xs uppercase tracking-widest mb-4 flex items-center justify-center gap-4">
                                        <span className="w-8 h-px bg-gradient-to-r from-transparent to-wuxia-gold"></span>
                                        本章破局条件
                                        <span className="w-8 h-px bg-gradient-to-l from-transparent to-wuxia-gold"></span>
                                    </h4>

                                    <div className="space-y-2">
                                        {story.当前章节.结束条件.map((cond, i) => {
                                            let isMet = false;
                                            if (cond.对应变量键名 && story.剧情变量) {
                                                const currentVal = story.剧情变量[cond.对应变量键名];
                                                if (currentVal === cond.判定值) isMet = true;
                                            }

                                            return (
                                                <div key={i} className={`flex items-center gap-3 p-3 rounded border transition-all ${
                                                    isMet 
                                                    ? 'bg-wuxia-gold/10 border-wuxia-gold/40' 
                                                    : 'bg-white/5 border-gray-800'
                                                }`}>
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center border shrink-0 ${
                                                        isMet 
                                                        ? 'border-wuxia-gold bg-wuxia-gold text-black' 
                                                        : 'border-gray-600 text-transparent'
                                                    }`}>
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3 h-3">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                                        </svg>
                                                    </div>
                                                    
                                                    <div className="flex-1">
                                                        <div className={`text-xs font-bold ${isMet ? 'text-wuxia-gold line-through decoration-wuxia-gold/50' : 'text-gray-200'}`}>
                                                            {cond.描述}
                                                        </div>
                                                        <div className="flex gap-2 mt-0.5">
                                                            <span className="text-[9px] uppercase bg-black/40 px-1 py-px rounded text-gray-500 border border-gray-800">
                                                                {cond.类型}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="text-[10px] font-bold tracking-wider">
                                                        {isMet ? <span className="text-wuxia-gold">已达成</span> : <span className="text-gray-600">进行中</span>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Section 4: Teaser */}
                            <div className="pt-8 border-t border-gray-800/30">
                                <h4 className="text-gray-600 font-bold text-[10px] uppercase tracking-widest mb-3 text-center">下一章预告</h4>
                                <div
                                    className="relative mx-auto max-w-xl select-none"
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
                                        <div className="absolute inset-0 backdrop-blur-[6px] bg-black/60 z-20 transition-all duration-300 flex flex-col items-center justify-center">
                                            <div className="text-gray-500 font-serif text-xs tracking-[0.3em] opacity-80 border border-gray-600 px-3 py-1 rounded mb-1">
                                                天机不可泄露
                                            </div>
                                            <div className="text-[10px] text-gray-600 tracking-[0.3em]">长按查看原文</div>
                                        </div>
                                    )}

                                    <div className={`bg-[#0f0f0f] p-4 rounded border border-gray-800 text-center relative overflow-hidden transition-all ${
                                        revealNext ? 'blur-0 opacity-100' : 'blur-[2px] opacity-60'
                                    }`}>
                                        <div className="text-lg text-gray-400 font-serif font-bold mb-2">{story.下一章预告.标题}</div>
                                        <p className="text-xs text-gray-500 leading-relaxed font-serif">
                                            {story.下一章预告.大纲}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StoryModal;
