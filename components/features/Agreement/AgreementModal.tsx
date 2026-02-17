
import React, { useState } from 'react';
import { 约定结构, 约定性质 } from '../../../models/task';

interface Props {
    agreements: 约定结构[];
    onClose: () => void;
}

const AgreementModal: React.FC<Props> = ({ agreements, onClose }) => {
    const [selectedIdx, setSelectedIdx] = useState<number>(0);
    const currentItem = agreements[selectedIdx];

    const getNatureColor = (nature: 约定性质) => {
        switch(nature) {
            case '情感': return 'text-pink-400 border-pink-400/30 bg-pink-900/10';
            case '复仇': return 'text-red-500 border-red-500/30 bg-red-900/10';
            case '交易': return 'text-wuxia-gold border-wuxia-gold/30 bg-wuxia-gold/10';
            case '赌约': return 'text-purple-400 border-purple-400/30 bg-purple-900/10';
            default: return 'text-blue-300 border-blue-300/30 bg-blue-900/10';
        }
    };

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-ink-black/95 border border-wuxia-gold/30 w-full max-w-5xl h-[650px] flex flex-col shadow-[0_0_80px_rgba(0,0,0,0.9)] relative overflow-hidden rounded-2xl">
                
                {/* Header */}
                <div className="h-16 shrink-0 border-b border-gray-800/50 bg-black/40 flex items-center justify-between px-6 relative z-50">
                    <h3 className="text-wuxia-gold font-serif font-bold text-2xl tracking-[0.3em] drop-shadow-md">君子之约</h3>
                    <button 
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-black/50 border border-gray-700 text-gray-400 hover:text-wuxia-red hover:border-wuxia-red transition-all"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Left: Cards List */}
                    <div className="w-[30%] bg-black/20 border-r border-gray-800/50 overflow-y-auto custom-scrollbar p-3 space-y-3">
                        {agreements.map((agree, idx) => {
                            const isSelected = idx === selectedIdx;
                            return (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedIdx(idx)}
                                    className={`w-full text-left p-4 border rounded-xl transition-all relative group overflow-hidden flex flex-col gap-2 ${
                                        isSelected 
                                        ? 'border-wuxia-gold/60 bg-wuxia-gold/5 shadow-md' 
                                        : 'border-gray-800 bg-white/[0.02] hover:bg-white/[0.05]'
                                    }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <span className={`font-serif font-bold text-lg ${isSelected ? 'text-wuxia-gold' : 'text-gray-300'}`}>
                                            {agree.标题}
                                        </span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getNatureColor(agree.性质)}`}>
                                            {agree.性质}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <span className="font-bold text-gray-400">{agree.对象}</span>
                                        <span>|</span>
                                        <span>{agree.约定地点}</span>
                                    </div>
                                    <div className="text-[10px] font-mono text-gray-600 mt-1">
                                        {agree.约定时间}
                                    </div>
                                </button>
                            );
                        })}
                        {agreements.length === 0 && (
                            <div className="text-center text-gray-600 text-xs py-10">暂无约定</div>
                        )}
                    </div>

                    {/* Right: Detail View (Letter/Promise style) */}
                    <div className="flex-1 bg-[#1a1816] relative p-10 flex flex-col items-center justify-center overflow-hidden">
                        
                        {/* Background Ink Effect */}
                        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/black-linen.png')] pointer-events-none"></div>
                        <div className="absolute -top-20 -right-20 w-64 h-64 bg-wuxia-gold/5 rounded-full blur-3xl"></div>

                        {currentItem ? (
                            <div className="relative w-full max-w-lg bg-[#e3ded1] text-ink-black p-8 shadow-[0_10px_40px_rgba(0,0,0,0.8)] rotate-1 transform transition-transform duration-500 hover:rotate-0">
                                
                                {/* Paper Texture */}
                                <div className="absolute inset-0 opacity-40 bg-[url('https://www.transparenttextures.com/patterns/paper.png')] pointer-events-none"></div>
                                
                                {/* Content */}
                                <div className="relative z-10 font-serif">
                                    {/* Header Date/Loc */}
                                    <div className="flex justify-between text-xs text-gray-600 mb-6 border-b border-gray-400 pb-2">
                                        <span>地点：{currentItem.约定地点}</span>
                                        <span className="font-bold">时间：{currentItem.约定时间}</span>
                                    </div>

                                    {/* Title */}
                                    <h2 className="text-2xl font-black text-center mb-6 tracking-[0.2em] text-[#8b0000]">
                                        {currentItem.标题}
                                    </h2>

                                    {/* Body */}
                                    <div className="text-lg leading-loose indent-8 mb-8 font-medium">
                                        “{currentItem.誓言内容}”
                                    </div>

                                    {/* Signatures */}
                                    <div className="flex justify-end gap-8 mt-12 mb-4">
                                        <div className="flex flex-col items-center">
                                            <span className="text-xs text-gray-500 mb-1">立约人</span>
                                            <span className="font-bold text-lg border-b border-gray-400 px-2 min-w-[60px] text-center">
                                                {currentItem.对象}
                                            </span>
                                            {/* Stamp Effect */}
                                            <div className="w-16 h-16 border-4 border-[#8b0000] rounded text-[#8b0000] text-xs font-black flex items-center justify-center absolute translate-x-4 -translate-y-4 opacity-60 rotate-12 mask-image">
                                                <div className="border border-[#8b0000] w-14 h-14 flex items-center justify-center">
                                                    信守<br/>承诺
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Consequences Footer */}
                                    <div className="mt-8 pt-4 border-t-2 border-double border-gray-400 text-xs flex flex-col gap-2">
                                        <div className="flex gap-2">
                                            <span className="font-bold text-green-800">若赴约：</span>
                                            <span className="text-gray-700">{currentItem.履行后果}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="font-bold text-[#8b0000]">若失约：</span>
                                            <span className="text-gray-700">{currentItem.违约后果}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-gray-500 font-serif italic text-lg">
                                人无信不立，君子重然诺。
                            </div>
                        )}
                        
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AgreementModal;
