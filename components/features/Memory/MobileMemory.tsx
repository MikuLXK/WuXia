import React, { useState } from 'react';
import { 聊天记录结构, 记忆系统结构 } from '../../../types';

interface Props {
    history: 聊天记录结构[];
    memorySystem?: 记忆系统结构;
    onClose: () => void;
    currentTime?: string;
}

type TabType = 'context' | 'short' | 'medium' | 'long';

const MobileMemory: React.FC<Props> = ({ history, memorySystem, onClose, currentTime }) => {
    const [activeTab, setActiveTab] = useState<TabType>('context');

    const fallbackImmediateData = history
        .filter(msg => msg.role === 'assistant' && msg.structuredResponse?.shortTerm)
        .map((msg, i) => ({
            content: msg.structuredResponse?.shortTerm || "",
            timestamp: msg.timestamp,
            rawDate: msg.gameTime || currentTime || "未知时间",
            id: i
        }))
        .reverse();

    const immediateData = (memorySystem?.即时记忆 || []).map((m, i) => ({ content: m, id: i })).reverse();
    const contextData = immediateData.length > 0 ? immediateData : fallbackImmediateData;
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-3 md:hidden animate-fadeIn">
            <div className="bg-ink-black/95 border border-wuxia-gold/30 w-full max-w-[600px] h-[86vh] flex flex-col shadow-[0_0_60px_rgba(0,0,0,0.8)] relative overflow-hidden rounded-2xl">
                <div className="h-12 shrink-0 border-b border-gray-800/60 bg-black/40 flex items-center justify-between px-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full border border-wuxia-gold/50 bg-wuxia-gold/10 flex items-center justify-center text-wuxia-gold font-serif font-bold">
                            忆
                        </div>
                        <div className="text-wuxia-gold font-serif font-bold text-base tracking-[0.2em]">记忆宫殿</div>
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

                <div className="border-b border-gray-800/60 bg-black/30 px-3 py-2 overflow-x-auto no-scrollbar">
                    <div className="flex gap-2">
                        {[
                            { id: 'context', label: '即时' },
                            { id: 'short', label: '短期' },
                            { id: 'medium', label: '中期' },
                            { id: 'long', label: '长期' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as TabType)}
                                className={`px-3 py-1.5 text-[11px] rounded-full border transition-all ${
                                    activeTab === tab.id
                                        ? 'bg-wuxia-gold/15 text-wuxia-gold border-wuxia-gold'
                                        : 'border-gray-800 text-gray-500'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 space-y-3 bg-ink-wash/5">
                    {currentData.length > 0 ? currentData.map((mem, idx) => (
                        <div key={idx} className="bg-black/40 border border-gray-800 rounded-xl p-4">
                            {activeTab === 'context' && (mem as any).rawDate && (
                                <div className="text-[9px] text-gray-500 font-mono mb-2 border-b border-gray-800/50 pb-1">
                                    {(mem as any).rawDate}
                                </div>
                            )}
                            <p className="text-gray-300 font-serif leading-relaxed text-sm whitespace-pre-wrap">
                                {mem.content}
                            </p>
                        </div>
                    )) : (
                        <div className="text-center py-16 text-gray-600 italic font-serif">
                            此记忆层暂无内容。
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MobileMemory;
