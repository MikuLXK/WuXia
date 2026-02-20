import React, { useMemo, useState } from 'react';
import { 聊天记录结构, 记忆系统结构 } from '../../../types';

interface Props {
    history?: 聊天记录结构[];
    memorySystem?: 记忆系统结构;
}

type 回忆展示结构 = {
    名称: string;
    概括: string;
    原文: string;
    回合: number;
    记录时间: string;
    时间戳: number;
};

const 即时短期分隔标记 = '\n<<SHORT_TERM_SYNC>>\n';

const 拆分即时与短期 = (entry: string): { 即时内容: string; 短期摘要: string } => {
    const raw = (entry || '').trim();
    if (!raw) return { 即时内容: '', 短期摘要: '' };
    const splitAt = raw.lastIndexOf(即时短期分隔标记);
    if (splitAt < 0) return { 即时内容: raw, 短期摘要: '' };
    return {
        即时内容: raw.slice(0, splitAt).trim(),
        短期摘要: raw.slice(splitAt + 即时短期分隔标记.length).trim()
    };
};

const 格式化回忆名称 = (round: number): string => `【回忆${String(Math.max(1, round)).padStart(3, '0')}】`;

const HistoryViewer: React.FC<Props> = ({ history = [], memorySystem }) => {
    const [query, setQuery] = useState('');

    const allMemories = useMemo<回忆展示结构[]>(() => {
        if (Array.isArray(memorySystem?.回忆档案) && memorySystem!.回忆档案.length > 0) {
            return memorySystem!.回忆档案
                .map((item, idx) => ({
                    名称: typeof item?.名称 === 'string' && item.名称.trim() ? item.名称.trim() : 格式化回忆名称(idx + 1),
                    概括: typeof item?.概括 === 'string' ? item.概括 : '',
                    原文: typeof item?.原文 === 'string' ? item.原文 : '',
                    回合: typeof item?.回合 === 'number' && Number.isFinite(item.回合) ? Math.max(1, Math.floor(item.回合)) : idx + 1,
                    记录时间: typeof item?.记录时间 === 'string' ? item.记录时间 : '未知时间',
                    时间戳: typeof item?.时间戳 === 'number' && Number.isFinite(item.时间戳) ? item.时间戳 : 0
                }))
                .sort((a, b) => b.回合 - a.回合);
        }

        const immediate = Array.isArray(memorySystem?.即时记忆) ? memorySystem!.即时记忆 : [];
        if (immediate.length > 0) {
            return immediate
                .map((raw, idx) => {
                    const { 即时内容, 短期摘要 } = 拆分即时与短期(raw);
                    const round = idx + 1;
                    return {
                        名称: 格式化回忆名称(round),
                        概括: 短期摘要,
                        原文: 即时内容,
                        回合: round,
                        记录时间: '未知时间',
                        时间戳: 0
                    };
                })
                .filter(item => item.概括.trim() || item.原文.trim())
                .reverse();
        }

        const fallback = history
            .filter(msg => msg.role === 'assistant' && msg.structuredResponse)
            .map((msg, idx) => {
                const summary = (msg.structuredResponse?.shortTerm || '').trim();
                const rawText = Array.isArray(msg.structuredResponse?.logs)
                    ? msg.structuredResponse!.logs.map(l => `${l.sender}：${l.text}`).join('\n')
                    : msg.content;
                const round = idx + 1;
                return {
                    名称: 格式化回忆名称(round),
                    概括: summary,
                    原文: rawText,
                    回合: round,
                    记录时间: msg.gameTime || new Date(msg.timestamp).toLocaleString(),
                    时间戳: msg.timestamp || 0
                };
            })
            .filter(item => item.概括.trim() || item.原文.trim())
            .reverse();

        return fallback;
    }, [memorySystem, history]);

    const filteredMemories = useMemo(() => {
        const keyword = query.trim().toLowerCase();
        if (!keyword) return allMemories;
        return allMemories.filter(item => {
            const haystack = `${item.名称}\n${item.概括}\n${item.原文}\n${item.记录时间}`.toLowerCase();
            return haystack.includes(keyword);
        });
    }, [allMemories, query]);

    const [selectedName, setSelectedName] = useState<string>('');

    const selectedMemory = useMemo(() => {
        if (!filteredMemories.length) return null;
        const picked = filteredMemories.find(item => item.名称 === selectedName);
        return picked || filteredMemories[0];
    }, [filteredMemories, selectedName]);

    return (
        <div className="h-full flex flex-col animate-fadeIn">
            <h3 className="text-wuxia-gold font-serif font-bold text-lg mb-4 shrink-0">互动历史存档</h3>

            <div className="shrink-0 mb-3">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="搜索 名称 / 概括 / 原文"
                    className="w-full bg-black/40 border border-gray-700 p-2.5 text-sm text-white rounded-md outline-none focus:border-wuxia-gold"
                />
            </div>

            <div className="flex-1 min-h-0 grid gap-3 md:grid-cols-[1fr_1.2fr]">
                <div className="min-h-0 overflow-y-auto custom-scrollbar bg-black/20 border border-gray-800 rounded-lg">
                    <div className="sticky top-0 z-10 grid grid-cols-[130px_1fr] bg-black/60 border-b border-gray-800 px-3 py-2 text-[11px] text-gray-400">
                        <span>名称</span>
                        <span>概括</span>
                    </div>
                    <div>
                        {filteredMemories.map((item) => (
                            <button
                                key={`${item.名称}-${item.回合}`}
                                onClick={() => setSelectedName(item.名称)}
                                className={`w-full text-left grid grid-cols-[130px_1fr] gap-2 px-3 py-2 border-b border-gray-800/60 text-sm transition-colors ${
                                    selectedMemory?.名称 === item.名称 ? 'bg-wuxia-gold/10 text-wuxia-gold' : 'text-gray-300 hover:bg-white/5'
                                }`}
                            >
                                <span className="font-mono text-xs truncate">{item.名称}</span>
                                <span className="truncate">{item.概括 || '（无概括）'}</span>
                            </button>
                        ))}
                    </div>

                    {filteredMemories.length === 0 && (
                        <div className="text-center text-gray-600 py-10">暂无匹配记录</div>
                    )}
                </div>

                <div className="min-h-0 overflow-y-auto custom-scrollbar bg-black/20 border border-gray-800 rounded-lg p-4 space-y-3">
                    {selectedMemory ? (
                        <>
                            <div className="text-wuxia-gold font-bold">{selectedMemory.名称}</div>
                            <div className="text-[11px] text-gray-500">回合：{selectedMemory.回合} | 时间：{selectedMemory.记录时间 || '未知时间'}</div>

                            <div className="border-t border-gray-800 pt-3">
                                <div className="text-xs text-wuxia-cyan mb-1">概括</div>
                                <div className="text-sm text-gray-300 whitespace-pre-wrap">{selectedMemory.概括 || '（无概括）'}</div>
                            </div>

                            <div className="border-t border-gray-800 pt-3">
                                <div className="text-xs text-wuxia-cyan mb-1">原文</div>
                                <div className="text-sm text-gray-400 whitespace-pre-wrap leading-relaxed">{selectedMemory.原文 || '（无原文）'}</div>
                            </div>
                        </>
                    ) : (
                        <div className="text-center text-gray-600 py-10">请选择一条记录查看完整数据</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HistoryViewer;
