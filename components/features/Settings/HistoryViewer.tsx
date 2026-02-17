
import React from 'react';
import { 聊天记录结构 } from '../../../types';

interface Props {
    history: 聊天记录结构[];
}

const HistoryViewer: React.FC<Props> = ({ history }) => {
    return (
        <div className="h-full flex flex-col animate-fadeIn">
            <h3 className="text-wuxia-gold font-serif font-bold text-lg mb-4 shrink-0">互动历史存档</h3>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/20 border border-gray-800 p-4 rounded-lg space-y-6">
                {history.map((msg, idx) => (
                    <div key={idx} className="flex flex-col gap-1 border-b border-gray-800/50 pb-4 last:border-0">
                        <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono">
                            <span className={`font-bold ${msg.role === 'user' ? 'text-blue-400' : 'text-wuxia-gold'}`}>
                                {msg.role.toUpperCase()}
                            </span>
                            <span>{msg.gameTime || new Date(msg.timestamp).toLocaleString()}</span>
                        </div>
                        
                        <div className={`text-sm leading-relaxed ${msg.role === 'user' ? 'text-gray-300' : 'text-gray-400'}`}>
                            {msg.role === 'assistant' && msg.structuredResponse ? (
                                msg.structuredResponse.logs.map((log, lIdx) => (
                                    <p key={lIdx} className="mb-1">
                                        <span className="font-bold text-gray-500">{log.sender}: </span>
                                        {log.text}
                                    </p>
                                ))
                            ) : (
                                msg.content
                            )}
                        </div>
                    </div>
                ))}
                
                {history.length === 0 && (
                    <div className="text-center text-gray-600 py-10">暂无历史记录</div>
                )}
            </div>
        </div>
    );
};

export default HistoryViewer;
