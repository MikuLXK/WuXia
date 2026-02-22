import React, { useEffect, useState } from 'react';
import { 游戏设置结构 } from '../../../types';
import GameButton from '../../ui/GameButton';
import ToggleSwitch from '../../ui/ToggleSwitch';

interface Props {
    settings: 游戏设置结构;
    onSave: (settings: 游戏设置结构) => void;
}

const GameSettings: React.FC<Props> = ({ settings, onSave }) => {
    const [form, setForm] = useState<游戏设置结构>(settings);
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        setForm(settings);
    }, [settings]);

    const handleSave = () => {
        onSave(form);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center border-b border-wuxia-gold/30 pb-3 mb-6">
                <h3 className="text-wuxia-gold font-serif font-bold text-xl">游戏设定</h3>
                {showSuccess && <span className="text-green-400 text-xs font-bold animate-pulse">✔ 设定已保存</span>}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-sm text-wuxia-cyan font-bold">字数要求</label>
                    <input 
                        type="number"
                        min={50}
                        step={10}
                        value={form.字数要求}
                        onChange={(e) => {
                            const n = Number(e.target.value);
                            setForm({ ...form, 字数要求: Number.isFinite(n) && n > 0 ? Math.max(50, Math.floor(n)) : 450 });
                        }}
                        className="w-full bg-black/50 border-2 border-transparent focus:border-wuxia-gold p-3 text-white outline-none rounded-md transition-all font-serif tracking-wider"
                        placeholder="例如 450"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm text-wuxia-cyan font-bold">叙事人称</label>
                    <select 
                        value={form.叙事人称}
                        onChange={(e) => setForm({...form, 叙事人称: e.target.value as any})}
                        className="w-full bg-black/40 border border-gray-600 p-3 text-white outline-none focus:border-wuxia-gold rounded-md"
                    >
                        <option value="第一人称">第一人称 (我)</option>
                        <option value="第二人称">第二人称 (你)</option>
                        <option value="第三人称">第三人称 (他/姓名)</option>
                    </select>
                </div>

                <div className="space-y-2 md:col-span-2">
                    <label className="text-sm text-wuxia-cyan font-bold">剧情风格</label>
                    <select
                        value={form.剧情风格}
                        onChange={(e) => setForm({ ...form, 剧情风格: e.target.value as 游戏设置结构['剧情风格'] })}
                        className="w-full bg-black/40 border border-gray-600 p-3 text-white outline-none focus:border-wuxia-gold rounded-md"
                    >
                        <option value="后宫">后宫</option>
                        <option value="修炼">修炼</option>
                        <option value="一般">一般</option>
                        <option value="修罗场">修罗场</option>
                        <option value="纯爱">纯爱</option>
                        <option value="NTL后宫">NTL后宫</option>
                    </select>
                    <div className="text-xs text-gray-400">将作为 AI 助手消息注入在本轮上下文末尾，并位于 COT 伪装消息之前。</div>
                </div>
            </div>

            <div className="space-y-3 rounded-md border border-wuxia-gold/20 bg-black/30 p-4">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <div className="text-sm text-wuxia-cyan font-bold">行动选项功能</div>
                        <div className="text-xs text-gray-400 mt-1">开启后，将在上下文注入“行动选项规范”，并要求输出 \`action_options\`。</div>
                    </div>
                    <ToggleSwitch
                        checked={form.启用行动选项 !== false}
                        onChange={(next) => setForm({ ...form, 启用行动选项: next })}
                        ariaLabel="切换行动选项功能"
                    />
                </div>
            </div>

            <div className="space-y-3 rounded-md border border-wuxia-gold/20 bg-black/30 p-4">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <div className="text-sm text-wuxia-cyan font-bold">COT伪装历史消息注入</div>
                        <div className="text-xs text-gray-400 mt-1">开启后，在发送本轮玩家输入前会追加一条伪装历史消息，用于强化思考段输出习惯。</div>
                    </div>
                    <ToggleSwitch
                        checked={form.启用COT伪装注入 !== false}
                        onChange={(next) => setForm({ ...form, 启用COT伪装注入: next })}
                        ariaLabel="切换COT伪装历史消息注入"
                    />
                </div>
            </div>

            <div className="space-y-3 rounded-md border border-wuxia-gold/20 bg-black/30 p-4">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <div className="text-sm text-wuxia-cyan font-bold">多重思考模式</div>
                        <div className="text-xs text-gray-400 mt-1">开启后自动切换到“多重思考版”COT与输出格式提示词。</div>
                    </div>
                    <ToggleSwitch
                        checked={form.启用多重思考 === true}
                        onChange={(next) => setForm({ ...form, 启用多重思考: next })}
                        ariaLabel="切换多重思考模式"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm text-wuxia-cyan font-bold">额外要求提示词 (Custom Prompt)</label>
                <textarea 
                    value={form.额外提示词}
                    onChange={(e) => setForm({...form, 额外提示词: e.target.value})}
                    className="w-full h-32 bg-black/50 border-2 border-transparent focus:border-wuxia-gold p-3 text-white outline-none rounded-md transition-all resize-none custom-scrollbar"
                    placeholder="在此输入需要追加到 Prompt 最后的特殊指令，例如：'严禁使用现代词汇'..."
                />
            </div>

            <div className="pt-6 border-t border-wuxia-gold/20 mt-8 flex justify-end">
                <GameButton onClick={handleSave} variant="primary" className="w-full md:w-auto px-8">
                    保存设定
                </GameButton>
            </div>
        </div>
    );
};

export default GameSettings;
