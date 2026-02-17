
import React, { useState } from 'react';
import { 任务结构, 任务类型 } from '../../../models/task';

interface Props {
    tasks: 任务结构[];
    onClose: () => void;
}

const TaskModal: React.FC<Props> = ({ tasks, onClose }) => {
    const [filter, setFilter] = useState<任务类型 | '全部'>('全部');
    const [selectedIdx, setSelectedIdx] = useState<number>(0);

    const filteredTasks = filter === '全部' 
        ? tasks 
        : tasks.filter(t => t.类型 === filter);

    const currentTask = filteredTasks[selectedIdx];

    const getStatusColor = (status: string) => {
        switch(status) {
            case '进行中': return 'text-wuxia-gold';
            case '可提交': return 'text-green-400';
            case '已完成': return 'text-gray-400';
            case '已失败': return 'text-red-500';
            default: return 'text-gray-500';
        }
    };

    const getTypeLabelColor = (type: string) => {
        switch(type) {
            case '主线': return 'bg-wuxia-red/20 text-wuxia-red border-wuxia-red/50';
            case '支线': return 'bg-blue-900/20 text-blue-300 border-blue-900/50';
            case '门派': return 'bg-green-900/20 text-green-300 border-green-900/50';
            default: return 'bg-gray-800 text-gray-400 border-gray-700';
        }
    }

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-ink-black/95 border border-wuxia-gold/30 w-full max-w-5xl h-[650px] flex flex-col shadow-[0_0_80px_rgba(0,0,0,0.9)] relative overflow-hidden rounded-2xl">
                
                {/* Header */}
                <div className="h-16 shrink-0 border-b border-gray-800/50 bg-black/40 flex items-center justify-between px-6 relative z-50">
                    <h3 className="text-wuxia-gold font-serif font-bold text-2xl tracking-[0.3em] drop-shadow-md">江湖传书</h3>
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
                    {/* Sidebar: Task List */}
                    <div className="w-[30%] bg-black/20 border-r border-gray-800/50 flex flex-col">
                        
                        {/* Filter Tabs */}
                        <div className="flex p-2 gap-1 border-b border-gray-800/50 overflow-x-auto no-scrollbar">
                            {['全部', '主线', '支线', '门派', '奇遇'].map(t => (
                                <button
                                    key={t}
                                    onClick={() => { setFilter(t as any); setSelectedIdx(0); }}
                                    className={`px-3 py-1.5 text-xs whitespace-nowrap rounded transition-colors ${
                                        filter === t 
                                        ? 'bg-wuxia-gold text-black font-bold' 
                                        : 'text-gray-500 hover:text-gray-300 bg-white/5'
                                    }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                            {filteredTasks.map((task, idx) => {
                                const isSelected = idx === selectedIdx;
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedIdx(idx)}
                                        className={`w-full text-left p-3 border rounded-lg transition-all relative group overflow-hidden ${
                                            isSelected 
                                            ? 'border-wuxia-gold/50 bg-wuxia-gold/5' 
                                            : 'border-gray-800 bg-white/[0.02] hover:bg-white/[0.05]'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={`font-bold font-serif ${isSelected ? 'text-wuxia-gold' : 'text-gray-300'}`}>
                                                {task.标题}
                                            </span>
                                            <span className={`text-[10px] ${getStatusColor(task.当前状态)}`}>
                                                {task.当前状态}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[9px] px-1.5 rounded border ${getTypeLabelColor(task.类型)}`}>
                                                {task.类型}
                                            </span>
                                            <span className="text-[10px] text-gray-500 truncate">
                                                {task.发布人} · {task.发布地点}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                            {filteredTasks.length === 0 && (
                                <div className="text-center text-gray-600 text-xs py-10">暂无此类任务</div>
                            )}
                        </div>
                    </div>

                    {/* Content: Details */}
                    <div className="flex-1 bg-ink-wash/5 p-8 overflow-y-auto custom-scrollbar relative">
                        {currentTask ? (
                            <div className="max-w-3xl mx-auto space-y-6">
                                {/* Paper Texture Background Effect */}
                                <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper.png')]"></div>

                                {/* Header */}
                                <div className="border-b border-gray-800 pb-4 mb-4 relative z-10">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h2 className="text-3xl font-black font-serif text-wuxia-gold mb-2">{currentTask.标题}</h2>
                                            <div className="flex gap-4 text-xs text-gray-400">
                                                <span>发布人: <span className="text-gray-300">{currentTask.发布人}</span></span>
                                                <span>地点: <span className="text-gray-300">{currentTask.发布地点}</span></span>
                                                <span>推荐境界: <span className="text-wuxia-cyan">{currentTask.推荐境界}</span></span>
                                            </div>
                                        </div>
                                        <div className={`text-4xl font-serif font-bold opacity-20 rotate-12 select-none ${getStatusColor(currentTask.当前状态)}`}>
                                            {currentTask.当前状态}
                                        </div>
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="bg-black/20 p-6 rounded border border-gray-800 relative z-10">
                                    <h4 className="text-gray-500 font-bold text-xs uppercase tracking-widest mb-3">任务详情</h4>
                                    <p className="text-gray-300 font-serif leading-loose text-sm indent-8">
                                        “{currentTask.描述}”
                                    </p>
                                </div>

                                {/* Objectives */}
                                <div className="relative z-10">
                                    <h4 className="text-gray-500 font-bold text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                                        当前目标
                                        <div className="h-px bg-gray-800 flex-1"></div>
                                    </h4>
                                    <div className="space-y-3">
                                        {currentTask.目标列表.map((obj, i) => (
                                            <div key={i} className="flex items-center gap-4 bg-black/30 p-3 rounded border border-gray-800/50">
                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                                                    obj.完成状态 
                                                    ? 'bg-wuxia-gold border-wuxia-gold text-black' 
                                                    : 'border-gray-600 text-transparent'
                                                }`}>
                                                    ✓
                                                </div>
                                                <div className="flex-1">
                                                    <div className={`text-sm ${obj.完成状态 ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                                                        {obj.描述}
                                                    </div>
                                                    <div className="mt-1 h-1.5 w-full bg-gray-900 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full transition-all duration-500 ${obj.完成状态 ? 'bg-green-500' : 'bg-wuxia-gold'}`} 
                                                            style={{ width: `${Math.min((obj.当前进度 / (obj.总需进度 || 1)) * 100, 100)}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                                <div className="text-xs font-mono text-gray-500 min-w-[50px] text-right">
                                                    {obj.当前进度}/{obj.总需进度}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Rewards */}
                                <div className="relative z-10">
                                    <h4 className="text-gray-500 font-bold text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                                        任务奖励
                                        <div className="h-px bg-gray-800 flex-1"></div>
                                    </h4>
                                    <div className="flex flex-wrap gap-3">
                                        {currentTask.奖励描述.map((reward, i) => (
                                            <div key={i} className="flex items-center gap-2 bg-wuxia-gold/10 border border-wuxia-gold/30 px-3 py-1.5 rounded text-wuxia-gold text-xs">
                                                <span className="w-1.5 h-1.5 bg-wuxia-gold rounded-full"></span>
                                                {reward}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Footer Dates */}
                                {currentTask.截止时间 && (
                                    <div className="mt-8 pt-4 border-t border-gray-800 text-right text-xs text-red-400 font-mono relative z-10">
                                        截止时间: {currentTask.截止时间}
                                    </div>
                                )}

                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-600 font-serif">
                                暂无选中任务
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TaskModal;
