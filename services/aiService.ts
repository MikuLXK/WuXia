
import { 接口设置结构, GameResponse } from '../types';

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
你是 WuXia 项目的世界观生成器。任务是只生成“世界观提示词文本”，用于覆盖 prompts/core/world.ts 的内容。

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
- 开场基调：适配玩家建档身份/背景的第0回合落点建议（只给世界观方向，不做变量初始化）
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
        try {
            const json = JSON.parse(content);
            const prompt = typeof json?.world_prompt === 'string' ? json.world_prompt.trim() : '';
            if (!prompt) throw new Error('world_prompt 为空');
            return prompt;
        } catch {
            const start = content.indexOf('{');
            const end = content.lastIndexOf('}');
            if (start >= 0 && end > start) {
                const json = JSON.parse(content.slice(start, end + 1));
                const prompt = typeof json?.world_prompt === 'string' ? json.world_prompt.trim() : '';
                if (!prompt) throw new Error('world_prompt 为空');
                return prompt;
            }
            throw new Error('世界观生成解析失败: 未获得有效 world_prompt');
        }
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
    let doneSignal = false;

    while (!doneSignal) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line.startsWith('data:')) continue;
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

    return parseWorldPrompt(accumulated);
};

export const generateStoryResponse = async (
    systemPrompt: string, 
    userContext: string, 
    playerInput: string,
    apiConfig: 接口设置结构,
    signal?: AbortSignal,
    streamOptions?: StoryStreamOptions
): Promise<GameResponse> => {
    if (!apiConfig.apiKey) throw new Error("Missing API Key");

    const apiMessages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `${userContext}\n\n<玩家输入>${playerInput}</玩家输入>` }
    ];

    const parseJsonToGameResponse = (content: string): GameResponse => {
        try {
            return JSON.parse(content);
        } catch {
            const start = content.indexOf('{');
            const end = content.lastIndexOf('}');
            if (start >= 0 && end > start) {
                try {
                    return JSON.parse(content.slice(start, end + 1));
                } catch {
                    // continue to fallback
                }
            }
            return {
                logs: [{ sender: "系统", text: content }],
                thinking_pre: "解析错误: 返回内容非标准JSON"
            };
        }
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
    let doneSignal = false;

    while (!doneSignal) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line.startsWith('data:')) continue;

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

    return parseJsonToGameResponse(accumulated);
};
