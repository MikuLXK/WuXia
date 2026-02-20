import { 角色数据结构, 环境信息结构, 装备槽位 } from '../../types';
import { normalizeCanonicalGameTime } from './timeUtils';

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

export {
    规范化环境信息,
    构建完整地点文本,
    规范化角色物品容器映射,
    规范化社交列表
};

