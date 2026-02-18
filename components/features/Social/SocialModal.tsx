
import React, { useState } from 'react';
import { NPC结构 } from '../../../models/social';

interface Props {
    socialList: NPC结构[];
    onClose: () => void;
    playerName?: string; // Add playerName prop to check for first time taker
}

const SocialModal: React.FC<Props> = ({ socialList, onClose, playerName = "少侠" }) => {
    const [selectedId, setSelectedId] = useState<string | null>(
        socialList.length > 0 ? socialList[0].id : null
    );

    const currentNPC = socialList.find(n => n.id === selectedId);

    // Helper for Privacy Tags
    const PrivateTag: React.FC<{ label: string; value?: string; color?: string }> = ({ label, value, color = "text-pink-300" }) => (
        <div className="flex flex-col bg-black/40 border border-gray-800 p-2 rounded relative group hover:border-pink-500/50 transition-colors">
            <span className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">{label}</span>
            <span className={`font-serif text-sm ${color} drop-shadow-sm`}>{value || "???"}</span>
        </div>
    );

    // Helper for Sex Stat
    const SexStat: React.FC<{ label: string; count?: number }> = ({ label, count }) => (
        <div className="flex justify-between items-center border-b border-pink-900/20 py-1 last:border-0">
            <span className="text-xs text-pink-300/70">{label}</span>
            <span className="font-mono text-pink-400 font-bold">{count || 0}</span>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-ink-black/95 border border-wuxia-gold/30 w-full max-w-5xl h-[650px] flex flex-col shadow-[0_0_80px_rgba(0,0,0,0.9)] relative overflow-hidden rounded-2xl">
                
                {/* Header */}
                <div className="h-16 shrink-0 border-b border-gray-800/50 bg-black/40 flex items-center justify-between px-6 relative z-50">
                    <h3 className="text-wuxia-gold font-serif font-bold text-2xl tracking-[0.3em] drop-shadow-md">江湖谱</h3>
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
                    {/* Left: List */}
                    <div className="w-[25%] border-r border-gray-800/50 flex flex-col bg-black/20 overflow-y-auto custom-scrollbar p-3 space-y-2">
                        {socialList.map(npc => (
                            <button
                                key={npc.id}
                                onClick={() => setSelectedId(npc.id)}
                                className={`w-full text-left p-3 border rounded-xl transition-all relative group overflow-hidden flex items-center gap-3 ${
                                    selectedId === npc.id 
                                    ? 'border-wuxia-gold/60 bg-wuxia-gold/5' 
                                    : 'border-gray-800 bg-white/[0.02] hover:bg-white/[0.05]'
                                }`}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-serif font-bold text-lg border ${npc.性别 === '女' ? 'border-pink-800 bg-pink-900/20 text-pink-500' : 'border-blue-800 bg-blue-900/20 text-blue-500'}`}>
                                    {npc.姓名[0]}
                                </div>
                                <div>
                                    <div className={`font-serif font-bold text-sm ${selectedId === npc.id ? 'text-wuxia-gold' : 'text-gray-300'}`}>
                                        {npc.姓名}
                                    </div>
                                    <div className="text-[10px] text-gray-500 flex items-center gap-1">
                                        <span>{npc.身份} | {npc.境界}</span>
                                        <span className={npc.是否在场 ? 'text-green-400' : 'text-gray-600'}>
                                            {npc.是否在场 ? '在场' : '离场'}
                                        </span>
                                        <span className={npc.是否队友 ? 'text-wuxia-gold' : 'text-gray-600'}>
                                            {npc.是否队友 ? '队友' : '非队友'}
                                        </span>
                                    </div>
                                </div>
                                <div className="ml-auto text-xs font-mono text-wuxia-red">
                                    ♥ {npc.好感度}
                                </div>
                            </button>
                        ))}
                        {socialList.length === 0 && (
                             <div className="text-center text-gray-600 text-xs py-10">暂无结识之人</div>
                        )}
                    </div>

                    {/* Right: Detail */}
                    <div className="flex-1 flex flex-col relative bg-ink-wash/5">
                        {currentNPC ? (
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                                {/* Top Banner */}
                                <div className="flex justify-between items-start mb-6 pb-6 border-b border-gray-800/50">
                                    <div>
                                        <h2 className="text-3xl font-black font-serif text-wuxia-gold mb-2">{currentNPC.姓名}</h2>
                                        <div className="flex gap-2">
                                            <span className="text-xs bg-gray-800 px-2 py-0.5 rounded text-gray-300">{currentNPC.身份}</span>
                                            <span className="text-xs bg-gray-800 px-2 py-0.5 rounded text-gray-300">{currentNPC.境界}</span>
                                            <span className={`text-xs px-2 py-0.5 rounded border ${currentNPC.性别 === '女' ? 'border-pink-900 text-pink-400' : 'border-blue-900 text-blue-400'}`}>
                                                {currentNPC.性别} | {currentNPC.年龄}岁
                                            </span>
                                            <span className={`text-xs px-2 py-0.5 rounded border ${currentNPC.是否在场 ? 'border-green-700 text-green-400' : 'border-gray-700 text-gray-500'}`}>
                                                {currentNPC.是否在场 ? '在场中' : '离场'}
                                            </span>
                                            <span className={`text-xs px-2 py-0.5 rounded border ${currentNPC.是否队友 ? 'border-wuxia-gold/60 text-wuxia-gold' : 'border-gray-700 text-gray-500'}`}>
                                                {currentNPC.是否队友 ? '队伍成员' : '非队伍成员'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-4xl font-serif text-wuxia-red mb-1">♥ {currentNPC.好感度}</div>
                                        <div className="text-xs text-gray-500 tracking-widest uppercase">{currentNPC.关系状态}</div>
                                    </div>
                                </div>

                                {/* Shared Bio Section (For both Male and Female) */}
                                <div className="bg-black/20 p-6 border border-gray-800 rounded-lg mb-8">
                                    <h4 className="text-wuxia-gold/50 font-serif font-bold mb-4 uppercase tracking-widest">人物生平</h4>
                                    <p className="text-gray-300 font-serif leading-loose">
                                        {currentNPC.简介 || "暂无详细生平记录。"}
                                    </p>
                                </div>

                                {/* Female Specific Content */}
                                {currentNPC.性别 === '女' && (
                                    <div className="space-y-8 animate-fadeIn">
                                        
                                        {/* Appearance Section */}
                                        <div className="bg-black/20 p-4 border border-pink-900/30 rounded-lg relative overflow-hidden">
                                            <div className="absolute -top-4 -right-4 text-[100px] text-pink-500/5 font-serif pointer-events-none">颜</div>
                                            <p className="text-gray-300 font-serif leading-loose italic mb-4">“{currentNPC.外貌描写}”</p>
                                            <div className="grid grid-cols-2 gap-4 text-xs text-gray-400">
                                                <div><span className="text-pink-400">身材：</span>{currentNPC.身材描写}</div>
                                                <div><span className="text-pink-400">衣着：</span>{currentNPC.衣着风格}</div>
                                            </div>
                                        </div>

                                        {/* Intimate Almanac (The Core Feature) - ALWAYS VISIBLE */}
                                        <div className="relative">
                                            <div className="flex items-center gap-2 mb-4">
                                                <h4 className="text-pink-400 font-serif font-bold text-lg flex items-center gap-2">
                                                    <span className="w-1 h-4 bg-pink-500"></span>
                                                    香闺秘档
                                                    <span className="text-[9px] border border-pink-500 px-1 text-pink-500 ml-2">上帝视角</span>
                                                </h4>
                                                {currentNPC.是否处女 && (
                                                        <span className="text-[9px] bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded border border-pink-500/50">守身如玉</span>
                                                )}
                                            </div>
                                            
                                            {/* SPECIAL EVENT: FIRST TIME TAKEN BY PLAYER */}
                                            {!currentNPC.是否处女 && currentNPC.初夜夺取者 === playerName && (
                                                <div className="mb-6 p-4 bg-gradient-to-r from-pink-900/40 to-black border border-pink-500/60 rounded-lg relative overflow-hidden group">
                                                    <div className="absolute inset-0 bg-pink-500/5 animate-pulse"></div>
                                                    <div className="relative z-10 flex flex-col">
                                                        <div className="text-[10px] text-pink-400 tracking-widest uppercase mb-1">铭心刻骨 · 初夜</div>
                                                        <div className="font-serif text-pink-100 text-sm">
                                                            <span className="text-wuxia-gold font-bold">【{currentNPC.初夜时间}】</span>
                                                            <span className="mx-1">将处子之身交给了</span>
                                                            <span className="text-wuxia-gold font-bold text-lg">{currentNPC.初夜夺取者}</span>
                                                        </div>
                                                        {currentNPC.初夜描述 && (
                                                            <div className="mt-2 text-[10px] text-pink-300/80 italic border-t border-pink-500/30 pt-1">
                                                                "{currentNPC.初夜描述}"
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Body Parts Grid */}
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                                <PrivateTag label="胸部" value={currentNPC.胸部大小} />
                                                <PrivateTag label="臀型" value={currentNPC.臀部大小} />
                                                <PrivateTag label="乳首" value={currentNPC.乳头颜色} />
                                                <PrivateTag label="秘穴" value={currentNPC.小穴颜色} />
                                            </div>

                                            <div className="p-4 rounded border bg-pink-950/20 border-pink-800/50 mb-4">
                                                <p className="font-serif leading-loose text-sm text-pink-200/80">
                                                    {currentNPC.私密总描述}
                                                </p>
                                            </div>

                                            {/* Sex Statistics */}
                                            <div className="bg-black/40 border border-gray-800 rounded p-4 mb-4">
                                                    <h5 className="text-xs text-gray-500 font-bold mb-3 uppercase tracking-widest">身体开发记录</h5>
                                                    <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                                                    <SexStat label="口部吞吐" count={currentNPC.次数_口部} />
                                                    <SexStat label="胸部夹弄" count={currentNPC.次数_胸部} />
                                                    <SexStat label="秘穴承欢" count={currentNPC.次数_阴部} />
                                                    <SexStat label="后庭开发" count={currentNPC.次数_后庭} />
                                                    <div className="col-span-2 mt-2 pt-2 border-t border-gray-700">
                                                        <SexStat label="极乐高潮" count={currentNPC.次数_高潮} />
                                                    </div>
                                                    </div>
                                            </div>
                                            
                                            {/* Womb & Pregnancy Records (New Section) */}
                                            <div className="bg-pink-950/10 border border-pink-900/40 rounded p-4">
                                                <h5 className="text-xs text-pink-400 font-bold mb-3 uppercase tracking-widest flex justify-between">
                                                    <span>子宫/孕产档案</span>
                                                    <span className="text-pink-300 font-mono">状态: {currentNPC.子宫?.状态 || '未知'}</span>
                                                </h5>
                                                
                                                <div className="mb-4 text-xs text-gray-400 grid grid-cols-2 gap-4">
                                                     <div>宫口状态: <span className="text-gray-200">{currentNPC.子宫?.宫口状态 || '紧闭'}</span></div>
                                                </div>

                                                <h6 className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">内射记录</h6>
                                                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                                                    {currentNPC.子宫?.内射记录 && currentNPC.子宫.内射记录.length > 0 ? (
                                                        currentNPC.子宫.内射记录.map((rec, idx) => (
                                                            <div key={idx} className="bg-black/40 p-2 rounded border border-gray-800 text-xs">
                                                                <div className="text-wuxia-gold font-bold mb-1">【{rec.日期}】</div>
                                                                <div className="text-gray-300 mb-1">{rec.描述}</div>
                                                                <div className="text-[10px] text-pink-400/80 mt-1 pt-1 border-t border-gray-800">
                                                                    孕检判定日: {rec.怀孕判定日}
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="text-center text-[10px] text-gray-600 italic py-2">
                                                            尚无受孕记录
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                {/* Memory Lane */}
                                <div className="mt-8 border-t border-gray-800/50 pt-6">
                                    <h4 className="text-gray-500 font-serif font-bold mb-4 uppercase tracking-widest text-xs">共同记忆</h4>
                                    <div className="space-y-3 pl-2 border-l border-gray-800">
                                        {currentNPC.记忆.map((mem, idx) => (
                                            <div key={idx} className="relative pl-4">
                                                <div className="absolute left-[-5px] top-1.5 w-2 h-2 rounded-full bg-gray-800 border border-gray-600"></div>
                                                <p className="text-xs text-gray-400 mb-1">{mem.内容}</p>
                                                <div className="text-[9px] text-gray-600 font-mono">{mem.时间}</div>
                                            </div>
                                        ))}
                                        {currentNPC.记忆.length === 0 && <div className="text-xs text-gray-600 pl-4">暂无回忆</div>}
                                    </div>
                                </div>

                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-600 font-serif">
                                请选择一位人物查看详情
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SocialModal;
