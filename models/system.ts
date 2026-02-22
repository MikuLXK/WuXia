
// 系统配置相关定义 - 解耦自 types.ts

import { 角色数据结构 } from './character';
import { 环境信息结构 } from './environment';
import { NPC结构 } from './social';
import { 世界数据结构 } from './world';
import { 详细门派结构 } from './sect';
import { 任务结构, 约定结构 } from './task';
import { 剧情系统结构 } from './story';
import { 战斗状态结构 } from './battle';

export type 接口供应商类型 = 'gemini' | 'claude' | 'openai' | 'deepseek' | 'openai_compatible';

export type OpenAI兼容方案类型 = 'custom' | 'openrouter' | 'siliconflow' | 'together' | 'groq';

export type 请求协议覆盖类型 = 'auto' | 'openai' | 'gemini' | 'claude' | 'deepseek';

export interface 单接口配置结构 {
    id: string;
    名称: string;
    供应商: 接口供应商类型;
    兼容方案?: OpenAI兼容方案类型;
    协议覆盖?: 请求协议覆盖类型;
    baseUrl: string;
    apiKey: string;
    model: string;
    createdAt: number;
    updatedAt: number;
}

export interface 功能模型占位配置结构 {
    主剧情使用模型: string;
    剧情回忆独立模型开关: boolean;
    剧情回忆静默确认: boolean;
    剧情回忆完整原文条数N: number;
    剧情回忆最早触发回合: number;
    世界演变独立模型开关: boolean;
    变量计算独立模型开关: boolean;
    文章优化独立模型开关: boolean;
    剧情回忆使用模型: string;
    世界演变使用模型: string;
    变量计算使用模型: string;
    文章优化使用模型: string;
}

export interface 接口设置结构 {
    activeConfigId: string | null;
    configs: 单接口配置结构[];
    功能模型占位: 功能模型占位配置结构;
}

export interface 视觉设置结构 {
    时间显示格式: '传统' | '数字'; 
    背景图片?: string; // URL 或 Base64
    渲染层数: number; // New: Default 30
}

export type 剧情风格类型 = '后宫' | '修炼' | '一般' | '修罗场' | '纯爱' | 'NTL后宫';

export interface 游戏设置结构 {
    字数要求: number; // Minimum logs body length
    叙事人称: '第一人称' | '第二人称' | '第三人称';
    启用行动选项: boolean; // Whether to require action_options output
    启用COT伪装注入: boolean; // Inject pseudo historical COT message before latest user input
    启用多重思考: boolean; // Switch COT/format prompts to multi-thinking variants
    剧情风格: 剧情风格类型; // Story style injected as assistant context before COT
    额外提示词: string; // Custom prompt injected at the end
}

export interface 记忆配置结构 {
    短期记忆阈值: number; // 默认 20
    中期记忆阈值: number; // 默认 50
    重要角色关键记忆条数N: number; // 默认 20
    短期转中期提示词: string; 
    中期转长期提示词: string;
}

export interface 记忆系统结构 {
    回忆档案: 回忆条目结构[]; // 结构化回忆索引（用于互动历史存档）
    即时记忆: string[]; // 近期回合逐条记忆（第0回合开场也写入）
    短期记忆: string[]; // 短期摘要记忆条目
    中期记忆: string[];
    长期记忆: string[];
}

export interface 回忆条目结构 {
    名称: string; // 例如：【回忆001】
    概括: string; // 对应短期记忆
    原文: string; // 对应即时记忆
    回合: number; // 顺序号
    记录时间: string;
    时间戳: number;
}

export type ThemePreset = 'ink' | 'azure';

export interface 聊天记录结构 {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
    gameTime?: string; // 结构化时间戳字符串
    [key: string]: any; // Allow extensibility for structuredResponse etc.
}

export interface 存档结构 {
    id: number;
    类型: 'manual' | 'auto'; // Added Save Type
    时间戳: number;
    描述: string;
    角色数据: 角色数据结构;
    环境信息: 环境信息结构;
    历史记录: 聊天记录结构[];
    
    // Extended fields
    社交?: NPC结构[];
    世界?: 世界数据结构;
    战斗?: 战斗状态结构;
    玩家门派?: 详细门派结构;
    任务列表?: 任务结构[];
    约定列表?: 约定结构[];
    剧情?: 剧情系统结构;
    
    // New Settings in Save
    记忆系统?: 记忆系统结构;
    游戏设置?: 游戏设置结构;
    记忆配置?: 记忆配置结构;
    
    // Saved Prompts State (Important for preserving world gen)
    提示词快照?: any[]; 
}

export type PromptCategory = '核心设定' | '数值设定' | '难度设定' | '写作设定' | '自定义';

export interface 提示词结构 {
    id: string;
    标题: string;
    内容: string;
    类型: PromptCategory;
    启用: boolean;
}

export interface 节日结构 {
    id: string;
    名称: string;
    月: number;
    日: number;
    描述: string;
    效果: string; // 如：鬼怪出现率增加
}
