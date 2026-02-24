
import React, { useRef, useState } from 'react';

type QuickRestartMode = 'world_only' | 'opening_only' | 'all';

type SendResult = {
    cancelled?: boolean;
    attachedRecallPreview?: string;
    preparedRecallTag?: string;
    needRecallConfirm?: boolean;
    needRerollConfirm?: boolean;
    parseErrorMessage?: string;
    parseErrorDetail?: string;
    errorDetail?: string;
    errorTitle?: string;
};

type RecallProgress = {
    phase: 'start' | 'stream' | 'done' | 'error';
    text?: string;
};

interface Props {
    onSend: (
        content: string,
        isStreaming: boolean,
        options?: { onRecallProgress?: (progress: RecallProgress) => void }
    ) => Promise<SendResult> | SendResult;
    onStop: () => void;
    onRegenerate: () => string | null;
    onQuickRestart?: (mode: QuickRestartMode) => void | Promise<void>;
    requestConfirm?: (options: { title?: string; message: string; confirmText?: string; cancelText?: string; danger?: boolean }) => Promise<boolean>;
    loading: boolean;
    canReroll?: boolean;
    canQuickRestart?: boolean;
    options?: unknown[]; // Quick actions from the last turn
}

const InputArea: React.FC<Props> = ({
    onSend,
    onStop,
    onRegenerate,
    onQuickRestart,
    requestConfirm,
    loading,
    canReroll = true,
    canQuickRestart = false,
    options = []
}) => {
    const [content, setContent] = useState('');
    const [isStreaming, setIsStreaming] = useState(true);
    const [lastSentContent, setLastSentContent] = useState('');
    const [isPreparing, setIsPreparing] = useState(false);
    const [attachedRecallPreview, setAttachedRecallPreview] = useState('');
    const [showAttachedRecall, setShowAttachedRecall] = useState(false);
    const [pendingRecallTag, setPendingRecallTag] = useState('');
    const [recallProgress, setRecallProgress] = useState<RecallProgress | null>(null);
    const [showQuickRestartMenu, setShowQuickRestartMenu] = useState(false);
    const [errorModal, setErrorModal] = useState<{ open: boolean; title: string; content: string }>({
        open: false,
        title: '',
        content: ''
    });
    const quickActionsRef = useRef<HTMLDivElement | null>(null);
    const dragRef = useRef({ active: false, startX: 0, startScrollLeft: 0, moved: false });
    const suppressClickUntilRef = useRef(0);

    const handleSend = async () => {
        if (!content.trim()) return;
        if (loading || isPreparing) return;
        setIsPreparing(true);
        setRecallProgress(null);
        try {
            const payload = pendingRecallTag
                ? `${content}\n<剧情回忆>\n${pendingRecallTag}\n</剧情回忆>`
                : content;
            const result = await onSend(payload, isStreaming, {
                onRecallProgress: (progress) => setRecallProgress(progress)
            });
            if (result?.cancelled) {
                if (result.needRerollConfirm) {
                    const parseErrorText = result.parseErrorDetail || result.parseErrorMessage || '模型返回了非标准 JSON。';
                    const confirmed = requestConfirm
                        ? await requestConfirm({
                            title: '响应解析失败',
                            message: `${parseErrorText}\n\n是否立即重ROLL并回填上一轮输入？`,
                            confirmText: '重ROLL',
                            cancelText: '取消'
                        })
                        : false;
                    if (confirmed) {
                        handleReroll();
                    }
                    return;
                }
                if (result.needRecallConfirm && result.preparedRecallTag) {
                    const confirmed = requestConfirm
                        ? await requestConfirm({
                            title: '确认剧情回忆',
                            message: `以下回忆将回填到输入附件中：\n\n${result.attachedRecallPreview || '强回忆:无\n弱回忆:无'}`,
                            confirmText: '确认回填',
                            cancelText: '取消'
                        })
                        : false;
                    if (confirmed) {
                        setPendingRecallTag(result.preparedRecallTag);
                        if (result.attachedRecallPreview) {
                            setAttachedRecallPreview(result.attachedRecallPreview);
                            setShowAttachedRecall(false);
                        }
                    } else if (result.attachedRecallPreview) {
                        setAttachedRecallPreview(result.attachedRecallPreview);
                        setShowAttachedRecall(false);
                    }
                    return;
                }
                if (result.preparedRecallTag) {
                    setPendingRecallTag(result.preparedRecallTag);
                }
                if (result.attachedRecallPreview) {
                    setAttachedRecallPreview(result.attachedRecallPreview);
                    setShowAttachedRecall(false);
                }
                if (result.errorDetail) {
                    setErrorModal({
                        open: true,
                        title: result.errorTitle || '请求失败',
                        content: result.errorDetail
                    });
                }
                return;
            }
            setLastSentContent(content);
            setContent('');
            setPendingRecallTag('');
            if (result?.attachedRecallPreview) {
                setAttachedRecallPreview(result.attachedRecallPreview);
                setShowAttachedRecall(false);
            } else {
                setAttachedRecallPreview('');
                setShowAttachedRecall(false);
            }
            setRecallProgress(null);
        } finally {
            setIsPreparing(false);
        }
    };

    const handleStop = () => {
        onStop();
        setContent(lastSentContent);
    };

    const handleOptionClick = (opt: string) => {
        if (Date.now() < suppressClickUntilRef.current) return;
        setContent(opt);
    };

    const handleReroll = () => {
        const restoredInput = onRegenerate();
        if (!restoredInput) return;
        setContent(restoredInput);
        setLastSentContent(restoredInput);
    };

    const handleQuickRestartSelect = async (mode: QuickRestartMode) => {
        if (!onQuickRestart) return;
        const optionsMap: Record<QuickRestartMode, { title: string; message: string }> = {
            world_only: {
                title: '重新生成世界观',
                message: '将仅重新生成世界观提示词，不自动生成开局剧情。是否继续？'
            },
            opening_only: {
                title: '重新生成开局剧情',
                message: '将使用当前世界观重新生成开局剧情（含变量命令）。是否继续？'
            },
            all: {
                title: '重生成世界观+开局剧情',
                message: '将完整重跑世界观与开局剧情。是否继续？'
            }
        };
        const option = optionsMap[mode];
        const confirmed = requestConfirm
            ? await requestConfirm({
                title: option.title,
                message: option.message,
                confirmText: '立即执行',
                cancelText: '取消',
                danger: true
            })
            : true;
        if (!confirmed) return;
        await Promise.resolve(onQuickRestart(mode));
        setShowQuickRestartMenu(false);
    };

    const handleQuickActionsPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.pointerType !== 'mouse') return;
        const el = quickActionsRef.current;
        if (!el) return;
        if (el.scrollWidth <= el.clientWidth) return;
        dragRef.current = {
            active: true,
            startX: e.clientX,
            startScrollLeft: el.scrollLeft,
            moved: false
        };
        e.currentTarget.setPointerCapture?.(e.pointerId);
    };

    const handleQuickActionsPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.pointerType !== 'mouse') return;
        if (!dragRef.current.active) return;
        const el = quickActionsRef.current;
        if (!el) return;
        const delta = e.clientX - dragRef.current.startX;
        if (Math.abs(delta) > 4) {
            dragRef.current.moved = true;
        }
        el.scrollLeft = dragRef.current.startScrollLeft - delta;
        if (dragRef.current.moved) {
            e.preventDefault();
        }
    };

    const endQuickActionsDrag = () => {
        if (!dragRef.current.active) return;
        if (dragRef.current.moved) {
            suppressClickUntilRef.current = Date.now() + 120;
        }
        dragRef.current.active = false;
    };

    const normalizeOptionText = (opt: unknown): string => {
        if (typeof opt === 'string') return opt.trim();
        if (typeof opt === 'number' || typeof opt === 'boolean') return String(opt);
        if (opt && typeof opt === 'object') {
            const obj = opt as Record<string, unknown>;
            const candidate = obj.text ?? obj.label ?? obj.action ?? obj.name ?? obj.id;
            if (typeof candidate === 'string') return candidate.trim();
        }
        return '';
    };

    const normalizedOptions = options
        .map(normalizeOptionText)
        .filter(item => item.length > 0);

    const busy = loading || isPreparing;

    return (
        <div className="shrink-0 relative z-20 bg-gradient-to-t from-ink-black via-ink-black/95 to-transparent pb-4 px-4 flex flex-col gap-2">
            
            {/* Quick Actions Chips (Fixed Box Size, Scrolling Text) */}
            {normalizedOptions.length > 0 && (
                <div
                    ref={quickActionsRef}
                    className="w-full px-2 md:px-4 pb-2 overflow-x-auto no-scrollbar select-none cursor-grab active:cursor-grabbing"
                    style={{ touchAction: 'pan-x' }}
                    onPointerDown={handleQuickActionsPointerDown}
                    onPointerMove={handleQuickActionsPointerMove}
                    onPointerUp={endQuickActionsDrag}
                    onPointerCancel={endQuickActionsDrag}
                    onPointerLeave={endQuickActionsDrag}
                >
                    <div className="flex flex-nowrap md:flex-wrap md:justify-center gap-3 min-w-max md:min-w-0">
                        {normalizedOptions.map((opt, idx) => (
                            <button 
                                key={idx}
                                onClick={() => handleOptionClick(opt)}
                                disabled={loading}
                                className="shrink-0 whitespace-nowrap px-6 py-2 bg-white/5 border border-wuxia-gold/30 text-gray-300 rounded hover:bg-wuxia-gold hover:text-ink-black hover:border-wuxia-gold transition-all text-xs tracking-wider shadow-sm min-w-[120px] text-center disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                 {opt}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="h-px w-full bg-gradient-to-r from-transparent via-wuxia-gold/30 to-transparent my-1 opacity-50"></div>

            {isPreparing && recallProgress && (
                <div className="rounded-lg border border-wuxia-cyan/30 bg-wuxia-cyan/5 p-2 space-y-1">
                    <div className="flex items-center gap-2 text-xs text-wuxia-cyan">
                        {recallProgress.phase === 'done' ? (
                            <span className="text-green-400">●</span>
                        ) : recallProgress.phase === 'error' ? (
                            <span className="text-red-400">●</span>
                        ) : (
                            <span className="inline-block w-3 h-3 border-2 border-wuxia-cyan/40 border-t-wuxia-cyan rounded-full animate-spin" />
                        )}
                        <span>
                            {recallProgress.phase === 'start' && '剧情回忆检索中...'}
                            {recallProgress.phase === 'stream' && '剧情回忆流式解析中...'}
                            {recallProgress.phase === 'done' && '剧情回忆检索完成'}
                            {recallProgress.phase === 'error' && '剧情回忆检索失败'}
                        </span>
                    </div>
                    {recallProgress.text && (
                        <pre className="text-[11px] whitespace-pre-wrap text-gray-300 leading-relaxed max-h-28 overflow-y-auto custom-scrollbar">
                            {recallProgress.text}
                        </pre>
                    )}
                </div>
            )}

            {attachedRecallPreview && (
                <div className="rounded-lg border border-wuxia-cyan/30 bg-wuxia-cyan/5 p-2">
                    <div className="flex items-center justify-between gap-3">
                        <button
                            type="button"
                            onClick={() => setShowAttachedRecall(prev => !prev)}
                            className="flex-1 flex items-center justify-between text-xs text-wuxia-cyan"
                        >
                            <span>{pendingRecallTag ? '剧情回忆已回填（待发送）' : '剧情回忆已附加'}（点击{showAttachedRecall ? '收起' : '展开'}）</span>
                            <span>{showAttachedRecall ? '▲' : '▼'}</span>
                        </button>
                        {pendingRecallTag && (
                            <button
                                type="button"
                                onClick={() => {
                                    setPendingRecallTag('');
                                    setAttachedRecallPreview('');
                                    setShowAttachedRecall(false);
                                }}
                                className="text-[10px] px-2 py-1 border border-red-800/60 text-red-300 rounded hover:bg-red-900/20"
                            >
                                移除
                            </button>
                        )}
                    </div>
                    {showAttachedRecall && (
                        <pre className="mt-2 text-[11px] whitespace-pre-wrap text-gray-300 leading-relaxed max-h-40 overflow-y-auto custom-scrollbar">
                            {attachedRecallPreview}
                        </pre>
                    )}
                </div>
            )}

            {showQuickRestartMenu && canQuickRestart && (
                <div className="rounded-lg border border-teal-400/30 bg-black/70 p-2 space-y-2">
                    <div className="text-xs text-teal-300 font-bold tracking-wider">快速重开选项</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <button
                            type="button"
                            onClick={() => { void handleQuickRestartSelect('world_only'); }}
                            disabled={busy}
                            className="text-xs px-3 py-2 rounded border border-gray-700 text-gray-200 hover:border-teal-300 hover:text-teal-200 disabled:opacity-40"
                        >
                            仅重生世界观
                        </button>
                        <button
                            type="button"
                            onClick={() => { void handleQuickRestartSelect('opening_only'); }}
                            disabled={busy}
                            className="text-xs px-3 py-2 rounded border border-gray-700 text-gray-200 hover:border-teal-300 hover:text-teal-200 disabled:opacity-40"
                        >
                            仅重生开局剧情
                        </button>
                        <button
                            type="button"
                            onClick={() => { void handleQuickRestartSelect('all'); }}
                            disabled={busy}
                            className="text-xs px-3 py-2 rounded border border-gray-700 text-gray-200 hover:border-teal-300 hover:text-teal-200 disabled:opacity-40"
                        >
                            世界观 + 开局剧情
                        </button>
                    </div>
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={() => setShowQuickRestartMenu(false)}
                            className="text-[11px] px-2 py-1 rounded border border-gray-700 text-gray-400 hover:text-gray-200"
                        >
                            收起
                        </button>
                    </div>
                </div>
            )}
            
            {/* Main Control Bar */}
            <div className="flex items-center gap-2">
                
                {/* Left Controls Group */}
                <div className="flex items-center gap-1 bg-black/40 border border-gray-700/50 rounded-xl p-1 h-12">
                    {/* Stream Toggle */}
                    <button 
                        onClick={() => setIsStreaming(!isStreaming)}
                        className={`w-10 h-full rounded-lg flex items-center justify-center transition-all ${isStreaming ? 'text-wuxia-cyan bg-wuxia-cyan/10' : 'text-gray-600 hover:text-gray-400'}`}
                        title={isStreaming ? "流式传输开启" : "流式传输关闭"}
                        disabled={busy}
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                        </svg>
                    </button>

                    <div className="w-px h-6 bg-gray-800"></div>

                    {/* Quick Restart */}
                    {canQuickRestart && (
                        <>
                            <button 
                                onClick={() => setShowQuickRestartMenu(prev => !prev)}
                                disabled={busy}
                                className="w-10 h-full rounded-lg flex items-center justify-center text-teal-300 hover:text-teal-100 hover:bg-teal-900/20 transition-all disabled:opacity-30"
                                title="快速重开"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" />
                                </svg>
                            </button>
                            <div className="w-px h-6 bg-gray-800"></div>
                        </>
                    )}

                    {/* Re-roll */}
                    <button 
                        onClick={handleReroll}
                        disabled={busy || !canReroll}
                        className="w-10 h-full rounded-lg flex items-center justify-center text-gray-400 hover:text-wuxia-gold hover:bg-white/5 transition-all disabled:opacity-30"
                        title={canReroll ? "重ROLL：回档到上一轮并回填输入" : "暂无可重ROLL回合"}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                             <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                    </button>
                </div>

                {/* Input Field */}
                <div className={`flex-1 bg-black/40 border border-gray-700/50 rounded-xl h-12 flex items-center px-4 transition-all shadow-inner ${busy ? 'opacity-50 cursor-not-allowed' : 'focus-within:border-wuxia-gold/50 focus-within:bg-black/60'}`}>
                    <input
                        type="text"
                        className="w-full bg-transparent text-paper-white font-serif placeholder-gray-600 focus:outline-none"
                        placeholder={busy ? "等待处理中..." : "输入你的行动..."}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !busy && handleSend()}
                        disabled={busy}
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
                        onClick={() => { void handleSend(); }} 
                        disabled={!content.trim() || busy} 
                        className="w-14 h-12 bg-wuxia-gold text-ink-black rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(230,200,110,0.3)] hover:bg-white hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
                        title="发送"
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                             <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l6-6m0 0l6 6m-6-6v12a6 6 0 01-12 0v-3" />
                        </svg>
                    </button>
                )}

            </div>

            {errorModal.open && (
                <div
                    className="fixed inset-0 z-[260] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                    onClick={() => setErrorModal(prev => ({ ...prev, open: false }))}
                >
                    <div
                        className="w-full max-w-3xl rounded-lg border border-wuxia-gold/30 bg-black/90 p-5 shadow-[0_0_30px_rgba(0,0,0,0.8)]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between gap-4 mb-4">
                            <h4 className="text-lg font-serif font-bold text-wuxia-gold">
                                {errorModal.title || '请求失败'}
                            </h4>
                            <button
                                type="button"
                                onClick={() => setErrorModal(prev => ({ ...prev, open: false }))}
                                className="text-gray-400 hover:text-white transition-colors"
                                aria-label="关闭错误详情"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar rounded-md border border-gray-700/80 bg-black/60 p-3 text-xs text-gray-200 whitespace-pre-wrap">
                            {errorModal.content}
                        </div>
                        <div className="pt-4 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setErrorModal(prev => ({ ...prev, open: false }))}
                                className="px-6 py-2 text-xs font-bold bg-wuxia-gold text-ink-black rounded hover:bg-white transition-colors"
                            >
                                关闭
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InputArea;
