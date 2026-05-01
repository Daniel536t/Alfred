import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import chalk from 'chalk';

const execAsync = promisify(exec);

const MAINNET_MINTS = {
    'SOL': 'So11111111111111111111111111111111111111112',
    'USDC': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    'USDT': 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    'BONK': 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    'JUP': 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
    'PYTH': 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3',
    'JTO': 'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL',
    'WIF': 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
    'RNDR': 'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof',
    'HNT': 'hntyVP6YFm1Hg25TN9WGLqM12b8TQmckQKrBSxJdEnT',
};

function resolveMint(token) {
    return MAINNET_MINTS[token.toUpperCase()] || token;
}

function formatPrice(price) {
    if (price >= 1) return '$' + price.toFixed(2);
    if (price >= 0.01) return '$' + price.toFixed(4);
    if (price >= 0.0001) return '$' + price.toFixed(6);
    if (price >= 0.000001) return '$' + price.toFixed(8);
    // For micro-cap tokens like BONK, show 10 decimal places
    return '$' + price.toFixed(10);
}

export async function executeJupiterSwap(params) {
    const instruction = params.instruction || 'swap';
    const data = params.data || params;

    switch (instruction.toLowerCase()) {
        case 'price':
            return await getJupiterPrice(data.token || 'SOL');
        case 'market':
        case 'overview':
        case 'feed':
            return await getMarketOverview(data.tokens || null);
        case 'swap':
        default:
            return await swap(data);
    }
}

async function swap(params) {
    const fromToken = params.fromToken || 'USDC';
    const toToken = params.toToken || 'SOL';
    const amount = params.amount || 1;
    const fromMint = resolveMint(fromToken);
    const toMint = resolveMint(toToken);

    console.log(chalk.cyan(`   🪐 [JUPITER] Quote: ${amount} ${fromToken} → ${toToken}`));

    try {
        const quoteCmd = `jup spot quote --from ${fromMint} --to ${toMint} --amount ${amount} -f json`;
        const { stdout: quoteOut } = await execAsync(quoteCmd);
        const quote = JSON.parse(quoteOut);

        const outAmount = parseFloat(quote.outAmount);
        const rate = outAmount / parseFloat(quote.inAmount);

        console.log(chalk.green(`   💹 Rate: 1 ${fromToken} ≈ ${rate.toFixed(6)} ${toToken}`));
        console.log(chalk.green(`   📊 Expected: ${outAmount.toFixed(6)} ${toToken}`));

        return {
            success: true,
            simulation: true,
            inputAmount: amount,
            inputToken: fromToken,
            expectedOutput: outAmount.toFixed(6),
            outputToken: toToken,
            exchangeRate: rate.toFixed(6),
            message: `✅ **${amount} ${fromToken}** → ≈ **${outAmount.toFixed(6)} ${toToken}** (Rate: ${rate.toFixed(6)})`
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function getJupiterPrice(token = 'SOL') {
    try {
        const mint = resolveMint(token);
        const amount = token === 'SOL' ? 10 : 1000;
        const cmd = `jup spot quote --from ${mint} --to ${MAINNET_MINTS['USDC']} --amount ${amount} -f json`;
        const { stdout } = await execAsync(cmd);
        const quote = JSON.parse(stdout);
        const price = parseFloat(quote.outAmount) / parseFloat(quote.inAmount);
        const formattedPrice = formatPrice(price);
        
        console.log(chalk.cyan(`   💵 ${token}: ${formattedPrice} USDC`));
        return {
            success: true,
            token,
            price,
            message: `💵 **${token}**: ${formattedPrice} USDC`
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function getMarketOverview(customTokens = null) {
    const tokens = customTokens || ['SOL', 'JUP', 'BONK', 'JTO', 'WIF', 'RNDR', 'HNT', 'PYTH', 'USDC'];
    try {
        const prices = [];
        for (const token of tokens) {
            try {
                const mint = resolveMint(token);
                const amount = token === 'SOL' ? 10 : 1000;
                const cmd = `jup spot quote --from ${mint} --to ${MAINNET_MINTS['USDC']} --amount ${amount} -f json`;
                const { stdout } = await execAsync(cmd);
                const quote = JSON.parse(stdout);
                const price = parseFloat(quote.outAmount) / parseFloat(quote.inAmount);
                prices.push({ token, price });
            } catch (e) {
                prices.push({ token, price: null });
            }
        }
        
        const lines = prices
            .filter(p => p.price !== null)
            .map(p => `**${p.token}**: ${formatPrice(p.price)}`);
        
        console.log(chalk.cyan('   📊 Market Overview:'));
        lines.forEach(l => console.log(chalk.gray('   ' + l)));
        
        return {
            success: true,
            prices,
            message: '📊 **Market Overview:**\n' + lines.join('\n')
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}
