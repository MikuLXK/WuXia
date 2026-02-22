import React, { useMemo, useState } from 'react';

interface Props {
    activeWindow: string | null;
    onMenuClick: (menu: string) => void;
    enableHeroinePlan?: boolean;
}

type IconName =
    | 'profile'
    | 'equipment'
    | 'bag'
    | 'social'
    | 'kungfu'
    | 'world'
    | 'map'
    | 'more'
    | 'team'
    | 'sect'
    | 'task'
    | 'agreement'
    | 'story'
    | 'plan'
    | 'memory'
    | 'settings'
    | 'save'
    | 'load'
    | 'grid';

const PRIMARY_MENUS = ['角色', '装备', '背包', '社交', '世界'];

const MENU_ICON_MAP: Record<string, IconName> = {
    角色: 'profile',
    装备: 'equipment',
    背包: 'bag',
    社交: 'social',
    功法: 'kungfu',
    世界: 'world',
    地图: 'map',
    队伍: 'team',
    门派: 'sect',
    任务: 'task',
    约定: 'agreement',
    剧情: 'story',
    规划: 'plan',
    记忆: 'memory',
    设置: 'settings',
    保存: 'save',
    读取: 'load',
};

const getIcon = (menu: string): IconName => MENU_ICON_MAP[menu] || 'grid';

const MobileQuickMenu: React.FC<Props> = ({ activeWindow, onMenuClick, enableHeroinePlan = false }) => {
    const [showAllMenus, setShowAllMenus] = useState(false);
    const allMenus = useMemo(() => ([
        ...PRIMARY_MENUS,
        '地图',
        '功法',
        '队伍',
        '门派',
        '任务',
        '约定',
        '剧情',
        ...(enableHeroinePlan ? ['规划'] : []),
        '记忆',
        '保存',
        '读取',
        '设置',
    ]), [enableHeroinePlan]);

    const handleMenuClick = (menu: string) => {
        onMenuClick(menu);
        setShowAllMenus(false);
    };

    return (
        <div className="md:hidden border-t border-wuxia-gold/20 bg-gradient-to-t from-ink-black via-ink-black/95 to-ink-black/80 backdrop-blur-sm shadow-[0_-12px_24px_rgba(0,0,0,0.38)] pb-2">
            <div className="px-2 pt-1.5">
                <div className="relative rounded-2xl border border-gray-800 bg-black/40 overflow-hidden">
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                    <div className="grid grid-cols-6">
                        {PRIMARY_MENUS.map((menu) => (
                            <QuickButton
                                key={menu}
                                icon={getIcon(menu)}
                                label={menu}
                                active={activeWindow === menu}
                                onClick={() => handleMenuClick(menu)}
                            />
                        ))}
                        <QuickButton
                            icon="more"
                            label={showAllMenus ? '收起' : '更多'}
                            active={showAllMenus}
                            onClick={() => setShowAllMenus((prev) => !prev)}
                        />
                    </div>
                </div>
            </div>

            {showAllMenus && (
                <div className="px-2 pt-2 pb-1">
                    <div className="rounded-2xl border border-gray-800 bg-black/50 shadow-[0_8px_20px_rgba(0,0,0,0.4)] overflow-hidden">
                        <div className="px-3 py-2 border-b border-gray-800 flex items-center justify-between">
                            <span className="text-[10px] tracking-[0.18em] text-gray-500">全部功能</span>
                            <span className="text-[10px] text-wuxia-cyan/80">{allMenus.length} 项</span>
                        </div>
                        <div className="max-h-44 overflow-y-auto no-scrollbar p-2">
                            <div className="grid grid-cols-4 gap-2">
                                {allMenus.map((menu) => (
                                    <MenuTile
                                        key={menu}
                                        icon={getIcon(menu)}
                                        label={menu}
                                        active={activeWindow === menu}
                                        onClick={() => handleMenuClick(menu)}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const QuickButton = ({
    icon,
    label,
    active,
    onClick,
}: {
    icon: IconName;
    label: string;
    active?: boolean;
    onClick: () => void;
}) => (
    <button
        type="button"
        onClick={onClick}
        className={`relative h-14 flex flex-col items-center justify-center gap-1 transition-colors ${
            active ? 'text-wuxia-gold' : 'text-gray-400 hover:text-gray-100'
        }`}
    >
        {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-7 h-0.5 bg-wuxia-gold rounded-full" />}
        <span className={`h-8 w-8 flex items-center justify-center translate-y-0.5 transition-all ${
            active ? 'scale-110 drop-shadow-[0_0_8px_rgba(230,200,110,0.45)]' : ''
        }`}>
            <IconGlyph name={icon} className="h-5 w-5" />
        </span>
        <span className={`text-[10px] tracking-[0.14em] -translate-y-0.5 transition-colors ${
            active ? 'text-wuxia-gold' : 'text-gray-400'
        }`}>
            {label}
        </span>
    </button>
);

const MenuTile = ({
    icon,
    label,
    active,
    onClick,
}: {
    icon: IconName;
    label: string;
    active?: boolean;
    onClick: () => void;
}) => (
    <button
        type="button"
        onClick={onClick}
        className={`h-16 border rounded-xl flex flex-col items-center justify-center gap-1.5 transition-colors ${
            active
                ? 'border-wuxia-gold/80 bg-wuxia-gold/10 text-wuxia-gold'
                : 'border-gray-800 bg-black/20 text-gray-300 hover:border-wuxia-cyan/60 hover:text-white'
        }`}
    >
        <span className={`h-8 w-8 flex items-center justify-center translate-y-0.5 transition-all ${
            active ? 'scale-110 drop-shadow-[0_0_8px_rgba(230,200,110,0.45)]' : ''
        }`}>
            <IconGlyph name={icon} className="h-5 w-5" />
        </span>
        <span className="text-[10px] tracking-[0.12em]">{label}</span>
    </button>
);

const IconGlyph = ({ name, className }: { name: IconName; className?: string }) => {
    const svgClass = className || 'h-4 w-4';

    switch (name) {
        case 'profile':
            return <svg viewBox="0 0 24 24" className={svgClass} fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="3.2" /><path d="M5.5 19c1.2-3.1 3.4-4.7 6.5-4.7s5.3 1.6 6.5 4.7" /></svg>;
        case 'equipment':
            return <svg viewBox="0 0 24 24" className={svgClass} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m4.5 7 4-2.5 2.5 2.5-2.5 4z" /><path d="m10 10 7 7" /><path d="m16.5 16.5-2 2" /></svg>;
        case 'bag':
            return <svg viewBox="0 0 24 24" className={svgClass} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M7 8h10l-1 11H8L7 8Z" /><path d="M9.5 8V7a2.5 2.5 0 0 1 5 0v1" /></svg>;
        case 'social':
            return <svg viewBox="0 0 24 24" className={svgClass} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4.5 6.5h15v9h-7l-4 3v-3h-4z" /></svg>;
        case 'kungfu':
            return <svg viewBox="0 0 24 24" className={svgClass} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4.5 6.5h6.5v11H4.5zM13 6.5h6.5v11H13z" /><path d="M11 7.5c.7-.6 1.4-.9 2-.9" /></svg>;
        case 'world':
            return <svg viewBox="0 0 24 24" className={svgClass} fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="8" /><path d="M4.6 12h14.8M12 4.2c2.5 2.3 2.5 13.3 0 15.6M12 4.2c-2.5 2.3-2.5 13.3 0 15.6" /></svg>;
        case 'map':
            return <svg viewBox="0 0 24 24" className={svgClass} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3.5 6.5 8.5 4l7 2.5 5-2v13l-5 2-7-2.5-5 2z" /><path d="M8.5 4v12.5M15.5 6.5V19" /></svg>;
        case 'more':
            return <svg viewBox="0 0 24 24" className={svgClass} fill="currentColor"><circle cx="6" cy="6" r="1.6" /><circle cx="12" cy="6" r="1.6" /><circle cx="18" cy="6" r="1.6" /><circle cx="6" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="18" cy="12" r="1.6" /><circle cx="6" cy="18" r="1.6" /><circle cx="12" cy="18" r="1.6" /><circle cx="18" cy="18" r="1.6" /></svg>;
        case 'team':
            return <svg viewBox="0 0 24 24" className={svgClass} fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="9" r="2.5" /><circle cx="15.5" cy="10.5" r="2" /><path d="M4.8 18c.8-2.5 2.4-3.8 4.8-3.8s4 .9 5 2.8" /></svg>;
        case 'sect':
            return <svg viewBox="0 0 24 24" className={svgClass} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4.5 9h15" /><path d="M6.5 9v8M12 9v8M17.5 9v8" /><path d="m4 9 8-4 8 4M4.5 19h15" /></svg>;
        case 'task':
            return <svg viewBox="0 0 24 24" className={svgClass} fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="6" y="4.5" width="12" height="15" rx="1.5" /><path d="M9 8h6M9 12h6M9 16h4" /></svg>;
        case 'agreement':
            return <svg viewBox="0 0 24 24" className={svgClass} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M7 6.5h10v11H7z" /><path d="M9.5 9.5h5M9.5 12h5M9.5 14.5h3" /><path d="m14.5 16.5 1.2 1.2 2.8-2.8" /></svg>;
        case 'story':
            return <svg viewBox="0 0 24 24" className={svgClass} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5.5 5.5h13v13h-13z" /><path d="M8.5 9h7M8.5 12h7M8.5 15h4" /></svg>;
        case 'plan':
            return <svg viewBox="0 0 24 24" className={svgClass} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4.5 6.5h15v11h-15z" /><path d="M7.5 9.5h9M7.5 12.5h5" /><path d="m13.5 14.5 1.5 1.5 3-3" /></svg>;
        case 'memory':
            return <svg viewBox="0 0 24 24" className={svgClass} fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="7.5" /><path d="M12 8.3V12l3 1.7" /></svg>;
        case 'save':
            return <svg viewBox="0 0 24 24" className={svgClass} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 4.5h10l2 2V19H6z" /><path d="M8.5 4.5v5h7v-5M8.5 19v-5h7v5" /></svg>;
        case 'load':
            return <svg viewBox="0 0 24 24" className={svgClass} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 6.5h12V18H6z" /><path d="m12 9.5-3 3h2v2h2v-2h2z" /></svg>;
        case 'settings':
            return <svg viewBox="0 0 24 24" className={svgClass} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m12 3.8 1.2 1.8 2.1.4.4 2.1 1.8 1.2-1.8 1.2-.4 2.1-2.1.4-1.2 1.8-1.2-1.8-2.1-.4-.4-2.1-1.8-1.2 1.8-1.2.4-2.1 2.1-.4z" /><circle cx="12" cy="10.8" r="2.2" /></svg>;
        default:
            return <svg viewBox="0 0 24 24" className={svgClass} fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="5" y="5" width="5.5" height="5.5" /><rect x="13.5" y="5" width="5.5" height="5.5" /><rect x="5" y="13.5" width="5.5" height="5.5" /><rect x="13.5" y="13.5" width="5.5" height="5.5" /></svg>;
    }
};

export default MobileQuickMenu;
