
import React, { useState } from 'react';
import { 世界数据结构 } from '../../../models/world';

interface Props {
    world: 世界数据结构;
    onClose: () => void;
}

type TabType = 'overview' | 'events' | 'npcs';

const WorldModal: React.FC<Props> = ({ world, onClose }) => {
    const [activeTab, setActiveTab] = useState<TabType>('events');

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-ink-black/95 border border-wuxia-gold/30 w-full max-w-5xl h-[650px] flex flex-col shadow-[0_0_80px_rgba(0,0,0,0.9)] relative overflow-hidden rounded-2xl">
                
                {/* Header */}
                <div className="h-16 shrink-0 border-b border-gray-800/50 bg-black/40 flex items-center justify-between px-6 relative z-50">
                    <div>
                        <h3 className="text-wuxia-gold font-serif font-bold text-2xl tracking-[0.3em] drop-shadow-md">天下大势</h3>
                        <p className="text-gray-500 text-[10px] tracking-widest mt-0.5">
                            活跃人物与江湖事件总览
                        </p>
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

                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar Tabs - Adjusted width to 25% */}
                    <div className="w-[25%] bg-black/20 border-r border-gray-800/50 flex flex-col py-4 gap-1">
                        {[
                            { id: 'events', label: '风云变幻' },
                            { id: 'npcs', label: '绝世强者' },
                            { id: 'overview', label: '史册归档' },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as TabType)}
                                className={`px-5 py-3 text-left font-serif font-bold tracking-widest transition-all text-sm ${
                                    activeTab === tab.id 
                                    ? 'text-wuxia-gold bg-wuxia-gold/5 border-l-4 border-wuxia-gold' 
                                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 border-l-4 border-transparent'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 bg-ink-wash/5 p-6 overflow-y-auto custom-scrollbar relative">
                        {/* Background Deco */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[200px] text-black/5 font-serif pointer-events-none select-none z-0">
                            武
                        </div>

                        <div className="relative z-10 max-w-3xl mx-auto">
                            
                            {/* --- EVENTS TAB --- */}
                            {activeTab === 'events' && (
                                <div className="space-y-6">
                                    <h4 className="text-gray-400 font-bold uppercase tracking-widest text-xs border-b border-gray-800 pb-2 mb-4">正在发生的事件</h4>
                                    
                                    {world.进行中事件.length > 0 ? (
                                        <div className="relative border-l-2 border-gray-800 ml-3 pl-6 space-y-6">
                                            {world.进行中事件.map(evt => (
                                                <div key={evt.ID} className="relative bg-black/40 border border-gray-700/50 p-4 rounded-lg hover:border-wuxia-gold/50 transition-colors">
                                                    {/* Timeline Dot */}
                                                    <div className="absolute -left-[35px] top-5 w-4 h-4 rounded-full border-2 border-ink-black bg-wuxia-gold shadow-[0_0_10px_rgba(230,200,110,0.5)]"></div>
                                                    
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-wuxia-gold font-bold text-base">{evt.标题}</span>
                                                            <span className="text-[9px] bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded">{evt.类型}</span>
                                                            <span className="text-[9px] bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                                <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse"></span>
                                                                进行中
                                                            </span>
                                                        </div>
                                                        <div className="text-[10px] text-gray-500 font-mono text-right leading-tight">
                                                            <div>始: {evt.开始时间}</div>
                                                            <div className="text-gray-600">终: {evt.预计结束时间}</div>
                                                        </div>
                                                    </div>
                                                    <p className="text-gray-300 text-xs leading-relaxed border-l-2 border-gray-800 pl-3 mb-2">
                                                        {evt.内容}
                                                    </p>
                                                    <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                                                        </svg>
                                                        {evt.发生地点}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-16 text-gray-600 italic border-2 border-dashed border-gray-800 rounded-xl text-sm">
                                            四海升平，暂无大事发生。
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* --- NPCS TAB --- */}
                            {activeTab === 'npcs' && (
                                <div className="space-y-4">
                                    {world.活跃NPC列表.length > 0 ? world.活跃NPC列表.map(npc => (
                                        <div key={npc.ID} className="flex items-start bg-black/30 border border-gray-800 p-4 rounded-lg gap-3">
                                             <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center text-xl font-serif font-bold text-gray-600 border border-gray-700">
                                                 {npc.姓名[0]}
                                             </div>
                                             <div className="flex-1">
                                                 <div className="flex justify-between items-start">
                                                     <div>
                                                         <span className="text-base font-bold text-gray-200 mr-2">{npc.姓名}</span>
                                                         <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">{npc.称号}</span>
                                                     </div>
                                                     <div className="text-[10px] text-wuxia-cyan border border-wuxia-cyan/30 px-1.5 py-0.5 rounded">
                                                         {npc.境界}
                                                     </div>
                                                 </div>
                                                 
                                                 <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-1 mb-2">
                                                     <span className="text-gray-600">当前位置:</span>
                                                     <span className="text-gray-300">{npc.当前位置}</span>
                                                     <span className="mx-2">|</span>
                                                     <span className="text-gray-600">状态:</span>
                                                     <span className="text-gray-300">{npc.状态}</span>
                                                 </div>

                                                 <div className="text-xs text-gray-300 bg-white/5 p-2 rounded flex gap-2 items-center">
                                                     <span className="w-1.5 h-1.5 rounded-full bg-wuxia-gold animate-pulse"></span>
                                                     {npc.当前行动描述}
                                                 </div>
                                                 <div className="text-[9px] text-gray-600 mt-1 text-right">
                                                     预计结束: {npc.行动预计结束时间}
                                                 </div>
                                             </div>
                                        </div>
                                    )) : (
                                        <div className="text-center py-16 text-gray-600 italic text-sm">
                                            举世茫茫，不见英雄踪迹。
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* --- CHRONICLE TAB --- */}
                            {activeTab === 'overview' && (
                                <div className="relative border-l border-gray-800 ml-3 pl-6 py-4 space-y-6">
                                    {world.江湖史册.length > 0 ? world.江湖史册.map((evt, i) => (
                                        <div key={i} className="relative">
                                            <div className="absolute -left-[29px] top-1.5 w-2 h-2 rounded-full bg-gray-700 border border-black"></div>
                                            <div className="text-[10px] text-gray-500 font-mono mb-0.5">{evt.开始时间.split(':')[0]}年</div>
                                            <h4 className="text-gray-300 font-bold text-sm mb-1">{evt.标题}</h4>
                                            <p className="text-gray-500 text-xs leading-relaxed">{evt.事件结果 || evt.内容}</p>
                                        </div>
                                    )) : (
                                         <div className="text-gray-600 italic text-sm">
                                            暂无史册记载。
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WorldModal;
