
import { 
    角色数据结构, 默认角色数据, 
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
    详细门派结构,
    剧情系统结构
} from '../types';
import { useRef, useState } from 'react';
import * as dbService from '../services/dbService';
import * as aiService from '../services/aiService';
import { applyStateCommand } from '../utils/stateHelpers';
import { parseJsonWithRepair } from '../utils/jsonRepair';
import { useGameState } from './useGameState';

type 回合快照结构 = {
    玩家输入: string;
    游戏时间: string;
    回档前状态: {
        角色: 角色数据结构;
        环境: 环境信息结构;
        社交: any[];
        世界: 世界数据结构;
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

export const useGame = () => {
    const gameState = useGameState();
    const {
        view, setView,
        hasSave, setHasSave,
        角色, 设置角色,
        环境, 设置环境,
        社交, 设置社交,
        世界, 设置世界,
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
    const 即时记忆上限 = 12;
    const 深拷贝 = <T,>(data: T): T => JSON.parse(JSON.stringify(data)) as T;
    const 规范化社交列表 = (list: any[]): any[] => {
        if (!Array.isArray(list)) return [];
        return list.map(npc => ({
            ...npc,
            是否在场: typeof npc?.是否在场 === 'boolean' ? npc.是否在场 : true,
            是否队友: typeof npc?.是否队友 === 'boolean' ? npc.是否队友 : ((npc?.好感度 || 0) > 0)
        }));
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
        设置角色(深拷贝(snapshot.回档前状态.角色));
        设置环境(深拷贝(snapshot.回档前状态.环境));
        设置社交(深拷贝(snapshot.回档前状态.社交));
        设置世界(深拷贝(snapshot.回档前状态.世界));
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

    const 规范化记忆系统 = (raw?: Partial<记忆系统结构> | null): 记忆系统结构 => {
        return {
            即时记忆: Array.isArray(raw?.即时记忆) ? [...raw!.即时记忆] : [],
            短期记忆: Array.isArray(raw?.短期记忆) ? [...raw!.短期记忆] : [],
            中期记忆: Array.isArray(raw?.中期记忆) ? [...raw!.中期记忆] : [],
            长期记忆: Array.isArray(raw?.长期记忆) ? [...raw!.长期记忆] : []
        };
    };

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

    const 构建即时记忆条目 = (gameTime: string, playerInput: string, aiData: GameResponse): string => {
        const timeLabel = 格式化记忆时间(gameTime || '未知时间');
        const logsText = Array.isArray(aiData.logs) && aiData.logs.length > 0
            ? aiData.logs
                .map((log) => `${log.sender}：${(log.text || '').trim()}`)
                .join('\n')
            : '（本轮无有效剧情日志）';
        return [
            timeLabel,
            `玩家输入：${playerInput || '（空输入）'}`,
            'AI输出：',
            logsText
        ].join('\n').trim();
    };

    const 构建短期记忆条目 = (gameTime: string, playerInput: string, aiData: GameResponse): string => {
        const timeLabel = 格式化记忆时间(gameTime || '未知时间');
        const summary = (aiData.shortTerm || '').trim() ||
            (Array.isArray(aiData.logs)
                ? aiData.logs.map(log => `${log.sender}:${log.text}`).join(' ').slice(0, 180)
                : '本回合推进');
        return `${timeLabel} ${playerInput} -> ${summary}`;
    };

    const 写入四段记忆 = (memoryBase: 记忆系统结构, immediateEntry: string, shortEntry: string): 记忆系统结构 => {
        const next = 规范化记忆系统(memoryBase);
        const full = immediateEntry.trim();
        const summary = shortEntry.trim();
        if (!full && !summary) return next;

        if (full) {
            next.即时记忆.push(full);
        }

        while (next.即时记忆.length > 即时记忆上限) {
            next.即时记忆.shift();
        }

        if (summary) {
            next.短期记忆.push(summary);
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
        记忆历史块: string;
    } => {
        const npcList = Array.isArray(socialData) ? socialData : [];
        const 普通关键记忆条数N = 5;
        const 在场重要角色关键记忆条数N = 20;

        const 标准化记忆 = (npc: any, limit: number) => {
            if (!Array.isArray(npc?.记忆)) return [];
            return npc.记忆
                .map((m: any) => ({
                    时间: typeof m?.时间 === 'string' ? m.时间 : '未知时间',
                    内容: typeof m?.内容 === 'string' ? m.内容 : String(m?.内容 ?? '')
                }))
                .filter((m: any) => m.内容.trim().length > 0)
                .slice(-Math.max(1, limit));
        };

        const toLite = (npc: any, index: number) => {
            const 是否在场 = typeof npc?.是否在场 === 'boolean' ? npc.是否在场 : true;
            const 是否队友 = typeof npc?.是否队友 === 'boolean' ? npc.是否队友 : ((npc?.好感度 || 0) > 0);
            const 是否主要角色 = typeof npc?.是否主要角色 === 'boolean' ? npc.是否主要角色 : false;
            const 记忆上限 = 是否在场 && 是否主要角色 ? 在场重要角色关键记忆条数N : 普通关键记忆条数N;
            return {
                索引: index,
                id: typeof npc?.id === 'string' ? npc.id : `npc_${index}`,
                姓名: typeof npc?.姓名 === 'string' ? npc.姓名 : `角色${index}`,
                性别: typeof npc?.性别 === 'string' ? npc.性别 : '未知',
                身份: typeof npc?.身份 === 'string' ? npc.身份 : '未知身份',
                境界: typeof npc?.境界 === 'string' ? npc.境界 : '未知境界',
                是否在场,
                是否队友,
                是否主要角色,
                关系状态: typeof npc?.关系状态 === 'string' ? npc.关系状态 : '未知',
                好感度: typeof npc?.好感度 === 'number' ? npc.好感度 : 0,
                关键记忆: 标准化记忆(npc, 记忆上限)
            };
        };

        const entries = npcList.map((npc, index) => toLite(npc, index));

        const 在场队伍成员 = entries.filter(n => n.是否在场 && n.是否队友);
        const 在场非队伍重点 = entries.filter(n => n.是否在场 && !n.是否队友 && n.是否主要角色);
        const 在场非队伍普通 = entries.filter(n => n.是否在场 && !n.是否队友 && !n.是否主要角色);
        const 离场队伍成员 = entries.filter(n => !n.是否在场 && n.是否队友);
        const 离场非队伍重点 = entries.filter(n => !n.是否在场 && !n.是否队友 && n.是否主要角色);
        const 离场非队伍普通简报 = entries
            .filter(n => !n.是否在场 && !n.是否队友 && !n.是否主要角色)
            .map((n, idx) => `[${idx + 1}]#${n.索引}/${n.姓名}/${n.身份}/${n.关系状态}/好感${n.好感度}`);

        const 去记忆 = (n: any) => ({
            索引: n.索引,
            id: n.id,
            姓名: n.姓名,
            性别: n.性别,
            身份: n.身份,
            境界: n.境界,
            是否在场: n.是否在场,
            是否队友: n.是否队友,
            是否主要角色: n.是否主要角色,
            关系状态: n.关系状态,
            好感度: n.好感度
        });

        const 在场数据 = {
            社交索引映射: entries.map(n => ({
                索引: n.索引,
                id: n.id,
                姓名: n.姓名,
                是否在场: n.是否在场,
                是否队友: n.是否队友,
                是否主要角色: n.是否主要角色
            })),
            在场NPC: {
                队伍成员: 在场队伍成员.map(去记忆),
                非队伍_重点角色: 在场非队伍重点.map(去记忆),
                非队伍_普通角色: 在场非队伍普通.map(去记忆)
            }
        };

        const 离场数据 = {
            离场NPC: {
                队伍成员: 离场队伍成员.map(去记忆),
                非队伍_重点角色: 离场非队伍重点.map(去记忆),
                非队伍_普通角色简报: 离场非队伍普通简报
            }
        };

        const 在场记忆历史 = entries
            .filter(n => n.是否在场 && Array.isArray(n.关键记忆) && n.关键记忆.length > 0)
            .map(n => ({
                索引: n.索引,
                id: n.id,
                姓名: n.姓名,
                记忆历史: n.关键记忆
            }));

        const 离场记忆历史 = entries
            .filter(n => !n.是否在场 && Array.isArray(n.关键记忆) && n.关键记忆.length > 0)
            .map(n => ({
                索引: n.索引,
                id: n.id,
                姓名: n.姓名,
                记忆历史: n.关键记忆
            }));

        const 记忆历史 = {
            关键记忆条数策略: {
                普通角色: 普通关键记忆条数N,
                在场重要角色: 在场重要角色关键记忆条数N
            },
            在场NPC记忆历史: 在场记忆历史,
            离场NPC记忆历史: 离场记忆历史
        };

        return {
            在场数据块: `【当前场景NPC档案】\n${JSON.stringify(在场数据)}`,
            离场数据块: `【离场NPC档案】\n${JSON.stringify(离场数据)}`,
            记忆历史块: `【NPC记忆历史】\n${JSON.stringify(记忆历史)}`
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
        时刻: '',
        洲: '',
        国: '',
        郡: '',
        县: '',
        村: '',
        具体地点: '',
        节日: '',
        天气: '',
        环境描述: '',
        日期: 1
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
        npcMemoryContext: string;
    } => {
        const 构建去重GameState快照 = (payload: any) => {
            const source = payload || {};
            const role = source.角色 || {};
            return {
                角色基础信息: {
                    姓名: role.姓名,
                    性别: role.性别,
                    年龄: role.年龄,
                    出生日期: role.出生日期,
                    称号: role.称号,
                    境界: role.境界,
                    天赋列表: role.天赋列表,
                    出身背景: role.出身背景
                },
                角色装备: role.装备 || {},
                角色背包: Array.isArray(role.物品列表) ? role.物品列表 : [],
                角色功法: Array.isArray(role.功法列表) ? role.功法列表 : [],
                当前地点: source.当前地点 || source?.环境?.具体地点 || '',
                角色: source.角色,
                环境: source.环境,
                世界: source.世界,
                玩家门派: source.玩家门派,
                任务列表: Array.isArray(source.任务列表) ? source.任务列表 : [],
                约定列表: Array.isArray(source.约定列表) ? source.约定列表 : [],
                剧情: source.剧情
            };
        };

        const enabledPrompts = promptPool.filter(p => p.启用);
        const worldPrompt = enabledPrompts.find(p => p.id === 'core_world')?.内容 || '';
        const otherPrompts = enabledPrompts
            .filter(p => p.id !== 'core_world')
            .map(p => p.内容)
            .join('\n\n');

        const npcContext = 构建NPC上下文(socialData || []);
        const promptHeader = [
            worldPrompt.trim(),
            npcContext.离场数据块,
            otherPrompts.trim()
        ].filter(Boolean).join('\n\n');

        const contextMemory = `【长期记忆】\n${memoryData.长期记忆.join('\n') || '暂无'}\n【中期记忆】\n${memoryData.中期记忆.join('\n') || '暂无'}`;
        const contextNPCData = npcContext.在场数据块;
        const contextSettings = `【游戏设置】\n字数要求: ${gameConfig.字数要求}\n叙事人称: ${gameConfig.叙事人称}`;
        const contextWorldState = `【游戏数值设定 (GameState)】\n${JSON.stringify(构建去重GameState快照(statePayload))}`;
        const shortMemoryContext = `【短期记忆】\n${memoryData.短期记忆.slice(-30).join('\n') || '暂无'}`;
        const npcMemoryContext = npcContext.记忆历史块;

        return {
            systemPrompt: [promptHeader, contextMemory, contextNPCData, contextSettings, contextWorldState]
                .filter(Boolean)
                .join('\n\n'),
            shortMemoryContext,
            npcMemoryContext
        };
    };

    const handleGenerateWorld = async (
        worldConfig: WorldGenConfig,
        charData: 角色数据结构,
        mode: 'all' | 'step',
        openingStreaming: boolean = true
    ) => {
        if (!apiConfig.apiKey) {
            alert("请先在设置中配置 API Key");
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
            const generatedWorldPrompt = await aiService.generateWorldData(
                worldGenerationContext,
                charData,
                apiConfig,
                openingStreaming
                    ? {
                        stream: openingStreaming,
                        onDelta: (_delta, accumulated) => {
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

            const worldPromptContent = generatedWorldPrompt?.trim() || worldPromptSeed;
            const finalPrompts = updatedPrompts.map(p => (
                p.id === 'core_world' ? { ...p, 内容: worldPromptContent } : p
            ));
            setPrompts(finalPrompts);
            await dbService.保存设置('prompts', finalPrompts);

            // Initialize opening base state (full runtime initialization happens in opening story)
            const openingBase = 创建开场基础状态(charData, worldConfig);
            设置角色(openingBase.角色);
            设置环境(openingBase.环境);
            设置社交(openingBase.社交);
            设置世界(openingBase.世界);
            设置玩家门派(openingBase.玩家门派);
            设置任务列表(openingBase.任务列表 || []);
            设置约定列表(openingBase.约定列表 || []);
            设置剧情(openingBase.剧情);

            // Reset other states
            设置记忆系统({ 即时记忆: [], 短期记忆: [], 中期记忆: [], 长期记忆: [] });

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
   - \`gameState.角色\`：按当前角色建档数据完整初始化（基础身份、六维、生存值、部位血量与状态、装备、物品列表、功法列表、经验与BUFF）。
   - \`gameState.环境\`：完整初始化 时间(YYYY:MM:DD:HH:MM)、时刻、天气、节日、洲/国/郡/县/村、具体地点、日期(第几日)。
   - \`gameState.当前地点\`：必须显式初始化，并与 \`gameState.环境.具体地点\` 保持一致。
   - \`gameState.社交\`：按开场剧情实际出场角色初始化；不强制固定人数。未出场角色可不建档。
   - \`gameState.世界\`：完整初始化（当前时代/混乱度/势力列表/活跃NPC列表/进行中事件/已结算事件/江湖史册）。
     其中“天下大势正在发生的事件”（\`gameState.世界.进行中事件\`）开场必须生成 **>=3 条**（推荐 5 条），且每条都需具备真实关联势力或人物，禁止空事件凑数。
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
   - 需要出现“可执行的下一步选择点”，并体现风险与收益差异。
   - 出场角色、冲突与伏笔数量不设固定下限，但必须与开场剧情规模和世界观一致。
        `;

        const initialHistory: 聊天记录结构[] = [
            {
                role: 'system',
                content: '系统: 正在生成开场内容...',
                timestamp: Date.now()
            }
        ];
        设置历史记录(initialHistory);

        try {
            const controller = new AbortController();
            abortControllerRef.current = controller;

            const openingMem: 记忆系统结构 = { 即时记忆: [], 短期记忆: [], 中期记忆: [], 长期记忆: [] };
            const openingCurrentLocation = Object.prototype.hasOwnProperty.call(contextData || {}, '当前地点')
                ? contextData.当前地点
                : (contextData?.环境?.具体地点 ?? '');
            const openingStatePayload = {
                角色: contextData.角色 || 角色,
                环境: contextData.环境 || 环境,
                世界: contextData.世界 || 世界,
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
                openingContext.npcMemoryContext,
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
                        gameTime: contextData.环境?.时间 || "未知时间"
                    }
                ]);
            }

            const aiData = await aiService.generateStoryResponse(
                openingContext.systemPrompt,
                openingScriptContext,
                `${openingPrompt}\n\n${gameConfig.额外提示词}`,
                apiConfig,
                controller.signal,
                useStreaming
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
                    : undefined
            );

            // Apply commands (use generated opening state as base to avoid stale state race)
            processResponseCommands(aiData, {
                角色: contextData.角色 || 角色,
                环境: contextData.环境 || 环境,
                社交: contextData.社交 || 社交,
                世界: contextData.世界 || 世界,
                剧情: contextData.剧情 || 剧情
            });

            const openingTime = contextData.环境?.时间 || "未知时间";
            const openingImmediateEntry = 构建即时记忆条目(openingTime, '开局生成', aiData);
            const openingShortEntry = 构建短期记忆条目(openingTime, '开局生成', aiData);
            设置记忆系统(prev => 写入四段记忆(规范化记忆系统(prev), openingImmediateEntry, openingShortEntry));

            const newAiMsg: 聊天记录结构 = { 
                role: 'assistant', 
                content: "Opening Story", 
                structuredResponse: aiData,
                rawJson: JSON.stringify(aiData, null, 2),
                timestamp: Date.now(),
                gameTime: contextData.环境?.时间 || "未知时间"
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
            
            // Trigger auto-save after opening
            setTimeout(() => performAutoSave(), 1000);

        } catch (e: any) {
            if (e?.name === 'AbortError') {
                设置历史记录(initialHistory);
                return;
            }
            console.error("Story Gen Failed", e);
        } finally {
            abortControllerRef.current = null;
        }
    };

    const handleReturnToHome = () => {
        if (confirm("确定要返回首页吗？未保存的进度将会丢失。")) {
            setView('home');
            return true;
        }
        return false;
    };

    const processResponseCommands = (
        response: GameResponse,
        baseState?: {
            角色: typeof 角色;
            环境: typeof 环境;
            社交: typeof 社交;
            世界: typeof 世界;
            剧情: typeof 剧情;
        }
    ) => {
        if (!response.tavern_commands) return;

        let charBuffer = baseState?.角色 || 角色;
        let envBuffer = baseState?.环境 || 环境;
        let socialBuffer = baseState?.社交 || 社交;
        let worldBuffer = baseState?.世界 || 世界;
        let storyBuffer = baseState?.剧情 || 剧情; 

        response.tavern_commands.forEach(cmd => {
            const res = applyStateCommand(charBuffer, envBuffer, socialBuffer, worldBuffer, storyBuffer, cmd.key, cmd.value, cmd.action);
            charBuffer = res.char;
            envBuffer = res.env;
            socialBuffer = 规范化社交列表(res.social);
            worldBuffer = res.world;
            storyBuffer = res.story; 
        });

        设置角色(charBuffer);
        设置环境(envBuffer);
        设置社交(规范化社交列表(socialBuffer));
        设置世界(worldBuffer);
        设置剧情(storyBuffer);
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
                const lines = h.structuredResponse.logs
                    .filter(l => l.sender !== '【判定】' && l.sender !== '【NSFW判定】')
                    .map(l => `${l.sender}：${l.text}`).join('\n');
                return `${timeStr}${lines}`;
            }
            return '';
        }).join('\n\n');
    };

    // --- Core Send Logic ---
    const handleSend = async (content: string, isStreaming: boolean = true) => {
        if (!content.trim() || loading) return;
        if (!apiConfig.apiKey) {
            alert("请先在设置中配置 API Key");
            setShowSettings(true);
            return;
        }

        // 1. Calculate Game Time String
        const canonicalTime = normalizeCanonicalGameTime(环境.时间);
        const currentGameTime = canonicalTime || `第${环境.日期 || 1}日 ${环境.时间 || '未知时间'}`;
        const sendInput = content.trim();
        const historyBeforeSend = [...历史记录];
        const memBeforeSend = 规范化记忆系统(记忆系统);
        推入重Roll快照({
            玩家输入: sendInput,
            游戏时间: currentGameTime,
            回档前状态: {
                角色: 深拷贝(角色),
                环境: 深拷贝(环境),
                社交: 深拷贝(社交),
                世界: 深拷贝(世界),
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
                { 角色, 环境, 世界, 玩家门派, 任务列表, 约定列表, 当前地点: 环境?.具体地点 || '', 剧情 }
            );
            const contextImmediate = [
                builtContext.npcMemoryContext,
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
                `${sendInput}\n\n${gameConfig.额外提示词}`,
                apiConfig,
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
                    : undefined
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
        setApiConfig(newConfig);
        await dbService.保存设置('api_settings', newConfig);
    };
    const saveVisualSettings = async (newConfig: 视觉设置结构) => {
        setVisualConfig(newConfig);
        await dbService.保存设置('visual_settings', newConfig);
    }
    const saveGameSettings = async (newConfig: 游戏设置结构) => {
        setGameConfig(newConfig);
        await dbService.保存设置('game_settings', newConfig);
    }
    const saveMemorySettings = async (newConfig: 记忆配置结构) => {
        setMemoryConfig(newConfig);
        await dbService.保存设置('memory_settings', newConfig);
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
            环境信息: 环境,
            历史记录: 历史记录,
            社交: 社交,
            世界: 世界,
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
        const desc = `[自动] ${环境.具体地点} - ${new Date().toLocaleTimeString()}`;
        const save = createSaveData(desc, 'auto');
        await dbService.保存存档(save);
    };

    const handleLoadGame = async (save: 存档结构) => {
        if (view === 'home' || confirm(`读取存档: ${save.描述}?`)) {
            清空重Roll快照();
            设置最近开局配置(null);
            设置角色(save.角色数据);
            设置环境(save.环境信息 || 创建开场空白环境());
            设置社交(规范化社交列表(save.社交 || [])); 
            设置世界(save.世界 || 创建开场空白世界());
            设置玩家门派(save.玩家门派 || 创建空门派状态());
            设置任务列表(save.任务列表 || []);
            设置约定列表(save.约定列表 || []);
            设置剧情(save.剧情 || 创建开场空白剧情());
            设置历史记录(save.历史记录);
            设置记忆系统(规范化记忆系统(save.记忆系统));
            
            if (save.游戏设置) setGameConfig(save.游戏设置);
            if (save.记忆配置) setMemoryConfig(save.记忆配置);
            if (save.提示词快照) {
                setPrompts(save.提示词快照); // Restore world settings etc.
                await dbService.保存设置('prompts', save.提示词快照);
            }
            
            setView('game');
            setShowSaveLoad({ show: false, mode: 'load' }); // Close modal
        }
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
            handleReturnToHome
        }
    };
};
