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
    已失效: 'text-gray-500 border-gray-800'
};

const 取状态样式 = (status: string): string => 状态样式映射[status] || 'text-gray-300 border-gray-700';

const HeroinePlanModal: React.FC<Props> = ({ plan, onClose }) => {
    const 女主条目 = Array.isArray(plan?.女主条目) ? plan!.女主条目 : [];
    const 排期条目 = Array.isArray(plan?.互动排期) ? plan!.互动排期 : [];
    const 群像条目 = Array.isArray(plan?.群像镜头规划) ? plan!.群像镜头规划 : [];
    const 登场队列 = Array.isArray(plan?.登场队列) ? plan!.登场队列 : [];

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-ink-black/95 border border-wuxia-gold/30 w-full max-w-6xl h-[700px] flex flex-col shadow-[0_0_80px_rgba(0,0,0,0.9)] rounded-2xl overflow-hidden">
                <div className="h-16 shrink-0 border-b border-gray-800/50 bg-black/40 flex items-center justify-between px-6">
                    <div>
                        <h3 className="text-wuxia-gold font-serif font-bold text-xl tracking-[0.2em]">女主规划</h3>
                        <div className="text-[11px] text-gray-500 mt-1">
                            阶段：{plan?.当前阶段 || '未初始化'} ｜ 焦点：{plan?.当前焦点女主ID || '无'}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-black/50 border border-gray-700 text-gray-400 hover:text-wuxia-red hover:border-wuxia-red transition-all"
                        title="关闭"
                    >
                        ×
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
                    {!plan ? (
                        <div className="h-full flex items-center justify-center text-sm text-gray-500">
                            当前无女主剧情规划数据。请先开启功能并推进剧情生成。
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                <div className="bg-black/25 border border-gray-800 rounded-lg p-4">
                                    <div className="text-xs text-wuxia-cyan font-bold mb-3 tracking-widest">规则约束</div>
                                    <div className="space-y-2 text-xs text-gray-300">
                                        <div>单回合主推进上限：{plan.规则约束?.单回合主推进上限 ?? '-'}</div>
                                        <div>单回合次推进上限：{plan.规则约束?.单回合次推进上限 ?? '-'}</div>
                                        <div>连续同女主推进上限：{plan.规则约束?.连续同女主推进上限 ?? '-'}</div>
                                        <div>低压回合保底互动数：{plan.规则约束?.低压回合保底互动数 ?? '-'}</div>
                                    </div>
                                </div>

                                <div className="bg-black/25 border border-gray-800 rounded-lg p-4 lg:col-span-2">
                                    <div className="text-xs text-wuxia-cyan font-bold mb-3 tracking-widest">登场队列</div>
                                    {登场队列.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {登场队列.map((id, idx) => (
                                                <span key={`${id}_${idx}`} className="px-2 py-1 text-xs border border-gray-700 rounded bg-black/40 text-gray-300">
                                                    {idx + 1}. {id}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-xs text-gray-600">暂无登场队列</div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-black/25 border border-gray-800 rounded-lg p-4">
                                <div className="text-xs text-wuxia-gold font-bold mb-3 tracking-widest">女主条目</div>
                                {女主条目.length > 0 ? (
                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                                        {女主条目.map((item, idx) => (
                                            <div key={`${item.女主ID}_${idx}`} className="border border-gray-800 rounded-lg p-3 bg-black/35">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="text-sm text-wuxia-gold font-serif font-bold">{item.女主名}（{item.女主ID}）</div>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded border ${取状态样式(item.登场状态)}`}>
                                                        {item.登场状态}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
                                                    <div>重要度：{item.重要度}</div>
                                                    <div>优先级：{item.互动优先级}</div>
                                                    <div>关系阶段：{item.当前关系阶段}</div>
                                                    <div>最近推进：{item.最近推进时间 || '未记录'}</div>
                                                </div>
                                                <div className="mt-2 text-xs text-gray-300">当前目标：{item.当前阶段目标 || '无'}</div>
                                                <div className="mt-1 text-xs text-cyan-200">下一突破条件：{item.下一突破条件 || '无'}</div>
                                                <div className="mt-2 text-[11px] text-gray-400">
                                                    男性锚点：{item.既有男性锚点?.length || 0} ｜ 已完成：{item.已完成节点?.length || 0} ｜ 待完成：{item.待完成节点?.length || 0}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-xs text-gray-600">暂无女主条目</div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                <div className="bg-black/25 border border-gray-800 rounded-lg p-4">
                                    <div className="text-xs text-wuxia-cyan font-bold mb-3 tracking-widest">互动排期</div>
                                    {排期条目.length > 0 ? (
                                        <div className="space-y-2 max-h-[260px] overflow-y-auto custom-scrollbar pr-1">
                                            {排期条目.map((event, idx) => (
                                                <div key={`${event.事件ID}_${idx}`} className="border border-gray-800 rounded p-2 bg-black/35">
                                                    <div className="flex items-center justify-between">
                                                        <div className="text-xs text-gray-200">{event.事件ID} · {event.类型}</div>
                                                        <span className={`text-[10px] px-2 py-0.5 rounded border ${取状态样式(event.状态)}`}>{event.状态}</span>
                                                    </div>
                                                    <div className="mt-1 text-xs text-gray-400">女主ID：{event.女主ID}</div>
                                                    <div className="mt-1 text-xs text-gray-300">{event.描述}</div>
                                                    <div className="mt-1 text-[11px] text-gray-500">失效时间：{event.失效时间 || '未设定'}</div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-xs text-gray-600">暂无互动排期</div>
                                    )}
                                </div>

                                <div className="bg-black/25 border border-gray-800 rounded-lg p-4">
                                    <div className="text-xs text-wuxia-cyan font-bold mb-3 tracking-widest">群像镜头规划</div>
                                    {群像条目.length > 0 ? (
                                        <div className="space-y-2 max-h-[260px] overflow-y-auto custom-scrollbar pr-1">
                                            {群像条目.map((shot, idx) => (
                                                <div key={`${shot.镜头ID}_${idx}`} className="border border-gray-800 rounded p-2 bg-black/35">
                                                    <div className="flex items-center justify-between">
                                                        <div className="text-xs text-gray-200">{shot.镜头ID}</div>
                                                        <span className={`text-[10px] px-2 py-0.5 rounded border ${取状态样式(shot.状态)}`}>{shot.状态}</span>
                                                    </div>
                                                    <div className="mt-1 text-xs text-gray-300">焦点：{shot.焦点 || '无'}</div>
                                                    <div className="mt-1 text-xs text-gray-400">冲突：{shot.预期冲突 || '无'}</div>
                                                    <div className="mt-1 text-[11px] text-gray-500">
                                                        参与者：{(shot.参与者 || []).join('、') || '无'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-xs text-gray-600">暂无群像镜头规划</div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HeroinePlanModal;

