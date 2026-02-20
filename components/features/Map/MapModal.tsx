import React, { useEffect, useMemo, useState } from 'react';
import { 世界数据结构 } from '../../../models/world';
import { 环境信息结构 } from '../../../models/environment';

interface Props {
    world: 世界数据结构;
    env: 环境信息结构;
    onClose: () => void;
}

const 归一化文本 = (value: string | undefined | null) => (value || '').trim().replace(/\s+/g, '').toLowerCase();

const MapModal: React.FC<Props> = ({ world, env, onClose }) => {
    const maps = Array.isArray(world?.地图) ? world.地图 : [];
    const buildings = Array.isArray(world?.建筑) ? world.建筑 : [];
    const 当前地点归一 = 归一化文本(env?.具体地点 || '');
    const 当前层级 = {
        大: 归一化文本(env?.大地点 || ''),
        中: 归一化文本(env?.中地点 || ''),
        小: 归一化文本(env?.小地点 || '')
    };

    const 默认地图索引 = useMemo(() => {
        const bySmallName = maps.findIndex((m: any) => 归一化文本(m?.名称) === 当前层级.小);
        if (bySmallName >= 0) return bySmallName;

        const byBelong = maps.findIndex((m: any) => (
            归一化文本(m?.归属?.大地点) === 当前层级.大 &&
            归一化文本(m?.归属?.中地点) === 当前层级.中 &&
            归一化文本(m?.归属?.小地点) === 当前层级.小
        ));
        if (byBelong >= 0) return byBelong;

        const byCurrentPlace = maps.findIndex((m: any) => {
            const key = 归一化文本(m?.名称);
            return !!key && !!当前地点归一 && (当前地点归一.includes(key) || key.includes(当前地点归一));
        });
        return byCurrentPlace >= 0 ? byCurrentPlace : 0;
    }, [maps, 当前地点归一, 当前层级.大, 当前层级.中, 当前层级.小]);

    const [selectedMapIndex, setSelectedMapIndex] = useState(默认地图索引);
    useEffect(() => {
        setSelectedMapIndex(默认地图索引);
    }, [默认地图索引]);

    const 当前地图 = selectedMapIndex >= 0 ? maps[selectedMapIndex] || null : null;
    const 当前地图内部建筑名 = useMemo(() => {
        if (!当前地图 || !Array.isArray(当前地图.内部建筑)) return [];
        return 当前地图.内部建筑.filter((name: any) => typeof name === 'string' && name.trim().length > 0);
    }, [当前地图]);

    const 当前地图建筑列表 = useMemo(() => {
        if (当前地图内部建筑名.length === 0) return [];
        return buildings.filter((building: any) => {
            const name = 归一化文本(building?.名称);
            return 当前地图内部建筑名.some((raw: string) => 归一化文本(raw) === name);
        });
    }, [buildings, 当前地图内部建筑名]);

    const 命中建筑列表 = useMemo(() => {
        if (!当前地点归一) return [];
        return buildings.filter((building: any) => {
            const 名称归一 = 归一化文本(building?.名称);
            if (!名称归一) return false;
            return 当前地点归一 === 名称归一
                || 当前地点归一.includes(名称归一)
                || 名称归一.includes(当前地点归一);
        });
    }, [buildings, 当前地点归一]);

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[220] flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-ink-black/95 border border-wuxia-gold/30 w-full max-w-[1320px] h-[760px] flex flex-col shadow-[0_0_80px_rgba(0,0,0,0.9)] rounded-2xl overflow-hidden">
                <div className="h-16 shrink-0 border-b border-gray-800/50 bg-black/40 flex items-center justify-between px-6">
                    <div>
                        <h3 className="text-wuxia-gold font-serif font-bold text-2xl tracking-[0.26em] drop-shadow-md">地图与建筑</h3>
                        <p className="text-gray-500 text-[10px] tracking-widest mt-0.5">
                            结构化数据视图（前端按当前位置命中建筑变量）
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-black/50 border border-gray-700 text-gray-400 hover:text-wuxia-red hover:border-wuxia-red transition-all"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 grid grid-cols-12 gap-3 p-3 overflow-hidden">
                    <div className="col-span-3 border border-gray-800 rounded-lg bg-black/30 overflow-hidden flex flex-col">
                        <div className="px-3 py-2 border-b border-gray-800 text-xs tracking-widest text-gray-400">地图列表</div>
                        <div className="flex-1 overflow-y-auto no-scrollbar p-2">
                            {maps.length === 0 ? (
                                <div className="text-xs text-gray-600 text-center py-8">暂无地图数据</div>
                            ) : maps.map((item: any, idx: number) => {
                                const active = idx === selectedMapIndex;
                                const 内部建筑数 = Array.isArray(item?.内部建筑) ? item.内部建筑.length : 0;
                                return (
                                    <button
                                        key={`map-${item?.名称 || idx}`}
                                        onClick={() => setSelectedMapIndex(idx)}
                                        className={`w-full text-left p-2 mb-2 rounded border transition-colors ${active ? 'border-wuxia-gold/60 bg-wuxia-gold/10' : 'border-gray-800 bg-black/20 hover:border-gray-600'}`}
                                    >
                                        <div className="text-sm text-gray-100">{item?.名称 || `地图${idx + 1}`}</div>
                                        <div className="text-[11px] text-gray-500 mt-1">坐标: {item?.坐标 || '未知坐标'}</div>
                                        <div className="text-[11px] text-gray-500 mt-1">内部建筑: {内部建筑数}</div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="col-span-5 border border-gray-800 rounded-lg bg-black/30 overflow-hidden flex flex-col">
                        <div className="px-3 py-2 border-b border-gray-800 text-xs tracking-widest text-gray-400">地图详情</div>
                        <div className="flex-1 overflow-y-auto no-scrollbar p-3 text-xs space-y-3">
                            {当前地图 ? (
                                <>
                                    <div>
                                        <div className="text-gray-500">名称</div>
                                        <div className="text-gray-100 mt-1">{当前地图.名称 || '未命名地图'}</div>
                                    </div>
                                    <div>
                                        <div className="text-gray-500">坐标</div>
                                        <div className="text-gray-300 mt-1">{当前地图.坐标 || '未知坐标'}</div>
                                    </div>
                                    <div>
                                        <div className="text-gray-500">描述</div>
                                        <div className="text-gray-300 mt-1 leading-relaxed">{当前地图.描述 || '无描述'}</div>
                                    </div>
                                    <div>
                                        <div className="text-gray-500">归属</div>
                                        <div className="text-gray-300 mt-1">
                                            {(当前地图?.归属?.大地点 || '未知大地点')} / {(当前地图?.归属?.中地点 || '未知中地点')} / {(当前地图?.归属?.小地点 || '未知小地点')}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-gray-500">内部建筑（该地图声明）</div>
                                        <div className="text-gray-300 mt-1">
                                            {当前地图内部建筑名.length > 0 ? 当前地图内部建筑名.join(' / ') : '无'}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-gray-500">已建档建筑（按内部建筑名匹配）</div>
                                        <div className="text-gray-300 mt-1">
                                            {当前地图建筑列表.length > 0
                                                ? 当前地图建筑列表.map((b: any) => b?.名称 || '未命名').join(' / ')
                                                : '无'}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="text-gray-600">请选择地图</div>
                            )}
                        </div>
                    </div>

                    <div className="col-span-4 border border-gray-800 rounded-lg bg-black/30 overflow-hidden flex flex-col">
                        <div className="px-3 py-2 border-b border-gray-800 text-xs tracking-widest text-gray-400">建筑变量注入（前端判定）</div>
                        <div className="px-3 py-2 border-b border-gray-800/60 text-[11px] text-gray-500">
                            当前具体地点: {env?.具体地点 || '未知'}
                        </div>
                        <div className="flex-1 overflow-y-auto no-scrollbar p-3 text-xs space-y-3">
                            {命中建筑列表.length > 0 ? 命中建筑列表.map((building: any, idx: number) => (
                                <div key={`hit-building-${building?.名称 || idx}`} className="p-2 rounded border border-wuxia-gold/30 bg-wuxia-gold/5">
                                    <div className="text-gray-100">{building?.名称 || '未命名建筑'}</div>
                                    <div className="text-gray-400 mt-1">{building?.描述 || '无描述'}</div>
                                    <div className="text-gray-500 mt-1">
                                        归属: {(building?.归属?.大地点 || '未知大地点')} / {(building?.归属?.中地点 || '未知中地点')} / {(building?.归属?.小地点 || '未知小地点')}
                                    </div>
                                </div>
                            )) : (
                                <div className="text-gray-600 leading-relaxed">
                                    当前具体地点未命中任何建筑名称。<br />
                                    本回合上下文将只注入地图数据，不注入建筑数据。
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MapModal;
