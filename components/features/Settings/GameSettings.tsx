
import React, { useState } from 'react';
import { 游戏设置结构 } from '../../../types';
import GameButton from '../../ui/GameButton';

interface Props {
    settings: 游戏设置结构;
    onSave: (settings: 游戏设置结构) => void;
}

const GameSettings: React.FC<Props> = ({ settings, onSave }) => {
    const [form, setForm] = useState<游戏设置结构>(settings);
    const [showSuccess, setShowSuccess] = useState(false);

    const handleSave = () => {
        onSave(form);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center border-b border-wuxia-gold/30 pb-2">
                <h3 className="text-wuxia-gold font-serif font-bold text-lg">游戏设定</h3>
                {showSuccess && <span className="text-green-400 text-xs font-bold animate-pulse">✔ 设定已保存</span>}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-xs text-gray-400">字数要求</label>
                    <input 
                        type="text"
                        value={form.字数要求}
                        onChange={(e) => setForm({...form, 字数要求: e.target.value})}
                        className="w-full bg-black/30 border border-gray-600/50 p-3 text-paper-white focus:border-wuxia-gold outline-none"
                        placeholder="e.g. 200字左右"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs text-gray-400">叙事人称</label>
                    <select 
                        value={form.叙事人称}
                        onChange={(e) => setForm({...form, 叙事人称: e.target.value as any})}
                        className="w-full bg-black/30 border border-gray-600/50 p-3 text-paper-white focus:border-wuxia-gold outline-none"
                    >
                        <option value="第一人称">第一人称 (我)</option>
                        <option value="第二人称">第二人称 (你)</option>
                        <option value="第三人称">第三人称 (他/姓名)</option>
                    </select>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-xs text-gray-400">额外要求提示词 (Custom Prompt)</label>
                <textarea 
                    value={form.额外提示词}
                    onChange={(e) => setForm({...form, 额外提示词: e.target.value})}
                    className="w-full h-32 bg-black/30 border border-gray-600/50 p-3 text-sm text-gray-300 focus:border-wuxia-gold outline-none custom-scrollbar resize-none"
                    placeholder="在此输入需要追加到 Prompt 最后的特殊指令，例如：'严禁使用现代词汇'..."
                />
            </div>

            <div className="pt-4 border-t border-gray-800 flex justify-end">
                <GameButton onClick={handleSave} variant="primary" className="w-full md:w-auto px-8">
                    保存设定
                </GameButton>
            </div>
        </div>
    );
};

export default GameSettings;
