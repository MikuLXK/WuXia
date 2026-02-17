
import { 
    角色数据结构, 默认角色数据, 
    默认环境信息, 
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
    WorldGenConfig
} from '../types';
import { 默认任务列表 } from '../models/task';
import { 默认约定列表 } from '../models/task';
import { 默认剧情数据 } from '../models/story';
import { 默认世界数据, 默认归元宗 } from '../data/world'; 
import * as dbService from '../services/dbService';
import * as aiService from '../services/aiService';
import { applyStateCommand } from '../utils/stateHelpers';
import { parseJsonWithRepair } from '../utils/jsonRepair';
import { useGameState } from './useGameState';

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

    // --- Actions ---

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

    const handleStartNewGameWizard = () => {
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

    const 创建开场基础状态 = (charData: 角色数据结构) => {
        return {
            角色: JSON.parse(JSON.stringify(charData)),
            环境: JSON.parse(JSON.stringify(默认环境信息)),
            社交: [],
            世界: {
                ...JSON.parse(JSON.stringify(默认世界数据)),
                势力列表: [],
                活跃NPC列表: [],
                进行中事件: [],
                已结算事件: [],
                江湖史册: []
            },
            玩家门派: JSON.parse(JSON.stringify(默认归元宗)),
            剧情: JSON.parse(JSON.stringify(默认剧情数据))
        };
    };

    const 构建系统提示词 = (
        promptPool: 提示词结构[],
        memoryData: 记忆系统结构,
        socialData: any[],
        statePayload: any
    ) => {
        const systemPrompt = promptPool
            .filter(p => p.启用)
            .map(p => p.内容)
            .join('\n\n');

        const contextMemory = `【长期记忆】\n${memoryData.长期记忆.join('\n') || '暂无'}\n【中期记忆】\n${memoryData.中期记忆.join('\n') || '暂无'}\n【短期记忆】\n${memoryData.短期记忆.slice(-30).join('\n') || '暂无'}`;
        const contextNPC = `【当前场景NPC档案】\n${(socialData || []).map(npc => `姓名：${npc.姓名}\n身份：${npc.身份}\n性格：${npc.简介}\n记忆：${JSON.stringify((npc.记忆 || []).slice(-5))}`).join('\n') || '暂无在场NPC'}`;
        const contextSettings = `【游戏设置】\n字数要求: ${gameConfig.字数要求}\n叙事人称: ${gameConfig.叙事人称}`;
        const contextWorldState = `【游戏数值设定 (GameState)】\n${JSON.stringify(statePayload)}`;

        return `${systemPrompt}\n${contextMemory}\n${contextNPC}\n${contextSettings}\n${contextWorldState}`;
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

        if (openingStreaming) {
            const worldStreamMarker = Date.now();
            setView('game');
            设置历史记录([
                {
                    role: 'system',
                    content: '系统: 正在构建世界，请稍候...',
                    timestamp: worldStreamMarker
                },
                {
                    role: 'assistant',
                    content: openingStreaming ? '【创世流式】准备连接模型...' : '【创世】正在等待完整结果返回...',
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
                                    item.content.startsWith('【创世')
                                ) {
                                    return {
                                        ...item,
                                        content: `【创世流式】世界观生成中... 已接收 ${accumulated.length} 字符`
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
            const openingBase = 创建开场基础状态(charData);
            设置角色(openingBase.角色);
            设置环境(openingBase.环境);
            设置社交(openingBase.社交);
            设置世界(openingBase.世界);
            设置玩家门派(openingBase.玩家门派);
            设置剧情(openingBase.剧情);

            // Reset other states
            设置任务列表([]);
            设置约定列表([]);
            设置记忆系统({ 短期记忆: [], 中期记忆: [], 长期记忆: [] });

            // Mode Handling
            if (mode === 'step') {
                设置历史记录([]);
                setView('game');
                setLoading(false);
                alert("世界观提示词已生成并写入。请在聊天框输入指令开始第0回合初始化剧情。");
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
请基于当前 GameState（空白开局基础状态 + world_prompt 世界观母本）生成第一幕，要求：
1. 输出严格符合 GameResponse JSON（含 thinking_pre/logs/thinking_post/tavern_commands/shortTerm）。
2. **字数硬约束**：\`logs\` 中叙事正文总长度必须 **>= 450 个中文字符**（不含 thinking 与 tavern_commands）。
3. **全量初始化硬约束**：本回合必须完成“当前引擎可写域”的完整初始化，且通过 \`tavern_commands\` 落地，禁止只叙事不改变量。
4. 可写域与最小覆盖（全部必须命中）：
   - \`gameState.角色\`：至少初始化/确认 生存值（精力/饱腹/口渴）、七部位血量与状态、装备、物品列表、功法列表、经验与BUFF。
   - \`gameState.环境\`：必须完整初始化 时间(YYYY:MM:DD:HH:MM)、时刻、天气、节日、洲/国/郡/县/村、具体地点、日期(第几日)。
   - \`gameState.社交\`：至少创建 2 个初始 NPC（完整结构，含记忆数组）。
   - \`gameState.世界\`：至少初始化 势力列表、活跃NPC列表、进行中事件（>=1 条）、已结算事件、江湖史册、当前时代、混乱度。
   - \`gameState.剧情\`：必须初始化 当前章节、下一章预告、历史卷宗、剧情变量。
5. 命令覆盖硬约束：\`tavern_commands\` 必须同时包含对 \`角色/环境/社交/世界/剧情\` 五个根域的有效命令。
6. 开场必须落在玩家当前环境与时间，不得跳场景；并引出第一个可交互选择，不替玩家决定。
7. \`shortTerm\` 仅写 100 字内剧情概况。
        `;

        const initialHistory: 聊天记录结构[] = [
            {
                role: 'system',
                content: '系统: 世界观已注入，正在生成第0回合开场初始化剧情...',
                timestamp: Date.now()
            }
        ];
        设置历史记录(initialHistory);

        try {
            const controller = new AbortController();
            abortControllerRef.current = controller;

            const openingMem: 记忆系统结构 = { 短期记忆: [], 中期记忆: [], 长期记忆: [] };
            const openingStatePayload = {
                角色: contextData.角色 || 角色,
                环境: contextData.环境 || 环境,
                世界: contextData.世界 || 世界,
                玩家门派: contextData.玩家门派 || 玩家门派,
                任务列表: [],
                约定列表: [],
                剧情: contextData.剧情 || 剧情
            };
            const openingSystemPrompt = 构建系统提示词(
                promptSnapshot,
                openingMem,
                contextData.社交 || [],
                openingStatePayload
            );
            const openingScriptContext = `【即时剧情回顾 (Script)】\n世界初始化完成，第一幕即将展开。`;

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
                openingSystemPrompt,
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
            socialBuffer = res.social;
            worldBuffer = res.world;
            storyBuffer = res.story; 
        });

        设置角色(charBuffer);
        设置环境(envBuffer);
        设置社交(socialBuffer);
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

        // 2. Archive Old Memories (Capacity Check)
        let currentHistory = [...历史记录];
        const newShortTermMemories: string[] = [];
        if (currentHistory.length >= 20) {
            const overflowCount = currentHistory.length - 18; 
            const removed = currentHistory.splice(0, overflowCount);
            removed.forEach(msg => {
                if (msg.role === 'assistant' && msg.structuredResponse && msg.structuredResponse.shortTerm) {
                    newShortTermMemories.push(`[${msg.gameTime || '未知时间'}] ${msg.structuredResponse.shortTerm}`);
                }
            });
        }
        let updatedMemSys = { ...记忆系统 };
        if (newShortTermMemories.length > 0) {
            updatedMemSys.短期记忆 = [...updatedMemSys.短期记忆, ...newShortTermMemories];
        }
        设置记忆系统(updatedMemSys);

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
            const systemPrompt = 构建系统提示词(
                prompts,
                updatedMemSys,
                社交,
                { 角色, 环境, 世界, 玩家门派, 任务列表, 约定列表, 剧情 }
            );
            const contextImmediate = `【即时剧情回顾 (Script)】\n${formatHistoryToScript(updatedHistory)}`;

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
                systemPrompt,
                contextImmediate,
                `${content}\n\n${gameConfig.额外提示词}`,
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
                设置历史记录(currentHistory); // Revert
                console.log("Request aborted by user");
            } else {
                const errorMsg: 聊天记录结构 = { role: 'system', content: `[系统错误]: ${error.message}`, timestamp: Date.now() };
                设置历史记录([...updatedHistory, errorMsg]);
            }
        } finally {
            setLoading(false);
            abortControllerRef.current = null;
        }
    };

    const handleRegenerate = async () => {
        if (loading || 历史记录.length === 0) return;
        let lastUserIndex = -1;
        for (let i = 历史记录.length - 1; i >= 0; i--) {
            if (历史记录[i].role === 'user') {
                lastUserIndex = i;
                break;
            }
        }
        if (lastUserIndex === -1) return;
        const newHistory = [...历史记录];
        const lastMsg = newHistory[newHistory.length - 1];
        let contentToResend = "";
        if (lastMsg.role === 'assistant') {
            newHistory.pop(); 
            const lastUser = newHistory.pop(); 
            if (lastUser && lastUser.role === 'user') {
                contentToResend = lastUser.content;
                设置历史记录(newHistory);
                setTimeout(() => handleSend(contentToResend), 0);
            }
        }
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
            设置角色(save.角色数据);
            设置环境(save.环境信息);
            设置社交(save.社交 || []); 
            设置世界(save.世界 || 默认世界数据);
            设置玩家门派(save.玩家门派 || 默认归元宗);
            设置任务列表(save.任务列表 || 默认任务列表);
            设置约定列表(save.约定列表 || 默认约定列表);
            设置剧情(save.剧情 || 默认剧情数据);
            设置历史记录(save.历史记录);
            设置记忆系统(save.记忆系统 || { 短期记忆: [], 中期记忆: [], 长期记忆: [] });
            
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
            handleReturnToHome
        }
    };
};
