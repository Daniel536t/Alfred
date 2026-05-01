import { Keypair } from '@solana/web3.js';
import nacl from 'tweetnacl';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const keypairPath = process.env.HOME + '/dev-wallet.json';
const secretKey = Buffer.from(JSON.parse(readFileSync(keypairPath, 'utf-8')));
const mainWallet = Keypair.fromSecretKey(secretKey);
const message = new TextEncoder().encode('Sign to access your Umbra Privacy Vault');
const signature = nacl.sign.detached(message, mainWallet.secretKey);
const seed = createHash('sha256').update(signature).digest();
const umbraWallet = Keypair.fromSeed(seed.slice(0, 32));

const msg = new TextEncoder().encode(umbraWallet.publicKey.toBase58());
const authSignature = nacl.sign.detached(msg, umbraWallet.secretKey);
const authBase64 = Buffer.from(authSignature).toString('base64');

console.log('Address:', umbraWallet.publicKey.toBase58());
console.log('Auth:', authBase64);
