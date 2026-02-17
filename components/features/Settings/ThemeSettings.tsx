import React from 'react';
import { ThemePreset } from '../../../types';

interface Props {
    currentTheme: ThemePreset;
    onThemeChange: (theme: ThemePreset) => void;
}

const ThemeSettings: React.FC<Props> = ({ currentTheme, onThemeChange }) => {
    
    const themes: {id: ThemePreset; name: string; colors: string[]}[] = [
        { 
            id: 'ink', 
            name: '墨色经典 (默认)', 
            colors: ['#050505', '#e6c86e', '#a31818'] 
        },
        { 
            id: 'azure', 
            name: '青鸾入梦 (高对比)', 
            // Preview: Dark Green BG | Bright Vivid Green Primary | Red
            colors: ['#02120C', '#3CEB96', '#A31818'] 
        }
    ];

    return (
        <div className="space-y-6">
            <h3 className="text-wuxia-gold font-serif font-bold text-lg mb-4">界面风格</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {themes.map(theme => (
                    <div 
                        key={theme.id}
                        onClick={() => onThemeChange(theme.id)}
                        className={`
                            relative p-4 cursor-pointer border-2 transition-all duration-300 group
                            ${currentTheme === theme.id 
                                ? 'border-wuxia-gold bg-wuxia-gold/10 shadow-[0_0_15px_rgba(var(--c-wuxia-gold),0.3)]' 
                                : 'border-gray-700 hover:border-wuxia-gold/50 bg-black/40'}
                        `}
                    >
                        <div className="flex justify-between items-center mb-3">
                            <span className={`font-bold font-serif ${currentTheme === theme.id ? 'text-wuxia-gold' : 'text-gray-400'}`}>
                                {theme.name}
                            </span>
                            {currentTheme === theme.id && (
                                <span className="text-xs text-wuxia-gold font-mono">[已启用]</span>
                            )}
                        </div>
                        
                        {/* Color Preview */}
                        <div className="flex gap-2">
                            {theme.colors.map((c, i) => (
                                <div 
                                    key={i} 
                                    className="w-8 h-8 rounded-sm shadow-sm border border-white/10"
                                    style={{ backgroundColor: c }}
                                ></div>
                            ))}
                        </div>

                        {/* Corner Accents */}
                        <div className={`absolute top-0 right-0 w-2 h-2 border-t border-r transition-colors ${currentTheme === theme.id ? 'border-wuxia-gold' : 'border-gray-600'}`}></div>
                        <div className={`absolute bottom-0 left-0 w-2 h-2 border-b border-l transition-colors ${currentTheme === theme.id ? 'border-wuxia-gold' : 'border-gray-600'}`}></div>
                    </div>
                ))}
            </div>

            <div className="mt-8 p-4 bg-black/20 border border-wuxia-gold/20 rounded text-sm text-gray-400 font-serif leading-relaxed">
                <p>注：切换主题将即时生效。不同的主题配色会改变界面的主色调、边框颜色以及文字高亮色。</p>
            </div>
        </div>
    );
};

export default ThemeSettings;