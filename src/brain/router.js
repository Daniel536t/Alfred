import { executeJupiterSwap, getJupiterPrice } from '../tools/jupiter.js';
import { routeMagicBlockEphemeral, scanPrivateActivity } from '../tools/magicblock.js';
import { sendUmbraStealth } from '../tools/umbra.js';
import { routeAddressBook } from '../tools/addressbook.js';
import { readFileSync } from 'node:fs';

const BOOK_PATH = process.env.HOME + '/.alfred-addressbook.json';

const TOOL_MAP = {
    jupiter: executeJupiterSwap,
    magicblock: routeMagicBlockEphemeral,
    umbra: sendUmbraStealth,
    addressbook: routeAddressBook,
};

function lookupAddress(name) {
    try {
        const book = JSON.parse(readFileSync(BOOK_PATH, 'utf-8'));
        const cleanName = name.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]$/, '').trim().toLowerCase();
        const key = Object.keys(book).find(k => k.toLowerCase() === cleanName);
        return key ? book[key] : null;
    } catch {
        return null;
    }
}

export async function routeAction(action) {
    const { action: actionType, protocol, params } = action;
    if (!actionType) throw new Error('Missing "action" field');
    if (actionType === 'standby') return { status: 'standby' };
    if (actionType === 'notify') return { status: 'notify', message: action.message };
    if (actionType === 'execute') {
        let toolProtocol = protocol || action.protocol;
        
        if (toolProtocol === 'magicblock' && params?.instruction === 'transfer') {
            const data = params?.data || params;
            const dest = data.destination || '';
            
            const skipPhrases = /^(this|that|the)\s+(address|one|wallet|account)$/i;
            if (skipPhrases.test(dest)) {
                return { success: false, error: 'Please provide a Solana address or a name from your address book, Sir.' };
            }
            
            if (dest && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(dest)) {
                const address = lookupAddress(dest);
                if (address) {
                    if (params.data) {
                        params.data.destination = address;
                    } else {
                        params.destination = address;
                    }
                } else {
                    return { success: false, error: `No address saved for "${dest}". Save it first with: save ADDR as ${dest}` };
                }
            }
        }
        
        if (!toolProtocol || !TOOL_MAP[toolProtocol]) {
            throw new Error('Unknown protocol: ' + toolProtocol);
        }
        console.log('   Routing to: ' + toolProtocol);
        return await TOOL_MAP[toolProtocol](params || {});
    }
    throw new Error('Unsupported action type: ' + actionType);
}

export { getJupiterPrice } from '../tools/jupiter.js';
export { scanPrivateActivity } from '../tools/magicblock.js';
