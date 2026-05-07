import { Connection, Keypair, Transaction, sendAndConfirmTransaction, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import nacl from 'tweetnacl';
import fetch from 'node-fetch';
import chalk from 'chalk';

const execAsync = promisify(exec);

const MAGICBLOCK_PAYMENTS_API = 'https://payments.magicblock.app';
const SOLANA_DEVNET_RPC = 'https://api.devnet.solana.com';
const USDC_MINT_DEVNET = 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr';
const BOOK_PATH = process.env.HOME + '/.alfred-addressbook.json';

const MAINNET_MINTS = {
    'SOL': 'So11111111111111111111111111111111111111112',
    'USDC': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
};

function findNameByAddress(address) {
    try {
        const book = JSON.parse(readFileSync(BOOK_PATH, 'utf-8'));
        const entry = Object.entries(book).find(([name, addr]) => addr === address);
        return entry ? entry[0] : null;
    } catch {
        return null;
    }
}

async function getUmbraKeypair() {
    const keypairPath = process.env.SOLANA_KEYPAIR_PATH || `${process.env.HOME}/dev-wallet.json`;
    const secretKey = Buffer.from(JSON.parse(readFileSync(keypairPath, 'utf-8')));
    const mainWallet = Keypair.fromSecretKey(secretKey);
    const message = new TextEncoder().encode("Sign to access your Umbra Privacy Vault");
    const signature = nacl.sign.detached(message, mainWallet.secretKey);
    const seed = createHash('sha256').update(signature).digest();
    return Keypair.fromSeed(seed.slice(0, 32));
}

async function callMagicBlockAPI(endpoint, payload) {
    const response = await fetch(MAGICBLOCK_PAYMENTS_API + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('MagicBlock Error: ' + await response.text());
    return response.json();
}

async function getSecureBalance(wallet) {
    const message = new TextEncoder().encode(wallet.publicKey.toBase58());
    const signature = nacl.sign.detached(message, wallet.secretKey);
    const authBase64 = Buffer.from(signature).toString('base64');
    const url = `${MAGICBLOCK_PAYMENTS_API}/v1/spl/private-balance?address=${wallet.publicKey.toBase58()}&mint=${USDC_MINT_DEVNET}&cluster=devnet&authorization=${encodeURIComponent(authBase64)}`;
    const response = await fetch(url, { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authBase64}` } });
    const data = await response.json();
    return Number(data?.balance ?? data?.amount ?? data?.lamports ?? 0);
}

async function ensureTokenAccount(connection, wallet, recipientPubkey) {
    const mint = new PublicKey(USDC_MINT_DEVNET);
    const ata = await getAssociatedTokenAddress(mint, recipientPubkey);
    const accountInfo = await connection.getAccountInfo(ata);
    let created = false;
    if (!accountInfo) {
        console.log(chalk.gray('   🏗️  Creating USDC token account for recipient...'));
        const tx = new Transaction().add(
            createAssociatedTokenAccountInstruction(wallet.publicKey, ata, recipientPubkey, mint)
        );
        await sendAndConfirmTransaction(connection, tx, [wallet], { commitment: 'confirmed' });
        created = true;
        console.log(chalk.gray('   ✅ Token account created.'));
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return { ata, created };
}

// Perform a direct withdrawal from vault to L1 and return the result
async function withdrawFromVault(amount, umbraWallet, connection) {
    const baseAmount = Math.floor(amount * 1_000_000);
    console.log(chalk.gray(`   🔓 Withdrawing ${amount} USDC from vault to L1...`));
    const withdrawTx = await callMagicBlockAPI('/v1/spl/withdraw', {
        owner: umbraWallet.publicKey.toBase58(),
        amount: baseAmount,
        mint: USDC_MINT_DEVNET,
        cluster: 'devnet'
    });
    const withdrawTransaction = Transaction.from(Buffer.from(withdrawTx.transactionBase64, 'base64'));
    const signature = await sendAndConfirmTransaction(connection, withdrawTransaction, [umbraWallet], { commitment: 'confirmed' });
    console.log(chalk.green(`   ✅ Withdrawn ${amount} USDC.`));
    
    // Update scanner baseline
    lastKnownBalance = (Number(await fetch(`${MAGICBLOCK_PAYMENTS_API}/v1/spl/balance?address=${umbraWallet.publicKey.toBase58()}&mint=${USDC_MINT_DEVNET}&cluster=devnet`).then(r => r.json()).then(d => d.balance || 0)) / 1_000_000);
    
    return signature;
}

export async function routeMagicBlockEphemeral(params = {}) {
    const { instruction, data = {} } = params;
    const action = (instruction || 'balance').toLowerCase();
    try {
        switch (action) {
            case 'deposit':
            case 'shield': return await vaultDeposit(data);
            case 'balance': return await vaultBalance();
            case 'transfer': return await vaultTransfer(data);
            case 'withdraw': return await vaultWithdraw(data);
            case 'swap': return await vaultSwap(params);
            default: return { success: false, error: 'Unknown: ' + action };
        }
    } catch (error) { return { success: false, error: error.message }; }
}

async function vaultBalance() {
    const umbraWallet = await getUmbraKeypair();
    const [umbraL1, umbraVault] = await Promise.all([
        fetch(`${MAGICBLOCK_PAYMENTS_API}/v1/spl/balance?address=${umbraWallet.publicKey.toBase58()}&mint=${USDC_MINT_DEVNET}&cluster=devnet`).then(r => r.json()),
        getSecureBalance(umbraWallet)
    ]);
    const format = (amt) => (Number(amt) / 1_000_000).toFixed(2);
    return {
        success: true,
        message: `📬 Incoming Stealth: **${format(umbraL1.balance || 0)} USDC**\n` +
                 `🔐 Shielded Vault: **${format(umbraVault)} USDC**`
    };
}

async function vaultDeposit(data) {
    const amount = data.amount ? parseFloat(data.amount) : null;
    const umbraWallet = await getUmbraKeypair();
    const connection = new Connection(SOLANA_DEVNET_RPC, 'confirmed');

    let depositAmount = amount ? Math.floor(amount * 1_000_000) : null;

    if (!depositAmount) {
        const l1 = await fetch(`${MAGICBLOCK_PAYMENTS_API}/v1/spl/balance?address=${umbraWallet.publicKey.toBase58()}&mint=${USDC_MINT_DEVNET}&cluster=devnet`).then(r => r.json());
        depositAmount = Number(l1.balance || 0);
        if (depositAmount <= 0) return { success: false, error: 'No funds in Incoming to sweep, Sir.' };
    }

    const txData = await callMagicBlockAPI('/v1/spl/deposit', {
        owner: umbraWallet.publicKey.toBase58(),
        amount: depositAmount,
        mint: USDC_MINT_DEVNET,
        cluster: 'devnet'
    });
    const transaction = Transaction.from(Buffer.from(txData.transactionBase64, 'base64'));
    const signature = await sendAndConfirmTransaction(connection, transaction, [umbraWallet]);

    lastKnownBalance = (Number(await fetch(`${MAGICBLOCK_PAYMENTS_API}/v1/spl/balance?address=${umbraWallet.publicKey.toBase58()}&mint=${USDC_MINT_DEVNET}&cluster=devnet`).then(r => r.json()).then(d => d.balance || 0)) / 1_000_000);

    const humanAmount = (Number(depositAmount) / 1_000_000).toFixed(2);
    return { success: true, message: `Shielded ${humanAmount} USDC into the vault, Sir.` };
}

async function vaultWithdraw(data) {
    const amount = parseFloat(data.amount) || 0;
    const umbraWallet = await getUmbraKeypair();
    const connection = new Connection(SOLANA_DEVNET_RPC, 'confirmed');

    await withdrawFromVault(amount, umbraWallet, connection);

    return { success: true, message: `Withdrawn ${amount} USDC from vault, Sir.` };
}

async function vaultTransfer(data) {
    const { amount, destination } = data;
    const umbraWallet = await getUmbraKeypair();
    const connection = new Connection(SOLANA_DEVNET_RPC, 'confirmed');
    const transferAmount = Math.floor(parseFloat(amount) * 1_000_000);
    const recipientPubkey = new PublicKey(destination);

    const savedName = findNameByAddress(destination);
    const displayName = savedName || destination.slice(0, 8) + '...';
    const isAlreadySaved = !!savedName;

    // STEP 1: Create token account first
    const { created } = await ensureTokenAccount(connection, umbraWallet, recipientPubkey);

    // STEP 2: Check L1 balance and withdraw from vault if needed
    const currentL1 = await fetch(`${MAGICBLOCK_PAYMENTS_API}/v1/spl/balance?address=${umbraWallet.publicKey.toBase58()}&mint=${USDC_MINT_DEVNET}&cluster=devnet`).then(r => r.json());
    const l1Balance = Number(currentL1.balance || 0);

    if (l1Balance < transferAmount) {
        const needed = transferAmount - l1Balance;
        const neededHuman = (needed / 1_000_000).toFixed(2);
        // Perform direct withdrawal first
        await withdrawFromVault(parseFloat(neededHuman), umbraWallet, connection);
        // Small delay for network confirmation
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // STEP 3: Now transfer from L1 to recipient
    console.log(chalk.gray(`   📤 Sending ${amount} USDC to ${displayName}...`));
    const sendTx = await callMagicBlockAPI('/v1/spl/transfer', {
        from: umbraWallet.publicKey.toBase58(),
        to: destination,
        amount: transferAmount,
        mint: USDC_MINT_DEVNET,
        cluster: 'devnet',
        visibility: 'public',
        fromBalance: 'base',
        toBalance: 'base'
    });
    const sendTransaction = Transaction.from(Buffer.from(sendTx.transactionBase64, 'base64'));
    const signature = await sendAndConfirmTransaction(connection, sendTransaction, [umbraWallet]);

    lastKnownBalance = (Number(await fetch(`${MAGICBLOCK_PAYMENTS_API}/v1/spl/balance?address=${umbraWallet.publicKey.toBase58()}&mint=${USDC_MINT_DEVNET}&cluster=devnet`).then(r => r.json()).then(d => d.balance || 0)) / 1_000_000);

    const parts = [];
    if (created) {
        parts.push('This address is new to me. I have created a token account for it.');
    }
    parts.push(`Sent ${amount} USDC to ${displayName}, Sir.`);

    if (!isAlreadySaved) {
        parts.push('Shall I save this address to your book, Sir?');
    }

    return {
        success: true,
        destination: isAlreadySaved ? undefined : destination,
        message: parts.join('\n')
    };
}

async function vaultSwap(params) {
    const { amount, fromToken, toToken } = params;
    const data = params.data || params;
    const amountNum = parseFloat(data.amount || amount);
    const fromTokenStr = data.fromToken || fromToken || 'USDC';
    const toTokenStr = data.toToken || toToken || 'SOL';
    const umbraWallet = await getUmbraKeypair();
    const connection = new Connection(SOLANA_DEVNET_RPC, 'confirmed');

    console.log(chalk.magenta(`   🕵️  [ALFRED] Privacy Pipeline: ${fromTokenStr} → ${toTokenStr} swap.`));

    try {
        await withdrawFromVault(amountNum, umbraWallet, connection);

        const fromMint = MAINNET_MINTS[fromTokenStr] || MAINNET_MINTS['USDC'];
        const toMint = MAINNET_MINTS[toTokenStr] || MAINNET_MINTS['SOL'];

        console.log(chalk.cyan(`   🪐 [JUPITER] Calling CLI for live mainnet quote...`));
        const quoteCmd = `jup spot quote --from ${fromMint} --to ${toMint} --amount ${amountNum} -f json`;
        console.log(chalk.gray(`   📡 Command: ${quoteCmd}`));
        const { stdout: quoteOut } = await execAsync(quoteCmd);
        const quote = JSON.parse(quoteOut);

        const outAmount = parseFloat(quote.outAmount);
        const rate = outAmount / parseFloat(quote.inAmount);

        console.log(chalk.green(`   💹 Jupiter Rate: 1 ${fromTokenStr} ≈ ${rate.toFixed(6)} ${toTokenStr}`));
        console.log(chalk.green(`   📊 Expected Output: ${outAmount.toFixed(6)} ${toTokenStr}`));

        console.log(chalk.yellow(`   ⚠️  [DEMO MODE] Mainnet liquidity required for execution. Re-shielding funds...`));
        await new Promise(resolve => setTimeout(resolve, 2500));

        console.log(chalk.cyan(`   🛡️  Re-shielding ${amountNum} ${fromTokenStr} into vault...`));
        await vaultDeposit({ amount: amountNum });
        console.log(chalk.green(`   ✅ Swap pipeline complete.`));

        return {
            success: true,
            message: `Swap pipeline complete (simulated).\n` +
                     `Rate: 1 ${fromTokenStr} ≈ ${rate.toFixed(6)} ${toTokenStr}\n` +
                     `Funds re-shielded to vault.\n` +
                     `Jupiter CLI called successfully — mainnet liquidity required for execution.`
        };
    } catch (error) {
        console.error(chalk.red(`   ❌ Swap failed: ${error.message}`));
        return { success: false, error: error.message };
    }
}

let lastKnownBalance = null;
let notificationChannel = null;

export function setNotificationChannel(channel) { notificationChannel = channel; }

export async function startAutoScanner() {
    try {
        const umbraWallet = await getUmbraKeypair();
        const l1 = await fetch(`${MAGICBLOCK_PAYMENTS_API}/v1/spl/balance?address=${umbraWallet.publicKey.toBase58()}&mint=${USDC_MINT_DEVNET}&cluster=devnet`).then(r => r.json());
        lastKnownBalance = Number(l1.balance || 0) / 1_000_000;
    } catch (e) {}

    setInterval(async () => {
        try {
            const umbraWallet = await getUmbraKeypair();
            const l1 = await fetch(`${MAGICBLOCK_PAYMENTS_API}/v1/spl/balance?address=${umbraWallet.publicKey.toBase58()}&mint=${USDC_MINT_DEVNET}&cluster=devnet`).then(r => r.json());
            const currentBalance = Number(l1.balance || 0) / 1_000_000;
            if (lastKnownBalance !== null && currentBalance > lastKnownBalance) {
                const received = (currentBalance - lastKnownBalance).toFixed(2);
                if (notificationChannel) {
                    await notificationChannel.send(`📨 Sir, you've received ${received} USDC at your Umbra stealth address.`);
                }
            }
            lastKnownBalance = currentBalance;
        } catch (e) {}
    }, 30000);
}

export async function scanPrivateActivity() { return { privateTransactions: 0 }; }
