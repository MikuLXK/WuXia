
import React from 'react';
import ApiSettings from './ApiSettings';
import PromptManager from './PromptManager';
import StorageManager from './StorageManager';
import ThemeSettings from './ThemeSettings';
import VisualSettings from './VisualSettings';
import WorldSettings from './WorldSettings';
import GameSettings from './GameSettings'; 
import MemorySettings from './MemorySettings'; 
import HistoryViewer from './HistoryViewer'; // New
import ContextViewer from './ContextViewer';
import { OrnateBorder } from '../../ui/decorations/OrnateBorder';
import { 
    接口设置结构, 提示词结构, ThemePreset, 视觉设置结构, 节日结构, 聊天记录结构,
    游戏设置结构, 记忆配置结构
} from '../../../types';

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
    activeTab: 'api' | 'prompt' | 'storage' | 'theme' | 'visual' | 'world' | 'game' | 'memory' | 'history' | 'context';
    onTabChange: (tab: 'api' | 'prompt' | 'storage' | 'theme' | 'visual' | 'world' | 'game' | 'memory' | 'history' | 'context') => void;
    onClose: () => void;
    
    // Config Props
    apiConfig: 接口设置结构;
    visualConfig: 视觉设置结构;
    gameConfig?: 游戏设置结构; 
    memoryConfig?: 记忆配置结构; 
    prompts: 提示词结构[];
    festivals: 节日结构[];
    currentTheme: ThemePreset;
    
    // Data Props
    history: 聊天记录结构[]; 
    contextSnapshot?: ContextSnapshot;

    // Actions
    onSaveApi: (config: 接口设置结构) => void;
    onSaveVisual: (config: 视觉设置结构) => void;
    onSaveGame?: (config: 游戏设置结构) => void; 
    onSaveMemory?: (config: 记忆配置结构) => void; 
    
    onUpdatePrompts: (prompts: 提示词结构[]) => void;
    onUpdateFestivals: (festivals: 节日结构[]) => void;
    onThemeChange: (theme: ThemePreset) => void;
    
    onReturnToHome?: () => void;
    isHome?: boolean;
}

const SettingsModal: React.FC<Props> = ({ 
    activeTab, onTabChange, onClose,
    apiConfig, visualConfig, gameConfig, memoryConfig, prompts, festivals, currentTheme, history, contextSnapshot,
    onSaveApi, onSaveVisual, onSaveGame, onSaveMemory, onUpdatePrompts, onUpdateFestivals, onThemeChange,
    onReturnToHome, isHome
}) => {
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fadeIn">
            <OrnateBorder className="w-full max-w-4xl h-[700px] flex shadow-[0_0_80px_rgba(0,0,0,0.9)] p-0 overflow-hidden backdrop-blur-md">
                <div className="flex w-full h-full">
                    {/* Sidebar */}
                    <div className="w-1/4 bg-black/40 border-r border-wuxia-gold/10 flex flex-col pt-12 relative z-10">
                        <h2 className="text-2xl text-wuxia-gold font-serif font-black px-6 mb-8 italic">设置</h2>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {[
                                { id: 'game', label: '游戏设定' },
                                { id: 'world', label: '世界设定' },
                                { id: 'memory', label: '记忆配置' },
                                { id: 'visual', label: '视觉显示' },
                                { id: 'history', label: '互动历史' }, // Added
                                { id: 'context', label: '上下文' },
                                { id: 'api', label: '接口连接' },
                                { id: 'prompt', label: '提示词' },
                                { id: 'theme', label: '界面风格' },
                                { id: 'storage', label: '数据存储' }
                            ].map(item => (
                                <button 
                                    key={item.id}
                                    onClick={() => onTabChange(item.id as any)}
                                    className={`w-full px-6 py-4 text-left font-bold uppercase tracking-widest transition-all hover:bg-white/5 hover:pl-8 ${
                                        activeTab === item.id 
                                        ? 'text-wuxia-gold border-l-4 border-wuxia-gold bg-white/5 shadow-[inset_10px_0_20px_rgba(0,0,0,0.5)]' 
                                        : 'text-gray-500 border-l-4 border-transparent'
                                    }`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>

                        {/* Footer Actions */}
                        <div className="p-6 border-t border-gray-800/50 space-y-3 bg-black/20">
                            {!isHome && onReturnToHome && (
                                <button 
                                    onClick={onReturnToHome}
                                    className="w-full py-3 border border-red-900/50 text-red-500 hover:bg-red-900/10 hover:text-red-400 hover:border-red-500 text-xs tracking-widest uppercase transition-all flex items-center justify-center gap-2 group"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 group-hover:-translate-x-1 transition-transform">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                                    </svg>
                                    返回首页
                                </button>
                            )}
                            
                            <button 
                                onClick={onClose}
                                className="w-full py-3 bg-wuxia-gold text-black font-bold text-xs tracking-widest uppercase hover:bg-white transition-colors shadow-lg"
                            >
                                关闭设置
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-8 overflow-y-auto relative z-10 custom-scrollbar">
                        {activeTab === 'api' && <ApiSettings settings={apiConfig} onSave={onSaveApi} />}
                        {activeTab === 'prompt' && <PromptManager prompts={prompts} onUpdate={onUpdatePrompts} />}
                        {activeTab === 'world' && <WorldSettings festivals={festivals || []} onUpdate={onUpdateFestivals} />}
                        {activeTab === 'theme' && <ThemeSettings currentTheme={currentTheme} onThemeChange={onThemeChange} />}
                        {activeTab === 'visual' && <VisualSettings settings={visualConfig} onSave={onSaveVisual} />}
                        {activeTab === 'storage' && <StorageManager history={history} prompts={prompts} />} 
                        {activeTab === 'history' && <HistoryViewer history={history} />} 
                        {activeTab === 'context' && contextSnapshot && (
                            <ContextViewer
                                snapshot={contextSnapshot}
                                memoryConfig={memoryConfig}
                                onSaveMemory={onSaveMemory}
                            />
                        )}
                        
                        {activeTab === 'game' && gameConfig && onSaveGame && (
                            <GameSettings settings={gameConfig} onSave={onSaveGame} />
                        )}
                        {activeTab === 'memory' && memoryConfig && onSaveMemory && (
                            <MemorySettings settings={memoryConfig} onSave={onSaveMemory} />
                        )}
                    </div>
                </div>
            </OrnateBorder>
        </div>
    );
};

export default SettingsModal;
