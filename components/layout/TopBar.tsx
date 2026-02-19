
import React, { useMemo, useState } from 'react';
import { 环境信息结构, 节日结构 } from '../../types';

interface Props {
    环境: 环境信息结构;
    timeFormat: '传统' | '数字';
    festivals?: 节日结构[];
}

const TopItem: React.FC<{ label: string; value: string | number; highlight?: boolean }> = ({ label, value, highlight }) => (
    <div className="flex flex-col items-center justify-center mx-1 md:mx-4 relative group cursor-default">
        {/* Subtle hover bracket */}
        <div className="absolute -inset-1.5 border-x border-wuxia-gold/0 group-hover:border-wuxia-gold/20 transition-all duration-500 scale-y-50 group-hover:scale-y-100"></div>
        
        <div className="text-[8px] md:text-[9px] text-wuxia-gold/60 font-serif tracking-[0.18em] mb-0.5">{label}</div>
        <div className={`font-serif whitespace-nowrap text-xs md:text-sm drop-shadow-md transition-colors ${highlight ? 'text-wuxia-red font-bold animate-pulse' : 'text-paper-white group-hover:text-wuxia-gold'}`}>
            {value}
        </div>
    </div>
);

const Divider = () => (
    <div className="h-4 md:h-5 w-px bg-gradient-to-b from-transparent via-wuxia-gold/30 to-transparent mx-0.5 md:mx-1"></div>
);

const parseCanonicalGameTime = (input?: string): { year: number; month: number; day: number; hour: number; minute: number } | null => {
    if (!input || typeof input !== 'string') return null;
    const match = input.trim().match(/^(\d{1,6}):(\d{1,2}):(\d{1,2}):(\d{1,2}):(\d{1,2})$/);
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const hour = Number(match[4]);
    const minute = Number(match[5]);

    if (
        !Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day) ||
        !Number.isFinite(hour) || !Number.isFinite(minute)
    ) {
        return null;
    }
    if (month < 1 || month > 12 || day < 1 || day > 31 || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        return null;
    }

    return { year, month, day, hour, minute };
};

const mapHourToWuxia = (hour: number): string => {
    if (hour >= 23 || hour < 1) return '子时';
    if (hour < 3) return '丑时';
    if (hour < 5) return '寅时';
    if (hour < 7) return '卯时';
    if (hour < 9) return '辰时';
    if (hour < 11) return '巳时';
    if (hour < 13) return '午时';
    if (hour < 15) return '未时';
    if (hour < 17) return '申时';
    if (hour < 19) return '酉时';
    if (hour < 21) return '戌时';
    return '亥时';
};

const mapMinuteToKe = (minute: number): string => {
    if (minute === 30) return '正刻';
    if (minute < 15) return '初刻';
    if (minute < 30) return '一刻';
    if (minute < 45) return '二刻';
    return '三刻';
};

const TopBar: React.FC<Props> = ({ 环境, timeFormat, festivals = [] }) => {
    const [mobileLeftMode, setMobileLeftMode] = useState<'weather' | 'environment'>('weather');
    const [mobileRightMode, setMobileRightMode] = useState<'journey' | 'festival'>('journey');
    const parsedTime = parseCanonicalGameTime(环境?.时间);
    const month = parsedTime?.month ?? null;
    const day = parsedTime?.day ?? null;

    const rawTime = 环境?.时间 || '';
    
    const numericTime = parsedTime
        ? `${parsedTime.hour.toString().padStart(2, '0')}:${parsedTime.minute.toString().padStart(2, '0')}`
        : (rawTime || '未知时间');
    const traditionalTime = parsedTime
        ? `${mapHourToWuxia(parsedTime.hour)} · ${mapMinuteToKe(parsedTime.minute)}`
        : (rawTime || '未知时刻');
    
    const displayTime = timeFormat === '数字' ? numericTime : traditionalTime;
    const fullDateStr = parsedTime
        ? `${parsedTime.year}年${parsedTime.month.toString().padStart(2, '0')}月${parsedTime.day.toString().padStart(2, '0')}日 ${displayTime}`
        : displayTime;
    const mobileDateStr = parsedTime
        ? `${parsedTime.year}年${parsedTime.month.toString().padStart(2, '0')}月${parsedTime.day.toString().padStart(2, '0')}日`
        : '未知日期';
    const mobileClockStr = displayTime;

    // Determine Festival automatically
    const currentFestival = useMemo(() => {
        if (month == null || day == null) return undefined;
        return festivals.find(f => f.月 === month && f.日 === day);
    }, [festivals, month, day]);

    const festivalDisplay = 环境?.节日 && 环境.节日 !== '无'
        ? 环境.节日
        : (currentFestival ? currentFestival.名称 : '平常日');
    const environmentDisplay = (
        环境?.具体地点?.trim() ||
        环境?.小地点?.trim() ||
        环境?.中地点?.trim() ||
        环境?.大地点?.trim() ||
        '风起云涌'
    );
    const mobileLeftLabel = mobileLeftMode === 'weather' ? '天气' : '环境';
    const mobileLeftValue = mobileLeftMode === 'weather'
        ? (环境?.天气 || '未知')
        : environmentDisplay;
    const mobileRightLabel = mobileRightMode === 'journey' ? '历程' : '节日';
    const mobileRightValue = mobileRightMode === 'journey'
        ? `第 ${环境?.日期 || 1} 天`
        : festivalDisplay;
    const locationBadge = useMemo(() => {
        const rawSmall = typeof 环境?.小地点 === 'string' ? 环境.小地点.trim() : '';
        const rawSpecific = typeof 环境?.具体地点 === 'string' ? 环境.具体地点.trim() : '';
        let normalizedSpecific = rawSpecific;
        if (rawSmall && rawSpecific.startsWith(rawSmall)) {
            const stripped = rawSpecific.slice(rawSmall.length).replace(/^[\s\-—>·/|，,、。:：]+/, '').trim();
            if (stripped) normalizedSpecific = stripped;
        }
        const segments = [环境?.大地点, 环境?.中地点, rawSmall, normalizedSpecific]
            .map((part) => (typeof part === 'string' ? part.trim() : ''))
            .filter(Boolean);
        const uniqueSegments = segments.filter((part, idx) => segments.indexOf(part) === idx);
        return uniqueSegments.length > 0 ? uniqueSegments.join(' - ') : '未知地点';
    }, [环境?.大地点, 环境?.中地点, 环境?.小地点, 环境?.具体地点]);

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
        <div className="h-20 md:h-24 w-full flex items-center justify-center relative overflow-visible z-50 bg-[#080808]">
            {/* Top Border with Pattern */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-ink-black via-wuxia-gold/40 to-ink-black"></div>
            
            {/* Decorative Background Texture */}
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')]"></div>
            
            {/* Main Content Flex */}
            <div className="flex items-center justify-between w-full px-4 md:px-20 relative z-10 h-full">
                
                {/* Left Side Information */}
                <div className="flex items-center">
                    <div className="md:hidden">
                        <button
                            type="button"
                            onClick={() => setMobileLeftMode(prev => (prev === 'weather' ? 'environment' : 'weather'))}
                            title="点击切换 天气 / 环境"
                            className="bg-transparent border-0 p-0"
                        >
                            <TopItem label={mobileLeftLabel} value={mobileLeftValue} />
                        </button>
                    </div>
                    <div className="hidden md:flex items-center">
                        <TopItem label="天气" value={环境.天气 || '未知'} />
                        <Divider />
                        <TopItem label="环境" value={environmentDisplay} />
                    </div>
                </div>

                {/* Center Plaque - The "Hanging" UI Element */}
                <div className="absolute left-1/2 top-0 transform -translate-x-1/2 h-full flex flex-col items-center justify-start pt-0 z-20">
                     {/* The Ropes */}
                    <div className="flex gap-8 md:gap-16 w-full justify-center absolute top-0">
                         <div className="w-[2px] h-7 md:h-8 bg-gradient-to-b from-wuxia-gold/40 to-black"></div>
                         <div className="w-[2px] h-7 md:h-8 bg-gradient-to-b from-wuxia-gold/40 to-black"></div>
                     </div>

                     {/* The Plaque Body */}
                     <div 
                        onClick={toggleFullScreen}
                        className="mt-2.5 md:mt-4 bg-[#111] border-2 border-double border-wuxia-gold/50 px-4 md:px-10 py-1.5 md:py-3 rounded-lg shadow-[0_10px_20px_rgba(0,0,0,0.8)] relative flex flex-col items-center min-w-[164px] md:min-w-[240px] transform hover:scale-105 transition-transform duration-500 cursor-pointer"
                     >
                         
                         {/* Inner Corner Decos */}
                         <div className="absolute top-1 left-1 w-2 h-2 border-t border-l border-wuxia-gold/50"></div>
                         <div className="absolute top-1 right-1 w-2 h-2 border-t border-r border-wuxia-gold/50"></div>
                         <div className="absolute bottom-1 left-1 w-2 h-2 border-b border-l border-wuxia-gold/50"></div>
                         <div className="absolute bottom-1 right-1 w-2 h-2 border-b border-r border-wuxia-gold/50"></div>

                         {/* Time Display */}
                         <div className="hidden md:block text-base md:text-xl font-bold font-serif text-wuxia-gold tracking-[0.08em] md:tracking-[0.1em] text-shadow">
                             {fullDateStr}
                         </div>
                         <div className="md:hidden text-wuxia-gold text-shadow text-center leading-tight">
                             <div className="text-[10px] font-serif tracking-[0.08em]">{mobileDateStr}</div>
                             <div className="text-base font-bold font-mono tracking-[0.12em]">{mobileClockStr}</div>
                         </div>
                         
                         {/* Location Badge (Hanging from Plaque) */}
                         <div className="absolute -bottom-2.5 md:-bottom-3 bg-wuxia-red text-white text-[8px] md:text-[10px] px-2 md:px-3 py-[1px] md:py-[2px] rounded border border-wuxia-gold/30 shadow-md flex items-center gap-1 z-30 font-bold tracking-widest max-w-[220px] md:max-w-[460px]">
                            <span className="opacity-90 truncate" title={locationBadge}>{locationBadge}</span>
                         </div>
                     </div>
                </div>

                {/* Right Side Information */}
                <div className="flex items-center">
                    <div className="md:hidden">
                        <button
                            type="button"
                            onClick={() => setMobileRightMode(prev => (prev === 'journey' ? 'festival' : 'journey'))}
                            title="点击切换 历程 / 节日"
                            className="bg-transparent border-0 p-0"
                        >
                            <TopItem
                                label={mobileRightLabel}
                                value={mobileRightValue}
                                highlight={mobileRightMode === 'festival' && !!currentFestival}
                            />
                        </button>
                    </div>
                    <div className="hidden md:flex items-center">
                        <TopItem
                            label="节日"
                            value={festivalDisplay}
                            highlight={!!currentFestival}
                        />
                        <Divider />
                        <TopItem label="历程" value={`第 ${环境.日期 || 1} 天`} />
                    </div>
                </div>

            </div>

            {/* Bottom Golden Line with Fade */}
            <div className="absolute bottom-0 w-full h-[1px] bg-gradient-to-r from-transparent via-wuxia-gold/50 to-transparent"></div>
        </div>
    );
};

export default TopBar;
