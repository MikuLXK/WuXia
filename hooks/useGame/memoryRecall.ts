import { 记忆系统结构 } from '../../types';
import { 规范化记忆系统, 格式化回忆名称 } from './memoryUtils';

export const 提取剧情回忆标签 = (rawContent: string): { cleanInput: string; recallTag: string } => {
    const source = typeof rawContent === 'string' ? rawContent : '';
    const matches = Array.from(source.matchAll(/<剧情回忆>([\s\S]*?)<\/剧情回忆>/g));
    const recallTag = matches.map((m) => (m[1] || '').trim()).filter(Boolean).join('\n\n');
    const cleanInput = source.replace(/<剧情回忆>[\s\S]*?<\/剧情回忆>/g, '').trim();
    return { cleanInput, recallTag };
};

const 解析回忆序号列表 = (line: string): string[] => {
    const set = new Set<string>();
    const matches = line.match(/【回忆\d{3}】/g) || [];
    matches.forEach((item) => set.add(item.trim()));
    return Array.from(set);
};

export const 解析剧情回忆输出 = (raw: string): { strongIds: string[]; weakIds: string[]; normalizedText: string } => {
    const text = (raw || '').trim();
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

    const strongLine = lines.find((line) => /^强回忆[:：]/.test(line)) || '强回忆:无';
    const weakLine = lines.find((line) => /^弱回忆[:：]/.test(line)) || '弱回忆:无';
    const strongIds = 解析回忆序号列表(strongLine);
    const weakIds = 解析回忆序号列表(weakLine).filter((id) => !strongIds.includes(id));
    const normalizedStrong = strongIds.length > 0 ? `强回忆:${strongIds.join('|')}` : '强回忆:无';
    const normalizedWeak = weakIds.length > 0 ? `弱回忆:${weakIds.join('|')}` : '弱回忆:无';

    return {
        strongIds,
        weakIds,
        normalizedText: `${normalizedStrong}\n${normalizedWeak}`
    };
};

export const 构建剧情回忆检索上下文 = (mem: 记忆系统结构, fullCount: number): string => {
    const normalized = 规范化记忆系统(mem);
    const archives = Array.isArray(normalized.回忆档案) ? [...normalized.回忆档案] : [];
    if (archives.length === 0) return '暂无可用回忆。';
    const sorted = archives.sort((a, b) => (a.回合 || 0) - (b.回合 || 0));
    const fullN = Math.max(1, Math.floor(fullCount || 20));
    const fullStartIndex = Math.max(0, sorted.length - fullN);

    return sorted.map((item, idx) => {
        const name = typeof item?.名称 === 'string' && item.名称.trim().length > 0
            ? item.名称.trim()
            : 格式化回忆名称((item?.回合 || idx + 1));
        if (idx >= fullStartIndex) {
            return `${name}：\n原文：\n${(item?.原文 || '').trim() || '（无原文）'}`;
        }
        return `${name}：\n短期记忆：${(item?.概括 || '').trim() || '（无概括）'}`;
    }).join('\n\n');
};

export const 根据检索结果构建剧情回忆标签 = (
    mem: 记忆系统结构,
    parsed: { strongIds: string[]; weakIds: string[] }
): string => {
    const normalizedMem = 规范化记忆系统(mem);
    const archives = Array.isArray(normalizedMem.回忆档案) ? normalizedMem.回忆档案 : [];
    const mapByName = new Map<string, any>(archives.map((item) => [item.名称, item]));

    const uniqueStrong = Array.from(new Set(parsed.strongIds));
    const uniqueWeak = Array.from(new Set(parsed.weakIds.filter((id) => !uniqueStrong.includes(id))));

    const strongBlocks = uniqueStrong.map((id) => {
        const matched = mapByName.get(id);
        const rawText = typeof matched?.原文 === 'string' ? matched.原文.trim() : '';
        return `${id}：\n${rawText || '（无原文）'}`;
    });
    const weakBlocks = uniqueWeak.map((id) => {
        const matched = mapByName.get(id);
        const summary = typeof matched?.概括 === 'string' ? matched.概括.trim() : '';
        return `${id}：\n${summary || '（无概括）'}`;
    });

    return [
        '强回忆：',
        strongBlocks.length > 0 ? strongBlocks.join('\n\n') : '无',
        '',
        '弱回忆：',
        weakBlocks.length > 0 ? weakBlocks.join('\n\n') : '无'
    ].join('\n').trim();
};
