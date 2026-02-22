import { 记忆配置结构 } from '../../types';
import { 规范化记忆配置 } from './memoryUtils';
import { normalizeCanonicalGameTime } from './timeUtils';

export const 构建NPC上下文 = (socialData: any[], memoryConfig: 记忆配置结构): {
    在场数据块: string;
    离场数据块: string;
} => {
    const npcList = Array.isArray(socialData) ? socialData : [];
    const 普通关键记忆条数N = 5;
    const 重要角色关键记忆条数N = 规范化记忆配置(memoryConfig).重要角色关键记忆条数N;

    const 清理空字段 = <T extends Record<string, any>>(obj: T): Partial<T> => {
        return Object.fromEntries(
            Object.entries(obj).filter(([, value]) => {
                if (value === undefined || value === null) return false;
                if (typeof value === 'string' && value.trim().length === 0) return false;
                if (Array.isArray(value) && value.length === 0) return false;
                if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) return false;
                return true;
            })
        ) as Partial<T>;
    };

    const 标准化记忆 = (npc: any, limit: number) => {
        if (!Array.isArray(npc?.记忆)) return [];
        return npc.记忆
            .map((m: any) => ({
                时间: typeof m?.时间 === 'string'
                    ? (normalizeCanonicalGameTime(m.时间) || m.时间)
                    : '未知时间',
                内容: typeof m?.内容 === 'string' ? m.内容 : String(m?.内容 ?? '')
            }))
            .filter((m: any) => m.内容.trim().length > 0)
            .slice(-Math.max(1, limit));
    };

    const 提取基础数据 = (npc: any, index: number, 是否队友: boolean) => {
        const 核心性格特征 = typeof npc?.核心性格特征 === 'string' ? npc.核心性格特征.trim() : '';
        const 好感度突破条件 = typeof npc?.好感度突破条件 === 'string' ? npc.好感度突破条件.trim() : '';
        const 关系突破条件 = typeof npc?.关系突破条件 === 'string' ? npc.关系突破条件.trim() : '';
        const 关系网变量 = Array.isArray(npc?.关系网变量)
            ? npc.关系网变量
                .map((item: any) => ({
                    对象姓名: typeof item?.对象姓名 === 'string' ? item.对象姓名.trim() : '',
                    关系: typeof item?.关系 === 'string' ? item.关系.trim() : '',
                    备注: typeof item?.备注 === 'string' ? item.备注.trim() : undefined
                }))
                .filter((item: any) => item.对象姓名 && item.关系)
            : [];
        return {
            索引: index,
            id: typeof npc?.id === 'string' ? npc.id : `npc_${index}`,
            姓名: typeof npc?.姓名 === 'string' ? npc.姓名 : `角色${index}`,
            性别: typeof npc?.性别 === 'string' ? npc.性别 : '未知',
            境界: typeof npc?.境界 === 'string' ? npc.境界 : '未知境界',
            身份: typeof npc?.身份 === 'string' ? npc.身份 : '未知身份',
            是否队友,
            关系状态: typeof npc?.关系状态 === 'string' ? npc.关系状态 : '未知',
            好感度: typeof npc?.好感度 === 'number' ? npc.好感度 : 0,
            简介: typeof npc?.简介 === 'string' ? npc.简介 : '暂无简介',
            ...(核心性格特征 ? { 核心性格特征 } : {}),
            ...(好感度突破条件 ? { 好感度突破条件 } : {}),
            ...(关系突破条件 ? { 关系突破条件 } : {}),
            ...(关系网变量.length > 0 ? { 关系网变量 } : {})
        };
    };

    const 提取完整基础数据 = (npc: any, index: number, 是否队友: boolean) => {
        const 基础 = 提取基础数据(npc, index, 是否队友);
        return 清理空字段({
            ...基础,
            年龄: typeof npc?.年龄 === 'number' ? npc.年龄 : undefined,
            外貌描写: typeof npc?.外貌描写 === 'string' ? npc.外貌描写 : undefined,
            身材描写: typeof npc?.身材描写 === 'string' ? npc.身材描写 : undefined,
            衣着风格: typeof npc?.衣着风格 === 'string' ? npc.衣着风格 : undefined,
            胸部大小: typeof npc?.胸部大小 === 'string' ? npc.胸部大小 : undefined,
            乳头颜色: typeof npc?.乳头颜色 === 'string' ? npc.乳头颜色 : undefined,
            小穴颜色: typeof npc?.小穴颜色 === 'string' ? npc.小穴颜色 : undefined,
            后穴颜色: typeof npc?.后穴颜色 === 'string' ? npc.后穴颜色 : undefined,
            臀部大小: typeof npc?.臀部大小 === 'string' ? npc.臀部大小 : undefined,
            私密特质: typeof npc?.私密特质 === 'string' ? npc.私密特质 : undefined,
            私密总描述: typeof npc?.私密总描述 === 'string' ? npc.私密总描述 : undefined,
            子宫: typeof npc?.子宫 === 'object' && npc.子宫 ? npc.子宫 : undefined,
            是否处女: typeof npc?.是否处女 === 'boolean' ? npc.是否处女 : undefined,
            初夜夺取者: typeof npc?.初夜夺取者 === 'string' ? npc.初夜夺取者 : undefined,
            初夜时间: typeof npc?.初夜时间 === 'string'
                ? (normalizeCanonicalGameTime(npc.初夜时间) || npc.初夜时间)
                : undefined,
            初夜描述: typeof npc?.初夜描述 === 'string' ? npc.初夜描述 : undefined,
            次数_口部: typeof npc?.次数_口部 === 'number' ? npc.次数_口部 : undefined,
            次数_胸部: typeof npc?.次数_胸部 === 'number' ? npc.次数_胸部 : undefined,
            次数_阴部: typeof npc?.次数_阴部 === 'number' ? npc.次数_阴部 : undefined,
            次数_后庭: typeof npc?.次数_后庭 === 'number' ? npc.次数_后庭 : undefined,
            次数_高潮: typeof npc?.次数_高潮 === 'number' ? npc.次数_高潮 : undefined
        });
    };

    const 提取队伍战斗附加 = (npc: any, 是否在场: boolean, 是否队友: boolean) => {
        if (!是否在场 || !是否队友) return undefined;
        const 附加 = 清理空字段({
            攻击力: typeof npc?.攻击力 === 'number' ? npc.攻击力 : undefined,
            防御力: typeof npc?.防御力 === 'number' ? npc.防御力 : undefined,
            上次更新时间: typeof npc?.上次更新时间 === 'string'
                ? (normalizeCanonicalGameTime(npc.上次更新时间) || npc.上次更新时间)
                : undefined,
            当前血量: typeof npc?.当前血量 === 'number' ? npc.当前血量 : undefined,
            最大血量: typeof npc?.最大血量 === 'number' ? npc.最大血量 : undefined,
            当前精力: typeof npc?.当前精力 === 'number' ? npc.当前精力 : undefined,
            最大精力: typeof npc?.最大精力 === 'number' ? npc.最大精力 : undefined,
            当前装备: typeof npc?.当前装备 === 'object' && npc.当前装备 ? npc.当前装备 : undefined,
            背包: Array.isArray(npc?.背包) ? npc.背包 : undefined
        });
        return Object.keys(附加).length > 0 ? 附加 : undefined;
    };

    const 提取最后互动 = (npc: any) => {
        const latest = 标准化记忆(npc, 1)[0];
        return {
            内容: latest?.内容 || '暂无互动',
            时间: latest?.时间 || '未知时间'
        };
    };

    const toEntry = (npc: any, index: number) => {
        const 是否在场 = typeof npc?.是否在场 === 'boolean' ? npc.是否在场 : true;
        const 是否队友 = typeof npc?.是否队友 === 'boolean' ? npc.是否队友 : false;
        const 是否主要角色 = typeof npc?.是否主要角色 === 'boolean' ? npc.是否主要角色 : false;
        const 记忆上限 = 是否主要角色 ? 重要角色关键记忆条数N : 普通关键记忆条数N;
        const 基础数据 = 提取基础数据(npc, index, 是否队友);
        const 完整基础数据 = 提取完整基础数据(npc, index, 是否队友);
        const 队伍战斗附加 = 提取队伍战斗附加(npc, 是否在场, 是否队友);
        const 最后互动 = 提取最后互动(npc);
        return {
            索引: 基础数据.索引,
            id: 基础数据.id,
            姓名: 基础数据.姓名,
            性别: 基础数据.性别,
            境界: 基础数据.境界,
            简介: 基础数据.简介,
            是否在场,
            是否队友,
            是否主要角色,
            基础数据,
            完整基础数据,
            队伍战斗附加,
            最后互动,
            关键记忆: 标准化记忆(npc, 记忆上限)
        };
    };

    const entries = npcList.map((npc, index) => toEntry(npc, index));

    const 在场重要角色档案 = entries
        .filter(n => n.是否在场 && n.是否主要角色)
        .map((n) => {
            const row: Record<string, any> = {
                完整基础数据: n.完整基础数据,
                关键记忆: n.关键记忆
            };
            if (n.队伍战斗附加) {
                row.队伍战斗附加 = n.队伍战斗附加;
            }
            return row;
        });

    const 在场普通角色档案 = entries
        .filter(n => n.是否在场 && !n.是否主要角色)
        .map((n) => {
            const row: Record<string, any> = {
                基础数据: n.基础数据,
                关键记忆: n.关键记忆
            };
            if (n.队伍战斗附加) {
                row.队伍战斗附加 = n.队伍战斗附加;
            }
            return row;
        });

    const 离场重要角色档案 = entries
        .filter(n => !n.是否在场 && n.是否主要角色)
        .map((n) => ({
            完整基础数据: n.完整基础数据,
            关键记忆: n.关键记忆
        }));

    const 离场普通角色简报 = entries
        .filter(n => !n.是否在场 && !n.是否主要角色)
        .map(n => `[${n.索引}]${n.姓名}-${n.性别}-${n.境界}-${n.简介}-${n.最后互动.内容}-${n.最后互动.时间}`);

    const 在场数据 = {
        在场角色: {
            重要角色: 在场重要角色档案,
            普通角色: 在场普通角色档案
        }
    };

    const 离场数据 = {
        离场角色档案: {
            重要角色: 离场重要角色档案,
            普通角色简报: 离场普通角色简报
        }
    };

    return {
        在场数据块: `【当前场景NPC档案】\n${JSON.stringify(在场数据)}`,
        离场数据块: `【离场NPC档案】\n${JSON.stringify(离场数据)}`
    };
};

