
export * from './models/character';
export * from './models/environment';
export * from './models/system';
export * from './models/world';
export * from './models/item';
export * from './models/social';
export * from './models/kungfu'; 
export * from './models/sect'; 
export * from './models/task'; 
export * from './models/story'; 
export * from './models/battle';

// New types for the advanced chat system

export interface TavernCommand {
    action: 'add' | 'set' | 'push' | 'delete'; 
    key: string;
    value: any;
}

export interface GameLog {
    sender: string;
    text: string;
}

export interface GameResponse {
    thinking_pre?: string;
    logs: GameLog[];
    thinking_post?: string;
    tavern_commands?: TavernCommand[];
    shortTerm?: string;
    action_options?: string[]; // Quick actions for the user
}

// Extend/Override the old history structure
export interface 聊天记录结构 {
    role: 'user' | 'assistant' | 'system';
    content: string; // Keep for backward compat or user input
    structuredResponse?: GameResponse; // The parsed object for assistant
    timestamp: number;
    rawJson?: string; // To support editing
    gameTime?: string; // Added gameTime
}

export interface 天赋结构 {
    名称: string;
    描述: string;
    效果: string; // 具体数值或逻辑描述
}

export interface 背景结构 {
    名称: string;
    描述: string;
    效果: string;
}

// Configuration for World Generation
export interface WorldGenConfig {
    worldName: string;
    powerLevel: '低武' | '中武' | '高武' | '修仙';
    worldSize: '弹丸之地' | '九州宏大' | '无尽位面';
    dynastySetting: string; // e.g. "大一统王朝" or "诸侯割据"
    sectDensity: '稀少' | '适中' | '林立';
    tianjiaoSetting: string; // Setting regarding prodigies
    difficulty: 'relaxed' | 'easy' | 'normal' | 'hard' | 'extreme'; // Added difficulty
}

export type SaveType = 'manual' | 'auto';
