
import React, { useEffect, useState } from 'react';
import * as dbService from '../../../services/dbService';
import GameButton from '../../ui/GameButton';
import ToggleSwitch from '../../ui/ToggleSwitch';
import { 聊天记录结构, 提示词结构 } from '../../../types';
import { buildHistoryTokenSource, estimatePromptPoolTokens, estimateTextTokens } from '../../../utils/tokenEstimate';

interface Props {
    history: 聊天记录结构[];
    prompts?: 提示词结构[]; // Added
    requestConfirm?: (options: { title?: string; message: string; confirmText?: string; cancelText?: string; danger?: boolean }) => Promise<boolean>;
}

const StorageManager: React.FC<Props> = ({ history, prompts = [], requestConfirm }) => {
    const [info, setInfo] = useState<dbService.StorageBreakdown>({
        usage: 0,
        quota: 0,
        details: { saves: 0, settings: 0, prompts: 0, api: 0, cache: 0 }
    });
    const [protectApiKey, setProtectApiKey] = useState(true);

    const updateInfo = async () => {
        const data = await dbService.获取详细存储信息();
        setInfo(data);
    };

    useEffect(() => {
        updateInfo();
    }, [history]); 

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleClearAll = async () => {
        const ok = requestConfirm
            ? await requestConfirm({
                title: '清空数据',
                message: `确定要清空所有数据吗？${protectApiKey ? ' (API Key 将被保留)' : ' (警告：API Key 也会被删除)'}`,
                confirmText: '清空',
                danger: true
            })
            : true;
        if (!ok) return;
        await dbService.清空数据库(protectApiKey);
        await updateInfo();
        alert("数据已清理");
        window.location.reload();
    };

    // Calculate Dynamic Context Tokens (History)
    const contextItems = history.map((h, idx) => {
        const tokenSource = buildHistoryTokenSource(h);
        let preview = '';

        if (h.role === 'user') {
            preview = h.content || '';
        } else if (h.role === 'assistant' && h.structuredResponse) {
            const logs = h.structuredResponse.logs || [];
            preview = logs.map(l => `${l.sender}: ${l.text}`).join(' | ');
        } else {
            preview = h.content || '';
        }

        const estimatedTokens = estimateTextTokens(tokenSource);

        if (preview.length > 60) preview = preview.substring(0, 60) + '...';

        return {
            index: idx,
            role: h.role,
            preview: preview,
            gameTime: h.gameTime,
            tokens: estimatedTokens,
            size: tokenSource.length 
        };
    });

    const historyTokens = contextItems.reduce((acc, curr) => acc + curr.tokens, 0);
    
    // Calculate Static Prompt Tokens
    const activePrompts = prompts.filter(p => p.启用);
    const systemPromptTokens = estimatePromptPoolTokens(prompts);
    const totalEstimatedTokens = historyTokens + systemPromptTokens;

    // Helpers for Progress Bar
    const getPercent = (val: number) => Math.min((val / (info.usage || 1)) * 100, 100);

    return (
        <div className="space-y-6 h-full flex flex-col">
            
            {/* Storage Breakdown Section */}
            <div className="bg-black/30 p-5 border border-gray-700/50 rounded-lg">
                <div className="flex justify-between items-end mb-3">
                    <h4 className="text-wuxia-gold font-serif font-bold">本地存储概览</h4>
                    <span className="text-xs text-gray-400 font-mono">
                         总占用: <span className="text-white font-bold">{formatBytes(info.usage)}</span> / {formatBytes(info.quota)}
                    </span>
                </div>
                
                {/* Visual Bar */}
                <div className="w-full h-4 bg-gray-900 rounded-full overflow-hidden flex mb-4 border border-gray-800">
                    <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${getPercent(info.details.saves)}%` }} title="存档"></div>
                    <div className="h-full bg-purple-500 transition-all duration-500" style={{ width: `${getPercent(info.details.prompts)}%` }} title="提示词"></div>
                    <div className="h-full bg-green-600 transition-all duration-500" style={{ width: `${getPercent(info.details.settings)}%` }} title="其他设置"></div>
                    <div className="h-full bg-yellow-600 transition-all duration-500" style={{ width: `${getPercent(info.details.api)}%` }} title="API配置"></div>
                    <div className="h-full bg-gray-600 transition-all duration-500" style={{ width: `${getPercent(info.details.cache)}%` }} title="系统缓存"></div>
                </div>

                {/* Legend */}
                <div className="grid grid-cols-5 gap-2 text-center">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-blue-400 uppercase tracking-wider mb-1">存档</span>
                        <span className="text-xs font-mono text-gray-300">{formatBytes(info.details.saves)}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] text-purple-400 uppercase tracking-wider mb-1">提示词</span>
                        <span className="text-xs font-mono text-gray-300">{formatBytes(info.details.prompts)}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] text-green-400 uppercase tracking-wider mb-1">设置</span>
                        <span className="text-xs font-mono text-gray-300">{formatBytes(info.details.settings)}</span>
                    </div>
                    <div className="flex flex-col">
                         <span className="text-[10px] text-yellow-400 uppercase tracking-wider mb-1">API</span>
                        <span className="text-xs font-mono text-gray-300">{formatBytes(info.details.api)}</span>
                    </div>
                    <div className="flex flex-col">
                         <span className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">缓存</span>
                        <span className="text-xs font-mono text-gray-300">{formatBytes(info.details.cache)}</span>
                    </div>
                </div>
            </div>

            {/* Context Memory Section */}
            <div className="bg-black/30 p-5 border border-gray-700/50 rounded-lg flex-1 flex flex-col min-h-0">
                <div className="flex justify-between items-center mb-3 shrink-0">
                    <h4 className="text-wuxia-cyan font-serif font-bold">当前上下文 (Context)</h4>
                    <div className="text-xs text-gray-400">
                        估算消耗: <span className="text-wuxia-cyan font-mono font-bold text-sm">{totalEstimatedTokens.toLocaleString()}</span> Tokens
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-3 shrink-0 text-xs text-gray-500">
                    <div className="bg-black/20 p-2 rounded border border-gray-800 flex justify-between">
                        <span>系统提示词 ({activePrompts.length}个)</span>
                        <span className="font-mono text-gray-300">{systemPromptTokens} tok</span>
                    </div>
                    <div className="bg-black/20 p-2 rounded border border-gray-800 flex justify-between">
                        <span>即时记忆 ({history.length}条)</span>
                        <span className="font-mono text-gray-300">{historyTokens} tok</span>
                    </div>
                </div>

                {/* Context Items List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar border border-gray-800 bg-black/20 rounded">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-white/5 text-[10px] text-gray-500 uppercase font-bold sticky top-0 z-10 backdrop-blur-sm">
                            <tr>
                                <th className="p-2 w-12 text-center border-b border-gray-800">#</th>
                                <th className="p-2 w-16 border-b border-gray-800">角色</th>
                                <th className="p-2 border-b border-gray-800">内容预览</th>
                                <th className="p-2 w-24 text-right border-b border-gray-800">游戏时间</th>
                                <th className="p-2 w-16 text-right border-b border-gray-800">Tok</th>
                            </tr>
                        </thead>
                        <tbody className="text-xs font-mono">
                            {contextItems.map((item) => (
                                <tr key={item.index} className="border-b border-gray-800/50 hover:bg-white/5 transition-colors">
                                    <td className="p-2 text-center text-gray-600">{item.index + 1}</td>
                                    <td className={`p-2 font-bold ${item.role === 'user' ? 'text-blue-400' : item.role === 'assistant' ? 'text-wuxia-gold' : 'text-red-400'}`}>
                                        {item.role === 'assistant' ? 'AI' : item.role === 'user' ? '玩家' : '系统'}
                                    </td>
                                    <td className="p-2 text-gray-400 truncate max-w-[200px]" title={item.preview}>
                                        {item.preview}
                                    </td>
                                    <td className="p-2 text-right text-gray-500 text-[10px]">
                                        {item.gameTime || '-'}
                                    </td>
                                    <td className="p-2 text-right text-gray-600">
                                        {item.tokens}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Actions */}
            <div className="border-t border-gray-800/50 pt-4 mt-auto shrink-0">
                <div className="flex items-center justify-between mb-4">
                    <label className="text-sm text-gray-300 select-none">清理时保留 API Key 设置</label>
                    <ToggleSwitch
                        checked={protectApiKey}
                        onChange={setProtectApiKey}
                        ariaLabel="切换清理时保留 API Key 设置"
                    />
                </div>
                <GameButton onClick={handleClearAll} variant="danger" className="w-full py-2 text-sm">
                    清空所有缓存数据 (重置游戏)
                </GameButton>
            </div>
        </div>
    );
};

export default StorageManager;
