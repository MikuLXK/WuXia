
import { 
    角色数据结构,
    环境信息结构,
    聊天记录结构, 
    接口设置结构,
    提示词结构,
    存档结构,
    视觉设置结构,
    节日结构,
    GameResponse,
    游戏设置结构,
    记忆配置结构,
    记忆系统结构,
    WorldGenConfig,
    世界数据结构,
    战斗状态结构,
    默认战斗状态,
    详细门派结构,
    剧情系统结构,
    装备槽位
} from '../types';
import { useEffect, useRef, useState } from 'react';
import * as dbService from '../services/dbService';
import * as aiService from '../services/aiService';
import { applyStateCommand } from '../utils/stateHelpers';
import { parseJsonWithRepair } from '../utils/jsonRepair';
import { useGameState } from './useGameState';
import { 规范化接口设置, 获取主剧情接口配置, 接口配置是否可用 } from '../utils/apiConfig';

type 回合快照结构 = {
    玩家输入: string;
    游戏时间: string;
    回档前状态: {
        角色: 角色数据结构;
        环境: 环境信息结构;
        社交: any[];
        世界: 世界数据结构;
        战斗: 战斗状态结构;
        玩家门派: 详细门派结构;
        任务列表: any[];
        约定列表: any[];
        剧情: 剧情系统结构;
        记忆系统: 记忆系统结构;
    };
    回档前历史: 聊天记录结构[];
};

type 最近开局配置结构 = {
    worldConfig: WorldGenConfig;
    charData: 角色数据结构;
    openingStreaming: boolean;
};

type 上下文段 = {
    id: string;
    title: string;
    category: string;
    order: number;
    content: string;
};

type 上下文快照 = {
    sections: 上下文段[];
    fullText: string;
};

export const useGame = () => {
    const gameState = useGameState();
    const {
        view, setView,
        hasSave, setHasSave,
        角色, 设置角色,
        环境, 设置环境,
        社交, 设置社交,
        世界, 设置世界,
        战斗, 设置战斗,
        玩家门派, 设置玩家门派,
        任务列表, 设置任务列表,
        约定列表, 设置约定列表,
        剧情, 设置剧情,
        历史记录, 设置历史记录,
        记忆系统, 设置记忆系统,
        loading, setLoading,
        worldEvents, setWorldEvents,
        showSettings, setShowSettings,
        showInventory, setShowInventory,
        showEquipment, setShowEquipment,
        showSocial, setShowSocial,
        showTeam, setShowTeam,
        showKungfu, setShowKungfu,
        showWorld, setShowWorld,
        showSect, setShowSect,
        showTask, setShowTask,
        showAgreement, setShowAgreement,
        showStory, setShowStory,
        showMemory, setShowMemory,
        showSaveLoad, setShowSaveLoad,
        activeTab, setActiveTab,
        
        apiConfig, setApiConfig,
        visualConfig, setVisualConfig,
        gameConfig, setGameConfig,
        memoryConfig, setMemoryConfig,
        prompts, setPrompts,
        festivals, setFestivals,
        currentTheme, setCurrentTheme,
        contextSize, setContextSize,
        scrollRef, abortControllerRef
    } = gameState;
    const 回合快照栈Ref = useRef<回合快照结构[]>([]);
    const [可重Roll计数, set可重Roll计数] = useState(0);
    const [最近开局配置, 设置最近开局配置] = useState<最近开局配置结构 | null>(null);

    // --- Actions ---
    const 深拷贝 = <T,>(data: T): T => JSON.parse(JSON.stringify(data)) as T;
    const 默认装备模板 = {
        头部: '无',
        胸部: '无',
        腿部: '无',
        手部: '无',
        足部: '无',
        主武器: '无',
        副武器: '无',
        暗器: '无',
        背部: '无',
        腰部: '无',
        坐骑: '无'
    };
    const 默认金钱模板 = {
        金元宝: 0,
        银子: 0,
        铜钱: 0
    };
    const 规范化货币数值 = (value: unknown): number => {
        const n = Number(value);
        if (!Number.isFinite(n)) return 0;
        return Math.max(0, Math.floor(n));
    };
    const 取地点片段 = (raw: unknown): string => (typeof raw === 'string' ? raw.trim() : '');
    const 去除具体地点冗余 = (specificRaw: string, smallRaw: string): string => {
        const specific = 取地点片段(specificRaw);
        const small = 取地点片段(smallRaw);
        if (!specific || !small) return specific;
        if (!specific.startsWith(small)) return specific;
        const stripped = specific.slice(small.length).replace(/^[\s\-—>·/|，,、。:：]+/, '').trim();
        return stripped || specific;
    };
    const 拼接遗留地点 = (...parts: unknown[]): string => {
        const values = parts
            .map((part) => 取地点片段(part))
            .filter(Boolean);
        const unique = values.filter((part, idx) => values.indexOf(part) === idx);
        return unique.join('·');
    };
    const 规范化环境信息 = (rawEnv?: any): 环境信息结构 => {
        const source = rawEnv && typeof rawEnv === 'object' ? rawEnv : {};
        const 大地点 = 取地点片段(source?.大地点) || 拼接遗留地点(source?.洲, source?.国);
        const 中地点 = 取地点片段(source?.中地点) || 拼接遗留地点(source?.郡, source?.县);
        const 小地点 = 取地点片段(source?.小地点) || 拼接遗留地点(source?.村);
        const 原始具体地点 = 取地点片段(source?.具体地点);
        const 具体地点 = 去除具体地点冗余(原始具体地点, 小地点);
        const rawFestival = source?.节日 && typeof source.节日 === 'object' ? source.节日 : null;
        const rawFestivalLegacy = source?.节日信息 && typeof source.节日信息 === 'object' ? source.节日信息 : null;
        const rawFestivalName = typeof source?.节日 === 'string' ? source.节日.trim() : '';
        const festivalSource = rawFestival || rawFestivalLegacy;
        const 节日 = festivalSource
            ? {
                名称: typeof festivalSource?.名称 === 'string'
                    ? festivalSource.名称.trim()
                    : rawFestivalName,
                简介: typeof festivalSource?.简介 === 'string'
                    ? festivalSource.简介.trim()
                    : typeof festivalSource?.描述 === 'string'
                        ? festivalSource.描述.trim()
                        : '',
                效果: typeof festivalSource?.效果 === 'string' ? festivalSource.效果.trim() : ''
            }
            : (rawFestivalName ? { 名称: rawFestivalName, 简介: '', 效果: '' } : null);
        const 原始游戏天数 = typeof source?.游戏天数 === 'number' && Number.isFinite(source.游戏天数)
            ? source.游戏天数
            : typeof source?.日期 === 'number' && Number.isFinite(source.日期)
                ? source.日期
                : 1;
        return {
            时间: typeof source?.时间 === 'string' ? source.时间 : '',
            大地点,
            中地点,
            小地点,
            具体地点,
            节日,
            天气: typeof source?.天气 === 'string' ? source.天气 : '',
            环境描述: typeof source?.环境描述 === 'string' ? source.环境描述 : '',
            游戏天数: Math.max(1, Math.floor(原始游戏天数))
        };
    };
    const 构建完整地点文本 = (env: any): string => {
        const normalized = 规范化环境信息(env);
        const parts = [normalized.大地点, normalized.中地点, normalized.小地点, normalized.具体地点]
            .map((part) => part.trim())
            .filter(Boolean);
        const unique = parts.filter((part, idx) => parts.indexOf(part) === idx);
        return unique.length > 0 ? unique.join(' > ') : '未知地点';
    };
    const 规范化角色物品容器映射 = (rawRole: 角色数据结构): 角色数据结构 => {
        const 装备槽位列表: 装备槽位[] = ['头部', '胸部', '腿部', '手部', '足部', '主武器', '副武器', '暗器', '背部', '腰部', '坐骑'];
        const 装备槽位集合 = new Set<string>(装备槽位列表);
        const 槽位ID片段映射: Record<装备槽位, string> = {
            头部: 'head',
            胸部: 'chest',
            腿部: 'legs',
            手部: 'hands',
            足部: 'feet',
            主武器: 'main_weapon',
            副武器: 'off_weapon',
            暗器: 'hidden_weapon',
            背部: 'back',
            腰部: 'waist',
            坐骑: 'mount'
        };
        const 槽位类型映射: Record<装备槽位, '武器' | '防具' | '容器' | '杂物'> = {
            头部: '防具',
            胸部: '防具',
            腿部: '防具',
            手部: '防具',
            足部: '防具',
            主武器: '武器',
            副武器: '武器',
            暗器: '武器',
            背部: '容器',
            腰部: '容器',
            坐骑: '杂物'
        };

        const role = 深拷贝(rawRole);
        if (typeof (role as any).外貌 !== 'string' || !(role as any).外貌.trim()) {
            (role as any).外貌 = '相貌平常，衣着朴素。';
        }
        const rawMoney = (role as any).金钱 && typeof (role as any).金钱 === 'object' ? (role as any).金钱 : {};
        const legacyMoney = {
            金元宝: (role as any).金元宝,
            银子: (role as any).银子,
            铜钱: (role as any).铜钱
        };
        (role as any).金钱 = {
            金元宝: 规范化货币数值(rawMoney?.金元宝 ?? legacyMoney.金元宝 ?? 默认金钱模板.金元宝),
            银子: 规范化货币数值(rawMoney?.银子 ?? legacyMoney.银子 ?? 默认金钱模板.银子),
            铜钱: 规范化货币数值(rawMoney?.铜钱 ?? legacyMoney.铜钱 ?? 默认金钱模板.铜钱)
        };

        const rawEquip = role?.装备 && typeof role.装备 === 'object' ? role.装备 : ({} as any);
        role.装备 = { ...默认装备模板, ...(rawEquip as any) };

        const sourceList = Array.isArray(role?.物品列表) ? role.物品列表 : [];

        const deduped: any[] = [];
        const seenIds = new Set<string>();
        sourceList.forEach((item: any, idx: number) => {
            const id = typeof item?.ID === 'string' && item.ID.trim().length > 0
                ? item.ID.trim()
                : `itm_auto_${idx}`;
            if (seenIds.has(id)) return;
            seenIds.add(id);
            deduped.push({ ...item, ID: id });
        });

        const itemById = new Map<string, any>(deduped.map((item) => [item.ID, item]));
        const containerIds = new Set<string>(
            deduped
                .filter((item) => item?.容器属性 && typeof item?.ID === 'string')
                .map((item) => item.ID)
        );
        const findItemByRef = (idOrName: string): any | undefined => {
            return itemById.get(idOrName) || deduped.find((item) => item?.名称 === idOrName);
        };
        const createFallbackEquippedItem = (slot: 装备槽位, itemName: string): any => {
            let baseId = `itm_auto_equip_${槽位ID片段映射[slot]}`;
            let candidate = baseId;
            let suffix = 1;
            while (seenIds.has(candidate)) {
                candidate = `${baseId}_${suffix++}`;
            }
            seenIds.add(candidate);
            const type = 槽位类型映射[slot];
            const generated: any = {
                ID: candidate,
                名称: itemName,
                描述: `由装备栏位自动补全的${slot}装备。`,
                类型: type,
                品质: '凡品',
                重量: slot === '坐骑' ? 30 : 1,
                占用空间: 1,
                价值: 0,
                当前耐久: 100,
                最大耐久: 100,
                词条列表: [],
                当前装备部位: slot,
                当前容器ID: slot
            };
            if (type === '容器') {
                generated.装备位置 = slot;
                generated.容器属性 = {
                    最大容量: slot === '背部' ? 20 : 8,
                    当前已用空间: 0,
                    最大单物大小: slot === '背部' ? 5 : 3,
                    减重比例: 0
                };
                containerIds.add(candidate);
            }
            if (type === '武器') {
                generated.武器子类 = slot === '暗器' ? '暗器' : '剑';
                generated.最小攻击 = 1;
                generated.最大攻击 = 3;
                generated.攻速修正 = 1;
                generated.格挡率 = 0;
            }
            if (type === '防具') {
                const 防具位置映射: Record<string, '头部' | '胸部' | '腿部' | '手部' | '足部'> = {
                    头部: '头部',
                    胸部: '胸部',
                    腿部: '腿部',
                    手部: '手部',
                    足部: '足部'
                };
                generated.装备位置 = 防具位置映射[slot] || '胸部';
                generated.覆盖部位 = slot === '头部'
                    ? ['头部']
                    : slot === '胸部'
                        ? ['胸部', '腹部']
                        : slot === '腿部'
                            ? ['左腿', '右腿']
                            : slot === '手部'
                                ? ['左臂', '右臂', '手掌']
                                : ['足部'];
                generated.物理防御 = 1;
                generated.内功防御 = 1;
            }
            deduped.push(generated);
            itemById.set(candidate, generated);
            return generated;
        };

        const equippedByItemId = new Map<string, 装备槽位>();
        装备槽位列表.forEach((slot) => {
            const rawRef = (role.装备 as any)[slot];
            const normalizedRef = typeof rawRef === 'string' ? rawRef.trim() : '';
            if (!normalizedRef || normalizedRef === '无') {
                (role.装备 as any)[slot] = '无';
                return;
            }
            (role.装备 as any)[slot] = normalizedRef;
            const matched = findItemByRef(normalizedRef) || createFallbackEquippedItem(slot, normalizedRef);
            const existedSlot = equippedByItemId.get(matched.ID);
            if (existedSlot && existedSlot !== slot) {
                (role.装备 as any)[slot] = '无';
                return;
            }
            equippedByItemId.set(matched.ID, slot);
        });

        deduped.forEach((item) => {
            const equipSlotRaw = typeof item?.当前装备部位 === 'string' ? item.当前装备部位.trim() : '';
            if (!equipSlotRaw || !装备槽位集合.has(equipSlotRaw) || equippedByItemId.has(item.ID)) return;
            const equipSlot = equipSlotRaw as 装备槽位;
            const slotRef = typeof (role.装备 as any)[equipSlot] === 'string' ? (role.装备 as any)[equipSlot].trim() : '';
            if (!slotRef || slotRef === '无') {
                (role.装备 as any)[equipSlot] = item.ID;
            } else {
                const slotMatchedItem = findItemByRef(slotRef);
                if (!slotMatchedItem || slotMatchedItem.ID !== item.ID) return;
            }
            equippedByItemId.set(item.ID, equipSlot);
        });

        // Migration fallback: old saves may still store legacy "内容物"
        const fallbackOwners = new Map<string, Set<string>>();
        deduped.forEach((container) => {
            const legacyContents = (container as any)?.容器属性?.内容物;
            if (!Array.isArray(legacyContents)) return;
            legacyContents.forEach((contentId: unknown) => {
                if (typeof contentId !== 'string' || !contentId.trim()) return;
                const key = contentId.trim();
                const set = fallbackOwners.get(key) || new Set<string>();
                set.add(container.ID);
                fallbackOwners.set(key, set);
            });
        });

        const locationById = new Map<string, string | undefined>();
        deduped.forEach((item) => {
            const equippedSlot = equippedByItemId.get(item.ID);
            if (equippedSlot) {
                locationById.set(item.ID, equippedSlot);
                return;
            }

            const explicitEquip = typeof item?.当前装备部位 === 'string' ? item.当前装备部位.trim() : '';
            if (explicitEquip && 装备槽位集合.has(explicitEquip)) {
                locationById.set(item.ID, explicitEquip);
                return;
            }

            const explicit = typeof item?.当前容器ID === 'string' ? item.当前容器ID.trim() : '';
            if (explicit && explicit !== item.ID && (containerIds.has(explicit) || 装备槽位集合.has(explicit))) {
                locationById.set(item.ID, explicit);
                return;
            }
            const owners = Array.from(fallbackOwners.get(item.ID) || []);
            const validOwners = owners.filter(ownerId => ownerId !== item.ID && containerIds.has(ownerId));
            if (validOwners.length === 1) {
                locationById.set(item.ID, validOwners[0]);
                return;
            }
            locationById.set(item.ID, undefined);
        });

        deduped.forEach((item) => {
            const location = locationById.get(item.ID);
            if (!location) {
                delete item.当前容器ID;
                delete item.当前装备部位;
                return;
            }
            item.当前容器ID = location;
            if (装备槽位集合.has(location)) item.当前装备部位 = location as 装备槽位;
            else delete item.当前装备部位;
        });

        deduped.forEach((container) => {
            if (!container?.容器属性) return;
            const containedIds = deduped
                .filter((item) => item.ID !== container.ID && locationById.get(item.ID) === container.ID)
                .map((item) => item.ID);
            const uniqueIds = Array.from(new Set(containedIds));
            container.容器属性.当前已用空间 = uniqueIds.reduce((sum, id) => {
                const child = itemById.get(id);
                return sum + (Number(child?.占用空间) || 0);
            }, 0);
            if ((container as any).容器属性 && '内容物' in (container as any).容器属性) {
                delete (container as any).容器属性.内容物;
            }
        });

        role.物品列表 = deduped;
        return role;
    };

    const 取首个非空文本 = (...values: unknown[]): string | undefined => {
        for (const value of values) {
            if (typeof value === 'string' && value.trim().length > 0) {
                return value.trim();
            }
        }
        return undefined;
    };

    const 取字段文本 = (obj: any, key: string): string | undefined => {
        return typeof obj?.[key] === 'string' ? obj[key].trim() : undefined;
    };

    const 文本质量分 = (raw?: string): number => {
        if (!raw || raw.trim().length === 0) return 0;
        const text = raw.trim();
        if (/^(未知|暂无|无|未记录|未命名|\?+|n\/a)$/i.test(text)) return 1;
        return 2 + Math.min(text.length, 200) / 1000;
    };

    const 取更优文本 = (left?: string, right?: string): string | undefined => {
        const l = left?.trim();
        const r = right?.trim();
        const lScore = 文本质量分(l);
        const rScore = 文本质量分(r);
        if (rScore > lScore) return r;
        if (lScore > rScore) return l;
        if ((r?.length || 0) > (l?.length || 0)) return r;
        return l || r;
    };

    const 归一化键 = (raw: unknown): string => {
        if (typeof raw !== 'string') return '';
        return raw.trim().replace(/\s+/g, '').toLowerCase();
    };

    const 解析记忆时间排序值 = (raw?: string): number => {
        if (!raw) return Number.MAX_SAFE_INTEGER;
        const canonical = normalizeCanonicalGameTime(raw);
        if (!canonical) return Number.MAX_SAFE_INTEGER;
        const m = canonical.match(/^(\d{1,6}):(\d{2}):(\d{2}):(\d{2}):(\d{2})$/);
        if (!m) return Number.MAX_SAFE_INTEGER;
        const year = Number(m[1]);
        const month = Number(m[2]);
        const day = Number(m[3]);
        const hour = Number(m[4]);
        const minute = Number(m[5]);
        return (((year * 12 + month) * 31 + day) * 24 + hour) * 60 + minute;
    };

    const 标准化NPC记忆 = (memoryRaw: any): Array<{ 内容: string; 时间: string }> => {
        if (!Array.isArray(memoryRaw)) return [];

        const normalized = memoryRaw
            .map((m: any) => {
                const 内容 = typeof m?.内容 === 'string' ? m.内容.trim() : '';
                const 原始时间 = typeof m?.时间 === 'string' ? m.时间.trim() : '';
                const 时间 = 原始时间 ? (normalizeCanonicalGameTime(原始时间) || 原始时间) : '';
                return { 内容, 时间 };
            })
            .filter((m) => m.内容.length > 0 || m.时间.length > 0);

        const timeByContent = new Map<string, string>();
        const contentByTime = new Map<string, string>();
        normalized.forEach((m) => {
            if (m.内容 && m.时间 && !timeByContent.has(m.内容)) {
                timeByContent.set(m.内容, m.时间);
            }
            if (m.时间 && m.内容 && !contentByTime.has(m.时间)) {
                contentByTime.set(m.时间, m.内容);
            }
        });

        normalized.forEach((m) => {
            if (!m.时间 && m.内容 && timeByContent.has(m.内容)) {
                m.时间 = timeByContent.get(m.内容)!;
            }
            if (!m.内容 && m.时间 && contentByTime.has(m.时间)) {
                m.内容 = contentByTime.get(m.时间)!;
            }
        });

        const unique = new Map<string, { 内容: string; 时间: string }>();
        normalized
            .filter((m) => m.内容.length > 0)
            .forEach((m) => {
                const key = `${m.时间}__${m.内容}`;
                if (!unique.has(key)) {
                    unique.set(key, { 内容: m.内容, 时间: m.时间 || '未知时间' });
                }
            });

        return Array.from(unique.values())
            .sort((a, b) => 解析记忆时间排序值(a.时间) - 解析记忆时间排序值(b.时间));
    };

    const 合并字符串数组 = (a: any, b: any): string[] | undefined => {
        const merged: string[] = [];
        const seen = new Set<string>();
        const push = (value: unknown) => {
            if (typeof value !== 'string') return;
            const text = value.trim();
            if (!text) return;
            if (seen.has(text)) return;
            seen.add(text);
            merged.push(text);
        };
        if (Array.isArray(a)) a.forEach(push);
        if (Array.isArray(b)) b.forEach(push);
        return merged.length > 0 ? merged : undefined;
    };

    const 合并内射记录 = (a: any, b: any): any[] | undefined => {
        const merged = new Map<string, any>();
        const process = (raw: any) => {
            if (!Array.isArray(raw)) return;
            raw.forEach((item) => {
                const 日期Raw = typeof item?.日期 === 'string' ? item.日期.trim() : '';
                const 日期 = 日期Raw ? (normalizeCanonicalGameTime(日期Raw) || 日期Raw) : '';
                const 描述 = typeof item?.描述 === 'string' ? item.描述.trim() : '';
                const 怀孕判定日Raw = typeof item?.怀孕判定日 === 'string' ? item.怀孕判定日.trim() : '';
                const 怀孕判定日 = 怀孕判定日Raw ? (normalizeCanonicalGameTime(怀孕判定日Raw) || 怀孕判定日Raw) : '';
                if (!日期 && !描述 && !怀孕判定日) return;
                const key = `${日期}__${描述}`;
                const existing = merged.get(key);
                if (!existing) {
                    merged.set(key, { 日期: 日期 || '未知时间', 描述, 怀孕判定日: 怀孕判定日 || '未知时间' });
                    return;
                }
                merged.set(key, {
                    日期: 取更优文本(existing.日期, 日期) || existing.日期 || '未知时间',
                    描述: 取更优文本(existing.描述, 描述) || existing.描述 || '',
                    怀孕判定日: 取更优文本(existing.怀孕判定日, 怀孕判定日) || existing.怀孕判定日 || '未知时间'
                });
            });
        };

        process(a);
        process(b);
        const out = Array.from(merged.values());
        return out.length > 0 ? out : undefined;
    };

    const 标准化单个NPC = (rawNpc: any, fallbackIndex: number): any => {
        const npc = rawNpc && typeof rawNpc === 'object' ? rawNpc : {};
        const 外貌描写 = 取首个非空文本(
            npc?.外貌描写,
            npc?.外貌,
            npc?.档案?.外貌要点,
            npc?.档案?.外貌描写
        );
        const 身材描写 = 取首个非空文本(
            npc?.身材描写,
            npc?.身材,
            npc?.档案?.身材要点,
            npc?.档案?.身材描写
        );
        const 衣着风格 = 取首个非空文本(
            npc?.衣着风格,
            npc?.衣着,
            npc?.档案?.衣着风格,
            npc?.档案?.衣着要点
        );
        const 记忆 = 标准化NPC记忆(npc?.记忆);

        return {
            ...npc,
            id: 取首个非空文本(npc?.id, `npc_${fallbackIndex}`) || `npc_${fallbackIndex}`,
            姓名: 取首个非空文本(npc?.姓名, `角色${fallbackIndex}`) || `角色${fallbackIndex}`,
            性别: typeof npc?.性别 === 'string' ? npc.性别 : '未知',
            年龄: Number.isFinite(Number(npc?.年龄)) ? Number(npc.年龄) : undefined,
            境界: typeof npc?.境界 === 'string' ? npc.境界 : '未知境界',
            身份: typeof npc?.身份 === 'string' ? npc.身份 : '未知身份',
            是否在场: typeof npc?.是否在场 === 'boolean' ? npc.是否在场 : true,
            是否队友: typeof npc?.是否队友 === 'boolean' ? npc.是否队友 : ((npc?.好感度 || 0) > 0),
            是否主要角色: typeof npc?.是否主要角色 === 'boolean' ? npc.是否主要角色 : false,
            好感度: Number.isFinite(Number(npc?.好感度)) ? Number(npc.好感度) : 0,
            关系状态: typeof npc?.关系状态 === 'string' ? npc.关系状态 : '未知',
            简介: typeof npc?.简介 === 'string' ? npc.简介 : '暂无简介',
            记忆,
            ...(外貌描写 ? { 外貌描写 } : {}),
            ...(身材描写 ? { 身材描写 } : {}),
            ...(衣着风格 ? { 衣着风格 } : {})
        };
    };

    const 合并NPC对象 = (leftRaw: any, rightRaw: any, fallbackIndex: number): any => {
        const left = 标准化单个NPC(leftRaw, fallbackIndex);
        const right = 标准化单个NPC(rightRaw, fallbackIndex);
        const mergedMemory = 标准化NPC记忆([...(left.记忆 || []), ...(right.记忆 || [])]);

        const mergedWomb = (() => {
            const leftWomb = left?.子宫 && typeof left.子宫 === 'object' ? left.子宫 : undefined;
            const rightWomb = right?.子宫 && typeof right.子宫 === 'object' ? right.子宫 : undefined;
            if (!leftWomb && !rightWomb) return undefined;
            const mergedRecords = 合并内射记录(leftWomb?.内射记录, rightWomb?.内射记录);
            return {
                状态: 取更优文本(
                    取字段文本(leftWomb, '状态'),
                    取字段文本(rightWomb, '状态')
                ) || '未知',
                宫口状态: 取更优文本(
                    取字段文本(leftWomb, '宫口状态'),
                    取字段文本(rightWomb, '宫口状态')
                ) || '未知',
                ...(mergedRecords
                    ? { 内射记录: mergedRecords }
                    : {})
            };
        })();

        const mergedEquip = (() => {
            const leftEquip = left?.当前装备 && typeof left.当前装备 === 'object' ? left.当前装备 : undefined;
            const rightEquip = right?.当前装备 && typeof right.当前装备 === 'object' ? right.当前装备 : undefined;
            if (!leftEquip && !rightEquip) return undefined;
            const keys = ['主武器', '副武器', '服装', '饰品', '内衣', '内裤', '袜饰', '鞋履'];
            const out: Record<string, string> = {};
            keys.forEach((k) => {
                const text = 取更优文本(取字段文本(leftEquip, k), 取字段文本(rightEquip, k));
                if (text) out[k] = text;
            });
            return Object.keys(out).length > 0 ? out : undefined;
        })();

        return {
            ...left,
            ...right,
            id: 取首个非空文本(right.id, left.id, `npc_${fallbackIndex}`) || `npc_${fallbackIndex}`,
            姓名: 取首个非空文本(right.姓名, left.姓名, `角色${fallbackIndex}`) || `角色${fallbackIndex}`,
            性别: 取更优文本(取字段文本(left, '性别'), 取字段文本(right, '性别')) || '未知',
            年龄: Number.isFinite(Number(right?.年龄))
                ? Number(right.年龄)
                : (Number.isFinite(Number(left?.年龄)) ? Number(left.年龄) : undefined),
            境界: 取更优文本(取字段文本(left, '境界'), 取字段文本(right, '境界')) || '未知境界',
            身份: 取更优文本(取字段文本(left, '身份'), 取字段文本(right, '身份')) || '未知身份',
            是否在场: typeof right?.是否在场 === 'boolean'
                ? right.是否在场
                : (typeof left?.是否在场 === 'boolean' ? left.是否在场 : true),
            是否队友: typeof right?.是否队友 === 'boolean'
                ? right.是否队友
                : (typeof left?.是否队友 === 'boolean' ? left.是否队友 : false),
            是否主要角色: Boolean(left?.是否主要角色) || Boolean(right?.是否主要角色),
            好感度: Number.isFinite(Number(right?.好感度))
                ? Number(right.好感度)
                : (Number.isFinite(Number(left?.好感度)) ? Number(left.好感度) : 0),
            关系状态: 取更优文本(取字段文本(left, '关系状态'), 取字段文本(right, '关系状态')) || '未知',
            简介: 取更优文本(取字段文本(left, '简介'), 取字段文本(right, '简介')) || '暂无简介',
            外貌描写: 取更优文本(取字段文本(left, '外貌描写'), 取字段文本(right, '外貌描写')),
            身材描写: 取更优文本(取字段文本(left, '身材描写'), 取字段文本(right, '身材描写')),
            衣着风格: 取更优文本(取字段文本(left, '衣着风格'), 取字段文本(right, '衣着风格')),
            胸部大小: 取更优文本(取字段文本(left, '胸部大小'), 取字段文本(right, '胸部大小')),
            乳头颜色: 取更优文本(取字段文本(left, '乳头颜色'), 取字段文本(right, '乳头颜色')),
            小穴颜色: 取更优文本(取字段文本(left, '小穴颜色'), 取字段文本(right, '小穴颜色')),
            后穴颜色: 取更优文本(取字段文本(left, '后穴颜色'), 取字段文本(right, '后穴颜色')),
            臀部大小: 取更优文本(取字段文本(left, '臀部大小'), 取字段文本(right, '臀部大小')),
            私密特质: 取更优文本(取字段文本(left, '私密特质'), 取字段文本(right, '私密特质')),
            私密总描述: 取更优文本(取字段文本(left, '私密总描述'), 取字段文本(right, '私密总描述')),
            子宫: mergedWomb,
            是否处女: typeof right?.是否处女 === 'boolean'
                ? right.是否处女
                : (typeof left?.是否处女 === 'boolean' ? left.是否处女 : undefined),
            初夜夺取者: 取更优文本(取字段文本(left, '初夜夺取者'), 取字段文本(right, '初夜夺取者')),
            初夜时间: (() => {
                const leftTime = 取字段文本(left, '初夜时间');
                const rightTime = 取字段文本(right, '初夜时间');
                const l = leftTime ? (normalizeCanonicalGameTime(leftTime) || leftTime) : undefined;
                const r = rightTime ? (normalizeCanonicalGameTime(rightTime) || rightTime) : undefined;
                return 取更优文本(l, r);
            })(),
            初夜描述: 取更优文本(取字段文本(left, '初夜描述'), 取字段文本(right, '初夜描述')),
            次数_口部: Math.max(Number(left?.次数_口部) || 0, Number(right?.次数_口部) || 0),
            次数_胸部: Math.max(Number(left?.次数_胸部) || 0, Number(right?.次数_胸部) || 0),
            次数_阴部: Math.max(Number(left?.次数_阴部) || 0, Number(right?.次数_阴部) || 0),
            次数_后庭: Math.max(Number(left?.次数_后庭) || 0, Number(right?.次数_后庭) || 0),
            次数_高潮: Math.max(Number(left?.次数_高潮) || 0, Number(right?.次数_高潮) || 0),
            攻击力: Number.isFinite(Number(right?.攻击力))
                ? Number(right.攻击力)
                : (Number.isFinite(Number(left?.攻击力)) ? Number(left.攻击力) : undefined),
            防御力: Number.isFinite(Number(right?.防御力))
                ? Number(right.防御力)
                : (Number.isFinite(Number(left?.防御力)) ? Number(left.防御力) : undefined),
            上次更新时间: (() => {
                const leftTime = 取字段文本(left, '上次更新时间');
                const rightTime = 取字段文本(right, '上次更新时间');
                const l = leftTime ? (normalizeCanonicalGameTime(leftTime) || leftTime) : undefined;
                const r = rightTime ? (normalizeCanonicalGameTime(rightTime) || rightTime) : undefined;
                return 取更优文本(l, r);
            })(),
            当前血量: Number.isFinite(Number(right?.当前血量))
                ? Number(right.当前血量)
                : (Number.isFinite(Number(left?.当前血量)) ? Number(left.当前血量) : undefined),
            最大血量: Number.isFinite(Number(right?.最大血量))
                ? Number(right.最大血量)
                : (Number.isFinite(Number(left?.最大血量)) ? Number(left.最大血量) : undefined),
            当前精力: Number.isFinite(Number(right?.当前精力))
                ? Number(right.当前精力)
                : (Number.isFinite(Number(left?.当前精力)) ? Number(left.当前精力) : undefined),
            最大精力: Number.isFinite(Number(right?.最大精力))
                ? Number(right.最大精力)
                : (Number.isFinite(Number(left?.最大精力)) ? Number(left.最大精力) : undefined),
            当前装备: mergedEquip,
            背包: 合并字符串数组(left?.背包, right?.背包),
            记忆: mergedMemory
        };
    };

    const 合并同名NPC列表 = (list: any[]): any[] => {
        if (!Array.isArray(list)) return [];
        const merged: any[] = [];
        const nameIndexMap = new Map<string, number>();
        const idIndexMap = new Map<string, number>();

        list.forEach((rawNpc, index) => {
            const normalized = 标准化单个NPC(rawNpc, index);
            const nameKey = 归一化键(normalized?.姓名);
            const idKey = 归一化键(normalized?.id);
            const idMatchedIndex = idKey ? idIndexMap.get(idKey) : undefined;
            const nameMatchedIndex = nameKey ? nameIndexMap.get(nameKey) : undefined;
            const targetIndex = typeof idMatchedIndex === 'number'
                ? idMatchedIndex
                : (typeof nameMatchedIndex === 'number' ? nameMatchedIndex : -1);

            if (targetIndex < 0) {
                const pushIndex = merged.length;
                merged.push(normalized);
                const newNameKey = 归一化键(normalized?.姓名);
                const newIdKey = 归一化键(normalized?.id);
                if (newNameKey) nameIndexMap.set(newNameKey, pushIndex);
                if (newIdKey) idIndexMap.set(newIdKey, pushIndex);
                return;
            }

            merged[targetIndex] = 合并NPC对象(merged[targetIndex], normalized, targetIndex);
            const mergedNameKey = 归一化键(merged[targetIndex]?.姓名);
            const mergedIdKey = 归一化键(merged[targetIndex]?.id);
            if (mergedNameKey) nameIndexMap.set(mergedNameKey, targetIndex);
            if (mergedIdKey) idIndexMap.set(mergedIdKey, targetIndex);
        });

        return merged;
    };

    const 规范化社交列表 = (list: any[], options?: { 合并同名?: boolean }): any[] => {
        if (!Array.isArray(list)) return [];
        const normalized = list.map((npc, index) => 标准化单个NPC(npc, index));
        if (options?.合并同名 === false) return normalized;
        return 合并同名NPC列表(normalized);
    };

    const 同步重Roll计数 = () => {
        set可重Roll计数(回合快照栈Ref.current.length);
    };

    const 清空重Roll快照 = () => {
        回合快照栈Ref.current = [];
        同步重Roll计数();
    };

    const 推入重Roll快照 = (snapshot: 回合快照结构) => {
        回合快照栈Ref.current.push(snapshot);
        同步重Roll计数();
    };

    const 弹出重Roll快照 = (): 回合快照结构 | null => {
        const snapshot = 回合快照栈Ref.current.pop() || null;
        同步重Roll计数();
        return snapshot;
    };

    const 回档到快照 = (snapshot: 回合快照结构) => {
        设置角色(规范化角色物品容器映射(深拷贝(snapshot.回档前状态.角色)));
        设置环境(规范化环境信息(深拷贝(snapshot.回档前状态.环境)));
        设置社交(规范化社交列表(深拷贝(snapshot.回档前状态.社交)));
        设置世界(深拷贝(snapshot.回档前状态.世界));
        设置战斗(深拷贝(snapshot.回档前状态.战斗));
        设置玩家门派(深拷贝(snapshot.回档前状态.玩家门派));
        设置任务列表(深拷贝(snapshot.回档前状态.任务列表));
        设置约定列表(深拷贝(snapshot.回档前状态.约定列表));
        设置剧情(深拷贝(snapshot.回档前状态.剧情));
        设置记忆系统(深拷贝(snapshot.回档前状态.记忆系统));
        设置历史记录(深拷贝(snapshot.回档前历史));
    };

    const normalizeCanonicalGameTime = (input?: string): string | null => {
        if (!input || typeof input !== 'string') return null;
        const match = input.trim().match(/^(\d{1,6}):(\d{1,2}):(\d{1,2}):(\d{1,2}):(\d{1,2})$/);
        if (!match) return null;
        const year = Number(match[1]);
        const month = Number(match[2]);
        const day = Number(match[3]);
        const hour = Number(match[4]);
        const minute = Number(match[5]);
        if (
            month < 1 || month > 12 ||
            day < 1 || day > 31 ||
            hour < 0 || hour > 23 ||
            minute < 0 || minute > 59
        ) {
            return null;
        }
        return `${year}:${month.toString().padStart(2, '0')}:${day.toString().padStart(2, '0')}:${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    };
    const 提取时间月日 = (input?: string): { month: number; day: number } | null => {
        const canonical = normalizeCanonicalGameTime(input);
        if (!canonical) return null;
        const m = canonical.match(/^\d{1,6}:(\d{2}):(\d{2}):/);
        if (!m) return null;
        const month = Number(m[1]);
        const day = Number(m[2]);
        if (!Number.isFinite(month) || !Number.isFinite(day)) return null;
        return { month, day };
    };

    // Frontend联动：当游戏时间命中节日设定时，自动同步“名称/简介/效果”到环境
    useEffect(() => {
        const md = 提取时间月日(环境?.时间);
        const matched = md ? festivals.find(f => f.月 === md.month && f.日 === md.day) : undefined;
        const nextFestival = matched
            ? {
                名称: matched.名称?.trim() || '',
                简介: matched.描述?.trim() || '',
                效果: matched.效果?.trim() || ''
            }
            : null;

        const currentFestival = 环境?.节日 || null;
        const sameFestival = !!(
            (!currentFestival && !nextFestival) ||
            (
                currentFestival &&
                nextFestival &&
                (currentFestival.名称 || '') === (nextFestival.名称 || '') &&
                (currentFestival.简介 || '') === (nextFestival.简介 || '') &&
                (currentFestival.效果 || '') === (nextFestival.效果 || '')
            )
        );

        if (sameFestival) return;
        设置环境(prev => ({
            ...prev,
            节日: nextFestival
        }));
    }, [环境?.时间, 环境?.节日, festivals, 设置环境]);

    const 即时短期分隔标记 = '\n<<SHORT_TERM_SYNC>>\n';

    const 拆分即时与短期 = (entry: string): { 即时内容: string; 短期摘要: string } => {
        const raw = (entry || '').trim();
        if (!raw) return { 即时内容: '', 短期摘要: '' };
        const splitAt = raw.lastIndexOf(即时短期分隔标记);
        if (splitAt < 0) return { 即时内容: raw, 短期摘要: '' };
        return {
            即时内容: raw.slice(0, splitAt).trim(),
            短期摘要: raw.slice(splitAt + 即时短期分隔标记.length).trim()
        };
    };

    const 格式化回忆名称 = (round: number): string => `【回忆${String(Math.max(1, round)).padStart(3, '0')}】`;

    const 从即时记忆推导回忆档案 = (即时记忆: string[]) => {
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

    const 规范化记忆系统 = (raw?: Partial<记忆系统结构> | null): 记忆系统结构 => {
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
    const 规范化记忆配置 = (raw?: Partial<记忆配置结构> | null): 记忆配置结构 => ({
        短期记忆阈值: Math.max(5, Number(raw?.短期记忆阈值) || 30),
        中期记忆阈值: Math.max(20, Number(raw?.中期记忆阈值) || 50),
        重要角色关键记忆条数N: Math.max(1, Number(raw?.重要角色关键记忆条数N) || 20),
        短期转中期提示词: typeof raw?.短期转中期提示词 === 'string'
            ? raw.短期转中期提示词
            : '请根据上述短期记忆，总结出关键事件的时间、地点和结果，去除琐碎对话。',
        中期转长期提示词: typeof raw?.中期转长期提示词 === 'string'
            ? raw.中期转长期提示词
            : '请将上述中期记忆概括为一段史诗般的经历，保留对角色成长有重大影响的事件。'
    });
    const 规范化游戏设置 = (raw?: Partial<游戏设置结构> | null): 游戏设置结构 => ({
        字数要求: (() => {
            const candidate = raw?.字数要求 as unknown;
            if (typeof candidate === 'number' && Number.isFinite(candidate)) return Math.max(50, Math.floor(candidate));
            if (typeof candidate === 'string') {
                const n = Number(candidate.replace(/[^\d]/g, ''));
                if (Number.isFinite(n) && n > 0) return Math.max(50, Math.floor(n));
            }
            if (typeof gameConfig?.字数要求 === 'number' && Number.isFinite(gameConfig.字数要求)) {
                return Math.max(50, Math.floor(gameConfig.字数要求));
            }
            return 450;
        })(),
        叙事人称: raw?.叙事人称 === '第一人称' || raw?.叙事人称 === '第二人称' || raw?.叙事人称 === '第三人称'
            ? raw.叙事人称
            : (gameConfig?.叙事人称 || '第二人称'),
        启用行动选项: raw?.启用行动选项 !== false,
        额外提示词: typeof raw?.额外提示词 === 'string' ? raw.额外提示词 : (gameConfig?.额外提示词 || '')
    });

    const 生成记忆摘要 = (batch: string[], source: '短期' | '中期'): string => {
        const filtered = batch.map(item => item.trim()).filter(Boolean);
        if (filtered.length === 0) return source === '短期' ? '短期记忆汇总（空）' : '中期记忆汇总（空）';
        const first = filtered[0];
        const last = filtered[filtered.length - 1];
        const preview = filtered.slice(0, 3).join('；');
        return `${source}汇总(${filtered.length}): ${first} -> ${last}｜要点: ${preview}`.slice(0, 300);
    };

    const 格式化记忆时间 = (raw: string): string => {
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

    const 构建即时记忆条目 = (
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

    const 构建短期记忆条目 = (gameTime: string, playerInput: string, aiData: GameResponse): string => {
        const timeLabel = 格式化记忆时间(gameTime || '未知时间');
        const summary = (aiData.shortTerm || '').trim() ||
            (Array.isArray(aiData.logs)
                ? aiData.logs.map(log => `${log.sender}:${log.text}`).join(' ').slice(0, 180)
                : '本回合推进');
        return `${timeLabel} ${playerInput} -> ${summary}`;
    };

    const 合并即时与短期 = (immediateEntry: string, shortEntry: string): string => {
        const full = immediateEntry.trim();
        const summary = shortEntry.trim();
        if (!summary) return full;
        return `${full}${即时短期分隔标记}${summary}`;
    };

    const 写入四段记忆 = (memoryBase: 记忆系统结构, immediateEntry: string, shortEntry: string): 记忆系统结构 => {
        const next = 规范化记忆系统(memoryBase);
        const full = immediateEntry.trim();
        const summary = shortEntry.trim();
        if (!full && !summary) return next;
        const immediateLimit = Math.max(5, memoryConfig.短期记忆阈值 || 30);

        if (full) next.即时记忆.push(合并即时与短期(full, summary));
        else if (summary) next.短期记忆.push(summary);

        if (full || summary) {
            const round = (next.回忆档案?.length || 0) + 1;
            next.回忆档案.push({
                名称: 格式化回忆名称(round),
                概括: summary,
                原文: full,
                回合: round,
                记录时间: 环境?.时间 || '未知时间',
                时间戳: Date.now()
            });
        }

        while (next.即时记忆.length > immediateLimit) {
            const shifted = next.即时记忆.shift();
            if (!shifted) continue;
            const { 短期摘要 } = 拆分即时与短期(shifted);
            if (短期摘要) next.短期记忆.push(短期摘要);
        }

        const shortLimit = Math.max(5, memoryConfig.短期记忆阈值 || 30);
        while (next.短期记忆.length > shortLimit) {
            const batch = next.短期记忆.splice(0, shortLimit);
            next.中期记忆.push(生成记忆摘要(batch, '短期'));
        }

        const midLimit = Math.max(3, memoryConfig.中期记忆阈值 || 50);
        while (next.中期记忆.length > midLimit) {
            const batch = next.中期记忆.splice(0, midLimit);
            next.长期记忆.push(生成记忆摘要(batch, '中期'));
        }

        return next;
    };

    const 构建NPC上下文 = (socialData: any[]): {
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

        const 提取基础数据 = (npc: any, index: number, 是否队友: boolean) => ({
            索引: index,
            id: typeof npc?.id === 'string' ? npc.id : `npc_${index}`,
            姓名: typeof npc?.姓名 === 'string' ? npc.姓名 : `角色${index}`,
            性别: typeof npc?.性别 === 'string' ? npc.性别 : '未知',
            境界: typeof npc?.境界 === 'string' ? npc.境界 : '未知境界',
            身份: typeof npc?.身份 === 'string' ? npc.身份 : '未知身份',
            是否队友,
            关系状态: typeof npc?.关系状态 === 'string' ? npc.关系状态 : '未知',
            好感度: typeof npc?.好感度 === 'number' ? npc.好感度 : 0,
            简介: typeof npc?.简介 === 'string' ? npc.简介 : '暂无简介'
        });

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
            const 是否队友 = typeof npc?.是否队友 === 'boolean' ? npc.是否队友 : ((npc?.好感度 || 0) > 0);
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

    const handleStartNewGameWizard = () => {
        清空重Roll快照();
        setView('new_game');
    };

    const 构建世界观锚点 = (worldConfig: WorldGenConfig, charData: 角色数据结构) => {
        return `
【当前存档世界锚点（World Bible Anchor）】
- 世界名称: ${worldConfig.worldName}
- 武力层级: ${worldConfig.powerLevel}
- 世界规模: ${worldConfig.worldSize}
- 王朝格局: ${worldConfig.dynastySetting}
- 宗门密度: ${worldConfig.sectDensity}
- 天骄设定: ${worldConfig.tianjiaoSetting}
- 游戏难度: ${worldConfig.difficulty || 'normal'}

【主角建档锚点】
- 姓名/性别/年龄: ${charData.姓名}/${charData.性别}/${charData.年龄}
- 出生日期: ${charData.出生日期}
- 外貌: ${charData.外貌 || '未描述'}
- 初始境界: ${charData.境界}
- 六维: 力量${charData.力量} 敏捷${charData.敏捷} 体质${charData.体质} 根骨${charData.根骨} 悟性${charData.悟性} 福源${charData.福源}
- 天赋: ${charData.天赋列表.map(t => t.名称).join('、') || '无'}
- 背景: ${charData.出身背景?.名称 || '未知'}（${charData.出身背景?.描述 || '无描述'}）
        `.trim();
    };

    const 构建世界观提示词 = (worldConfig: WorldGenConfig, charData: 角色数据结构) => {
        const anchor = 构建世界观锚点(worldConfig, charData);
        return `
【世界观设定（存档绑定）】
此字段是当前存档唯一世界观母本，必须长期一致；后续叙事、判定、事件演化均以此为依据。

1. **世界一致性**
   - 势力、境界、资源稀缺度、社会秩序必须与本母本一致。
   - 禁止同一存档内无因果改写世界底层法则。

2. **主角一致性**
   - 主角身份、出身、六维、初始处境必须与建档锚点一致。
   - 前期物资、功法、关系网必须符合“初出江湖”的因果，不得空降神装神功。

3. **叙事边界**
   - 世界观用于约束，不直接替玩家决策。
   - 重大世界事件需通过 \`gameState.世界\` 与 \`gameState.剧情\` 可追溯落地。

4. **时间与地点**
   - 时间推进与地点变化需与 \`gameState.环境\` 同步。
   - 同时空冲突（同角色同刻多地）视为非法叙事。

${anchor}
        `.trim();
    };

    const 创建空门派状态 = (): 详细门派结构 => ({
        ID: 'none',
        名称: '无门无派',
        简介: '尚未加入任何门派。',
        门规: [],
        门派资金: 0,
        门派物资: 0,
        建设度: 0,
        玩家职位: '无',
        玩家贡献: 0,
        任务列表: [],
        兑换列表: [],
        重要成员: []
    });

    const 创建占位门派状态 = (charData: 角色数据结构): 详细门派结构 => {
        const hasJoinedSect = typeof charData?.所属门派ID === 'string' && charData.所属门派ID !== 'none';
        if (!hasJoinedSect) return 创建空门派状态();
        return {
            ID: charData.所属门派ID || 'unknown',
            名称: '',
            简介: '',
            门规: [],
            门派资金: 0,
            门派物资: 0,
            建设度: 0,
            玩家职位: charData.门派职位 || '成员',
            玩家贡献: typeof charData.门派贡献 === 'number' ? charData.门派贡献 : 0,
            任务列表: [],
            兑换列表: [],
            重要成员: []
        };
    };

    const 创建开场空白环境 = () => ({
        时间: '',
        大地点: '',
        中地点: '',
        小地点: '',
        具体地点: '',
        节日: null,
        天气: '',
        环境描述: '',
        游戏天数: 1
    });

    const 创建开场空白世界 = () => ({
        当前时代: '',
        混乱度: 0,
        全局修正: [],
        势力列表: [],
        活跃NPC列表: [],
        进行中事件: [],
        已结算事件: [],
        江湖史册: []
    });

    const 创建开场空白战斗 = (): 战斗状态结构 => ({
        是否战斗中: 默认战斗状态.是否战斗中,
        敌方: 默认战斗状态.敌方
    });

    const 规范化战斗状态 = (raw?: any): 战斗状态结构 => {
        const base = raw ? JSON.parse(JSON.stringify(raw)) : 创建开场空白战斗();
        if (typeof base?.是否战斗中 !== 'boolean') base.是否战斗中 = false;
        if (!('敌方' in base)) base.敌方 = null;
        return base as 战斗状态结构;
    };

    const 战斗结束自动清空 = (battleLike: any, storyLike?: any): 战斗状态结构 => {
        const battle = 规范化战斗状态(battleLike);
        const 敌方 = battle.敌方;
        const 变量标记结束 =
            storyLike?.剧情变量?.是否战斗中 === false ||
            storyLike?.剧情变量?.战斗结束 === true ||
            storyLike?.剧情变量?.离开战斗 === true;

        const shouldClear =
            battle.是否战斗中 !== true ||
            !敌方 ||
            (typeof 敌方?.当前血量 === 'number' && 敌方.当前血量 <= 0) ||
            (typeof 敌方?.当前精力 === 'number' && 敌方.当前精力 <= 0) ||
            变量标记结束;

        if (shouldClear) {
            return {
                是否战斗中: false,
                敌方: null
            };
        }

        return battle;
    };

    const 创建开场空白剧情 = () => ({
        当前章节: {
            ID: '',
            序号: 1,
            标题: '',
            背景故事: '',
            主要矛盾: '',
            结束条件: [],
            伏笔列表: []
        },
        下一章预告: {
            标题: '',
            大纲: ''
        },
        历史卷宗: [],
        剧情变量: {}
    });

    const 创建开场基础状态 = (charData: 角色数据结构, _worldConfig: WorldGenConfig) => {
        const hasJoinedSect = typeof charData?.所属门派ID === 'string' && charData.所属门派ID !== 'none';
        const sectState: 详细门派结构 = 创建占位门派状态(charData);
        const initialTasks: any[] = hasJoinedSect ? [] : [];
        const initialAgreements: any[] = hasJoinedSect ? [] : [];

        return {
            角色: JSON.parse(JSON.stringify(charData)),
            环境: 创建开场空白环境(),
            社交: [],
            世界: 创建开场空白世界(),
            战斗: 创建开场空白战斗(),
            玩家门派: sectState,
            任务列表: initialTasks,
            约定列表: initialAgreements,
            当前地点: '',
            剧情: 创建开场空白剧情()
        };
    };

    const 构建系统提示词 = (
        promptPool: 提示词结构[],
        memoryData: 记忆系统结构,
        socialData: any[],
        statePayload: any
    ): {
        systemPrompt: string;
        shortMemoryContext: string;
        contextPieces: {
            worldPrompt: string;
            otherPrompts: string;
            离场NPC档案: string;
            长期记忆: string;
            中期记忆: string;
            在场NPC档案: string;
            游戏设置: string;
            剧情安排: string;
            世界状态: string;
            环境状态: string;
            角色状态: string;
            战斗状态: string;
            门派状态: string;
            任务状态: string;
            约定状态: string;
        };
    } => {
        const 构建环境状态文本 = (payload: any) => {
            const source = payload || {};
            const env = 规范化环境信息(source?.环境);
            const fullLocation = 构建完整地点文本(env);
            const rawTime = typeof env?.时间 === 'string' ? env.时间.trim() : '';
            const canonicalTime = rawTime ? (normalizeCanonicalGameTime(rawTime) || rawTime) : '';
            const dateMatch = canonicalTime.match(/^(\d{1,6}):(\d{2}):(\d{2})/);
            const 当前日期 = dateMatch ? `${dateMatch[1]}:${dateMatch[2]}:${dateMatch[3]}` : '未知日期';
            const 当前节日 = env?.节日?.名称?.trim() || '平常日';
            return [
                '【当前环境】',
                `当前日期: ${当前日期}`,
                `当前地点: ${fullLocation}`,
                `当前天气: ${env?.天气?.trim() || '未知天气'}`,
                `当前环境: ${env?.环境描述?.trim() || '未知环境'}`,
                `当前节日: ${当前节日}`,
                `游戏天数: ${typeof env?.游戏天数 === 'number' && Number.isFinite(env.游戏天数) ? env.游戏天数 : 1}`
            ].join('\n');
        };

        const 构建角色状态文本 = (payload: any) => {
            const source = payload || {};
            const role = source?.角色 && typeof source.角色 === 'object' ? source.角色 : {};
            const {
                姓名,
                称号,
                境界,
                性别,
                年龄,
                出生日期,
                外貌,
                天赋列表,
                出身背景,
                ...角色其余信息
            } = role;
            return [
                '【角色】',
                `姓名: ${typeof 姓名 === 'string' && 姓名.trim() ? 姓名.trim() : '未命名'}`,
                `角色基础信息: ${JSON.stringify({ 称号, 境界, 性别, 年龄, 出生日期, 外貌, 天赋列表, 出身背景 })}`,
                `角色其余信息: ${JSON.stringify(角色其余信息)}`
            ].join('\n');
        };
        const 构建剧情安排 = (payload: any) => {
            const story = payload?.剧情 || {};
            const chapter = story?.当前章节 || {};
            const preview = story?.下一章预告 || {};
            const archives = Array.isArray(story?.历史卷宗) ? story.历史卷宗 : [];
            const storyVarsRaw = (story?.剧情变量 && typeof story.剧情变量 === 'object' && !Array.isArray(story.剧情变量))
                ? story.剧情变量
                : {};

            const 纯文本 = (value: any, fallback: string = '') => (
                typeof value === 'string' ? value : fallback
            );

            const normalizedStory: 剧情系统结构 = {
                当前章节: {
                    ID: 纯文本(chapter?.ID),
                    序号: typeof chapter?.序号 === 'number' ? chapter.序号 : 1,
                    标题: 纯文本(chapter?.标题),
                    背景故事: 纯文本(chapter?.背景故事),
                    主要矛盾: 纯文本(chapter?.主要矛盾),
                    结束条件: Array.isArray(chapter?.结束条件)
                        ? chapter.结束条件.map((cond: any) => ({
                            类型: cond?.类型 === '时间' || cond?.类型 === '事件' || cond?.类型 === '变量' ? cond.类型 : '事件',
                            描述: 纯文本(cond?.描述),
                            判定值: Object.prototype.hasOwnProperty.call(cond || {}, '判定值')
                                ? cond.判定值
                                : null,
                            对应变量键名: 纯文本(cond?.对应变量键名)
                        }))
                        : [],
                    伏笔列表: Array.isArray(chapter?.伏笔列表)
                        ? chapter.伏笔列表.map((item: any) => 纯文本(item)).filter((item: string) => item.length > 0)
                        : []
                },
                下一章预告: {
                    标题: 纯文本(preview?.标题),
                    大纲: 纯文本(preview?.大纲)
                },
                历史卷宗: archives.map((arc: any) => ({
                    标题: 纯文本(arc?.标题),
                    结语: 纯文本(arc?.结语)
                })),
                剧情变量: Object.fromEntries(
                    Object.entries(storyVarsRaw).filter(([, value]) => (
                        typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string'
                    ))
                ) as Record<string, boolean | number | string>
            };

            return `【剧情安排】\n${JSON.stringify(normalizedStory)}`;
        };

        const perspectivePromptIds = [
            'write_perspective_first',
            'write_perspective_second',
            'write_perspective_third'
        ];
        const normalizedGameConfig = 规范化游戏设置(gameConfig);
        const selectedPerspectiveIdMap: Record<string, string> = {
            第一人称: 'write_perspective_first',
            第二人称: 'write_perspective_second',
            第三人称: 'write_perspective_third'
        };
        const selectedPerspectiveId = selectedPerspectiveIdMap[normalizedGameConfig.叙事人称] || 'write_perspective_second';
        const selectedPerspectivePrompt = promptPool.find(p => p.id === selectedPerspectiveId);
        const fallbackPerspectivePrompt = promptPool.find(p => perspectivePromptIds.includes(p.id) && p.启用);

        const playerName = statePayload?.角色?.姓名 || 角色?.姓名 || '未命名';
        const 渲染提示词文本 = (content: string) => content.replace(/\$\{playerName\}/g, playerName);
        const 应用写作设置 = (promptId: string, content: string) => {
            if (promptId !== 'write_req') return content;
            const lengthRule = `<字数>本次"logs"内的正文**必须${normalizedGameConfig.字数要求}字**以上</字数>`;
            if (/<字数>[\s\S]*?<\/字数>/m.test(content)) {
                return content.replace(/<字数>[\s\S]*?<\/字数>/m, lengthRule);
            }
            if (/- 单条旁白建议.*$/m.test(content)) {
                return content.replace(/- 单条旁白建议.*$/m, lengthRule);
            }
            return `${content.trim()}\n${lengthRule}`;
        };

        const enabledPrompts = promptPool.filter(p => p.启用);
        const actionOptionsPrompt = promptPool.find(p => p.id === 'core_action_options');
        const worldPrompt = 渲染提示词文本(enabledPrompts.find(p => p.id === 'core_world')?.内容 || '');
        const writeReqPrompt = enabledPrompts.find(p => p.id === 'write_req');
        const writeReqContent = writeReqPrompt
            ? 应用写作设置(writeReqPrompt.id, 渲染提示词文本(writeReqPrompt.内容))
            : '';
        const otherPromptContents = enabledPrompts
            .filter(p => p.id !== 'core_world' && p.id !== 'core_action_options' && !perspectivePromptIds.includes(p.id) && p.id !== 'write_req')
            .map(p => 应用写作设置(p.id, 渲染提示词文本(p.内容)));
        const actionOptionsPromptContent = normalizedGameConfig.启用行动选项
            ? 渲染提示词文本(actionOptionsPrompt?.内容 || '')
            : '';
        const activePerspectiveContent = 应用写作设置(
            selectedPerspectivePrompt?.id || '',
            渲染提示词文本(selectedPerspectivePrompt?.内容 || fallbackPerspectivePrompt?.内容 || '')
        );
        const otherPrompts = [...otherPromptContents, actionOptionsPromptContent]
            .filter(Boolean)
            .join('\n\n');

        const npcContext = 构建NPC上下文(socialData || []);
        const promptHeader = [
            worldPrompt.trim(),
            npcContext.离场数据块,
            otherPrompts.trim()
        ].filter(Boolean).join('\n\n');

        const longMemory = `【长期记忆】\n${memoryData.长期记忆.join('\n') || '暂无'}`;
        const midMemory = `【中期记忆】\n${memoryData.中期记忆.join('\n') || '暂无'}`;
        const contextMemory = `${longMemory}\n${midMemory}`;
        const contextNPCData = npcContext.在场数据块;
        const contextSettings = [
            '【游戏设置】',
            `字数要求: ${normalizedGameConfig.字数要求}字`,
            `叙事人称: ${normalizedGameConfig.叙事人称}`,
            `行动选项功能: ${normalizedGameConfig.启用行动选项 ? '开启' : '关闭'}`,
            '',
            '【对应叙事人称提示词】',
            activePerspectiveContent || '未配置',
            '',
            '【对应字数要求提示词】',
            writeReqContent || '未配置'
        ].join('\n');
        const contextStoryPlan = 构建剧情安排(statePayload);
        const worldData = statePayload?.世界 && typeof statePayload.世界 === 'object' ? statePayload.世界 : {};
        const battleData = statePayload?.战斗 && typeof statePayload.战斗 === 'object' ? statePayload.战斗 : {};
        const sectData = statePayload?.玩家门派 && typeof statePayload.玩家门派 === 'object' ? statePayload.玩家门派 : {};
        const tasksData = Array.isArray(statePayload?.任务列表) ? statePayload.任务列表 : [];
        const agreementsData = Array.isArray(statePayload?.约定列表) ? statePayload.约定列表 : [];
        const contextWorldState = `【世界】\n${JSON.stringify(worldData)}`;
        const contextEnvironmentState = 构建环境状态文本(statePayload);
        const contextRoleState = 构建角色状态文本(statePayload);
        const contextBattleState = `【战斗】\n${JSON.stringify(battleData)}`;
        const contextSectState = `【玩家门派】\n${JSON.stringify(sectData)}`;
        const contextTaskState = `【任务列表】\n${JSON.stringify(tasksData)}`;
        const contextAgreementState = `【约定列表】\n${JSON.stringify(agreementsData)}`;
        const shortMemoryEntries = memoryData.短期记忆
            .slice(-30)
            .map(item => item.trim())
            .filter(Boolean);
        const shortMemoryContext = shortMemoryEntries.length > 0
            ? `【短期记忆】\n${shortMemoryEntries.join('\n')}`
            : '';

        return {
            systemPrompt: [
                promptHeader,
                contextMemory,
                contextNPCData,
                contextSettings,
                contextStoryPlan,
                contextWorldState,
                contextEnvironmentState,
                contextRoleState,
                contextBattleState,
                contextSectState,
                contextTaskState,
                contextAgreementState
            ]
                .filter(Boolean)
                .join('\n\n'),
            shortMemoryContext,
            contextPieces: {
                worldPrompt: worldPrompt.trim(),
                otherPrompts: otherPrompts.trim(),
                离场NPC档案: npcContext.离场数据块,
                长期记忆: longMemory,
                中期记忆: midMemory,
                在场NPC档案: contextNPCData,
                游戏设置: contextSettings,
                剧情安排: contextStoryPlan,
                世界状态: contextWorldState,
                环境状态: contextEnvironmentState,
                角色状态: contextRoleState,
                战斗状态: contextBattleState,
                门派状态: contextSectState,
                任务状态: contextTaskState,
                约定状态: contextAgreementState
            }
        };
    };

    const handleGenerateWorld = async (
        worldConfig: WorldGenConfig,
        charData: 角色数据结构,
        mode: 'all' | 'step',
        openingStreaming: boolean = true
    ) => {
        const currentApi = 获取主剧情接口配置(apiConfig);
        if (!接口配置是否可用(currentApi)) {
            alert("请先在设置中填写 API 地址/API Key，并选择主剧情使用模型");
            setShowSettings(true);
            return;
        }

        设置最近开局配置({
            worldConfig: 深拷贝(worldConfig),
            charData: 深拷贝(charData),
            openingStreaming
        });
        清空重Roll快照();

        if (openingStreaming) {
            const worldStreamMarker = Date.now();
            setView('game');
            设置历史记录([
                {
                    role: 'system',
                    content: '系统: 正在生成数据，请稍候...',
                    timestamp: worldStreamMarker
                },
                {
                    role: 'assistant',
                    content: openingStreaming ? '【生成中】准备连接模型...' : '【生成中】等待模型返回...',
                    timestamp: worldStreamMarker + 1
                }
            ]);
        }

        setLoading(true);

        let worldStreamHeartbeat: ReturnType<typeof setInterval> | null = null;
        let worldDeltaReceived = false;
        try {
            // 1. Build worldview seed prompt (for world-prompt generation only)
            const worldPromptSeed = 构建世界观提示词(worldConfig, charData);

            const difficulty = worldConfig.difficulty || 'normal';

            // Filter prompts: Update Core World AND Enable/Disable Difficulty prompts
            const updatedPrompts = prompts.map(p => {
                // Update world prompt content
                if (p.id === 'core_world') {
                    return { ...p, 内容: worldPromptSeed };
                }
                
                // Toggle Difficulty Prompts
                if (p.类型 === '难度设定') {
                    // Enable if the ID ends with the selected difficulty (e.g. "_hard")
                    // The convention in prompts/difficulty/*.ts is "diff_game_hard", "diff_check_hard", etc.
                    const isTargetDifficulty = p.id.endsWith(`_${difficulty}`);
                    return { ...p, 启用: isTargetDifficulty };
                }
                
                return p;
            });

            setPrompts(updatedPrompts);
            // Save immediately so subsequent calls use it
            await dbService.保存设置('prompts', updatedPrompts);

            const enabledDifficultyPrompts = updatedPrompts
                .filter(p => p.类型 === '难度设定' && p.启用)
                .map(p => `【${p.标题}】\n${p.内容}`)
                .join('\n\n');

            const worldGenerationContext = `
${worldPromptSeed}

【世界生成配置】
- 模式: 新建世界
- 难度: ${difficulty}
- 生成目标: 仅生成 world_prompt（世界观提示词文本）

【启用难度规则】
${enabledDifficultyPrompts || '未提供'}
            `.trim();

            // 2. Call AI Service
            if (openingStreaming) {
                let pulse = 0;
                worldStreamHeartbeat = setInterval(() => {
                    if (worldDeltaReceived) return;
                    pulse = (pulse + 1) % 4;
                    const dots = '.'.repeat(pulse) || '.';
                    设置历史记录(prev => prev.map(item => {
                        if (
                            item.role === 'assistant' &&
                            !item.structuredResponse &&
                            typeof item.content === 'string' &&
                            item.content.startsWith('【生成中】')
                        ) {
                            return {
                                ...item,
                                content: `【生成中】世界观生成${dots}`
                            };
                        }
                        return item;
                    }));
                }, 420);
            }

            const generatedWorldPrompt = await aiService.generateWorldData(
                worldGenerationContext,
                charData,
                currentApi,
                openingStreaming
                    ? {
                        stream: openingStreaming,
                        onDelta: (_delta, accumulated) => {
                            worldDeltaReceived = true;
                            设置历史记录(prev => prev.map(item => {
                                if (
                                    item.role === 'assistant' &&
                                    !item.structuredResponse &&
                                    typeof item.content === 'string' &&
                                    item.content.startsWith('【生成中】')
                                ) {
                                    return {
                                        ...item,
                                        content: `【生成中】世界观生成... 已接收 ${accumulated.length} 字符`
                                    };
                                }
                                return item;
                            }));
                        }
                    }
                    : undefined
            );
            if (worldStreamHeartbeat) clearInterval(worldStreamHeartbeat);

            const worldPromptContent = generatedWorldPrompt?.trim() || worldPromptSeed;
            const finalPrompts = updatedPrompts.map(p => (
                p.id === 'core_world' ? { ...p, 内容: worldPromptContent } : p
            ));
            setPrompts(finalPrompts);
            await dbService.保存设置('prompts', finalPrompts);

            // Initialize opening base state (full runtime initialization happens in opening story)
            const openingBase = 创建开场基础状态(charData, worldConfig);
            设置角色(规范化角色物品容器映射(openingBase.角色));
            设置环境(规范化环境信息(openingBase.环境));
            设置社交(规范化社交列表(openingBase.社交));
            设置世界(openingBase.世界);
            设置战斗(openingBase.战斗);
            设置玩家门派(openingBase.玩家门派);
            设置任务列表(openingBase.任务列表 || []);
            设置约定列表(openingBase.约定列表 || []);
            设置剧情(openingBase.剧情);

            // Reset other states
            设置记忆系统({ 回忆档案: [], 即时记忆: [], 短期记忆: [], 中期记忆: [], 长期记忆: [] });

            // Mode Handling
            if (mode === 'step') {
                设置历史记录([]);
                setView('game');
                setLoading(false);
                alert("世界观提示词已写入。请在聊天框输入指令开始初始化。");
            } else {
                // We pass genData explicitly because state updates might be async/batched
                await generateOpeningStory(openingBase, finalPrompts, openingStreaming);
                setLoading(false);
            }

        } catch (error: any) {
            if (worldStreamHeartbeat) clearInterval(worldStreamHeartbeat);
            console.error(error);
            alert("世界生成失败: " + error.message);
            if (openingStreaming) {
                setView('new_game');
            }
            setLoading(false);
        }
    };

    const generateOpeningStory = async (
        contextData: any,
        promptSnapshot: 提示词结构[],
        useStreaming: boolean
    ) => {
        const openingPrompt = `
【第0回合开场初始化任务】
请基于当前 GameState（已清空变量模板 + world_prompt 世界观母本 + 角色建档信息）生成第一幕，要求：
1. 输出严格符合 GameResponse JSON（含 thinking_pre/logs/thinking_post/tavern_commands/shortTerm）。
2. **字数硬约束**：\`logs\` 中叙事正文总长度必须 **>= 650 个中文字符**（不含 thinking 与 tavern_commands）。
3. **全量初始化硬约束**：本回合必须完成“当前引擎可写域”的完整初始化，且通过 \`tavern_commands\` 落地，禁止只叙事不改变量。
   - 特别说明：系统在开场前已清空大部分变量内容；除角色建档信息与 world_prompt 外，禁止依赖“现成默认值”。
4. 可写域初始化标准（全部必须命中）：
   - \`gameState.角色\`：按当前角色建档数据完整初始化（基础身份、六维、生存值、部位血量与状态、装备、物品列表、功法列表、经验、金钱与BUFF）。
     - \`物品列表\` 必须使用“最新容器结构”初始化：
       - 物品基础字段按当前项目定义写全：\`ID/名称/描述/类型/品质/重量(单位:斤)/占用空间/价值/当前耐久/最大耐久/词条列表/当前容器ID?/当前装备部位?\`。
       - 容器字段仅允许：\`容器属性={最大容量, 当前已用空间, 最大单物大小, 减重比例}\`；禁止写旧字段 \`容器属性.内容物\`。
       - 除明确“穿戴中/手持中”的剧情态外，已收纳物品必须写 \`当前容器ID\`，且该 ID 必须指向 \`物品列表\` 内真实存在的容器物品。
       - 对“已装备在身”的物品，\`当前装备部位\` 必须填写，且 \`当前容器ID\` 必须等于该装备部位（如 \`主武器/头部/背部\`）。
       - \`gameState.角色.装备\` 允许仅写“名称或ID”，但 \`物品列表\` 必须同时存在该装备的完整物品对象（不得只留名称空壳）。
       - 每个容器的 \`当前已用空间\` 必须与“指向该容器的物品占用空间总和”一致，禁止留空或与实际收纳不一致。
       - 若容器为软质袋类，需按当前已用空间同步其自身 \`占用空间\`（默认口径：空载=1，非空=\`max(1, ceil(当前已用空间*0.35))\`）。
     - \`称号\` 必须生成且非空：若建档已给定称号则沿用；若建档留空，需根据“出身背景 + 当前境界 + 开局处境”生成一个武侠风称号后写入。
   - \`gameState.环境\`：完整初始化 时间(YYYY:MM:DD:HH:MM)、天气、节日、大地点/中地点/小地点/具体地点、游戏天数(第几日)。
     - \`具体地点\` 仅写小地点内部的微观位置（如“茶棚内侧角桌”），禁止重复拼接小地点名称。
   - \`gameState.当前地点\`：必须显式初始化，并与 \`gameState.环境.具体地点\` 保持一致。
   - \`gameState.社交\`：按开场剧情实际出场角色初始化；不强制固定人数。未出场角色可不建档。
   - \`gameState.世界\`：完整初始化（当前时代/混乱度/势力列表/活跃NPC列表/进行中事件/已结算事件/江湖史册）。
     其中“天下大势正在发生的事件”（\`gameState.世界.进行中事件\`）开场必须生成 **>=3 条**（推荐 5 条），且每条都需具备真实关联势力或人物，禁止空事件凑数。
     - 每条 \`进行中事件\` 必须写全：\`开始时间\` 与 \`预计结束时间\`（\`YYYY:MM:DD:HH:MM\`），禁止省略结束时间或改用其他字段名。
   - \`gameState.战斗\`：开场默认必须初始化为非战斗状态，除非玩家建档信息明确要求“战斗开局”。
     - 默认值：\`{"是否战斗中":false,"敌方":null}\`
   - \`gameState.剧情\`：完整初始化（当前章节/下一章预告/历史卷宗/剧情变量）。
5. 非可写域初始化原则（随建档决定）：
   - \`玩家门派/任务列表/约定列表\` 在本地状态中也需完成初始化。
   - 若角色未加入门派（如 \`所属门派ID=none\`），相关门派数据与任务/约定可留空，但字段必须存在且语义正确。
6. 命令覆盖硬约束：\`tavern_commands\` 必须覆盖本回合实际发生且可写的变更；禁止为了凑数量生成无意义命令。
7. 开场必须落在玩家当前环境与时间，不得跳场景；并引出第一个可交互选择，不替玩家决定。
8. \`shortTerm\` 仅写 100 字内剧情概况。
9. **剧情重置硬约束（必须执行）**：
   - world_prompt 已更新后，本回合必须先重建并覆盖 \`gameState.剧情.剧情变量\`（\`set\` 整对象），禁止沿用旧存档固定键与旧值。
   - \`gameState.剧情.当前章节.标题/背景故事/主要矛盾\` 必须基于新世界观重写，禁止复用“固定默认章节模板”。
   - \`gameState.剧情.当前章节.结束条件\` 必须与本回合实际事件绑定并动态生成，至少 3 条，且至少覆盖两种类型（时间/变量/事件）。
   - 所有“变量型结束条件”必须引用真实存在的 \`剧情变量\` 键名，禁止悬空键名。
10. **卷间衔接硬约束（必须执行）**：
   - 第一卷阶段就必须写好 \`gameState.剧情.下一章预告.标题\` 与 \`大纲\`，不得使用“暂定/未定”。
   - 第二卷大纲必须包含：核心冲突、关键势力、触发条件、失败风险，确保后续可直接承接。
11. **分线变量硬约束（必须执行）**：
   - \`剧情变量\` 必须用于剧情线路门控，不得写成纯描述文本。
   - 至少包含：章节阶段变量、关键抉择变量、线索进度变量、阵营倾向变量、风险压力变量。
   - 开场必须生成可改变剧情路线的变量组合（例如站队、线索完成度、追杀热度），并与本回合叙事一致。
12. **开场质量约束（必须执行）**：
   - 需要出现“可执行的下一步选择点”，并至少包含 1 个低风险日常选项（例如打听、采购、休整、拜访）。
   - 出场角色、冲突与伏笔数量不设固定下限，但必须与开场剧情规模和世界观一致。
13. **平缓开局节奏硬约束（必须执行）**：
   - 开局前 1 回合默认采用“低压起步”，禁止强制玩家立刻陷入生死战、追杀战、围攻战、必输战。
   - 高风险事件可作为“远处传闻/背景线索/延迟触发条件”出现，但不得在开局第一幕直接压到玩家脸上。
   - 冲突强度需与建档信息一致：平民/流民/新手出身默认从生活场景切入；有门派或仇杀背景才可提高紧张度。
   - 即便在困难/极限难度，第一幕也应先建立人物关系与目标，再递进压力，不得开局即重伤濒死。
   - 若玩家未主动选择危险行动，禁止代替玩家触发高危战斗。
14. **首段开场自由行动硬约束（必须执行）**：
   - \`logs\` 第一条必须是 \`sender="旁白"\`，且为“环境与人物状态铺垫”的平缓开场，不得直接进入冲突爆点。
   - 第一段开场（建议前 1-2 条 logs）禁止出现“必须立即二选一/倒计时逼选/不选即失败”等迫使玩家立刻决策的叙事。
   - 开场只允许给出“可探索线索与可行动方向”，不得把玩家锁死在单一路径上。
   - 第一幕结尾应留出自由行动窗口：至少提供 2 个以上互斥度不高的可执行方向（如观察、打听、休整、前往某处），并明确由玩家决定下一步。
15. **世界观写入边界（必须执行）**：
   - 本阶段仅生成开场剧情与 GameState 初始化，禁止生成/改写 \`world_prompt\`。
   - 禁止输出任何与 \`prompts/core/world.ts\` 改写相关的描述或指令。
16. **旁白与对话分离硬约束（开场专用，必须执行）**：
   - \`sender="旁白"\` 的文本中禁止出现角色台词引号（\`“...”\`/\`「...」\`/\`『...』\`）与“角色名+冒号”发言格式。
   - 角色发言必须单独使用 \`sender="角色名"\` 输出；若有“某人提醒道：‘...’”句式，必须拆成“旁白动作”+“角色台词”两条 logs。
        `;

        const initialHistory: 聊天记录结构[] = [
            {
                role: 'system',
                content: '系统: 正在生成开场内容...',
                timestamp: Date.now()
            }
        ];
        设置历史记录(initialHistory);
        let openingStreamHeartbeat: ReturnType<typeof setInterval> | null = null;
        let openingDeltaReceived = false;

        try {
            const controller = new AbortController();
            abortControllerRef.current = controller;

            const openingMem: 记忆系统结构 = { 回忆档案: [], 即时记忆: [], 短期记忆: [], 中期记忆: [], 长期记忆: [] };
            const openingEnv = 规范化环境信息(contextData?.环境 || 环境);
            const openingCurrentLocation = Object.prototype.hasOwnProperty.call(contextData || {}, '当前地点')
                ? contextData.当前地点
                : (openingEnv?.具体地点 ?? '');
            const openingStatePayload = {
                角色: contextData.角色 || 角色,
                环境: openingEnv,
                世界: contextData.世界 || 世界,
                战斗: contextData.战斗 || 战斗,
                玩家门派: contextData.玩家门派 || 玩家门派,
                任务列表: contextData.任务列表 || 任务列表,
                约定列表: contextData.约定列表 || 约定列表,
                当前地点: openingCurrentLocation,
                剧情: contextData.剧情 || 剧情
            };
            const openingContext = 构建系统提示词(
                promptSnapshot,
                openingMem,
                contextData.社交 || [],
                openingStatePayload
            );
            const openingScriptContext = [
                openingContext.shortMemoryContext,
                `【即时剧情回顾 (Script)】\n世界初始化完成，第一幕即将展开。`
            ].filter(Boolean).join('\n\n');

            const streamMarker = Date.now();
            if (useStreaming) {
                设置历史记录([
                    ...initialHistory,
                    {
                        role: 'assistant',
                        content: '',
                        timestamp: streamMarker,
                        gameTime: openingEnv?.时间 || "未知时间"
                    }
                ]);
                let pulse = 0;
                openingStreamHeartbeat = setInterval(() => {
                    if (openingDeltaReceived) return;
                    pulse = (pulse + 1) % 4;
                    const dots = '.'.repeat(pulse) || '.';
                    设置历史记录(prev => prev.map(item => {
                        if (
                            item.timestamp === streamMarker &&
                            item.role === 'assistant' &&
                            !item.structuredResponse
                        ) {
                            return { ...item, content: `【生成中】开场剧情生成${dots}` };
                        }
                        return item;
                    }));
                }, 420);
            }

            const aiData = await aiService.generateStoryResponse(
                openingContext.systemPrompt,
                openingScriptContext,
                openingPrompt,
                currentApi,
                controller.signal,
                useStreaming
                    ? {
                        stream: true,
                        onDelta: (_delta, accumulated) => {
                            openingDeltaReceived = true;
                            设置历史记录(prev => prev.map(item => {
                                if (
                                    item.timestamp === streamMarker &&
                                    item.role === 'assistant' &&
                                    !item.structuredResponse
                                ) {
                                    return { ...item, content: accumulated };
                                }
                                return item;
                            }));
                        }
                    }
                    : undefined,
                gameConfig.额外提示词
            );
            if (openingStreamHeartbeat) clearInterval(openingStreamHeartbeat);

            // Apply commands (use generated opening state as base to avoid stale state race)
            const openingStateAfterCommands = processResponseCommands(aiData, {
                角色: contextData.角色 || 角色,
                环境: contextData.环境 || 环境,
                社交: contextData.社交 || 社交,
                世界: contextData.世界 || 世界,
                战斗: contextData.战斗 || 战斗,
                剧情: contextData.剧情 || 剧情
            });

            const openingCanonicalTime = normalizeCanonicalGameTime(openingStateAfterCommands?.环境?.时间);
            const openingTime = openingCanonicalTime
                || openingStateAfterCommands?.环境?.时间
                || contextData.环境?.时间
                || "未知时间";
            const openingImmediateEntry = 构建即时记忆条目(openingTime, '', aiData, { 省略玩家输入: true });
            const openingShortEntry = 构建短期记忆条目(openingTime, '开局生成', aiData);
            设置记忆系统(prev => 写入四段记忆(规范化记忆系统(prev), openingImmediateEntry, openingShortEntry));

            const newAiMsg: 聊天记录结构 = { 
                role: 'assistant', 
                content: "Opening Story", 
                structuredResponse: aiData,
                rawJson: JSON.stringify(aiData, null, 2),
                timestamp: Date.now(),
                gameTime: openingTime
            };
            if (useStreaming) {
                设置历史记录(prev => prev.map(item => {
                    if (
                        item.timestamp === streamMarker &&
                        item.role === 'assistant' &&
                        !item.structuredResponse
                    ) {
                        return { ...newAiMsg };
                    }
                    return item;
                }));
            } else {
                设置历史记录([...initialHistory, newAiMsg]);
            }
            
            // Trigger auto-save after full opening response
            performAutoSave();

        } catch (e: any) {
            if (openingStreamHeartbeat) clearInterval(openingStreamHeartbeat);
            if (e?.name === 'AbortError') {
                设置历史记录(initialHistory);
                return;
            }
            console.error("Story Gen Failed", e);
        } finally {
            if (openingStreamHeartbeat) clearInterval(openingStreamHeartbeat);
            abortControllerRef.current = null;
        }
    };

    const handleReturnToHome = () => {
        setView('home');
        return true;
    };

    const processResponseCommands = (
        response: GameResponse,
        baseState?: {
            角色: typeof 角色;
            环境: typeof 环境;
            社交: typeof 社交;
            世界: typeof 世界;
            战斗: typeof 战斗;
            剧情: typeof 剧情;
        }
    ) => {
        let charBuffer = baseState?.角色 || 角色;
        let envBuffer = 规范化环境信息(baseState?.环境 || 环境);
        let socialBuffer = baseState?.社交 || 社交;
        let worldBuffer = baseState?.世界 || 世界;
        let battleBuffer = 规范化战斗状态(baseState?.战斗 || 战斗);
        let storyBuffer = baseState?.剧情 || 剧情;

        if (Array.isArray(response.tavern_commands)) {
            response.tavern_commands.forEach(cmd => {
                const res = applyStateCommand(charBuffer, envBuffer, socialBuffer, worldBuffer, battleBuffer, storyBuffer, cmd.key, cmd.value, cmd.action);
                charBuffer = res.char;
                envBuffer = 规范化环境信息(res.env);
                socialBuffer = 规范化社交列表(res.social, { 合并同名: false });
                worldBuffer = res.world;
                battleBuffer = res.battle;
                storyBuffer = res.story;
            });

            battleBuffer = 战斗结束自动清空(battleBuffer, storyBuffer);
            charBuffer = 规范化角色物品容器映射(charBuffer);
            const mergedSocial = 规范化社交列表(socialBuffer);

            设置角色(charBuffer);
            设置环境(规范化环境信息(envBuffer));
            设置社交(mergedSocial);
            设置世界(worldBuffer);
            设置战斗(battleBuffer);
            设置剧情(storyBuffer);
            socialBuffer = mergedSocial;
        }

        return {
            角色: charBuffer,
            环境: 规范化环境信息(envBuffer),
            社交: 规范化社交列表(socialBuffer),
            世界: worldBuffer,
            战斗: battleBuffer,
            剧情: storyBuffer
        };
    };

    const updateHistoryItem = (index: number, newRawJson: string) => {
        const parsed = parseJsonWithRepair<GameResponse>(newRawJson);
        if (!parsed.value) {
            console.error("Failed to update history: JSON repair failed", parsed.error);
            return;
        }

        const normalizedRaw = JSON.stringify(parsed.value, null, 2);
        const newHistory = [...历史记录];
        newHistory[index] = {
            ...newHistory[index],
            structuredResponse: parsed.value,
            rawJson: normalizedRaw,
            content: "Parsed Content Updated" 
        };
        设置历史记录(newHistory);
    };

    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    };

    // --- Helper: Format History to Script ---
    const formatHistoryToScript = (historyItems: 聊天记录结构[]) => {
        return historyItems.map(h => {
            let timeStr = h.gameTime ? `【${h.gameTime}】\n` : '';
            if (h.role === 'user') {
                return `${timeStr}玩家：${h.content}`;
            } else if (h.role === 'assistant' && h.structuredResponse) {
                // Extract scripts from logs
                const logs = Array.isArray(h.structuredResponse.logs) ? h.structuredResponse.logs : [];
                const lines = logs
                    .filter(l => l.sender !== '【判定】' && l.sender !== '【NSFW判定】')
                    .map(l => `${l.sender}：${l.text}`).join('\n');
                return `${timeStr}${lines}`;
            }
            return '';
        }).join('\n\n');
    };

    const buildContextSnapshot = (): 上下文快照 => {
        const normalizedMem = 规范化记忆系统(记忆系统);
        const builtContext = 构建系统提示词(
            prompts,
            normalizedMem,
            社交,
            { 角色, 环境: 规范化环境信息(环境), 世界, 战斗, 玩家门派, 任务列表, 约定列表, 当前地点: 规范化环境信息(环境)?.具体地点 || '', 剧情 }
        );
        const historyScript = formatHistoryToScript(历史记录) || '暂无';
        const latestUserInput = [...历史记录]
            .reverse()
            .find(item => item.role === 'user' && typeof item.content === 'string' && item.content.trim().length > 0)
            ?.content
            ?.trim() || '暂无';
        const extraPrompt = typeof gameConfig?.额外提示词 === 'string' && gameConfig.额外提示词.trim().length > 0
            ? gameConfig.额外提示词.trim()
            : '未配置';

        const sections: 上下文段[] = [];
        let order = 1;
        const pushSection = (id: string, title: string, category: string, content: string) => {
            const trimmed = (content || '').trim();
            if (!trimmed) return;
            sections.push({
                id,
                title,
                category,
                order: order++,
                content: trimmed
            });
        };

        pushSection('world_prompt', '世界观提示词', '系统', builtContext.contextPieces.worldPrompt);
        pushSection('npc_away', '离场NPC档案', '系统', builtContext.contextPieces.离场NPC档案);
        pushSection('other_prompts', '叙事/规则提示词', '系统', builtContext.contextPieces.otherPrompts);
        pushSection('memory_long', '长期记忆', '记忆', builtContext.contextPieces.长期记忆);
        pushSection('memory_mid', '中期记忆', '记忆', builtContext.contextPieces.中期记忆);
        pushSection('npc_present', '当前场景NPC档案', '系统', builtContext.contextPieces.在场NPC档案);
        pushSection('game_settings', '游戏设置', '系统', builtContext.contextPieces.游戏设置);
        pushSection('story_plan', '剧情安排', '系统', builtContext.contextPieces.剧情安排);
        pushSection('state_world', '世界', '系统', builtContext.contextPieces.世界状态);
        pushSection('state_environment', '当前环境', '系统', builtContext.contextPieces.环境状态);
        pushSection('state_role', '角色', '系统', builtContext.contextPieces.角色状态);
        pushSection('state_battle', '战斗', '系统', builtContext.contextPieces.战斗状态);
        pushSection('state_sect', '玩家门派', '系统', builtContext.contextPieces.门派状态);
        pushSection('state_tasks', '任务列表', '系统', builtContext.contextPieces.任务状态);
        pushSection('state_agreements', '约定列表', '系统', builtContext.contextPieces.约定状态);
        pushSection('memory_short', '短期记忆', '记忆', builtContext.shortMemoryContext);
        pushSection('script', '即时剧情回顾 (Script)', '历史', `【即时剧情回顾 (Script)】\n${historyScript}`);
        pushSection('player_input', '玩家输入 (最近)', '用户', `<玩家输入>${latestUserInput}</玩家输入>`);
        pushSection('extra_prompt', '额外要求提示词', '用户', `【额外要求提示词】\n${extraPrompt}`);

        return {
            sections,
            fullText: sections.map(section => section.content).join('\n\n')
        };
    };

    // --- Core Send Logic ---
    const handleSend = async (content: string, isStreaming: boolean = true) => {
        if (!content.trim() || loading) return;
        const activeApi = 获取主剧情接口配置(apiConfig);
        if (!接口配置是否可用(activeApi)) {
            alert("请先在设置中填写 API 地址/API Key，并选择主剧情使用模型");
            setShowSettings(true);
            return;
        }

        // 1. Calculate Game Time String
        const canonicalTime = normalizeCanonicalGameTime(环境.时间);
        const currentGameTime = canonicalTime || 环境.时间 || `第${环境.游戏天数 || 1}日`;
        const sendInput = content.trim();
        const historyBeforeSend = [...历史记录];
        const memBeforeSend = 规范化记忆系统(记忆系统);
        推入重Roll快照({
            玩家输入: sendInput,
            游戏时间: currentGameTime,
            回档前状态: {
                角色: 深拷贝(角色),
                环境: 规范化环境信息(深拷贝(环境)),
                社交: 深拷贝(社交),
                世界: 深拷贝(世界),
                战斗: 深拷贝(战斗),
                玩家门派: 深拷贝(玩家门派),
                任务列表: 深拷贝(任务列表),
                约定列表: 深拷贝(约定列表),
                剧情: 深拷贝(剧情),
                记忆系统: 深拷贝(memBeforeSend)
            },
            回档前历史: 深拷贝(historyBeforeSend)
        });

        // 2. Trim history window (keep recent context only)
        let currentHistory = [...historyBeforeSend];
        if (currentHistory.length >= 20) {
            currentHistory = currentHistory.slice(-18);
        }
        const updatedMemSys = 规范化记忆系统(memBeforeSend);

        // 3. Prepare New Message
        const newUserMsg: 聊天记录结构 = { 
            role: 'user', 
            content: content, 
            timestamp: Date.now(),
            gameTime: currentGameTime 
        };
        const updatedHistory = [...currentHistory, newUserMsg];
        设置历史记录(updatedHistory);
        setLoading(true);

        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            // 4. Construct System Prompt
            const builtContext = 构建系统提示词(
                prompts,
                updatedMemSys,
                社交,
                { 角色, 环境: 规范化环境信息(环境), 世界, 战斗, 玩家门派, 任务列表, 约定列表, 当前地点: 规范化环境信息(环境)?.具体地点 || '', 剧情 }
            );
            const contextImmediate = [
                builtContext.shortMemoryContext,
                `【即时剧情回顾 (Script)】\n${formatHistoryToScript(updatedHistory) || '暂无'}`
            ].filter(Boolean).join('\n\n');

            let streamMarker = 0;
            if (isStreaming) {
                streamMarker = Date.now();
                设置历史记录([
                    ...updatedHistory,
                    {
                        role: 'assistant',
                        content: '',
                        timestamp: streamMarker,
                        gameTime: currentGameTime
                    }
                ]);
            }

            // 5. Call AI Service
            const aiData = await aiService.generateStoryResponse(
                builtContext.systemPrompt,
                contextImmediate,
                sendInput,
                activeApi,
                controller.signal,
                isStreaming
                    ? {
                        stream: true,
                        onDelta: (_delta, accumulated) => {
                            设置历史记录(prev => prev.map(item => {
                                if (
                                    item.timestamp === streamMarker &&
                                    item.role === 'assistant' &&
                                    !item.structuredResponse
                                ) {
                                    return { ...item, content: accumulated };
                                }
                                return item;
                            }));
                        }
                    }
                    : undefined,
                gameConfig.额外提示词
            );

            // 6. Process Result
            processResponseCommands(aiData);

            const immediateEntry = 构建即时记忆条目(currentGameTime, sendInput, aiData);
            const shortEntry = 构建短期记忆条目(currentGameTime, sendInput, aiData);
            设置记忆系统(prev => 写入四段记忆(规范化记忆系统(prev), immediateEntry, shortEntry));

            const newAiMsg: 聊天记录结构 = { 
                role: 'assistant', 
                content: "Structured Response", 
                structuredResponse: aiData,
                rawJson: JSON.stringify(aiData, null, 2),
                timestamp: Date.now(),
                gameTime: currentGameTime
            };
            if (isStreaming) {
                设置历史记录(prev => prev.map(item => {
                    if (
                        item.timestamp === streamMarker &&
                        item.role === 'assistant' &&
                        !item.structuredResponse
                    ) {
                        return { ...newAiMsg };
                    }
                    return item;
                }));
            } else {
                设置历史记录([...updatedHistory, newAiMsg]);
            }
            
            // 7. Auto Save Trigger
            performAutoSave();

        } catch (error: any) {
            if (error.name === 'AbortError') {
                const snapshot = 弹出重Roll快照();
                if (snapshot) {
                    回档到快照(snapshot);
                } else {
                    设置历史记录(historyBeforeSend);
                    设置记忆系统(memBeforeSend);
                }
                console.log("Request aborted by user");
            } else {
                弹出重Roll快照();
                const errorMsg: 聊天记录结构 = { role: 'system', content: `[系统错误]: ${error.message}`, timestamp: Date.now() };
                设置历史记录([...updatedHistory, errorMsg]);
            }
        } finally {
            setLoading(false);
            abortControllerRef.current = null;
        }
    };

    const handleRegenerate = (): string | null => {
        if (loading) return null;
        const snapshot = 弹出重Roll快照();
        if (!snapshot) return null;
        回档到快照(snapshot);
        return snapshot.玩家输入;
    };

    const handleQuickRestart = async () => {
        if (loading || !最近开局配置) return;
        清空重Roll快照();
        await handleGenerateWorld(
            深拷贝(最近开局配置.worldConfig),
            深拷贝(最近开局配置.charData),
            'all',
            最近开局配置.openingStreaming
        );
    };

    // --- Persistence ---

    const saveSettings = async (newConfig: 接口设置结构) => {
        const normalized = 规范化接口设置(newConfig);
        setApiConfig(normalized);
        await dbService.保存设置('api_settings', normalized);
    };
    const saveVisualSettings = async (newConfig: 视觉设置结构) => {
        setVisualConfig(newConfig);
        await dbService.保存设置('visual_settings', newConfig);
    }
    const saveGameSettings = async (newConfig: 游戏设置结构) => {
        const normalized = 规范化游戏设置(newConfig);
        setGameConfig(normalized);
        await dbService.保存设置('game_settings', normalized);
    }
    const saveMemorySettings = async (newConfig: 记忆配置结构) => {
        const normalized = 规范化记忆配置(newConfig);
        setMemoryConfig(normalized);
        await dbService.保存设置('memory_settings', normalized);
    }
    const updatePrompts = async (newPrompts: 提示词结构[]) => {
        setPrompts(newPrompts);
        await dbService.保存设置('prompts', newPrompts);
    };
    const updateFestivals = async (newFestivals: 节日结构[]) => {
        setFestivals(newFestivals);
        await dbService.保存设置('festivals', newFestivals);
    };
    
    // Unified Save Function (Internal)
    const createSaveData = (desc: string, type: 'manual' | 'auto'): Omit<存档结构, 'id'> => {
        return {
            类型: type,
            时间戳: Date.now(),
            描述: desc,
            角色数据: 角色,
            环境信息: 规范化环境信息(环境),
            历史记录: 历史记录,
            社交: 社交,
            世界: 世界,
            战斗: 战斗,
            玩家门派: 玩家门派,
            任务列表: 任务列表,
            约定列表: 约定列表,
            剧情: 剧情,
            记忆系统: 记忆系统,
            游戏设置: gameConfig,
            记忆配置: memoryConfig,
            提示词快照: prompts // Save current prompts (including world gen)
        };
    };

    const handleSaveGame = async (desc: string) => {
        const save = createSaveData(desc, 'manual');
        await dbService.保存存档(save);
    };

    const performAutoSave = async () => {
        const desc = `[自动] ${构建完整地点文本(环境)} - ${new Date().toLocaleTimeString()}`;
        const save = createSaveData(desc, 'auto');
        await dbService.保存存档(save);
    };

    const handleLoadGame = async (save: 存档结构) => {
        清空重Roll快照();
        设置最近开局配置(null);
        设置角色(规范化角色物品容器映射(save.角色数据));
        设置环境(规范化环境信息(save.环境信息 || 创建开场空白环境()));
        设置社交(规范化社交列表(save.社交 || [])); 
        设置世界(save.世界 || 创建开场空白世界());
        设置战斗(规范化战斗状态(save.战斗 || 创建开场空白战斗()));
        设置玩家门派(save.玩家门派 || 创建空门派状态());
        设置任务列表(save.任务列表 || []);
        设置约定列表(save.约定列表 || []);
        设置剧情(save.剧情 || 创建开场空白剧情());
        设置历史记录(save.历史记录);
        设置记忆系统(规范化记忆系统(save.记忆系统));
        
        if (save.游戏设置) setGameConfig(规范化游戏设置(save.游戏设置));
        if (save.记忆配置) setMemoryConfig(规范化记忆配置(save.记忆配置));
        if (save.提示词快照) {
            setPrompts(save.提示词快照); // Restore world settings etc.
            await dbService.保存设置('prompts', save.提示词快照);
        }
        
        setView('game');
        setShowSaveLoad({ show: false, mode: 'load' }); // Close modal
    };

    return {
        state: gameState,
        meta: {
            canRerollLatest: 可重Roll计数 > 0,
            canQuickRestart: Boolean(最近开局配置)
        },
        setters: {
            setShowSettings, setShowInventory, setShowEquipment, setShowSocial, setShowTeam, setShowKungfu, setShowWorld, setShowSect, setShowTask, setShowAgreement, setShowStory, setShowMemory, setShowSaveLoad,
            setActiveTab, setCurrentTheme,
            setApiConfig, setVisualConfig, setPrompts
        },
        actions: {
            handleSend,
            handleStop,
            handleRegenerate,
            saveSettings, saveVisualSettings, saveGameSettings, saveMemorySettings,
            updatePrompts, updateFestivals,
            handleSaveGame, handleLoadGame,
            updateHistoryItem,
            handleStartNewGameWizard,
            handleGenerateWorld,
            handleQuickRestart,
            handleReturnToHome,
            getContextSnapshot: buildContextSnapshot
        }
    };
};
