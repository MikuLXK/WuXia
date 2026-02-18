import React, { useState, useEffect } from 'react';
import { 接口设置结构 } from '../../../types';
import GameButton from '../../ui/GameButton';

interface Props {
    settings: 接口设置结构;
    onSave: (settings: 接口设置结构) => void;
}

const ApiSettings: React.FC<Props> = ({ settings, onSave }) => {
    const [form, setForm] = useState<接口设置结构>(settings);
    const [loadingModels, setLoadingModels] = useState(false);
    const [models, setModels] = useState<string[]>([]);
    const [message, setMessage] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        setForm(settings);
    }, [settings]);

    const handleSave = () => {
        onSave(form);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
    };

    const handleFetchModels = async () => {
        if (!form.apiKey || !form.baseUrl) {
            setMessage("请先填写API Key和Base URL");
            return;
        }
        setLoadingModels(true);
        setMessage('');
        try {
            const url = form.baseUrl.replace(/\/+$/, '') + '/models';
            const res = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${form.apiKey}`
                }
            });
            const data = await res.json();
            if (data && data.data) {
                const modelIds = data.data.map((m: any) => m.id);
                setModels(modelIds);
                setMessage("模型列表获取成功");
            } else {
                setMessage("获取失败: 格式错误");
            }
        } catch (e: any) {
            setMessage(`获取失败: ${e.message}`);
        } finally {
            setLoadingModels(false);
        }
    };

    return (
        <div className="space-y-6 text-sm animate-fadeIn">
             <div className="flex justify-between items-center border-b border-wuxia-gold/30 pb-3 mb-6">
                <h3 className="text-wuxia-gold font-serif font-bold text-xl">接口连接</h3>
                {showSuccess && <span className="text-green-400 text-xs font-bold animate-pulse">✔ 连接配置已保存</span>}
             </div>

             <div className="space-y-2">
                <label className="text-sm text-wuxia-cyan font-bold">接口地址 (Base URL)</label>
                 <input 
                     type="text" 
                     value={form.baseUrl}
                     onChange={(e) => setForm({...form, baseUrl: e.target.value})}
                     placeholder="https://api.openai.com/v1"
                     className="w-full bg-black/50 border-2 border-transparent focus:border-wuxia-gold p-3 text-white outline-none rounded-md transition-all font-serif tracking-wider"
                 />
             </div>
             <div className="space-y-2">
                <label className="text-sm text-wuxia-cyan font-bold">密钥 (API Key)</label>
                 <input 
                     type="password" 
                     value={form.apiKey}
                     onChange={(e) => setForm({...form, apiKey: e.target.value})}
                     placeholder="sk-..."
                     className="w-full bg-black/50 border-2 border-transparent focus:border-wuxia-gold p-3 text-white outline-none rounded-md transition-all font-serif tracking-wider"
                 />
             </div>
             
             <div className="flex gap-4 items-end">
                  <div className="flex-1 space-y-2">
                    <label className="text-sm text-wuxia-cyan font-bold">模型名称 (Model)</label>
                     <input 
                         type="text" 
                         value={form.model}
                         onChange={(e) => setForm({...form, model: e.target.value})}
                         className="w-full bg-black/50 border-2 border-transparent focus:border-wuxia-gold p-3 text-white outline-none rounded-md transition-all font-serif tracking-wider"
                     />
                 </div>
                 <GameButton 
                     onClick={handleFetchModels}
                     variant="secondary"
                     className="h-[52px] px-6"
                     disabled={loadingModels}
                 >
                     {loadingModels ? '...' : '获取列表'}
                 </GameButton>
             </div>

            {models.length > 0 && (
                <div className="bg-black/40 p-2 border border-gray-700/50 rounded-md max-h-32 overflow-y-auto custom-scrollbar">
                    {models.map(m => (
                        <div key={m} 
                            onClick={() => setForm({...form, model: m})}
                            className="cursor-pointer rounded-md hover:text-wuxia-gold text-xs py-1.5 px-2 hover:bg-white/5"
                        >
                            {m}
                        </div>
                    ))}
                </div>
            )}

            {message && <p className="text-xs text-wuxia-cyan animate-pulse">{message}</p>}

            <div className="pt-6 border-t border-wuxia-gold/20 mt-8">
                <GameButton onClick={handleSave} variant="primary" className="w-full">保存配置</GameButton>
            </div>
        </div>
    );
};

export default ApiSettings;
