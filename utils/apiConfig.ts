import {
    接口设置结构,
    单接口配置结构,
    接口供应商类型,
    OpenAI兼容方案类型,
    功能模型占位配置结构,
    请求协议覆盖类型
} from '../models/system';

export const 供应商标签: Record<接口供应商类型, string> = {
    gemini: 'Gemini',
    claude: 'Claude',
    openai: 'OpenAI',
    deepseek: 'DeepSeek',
    openai_compatible: 'OpenAI 兼容'
};

export const OpenAI兼容方案预设: Record<OpenAI兼容方案类型, { label: string; baseUrl: string }> = {
    custom: { label: '自定义', baseUrl: '' },
    openrouter: { label: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1' },
    siliconflow: { label: 'SiliconFlow', baseUrl: 'https://api.siliconflow.cn/v1' },
    together: { label: 'Together', baseUrl: 'https://api.together.xyz/v1' },
    groq: { label: 'Groq', baseUrl: 'https://api.groq.com/openai/v1' }
};

export const 请求协议覆盖标签: Record<请求协议覆盖类型, string> = {
    auto: '自动识别',
    openai: 'OpenAI 协议',
    gemini: 'Gemini 协议',
    claude: 'Claude 协议',
    deepseek: 'DeepSeek 协议'
};

export const 默认功能模型占位: 功能模型占位配置结构 = {
    主剧情使用模型: '',
    剧情回忆独立模型开关: false,
    剧情回忆静默确认: false,
    剧情回忆完整原文条数N: 20,
    剧情回忆最早触发回合: 10,
    世界演变独立模型开关: false,
    变量计算独立模型开关: false,
    文章优化独立模型开关: false,
    剧情回忆使用模型: '',
    世界演变使用模型: '',
    变量计算使用模型: '',
    文章优化使用模型: ''
};

const 供应商默认值: Record<接口供应商类型, { baseUrl: string; model: string }> = {
    gemini: {
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
        model: 'gemini-2.0-flash'
    },
    claude: {
        baseUrl: '',
        model: 'claude-3-5-sonnet-latest'
    },
    openai: {
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini'
    },
    deepseek: {
        baseUrl: 'https://api.deepseek.com/v1',
        model: 'deepseek-chat'
    },
    openai_compatible: {
        baseUrl: '',
        model: 'gpt-4o-mini'
    }
};

const 生成配置ID = (): string => `api_cfg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const 读取字符串 = (value: unknown, fallback = ''): string => {
    return typeof value === 'string' ? value : fallback;
};

const 读取正整数 = (value: unknown): number | undefined => {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        return Math.floor(value);
    }
    if (typeof value === 'string') {
        const cleaned = value.trim();
        if (!cleaned) return undefined;
        const parsed = Number(cleaned);
        if (Number.isFinite(parsed) && parsed > 0) {
            return Math.floor(parsed);
        }
    }
    return undefined;
};

const 读取温度值 = (value: unknown): number | undefined => {
    const 归一化 = (raw: number): number | undefined => {
        if (!Number.isFinite(raw)) return undefined;
        if (raw < 0 || raw > 2) return undefined;
        return Math.round(raw * 100) / 100;
    };

    if (typeof value === 'number') return 归一化(value);
    if (typeof value === 'string') {
        const cleaned = value.trim();
        if (!cleaned) return undefined;
        const parsed = Number(cleaned);
        return 归一化(parsed);
    }
    return undefined;
};

const 推断供应商 = (baseUrlRaw: unknown): 接口供应商类型 => {
    const baseUrl = 读取字符串(baseUrlRaw).toLowerCase();
    if (!baseUrl) return 'openai';
    if (baseUrl.includes('generativelanguage.googleapis.com') || baseUrl.includes('googleapis.com')) return 'gemini';
    if (baseUrl.includes('deepseek')) return 'deepseek';
    if (baseUrl.includes('anthropic') || baseUrl.includes('claude')) return 'claude';
    if (baseUrl.includes('openrouter') || baseUrl.includes('siliconflow') || baseUrl.includes('together') || baseUrl.includes('groq')) {
        return 'openai_compatible';
    }
    if (baseUrl.includes('openai')) return 'openai';
    return 'openai_compatible';
};

const 标准化供应商 = (value: unknown, fallback: 接口供应商类型): 接口供应商类型 => {
    if (value === 'gemini' || value === 'claude' || value === 'openai' || value === 'deepseek' || value === 'openai_compatible') {
        return value;
    }
    return fallback;
};

const 标准化兼容方案 = (value: unknown): OpenAI兼容方案类型 => {
    if (value === 'custom' || value === 'openrouter' || value === 'siliconflow' || value === 'together' || value === 'groq') {
        return value;
    }
    return 'custom';
};

const 标准化协议覆盖 = (value: unknown): 请求协议覆盖类型 => {
    if (value === 'auto' || value === 'openai' || value === 'gemini' || value === 'claude' || value === 'deepseek') {
        return value;
    }
    return 'auto';
};

const 标准化单配置 = (raw: any, index: number): 单接口配置结构 => {
    const now = Date.now();
    const fallbackSupplier = 推断供应商(raw?.baseUrl);
    const supplier = 标准化供应商(raw?.供应商 ?? raw?.provider, fallbackSupplier);
    const compatiblePreset = 标准化兼容方案(raw?.兼容方案 ?? raw?.compatiblePreset);
    const defaultPreset = 供应商默认值[supplier];

    const id = 读取字符串(raw?.id).trim() || 生成配置ID();
    const nameFallback = `${供应商标签[supplier]} 配置 ${index + 1}`;
    const name = 读取字符串(raw?.名称 ?? raw?.name, nameFallback).trim() || nameFallback;
    const baseUrl = 读取字符串(raw?.baseUrl, defaultPreset.baseUrl).trim();
    const apiKey = 读取字符串(raw?.apiKey).trim();
    const model = 读取字符串(raw?.model, defaultPreset.model).trim() || defaultPreset.model;
    const maxTokens = 读取正整数(raw?.maxTokens ?? raw?.max_tokens);
    const temperature = 读取温度值(raw?.temperature);
    const 协议覆盖 = 标准化协议覆盖(raw?.协议覆盖 ?? raw?.protocolOverride);

    const createdAt = typeof raw?.createdAt === 'number' && Number.isFinite(raw.createdAt) ? raw.createdAt : now;
    const updatedAt = typeof raw?.updatedAt === 'number' && Number.isFinite(raw.updatedAt) ? raw.updatedAt : now;

    return {
        id,
        名称: name,
        供应商: supplier,
        兼容方案: supplier === 'openai_compatible' ? compatiblePreset : undefined,
        协议覆盖,
        baseUrl,
        apiKey,
        model,
        maxTokens,
        temperature,
        createdAt,
        updatedAt
    };
};

const 标准化功能模型占位 = (raw: any): 功能模型占位配置结构 => {
    const legacyGlobal = Boolean(raw?.独立配置模型开关);
    return {
        主剧情使用模型: 读取字符串(raw?.主剧情使用模型),
        剧情回忆独立模型开关: typeof raw?.剧情回忆独立模型开关 === 'boolean' ? raw.剧情回忆独立模型开关 : legacyGlobal,
        剧情回忆静默确认: Boolean(raw?.剧情回忆静默确认),
        剧情回忆完整原文条数N: Math.max(1, Number(raw?.剧情回忆完整原文条数N) || 20),
        剧情回忆最早触发回合: Math.max(1, Number(raw?.剧情回忆最早触发回合) || 10),
        世界演变独立模型开关: typeof raw?.世界演变独立模型开关 === 'boolean' ? raw.世界演变独立模型开关 : legacyGlobal,
        变量计算独立模型开关: typeof raw?.变量计算独立模型开关 === 'boolean' ? raw.变量计算独立模型开关 : legacyGlobal,
        文章优化独立模型开关: typeof raw?.文章优化独立模型开关 === 'boolean' ? raw.文章优化独立模型开关 : legacyGlobal,
        剧情回忆使用模型: 读取字符串(raw?.剧情回忆使用模型),
        世界演变使用模型: 读取字符串(raw?.世界演变使用模型),
        变量计算使用模型: 读取字符串(raw?.变量计算使用模型),
        文章优化使用模型: 读取字符串(raw?.文章优化使用模型)
    };
};

export const 创建空接口设置 = (): 接口设置结构 => ({
    activeConfigId: null,
    configs: [],
    功能模型占位: { ...默认功能模型占位 }
});

export const 创建接口配置模板 = (
    supplier: 接口供应商类型,
    options?: { compatiblePreset?: OpenAI兼容方案类型 }
): 单接口配置结构 => {
    const now = Date.now();
    const preset = 供应商默认值[supplier];
    const compatiblePreset = supplier === 'openai_compatible'
        ? 标准化兼容方案(options?.compatiblePreset)
        : undefined;

    return {
        id: 生成配置ID(),
        名称: `${供应商标签[supplier]} 配置`,
        供应商: supplier,
        兼容方案: compatiblePreset,
        协议覆盖: 'auto',
        baseUrl: supplier === 'openai_compatible' && compatiblePreset
            ? OpenAI兼容方案预设[compatiblePreset].baseUrl
            : preset.baseUrl,
        apiKey: '',
        model: preset.model,
        maxTokens: undefined,
        temperature: undefined,
        createdAt: now,
        updatedAt: now
    };
};

export const 规范化接口设置 = (raw: unknown): 接口设置结构 => {
    if (!raw || typeof raw !== 'object') {
        return 创建空接口设置();
    }

    const source = raw as any;
    let configs: 单接口配置结构[] = [];

    if (Array.isArray(source.configs)) {
        configs = source.configs.map((item: any, index: number) => 标准化单配置(item, index));
    } else if (typeof source.baseUrl === 'string' || typeof source.apiKey === 'string' || typeof source.model === 'string') {
        configs = [
            标准化单配置(
                {
                    id: 'legacy_config',
                    名称: '旧版迁移配置',
                    供应商: 推断供应商(source.baseUrl),
                    baseUrl: source.baseUrl,
                    apiKey: source.apiKey,
                    model: source.model
                },
                0
            )
        ];
    }

    const activeConfigId = (() => {
        const candidate = 读取字符串(source.activeConfigId).trim();
        if (!candidate) return configs[0]?.id || null;
        return configs.some((cfg) => cfg.id === candidate) ? candidate : (configs[0]?.id || null);
    })();

    return {
        activeConfigId,
        configs,
        功能模型占位: 标准化功能模型占位(source.功能模型占位)
    };
};

export type 当前可用接口结构 = Pick<单接口配置结构, 'id' | '名称' | '供应商' | '协议覆盖' | 'baseUrl' | 'apiKey' | 'model' | 'maxTokens' | 'temperature'>;

export const 获取当前接口配置 = (settings: 接口设置结构): 当前可用接口结构 | null => {
    if (!settings || !Array.isArray(settings.configs) || settings.configs.length === 0) return null;
    const active = settings.configs.find(cfg => cfg.id === settings.activeConfigId) || settings.configs[0];
    if (!active) return null;
    return {
        id: active.id,
        名称: active.名称,
        供应商: active.供应商,
        协议覆盖: active.协议覆盖 || 'auto',
        baseUrl: active.baseUrl,
        apiKey: active.apiKey,
        model: active.model,
        maxTokens: active.maxTokens,
        temperature: active.temperature
    };
};

export const 获取主剧情接口配置 = (settings: 接口设置结构): 当前可用接口结构 | null => {
    const current = 获取当前接口配置(settings);
    if (!current) return null;
    const mainModel = 读取字符串((settings as any)?.功能模型占位?.主剧情使用模型).trim();
    if (!mainModel) return null;
    return {
        ...current,
        model: mainModel
    };
};

export const 获取剧情回忆接口配置 = (settings: 接口设置结构): 当前可用接口结构 | null => {
    const current = 获取当前接口配置(settings);
    if (!current) return null;
    const enabled = Boolean((settings as any)?.功能模型占位?.剧情回忆独立模型开关);
    if (!enabled) return null;
    const recallModel = 读取字符串((settings as any)?.功能模型占位?.剧情回忆使用模型).trim();
    if (!recallModel) return null;
    return {
        ...current,
        model: recallModel
    };
};

export const 接口配置是否可用 = (config: 当前可用接口结构 | null): config is 当前可用接口结构 => {
    if (!config) return false;
    return Boolean(config.baseUrl?.trim() && config.apiKey?.trim());
};
