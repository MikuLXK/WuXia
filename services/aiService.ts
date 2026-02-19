
import { 接口设置结构, GameResponse } from '../types';
import { parseJsonWithRepair } from '../utils/jsonRepair';

interface StoryStreamOptions {
    stream?: boolean;
    onDelta?: (delta: string, accumulated: string) => void;
}

interface WorldStreamOptions {
    stream?: boolean;
    onDelta?: (delta: string, accumulated: string) => void;
}

export const generateWorldData = async (
    worldContext: string,
    charData: any,
    apiConfig: 接口设置结构,
    streamOptions?: WorldStreamOptions
): Promise<string> => {
    if (!apiConfig.apiKey) throw new Error("Missing API Key");

    const genSystemPrompt = `
你是 WuXia 项目的世界观生成器。任务是只生成“世界观设定文本（world_prompt）”。

【输出要求（必须）】
1. 仅输出一个 JSON 对象，禁止 Markdown、解释、注释。
2. JSON 必须只有一个核心字段：\`world_prompt\`（字符串）。
3. \`world_prompt\` 必须是可直接注入系统提示词的完整世界观文本。
4. 内容只允许“世界观信息”，不要包含 tavern_commands、JSON 输出格式规则、UI 说明。

【world_prompt 必含信息】
- 世界总览：世界名称、时代基调、地理尺度、社会秩序
- 势力版图：主要势力（立场、目标、关系）
- 社会环境：治安、经济、江湖风气、朝廷与宗门关系
- 风险生态：主要冲突、危险区域、典型生存压力
    `;

    const genUserPrompt = `
【世界生成上下文】
${worldContext}

【玩家建档输入（必须严格参考）】
${JSON.stringify(charData)}

【生成目标】
- 只生成世界观提示词文本（world_prompt）。
- 变量初始化（角色/环境/世界/社交/剧情具体数值）将在“开场剧情生成”阶段完成，此处不要做状态初始化输出。
    `.trim();

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

    const enableStream = !!streamOptions?.stream;

    const response = await fetch(`${apiConfig.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiConfig.apiKey}`
        },
        body: JSON.stringify({
            model: apiConfig.model,
            messages: [
                { role: 'system', content: genSystemPrompt },
                { role: 'user', content: genUserPrompt }
            ],
            temperature: 0.8,
            response_format: { type: "json_object" },
            stream: enableStream
        })
    });

    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    if (!enableStream) {
        const data = await response.json();
        return parseWorldPrompt(data.choices[0].message.content);
    }

    if (!response.body) throw new Error("World stream body is empty");

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
                const deltaContent =
                    json?.choices?.[0]?.delta?.content ??
                    json?.choices?.[0]?.message?.content ??
                    '';
                if (deltaContent) {
                    accumulated += deltaContent;
                    streamOptions?.onDelta?.(deltaContent, accumulated);
                }
            } catch {
                // ignore malformed chunk
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
                const deltaContent =
                    json?.choices?.[0]?.delta?.content ??
                    json?.choices?.[0]?.message?.content ??
                    '';
                if (deltaContent) {
                    accumulated += deltaContent;
                    streamOptions?.onDelta?.(deltaContent, accumulated);
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
            streamOptions?.onDelta?.(plainPayload, accumulated);
        }
    }

    return parseWorldPrompt(accumulated);
};

export const generateStoryResponse = async (
    systemPrompt: string, 
    userContext: string, 
    playerInput: string,
    apiConfig: 接口设置结构,
    signal?: AbortSignal,
    streamOptions?: StoryStreamOptions,
    extraPrompt?: string
): Promise<GameResponse> => {
    if (!apiConfig.apiKey) throw new Error("Missing API Key");

    const extraPromptBlock = typeof extraPrompt === 'string' && extraPrompt.trim().length > 0
        ? `\n\n【额外要求提示词】\n${extraPrompt.trim()}`
        : '';

    const apiMessages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `${userContext}\n\n<玩家输入>${playerInput}</玩家输入>${extraPromptBlock}` }
    ];

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

        return {
            thinking_pre: typeof raw?.thinking_pre === 'string' ? raw.thinking_pre : undefined,
            logs,
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
            if (normalized.logs.length > 0 || normalized.thinking_pre || normalized.thinking_post) {
                return normalized;
            }
        }
        return {
            logs: [{ sender: "系统", text: content }],
            thinking_pre: `解析错误: 返回内容非标准JSON（${parsed.error || 'unknown'}）`
        };
    };

    const enableStream = !!streamOptions?.stream;

    const response = await fetch(`${apiConfig.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiConfig.apiKey}`
        },
        body: JSON.stringify({
            model: apiConfig.model,
            messages: apiMessages,
            temperature: 0.7,
            response_format: { type: "json_object" },
            stream: enableStream
        }),
        signal
    });

    if (!response.ok) throw new Error(`API Error: ${response.status}`);

    if (!enableStream) {
        const data = await response.json();
        const content = data.choices[0].message.content;
        return parseJsonToGameResponse(content);
    }

    if (!response.body) {
        throw new Error("Stream body is empty");
    }

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
                const deltaContent =
                    json?.choices?.[0]?.delta?.content ??
                    json?.choices?.[0]?.message?.content ??
                    '';

                if (deltaContent) {
                    accumulated += deltaContent;
                    streamOptions?.onDelta?.(deltaContent, accumulated);
                }
            } catch {
                // Ignore non-JSON line fragments.
            }
        }
    }

    if (buffer.trim()) {
        const trailingLines = buffer.split('\n').map(l => l.trim()).filter(Boolean);
        for (const line of trailingLines) {
            if (!line.startsWith('data:')) continue;
            sawSseFrame = true;
            const payload = line.slice(5).trim();
            if (!payload || payload === '[DONE]') continue;
            try {
                const json = JSON.parse(payload);
                const deltaContent =
                    json?.choices?.[0]?.delta?.content ??
                    json?.choices?.[0]?.message?.content ??
                    '';
                if (deltaContent) {
                    accumulated += deltaContent;
                    streamOptions?.onDelta?.(deltaContent, accumulated);
                }
            } catch {
                // Ignore trailing parse errors.
            }
        }
    }

    if (!sawSseFrame) {
        const plainPayload = rawStreamText.trim();
        if (plainPayload) {
            accumulated = plainPayload;
            streamOptions?.onDelta?.(plainPayload, accumulated);
        }
    }

    return parseJsonToGameResponse(accumulated);
};
