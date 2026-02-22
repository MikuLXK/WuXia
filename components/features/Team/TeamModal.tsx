
import React from 'react';
import { 角色数据结构, NPC结构 } from '../../../types';

interface Props {
    character: 角色数据结构;
    teammates: NPC结构[];
    onClose: () => void;
}

const TeamModal: React.FC<Props> = ({ character, teammates, onClose }) => {
    const activeTeammates = teammates.filter(n => n.是否队友 === true);

    // Helper for Equipment Item
    const EquipItem: React.FC<{ label: string; value?: string; highlight?: boolean }> = ({ label, value, highlight }) => (
        <div className="flex justify-between items-center text-xs border-b border-gray-800/50 py-1 last:border-0">
            <span className={`text-gray-500 ${highlight ? 'text-pink-400/80' : ''}`}>{label}</span>
            <span className={`${value && value !== '无' ? 'text-gray-200' : 'text-gray-600 italic'}`}>{value || '无'}</span>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-ink-black/95 border border-wuxia-gold/30 w-full max-w-6xl h-[700px] flex flex-col shadow-[0_0_80px_rgba(0,0,0,0.9)] relative overflow-hidden rounded-2xl">
                 {/* Header */}
                 <div className="h-16 shrink-0 border-b border-gray-800/50 bg-black/40 flex items-center justify-between px-6 relative z-50">
                    <h3 className="text-wuxia-gold font-serif font-bold text-2xl tracking-[0.3em] drop-shadow-md">队伍管理</h3>
                     <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-black/50 border border-gray-700 text-gray-400 hover:text-wuxia-red hover:border-wuxia-red transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                     </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-ink-wash/5">
                    
                    {/* NPC Teammates Grid - Player section removed */}
                    <div>
                         <div className="flex items-center gap-3 mb-4 border-l-4 border-gray-600 pl-3">
                            <h4 className="text-gray-400 font-bold uppercase tracking-widest text-sm">队员列表 ({activeTeammates.length})</h4>
                            <div className="h-px bg-gray-800 flex-1"></div>
                         </div>

                         {activeTeammates.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {activeTeammates.map(npc => (
                                    <div key={npc.id} className="bg-black/30 border border-gray-700 hover:border-wuxia-gold/30 transition-colors p-4 rounded-xl flex flex-col gap-4 relative group">
                                        {(() => {
                                            const safeHpMax = Math.max(1, npc.最大血量 || 0);
                                            const safeHpCur = Math.max(0, npc.当前血量 || 0);
                                            const safeSpMax = Math.max(1, npc.最大精力 || 0);
                                            const safeSpCur = Math.max(0, npc.当前精力 || 0);
                                            const hpPct = Math.max(0, Math.min(100, (safeHpCur / safeHpMax) * 100));
                                            const spPct = Math.max(0, Math.min(100, (safeSpCur / safeSpMax) * 100));
                                            return (
                                                <>
                                        
                                        {/* NPC Top Info */}
                                        <div className="flex items-start gap-4 pb-3 border-b border-gray-800">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg border shrink-0 ${npc.性别 === '女' ? 'border-pink-900 bg-pink-900/10 text-pink-500' : 'border-blue-900 bg-blue-900/10 text-blue-500'}`}>
                                                {npc.姓名[0]}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between">
                                                    <span className="font-bold text-gray-200 truncate">{npc.姓名}</span>
                                                    <span className="text-xs font-mono text-gray-500">
                                                        {npc.上次更新时间 ? `更新: ${npc.上次更新时间}` : '无更新记录'}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-gray-500 truncate">{npc.身份} · {npc.境界}</div>
                                                <div className="flex gap-2 mt-2">
                                                     <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden" title={`血量: ${safeHpCur}/${safeHpMax}`}>
                                                        <div className="h-full bg-red-800" style={{width: `${hpPct}%`}}></div>
                                                     </div>
                                                     <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden" title={`精力: ${safeSpCur}/${safeSpMax}`}>
                                                        <div className="h-full bg-blue-800" style={{width: `${spPct}%`}}></div>
                                                     </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Simplified Combat Stats (Distinct Team Variable) */}
                                        <div className="flex gap-4">
                                            <div className="flex-1 bg-red-950/20 border border-red-900/30 p-2 rounded flex flex-col items-center">
                                                <span className="text-[10px] text-red-400 uppercase tracking-widest">攻击力</span>
                                                <span className="font-mono text-lg font-bold text-red-200">{npc.攻击力 || 0}</span>
                                            </div>
                                            <div className="flex-1 bg-blue-950/20 border border-blue-900/30 p-2 rounded flex flex-col items-center">
                                                <span className="text-[10px] text-blue-400 uppercase tracking-widest">防御力</span>
                                                <span className="font-mono text-lg font-bold text-blue-200">{npc.防御力 || 0}</span>
                                            </div>
                                        </div>

                                        {/* Combat Equipment */}
                                        <div className="bg-black/20 p-3 rounded border border-gray-800/50">
                                            <h5 className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-bold">战斗装备</h5>
                                            <EquipItem label="主武器" value={npc.当前装备?.主武器} />
                                            <EquipItem label="副武器" value={npc.当前装备?.副武器} />
                                            <EquipItem label="饰品" value={npc.当前装备?.饰品} />
                                        </div>

                                        {/* Female Specific: Clothing */}
                                        {npc.性别 === '女' && (
                                            <div className="bg-pink-950/10 p-3 rounded border border-pink-900/30 relative">
                                                <h5 className="text-[10px] text-pink-400/70 uppercase tracking-widest mb-2 font-bold flex items-center gap-2">
                                                    当前着装
                                                    <span className="w-1 h-1 rounded-full bg-pink-500"></span>
                                                </h5>
                                                <EquipItem label="外装" value={npc.当前装备?.服装} highlight />
                                                <EquipItem label="内衣" value={npc.当前装备?.内衣} highlight />
                                                <EquipItem label="内裤" value={npc.当前装备?.内裤} highlight />
                                                <EquipItem label="足袜" value={npc.当前装备?.袜饰} highlight />
                                                <EquipItem label="鞋履" value={npc.当前装备?.鞋履} highlight />
                                            </div>
                                        )}

                                        {/* Inventory */}
                                        <div className="bg-black/20 p-3 rounded border border-gray-800/50 flex-1">
                                            <h5 className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-bold">背包物品</h5>
                                            <div className="flex flex-wrap gap-2">
                                                {npc.背包 && npc.背包.length > 0 ? (
                                                    npc.背包.map((item, i) => (
                                                        <span key={i} className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-gray-300">
                                                            {item}
                                                        </span>
                                                    ))
                                                ) : <span className="text-[10px] text-gray-600 italic">空空如也</span>}
                                            </div>
                                        </div>
                                        </>
                                            );
                                        })()}

                                    </div>
                                ))}
                            </div>
                         ) : (
                             <div className="text-center py-10 text-gray-600 text-sm italic border-2 border-dashed border-gray-800 rounded-xl">
                                 暂无同行之人。
                             </div>
                         )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeamModal;
