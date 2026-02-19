
import { 游戏物品 } from './item';
import { 功法结构 } from './kungfu';
import { 天赋结构, 背景结构 } from '../types';

// 角色相关定义 - 解耦自 types.ts

export interface 角色装备 {
    头部: string; // 物品ID 或 名称
    胸部: string;
    腿部: string;
    手部: string; // 护腕/手套
    足部: string; // 鞋子

    主武器: string;
    副武器: string;
    暗器: string;

    背部: string; // 新增：背部 (背包/背负重剑)
    腰部: string; // 新增：腰部 (腰带/锦囊/挂件)
    
    坐骑: string;
}

export interface 角色数据结构 {
    姓名: string;
    性别: '男' | '女'; // New
    年龄: number;     // New
    出生日期: string;  // New: YYYY:MM:DD
    外貌: string;      // 角色外貌描述
    
    称号: string;
    境界: string;
    
    // New: Talents and Background
    天赋列表: 天赋结构[];
    出身背景: 背景结构;

    // 门派相关
    所属门派ID: string; // "none" 为江湖散人
    门派职位: string;
    门派贡献: number;

    // 生存状态
    当前精力: number;
    最大精力: number;
    当前饱腹: number;
    最大饱腹: number;
    当前口渴: number;
    最大口渴: number;

    // 负重系统
    当前负重: number; // 单位: 斤
    最大负重: number; // 由力量决定

    // 六维属性
    力量: number;
    敏捷: number;
    体质: number;
    根骨: number;
    悟性: number;
    福源: number;

    // 身体部位状态
    头部当前血量: number; 头部最大血量: number; 头部状态: string;
    胸部当前血量: number; 胸部最大血量: number; 胸部状态: string;
    腹部当前血量: number; 腹部最大血量: number; 腹部状态: string;
    左手当前血量: number; 左手最大血量: number; 左手状态: string;
    右手当前血量: number; 右手最大血量: number; 右手状态: string;
    左腿当前血量: number; 左腿最大血量: number; 左腿状态: string;
    右腿当前血量: number; 右腿最大血量: number; 右腿状态: string;

    // 装备 (仅存引用)
    装备: 角色装备;
    
    // 实际物品数据
    物品列表: 游戏物品[];

    // 功法列表
    功法列表: 功法结构[];

    当前经验: number;
    升级经验: number;
    
    玩家BUFF: string[]; 
}
