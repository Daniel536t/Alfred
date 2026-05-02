import { readFileSync, writeFileSync } from 'node:fs';
import { PublicKey } from '@solana/web3.js';

const BOOK_PATH = process.env.HOME + '/.alfred-addressbook.json';

function loadBook() {
    try { return JSON.parse(readFileSync(BOOK_PATH, 'utf-8')); } catch { return {}; }
}

function saveBook(book) {
    writeFileSync(BOOK_PATH, JSON.stringify(book, null, 2));
}

function isValidAddress(addr) {
    try {
        new PublicKey(addr);
        return true;
    } catch {
        return false;
    }
}

export async function routeAddressBook(params = {}) {
    const { instruction, data = {} } = params;
    const book = loadBook();

    switch (instruction?.toLowerCase()) {
        case 'save': {
            const { name, address } = data;
            if (!name || !address) return { success: false, error: 'Name and address required, Sir.' };
            
            // Strip accidental punctuation from name
            const cleanName = name.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]$/, '').trim().toLowerCase();
            
            if (!isValidAddress(address)) {
                return { success: false, error: 'That does not appear to be a valid Solana address, Sir.' };
            }
            
            book[cleanName] = address;
            saveBook(book);
            return { success: true, message: `Saved ${cleanName} (${address.slice(0, 8)}...) to your address book, Sir.` };
        }
        case 'lookup': {
            const { name } = data;
            const cleanName = name?.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]$/, '').trim().toLowerCase();
            const found = book[cleanName];
            return found 
                ? { success: true, address: found, message: `${cleanName}: ${found.slice(0, 8)}...` }
                : { success: false, error: `No address saved for ${cleanName}, Sir.` };
        }
        case 'list': {
            const entries = Object.entries(book).map(([n, a]) => `**${n}**: ${a.slice(0, 8)}...`);
            return { success: true, message: entries.length ? '**Address Book:**\n' + entries.join('\n') : 'Address book empty, Sir.' };
        }
        default:
            return { success: false, error: 'Unknown address book command.' };
    }
}
