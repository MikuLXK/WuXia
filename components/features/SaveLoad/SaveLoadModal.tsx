
import React, { useState, useEffect } from 'react';
import * as dbService from '../../../services/dbService';
import { 存档结构 } from '../../../types';
import GameButton from '../../ui/GameButton';

interface Props {
    onClose: () => void;
    onLoadGame: (save: 存档结构) => void;
    onSaveGame?: (desc: string) => void; // Optional if in read-only mode
    mode: 'save' | 'load';
}

const SaveLoadModal: React.FC<Props> = ({ onClose, onLoadGame, onSaveGame, mode }) => {
    const [saves, setSaves] = useState<存档结构[]>([]);
    const [activeTab, setActiveTab] = useState<'auto' | 'manual'>('manual');
    const [loading, setLoading] = useState(true);
    const [saveDesc, setSaveDesc] = useState('');

    useEffect(() => {
        loadSaves();
    }, []);

    const loadSaves = async () => {
        setLoading(true);
        try {
            const list = await dbService.读取存档列表();
            setSaves(list);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("确定删除此存档吗？")) {
            await dbService.删除存档(id);
            await loadSaves();
        }
    };

    const handleSave = async () => {
        if (onSaveGame) {
            onSaveGame(saveDesc || "手动存档");
            setSaveDesc('');
            // Switch to manual tab and reload to show new save
            setActiveTab('manual');
            await loadSaves();
        }
    };

    const filteredSaves = saves.filter(s => {
        if (activeTab === 'auto') return s.类型 === 'auto';
        return s.类型 !== 'auto'; // Default to manual for undefined types too
    });

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[300] flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-ink-black/95 border border-wuxia-gold/30 w-full max-w-4xl h-[600px] flex flex-col shadow-[0_0_80px_rgba(0,0,0,0.9)] rounded-2xl relative overflow-hidden">
                
                {/* Header */}
                <div className="h-16 shrink-0 border-b border-gray-800/50 bg-black/40 flex items-center justify-between px-6 relative z-50">
                    <h3 className="text-wuxia-gold font-serif font-bold text-2xl tracking-[0.3em] drop-shadow-md">
                        {mode === 'save' ? '铭刻时光' : '时光回溯'}
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-2xl">×</button>
                </div>

                {/* Content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left: New Save (Only in Save Mode) or Stats */}
                    {mode === 'save' && (
                        <div className="w-[30%] bg-black/20 border-r border-gray-800/50 p-6 flex flex-col gap-4">
                            <h4 className="text-wuxia-gold font-bold text-sm uppercase tracking-widest">新建存档</h4>
                            <textarea 
                                value={saveDesc}
                                onChange={(e) => setSaveDesc(e.target.value)}
                                placeholder="输入存档描述..."
                                className="w-full h-32 bg-black/30 border border-gray-700 p-3 text-gray-300 focus:border-wuxia-gold outline-none resize-none text-sm"
                            />
                            <GameButton onClick={handleSave} variant="primary" className="w-full">
                                确认保存
                            </GameButton>
                        </div>
                    )}

                    {/* Right: List */}
                    <div className="flex-1 flex flex-col bg-ink-wash/5">
                        {/* Tabs */}
                        <div className="flex border-b border-gray-800/50">
                            <button 
                                onClick={() => setActiveTab('manual')}
                                className={`flex-1 py-3 text-sm font-bold tracking-widest transition-colors ${activeTab === 'manual' ? 'bg-wuxia-gold/10 text-wuxia-gold border-b-2 border-wuxia-gold' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                手动存档
                            </button>
                            <button 
                                onClick={() => setActiveTab('auto')}
                                className={`flex-1 py-3 text-sm font-bold tracking-widest transition-colors ${activeTab === 'auto' ? 'bg-wuxia-gold/10 text-wuxia-gold border-b-2 border-wuxia-gold' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                自动存档
                            </button>
                        </div>

                        {/* List Area */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-3">
                            {filteredSaves.length === 0 && (
                                <div className="text-center text-gray-600 py-10">暂无记录</div>
                            )}
                            
                            {filteredSaves.map(save => (
                                <div 
                                    key={save.id}
                                    onClick={() => mode === 'load' && onLoadGame(save)}
                                    className={`relative bg-black/40 border border-gray-700 p-4 rounded-lg group transition-all flex flex-col gap-2 ${mode === 'load' ? 'cursor-pointer hover:border-wuxia-gold/50 hover:bg-black/60' : ''}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] px-1.5 rounded border ${save.类型 === 'auto' ? 'border-blue-500 text-blue-400' : 'border-wuxia-gold text-wuxia-gold'}`}>
                                                {save.类型 === 'auto' ? 'AUTO' : 'MANUAL'}
                                            </span>
                                            <span className="font-bold text-gray-200 text-sm">{save.角色数据?.姓名 || '未知角色'}</span>
                                            <span className="text-xs text-gray-500">
                                                {save.角色数据?.境界} | {save.环境信息?.具体地点}
                                            </span>
                                        </div>
                                        <div className="text-[10px] text-gray-600 font-mono">
                                            {new Date(save.时间戳).toLocaleString()}
                                        </div>
                                    </div>
                                    
                                    <div className="text-xs text-gray-400 italic border-l-2 border-gray-700 pl-2">
                                        {save.描述}
                                    </div>

                                    <button 
                                        onClick={(e) => handleDelete(save.id, e)}
                                        className="absolute top-4 right-4 text-gray-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                        title="删除"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SaveLoadModal;
