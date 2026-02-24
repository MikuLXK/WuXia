import type { 剧情风格类型, NTL后宫档位 } from '../../../models/system';
import { 剧情风格提示词_后宫 } from './harem';
import { 剧情风格提示词_修炼 } from './cultivation';
import { 剧情风格提示词_一般 } from './general';
import { 剧情风格提示词_修罗场 } from './shura';
import { 剧情风格提示词_纯爱 } from './pureLove';
import { 剧情风格提示词_NTL后宫_禁止乱伦, 剧情风格提示词_NTL后宫_假乱伦, 剧情风格提示词_NTL后宫_无限制 } from './ntlHarem';

const 风格提示词映射: Record<剧情风格类型, string> = {
    后宫: 剧情风格提示词_后宫,
    修炼: 剧情风格提示词_修炼,
    一般: 剧情风格提示词_一般,
    修罗场: 剧情风格提示词_修罗场,
    纯爱: 剧情风格提示词_纯爱,
    NTL后宫: 剧情风格提示词_NTL后宫_禁止乱伦
};

export const 获取剧情风格提示词 = (style: 剧情风格类型, ntlTier?: NTL后宫档位): string => {
    if (style === 'NTL后宫') {
        if (ntlTier === '假乱伦') return 剧情风格提示词_NTL后宫_假乱伦;
        if (ntlTier === '无限制') return 剧情风格提示词_NTL后宫_无限制;
        return 剧情风格提示词_NTL后宫_禁止乱伦;
    }
    return 风格提示词映射[style] || 风格提示词映射['一般'];
};
