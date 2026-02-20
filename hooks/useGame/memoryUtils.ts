import { GameResponse, 记忆系统结构, 记忆配置结构 } from '../../types';
import { 默认中期转长期提示词, 默认短期转中期提示词 } from '../../prompts/runtime/defaults';

export const 即时短期分隔标记 = '\n<<SHORT_TERM_SYNC>>\n';

export const 拆分即时与短期 = (entry: string): { 即时内容: string; 短期摘要: string } => {
    const raw = (entry || '').trim();
    if (!raw) return { 即时内容: '', 短期摘要: '' };
    const splitAt = raw.lastIndexOf(即时短期分隔标记);
    if (splitAt < 0) return { 即时内容: raw, 短期摘要: '' };
    return {
        即时内容: raw.slice(0, splitAt).trim(),
        短期摘要: raw.slice(splitAt + 即时短期分隔标记.length).trim()
    };
};

export const 格式化回忆名称 = (round: number): string => `【回忆${String(Math.max(1, round)).padStart(3, '0')}】`;

export const 从即时记忆推导回忆档案 = (即时记忆: string[]): 记忆系统结构['回忆档案'] => {
    return 即时记忆
        .map((item, index) => {
            const { 即时内容, 短期摘要 } = 拆分即时与短期(item);
            const hasContent = 即时内容.trim().length > 0 || 短期摘要.trim().length > 0;
            if (!hasContent) return null;
            const round = index + 1;
            return {
                名称: 格式化回忆名称(round),
                概括: 短期摘要.trim(),
                原文: 即时内容.trim(),
                回合: round,
                记录时间: '未知时间',
                时间戳: 0
            };
        })
        .filter(Boolean) as 记忆系统结构['回忆档案'];
};

export const 规范化记忆系统 = (raw?: Partial<记忆系统结构> | null): 记忆系统结构 => {
    const 即时记忆 = Array.isArray(raw?.即时记忆) ? [...raw!.即时记忆] : [];
    const 回忆档案 = Array.isArray((raw as any)?.回忆档案)
        ? (raw as any).回忆档案
            .map((item: any, idx: number) => {
                if (!item || typeof item !== 'object') return null;
                const round = Number(item.回合);
                const normalizedRound = Number.isFinite(round) && round > 0 ? Math.floor(round) : idx + 1;
                return {
                    名称: typeof item.名称 === 'string' && item.名称.trim()
                        ? item.名称.trim()
                        : 格式化回忆名称(normalizedRound),
                    概括: typeof item.概括 === 'string' ? item.概括 : '',
                    原文: typeof item.原文 === 'string' ? item.原文 : '',
                    回合: normalizedRound,
                    记录时间: typeof item.记录时间 === 'string' ? item.记录时间 : '未知时间',
                    时间戳: typeof item.时间戳 === 'number' && Number.isFinite(item.时间戳) ? item.时间戳 : 0
                };
            })
            .filter(Boolean)
        : 从即时记忆推导回忆档案(即时记忆);

    return {
        回忆档案,
        即时记忆,
        短期记忆: Array.isArray(raw?.短期记忆) ? [...raw!.短期记忆] : [],
        中期记忆: Array.isArray(raw?.中期记忆) ? [...raw!.中期记忆] : [],
        长期记忆: Array.isArray(raw?.长期记忆) ? [...raw!.长期记忆] : []
    };
};

export const 规范化记忆配置 = (raw?: Partial<记忆配置结构> | null): 记忆配置结构 => ({
    短期记忆阈值: Math.max(5, Number(raw?.短期记忆阈值) || 30),
    中期记忆阈值: Math.max(20, Number(raw?.中期记忆阈值) || 50),
    重要角色关键记忆条数N: Math.max(1, Number(raw?.重要角色关键记忆条数N) || 20),
    短期转中期提示词: typeof raw?.短期转中期提示词 === 'string'
        ? raw.短期转中期提示词
        : 默认短期转中期提示词,
    中期转长期提示词: typeof raw?.中期转长期提示词 === 'string'
        ? raw.中期转长期提示词
        : 默认中期转长期提示词
});

export const 生成记忆摘要 = (batch: string[], source: '短期' | '中期'): string => {
    const filtered = batch.map(item => item.trim()).filter(Boolean);
    if (filtered.length === 0) return source === '短期' ? '短期记忆汇总（空）' : '中期记忆汇总（空）';
    const first = filtered[0];
    const last = filtered[filtered.length - 1];
    const preview = filtered.slice(0, 3).join('；');
    return `${source}汇总(${filtered.length}): ${first} -> ${last}｜要点: ${preview}`.slice(0, 300);
};

export const 格式化记忆时间 = (raw: string): string => {
    if (typeof raw !== 'string') return '【未知时间】';
    const m = raw.trim().match(/^(\d{1,6}):(\d{1,2}):(\d{1,2}):(\d{1,2}):(\d{1,2})$/);
    if (!m) return `【${raw || '未知时间'}】`;
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    const hour = Number(m[4]).toString().padStart(2, '0');
    const minute = Number(m[5]).toString().padStart(2, '0');
    return `【${year}年${month}月${day}日-${hour}:${minute}】`;
};

export const 构建即时记忆条目 = (
    gameTime: string,
    playerInput: string,
    aiData: GameResponse,
    options?: { 省略玩家输入?: boolean }
): string => {
    const timeLabel = 格式化记忆时间(gameTime || '未知时间');
    const logsText = Array.isArray(aiData.logs) && aiData.logs.length > 0
        ? aiData.logs
            .map((log) => `${log.sender}：${(log.text || '').trim()}`)
            .join('\n')
        : '（本轮无有效剧情日志）';
    const lines = [timeLabel];
    if (!options?.省略玩家输入) {
        lines.push(`玩家输入：${playerInput || '（空输入）'}`);
    }
    lines.push('AI输出：', logsText);
    return lines.join('\n').trim();
};

export const 构建短期记忆条目 = (gameTime: string, playerInput: string, aiData: GameResponse): string => {
    const timeLabel = 格式化记忆时间(gameTime || '未知时间');
    const summary = (aiData.shortTerm || '').trim() ||
        (Array.isArray(aiData.logs)
            ? aiData.logs.map(log => `${log.sender}:${log.text}`).join(' ').slice(0, 180)
            : '本回合推进');
    return `${timeLabel} ${playerInput} -> ${summary}`;
};

export const 合并即时与短期 = (immediateEntry: string, shortEntry: string): string => {
    const full = immediateEntry.trim();
    const summary = shortEntry.trim();
    if (!summary) return full;
    return `${full}${即时短期分隔标记}${summary}`;
};

export const 写入四段记忆 = (
    memoryBase: 记忆系统结构,
    immediateEntry: string,
    shortEntry: string,
    options?: {
        shortLimit?: number;
        midLimit?: number;
        recordTime?: string;
        timestamp?: number;
    }
): 记忆系统结构 => {
    const next = 规范化记忆系统(memoryBase);
    const full = immediateEntry.trim();
    const summary = shortEntry.trim();
    if (!full && !summary) return next;

    const shortLimit = Math.max(5, Number(options?.shortLimit) || 30);

    if (full) next.即时记忆.push(合并即时与短期(full, summary));
    else if (summary) next.短期记忆.push(summary);

    if (full || summary) {
        const round = (next.回忆档案?.length || 0) + 1;
        next.回忆档案.push({
            名称: 格式化回忆名称(round),
            概括: summary,
            原文: full,
            回合: round,
            记录时间: options?.recordTime || '未知时间',
            时间戳: options?.timestamp || Date.now()
        });
    }

    while (next.即时记忆.length > shortLimit) {
        const shifted = next.即时记忆.shift();
        if (!shifted) continue;
        const { 短期摘要 } = 拆分即时与短期(shifted);
        if (短期摘要) next.短期记忆.push(短期摘要);
    }

    while (next.短期记忆.length > shortLimit) {
        const batch = next.短期记忆.splice(0, shortLimit);
        next.中期记忆.push(生成记忆摘要(batch, '短期'));
    }

    const midLimit = Math.max(3, Number(options?.midLimit) || 50);
    while (next.中期记忆.length > midLimit) {
        const batch = next.中期记忆.splice(0, midLimit);
        next.长期记忆.push(生成记忆摘要(batch, '中期'));
    }

    return next;
};
