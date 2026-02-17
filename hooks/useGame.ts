
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

    const handleStartNewGameWizard = () => {
        setView('new_game');
    };

    const handleGenerateWorld = async (worldConfig: WorldGenConfig, charData: 角色数据结构, mode: 'all' | 'step') => {
        if (!apiConfig.apiKey) {
            alert("请先在设置中配置 API Key");
            setShowSettings(true);
            return;
        }

        setLoading(true);

        try {
            // 1. Prepare World Prompt & Update State
            const worldPromptContent = `
【世界设定】
- 名称: ${worldConfig.worldName}
- 武力: ${worldConfig.powerLevel}
- 规模: ${worldConfig.worldSize}
- 局势: ${worldConfig.dynastySetting}
- 宗门: ${worldConfig.sectDensity}
- 天骄: ${worldConfig.tianjiaoSetting}
            `.trim();

            const difficulty = worldConfig.difficulty || 'normal';

            // Filter prompts: Update Core World AND Enable/Disable Difficulty prompts
            const updatedPrompts = prompts.map(p => {
                // Update world prompt content
                if (p.id === 'core_world') {
                    return { ...p, 内容: worldPromptContent };
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

            // 2. Call AI Service
            const genData = await aiService.generateWorldData(worldPromptContent, charData, apiConfig);

            // Apply Generated Data
            if (genData.世界) 设置世界(genData.世界);
            if (genData.角色) 设置角色(genData.角色);
            if (genData.社交) 设置社交(genData.社交);
            if (genData.环境) 设置环境(genData.环境);
            if (genData.玩家门派) 设置玩家门派(genData.玩家门派);
            if (genData.剧情) 设置剧情(genData.剧情);

            // Reset other states
            设置任务列表([]);
            设置约定列表([]);
            设置记忆系统({ 短期记忆: [], 中期记忆: [], 长期记忆: [] });
            设置历史记录([]); 

            // Mode Handling
            if (mode === 'step') {
                setView('game');
                setLoading(false);
                alert("世界构建完成！请在聊天框中输入指令或点击按钮开始剧情。");
            } else {
                // 'all' mode: Trigger Story Generation
                // We pass genData explicitly because state updates might be async/batched
                await generateOpeningStory(genData, worldPromptContent);
                setView('game');
                setLoading(false);
            }

        } catch (error: any) {
            console.error(error);
            alert("世界生成失败: " + error.message);
            setLoading(false);
        }
    };

    const generateOpeningStory = async (contextData: any, worldPromptContent: string) => {
        const openingPrompt = `
【指令】
根据已生成的世界和角色数据，生成游戏的第一幕（开场剧情）。
输出格式需符合 GameResponse 结构，包含 logs (旁白/对话) 和 tavern_commands (如果有状态变更)。
请以旁白的口吻描述玩家苏醒或到达初始地点的场景，并引出第一个互动。
        `;
        
        const initialHistory: 聊天记录结构[] = [{
             role: 'system', 
             content: '系统: 世界初始化完成。', 
             timestamp: Date.now() 
        }];
        设置历史记录(initialHistory);

        try {
            const aiData = await aiService.generateStoryResponse(
                "你是一个文字游戏DM。请生成开场剧情。",
                `${worldPromptContent}\n【当前状态】${JSON.stringify(contextData)}`,
                openingPrompt,
                apiConfig
            );

            // Apply commands
            processResponseCommands(aiData);

            const newAiMsg: 聊天记录结构 = { 
                role: 'assistant', 
                content: "Opening Story", 
                structuredResponse: aiData,
                rawJson: JSON.stringify(aiData),
                timestamp: Date.now(),
                gameTime: contextData.环境?.时间 || "未知时间"
            };
            设置历史记录([newAiMsg]);
            
            // Trigger auto-save after opening
            setTimeout(() => performAutoSave(), 1000);

        } catch (e) {
            console.error("Story Gen Failed", e);
        }
    };

    const handleReturnToHome = () => {
        if (confirm("确定要返回首页吗？未保存的进度将会丢失。")) {
            setView('home');
            return true;
        }
        return false;
    };

    const processResponseCommands = (response: GameResponse) => {
        if (!response.tavern_commands) return;

        let charBuffer = 角色;
        let envBuffer = 环境;
        let socialBuffer = 社交;
        let worldBuffer = 世界;
        let storyBuffer = 剧情; 

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
        try {
            const parsed = JSON.parse(newRawJson);
            const newHistory = [...历史记录];
            newHistory[index] = {
                ...newHistory[index],
                structuredResponse: parsed,
                rawJson: newRawJson,
                content: "Parsed Content Updated" 
            };
            设置历史记录(newHistory);
        } catch (e) {
            console.error("Failed to update history", e);
        }
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
        const year = 1024 + Math.floor((环境.日期 || 0) / 365);
        const dayOfYear = (环境.日期 || 0) % 365;
        const month = Math.floor(dayOfYear / 30) + 1;
        const day = (dayOfYear % 30) + 1;
        const currentGameTime = `${year}年${month}月${day}日 ${环境.时间}`;

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
            // Use active prompts from state
            const systemPrompt = prompts
                .filter(p => p.启用)
                .map(p => p.内容)
                .join('\n\n');
            
            // Dynamic Context
            const contextMemory = `【长期记忆】\n${updatedMemSys.长期记忆.join('\n') || '暂无'}\n【中期记忆】\n${updatedMemSys.中期记忆.join('\n') || '暂无'}\n【短期记忆】\n${updatedMemSys.短期记忆.slice(-30).join('\n') || '暂无'}`;
            const contextNPC = `【当前场景NPC档案】\n${社交.map(npc => `姓名：${npc.姓名}\n身份：${npc.身份}\n性格：${npc.简介}\n记忆：${JSON.stringify(npc.记忆.slice(-5))}`).join('\n')}`;
            const contextWorldState = `【游戏数值设定 (GameState)】\n${JSON.stringify({ 角色, 环境, 世界, 玩家门派, 任务列表, 约定列表, 剧情 })}`;
            const contextImmediate = `【即时剧情回顾 (Script)】\n${formatHistoryToScript(updatedHistory)}`;
            const contextSettings = `【游戏设置】\n字数要求: ${gameConfig.字数要求}\n叙事人称: ${gameConfig.叙事人称}`;

            const finalSystemPrompt = `${systemPrompt}\n${contextMemory}\n${contextNPC}\n${contextSettings}\n${contextWorldState}`;

            // 5. Call AI Service
            const aiData = await aiService.generateStoryResponse(
                finalSystemPrompt,
                contextImmediate,
                `${content}\n\n${gameConfig.额外提示词}`,
                apiConfig,
                controller.signal
            );

            // 6. Process Result
            processResponseCommands(aiData);

            const newAiMsg: 聊天记录结构 = { 
                role: 'assistant', 
                content: "Structured Response", 
                structuredResponse: aiData,
                rawJson: JSON.stringify(aiData),
                timestamp: Date.now(),
                gameTime: currentGameTime
            };
            设置历史记录([...updatedHistory, newAiMsg]);
            
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

    const handleLoadGame = (save: 存档结构) => {
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
            if (save.提示词快照) setPrompts(save.提示词快照); // Restore world settings etc.
            
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
