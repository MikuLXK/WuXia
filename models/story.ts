
export interface 剧情结束条件 {
    类型: '时间' | '事件' | '变量';
    描述: string;
    判定值?: string | number | boolean;
    对应变量键名?: string;
}

export interface 待触发事件结构 {
    名称: string;
    描述: string;
    '触发条件/时间': string;
    失效时间: string;
}

export interface 剧情章节 {
    ID: string;
    序号: number;
    标题: string;
    背景故事: string;
    主要矛盾: string;
    结束条件: 剧情结束条件[];
    伏笔列表: string[];
}

export interface 剧情系统结构 {
    当前章节: 剧情章节;
    下一章预告: {
        标题: string;
        大纲: string;
    };
    历史卷宗: {
        标题: string;
        结语: string;
    }[];
    近期剧情规划: string;
    中期剧情规划: string;
    长期剧情规划: string;
    待触发事件: 待触发事件结构[];
    剧情变量: Record<string, boolean | number | string>;
}
