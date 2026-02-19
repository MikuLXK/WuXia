
import React from 'react';
import { 角色数据结构 } from '../../../types';
import { 游戏物品 } from '../../../models/item';

interface Props {
    character: 角色数据结构;
    onClose: () => void;
}

const EquipmentModal: React.FC<Props> = ({ character, onClose }) => {
    
    // Helper to find item details
    const getItem = (idOrName: string): 游戏物品 | null => {
        if (!idOrName || idOrName === '无') return null;
        return character.物品列表.find(i => i.ID === idOrName || i.名称 === idOrName) || null;
    };

    const getQualityColor = (quality: string) => {
        switch (quality) {
            case '凡品': return 'text-gray-400 border-gray-600';
            case '良品': return 'text-blue-400 border-blue-600';
            case '上品': return 'text-purple-400 border-purple-600';
            case '极品': return 'text-orange-400 border-orange-600';
            case '绝世': return 'text-red-500 border-red-600';
            case '传说': return 'text-wuxia-gold border-wuxia-gold';
            default: return 'text-gray-500 border-gray-600';
        }
    };

    // Slot definitions for display order
    const slots: { key: keyof typeof character.装备, label: string }[] = [
        { key: '头部', label: '头部' },
        { key: '胸部', label: '身体' },
        { key: '背部', label: '背负' },
        { key: '腰部', label: '腰间' },
        { key: '腿部', label: '下装' },
        { key: '足部', label: '鞋履' },
        { key: '手部', label: '护手' },
        { key: '主武器', label: '主手' },
        { key: '副武器', label: '副手' },
        { key: '暗器', label: '暗器' },
        { key: '坐骑', label: '坐骑' },
    ];

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-ink-black/95 border border-wuxia-gold/30 w-full max-w-4xl h-[700px] flex flex-col shadow-[0_0_80px_rgba(0,0,0,0.9)] relative overflow-hidden rounded-2xl">
                
                {/* Header */}
                <div className="h-16 shrink-0 border-b border-gray-800/50 bg-black/40 flex items-center justify-between px-6 relative z-50">
                    <h3 className="text-wuxia-gold font-serif font-bold text-2xl tracking-[0.3em] drop-shadow-md">全身披挂</h3>
                    <div className="flex gap-4 items-center">
                        <div className="text-xs text-gray-500 font-mono">
                            总负重: <span className={character.当前负重 > character.最大负重 ? 'text-red-500' : 'text-gray-300'}>{character.当前负重}/{character.最大负重}斤</span>
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
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-ink-wash/5">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {slots.map(slot => {
                            const itemRef = character.装备[slot.key];
                            const item = getItem(itemRef);

                            return (
                                <div key={slot.key} className={`bg-black/40 border ${item ? 'border-gray-700 hover:border-wuxia-gold/50' : 'border-gray-800/50 border-dashed'} rounded-lg p-3 flex flex-col gap-2 relative group transition-all min-h-[140px]`}>
                                    
                                    {/* Slot Label Badge */}
                                    <div className="absolute top-0 right-0 bg-gray-900/80 text-gray-500 text-[9px] px-2 py-0.5 rounded-bl-lg border-l border-b border-gray-800">
                                        {slot.label}
                                    </div>

                                    {item ? (
                                        <>
                                            {/* Item Header */}
                                            <div className="pr-8">
                                                <div className={`font-serif font-bold text-sm truncate ${getQualityColor(item.品质).split(' ')[0]}`}>
                                                    {item.名称}
                                                </div>
                                                <div className="text-[9px] text-gray-500 flex gap-2 mt-0.5">
                                                    <span className={`px-1 rounded border ${getQualityColor(item.品质)} bg-black/30`}>{item.品质}</span>
                                                    <span>{item.类型}</span>
                                                </div>
                                            </div>

                                            {/* Main Stats Grid */}
                                            <div className="bg-black/20 rounded p-2 border border-gray-800/50 text-[10px] space-y-1 flex-1">
                                                <div className="flex justify-between text-gray-400 border-b border-gray-800 pb-1 mb-1">
                                                    <span>重量: {item.重量}斤</span>
                                                    <span>价值: {item.价值}</span>
                                                </div>
                                                
                                                {/* Specific Stats */}
                                                {item.类型 === '武器' && (
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-gray-500">攻击力</span>
                                                        <span className="text-wuxia-red font-mono font-bold">{(item as any).最小攻击}-{(item as any).最大攻击}</span>
                                                    </div>
                                                )}
                                                {item.类型 === '防具' && (
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-gray-500">防御力</span>
                                                        <span className="text-blue-300 font-mono font-bold">{(item as any).物理防御}</span>
                                                    </div>
                                                )}
                                                {item.容器属性 && (
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-gray-500">容量</span>
                                                        <span className="text-gray-300 font-mono">{item.容器属性.当前已用空间}/{item.容器属性.最大容量}</span>
                                                    </div>
                                                )}

                                                {/* Affixes */}
                                                {item.词条列表 && item.词条列表.length > 0 && (
                                                    <div className="pt-1 mt-1 border-t border-gray-800 border-dashed">
                                                        {item.词条列表.map((mod, i) => (
                                                            <div key={i} className="flex justify-between text-wuxia-gold/80">
                                                                <span>{mod.名称}</span>
                                                                <span>{mod.属性}{mod.数值 > 0 ? '+' : ''}{mod.数值}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Durability Footer */}
                                            <div className="mt-auto pt-2 flex items-center gap-2">
                                                <div className="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full ${item.当前耐久 < item.最大耐久 * 0.3 ? 'bg-red-500' : 'bg-green-500'}`} 
                                                        style={{ width: `${(item.当前耐久 / item.最大耐久) * 100}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-[9px] text-gray-500 font-mono">{item.当前耐久}/{item.最大耐久}</span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center opacity-30 gap-2">
                                            <div className="w-10 h-10 rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center text-gray-500">
                                                <span className="text-lg">+</span>
                                            </div>
                                            <span className="text-xs text-gray-500">空缺</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EquipmentModal;
