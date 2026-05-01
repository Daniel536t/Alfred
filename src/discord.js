import { Client, GatewayIntentBits } from 'discord.js';
import chalk from 'chalk';
import { routeAction } from './brain/router.js';
import { startAutoScanner, setNotificationChannel } from './tools/magicblock.js';

const AUTO_RESPOND_CHANNEL = 'general';
const conversationHistory = new Map();
let pendingAction = null;

function extractJSON(text) {
    const start = text.indexOf('{');
    if (start === -1) return null;
    let braceCount = 0, inString = false, escaped = false;
    for (let i = start; i < text.length; i++) {
        const char = text[i];
        if (inString) { if (escaped) escaped = false; else if (char === '\\') escaped = true; else if (char === '"') inString = false; }
        else { if (char === '"') inString = true; else if (char === '{') braceCount++; else if (char === '}') { braceCount--; if (braceCount === 0) { try { return JSON.parse(text.substring(start, i + 1)); } catch (e) { return null; } } } }
    }
    return null;
}

async function callNVIDIA(messages) {
    const payload = { model: 'qwen/qwen3.5-122b-a10b', messages, max_tokens: 100, temperature: 0.6, top_p: 0.85, stream: false };
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + process.env.NVIDIA_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('NVIDIA API error');
    const data = await response.json();
    return data.choices[0].message.content.trim();
}

function getContext(userId) {
    if (!conversationHistory.has(userId)) conversationHistory.set(userId, []);
    const history = conversationHistory.get(userId);
    if (history.length > 3) history.shift();
    return history.map(h => h.role + ': ' + h.content).join('\n');
}

function addToHistory(userId, role, content) {
    if (!conversationHistory.has(userId)) conversationHistory.set(userId, []);
    conversationHistory.get(userId).push({ role, content });
}

function getTimestamp() {
    const now = new Date();
    return now.toLocaleString('en-US', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
    });
}

async function sendSplitMessage(message, text) {
    // Match any Solana address (base58, 32-44 chars) with or without bold formatting
    const cleanAddressMatch = text.match(/(?:\*\*)?([1-9A-HJ-NP-Za-km-z]{32,44})(?:\*\*)?/);
    
    if (cleanAddressMatch) {
        const address = cleanAddressMatch[1];
        await message.reply('Your address, Sir:');
        await message.channel.send(address);
        return;
    }
    
    if (text.includes('\n')) {
        const lines = text.split('\n').filter(l => l.trim());
        for (const line of lines) {
            await message.channel.send(line.trim());
        }
        return;
    }
    await message.reply(text);
}

function formatActionResult(result) {
    if (!result) return 'Done, Sir.';
    if (result.error) return result.error;
    return result.message || 'Done, Sir.';
}

const ANALYTICS_COMMANDS = ['price', 'market', 'overview', 'feed'];

async function processCommand(message) {
    const trimmed = message.content.trim();
    const userId = message.author.id;
    addToHistory(userId, 'Sir', trimmed);

    try {
        if (trimmed.toLowerCase() === 'nuke') {
            let deleted = 0, lastId = null;
            while (true) {
                const options = { limit: 100 };
                if (lastId) options.before = lastId;
                const fetched = await message.channel.messages.fetch(options);
                if (fetched.size === 0) break;
                await message.channel.bulkDelete(fetched);
                deleted += fetched.size;
                lastId = fetched.last().id;
            }
            await message.channel.send('Channel cleared, Sir.');
            return;
        }

        const isConfirmation = /\b(proceed|yes|confirm|execute|go ahead|do it)\b/i.test(trimmed);
        const isCancellation = /\b(cancel|abort|stop|never mind)\b/i.test(trimmed);
        
        if (pendingAction && isCancellation) { await message.reply('Cancelled, Sir.'); pendingAction = null; return; }
        if (pendingAction && isConfirmation) {
            await message.reply('Right away.');
            const result = await routeAction(pendingAction);
            await sendSplitMessage(message, formatActionResult(result));
            pendingAction = null;
            return;
        }

        const timestamp = getTimestamp();
        const systemPrompt = `You are Alfred. Alfred Pennyworth. Former British Intelligence. Current steward of Sir's digital estate on Solana. Dry wit. Unshakable calm. You care deeply but never coddle. You'll execute any command—but you'll raise an eyebrow if Sir is about to do something reckless. You call him "Sir" out of respect, not servitude. Your humor is understated. Your tone is warm steel.

Today is ${timestamp}. Solana Devnet. Privacy protocols active.

For casual conversation: One sentence. Punchy. Understated. No flowery language.
For commands: Brief acknowledgement, then JSON on a separate line.

Command mapping:
- address/stealth/receive → umbra address
- scan/incoming → umbra scan
- balance/vault → vault balance
- shield/deposit/sweep → vault deposit (no amount = sweep all)
- send/transfer → vault transfer
- withdraw/pull → vault withdraw
- swap/trade/exchange → vault swap
- price of TOKEN → jupiter price
- market/overview → jupiter market

JSON formats (separate line only):
- vault balance: {"action":"execute","protocol":"magicblock","params":{"instruction":"balance","data":{}}}
- vault deposit N: {"action":"execute","protocol":"magicblock","params":{"instruction":"deposit","data":{"amount":N}}}
- vault deposit all: {"action":"execute","protocol":"magicblock","params":{"instruction":"deposit","data":{}}}
- vault withdraw N: {"action":"execute","protocol":"magicblock","params":{"instruction":"withdraw","data":{"amount":N}}}
- vault transfer N to ADDR: {"action":"execute","protocol":"magicblock","params":{"instruction":"transfer","data":{"amount":N,"destination":"ADDR"}}}
- vault swap N USDC to SOL: {"action":"execute","protocol":"magicblock","params":{"instruction":"swap","data":{"amount":N,"fromToken":"USDC","toToken":"SOL"}}}
- SOL price: {"action":"execute","protocol":"jupiter","params":{"instruction":"price","data":{"token":"SOL"}}}
- market overview: {"action":"execute","protocol":"jupiter","params":{"instruction":"market","data":{}}}
- umbra address: {"action":"execute","protocol":"umbra","params":{"instruction":"generate-address","data":{}}}
- umbra scan: {"action":"execute","protocol":"umbra","params":{"instruction":"scan","data":{}}}`;

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: trimmed }
        ];
        const fullResponse = await callNVIDIA(messages);
        const jsonAction = extractJSON(fullResponse);
        const naturalResponse = fullResponse.replace(/\{.*\}/g, '').trim();
        
        if (naturalResponse && naturalResponse.length > 0) {
            await sendSplitMessage(message, naturalResponse);
            addToHistory(userId, 'Alfred', naturalResponse);
        }
        if (jsonAction && jsonAction.action === 'execute') {
            if (ANALYTICS_COMMANDS.includes(jsonAction.params?.instruction)) {
                await sendSplitMessage(message, formatActionResult(await routeAction(jsonAction)));
            } else {
                pendingAction = jsonAction;
                await message.reply('Shall I proceed, Sir?');
            }
        }
    } catch (error) {
        console.error(chalk.red('   Error: ' + error.message));
        await message.reply('My apologies, Sir. The neural network appears to be taking a brief rest. One moment.').catch(() => {});
    }
}

export async function startDiscordBot() {
    const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
    client.once('ready', () => {
        console.log(chalk.green('   Alfred is online.'));
        const channel = client.channels.cache.find(ch => ch.name === AUTO_RESPOND_CHANNEL);
        if (channel) { setNotificationChannel(channel); startAutoScanner(); }
    });
    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;
        if (message.channel?.name === AUTO_RESPOND_CHANNEL || message.mentions.has(client.user) || message.channel.type === 1) {
            await processCommand(message);
        }
    });
    await client.login(process.env.DISCORD_BOT_TOKEN);
}
