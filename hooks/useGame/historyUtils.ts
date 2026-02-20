import { 聊天记录结构 } from '../../types';

export const formatHistoryToScript = (historyItems: 聊天记录结构[]): string => {
    return historyItems.map((h) => {
        const timeStr = h.gameTime ? `【${h.gameTime}】\n` : '';
        if (h.role === 'user') {
            return `${timeStr}玩家：${h.content}`;
        }
        if (h.role === 'assistant' && h.structuredResponse) {
            const logs = Array.isArray(h.structuredResponse.logs) ? h.structuredResponse.logs : [];
            const lines = logs
                .filter((l) => l.sender !== '【判定】' && l.sender !== '【NSFW判定】')
                .map((l) => `${l.sender}：${l.text}`).join('\n');
            return `${timeStr}${lines}`;
        }
        return '';
    }).join('\n\n');
};
