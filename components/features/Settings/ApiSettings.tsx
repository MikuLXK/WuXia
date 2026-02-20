import React, { useEffect, useMemo, useState } from 'react';
import {
    接口设置结构,
    接口供应商类型,
    OpenAI兼容方案类型,
    功能模型占位配置结构,
    单接口配置结构
} from '../../../types';
import GameButton from '../../ui/GameButton';
import {
    创建接口配置模板,
    OpenAI兼容方案预设,
    供应商标签,
    规范化接口设置
} from '../../../utils/apiConfig';

interface Props {
    settings: 接口设置结构;
    onSave: (settings: 接口设置结构) => void;
}

type 功能模型字段 = '主剧情使用模型' | '世界演变使用模型' | '变量计算使用模型' | '文章优化使用模型';
type 功能模型开关字段 = '世界演变独立模型开关' | '变量计算独立模型开关' | '文章优化独立模型开关';

type 功能模型行 = {
    id: string;
    modelKey: 功能模型字段;
    switchKey?: 功能模型开关字段;
    label: string;
    hint: string;
};

const providerOptions: 接口供应商类型[] = ['gemini', 'claude', 'openai', 'deepseek', 'openai_compatible'];

const 功能模型行配置: 功能模型行[] = [
    { id: 'main', modelKey: '主剧情使用模型', label: '主剧情使用模型（必选）', hint: '请先获取列表后选择主剧情模型' },
    { id: 'world', modelKey: '世界演变使用模型', switchKey: '世界演变独立模型开关', label: '世界演变使用模型（占位）', hint: '例如：gemini-2.0-flash' },
    { id: 'vars', modelKey: '变量计算使用模型', switchKey: '变量计算独立模型开关', label: '变量计算使用模型（占位）', hint: '例如：deepseek-chat' },
    { id: 'polish', modelKey: '文章优化使用模型', switchKey: '文章优化独立模型开关', label: '文章优化使用模型（占位）', hint: '例如：claude-3-5-sonnet-latest' }
];

const 初始化功能模型列表 = (): Record<功能模型字段, string[]> => ({
    主剧情使用模型: [],
    世界演变使用模型: [],
    变量计算使用模型: [],
    文章优化使用模型: []
});

const 初始化功能加载状态 = (): Record<功能模型字段, boolean> => ({
    主剧情使用模型: false,
    世界演变使用模型: false,
    变量计算使用模型: false,
    文章优化使用模型: false
});

const ApiSettings: React.FC<Props> = ({ settings, onSave }) => {
    const [form, setForm] = useState<接口设置结构>(() => 规范化接口设置(settings));
    const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
    const [featureModelOptions, setFeatureModelOptions] = useState<Record<功能模型字段, string[]>>(初始化功能模型列表);
    const [featureModelLoading, setFeatureModelLoading] = useState<Record<功能模型字段, boolean>>(初始化功能加载状态);
    const [message, setMessage] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);
    const [newProvider, setNewProvider] = useState<接口供应商类型>('openai');
    const [newCompatiblePreset, setNewCompatiblePreset] = useState<OpenAI兼容方案类型>('custom');

    useEffect(() => {
        const normalized = 规范化接口设置(settings);
        setForm(normalized);
        setSelectedConfigId(normalized.activeConfigId || normalized.configs[0]?.id || null);
        setFeatureModelOptions(初始化功能模型列表());
        setFeatureModelLoading(初始化功能加载状态());
    }, [settings]);

    const activeConfig = useMemo<单接口配置结构 | null>(() => {
        if (!form.configs.length) return null;
        const selected = form.configs.find((cfg) => cfg.id === selectedConfigId);
        return selected || form.configs[0] || null;
    }, [form.configs, selectedConfigId]);

    const 主剧情解析模型 = useMemo(() => {
        return (form.功能模型占位.主剧情使用模型 || '').trim();
    }, [form.功能模型占位.主剧情使用模型]);

    const updateActiveConfig = (patch: Partial<单接口配置结构>) => {
        if (!activeConfig) return;
        setForm(prev => ({
            ...prev,
            activeConfigId: activeConfig.id,
            configs: prev.configs.map(cfg => cfg.id === activeConfig.id ? { ...cfg, ...patch, updatedAt: Date.now() } : cfg)
        }));
    };

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
            setMessage('请先填写当前配置的 API Key 和 Base URL');
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
            setMessage('获取失败: 返回格式错误');
            return null;
        } catch (e: any) {
            setMessage(`获取失败: ${e.message}`);
            return null;
        }
    };

    const handleFetchFeatureModels = async (key: 功能模型字段, label: string) => {
        setFeatureModelLoading(prev => ({ ...prev, [key]: true }));
        setMessage('');
        const result = await fetchModelsFromCurrentConfig();
        if (result) {
            setFeatureModelOptions(prev => ({ ...prev, [key]: result }));
            setMessage(`${label}获取模型列表成功`);
        }
        setFeatureModelLoading(prev => ({ ...prev, [key]: false }));
    };

    const handleToggleFeatureIndependent = (switchKey: 功能模型开关字段, modelKey: 功能模型字段, checked: boolean) => {
        setForm(prev => {
            const currentModel = (prev.功能模型占位[modelKey] || '').trim();
            const nextModel = checked
                ? (currentModel || 主剧情解析模型 || '')
                : '';
            return {
                ...prev,
                功能模型占位: {
                    ...prev.功能模型占位,
                    [switchKey]: checked,
                    [modelKey]: nextModel
                }
            };
        });
    };

    const handleCreateConfig = () => {
        const created = 创建接口配置模板(newProvider, {
            compatiblePreset: newProvider === 'openai_compatible' ? newCompatiblePreset : undefined
        });
        setForm(prev => {
            const nextConfigs = [...prev.configs, created];
            return {
                ...prev,
                activeConfigId: created.id,
                configs: nextConfigs
            };
        });
        setSelectedConfigId(created.id);
        setFeatureModelOptions(初始化功能模型列表());
        setFeatureModelLoading(初始化功能加载状态());
        setMessage(`已新增 ${供应商标签[newProvider]} 配置，请填写后保存。`);
    };

    const handleDeleteActive = () => {
        if (!activeConfig) return;
        setForm(prev => {
            const nextConfigs = prev.configs.filter(cfg => cfg.id !== activeConfig.id);
            const fallbackId = nextConfigs[0]?.id || null;
            setSelectedConfigId(fallbackId);
            return {
                ...prev,
                activeConfigId: fallbackId,
                configs: nextConfigs
            };
        });
        setFeatureModelOptions(初始化功能模型列表());
        setFeatureModelLoading(初始化功能加载状态());
        setMessage('配置已删除。');
    };

    const handleSave = () => {
        if (!form.功能模型占位.主剧情使用模型.trim()) {
            setMessage('主剧情使用模型为必选项，请先获取模型列表并选择。');
            return;
        }
        const normalized = 规范化接口设置({
            ...form,
            activeConfigId: selectedConfigId || form.activeConfigId
        });
        onSave(normalized);
        setForm(normalized);
        setSelectedConfigId(normalized.activeConfigId || normalized.configs[0]?.id || null);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
    };

    return (
        <div className="space-y-6 text-sm animate-fadeIn">
            <div className="flex justify-between items-center border-b border-wuxia-gold/30 pb-3 mb-6">
                <h3 className="text-wuxia-gold font-serif font-bold text-xl">接口配置中心</h3>
            </div>

            <div className="rounded-md border border-wuxia-gold/20 bg-black/30 p-4 space-y-4">
                <div className="text-xs text-gray-400">当前支持：Gemini / Claude / OpenAI / DeepSeek / OpenAI 兼容方案</div>
                <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                    <div className="space-y-2">
                        <label className="text-sm text-wuxia-cyan font-bold">新建配置 - 供应商</label>
                        <select
                            value={newProvider}
                            onChange={(e) => setNewProvider(e.target.value as 接口供应商类型)}
                            className="w-full bg-black/60 border border-gray-700 p-2.5 text-white outline-none rounded-md"
                        >
                            {providerOptions.map(provider => (
                                <option key={provider} value={provider}>{供应商标签[provider]}</option>
                            ))}
                        </select>
                    </div>

                    {newProvider === 'openai_compatible' && (
                        <div className="space-y-2">
                            <label className="text-sm text-wuxia-cyan font-bold">OpenAI 兼容方案</label>
                            <select
                                value={newCompatiblePreset}
                                onChange={(e) => setNewCompatiblePreset(e.target.value as OpenAI兼容方案类型)}
                                className="w-full bg-black/60 border border-gray-700 p-2.5 text-white outline-none rounded-md"
                            >
                                {(Object.keys(OpenAI兼容方案预设) as OpenAI兼容方案类型[]).map(preset => (
                                    <option key={preset} value={preset}>{OpenAI兼容方案预设[preset].label}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="md:self-end">
                        <GameButton onClick={handleCreateConfig} variant="secondary" className="w-full md:w-auto">新建配置</GameButton>
                    </div>
                </div>
            </div>

            {form.configs.length === 0 ? (
                <div className="rounded-md border border-dashed border-gray-700 bg-black/20 p-6 text-center text-gray-400">
                    还没有任何接口配置，请先点击上方“新建配置”。
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                    <div className="space-y-2 max-h-[320px] overflow-y-auto custom-scrollbar pr-1">
                        {form.configs.map(cfg => (
                            <button
                                key={cfg.id}
                                onClick={() => {
                                    setSelectedConfigId(cfg.id);
                                    setForm(prev => ({ ...prev, activeConfigId: cfg.id }));
                                    setFeatureModelOptions(初始化功能模型列表());
                                    setFeatureModelLoading(初始化功能加载状态());
                                }}
                                className={`w-full text-left rounded-md border px-3 py-2 transition-colors ${
                                    activeConfig?.id === cfg.id
                                        ? 'border-wuxia-gold bg-wuxia-gold/10 text-wuxia-gold'
                                        : 'border-gray-700 bg-black/40 text-gray-300 hover:border-gray-500'
                                }`}
                            >
                                <div className="font-bold truncate">{cfg.名称 || '未命名配置'}</div>
                                <div className="text-[11px] opacity-80 truncate">{供应商标签[cfg.供应商]}</div>
                            </button>
                        ))}
                    </div>

                    {activeConfig && (
                        <div className="space-y-4">
                            <div className="grid gap-3 md:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-sm text-wuxia-cyan font-bold">配置名称</label>
                                    <input
                                        type="text"
                                        value={activeConfig.名称}
                                        onChange={(e) => updateActiveConfig({ 名称: e.target.value })}
                                        placeholder="例如：主线生成配置"
                                        className="w-full bg-black/50 border-2 border-transparent focus:border-wuxia-gold p-3 text-white outline-none rounded-md transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm text-wuxia-cyan font-bold">供应商</label>
                                    <input
                                        type="text"
                                        value={供应商标签[activeConfig.供应商]}
                                        disabled
                                        className="w-full bg-black/40 border border-gray-700 p-3 text-gray-400 rounded-md"
                                    />
                                </div>
                            </div>

                            {activeConfig.供应商 === 'openai_compatible' && (
                                <div className="space-y-2">
                                    <label className="text-sm text-wuxia-cyan font-bold">OpenAI 兼容方案</label>
                                    <select
                                        value={activeConfig.兼容方案 || 'custom'}
                                        onChange={(e) => {
                                            const nextPreset = e.target.value as OpenAI兼容方案类型;
                                            const presetUrl = OpenAI兼容方案预设[nextPreset].baseUrl;
                                            updateActiveConfig({
                                                兼容方案: nextPreset,
                                                baseUrl: presetUrl || activeConfig.baseUrl
                                            });
                                        }}
                                        className="w-full bg-black/60 border border-gray-700 p-2.5 text-white outline-none rounded-md"
                                    >
                                        {(Object.keys(OpenAI兼容方案预设) as OpenAI兼容方案类型[]).map(preset => (
                                            <option key={preset} value={preset}>{OpenAI兼容方案预设[preset].label}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm text-wuxia-cyan font-bold">接口地址 (Base URL)</label>
                                <input
                                    type="text"
                                    value={activeConfig.baseUrl}
                                    onChange={(e) => updateActiveConfig({ baseUrl: e.target.value })}
                                    placeholder="https://api.openai.com/v1"
                                    className="w-full bg-black/50 border-2 border-transparent focus:border-wuxia-gold p-3 text-white outline-none rounded-md transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-wuxia-cyan font-bold">密钥 (API Key)</label>
                                <input
                                    type="password"
                                    value={activeConfig.apiKey}
                                    onChange={(e) => updateActiveConfig({ apiKey: e.target.value })}
                                    placeholder="sk-..."
                                    className="w-full bg-black/50 border-2 border-transparent focus:border-wuxia-gold p-3 text-white outline-none rounded-md transition-all"
                                />
                            </div>

                            <div className="pt-2">
                                <GameButton onClick={handleDeleteActive} variant="danger" className="w-full">
                                    删除当前配置
                                </GameButton>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="rounded-md border border-wuxia-gold/20 bg-black/25 p-4 space-y-4">
                <h4 className="text-wuxia-gold font-serif font-bold">模型拆分与功能占位</h4>
                <div className="text-[11px] text-gray-400">默认跟随主剧情模型。仅在开启“独立模型”后，该功能才使用单独模型配置。</div>

                <div className="grid gap-3 grid-cols-1">
                    {功能模型行配置.map((row) => {
                        const isMain = row.modelKey === '主剧情使用模型';
                        const independentEnabled = row.switchKey ? Boolean(form.功能模型占位[row.switchKey]) : true;
                        const rawValue = (form.功能模型占位[row.modelKey] || '') as string;
                        const displayValue = isMain
                            ? rawValue
                            : (independentEnabled ? rawValue : 主剧情解析模型);
                        const options = Array.from(
                            new Set(
                                [
                                    ...featureModelOptions[row.modelKey],
                                    rawValue,
                                    主剧情解析模型
                                ]
                                    .map(item => (item || '').trim())
                                    .filter(Boolean)
                            )
                        );
                        const disabled = !isMain && !independentEnabled;
                        const loading = featureModelLoading[row.modelKey];

                        return (
                            <div key={row.id} className="rounded-md border border-gray-700/70 bg-black/40 p-3 space-y-2">
                                <div className="flex items-center justify-between gap-3">
                                    <label className="text-sm text-wuxia-cyan font-bold">{row.label}</label>
                                    {row.switchKey && (
                                        <label className="flex items-center gap-2 text-xs text-gray-300">
                                            <span>独立模型</span>
                                            <input
                                                type="checkbox"
                                                checked={independentEnabled}
                                                onChange={(e) => handleToggleFeatureIndependent(row.switchKey!, row.modelKey, e.target.checked)}
                                                className="h-4 w-4"
                                            />
                                        </label>
                                    )}
                                </div>

                                <div className="flex gap-3 items-end">
                                    <div className="flex-1">
                                        <select
                                            value={displayValue}
                                            onChange={(e) => updatePlaceholder(row.modelKey, e.target.value)}
                                            disabled={disabled}
                                            className={`w-full bg-black/50 border p-2.5 text-white outline-none rounded-md ${
                                                disabled ? 'border-gray-700 opacity-70 cursor-not-allowed' : 'border-gray-600 focus:border-wuxia-gold'
                                            }`}
                                        >
                                            <option value="" disabled>
                                                {disabled ? `跟随主剧情模型：${主剧情解析模型 || '未设置'}` : (options.length ? '请选择模型' : '请先点击获取列表')}
                                            </option>
                                            {options.map(model => (
                                                <option key={`${row.id}-${model}`} value={model}>
                                                    {model}
                                                </option>
                                            ))}
                                        </select>
                                        {!disabled && options.length === 0 && (
                                            <div className="text-[11px] text-gray-500 mt-1">{row.hint}</div>
                                        )}
                                    </div>
                                    <GameButton
                                        onClick={() => handleFetchFeatureModels(row.modelKey, row.label)}
                                        variant="secondary"
                                        className="px-4 py-2 text-xs"
                                        disabled={loading}
                                    >
                                        {loading ? '...' : '获取列表'}
                                    </GameButton>
                                </div>

                                {!isMain && !independentEnabled && (
                                    <div className="text-[11px] text-gray-400">
                                        当前输出：与主剧情模型同步 {主剧情解析模型 ? `（${主剧情解析模型}）` : '（未设置主剧情模型）'}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

            </div>

            {message && <p className="text-xs text-wuxia-cyan animate-pulse">{message}</p>}

            <div className="pt-6 border-t border-wuxia-gold/20 mt-8">
                <GameButton onClick={handleSave} variant="primary" className="w-full">
                    {showSuccess ? '✔ 配置已保存' : '保存配置'}
                </GameButton>
            </div>
        </div>
    );
};

export default ApiSettings;
