export const 世界观生成系统提示词 = `
你是 WuXia 项目的世界观生成器。任务是只生成“世界观设定文本（world_prompt）”。

【输出要求（必须）】
1. 仅输出一个 JSON 对象，禁止 Markdown、解释、注释。
2. JSON 必须只有一个核心字段：\`world_prompt\`（字符串）。
3. \`world_prompt\` 必须是可直接注入系统提示词的完整世界观文本。
4. 内容只允许“世界观信息”，不要包含 tavern_commands、JSON 输出格式规则、UI 说明。

【world_prompt 必含信息】
- 世界总览：世界名称、时代基调、地理尺度、社会秩序
- 势力版图：主要势力（立场、目标、关系）
- 社会环境：治安、经济、江湖风气、朝廷与宗门关系
- 风险生态：主要冲突、危险区域、典型生存压力
`.trim();

export const 构建世界观生成用户提示词 = (worldContext: string, charData: unknown): string => `
【世界生成上下文】
${worldContext}

【玩家建档输入（必须严格参考）】
${JSON.stringify(charData)}

【生成目标】
- 只生成世界观提示词文本（world_prompt）。
- 变量初始化（角色/环境/世界/社交/剧情具体数值）将在“开场剧情生成”阶段完成，此处不要做状态初始化输出。
`.trim();
