
import React, { useState } from 'react';
import { 聊天记录结构, 记忆系统结构 } from '../../../types';

interface Props {
    history: 聊天记录结构[]; // For immediate context
    memorySystem?: 记忆系统结构; // For Short/Medium/Long
    onClose: () => void;
}

type TabType = 'context' | 'short' | 'medium' | 'long';

const MemoryModal: React.FC<Props> = ({ history, memorySystem, onClose }) => {
    const [activeTab, setActiveTab] = useState<TabType>('context');

    // 1. Context Data (Immediate ~10 turns)
    // Extract short-term memories from current active history session
    const contextData = history
        .filter(msg => msg.role === 'assistant' && msg.structuredResponse?.shortTerm)
        .map((msg, i) => ({
            content: msg.structuredResponse?.shortTerm || "",
            timestamp: msg.timestamp,
            rawDate: msg.gameTime || "未知时间",
            id: i
        }))
        .reverse();

    // 2. Short Term (From Memory System)
    const shortData = (memorySystem?.短期记忆 || []).map((m, i) => ({ content: m, id: i })).reverse();
    const mediumData = (memorySystem?.中期记忆 || []).map((m, i) => ({ content: m, id: i })).reverse();
    const longData = (memorySystem?.长期记忆 || []).map((m, i) => ({ content: m, id: i })).reverse();

    const getTabContent = () => {
        switch (activeTab) {
            case 'context': return contextData;
            case 'short': return shortData;
            case 'medium': return mediumData;
            case 'long': return longData;
            default: return [];
        }
    };

    const currentData = getTabContent();

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-ink-black/95 border border-wuxia-gold/30 w-full max-w-4xl h-[700px] flex flex-col shadow-[0_0_80px_rgba(0,0,0,0.9)] relative overflow-hidden rounded-2xl">
                
                {/* Decorative Texture */}
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/black-linen.png')] pointer-events-none"></div>

                {/* Header */}
                <div className="h-16 shrink-0 border-b border-gray-800/50 bg-black/40 flex items-center justify-between px-6 relative z-50">
                    <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full border border-wuxia-gold/50 bg-wuxia-gold/10 flex items-center justify-center text-wuxia-gold font-serif font-bold text-xl">
                            忆
                         </div>
                        <div>
                            <h3 className="text-wuxia-gold font-serif font-bold text-2xl tracking-[0.3em] drop-shadow-md">记忆宫殿</h3>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-black/50 border border-gray-700 text-gray-400 hover:text-wuxia-red hover:border-wuxia-red transition-all"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-800/50 bg-black/20 px-6 pt-4 gap-2 relative z-20">
                    {[
                        { id: 'context', label: '即时 (Context)' },
                        { id: 'short', label: '短期 (Short)' },
                        { id: 'medium', label: '中期 (Medium)' },
                        { id: 'long', label: '长期 (Long)' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as TabType)}
                            className={`px-6 py-2 text-xs font-bold uppercase tracking-widest rounded-t-lg transition-all ${
                                activeTab === tab.id 
                                ? 'bg-wuxia-gold/10 text-wuxia-gold border-t border-x border-wuxia-gold/30' 
                                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 relative z-10 bg-ink-wash/5">
                    <div className="max-w-3xl mx-auto space-y-6 relative">
                        
                        {/* Timeline Line */}
                        <div className="absolute left-[19px] top-4 bottom-4 w-px bg-gradient-to-b from-gray-800 via-gray-700 to-transparent"></div>

                        {currentData.length > 0 ? currentData.map((mem, idx) => (
                            <div key={idx} className="relative pl-12 group animate-slide-in" style={{ animationDelay: `${idx * 30}ms` }}>
                                {/* Timeline Dot */}
                                <div className={`absolute left-[13px] top-1.5 w-3 h-3 rounded-full border-2 transition-colors shadow-[0_0_10px_rgba(0,0,0,0.5)] ${
                                    activeTab === 'context' ? 'bg-wuxia-cyan border-wuxia-cyan text-black' :
                                    activeTab === 'long' ? 'bg-wuxia-gold border-wuxia-gold text-black' :
                                    'bg-black border-gray-600 group-hover:border-wuxia-gold'
                                }`}></div>
                                
                                <div className="bg-black/40 border border-gray-800 p-4 rounded-lg hover:bg-black/60 hover:border-wuxia-gold/30 transition-all relative">
                                    {activeTab === 'context' && (mem as any).rawDate && (
                                        <div className="text-[10px] text-gray-500 font-mono mb-2 border-b border-gray-800/50 pb-1">
                                            {(mem as any).rawDate}
                                        </div>
                                    )}
                                    <p className="text-gray-300 font-serif leading-loose text-sm italic whitespace-pre-wrap">
                                        {mem.content}
                                    </p>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-20 text-gray-600 italic font-serif">
                                <div className="text-4xl opacity-20 mb-4">空</div>
                                此记忆层暂无内容。
                            </div>
                        )}
                        
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MemoryModal;
