import React from 'react';
import ApiSettings from '../ApiSettings';
import PromptManager from '../PromptManager';
import StorageManager from '../StorageManager';
import ThemeSettings from '../ThemeSettings';
import VisualSettings from '../VisualSettings';
import WorldSettings from '../WorldSettings';
import GameSettings from '../GameSettings';
import MemorySettings from '../MemorySettings';
import HistoryViewer from '../HistoryViewer';
import ContextViewer from '../ContextViewer';
import {
    接口设置结构, 提示词结构, ThemePreset, 视觉设置结构, 节日结构, 聊天记录结构,
    游戏设置结构, 记忆配置结构, 记忆系统结构
} from '../../../../types';

type ContextSection = {
    id: string;
    title: string;
    category: string;
    order: number;
    content: string;
    tokenEstimate?: number;
};

type ContextSnapshot = {
    sections: ContextSection[];
    fullText: string;
    totalTokens?: number;
};

interface Props {
    activeTab: 'api' | 'prompt' | 'storage' | 'theme' | 'visual' | 'world' | 'game' | 'memory' | 'history' | 'context';
    onTabChange: (tab: 'api' | 'prompt' | 'storage' | 'theme' | 'visual' | 'world' | 'game' | 'memory' | 'history' | 'context') => void;
    onClose: () => void;
    apiConfig: 接口设置结构;
    visualConfig: 视觉设置结构;
    gameConfig?: 游戏设置结构;
    memoryConfig?: 记忆配置结构;
    prompts: 提示词结构[];
    festivals: 节日结构[];
    currentTheme: ThemePreset;
    history: 聊天记录结构[];
    memorySystem?: 记忆系统结构;
    contextSnapshot?: ContextSnapshot;
    onSaveApi: (config: 接口设置结构) => void;
    onSaveVisual: (config: 视觉设置结构) => void;
    onSaveGame?: (config: 游戏设置结构) => void;
    onSaveMemory?: (config: 记忆配置结构) => void;
    onUpdatePrompts: (prompts: 提示词结构[]) => void;
    onUpdateFestivals: (festivals: 节日结构[]) => void;
    onThemeChange: (theme: ThemePreset) => void;
    onReturnToHome?: () => void;
    isHome?: boolean;
    requestConfirm?: (options: { title?: string; message: string; confirmText?: string; cancelText?: string; danger?: boolean }) => Promise<boolean>;
}

const MobileSettingsModal: React.FC<Props> = ({
    activeTab, onTabChange, onClose,
    apiConfig, visualConfig, gameConfig, memoryConfig, prompts, festivals, currentTheme, history, memorySystem, contextSnapshot,
    onSaveApi, onSaveVisual, onSaveGame, onSaveMemory, onUpdatePrompts, onUpdateFestivals, onThemeChange,
    onReturnToHome, isHome, requestConfirm
}) => {
    const tabItems = [
        { id: 'game', label: '游戏' },
        { id: 'world', label: '世界' },
        { id: 'memory', label: '记忆' },
        { id: 'visual', label: '视觉' },
        { id: 'history', label: '历史' },
        { id: 'context', label: '上下文' },
        { id: 'api', label: '接口' },
        { id: 'prompt', label: '提示词' },
        { id: 'theme', label: '风格' },
        { id: 'storage', label: '存储' }
    ] as const;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[220] flex items-center justify-center p-3 md:hidden animate-fadeIn">
            <div className="w-full max-w-[680px] h-[86vh] bg-[#0b0b0c]/95 border border-wuxia-gold/30 rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.85)] flex flex-col">
                <div className="shrink-0 px-4 py-3 border-b border-gray-800/70 bg-black/35">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-wuxia-gold font-serif font-bold tracking-[0.28em] text-sm">设 定</div>
                            <div className="text-[10px] text-gray-500 mt-1">移动端面板</div>
                        </div>
                        <div className="flex items-center gap-2">
                            {!isHome && onReturnToHome && (
                                <button
                                    onClick={onReturnToHome}
                                    className="px-2.5 py-1 text-[10px] rounded border border-red-900/60 text-red-400 bg-red-900/10"
                                >
                                    返回
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-700 bg-black/50 text-gray-300"
                                title="关闭"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div className="mt-3 overflow-x-auto no-scrollbar">
                        <div className="flex items-center gap-2 min-w-max">
                            {tabItems.map(item => (
                                <button
                                    key={`mobile-tab-${item.id}`}
                                    onClick={() => onTabChange(item.id as any)}
                                    className={`px-3 py-1.5 rounded-full text-[11px] border transition-colors ${
                                        activeTab === item.id
                                            ? 'border-wuxia-gold bg-wuxia-gold/12 text-wuxia-gold'
                                            : 'border-gray-800 text-gray-500 bg-black/40'
                                    }`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 bg-ink-wash/5">
                    {activeTab === 'api' && <ApiSettings settings={apiConfig} onSave={onSaveApi} />}
                    {activeTab === 'prompt' && <PromptManager prompts={prompts} onUpdate={onUpdatePrompts} requestConfirm={requestConfirm} />}
                    {activeTab === 'world' && <WorldSettings festivals={festivals || []} onUpdate={onUpdateFestivals} requestConfirm={requestConfirm} />}
                    {activeTab === 'theme' && <ThemeSettings currentTheme={currentTheme} onThemeChange={onThemeChange} />}
                    {activeTab === 'visual' && <VisualSettings settings={visualConfig} onSave={onSaveVisual} />}
                    {activeTab === 'storage' && <StorageManager history={history} prompts={prompts} requestConfirm={requestConfirm} />}
                    {activeTab === 'history' && <HistoryViewer history={history} memorySystem={memorySystem} />}
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
        </div>
    );
};

export default MobileSettingsModal;
