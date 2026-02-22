
import React from 'react';
import TopBar from './components/layout/TopBar';
import LeftPanel from './components/layout/LeftPanel';
import RightPanel from './components/layout/RightPanel';
import MobileQuickMenu from './components/layout/MobileQuickMenu';
import CharacterModal from './components/features/Character/CharacterModal';
import MobileCharacter from './components/features/Character/MobileCharacter';
import ChatList from './components/features/Chat/ChatList';
import InputArea from './components/features/Chat/InputArea';
import LandingPage from './components/layout/LandingPage';
import NewGameWizard from './components/features/NewGame/NewGameWizard';
import MobileNewGameWizard from './components/features/NewGame/mobile/MobileNewGameWizard';
import SettingsModal from './components/features/Settings/SettingsModal';
import MobileSettingsModal from './components/features/Settings/mobile/MobileSettingsModal';
import InventoryModal from './components/features/Inventory/InventoryModal'; 
import EquipmentModal from './components/features/Equipment/EquipmentModal'; 
import SocialModal from './components/features/Social/SocialModal'; 
import MobileSocial from './components/features/Social/MobileSocial';
import TeamModal from './components/features/Team/TeamModal';
import KungfuModal from './components/features/Kungfu/KungfuModal';
import WorldModal from './components/features/World/WorldModal';
import MapModal from './components/features/Map/MapModal';
import SectModal from './components/features/Sect/SectModal';
import MobileSect from './components/features/Sect/MobileSect';
import TaskModal from './components/features/Task/TaskModal'; 
import MobileTask from './components/features/Task/MobileTask';
import AgreementModal from './components/features/Agreement/AgreementModal';
import StoryModal from './components/features/Story/StoryModal'; 
import MobileStory from './components/features/Story/MobileStory';
import HeroinePlanModal from './components/features/Story/HeroinePlanModal';
import MemoryModal from './components/features/Memory/MemoryModal'; 
import MobileMemory from './components/features/Memory/MobileMemory';
import SaveLoadModal from './components/features/SaveLoad/SaveLoadModal'; // New
import InAppConfirmModal, { ConfirmOptions } from './components/ui/InAppConfirmModal';
import { useGame } from './hooks/useGame';

const App: React.FC = () => {
    const { state, meta, setters, actions } = useGame();
    const [showCharacter, setShowCharacter] = React.useState(false);
    const [isMobile, setIsMobile] = React.useState<boolean>(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia('(max-width: 767px)').matches;
    });
    const contextSnapshot = actions.getContextSnapshot();
    const confirmResolverRef = React.useRef<((value: boolean) => void) | null>(null);
    const [confirmState, setConfirmState] = React.useState<(ConfirmOptions & { open: boolean })>({
        open: false,
        title: '请确认',
        message: '',
        confirmText: '确认',
        cancelText: '取消',
        danger: false
    });

    const requestConfirm = React.useCallback((options: ConfirmOptions) => {
        return new Promise<boolean>((resolve) => {
            confirmResolverRef.current = resolve;
            setConfirmState({
                open: true,
                title: options.title || '请确认',
                message: options.message,
                confirmText: options.confirmText || '确认',
                cancelText: options.cancelText || '取消',
                danger: options.danger || false
            });
        });
    }, []);

    const resolveConfirm = React.useCallback((accepted: boolean) => {
        if (confirmResolverRef.current) {
            confirmResolverRef.current(accepted);
            confirmResolverRef.current = null;
        }
        setConfirmState((prev) => ({ ...prev, open: false }));
    }, []);

    React.useEffect(() => {
        const mq = window.matchMedia('(max-width: 767px)');
        const update = () => setIsMobile(mq.matches);
        update();
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
    }, []);

    const parseActionOptionText = (option: unknown): string => {
        if (typeof option === 'string') return option.trim();
        if (typeof option === 'number' || typeof option === 'boolean') return String(option);
        if (option && typeof option === 'object') {
            const obj = option as Record<string, unknown>;
            const candidates = [obj.text, obj.label, obj.action, obj.name, obj.id];
            for (const candidate of candidates) {
                if (typeof candidate === 'string' && candidate.trim().length > 0) {
                    return candidate.trim();
                }
            }
        }
        return '';
    };

    const parseGameTimestampToNumber = (timeStr?: string): number => {
        if (!timeStr || typeof timeStr !== 'string') return 0;
        const m = timeStr.trim().match(/^(\d{1,6}):(\d{1,2}):(\d{1,2}):(\d{1,2}):(\d{1,2})$/);
        if (!m) return 0;
        const year = Number(m[1]);
        const month = Number(m[2]);
        const day = Number(m[3]);
        const hour = Number(m[4]);
        const minute = Number(m[5]);
        return (((year * 12 + month) * 31 + day) * 24 + hour) * 60 + minute;
    };

    const tickerEvents = React.useMemo(() => {
        const ongoingEvents = Array.isArray(state.世界?.进行中事件) ? state.世界.进行中事件 : [];
        const formatted = ongoingEvents
            .filter(evt => evt && (evt.当前状态 === '进行中' || !evt.当前状态))
            .sort((a, b) => parseGameTimestampToNumber(b.开始时间) - parseGameTimestampToNumber(a.开始时间))
            .map(evt => {
                const type = evt.类型 || '事件';
                const start = evt.开始时间 || '未知时间';
                const title = evt.标题 || '无标题';
                const location = evt.发生地点 || '未知地点';
                return `【${type}】${start} ${title}（${location}）`;
            })
            .filter(Boolean);

        return formatted.length > 0 ? formatted : state.worldEvents;
    }, [state.世界, state.worldEvents]);

    const renderTickerItems = (items: string[], keyPrefix: string) => (
        items.map((e, i) => (
            <span key={`${keyPrefix}-${i}`} className="mx-5 inline-block">{e}</span>
        ))
    );

    // Extract options from the latest assistant message
    const lastMessage = state.历史记录[state.历史记录.length - 1];
    const currentOptions = (lastMessage?.role === 'assistant' && Array.isArray(lastMessage.structuredResponse?.action_options))
        ? lastMessage.structuredResponse.action_options
            .map(parseActionOptionText)
            .filter(item => item.length > 0)
        : [];

    const activeMobileWindow =
        showCharacter ? '角色' :
        state.showEquipment ? '装备' :
        state.showInventory ? '背包' :
        state.showSocial ? '社交' :
        state.showKungfu ? '功法' :
        state.showWorld ? '世界' :
        state.showMap ? '地图' :
        state.showTeam ? '队伍' :
        state.showSect ? '门派' :
        state.showTask ? '任务' :
        state.showAgreement ? '约定' :
        state.showStory ? '剧情' :
        state.showHeroinePlan ? '规划' :
        state.showMemory ? '记忆' :
        state.showSaveLoad.show ? (state.showSaveLoad.mode === 'save' ? '保存' : '读取') :
        state.showSettings ? '设置' :
        null;

    const closeAllPanels = () => {
        setShowCharacter(false);
        setters.setShowInventory(false);
        setters.setShowEquipment(false);
        setters.setShowTeam(false);
        setters.setShowSocial(false);
        setters.setShowKungfu(false);
        setters.setShowWorld(false);
        setters.setShowMap(false);
        setters.setShowSect(false);
        setters.setShowTask(false);
        setters.setShowAgreement(false);
        setters.setShowStory(false);
        setters.setShowHeroinePlan(false);
        setters.setShowMemory(false);
        setters.setShowSaveLoad({ show: false, mode: 'save' });
        setters.setShowSettings(false);
    };

    const handleMobileMenuClick = (menu: string) => {
        const isActive = activeMobileWindow === menu;
        closeAllPanels();
        if (isActive) return;

        switch (menu) {
            case '角色':
                setShowCharacter(true);
                break;
            case '装备':
                setters.setShowEquipment(true);
                break;
            case '背包':
                setters.setShowInventory(true);
                break;
            case '社交':
                setters.setShowSocial(true);
                break;
            case '功法':
                setters.setShowKungfu(true);
                break;
            case '世界':
                setters.setShowWorld(true);
                break;
            case '地图':
                setters.setShowMap(true);
                break;
            case '队伍':
                setters.setShowTeam(true);
                break;
            case '门派':
                setters.setShowSect(true);
                break;
            case '任务':
                setters.setShowTask(true);
                break;
            case '约定':
                setters.setShowAgreement(true);
                break;
            case '剧情':
                setters.setShowStory(true);
                break;
            case '规划':
                setters.setShowHeroinePlan(true);
                break;
            case '记忆':
                setters.setShowMemory(true);
                break;
            case '保存':
                setters.setShowSaveLoad({ show: true, mode: 'save' });
                break;
            case '读取':
                setters.setShowSaveLoad({ show: true, mode: 'load' });
                break;
            case '设置':
                setters.setShowSettings(true);
                break;
            default:
                break;
        }
    };

    return (
        <div className="h-screen w-screen overflow-hidden bg-black relative flex flex-col p-3 transition-colors duration-500">
            
            {/* View Switching */}
            {state.view === 'home' && (
                <LandingPage 
                    onStart={actions.handleStartNewGameWizard}
                    onLoad={() => setters.setShowSaveLoad({ show: true, mode: 'load' })}
                    onSettings={() => setters.setShowSettings(true)}
                    hasSave={state.hasSave}
                />
            )}

            {state.view === 'new_game' && (
                isMobile ? (
                    <MobileNewGameWizard
                        onComplete={actions.handleGenerateWorld}
                        onCancel={() => { state.setView('home'); }}
                        loading={state.loading}
                        requestConfirm={requestConfirm}
                    />
                ) : (
                    <NewGameWizard
                        onComplete={actions.handleGenerateWorld}
                        onCancel={() => { state.setView('home'); }}
                        loading={state.loading}
                        requestConfirm={requestConfirm}
                    />
                )
            )}

            {state.view === 'game' && (
                /* Main Game Frame Container */
                <div className="relative flex-1 flex flex-col w-full h-full rounded-2xl overflow-hidden bg-ink-wash shadow-2xl">
                    
                    {/* Custom Background Layer */}
                    {state.visualConfig.背景图片 && (
                         <div 
                            className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-700 opacity-60 pointer-events-none"
                            style={{ backgroundImage: `url(${state.visualConfig.背景图片})` }}
                         ></div>
                    )}
                    
                    {/* Noise Overlay */}
                    <div className="absolute inset-0 bg-noise opacity-50 pointer-events-none z-[5]"></div>

                    {/* 顶部导航栏 */}
                    <div className="shrink-0 z-40 bg-ink-black/90 border-b border-wuxia-gold/20 shadow-[0_10px_30px_rgba(0,0,0,0.8)] relative rounded-t-xl overflow-visible mx-1 mt-1">
                        <TopBar 
                            环境={state.环境} 
                            timeFormat={state.visualConfig.时间显示格式}
                            festivals={state.festivals}
                        />
                    </div>

                    {/* 中间主要互动区域 */}
                    <div className="flex-1 flex overflow-hidden relative z-10 mx-1 mb-1">
                        
                        {/* 左侧栏 */}
                        <div className="hidden md:block w-1/5 h-full relative z-20 bg-ink-black/95 border-r border-wuxia-gold/20 flex flex-col shadow-[10px_0_20px_rgba(0,0,0,0.5)]">
                            <LeftPanel 角色={state.角色} />
                        </div>

                        {/* 中间栏 - Chat Area */}
                        <div className="flex-1 flex flex-col relative z-0 min-w-0 transition-colors duration-500">
                            <ChatList 
                                history={state.历史记录} 
                                loading={state.loading} 
                                scrollRef={state.scrollRef}
                                onUpdateHistory={actions.updateHistoryItem} 
                                renderCount={state.visualConfig.渲染层数} 
                            />
                            <InputArea 
                                onSend={actions.handleSend} 
                                onStop={actions.handleStop}
                                onRegenerate={actions.handleRegenerate}
                                onQuickRestart={actions.handleQuickRestart}
                                requestConfirm={requestConfirm}
                                loading={state.loading} 
                                canReroll={meta.canRerollLatest}
                                canQuickRestart={meta.canQuickRestart}
                                options={currentOptions}
                            />
                        </div>

                        {/* 右侧栏 */}
                        <div className="hidden md:block w-1/5 h-full relative z-20 bg-ink-black/95 border-l border-wuxia-gold/20 flex flex-col shadow-[-10px_0_20px_rgba(0,0,0,0.5)]">
                            <RightPanel 
                                onOpenSettings={() => setters.setShowSettings(true)} 
                                onOpenInventory={() => setters.setShowInventory(true)}
                                onOpenEquipment={() => setters.setShowEquipment(true)} 
                                onOpenTeam={() => setters.setShowTeam(true)}
                                onOpenSocial={() => setters.setShowSocial(true)}
                                onOpenKungfu={() => setters.setShowKungfu(true)}
                                onOpenWorld={() => setters.setShowWorld(true)}
                                onOpenMap={() => setters.setShowMap(true)}
                                onOpenSect={() => setters.setShowSect(true)}
                                onOpenTask={() => setters.setShowTask(true)} 
                                onOpenAgreement={() => setters.setShowAgreement(true)} 
                                onOpenStory={() => setters.setShowStory(true)}
                                onOpenHeroinePlan={() => setters.setShowHeroinePlan(true)}
                                onOpenMemory={() => setters.setShowMemory(true)}
                                enableHeroinePlan={state.gameConfig.启用女主剧情规划 === true}
                                onSave={() => setters.setShowSaveLoad({ show: true, mode: 'save' })}
                                onLoad={() => setters.setShowSaveLoad({ show: true, mode: 'load' })}
                            />
                        </div>
                    </div>

                    {/* 移动端快捷菜单 */}
                    <MobileQuickMenu
                        activeWindow={activeMobileWindow}
                        onMenuClick={handleMobileMenuClick}
                        enableHeroinePlan={state.gameConfig.启用女主剧情规划 === true}
                    />

                    {/* 移动端底部世界大事栏 */}
                    <div className="md:hidden shrink-0 h-7 bg-ink-black/90 border-t border-wuxia-gold/20 flex items-center text-[10px] font-mono text-wuxia-gold-dark relative mx-1 mb-1 overflow-hidden pb-[env(safe-area-inset-bottom)]">
                        <div className="shrink-0 h-full px-2 flex items-center border-r border-gray-800 text-wuxia-gold/90 tracking-wider">
                            世界大事
                        </div>
                        <div className="flex-1 overflow-hidden relative h-full flex items-center">
                            <div className="absolute left-0 top-0 bottom-0 w-5 bg-gradient-to-r from-ink-black to-transparent z-10 pointer-events-none"></div>
                            <div className="absolute right-0 top-0 bottom-0 w-5 bg-gradient-to-l from-ink-black to-transparent z-10 pointer-events-none"></div>
                            {tickerEvents && tickerEvents.length > 0 ? (
                                <div className="w-full overflow-hidden">
                                    <div
                                        className="flex items-center gap-8 whitespace-nowrap min-w-max animate-marquee-linear text-[10px] text-wuxia-gold/70 tracking-wide"
                                        style={{ ['--marquee-duration' as any]: '28s' }}
                                    >
                                        <div className="flex items-center gap-8">
                                            {renderTickerItems(tickerEvents, 'm')}
                                        </div>
                                        <div className="flex items-center gap-8" aria-hidden>
                                            {renderTickerItems(tickerEvents, 'm-dup')}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full text-center text-[10px] text-gray-700 tracking-wider">
                                    江湖平静，暂无大事发生...
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 底部状态栏 */}
                    <div className="hidden md:flex shrink-0 h-8 bg-ink-black/90 border-t border-wuxia-gold/20 justify-between px-4 items-center text-xs font-mono text-wuxia-gold-dark z-50 shadow-[0_-5px_15px_rgba(0,0,0,0.8)] relative rounded-b-xl mx-1 mb-1 overflow-hidden">
                        
                        {/* Left Label: World Events */}
                         <div className="shrink-0 text-wuxia-gold font-bold mr-2 z-20 bg-ink-black/90 px-2 flex items-center h-full border-r border-gray-800">
                            【世界大事】
                         </div>

                        {/* Center Ticker */}
                        <div className="flex-1 overflow-hidden relative h-full flex items-center mx-2">
                            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-ink-black to-transparent z-10 pointer-events-none"></div>
                            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-ink-black to-transparent z-10 pointer-events-none"></div>
                            
                            {tickerEvents && tickerEvents.length > 0 ? (
                                <div className="w-full overflow-hidden">
                                    <div
                                        className="flex items-center gap-10 whitespace-nowrap min-w-max animate-marquee-linear text-[10px] text-wuxia-gold/70 font-mono tracking-wider"
                                        style={{ ['--marquee-duration' as any]: '36s' }}
                                    >
                                        <div className="flex items-center gap-10">
                                            {renderTickerItems(tickerEvents, 'd')}
                                        </div>
                                        <div className="flex items-center gap-10" aria-hidden>
                                            {renderTickerItems(tickerEvents, 'd-dup')}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                 <div className="w-full text-center text-[10px] text-gray-700 font-mono tracking-widest">
                                     江湖平静，暂无大事发生...
                                 </div>
                            )}
                        </div>
                        
                        {/* Right Label: Version */}
                        <div className="shrink-0 text-wuxia-gold font-bold ml-2 z-20 bg-ink-black/90 px-2 flex items-center h-full border-l border-gray-800">
                            【V0.0.1】
                        </div>
                    </div>
                </div>
            )}

            {/* Global Golden Border Frame */}
            <div className="pointer-events-none fixed inset-3 z-[100] border-4 border-double border-wuxia-gold/40 rounded-2xl shadow-[inset_0_0_30px_rgba(0,0,0,0.5)]">
                {/* Corner Ornaments */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-wuxia-gold rounded-tl-xl shadow-[-2px_-2px_5px_rgba(0,0,0,0.5)]"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-wuxia-gold rounded-tr-xl shadow-[2px_-2px_5px_rgba(0,0,0,0.5)]"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-wuxia-gold rounded-bl-xl shadow-[-2px_2px_5px_rgba(0,0,0,0.5)]"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-wuxia-gold rounded-br-xl shadow-[2px_2px_5px_rgba(0,0,0,0.5)]"></div>
                
                {/* Mid-point Accents */}
                <div className="absolute top-1/2 left-0 w-1 h-12 -translate-y-1/2 bg-wuxia-gold/60"></div>
                <div className="absolute top-1/2 right-0 w-1 h-12 -translate-y-1/2 bg-wuxia-gold/60"></div>
            </div>

            {/* Save/Load Modal */}
            {state.showSaveLoad.show && (
                <SaveLoadModal 
                    onClose={() => setters.setShowSaveLoad({ show: false, mode: 'save' })}
                    onLoadGame={actions.handleLoadGame}
                    onSaveGame={actions.handleSaveGame}
                    mode={state.showSaveLoad.mode}
                    requestConfirm={requestConfirm}
                />
            )}

            {/* Settings Modal - Visible in both views if requested */}
            {state.showSettings && (
                isMobile ? (
                    <MobileSettingsModal
                        activeTab={state.activeTab}
                        onTabChange={setters.setActiveTab}
                        onClose={() => setters.setShowSettings(false)}
                        apiConfig={state.apiConfig}
                        visualConfig={state.visualConfig}
                        gameConfig={state.gameConfig}
                        memoryConfig={state.memoryConfig}
                        prompts={state.prompts}
                        festivals={state.festivals}
                        currentTheme={state.currentTheme}
                        history={state.历史记录}
                        memorySystem={state.记忆系统}
                        contextSnapshot={contextSnapshot}
                        onSaveApi={actions.saveSettings}
                        onSaveVisual={actions.saveVisualSettings}
                        onSaveGame={actions.saveGameSettings}
                        onSaveMemory={actions.saveMemorySettings}
                        onUpdatePrompts={actions.updatePrompts}
                        onUpdateFestivals={actions.updateFestivals}
                        onThemeChange={setters.setCurrentTheme}
                        requestConfirm={requestConfirm}
                        onReturnToHome={async () => {
                            const ok = await requestConfirm({
                                title: '返回首页',
                                message: '确定要返回首页吗？未保存的进度将会丢失。',
                                confirmText: '返回',
                                danger: true
                            });
                            if (!ok) return;
                            actions.handleReturnToHome();
                            setters.setShowSettings(false);
                        }}
                        isHome={state.view === 'home'}
                    />
                ) : (
                    <SettingsModal
                        activeTab={state.activeTab}
                        onTabChange={setters.setActiveTab}
                        onClose={() => setters.setShowSettings(false)}
                        apiConfig={state.apiConfig}
                        visualConfig={state.visualConfig}
                        gameConfig={state.gameConfig}
                        memoryConfig={state.memoryConfig}
                        prompts={state.prompts}
                        festivals={state.festivals}
                        currentTheme={state.currentTheme}
                        history={state.历史记录}
                        memorySystem={state.记忆系统}
                        contextSnapshot={contextSnapshot}
                        onSaveApi={actions.saveSettings}
                        onSaveVisual={actions.saveVisualSettings}
                        onSaveGame={actions.saveGameSettings}
                        onSaveMemory={actions.saveMemorySettings}
                        onUpdatePrompts={actions.updatePrompts}
                        onUpdateFestivals={actions.updateFestivals}
                        onThemeChange={setters.setCurrentTheme}
                        requestConfirm={requestConfirm}
                        onReturnToHome={async () => {
                            const ok = await requestConfirm({
                                title: '返回首页',
                                message: '确定要返回首页吗？未保存的进度将会丢失。',
                                confirmText: '返回',
                                danger: true
                            });
                            if (!ok) return;
                            actions.handleReturnToHome();
                            setters.setShowSettings(false);
                        }}
                        isHome={state.view === 'home'}
                    />
                )
            )}

            <InAppConfirmModal
                open={confirmState.open}
                title={confirmState.title}
                message={confirmState.message}
                confirmText={confirmState.confirmText}
                cancelText={confirmState.cancelText}
                danger={confirmState.danger}
                onConfirm={() => resolveConfirm(true)}
                onCancel={() => resolveConfirm(false)}
            />

            {/* In-Game Modals */}
            {state.view === 'game' && (
                <>
                    {state.showInventory && (
                        <InventoryModal 
                            character={state.角色} 
                            onClose={() => setters.setShowInventory(false)} 
                        />
                    )}

                    {showCharacter && (
                        <>
                            <CharacterModal
                                character={state.角色}
                                onClose={() => setShowCharacter(false)}
                            />
                            <MobileCharacter
                                character={state.角色}
                                onClose={() => setShowCharacter(false)}
                            />
                        </>
                    )}

                    {state.showEquipment && (
                        <EquipmentModal 
                            character={state.角色} 
                            onClose={() => setters.setShowEquipment(false)} 
                        />
                    )}

                    {state.showTeam && (
                        <TeamModal
                            character={state.角色}
                            teammates={state.社交} 
                            onClose={() => setters.setShowTeam(false)}
                        />
                    )}

                    {state.showSocial && (
                        <>
                            <SocialModal 
                                socialList={state.社交} 
                                onClose={() => setters.setShowSocial(false)} 
                                playerName={state.角色.姓名} 
                            />
                            <MobileSocial
                                socialList={state.社交}
                                onClose={() => setters.setShowSocial(false)}
                                playerName={state.角色.姓名}
                            />
                        </>
                    )}

                    {state.showKungfu && (
                        <KungfuModal
                            skills={state.角色.功法列表}
                            onClose={() => setters.setShowKungfu(false)}
                        />
                    )}

                    {state.showWorld && (
                        <WorldModal
                            world={state.世界}
                            onClose={() => setters.setShowWorld(false)}
                        />
                    )}

                    {state.showMap && (
                        <MapModal
                            world={state.世界}
                            env={state.环境}
                            onClose={() => setters.setShowMap(false)}
                        />
                    )}

                    {state.showSect && (
                        <>
                            <SectModal
                                sectData={state.玩家门派}
                                currentTime={state.环境.时间} 
                                onClose={() => setters.setShowSect(false)}
                            />
                            <MobileSect
                                sectData={state.玩家门派}
                                currentTime={state.环境.时间}
                                onClose={() => setters.setShowSect(false)}
                            />
                        </>
                    )}

                    {state.showTask && (
                        <>
                            <TaskModal
                                tasks={state.任务列表}
                                onClose={() => setters.setShowTask(false)}
                            />
                            <MobileTask
                                tasks={state.任务列表}
                                onClose={() => setters.setShowTask(false)}
                            />
                        </>
                    )}

                    {state.showAgreement && (
                        <AgreementModal
                            agreements={state.约定列表}
                            onClose={() => setters.setShowAgreement(false)}
                        />
                    )}

                    {state.showStory && (
                        <>
                            <StoryModal
                                story={state.剧情}
                                onClose={() => setters.setShowStory(false)}
                            />
                            <MobileStory
                                story={state.剧情}
                                onClose={() => setters.setShowStory(false)}
                            />
                        </>
                    )}

                    {state.showHeroinePlan && state.gameConfig.启用女主剧情规划 === true && (
                        <HeroinePlanModal
                            plan={state.女主剧情规划}
                            onClose={() => setters.setShowHeroinePlan(false)}
                        />
                    )}

                    {state.showMemory && (
                        <>
                            <MemoryModal
                                history={state.历史记录}
                                memorySystem={state.记忆系统} // Pass Memory System
                                onClose={() => setters.setShowMemory(false)}
                                currentTime={state.环境?.时间}
                            />
                            <MobileMemory
                                history={state.历史记录}
                                memorySystem={state.记忆系统}
                                onClose={() => setters.setShowMemory(false)}
                                currentTime={state.环境?.时间}
                            />
                        </>
                    )}
                </>
            )}

        </div>
    );
};

export default App;
