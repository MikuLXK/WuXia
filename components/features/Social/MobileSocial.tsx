import React, { useState } from 'react';
import { NPC结构 } from '../../../models/social';

interface Props {
    socialList: NPC结构[];
    onClose: () => void;
    playerName?: string;
}

const Tag: React.FC<{ label: string }> = ({ label }) => (
    <span className="px-2 py-0.5 text-[10px] rounded border border-gray-700 text-gray-400 bg-black/30">
        {label}
    </span>
);

const PrivateTag: React.FC<{ label: string; value?: string; color?: string }> = ({ label, value, color = "text-pink-300" }) => (
    <div className="flex flex-col bg-black/40 border border-gray-800 p-2 rounded">
        <span className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">{label}</span>
        <span className={`font-serif text-sm ${color}`}>{value || "???"}</span>
    </div>
);

const StatRow: React.FC<{ label: string; count?: number }> = ({ label, count }) => (
    <div className="flex justify-between items-center border-b border-gray-800/50 py-1 last:border-0">
        <span className="text-[11px] text-gray-400">{label}</span>
        <span className="font-mono text-pink-400 font-bold">{count || 0}</span>
    </div>
);

const MobileSocial: React.FC<Props> = ({ socialList, onClose, playerName = "少侠" }) => {
    const [selectedId, setSelectedId] = useState<string | null>(
        socialList.length > 0 ? socialList[0].id : null
    );

    const currentNPC = socialList.find(n => n.id === selectedId);
    const 取首个非空文本 = (...values: unknown[]): string => {
        for (const value of values) {
            if (typeof value === 'string' && value.trim().length > 0) return value.trim();
        }
        return '';
    };
    const 读取外貌 = (npc: NPC结构): string => 取首个非空文本(
        (npc as any).外貌描写,
        (npc as any).外貌,
        (npc as any).档案?.外貌要点,
        (npc as any).档案?.外貌描写
    );
    const 读取身材 = (npc: NPC结构): string => 取首个非空文本(
        (npc as any).身材描写,
        (npc as any).身材,
        (npc as any).档案?.身材要点,
        (npc as any).档案?.身材描写
    );
    const 读取衣着 = (npc: NPC结构): string => 取首个非空文本(
        (npc as any).衣着风格,
        (npc as any).衣着,
        (npc as any).档案?.衣着风格,
        (npc as any).档案?.衣着要点
    );

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-3 md:hidden animate-fadeIn">
            <div className="bg-ink-black/95 border border-wuxia-gold/30 w-full max-w-[560px] h-[84vh] flex flex-col shadow-[0_0_60px_rgba(0,0,0,0.8)] relative overflow-hidden rounded-2xl">
                <div className="h-12 shrink-0 border-b border-gray-800/60 bg-black/40 flex items-center justify-between px-4">
                    <h3 className="text-wuxia-gold font-serif font-bold text-base tracking-[0.3em]">江湖谱</h3>
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
                    <div className="bg-black/40 border border-gray-800 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] text-gray-500 tracking-[0.3em]">名录</span>
                            <span className="text-[10px] text-wuxia-cyan/80">{socialList.length} 人</span>
                        </div>
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                            {socialList.map(npc => (
                                <button
                                    key={npc.id}
                                    onClick={() => setSelectedId(npc.id)}
                                    className={`min-w-[120px] p-2 rounded-lg border transition-all text-left ${
                                        selectedId === npc.id
                                            ? 'border-wuxia-gold/60 bg-wuxia-gold/5'
                                            : 'border-gray-800 bg-white/[0.02] hover:bg-white/[0.05]'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-serif font-bold text-base border ${
                                            npc.性别 === '女' ? 'border-pink-800 bg-pink-900/20 text-pink-500' : 'border-blue-800 bg-blue-900/20 text-blue-500'
                                        }`}>
                                            {npc.姓名[0]}
                                        </div>
                                        <div>
                                            <div className={`font-serif font-bold text-sm ${
                                                selectedId === npc.id ? 'text-wuxia-gold' : 'text-gray-300'
                                            }`}>
                                                {npc.姓名}
                                            </div>
                                            <div className="text-[9px] text-gray-500">{npc.身份}</div>
                                        </div>
                                    </div>
                                    <div className="mt-2 text-[10px] text-wuxia-red font-mono">♥ {npc.好感度}</div>
                                </button>
                            ))}
                            {socialList.length === 0 && (
                                <div className="text-center text-gray-600 text-xs py-6 w-full">暂无结识之人</div>
                            )}
                        </div>
                    </div>

                    {currentNPC ? (
                        <>
                            <div className="bg-black/40 border border-gray-800 rounded-xl p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="text-xl text-wuxia-gold font-serif font-bold">{currentNPC.姓名}</div>
                                        <div className="text-[10px] text-gray-500 mt-1">{currentNPC.关系状态}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl text-wuxia-red font-serif">♥ {currentNPC.好感度}</div>
                                        <div className="text-[9px] text-gray-500">{currentNPC.境界}</div>
                                    </div>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <Tag label={`${currentNPC.身份}`} />
                                    <Tag label={`${currentNPC.性别} · ${currentNPC.年龄}岁`} />
                                    <Tag label={currentNPC.是否在场 ? '在场' : '离场'} />
                                    <Tag label={currentNPC.是否队友 ? '队友' : '非队友'} />
                                </div>
                            </div>

                            <div className="bg-black/30 border border-gray-800 rounded-xl p-4">
                                <div className="text-[10px] text-wuxia-gold/60 tracking-[0.3em] mb-2">人物生平</div>
                                <p className="text-sm text-gray-300 font-serif leading-relaxed">
                                    {currentNPC.简介 || '暂无详细生平记录。'}
                                </p>
                            </div>

                            {currentNPC.性别 === '女' && (
                                <div className="bg-black/30 border border-pink-900/40 rounded-xl p-4 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="text-pink-400 font-serif font-bold text-sm">香闺秘档</div>
                                        {currentNPC.是否处女 && (
                                            <span className="text-[9px] bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded border border-pink-500/50">守身如玉</span>
                                        )}
                                    </div>

                                    <div className="bg-black/40 border border-pink-900/40 rounded-lg p-3 space-y-2">
                                        <div className="text-[10px] text-pink-300 tracking-[0.3em]">外貌描写</div>
                                        <p className="text-[11px] text-gray-300 italic font-serif">“{读取外貌(currentNPC) || '暂无外貌描写'}”</p>
                                        <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-400">
                                            <div><span className="text-pink-400">身材：</span>{读取身材(currentNPC) || '暂无记录'}</div>
                                            <div><span className="text-pink-400">衣着：</span>{读取衣着(currentNPC) || '暂无记录'}</div>
                                        </div>
                                    </div>

                                    {!currentNPC.是否处女 && currentNPC.初夜夺取者 === playerName && (
                                        <div className="p-3 bg-pink-900/20 border border-pink-500/40 rounded-lg text-[11px] text-pink-100">
                                            <div className="text-[10px] text-pink-300 mb-1">初夜</div>
                                            <span className="text-wuxia-gold font-bold">【{currentNPC.初夜时间}】</span>
                                            <span className="mx-1">交予</span>
                                            <span className="text-wuxia-gold font-bold">{currentNPC.初夜夺取者}</span>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-3">
                                        <PrivateTag label="胸部" value={currentNPC.胸部大小} />
                                        <PrivateTag label="臀型" value={currentNPC.臀部大小} />
                                        <PrivateTag label="乳首" value={currentNPC.乳头颜色} />
                                        <PrivateTag label="秘穴" value={currentNPC.小穴颜色} />
                                    </div>

                                    <div className="bg-black/40 border border-gray-800 rounded p-3 text-sm text-pink-200/80 font-serif">
                                        {currentNPC.私密总描述}
                                    </div>

                                    <div className="bg-black/40 border border-gray-800 rounded p-3">
                                        <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">身体开发记录</div>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                            <StatRow label="口部吞吐" count={currentNPC.次数_口部} />
                                            <StatRow label="胸部夹弄" count={currentNPC.次数_胸部} />
                                            <StatRow label="秘穴承欢" count={currentNPC.次数_阴部} />
                                            <StatRow label="后庭开发" count={currentNPC.次数_后庭} />
                                            <div className="col-span-2 border-t border-gray-800/70 pt-1">
                                                <StatRow label="极乐高潮" count={currentNPC.次数_高潮} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="bg-black/30 border border-gray-800 rounded-xl p-4">
                                <div className="text-[10px] text-wuxia-gold/60 tracking-[0.3em] mb-2">共同记忆</div>
                                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                                    {currentNPC.记忆.map((mem, idx) => (
                                        <div key={idx} className="border-l border-gray-800 pl-3">
                                            <div className="text-[11px] text-gray-300">{mem.内容}</div>
                                            <div className="text-[9px] text-gray-500 font-mono">{mem.时间}</div>
                                        </div>
                                    ))}
                                    {currentNPC.记忆.length === 0 && (
                                        <div className="text-xs text-gray-600">暂无回忆</div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-600 font-serif">
                            请选择一位人物查看详情
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MobileSocial;
