import React, { useEffect, useMemo, useRef, useState } from 'react';
import GameButton from '../../../ui/GameButton';
import { WorldGenConfig, 角色数据结构, 天赋结构, 背景结构, 游戏难度 } from '../../../../types';
import { 预设天赋, 预设背景 } from '../../../../data/presets';
import { OrnateBorder } from '../../../ui/decorations/OrnateBorder';
import * as dbService from '../../../../services/dbService';

interface Props {
    onComplete: (
        worldConfig: WorldGenConfig, 
        charData: 角色数据结构, 
        mode: 'all' | 'step',
        openingStreaming: boolean
    ) => void;
    onCancel: () => void;
    loading: boolean;
    requestConfirm?: (options: { title?: string; message: string; confirmText?: string; cancelText?: string; danger?: boolean }) => Promise<boolean>;
}

const STEPS = ['世界观', '角色基础', '天赋背景', '确认生成'];
const 自定义天赋存储键 = 'new_game_custom_talents';
const 自定义背景存储键 = 'new_game_custom_backgrounds';

type DropdownProps = {
    value: number;
    options: number[];
    suffix: string;
    open: boolean;
    onToggle: () => void;
    onSelect: (next: number) => void;
    containerRef: React.RefObject<HTMLDivElement>;
};

const CompactDropdown: React.FC<DropdownProps> = ({
    value,
    options,
    suffix,
    open,
    onToggle,
    onSelect,
    containerRef,
}) => (
    <div className="relative" ref={containerRef}>
        <button
            type="button"
            onClick={onToggle}
            className="w-full bg-black/40 border border-gray-600 p-3 text-white outline-none focus:border-wuxia-gold rounded-md flex items-center justify-between gap-2"
        >
            <span className="font-mono text-sm">{value}{suffix}</span>
            <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
            >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
            </svg>
        </button>
        {open && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-black/95 border border-gray-700 rounded-md shadow-[0_12px_30px_rgba(0,0,0,0.6)] z-50">
                <div className="max-h-[336px] overflow-y-auto custom-scrollbar py-1">
                    {options.map((opt) => (
                        <button
                            key={opt}
                            type="button"
                            onClick={() => onSelect(opt)}
                            className={`w-full px-3 h-7 flex items-center text-sm font-mono transition-colors ${
                                opt === value ? 'bg-wuxia-gold/20 text-wuxia-gold' : 'text-gray-300 hover:bg-white/5'
                            }`}
                        >
                            {opt}{suffix}
                        </button>
                    ))}
                </div>
            </div>
        )}
    </div>
);

const MobileNewGameWizard: React.FC<Props> = ({ onComplete, onCancel, loading, requestConfirm }) => {
    const [step, setStep] = useState(0);

    // --- State: World Config ---
    const [worldConfig, setWorldConfig] = useState<WorldGenConfig>({
        worldName: '太古界',
        powerLevel: '中武',
        worldSize: '九州宏大',
        dynastySetting: '群雄逐鹿，王朝末年',
        sectDensity: '林立',
        tianjiaoSetting: '大争之世，天骄并起',
        difficulty: 'normal' as 游戏难度 // Default difficulty
    });

    // --- State: Character Config ---
    const [charName, setCharName] = useState('');
    const [charGender, setCharGender] = useState<'男' | '女'>('男');
    const [charAge, setCharAge] = useState(18);
    const [charAppearance, setCharAppearance] = useState('黑发黑眸，面容清秀，衣着朴素利落。');
    const [birthMonth, setBirthMonth] = useState(1);
    const [birthDay, setBirthDay] = useState(1);
    const [monthOpen, setMonthOpen] = useState(false);
    const [dayOpen, setDayOpen] = useState(false);
    const monthRef = useRef<HTMLDivElement>(null);
    const dayRef = useRef<HTMLDivElement>(null);
    
    // Attributes (Total 30 points to distribute)
    const MAX_POINTS = 30;
    const [stats, setStats] = useState({
        力量: 5, 敏捷: 5, 体质: 5, 根骨: 5, 悟性: 5, 福源: 5
    });

    // Talents & Background
    const [selectedBackground, setSelectedBackground] = useState<背景结构>(预设背景[0]);
    const [selectedTalents, setSelectedTalents] = useState<天赋结构[]>([]);
    const [自定义天赋列表, 设置自定义天赋列表] = useState<天赋结构[]>([]);
    const [自定义背景列表, 设置自定义背景列表] = useState<背景结构[]>([]);
    
    // Custom Inputs
    const [customTalent, setCustomTalent] = useState<天赋结构>({ 名称: '', 描述: '', 效果: '' });
    const [showCustomTalent, setShowCustomTalent] = useState(false);
    const [customBackground, setCustomBackground] = useState<背景结构>({ 名称: '', 描述: '', 效果: '' });
    const [showCustomBackground, setShowCustomBackground] = useState(false);
    const [openingStreaming, setOpeningStreaming] = useState(true);

    // --- Logic ---
    const monthOptions = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
    const dayOptions = useMemo(() => Array.from({ length: 31 }, (_, i) => i + 1), []);
    const 标准化天赋 = (raw: 天赋结构): 天赋结构 | null => {
        const 名称 = raw?.名称?.trim() || '';
        const 描述 = raw?.描述?.trim() || '';
        const 效果 = raw?.效果?.trim() || '';
        if (!名称 || !描述 || !效果) return null;
        return { 名称, 描述, 效果 };
    };
    const 标准化背景 = (raw: 背景结构): 背景结构 | null => {
        const 名称 = raw?.名称?.trim() || '';
        const 描述 = raw?.描述?.trim() || '';
        const 效果 = raw?.效果?.trim() || '';
        if (!名称 || !描述 || !效果) return null;
        return { 名称, 描述, 效果 };
    };
    const 合并去重天赋 = (rawList: 天赋结构[]): 天赋结构[] => {
        const map = new Map<string, 天赋结构>();
        rawList.forEach((item) => {
            const normalized = 标准化天赋(item);
            if (!normalized) return;
            map.set(normalized.名称, normalized);
        });
        return Array.from(map.values());
    };
    const 合并去重背景 = (rawList: 背景结构[]): 背景结构[] => {
        const map = new Map<string, 背景结构>();
        rawList.forEach((item) => {
            const normalized = 标准化背景(item);
            if (!normalized) return;
            map.set(normalized.名称, normalized);
        });
        return Array.from(map.values());
    };
    const 全部背景选项 = useMemo(
        () => [...预设背景, ...自定义背景列表.filter(item => !预设背景.some(p => p.名称 === item.名称))],
        [自定义背景列表]
    );
    const 全部天赋选项 = useMemo(
        () => [...预设天赋, ...自定义天赋列表.filter(item => !预设天赋.some(p => p.名称 === item.名称))],
        [自定义天赋列表]
    );
    
    const usedPoints = Object.values(stats).reduce((a, b) => a + b, 0);
    const remainingPoints = MAX_POINTS - usedPoints;
    const stepProgress = ((step + 1) / STEPS.length) * 100;
    const currentStepLabel = STEPS[step] || '创建';

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (monthRef.current && monthRef.current.contains(target)) return;
            if (dayRef.current && dayRef.current.contains(target)) return;
            setMonthOpen(false);
            setDayOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const 加载自定义建角配置 = async () => {
            try {
                const savedTalents = await dbService.读取设置(自定义天赋存储键);
                const savedBackgrounds = await dbService.读取设置(自定义背景存储键);
                if (Array.isArray(savedTalents)) {
                    设置自定义天赋列表(合并去重天赋(savedTalents as 天赋结构[]));
                }
                if (Array.isArray(savedBackgrounds)) {
                    设置自定义背景列表(合并去重背景(savedBackgrounds as 背景结构[]));
                }
            } catch (error) {
                console.error('加载自定义身份/天赋失败', error);
            }
        };
        加载自定义建角配置();
    }, []);

    const handleStatChange = (key: keyof typeof stats, delta: number) => {
        const current = stats[key];
        if (delta > 0 && remainingPoints <= 0) return;
        if (delta < 0 && current <= 1) return;
        setStats({ ...stats, [key]: current + delta });
    };

    const toggleTalent = (t: 天赋结构) => {
        if (selectedTalents.find(x => x.名称 === t.名称)) {
            setSelectedTalents(selectedTalents.filter(x => x.名称 !== t.名称));
        } else {
            if (selectedTalents.length >= 3) {
                alert("最多选择3个天赋");
                return;
            }
            setSelectedTalents([...selectedTalents, t]);
        }
    };

    const addCustomTalent = async () => {
        const normalized = 标准化天赋(customTalent);
        if (!normalized) {
            alert("请完整填写自定义天赋（名称/描述/效果）");
            return;
        }
        const 已选同名 = selectedTalents.some(x => x.名称 === normalized.名称);
        if (!已选同名 && selectedTalents.length >= 3) {
            alert("最多选择3个天赋");
            return;
        }

        const 下一个自定义天赋列表 = 合并去重天赋([...自定义天赋列表, normalized]);
        设置自定义天赋列表(下一个自定义天赋列表);
        setSelectedTalents(
            已选同名
                ? selectedTalents.map(item => (item.名称 === normalized.名称 ? normalized : item))
                : [...selectedTalents, normalized]
        );
        setCustomTalent({ 名称: '', 描述: '', 效果: '' });
        setShowCustomTalent(false);
        try {
            await dbService.保存设置(自定义天赋存储键, 下一个自定义天赋列表);
        } catch (error) {
            console.error('保存自定义天赋失败', error);
        }
    };

    const addCustomBackground = async () => {
        const 名称 = customBackground.名称.trim();
        const 描述 = customBackground.描述.trim();
        const 效果 = customBackground.效果.trim();
        if (!名称 || !描述 || !效果) {
            alert("请完整填写自定义身份（名称/描述/效果）");
            return;
        }
        const nextBg: 背景结构 = { 名称, 描述, 效果 };
        const 下一个自定义背景列表 = 合并去重背景([...自定义背景列表, nextBg]);
        设置自定义背景列表(下一个自定义背景列表);
        setSelectedBackground(nextBg);
        setCustomBackground({ 名称: '', 描述: '', 效果: '' });
        setShowCustomBackground(false);
        try {
            await dbService.保存设置(自定义背景存储键, 下一个自定义背景列表);
        } catch (error) {
            console.error('保存自定义身份失败', error);
        }
    };

    const handleGenerate = async () => {
        if (!charName.trim()) {
            alert("请先填写角色姓名");
            setStep(1);
            return;
        }

        // Construct final character data object
        const charData: 角色数据结构 = {
            // Format birthday string from state
            出生日期: `1024:${String(birthMonth).padStart(2, '0')}:${String(birthDay).padStart(2, '0')}`,

            ...stats as any, // 力量, 敏捷 etc.
            姓名: charName.trim(),
            性别: charGender,
            年龄: charAge,
            外貌: charAppearance.trim() || '相貌平常，衣着朴素。',
            天赋列表: selectedTalents,
            出身背景: selectedBackground,
            
            // Defaults
            称号: "初出茅庐", 境界: "凡人",
            所属门派ID: "none", 门派职位: "无", 门派贡献: 0,
            当前精力: 100, 最大精力: 100,
            当前饱腹: 80, 最大饱腹: 100,
            当前口渴: 80, 最大口渴: 100,
            当前负重: 0, 最大负重: 100 + (stats.力量 * 10),
            
            头部当前血量: 100, 头部最大血量: 100, 头部状态: "正常",
            胸部当前血量: 100, 胸部最大血量: 100, 胸部状态: "正常",
            腹部当前血量: 100, 腹部最大血量: 100, 腹部状态: "正常",
            左手当前血量: 100, 左手最大血量: 100, 左手状态: "正常",
            右手当前血量: 100, 右手最大血量: 100, 右手状态: "正常",
            左腿当前血量: 100, 左腿最大血量: 100, 左腿状态: "正常",
            右腿当前血量: 100, 右腿最大血量: 100, 右腿状态: "正常",
            
            装备: { 头部: "无", 胸部: "无", 腿部: "无", 手部: "无", 足部: "无", 主武器: "无", 副武器: "无", 暗器: "无", 背部: "无", 腰部: "无", 坐骑: "无" },
            物品列表: [], 功法列表: [],
            当前经验: 0, 升级经验: 100, 玩家BUFF: []
        };
        
        const streamStatus = openingStreaming ? '开启' : '关闭';
        const confirmText = `开场剧情流式传输当前为【${streamStatus}】。\n开启后会边生成边展示，关闭则等待整段返回。\n是否继续创建？`;
        const ok = requestConfirm
            ? await requestConfirm({
                title: '确认创建',
                message: confirmText,
                confirmText: '开始生成'
            })
            : true;
        if (!ok) return;
        onComplete(worldConfig, charData, 'all', openingStreaming);
    };

    if (loading) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center bg-black/90 text-wuxia-gold z-50">
                <div className="text-2xl font-serif font-bold animate-pulse mb-2">正在生成...</div>
                <div className="text-xs font-mono text-gray-500">请稍候</div>
            </div>
        );
    }

    return (
        <div className="h-full w-full flex flex-col items-center justify-center bg-ink-black/95 relative overflow-hidden p-2 z-50 md:hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-20 pointer-events-none"></div>
            
            {/* Main Container */}
            <div className="w-full max-w-[620px] h-[86vh] border border-wuxia-gold/30 rounded-2xl bg-black/50 shadow-2xl flex flex-col overflow-hidden relative backdrop-blur-sm">
                 
                {/* Header Steps */}
                <div className="hidden md:flex h-16 border-b border-gray-800 items-center justify-between px-8 bg-black/40">
                    <h2 className="text-2xl font-serif font-bold text-wuxia-gold">创世录</h2>
                    <div className="flex gap-2">
                        {STEPS.map((s, idx) => (
                            <div key={idx} className={`flex items-center gap-2 ${idx === step ? 'text-wuxia-gold' : 'text-gray-600'}`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${idx === step ? 'border-wuxia-gold bg-wuxia-gold/20' : 'border-gray-700'}`}>
                                    {idx + 1}
                                </div>
                                <span className="text-xs font-bold hidden md:block">{s}</span>
                                {idx < STEPS.length - 1 && <div className="w-8 h-px bg-gray-800 hidden md:block"></div>}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="md:hidden border-b border-gray-800 bg-black/50 px-4 py-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-serif font-bold text-wuxia-gold tracking-wider">创世录</h2>
                        <span className="text-[11px] text-gray-400 font-mono">{step + 1}/{STEPS.length}</span>
                    </div>
                    <div className="mt-2 text-xs text-wuxia-cyan font-bold tracking-widest">{currentStepLabel}</div>
                    <div className="mt-2 h-1 w-full bg-black/60 border border-gray-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-wuxia-gold transition-all duration-300"
                            style={{ width: `${stepProgress}%` }}
                        ></div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 bg-ink-wash/5 relative">
                    
                    {/* STEP 1: WORLD SETTINGS */}
                    {step === 0 && (
                        <div className="animate-slide-in max-w-4xl mx-auto">
                            <OrnateBorder className="p-4 md:p-8">
                                <h3 className="text-xl font-serif font-bold text-wuxia-gold border-b border-wuxia-gold/30 pb-3 mb-6">世界法则设定</h3>
                                
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm text-wuxia-cyan font-bold">世界名称</label>
                                            <input 
                                                value={worldConfig.worldName}
                                                onChange={e => setWorldConfig({...worldConfig, worldName: e.target.value})}
                                                className="w-full bg-black/50 border-2 border-transparent focus:border-wuxia-gold p-3 text-white outline-none rounded-md transition-all font-serif tracking-wider"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm text-wuxia-cyan font-bold">游戏难度</label>
                                            <select 
                                                value={worldConfig.difficulty}
                                                onChange={e => setWorldConfig({...worldConfig, difficulty: e.target.value as 游戏难度})}
                                                className="w-full bg-black/40 border border-gray-600 p-3 text-white outline-none focus:border-wuxia-gold rounded-md"
                                            >
                                                <option value="relaxed">轻松 (剧情模式)</option>
                                                <option value="easy">简单 (初入江湖)</option>
                                                <option value="normal">正常 (标准体验)</option>
                                                <option value="hard">困难 (刀光剑影)</option>
                                                <option value="extreme">极限 (修罗炼狱)</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm text-wuxia-cyan font-bold">武力层次</label>
                                            <select 
                                                value={worldConfig.powerLevel}
                                                onChange={e => setWorldConfig({...worldConfig, powerLevel: e.target.value as any})}
                                                className="w-full bg-black/40 border border-gray-600 p-3 text-white outline-none focus:border-wuxia-gold rounded-md"
                                            >
                                                <option value="低武">低武 (拳脚兵刃)</option>
                                                <option value="中武">中武 (内气外放)</option>
                                                <option value="高武">高武 (搬山填海)</option>
                                                <option value="修仙">修仙 (长生久视)</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm text-wuxia-cyan font-bold">世界版图</label>
                                            <select 
                                                value={worldConfig.worldSize}
                                                onChange={e => setWorldConfig({...worldConfig, worldSize: e.target.value as any})}
                                                className="w-full bg-black/40 border border-gray-600 p-3 text-white outline-none focus:border-wuxia-gold rounded-md"
                                            >
                                                <option value="弹丸之地">弹丸之地 (一岛或一城)</option>
                                                <option value="九州宏大">九州宏大 (万里河山)</option>
                                                <option value="无尽位面">无尽位面 (多重世界)</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm text-wuxia-cyan font-bold">宗门密度</label>
                                            <select 
                                                value={worldConfig.sectDensity}
                                                onChange={e => setWorldConfig({...worldConfig, sectDensity: e.target.value as any})}
                                                className="w-full bg-black/40 border border-gray-600 p-3 text-white outline-none focus:border-wuxia-gold rounded-md"
                                            >
                                                <option value="稀少">稀少 (隐世不出)</option>
                                                <option value="适中">适中 (数大宗门)</option>
                                                <option value="林立">林立 (百家争鸣)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm text-wuxia-cyan font-bold">王朝局势 (自定义)</label>
                                        <input 
                                            value={worldConfig.dynastySetting}
                                            onChange={e => setWorldConfig({...worldConfig, dynastySetting: e.target.value})}
                                            className="w-full bg-black/50 border-2 border-transparent focus:border-wuxia-gold p-3 text-white outline-none rounded-md transition-all font-serif tracking-wider"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm text-wuxia-cyan font-bold">天骄/战力设定 (自定义)</label>
                                        <textarea 
                                            value={worldConfig.tianjiaoSetting}
                                            onChange={e => setWorldConfig({...worldConfig, tianjiaoSetting: e.target.value})}
                                            className="w-full h-24 bg-black/50 border-2 border-transparent focus:border-wuxia-gold p-3 text-white outline-none rounded-md transition-all resize-none"
                                        />
                                    </div>
                                </div>
                            </OrnateBorder>
                        </div>
                    )}

                    {/* STEP 2: CHARACTER BASIC */}
                    {step === 1 && (
                        <div className="animate-slide-in max-w-4xl mx-auto">
                            <h3 className="text-lg md:text-xl font-serif font-bold text-wuxia-gold border-b border-wuxia-gold/30 pb-3 mb-6">侠客名录</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                                {/* Left: Info */}
                                <div className="md:col-span-2 space-y-6">
                                    <OrnateBorder className="p-6">
                                        <div className="space-y-2">
                                            <label className="text-sm text-wuxia-cyan font-bold">姓名</label>
                                            <input
                                                value={charName}
                                                onChange={e => setCharName(e.target.value)}
                                                placeholder="在此输入你的名号"
                                                className="w-full bg-black/50 border-2 border-transparent focus:border-wuxia-gold p-3 text-white outline-none rounded-md transition-all font-serif tracking-wider"
                                            />
                                        </div>
                                    </OrnateBorder>
                                    
                                    <OrnateBorder className="p-6">
                                        <div className="space-y-4">
                                             <div className="space-y-2">
                                                <label className="text-sm text-wuxia-cyan font-bold">性别</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button onClick={() => setCharGender('男')} className={`p-3 rounded text-center transition-all ${charGender === '男' ? 'bg-wuxia-gold/20 text-wuxia-gold border-wuxia-gold border' : 'bg-black/40 border border-transparent hover:border-gray-600'}`}>男</button>
                                                    <button onClick={() => setCharGender('女')} className={`p-3 rounded text-center transition-all ${charGender === '女' ? 'bg-wuxia-gold/20 text-wuxia-gold border-wuxia-gold border' : 'bg-black/40 border border-transparent hover:border-gray-600'}`}>女</button>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm text-wuxia-cyan font-bold">诞辰</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <CompactDropdown
                                                        value={birthMonth}
                                                        options={monthOptions}
                                                        suffix="月"
                                                        open={monthOpen}
                                                        onToggle={() => {
                                                            setMonthOpen((prev) => !prev);
                                                            setDayOpen(false);
                                                        }}
                                                        onSelect={(next) => {
                                                            setBirthMonth(next);
                                                            setMonthOpen(false);
                                                        }}
                                                        containerRef={monthRef}
                                                    />
                                                    <CompactDropdown
                                                        value={birthDay}
                                                        options={dayOptions}
                                                        suffix="日"
                                                        open={dayOpen}
                                                        onToggle={() => {
                                                            setDayOpen((prev) => !prev);
                                                            setMonthOpen(false);
                                                        }}
                                                        onSelect={(next) => {
                                                            setBirthDay(next);
                                                            setDayOpen(false);
                                                        }}
                                                        containerRef={dayRef}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </OrnateBorder>
                                    <OrnateBorder className="p-6">
                                        <div className="space-y-2">
                                             <label className="text-sm text-wuxia-cyan font-bold">年龄</label>
                                             <div className='flex items-center gap-4'>
                                                <input type="number" min={14} max={100} value={charAge} onChange={e => setCharAge(parseInt(e.target.value))} className="w-full bg-black/50 border-2 border-transparent focus:border-wuxia-gold p-3 text-white outline-none rounded-md transition-all font-serif tracking-wider" />
                                             </div>
                                         </div>
                                     </OrnateBorder>
                                    <OrnateBorder className="p-6">
                                        <div className="space-y-2">
                                            <label className="text-sm text-wuxia-cyan font-bold">外貌</label>
                                            <textarea
                                                value={charAppearance}
                                                onChange={e => setCharAppearance(e.target.value)}
                                                placeholder="描述角色外貌、气质与常见穿着"
                                                className="w-full h-24 bg-black/50 border-2 border-transparent focus:border-wuxia-gold p-3 text-white outline-none rounded-md transition-all resize-none"
                                            />
                                        </div>
                                    </OrnateBorder>
                                </div>

                                {/* Right: Stats */}
                                <div className="md:col-span-3">
                                    <OrnateBorder className="h-full">
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="text-wuxia-gold font-bold text-lg">天资根骨</span>
                                            <span className={`text-sm font-mono transition-colors ${remainingPoints > 0 ? 'text-green-400' : 'text-gray-500'}`}>剩余点数: {remainingPoints}</span>
                                        </div>
                                        <div className="space-y-4 pt-4 border-t border-wuxia-gold/20">
                                            {Object.entries(stats).map(([key, val]) => (
                                                <div key={key} className="flex items-center justify-between">
                                                    <span className="text-gray-300 text-base font-serif w-16">{key}</span>
                                                    <div className="flex items-center gap-3">
                                                        <button onClick={() => handleStatChange(key as any, -1)} className="w-8 h-8 bg-gray-800 text-gray-400 hover:text-white rounded-md disabled:opacity-50" disabled={val <=1}>-</button>
                                                        <span className="w-8 text-center text-wuxia-cyan font-bold text-lg">{val}</span>
                                                        <button onClick={() => handleStatChange(key as any, 1)} className="w-8 h-8 bg-gray-800 text-gray-400 hover:text-white rounded-md disabled:opacity-50" disabled={remainingPoints <= 0}>+</button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </OrnateBorder>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: TALENTS & BACKGROUND */}
                    {step === 2 && (
                        <div className="space-y-8 animate-slide-in max-w-5xl mx-auto">
                             
                             {/* Backgrounds */}
                             <OrnateBorder className="p-6">
                                <div className="flex justify-between items-center border-b border-wuxia-gold/30 pb-3 mb-4">
                                    <h3 className="text-xl font-serif font-bold text-wuxia-gold">身份背景 (单选)</h3>
                                    <button onClick={() => setShowCustomBackground(!showCustomBackground)} className="text-xs text-wuxia-cyan hover:underline">+ 自定义身份</button>
                                </div>
                                {showCustomBackground && (
                                    <div className="bg-black/40 border border-wuxia-cyan/30 p-4 mb-4 rounded-lg space-y-3">
                                        <input
                                            placeholder="身份名称（例：江南王世子）"
                                            value={customBackground.名称}
                                            onChange={e => setCustomBackground({ ...customBackground, 名称: e.target.value })}
                                            className="w-full bg-black/50 border-2 border-transparent focus:border-wuxia-cyan p-2 text-xs text-white outline-none rounded-md transition-all"
                                        />
                                        <input
                                            placeholder="身份描述"
                                            value={customBackground.描述}
                                            onChange={e => setCustomBackground({ ...customBackground, 描述: e.target.value })}
                                            className="w-full bg-black/50 border-2 border-transparent focus:border-wuxia-cyan p-2 text-xs text-white outline-none rounded-md transition-all"
                                        />
                                        <input
                                            placeholder="身份效果"
                                            value={customBackground.效果}
                                            onChange={e => setCustomBackground({ ...customBackground, 效果: e.target.value })}
                                            className="w-full bg-black/50 border-2 border-transparent focus:border-wuxia-cyan p-2 text-xs text-white outline-none rounded-md transition-all"
                                        />
                                        <GameButton onClick={addCustomBackground} variant="secondary" className="w-full py-1 text-xs">保存并使用自定义身份</GameButton>
                                    </div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {全部背景选项.map((bg, idx) => (
                                        <div 
                                            key={idx} 
                                            onClick={() => setSelectedBackground(bg)}
                                            className={`p-4 border rounded-lg cursor-pointer transition-all duration-300 transform hover:-translate-y-1 ${
                                                selectedBackground.名称 === bg.名称 
                                                ? 'border-wuxia-gold bg-wuxia-gold/10 shadow-lg shadow-wuxia-gold/10' 
                                                : 'border-gray-700 bg-black/20 hover:border-wuxia-gold/50'
                                            }`}
                                        >
                                            <div className={`font-bold text-sm ${selectedBackground.名称 === bg.名称 ? 'text-wuxia-gold' : 'text-gray-300'}`}>
                                                {bg.名称}
                                                {!预设背景.some(p => p.名称 === bg.名称) ? ' (自定义)' : ''}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">{bg.描述}</div>
                                            <div className="text-xs text-wuxia-cyan/80 mt-2 pt-2 border-t border-gray-700/50 font-mono">{bg.效果}</div>
                                        </div>
                                    ))}
                                    {!全部背景选项.find(bg => bg.名称 === selectedBackground.名称) && (
                                        <div 
                                            onClick={() => setSelectedBackground(selectedBackground)}
                                            className="p-4 border rounded-lg cursor-pointer transition-all duration-300 transform hover:-translate-y-1 border-wuxia-cyan bg-wuxia-cyan/10 shadow-lg shadow-wuxia-cyan/10"
                                        >
                                            <div className="font-bold text-sm text-wuxia-cyan">{selectedBackground.名称} (自定义)</div>
                                            <div className="text-xs text-gray-500 mt-1">{selectedBackground.描述}</div>
                                            <div className="text-xs text-wuxia-cyan/80 mt-2 pt-2 border-t border-gray-700/50 font-mono">{selectedBackground.效果}</div>
                                        </div>
                                    )}
                                </div>
                             </OrnateBorder>

                             {/* Talents */}
                             <OrnateBorder className="p-6">
                                <div className="flex justify-between items-center border-b border-wuxia-gold/30 pb-3 mb-4">
                                    <h3 className="text-xl font-serif font-bold text-wuxia-gold">天赋选择 (最多3个)</h3>
                                    <button onClick={() => setShowCustomTalent(!showCustomTalent)} className="text-xs text-wuxia-cyan hover:underline">+ 自定义天赋</button>
                                </div>
                                
                                {showCustomTalent && (
                                    <div className="bg-black/40 border border-wuxia-cyan/30 p-4 mb-4 rounded-lg space-y-3">
                                        <div className="flex gap-2">
                                            <input placeholder="天赋名称" value={customTalent.名称} onChange={e => setCustomTalent({...customTalent, 名称: e.target.value})} className="w-full bg-black/50 border-2 border-transparent focus:border-wuxia-cyan p-2 text-xs text-white outline-none rounded-md transition-all flex-1" />
                                            <input placeholder="效果 (e.g. 攻击+10)" value={customTalent.效果} onChange={e => setCustomTalent({...customTalent, 效果: e.target.value})} className="w-full bg-black/50 border-2 border-transparent focus:border-wuxia-cyan p-2 text-xs text-white outline-none rounded-md transition-all flex-1" />
                                        </div>
                                        <input placeholder="描述" value={customTalent.描述} onChange={e => setCustomTalent({...customTalent, 描述: e.target.value})} className="w-full bg-black/50 border-2 border-transparent focus:border-wuxia-cyan p-2 text-xs text-white outline-none rounded-md transition-all" />
                                        <GameButton onClick={addCustomTalent} variant="secondary" className="w-full py-1 text-xs">添加</GameButton>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {全部天赋选项.map((t, idx) => {
                                        const isSelected = !!selectedTalents.find(x => x.名称 === t.名称);
                                        return (
                                            <div 
                                                key={idx} 
                                                onClick={() => toggleTalent(t)}
                                                className={`p-4 border rounded-lg cursor-pointer transition-all duration-300 transform hover:-translate-y-1 ${
                                                    isSelected 
                                                    ? 'border-wuxia-red bg-wuxia-red/10 shadow-lg shadow-wuxia-red/10' 
                                                    : 'border-gray-700 bg-black/20 hover:border-wuxia-red/50'
                                                }`}
                                            >
                                                <div className={`font-bold text-sm ${isSelected ? 'text-wuxia-red' : 'text-gray-300'}`}>
                                                    {t.名称}
                                                    {!预设天赋.some(p => p.名称 === t.名称) ? ' (自定义)' : ''}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1 line-clamp-2" title={t.描述}>{t.描述}</div>
                                                <div className="text-xs text-wuxia-cyan/80 mt-2 pt-2 border-t border-gray-700/50 font-mono">{t.效果}</div>
                                            </div>
                                        )
                                    })}
                                </div>
                             </OrnateBorder>
                        </div>
                    )}

                    {/* STEP 4: CONFIRMATION */}
                    {step === 3 && (
                        <div className="h-full flex flex-col items-center justify-center animate-fadeIn space-y-8">
                            <div className="text-center">
                                <h2 className="text-3xl font-serif font-black text-wuxia-gold mb-2">天道既定</h2>
                                <p className="text-gray-400 text-sm">一切准备就绪，即将推演这方世界。</p>
                            </div>

                            <OrnateBorder className="max-w-lg w-full p-6">
                                <div className="text-sm space-y-3 font-mono text-gray-300">
                                    <p>世界: <span className="text-white">{worldConfig.worldName}</span> <span className='text-gray-500'>({worldConfig.powerLevel})</span></p>
                                    <p>难度: <span className="text-white uppercase">{worldConfig.difficulty}</span></p>
                                    <p>主角: <span className="text-white">{charName.trim() || '未填写姓名'}</span> <span className='text-gray-500'>({charGender}, {charAge}岁)</span></p>
                                    <p>外貌: <span className="text-white">{charAppearance.trim() || '未填写'}</span></p>
                                    <p>身份: <span className="text-white">{selectedBackground.名称}</span></p>
                                    <p>天赋: <span className="text-white">{selectedTalents.map(t => t.名称).join(', ') || '无'}</span></p>
                                </div>
                            </OrnateBorder>

                            <OrnateBorder className="w-full max-w-lg p-4">
                                <div className="flex items-center justify-between w-full">
                                    <div>
                                        <div className="text-xs text-gray-300 font-bold tracking-widest">开场剧情流式传输</div>
                                        <div className="text-[11px] text-gray-500 mt-1">开启后会实时显示开场生成内容；关闭则一次性返回完整 JSON。</div>
                                    </div>
                                    <button
                                        onClick={() => setOpeningStreaming(!openingStreaming)}
                                        className={`w-12 h-7 rounded-full border transition-all relative ${openingStreaming ? 'border-wuxia-cyan bg-wuxia-cyan/20' : 'border-gray-600 bg-black/40'}`}
                                        title={openingStreaming ? '开场流式开启' : '开场流式关闭'}
                                    >
                                        <span
                                            className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full transition-all ${openingStreaming ? 'left-6 bg-wuxia-cyan' : 'left-1 bg-gray-500'}`}
                                        />
                                    </button>
                                </div>
                            </OrnateBorder>

                            <div className="text-center text-[11px] text-gray-500">
                                请在底部点击“一键生成”开始入世
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer Nav */}
                <div className="hidden md:flex h-16 border-t border-gray-800 bg-black/40 items-center justify-between px-8">
                    {step > 0 ? (

                        <GameButton onClick={() => setStep(step - 1)} variant="secondary" className="px-6 py-2 border-opacity-50 opacity-80 hover:opacity-100">
                            &larr; 上一步
                        </GameButton>
                    ) : (

                        <GameButton onClick={onCancel} variant="secondary" className="px-6 py-2 !border-red-500/50 !text-red-500/80 hover:!bg-red-500/10 hover:!text-red-500">
                            取消
                        </GameButton>
                    )}

                    {step < STEPS.length - 1 ? (
                        <GameButton onClick={() => setStep(step + 1)} variant="primary" className="px-6 py-2">
                            下一步 &rarr;
                        </GameButton>
                    ) : null}
                </div>
                <div className="md:hidden border-t border-gray-800 bg-black/60 px-3 py-3 pb-[calc(env(safe-area-inset-bottom)+10px)]">
                    <div className="flex items-center gap-2">
                        {step > 0 ? (
                            <GameButton onClick={() => setStep(step - 1)} variant="secondary" className="flex-1 py-2 text-xs">
                                上一步
                            </GameButton>
                        ) : (
                            <GameButton onClick={onCancel} variant="secondary" className="flex-1 py-2 text-xs !border-red-500/50 !text-red-400">
                                取消
                            </GameButton>
                        )}
                        {step < STEPS.length - 1 ? (
                            <GameButton onClick={() => setStep(step + 1)} variant="primary" className="flex-1 py-2 text-xs">
                                下一步
                            </GameButton>
                        ) : (
                            <GameButton onClick={() => { void handleGenerate(); }} variant="primary" className="flex-1 py-2 text-xs">
                                一键生成
                            </GameButton>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default MobileNewGameWizard;
