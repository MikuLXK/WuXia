
import React, { useEffect, useState } from 'react';
import * as dbService from '../../../services/dbService';
import GameButton from '../../ui/GameButton';
import ToggleSwitch from '../../ui/ToggleSwitch';

interface Props {
    requestConfirm?: (options: { title?: string; message: string; confirmText?: string; cancelText?: string; danger?: boolean }) => Promise<boolean>;
}

const StorageManager: React.FC<Props> = ({ requestConfirm }) => {
    const [info, setInfo] = useState<dbService.StorageBreakdown>({
        usage: 0,
        quota: 0,
        details: { saves: 0, settings: 0, prompts: 0, api: 0, cache: 0 }
    });
    const [protectApiKey, setProtectApiKey] = useState(true);
    const [protectCustomPreset, setProtectCustomPreset] = useState(true);
    const [runningAction, setRunningAction] = useState<string | null>(null);
    const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const pushNotice = (type: 'success' | 'error', text: string) => {
        setNotice({ type, text });
        window.setTimeout(() => setNotice(null), 2400);
    };

    const updateInfo = async () => {
        const data = await dbService.获取详细存储信息();
        setInfo(data);
    };

    useEffect(() => {
        updateInfo();
    }, []);

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const runWithConfirm = async (
        actionKey: string,
        options: {
            title: string;
            message: string;
            confirmText?: string;
            onRun: () => Promise<void>;
            reloadAfterDone?: boolean;
        }
    ) => {
        if (runningAction) return;
        const ok = requestConfirm
            ? await requestConfirm({
                title: options.title,
                message: options.message,
                confirmText: options.confirmText || '确认',
                danger: true
            })
            : true;
        if (!ok) return;
        try {
            setRunningAction(actionKey);
            await options.onRun();
            await updateInfo();
            pushNotice('success', '操作完成');
            if (options.reloadAfterDone) {
                window.location.reload();
            }
        } catch (error: any) {
            pushNotice('error', `操作失败：${error?.message || '未知错误'}`);
        } finally {
            setRunningAction(null);
        }
    };

    const handleClearAll = async () => {
        const protectionText = [
            protectApiKey ? 'API 配置' : null,
            protectCustomPreset ? '自定义背景/天赋' : null
        ].filter(Boolean).join('、');
        await runWithConfirm('clear_all', {
            title: '清空全部数据',
            message: protectionText
                ? `确定清空全部数据吗？将保留：${protectionText}。`
                : '确定清空全部数据吗？此操作不可撤销。',
            confirmText: '清空全部',
            onRun: async () => {
                await dbService.清空全部数据({
                    保留APIKey: protectApiKey,
                    保留自定义背景天赋: protectCustomPreset
                });
            },
            reloadAfterDone: true
        });
    };

    const handleClearAllSaves = async () => {
        await runWithConfirm('clear_saves', {
            title: '删除全部存档',
            message: '确定删除全部手动/自动存档吗？',
            confirmText: '删除',
            onRun: async () => {
                await dbService.清空存档数据();
            }
        });
    };

    const handleDeleteApi = async () => {
        await runWithConfirm('delete_api', {
            title: '删除 API 配置',
            message: '确定删除 API 配置吗？删除后需要重新填写模型接口。',
            confirmText: '删除',
            onRun: async () => {
                await dbService.删除设置('api_settings');
            }
        });
    };

    const handleDeletePrompts = async () => {
        await runWithConfirm('delete_prompts', {
            title: '删除提示词配置',
            message: '确定删除当前提示词配置吗？',
            confirmText: '删除',
            onRun: async () => {
                await dbService.删除设置('prompts');
            }
        });
    };

    const handleDeleteVisualSettings = async () => {
        await runWithConfirm('delete_visual', {
            title: '删除视觉设置',
            message: '确定删除视觉设置吗？这会移除当前背景图、时间显示格式与渲染层数设置。',
            confirmText: '删除',
            onRun: async () => {
                await dbService.删除设置('visual_settings');
            }
        });
    };

    const handleDeleteFestivals = async () => {
        await runWithConfirm('delete_festivals', {
            title: '删除节日配置',
            message: '确定删除节日配置吗？',
            confirmText: '删除',
            onRun: async () => {
                await dbService.删除设置('festivals');
            }
        });
    };

    const handleDeleteGameAndMemorySettings = async () => {
        await runWithConfirm('delete_game_memory', {
            title: '删除游戏/记忆设置',
            message: '确定删除游戏设置和记忆设置吗？',
            confirmText: '删除',
            onRun: async () => {
                await dbService.批量删除设置(['game_settings', 'memory_settings']);
            }
        });
    };

    const handleDeleteCustomPreset = async () => {
        await runWithConfirm('delete_custom_preset', {
            title: '删除自定义背景/天赋',
            message: '确定删除“自定义背景图 + 自定义天赋/身份背景词条”吗？',
            confirmText: '删除',
            onRun: async () => {
                await dbService.清除自定义背景与天赋();
            }
        });
    };

    const handleClearAllSettings = async () => {
        const protectionText = [
            protectApiKey ? 'API 配置' : null,
            protectCustomPreset ? '自定义背景/天赋' : null
        ].filter(Boolean).join('、');
        await runWithConfirm('clear_all_settings', {
            title: '清空全部设置',
            message: protectionText
                ? `确定清空全部设置吗？将保留：${protectionText}。`
                : '确定清空全部设置吗？',
            confirmText: '清空设置',
            onRun: async () => {
                await dbService.清空全部设置({
                    保留APIKey: protectApiKey,
                    保留自定义背景天赋: protectCustomPreset
                });
            }
        });
    };

    const handleClearCache = async () => {
        await runWithConfirm('clear_cache', {
            title: '清除缓存',
            message: '确定清除系统缓存吗？此操作不会删除存档和设置。',
            confirmText: '清除',
            onRun: async () => {
                await dbService.清除系统缓存();
            }
        });
    };

    // Helpers for Progress Bar
    const getPercent = (val: number) => Math.min((val / (info.usage || 1)) * 100, 100);

    return (
        <div className="space-y-6 h-full flex flex-col">
            {notice && (
                <div className={`text-xs px-3 py-2 border rounded ${
                    notice.type === 'success'
                        ? 'border-green-500/40 bg-green-900/20 text-green-300'
                        : 'border-wuxia-red/40 bg-red-900/20 text-red-300'
                }`}>
                    {notice.text}
                </div>
            )}
             
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

            {/* Actions */}
            <div className="border-t border-gray-800/50 pt-4 mt-auto shrink-0">
                <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-300 select-none">清理时保留 API 配置</label>
                        <ToggleSwitch
                            checked={protectApiKey}
                            onChange={setProtectApiKey}
                            ariaLabel="切换清理时保留 API 配置"
                            disabled={Boolean(runningAction)}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-300 select-none">清理时保留自定义背景/天赋</label>
                        <ToggleSwitch
                            checked={protectCustomPreset}
                            onChange={setProtectCustomPreset}
                            ariaLabel="切换清理时保留自定义背景和天赋"
                            disabled={Boolean(runningAction)}
                        />
                    </div>
                </div>

                <GameButton
                    onClick={handleClearAll}
                    variant="danger"
                    className="w-full py-2 text-sm disabled:opacity-50"
                    disabled={Boolean(runningAction)}
                >
                    {runningAction === 'clear_all' ? '处理中...' : '清空全部数据 (重置游戏)'}
                </GameButton>

                <div className="mt-4 text-[11px] text-gray-500">
                    单项删除（按需删除某个模块数据）：
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                    <button
                        type="button"
                        className="text-left px-3 py-2 border border-wuxia-red/40 bg-black/30 hover:bg-wuxia-red/10 text-xs text-gray-200 disabled:opacity-50"
                        onClick={handleClearAllSaves}
                        disabled={Boolean(runningAction)}
                    >
                        删除全部存档
                    </button>
                    <button
                        type="button"
                        className="text-left px-3 py-2 border border-wuxia-red/40 bg-black/30 hover:bg-wuxia-red/10 text-xs text-gray-200 disabled:opacity-50"
                        onClick={handleClearCache}
                        disabled={Boolean(runningAction)}
                    >
                        清除系统缓存
                    </button>
                    <button
                        type="button"
                        className="text-left px-3 py-2 border border-wuxia-red/40 bg-black/30 hover:bg-wuxia-red/10 text-xs text-gray-200 disabled:opacity-50"
                        onClick={handleDeleteApi}
                        disabled={Boolean(runningAction)}
                    >
                        删除 API 配置
                    </button>
                    <button
                        type="button"
                        className="text-left px-3 py-2 border border-wuxia-red/40 bg-black/30 hover:bg-wuxia-red/10 text-xs text-gray-200 disabled:opacity-50"
                        onClick={handleDeletePrompts}
                        disabled={Boolean(runningAction)}
                    >
                        删除提示词配置
                    </button>
                    <button
                        type="button"
                        className="text-left px-3 py-2 border border-wuxia-red/40 bg-black/30 hover:bg-wuxia-red/10 text-xs text-gray-200 disabled:opacity-50"
                        onClick={handleDeleteFestivals}
                        disabled={Boolean(runningAction)}
                    >
                        删除节日配置
                    </button>
                    <button
                        type="button"
                        className="text-left px-3 py-2 border border-wuxia-red/40 bg-black/30 hover:bg-wuxia-red/10 text-xs text-gray-200 disabled:opacity-50"
                        onClick={handleDeleteVisualSettings}
                        disabled={Boolean(runningAction)}
                    >
                        删除视觉设置
                    </button>
                    <button
                        type="button"
                        className="text-left px-3 py-2 border border-wuxia-red/40 bg-black/30 hover:bg-wuxia-red/10 text-xs text-gray-200 disabled:opacity-50"
                        onClick={handleDeleteGameAndMemorySettings}
                        disabled={Boolean(runningAction)}
                    >
                        删除游戏/记忆设置
                    </button>
                    <button
                        type="button"
                        className="text-left px-3 py-2 border border-wuxia-red/40 bg-black/30 hover:bg-wuxia-red/10 text-xs text-gray-200 disabled:opacity-50"
                        onClick={handleDeleteCustomPreset}
                        disabled={Boolean(runningAction)}
                    >
                        删除自定义背景/天赋
                    </button>
                    <button
                        type="button"
                        className="text-left px-3 py-2 border border-wuxia-red/40 bg-black/30 hover:bg-wuxia-red/10 text-xs text-gray-200 disabled:opacity-50"
                        onClick={handleClearAllSettings}
                        disabled={Boolean(runningAction)}
                    >
                        清空全部设置
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StorageManager;
