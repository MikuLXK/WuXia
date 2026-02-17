
import React from 'react';
import GameButton from '../ui/GameButton';
import { useGameState } from '../../hooks/useGameState'; // Import for type reference if needed, but props are passed

interface Props {
    onOpenSettings: () => void;
    onOpenInventory: () => void;
    onOpenEquipment: () => void; 
    onOpenTeam: () => void;
    onOpenSocial: () => void;
    onOpenKungfu: () => void;
    onOpenWorld: () => void;
    onOpenSect: () => void;
    onOpenTask: () => void; 
    onOpenAgreement: () => void;
    onOpenStory: () => void; 
    onOpenMemory: () => void; 
    onSave: () => void; // Now triggers Modal open logic
    onLoad: () => void; // Now triggers Modal open logic
}

const RightPanel: React.FC<Props> = ({ 
    onOpenSettings, onOpenInventory, onOpenEquipment, onOpenTeam, 
    onOpenSocial, onOpenKungfu, onOpenWorld, onOpenSect, 
    onOpenTask, onOpenAgreement, onOpenStory, onOpenMemory,
    onSave, onLoad 
}) => {
    
    // Updated Menu Items Order:
    // ... -> Task -> Agreement -> Story -> Memory
    const MENU_ITEMS = [
        { label: '装备', action: onOpenEquipment, color: 'primary' },
        { label: '背包', action: onOpenInventory, color: 'primary' },
        { label: '队伍', action: onOpenTeam, color: 'primary' },
        { label: '社交', action: onOpenSocial, color: 'primary' },
        { label: '功法', action: onOpenKungfu, color: 'primary' },
        { label: '世界', action: onOpenWorld, color: 'primary' }, 
        { label: '门派', action: onOpenSect, color: 'primary' },
        { label: '任务', action: onOpenTask, color: 'primary' },
        { label: '约定', action: onOpenAgreement, color: 'primary' },
        { label: '剧情', action: onOpenStory, color: 'primary' }, 
        { label: '记忆', action: onOpenMemory, color: 'primary' }, 
    ];

    const SYSTEM_ITEMS = [
        { label: '保存进度', action: onSave },
        { label: '读取进度', action: onLoad },
        { label: '江湖设置', action: onOpenSettings },
    ];

    return (
        <div className="h-full flex flex-col p-3 border-l border-wuxia-gold/20 relative font-serif bg-transparent">
             {/* Background Pattern */}
             <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-700 via-black to-black"></div>

            {/* Header */}
            <div className="mb-4 text-center border-b border-gray-800 pb-4 relative h-[80px] flex flex-col justify-center shrink-0">
                 <h1 className="text-2xl font-black text-wuxia-gold tracking-[0.5em] opacity-90 drop-shadow-md">
                    天机
                </h1>
                <div className="text-[9px] text-gray-600 tracking-[0.3em] mt-1 uppercase">System Menu</div>
                
                {/* Decorative underline */}
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-wuxia-gold/50 to-transparent"></div>
            </div>
            
            {/* Main Menu - Framed List */}
            <div className="flex-1 flex flex-col gap-3 relative py-2 min-h-0">
                {/* Outer frame styling similar to left panel body status */}
                <div className="absolute inset-0 border border-gray-800 bg-white/[0.02] pointer-events-none">
                     <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-gray-600"></div>
                     <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-gray-600"></div>
                     <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-gray-600"></div>
                     <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-gray-600"></div>
                </div>
                
                {/* Changed custom-scrollbar to no-scrollbar */}
                <div className="p-4 space-y-3 h-full overflow-y-auto no-scrollbar relative z-10">
                    {MENU_ITEMS.map((item, idx) => (
                        <GameButton 
                            key={item.label}
                            onClick={item.action} 
                            variant={item.color as any}
                            className="w-full text-center py-2 text-sm tracking-widest hover:scale-[1.02] transition-transform !skew-x-0 border-opacity-60"
                        >
                            {item.label}
                        </GameButton>
                    ))}
                </div>
            </div>

            {/* System Menu - Bottom docked */}
            <div className="mt-4 pt-4 border-t border-gray-800 space-y-2 shrink-0">
                {SYSTEM_ITEMS.map((item) => (
                    <button 
                        key={item.label}
                        onClick={item.action}
                        className="w-full text-center text-[10px] text-gray-500 hover:text-wuxia-gold transition-all py-1.5 uppercase tracking-wider border border-transparent hover:border-gray-800 hover:bg-white/5 rounded-sm"
                    >
                        [ {item.label} ]
                    </button>
                ))}
            </div>
            
             {/* Bottom Shadow */}
             <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-black/80 to-transparent pointer-events-none"></div>
        </div>
    );
};

export default RightPanel;
