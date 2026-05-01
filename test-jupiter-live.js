import dotenv from 'dotenv';
dotenv.config();

import { executeJupiterSwap } from './src/tools/jupiter.js';

async function test() {
    console.log('🚀 Testing LIVE Jupiter Swap (0.01 SOL → USDC)...\n');
    
    try {
        const result = await executeJupiterSwap({
            fromToken: 'SOL',
            toToken: 'USDC',
            amount: 0.01,
            slippage: 100,
            dryRun: false
        });
        
        console.log('\n✅ LIVE SWAP COMPLETED!');
        console.log(`TxID: ${result.txid}`);
        console.log(`Input: ${result.inputAmount} ${result.inputToken} ($${result.inputUsdValue})`);
        console.log(`Output: ${result.outputAmount} ${result.outputToken} ($${result.outputUsdValue})`);
        console.log(`View: https://solscan.io/tx/${result.txid}?cluster=devnet`);
    } catch (error) {
        console.error('\n❌ Swap failed:', error.message);
    }
}

test();
