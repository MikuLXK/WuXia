
import { 接口设置结构, GameResponse } from '../types';

export const generateWorldData = async (prompt: string, charData: any, apiConfig: 接口设置结构) => {
    if (!apiConfig.apiKey) throw new Error("Missing API Key");

    const genPrompt = `
你是一个硬核武侠游戏的世界构建者。请根据以下配置生成初始游戏数据（JSON格式）。

${prompt}

【玩家基础】
${JSON.stringify(charData)}

【要求】
1. 生成完整的 'gameState.世界' (含势力列表、活跃NPC列表)。
2. 生成完整的 'gameState.角色' (基于玩家基础完善数值，添加初始物品/功法)。
3. 生成初始 'gameState.社交' (2-3个初始NPC，如师傅、发小)。
4. 生成 'gameState.环境' (初始地点)。
5. 生成 'gameState.玩家门派' (若玩家选了门派，或生成默认门派)。
6. 生成 'gameState.剧情' (仅第一章的基础设定，不含历史)。

请返回一个 JSON 对象，包含: { 世界, 角色, 社交, 环境, 玩家门派, 剧情 }。
不要返回任何 Markdown，只返回纯 JSON。
    `;

    const response = await fetch(`${apiConfig.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiConfig.apiKey}`
        },
        body: JSON.stringify({
            model: apiConfig.model,
            messages: [{ role: 'system', content: genPrompt }],
            temperature: 0.8,
            response_format: { type: "json_object" }
        })
    });

    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
};

export const generateStoryResponse = async (
    systemPrompt: string, 
    userContext: string, 
    playerInput: string,
    apiConfig: 接口设置结构,
    signal?: AbortSignal
): Promise<GameResponse> => {
    if (!apiConfig.apiKey) throw new Error("Missing API Key");

    const apiMessages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `${userContext}\n\n<玩家输入>${playerInput}</玩家输入>` }
    ];

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
            stream: false 
        }),
        signal
    });

    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    try {
        return JSON.parse(content);
    } catch (e) {
        // Fallback if not JSON
        return {
            logs: [{ sender: "系统", text: content }],
            thinking_pre: "解析错误: 返回内容非标准JSON"
        };
    }
};
