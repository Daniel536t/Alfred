# AlfredOS


AlfredOS is a privacy-first AI agent that manages a shielded Solana vault through natural conversation. Built on MagicBlock, Umbra, and Jupiter. Controlled through Discord.

---

## The Problem: The Glass House Paradox

Solana is the fastest L1 in the world. But its radical transparency has become its greatest liability for professional use.

Every time a founder pays a contractor, every time a trader executes a strategy, every time someone sends money to a friend—they broadcast their entire financial history, net worth, and future intent to MEV bots and public surveillance tools. Your wallet is a glass house. Everyone can see inside.

Existing privacy tools are often "all-or-nothing" mixers that invite regulatory scrutiny. There is a massive need for **confidentiality**—hiding amounts and identities while remaining auditable—rather than pure anonymity.

AlfredOS solves this. Your balances are shielded. Your transfers are unlinkable. But you can still generate a viewing key for an auditor if needed. Privacy with accountability.

---

## Who This Is For

- **Solana professionals** — Founders, developers, and contractors who want to receive salary without their neighbors knowing exactly how much SOL they hold
- **DAO treasurers** — Managers who need to move capital or execute governance-approved swaps without being front-run by MEV bots
- **Privacy-conscious users** — Anyone who believes their financial activity shouldn't be a permanent, searchable public record

---

## Use Cases

- **Stealth payroll** — A company pays 50 employees. The company's main wallet isn't publicly linked to 50 individual wallets. Each employee receives funds through a unique stealth address that cannot be traced back to the employer.
- **Strategy shielding** — A trader wants to swap a large position into USDC. Alfred routes the execution through MagicBlock's shielded infrastructure. The trade isn't visible on the public mempool, preventing sandwich attacks.
- **Ambient financial management** — You tell Alfred, "Keep 20% of my portfolio in stables." Alfred rebalances privately in the background. Your portfolio strategy isn't public alpha for competitors to copy.

---

## Why This is important in 2026

1. **Regulatory harmony** — By using Umbra's viewing key architecture, AlfredOS allows voluntary disclosure. You are private to the public, but you can generate a viewing key for an auditor. This is the "bank vault" model—the only approach that survives the current regulatory environment.

2. **MEV defiance** — MEV on Solana has grown into a massive industry. Retail users pay a "transparency tax" on every transaction. AlfredOS eliminates this by moving execution into shielded infrastructure where front-runners can't see your orders.

3. **The AI shift** — We are moving from wallets to agents. An agent that can't act privately is a liability. AlfredOS gives an AI agent a shroud, making it a viable tool for serious financial work.

---

## How It Works

| Layer | Protocol | What It Does |
|-------|----------|--------------|
| **Storage** | MagicBlock Private Payments API | Shields USDC balances inside a protected vault. Solscan shows zero. |
| **Identity** | Umbra SDK | Generates signature-derived stealth addresses. Senders see a one-time address, not your wallet. |
| **Intelligence** | Jupiter CLI | Live price feeds and swap simulation via natural language commands. |
| **Interface** | Discord bot (Node.js) | Conversation-driven. Alfred confirms before any funds move. |

### How the L1 Works in Our Architecture

Your Umbra stealth address is a real Solana account on Layer 1. It holds USDC that anyone can send to. This is the "incoming" layer—funds arrive here, visible to you but unlinkable to your main wallet.

When you tell Alfred to shield funds, here's what actually happens:

1. **L1 holds the funds** — USDC sits at your Umbra stealth address, visible to you through Alfred's scanning
2. **Alfred calls MagicBlock's deposit API** — This moves USDC from the L1 stealth address into the shielded vault
3. **The vault is invisible** — Once shielded, the USDC is no longer visible on Solscan. Your L1 balance drops. The shielded vault increases.
4. **Transfers pull from L1 first** — When you send USDC to someone, Alfred checks if the L1 has enough. If not, he withdraws exactly what's needed from the vault to L1, then sends from L1 to the recipient.

The L1 is the bridge. Funds arrive through it. Funds leave through it. The vault is the destination—where money sits invisible to the public. This split lets Alfred manage your privacy while keeping transactions verifiable to you.

### Umbra Integration

AlfredOS uses Umbra's deterministic key derivation to generate stealth addresses from your wallet's signature. Here's exactly how:

1. Alfred loads your Solana wallet
2. He signs a fixed message: `"Sign to access your Umbra Privacy Vault"`
3. The signature is hashed with SHA-256 to create a 32-byte seed
4. That seed generates a new Solana keypair—your Umbra stealth keypair
5. The public key of that keypair is your stealth address

When someone sends USDC to that address, only your viewing key can detect it. The sender never sees your main wallet. The public blockchain sees a transfer to an address with no history and no link to you.

We use:
- `@umbra-privacy/sdk` for the core stealth address logic
- `@solana/spl-token` for balance scanning on the L1
- `nacl` for the signature-based key derivation

The Umbra devnet program ID used: `DSuKkyqGVGgo4QtPABfxKJKygUDACbUhirnuv63mEpAJ`

### MagicBlock Integration

Four confirmed on-chain transactions on devnet prove the vault works:
- Deposits that move USDC from L1 into the shielded vault
- Withdrawals that pull funds back from the vault to L1
- Private transfers that send USDC from L1 to external wallets

The vault balance query requires cryptographic authentication—Alfred signs a message with your keypair to prove ownership before MagicBlock returns the shielded balance.

Read our detailed findings:
- [MagicBlock DX Report](MAGICBLOCK-DX.md)
- [Jupiter DX Report](JUPITER-DX-REPORT.md)

---

## Full Setup Guide

This is not a "clone and run" project. You need to configure several services before Alfred comes online. Here's every step.

### Prerequisites

- **Node.js v18+**
- **Solana CLI** installed and configured for devnet
- **A funded Solana wallet** (devnet SOL for testing)
- **A Discord server** where you have admin permissions
- **NVIDIA API key** (free tier works)
- **Jupiter API key** (free from developers.jup.ag)

### Step 1: Clone and Install

```bash
git clone https://github.com/Daniel536t/Alfred.git
cd Alfred
npm install
```

Step 2: Install Jupiter CLI

```bash
npm i -g @jup-ag/cli
jup config set --api-key YOUR_JUPITER_KEY
jup config set --output json
jup keys add alfred --file ~/path-to-your-keypair.json
jup keys use alfred
```

Step 3: Set Up Environment

```bash
cp .env.example .env
```

Edit .env with your actual values:

```env
DISCORD_BOT_TOKEN=your_discord_bot_token
NVIDIA_API_KEY=your_nvidia_api_key
SOLANA_KEYPAIR_PATH=/home/ubuntu/dev-wallet.json
```

Step 4: Create a Discord Bot

1. Go to Discord Developer Portal
2. Click New Application → name it "AlfredOS"
3. Go to Bot → Add Bot
4. Under Privileged Gateway Intents, enable:
   · ✅ Message Content Intent
   · ✅ Server Members Intent
   · ✅ Presence Intent
5. Go to OAuth2 → URL Generator
6. Under Scopes, check: ✅ bot
7. Under Bot Permissions, check:
   · ✅ Send Messages
   · ✅ Read Messages/View Channels
   · ✅ Read Message History
8. Copy the generated URL and paste it in a new browser tab
9. Invite the bot to your own Discord server (you must be the server owner or have admin permissions)
10. Go back to Bot → click Reset Token → copy the token
11. Add it to your .env file as DISCORD_BOT_TOKEN

Step 5: Get an NVIDIA API Key

1. Go to build.nvidia.com
2. Sign up or log in
3. Navigate to API Keys
4. Generate a new key
5. Add it to your .env file as NVIDIA_API_KEY

Step 6: Get a Jupiter API Key

1. Go to developers.jup.ag
2. Sign up and create a new API key
3. Use it in Step 2 when configuring the Jupiter CLI

Step 7: Fund Your Wallet

For testing on devnet:

```bash
solana airdrop 2 --url devnet
```

For the devnet USDC we used, visit a Solana faucet that supports the mint Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr and request test USDC.

Step 8: Start Alfred

```bash
npm start
```

Alfred will appear online in your Discord server's #general channel. Type info to see what he can do.

---

Commands

What You Say What Alfred Does
vault balance Shows your shielded vault and incoming stealth balances
shield 50 USDC Moves 50 USDC from L1 into the shielded vault
shield Sweeps ALL USDC from L1 into the vault
withdraw 20 USDC Pulls 20 USDC from the vault to L1
send 50 USDC to Daniel Transfers 50 USDC to a saved contact
send 50 USDC to 7JVd... Transfers 50 USDC to any Solana address
vault swap 10 USDC to SOL Simulates a swap with live Jupiter pricing
market overview Shows live prices for 9 tokens
SOL price Shows live SOL/USDC price
generate address Returns your Umbra stealth address
scan for payments Checks for incoming funds at your Umbra address
save 7JVd... as Daniel Saves an address to your address book
address book Lists all saved contacts
info Lists all available commands
nuke Clears all channel messages

---

Built With

· Solana Web3.js — Blockchain interaction
· Discord.js — Conversational interface
· NVIDIA NIM — AI model (Qwen 3.5 122B)
· MagicBlock Private Payments API — Shielded vault
· Umbra SDK — Stealth addresses
· Jupiter CLI — Market data and swap simulation

---

Built on Solana during the Colosseum Frontier Hackathon.
