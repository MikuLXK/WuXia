
import { 角色数据结构, 环境信息结构, NPC结构, 世界数据结构, 战斗状态结构, 剧情系统结构, 女主剧情规划结构 } from '../types';

export const applyStateCommand = (
    rootCharacter: 角色数据结构, 
    rootEnv: 环境信息结构, 
    rootSocial: NPC结构[],
    rootWorld: 世界数据结构, 
    rootBattle: 战斗状态结构,
    rootStory: 剧情系统结构, 
    rootHeroinePlan: 女主剧情规划结构 | undefined,
    key: string, 
    value: any, 
    action: 'set' | 'add' | 'push' | 'delete' | 'sub'
): { char: 角色数据结构, env: 环境信息结构, social: NPC结构[], world: 世界数据结构, battle: 战斗状态结构, story: 剧情系统结构, heroinePlan: 女主剧情规划结构 | undefined } => {
    let newChar = JSON.parse(JSON.stringify(rootCharacter));
    let newEnv = JSON.parse(JSON.stringify(rootEnv));
    let newSocial = JSON.parse(JSON.stringify(rootSocial));
    let newWorld = JSON.parse(JSON.stringify(rootWorld));
    let newBattle = JSON.parse(JSON.stringify(rootBattle));
    let newStory = JSON.parse(JSON.stringify(rootStory)); 
    let newHeroinePlan = rootHeroinePlan === undefined ? undefined : JSON.parse(JSON.stringify(rootHeroinePlan));

    const 合并剧情对象 = (baseStory: any, incoming: any): any => {
        if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) return JSON.parse(JSON.stringify(baseStory));
        const base = (baseStory && typeof baseStory === 'object') ? baseStory : {};
        const next = JSON.parse(JSON.stringify(base));

        if ('当前章节' in incoming) {
            next.当前章节 = {
                ...(base?.当前章节 || {}),
                ...((incoming?.当前章节 && typeof incoming.当前章节 === 'object') ? incoming.当前章节 : {})
            };
        }
        if ('下一章预告' in incoming) {
            next.下一章预告 = {
                ...(base?.下一章预告 || {}),
                ...((incoming?.下一章预告 && typeof incoming.下一章预告 === 'object') ? incoming.下一章预告 : {})
            };
        }
        if ('历史卷宗' in incoming) next.历史卷宗 = incoming.历史卷宗;
        if ('近期剧情规划' in incoming) next.近期剧情规划 = incoming.近期剧情规划;
        if ('中期剧情规划' in incoming) next.中期剧情规划 = incoming.中期剧情规划;
        if ('长期剧情规划' in incoming) next.长期剧情规划 = incoming.长期剧情规划;
        if ('待触发事件' in incoming) next.待触发事件 = incoming.待触发事件;
        if ('剧情变量' in incoming) next.剧情变量 = incoming.剧情变量;
        Object.keys(incoming).forEach((key) => {
            if (!(key in next)) {
                next[key] = incoming[key];
            }
        });
        return next;
    };

    // Determine target root
    let targetObj: any = null;
    let path = "";

    if (key.startsWith("gameState.角色")) {
        targetObj = newChar;
        path = key.replace(/^gameState\.角色\.?/, "");
        if (!path && action === 'set') {
            newChar = JSON.parse(JSON.stringify(value));
            return { char: newChar, env: newEnv, social: newSocial, world: newWorld, battle: newBattle, story: newStory, heroinePlan: newHeroinePlan };
        }
    } else if (key.startsWith("gameState.环境")) {
        targetObj = newEnv;
        path = key.replace(/^gameState\.环境\.?/, "");
        if (!path && action === 'set') {
            newEnv = JSON.parse(JSON.stringify(value));
            return { char: newChar, env: newEnv, social: newSocial, world: newWorld, battle: newBattle, story: newStory, heroinePlan: newHeroinePlan };
        }
    } else if (key.startsWith("gameState.社交")) {
        if (key === "gameState.社交") {
            if (action === 'set') {
                newSocial = Array.isArray(value) ? JSON.parse(JSON.stringify(value)) : [];
                return { char: newChar, env: newEnv, social: newSocial, world: newWorld, battle: newBattle, story: newStory, heroinePlan: newHeroinePlan };
            }
            if (action === 'push') {
                newSocial.push(value);
                return { char: newChar, env: newEnv, social: newSocial, world: newWorld, battle: newBattle, story: newStory, heroinePlan: newHeroinePlan };
            }
        }
        targetObj = { 社交: newSocial };
        path = key.replace(/^gameState\./, "");
    } else if (key.startsWith("gameState.世界")) {
        targetObj = newWorld;
        path = key.replace(/^gameState\.世界\.?/, "");
        if (!path && action === 'set') {
            newWorld = JSON.parse(JSON.stringify(value));
            return { char: newChar, env: newEnv, social: newSocial, world: newWorld, battle: newBattle, story: newStory, heroinePlan: newHeroinePlan };
        }
    } else if (key.startsWith("gameState.战斗")) {
        targetObj = newBattle;
        path = key.replace(/^gameState\.战斗\.?/, "");
        if (!path && action === 'set') {
            newBattle = JSON.parse(JSON.stringify(value));
            return { char: newChar, env: newEnv, social: newSocial, world: newWorld, battle: newBattle, story: newStory, heroinePlan: newHeroinePlan };
        }
    } else if (key.startsWith("gameState.剧情")) { 
        targetObj = newStory;
        path = key.replace(/^gameState\.剧情\.?/, "");
        if (!path && action === 'set') {
            newStory = 合并剧情对象(newStory, value);
            return { char: newChar, env: newEnv, social: newSocial, world: newWorld, battle: newBattle, story: newStory, heroinePlan: newHeroinePlan };
        }
    } else if (key.startsWith("gameState.女主剧情规划")) {
        if (key === "gameState.女主剧情规划" && action === 'set') {
            newHeroinePlan = value === undefined ? undefined : JSON.parse(JSON.stringify(value));
            return { char: newChar, env: newEnv, social: newSocial, world: newWorld, battle: newBattle, story: newStory, heroinePlan: newHeroinePlan };
        }
        if (!newHeroinePlan || typeof newHeroinePlan !== 'object' || Array.isArray(newHeroinePlan)) {
            newHeroinePlan = {} as 女主剧情规划结构;
        }
        targetObj = newHeroinePlan;
        path = key.replace(/^gameState\.女主剧情规划\.?/, "");
    }

    if (!targetObj || !path) return { char: newChar, env: newEnv, social: newSocial, world: newWorld, battle: newBattle, story: newStory, heroinePlan: newHeroinePlan };

    // Traverse path
    const parts = path.split('.').map(p => {
        if (p.includes('[') && p.includes(']')) {
            const name = p.split('[')[0];
            const index = parseInt(p.split('[')[1].replace(']', ''));
            return { name, index };
        }
        return { name: p };
    });

    let current = targetObj;
    
    // Iterate to find the parent of the target property
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        
        if (part.index !== undefined) {
             // Array access
             if (!current[part.name]) current[part.name] = [];
             if (!current[part.name][part.index]) current[part.name][part.index] = {};
             current = current[part.name][part.index];
        } else {
             // Object access
             if (!current[part.name]) current[part.name] = {};
             current = current[part.name];
        }
    }

    const lastPart = parts[parts.length - 1];
    const finalKey = lastPart.name;
    
    // Determine the object to modify
    let finalObj = current;

    if (lastPart.index !== undefined) {
        finalObj = current[finalKey];
    }

    if (action === 'set') {
        if (lastPart.index !== undefined) finalObj[lastPart.index] = value;
        else finalObj[finalKey] = value;
    } else if (action === 'add') {
        if (lastPart.index !== undefined) finalObj[lastPart.index] = (finalObj[lastPart.index] || 0) + value;
        else finalObj[finalKey] = (finalObj[finalKey] || 0) + value;
    } else if (action === 'sub') {
         if (lastPart.index !== undefined) finalObj[lastPart.index] = (finalObj[lastPart.index] || 0) - value;
         else finalObj[finalKey] = (finalObj[finalKey] || 0) - value;
    } else if (action === 'push') {
        let arrayToPush = (lastPart.index !== undefined) ? finalObj[lastPart.index] : finalObj[finalKey];
        if (!Array.isArray(arrayToPush)) {
            arrayToPush = [];
            if (lastPart.index !== undefined) finalObj[lastPart.index] = arrayToPush;
            else finalObj[finalKey] = arrayToPush;
        }
        
        if (key.endsWith('.记忆') && typeof value === 'object' && !value.时间) {
             value.时间 = `${newEnv.游戏天数}日 ${newEnv.时间}`; 
        }
        
        arrayToPush.push(value);
    } else if (action === 'delete') {
        if (lastPart.index !== undefined) {
            if (Array.isArray(finalObj) && lastPart.index >= 0 && lastPart.index < finalObj.length) {
                finalObj.splice(lastPart.index, 1);
            }
        } else if (finalObj && typeof finalObj === 'object' && finalKey in finalObj) {
            delete finalObj[finalKey];
        }
    }

    const heroinePlanResult = key.startsWith("gameState.女主剧情规划")
        ? newHeroinePlan
        : (targetObj?.女主剧情规划 !== undefined
            ? ((targetObj as any).女主剧情规划 as 女主剧情规划结构 | undefined)
            : newHeroinePlan);

    return {
        char: newChar,
        env: newEnv,
        social: Array.isArray((targetObj as any).社交) ? (targetObj as any).社交 : newSocial,
        world: targetObj === newWorld ? newWorld : newWorld,
        battle: targetObj === newBattle ? newBattle : newBattle,
        story: targetObj === newStory ? newStory : newStory,
        heroinePlan: heroinePlanResult
    };
};
