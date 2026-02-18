import React from 'react';
import { 角色数据结构 } from '../../../types';
import LeftPanel from '../../layout/LeftPanel';

interface Props {
    character: 角色数据结构;
    onClose: () => void;
}

const CharacterModal: React.FC<Props> = ({ character, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[200] hidden md:flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-ink-black/95 border border-wuxia-gold/30 w-full max-w-xl h-[82vh] flex flex-col shadow-[0_0_80px_rgba(0,0,0,0.9)] relative overflow-hidden rounded-2xl">
                <div className="h-14 shrink-0 border-b border-gray-800/60 bg-black/40 flex items-center justify-between px-4">
                    <h3 className="text-wuxia-gold font-serif font-bold text-lg tracking-[0.25em]">角色属性</h3>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-black/50 border border-gray-700 text-gray-400 hover:text-wuxia-red hover:border-wuxia-red transition-all"
                        title="关闭"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
                    <LeftPanel 角色={character} />
                </div>
            </div>
        </div>
    );
};

export default CharacterModal;
