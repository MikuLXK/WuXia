
import React from 'react';
import TopBar from './components/layout/TopBar';
import LeftPanel from './components/layout/LeftPanel';
import RightPanel from './components/layout/RightPanel';
import ChatList from './components/features/Chat/ChatList';
import InputArea from './components/features/Chat/InputArea';
import LandingPage from './components/layout/LandingPage';
import NewGameWizard from './components/features/NewGame/NewGameWizard';
import SettingsModal from './components/features/Settings/SettingsModal';
import InventoryModal from './components/features/Inventory/InventoryModal'; 
import EquipmentModal from './components/features/Equipment/EquipmentModal'; 
import SocialModal from './components/features/Social/SocialModal'; 
import TeamModal from './components/features/Team/TeamModal';
import KungfuModal from './components/features/Kungfu/KungfuModal';
import WorldModal from './components/features/World/WorldModal';
import SectModal from './components/features/Sect/SectModal';
import TaskModal from './components/features/Task/TaskModal'; 
import AgreementModal from './components/features/Agreement/AgreementModal';
import StoryModal from './components/features/Story/StoryModal'; 
import MemoryModal from './components/features/Memory/MemoryModal'; 
import SaveLoadModal from './components/features/SaveLoad/SaveLoadModal'; // New
import { useGame } from './hooks/useGame';

const App: React.FC = () => {
    const { state, setters, actions } = useGame();

    // Extract options from the latest assistant message
    const lastMessage = state.历史记录[state.历史记录.length - 1];
    const currentOptions = (lastMessage?.role === 'assistant' && lastMessage.structuredResponse?.action_options) 
        ? lastMessage.structuredResponse.action_options 
        : [];

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
                <NewGameWizard 
                    onComplete={actions.handleGenerateWorld}
                    onCancel={() => { state.setView('home'); }}
                    loading={state.loading}
                />
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
                                loading={state.loading} 
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
                                onOpenSect={() => setters.setShowSect(true)}
                                onOpenTask={() => setters.setShowTask(true)} 
                                onOpenAgreement={() => setters.setShowAgreement(true)} 
                                onOpenStory={() => setters.setShowStory(true)}
                                onOpenMemory={() => setters.setShowMemory(true)}
                                onSave={() => setters.setShowSaveLoad({ show: true, mode: 'save' })}
                                onLoad={() => setters.setShowSaveLoad({ show: true, mode: 'load' })}
                            />
                        </div>
                    </div>

                    {/* 底部状态栏 */}
                    <div className="shrink-0 h-8 bg-ink-black/90 border-t border-wuxia-gold/20 flex justify-between px-4 items-center text-xs font-mono text-wuxia-gold-dark z-50 shadow-[0_-5px_15px_rgba(0,0,0,0.8)] relative rounded-b-xl mx-1 mb-1 overflow-hidden">
                        
                        {/* Left Label: World Events */}
                         <div className="shrink-0 text-wuxia-gold font-bold mr-2 z-20 bg-ink-black/90 px-2 flex items-center h-full border-r border-gray-800">
                            【世界大事】
                         </div>

                        {/* Center Ticker */}
                        <div className="flex-1 overflow-hidden relative h-full flex items-center mx-2">
                            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-ink-black to-transparent z-10 pointer-events-none"></div>
                            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-ink-black to-transparent z-10 pointer-events-none"></div>
                            
                            {state.worldEvents && state.worldEvents.length > 0 ? (
                                <div className="whitespace-nowrap animate-marquee text-[10px] text-wuxia-gold/70 font-mono tracking-wider">
                                    {state.worldEvents.map((e, i) => (
                                        <span key={i} className="mx-8 inline-block">{e}</span>
                                    ))}
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
                />
            )}

            {/* Settings Modal - Visible in both views if requested */}
            {state.showSettings && (
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
                    onSaveApi={actions.saveSettings}
                    onSaveVisual={actions.saveVisualSettings}
                    onSaveGame={actions.saveGameSettings} 
                    onSaveMemory={actions.saveMemorySettings} 
                    onUpdatePrompts={actions.updatePrompts}
                    onUpdateFestivals={actions.updateFestivals}
                    onThemeChange={setters.setCurrentTheme}
                    
                    // New props for return home
                    onReturnToHome={() => {
                        if (actions.handleReturnToHome()) {
                            setters.setShowSettings(false);
                        }
                    }}
                    isHome={state.view === 'home'}
                />
            )}

            {/* In-Game Modals */}
            {state.view === 'game' && (
                <>
                    {state.showInventory && (
                        <InventoryModal 
                            character={state.角色} 
                            onClose={() => setters.setShowInventory(false)} 
                        />
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
                        <SocialModal 
                            socialList={state.社交} 
                            onClose={() => setters.setShowSocial(false)} 
                            playerName={state.角色.姓名} 
                        />
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

                    {state.showSect && (
                        <SectModal
                            sectData={state.玩家门派}
                            currentTime={`${state.环境.日期}日 ${state.环境.时间}`} 
                            onClose={() => setters.setShowSect(false)}
                        />
                    )}

                    {state.showTask && (
                        <TaskModal
                            tasks={state.任务列表}
                            onClose={() => setters.setShowTask(false)}
                        />
                    )}

                    {state.showAgreement && (
                        <AgreementModal
                            agreements={state.约定列表}
                            onClose={() => setters.setShowAgreement(false)}
                        />
                    )}

                    {state.showStory && (
                        <StoryModal
                            story={state.剧情}
                            onClose={() => setters.setShowStory(false)}
                        />
                    )}

                    {state.showMemory && (
                        <MemoryModal
                            history={state.历史记录}
                            memorySystem={state.记忆系统} // Pass Memory System
                            onClose={() => setters.setShowMemory(false)}
                        />
                    )}
                </>
            )}

        </div>
    );
};

export default App;
