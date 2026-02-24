export interface 女主关系锚点结构 {
    姓名: string;
    关系: string;
    情感强度: number; // 0-100
    崩溃进度: number; // 0-100
}

export interface 女主剧情条目结构 {
    女主ID: string; // 对齐 gameState.社交[i].id
    女主名: string;
    重要度: '核心' | '主要' | '支线';
    登场状态: '未登场' | '可触发' | '已登场';
    首登触发条件: string;
    首登场景建议: string;
    当前关系阶段: '陌生' | '接触' | '信任' | '暧昧' | '绑定';
    当前阶段目标: string;
    下一突破条件: string;
    互动优先级: number; // 1-100
    既有男性锚点: 女主关系锚点结构[];
    阻断记录: string[];
    已完成节点: string[];
    待完成节点: string[];
    最近推进时间: string; // YYYY:MM:DD:HH:MM
}

export interface 女主互动排期结构 {
    事件ID: string;
    女主ID: string;
    类型: '初见' | '日常' | '协作' | '冲突' | '修罗场' | '亲密' | '公开站队';
    描述: string;
    触发条件: string;
    失效时间: string; // YYYY:MM:DD:HH:MM
    成功效果: string;
    失败效果: string;
    状态: '待触发' | '已触发' | '已失效';
}

export interface 群像镜头规划结构 {
    镜头ID: string;
    参与者: string[]; // 女主ID / NPC名
    焦点: string;
    预期冲突: string;
    状态: '待执行' | '已执行';
}

export interface 女主剧情规划结构 {
    当前阶段: '开局铺垫' | '并线发展' | '冲突升级' | '收束定局';
    当前焦点女主ID: string;
    登场队列: string[];
    女主条目: 女主剧情条目结构[];
    互动排期: 女主互动排期结构[];
    群像镜头规划: 群像镜头规划结构[];
    规则约束: {
        单回合主推进上限: number;
        单回合次推进上限: number;
        连续同女主推进上限: number;
        低压回合保底互动数: number;
    };
}
