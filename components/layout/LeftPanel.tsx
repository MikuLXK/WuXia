
import React from 'react';
import { 角色数据结构 } from '../../types';

interface Props {
    角色: 角色数据结构;
}

// Flat Bar Component for Vitals
const FlatBar: React.FC<{ label: string; current: number; max: number; type: 'stamina' | 'food' | 'water' | 'load' }> = ({ label, current, max, type }) => {
    let barColor = "";
    
    // Flat colors for specific types
    if (type === 'food') barColor = "bg-amber-600";
    if (type === 'stamina') barColor = "bg-teal-600";
    if (type === 'water') barColor = "bg-blue-600";
    if (type === 'load') barColor = "bg-gray-500"; // Grey for load
    
    const pct = Math.min((current / (max || 1)) * 100, 100);

    return (
        <div className="mb-2 group last:mb-0">
            <div className="flex justify-between items-end mb-1">
                <span className="text-[10px] text-white font-serif tracking-widest group-hover:text-wuxia-gold transition-colors">{label}</span>
                <span className="text-[9px] font-mono text-white group-hover:text-gray-300">{current}/{max}</span>
            </div>
            {/* Minimal Flat Bar */}
            <div className="h-[4px] w-full bg-gray-900 border border-gray-800">
                <div 
                    className={`h-full ${barColor} transition-all duration-300 opacity-80 group-hover:opacity-100`} 
                    style={{ width: `${pct}%` }}
                ></div>
            </div>
        </div>
    );
};

// Mini Body Part Row - Updated for flat structure inputs
const MiniBodyPart: React.FC<{ name: string; current: number; max: number; status: string }> = ({ name, current, max, status }) => {
    const pct = (current / (max || 1)) * 100;
    
    // Health Color Logic: Red for health bars.
    const color = 'bg-wuxia-red'; 
    
    return (
        <div className="flex items-center justify-between gap-2 w-full h-[18px] border-b border-gray-800/30 last:border-0 hover:bg-white/5 transition-colors px-1">
             <span className={`text-[10px] font-serif leading-none whitespace-nowrap text-right w-8 text-white/80`}>
                 {name}
             </span>
             <div className="flex-1 h-[3px] bg-gray-900 self-center relative">
                 <div className={`absolute top-0 left-0 h-full ${color} transition-all duration-500 shadow-[0_0_5px_rgba(163,24,24,0.3)]`} style={{ width: `${pct}%` }}></div>
             </div>
             <span className="text-[9px] font-mono text-gray-400 w-[40px] text-right leading-none scale-90">
                {current}
             </span>
        </div>
    );
}

const LeftPanel: React.FC<Props> = ({ 角色 }) => {
    
    // Helper to map attributes for display
    const attributes = [
        { key: '力', val: 角色.力量 },
        { key: '敏', val: 角色.敏捷 },
        { key: '体', val: 角色.体质 },
        { key: '根', val: 角色.根骨 },
        { key: '悟', val: 角色.悟性 },
        { key: '福', val: 角色.福源 },
    ];

    const bodyParts = [
        { name: '头部', current: 角色.头部当前血量, max: 角色.头部最大血量, status: 角色.头部状态 },
        { name: '胸部', current: 角色.胸部当前血量, max: 角色.胸部最大血量, status: 角色.胸部状态 },
        { name: '腹部', current: 角色.腹部当前血量, max: 角色.腹部最大血量, status: 角色.腹部状态 },
        { name: '左手', current: 角色.左手当前血量, max: 角色.左手最大血量, status: 角色.左手状态 },
        { name: '右手', current: 角色.右手当前血量, max: 角色.右手最大血量, status: 角色.右手状态 },
        { name: '左腿', current: 角色.左腿当前血量, max: 角色.左腿最大血量, status: 角色.左腿状态 },
        { name: '右腿', current: 角色.右腿当前血量, max: 角色.右腿最大血量, status: 角色.右腿状态 },
    ];

    // Define display order for equipment
    const equipmentOrder: { key: keyof typeof 角色.装备, label: string }[] = [
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
    
    // Look up real name from inventory if possible, else use raw string
    const getEquipName = (key: keyof typeof 角色.装备) => {
        const idOrName = 角色.装备[key];
        if (idOrName === '无') return '无';
        const item = 角色.物品列表.find(i => i.ID === idOrName);
        return item ? item.名称 : idOrName;
    };

    return (
        <div className="h-full flex flex-col p-3 border-r border-gray-900 relative overflow-hidden font-serif bg-transparent">
             
             {/* Top Section: Name & Attributes Split */}
             <div className="flex mb-4 h-[160px] border-b border-gray-800/50 pb-4 shrink-0">
                
                {/* Left Column: Name/Info */}
                <div className="w-[35%] flex flex-col items-center justify-center border-r border-gray-800/50 pr-2">
                    <div className="relative border border-wuxia-gold/40 px-3 py-3 mb-2 bg-ink-black/50 shadow-[0_0_15px_rgba(230,200,110,0.05)]">
                        <div className="absolute top-0 left-0 w-0.5 h-0.5 bg-wuxia-gold"></div>
                        <div className="absolute top-0 right-0 w-0.5 h-0.5 bg-wuxia-gold"></div>
                        <div className="absolute bottom-0 left-0 w-0.5 h-0.5 bg-wuxia-gold"></div>
                        <div className="absolute bottom-0 right-0 w-0.5 h-0.5 bg-wuxia-gold"></div>
                        
                        <div className="text-wuxia-gold text-lg font-bold font-serif tracking-[0.3em] vertical-text text-center select-none drop-shadow-md min-h-[80px] flex items-center justify-center w-full leading-none">
                            {角色.姓名}
                        </div>
                    </div>

                    <div className="text-[9px] text-wuxia-gold/70 italic text-center mb-1 leading-tight w-full whitespace-nowrap overflow-hidden text-ellipsis">
                        {角色.称号 || '无称号'}
                    </div>

                    <div className="mt-2 text-[9px] bg-wuxia-red/90 border border-red-800/50 text-white px-2 py-0.5 rounded-sm whitespace-nowrap shadow-sm scale-90">
                        {角色.境界}
                    </div>
                </div>

                {/* Right Column: Six Attributes */}
                <div className="flex-1 pl-3 flex flex-col justify-center">
                    <div className="text-[8px] text-white text-right mb-2 scale-90 tracking-widest uppercase opacity-50">六维属性</div>
                    <div className="grid grid-cols-2 gap-1.5">
                        {attributes.map((attr) => (
                            <div key={attr.key} className="flex flex-col items-center justify-center text-[9px] text-white hover:text-wuxia-gold hover:bg-white/5 p-1 transition-colors border border-gray-800/50 hover:border-wuxia-gold/50 rounded-sm">
                                <span className="scale-75 opacity-70 mb-0.5">{attr.key}</span>
                                <span className="font-mono text-wuxia-gold font-bold text-[10px]">{attr.val}</span>
                            </div>
                        ))}
                    </div>
                </div>
             </div>

            {/* Vitals Section - Vertical Layout */}
            <div className="mb-3 shrink-0 flex flex-col gap-1">
                <FlatBar label="精力" current={角色.当前精力} max={角色.最大精力} type="stamina" />
                <FlatBar label="饱腹" current={角色.当前饱腹} max={角色.最大饱腹} type="food" />
                <FlatBar label="水分" current={角色.当前口渴} max={角色.最大口渴} type="water" />
            </div>

            {/* Body Status Section - Fully Expanded (No Scroll) */}
            <div className="shrink-0 flex flex-col mb-2">
                <div className="border border-gray-800 bg-white/5 p-2 flex flex-col relative group hover:border-gray-700 transition-colors">
                    <h3 className="text-[10px] text-wuxia-gold/70 mb-2 uppercase tracking-[0.2em] text-center bg-black/80 -mt-4 mx-auto px-2 w-fit border border-gray-900 shadow-sm">
                        身躯
                    </h3>
                    
                    <div className="flex-col pr-1 space-y-0.5">
                        {bodyParts.map((part) => (
                            <MiniBodyPart key={part.name} name={part.name} current={part.current} max={part.max} status={part.status} />
                        ))}
                    </div>
                </div>
            </div>

            {/* BUFF Section (Moved below Body) */}
            {角色.玩家BUFF && 角色.玩家BUFF.length > 0 && (
                <div className="mb-4 shrink-0 flex flex-wrap gap-1 px-1">
                    {角色.玩家BUFF.map((buff, i) => (
                        <span key={i} className="text-[8px] px-1.5 py-0.5 border border-wuxia-cyan/30 text-wuxia-cyan bg-wuxia-cyan/5 rounded-sm">
                            {buff}
                        </span>
                    ))}
                </div>
            )}

            {/* Equipment Section - Expanded with no-scrollbar */}
            <div className="shrink-0 pt-2 border-t border-gray-800/50 flex-1 overflow-y-auto no-scrollbar">
                 <h3 className="text-[10px] text-wuxia-gold/70 mb-2 uppercase tracking-[0.2em] text-center">
                        行头
                </h3>
                <div className="space-y-1">
                    {equipmentOrder.map((item) => (
                         <div key={item.key} className="flex justify-between items-center text-[9px] group cursor-help border-b border-gray-800/30 pb-0.5 last:border-0 hover:bg-white/5 px-1">
                            <span className="text-gray-500 group-hover:text-wuxia-gold transition-colors w-8">{item.label}</span>
                            <span className="text-gray-300 truncate text-right flex-1" title={getEquipName(item.key)}>
                                {getEquipName(item.key)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
            
             {/* Bottom Deco */}
            <div className="absolute bottom-1 left-0 w-full flex justify-center opacity-20 pointer-events-none">
                <div className="w-1/2 h-px bg-gradient-to-r from-transparent via-wuxia-red to-transparent"></div>
            </div>
        </div>
    );
};

export default LeftPanel;
