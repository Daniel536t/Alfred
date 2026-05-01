import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import nacl from 'tweetnacl';
import chalk from 'chalk';

const SOLANA_DEVNET_RPC = 'https://api.devnet.solana.com';
// YOUR actual USDC mint—where your 1,985 USDC lives
const USDC_MINT_YOURS = 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr';

async function getUmbraKeypair() {
    const keypairPath = process.env.SOLANA_KEYPAIR_PATH || `${process.env.HOME}/dev-wallet.json`;
    const secretKey = Buffer.from(JSON.parse(readFileSync(keypairPath, 'utf-8')));
    const mainWallet = Keypair.fromSecretKey(secretKey);

    const message = new TextEncoder().encode("Sign to access your Umbra Privacy Vault");
    const signature = nacl.sign.detached(message, mainWallet.secretKey);
    const seed = createHash('sha256').update(signature).digest();
    return Keypair.fromSeed(seed.slice(0, 32));
}

export async function sendUmbraStealth(params = {}) {
    const data = params.data || params;
    const instruction = data.instruction || params.instruction || 'generate-address';

    try {
        const umbraKeys = await getUmbraKeypair();

        switch (instruction.toLowerCase()) {
            case 'generate-address': {
                const shieldedAddress = umbraKeys.publicKey.toBase58();
                console.log(chalk.green('   📬 Shielded Address (Signature-Derived)'));
                console.log(chalk.cyan('   ' + shieldedAddress));
                return {
                    success: true,
                    shieldedAddress,
                    message: '📬 Your private Umbra address: **' + shieldedAddress + '**'
                };
            }
            
            case 'scan': {
                const connection = new Connection(SOLANA_DEVNET_RPC, 'confirmed');
                const mint = new PublicKey(data.mint || USDC_MINT_YOURS);
                
                const tokenAccount = await getAssociatedTokenAddress(mint, umbraKeys.publicKey);
                
                try {
                    const accountInfo = await getAccount(connection, tokenAccount);
                    const balance = Number(accountInfo.amount) / 1_000_000;
                    console.log(chalk.green('   📨 Found ' + balance + ' USDC in Umbra address'));
                    return {
                        success: true,
                        found: true,
                        amount: balance,
                        message: '📨 Found **' + balance + ' USDC** in your Umbra address. Sweep with: vault deposit ' + balance
                    };
                } catch (e) {
                    console.log(chalk.gray('   📭 No USDC at Umbra address. Checking main wallet...'));
                    
                    // Fallback: also check main wallet
                    const mainTokenAccount = await getAssociatedTokenAddress(mint, new PublicKey('ERe3aYhzXeUmjucMcMSMMGKZK5X6mkfNdrdUohZwssok'));
                    try {
                        const mainAccountInfo = await getAccount(connection, mainTokenAccount);
                        const mainBalance = Number(mainAccountInfo.amount) / 1_000_000;
                        console.log(chalk.green('   📨 Found ' + mainBalance + ' USDC in main wallet'));
                        return {
                            success: true,
                            found: true,
                            amount: mainBalance,
                            source: 'main wallet',
                            message: '📨 Found **' + mainBalance + ' USDC** in your main wallet. Shield with: vault deposit ' + mainBalance
                        };
                    } catch (e2) {
                        return { success: true, found: false, message: '📭 No USDC found in Umbra address or main wallet.' };
                    }
                }
            }
            
            default:
                return { success: true, message: 'Umbra acknowledged.' };
        }
    } catch (error) {
        console.error(chalk.red('   [UMBRA] Failed: ' + error.message));
        return { success: false, error: error.message };
    }
}
