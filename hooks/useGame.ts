
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
    详细门派结构,
    剧情系统结构
} from '../types';
import { useEffect, useRef, useState } from 'react';
import * as dbService from '../services/dbService';
import * as aiService from '../services/aiService';
import { applyStateCommand } from '../utils/stateHelpers';
import { parseJsonWithRepair } from '../utils/jsonRepair';
import { estimateTextTokens } from '../utils/tokenEstimate';
import { useGameState } from './useGameState';
import { 规范化接口设置, 获取主剧情接口配置, 获取剧情回忆接口配置, 接口配置是否可用 } from '../utils/apiConfig';
import type { 当前可用接口结构 } from '../utils/apiConfig';
import {
    规范化记忆系统,
    规范化记忆配置,
    构建即时记忆条目,
    构建短期记忆条目,
    写入四段记忆
} from './useGame/memoryUtils';
import {
    提取剧情回忆标签,
    构建剧情回忆检索上下文
} from './useGame/memoryRecall';
import { 执行剧情回忆检索 } from './useGame/recallWorkflow';
import { formatHistoryToScript } from './useGame/historyUtils';
import { normalizeCanonicalGameTime, 提取时间月日 } from './useGame/timeUtils';
import { 构建NPC上下文 } from './useGame/npcContext';
import { 构建世界观种子提示词, 构建世界生成任务上下文提示词 } from '../prompts/runtime/worldSetup';
import { 开场初始化任务提示词 } from '../prompts/runtime/opening';
import { 剧情回忆检索COT提示词, 剧情回忆检索输出格式提示词 } from '../prompts/runtime/recall';
import { 默认COT伪装历史消息提示词, 默认额外系统提示词 } from '../prompts/runtime/defaults';
import {
    规范化环境信息,
    构建完整地点文本,
    规范化角色物品容器映射,
    规范化社交列表
} from './useGame/stateTransforms';

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
    tokenEstimate: number;
};

type 上下文快照 = {
    sections: 上下文段[];
    fullText: string;
    totalTokens: number;
};

type 发送结果 = {
    cancelled?: boolean;
    attachedRecallPreview?: string;
    preparedRecallTag?: string;
    needRecallConfirm?: boolean;
};

type 回忆检索进度 = {
    phase: 'start' | 'stream' | 'done' | 'error';
    text?: string;
};

type 发送选项 = {
    onRecallProgress?: (progress: 回忆检索进度) => void;
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
        showMap, setShowMap,
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
        设置世界(规范化世界状态(深拷贝(snapshot.回档前状态.世界)));
        设置战斗(深拷贝(snapshot.回档前状态.战斗));
        设置玩家门派(深拷贝(snapshot.回档前状态.玩家门派));
        设置任务列表(深拷贝(snapshot.回档前状态.任务列表));
        设置约定列表(深拷贝(snapshot.回档前状态.约定列表));
        设置剧情(规范化剧情状态(
            深拷贝(snapshot.回档前状态.剧情),
            深拷贝(snapshot.回档前状态.环境)
        ));
        设置记忆系统(深拷贝(snapshot.回档前状态.记忆系统));
        设置历史记录(深拷贝(snapshot.回档前历史));
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
        启用COT伪装注入: raw?.启用COT伪装注入 === false
            ? false
            : (typeof gameConfig?.启用COT伪装注入 === 'boolean' ? gameConfig.启用COT伪装注入 : true),
        额外提示词: typeof raw?.额外提示词 === 'string'
            ? raw.额外提示词
            : (typeof gameConfig?.额外提示词 === 'string' ? gameConfig.额外提示词 : 默认额外系统提示词)
    });

    const handleStartNewGameWizard = () => {
        清空重Roll快照();
        setView('new_game');
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
        天气: { 天气: '', 结束日期: '' },
        环境变量: null,
        游戏天数: 1
    });

    const 创建开场空白世界 = () => ({
        活跃NPC列表: [],
        地图: [],
        建筑: [],
        进行中事件: [],
        已结算事件: [],
        江湖史册: []
    });

    const 规范化世界状态 = (raw?: any): 世界数据结构 => {
        const world = raw && typeof raw === 'object' ? raw : {};
        return {
            活跃NPC列表: Array.isArray(world?.活跃NPC列表) ? world.活跃NPC列表 : [],
            地图: Array.isArray(world?.地图) ? world.地图 : [],
            建筑: Array.isArray(world?.建筑) ? world.建筑 : [],
            进行中事件: Array.isArray(world?.进行中事件) ? world.进行中事件 : [],
            已结算事件: Array.isArray(world?.已结算事件) ? world.已结算事件 : [],
            江湖史册: Array.isArray(world?.江湖史册) ? world.江湖史册 : []
        };
    };

    const 创建开场空白战斗 = (): 战斗状态结构 => ({
        是否战斗中: false,
        敌方: null
    });

    const 规范化战斗状态 = (raw?: any): 战斗状态结构 => {
        const base = raw ? JSON.parse(JSON.stringify(raw)) : 创建开场空白战斗();
        if (typeof base?.是否战斗中 !== 'boolean') base.是否战斗中 = false;
        if (!('敌方' in base)) base.敌方 = null;
        return base as 战斗状态结构;
    };

    const 解析剧情时间排序值 = (raw?: any): number | null => {
        if (typeof raw !== 'string') return null;
        const normalized = normalizeCanonicalGameTime(raw.trim());
        if (!normalized) return null;
        const m = normalized.match(/^(\d{1,6}):(\d{2}):(\d{2}):(\d{2}):(\d{2})$/);
        if (!m) return null;
        const year = Number(m[1]);
        const month = Number(m[2]);
        const day = Number(m[3]);
        const hour = Number(m[4]);
        const minute = Number(m[5]);
        return (((year * 12 + month) * 31 + day) * 24 + hour) * 60 + minute;
    };

    const 规范化剧情状态 = (raw?: any, envLike?: any): 剧情系统结构 => {
        const story = raw && typeof raw === 'object' ? raw : {};
        const chapter = story?.当前章节 && typeof story.当前章节 === 'object' ? story.当前章节 : {};
        const preview = story?.下一章预告 && typeof story.下一章预告 === 'object' ? story.下一章预告 : {};
        const archives = Array.isArray(story?.历史卷宗) ? story.历史卷宗 : [];
        const storyVarsRaw = (story?.剧情变量 && typeof story.剧情变量 === 'object' && !Array.isArray(story.剧情变量))
            ? story.剧情变量
            : {};

        const 纯文本 = (value: any): string => (typeof value === 'string' ? value : '');
        const 当前时间排序值 = 解析剧情时间排序值(envLike?.时间);
        const 待触发事件原始列表 = Array.isArray(story?.待触发事件) ? story.待触发事件 : [];
        const 待触发事件 = 待触发事件原始列表
            .map((event: any) => {
                const 触发条件或时间 = 纯文本(event?.['触发条件/时间']) || 纯文本(event?.触发条件或时间);
                const 失效时间原始 = 纯文本(event?.失效时间);
                const 失效时间标准化 = 失效时间原始 ? (normalizeCanonicalGameTime(失效时间原始) || 失效时间原始) : '';
                return {
                    名称: 纯文本(event?.名称),
                    描述: 纯文本(event?.描述),
                    '触发条件/时间': 触发条件或时间,
                    失效时间: 失效时间标准化
                };
            })
            .filter((event) => event.名称 || event.描述 || event['触发条件/时间'] || event.失效时间)
            .filter((event) => {
                if (当前时间排序值 === null) return true;
                const 失效排序值 = 解析剧情时间排序值(event.失效时间);
                if (失效排序值 === null) return true;
                return 失效排序值 > 当前时间排序值;
            })
            .slice(0, 3);

        return {
            当前章节: {
                ID: 纯文本(chapter?.ID),
                序号: typeof chapter?.序号 === 'number' && Number.isFinite(chapter.序号)
                    ? chapter.序号
                    : 1,
                标题: 纯文本(chapter?.标题),
                背景故事: 纯文本(chapter?.背景故事),
                主要矛盾: 纯文本(chapter?.主要矛盾),
                结束条件: Array.isArray(chapter?.结束条件)
                    ? chapter.结束条件.map((cond: any) => ({
                        类型: cond?.类型 === '时间' || cond?.类型 === '事件' || cond?.类型 === '变量' ? cond.类型 : '事件',
                        描述: 纯文本(cond?.描述),
                        ...(typeof cond?.判定值 === 'string' || typeof cond?.判定值 === 'number' || typeof cond?.判定值 === 'boolean'
                            ? { 判定值: cond.判定值 }
                            : {}),
                        ...(纯文本(cond?.对应变量键名) ? { 对应变量键名: 纯文本(cond?.对应变量键名) } : {})
                    }))
                    : [],
                伏笔列表: Array.isArray(chapter?.伏笔列表)
                    ? chapter.伏笔列表
                        .map((item: any) => 纯文本(item))
                        .filter((item: string) => item.length > 0)
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
            近期剧情规划: 纯文本(story?.近期剧情规划),
            中期剧情规划: 纯文本(story?.中期剧情规划),
            长期剧情规划: 纯文本(story?.长期剧情规划),
            待触发事件,
            剧情变量: Object.fromEntries(
                Object.entries(storyVarsRaw).filter(([, value]) => (
                    typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string'
                ))
            ) as Record<string, boolean | number | string>
        };
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
        近期剧情规划: '',
        中期剧情规划: '',
        长期剧情规划: '',
        待触发事件: [],
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
            剧情: 创建开场空白剧情()
        };
    };

    const 构建系统提示词 = (
        promptPool: 提示词结构[],
        memoryData: 记忆系统结构,
        socialData: any[],
        statePayload: any,
        options?: {
            禁用中期长期记忆?: boolean;
            禁用短期记忆?: boolean;
        }
    ): {
        systemPrompt: string;
        shortMemoryContext: string;
        contextPieces: {
            worldPrompt: string;
            地图建筑状态: string;
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
            const 当前天气 = env?.天气?.天气?.trim() || '未知天气';
            const 天气结束日期 = env?.天气?.结束日期?.trim() || '未知';
            const 环境变量名称 = env?.环境变量?.名称?.trim() || '无';
            const 环境变量描述 = env?.环境变量?.描述?.trim() || '无';
            const 环境变量效果 = env?.环境变量?.效果?.trim() || '无';
            return [
                '【当前环境】',
                `当前日期: ${当前日期}`,
                `当前地点: ${fullLocation}`,
                `天气: ${当前天气}`,
                `天气结束日期: ${天气结束日期}`,
                `环境变量: ${环境变量名称}`,
                `环境描述: ${环境变量描述}`,
                `环境效果: ${环境变量效果}`,
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
        const 归一化文本 = (value: any) => (
            typeof value === 'string'
                ? value.trim().replace(/\s+/g, '').toLowerCase()
                : ''
        );
        const 构建地图建筑状态文本 = (payload: any) => {
            const source = payload || {};
            const env = 规范化环境信息(source?.环境);
            const world = 规范化世界状态(source?.世界);

            const 当前具体地点 = typeof env?.具体地点 === 'string' ? env.具体地点.trim() : '';
            const 地图列表 = Array.isArray(world.地图) ? world.地图 : [];
            const 建筑列表 = Array.isArray(world.建筑) ? world.建筑 : [];

            const 地图文本 = 地图列表.length > 0
                ? 地图列表.map((mapItem: any) => {
                    const name = typeof mapItem?.名称 === 'string' ? mapItem.名称.trim() : '未命名地图';
                    const coord = typeof mapItem?.坐标 === 'string' ? mapItem.坐标.trim() : '未知坐标';
                    const desc = typeof mapItem?.描述 === 'string' ? mapItem.描述.trim() : '无描述';
                    const ownership = mapItem?.归属 && typeof mapItem.归属 === 'object'
                        ? [
                            mapItem.归属?.大地点 || '未知大地点',
                            mapItem.归属?.中地点 || '未知中地点',
                            mapItem.归属?.小地点 || '未知小地点'
                        ].join(' > ')
                        : '未知归属';
                    const interiors = Array.isArray(mapItem?.内部建筑)
                        ? mapItem.内部建筑.filter((n: any) => typeof n === 'string' && n.trim().length > 0).join('、')
                        : '';
                    return `- 名称: ${name} | 坐标: ${coord} | 归属: ${ownership}\n  描述: ${desc}\n  内部建筑: ${interiors || '无'}`;
                }).join('\n')
                : '- 暂无地图数据';

            const 当前地点归一 = 归一化文本(当前具体地点);
            const 命中建筑 = 建筑列表.filter((building: any) => {
                const 名称归一 = 归一化文本(building?.名称);
                if (!当前地点归一 || !名称归一) return false;
                return 当前地点归一 === 名称归一
                    || 当前地点归一.startsWith(名称归一)
                    || 当前地点归一.includes(名称归一);
            });

            const 建筑文本 = 命中建筑.length > 0
                ? 命中建筑.map((building: any) => {
                    const name = typeof building?.名称 === 'string' ? building.名称.trim() : '未命名建筑';
                    const desc = typeof building?.描述 === 'string' ? building.描述.trim() : '无描述';
                    const ownership = building?.归属 && typeof building.归属 === 'object'
                        ? [
                            building.归属?.大地点 || '未知大地点',
                            building.归属?.中地点 || '未知中地点',
                            building.归属?.小地点 || '未知小地点'
                        ].join(' > ')
                        : '未知归属';
                    return `- 名称: ${name} | 归属: ${ownership}\n  描述: ${desc}`;
                }).join('\n')
                : `- 当前具体地点「${当前具体地点 || '未知'}」未命中建筑变量数据（仅注入地图摘要）`;

            return [
                '【地图与建筑】',
                `当前具体地点: ${当前具体地点 || '未知'}`,
                '地图列表:',
                地图文本,
                '',
                '当前地点建筑数据（仅在具体地点命中对应建筑时注入）:',
                建筑文本
            ].join('\n');
        };
        const 构建剧情安排 = (payload: any) => {
            const normalizedStory = 规范化剧情状态(payload?.剧情, payload?.环境);

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

        const npcContext = 构建NPC上下文(socialData || [], memoryConfig);
        const contextMapAndBuilding = 构建地图建筑状态文本(statePayload);
        const promptHeader = [
            worldPrompt.trim(),
            contextMapAndBuilding,
            npcContext.离场数据块,
            otherPrompts.trim()
        ].filter(Boolean).join('\n\n');

        const longMemory = options?.禁用中期长期记忆
            ? '【长期记忆】\n（剧情回忆检索已接管，本段暂不注入）'
            : `【长期记忆】\n${memoryData.长期记忆.join('\n') || '暂无'}`;
        const midMemory = options?.禁用中期长期记忆
            ? '【中期记忆】\n（剧情回忆检索已接管，本段暂不注入）'
            : `【中期记忆】\n${memoryData.中期记忆.join('\n') || '暂无'}`;
        const contextMemory = options?.禁用中期长期记忆 ? '' : `${longMemory}\n${midMemory}`;
        const contextNPCData = npcContext.在场数据块;
        const contextSettings = [
            '【游戏设置】',
            `字数要求: ${normalizedGameConfig.字数要求}字`,
            `叙事人称: ${normalizedGameConfig.叙事人称}`,
            `行动选项功能: ${normalizedGameConfig.启用行动选项 ? '开启' : '关闭'}`,
            `COT伪装注入: ${normalizedGameConfig.启用COT伪装注入 ? '开启' : '关闭'}`,
            '',
            '【对应叙事人称提示词】',
            activePerspectiveContent || '未配置',
            '',
            '【对应字数要求提示词】',
            writeReqContent || '未配置'
        ].join('\n');
        const contextStoryPlan = 构建剧情安排(statePayload);
        const worldData = 规范化世界状态(statePayload?.世界);
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
        const shortMemoryEntries = options?.禁用短期记忆
            ? []
            : memoryData.短期记忆
                .slice(-30)
                .map(item => item.trim())
                .filter(Boolean);
        const shortMemoryContext = options?.禁用短期记忆
            ? ''
            : shortMemoryEntries.length > 0
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
                地图建筑状态: contextMapAndBuilding,
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
            const worldPromptSeed = 构建世界观种子提示词(worldConfig, charData);

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

            const worldGenerationContext = 构建世界生成任务上下文提示词(
                worldPromptSeed,
                difficulty,
                enabledDifficultyPrompts
            );

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
            设置剧情(规范化剧情状态(openingBase.剧情, openingBase.环境));

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
                await generateOpeningStory(openingBase, finalPrompts, openingStreaming, currentApi);
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
        useStreaming: boolean,
        apiForOpening: 当前可用接口结构
    ) => {
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
            const openingStatePayload = {
                角色: contextData.角色 || 角色,
                环境: openingEnv,
                世界: contextData.世界 || 世界,
                战斗: contextData.战斗 || 战斗,
                玩家门派: contextData.玩家门派 || 玩家门派,
                任务列表: contextData.任务列表 || 任务列表,
                约定列表: contextData.约定列表 || 约定列表,
                剧情: 规范化剧情状态(contextData.剧情 || 剧情, openingEnv)
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
                开场初始化任务提示词,
                apiForOpening,
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
                gameConfig.额外提示词,
                {
                    enableCotInjection: gameConfig.启用COT伪装注入 !== false
                }
            );
            if (openingStreamHeartbeat) clearInterval(openingStreamHeartbeat);

            // Apply commands (use generated opening state as base to avoid stale state race)
            const openingStateAfterCommands = processResponseCommands(aiData, {
                角色: contextData.角色 || 角色,
                环境: contextData.环境 || 环境,
                社交: contextData.社交 || 社交,
                世界: contextData.世界 || 世界,
                战斗: contextData.战斗 || 战斗,
                剧情: 规范化剧情状态(contextData.剧情 || 剧情, contextData.环境 || 环境)
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
                throw e;
            }
            console.error("Story Gen Failed", e);
            throw e;
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
        let worldBuffer = 规范化世界状态(baseState?.世界 || 世界);
        let battleBuffer = 规范化战斗状态(baseState?.战斗 || 战斗);
        let storyBuffer = 规范化剧情状态(baseState?.剧情 || 剧情, envBuffer);

        if (Array.isArray(response.tavern_commands)) {
            response.tavern_commands.forEach(cmd => {
                const res = applyStateCommand(charBuffer, envBuffer, socialBuffer, worldBuffer, battleBuffer, storyBuffer, cmd.key, cmd.value, cmd.action);
                charBuffer = res.char;
                envBuffer = 规范化环境信息(res.env);
                socialBuffer = 规范化社交列表(res.social, { 合并同名: false });
                worldBuffer = 规范化世界状态(res.world);
                battleBuffer = res.battle;
                storyBuffer = res.story;
            });

            battleBuffer = 战斗结束自动清空(battleBuffer, storyBuffer);
            charBuffer = 规范化角色物品容器映射(charBuffer);
            const mergedSocial = 规范化社交列表(socialBuffer);
            const normalizedStory = 规范化剧情状态(storyBuffer, envBuffer);

            设置角色(charBuffer);
            设置环境(规范化环境信息(envBuffer));
            设置社交(mergedSocial);
            设置世界(规范化世界状态(worldBuffer));
            设置战斗(battleBuffer);
            设置剧情(normalizedStory);
            socialBuffer = mergedSocial;
            storyBuffer = normalizedStory;
        }

        return {
            角色: charBuffer,
            环境: 规范化环境信息(envBuffer),
            社交: 规范化社交列表(socialBuffer),
            世界: 规范化世界状态(worldBuffer),
            战斗: battleBuffer,
            剧情: 规范化剧情状态(storyBuffer, envBuffer)
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

    const buildContextSnapshot = (): 上下文快照 => {
        const normalizedMem = 规范化记忆系统(记忆系统);
        const recallConfig = apiConfig?.功能模型占位 || ({} as any);
        const recallFeatureEnabled = Boolean(recallConfig.剧情回忆独立模型开关);
        const recallMinRound = Math.max(1, Number(recallConfig.剧情回忆最早触发回合) || 10);
        const nextRound = (Array.isArray(normalizedMem.回忆档案) ? normalizedMem.回忆档案.length : 0) + 1;
        const recallRoundReady = nextRound >= recallMinRound;
        const recallApi = 获取剧情回忆接口配置(apiConfig);
        const recallApiUsable = recallFeatureEnabled && 接口配置是否可用(recallApi);
        const recallContextMode = recallFeatureEnabled && recallRoundReady && recallApiUsable;
        const builtContext = 构建系统提示词(
            prompts,
            normalizedMem,
            社交,
            {
                角色,
                环境: 规范化环境信息(环境),
                世界,
                战斗,
                玩家门派,
                任务列表,
                约定列表,
                剧情: 规范化剧情状态(剧情, 环境)
            },
            recallContextMode
                ? { 禁用中期长期记忆: true, 禁用短期记忆: true }
                : undefined
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
        const cotEnabled = gameConfig?.启用COT伪装注入 !== false;
        const cotPseudoPrompt = cotEnabled ? 默认COT伪装历史消息提示词.trim() : '';
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
                content: trimmed,
                tokenEstimate: estimateTextTokens(trimmed)
            });
        };

        pushSection('world_prompt', '世界观提示词', '系统', builtContext.contextPieces.worldPrompt);
        pushSection('world_map', '地图与建筑', '系统', builtContext.contextPieces.地图建筑状态);
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
        if (recallFeatureEnabled) {
            const fullN = Math.max(1, Number(apiConfig?.功能模型占位?.剧情回忆完整原文条数N) || 20);
            const recallMemoryCorpus = 构建剧情回忆检索上下文(normalizedMem, fullN);
            const recallSystemPrompt = `${剧情回忆检索COT提示词}\n\n${剧情回忆检索输出格式提示词}`;
            pushSection('recall_system', '剧情回忆系统提示词', '回忆API', recallSystemPrompt);
            pushSection('recall_corpus', '剧情回忆检索回忆库', '回忆API', recallMemoryCorpus);
        }
        pushSection('script', '即时剧情回顾 (Script)', '历史', `【即时剧情回顾 (Script)】\n${historyScript}`);
        pushSection('cot_fake_history', 'COT伪装历史消息', '系统', cotPseudoPrompt ? `【COT伪装历史消息】\n${cotPseudoPrompt}` : '');
        pushSection('player_input', '玩家输入 (最近)', '用户', `<玩家输入>${latestUserInput}</玩家输入>`);
        pushSection('extra_prompt', '额外要求提示词', '系统', `【额外要求提示词】\n${extraPrompt}`);

        const fullText = sections.map(section => section.content).join('\n\n');
        return {
            sections,
            fullText,
            totalTokens: sections.reduce((sum, section) => sum + section.tokenEstimate, 0)
        };
    };

    // --- Core Send Logic ---
    const handleSend = async (
        content: string,
        isStreaming: boolean = true,
        options?: 发送选项
    ): Promise<发送结果> => {
        if (!content.trim() || loading) return {};
        const activeApi = 获取主剧情接口配置(apiConfig);
        if (!接口配置是否可用(activeApi)) {
            alert("请先在设置中填写 API 地址/API Key，并选择主剧情使用模型");
            setShowSettings(true);
            return { cancelled: true };
        }

        // 1. Parse input and optional hidden recall tag
        const recallConfig = apiConfig?.功能模型占位 || ({} as any);
        const recallFeatureEnabled = Boolean(recallConfig.剧情回忆独立模型开关);
        const recallMinRound = Math.max(1, Number(recallConfig.剧情回忆最早触发回合) || 10);
        const normalizedMemBeforeSend = 规范化记忆系统(记忆系统);
        const nextRound = (Array.isArray(normalizedMemBeforeSend.回忆档案) ? normalizedMemBeforeSend.回忆档案.length : 0) + 1;
        const recallRoundReady = nextRound >= recallMinRound;
        const extracted = 提取剧情回忆标签(content);
        let sendInput = extracted.cleanInput || content.trim();
        let recallTag = extracted.recallTag;
        let attachedRecallPreview = '';

        if (recallFeatureEnabled && recallRoundReady && !recallTag) {
            try {
                options?.onRecallProgress?.({ phase: 'start', text: '正在检索剧情回忆...' });
                const recalled = await 执行剧情回忆检索(
                    sendInput,
                    normalizedMemBeforeSend,
                    apiConfig,
                    {
                        onDelta: (_delta, accumulated) => {
                            options?.onRecallProgress?.({ phase: 'stream', text: accumulated });
                        }
                    }
                );
                if (!recalled) {
                    alert('已开启剧情回忆模型，但未配置可用的剧情回忆模型/API。');
                    setShowSettings(true);
                    return { cancelled: true };
                }
                attachedRecallPreview = recalled.previewText;
                options?.onRecallProgress?.({ phase: 'done', text: recalled.previewText });
                const silentConfirm = Boolean(apiConfig?.功能模型占位?.剧情回忆静默确认);
                if (!silentConfirm) {
                    return {
                        cancelled: true,
                        attachedRecallPreview: recalled.previewText,
                        preparedRecallTag: recalled.tagContent,
                        needRecallConfirm: true
                    };
                }
                recallTag = recalled.tagContent;
            } catch (e: any) {
                console.error('剧情回忆检索失败', e);
                options?.onRecallProgress?.({ phase: 'error', text: e?.message || '剧情回忆检索失败' });
                alert(`剧情回忆检索失败：${e?.message || '未知错误'}`);
                return { cancelled: true };
            }
        }

        if (!sendInput.trim()) {
            return { cancelled: true };
        }

        // 2. Calculate Game Time String
        const canonicalTime = normalizeCanonicalGameTime(环境.时间);
        const currentGameTime = canonicalTime || 环境.时间 || `第${环境.游戏天数 || 1}日`;
        const historyBeforeSend = [...历史记录];
        const memBeforeSend = normalizedMemBeforeSend;
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

        // 3. Trim history window for AI context only (UI history must remain complete)
        let contextHistory = [...historyBeforeSend];
        if (contextHistory.length >= 20) {
            contextHistory = contextHistory.slice(-18);
        }
        const updatedMemSys = 规范化记忆系统(memBeforeSend);

        // 4. Prepare New Message
        const newUserMsg: 聊天记录结构 = { 
            role: 'user', 
            content: sendInput, 
            timestamp: Date.now(),
            gameTime: currentGameTime 
        };
        const updatedContextHistory = [...contextHistory, newUserMsg];
        const updatedDisplayHistory = [...historyBeforeSend, newUserMsg];
        设置历史记录(updatedDisplayHistory);
        setLoading(true);

        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            // 5. Construct System Prompt
            const recallContextActiveForMain = recallFeatureEnabled && Boolean(recallTag);
            const builtContext = 构建系统提示词(
                prompts,
                updatedMemSys,
                社交,
                {
                    角色,
                    环境: 规范化环境信息(环境),
                    世界,
                    战斗,
                    玩家门派,
                    任务列表,
                    约定列表,
                    剧情: 规范化剧情状态(剧情, 环境)
                },
                recallContextActiveForMain
                    ? { 禁用中期长期记忆: true, 禁用短期记忆: true }
                    : undefined
            );
            const contextImmediate = [
                builtContext.shortMemoryContext,
                `【即时剧情回顾 (Script)】\n${formatHistoryToScript(updatedContextHistory) || '暂无'}`,
                recallTag ? `【剧情回忆】\n${recallTag}` : ''
            ].filter(Boolean).join('\n\n');

            let streamMarker = 0;
            if (isStreaming) {
                streamMarker = Date.now();
                设置历史记录([
                    ...updatedDisplayHistory,
                    {
                        role: 'assistant',
                        content: '',
                        timestamp: streamMarker,
                        gameTime: currentGameTime
                    }
                ]);
            }

            // 6. Call AI Service
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
                gameConfig.额外提示词,
                {
                    enableCotInjection: gameConfig.启用COT伪装注入 !== false
                }
            );

            // 7. Process Result
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
                设置历史记录([...updatedDisplayHistory, newAiMsg]);
            }
            
            // 8. Auto Save Trigger
            performAutoSave();
            return { attachedRecallPreview };

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
                return { cancelled: true };
            } else {
                弹出重Roll快照();
                const errorMsg: 聊天记录结构 = { role: 'system', content: `[系统错误]: ${error.message}`, timestamp: Date.now() };
                设置历史记录([...updatedDisplayHistory, errorMsg]);
                return { cancelled: true };
            }
        } finally {
            setLoading(false);
            abortControllerRef.current = null;
        }
        return {};
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
            剧情: 规范化剧情状态(剧情, 环境),
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
        设置世界(规范化世界状态(save.世界 || 创建开场空白世界()));
        设置战斗(规范化战斗状态(save.战斗 || 创建开场空白战斗()));
        设置玩家门派(save.玩家门派 || 创建空门派状态());
        设置任务列表(save.任务列表 || []);
        设置约定列表(save.约定列表 || []);
        设置剧情(规范化剧情状态(
            save.剧情 || 创建开场空白剧情(),
            save.环境信息 || 创建开场空白环境()
        ));
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
            setShowSettings, setShowInventory, setShowEquipment, setShowSocial, setShowTeam, setShowKungfu, setShowWorld, setShowMap, setShowSect, setShowTask, setShowAgreement, setShowStory, setShowMemory, setShowSaveLoad,
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

