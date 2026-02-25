import { GameResponse, JSON模式设置 } from '../types';
import type { 当前可用接口结构 } from '../utils/apiConfig';
import { parseJsonWithRepair } from '../utils/jsonRepair';
import { 世界观生成系统提示词, 构建世界观生成用户提示词 } from '../prompts/runtime/worldGeneration';
import { 默认COT伪装历史消息提示词 } from '../prompts/runtime/defaults';

type 通用消息角色 = 'system' | 'user' | 'assistant';

type 通用消息 = {
    role: 通用消息角色;
    content: string;
};

type 请求协议类型 = 'openai' | 'gemini' | 'claude' | 'deepseek';

interface StoryStreamOptions {
    stream?: boolean;
    onDelta?: (delta: string, accumulated: string) => void;
}

interface StoryRequestOptions {
    enableCotInjection?: boolean;
    cotPseudoHistoryPrompt?: string;
    leadingSystemPrompt?: string;
    styleAssistantPrompt?: string;
    outputProtocolPrompt?: string;
    lengthRequirementPrompt?: string;
    disclaimerRequirementPrompt?: string;
    errorDetailLimit?: number;
}

export interface ConnectionTestResult {
    ok: boolean;
    detail: string;
}

export interface StoryResponseResult {
    response: GameResponse;
    rawText: string;
}

export class StoryResponseParseError extends Error {
    rawText: string;
    parseDetail?: string;

    constructor(message: string, rawText: string, parseDetail?: string) {
        super(message);
        this.name = 'StoryResponseParseError';
        this.rawText = rawText;
        this.parseDetail = parseDetail;
    }
}

interface WorldStreamOptions {
    stream?: boolean;
    onDelta?: (delta: string, accumulated: string) => void;
}

interface RecallStreamOptions {
    stream?: boolean;
    onDelta?: (delta: string, accumulated: string) => void;
}

type 通用流式选项 = {
    stream?: boolean;
    onDelta?: (delta: string, accumulated: string) => void;
} | undefined;

class 协议请求错误 extends Error {
    status?: number;
    detail?: string;

    constructor(message: string, status?: number, detail?: string) {
        super(message);
        this.name = '协议请求错误';
        this.status = status;
        this.detail = detail;
    }
}

const 清理末尾斜杠 = (baseUrl: string): string => baseUrl.replace(/\/+$/, '');

const 模型名似乎是Gemini = (modelRaw: string): boolean => /\bgemini\b/i.test((modelRaw || '').trim());

const 模型名似乎是DeepSeek = (modelRaw: string): boolean => /\bdeepseek\b/i.test((modelRaw || '').trim());

const 模型看起来是DeepSeekReasoner = (modelRaw: string): boolean => {
    const model = (modelRaw || '').toLowerCase();
    return model.includes('reasoner') || /\br1\b/.test(model);
};

const 响应详情疑似不支持JSONMode = (text: string): boolean => {
    const raw = (text || '').toLowerCase();
    return raw.includes('response_format') || raw.includes('json_object') || raw.includes('json mode') || raw.includes('schema');
};

const 响应详情疑似不支持流式 = (text: string): boolean => {
    const raw = (text || '').toLowerCase();
    if (raw.includes('event-stream')) return true;
    if (raw.includes('sse')) return true;
    if (!raw.includes('stream')) return false;
    return raw.includes('unsupported') || raw.includes('not support') || raw.includes('not supported') || raw.includes('invalid');
};

const 响应详情疑似不支持maxTokens参数 = (text: string): boolean => {
    const raw = (text || '').toLowerCase();
    if (!raw.includes('max_tokens')) return false;
    return raw.includes('unknown') || raw.includes('invalid') || raw.includes('unsupported') || raw.includes('not support') || raw.includes('additional properties');
};

const 响应详情疑似不支持maxCompletionTokens参数 = (text: string): boolean => {
    const raw = (text || '').toLowerCase();
    if (!raw.includes('max_completion_tokens')) return false;
    return raw.includes('unknown') || raw.includes('invalid') || raw.includes('unsupported') || raw.includes('not support') || raw.includes('additional properties');
};

const 响应详情疑似要求maxCompletionTokens参数 = (text: string): boolean => {
    const raw = (text || '').toLowerCase();
    return raw.includes('max_completion_tokens') && (raw.includes('required') || raw.includes('must') || raw.includes('need'));
};

const 包含JSON关键词 = (messages: 通用消息[]): boolean => {
    return messages.some(msg => /json/i.test(msg.content || ''));
};

const 添加JSON输出约束 = (messages: 通用消息[]): 通用消息[] => {
    if (包含JSON关键词(messages)) return messages;
    const hint = '请仅输出合法 JSON 对象，不要输出额外说明。';
    const copied = [...messages];
    const systemIndex = copied.findIndex(msg => msg.role === 'system');
    if (systemIndex >= 0) {
        const merged = `${copied[systemIndex].content}\n\n${hint}`.trim();
        copied[systemIndex] = { ...copied[systemIndex], content: merged };
        return copied;
    }
    return [{ role: 'system', content: hint }, ...copied];
};

const 判定请求协议 = (apiConfig: 当前可用接口结构): 请求协议类型 => {
    const override = apiConfig.协议覆盖 || 'auto';
    if (override === 'openai' || override === 'gemini' || override === 'claude' || override === 'deepseek') {
        return override;
    }

    if (apiConfig.供应商 === 'gemini') return 'gemini';
    if (apiConfig.供应商 === 'claude') return 'claude';
    if (apiConfig.供应商 === 'deepseek') return 'deepseek';
    if (apiConfig.供应商 === 'openai') return 'openai';

    const model = (apiConfig.model || '').trim();
    if (模型名似乎是Gemini(model)) return 'gemini';
    if (模型名似乎是DeepSeek(model)) return 'deepseek';
    return 'openai';
};

const 标准化模型名 = (value: string): string => {
    const raw = (value || '').trim().toLowerCase();
    if (!raw) return '';
    const afterSlash = raw.includes('/') ? (raw.split('/').pop() || raw) : raw;
    return afterSlash.replace(/^models\//, '');
};

const OpenAI模型支持JSONMode = (modelRaw: string): boolean => {
    const model = 标准化模型名(modelRaw);
    if (!model) return false;
    return model.startsWith('gpt-3.5-turbo') || model.startsWith('gpt-4');
};

const Gemini模型支持JSONMode = (modelRaw: string): boolean => {
    const model = 标准化模型名(modelRaw);
    if (!model) return false;
    if (!model.startsWith('gemini-')) return false;
    if (model.includes('native-audio')) return false;
    if (model.includes('tts')) return false;
    if (/(^|[-_])live([-_]|$)/.test(model)) return false;
    return true;
};

const Claude模型支持JSONMode = (_modelRaw: string): boolean => {
    return true;
};

const DeepSeek模型支持JSONMode = (modelRaw: string): boolean => {
    const model = 标准化模型名(modelRaw);
    if (!model) return false;
    if (模型看起来是DeepSeekReasoner(model)) return false;
    return model.includes('deepseek-chat') || model.includes('deepseek-coder');
};

const 模型支持JSONMode = (apiConfig: 当前可用接口结构): boolean => {
    const protocol = 判定请求协议(apiConfig);
    if (protocol === 'gemini') return Gemini模型支持JSONMode(apiConfig.model);
    if (protocol === 'claude') return Claude模型支持JSONMode(apiConfig.model);
    if (protocol === 'deepseek') return DeepSeek模型支持JSONMode(apiConfig.model);
    return OpenAI模型支持JSONMode(apiConfig.model);
};

const 解析JSONMode开关 = (setting: JSON模式设置 | undefined, apiConfig: 当前可用接口结构): boolean => {
    if (setting === 'on') return true;
    if (setting === 'off') return false;
    return 模型支持JSONMode(apiConfig);
};

const 读取自定义最大输出Token = (apiConfig: 当前可用接口结构): number | undefined => {
    const raw = apiConfig.maxTokens;
    if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
        return Math.floor(raw);
    }
    return undefined;
};

const 读取自定义温度 = (apiConfig: 当前可用接口结构): number | undefined => {
    const raw = apiConfig.temperature;
    if (typeof raw === 'number' && Number.isFinite(raw)) {
        return raw;
    }
    return undefined;
};

const 约束数值范围 = (value: number, min: number, max: number): number => {
    return Math.min(max, Math.max(min, value));
};

const 估算文本Token = (text: string): number => {
    if (!text) return 0;
    let cjkCount = 0;
    for (const ch of text) {
        const code = ch.charCodeAt(0);
        if (code >= 0x4e00 && code <= 0x9fff) cjkCount += 1;
    }
    const nonCjkCount = Math.max(0, text.length - cjkCount);
    return cjkCount + Math.ceil(nonCjkCount / 4);
};

const 估算消息Token = (messages: 通用消息[]): number => {
    const overheadPerMessage = 8;
    return messages.reduce((sum, msg) => sum + overheadPerMessage + 估算文本Token(msg.content || ''), 0);
};

const 模型名包含任一片段 = (model: string, fragments: string[]): boolean => {
    return fragments.some(fragment => model.includes(fragment));
};

const 看起来是OpenAI推理模型 = (modelRaw: string): boolean => {
    const model = 标准化模型名(modelRaw);
    return model.startsWith('o1') || model.startsWith('o3') || model.startsWith('o4');
};

const 推断Gemini上下文窗口 = (_modelRaw: string): number => {
    // Gemini 当前主流文本模型官方上下文窗口均为 1,048,576。
    return 1_048_576;
};

const 推断Claude上下文窗口 = (_modelRaw: string): number => {
    // Claude 4.x 默认 200K，上到 1M 需要额外 beta header，这里保守按默认值估算。
    return 200_000;
};

const 推断DeepSeek上下文窗口 = (modelRaw: string): number => {
    const model = 标准化模型名(modelRaw);
    if (!model) return 128_000;

    // 官方别名 deepseek-chat / deepseek-reasoner（v3.2 / r1-0528）已是 128K。
    if (model === 'deepseek-chat' || model === 'deepseek-reasoner') return 128_000;
    if (模型名包含任一片段(model, ['v3.2', 'r1-0528'])) return 128_000;

    // 旧版 v3 / v3.1 / r1 系列按 64K 保守估算，避免超上下文失败。
    if (模型名包含任一片段(model, ['deepseek-v3', 'v3.1', 'deepseek-r1', 'r1'])) return 64_000;
    return 128_000;
};

const 推断OpenAI上下文窗口 = (modelRaw: string): number | null => {
    const model = 标准化模型名(modelRaw);
    if (!model) return null;
    if (model.startsWith('gpt-5')) return 400_000;
    if (model.startsWith('gpt-4.1')) return 1_047_576;
    if (model.startsWith('gpt-4o')) return 128_000;
    if (看起来是OpenAI推理模型(model)) return 200_000;
    if (model.startsWith('gpt-4-turbo') || model.startsWith('gpt-4-0125') || model.startsWith('gpt-4-1106')) return 128_000;
    if (model.startsWith('gpt-4')) return 8_192;
    if (model.startsWith('gpt-3.5')) return 16_385;
    return null;
};

const 推断Gemini默认最大输出Token = (modelRaw: string): number => {
    const model = 标准化模型名(modelRaw);
    if (!model) return 8_192;

    if (模型名包含任一片段(model, ['2.0-flash-lite', '2.0-flash'])) return 8_192;
    if (model.includes('tts')) return 16_384;
    if (model.startsWith('gemini-2.5') || model.startsWith('gemini-3.')) return 65_536;
    if (模型名包含任一片段(model, ['gemini-3-pro', 'gemini-3-flash', 'flash-latest', 'pro-latest'])) return 65_536;
    return 8_192;
};

const 推断Claude默认最大输出Token = (modelRaw: string): number => {
    const model = 标准化模型名(modelRaw);
    if (!model) return 8_192;

    if (模型名包含任一片段(model, ['opus-4.6', 'opus-4-6'])) return 128_000;
    if (模型名包含任一片段(model, ['sonnet-4.6', 'sonnet-4-6', 'haiku-4.5', 'haiku-4-5'])) return 64_000;
    if (模型名包含任一片段(model, ['sonnet-4', 'haiku-4', 'opus-4'])) return 64_000;
    return 8_192;
};

const 推断DeepSeek默认最大输出Token = (modelRaw: string): number => {
    const model = 标准化模型名(modelRaw);
    if (!model) return 8_000;
    if (model === 'deepseek-reasoner' || 模型看起来是DeepSeekReasoner(model)) return 64_000;
    return 8_000;
};

const 推断OpenAI默认最大输出Token = (modelRaw: string): number => {
    const model = 标准化模型名(modelRaw);
    if (!model) return 8_192;
    if (model.startsWith('gpt-5')) return 128_000;
    if (model.startsWith('gpt-4.1')) return 32_768;
    if (model.startsWith('gpt-4o')) return 16_384;
    if (看起来是OpenAI推理模型(model)) return 100_000;
    if (model.startsWith('gpt-4')) return 8_192;
    if (model.startsWith('gpt-3.5')) return 4_096;
    return 8_192;
};

const 推断上下文窗口 = (protocol: 请求协议类型, modelRaw: string): number | null => {
    const model = 标准化模型名(modelRaw);
    if (protocol === 'gemini') return 推断Gemini上下文窗口(model);
    if (protocol === 'claude') return 推断Claude上下文窗口(model);
    if (protocol === 'deepseek') return 推断DeepSeek上下文窗口(model);
    return 推断OpenAI上下文窗口(model);
};

const 推断默认最大输出Token = (protocol: 请求协议类型, modelRaw: string): number => {
    const model = 标准化模型名(modelRaw);
    if (protocol === 'gemini') return 推断Gemini默认最大输出Token(model);
    if (protocol === 'claude') return 推断Claude默认最大输出Token(model);
    if (protocol === 'deepseek') return 推断DeepSeek默认最大输出Token(model);
    return 推断OpenAI默认最大输出Token(model);
};

const 计算最大输出Token = (apiConfig: 当前可用接口结构, protocol: 请求协议类型, messages: 通用消息[]): number => {
    const modelCap = 推断默认最大输出Token(protocol, apiConfig.model);
    const requested = 读取自定义最大输出Token(apiConfig) ?? modelCap;
    const safeRequested = Math.min(requested, modelCap);
    // 按用户要求：不根据输入上下文长度压缩输出，只控制输出上限本身。
    return Math.max(256, safeRequested);
};

const 计算请求温度 = (apiConfig: 当前可用接口结构, protocol: 请求协议类型, fallback: number): number => {
    const configured = 读取自定义温度(apiConfig);
    const base = typeof configured === 'number' ? configured : fallback;
    if (!Number.isFinite(base)) {
        return protocol === 'claude' ? 0.7 : 0.7;
    }
    if (protocol === 'claude') return 约束数值范围(base, 0, 1);
    return 约束数值范围(base, 0, 2);
};

type 增量提取器 = ((payload: any) => string) & {
    finalize?: () => string;
};

const 创建OpenAI流增量提取器 = (): 增量提取器 => {
    let inReasoningPhase = false;
    const extract = ((payload: any): string => {
        const delta = payload?.choices?.[0]?.delta;
        const reasoningContent = delta?.reasoning_content ?? delta?.reasoning ?? delta?.reasoning_text;
        const hasReasoning = typeof reasoningContent === 'string' && reasoningContent.length > 0;
        const content = typeof delta?.content === 'string'
            ? delta.content
            : (typeof payload?.choices?.[0]?.message?.content === 'string' ? payload.choices[0].message.content : '');

        if (hasReasoning) {
            if (!inReasoningPhase) {
                inReasoningPhase = true;
                return `<thinking>${reasoningContent}`;
            }
            return reasoningContent;
        }

        if (typeof content === 'string' && content.length > 0) {
            if (inReasoningPhase) {
                inReasoningPhase = false;
                return `</thinking>${content}`;
            }
            return content;
        }

        return '';
    }) as 增量提取器;

    extract.finalize = () => {
        if (!inReasoningPhase) return '';
        inReasoningPhase = false;
        return '</thinking>';
    };

    return extract;
};

const 提取OpenAI完整文本 = (payload: any): string => {
    const content = payload?.choices?.[0]?.message?.content;
    return typeof content === 'string' ? content : '';
};

const 提取Gemini文本 = (payload: any): string => {
    const parts = payload?.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts)) return '';
    return parts
        .map((part: any) => {
            if (typeof part?.text === 'string') return part.text;
            return '';
        })
        .filter(Boolean)
        .join('');
};

const 提取Claude文本 = (payload: any): string => {
    const blocks = payload?.content;
    if (!Array.isArray(blocks)) return '';
    return blocks
        .map((item: any) => (item?.type === 'text' && typeof item?.text === 'string' ? item.text : ''))
        .filter(Boolean)
        .join('');
};

const 提取Claude流增量文本 = (payload: any): string => {
    if (payload?.type !== 'content_block_delta') return '';
    const delta = payload?.delta;
    if (delta?.type !== 'text_delta') return '';
    return typeof delta?.text === 'string' ? delta.text : '';
};

const 读取失败详情文本 = async (response: Response, maxLen = 600): Promise<string> => {
    try {
        const text = (await response.text()).trim();
        if (!text) return '';
        if (!Number.isFinite(maxLen) || maxLen < 0) return text;
        return text.length > maxLen ? `${text.slice(0, maxLen)}...` : text;
    } catch {
        return '';
    }
};

const 解析SSE文本 = async (
    response: Response,
    extractDelta: 增量提取器 | ((payload: any) => string),
    onDelta?: (delta: string, accumulated: string) => void,
    emptyBodyError = 'Stream body is empty'
): Promise<string> => {
    if (!response.body) throw new Error(emptyBodyError);

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let rawBuffer = '';
    let accumulated = '';
    let rawStreamText = '';
    let sawSseFrame = false;
    let doneSignal = false;
    let pendingJsonPayload = '';

    const emitDelta = (delta: string) => {
        if (!delta) return;
        accumulated += delta;
        onDelta?.(delta, accumulated);
    };

    const 尝试解析JSON并提取 = (payloadText: string): boolean => {
        const payload = payloadText.trim();
        if (!payload) return true;

        try {
            const json = JSON.parse(payload);
            emitDelta(extractDelta(json));
            return true;
        } catch {
            // 非 JSON 数据：若像普通文本流，直接当增量输出
            if (!payload.startsWith('{') && !payload.startsWith('[')) {
                emitDelta(payload);
                return true;
            }
            return false;
        }
    };

    const 处理事件块 = (eventBlock: string) => {
        if (!eventBlock.trim()) return;
        const lines = eventBlock.split(/\r?\n/);
        const dataLines: string[] = [];

        for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line) continue;
            if (line.startsWith(':')) continue;
            if (!line.startsWith('data:')) continue;
            sawSseFrame = true;
            dataLines.push(line.slice(5).trim());
        }

        if (dataLines.length === 0) return;
        const payload = dataLines.join('\n').trim();
        if (!payload) return;
        if (payload === '[DONE]') {
            doneSignal = true;
            return;
        }

        const joinedPayload = pendingJsonPayload
            ? `${pendingJsonPayload}${payload}`
            : payload;
        if (尝试解析JSON并提取(joinedPayload)) {
            pendingJsonPayload = '';
            return;
        }
        pendingJsonPayload = joinedPayload;
    };

    const 刷新事件缓冲 = (flushAll: boolean) => {
        const normalized = rawBuffer.replace(/\r\n/g, '\n');
        const blocks = normalized.split('\n\n');
        let tail = '';
        if (!flushAll) {
            rawBuffer = blocks.pop() || '';
        } else {
            tail = blocks.pop() || '';
            rawBuffer = '';
        }
        for (const block of blocks) {
            处理事件块(block);
            if (doneSignal) break;
        }
        if (flushAll && tail.trim()) {
            处理事件块(tail);
        }
    };

    try {
        while (!doneSignal) {
            const { value, done } = await reader.read();
            if (done) break;
            const chunkText = decoder.decode(value, { stream: true });
            rawStreamText += chunkText;
            rawBuffer += chunkText;
            刷新事件缓冲(false);
        }

        const tail = decoder.decode();
        if (tail) {
            rawStreamText += tail;
            rawBuffer += tail;
        }
        刷新事件缓冲(true);

        if (pendingJsonPayload) {
            尝试解析JSON并提取(pendingJsonPayload);
            pendingJsonPayload = '';
        }

        if (typeof extractDelta.finalize === 'function') {
            const tailDelta = extractDelta.finalize();
            emitDelta(tailDelta);
        }
    } finally {
        try {
            reader.releaseLock();
        } catch {
            // ignore release errors
        }
    }

    if (!sawSseFrame) {
        const plainPayload = rawStreamText.trim();
        if (plainPayload) {
            emitDelta(plainPayload);
        }
    }

    return accumulated.trim();
};

const 非流式回填流式回调 = (text: string, streamOptions?: 通用流式选项) => {
    if (!streamOptions?.stream || !streamOptions?.onDelta || !text) return;
    streamOptions.onDelta(text, text);
};

const 解析可能是JSON字符串 = (text: string): any | null => {
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
};

const 转义正则片段 = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const 提取标签内容列表 = (
    text: string,
    tag: string,
    options?: { 兼容错误闭合?: boolean }
): string[] => {
    if (!text || !tag) return [];
    const escapedTag = 转义正则片段(tag);
    const closeTag = options?.兼容错误闭合
        ? `(?:</${escapedTag}>|<${escapedTag}>)`
        : `</${escapedTag}>`;
    const regex = new RegExp(`<${escapedTag}>\\s*([\\s\\S]*?)\\s*${closeTag}`, 'gi');
    const list: string[] = [];
    let match: RegExpExecArray | null = null;
    while ((match = regex.exec(text)) !== null) {
        const payload = (match[1] || '').trim();
        if (payload) list.push(payload);
    }
    return list;
};

const 提取首个标签内容 = (
    text: string,
    tag: string,
    options?: { 兼容错误闭合?: boolean }
): string => {
    const list = 提取标签内容列表(text, tag, options);
    return list[0] || '';
};

const 规范化日志发送者 = (senderRaw: string): string => {
    const sender = (senderRaw || '').trim();
    if (!sender) return '旁白';
    if (sender === '判定' || sender === '【判定】') return '【判定】';
    if (sender === 'NSFW判定' || sender === '【NSFW判定】') return '【NSFW判定】';
    return sender;
};

const 解析正文日志 = (body: string): Array<{ sender: string; text: string }> => {
    if (!body || !body.trim()) return [];
    const lines = body.replace(/\r\n/g, '\n').split('\n');
    const logs: Array<{ sender: string; text: string }> = [];
    let current: { sender: string; text: string } | null = null;

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;

        const match = line.match(/^【\s*([^】]+?)\s*】\s*(.*)$/);
        if (match) {
            const sender = 规范化日志发送者(match[1]);
            const text = (match[2] || '').trim();
            current = { sender, text };
            logs.push(current);
            continue;
        }

        if (current) {
            current.text = `${current.text}\n${line}`.trim();
            continue;
        }

        current = { sender: '旁白', text: line };
        logs.push(current);
    }

    return logs.filter(item => item.text.trim().length > 0);
};

const 解析命令值 = (rawValue: string | undefined): any => {
    const text = (rawValue || '').trim();
    if (!text) return null;

    if (
        (text.startsWith('"') && text.endsWith('"'))
        || (text.startsWith("'") && text.endsWith("'"))
    ) {
        return text.slice(1, -1);
    }

    if (/^(true|false)$/i.test(text)) {
        return text.toLowerCase() === 'true';
    }
    if (/^null$/i.test(text)) {
        return null;
    }
    if (/^[+\-]?\d+(?:\.\d+)?$/.test(text)) {
        const num = Number(text);
        if (Number.isFinite(num)) return num;
    }

    const parsed = parseJsonWithRepair<any>(text);
    if (parsed.value !== null) return parsed.value;
    return text;
};

const 标准化命令对象 = (raw: any): { action: 'add' | 'set' | 'push' | 'delete'; key: string; value: any } | null => {
    if (!raw || typeof raw !== 'object') return null;
    const actionRaw = typeof raw.action === 'string' ? raw.action.trim().toLowerCase() : '';
    if (actionRaw !== 'add' && actionRaw !== 'set' && actionRaw !== 'push' && actionRaw !== 'delete') {
        return null;
    }
    const key = typeof raw.key === 'string' ? raw.key.trim() : '';
    if (!key) return null;
    const value = raw.value === undefined ? null : raw.value;
    return {
        action: actionRaw,
        key,
        value
    };
};

const 解析命令块 = (commandBlock: string): Array<{ action: 'add' | 'set' | 'push' | 'delete'; key: string; value: any }> => {
    const text = (commandBlock || '').trim();
    if (!text) return [];
    if (text === '无' || text.toLowerCase() === 'none') return [];

    const parsed = parseJsonWithRepair<any>(text);
    if (parsed.value !== null) {
        if (Array.isArray(parsed.value)) {
            return parsed.value
                .map(标准化命令对象)
                .filter((item): item is { action: 'add' | 'set' | 'push' | 'delete'; key: string; value: any } => Boolean(item));
        }
        if (parsed.value && Array.isArray(parsed.value.tavern_commands)) {
            return parsed.value.tavern_commands
                .map(标准化命令对象)
                .filter((item): item is { action: 'add' | 'set' | 'push' | 'delete'; key: string; value: any } => Boolean(item));
        }
    }

    const lines = text
        .replace(/\r\n/g, '\n')
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .filter(line => !line.startsWith('```'));
    const commands: Array<{ action: 'add' | 'set' | 'push' | 'delete'; key: string; value: any }> = [];

    for (const line of lines) {
        const normalized = line.replace(/^[\-*]\s+/, '').trim();
        const match = normalized.match(/^(add|set|push|delete)\s+([^\s=]+)(?:\s*(?:=\s*|\s+)([\s\S]+))?$/i);
        if (!match) continue;
        const action = match[1].toLowerCase() as 'add' | 'set' | 'push' | 'delete';
        const key = (match[2] || '').trim();
        if (!key) continue;
        const value = action === 'delete' ? null : 解析命令值(match[3]);
        commands.push({ action, key, value });
    }

    return commands;
};

const 解析行动选项块 = (optionsBlock: string): string[] => {
    const text = (optionsBlock || '').trim();
    if (!text) return [];
    return text
        .replace(/\r\n/g, '\n')
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => line.replace(/^[-*]\s*/, '').replace(/^\d+\.\s*/, '').trim())
        .filter(Boolean);
};

const 解析标签协议响应 = (content: string): GameResponse | null => {
    const text = (content || '').trim();
    if (!text) return null;

    const thinkingParts = 提取标签内容列表(text, 'thinking');
    const bodyBlock = 提取首个标签内容(text, '正文');
    const shortTerm = 提取首个标签内容(text, '短期记忆', { 兼容错误闭合: true });
    const commandBlock = 提取首个标签内容(text, '命令');
    const actionOptionsBlock = 提取首个标签内容(text, '行动选项');

    let logs = 解析正文日志(bodyBlock || '');
    if (logs.length === 0) {
        const stripped = text.replace(/<[^>]+>/g, '\n');
        if (/【[^】]+】/.test(stripped)) {
            logs = 解析正文日志(stripped);
        }
    }
    const commands = 解析命令块(commandBlock);
    const actionOptions = 解析行动选项块(actionOptionsBlock);
    const thinking = thinkingParts.map(item => item.trim()).filter(Boolean).join('\n\n');

    if (logs.length === 0) {
        return null;
    }

    return {
        thinking_pre: thinking ? `<thinking>${thinking}</thinking>` : undefined,
        logs,
        tavern_commands: commands.length > 0 ? commands : undefined,
        shortTerm: shortTerm || undefined,
        action_options: actionOptions.length > 0 ? actionOptions : undefined
    };
};

const 归一化JSON结构响应 = (raw: any): GameResponse => {
    const logs = Array.isArray(raw?.logs)
        ? raw.logs
            .map((item: any) => {
                if (typeof item === 'string') {
                    return { sender: '旁白', text: item };
                }
                if (item && typeof item === 'object') {
                    return {
                        sender: typeof item.sender === 'string' ? item.sender : '旁白',
                        text: typeof item.text === 'string' ? item.text : String(item.text ?? '')
                    };
                }
                return null;
            })
            .filter((item: any) => item && item.text.trim().length > 0)
        : [];

    const thinkingFieldKeys = [
        't_input',
        't_plan',
        't_state',
        't_branch',
        't_precheck',
        't_logcheck',
        't_var',
        't_npc',
        't_cmd',
        't_audit',
        't_fix',
        't_mem',
        't_opts'
    ] as const;
    const normalizedThinkingFields = Object.fromEntries(
        thinkingFieldKeys
            .filter((key) => typeof raw?.[key] === 'string' && raw[key].trim().length > 0)
            .map((key) => [key, raw[key]])
    ) as Partial<GameResponse>;

    return {
        thinking_pre: typeof raw?.thinking_pre === 'string' ? raw.thinking_pre : undefined,
        logs,
        ...normalizedThinkingFields,
        thinking_post: typeof raw?.thinking_post === 'string' ? raw.thinking_post : undefined,
        tavern_commands: Array.isArray(raw?.tavern_commands) ? raw.tavern_commands : undefined,
        shortTerm: typeof raw?.shortTerm === 'string' ? raw.shortTerm : undefined,
        action_options: Array.isArray(raw?.action_options)
            ? raw.action_options
                .map((item: any) => {
                    if (typeof item === 'string') return item.trim();
                    if (typeof item === 'number' || typeof item === 'boolean') return String(item);
                    if (item && typeof item === 'object') {
                        const candidate = item.text ?? item.label ?? item.action ?? item.name ?? item.id;
                        if (typeof candidate === 'string') return candidate.trim();
                    }
                    return '';
                })
                .filter((item: string) => item.trim().length > 0)
            : undefined
    };
};

export const parseStoryRawText = (content: string): GameResponse => {
    const tagged = 解析标签协议响应(content);
    if (tagged && tagged.logs.some(log => typeof log?.text === 'string' && log.text.trim().length > 0)) {
        return tagged;
    }

    // 向后兼容：若模型仍返回 JSON，继续兼容解析。
    const parsed = parseJsonWithRepair<any>(content);
    if (parsed.value && typeof parsed.value === 'object') {
        const normalized = 归一化JSON结构响应(parsed.value);
        const hasRenderableLogs = normalized.logs.some((log) => (
            typeof log?.text === 'string' && log.text.trim().length > 0
        ));
        if (hasRenderableLogs) {
            return normalized;
        }
        const hasThinking = Object.keys(normalized).some((key) => {
            const isThinkingField = key.startsWith('t_') || key === 'thinking_pre' || key === 'thinking_post';
            return isThinkingField && typeof (normalized as any)[key] === 'string' && (normalized as any)[key].trim().length > 0;
        });
        const detail = hasThinking
            ? '缺少 <正文> 有效内容（疑似响应截断）'
            : '返回内容结构不完整（缺少 <正文> 或 logs）';
        throw new StoryResponseParseError(detail, content, detail);
    }
    const detail = parsed.error || '返回内容结构不完整（未匹配标签协议，也无法解析 JSON）';
    throw new StoryResponseParseError(detail, content, detail);
};

const 构建OpenAI候选端点 = (baseUrlRaw: string): string[] => {
    const base = 清理末尾斜杠(baseUrlRaw || '');
    if (!base) return [];
    const withoutEndpoint = base
        .replace(/\/v1\/chat\/completions$/i, '')
        .replace(/\/chat\/completions$/i, '');
    const withoutV1Tail = withoutEndpoint.replace(/\/v1$/i, '');
    const candidates = [
        `${withoutV1Tail}/v1/chat/completions`,
        `${withoutV1Tail}/chat/completions`,
        `${withoutEndpoint}/chat/completions`
    ].filter(Boolean);
    return Array.from(new Set(candidates));
};

const 规范化Gemini基础地址 = (baseUrlRaw: string): string => {
    const base = 清理末尾斜杠(baseUrlRaw || '');
    const withoutOpenAIPath = base
        .replace(/\/v1beta\/openai$/i, '')
        .replace(/\/v1\/openai$/i, '')
        .replace(/\/openai\/v1$/i, '')
        .replace(/\/openai$/i, '');

    const withoutVersionTail = withoutOpenAIPath
        .replace(/\/v1beta$/i, '')
        .replace(/\/v1$/i, '');

    return withoutVersionTail || 'https://generativelanguage.googleapis.com';
};

const 规范化Claude基础地址 = (baseUrlRaw: string): string => {
    const base = 清理末尾斜杠(baseUrlRaw || '');
    return base
        .replace(/\/v1\/messages$/i, '')
        .replace(/\/v1$/i, '')
        || 'https://api.anthropic.com';
};

const 规范化Gemini模型名 = (modelRaw: string): string => {
    return (modelRaw || '').trim().replace(/^models\//i, '');
};

const 追加GeminiKey参数 = (url: string, apiKey: string): string => {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}key=${encodeURIComponent(apiKey)}`;
};

const 组装Claude消息 = (
    messages: 通用消息[],
    jsonMode: boolean
): {
    system: string;
    list: Array<{ role: 'user' | 'assistant'; content: string }>;
    prefillJsonBrace: boolean;
} => {
    const system = messages
        .filter(msg => msg.role === 'system')
        .map(msg => msg.content)
        .join('\n\n')
        .trim();

    const list = messages
        .filter(msg => msg.role !== 'system')
        .map(msg => ({
            role: msg.role === 'assistant' ? 'assistant' as const : 'user' as const,
            content: msg.content
        }));

    if (list.length === 0 || list[0].role !== 'user') {
        list.unshift({ role: 'user', content: '请开始。' });
    }

    let prefillJsonBrace = false;
    if (jsonMode) {
        const hasJsonHint = 包含JSON关键词(messages);
        if (!hasJsonHint) {
            list[0] = {
                ...list[0],
                content: `${list[0].content}\n\n请仅输出合法 JSON 对象，不要包含说明。`
            };
        }
        list.push({ role: 'assistant', content: '{' });
        prefillJsonBrace = true;
    }

    return { system, list, prefillJsonBrace };
};

const 组装Gemini消息 = (
    messages: 通用消息[],
    jsonMode: boolean
): {
    systemInstruction: string;
    contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>;
} => {
    const systemInstruction = messages
        .filter(msg => msg.role === 'system')
        .map(msg => msg.content)
        .join('\n\n')
        .trim();

    const contents = messages
        .filter(msg => msg.role !== 'system')
        .map(msg => ({
            role: msg.role === 'assistant' ? 'model' as const : 'user' as const,
            parts: [{ text: msg.content }]
        }));

    if (contents.length === 0 || contents[0].role !== 'user') {
        // Gemini 内容通常应从 user 轮开始，先补一个起始 user 轮提高兼容性
        contents.unshift({ role: 'user', parts: [{ text: '请开始。' }] });
    }

    if (jsonMode && !包含JSON关键词(messages)) {
        contents[0] = {
            ...contents[0],
            parts: [{ text: `${contents[0].parts?.[0]?.text || ''}\n\n请仅输出合法 JSON 对象，不要包含额外说明。` }]
        };
    }

    return { systemInstruction, contents };
};

const 请求OpenAI家族文本 = async (
    apiConfig: 当前可用接口结构,
    protocol: 'openai' | 'deepseek',
    messages: 通用消息[],
    temperature: number,
    signal?: AbortSignal,
    streamOptions?: 通用流式选项,
    responseFormatJsonObject: boolean = false,
    errorDetailLimit?: number
): Promise<string> => {
    if (!apiConfig.apiKey) throw new Error('Missing API Key');
    const endpointCandidates = 构建OpenAI候选端点(apiConfig.baseUrl);
    if (endpointCandidates.length === 0) throw new Error('Missing API Base URL');
    const enableStream = !!streamOptions?.stream;

    let useStream = enableStream;
    let useResponseFormat = responseFormatJsonObject && !(protocol === 'deepseek' && 模型看起来是DeepSeekReasoner(apiConfig.model));
    let requestMessages = useResponseFormat ? messages : (responseFormatJsonObject ? 添加JSON输出约束(messages) : messages);
    let endpointIndex = 0;
    let tokenFieldMode: 'max_tokens' | 'max_completion_tokens' | 'none' = 'max_tokens';

    for (let attempt = 0; attempt < 4; attempt++) {
        const endpoint = endpointCandidates[Math.min(endpointIndex, endpointCandidates.length - 1)];
        const maxOutputTokens = 计算最大输出Token(apiConfig, protocol, requestMessages);
        const body: Record<string, unknown> = {
            model: apiConfig.model,
            messages: requestMessages,
            temperature,
            stream: useStream
        };
        if (tokenFieldMode === 'max_tokens') {
            body.max_tokens = maxOutputTokens;
        } else if (tokenFieldMode === 'max_completion_tokens') {
            body.max_completion_tokens = maxOutputTokens;
        }
        if (useResponseFormat) {
            body.response_format = { type: 'json_object' };
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiConfig.apiKey}`
            },
            body: JSON.stringify(body),
            signal
        });

        if (!response.ok) {
            const detail = await 读取失败详情文本(response, errorDetailLimit);
            if ([404, 405].includes(response.status) && endpointIndex < endpointCandidates.length - 1) {
                endpointIndex += 1;
                continue;
            }
            if (
                tokenFieldMode === 'max_tokens' &&
                (响应详情疑似要求maxCompletionTokens参数(detail) || 响应详情疑似不支持maxTokens参数(detail))
            ) {
                tokenFieldMode = 'max_completion_tokens';
                continue;
            }
            if (tokenFieldMode === 'max_completion_tokens' && 响应详情疑似不支持maxCompletionTokens参数(detail)) {
                tokenFieldMode = 'none';
                continue;
            }
            if (useResponseFormat && 响应详情疑似不支持JSONMode(detail)) {
                useResponseFormat = false;
                requestMessages = 添加JSON输出约束(messages);
                continue;
            }
            if (useStream && 响应详情疑似不支持流式(detail)) {
                useStream = false;
                continue;
            }
            throw new 协议请求错误(`API Error: ${response.status}${detail ? ` - ${detail}` : ''}`, response.status, detail);
        }

        if (!useStream) {
            const rawText = await response.text();
            const json = 解析可能是JSON字符串(rawText);
            const content = json ? 提取OpenAI完整文本(json) : rawText;
            const finalText = (typeof content === 'string' ? content : '').trim();
            非流式回填流式回调(finalText, streamOptions);
            return finalText;
        }

        const contentType = (response.headers.get('content-type') || '').toLowerCase();
        if (!contentType.includes('text/event-stream')) {
            const rawText = await response.text();
            const json = 解析可能是JSON字符串(rawText);
            const content = json ? 提取OpenAI完整文本(json) : rawText;
            const finalText = (typeof content === 'string' ? content : '').trim();
            非流式回填流式回调(finalText, streamOptions);
            return finalText;
        }

        return 解析SSE文本(response, 创建OpenAI流增量提取器(), streamOptions?.onDelta, 'Stream body is empty');
    }

    throw new Error('API request failed after retries');
};

const 请求Gemini文本 = async (
    apiConfig: 当前可用接口结构,
    messages: 通用消息[],
    temperature: number,
    signal?: AbortSignal,
    streamOptions?: 通用流式选项,
    responseFormatJsonObject: boolean = false,
    errorDetailLimit?: number
): Promise<string> => {
    if (!apiConfig.apiKey) throw new Error('Missing API Key');
    const model = 规范化Gemini模型名(apiConfig.model);
    if (!model) throw new Error('Gemini model is required');

    const enableStream = !!streamOptions?.stream;
    let useStream = enableStream;
    const baseUrl = 规范化Gemini基础地址(apiConfig.baseUrl);
    const path = `/v1beta/models/${encodeURIComponent(model)}:${useStream ? 'streamGenerateContent' : 'generateContent'}${useStream ? '?alt=sse' : ''}`;
    const { systemInstruction, contents } = 组装Gemini消息(messages, responseFormatJsonObject);
    const maxOutputTokens = 计算最大输出Token(apiConfig, 'gemini', messages);

    const generationConfig: Record<string, unknown> = {
        temperature,
        maxOutputTokens
    };
    if (responseFormatJsonObject) {
        generationConfig.responseMimeType = 'application/json';
        generationConfig.response_mime_type = 'application/json';
    }

    const payload = JSON.stringify({
        contents,
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
        generationConfig
    });

    const doFetch = async (authMode: 'query' | 'bearer', currentStream: boolean): Promise<Response> => {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (currentStream) headers.Accept = 'text/event-stream';
        if (authMode === 'bearer') headers.Authorization = `Bearer ${apiConfig.apiKey}`;
        const dynamicPath = `/v1beta/models/${encodeURIComponent(model)}:${currentStream ? 'streamGenerateContent' : 'generateContent'}${currentStream ? '?alt=sse' : ''}`;
        const url = authMode === 'query'
            ? 追加GeminiKey参数(`${baseUrl}${dynamicPath}`, apiConfig.apiKey)
            : `${baseUrl}${dynamicPath}`;
        return fetch(url, {
            method: 'POST',
            headers,
            body: payload,
            signal
        });
    };

    let authMode: 'query' | 'bearer' = 'query';
    for (let attempt = 0; attempt < 4; attempt++) {
        let response = await doFetch(authMode, useStream);
        if (!response.ok && authMode === 'query' && [400, 401, 403, 404].includes(response.status)) {
            authMode = 'bearer';
            response = await doFetch(authMode, useStream);
        }

        if (!response.ok) {
            const detail = await 读取失败详情文本(response, errorDetailLimit);
            if (useStream && 响应详情疑似不支持流式(detail)) {
                useStream = false;
                continue;
            }
            throw new 协议请求错误(`Gemini API Error: ${response.status}${detail ? ` - ${detail}` : ''}`, response.status, detail);
        }

        if (!useStream) {
            const data = await response.json();
            const text = 提取Gemini文本(data).trim();
            非流式回填流式回调(text, streamOptions);
            return text;
        }

        const contentType = (response.headers.get('content-type') || '').toLowerCase();
        if (!contentType.includes('text/event-stream')) {
            const data = await response.json();
            const text = 提取Gemini文本(data).trim();
            非流式回填流式回调(text, streamOptions);
            return text;
        }

        return 解析SSE文本(response, 提取Gemini文本, streamOptions?.onDelta, 'Gemini stream body is empty');
    }

    throw new Error(`Gemini API call failed: ${path}`);
};

const 请求Claude文本 = async (
    apiConfig: 当前可用接口结构,
    messages: 通用消息[],
    temperature: number,
    signal?: AbortSignal,
    streamOptions?: 通用流式选项,
    responseFormatJsonObject: boolean = false,
    errorDetailLimit?: number
): Promise<string> => {
    if (!apiConfig.apiKey) throw new Error('Missing API Key');
    const baseUrl = 规范化Claude基础地址(apiConfig.baseUrl);
    const endpoint = `${baseUrl}/v1/messages`;
    const enableStream = !!streamOptions?.stream;
    let useStream = enableStream;

    const { system, list, prefillJsonBrace } = 组装Claude消息(messages, responseFormatJsonObject);
    const maxOutputTokens = 计算最大输出Token(apiConfig, 'claude', messages);

    const buildBody = (stream: boolean) => ({
        model: apiConfig.model,
        max_tokens: maxOutputTokens,
        system: system || undefined,
        messages: list,
        temperature,
        stream
    });

    for (let attempt = 0; attempt < 4; attempt++) {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'x-api-key': apiConfig.apiKey,
                'anthropic-version': '2023-06-01',
                'Accept': useStream ? 'text/event-stream' : 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(buildBody(useStream)),
            signal
        });

        if (!response.ok) {
            const detail = await 读取失败详情文本(response, errorDetailLimit);
            if (useStream && 响应详情疑似不支持流式(detail)) {
                useStream = false;
                continue;
            }
            throw new 协议请求错误(`Claude API Error: ${response.status}${detail ? ` - ${detail}` : ''}`, response.status, detail);
        }

        const toFinalText = (text: string): string => {
            const trimmed = (text || '').trim();
            if (!responseFormatJsonObject) return trimmed;
            if (!prefillJsonBrace) return trimmed;
            if (!trimmed) return '{';
            return trimmed.startsWith('{') ? trimmed : `{${trimmed}`;
        };

        if (!useStream) {
            const data = await response.json();
            const text = toFinalText(提取Claude文本(data));
            非流式回填流式回调(text, streamOptions);
            return text;
        }

        const contentType = (response.headers.get('content-type') || '').toLowerCase();
        if (!contentType.includes('text/event-stream')) {
            const data = await response.json();
            const text = toFinalText(提取Claude文本(data));
            非流式回填流式回调(text, streamOptions);
            return text;
        }

        const streamed = await 解析SSE文本(response, 提取Claude流增量文本, streamOptions?.onDelta, 'Claude stream body is empty');
        return toFinalText(streamed);
    }

    throw new Error('Claude API call failed after retries');
};

const 请求模型文本 = async (
    apiConfig: 当前可用接口结构,
    messages: 通用消息[],
    options: {
        temperature: number;
        signal?: AbortSignal;
        streamOptions?: 通用流式选项;
        responseFormatJsonObject?: boolean;
        errorDetailLimit?: number;
    }
): Promise<string> => {
    const protocol = 判定请求协议(apiConfig);
    const jsonMode = Boolean(options.responseFormatJsonObject);
    const resolvedTemperature = 计算请求温度(apiConfig, protocol, options.temperature);

    if (protocol === 'gemini') {
        return 请求Gemini文本(
            apiConfig,
            messages,
            resolvedTemperature,
            options.signal,
            options.streamOptions,
            jsonMode,
            options.errorDetailLimit
        );
    }

    if (protocol === 'claude') {
        return 请求Claude文本(
            apiConfig,
            messages,
            resolvedTemperature,
            options.signal,
            options.streamOptions,
            jsonMode,
            options.errorDetailLimit
        );
    }

    if (protocol === 'deepseek') {
        return 请求OpenAI家族文本(
            apiConfig,
            'deepseek',
            messages,
            resolvedTemperature,
            options.signal,
            options.streamOptions,
            jsonMode,
            options.errorDetailLimit
        );
    }

    return 请求OpenAI家族文本(
        apiConfig,
        'openai',
        messages,
        resolvedTemperature,
        options.signal,
        options.streamOptions,
        jsonMode,
        options.errorDetailLimit
    );
};

export const generateMemoryRecall = async (
    systemPrompt: string,
    userPrompt: string,
    apiConfig: 当前可用接口结构,
    signal?: AbortSignal,
    streamOptions?: RecallStreamOptions
): Promise<string> => {
    const messages: 通用消息[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ];
    return 请求模型文本(apiConfig, messages, {
        temperature: 0.2,
        signal,
        streamOptions
    });
};

export const generateWorldData = async (
    worldContext: string,
    charData: any,
    apiConfig: 当前可用接口结构,
    streamOptions?: WorldStreamOptions,
    jsonModeSetting?: JSON模式设置
): Promise<string> => {
    if (!apiConfig.apiKey) throw new Error('Missing API Key');

    const genSystemPrompt = 世界观生成系统提示词;
    const genUserPrompt = 构建世界观生成用户提示词(worldContext, charData);

    const parseWorldPrompt = (content: string): string => {
        const parsed = parseJsonWithRepair<Record<string, unknown>>(content);
        if (!parsed.value || typeof parsed.value !== 'object') {
            throw new Error(`世界观生成解析失败: ${parsed.error || '未获得有效 JSON'}`);
        }
        const prompt = typeof parsed.value.world_prompt === 'string'
            ? parsed.value.world_prompt.trim()
            : typeof parsed.value.worldPrompt === 'string'
                ? parsed.value.worldPrompt.trim()
                : '';
        if (!prompt) throw new Error('世界观生成解析失败: world_prompt 为空');
        return prompt;
    };

    const messages: 通用消息[] = [
        { role: 'system', content: genSystemPrompt },
        { role: 'user', content: genUserPrompt }
    ];

    const responseFormatJsonObject = 解析JSONMode开关(jsonModeSetting, apiConfig);
    const rawText = await 请求模型文本(apiConfig, messages, {
        temperature: 0.8,
        streamOptions,
        responseFormatJsonObject
    });

    return parseWorldPrompt(rawText);
};

export const generateStoryResponse = async (
    systemPrompt: string,
    userContext: string,
    playerInput: string,
    apiConfig: 当前可用接口结构,
    signal?: AbortSignal,
    streamOptions?: StoryStreamOptions,
    extraPrompt?: string,
    requestOptions?: StoryRequestOptions
): Promise<StoryResponseResult> => {
    if (!apiConfig.apiKey) throw new Error('Missing API Key');

    const normalizedSystemPrompt = typeof systemPrompt === 'string' ? systemPrompt.trim() : '';
    const normalizedContext = typeof userContext === 'string' ? userContext.trim() : '';
    const normalizedExtraPrompt = typeof extraPrompt === 'string' ? extraPrompt.trim() : '';
    const enableCotInjection = requestOptions?.enableCotInjection !== false;
    const cotPseudoHistoryPrompt = typeof requestOptions?.cotPseudoHistoryPrompt === 'string'
        ? requestOptions.cotPseudoHistoryPrompt.trim()
        : 默认COT伪装历史消息提示词.trim();
    const leadingSystemPrompt = typeof requestOptions?.leadingSystemPrompt === 'string'
        ? requestOptions.leadingSystemPrompt.trim()
        : '';
    const styleAssistantPrompt = typeof requestOptions?.styleAssistantPrompt === 'string'
        ? requestOptions.styleAssistantPrompt.trim()
        : '';
    const outputProtocolPrompt = typeof requestOptions?.outputProtocolPrompt === 'string'
        ? requestOptions.outputProtocolPrompt.trim()
        : '';
    const lengthRequirementPrompt = typeof requestOptions?.lengthRequirementPrompt === 'string'
        ? requestOptions.lengthRequirementPrompt.trim()
        : '';
    const disclaimerRequirementPrompt = typeof requestOptions?.disclaimerRequirementPrompt === 'string'
        ? requestOptions.disclaimerRequirementPrompt.trim()
        : '';

    const apiMessages: 通用消息[] = [];
    if (normalizedSystemPrompt) {
        apiMessages.push({ role: 'system', content: normalizedSystemPrompt });
    }
    if (normalizedContext) {
        apiMessages.push({ role: 'system', content: normalizedContext });
    }
    // AI 角色身份声明改为 system 层注入。
    if (leadingSystemPrompt) {
        apiMessages.push({ role: 'system', content: leadingSystemPrompt });
    }
    if (lengthRequirementPrompt) {
        apiMessages.push({ role: 'user', content: lengthRequirementPrompt });
    }
    if (styleAssistantPrompt) {
        apiMessages.push({ role: 'assistant', content: styleAssistantPrompt });
    }
    // 最终输出协议作为系统层覆盖提示，优先级高于普通 assistant 注入。
    if (outputProtocolPrompt) {
        apiMessages.push({ role: 'system', content: outputProtocolPrompt });
    }
    // 免责声明输出要求作为 AI 角色消息，固定在额外要求提示词之前。
    if (disclaimerRequirementPrompt) {
        apiMessages.push({ role: 'assistant', content: disclaimerRequirementPrompt });
    }
    // 额外要求提示词固定放在免责声明输出要求后，作为倒数第三条注入消息。
    if (normalizedExtraPrompt) {
        apiMessages.push({ role: 'assistant', content: normalizedExtraPrompt });
    }

    const normalizedPlayerInput = typeof playerInput === 'string' && playerInput.trim().length > 0
        ? playerInput
        : '开始任务。';
    // 伪装COT历史消息改为放在 user:开始任务 之后。
    if (enableCotInjection && cotPseudoHistoryPrompt) {
        apiMessages.push({ role: 'user', content: '开始任务。' });
        apiMessages.push({ role: 'assistant', content: cotPseudoHistoryPrompt });
    }
    apiMessages.push({
        role: 'user',
        content: normalizedPlayerInput
    });

    // 剧情主链路已切换到标签文本协议，不再请求 JSON mode。
    const responseFormatJsonObject = false;
    const rawText = await 请求模型文本(apiConfig, apiMessages, {
        temperature: 0.7,
        signal,
        streamOptions,
        responseFormatJsonObject,
        errorDetailLimit: requestOptions?.errorDetailLimit
    });

    return {
        response: parseStoryRawText(rawText),
        rawText
    };
};

export const testConnection = async (
    apiConfig: 当前可用接口结构
): Promise<ConnectionTestResult> => {
    if (!apiConfig.apiKey) {
        return { ok: false, detail: '缺少 API Key' };
    }
    if (!apiConfig.baseUrl) {
        return { ok: false, detail: '缺少 Base URL' };
    }
    if (!apiConfig.model) {
        return { ok: false, detail: '缺少模型名称' };
    }

    const messages: 通用消息[] = [
        { role: 'system', content: '你是连接测试。请只回答 OK。' },
        { role: 'user', content: 'ping' }
    ];

    const startedAt = Date.now();
    try {
        const text = await 请求模型文本(apiConfig, messages, {
            temperature: 0,
            responseFormatJsonObject: false,
            errorDetailLimit: Number.POSITIVE_INFINITY
        });
        const elapsed = Date.now() - startedAt;
        const body = typeof text === 'string' ? text : '';
        const content = body.length > 0 ? body : '无响应内容';
        return { ok: true, detail: `耗时: ${elapsed}ms\n\n${content}` };
    } catch (error: any) {
        const raw = error?.detail ?? error?.message ?? error ?? '未知错误';
        const detail = typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2);
        return { ok: false, detail };
    }
};
