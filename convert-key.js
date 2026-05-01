import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

const keyArray = [156,241,150,82,12,238,41,160,55,161,254,187,13,221,213,111,11,118,82,70,63,201,91,63,8,189,46,67,137,121,200,106,199,119,193,121,111,97,115,86,31,214,127,23,173,70,242,84,222,219,86,5,42,179,76,93,84,93,71,11,207,37,64,207];

const keypair = Keypair.fromSecretKey(new Uint8Array(keyArray));
const privateKeyBase58 = bs58.encode(keypair.secretKey);

console.log('Public Key:', keypair.publicKey.toBase58());
console.log('Private Key (Base58):', privateKeyBase58);
