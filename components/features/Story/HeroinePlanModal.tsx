import React from 'react';
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

const HeroinePlanModal: React.FC<Props> = ({ plan, onClose }) => {
    const 女主条目 = Array.isArray(plan?.女主条目) ? plan!.女主条目 : [];
    const 排期条目 = Array.isArray(plan?.互动排期) ? plan!.互动排期 : [];
    const 群像条目 = Array.isArray(plan?.群像镜头规划) ? plan!.群像镜头规划 : [];
    const 登场队列 = Array.isArray(plan?.登场队列) ? plan!.登场队列 : [];

    const 女主名映射 = React.useMemo(() => {
        const map = new Map<string, string>();
        女主条目.forEach((item) => {
            const id = (item.女主ID || '').trim();
            const name = (item.女主名 || '').trim();
            if (id && name) map.set(id, name);
        });
        return map;
    }, [女主条目]);

    const 取角色显示名 = React.useCallback((raw: string | undefined) => {
        const text = (raw || '').trim();
        if (!text) return '未知角色';
        const mapped = 女主名映射.get(text);
        if (mapped) return mapped;
        if (/[\u4e00-\u9fa5]/.test(text)) return text;
        return '未知角色';
    }, [女主名映射]);

    const 当前焦点名 = React.useMemo(() => {
        if (!plan?.当前焦点女主ID) return '无';
        return 取角色显示名(plan.当前焦点女主ID);
    }, [plan?.当前焦点女主ID, 取角色显示名]);

    const 按优先级女主 = React.useMemo(() => {
        return [...女主条目].sort((a, b) => (b.互动优先级 || 0) - (a.互动优先级 || 0));
    }, [女主条目]);

    return (
        <>
            <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[200] hidden md:flex items-center justify-center p-4 animate-fadeIn">
                <div className="bg-ink-black/95 border border-wuxia-gold/30 w-full max-w-5xl h-[650px] flex flex-col shadow-[0_0_80px_rgba(0,0,0,0.9)] relative overflow-hidden rounded-2xl">
                    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/black-linen.png')] pointer-events-none z-0"></div>
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-radial from-wuxia-gold/5 to-transparent opacity-30 pointer-events-none z-0"></div>

                    <div className="h-16 shrink-0 border-b border-gray-800/50 bg-black/40 flex items-center justify-between px-6 relative z-50">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-wuxia-red/10 border border-wuxia-red/50 rounded-full flex items-center justify-center text-xl font-serif font-bold text-wuxia-red shadow-[0_0_15px_rgba(163,24,24,0.2)]">
                                谱
                            </div>
                            <div>
                                <h3 className="text-wuxia-gold font-serif font-bold text-xl tracking-[0.2em] drop-shadow-md">女主规划</h3>
                                <div className="flex items-center gap-3 text-[10px] font-mono mt-0.5">
                                    <span className="text-gray-500">当前阶段</span>
                                    <span className="text-gray-500">/</span>
                                    <span className="text-gray-300 border-b border-gray-600 pb-0.5">{plan?.当前阶段 || '未初始化'}</span>
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

                    <div className="flex-1 flex overflow-hidden relative z-10">
                        <div className="w-64 bg-black/20 border-r border-gray-800/50 flex flex-col relative">
                            <div className="p-4 border-b border-gray-800/50 flex justify-between items-center">
                                <h4 className="text-gray-500 font-bold text-xs uppercase tracking-widest">登场序列</h4>
                                <span className="text-[10px] bg-gray-800 px-2 py-0.5 rounded text-gray-400">{登场队列.length} 位</span>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
                                {登场队列.length > 0 ? (
                                    登场队列.map((entry, i) => (
                                        <div key={`${entry}_${i}`} className="relative pl-4 border-l-2 border-gray-800 opacity-70 hover:opacity-100 transition-opacity">
                                            <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-gray-600"></div>
                                            <div className="text-xs font-serif font-bold text-gray-200">{取角色显示名(entry)}</div>
                                            <div className="text-[10px] text-gray-500 mt-1">优先序位 {i + 1}</div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-10 text-gray-700 text-xs italic font-serif">
                                        尚未排定登场节奏
                                    </div>
                                )}

                                <div className="relative pl-4 border-l-2 border-wuxia-gold">
                                    <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-wuxia-gold shadow-[0_0_10px_rgba(230,200,110,0.8)] animate-pulse"></div>
                                    <div className="text-[10px] text-wuxia-gold uppercase tracking-widest mb-1 font-bold">当前焦点</div>
                                    <div className="text-sm font-serif font-bold text-white mb-1">{当前焦点名}</div>
                                    <div className="text-[9px] text-gray-500">规划版本 {plan?.规划版本 || 'v1'}</div>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 bg-ink-wash/5 p-6 overflow-y-auto custom-scrollbar relative">
                            <div className="absolute top-0 right-10 text-[180px] font-serif text-black/5 pointer-events-none select-none z-0 leading-none">谱</div>

                            <div className="relative z-10 max-w-3xl mx-auto space-y-8 pb-10">
                                {!plan ? (
                                    <div className="h-full min-h-[300px] flex items-center justify-center text-sm text-gray-500">
                                        当前无女主剧情规划数据。请先开启功能并推进剧情生成。
                                    </div>
                                ) : (
                                    <>
                                        <div className="bg-gradient-to-br from-black/40 to-black/60 border border-gray-800 p-5 rounded-xl">
                                            <h4 className="text-wuxia-gold font-bold text-[10px] uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                                                <span className="w-6 h-px bg-wuxia-gold"></span>
                                                规划摘要
                                            </h4>
                                            <div className="grid grid-cols-2 gap-3 text-xs">
                                                <div className="bg-black/30 border border-gray-800 rounded-lg p-3">
                                                    <div className="text-gray-500 mb-1">主推进上限</div>
                                                    <div className="text-gray-200">{plan.规则约束?.单回合主推进上限 ?? '-'}</div>
                                                </div>
                                                <div className="bg-black/30 border border-gray-800 rounded-lg p-3">
                                                    <div className="text-gray-500 mb-1">次推进上限</div>
                                                    <div className="text-gray-200">{plan.规则约束?.单回合次推进上限 ?? '-'}</div>
                                                </div>
                                                <div className="bg-black/30 border border-gray-800 rounded-lg p-3">
                                                    <div className="text-gray-500 mb-1">连续同人上限</div>
                                                    <div className="text-gray-200">{plan.规则约束?.连续同女主推进上限 ?? '-'}</div>
                                                </div>
                                                <div className="bg-black/30 border border-gray-800 rounded-lg p-3">
                                                    <div className="text-gray-500 mb-1">低压保底互动</div>
                                                    <div className="text-gray-200">{plan.规则约束?.低压回合保底互动数 ?? '-'}</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-gradient-to-br from-black/40 to-black/60 border border-gray-800 p-5 rounded-xl">
                                            <h4 className="text-wuxia-red font-bold text-[10px] uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                                                <span className="w-6 h-px bg-wuxia-red"></span>
                                                女主条目
                                            </h4>
                                            {按优先级女主.length > 0 ? (
                                                <div className="space-y-3">
                                                    {按优先级女主.map((item, idx) => (
                                                        <div key={`${item.女主ID}_${idx}`} className="bg-black/30 border border-gray-800 rounded-lg p-3">
                                                            <div className="flex items-center justify-between gap-3">
                                                                <div className="text-sm font-serif font-bold text-gray-200">{item.女主名 || '未知角色'}</div>
                                                                <span className={`text-[10px] px-2 py-0.5 rounded border ${取状态样式(item.登场状态)}`}>{item.登场状态}</span>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2 mt-2 text-[11px] text-gray-400">
                                                                <div>关系阶段：{item.当前关系阶段 || '未设定'}</div>
                                                                <div>互动优先级：{item.互动优先级 ?? '-'}</div>
                                                                <div>重要度：{item.重要度 || '-'}</div>
                                                                <div>最近推进：{item.最近推进时间 || '未记录'}</div>
                                                            </div>
                                                            <div className="mt-2 text-[11px] text-gray-300">当前目标：{item.当前阶段目标 || '暂无'}</div>
                                                            <div className="mt-1 text-[11px] text-cyan-200">下一突破：{item.下一突破条件 || '暂无'}</div>
                                                            <div className="mt-2 text-[10px] text-gray-500">
                                                                男性锚点 {item.既有男性锚点?.length || 0} 项 ｜ 已完成 {item.已完成节点?.length || 0} ｜ 待完成 {item.待完成节点?.length || 0}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-xs text-gray-600 italic">暂无女主条目。</div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            <div className="bg-gradient-to-br from-black/40 to-black/60 border border-gray-800 p-5 rounded-xl">
                                                <h4 className="text-wuxia-cyan font-bold text-[10px] uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                                                    <span className="w-6 h-px bg-wuxia-cyan"></span>
                                                    互动排期
                                                </h4>
                                                {排期条目.length > 0 ? (
                                                    <div className="space-y-3 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
                                                        {排期条目.map((event, idx) => (
                                                            <div key={`${event.事件ID}_${idx}`} className="bg-black/30 border border-gray-800 rounded-lg p-3">
                                                                <div className="flex items-center justify-between gap-3">
                                                                    <div className="text-sm font-serif font-bold text-gray-200">
                                                                        {取角色显示名(event.女主ID)} · {event.类型}
                                                                    </div>
                                                                    <span className={`text-[10px] px-2 py-0.5 rounded border ${取状态样式(event.状态)}`}>{event.状态}</span>
                                                                </div>
                                                                <div className="text-[11px] text-gray-300 mt-1">{event.描述 || '暂无描述'}</div>
                                                                <div className="text-[10px] text-gray-500 mt-2">触发条件：{event.触发条件 || '未设定'}</div>
                                                                <div className="text-[10px] text-gray-600 mt-1">失效时间：{event.失效时间 || '未设定'}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-xs text-gray-600 italic">暂无互动排期。</div>
                                                )}
                                            </div>

                                            <div className="bg-gradient-to-br from-black/40 to-black/60 border border-gray-800 p-5 rounded-xl">
                                                <h4 className="text-wuxia-gold font-bold text-[10px] uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                                                    <span className="w-6 h-px bg-wuxia-gold"></span>
                                                    群像镜头
                                                </h4>
                                                {群像条目.length > 0 ? (
                                                    <div className="space-y-3 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
                                                        {群像条目.map((shot, idx) => (
                                                            <div key={`${shot.镜头ID}_${idx}`} className="bg-black/30 border border-gray-800 rounded-lg p-3">
                                                                <div className="flex items-center justify-between gap-3">
                                                                    <div className="text-sm font-serif font-bold text-gray-200">群像镜头 {idx + 1}</div>
                                                                    <span className={`text-[10px] px-2 py-0.5 rounded border ${取状态样式(shot.状态)}`}>{shot.状态}</span>
                                                                </div>
                                                                <div className="text-[11px] text-gray-300 mt-1">焦点：{shot.焦点 || '未设定'}</div>
                                                                <div className="text-[11px] text-gray-400 mt-1">冲突：{shot.预期冲突 || '无'}</div>
                                                                <div className="text-[10px] text-gray-500 mt-2">
                                                                    参与者：{(shot.参与者 || []).map(取角色显示名).join('、') || '无'}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-xs text-gray-600 italic">暂无群像镜头规划。</div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex md:hidden items-center justify-center p-3 animate-fadeIn">
                <div className="bg-ink-black/95 border border-wuxia-gold/30 w-full max-w-[640px] h-[86vh] flex flex-col shadow-[0_0_60px_rgba(0,0,0,0.8)] relative overflow-hidden rounded-2xl">
                    <div className="h-12 shrink-0 border-b border-gray-800/60 bg-black/40 flex items-center justify-between px-4">
                        <div>
                            <div className="text-wuxia-gold font-serif font-bold text-base tracking-[0.2em]">女主规划</div>
                            <div className="text-[9px] text-gray-500 font-mono mt-0.5">当前阶段 · {plan?.当前阶段 || '未初始化'}</div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-black/50 border border-gray-700 text-gray-400 hover:text-wuxia-red hover:border-wuxia-red transition-all"
                        >
                            ×
                        </button>
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 space-y-4 bg-ink-wash/5">
                        {!plan ? (
                            <div className="h-full min-h-[260px] flex items-center justify-center text-sm text-gray-500">
                                当前无女主剧情规划数据。请先开启功能并推进剧情生成。
                            </div>
                        ) : (
                            <>
                                <div className="bg-black/40 border border-gray-800 rounded-xl p-4">
                                    <div className="text-xl text-wuxia-gold font-serif font-bold mb-2">{当前焦点名}</div>
                                    <p className="text-sm text-gray-300 font-serif leading-relaxed">
                                        当前焦点女主，建议围绕其关系阶段与突破条件推进剧情。
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-gray-500">
                                        <span className="px-2 py-1 bg-black/30 border border-gray-700 rounded">规划版本 {plan.规划版本 || 'v1'}</span>
                                        <span className="px-2 py-1 bg-black/30 border border-gray-700 rounded">登场 {登场队列.length} 位</span>
                                    </div>
                                </div>

                                <div className="bg-black/40 border border-gray-800 rounded-xl p-4">
                                    <div className="text-[10px] text-wuxia-gold/70 tracking-[0.3em] mb-2">规则约束</div>
                                    <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-300">
                                        <div className="bg-black/30 border border-gray-800 rounded p-2">主推进上限：{plan.规则约束?.单回合主推进上限 ?? '-'}</div>
                                        <div className="bg-black/30 border border-gray-800 rounded p-2">次推进上限：{plan.规则约束?.单回合次推进上限 ?? '-'}</div>
                                        <div className="bg-black/30 border border-gray-800 rounded p-2">连续同人上限：{plan.规则约束?.连续同女主推进上限 ?? '-'}</div>
                                        <div className="bg-black/30 border border-gray-800 rounded p-2">低压保底互动：{plan.规则约束?.低压回合保底互动数 ?? '-'}</div>
                                    </div>
                                </div>

                                <div className="bg-black/40 border border-gray-800 rounded-xl p-4">
                                    <div className="text-[10px] text-wuxia-cyan/80 tracking-[0.3em] mb-2">登场队列</div>
                                    {登场队列.length > 0 ? (
                                        <div className="space-y-2">
                                            {登场队列.map((entry, idx) => (
                                                <div key={`${entry}_${idx}`} className="bg-black/30 border border-gray-800 rounded-lg p-3 text-[11px] text-gray-300">
                                                    {idx + 1}. {取角色显示名(entry)}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-[11px] text-gray-600 italic">暂无登场队列。</div>
                                    )}
                                </div>

                                <div className="bg-black/40 border border-gray-800 rounded-xl p-4">
                                    <div className="text-[10px] text-wuxia-red tracking-[0.3em] mb-2">女主条目</div>
                                    {按优先级女主.length > 0 ? (
                                        <div className="space-y-2">
                                            {按优先级女主.map((item, idx) => (
                                                <div key={`${item.女主ID}_${idx}`} className="bg-black/30 border border-gray-800 rounded-lg p-3">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="text-[12px] text-gray-200 font-serif font-bold">{item.女主名 || '未知角色'}</div>
                                                        <span className={`text-[10px] px-2 py-0.5 rounded border ${取状态样式(item.登场状态)}`}>{item.登场状态}</span>
                                                    </div>
                                                    <div className="text-[11px] text-gray-400 mt-1">关系阶段：{item.当前关系阶段 || '未设定'} ｜ 优先级：{item.互动优先级 ?? '-'}</div>
                                                    <div className="text-[11px] text-gray-300 mt-1">目标：{item.当前阶段目标 || '暂无'}</div>
                                                    <div className="text-[11px] text-cyan-200 mt-1">突破：{item.下一突破条件 || '暂无'}</div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-[11px] text-gray-600 italic">暂无女主条目。</div>
                                    )}
                                </div>

                                <div className="bg-black/40 border border-gray-800 rounded-xl p-4">
                                    <div className="text-[10px] text-wuxia-cyan/80 tracking-[0.3em] mb-2">互动排期</div>
                                    {排期条目.length > 0 ? (
                                        <div className="space-y-2">
                                            {排期条目.map((event, idx) => (
                                                <div key={`${event.事件ID}_${idx}`} className="bg-black/30 border border-gray-800 rounded-lg p-3">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="text-[12px] text-gray-200 font-serif font-bold">{取角色显示名(event.女主ID)} · {event.类型}</div>
                                                        <span className={`text-[10px] px-2 py-0.5 rounded border ${取状态样式(event.状态)}`}>{event.状态}</span>
                                                    </div>
                                                    <div className="text-[11px] text-gray-400 mt-1">{event.描述 || '暂无描述'}</div>
                                                    <div className="text-[10px] text-gray-500 mt-2">触发：{event.触发条件 || '未设定'}</div>
                                                    <div className="text-[10px] text-gray-600 mt-1">失效：{event.失效时间 || '未设定'}</div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-[11px] text-gray-600 italic">暂无互动排期。</div>
                                    )}
                                </div>

                                <div className="bg-black/40 border border-gray-800 rounded-xl p-4">
                                    <div className="text-[10px] text-wuxia-gold/70 tracking-[0.3em] mb-2">群像镜头</div>
                                    {群像条目.length > 0 ? (
                                        <div className="space-y-2">
                                            {群像条目.map((shot, idx) => (
                                                <div key={`${shot.镜头ID}_${idx}`} className="bg-black/30 border border-gray-800 rounded-lg p-3">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="text-[12px] text-gray-200 font-serif font-bold">群像镜头 {idx + 1}</div>
                                                        <span className={`text-[10px] px-2 py-0.5 rounded border ${取状态样式(shot.状态)}`}>{shot.状态}</span>
                                                    </div>
                                                    <div className="text-[11px] text-gray-300 mt-1">焦点：{shot.焦点 || '未设定'}</div>
                                                    <div className="text-[11px] text-gray-400 mt-1">冲突：{shot.预期冲突 || '无'}</div>
                                                    <div className="text-[10px] text-gray-500 mt-2">参与者：{(shot.参与者 || []).map(取角色显示名).join('、') || '无'}</div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-[11px] text-gray-600 italic">暂无群像镜头规划。</div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default HeroinePlanModal;
