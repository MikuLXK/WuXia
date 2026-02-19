import React from 'react';
import { 角色数据结构 } from '../../../types';

interface Props {
    character: 角色数据结构;
    onClose: () => void;
}

const VitalBar: React.FC<{ label: string; current: number; max: number; color: string }> = ({ label, current, max, color }) => {
    const pct = Math.min((current / (max || 1)) * 100, 100);
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-gray-500">
                <span>{label}</span>
                <span className="font-mono text-gray-300">{current}/{max}</span>
            </div>
            <div className="h-1.5 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
                <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
};

const BodyRow: React.FC<{ name: string; current: number; max: number }> = ({ name, current, max }) => {
    const pct = Math.min((current / (max || 1)) * 100, 100);
    return (
        <div className="flex items-center gap-2">
            <span className="w-10 text-[10px] text-gray-400">{name}</span>
            <div className="flex-1 h-1.5 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
                <div className="h-full bg-wuxia-red" style={{ width: `${pct}%` }} />
            </div>
            <span className="w-12 text-[10px] text-gray-500 font-mono text-right">{current}/{max}</span>
        </div>
    );
};

const MobileCharacter: React.FC<Props> = ({ character, onClose }) => {
    const attributes = [
        { key: '力', val: character.力量 },
        { key: '敏', val: character.敏捷 },
        { key: '体', val: character.体质 },
        { key: '根', val: character.根骨 },
        { key: '悟', val: character.悟性 },
        { key: '福', val: character.福源 },
    ];

    const bodyParts = [
        { name: '头部', current: character.头部当前血量, max: character.头部最大血量 },
        { name: '胸部', current: character.胸部当前血量, max: character.胸部最大血量 },
        { name: '腹部', current: character.腹部当前血量, max: character.腹部最大血量 },
        { name: '左手', current: character.左手当前血量, max: character.左手最大血量 },
        { name: '右手', current: character.右手当前血量, max: character.右手最大血量 },
        { name: '左腿', current: character.左腿当前血量, max: character.左腿最大血量 },
        { name: '右腿', current: character.右腿当前血量, max: character.右腿最大血量 },
    ];

    const equipmentOrder: { key: keyof typeof character.装备; label: string }[] = [
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

    const getEquipName = (key: keyof typeof character.装备) => {
        const idOrName = character.装备[key];
        if (idOrName === '无') return '无';
        const item = character.物品列表.find(i => i.ID === idOrName || i.名称 === idOrName);
        return item ? item.名称 : idOrName;
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-3 md:hidden animate-fadeIn">
            <div className="bg-ink-black/95 border border-wuxia-gold/30 w-full max-w-[520px] h-[82vh] flex flex-col shadow-[0_0_60px_rgba(0,0,0,0.8)] relative overflow-hidden rounded-2xl">
                <div className="h-12 shrink-0 border-b border-gray-800/60 bg-black/40 flex items-center justify-between px-4">
                    <h3 className="text-wuxia-gold font-serif font-bold text-base tracking-[0.3em]">角色属性</h3>
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

                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 space-y-4 bg-ink-wash/5">
                    <div className="bg-black/40 border border-gray-800 rounded-xl p-4">
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="text-xl text-wuxia-gold font-serif font-bold">{character.姓名}</div>
                                <div className="text-[11px] text-gray-400 mt-1">{character.称号 || '无称号'}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] text-gray-500">境界</div>
                                <div className="text-wuxia-red font-bold text-sm">{character.境界}</div>
                            </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
                            <span className="px-2 py-1 bg-black/40 border border-gray-800 rounded text-gray-300">性别 {character.性别}</span>
                            <span className="px-2 py-1 bg-black/40 border border-gray-800 rounded text-gray-300">年龄 {character.年龄}</span>
                            <span className="px-2 py-1 bg-black/40 border border-gray-800 rounded text-gray-300 font-mono">负重 {character.当前负重}/{character.最大负重}</span>
                        </div>
                    </div>

                    <div className="bg-black/40 border border-gray-800 rounded-xl p-4">
                        <div className="text-[10px] text-wuxia-gold/70 tracking-[0.3em] mb-3">六维属性</div>
                        <div className="grid grid-cols-3 gap-2">
                            {attributes.map((attr) => (
                                <div key={attr.key} className="border border-gray-800 rounded-lg px-2 py-2 text-center hover:border-wuxia-gold/50 transition-colors">
                                    <div className="text-[9px] text-gray-500">{attr.key}</div>
                                    <div className="text-wuxia-gold font-mono font-bold text-sm">{attr.val}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-black/40 border border-gray-800 rounded-xl p-4 space-y-3">
                        <div className="text-[10px] text-wuxia-gold/70 tracking-[0.3em]">状态</div>
                        <VitalBar label="精力" current={character.当前精力} max={character.最大精力} color="bg-teal-500" />
                        <VitalBar label="饱腹" current={character.当前饱腹} max={character.最大饱腹} color="bg-amber-500" />
                        <VitalBar label="水分" current={character.当前口渴} max={character.最大口渴} color="bg-blue-500" />
                    </div>

                    <div className="bg-black/40 border border-gray-800 rounded-xl p-4 space-y-2">
                        <div className="text-[10px] text-wuxia-gold/70 tracking-[0.3em]">身躯</div>
                        {bodyParts.map((part) => (
                            <BodyRow key={part.name} name={part.name} current={part.current} max={part.max} />
                        ))}
                    </div>

                    {character.玩家BUFF && character.玩家BUFF.length > 0 && (
                        <div className="bg-black/40 border border-gray-800 rounded-xl p-4">
                            <div className="text-[10px] text-wuxia-gold/70 tracking-[0.3em] mb-2">状态增益</div>
                            <div className="flex flex-wrap gap-2">
                                {character.玩家BUFF.map((buff, i) => (
                                    <span key={i} className="text-[10px] px-2 py-1 border border-wuxia-cyan/30 text-wuxia-cyan bg-wuxia-cyan/5 rounded">
                                        {buff}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="bg-black/40 border border-gray-800 rounded-xl p-4">
                        <div className="text-[10px] text-wuxia-gold/70 tracking-[0.3em] mb-2">行头</div>
                        <div className="space-y-2">
                            {equipmentOrder.map((item) => (
                                <div key={item.key} className="flex justify-between text-[10px] border-b border-gray-800/60 pb-1 last:border-0">
                                    <span className="text-gray-500">{item.label}</span>
                                    <span className="text-gray-300 max-w-[180px] truncate text-right" title={getEquipName(item.key)}>
                                        {getEquipName(item.key)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MobileCharacter;
