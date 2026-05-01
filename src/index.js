import dotenv from 'dotenv';
import chalk from 'chalk';
import { startDiscordBot } from './discord.js';

dotenv.config();

console.log(chalk.green.bold('╔══════════════════════════════════════╗'));
console.log(chalk.green.bold('║         ALFRED OS ONLINE            ║'));
console.log(chalk.green.bold('║     "At your service, Sir."         ║'));
console.log(chalk.green.bold('╚══════════════════════════════════════╝\n'));
console.log(chalk.gray('   MagicBlock Vault  |  Umbra Stealth  |  Jupiter Markets'));

startDiscordBot().catch(err => {
    console.error(chalk.red('Alfred failed to start:'), err);
    process.exit(1);
});
