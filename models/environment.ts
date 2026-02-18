// 环境相关定义 - 解耦自 types.ts

export interface 环境信息结构 {
    时间: string; // YYYY:MM:DD:HH:MM
    洲: string;
    国: string;
    郡: string;
    县: string;
    村: string;
    具体地点: string;
    节日: string;
    天气: string;
    环境描述: string;
    日期: number; 
}

export const 默认环境信息: 环境信息结构 = {
    时间: "1024:03:01:09:00",
    洲: "中土神洲",
    国: "大乾王朝",
    郡: "天水郡",
    县: "青牛县",
    村: "稻香村",
    具体地点: "村口老槐树下",
    节日: "无",
    天气: "晴朗",
    环境描述: "阳光明媚，微风拂过，老槐树沙沙作响。",
    日期: 1
};
