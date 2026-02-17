
import React, { useState } from 'react';
import { 功法结构, 功法品质 } from '../../../models/kungfu';

interface Props {
    skills: 功法结构[];
    onClose: () => void;
}

const KungfuModal: React.FC<Props> = ({ skills, onClose }) => {
    const [selectedId, setSelectedId] = useState<string | null>(
        skills.length > 0 ? skills[0].ID : null
    );

    const currentSkill = skills.find(s => s.ID === selectedId);

    // Color mapping based on Quality
    const getQualityColor = (quality: 功法品质) => {
        switch (quality) {
            case '凡品': return 'text-gray-400 border-gray-600';
            case '良品': return 'text-blue-400 border-blue-600';
            case '上品': return 'text-purple-400 border-purple-600';
            case '极品': return 'text-orange-400 border-orange-600';
            case '绝世': return 'text-red-500 border-red-600';
            case '传说': return 'text-wuxia-gold border-wuxia-gold';
            default: return 'text-gray-400 border-gray-600';
        }
    };

    // Helper for Stat Box
    const StatBox: React.FC<{ label: string; value: string | number; sub?: string }> = ({ label, value, sub }) => (
        <div className="bg-black/30 border border-gray-800 p-2 rounded flex flex-col items-center justify-center min-w-[80px]">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{label}</span>
            <span className="font-mono text-wuxia-gold font-bold">{value}</span>
            {sub && <span className="text-[9px] text-gray-600">{sub}</span>}
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-ink-black/95 border border-wuxia-gold/30 w-full max-w-5xl h-[650px] flex flex-col shadow-[0_0_80px_rgba(0,0,0,0.9)] relative overflow-hidden rounded-2xl">
                
                {/* Header */}
                <div className="h-16 shrink-0 border-b border-gray-800/50 bg-black/40 flex items-center justify-between px-6 relative z-50">
                    <h3 className="text-wuxia-gold font-serif font-bold text-2xl tracking-[0.3em] drop-shadow-md">武学秘籍</h3>
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

                <div className="flex-1 flex overflow-hidden">
                    {/* Left: Skill List */}
                    <div className="w-[25%] border-r border-gray-800/50 flex flex-col bg-black/20 overflow-y-auto custom-scrollbar p-3 space-y-2">
                        {skills.map(skill => {
                            const isSelected = selectedId === skill.ID;
                            const qColor = getQualityColor(skill.品质);
                            return (
                                <button
                                    key={skill.ID}
                                    onClick={() => setSelectedId(skill.ID)}
                                    className={`w-full text-left p-4 border rounded-xl transition-all relative group overflow-hidden flex flex-col gap-1 ${
                                        isSelected 
                                        ? 'border-wuxia-gold/60 bg-wuxia-gold/5' 
                                        : 'border-gray-800 bg-white/[0.02] hover:bg-white/[0.05]'
                                    }`}
                                >
                                    <div className="flex justify-between items-center w-full">
                                        <span className={`font-serif font-bold ${isSelected ? 'text-wuxia-gold' : 'text-gray-300'}`}>
                                            {skill.名称}
                                        </span>
                                        <span className={`text-[10px] px-1.5 py-0.5 border rounded ${qColor.split(' ')[0]} border-opacity-30 bg-black/30`}>
                                            {skill.品质}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center w-full text-[10px] text-gray-500">
                                        <span>{skill.类型}</span>
                                        <span className="font-mono">第{skill.当前重数}重</span>
                                    </div>
                                    {/* Mini Progress Bar */}
                                    <div className="w-full h-0.5 bg-gray-800 mt-1">
                                        <div 
                                            className="h-full bg-wuxia-gold/50" 
                                            style={{ width: `${Math.min((skill.当前熟练度/skill.升级经验)*100, 100)}%` }}
                                        ></div>
                                    </div>
                                </button>
                            );
                        })}
                        {skills.length === 0 && (
                             <div className="text-center text-gray-600 text-xs py-10">暂无所学武功</div>
                        )}
                    </div>

                    {/* Right: Detail View */}
                    <div className="flex-1 flex flex-col bg-ink-wash/5 relative overflow-y-auto custom-scrollbar">
                        {currentSkill ? (
                            <div className="p-8 space-y-6">
                                {/* Title Section */}
                                <div className="flex justify-between items-start border-b border-gray-800/50 pb-6">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <h2 className="text-3xl font-black font-serif text-wuxia-gold">{currentSkill.名称}</h2>
                                            <span className={`text-xs px-2 py-0.5 border rounded ${getQualityColor(currentSkill.品质)}`}>
                                                {currentSkill.品质}
                                            </span>
                                            <span className="text-xs px-2 py-0.5 bg-gray-800 text-gray-300 rounded border border-gray-700">
                                                {currentSkill.类型}
                                            </span>
                                        </div>
                                        <p className="text-gray-400 text-sm font-serif italic">“{currentSkill.描述}”</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-4xl font-serif text-gray-700 font-bold opacity-30 select-none">
                                            {currentSkill.来源}
                                        </div>
                                    </div>
                                </div>

                                {/* Combat Stats Grid (Only for Active Skills) */}
                                {currentSkill.类型 !== '被动' && currentSkill.类型 !== '内功' && (
                                    <div className="grid grid-cols-4 gap-3">
                                        <StatBox label="基础伤害" value={currentSkill.基础伤害} sub={currentSkill.伤害类型} />
                                        <StatBox label="加成系数" value={`x${currentSkill.加成系数}`} sub={currentSkill.加成属性} />
                                        <StatBox label="施展耗时" value={`${currentSkill.施展耗时}s`} />
                                        <StatBox label="冷却时间" value={`${currentSkill.冷却时间}s`} />
                                        <div className="col-span-2 bg-black/20 border border-gray-800 p-2 rounded flex justify-between items-center px-4">
                                            <span className="text-xs text-gray-500 uppercase tracking-widest">消耗</span>
                                            <div className="text-sm">
                                                <span className="text-wuxia-red font-bold mr-1">{currentSkill.消耗数值}</span>
                                                <span className="text-gray-400">{currentSkill.消耗类型}</span>
                                            </div>
                                        </div>
                                        <div className="col-span-2 bg-black/20 border border-gray-800 p-2 rounded flex justify-between items-center px-4">
                                            <span className="text-xs text-gray-500 uppercase tracking-widest">范围</span>
                                            <span className="text-gray-300 text-sm">{currentSkill.目标类型} (Max: {currentSkill.最大目标数})</span>
                                        </div>
                                    </div>
                                )}

                                {/* Training Progress */}
                                <div className="bg-black/20 p-4 border border-gray-800 rounded-lg">
                                    <div className="flex justify-between items-end mb-2">
                                        <h4 className="text-wuxia-gold font-serif font-bold">修炼进度 · 第 {currentSkill.当前重数} 重</h4>
                                        <span className="text-xs font-mono text-gray-400">
                                            {currentSkill.当前熟练度} / {currentSkill.升级经验} 熟练度
                                        </span>
                                    </div>
                                    <div className="w-full h-3 bg-black rounded-full overflow-hidden border border-gray-700 relative">
                                        <div 
                                            className="h-full bg-gradient-to-r from-wuxia-gold-dark to-wuxia-gold transition-all duration-500"
                                            style={{ width: `${Math.min((currentSkill.当前熟练度/currentSkill.升级经验)*100, 100)}%` }}
                                        ></div>
                                    </div>
                                    {currentSkill.突破条件 && currentSkill.突破条件 !== "无" && (
                                         <div className="mt-2 text-xs text-wuxia-red/80 flex items-center gap-2">
                                            <span className="border border-wuxia-red/50 px-1 rounded">瓶颈</span>
                                            突破条件：{currentSkill.突破条件}
                                         </div>
                                    )}
                                </div>

                                {/* Effects Section */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Buffs/Debuffs */}
                                    {currentSkill.附带效果.length > 0 && (
                                        <div className="space-y-3">
                                            <h4 className="text-gray-500 font-bold text-xs uppercase tracking-widest border-b border-gray-800 pb-1">附带效果</h4>
                                            {currentSkill.附带效果.map((eff, i) => (
                                                <div key={i} className="bg-white/5 p-3 rounded border border-gray-700/50 flex flex-col gap-1">
                                                    <div className="flex justify-between">
                                                        <span className="text-wuxia-cyan font-bold text-sm">{eff.名称}</span>
                                                        <span className="text-xs text-gray-500">{eff.触发概率}% 几率</span>
                                                    </div>
                                                    <div className="text-xs text-gray-400 flex gap-3">
                                                        <span>持续: {eff.持续时间}s</span>
                                                        {eff.数值参数 > 0 && <span>强度: {eff.数值参数}</span>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Passives */}
                                    {currentSkill.被动修正.length > 0 && (
                                        <div className="space-y-3">
                                            <h4 className="text-gray-500 font-bold text-xs uppercase tracking-widest border-b border-gray-800 pb-1">被动加成</h4>
                                            <div className="bg-black/20 p-3 rounded border border-gray-800">
                                                {currentSkill.被动修正.map((mod, i) => (
                                                    <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-800/50 last:border-0">
                                                        <span className="text-gray-400">{mod.属性名}</span>
                                                        <span className="text-wuxia-gold font-mono">
                                                            {mod.数值 > 0 ? '+' : ''}{mod.数值}{mod.类型 === '百分比' ? '%' : ''}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Boundary Effects (Unlockables) */}
                                {currentSkill.境界特效.length > 0 && (
                                    <div className="mt-4">
                                         <h4 className="text-gray-500 font-bold text-xs uppercase tracking-widest border-b border-gray-800 pb-2 mb-3">境界特效</h4>
                                         <div className="space-y-2">
                                             {currentSkill.境界特效.map((eff, i) => {
                                                 const isUnlocked = currentSkill.当前重数 >= eff.解锁重数;
                                                 return (
                                                     <div 
                                                        key={i} 
                                                        className={`flex gap-4 p-3 rounded border transition-colors ${
                                                            isUnlocked 
                                                            ? 'bg-wuxia-gold/5 border-wuxia-gold/30' 
                                                            : 'bg-black/40 border-gray-800 opacity-50 grayscale'
                                                        }`}
                                                     >
                                                         <div className={`shrink-0 w-12 text-center font-bold text-xs border-r ${isUnlocked ? 'border-wuxia-gold/20 text-wuxia-gold' : 'border-gray-700 text-gray-600'}`}>
                                                             {eff.解锁重数}重<br/>解锁
                                                         </div>
                                                         <div className={`text-sm ${isUnlocked ? 'text-gray-200' : 'text-gray-500'}`}>
                                                             {eff.描述}
                                                         </div>
                                                     </div>
                                                 );
                                             })}
                                         </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-600 font-serif">
                                请选择一本功法查看详情
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default KungfuModal;
