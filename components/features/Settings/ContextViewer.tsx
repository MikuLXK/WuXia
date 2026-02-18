import React, { useEffect, useMemo, useState } from 'react';
import { 记忆配置结构 } from '../../../types';

type ContextSection = {
    id: string;
    title: string;
    category: string;
    order: number;
    content: string;
};

type ContextSnapshot = {
    sections: ContextSection[];
    fullText: string;
};

interface Props {
    snapshot: ContextSnapshot;
    memoryConfig?: 记忆配置结构;
    onSaveMemory?: (config: 记忆配置结构) => void;
}

const ContextViewer: React.FC<Props> = ({ snapshot, memoryConfig, onSaveMemory }) => {
    const [mode, setMode] = useState<'all' | 'single'>('all');
    const [selectedId, setSelectedId] = useState(snapshot.sections[0]?.id || '');
    const [重要角色记忆N, set重要角色记忆N] = useState(memoryConfig?.重要角色关键记忆条数N || 20);
    const [保存中, set保存中] = useState(false);
    const [已保存, set已保存] = useState(false);

    useEffect(() => {
        if (!snapshot.sections.find(s => s.id === selectedId)) {
            setSelectedId(snapshot.sections[0]?.id || '');
        }
    }, [snapshot.sections, selectedId]);
    useEffect(() => {
        set重要角色记忆N(memoryConfig?.重要角色关键记忆条数N || 20);
    }, [memoryConfig?.重要角色关键记忆条数N]);

    const selectedSection = useMemo(
        () => snapshot.sections.find(s => s.id === selectedId) || snapshot.sections[0],
        [snapshot.sections, selectedId]
    );

    const displayContent = mode === 'all'
        ? snapshot.fullText
        : (selectedSection?.content || '');
    const 可保存上下文配置 = Boolean(memoryConfig && onSaveMemory);

    const handleSaveMemoryInContext = async () => {
        if (!memoryConfig || !onSaveMemory) return;
        set保存中(true);
        try {
            await Promise.resolve(onSaveMemory({
                ...memoryConfig,
                重要角色关键记忆条数N: Math.max(1, Number(重要角色记忆N) || 20)
            }));
            set已保存(true);
            setTimeout(() => set已保存(false), 1800);
        } finally {
            set保存中(false);
        }
    };

    return (
        <div className="h-full flex flex-col space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-wuxia-gold font-serif font-bold text-lg">当前AI上下文</h3>
                    <div className="text-[11px] text-gray-500">顺序与类目一览</div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setMode('all')}
                        className={`px-3 py-1 text-xs rounded border transition-colors ${
                            mode === 'all' ? 'border-wuxia-gold bg-wuxia-gold/10 text-wuxia-gold' : 'border-gray-700 text-gray-400'
                        }`}
                    >
                        全部内容
                    </button>
                    <button
                        onClick={() => setMode('single')}
                        className={`px-3 py-1 text-xs rounded border transition-colors ${
                            mode === 'single' ? 'border-wuxia-cyan bg-wuxia-cyan/10 text-wuxia-cyan' : 'border-gray-700 text-gray-400'
                        }`}
                    >
                        单项查看
                    </button>
                </div>
            </div>

            <div className="bg-black/20 border border-gray-800 rounded-lg px-4 py-3 flex flex-wrap items-center gap-3">
                <span className="text-[11px] text-gray-400">上下文策略 · 重要角色关键记忆条数 N</span>
                <input
                    type="number"
                    min={1}
                    max={50}
                    value={重要角色记忆N}
                    disabled={!可保存上下文配置 || 保存中}
                    onChange={(e) => set重要角色记忆N(parseInt(e.target.value) || 20)}
                    className="bg-black/50 border border-gray-600 p-1 text-white font-mono w-20 text-center focus:border-wuxia-gold outline-none text-xs"
                />
                <button
                    onClick={handleSaveMemoryInContext}
                    disabled={!可保存上下文配置 || 保存中}
                    className="px-3 py-1 text-xs rounded border border-wuxia-gold/60 text-wuxia-gold hover:bg-wuxia-gold/10 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {保存中 ? '保存中...' : '保存'}
                </button>
                {已保存 && <span className="text-[11px] text-green-400">已保存</span>}
                {!可保存上下文配置 && <span className="text-[11px] text-gray-600">当前会话不可修改</span>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
                <div className="bg-black/30 border border-gray-800 rounded-lg overflow-hidden flex flex-col min-h-0">
                    <div className="px-4 py-2 border-b border-gray-800 text-[11px] text-gray-500 flex items-center justify-between">
                        <span>上下文顺序</span>
                        <span>{snapshot.sections.length} 项</span>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-white/5 text-[10px] text-gray-500 uppercase font-bold sticky top-0 z-10 backdrop-blur-sm">
                                <tr>
                                    <th className="p-2 w-10 text-center border-b border-gray-800">#</th>
                                    <th className="p-2 w-16 border-b border-gray-800">类目</th>
                                    <th className="p-2 border-b border-gray-800">项目</th>
                                    <th className="p-2 w-14 text-right border-b border-gray-800">Tok</th>
                                </tr>
                            </thead>
                            <tbody className="text-xs font-mono">
                                {snapshot.sections.map((item) => {
                                    const tokens = Math.ceil(item.content.length);
                                    const isActive = item.id === selectedId;
                                    return (
                                        <tr
                                            key={item.id}
                                            className={`border-b border-gray-800/50 transition-colors cursor-pointer ${
                                                isActive ? 'bg-white/5' : 'hover:bg-white/5'
                                            }`}
                                            onClick={() => {
                                                setSelectedId(item.id);
                                                setMode('single');
                                            }}
                                        >
                                            <td className="p-2 text-center text-gray-600">{item.order}</td>
                                            <td className="p-2 text-gray-400">{item.category}</td>
                                            <td className="p-2 text-gray-300">{item.title}</td>
                                            <td className="p-2 text-right text-gray-500">{tokens}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-black/30 border border-gray-800 rounded-lg flex flex-col min-h-0">
                    <div className="px-4 py-2 border-b border-gray-800 text-[11px] text-gray-500 flex items-center justify-between">
                        <span>
                            {mode === 'all' ? '全部上下文内容' : (selectedSection?.title || '单项内容')}
                        </span>
                        {mode === 'single' && selectedSection && (
                            <span className="text-gray-600">{selectedSection.category}</span>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                        <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-gray-300">
                            {displayContent || '暂无内容'}
                        </pre>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContextViewer;
