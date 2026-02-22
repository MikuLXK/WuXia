
import { 存档结构 } from '../types';

const DB_NAME = 'WuxiaGameDB';
const STORE_NAME = 'saves';
const SETTINGS_STORE = 'settings';
const VERSION = 1;
const 自动存档最大保留数 = 3;
const 存档导出版本 = 1;

const 深拷贝 = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const safeNumber = (value: unknown, fallback: number): number => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return fallback;
};

const 构建存档去重键 = (save: {
    类型?: unknown;
    时间戳?: unknown;
    角色数据?: any;
    环境信息?: any;
    历史记录?: unknown;
}): string => {
    const type = save?.类型 === 'auto' ? 'auto' : 'manual';
    const ts = Math.max(0, Math.floor(safeNumber(save?.时间戳, 0)));
    const name = typeof save?.角色数据?.姓名 === 'string' ? save.角色数据.姓名.trim() : '';
    const envTime = typeof save?.环境信息?.时间 === 'string' ? save.环境信息.时间.trim() : '';
    const historyCount = Array.isArray(save?.历史记录) ? save.历史记录.length : 0;
    return `${type}|${ts}|${name}|${envTime}|${historyCount}`;
};

const 清洗导入存档 = (raw: any): Omit<存档结构, 'id'> | null => {
    if (!raw || typeof raw !== 'object') return null;
    if (!raw.角色数据 || typeof raw.角色数据 !== 'object') return null;
    if (!raw.环境信息 || typeof raw.环境信息 !== 'object') return null;

    const 类型: 'manual' | 'auto' = raw.类型 === 'auto' ? 'auto' : 'manual';
    const 时间戳 = Math.max(1, Math.floor(safeNumber(raw.时间戳, Date.now())));
    const history = Array.isArray(raw.历史记录) ? raw.历史记录 : [];
    const promptSnapshot = Array.isArray(raw.提示词快照) ? raw.提示词快照 : undefined;
    const 元数据 = raw.元数据 && typeof raw.元数据 === 'object' ? raw.元数据 : undefined;

    const normalized: Omit<存档结构, 'id'> = {
        类型,
        时间戳,
        描述: typeof raw.描述 === 'string' ? raw.描述 : undefined,
        元数据: 元数据 ? 深拷贝(元数据) : undefined,
        角色数据: 深拷贝(raw.角色数据),
        环境信息: 深拷贝(raw.环境信息),
        历史记录: 深拷贝(history),
        社交: Array.isArray(raw.社交) ? 深拷贝(raw.社交) : undefined,
        世界: raw.世界 && typeof raw.世界 === 'object' ? 深拷贝(raw.世界) : undefined,
        战斗: raw.战斗 && typeof raw.战斗 === 'object' ? 深拷贝(raw.战斗) : undefined,
        玩家门派: raw.玩家门派 && typeof raw.玩家门派 === 'object' ? 深拷贝(raw.玩家门派) : undefined,
        任务列表: Array.isArray(raw.任务列表) ? 深拷贝(raw.任务列表) : undefined,
        约定列表: Array.isArray(raw.约定列表) ? 深拷贝(raw.约定列表) : undefined,
        剧情: raw.剧情 && typeof raw.剧情 === 'object' ? 深拷贝(raw.剧情) : undefined,
        女主剧情规划: raw.女主剧情规划 && typeof raw.女主剧情规划 === 'object' ? 深拷贝(raw.女主剧情规划) : undefined,
        记忆系统: raw.记忆系统 && typeof raw.记忆系统 === 'object' ? 深拷贝(raw.记忆系统) : undefined,
        游戏设置: raw.游戏设置 && typeof raw.游戏设置 === 'object' ? 深拷贝(raw.游戏设置) : undefined,
        记忆配置: raw.记忆配置 && typeof raw.记忆配置 === 'object' ? 深拷贝(raw.记忆配置) : undefined,
        提示词快照: promptSnapshot ? 深拷贝(promptSnapshot) : undefined
    };

    return normalized;
};

export const 初始化数据库 = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
                db.createObjectStore(SETTINGS_STORE, { keyPath: 'key' });
            }
        };
    });
};

export const 维护自动存档 = async (db: IDBDatabase, maxKeep: number = 自动存档最大保留数): Promise<void> => {
    const keepCount = Math.max(0, Math.floor(maxKeep));
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
            const allSaves: 存档结构[] = request.result;
            const autoSaves = allSaves.filter(s => s.类型 === 'auto');
            
            // Sort by timestamp asc (oldest first)
            autoSaves.sort((a, b) => a.时间戳 - b.时间戳);

            if (autoSaves.length > keepCount) {
                const toDelete = autoSaves.slice(0, autoSaves.length - keepCount);
                toDelete.forEach(s => {
                    store.delete(s.id);
                });
            }
            resolve();
        };
        request.onerror = () => reject(request.error);
    });
};

export const 保存存档 = async (存档: Omit<存档结构, 'id'>): Promise<number> => {
    const db = await 初始化数据库();
    const normalized = 清洗导入存档(存档);
    if (!normalized) {
        throw new Error('保存存档失败：存档数据结构不完整');
    }
    
    if (normalized.类型 === 'auto') {
        await 维护自动存档(db, 自动存档最大保留数 - 1);
    }

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add(normalized);
        
        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
    });
};

export interface 存档导出结构 {
    version: number;
    exportedAt: string;
    saves: 存档结构[];
}

export interface 存档导入结果 {
    total: number;
    imported: number;
    skipped: number;
}

export const 导出存档数据 = async (): Promise<存档导出结构> => {
    const saves = await 读取存档列表();
    return {
        version: 存档导出版本,
        exportedAt: new Date().toISOString(),
        saves
    };
};

export const 导入存档数据 = async (
    payload: unknown,
    options?: { 覆盖现有?: boolean }
): Promise<存档导入结果> => {
    const rawList = Array.isArray(payload)
        ? payload
        : Array.isArray((payload as any)?.saves)
            ? (payload as any).saves
            : [];

    if (!Array.isArray(rawList) || rawList.length === 0) {
        throw new Error('导入失败：未找到可导入的存档数组');
    }

    const normalizedCandidates = rawList
        .map((item) => 清洗导入存档(item))
        .filter((item): item is Omit<存档结构, 'id'> => Boolean(item));
    if (normalizedCandidates.length === 0) {
        throw new Error('导入失败：存档内容无有效条目');
    }

    const db = await 初始化数据库();
    const existingSaves = options?.覆盖现有 ? [] : await 读取存档列表();
    const dedupeKeySet = new Set(existingSaves.map((item) => 构建存档去重键(item)));

    let imported = 0;
    let skipped = 0;

    await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        if (options?.覆盖现有) {
            store.clear();
            dedupeKeySet.clear();
        }

        normalizedCandidates.forEach((item) => {
            const key = 构建存档去重键(item);
            if (dedupeKeySet.has(key)) {
                skipped += 1;
                return;
            }
            dedupeKeySet.add(key);
            store.add(item);
            imported += 1;
        });

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });

    await 维护自动存档(db, 自动存档最大保留数);

    return {
        total: normalizedCandidates.length,
        imported,
        skipped
    };
};

export const 读取存档列表 = async (): Promise<存档结构[]> => {
    const db = await 初始化数据库();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        
        request.onsuccess = () => {
            const list = request.result as 存档结构[];
            // Sort by timestamp desc
            list.sort((a, b) => b.时间戳 - a.时间戳);
            resolve(list);
        };
        request.onerror = () => reject(request.error);
    });
};

export const 读取存档 = async (id: number): Promise<存档结构> => {
    const db = await 初始化数据库();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const 删除存档 = async (id: number): Promise<void> => {
    const db = await 初始化数据库();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const 清空存档数据 = async (): Promise<void> => {
    const db = await 初始化数据库();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const 保存设置 = async (key: string, value: any): Promise<void> => {
    const db = await 初始化数据库();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([SETTINGS_STORE], 'readwrite');
        const store = transaction.objectStore(SETTINGS_STORE);
        const request = store.put({ key, value });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const 读取设置 = async (key: string): Promise<any> => {
    const db = await 初始化数据库();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([SETTINGS_STORE], 'readonly');
        const store = transaction.objectStore(SETTINGS_STORE);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result ? request.result.value : null);
        request.onerror = () => reject(request.error);
    });
};

export const 删除设置 = async (key: string): Promise<void> => {
    const db = await 初始化数据库();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([SETTINGS_STORE], 'readwrite');
        const store = transaction.objectStore(SETTINGS_STORE);
        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const 批量删除设置 = async (keys: string[]): Promise<void> => {
    if (!Array.isArray(keys) || keys.length === 0) return;
    const db = await 初始化数据库();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([SETTINGS_STORE], 'readwrite');
        const store = transaction.objectStore(SETTINGS_STORE);
        keys.forEach((key) => store.delete(key));
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

const 自定义背景天赋保护键 = ['visual_settings', 'new_game_custom_talents', 'new_game_custom_backgrounds'] as const;

const 读取设置保护快照 = async (keys: string[]): Promise<Array<{ key: string; value: any }>> => {
    const snapshots: Array<{ key: string; value: any }> = [];
    for (const key of keys) {
        const value = await 读取设置(key);
        if (value !== null && value !== undefined) {
            snapshots.push({ key, value });
        }
    }
    return snapshots;
};

const 回写设置保护快照 = async (snapshots: Array<{ key: string; value: any }>): Promise<void> => {
    for (const item of snapshots) {
        await 保存设置(item.key, item.value);
    }
};

export const 清空全部设置 = async (options?: { 保留APIKey?: boolean; 保留自定义背景天赋?: boolean }): Promise<void> => {
    const keepKeys = new Set<string>();
    if (options?.保留APIKey) keepKeys.add('api_settings');
    if (options?.保留自定义背景天赋) {
        自定义背景天赋保护键.forEach((key) => keepKeys.add(key));
    }

    const snapshots = await 读取设置保护快照(Array.from(keepKeys));
    const db = await 初始化数据库();
    const transaction = db.transaction([SETTINGS_STORE], 'readwrite');
    transaction.objectStore(SETTINGS_STORE).clear();

    return new Promise((resolve, reject) => {
        transaction.oncomplete = async () => {
            try {
                await 回写设置保护快照(snapshots);
                resolve();
            } catch (error) {
                reject(error);
            }
        };
        transaction.onerror = () => reject(transaction.error);
    });
};

export const 清除自定义背景与天赋 = async (): Promise<void> => {
    const visualSettings = await 读取设置('visual_settings');
    if (visualSettings && typeof visualSettings === 'object') {
        const nextVisual = { ...visualSettings };
        if ('背景图片' in nextVisual) {
            (nextVisual as any).背景图片 = '';
            await 保存设置('visual_settings', nextVisual);
        }
    }
    await 批量删除设置(['new_game_custom_talents', 'new_game_custom_backgrounds']);
};

export const 清除系统缓存 = async (): Promise<void> => {
    const tasks: Promise<unknown>[] = [];

    if (typeof window !== 'undefined' && 'caches' in window) {
        tasks.push((async () => {
            const keys = await window.caches.keys();
            await Promise.allSettled(keys.map((key) => window.caches.delete(key)));
        })());
    }

    if (typeof sessionStorage !== 'undefined') {
        sessionStorage.clear();
    }

    await Promise.allSettled(tasks);
};

export interface StorageBreakdown {
    usage: number;
    quota: number;
    details: {
        saves: number;
        settings: number;
        prompts: number; 
        api: number;
        cache: number; 
    }
}

export const 获取详细存储信息 = async (): Promise<StorageBreakdown> => {
    const db = await 初始化数据库();
    
    // 1. Calculate Saves Size
    const savesTx = db.transaction([STORE_NAME], 'readonly');
    const savesStore = savesTx.objectStore(STORE_NAME);
    const saves = await new Promise<any[]>((resolve) => {
        savesStore.getAll().onsuccess = (e) => resolve((e.target as any).result || []);
    });
    const savesSize = new Blob([JSON.stringify(saves)]).size;

    // 2. Calculate Settings, API, and Prompts Size
    const settingsTx = db.transaction([SETTINGS_STORE], 'readonly');
    const settingsStore = settingsTx.objectStore(SETTINGS_STORE);
    const settings = await new Promise<any[]>((resolve) => {
        settingsStore.getAll().onsuccess = (e) => resolve((e.target as any).result || []);
    });
    
    let apiSize = 0;
    let promptsSize = 0;
    let otherSettingsSize = 0;

    settings.forEach(s => {
        const size = new Blob([JSON.stringify(s)]).size;
        if (s.key === 'api_settings') {
            apiSize += size;
        } else if (s.key === 'prompts') {
            promptsSize += size;
        } else {
            otherSettingsSize += size;
        }
    });

    // 3. Get Total Usage
    let usage = 0;
    let quota = 0;
    if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        usage = estimate.usage || 0;
        quota = estimate.quota || 0;
    }

    // 4. Calculate overhead/cache
    const knownUsage = savesSize + apiSize + promptsSize + otherSettingsSize;
    const systemCache = Math.max(0, usage - knownUsage);

    return {
        usage,
        quota,
        details: {
            saves: savesSize,
            settings: otherSettingsSize,
            prompts: promptsSize,
            api: apiSize,
            cache: systemCache
        }
    };
};

export const 清空全部数据 = async (options?: { 保留APIKey?: boolean; 保留自定义背景天赋?: boolean }): Promise<void> => {
    const db = await 初始化数据库();
    const keepKeys = new Set<string>();
    if (options?.保留APIKey) keepKeys.add('api_settings');
    if (options?.保留自定义背景天赋) {
        自定义背景天赋保护键.forEach((key) => keepKeys.add(key));
    }
    const snapshots = await 读取设置保护快照(Array.from(keepKeys));

    const transaction = db.transaction([STORE_NAME, SETTINGS_STORE], 'readwrite');
    transaction.objectStore(STORE_NAME).clear();
    transaction.objectStore(SETTINGS_STORE).clear();

    return new Promise((resolve, reject) => {
        transaction.oncomplete = async () => {
            try {
                await 回写设置保护快照(snapshots);
                resolve();
            } catch (error) {
                reject(error);
            }
        };
        transaction.onerror = () => reject(transaction.error);
    });
};

export const 清空数据库 = async (保留APIKey: boolean): Promise<void> => {
    await 清空全部数据({ 保留APIKey });
};
