
import React, { useRef, useState } from 'react';
import { 视觉设置结构 } from '../../../types';
import GameButton from '../../ui/GameButton';

interface Props {
    settings: 视觉设置结构;
    onSave: (settings: 视觉设置结构) => void;
}

const VisualSettings: React.FC<Props> = ({ settings, onSave }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    
    const handleSave = (newSettings: 视觉设置结构) => {
        onSave(newSettings);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
    };

    const toggleTimeFormat = (format: '传统' | '数字') => {
        handleSave({ ...settings, 时间显示格式: format });
    };

    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleSave({ ...settings, 背景图片: e.target.value });
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                handleSave({ ...settings, 背景图片: base64String });
            };
            reader.readAsDataURL(file);
        }
    };

    const clearBackground = () => {
         handleSave({ ...settings, 背景图片: '' });
    };

    const handleRenderCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value) || 30;
        handleSave({ ...settings, 渲染层数: val });
    };

    return (
        <div className="space-y-8 animate-fadeIn">
            <div className="flex justify-between items-center border-b border-wuxia-gold/30 pb-2">
                <h3 className="text-wuxia-gold font-serif font-bold text-lg">视觉与显示</h3>
                {showSuccess && <span className="text-green-400 text-xs font-bold animate-pulse">✔ 配置已保存</span>}
            </div>
            
            {/* Render Layer Count Setting */}
            <div className="bg-black/30 p-5 border border-gray-700/50 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <h4 className="text-paper-white font-bold">渲染层数 (Render Layers)</h4>
                    <span className="text-xs text-gray-500 font-mono">当前: {settings.渲染层数 || 30} 回合</span>
                </div>
                <div className="flex items-center gap-4">
                    <input 
                        type="number"
                        min="10" max="100" step="5"
                        value={settings.渲染层数 || 30}
                        onChange={handleRenderCountChange}
                        className="bg-black/50 border border-gray-600 p-2 text-wuxia-cyan font-mono font-bold w-24 text-center focus:border-wuxia-cyan outline-none"
                    />
                    <p className="text-[10px] text-gray-500 italic flex-1">
                        * 仅渲染最近的 N 回合对话以优化性能。更早期的记录将被隐藏（可在“互动历史”中查看）。
                    </p>
                </div>
            </div>

            {/* Time Display Setting */}
            <div className="bg-black/30 p-5 border border-gray-700/50">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-paper-white font-bold">顶部时间显示格式</h4>
                    <span className="text-xs text-gray-500 font-mono">当前: {settings.时间显示格式}</span>
                </div>
                
                <div className="flex gap-4">
                    <button 
                        onClick={() => toggleTimeFormat('传统')}
                        className={`flex-1 p-4 border transition-all duration-300 relative group overflow-hidden ${
                            settings.时间显示格式 === '传统' 
                            ? 'border-wuxia-gold bg-wuxia-gold/10' 
                            : 'border-gray-700 hover:border-gray-500 bg-black/40'
                        }`}
                    >
                         <div className="text-xl font-serif text-wuxia-gold mb-1">巳时</div>
                         <div className="text-xs text-gray-400">传统天干地支</div>
                         {settings.时间显示格式 === '传统' && <div className="absolute top-0 right-0 w-3 h-3 bg-wuxia-gold"></div>}
                    </button>

                    <button 
                         onClick={() => toggleTimeFormat('数字')}
                         className={`flex-1 p-4 border transition-all duration-300 relative group overflow-hidden ${
                            settings.时间显示格式 === '数字' 
                            ? 'border-wuxia-gold bg-wuxia-gold/10' 
                            : 'border-gray-700 hover:border-gray-500 bg-black/40'
                        }`}
                    >
                        <div className="text-xl font-serif text-wuxia-gold mb-1">09:00</div>
                         <div className="text-xs text-gray-400">现代数字时钟</div>
                         {settings.时间显示格式 === '数字' && <div className="absolute top-0 right-0 w-3 h-3 bg-wuxia-gold"></div>}
                    </button>
                </div>
            </div>

             {/* Background Image Setting */}
             <div className="bg-black/30 p-5 border border-gray-700/50">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-paper-white font-bold">自定义背景</h4>
                </div>
                
                <div className="space-y-4">
                    <div className="flex flex-col space-y-2">
                         <label className="text-xs text-gray-400">图片链接 (URL)</label>
                         <input 
                            type="text" 
                            value={settings.背景图片 || ''}
                            onChange={handleUrlChange}
                            placeholder="https://example.com/image.jpg"
                            className="bg-black/20 border border-gray-600 p-2 text-sm text-gray-300 focus:border-wuxia-gold outline-none"
                        />
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="h-px bg-gray-700 flex-1"></div>
                        <span className="text-xs text-gray-500">或</span>
                        <div className="h-px bg-gray-700 flex-1"></div>
                    </div>

                    <div className="flex gap-3">
                         <GameButton onClick={() => fileInputRef.current?.click()} variant="secondary" className="flex-1 text-xs">
                            上传本地图片
                         </GameButton>
                         <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileUpload} 
                            accept="image/*" 
                            className="hidden" 
                        />
                        {settings.背景图片 && (
                            <GameButton onClick={clearBackground} variant="danger" className="text-xs px-4">
                                清除
                            </GameButton>
                        )}
                    </div>
                    
                    <p className="text-[10px] text-gray-500 italic">
                        * 背景图片将显示在水墨噪点之下。建议使用深色调图片以保证文字清晰度。
                    </p>
                </div>
            </div>
        </div>
    );
};

export default VisualSettings;
