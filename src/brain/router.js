import { executeJupiterSwap, getJupiterPrice, getMarketOverview } from '../tools/jupiter.js';
import { routeMagicBlockEphemeral, scanPrivateActivity } from '../tools/magicblock.js';
import { sendUmbraStealth } from '../tools/umbra.js';

const TOOL_MAP = {
    jupiter: executeJupiterSwap,
    magicblock: routeMagicBlockEphemeral,
    umbra: sendUmbraStealth,
};

export async function routeAction(action) {
    const { action: actionType, protocol, params } = action;
    if (!actionType) throw new Error('Missing "action" field');
    if (actionType === 'standby') return { status: 'standby' };
    if (actionType === 'notify') return { status: 'notify', message: action.message };
    if (actionType === 'execute') {
        const toolProtocol = protocol || action.protocol;
        if (!toolProtocol || !TOOL_MAP[toolProtocol]) {
            throw new Error('Unknown protocol: ' + toolProtocol);
        }
        console.log('   🧠 Routing to tool: ' + toolProtocol);
        return await TOOL_MAP[toolProtocol](params || {});
    }
    throw new Error('Unsupported action type: ' + actionType);
}

export { getJupiterPrice, getMarketOverview } from '../tools/jupiter.js';
export { scanPrivateActivity } from '../tools/magicblock.js';
