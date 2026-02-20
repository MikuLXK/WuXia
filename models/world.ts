// --- 基础定义 ---

// 严格时间格式: YYYY:MM:DD:HH:MM (例如 YYYY:MM:DD:HH:MM)
export type 游戏时间格式 = string;

// --- 活跃NPC (后台模拟) ---

export interface 活跃NPC结构 {
    ID: string;
    姓名: string;
    称号: string;
    所属势力: string;
    境界: string;

    当前位置: string;
    状态: string;

    当前行动描述: string;
    行动开始时间: 游戏时间格式;
    行动预计结束时间: 游戏时间格式;

    持有重宝: string[];
}

// --- 世界事件 (生命周期) ---

export type 事件状态 = '进行中' | '已结算';

export interface 世界事件结构 {
    ID: string;
    类型: '天灾' | '战争' | '奇遇' | '传闻' | '决斗' | '系统';
    标题: string;
    内容: string;
    发生地点: string;

    开始时间: 游戏时间格式;
    预计结束时间: 游戏时间格式;

    当前状态: 事件状态;
    事件结果?: string;

    消逝时间?: 游戏时间格式;
    是否重大事件: boolean;

    关联势力: string[];
    关联人物: string[];
}

// --- 地图与建筑（简化结构） ---

export interface 地点归属结构 {
    大地点: string;
    中地点: string;
    小地点: string;
}

export interface 地图结构 {
    名称: string;
    坐标: string;
    描述: string;
    归属: 地点归属结构;
    内部建筑: string[];
}

export interface 建筑结构 {
    名称: string;
    描述: string;
    归属: 地点归属结构;
}

// --- 世界全貌 ---

export interface 世界数据结构 {
    活跃NPC列表: 活跃NPC结构[];
    地图: 地图结构[];
    建筑: 建筑结构[];

    进行中事件: 世界事件结构[];
    已结算事件: 世界事件结构[];
    江湖史册: 世界事件结构[];
}
