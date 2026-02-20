
export type NPC性别 = '男' | '女';

export interface NPC记忆 {
    内容: string;
    时间: string; // 结构化时间戳字符串
}

// 新增：子宫内射/使用记录
export interface 子宫记录 {
    日期: string;      // 发生日期
    描述: string;      // 行为描述 (e.g. "于客栈中被内射...")
    怀孕判定日: string; // 预计进行受孕判定的日期
}

// 新增：子宫档案
export interface 子宫档案 {
    状态: string;       // "未受孕", "受孕中", "妊娠一月" 等
    宫口状态: string;   // "紧致", "微张", "松弛"
    内射记录: 子宫记录[];
}

// 新增：NPC装备结构
export interface NPC装备栏 {
    主武器?: string;
    副武器?: string;
    
    // 通用/外装
    服装?: string; // 外衣/道袍/裙装
    饰品?: string;
    
    // 女性专属字段
    内衣?: string; // 肚兜/抹胸/胸罩
    内裤?: string; // 亵裤/底裤
    袜饰?: string; // 罗袜/腿环
    鞋履?: string;
}

export interface NPC结构 {
    id: string;
    姓名: string;
    性别: NPC性别;
    年龄: number;
    境界: string;
    身份: string;
    是否在场: boolean; // 是否处于当前场景
    是否队友: boolean; // 是否被编入玩家队伍
    是否主要角色: boolean;
    好感度: number;
    关系状态: string; 
    简介: string;    

    // --- 队伍战斗属性 (仅队友强制需要；非队友可省略) ---
    攻击力?: number; 
    防御力?: number;
    上次更新时间?: string; // 数据更新的时间戳/日期字符串

    // --- 生存属性 (仅队友强制需要；非队友可省略) ---
    当前血量?: number;
    最大血量?: number;
    当前精力?: number;
    最大精力?: number;

    // --- 装备与物品 (仅队友强制需要；非队友可省略) ---
    当前装备?: NPC装备栏;
    背包?: string[]; // 物品名称列表

    // --- 扁平化：外貌相关 ---
    外貌描写?: string;
    身材描写?: string;
    衣着风格?: string;

    // --- 扁平化：私密相关 ---
    胸部大小?: string;
    乳头颜色?: string;
    小穴颜色?: string;
    后穴颜色?: string;
    臀部大小?: string;
    私密特质?: string; 
    私密总描述?: string;

    // --- 子宫/孕产相关 (女性专属) ---
    子宫?: 子宫档案;

    // --- 扁平化：初夜与状态 ---
    是否处女?: boolean;
    初夜夺取者?: string;
    初夜时间?: string;
    初夜描述?: string;

    // --- 扁平化：性经历统计 ---
    次数_口部?: number;
    次数_胸部?: number;
    次数_阴部?: number;
    次数_后庭?: number;
    次数_高潮?: number;

    // 记忆系统
    记忆: NPC记忆[];
}
