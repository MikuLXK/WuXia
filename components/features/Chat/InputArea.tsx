
import React, { useState } from 'react';
import GameButton from '../../ui/GameButton';

interface Props {
    onSend: (content: string, isStreaming: boolean) => void;
    onStop: () => void;
    onRegenerate: () => void;
    loading: boolean;
    options?: string[]; // Quick actions from the last turn
}

const InputArea: React.FC<Props> = ({ onSend, onStop, onRegenerate, loading, options = [] }) => {
    const [content, setContent] = useState('');
    const [isStreaming, setIsStreaming] = useState(true);
    const [lastSentContent, setLastSentContent] = useState('');

    const handleSend = () => {
        if (!content.trim()) return;
        setLastSentContent(content);
        onSend(content, isStreaming);
        setContent('');
    };

    const handleStop = () => {
        onStop();
        setContent(lastSentContent);
    };

    const handleOptionClick = (opt: string) => {
        setContent(opt);
    };

    return (
        <div className="shrink-0 relative z-20 bg-gradient-to-t from-ink-black via-ink-black/95 to-transparent pb-4 px-4 flex flex-col gap-2">
            
            {/* Quick Actions Chips (Fixed Box Size, Scrolling Text) */}
            {options && options.length > 0 && (
                <div className="flex flex-wrap justify-center gap-3 pb-2 w-full px-4">
                    {options.map((opt, idx) => (
                        <button 
                            key={idx}
                            onClick={() => handleOptionClick(opt)}
                            disabled={loading}
                            className="px-6 py-2 bg-white/5 border border-wuxia-gold/30 text-gray-300 rounded hover:bg-wuxia-gold hover:text-ink-black hover:border-wuxia-gold transition-all text-xs tracking-wider shadow-sm min-w-[120px] text-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                             {opt}
                        </button>
                    ))}
                </div>
            )}

            <div className="h-px w-full bg-gradient-to-r from-transparent via-wuxia-gold/30 to-transparent my-1 opacity-50"></div>
            
            {/* Main Control Bar */}
            <div className="flex items-center gap-2">
                
                {/* Left Controls Group */}
                <div className="flex items-center gap-1 bg-black/40 border border-gray-700/50 rounded-xl p-1 h-12">
                    {/* Stream Toggle */}
                    <button 
                        onClick={() => setIsStreaming(!isStreaming)}
                        className={`w-10 h-full rounded-lg flex items-center justify-center transition-all ${isStreaming ? 'text-wuxia-cyan bg-wuxia-cyan/10' : 'text-gray-600 hover:text-gray-400'}`}
                        title={isStreaming ? "流式传输开启" : "流式传输关闭"}
                        disabled={loading}
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                        </svg>
                    </button>

                    <div className="w-px h-6 bg-gray-800"></div>

                    {/* Re-roll */}
                    <button 
                        onClick={onRegenerate}
                        disabled={loading}
                        className="w-10 h-full rounded-lg flex items-center justify-center text-gray-400 hover:text-wuxia-gold hover:bg-white/5 transition-all disabled:opacity-30"
                        title="重新生成"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                             <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                    </button>
                </div>

                {/* Input Field */}
                <div className={`flex-1 bg-black/40 border border-gray-700/50 rounded-xl h-12 flex items-center px-4 transition-all shadow-inner ${loading ? 'opacity-50 cursor-not-allowed' : 'focus-within:border-wuxia-gold/50 focus-within:bg-black/60'}`}>
                    <input
                        type="text"
                        className="w-full bg-transparent text-paper-white font-serif placeholder-gray-600 focus:outline-none"
                        placeholder={loading ? "等待回应中..." : "输入你的行动..."}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !loading && handleSend()}
                        disabled={loading}
                    />
                </div>

                {/* Send / Stop Button */}
                {loading ? (
                    <button 
                        onClick={handleStop}
                        className="w-14 h-12 bg-wuxia-red text-white rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(163,24,24,0.3)] hover:bg-red-600 hover:scale-105 active:scale-95 transition-all"
                        title="停止生成"
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                ) : (
                    <button 
                        onClick={handleSend} 
                        disabled={!content.trim()} 
                        className="w-14 h-12 bg-wuxia-gold text-ink-black rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(230,200,110,0.3)] hover:bg-white hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
                        title="发送"
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                             <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l6-6m0 0l6 6m-6-6v12a6 6 0 01-12 0v-3" />
                        </svg>
                    </button>
                )}

            </div>
        </div>
    );
};

export default InputArea;
