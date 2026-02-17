
import React, { useMemo } from 'react';
import { 环境信息结构, 节日结构 } from '../../types';

interface Props {
    环境: 环境信息结构;
    timeFormat: '传统' | '数字';
    festivals?: 节日结构[];
}

const TopItem: React.FC<{ label: string; value: string | number; highlight?: boolean }> = ({ label, value, highlight }) => (
    <div className="flex flex-col items-center justify-center mx-3 md:mx-6 relative group cursor-default">
        {/* Subtle hover bracket */}
        <div className="absolute -inset-2 border-x border-wuxia-gold/0 group-hover:border-wuxia-gold/20 transition-all duration-500 scale-y-50 group-hover:scale-y-100"></div>
        
        <div className="text-[10px] text-wuxia-gold/60 font-serif tracking-widest mb-1">{label}</div>
        <div className={`font-serif whitespace-nowrap text-lg drop-shadow-md transition-colors ${highlight ? 'text-wuxia-red font-bold animate-pulse' : 'text-paper-white group-hover:text-wuxia-gold'}`}>
            {value}
        </div>
    </div>
);

const Divider = () => (
    <div className="h-6 w-px bg-gradient-to-b from-transparent via-wuxia-gold/30 to-transparent mx-1"></div>
);

// Helper to map Wuxia time to approximate clock time for display
// Now includes "Ke" (Quarter) logic roughly
const mapWuxiaTime = (hourStr?: string, quarterStr?: string): string => {
    const safeHour = typeof hourStr === 'string' ? hourStr : '';
    const safeQuarter = typeof quarterStr === 'string' ? quarterStr : '';

    // If model already returns canonical timestamp like YYYY:MM:DD:HH:MM, extract HH:MM directly.
    const tsParts = safeHour.split(':');
    if (tsParts.length >= 5 && /^\d{1,2}$/.test(tsParts[3]) && /^\d{1,2}$/.test(tsParts[4])) {
        const h2 = tsParts[3].padStart(2, '0');
        const m2 = tsParts[4].padStart(2, '0');
        return `${h2}:${m2}`;
    }

    const hourMap: Record<string, number> = {
        '子时': 23, '丑时': 1, '寅时': 3, '卯时': 5,
        '辰时': 7, '巳时': 9, '午时': 11, '未时': 13,
        '申时': 15, '酉时': 17, '戌时': 19, '亥时': 21
    };

    // Very rough estimation: 1 Shi = 2 Hours.
    // Ke varies historically, but often 1 Shi = 8 Ke (15 mins each)
    let baseHour = 12;
    for (const key in hourMap) {
        if (safeHour.includes(key) || safeHour.includes(key[0])) {
            baseHour = hourMap[key];
            break;
        }
    }

    let additionalMinutes = 0;
    if (safeQuarter.includes('初')) additionalMinutes = 0;
    else if (safeQuarter.includes('一')) additionalMinutes = 15;
    else if (safeQuarter.includes('二')) additionalMinutes = 30; // Often called "Zheng" (正)
    else if (safeQuarter.includes('三')) additionalMinutes = 45;
    else if (safeQuarter.includes('正')) additionalMinutes = 60; // Next hour start usually
    
    // Format
    const h = (baseHour + Math.floor(additionalMinutes / 60)) % 24;
    const m = additionalMinutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

const TopBar: React.FC<Props> = ({ 环境, timeFormat, festivals = [] }) => {
    // Calculate Date Display
    const year = 1024 + Math.floor((环境.日期 || 0) / 365);
    const dayOfYear = (环境.日期 || 0) % 365;
    const month = Math.floor(dayOfYear / 30) + 1;
    const day = (dayOfYear % 30) + 1;
    
    const rawTime = 环境?.时间 || '午时';
    const rawKe = 环境.时刻 || '初刻';
    
    const numericTime = mapWuxiaTime(rawTime, rawKe);
    const traditionalTime = `${rawTime} · ${rawKe}`;
    
    const displayTime = timeFormat === '数字' ? numericTime : traditionalTime;
    const fullDateStr = `${year}年${month.toString().padStart(2, '0')}月${day.toString().padStart(2, '0')}日 ${displayTime}`;

    // Determine Festival automatically
    const currentFestival = useMemo(() => {
        return festivals.find(f => f.月 === month && f.日 === day);
    }, [festivals, month, day]);

    const festivalDisplay = currentFestival ? currentFestival.名称 : '平常日';

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    return (
        <div className="h-24 w-full flex items-center justify-center relative overflow-visible z-50 bg-[#080808]">
            {/* Top Border with Pattern */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-ink-black via-wuxia-gold/40 to-ink-black"></div>
            
            {/* Decorative Background Texture */}
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')]"></div>
            
            {/* Main Content Flex */}
            <div className="flex items-center justify-between w-full px-8 md:px-20 relative z-10 h-full">
                
                {/* Left Side Information */}
                <div className="flex items-center">
                    <TopItem label="天气" value={环境.天气} />
                    <Divider />
                    <TopItem label="环境" value="风起云涌" />
                </div>

                {/* Center Plaque - The "Hanging" UI Element */}
                <div className="absolute left-1/2 top-0 transform -translate-x-1/2 h-full flex flex-col items-center justify-start pt-0 z-20">
                     {/* The Ropes */}
                     <div className="flex gap-16 w-full justify-center absolute top-0">
                         <div className="w-[2px] h-8 bg-gradient-to-b from-wuxia-gold/40 to-black"></div>
                         <div className="w-[2px] h-8 bg-gradient-to-b from-wuxia-gold/40 to-black"></div>
                     </div>

                     {/* The Plaque Body */}
                     <div 
                        onClick={toggleFullScreen}
                        className="mt-4 bg-[#111] border-2 border-double border-wuxia-gold/50 px-10 py-3 rounded-lg shadow-[0_10px_20px_rgba(0,0,0,0.8)] relative flex flex-col items-center min-w-[240px] transform hover:scale-105 transition-transform duration-500 cursor-pointer"
                     >
                         
                         {/* Inner Corner Decos */}
                         <div className="absolute top-1 left-1 w-2 h-2 border-t border-l border-wuxia-gold/50"></div>
                         <div className="absolute top-1 right-1 w-2 h-2 border-t border-r border-wuxia-gold/50"></div>
                         <div className="absolute bottom-1 left-1 w-2 h-2 border-b border-l border-wuxia-gold/50"></div>
                         <div className="absolute bottom-1 right-1 w-2 h-2 border-b border-r border-wuxia-gold/50"></div>

                         {/* Time Display */}
                         <div className="text-xl font-bold font-serif text-wuxia-gold tracking-[0.1em] text-shadow">
                             {fullDateStr}
                         </div>
                         
                         {/* Location Badge (Hanging from Plaque) */}
                         <div className="absolute -bottom-3 bg-wuxia-red text-white text-[10px] px-3 py-[2px] rounded border border-wuxia-gold/30 shadow-md flex items-center gap-1 z-30 font-bold tracking-widest">
                            <span className="opacity-90">{环境.国}</span>
                            <span className="text-wuxia-gold opacity-80 font-bold">-</span>
                            <span>{环境.具体地点}</span>
                         </div>
                     </div>
                </div>

                {/* Right Side Information */}
                <div className="flex items-center">
                    <TopItem 
                        label="节日" 
                        value={festivalDisplay} 
                        highlight={!!currentFestival} 
                    />
                    <Divider />
                    <TopItem label="历程" value={`第 ${环境.日期 || 1} 天`} />
                </div>

            </div>

            {/* Bottom Golden Line with Fade */}
            <div className="absolute bottom-0 w-full h-[1px] bg-gradient-to-r from-transparent via-wuxia-gold/50 to-transparent"></div>
        </div>
    );
};

export default TopBar;
