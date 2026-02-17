
import React, { useState } from 'react';
import GameButton from '../../ui/GameButton';
import { WorldGenConfig, 角色数据结构, 天赋结构, 背景结构 } from '../../../types';
import { 预设天赋, 预设背景 } from '../../../data/presets';

interface Props {
    onComplete: (
        worldConfig: WorldGenConfig, 
        charData: 角色数据结构, 
        mode: 'all' | 'step'
    ) => void;
    onCancel: () => void;
    loading: boolean;
}

const STEPS = ['世界观', '角色基础', '天赋背景', '确认生成'];

const NewGameWizard: React.FC<Props> = ({ onComplete, onCancel, loading }) => {
    const [step, setStep] = useState(0);

    // --- State: World Config ---
    const [worldConfig, setWorldConfig] = useState<WorldGenConfig>({
        worldName: '太古界',
        powerLevel: '中武',
        worldSize: '九州宏大',
        dynastySetting: '群雄逐鹿，王朝末年',
        sectDensity: '林立',
        tianjiaoSetting: '大争之世，天骄并起',
        difficulty: 'normal' // Default difficulty
    });

    // --- State: Character Config ---
    const [charName, setCharName] = useState('萧风');
    const [charGender, setCharGender] = useState<'男' | '女'>('男');
    const [charAge, setCharAge] = useState(18);
    const [charBirth, setCharBirth] = useState('1024:01:01');
    
    // Attributes (Total 30 points to distribute)
    const MAX_POINTS = 30;
    const [stats, setStats] = useState({
        力量: 5, 敏捷: 5, 体质: 5, 根骨: 5, 悟性: 5, 福源: 5
    });

    // Talents & Background
    const [selectedBackground, setSelectedBackground] = useState<背景结构>(预设背景[0]);
    const [selectedTalents, setSelectedTalents] = useState<天赋结构[]>([]);
    
    // Custom Inputs
    const [customTalent, setCustomTalent] = useState<天赋结构>({ 名称: '', 描述: '', 效果: '' });
    const [showCustomTalent, setShowCustomTalent] = useState(false);

    // --- Logic ---
    
    const usedPoints = Object.values(stats).reduce((a, b) => a + b, 0);
    const remainingPoints = MAX_POINTS - usedPoints;

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

    const addCustomTalent = () => {
        if (!customTalent.名称) return;
        if (selectedTalents.length >= 3) {
            alert("最多选择3个天赋");
            return;
        }
        setSelectedTalents([...selectedTalents, customTalent]);
        setCustomTalent({ 名称: '', 描述: '', 效果: '' });
        setShowCustomTalent(false);
    };

    const handleGenerate = (mode: 'all' | 'step') => {
        // Construct final character data object
        const charData: 角色数据结构 = {
            ...stats as any, // 力量, 敏捷 etc.
            姓名: charName,
            性别: charGender,
            年龄: charAge,
            出生日期: charBirth,
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
        
        onComplete(worldConfig, charData, mode);
    };

    if (loading) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center bg-black/90 text-wuxia-gold z-50">
                <div className="text-4xl font-serif font-bold animate-pulse mb-4">天地开辟中...</div>
                <div className="text-sm font-mono text-gray-500">AI正在构建世界法则与因果...</div>
            </div>
        );
    }

    return (
        <div className="h-full w-full flex flex-col items-center justify-center bg-ink-black/95 relative overflow-hidden p-4 md:p-10 z-50">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-20 pointer-events-none"></div>
            
            {/* Main Container */}
            <div className="w-full max-w-5xl h-full border border-wuxia-gold/30 rounded-xl bg-black/50 shadow-2xl flex flex-col overflow-hidden relative backdrop-blur-sm">
                
                {/* Header Steps */}
                <div className="h-16 border-b border-gray-800 flex items-center justify-between px-8 bg-black/40">
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

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-ink-wash/5 relative">
                    
                    {/* STEP 1: WORLD SETTINGS */}
                    {step === 0 && (
                        <div className="space-y-8 animate-slide-in max-w-3xl mx-auto">
                            <h3 className="text-xl font-serif font-bold text-gray-200 border-b border-gray-700 pb-2">世界法则设定</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs text-wuxia-cyan font-bold">世界名称</label>
                                    <input 
                                        value={worldConfig.worldName}
                                        onChange={e => setWorldConfig({...worldConfig, worldName: e.target.value})}
                                        className="w-full bg-black/40 border border-gray-600 p-3 text-white focus:border-wuxia-gold outline-none" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-wuxia-cyan font-bold">游戏难度</label>
                                    <select 
                                        value={worldConfig.difficulty}
                                        onChange={e => setWorldConfig({...worldConfig, difficulty: e.target.value as any})}
                                        className="w-full bg-black/40 border border-gray-600 p-3 text-white focus:border-wuxia-gold outline-none"
                                    >
                                        <option value="relaxed">轻松 (剧情模式)</option>
                                        <option value="easy">简单 (初入江湖)</option>
                                        <option value="normal">正常 (标准体验)</option>
                                        <option value="hard">困难 (刀光剑影)</option>
                                        <option value="extreme">极限 (修罗炼狱)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-wuxia-cyan font-bold">武力层次</label>
                                    <select 
                                        value={worldConfig.powerLevel}
                                        onChange={e => setWorldConfig({...worldConfig, powerLevel: e.target.value as any})}
                                        className="w-full bg-black/40 border border-gray-600 p-3 text-white focus:border-wuxia-gold outline-none"
                                    >
                                        <option value="低武">低武 (拳脚兵刃)</option>
                                        <option value="中武">中武 (内气外放)</option>
                                        <option value="高武">高武 (搬山填海)</option>
                                        <option value="修仙">修仙 (长生久视)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-wuxia-cyan font-bold">世界版图</label>
                                    <select 
                                        value={worldConfig.worldSize}
                                        onChange={e => setWorldConfig({...worldConfig, worldSize: e.target.value as any})}
                                        className="w-full bg-black/40 border border-gray-600 p-3 text-white focus:border-wuxia-gold outline-none"
                                    >
                                        <option value="弹丸之地">弹丸之地 (一岛或一城)</option>
                                        <option value="九州宏大">九州宏大 (万里河山)</option>
                                        <option value="无尽位面">无尽位面 (多重世界)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-wuxia-cyan font-bold">宗门密度</label>
                                    <select 
                                        value={worldConfig.sectDensity}
                                        onChange={e => setWorldConfig({...worldConfig, sectDensity: e.target.value as any})}
                                        className="w-full bg-black/40 border border-gray-600 p-3 text-white focus:border-wuxia-gold outline-none"
                                    >
                                        <option value="稀少">稀少 (隐世不出)</option>
                                        <option value="适中">适中 (数大宗门)</option>
                                        <option value="林立">林立 (百家争鸣)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs text-wuxia-cyan font-bold">王朝局势 (自定义)</label>
                                <input 
                                    value={worldConfig.dynastySetting}
                                    onChange={e => setWorldConfig({...worldConfig, dynastySetting: e.target.value})}
                                    className="w-full bg-black/40 border border-gray-600 p-3 text-white focus:border-wuxia-gold outline-none" 
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-wuxia-cyan font-bold">天骄/战力设定 (自定义)</label>
                                <textarea 
                                    value={worldConfig.tianjiaoSetting}
                                    onChange={e => setWorldConfig({...worldConfig, tianjiaoSetting: e.target.value})}
                                    className="w-full h-24 bg-black/40 border border-gray-600 p-3 text-white focus:border-wuxia-gold outline-none resize-none" 
                                />
                            </div>
                        </div>
                    )}

                    {/* STEP 2: CHARACTER BASIC */}
                    {step === 1 && (
                        <div className="space-y-8 animate-slide-in max-w-3xl mx-auto">
                            <h3 className="text-xl font-serif font-bold text-gray-200 border-b border-gray-700 pb-2">侠客名录</h3>
                            
                            <div className="flex gap-8">
                                {/* Left: Info */}
                                <div className="flex-1 space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs text-gray-400">姓名</label>
                                        <input value={charName} onChange={e => setCharName(e.target.value)} className="w-full bg-black/40 border border-gray-600 p-2 text-white outline-none focus:border-wuxia-gold" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs text-gray-400">性别</label>
                                            <select value={charGender} onChange={e => setCharGender(e.target.value as any)} className="w-full bg-black/40 border border-gray-600 p-2 text-white outline-none focus:border-wuxia-gold">
                                                <option value="男">男</option>
                                                <option value="女">女</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs text-gray-400">年龄</label>
                                            <input type="number" value={charAge} onChange={e => setCharAge(parseInt(e.target.value))} className="w-full bg-black/40 border border-gray-600 p-2 text-white outline-none focus:border-wuxia-gold" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs text-gray-400">出生日期 (YYYY:MM:DD)</label>
                                        <input value={charBirth} onChange={e => setCharBirth(e.target.value)} className="w-full bg-black/40 border border-gray-600 p-2 text-white outline-none focus:border-wuxia-gold" />
                                    </div>
                                </div>

                                {/* Right: Stats */}
                                <div className="flex-1 bg-black/20 p-4 border border-gray-800 rounded-lg">
                                    <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                                        <span className="text-wuxia-gold font-bold">属性分配</span>
                                        <span className={`text-xs font-mono ${remainingPoints > 0 ? 'text-green-400' : 'text-gray-500'}`}>剩余点数: {remainingPoints}</span>
                                    </div>
                                    <div className="space-y-3">
                                        {Object.entries(stats).map(([key, val]) => (
                                            <div key={key} className="flex items-center justify-between">
                                                <span className="text-gray-400 text-sm">{key}</span>
                                                <div className="flex items-center gap-3">
                                                    <button onClick={() => handleStatChange(key as any, -1)} className="w-6 h-6 bg-gray-800 text-gray-400 hover:text-white rounded">-</button>
                                                    <span className="w-6 text-center text-wuxia-cyan font-bold">{val}</span>
                                                    <button onClick={() => handleStatChange(key as any, 1)} className="w-6 h-6 bg-gray-800 text-gray-400 hover:text-white rounded">+</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: TALENTS & BACKGROUND */}
                    {step === 2 && (
                        <div className="space-y-8 animate-slide-in max-w-4xl mx-auto">
                             
                             {/* Backgrounds */}
                             <div>
                                <h3 className="text-xl font-serif font-bold text-gray-200 border-b border-gray-700 pb-2 mb-4">出身背景 (单选)</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {预设背景.map((bg, idx) => (
                                        <div 
                                            key={idx} 
                                            onClick={() => setSelectedBackground(bg)}
                                            className={`p-3 border rounded cursor-pointer transition-all ${
                                                selectedBackground.名称 === bg.名称 
                                                ? 'border-wuxia-gold bg-wuxia-gold/10' 
                                                : 'border-gray-700 bg-black/20 hover:border-gray-500'
                                            }`}
                                        >
                                            <div className={`font-bold text-sm ${selectedBackground.名称 === bg.名称 ? 'text-wuxia-gold' : 'text-gray-300'}`}>{bg.名称}</div>
                                            <div className="text-xs text-gray-500 mt-1">{bg.描述}</div>
                                            <div className="text-[10px] text-gray-400 mt-2 pt-2 border-t border-gray-700/50">{bg.效果}</div>
                                        </div>
                                    ))}
                                </div>
                             </div>

                             {/* Talents */}
                             <div>
                                <div className="flex justify-between items-center border-b border-gray-700 pb-2 mb-4">
                                    <h3 className="text-xl font-serif font-bold text-gray-200">天赋选择 (最多3个)</h3>
                                    <button onClick={() => setShowCustomTalent(!showCustomTalent)} className="text-xs text-wuxia-cyan hover:underline">+ 自定义天赋</button>
                                </div>
                                
                                {showCustomTalent && (
                                    <div className="bg-black/40 border border-wuxia-cyan/30 p-4 mb-4 rounded space-y-3">
                                        <div className="flex gap-2">
                                            <input placeholder="天赋名称" value={customTalent.名称} onChange={e => setCustomTalent({...customTalent, 名称: e.target.value})} className="bg-black/50 border border-gray-600 p-2 text-xs text-white flex-1" />
                                            <input placeholder="效果 (e.g. 攻击+10)" value={customTalent.效果} onChange={e => setCustomTalent({...customTalent, 效果: e.target.value})} className="bg-black/50 border border-gray-600 p-2 text-xs text-white flex-1" />
                                        </div>
                                        <input placeholder="描述" value={customTalent.描述} onChange={e => setCustomTalent({...customTalent, 描述: e.target.value})} className="w-full bg-black/50 border border-gray-600 p-2 text-xs text-white" />
                                        <GameButton onClick={addCustomTalent} variant="secondary" className="w-full py-1 text-xs">添加</GameButton>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {预设天赋.map((t, idx) => {
                                        const isSelected = !!selectedTalents.find(x => x.名称 === t.名称);
                                        return (
                                            <div 
                                                key={idx} 
                                                onClick={() => toggleTalent(t)}
                                                className={`p-3 border rounded cursor-pointer transition-all ${
                                                    isSelected 
                                                    ? 'border-wuxia-red bg-wuxia-red/10' 
                                                    : 'border-gray-700 bg-black/20 hover:border-gray-500'
                                                }`}
                                            >
                                                <div className={`font-bold text-sm ${isSelected ? 'text-wuxia-red' : 'text-gray-300'}`}>{t.名称}</div>
                                                <div className="text-xs text-gray-500 mt-1 line-clamp-2" title={t.描述}>{t.描述}</div>
                                                <div className="text-[10px] text-gray-400 mt-2 pt-2 border-t border-gray-700/50">{t.效果}</div>
                                            </div>
                                        )
                                    })}
                                    {/* Render Custom Selected Talents */}
                                    {selectedTalents.filter(st => !预设天赋.find(pt => pt.名称 === st.名称)).map((ct, idx) => (
                                         <div 
                                            key={`custom-${idx}`} 
                                            onClick={() => toggleTalent(ct)}
                                            className="p-3 border border-wuxia-cyan bg-wuxia-cyan/10 rounded cursor-pointer"
                                        >
                                            <div className="font-bold text-sm text-wuxia-cyan">{ct.名称} (自制)</div>
                                            <div className="text-xs text-gray-500 mt-1">{ct.描述}</div>
                                            <div className="text-[10px] text-gray-400 mt-2 pt-2 border-t border-gray-700/50">{ct.效果}</div>
                                        </div>
                                    ))}
                                </div>
                             </div>
                        </div>
                    )}

                    {/* STEP 4: CONFIRMATION */}
                    {step === 3 && (
                        <div className="h-full flex flex-col items-center justify-center animate-fadeIn space-y-8">
                            <div className="text-center">
                                <h2 className="text-3xl font-serif font-black text-wuxia-gold mb-2">天道既定</h2>
                                <p className="text-gray-400 text-sm">一切准备就绪，即将推演这方世界。</p>
                            </div>

                            <div className="bg-black/40 border border-gray-700 p-6 rounded-lg max-w-lg w-full text-sm space-y-2 font-mono text-gray-300">
                                <div>世界: <span className="text-white">{worldConfig.worldName}</span> ({worldConfig.powerLevel})</div>
                                <div>难度: <span className="text-white uppercase">{worldConfig.difficulty}</span></div>
                                <div>主角: <span className="text-white">{charName}</span> ({charGender}, {charAge}岁)</div>
                                <div>背景: <span className="text-white">{selectedBackground.名称}</span></div>
                                <div>天赋: <span className="text-white">{selectedTalents.map(t => t.名称).join(', ') || '无'}</span></div>
                            </div>

                            <div className="flex flex-col gap-4 w-full max-w-md">
                                <GameButton onClick={() => handleGenerate('all')} variant="primary" className="w-full py-4 text-lg">
                                    一键生成 (世界+剧情)
                                </GameButton>
                                <div className="text-center text-xs text-gray-500">- 或者 -</div>
                                <GameButton onClick={() => handleGenerate('step')} variant="secondary" className="w-full py-3">
                                    分步生成 (先生成数据，再入世)
                                </GameButton>
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer Nav */}
                <div className="h-16 border-t border-gray-800 bg-black/40 flex items-center justify-between px-8">
                    {step > 0 ? (
                        <button onClick={() => setStep(step - 1)} className="text-gray-400 hover:text-white transition-colors">
                            &larr; 上一步
                        </button>
                    ) : (
                        <button onClick={onCancel} className="text-red-500 hover:text-red-400 transition-colors">
                            取消
                        </button>
                    )}

                    {step < STEPS.length - 1 ? (
                        <GameButton onClick={() => setStep(step + 1)} variant="primary" className="px-6 py-2">
                            下一步 &rarr;
                        </GameButton>
                    ) : null}
                </div>

            </div>
        </div>
    );
};

export default NewGameWizard;
