import { 聊天记录结构, 提示词结构 } from '../types';

export type TokenEstimateBreakdown = {
    chars: number;
    cjk: number;
    latinWords: number;
    numbers: number;
    symbols: number;
    estimatedTokens: number;
};

export const estimateTextTokens = (text: string): number => {
    const src = (text || '').trim();
    if (!src) return 0;

    const cjkMatches = src.match(/[\u3400-\u9fff\uf900-\ufaff]/g) || [];
    const latinWordMatches = src.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) || [];
    const numberMatches = src.match(/\d+(?:\.\d+)?/g) || [];
    const noSpaceChars = src.replace(/\s+/g, '').length;
    const cjkChars = cjkMatches.length;
    const latinChars = latinWordMatches.join('').length;
    const numberChars = numberMatches.join('').replace(/\./g, '').length;
    const symbolChars = Math.max(0, noSpaceChars - cjkChars - latinChars - numberChars);

    // Heuristic:
    // - CJK ~= 0.8 token/char
    // - Latin words ~= 1 token/word
    // - Numbers ~= 0.6 token/number group
    // - Symbols/punctuation ~= 0.3 token/char
    const estimate = Math.ceil(
        cjkChars * 0.8 +
        latinWordMatches.length * 1.0 +
        numberMatches.length * 0.6 +
        symbolChars * 0.3
    );

    return Math.max(1, estimate);
};

export const estimateTextTokensWithBreakdown = (text: string): TokenEstimateBreakdown => {
    const src = (text || '').trim();
    if (!src) {
        return { chars: 0, cjk: 0, latinWords: 0, numbers: 0, symbols: 0, estimatedTokens: 0 };
    }
    const cjkMatches = src.match(/[\u3400-\u9fff\uf900-\ufaff]/g) || [];
    const latinWordMatches = src.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) || [];
    const numberMatches = src.match(/\d+(?:\.\d+)?/g) || [];
    const noSpaceChars = src.replace(/\s+/g, '').length;
    const cjkChars = cjkMatches.length;
    const latinChars = latinWordMatches.join('').length;
    const numberChars = numberMatches.join('').replace(/\./g, '').length;
    const symbolChars = Math.max(0, noSpaceChars - cjkChars - latinChars - numberChars);
    return {
        chars: src.length,
        cjk: cjkChars,
        latinWords: latinWordMatches.length,
        numbers: numberMatches.length,
        symbols: symbolChars,
        estimatedTokens: estimateTextTokens(src)
    };
};

export const buildHistoryTokenSource = (item: 聊天记录结构): string => {
    if (item.role === 'assistant' && item.structuredResponse) {
        const thinkingKeys = [
            'thinking_pre',
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
            'thinking_post',
            't_mem',
            't_opts'
        ] as const;
        const thinkingText = thinkingKeys
            .map((key) => item.structuredResponse?.[key] || '')
            .filter(Boolean)
            .join('\n');
        const logs = Array.isArray(item.structuredResponse.logs)
            ? item.structuredResponse.logs.map((log) => `${log.sender}：${log.text || ''}`).join('\n')
            : '';
        const shortTerm = item.structuredResponse.shortTerm || '';
        const actionOptions = Array.isArray(item.structuredResponse.action_options)
            ? item.structuredResponse.action_options.join('\n')
            : '';
        return [thinkingText, logs, shortTerm, actionOptions].filter(Boolean).join('\n');
    }
    return item.content || '';
};

export const estimateHistoryItemTokens = (item: 聊天记录结构): number => {
    return estimateTextTokens(buildHistoryTokenSource(item));
};

export const estimateHistoryTokens = (history: 聊天记录结构[]): number => {
    return (history || []).reduce((sum, item) => sum + estimateHistoryItemTokens(item), 0);
};

export const estimatePromptPoolTokens = (prompts: 提示词结构[]): number => {
    const enabled = (prompts || []).filter((prompt) => prompt.启用);
    return enabled.reduce((sum, prompt) => sum + estimateTextTokens(prompt.内容 || ''), 0);
};
