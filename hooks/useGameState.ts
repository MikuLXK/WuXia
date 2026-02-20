
import { useState, useEffect, useRef } from 'react';
import { 
    角色数据结构,
    环境信息结构, 
    聊天记录结构, 
    接口设置结构,
    提示词结构,
    ThemePreset,
    视觉设置结构,
    节日结构,
    NPC结构,
    世界数据结构,
    详细门派结构,
    任务结构,
    约定结构,
    剧情系统结构,
    游戏设置结构,
    记忆配置结构,
    记忆系统结构,
    战斗状态结构,
    默认战斗状态
} from '../types';
import { 默认提示词 } from '../prompts';
import { 默认中期转长期提示词, 默认短期转中期提示词, 默认额外系统提示词 } from '../prompts/runtime/defaults';
import { 默认节日 } from '../data/world'; 
import * as dbService from '../services/dbService';
import { THEMES } from '../styles/themes';
import { 创建空接口设置, 规范化接口设置 } from '../utils/apiConfig';
import { estimateHistoryTokens } from '../utils/tokenEstimate';

export const useGameState = () => {
    const 创建空角色 = (): 角色数据结构 => ({
        姓名: '',
        性别: '男',
        年龄: 16,
        出生日期: '',
        外貌: '',
        称号: '',
        境界: '',
        天赋列表: [],
        出身背景: { 名称: '', 描述: '', 效果: '' },
        所属门派ID: 'none',
        门派职位: '无',
        门派贡献: 0,
        金钱: { 金元宝: 0, 银子: 0, 铜钱: 0 },
        当前精力: 0,
        最大精力: 0,
        当前饱腹: 0,
        最大饱腹: 0,
        当前口渴: 0,
        最大口渴: 0,
        当前负重: 0,
        最大负重: 0,
        力量: 0,
        敏捷: 0,
        体质: 0,
        根骨: 0,
        悟性: 0,
        福源: 0,
        头部当前血量: 0, 头部最大血量: 0, 头部状态: '',
        胸部当前血量: 0, 胸部最大血量: 0, 胸部状态: '',
        腹部当前血量: 0, 腹部最大血量: 0, 腹部状态: '',
        左手当前血量: 0, 左手最大血量: 0, 左手状态: '',
        右手当前血量: 0, 右手最大血量: 0, 右手状态: '',
        左腿当前血量: 0, 左腿最大血量: 0, 左腿状态: '',
        右腿当前血量: 0, 右腿最大血量: 0, 右腿状态: '',
        装备: {
            头部: '无', 胸部: '无', 腿部: '无', 手部: '无', 足部: '无',
            主武器: '无', 副武器: '无', 暗器: '无', 背部: '无', 腰部: '无', 坐骑: '无'
        },
        物品列表: [],
        功法列表: [],
        当前经验: 0,
        升级经验: 0,
        玩家BUFF: []
    });
    const 创建空环境 = (): 环境信息结构 => ({
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

    const 创建空世界 = (): 世界数据结构 => ({
        活跃NPC列表: [],
        地图: [],
        建筑: [],
        进行中事件: [],
        已结算事件: [],
        江湖史册: []
    });

    const 创建空门派 = (): 详细门派结构 => ({
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

    const 创建空剧情 = (): 剧情系统结构 => ({
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

    // View State
    const [view, setView] = useState<'home' | 'game' | 'new_game'>('home');
    const [hasSave, setHasSave] = useState(false);

    // Game State
    const [角色, 设置角色] = useState<角色数据结构>(() => 创建空角色());
    const [环境, 设置环境] = useState<环境信息结构>(() => 创建空环境());
    const [社交, 设置社交] = useState<NPC结构[]>([]);
    const [世界, 设置世界] = useState<世界数据结构>(() => 创建空世界()); 
    const [战斗, 设置战斗] = useState<战斗状态结构>(() => ({ ...默认战斗状态 }));
    const [玩家门派, 设置玩家门派] = useState<详细门派结构>(() => 创建空门派());
    const [任务列表, 设置任务列表] = useState<任务结构[]>([]);
    const [约定列表, 设置约定列表] = useState<约定结构[]>([]);
    const [剧情, 设置剧情] = useState<剧情系统结构>(() => 创建空剧情()); 

    // New Game State for Memory
    const [记忆系统, 设置记忆系统] = useState<记忆系统结构>({
        回忆档案: [],
        即时记忆: [],
        短期记忆: [],
        中期记忆: [],
        长期记忆: []
    });

    const [历史记录, 设置历史记录] = useState<聊天记录结构[]>([]);
    const [loading, setLoading] = useState(false);
    
    const [worldEvents, setWorldEvents] = useState<string[]>([]);
    
    // UI/System State
    const [showSettings, setShowSettings] = useState(false);
    const [showInventory, setShowInventory] = useState(false);
    const [showEquipment, setShowEquipment] = useState(false); 
    const [showSocial, setShowSocial] = useState(false);
    const [showTeam, setShowTeam] = useState(false); 
    const [showKungfu, setShowKungfu] = useState(false);
    const [showWorld, setShowWorld] = useState(false); 
    const [showMap, setShowMap] = useState(false);
    const [showSect, setShowSect] = useState(false);
    const [showTask, setShowTask] = useState(false);
    const [showAgreement, setShowAgreement] = useState(false);
    const [showStory, setShowStory] = useState(false);
    const [showMemory, setShowMemory] = useState(false);
    
    // Save/Load Modal
    const [showSaveLoad, setShowSaveLoad] = useState<{ show: boolean, mode: 'save' | 'load' }>({ show: false, mode: 'save' });

    const [activeTab, setActiveTab] = useState<'api' | 'recall' | 'prompt' | 'storage' | 'theme' | 'visual' | 'world' | 'game' | 'memory' | 'history' | 'context'>('api');
    
    // Config State
    const [apiConfig, setApiConfig] = useState<接口设置结构>(() => 创建空接口设置());
    const [visualConfig, setVisualConfig] = useState<视觉设置结构>({ 时间显示格式: '传统', 渲染层数: 30 });
    const 默认游戏设置: 游戏设置结构 = {
        字数要求: 450,
        叙事人称: '第二人称', 
        启用行动选项: true,
        额外提示词: 默认额外系统提示词
    };
    const 规范化游戏设置 = (raw?: Partial<游戏设置结构> | null): 游戏设置结构 => ({
        ...默认游戏设置,
        ...(raw || {}),
        字数要求: (() => {
            const candidate = raw?.字数要求 as unknown;
            if (typeof candidate === 'number' && Number.isFinite(candidate)) return Math.max(50, Math.floor(candidate));
            if (typeof candidate === 'string') {
                const n = Number(candidate.replace(/[^\d]/g, ''));
                if (Number.isFinite(n) && n > 0) return Math.max(50, Math.floor(n));
            }
            return 默认游戏设置.字数要求;
        })(),
        叙事人称: raw?.叙事人称 === '第一人称' || raw?.叙事人称 === '第二人称' || raw?.叙事人称 === '第三人称'
            ? raw.叙事人称
            : 默认游戏设置.叙事人称,
        启用行动选项: raw?.启用行动选项 !== false
    });
    const [gameConfig, setGameConfig] = useState<游戏设置结构>(默认游戏设置);

    const 默认记忆配置: 记忆配置结构 = {
        短期记忆阈值: 30,
        中期记忆阈值: 50,
        重要角色关键记忆条数N: 20,
        短期转中期提示词: 默认短期转中期提示词,
        中期转长期提示词: 默认中期转长期提示词
    };
    const 规范化记忆配置 = (raw?: Partial<记忆配置结构> | null): 记忆配置结构 => ({
        ...默认记忆配置,
        ...(raw || {}),
        短期记忆阈值: Math.max(5, Number(raw?.短期记忆阈值 ?? 默认记忆配置.短期记忆阈值) || 默认记忆配置.短期记忆阈值),
        中期记忆阈值: Math.max(20, Number(raw?.中期记忆阈值 ?? 默认记忆配置.中期记忆阈值) || 默认记忆配置.中期记忆阈值),
        重要角色关键记忆条数N: Math.max(1, Number(raw?.重要角色关键记忆条数N ?? 默认记忆配置.重要角色关键记忆条数N) || 默认记忆配置.重要角色关键记忆条数N)
    });
    
    const [memoryConfig, setMemoryConfig] = useState<记忆配置结构>(默认记忆配置);

    const [prompts, setPrompts] = useState<提示词结构[]>(默认提示词);
    const [festivals, setFestivals] = useState<节日结构[]>(默认节日);
    const [currentTheme, setCurrentTheme] = useState<ThemePreset>('ink');
    const [contextSize, setContextSize] = useState(0);

    const scrollRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Check for saves
    useEffect(() => {
        const checkSaves = async () => {
             try {
                 const saves = await dbService.读取存档列表();
                 setHasSave(saves.length > 0);
             } catch (e) { console.error(e); }
        };
        checkSaves();
    }, [view]);

    // Init Settings
    useEffect(() => {
        const init = async () => {
            try {
                const savedTheme = await dbService.读取设置('app_theme');
                if (savedTheme && THEMES[savedTheme as ThemePreset]) setCurrentTheme(savedTheme as ThemePreset);
                const savedApi = await dbService.读取设置('api_settings');
                if (savedApi) {
                    setApiConfig(规范化接口设置(savedApi));
                } else {
                    setApiConfig(创建空接口设置());
                }
                const savedPrompts = await dbService.读取设置('prompts');
                if (savedPrompts) setPrompts(savedPrompts as 提示词结构[]);
                const savedFestivals = await dbService.读取设置('festivals');
                if (savedFestivals) setFestivals(savedFestivals as 节日结构[]);
                const savedVisual = await dbService.读取设置('visual_settings');
                if (savedVisual) setVisualConfig(savedVisual as 视觉设置结构);
                
                // New Settings
                const savedGameConfig = await dbService.读取设置('game_settings');
                if (savedGameConfig) setGameConfig(规范化游戏设置(savedGameConfig as Partial<游戏设置结构>));
                const savedMemoryConfig = await dbService.读取设置('memory_settings');
                if (savedMemoryConfig) setMemoryConfig(规范化记忆配置(savedMemoryConfig as Partial<记忆配置结构>));

            } catch (e) { console.error(e); }
        };
        init();
    }, []);

    // Theme Application
    useEffect(() => {
        const themeVars = THEMES[currentTheme];
        const root = document.documentElement;
        Object.entries(themeVars).forEach(([key, val]) => root.style.setProperty(key, val));
        dbService.保存设置('app_theme', currentTheme);
    }, [currentTheme]);

    // Scroll & Context Size
    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        setContextSize(estimateHistoryTokens(历史记录));
    }, [历史记录]);

    return {
        // State
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
        showSaveLoad, setShowSaveLoad, // New
        activeTab, setActiveTab,
        
        // Configs
        apiConfig, setApiConfig,
        visualConfig, setVisualConfig,
        gameConfig, setGameConfig, 
        memoryConfig, setMemoryConfig, 
        
        prompts, setPrompts,
        festivals, setFestivals,
        currentTheme, setCurrentTheme,
        contextSize, setContextSize,
        scrollRef, abortControllerRef
    };
};
