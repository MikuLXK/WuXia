import React, { useEffect, useMemo, useState } from 'react';
import { 接口设置结构, 单接口配置结构, 功能模型占位配置结构 } from '../../../types';
import GameButton from '../../ui/GameButton';
import { 规范化接口设置 } from '../../../utils/apiConfig';

interface Props {
    settings: 接口设置结构;
    onSave: (settings: 接口设置结构) => void;
}

const RecallModelSettings: React.FC<Props> = ({ settings, onSave }) => {
    const [form, setForm] = useState<接口设置结构>(() => 规范化接口设置(settings));
    const [modelOptions, setModelOptions] = useState<string[]>([]);
    const [loadingModels, setLoadingModels] = useState(false);
    const [message, setMessage] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        const normalized = 规范化接口设置(settings);
        setForm(normalized);
        setModelOptions([]);
    }, [settings]);

    const activeConfig = useMemo<单接口配置结构 | null>(() => {
        if (!form.configs.length) return null;
        const selected = form.configs.find((cfg) => cfg.id === form.activeConfigId);
        return selected || form.configs[0] || null;
    }, [form.activeConfigId, form.configs]);

    const 主剧情解析模型 = useMemo(() => {
        return (form.功能模型占位.主剧情使用模型 || '').trim();
    }, [form.功能模型占位.主剧情使用模型]);

    const 独立模型开启 = Boolean(form.功能模型占位.剧情回忆独立模型开关);

    const updatePlaceholder = <K extends keyof 功能模型占位配置结构>(key: K, value: 功能模型占位配置结构[K]) => {
        setForm(prev => ({
            ...prev,
            功能模型占位: {
                ...prev.功能模型占位,
                [key]: value
            }
        }));
    };

    const fetchModelsFromCurrentConfig = async (): Promise<string[] | null> => {
        if (!activeConfig?.apiKey || !activeConfig?.baseUrl) {
            setMessage('请先在接口连接里填写当前启用配置的 API Key 和 Base URL。');
            return null;
        }
        try {
            const url = activeConfig.baseUrl.replace(/\/+$/, '') + '/models';
            const res = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${activeConfig.apiKey}`
                }
            });
            const data = await res.json();
            if (data && Array.isArray(data.data)) {
                return data.data.map((m: any) => m?.id).filter(Boolean);
            }
            setMessage('获取失败：返回格式错误。');
            return null;
        } catch (e: any) {
            setMessage(`获取失败：${e.message}`);
            return null;
        }
    };

    const handleFetchModels = async () => {
        setLoadingModels(true);
        setMessage('');
        const models = await fetchModelsFromCurrentConfig();
        if (models) {
            setModelOptions(models);
            setMessage('剧情回忆模型列表获取成功。');
        }
        setLoadingModels(false);
    };

    const handleToggleIndependent = (checked: boolean) => {
        setForm(prev => {
            const currentModel = (prev.功能模型占位.剧情回忆使用模型 || '').trim();
            return {
                ...prev,
                功能模型占位: {
                    ...prev.功能模型占位,
                    剧情回忆独立模型开关: checked,
                    剧情回忆使用模型: checked ? (currentModel || 主剧情解析模型 || '') : ''
                }
            };
        });
    };

    const handleSave = () => {
        if (独立模型开启 && !(form.功能模型占位.剧情回忆使用模型 || '').trim()) {
            setMessage('已开启剧情回忆独立模型，请先获取列表并选择模型。');
            return;
        }
        const normalized = 规范化接口设置(form);
        onSave(normalized);
        setForm(normalized);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
    };

    const recallModelValue = (form.功能模型占位.剧情回忆使用模型 || '').trim();
    const recallModelDisplay = 独立模型开启 ? recallModelValue : 主剧情解析模型;
    const selectOptions = Array.from(
        new Set(
            [
                ...modelOptions,
                recallModelValue,
                主剧情解析模型
            ]
                .map(item => (item || '').trim())
                .filter(Boolean)
        )
    );

    return (
        <div className="space-y-6 text-sm animate-fadeIn">
            <div className="flex justify-between items-center border-b border-wuxia-gold/30 pb-3 mb-6">
                <h3 className="text-wuxia-gold font-serif font-bold text-xl">剧情回忆模型</h3>
            </div>

            <div className="rounded-md border border-wuxia-gold/20 bg-black/25 p-4 space-y-4">
                <div className="text-[11px] text-gray-400">
                    当前启用接口配置：{activeConfig?.名称 || '未配置'}。剧情回忆检索使用该配置的地址和密钥，仅模型可单独选择。
                </div>

                <label className="flex items-center justify-between gap-3 text-xs text-gray-300">
                    <span>开启剧情回忆独立模型</span>
                    <input
                        type="checkbox"
                        checked={独立模型开启}
                        onChange={(e) => handleToggleIndependent(e.target.checked)}
                        className="h-4 w-4"
                    />
                </label>

                <div className="flex gap-3 items-end">
                    <div className="flex-1 space-y-1">
                        <label className="text-xs text-gray-300">剧情回忆使用模型</label>
                        <select
                            value={recallModelDisplay}
                            onChange={(e) => updatePlaceholder('剧情回忆使用模型', e.target.value)}
                            disabled={!独立模型开启}
                            className={`w-full bg-black/50 border p-2.5 text-white outline-none rounded-md ${
                                独立模型开启 ? 'border-gray-600 focus:border-wuxia-gold' : 'border-gray-700 opacity-70 cursor-not-allowed'
                            }`}
                        >
                            <option value="" disabled>
                                {!独立模型开启
                                    ? `跟随主剧情模型：${主剧情解析模型 || '未设置'}`
                                    : (selectOptions.length ? '请选择模型' : '请先点击获取列表')}
                            </option>
                            {selectOptions.map(model => (
                                <option key={`recall-model-${model}`} value={model}>
                                    {model}
                                </option>
                            ))}
                        </select>
                    </div>
                    <GameButton
                        onClick={handleFetchModels}
                        variant="secondary"
                        className="px-4 py-2 text-xs"
                        disabled={loadingModels}
                    >
                        {loadingModels ? '...' : '获取列表'}
                    </GameButton>
                </div>

                {!独立模型开启 && (
                    <div className="text-[11px] text-gray-400">
                        当前输出：与主剧情模型同步 {主剧情解析模型 ? `（${主剧情解析模型}）` : '（未设置主剧情模型）'}
                    </div>
                )}
            </div>

            <div className="rounded-md border border-wuxia-cyan/25 bg-black/20 p-4 space-y-4">
                <div className="text-xs text-wuxia-cyan font-bold">剧情回忆检索策略（本地设置）</div>

                <label className="flex items-center justify-between gap-3 text-xs text-gray-300">
                    <span>静默操作（不弹确认，自动附加回忆）</span>
                    <input
                        type="checkbox"
                        checked={Boolean(form.功能模型占位.剧情回忆静默确认)}
                        onChange={(e) => updatePlaceholder('剧情回忆静默确认', e.target.checked)}
                        className="h-4 w-4"
                    />
                </label>

                <div className="space-y-1">
                    <label className="text-xs text-gray-300">完整原文回忆条数（最近 N 条）</label>
                    <input
                        type="number"
                        min={1}
                        max={100}
                        value={Number(form.功能模型占位.剧情回忆完整原文条数N || 20)}
                        onChange={(e) => updatePlaceholder('剧情回忆完整原文条数N', Math.max(1, Number(e.target.value) || 20))}
                        className="w-full bg-black/50 border border-gray-700 p-2 text-white rounded-md outline-none focus:border-wuxia-gold"
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-xs text-gray-300">在第几回合前不触发剧情回忆检索</label>
                    <input
                        type="number"
                        min={1}
                        max={9999}
                        value={Number(form.功能模型占位.剧情回忆最早触发回合 || 10)}
                        onChange={(e) => updatePlaceholder('剧情回忆最早触发回合', Math.max(1, Number(e.target.value) || 10))}
                        className="w-full bg-black/50 border border-gray-700 p-2 text-white rounded-md outline-none focus:border-wuxia-gold"
                    />
                    <div className="text-[11px] text-gray-500">
                        例如填写 6，则回合 1-5 不调用剧情回忆 API，从第 6 回合开始启用。
                    </div>
                </div>
            </div>

            {message && <p className="text-xs text-wuxia-cyan animate-pulse">{message}</p>}

            <div className="pt-6 border-t border-wuxia-gold/20 mt-8">
                <GameButton onClick={handleSave} variant="primary" className="w-full">
                    {showSuccess ? '✔ 配置已保存' : '保存设置'}
                </GameButton>
            </div>
        </div>
    );
};

export default RecallModelSettings;
