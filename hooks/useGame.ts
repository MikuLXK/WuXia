
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
    剧情系统结构,
    女主剧情规划结构
} from '../types';
import { useEffect, useRef, useState } from 'react';
import * as dbService from '../services/dbService';
import * as aiService from '../services/aiService';
import { applyStateCommand } from '../utils/stateHelpers';
import { formatJsonWithRepair, parseJsonWithRepair } from '../utils/jsonRepair';
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
import { 获取剧情风格提示词 } from '../prompts/runtime/storyStyles';
import { 核心_思维链_多重思考 } from '../prompts/core/cotMulti';
import { 核心_输出格式_多重思考 } from '../prompts/core/formatMulti';
import { 核心_女主剧情规划 } from '../prompts/core/heroinePlan';
import { 核心_女主剧情规划_思考 } from '../prompts/core/heroinePlanCot';
import { 写作_防止说话 } from '../prompts/writing/noControl';
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
        女主剧情规划?: 女主剧情规划结构;
        记忆系统: 记忆系统结构;
    };
    回档前历史: 聊天记录结构[];
};

type 最近开局配置结构 = {
    worldConfig: WorldGenConfig;
    charData: 角色数据结构;
    openingStreaming: boolean;
};

type 快速重开模式 = 'world_only' | 'opening_only' | 'all';

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
    needRerollConfirm?: boolean;
    parseErrorMessage?: string;
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
        女主剧情规划, 设置女主剧情规划,
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
        showHeroinePlan, setShowHeroinePlan,
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
    const 最近自动存档时间戳Ref = useRef<number>(0);
    const 最近自动存档签名Ref = useRef<string>('');
    const [可重Roll计数, set可重Roll计数] = useState(0);
    const [最近开局配置, 设置最近开局配置] = useState<最近开局配置结构 | null>(null);

    // --- Actions ---
    const 深拷贝 = <T,>(data: T): T => JSON.parse(JSON.stringify(data)) as T;
    const 重置自动存档状态 = () => {
        最近自动存档时间戳Ref.current = 0;
        最近自动存档签名Ref.current = '';
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
        设置世界(规范化世界状态(深拷贝(snapshot.回档前状态.世界)));
        设置战斗(深拷贝(snapshot.回档前状态.战斗));
        设置玩家门派(深拷贝(snapshot.回档前状态.玩家门派));
        设置任务列表(深拷贝(snapshot.回档前状态.任务列表));
        设置约定列表(深拷贝(snapshot.回档前状态.约定列表));
        设置剧情(规范化剧情状态(
            深拷贝(snapshot.回档前状态.剧情),
            深拷贝(snapshot.回档前状态.环境)
        ));
        设置女主剧情规划(规范化女主剧情规划状态(深拷贝(snapshot.回档前状态.女主剧情规划)));
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
        启用多重思考: raw?.启用多重思考 === true
            ? true
            : (typeof gameConfig?.启用多重思考 === 'boolean' ? gameConfig.启用多重思考 : false),
        启用女主剧情规划: raw?.启用女主剧情规划 === true
            ? true
            : (typeof gameConfig?.启用女主剧情规划 === 'boolean' ? gameConfig.启用女主剧情规划 : false),
        启用防止说话: raw?.启用防止说话 === false
            ? false
            : (typeof gameConfig?.启用防止说话 === 'boolean' ? gameConfig.启用防止说话 : true),
        剧情风格: raw?.剧情风格 === '后宫' || raw?.剧情风格 === '修炼' || raw?.剧情风格 === '一般' || raw?.剧情风格 === '修罗场' || raw?.剧情风格 === '纯爱' || raw?.剧情风格 === 'NTL后宫'
            ? raw.剧情风格
            : (gameConfig?.剧情风格 || '一般'),
        NTL后宫档位: raw?.NTL后宫档位 === '禁止乱伦' || raw?.NTL后宫档位 === '假乱伦' || raw?.NTL后宫档位 === '无限制'
            ? raw.NTL后宫档位
            : (gameConfig?.NTL后宫档位 || '禁止乱伦'),
        额外提示词: typeof raw?.额外提示词 === 'string'
            ? raw.额外提示词
            : (typeof gameConfig?.额外提示词 === 'string' ? gameConfig.额外提示词 : 默认额外系统提示词)
    });
    const 构建COT伪装提示词 = (config: 游戏设置结构): string => {
        if (config?.启用多重思考 === true) {
            return `<think>
本轮思考结束
</think>

好的，已确认多重思考模式。
后续将使用独立字段输出思考：
t_input / t_plan / t_state / t_branch / t_precheck / t_logcheck / t_var / t_npc / t_cmd / t_audit / t_fix / t_mem / t_opts。`;
        }
        return 默认COT伪装历史消息提示词.trim();
    };
    const 构建字数要求提示词 = (minLength: number): string => {
        const safeValue = Number.isFinite(minLength) ? Math.max(50, Math.floor(minLength)) : 450;
        return `<字数>本次"logs"内的正文**必须${safeValue}字**以上</字数>`;
    };
    const 构建剧情风格助手消息 = (config: 游戏设置结构): string => {
        const stylePrompt = 获取剧情风格提示词(config.剧情风格, config?.NTL后宫档位);
        return `【剧情风格偏好】\n${stylePrompt}`;
    };
    const 格式化原始AI消息 = (rawText: string, fallbackStructured: GameResponse): string => {
        const trimmed = typeof rawText === 'string' ? rawText.trim() : '';
        if (!trimmed) return JSON.stringify(fallbackStructured, null, 2);
        return formatJsonWithRepair(trimmed, trimmed);
    };

    const handleStartNewGameWizard = () => {
        清空重Roll快照();
        重置自动存档状态();
        设置最近开局配置(null);
        setLoading(false);
        设置环境(创建开场空白环境());
        设置社交([]);
        设置世界(创建开场空白世界());
        设置战斗(创建开场空白战斗());
        设置玩家门派(创建空门派状态());
        设置任务列表([]);
        设置约定列表([]);
        设置剧情(创建开场空白剧情());
        设置女主剧情规划(undefined);
        设置记忆系统({ 回忆档案: [], 即时记忆: [], 短期记忆: [], 中期记忆: [], 长期记忆: [] });
        设置历史记录([]);
        setWorldEvents([]);
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

    const 规范化女主剧情规划状态 = (raw?: any): 女主剧情规划结构 | undefined => {
        const planRaw = raw && typeof raw === 'object' ? raw : null;
        if (!planRaw) return undefined;

        const 纯文本 = (value: any): string => (typeof value === 'string' ? value.trim() : '');
        const inSet = <T extends string>(value: string, allowed: readonly T[], fallback: T): T => (
            (allowed as readonly string[]).includes(value) ? value as T : fallback
        );
        const 取整数 = (value: any, fallback: number, min: number = 0, max: number = 999): number => {
            const n = Number(value);
            if (!Number.isFinite(n)) return fallback;
            return Math.max(min, Math.min(max, Math.floor(n)));
        };

        const 女主条目 = Array.isArray(planRaw?.女主条目)
            ? planRaw.女主条目
                .map((item: any) => {
                    if (!item || typeof item !== 'object') return null;
                    const 最近推进时间Raw = 纯文本(item?.最近推进时间);
                    const 最近推进时间 = 最近推进时间Raw
                        ? (normalizeCanonicalGameTime(最近推进时间Raw) || 最近推进时间Raw)
                        : '';
                    return {
                        女主ID: 纯文本(item?.女主ID),
                        女主名: 纯文本(item?.女主名),
                        重要度: inSet(纯文本(item?.重要度), ['核心', '主要', '支线'] as const, '主要'),
                        登场状态: inSet(纯文本(item?.登场状态), ['未登场', '可触发', '已登场'] as const, '未登场'),
                        首登触发条件: 纯文本(item?.首登触发条件),
                        首登场景建议: 纯文本(item?.首登场景建议),
                        当前关系阶段: inSet(纯文本(item?.当前关系阶段), ['陌生', '接触', '信任', '暧昧', '绑定'] as const, '陌生'),
                        当前阶段目标: 纯文本(item?.当前阶段目标),
                        下一突破条件: 纯文本(item?.下一突破条件),
                        互动优先级: 取整数(item?.互动优先级, 50, 1, 100),
                        既有男性锚点: Array.isArray(item?.既有男性锚点)
                            ? item.既有男性锚点
                                .map((anchor: any) => {
                                    if (!anchor || typeof anchor !== 'object') return null;
                                    const 姓名 = 纯文本(anchor?.姓名);
                                    const 关系 = 纯文本(anchor?.关系);
                                    if (!姓名 || !关系) return null;
                                    return {
                                        姓名,
                                        关系,
                                        情感强度: 取整数(anchor?.情感强度, 50, 0, 100),
                                        崩溃进度: 取整数(anchor?.崩溃进度, 0, 0, 100)
                                    };
                                })
                                .filter(Boolean)
                            : [],
                        阻断记录: Array.isArray(item?.阻断记录) ? item.阻断记录.map((v: any) => 纯文本(v)).filter(Boolean) : [],
                        已完成节点: Array.isArray(item?.已完成节点) ? item.已完成节点.map((v: any) => 纯文本(v)).filter(Boolean) : [],
                        待完成节点: Array.isArray(item?.待完成节点) ? item.待完成节点.map((v: any) => 纯文本(v)).filter(Boolean) : [],
                        最近推进时间
                    };
                })
                .filter(Boolean)
            : [];

        const 互动排期 = Array.isArray(planRaw?.互动排期)
            ? planRaw.互动排期
                .map((item: any) => {
                    if (!item || typeof item !== 'object') return null;
                    const 失效时间Raw = 纯文本(item?.失效时间);
                    const 失效时间 = 失效时间Raw
                        ? (normalizeCanonicalGameTime(失效时间Raw) || 失效时间Raw)
                        : '';
                    const 事件ID = 纯文本(item?.事件ID);
                    const 女主ID = 纯文本(item?.女主ID);
                    if (!事件ID || !女主ID) return null;
                    return {
                        事件ID,
                        女主ID,
                        类型: inSet(纯文本(item?.类型), ['初见', '日常', '协作', '冲突', '修罗场', '亲密', '公开站队'] as const, '日常'),
                        描述: 纯文本(item?.描述),
                        触发条件: 纯文本(item?.触发条件),
                        失效时间,
                        成功效果: 纯文本(item?.成功效果),
                        失败效果: 纯文本(item?.失败效果),
                        状态: inSet(纯文本(item?.状态), ['待触发', '已触发', '已失效'] as const, '待触发')
                    };
                })
                .filter(Boolean)
            : [];

        const 群像镜头规划 = Array.isArray(planRaw?.群像镜头规划)
            ? planRaw.群像镜头规划
                .map((item: any) => {
                    if (!item || typeof item !== 'object') return null;
                    const 镜头ID = 纯文本(item?.镜头ID);
                    if (!镜头ID) return null;
                    return {
                        镜头ID,
                        参与者: Array.isArray(item?.参与者) ? item.参与者.map((v: any) => 纯文本(v)).filter(Boolean) : [],
                        焦点: 纯文本(item?.焦点),
                        预期冲突: 纯文本(item?.预期冲突),
                        状态: inSet(纯文本(item?.状态), ['待执行', '已执行'] as const, '待执行')
                    };
                })
                .filter(Boolean)
            : [];

        const 规则约束Raw = planRaw?.规则约束 && typeof planRaw.规则约束 === 'object' ? planRaw.规则约束 : {};
        const rawQueue = Array.isArray(planRaw?.登场队列)
            ? planRaw.登场队列.map((id: any) => 纯文本(id)).filter(Boolean)
            : [];
        const 去重保序 = (list: string[]) => {
            const seen = new Set<string>();
            const next: string[] = [];
            list.forEach((item) => {
                if (!item || seen.has(item)) return;
                seen.add(item);
                next.push(item);
            });
            return next;
        };
        const 登场队列 = 去重保序(rawQueue);
        const 去重条目 = <T,>(items: T[], getKey: (item: T) => string) => {
            const seen = new Set<string>();
            const next: T[] = [];
            items.forEach((item) => {
                const key = getKey(item);
                if (!key || seen.has(key)) return;
                seen.add(key);
                next.push(item);
            });
            return next;
        };
        const 去重女主条目 = 去重条目(女主条目 as any[], (item) => 纯文本((item as any)?.女主ID));
        const 女主ID集合 = new Set<string>(去重女主条目.map((item: any) => 纯文本(item?.女主ID)).filter(Boolean));
        const 互动排期候选 = (互动排期 as any[]).filter((item) => {
            const 女主ID = 纯文本(item?.女主ID);
            if (!女主ID) return false;
            return 女主ID集合.has(女主ID) || 登场队列.includes(女主ID);
        });
        const 去重互动排期 = 去重条目(互动排期候选, (item) => 纯文本((item as any)?.事件ID));
        const 去重群像镜头规划 = 去重条目(群像镜头规划 as any[], (item) => 纯文本((item as any)?.镜头ID));
        const 当前焦点女主IDRaw = 纯文本(planRaw?.当前焦点女主ID);
        const 当前焦点女主ID = 女主ID集合.has(当前焦点女主IDRaw) ? 当前焦点女主IDRaw : '';

        return {
            规划版本: 纯文本(planRaw?.规划版本) || 'v1',
            当前阶段: inSet(纯文本(planRaw?.当前阶段), ['开局铺垫', '并线发展', '冲突升级', '收束定局'] as const, '开局铺垫'),
            当前焦点女主ID,
            登场队列,
            女主条目: 去重女主条目 as any,
            互动排期: 去重互动排期 as any,
            群像镜头规划: 去重群像镜头规划 as any,
            规则约束: {
                单回合主推进上限: 取整数(规则约束Raw?.单回合主推进上限, 1, 0, 5),
                单回合次推进上限: 取整数(规则约束Raw?.单回合次推进上限, 1, 0, 5),
                连续同女主推进上限: 取整数(规则约束Raw?.连续同女主推进上限, 2, 1, 10),
                低压回合保底互动数: 取整数(规则约束Raw?.低压回合保底互动数, 1, 0, 5)
            }
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
            剧情: 创建开场空白剧情(),
            女主剧情规划: undefined as 女主剧情规划结构 | undefined
        };
    };

    const 创建空记忆系统 = (): 记忆系统结构 => ({
        回忆档案: [],
        即时记忆: [],
        短期记忆: [],
        中期记忆: [],
        长期记忆: []
    });

    const 应用开场基态 = (openingBase: ReturnType<typeof 创建开场基础状态>) => {
        设置角色(规范化角色物品容器映射(openingBase.角色));
        设置环境(规范化环境信息(openingBase.环境));
        设置社交(规范化社交列表(openingBase.社交));
        设置世界(openingBase.世界);
        设置战斗(openingBase.战斗);
        设置玩家门派(openingBase.玩家门派);
        设置任务列表(openingBase.任务列表 || []);
        设置约定列表(openingBase.约定列表 || []);
        设置剧情(规范化剧情状态(openingBase.剧情, openingBase.环境));
        设置女主剧情规划(undefined);
        设置记忆系统(创建空记忆系统());
        设置历史记录([]);
        setWorldEvents([]);
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
            女主剧情规划状态: string;
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
        const 构建女主剧情规划文本 = (payload: any) => {
            const normalizedPlan = 规范化女主剧情规划状态(payload?.女主剧情规划);
            return `【女主剧情规划】\n${JSON.stringify(normalizedPlan || {})}`;
        };

        const perspectivePromptIds = [
            'write_perspective_first',
            'write_perspective_second',
            'write_perspective_third'
        ];
        const normalizedGameConfig = 规范化游戏设置(gameConfig);
        const 应用多重思考提示词切换 = (
            pool: 提示词结构[],
            enabled: boolean
        ): 提示词结构[] => {
            if (!enabled) return pool;
            const hasMultiCot = pool.some(p => p.id === 'core_cot_multi');
            const hasMultiFormat = pool.some(p => p.id === 'core_format_multi');
            let nextPool = pool.map(p => {
                if (p.id === 'core_cot') return { ...p, 启用: false };
                if (p.id === 'core_format') return { ...p, 启用: false };
                if (p.id === 'core_cot_multi') return { ...p, 启用: true };
                if (p.id === 'core_format_multi') return { ...p, 启用: true };
                return p;
            });
            if (!hasMultiCot) {
                nextPool = [...nextPool, { ...核心_思维链_多重思考, 启用: true }];
            }
            if (!hasMultiFormat) {
                nextPool = [...nextPool, { ...核心_输出格式_多重思考, 启用: true }];
            }
            return nextPool;
        };
        const 应用女主剧情规划提示词切换 = (
            pool: 提示词结构[],
            enabled: boolean
        ): 提示词结构[] => {
            const hasPlan = pool.some(p => p.id === 'core_heroine_plan');
            const hasPlanCot = pool.some(p => p.id === 'core_heroine_plan_cot');
            let nextPool = pool.map(p => {
                if (p.id === 'core_heroine_plan') return { ...p, 启用: enabled };
                if (p.id === 'core_heroine_plan_cot') return { ...p, 启用: enabled };
                return p;
            });
            if (enabled && !hasPlan) {
                nextPool = [...nextPool, { ...核心_女主剧情规划, 启用: true }];
            }
            if (enabled && !hasPlanCot) {
                nextPool = [...nextPool, { ...核心_女主剧情规划_思考, 启用: true }];
            }
            return nextPool;
        };
        const 应用防止说话提示词切换 = (
            pool: 提示词结构[],
            enabled: boolean
        ): 提示词结构[] => {
            const hasNoControl = pool.some(p => p.id === 'write_no_control');
            let nextPool = pool.map(p => {
                if (p.id === 'write_no_control') return { ...p, 启用: enabled };
                return p;
            });
            if (enabled && !hasNoControl) {
                nextPool = [...nextPool, { ...写作_防止说话, 启用: true }];
            }
            return nextPool;
        };
        let effectivePromptPool = 应用多重思考提示词切换(
            promptPool,
            normalizedGameConfig.启用多重思考 === true
        );
        effectivePromptPool = 应用女主剧情规划提示词切换(
            effectivePromptPool,
            normalizedGameConfig.启用女主剧情规划 === true
        );
        effectivePromptPool = 应用防止说话提示词切换(
            effectivePromptPool,
            normalizedGameConfig.启用防止说话 !== false
        );
        const selectedPerspectiveIdMap: Record<string, string> = {
            第一人称: 'write_perspective_first',
            第二人称: 'write_perspective_second',
            第三人称: 'write_perspective_third'
        };
        const selectedPerspectiveId = selectedPerspectiveIdMap[normalizedGameConfig.叙事人称] || 'write_perspective_second';
        const selectedPerspectivePrompt = effectivePromptPool.find(p => p.id === selectedPerspectiveId);
        const fallbackPerspectivePrompt = effectivePromptPool.find(p => perspectivePromptIds.includes(p.id) && p.启用);

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

        const enabledPrompts = effectivePromptPool.filter(p => p.启用);
        const actionOptionsPrompt = effectivePromptPool.find(p => p.id === 'core_action_options');
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
        const ntlTierLine = normalizedGameConfig.剧情风格 === 'NTL后宫'
            ? `NTL后宫档位: ${normalizedGameConfig.NTL后宫档位}`
            : '';
        const contextSettings = [
            '【游戏设置】',
            `字数要求: ${normalizedGameConfig.字数要求}字`,
            `叙事人称: ${normalizedGameConfig.叙事人称}`,
            `剧情风格: ${normalizedGameConfig.剧情风格}`,
            `行动选项功能: ${normalizedGameConfig.启用行动选项 ? '开启' : '关闭'}`,
            `防止说话: ${normalizedGameConfig.启用防止说话 ? '开启' : '关闭'}`,
            `COT伪装注入: ${normalizedGameConfig.启用COT伪装注入 ? '开启' : '关闭'}`,
            `多重思考模式: ${normalizedGameConfig.启用多重思考 ? '开启' : '关闭'}`,
            `女主剧情规划: ${normalizedGameConfig.启用女主剧情规划 ? '开启' : '关闭'}`,
            ntlTierLine,
            '',
            '【对应叙事人称提示词】',
            activePerspectiveContent || '未配置',
            '',
            '【对应字数要求提示词】',
            writeReqContent || '未配置'
        ].join('\n');
        const contextStoryPlan = 构建剧情安排(statePayload);
        const contextHeroinePlan = normalizedGameConfig.启用女主剧情规划
            ? 构建女主剧情规划文本(statePayload)
            : '';
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
                contextHeroinePlan,
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
                女主剧情规划状态: contextHeroinePlan,
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
        重置自动存档状态();

        const openingBase = 创建开场基础状态(charData, worldConfig);
        应用开场基态(openingBase);

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

            // Mode Handling
            if (mode === 'step') {
                // step 模式用于手动初始化，仍需先把空白基态写入前端。
                应用开场基态(openingBase);
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
            const errorMessage = error?.message || '未知错误';
            if (openingStreaming) {
                设置历史记录(prev => {
                    const patched = prev.map(item => {
                        if (
                            item.role === 'assistant' &&
                            !item.structuredResponse &&
                            typeof item.content === 'string' &&
                            item.content.startsWith('【生成中】')
                        ) {
                            return { ...item, content: `【生成失败】${errorMessage}` };
                        }
                        return item;
                    });
                    return [
                        ...patched,
                        {
                            role: 'system',
                            content: `[开局生成失败] ${errorMessage}\n可点击输入栏左侧闪电按钮“快速重开”立即重试，建角参数已保留。`,
                            timestamp: Date.now()
                        }
                    ];
                });
            } else {
                alert("世界生成失败: " + errorMessage);
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
                剧情: 规范化剧情状态(contextData.剧情 || 剧情, openingEnv),
                女主剧情规划: 规范化女主剧情规划状态(contextData.女主剧情规划 ?? 女主剧情规划)
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

            const openingGameConfig = 规范化游戏设置(gameConfig);
            const openingLengthRequirementPrompt = 构建字数要求提示词(650);
            const aiResult = await aiService.generateStoryResponse(
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
                    enableCotInjection: openingGameConfig.启用COT伪装注入 !== false,
                    styleAssistantPrompt: 构建剧情风格助手消息(openingGameConfig),
                    cotPseudoHistoryPrompt: 构建COT伪装提示词(openingGameConfig),
                    lengthRequirementPrompt: openingLengthRequirementPrompt
                }
            );
            const aiData = aiResult.response;
            if (openingStreamHeartbeat) clearInterval(openingStreamHeartbeat);

            // Apply commands (use generated opening state as base to avoid stale state race)
            const openingStateAfterCommands = processResponseCommands(aiData, {
                角色: contextData.角色 || 角色,
                环境: contextData.环境 || 环境,
                社交: contextData.社交 || 社交,
                世界: contextData.世界 || 世界,
                战斗: contextData.战斗 || 战斗,
                剧情: 规范化剧情状态(contextData.剧情 || 剧情, contextData.环境 || 环境),
                女主剧情规划: 规范化女主剧情规划状态(contextData.女主剧情规划 ?? 女主剧情规划)
            });

            const openingCanonicalTime = normalizeCanonicalGameTime(openingStateAfterCommands?.环境?.时间);
            const openingTime = openingCanonicalTime
                || openingStateAfterCommands?.环境?.时间
                || contextData.环境?.时间
                || "未知时间";
            const openingImmediateEntry = 构建即时记忆条目(openingTime, '', aiData, { 省略玩家输入: true });
            const openingShortEntry = 构建短期记忆条目(openingTime, '开局生成', aiData);
            const openingFreshMemory: 记忆系统结构 = {
                回忆档案: [],
                即时记忆: [],
                短期记忆: [],
                中期记忆: [],
                长期记忆: []
            };
            设置记忆系统(写入四段记忆(规范化记忆系统(openingFreshMemory), openingImmediateEntry, openingShortEntry));

            const newAiMsg: 聊天记录结构 = { 
                role: 'assistant', 
                content: "Opening Story", 
                structuredResponse: aiData,
                rawJson: 格式化原始AI消息(aiResult.rawText, aiData),
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
            void performAutoSave({ history: [...initialHistory, newAiMsg] });

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
        重置自动存档状态();
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
            女主剧情规划?: 女主剧情规划结构;
        }
    ) => {
        let charBuffer = baseState?.角色 || 角色;
        let envBuffer = 规范化环境信息(baseState?.环境 || 环境);
        let socialBuffer = baseState?.社交 || 社交;
        let worldBuffer = 规范化世界状态(baseState?.世界 || 世界);
        let battleBuffer = 规范化战斗状态(baseState?.战斗 || 战斗);
        let storyBuffer = 规范化剧情状态(baseState?.剧情 || 剧情, envBuffer);
        let heroinePlanBuffer = 规范化女主剧情规划状态(baseState?.女主剧情规划 ?? 女主剧情规划);

        if (Array.isArray(response.tavern_commands)) {
            response.tavern_commands.forEach(cmd => {
                const res = applyStateCommand(charBuffer, envBuffer, socialBuffer, worldBuffer, battleBuffer, storyBuffer, heroinePlanBuffer, cmd.key, cmd.value, cmd.action);
                charBuffer = res.char;
                envBuffer = 规范化环境信息(res.env);
                socialBuffer = 规范化社交列表(res.social, { 合并同名: false });
                worldBuffer = 规范化世界状态(res.world);
                battleBuffer = res.battle;
                storyBuffer = res.story;
                heroinePlanBuffer = 规范化女主剧情规划状态(res.heroinePlan);
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
            设置女主剧情规划(规范化女主剧情规划状态(heroinePlanBuffer));
            socialBuffer = mergedSocial;
            storyBuffer = normalizedStory;
        }

        return {
            角色: charBuffer,
            环境: 规范化环境信息(envBuffer),
            社交: 规范化社交列表(socialBuffer),
            世界: 规范化世界状态(worldBuffer),
            战斗: battleBuffer,
            剧情: 规范化剧情状态(storyBuffer, envBuffer),
            女主剧情规划: 规范化女主剧情规划状态(heroinePlanBuffer)
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
                剧情: 规范化剧情状态(剧情, 环境),
                女主剧情规划: 规范化女主剧情规划状态(女主剧情规划)
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
        const normalizedSnapshotGameConfig = 规范化游戏设置(gameConfig);
        const cotEnabled = normalizedSnapshotGameConfig.启用COT伪装注入 !== false;
        const cotPseudoPrompt = cotEnabled ? 构建COT伪装提示词(normalizedSnapshotGameConfig) : '';
        const styleAssistantPrompt = 构建剧情风格助手消息(normalizedSnapshotGameConfig);
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
        pushSection('heroine_plan', '女主剧情规划', '系统', builtContext.contextPieces.女主剧情规划状态);
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
        pushSection('player_input', '玩家输入 (最近)', '用户', `<用户输入>${latestUserInput}</用户输入>`);
        pushSection('style_assistant', '剧情风格助手消息', '系统', styleAssistantPrompt);
        // 额外要求提示词固定置于COT伪装历史消息之前（倒数第二段）。
        pushSection('extra_prompt', '额外要求提示词', '系统', extraPrompt);
        // COT伪装历史消息固定置底，必须是快照中的最后一段注入消息。
        // 注入内容不附加任何标题包装，避免模型将标题当作可学习文本模式。
        pushSection('cot_fake_history', 'COT伪装历史消息', '系统', cotPseudoPrompt || '');

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
                女主剧情规划: 深拷贝(女主剧情规划),
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
                    剧情: 规范化剧情状态(剧情, 环境),
                    女主剧情规划: 规范化女主剧情规划状态(女主剧情规划)
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
            const runtimeGameConfig = 规范化游戏设置(gameConfig);
            const lengthRequirementPrompt = 构建字数要求提示词(runtimeGameConfig.字数要求);
            const aiResult = await aiService.generateStoryResponse(
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
                    enableCotInjection: runtimeGameConfig.启用COT伪装注入 !== false,
                    styleAssistantPrompt: 构建剧情风格助手消息(runtimeGameConfig),
                    cotPseudoHistoryPrompt: 构建COT伪装提示词(runtimeGameConfig),
                    lengthRequirementPrompt
                }
            );
            const aiData = aiResult.response;

            // 7. Process Result
            processResponseCommands(aiData);

            const immediateEntry = 构建即时记忆条目(currentGameTime, sendInput, aiData);
            const shortEntry = 构建短期记忆条目(currentGameTime, sendInput, aiData);
            设置记忆系统(prev => 写入四段记忆(规范化记忆系统(prev), immediateEntry, shortEntry));

            const newAiMsg: 聊天记录结构 = { 
                role: 'assistant', 
                content: "Structured Response", 
                structuredResponse: aiData,
                rawJson: 格式化原始AI消息(aiResult.rawText, aiData),
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
            void performAutoSave({ history: [...updatedDisplayHistory, newAiMsg] });
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
            } else if (error instanceof aiService.StoryResponseParseError || error?.name === 'StoryResponseParseError') {
                // 解析失败时不写入伪结构 assistant 消息，交给前端弹窗确认是否重ROLL。
                设置历史记录(historyBeforeSend);
                设置记忆系统(memBeforeSend);
                return {
                    cancelled: true,
                    needRerollConfirm: true,
                    parseErrorMessage: error?.message || '返回内容非标准JSON，建议重ROLL'
                };
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

    const handleQuickRestart = async (mode: 快速重开模式 = 'all') => {
        if (loading || !最近开局配置) return;
        清空重Roll快照();
        重置自动存档状态();
        const worldConfig = 深拷贝(最近开局配置.worldConfig);
        const charData = 深拷贝(最近开局配置.charData);
        const openingStreaming = 最近开局配置.openingStreaming;

        if (mode === 'world_only') {
            await handleGenerateWorld(
                worldConfig,
                charData,
                'step',
                openingStreaming
            );
            return;
        }

        if (mode === 'opening_only') {
            const currentApi = 获取主剧情接口配置(apiConfig);
            if (!接口配置是否可用(currentApi)) {
                alert("请先在设置中填写 API 地址/API Key，并选择主剧情使用模型");
                setShowSettings(true);
                return;
            }
            const openingBase = 创建开场基础状态(charData, worldConfig);
            应用开场基态(openingBase);
            if (view !== 'game') {
                setView('game');
            }
            setLoading(true);
            try {
                await generateOpeningStory(openingBase, prompts, openingStreaming, currentApi);
            } catch (error: any) {
                console.error('开局剧情重生成失败', error);
                alert(`开局剧情重生成失败: ${error?.message || '未知错误'}`);
            } finally {
                setLoading(false);
            }
            return;
        }

        await handleGenerateWorld(
            worldConfig,
            charData,
            'all',
            openingStreaming
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
    
    const 存档格式版本 = 2;
    const 自动存档最小间隔毫秒 = 30000;

    const 构建存档历史记录 = (sourceHistory?: 聊天记录结构[]): 聊天记录结构[] => {
        const rawHistory = Array.isArray(sourceHistory)
            ? sourceHistory
            : (Array.isArray(历史记录) ? 历史记录 : []);
        return 深拷贝(rawHistory);
    };

    const 构建存档记忆系统 = (): 记忆系统结构 => {
        const normalizedMemory = 规范化记忆系统(记忆系统);
        return 深拷贝(normalizedMemory);
    };

    const 构建自动存档签名 = (sourceHistory?: 聊天记录结构[]): string => {
        const historyBase = Array.isArray(sourceHistory)
            ? sourceHistory
            : (Array.isArray(历史记录) ? 历史记录 : []);
        const historySize = historyBase.length;
        const latestMsg = historySize > 0 ? historyBase[historySize - 1] : null;
        const latestDigest = latestMsg
            ? `${latestMsg.role}:${latestMsg.timestamp}:${(latestMsg.content || '').toString().slice(0, 30)}`
            : 'none';
        const timeText = normalizeCanonicalGameTime(环境.时间) || 环境.时间 || '';
        const locationText = 构建完整地点文本(环境) || '';
        return `${timeText}|${locationText}|${historySize}|${latestDigest}`;
    };

    // Unified Save Function (Internal)
    const createSaveData = (
        type: 'manual' | 'auto',
        autoSignature?: string,
        snapshot?: { history?: 聊天记录结构[] }
    ): Omit<存档结构, 'id'> => {
        const historySource = Array.isArray(snapshot?.history)
            ? snapshot.history
            : (Array.isArray(历史记录) ? 历史记录 : []);
        const historySnapshot = 构建存档历史记录(historySource);
        const rawPromptsSnapshot = 深拷贝(prompts);
        const promptsSnapshot = Array.isArray(rawPromptsSnapshot) ? rawPromptsSnapshot : undefined;

        return {
            类型: type,
            时间戳: Date.now(),
            元数据: {
                schemaVersion: 存档格式版本,
                历史记录条数: historySnapshot.length,
                历史记录是否裁剪: false,
                包含提示词快照: Boolean(promptsSnapshot),
                自动存档签名: type === 'auto' ? (autoSignature || '') : undefined
            },
            角色数据: 深拷贝(角色),
            环境信息: 规范化环境信息(深拷贝(环境)),
            历史记录: historySnapshot,
            社交: 深拷贝(社交),
            世界: 深拷贝(世界),
            战斗: 深拷贝(战斗),
            玩家门派: 深拷贝(玩家门派),
            任务列表: 深拷贝(任务列表),
            约定列表: 深拷贝(约定列表),
            剧情: 规范化剧情状态(深拷贝(剧情), 深拷贝(环境)),
            女主剧情规划: 规范化女主剧情规划状态(
                女主剧情规划 ? 深拷贝(女主剧情规划) : undefined
            ),
            记忆系统: 构建存档记忆系统(),
            游戏设置: 深拷贝(gameConfig),
            记忆配置: 深拷贝(memoryConfig),
            提示词快照: promptsSnapshot
        };
    };

    const handleSaveGame = async () => {
        const save = createSaveData('manual');
        await dbService.保存存档(save);
        setHasSave(true);
    };

    const performAutoSave = async (snapshot?: { history?: 聊天记录结构[] }) => {
        const historySource = Array.isArray(snapshot?.history)
            ? snapshot.history
            : (Array.isArray(历史记录) ? 历史记录 : []);
        if (!Array.isArray(historySource) || historySource.length === 0) return;
        const signature = 构建自动存档签名(historySource);
        const now = Date.now();
        if (signature && signature === 最近自动存档签名Ref.current) return;
        if (
            最近自动存档时间戳Ref.current > 0 &&
            now - 最近自动存档时间戳Ref.current < 自动存档最小间隔毫秒
        ) {
            return;
        }

        try {
            const save = createSaveData('auto', signature, { history: historySource });
            await dbService.保存存档(save);
            最近自动存档签名Ref.current = signature;
            最近自动存档时间戳Ref.current = now;
            setHasSave(true);
        } catch (error) {
            console.error('自动存档失败', error);
        }
    };

    const handleLoadGame = async (save: 存档结构) => {
        清空重Roll快照();
        重置自动存档状态();
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
        设置女主剧情规划(规范化女主剧情规划状态((save as any).女主剧情规划));
        设置历史记录(Array.isArray(save.历史记录) ? save.历史记录 : []);
        设置记忆系统(规范化记忆系统(save.记忆系统));
        
        if (save.游戏设置) setGameConfig(规范化游戏设置(save.游戏设置));
        if (save.记忆配置) setMemoryConfig(规范化记忆配置(save.记忆配置));
        if (Array.isArray(save.提示词快照)) {
            setPrompts(save.提示词快照); // Restore world settings etc.
            await dbService.保存设置('prompts', save.提示词快照);
        }
        
        setHasSave(true);
        setView('game');
        setShowSaveLoad({ show: false, mode: 'load' }); // Close modal
    };

    const updateNpcMajorRole = (npcId: string, isMajor: boolean) => {
        if (!npcId) return;
        设置社交((prev) => {
            const baseList = Array.isArray(prev) ? prev : [];
            const nextList = baseList.map((npc: any) => {
                if (!npc || npc.id !== npcId) return npc;
                return {
                    ...npc,
                    是否主要角色: isMajor
                };
            });
            return 规范化社交列表(nextList, { 合并同名: false });
        });
    };

    return {
        state: gameState,
        meta: {
            canRerollLatest: 可重Roll计数 > 0,
            canQuickRestart: Boolean(最近开局配置)
        },
        setters: {
            setShowSettings, setShowInventory, setShowEquipment, setShowSocial, setShowTeam, setShowKungfu, setShowWorld, setShowMap, setShowSect, setShowTask, setShowAgreement, setShowStory, setShowHeroinePlan, setShowMemory, setShowSaveLoad,
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
            updateNpcMajorRole,
            getContextSnapshot: buildContextSnapshot
        }
    };
};

