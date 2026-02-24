import React, { useState, useMemo, useCallback } from 'react';
import type { 女主剧情规划结构 } from '../../../types';

interface Props {
    plan?: 女主剧情规划结构;
    onClose: () => void;
}

const 状态样式映射: Record<string, string> = {
    未登场: 'text-gray-400 border-gray-700',
    可触发: 'text-cyan-300 border-cyan-700/60',
    已登场: 'text-emerald-300 border-emerald-700/60',
    待触发: 'text-amber-300 border-amber-700/60',
    已触发: 'text-emerald-300 border-emerald-700/60',
    已失效: 'text-gray-500 border-gray-800',
    待执行: 'text-amber-300 border-amber-700/60',
    已执行: 'text-emerald-300 border-emerald-700/60'
};

const 取状态样式 = (status: string): string => 状态样式映射[status] || 'text-gray-300 border-gray-700';

const SectionHeader: React.FC<{ title: string; color: 'gold' | 'red' | 'cyan' }> = ({ title, color }) => {
    const colorClass = {
        gold: 'text-wuxia-gold',
        red: 'text-wuxia-red',
        cyan: 'text-wuxia-cyan',
    }[color];
    const bgColorClass = {
        gold: 'bg-wuxia-gold',
        red: 'bg-wuxia-red',
        cyan: 'bg-wuxia-cyan',
    }[color];

    return (
        <div className={`flex items-center gap-3 mb-4`}>
            <span className={`w-6 h-px ${bgColorClass}`}></span>
            <h4 className={`${colorClass} font-bold text-xs uppercase tracking-[0.2em]`}>{title}</h4>
        </div>
    );
};


const HeroinePlanModal: React.FC<Props> = ({ plan, onClose }) => {
    const [activeTab, setActiveTab] = useState<'heroines' | 'schedule' | 'ensemble'>('heroines');

    const 女主条目 = useMemo(() => Array.isArray(plan?.女主条目) ? plan!.女主条目 : [], [plan]);
    const 排期条目 = useMemo(() => Array.isArray(plan?.互动排期) ? plan!.互动排期 : [], [plan]);
    const 群像条目 = useMemo(() => Array.isArray(plan?.群像镜头规划) ? plan!.群像镜头规划 : [], [plan]);
    const 登场队列 = useMemo(() => Array.isArray(plan?.登场队列) ? plan!.登场队列 : [], [plan]);

    const 女主名映射 = useMemo(() => {
        const map = new Map<string, string>();
        女主条目.forEach((item) => {
            const id = (item.女主ID || '').trim();
            const name = (item.女主名 || '').trim();
            if (id && name) map.set(id, name);
        });
        return map;
    }, [女主条目]);

    const 取角色显示名 = useCallback((raw: string | undefined) => {
        const text = (raw || '').trim();
        if (!text) return '未知角色';
        const mapped = 女主名映射.get(text);
        if (mapped) return mapped;
        if (/[\u4e00-\u9fa5]/.test(text)) return text;
        return '未知角色';
    }, [女主名映射]);

    const 当前焦点名 = useMemo(() => {
        if (!plan?.当前焦点女主ID) return '无';
        return 取角色显示名(plan.当前焦点女主ID);
    }, [plan?.当前焦点女主ID, 取角色显示名]);

    const 按优先级女主 = useMemo(() => {
        return [...女主条目].sort((a, b) => (b.互动优先级 || 0) - (a.互动优先级 || 0));
    }, [女主条目]);

    const renderContent = () => {
        if (!plan) {
            return (
                <div className="h-full min-h-[300px] flex items-center justify-center text-sm text-gray-500">
                    当前无女主剧情规划数据。请先开启功能并推进剧情生成。
                </div>
            );
        }

        switch (activeTab) {
            case 'heroines':
                return (
                    <div className="space-y-3">
                         {按优先级女主.length > 0 ? (
                            按优先级女主.map((item, idx) => (
                                <div key={`${item.女主ID}_${idx}`} className="bg-black/30 border border-gray-800 rounded-lg p-4 transition-all hover:border-wuxia-gold/50 hover:bg-black/50">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1">
                                            <div className='flex items-center gap-3'>
                                                <div className="text-base font-serif font-bold text-wuxia-gold">{item.女主名 || '未知角色'}</div>
                                                <div className='text-xs text-gray-400'>重要度: {item.重要度 || '-'}</div>
                                            </div>
                                            <div className="text-xs text-gray-400 mt-1">关系阶段: {item.当前关系阶段 || '未设定'}</div>
                                        </div>
                                        <span className={`text-[10px] px-2 py-0.5 rounded border ${取状态样式(item.登场状态)}`}>{item.登场状态}</span>
                                    </div>
                                    
                                    <div className="mt-3 pt-3 border-t border-gray-800 space-y-2 text-[11px]">
                                        <div className="text-gray-300">当前目标: {item.当前阶段目标 || '暂无'}</div>
                                        <div className="text-cyan-300">下一突破: {item.下一突破条件 || '暂无'}</div>
                                    </div>

                                    <div className="mt-3 text-[10px] text-gray-500 flex items-center justify-between">
                                        <span>最近推进: {item.最近推进时间 || '未记录'}</span>
                                        <span>互动优先级: {item.互动优先级 ?? '-'}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10 text-gray-700 text-xs italic font-serif">暂无女主条目。</div>
                        )}
                    </div>
                )
            case 'schedule':
                 return (
                    <div className="space-y-3">
                        {排期条目.length > 0 ? (
                            排期条目.map((event, idx) => (
                                <div key={`${event.事件ID}_${idx}`} className="bg-black/30 border border-gray-800 rounded-lg p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="text-sm font-serif font-bold text-gray-200">
                                            {取角色显示名(event.女主ID)} · <span className='text-wuxia-cyan'>{event.类型}</span>
                                        </div>
                                        <span className={`text-[10px] px-2 py-0.5 rounded border ${取状态样式(event.状态)}`}>{event.状态}</span>
                                    </div>
                                    <div className="text-xs text-gray-300 mt-2">{event.描述 || '暂无描述'}</div>
                                    <div className="text-[10px] text-amber-300 mt-2">触发条件: {event.触发条件 || '未设定'}</div>
                                    <div className="text-[10px] text-gray-500 mt-1">失效时间: {event.失效时间 || '未设定'}</div>
                                </div>
                            ))
                        ) : (
                             <div className="text-center py-10 text-gray-700 text-xs italic font-serif">暂无互动排期。</div>
                        )}
                    </div>
                )
            case 'ensemble':
                return (
                     <div className="space-y-3">
                        {群像条目.length > 0 ? (
                            群像条目.map((shot, idx) => (
                                <div key={`${shot.镜头ID}_${idx}`} className="bg-black/30 border border-gray-800 rounded-lg p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="text-sm font-serif font-bold text-gray-200">群像镜头 {idx + 1}</div>
                                        <span className={`text-[10px] px-2 py-0.5 rounded border ${取状态样式(shot.状态)}`}>{shot.状态}</span>
                                    </div>
                                    <div className="text-xs text-gray-300 mt-2">焦点: {shot.焦点 || '未设定'}</div>
                                    <div className="text-xs text-gray-400 mt-1">冲突: {shot.预期冲突 || '无'}</div>
                                    <div className="text-[10px] text-gray-500 mt-2">
                                        参与者: {(shot.参与者 || []).map(取角色显示名).join('、') || '无'}
                                    </div>
                                </div>
                            ))
                        ) : (
                             <div className="text-center py-10 text-gray-700 text-xs italic font-serif">暂无群像镜头规划。</div>
                        )}
                    </div>
                )
            default:
                return null;
        }
    };

    const TabButton: React.FC<{ tabId: typeof activeTab, title: string, count: number }> = ({ tabId, title, count }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`px-4 py-2 text-sm font-serif rounded-t-lg border-b-2 transition-all outline-none 
                ${activeTab === tabId
                    ? 'border-wuxia-gold text-wuxia-gold bg-black/30'
                    : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-black/10'}`}>
            {title} <span className='text-xs opacity-70'>({count})</span>
        </button>
    );

    // Main Render
    return (
        <>
            {/* Desktop Modal */}
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] hidden md:flex items-center justify-center p-4 animate-fadeIn">
                <div className="bg-ink-black/90 border border-wuxia-gold/30 w-full max-w-6xl h-[90vh] max-h-[800px] flex flex-col shadow-[0_0_80px_rgba(0,0,0,0.9)] relative overflow-hidden rounded-2xl">
                    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/black-linen.png')] pointer-events-none z-0"></div>
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-radial from-wuxia-gold/5 to-transparent opacity-30 pointer-events-none z-0"></div>

                    <header className="h-16 shrink-0 border-b border-gray-800/50 bg-black/30 flex items-center justify-between px-6 relative z-50">
                         <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-wuxia-red/10 border border-wuxia-red/50 rounded-full flex items-center justify-center text-xl font-serif font-bold text-wuxia-red shadow-[0_0_15px_rgba(163,24,24,0.2)]">
                                谱
                            </div>
                            <div>
                                <h3 className="text-wuxia-gold font-serif font-bold text-xl tracking-[0.2em] drop-shadow-md">女主规划</h3>
                                <div className="text-xs text-gray-500 font-mono mt-0.5">当前阶段: {plan?.当前阶段 || '未初始化'}</div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-9 h-9 flex items-center justify-center rounded-full bg-black/50 border border-gray-700 text-gray-400 hover:text-wuxia-red hover:border-wuxia-red transition-all group"
                        >
                            <span className="group-hover:rotate-90 transition-transform duration-300 text-2xl font-light">×</span>
                        </button>
                    </header>

                    <div className="flex-1 flex overflow-hidden relative z-10">
                        {/* Left Panel */}
                        <aside className="w-72 bg-black/20 border-r border-gray-800/50 flex flex-col">
                             <div className="p-4 border-b border-gray-800/50">
                                <SectionHeader title='规划摘要' color='gold'/>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                     {['单回合主推进上限', '单回合次推进上限', '连续同女主推进上限', '低压回合保底互动数'].map(key => (
                                        <div key={key} className="bg-black/30 border border-gray-800/70 rounded-md p-2">
                                            <div className="text-gray-500 text-[10px] mb-1 whitespace-nowrap overflow-hidden text-ellipsis">{key.replace('单回合','').replace('上限','').replace('连续同','同')}</div>
                                            <div className="text-gray-200 font-bold">{plan?.规则约束?.[key as keyof typeof plan.规则约束] ?? '-'}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className='p-4 border-b border-gray-800/50'>
                                <SectionHeader title='当前焦点' color='cyan'/>
                                <div className="text-lg font-serif font-bold text-white mb-1">{当前焦点名}</div>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                               <SectionHeader title='登场序列' color='red'/>
                                {登场队列.length > 0 ? (
                                    登场队列.map((entry, i) => (
                                        <div key={`${entry}_${i}`} className="relative pl-5 border-l-2 border-gray-800 opacity-80 hover:opacity-100 transition-opacity">
                                            <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-gray-600"></div>
                                            <div className="text-sm font-serif font-bold text-gray-200">{取角色显示名(entry)}</div>
                                            <div className="text-[10px] text-gray-500 mt-1">优先序位 {i + 1}</div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-6 text-gray-700 text-xs italic font-serif">尚未排定</div>
                                )}
                            </div>
                        </aside>

                        {/* Right Panel */}
                        <main className="flex-1 bg-ink-wash/5 flex flex-col overflow-hidden">
                            <div className="shrink-0 border-b border-gray-800/50 px-6">
                                <div className="flex items-center gap-4">
                                    <TabButton tabId='heroines' title='女主列表' count={按优先级女主.length} />
                                    <TabButton tabId='schedule' title='互动排期' count={排期条目.length} />
                                    <TabButton tabId='ensemble' title='群像镜头' count={群像条目.length} />
                                </div>
                            </div>
                            <div className='flex-1 overflow-y-auto custom-scrollbar p-6'>
                                {renderContent()}
                            </div>
                        </main>
                    </div>
                </div>
            </div>

            {/* Mobile View */}
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex md:hidden flex-col p-2 animate-fadeIn">
                 <div className="bg-ink-black/95 border border-wuxia-gold/30 w-full h-full flex flex-col shadow-lg relative overflow-hidden rounded-xl">
                    <header className="h-14 shrink-0 border-b border-gray-800/60 bg-black/40 flex items-center justify-between px-4">
                         <div>
                            <h3 className="text-wuxia-gold font-serif font-bold text-base tracking-[0.2em]">女主规划</h3>
                            <div className="text-[9px] text-gray-500 font-mono mt-0.5">{plan?.当前阶段 || '未初始化'}</div>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-black/50 border border-gray-700 text-gray-400">
                            <span>×</span>
                        </button>
                    </header>

                    <div className='shrink-0 border-b border-gray-800/50 p-3 bg-black/20'>
                        <div className='grid grid-cols-2 gap-2'>
                             <div className='bg-black/20 border border-gray-700/50 rounded p-2'>
                                <div className='text-wuxia-gold/80 text-[10px] tracking-widest'>当前焦点</div>
                                <div className='text-white font-serif font-bold text-sm truncate'>{当前焦点名}</div>
                            </div>
                             <div className='bg-black/20 border border-gray-700/50 rounded p-2'>
                                <div className='text-gray-500 text-[10px] tracking-widest'>登场序列</div>
                                <div className='text-white font-serif font-bold text-sm'>{登场队列.length} 人</div>
                            </div>
                        </div>
                    </div>

                    <main className="flex-1 flex flex-col min-h-0">
                         <div className="shrink-0 border-b border-gray-800/50 px-2">
                            <div className="flex items-center justify-around gap-1">
                                <TabButton tabId='heroines' title='女主' count={按优先级女主.length} />
                                <TabButton tabId='schedule' title='排期' count={排期条目.length} />
                                <TabButton tabId='ensemble' title='群像' count={群像条目.length} />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
                            {renderContent()} 
                        </div>
                    </main>
                 </div>
            </div>
        </>
    );
};

export default HeroinePlanModal;
