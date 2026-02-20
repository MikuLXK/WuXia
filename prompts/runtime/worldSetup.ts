import { WorldGenConfig, 角色数据结构 } from '../../types';

export const 构建世界观锚点提示词 = (worldConfig: WorldGenConfig, charData: 角色数据结构): string => `
【当前存档世界锚点（World Bible Anchor）】
- 世界名称: ${worldConfig.worldName}
- 武力层级: ${worldConfig.powerLevel}
- 世界规模: ${worldConfig.worldSize}
- 王朝格局: ${worldConfig.dynastySetting}
- 宗门密度: ${worldConfig.sectDensity}
- 天骄设定: ${worldConfig.tianjiaoSetting}
- 游戏难度: ${worldConfig.difficulty || 'normal'}

【主角建档锚点】
- 姓名/性别/年龄: ${charData.姓名}/${charData.性别}/${charData.年龄}
- 出生日期: ${charData.出生日期}
- 外貌: ${charData.外貌 || '未描述'}
- 初始境界: ${charData.境界}
- 六维: 力量${charData.力量} 敏捷${charData.敏捷} 体质${charData.体质} 根骨${charData.根骨} 悟性${charData.悟性} 福源${charData.福源}
- 天赋: ${charData.天赋列表.map(t => t.名称).join('、') || '无'}
- 背景: ${charData.出身背景?.名称 || '未知'}（${charData.出身背景?.描述 || '无描述'}）
`.trim();

export const 构建世界观种子提示词 = (worldConfig: WorldGenConfig, charData: 角色数据结构): string => {
    const anchor = 构建世界观锚点提示词(worldConfig, charData);
    return `
【世界观设定（存档绑定）】
此字段是当前存档唯一世界观母本，必须长期一致；后续叙事、判定、事件演化均以此为依据。

1. **世界一致性**
   - 势力、境界、资源稀缺度、社会秩序必须与本母本一致。
   - 禁止同一存档内无因果改写世界底层法则。

2. **主角一致性**
   - 主角身份、出身、六维、初始处境必须与建档锚点一致。
   - 前期物资、功法、关系网必须符合“初出江湖”的因果，不得空降神装神功。

3. **叙事边界**
   - 世界观用于约束，不直接替玩家决策。
   - 重大世界事件需通过 \`gameState.世界\` 与 \`gameState.剧情\` 可追溯落地。

4. **时间与地点**
   - 时间推进与地点变化需与 \`gameState.环境\` 同步。
   - 同时空冲突（同角色同刻多地）视为非法叙事。

${anchor}
    `.trim();
};

export const 构建世界生成任务上下文提示词 = (
    worldPromptSeed: string,
    difficulty: string,
    enabledDifficultyPrompts: string
): string => `
${worldPromptSeed}

【世界生成配置】
- 模式: 新建世界
- 难度: ${difficulty}
- 生成目标: 仅生成 world_prompt（世界观提示词文本）

【启用难度规则】
${enabledDifficultyPrompts || '未提供'}
`.trim();
