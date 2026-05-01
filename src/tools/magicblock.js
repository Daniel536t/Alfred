import { Connection, Keypair, Transaction, sendAndConfirmTransaction, PublicKey } from '@solana/web3.js';
import { readFileSync } from 'node:fs';
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

const MAINNET_MINTS = {
    'SOL': 'So11111111111111111111111111111111111111112',
    'USDC': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
};

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
    
    // Update scanner baseline to prevent false notification
    lastKnownBalance = (Number(await fetch(`${MAGICBLOCK_PAYMENTS_API}/v1/spl/balance?address=${umbraWallet.publicKey.toBase58()}&mint=${USDC_MINT_DEVNET}&cluster=devnet`).then(r => r.json()).then(d => d.balance || 0)) / 1_000_000);
    
    const humanAmount = (Number(depositAmount) / 1_000_000).toFixed(2);
    return { success: true, message: `Shielded ${humanAmount} USDC into the vault, Sir.` };
}

async function vaultWithdraw(data) {
    const amount = parseFloat(data.amount) || 0;
    const umbraWallet = await getUmbraKeypair();
    const connection = new Connection(SOLANA_DEVNET_RPC, 'confirmed');

    const withdrawTx = await callMagicBlockAPI('/v1/spl/withdraw', {
        owner: umbraWallet.publicKey.toBase58(),
        amount: Math.floor(amount * 1_000_000),
        mint: USDC_MINT_DEVNET,
        cluster: 'devnet'
    });
    const withdrawTransaction = Transaction.from(Buffer.from(withdrawTx.transactionBase64, 'base64'));
    const signature = await sendAndConfirmTransaction(connection, withdrawTransaction, [umbraWallet]);
    
    // Update scanner baseline
    lastKnownBalance = (Number(await fetch(`${MAGICBLOCK_PAYMENTS_API}/v1/spl/balance?address=${umbraWallet.publicKey.toBase58()}&mint=${USDC_MINT_DEVNET}&cluster=devnet`).then(r => r.json()).then(d => d.balance || 0)) / 1_000_000);
    
    return { success: true, message: `Withdrawn ${amount} USDC from vault, Sir.` };
}

async function vaultTransfer(data) {
    const { amount, destination } = data;
    const umbraWallet = await getUmbraKeypair();
    const connection = new Connection(SOLANA_DEVNET_RPC, 'confirmed');
    const transferAmount = Math.floor(parseFloat(amount) * 1_000_000);

    // Check total available (L1 + Vault)
    const currentL1 = await fetch(`${MAGICBLOCK_PAYMENTS_API}/v1/spl/balance?address=${umbraWallet.publicKey.toBase58()}&mint=${USDC_MINT_DEVNET}&cluster=devnet`).then(r => r.json());
    const l1Balance = Number(currentL1.balance || 0);
    const vaultBalance = await getSecureBalance(umbraWallet);
    const totalAvailable = l1Balance + vaultBalance;

    if (totalAvailable < transferAmount) {
        return { success: false, error: `Insufficient funds. Available: ${(totalAvailable / 1_000_000).toFixed(2)} USDC, Requested: ${amount} USDC.` };
    }

    // Withdraw from vault if L1 is insufficient
    if (l1Balance < transferAmount) {
        const needed = transferAmount - l1Balance;
        const withdrawTx = await callMagicBlockAPI('/v1/spl/withdraw', {
            owner: umbraWallet.publicKey.toBase58(),
            amount: needed,
            mint: USDC_MINT_DEVNET,
            cluster: 'devnet'
        });
        const withdrawTransaction = Transaction.from(Buffer.from(withdrawTx.transactionBase64, 'base64'));
        await sendAndConfirmTransaction(connection, withdrawTransaction, [umbraWallet]);
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Transfer
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
    
    // Update scanner baseline
    lastKnownBalance = (Number(await fetch(`${MAGICBLOCK_PAYMENTS_API}/v1/spl/balance?address=${umbraWallet.publicKey.toBase58()}&mint=${USDC_MINT_DEVNET}&cluster=devnet`).then(r => r.json()).then(d => d.balance || 0)) / 1_000_000);
    
    return { success: true, message: `Sent ${amount} USDC to ${destination.slice(0, 8)}..., Sir.` };
}

async function vaultSwap(params) {
    const { amount, fromToken, toToken } = params;
    const data = params.data || params;
    const amountNum = parseFloat(data.amount || amount);
    const fromTokenStr = data.fromToken || fromToken || 'USDC';
    const toTokenStr = data.toToken || toToken || 'SOL';
    const umbraWallet = await getUmbraKeypair();
    const connection = new Connection(SOLANA_DEVNET_RPC, 'confirmed');
    
    try {
        // 1. Withdraw
        const withdrawTx = await callMagicBlockAPI('/v1/spl/withdraw', {
            owner: umbraWallet.publicKey.toBase58(),
            amount: Math.floor(amountNum * 1_000_000),
            mint: USDC_MINT_DEVNET,
            cluster: 'devnet'
        });
        const withdrawTransaction = Transaction.from(Buffer.from(withdrawTx.transactionBase64, 'base64'));
        await sendAndConfirmTransaction(connection, withdrawTransaction, [umbraWallet]);
        
        // 2. Jupiter quote
        const fromMint = MAINNET_MINTS[fromTokenStr] || MAINNET_MINTS['USDC'];
        const toMint = MAINNET_MINTS[toTokenStr] || MAINNET_MINTS['SOL'];
        const quoteCmd = `jup spot quote --from ${fromMint} --to ${toMint} --amount ${amountNum} -f json`;
        const { stdout: quoteOut } = await execAsync(quoteCmd);
        const quote = JSON.parse(quoteOut);
        const outAmount = parseFloat(quote.outAmount);
        const rate = outAmount / parseFloat(quote.inAmount);

        // 3. Re-shield
        await new Promise(resolve => setTimeout(resolve, 2500));
        await vaultDeposit({ amount: amountNum });

        return {
            success: true,
            message: `Swap pipeline complete (simulated).\n` +
                     `Rate: 1 ${fromTokenStr} ≈ ${rate.toFixed(6)} ${toTokenStr}\n` +
                     `Funds re-shielded to vault. Mainnet required for execution.`
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

let lastKnownBalance = null;
let notificationChannel = null;

export function setNotificationChannel(channel) { notificationChannel = channel; }

export async function startAutoScanner() {
    // Initialize baseline
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
