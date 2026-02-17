
import { 角色数据结构, 环境信息结构, NPC结构, 世界数据结构, 剧情系统结构 } from '../types';

export const applyStateCommand = (
    rootCharacter: 角色数据结构, 
    rootEnv: 环境信息结构, 
    rootSocial: NPC结构[],
    rootWorld: 世界数据结构, 
    rootStory: 剧情系统结构, 
    key: string, 
    value: any, 
    action: 'set' | 'add' | 'push' | 'delete' | 'sub'
): { char: 角色数据结构, env: 环境信息结构, social: NPC结构[], world: 世界数据结构, story: 剧情系统结构 } => {
    let newChar = JSON.parse(JSON.stringify(rootCharacter));
    let newEnv = JSON.parse(JSON.stringify(rootEnv));
    let newSocial = JSON.parse(JSON.stringify(rootSocial));
    let newWorld = JSON.parse(JSON.stringify(rootWorld));
    let newStory = JSON.parse(JSON.stringify(rootStory)); 

    // Determine target root
    let targetObj: any = null;
    let path = "";

    if (key.startsWith("gameState.角色")) {
        targetObj = newChar;
        path = key.replace("gameState.角色.", "");
    } else if (key.startsWith("gameState.环境")) {
        targetObj = newEnv;
        path = key.replace("gameState.环境.", "");
    } else if (key.startsWith("gameState.社交")) {
        targetObj = { 社交: newSocial }; 
        path = key.replace("gameState.", "");
    } else if (key.startsWith("gameState.世界")) {
        targetObj = { 世界: newWorld }; 
        path = key.replace("gameState.世界.", "世界.");
    } else if (key.startsWith("gameState.剧情")) { 
        targetObj = { 剧情: newStory };
        path = key.replace("gameState.剧情.", "剧情.");
    } else {
        if (key === "gameState.当前地点") { targetObj = newEnv; path = "具体地点"; }
    }

    if (!targetObj || !path) return { char: newChar, env: newEnv, social: newSocial, world: newWorld, story: newStory };

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
             value.时间 = `${newEnv.日期}日 ${newEnv.时间}`; 
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

    return { char: newChar, env: newEnv, social: targetObj.社交 || newSocial, world: targetObj.世界 || newWorld, story: targetObj.剧情 || newStory };
};
