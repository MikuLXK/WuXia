
import { 提示词结构 } from '../types';

// Core
import { 核心_输出格式 } from './core/format';
import { 核心_核心规则 } from './core/rules';
import { 核心_数据格式 } from './core/data';
import { 核心_记忆法则 } from './core/memory'; 
import { 核心_世界观 } from './core/world'; // New
import { 核心_思维链 } from './core/cot';   // New

// Stats
import { 数值_角色属性 } from './stats/character';
import { 数值_物品属性 } from './stats/items';
import { 数值_功法体系 } from './stats/kungfu';
import { 数值_世界演化 } from './stats/world'; 
import { 数值_其他设定 } from './stats/others';

// Difficulty
import { 难度_游戏 } from './difficulty/game';
import { 难度_判定 } from './difficulty/check';
import { 难度_生理 } from './difficulty/physiology';

// Writing
import { 写作_人称 } from './writing/perspective';
import { 写作_要求 } from './writing/requirements';
import { 写作_风格 } from './writing/style';

export const 默认提示词: 提示词结构[] = [
    // Core
    核心_世界观, // Added
    核心_输出格式,
    核心_核心规则,
    核心_数据格式,
    核心_记忆法则,
    核心_思维链, // Added

    // Stats
    数值_角色属性,
    数值_物品属性,
    数值_功法体系,
    数值_世界演化,
    数值_其他设定,

    // Difficulty (Arrays)
    ...难度_游戏,
    ...难度_判定,
    ...难度_生理,

    // Writing
    写作_人称,
    写作_要求,
    写作_风格
];
