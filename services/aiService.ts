import { GameResponse } from '../types';
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
    styleAssistantPrompt?: string;
}

export interface StoryResponseResult {
    response: GameResponse;
    rawText: string;
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

const 提取OpenAI增量文本 = (payload: any): string => {
    const delta = payload?.choices?.[0]?.delta;
    if (typeof delta?.content === 'string' && delta.content) return delta.content;
    const messageContent = payload?.choices?.[0]?.message?.content;
    return typeof messageContent === 'string' ? messageContent : '';
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

const 读取失败详情文本 = async (response: Response): Promise<string> => {
    try {
        const text = (await response.text()).trim();
        if (!text) return '';
        return text.length > 600 ? `${text.slice(0, 600)}...` : text;
    } catch {
        return '';
    }
};

const 解析SSE文本 = async (
    response: Response,
    extractDelta: (payload: any) => string,
    onDelta?: (delta: string, accumulated: string) => void,
    emptyBodyError = 'Stream body is empty'
): Promise<string> => {
    if (!response.body) throw new Error(emptyBodyError);

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let accumulated = '';
    let rawStreamText = '';
    let sawSseFrame = false;
    let doneSignal = false;

    while (!doneSignal) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunkText = decoder.decode(value, { stream: true });
        rawStreamText += chunkText;
        buffer += chunkText;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line.startsWith('data:')) continue;
            sawSseFrame = true;
            const payload = line.slice(5).trim();
            if (!payload) continue;
            if (payload === '[DONE]') {
                doneSignal = true;
                break;
            }

            try {
                const json = JSON.parse(payload);
                const deltaContent = extractDelta(json);
                if (deltaContent) {
                    accumulated += deltaContent;
                    onDelta?.(deltaContent, accumulated);
                }
            } catch {
                // 忽略碎片化或非JSON帧
            }
        }
    }

    if (buffer.trim()) {
        const lines = buffer.split('\n').map(l => l.trim()).filter(Boolean);
        for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            sawSseFrame = true;
            const payload = line.slice(5).trim();
            if (!payload || payload === '[DONE]') continue;
            try {
                const json = JSON.parse(payload);
                const deltaContent = extractDelta(json);
                if (deltaContent) {
                    accumulated += deltaContent;
                    onDelta?.(deltaContent, accumulated);
                }
            } catch {
                // ignore malformed tail chunk
            }
        }
    }

    if (!sawSseFrame) {
        const plainPayload = rawStreamText.trim();
        if (plainPayload) {
            accumulated = plainPayload;
            onDelta?.(plainPayload, accumulated);
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
    responseFormatJsonObject: boolean = false
): Promise<string> => {
    if (!apiConfig.apiKey) throw new Error('Missing API Key');

    const baseUrl = 清理末尾斜杠(apiConfig.baseUrl);
    const endpoint = `${baseUrl}/chat/completions`;
    const enableStream = !!streamOptions?.stream;

    let useStream = enableStream;
    let useResponseFormat = responseFormatJsonObject && !(protocol === 'deepseek' && 模型看起来是DeepSeekReasoner(apiConfig.model));
    let requestMessages = useResponseFormat ? messages : (responseFormatJsonObject ? 添加JSON输出约束(messages) : messages);

    for (let attempt = 0; attempt < 4; attempt++) {
        const body: Record<string, unknown> = {
            model: apiConfig.model,
            messages: requestMessages,
            temperature,
            stream: useStream
        };
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
            const detail = await 读取失败详情文本(response);
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

        return 解析SSE文本(response, 提取OpenAI增量文本, streamOptions?.onDelta, 'Stream body is empty');
    }

    throw new Error('API request failed after retries');
};

const 请求Gemini文本 = async (
    apiConfig: 当前可用接口结构,
    messages: 通用消息[],
    temperature: number,
    signal?: AbortSignal,
    streamOptions?: 通用流式选项,
    responseFormatJsonObject: boolean = false
): Promise<string> => {
    if (!apiConfig.apiKey) throw new Error('Missing API Key');
    const model = 规范化Gemini模型名(apiConfig.model);
    if (!model) throw new Error('Gemini model is required');

    const enableStream = !!streamOptions?.stream;
    let useStream = enableStream;
    const baseUrl = 规范化Gemini基础地址(apiConfig.baseUrl);
    const path = `/v1beta/models/${encodeURIComponent(model)}:${useStream ? 'streamGenerateContent' : 'generateContent'}${useStream ? '?alt=sse' : ''}`;
    const { systemInstruction, contents } = 组装Gemini消息(messages, responseFormatJsonObject);

    const generationConfig: Record<string, unknown> = {
        temperature
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
            const detail = await 读取失败详情文本(response);
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
    responseFormatJsonObject: boolean = false
): Promise<string> => {
    if (!apiConfig.apiKey) throw new Error('Missing API Key');
    const baseUrl = 规范化Claude基础地址(apiConfig.baseUrl);
    const endpoint = `${baseUrl}/v1/messages`;
    const enableStream = !!streamOptions?.stream;
    let useStream = enableStream;

    const { system, list, prefillJsonBrace } = 组装Claude消息(messages, responseFormatJsonObject);

    const buildBody = (stream: boolean) => ({
        model: apiConfig.model,
        max_tokens: 8192,
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
            const detail = await 读取失败详情文本(response);
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
    }
): Promise<string> => {
    const protocol = 判定请求协议(apiConfig);
    const jsonMode = Boolean(options.responseFormatJsonObject);

    if (protocol === 'gemini') {
        return 请求Gemini文本(apiConfig, messages, options.temperature, options.signal, options.streamOptions, jsonMode);
    }

    if (protocol === 'claude') {
        return 请求Claude文本(apiConfig, messages, options.temperature, options.signal, options.streamOptions, jsonMode);
    }

    if (protocol === 'deepseek') {
        return 请求OpenAI家族文本(apiConfig, 'deepseek', messages, options.temperature, options.signal, options.streamOptions, jsonMode);
    }

    return 请求OpenAI家族文本(apiConfig, 'openai', messages, options.temperature, options.signal, options.streamOptions, jsonMode);
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
    streamOptions?: WorldStreamOptions
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

    const rawText = await 请求模型文本(apiConfig, messages, {
        temperature: 0.8,
        streamOptions,
        responseFormatJsonObject: true
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
    const styleAssistantPrompt = typeof requestOptions?.styleAssistantPrompt === 'string'
        ? requestOptions.styleAssistantPrompt.trim()
        : '';

    const apiMessages: 通用消息[] = [];
    if (normalizedSystemPrompt) {
        apiMessages.push({ role: 'system', content: normalizedSystemPrompt });
    }
    if (normalizedContext) {
        apiMessages.push({ role: 'system', content: normalizedContext });
    }
    if (normalizedExtraPrompt) {
        apiMessages.push({ role: 'system', content: `【额外要求提示词】\n${normalizedExtraPrompt}` });
    }
    apiMessages.push({ role: 'user', content: `<玩家输入>${playerInput}</玩家输入>` });
    if (styleAssistantPrompt) {
        apiMessages.push({ role: 'assistant', content: styleAssistantPrompt });
    }
    if (enableCotInjection && cotPseudoHistoryPrompt) {
        apiMessages.push({ role: 'assistant', content: cotPseudoHistoryPrompt });
    }

    const normalizeGameResponse = (raw: any): GameResponse => {
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

    const parseJsonToGameResponse = (content: string): GameResponse => {
        const parsed = parseJsonWithRepair<any>(content);
        if (parsed.value && typeof parsed.value === 'object') {
            const normalized = normalizeGameResponse(parsed.value);
            const hasThinking = Object.keys(normalized).some((key) => {
                const isThinkingField = key.startsWith('t_') || key === 'thinking_pre' || key === 'thinking_post';
                return isThinkingField && typeof (normalized as any)[key] === 'string' && (normalized as any)[key].trim().length > 0;
            });
            if (normalized.logs.length > 0 || hasThinking) {
                return normalized;
            }
        }
        return {
            logs: [{ sender: '系统', text: content }],
            thinking_pre: `<thinking>解析错误: 返回内容非标准JSON（${parsed.error || 'unknown'}）</thinking>`
        };
    };

    const rawText = await 请求模型文本(apiConfig, apiMessages, {
        temperature: 0.7,
        signal,
        streamOptions,
        responseFormatJsonObject: true
    });

    return {
        response: parseJsonToGameResponse(rawText),
        rawText
    };
};
