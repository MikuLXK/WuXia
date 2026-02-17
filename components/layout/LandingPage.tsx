
import React from 'react';
import GameButton from '../ui/GameButton';

interface Props {
    onStart: () => void;
    onLoad: () => void;
    onSettings: () => void;
    hasSave: boolean;
}

const LandingPage: React.FC<Props> = ({ onStart, onLoad, onSettings, hasSave }) => {
    return (
        <div className="h-full w-full flex flex-col items-center justify-center relative overflow-hidden bg-ink-black z-40 rounded-xl">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-ink-wash opacity-80"></div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-20"></div>
            
            {/* Animated particles or dust could go here */}

            {/* Main Title Area */}
            <div className="relative z-10 flex flex-col items-center mb-16 animate-fadeIn">
                 {/* Decorative Circle/Moon */}
                 <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-wuxia-gold/5 blur-3xl"></div>
                 
                 <h1 className="text-7xl md:text-9xl font-black font-serif text-transparent bg-clip-text bg-gradient-to-b from-gray-100 to-gray-500 tracking-[0.1em] drop-shadow-2xl select-none mb-6 text-center">
                    墨色江湖
                 </h1>
                 
                 <div className="flex items-center gap-6 opacity-80">
                     <div className="h-px w-16 bg-gradient-to-r from-transparent to-wuxia-red"></div>
                     <h2 className="text-xl md:text-2xl font-serif text-wuxia-red tracking-[0.5em] uppercase font-bold text-shadow-sm">
                        无尽武林
                     </h2>
                     <div className="h-px w-16 bg-gradient-to-l from-transparent to-wuxia-red"></div>
                 </div>
            </div>

            {/* Menu Options */}
            <div className="relative z-10 flex flex-col gap-6 w-64 animate-slide-in delay-100">
                <GameButton onClick={onStart} variant="primary" className="text-lg py-4 shadow-lg">
                    踏入江湖
                </GameButton>
                
                <GameButton 
                    onClick={onLoad} 
                    variant="secondary" 
                    className={`text-lg py-4 shadow-lg ${!hasSave ? 'opacity-50 cursor-not-allowed grayscale' : ''}`} 
                    disabled={!hasSave}
                >
                    重入江湖
                </GameButton>

                <GameButton onClick={onSettings} variant="secondary" className="text-lg py-4 shadow-lg border-opacity-50 opacity-80 hover:opacity-100">
                    设置
                </GameButton>
            </div>

            {/* Footer */}
            <div className="absolute bottom-8 text-[10px] text-gray-600 font-mono tracking-[0.3em] opacity-60">
                VER 0.0.1 ALPHA
            </div>
            
            {/* Ink Drops Decoration */}
            <div className="absolute top-10 right-20 w-32 h-32 bg-black/50 rounded-full blur-2xl opacity-40"></div>
            <div className="absolute bottom-20 left-10 w-48 h-48 bg-black/60 rounded-full blur-3xl opacity-30"></div>
        </div>
    );
};

export default LandingPage;
