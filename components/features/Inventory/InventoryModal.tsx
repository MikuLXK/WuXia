
import React, { useState, useMemo, useEffect } from 'react';
import { 角色数据结构 } from '../../../types';
import { 游戏物品, 容器物品, 防具 } from '../../../models/item';

interface Props {
    character: 角色数据结构;
    onClose: () => void;
}

const InventoryModal: React.FC<Props> = ({ character, onClose }) => {
    const 未收纳视图ID = '__unstored__';
    const 装备槽位集合 = useMemo(() => new Set([
        '头部', '胸部', '腿部', '手部', '足部',
        '主武器', '副武器', '暗器', '背部', '腰部', '坐骑'
    ]), []);

    // 1. Identify all containers available
    const containers = useMemo(() => {
        return character.物品列表.filter(item => 
            item.容器属性 !== undefined && 
            (item.类型 === '容器' || item.类型 === '防具')
        );
    }, [character.物品列表]);

    const containerIds = useMemo(() => new Set(containers.map(c => c.ID)), [containers]);

    const itemContainerMap = useMemo(() => {
        const out = new Map<string, string | null>();
        character.物品列表.forEach((item) => {
            const explicit = typeof item.当前容器ID === 'string' ? item.当前容器ID.trim() : '';
            if (explicit && (containerIds.has(explicit) || 装备槽位集合.has(explicit))) {
                out.set(item.ID, explicit);
                return;
            }
            out.set(item.ID, null);
        });
        return out;
    }, [character.物品列表, containerIds, 装备槽位集合]);

    const [selectedContainerId, setSelectedContainerId] = useState<string | null>(
        未收纳视图ID
    );

    useEffect(() => {
        const available = new Set([
            未收纳视图ID,
            ...containers.map(c => c.ID)
        ]);
        if (!selectedContainerId || !available.has(selectedContainerId)) {
            setSelectedContainerId(未收纳视图ID);
        }
    }, [containers, selectedContainerId]);

    // 2. Get items in the selected container & Group them
    const currentContainer = character.物品列表.find(i => i.ID === selectedContainerId);
    
    // Calculate display logic
    const { containerItems, containerCapacity, containerUsed, containerUsedDerived } = useMemo(() => {
        const rawItems = character.物品列表.filter((item) => {
            const location = itemContainerMap.get(item.ID) || null;
            if (selectedContainerId === 未收纳视图ID) {
                return location === null;
            }
            return location === selectedContainerId && item.ID !== selectedContainerId;
        });
        
        // Grouping logic for display
        const groups: { item: 游戏物品, count: number }[] = [];
        const map = new Map<string, number>();

        rawItems.forEach(item => {
            // Group by Name + Quality to allow stacking
            const key = `${item.名称}-${item.品质}-${item.类型}`;
            if (map.has(key)) {
                groups[map.get(key)!].count++;
            } else {
                groups.push({ item, count: 1 });
                map.set(key, groups.length - 1);
            }
        });

        const derivedUsed = rawItems.reduce((sum, item) => sum + (Number(item.占用空间) || 0), 0);
        const capacity = currentContainer?.容器属性?.最大容量 || 0;
        const declaredUsed = currentContainer?.容器属性?.当前已用空间 || 0;

        return {
            containerItems: groups,
            containerCapacity: capacity,
            containerUsed: declaredUsed,
            containerUsedDerived: derivedUsed
        };
    }, [currentContainer, character.物品列表, itemContainerMap, selectedContainerId]);

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fadeIn">
            {/* Main Modal Container: Changed to flex-col to support Top Bar */}
            <div className="bg-ink-black/95 border border-wuxia-gold/30 w-full max-w-5xl h-[650px] flex flex-col shadow-[0_0_80px_rgba(0,0,0,0.9)] relative overflow-hidden rounded-2xl">
                
                {/* Header Deco */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-wuxia-gold/40 to-transparent"></div>

                {/* --- NEW TOP BAR SECTION --- */}
                <div className="h-16 shrink-0 border-b border-gray-800/50 bg-black/40 flex items-center justify-between px-6 relative z-50">
                    
                    {/* Title */}
                    <div className="flex items-center gap-4">
                        <h3 className="text-wuxia-gold font-serif font-bold text-2xl tracking-[0.3em] drop-shadow-md">行囊</h3>
                    </div>

                        {/* Load Info (Moved from sidebar) */}
                        <div className="flex items-center gap-3 w-64">
                         <span className="text-[10px] text-gray-400 whitespace-nowrap">总负重</span>
                         <div className="flex-1 flex flex-col gap-1">
                             <div className="h-2 w-full bg-gray-900 rounded-full overflow-hidden border border-gray-800">
                                <div 
                                    className={`h-full transition-all duration-500 ${character.当前负重 > character.最大负重 ? 'bg-red-600' : 'bg-gray-400'}`}
                                    style={{ width: `${Math.min((character.当前负重 / character.最大负重) * 100, 100)}%` }}
                                ></div>
                            </div>
                         </div>
                         <span className={`text-[10px] font-mono whitespace-nowrap ${character.当前负重 > character.最大负重 ? 'text-red-500' : 'text-gray-300'}`}>
                            {character.当前负重}/{character.最大负重}斤
                        </span>
                    </div>

                    {/* Close Button */}
                    <button 
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-black/50 border border-gray-700 text-gray-400 hover:text-wuxia-red hover:border-wuxia-red transition-all"
                        title="关闭"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>


                {/* --- MAIN CONTENT AREA (Split Left/Right) --- */}
                <div className="flex-1 flex overflow-hidden">
                    
                    {/* Left Column: Container Selection */}
                    <div className="w-[25%] border-r border-gray-800/50 flex flex-col bg-black/20">
                        <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-2 mt-2">
                            <button
                                onClick={() => setSelectedContainerId(未收纳视图ID)}
                                className={`w-full text-left p-4 border rounded-xl transition-all relative group overflow-hidden ${
                                    selectedContainerId === 未收纳视图ID
                                    ? 'border-wuxia-gold/60 bg-wuxia-gold/5 shadow-inner'
                                    : 'border-gray-800 bg-white/[0.02] hover:bg-white/[0.05] hover:border-gray-600'
                                }`}
                            >
                                <div className={`font-serif font-bold text-sm ${selectedContainerId === 未收纳视图ID ? 'text-wuxia-gold' : 'text-gray-300'}`}>
                                    未收纳
                                </div>
                                <div className="flex justify-between text-[10px] text-gray-500 mt-2">
                                    <span>未放入任何容器</span>
                                    <span className="font-mono">
                                        {character.物品列表.filter(i => (itemContainerMap.get(i.ID) || null) === null).length} 件
                                    </span>
                                </div>
                            </button>
                            {containers.map(c => {
                                const isSelected = c.ID === selectedContainerId;
                                const derivedUsed = character.物品列表
                                    .filter(item => item.ID !== c.ID && (itemContainerMap.get(item.ID) || null) === c.ID)
                                    .reduce((sum, item) => sum + (Number(item.占用空间) || 0), 0);
                                return (
                                    <button
                                        key={c.ID}
                                        onClick={() => setSelectedContainerId(c.ID)}
                                        className={`w-full text-left p-4 border rounded-xl transition-all relative group overflow-hidden ${
                                            isSelected 
                                            ? 'border-wuxia-gold/60 bg-wuxia-gold/5 shadow-inner' 
                                            : 'border-gray-800 bg-white/[0.02] hover:bg-white/[0.05] hover:border-gray-600'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={`font-serif font-bold text-sm ${isSelected ? 'text-wuxia-gold' : 'text-gray-300'}`}>
                                                {c.名称}
                                            </span>
                                            {c.容器属性?.减重比例 ? (
                                                <span className="text-[9px] bg-blue-900/30 text-blue-300 px-1.5 py-0.5 rounded-md border border-blue-800/50">
                                                    -{c.容器属性.减重比例}%重
                                                </span>
                                            ) : null}
                                        </div>
                                        <div className="flex justify-between text-[10px] text-gray-500 mt-2">
                                            <span>{c.类型 === '防具' ? (c as 防具).装备位置 : (c as 容器物品).装备位置}</span>
                                            <span className="font-mono">容量: {derivedUsed}/{c.容器属性?.最大容量}</span>
                                        </div>
                                    </button>
                                )
                            })}
                            {containers.length === 0 && (
                                <div className="text-center text-gray-600 text-xs py-10">无可用容器</div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Items Grid */}
                    <div className="flex-1 flex flex-col bg-ink-wash/5 relative">
                        {/* Container Status Header */}
                        {currentContainer && selectedContainerId !== 未收纳视图ID && (
                            <div className="h-16 border-b border-gray-800/50 flex items-center px-6 justify-between bg-black/20 shrink-0">
                                <div className="flex flex-col">
                                    <span className="text-wuxia-gold font-bold text-lg">{currentContainer.名称}</span>
                                    <span className="text-xs text-gray-400 mt-0.5">{currentContainer.描述}</span>
                                </div>
                                
                                {/* Capacity Visualization */}
                                <div className="w-1/3 flex flex-col items-end">
                                    <div className="text-[10px] text-gray-400 mb-1 flex gap-2">
                                        <span>空间占用</span>
                                        <span className="text-wuxia-cyan font-mono font-bold">{containerUsedDerived} / {containerCapacity}</span>
                                    </div>
                                    <div className="flex w-full gap-1 h-1.5 justify-end">
                                        {Array.from({ length: containerCapacity }).map((_, i) => (
                                            <div 
                                                key={i} 
                                                className={`flex-1 h-full rounded-[1px] border border-gray-800 ${
                                                    i < containerUsedDerived ? 'bg-wuxia-gold shadow-[0_0_5px_rgba(230,200,110,0.5)]' : 'bg-black/50'
                                                }`}
                                            ></div>
                                        ))}
                                    </div>
                                    <div className="text-[9px] text-gray-500 mt-1 flex gap-2">
                                        <span>最大单物尺寸: {currentContainer.容器属性?.最大单物大小}</span>
                                        {containerUsed !== containerUsedDerived && (
                                            <span className="text-amber-400">记录已用:{containerUsed}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {selectedContainerId === 未收纳视图ID && (
                            <div className="h-16 border-b border-gray-800/50 flex items-center px-6 justify-between bg-black/20 shrink-0">
                                <div className="flex flex-col">
                                    <span className="text-wuxia-gold font-bold text-lg">未收纳物品</span>
                                    <span className="text-xs text-gray-400 mt-0.5">这些物品当前未放入有效容器</span>
                                </div>
                                <div className="text-xs text-gray-500 font-mono">
                                    数量: {containerItems.reduce((sum, it) => sum + it.count, 0)}
                                </div>
                            </div>
                        )}

                        {/* Items Grid */}
                        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                            {containerItems.length > 0 ? (
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                    {containerItems.map(({ item, count }) => (
                                        <div 
                                            key={item.ID} 
                                            className="bg-black/40 border border-gray-700/60 p-3 relative group hover:border-wuxia-gold/60 hover:bg-black/60 transition-all rounded-xl flex flex-col gap-2 min-h-[90px] shadow-sm hover:shadow-md"
                                        >
                                            {/* Quantity Badge */}
                                            {count > 1 && (
                                                <div className="absolute -top-2 -right-2 bg-gray-800 border border-gray-600 text-white text-[10px] font-mono px-2 py-0.5 rounded-full z-20 shadow-md">
                                                    x{count}
                                                </div>
                                            )}

                                            {/* Top Row: Name & Quality */}
                                            <div className="flex justify-between items-start">
                                                <span className={`font-serif font-bold text-sm ${
                                                    item.品质 === '凡品' ? 'text-gray-300' :
                                                    item.品质 === '良品' ? 'text-blue-300' :
                                                    item.品质 === '上品' ? 'text-purple-300' :
                                                    item.品质 === '极品' ? 'text-orange-300' : 'text-red-400'
                                                }`}>
                                                    {item.名称}
                                                </span>
                                                <span className="text-[9px] text-gray-500 border border-gray-700 px-1.5 py-0.5 rounded bg-black/30">
                                                    {item.类型}
                                                </span>
                                            </div>

                                            {/* Description */}
                                            <p className="text-[10px] text-gray-400 leading-tight line-clamp-2 h-8 opacity-80">
                                                {item.描述}
                                            </p>

                                            {/* Stats Row */}
                                            <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-800/50">
                                                {/* Size Visual */}
                                                <div className="flex items-center gap-1.5" title={`尺寸: ${item.占用空间}`}>
                                                    <div className="flex gap-[2px]">
                                                        {Array.from({length: item.占用空间}).map((_, idx) => (
                                                            <div key={idx} className="w-1.5 h-1.5 rounded-full bg-gray-600 group-hover:bg-gray-400 transition-colors"></div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Weight */}
                                                <span className="text-[9px] text-gray-500 font-mono group-hover:text-gray-300 transition-colors">
                                                    {item.重量}斤
                                                </span>
                                            </div>
                                            
                                            {/* Tooltip Overlay (Optional interaction) */}
                                            <div className="absolute inset-0 bg-black/95 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-center items-center p-4 text-center pointer-events-none z-10 rounded-xl border border-wuxia-gold/20 backdrop-blur-sm">
                                                <div className="text-wuxia-gold text-xs font-bold mb-2 tracking-widest">物品详情</div>
                                                {item.词条列表 && item.词条列表.length > 0 ? (
                                                    item.词条列表.map((mod, i) => (
                                                        <div key={i} className="text-[10px] text-gray-300 mb-1">
                                                            {mod.名称}: {mod.属性} {mod.数值 > 0 ? '+' : ''}{mod.数值}
                                                        </div>
                                                    ))
                                                ) : <span className="text-[10px] text-gray-600 italic">无特殊词条</span>}
                                                
                                                <div className="mt-2 text-[9px] text-gray-500">
                                                    价值: {item.价值} 铜钱
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full opacity-30">
                                    <div className="text-5xl font-serif text-gray-700 mb-4 border-2 border-dashed border-gray-700 rounded-2xl w-24 h-24 flex items-center justify-center">空</div>
                                    <div className="text-xs text-gray-500 tracking-widest">此容器内空无一物</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InventoryModal;
