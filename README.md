# AlfredOS

**Say what you want. It happens—privately.**

Today, sending crypto requires understanding wallets, addresses, and networks. With AlfredOS, you don't need to understand any of it. You just say what you want—and it happens privately.

AlfredOS is an ambient financial hypervisor for Discord. It turns natural language into private on-chain execution. In practice, it's a Discord bot that securely routes and executes transactions on your behalf—without custody.

---

## TL;DR (for builders)

- Chat-native interface for on-chain actions (Discord bot)
- Non-custodial: keys never leave the user's machine
- Privacy layer:
  - Umbra → stealth addresses (identity privacy)
  - MagicBlock → TEE vault (balance + execution privacy)
- Execution layer:
  - Solana → fast settlement
  - Jupiter → pricing + routing
- Safety:
  - Explicit "proceed" confirmation required for all transactions

---

## Try It (Devnet Demo)

1. Set up the bot (see Setup below)
2. Fund a devnet wallet
3. In Discord, type:
   - `vault balance`
   - `generate address`
   - `send 1 USDC to <address>`
4. Confirm with `proceed`

Observe:
- No new activity on the recipient's public address in block explorers
- Funds appear and are spendable in the recipient's wallet

---

## Design Principles

- **Non-custodial by default** — users retain full control of keys
- **Privacy as a baseline** — not an add-on feature
- **Intent over interfaces** — users say what they want, not how to execute it
- **Composable architecture** — each layer can evolve independently

---

## The Problem: The Glass House Paradox

Solana's radical transparency has become its greatest liability for professional use.

Every time a founder pays a contractor, every time a trader executes a strategy, every time someone sends money to a friend—they broadcast their entire financial history, net worth, and future intent to MEV bots and public surveillance tools. Your wallet is a glass house. Everyone can see inside.

Existing privacy tools are often "all-or-nothing" mixers that invite regulatory scrutiny. There is a massive need for **confidentiality**—hiding amounts and identities while remaining auditable—rather than pure anonymity.

AlfredOS solves this. Your balances are shielded. Your transfers are unlinkable. But you can still generate a viewing key for an auditor if needed. Privacy with accountability.

---

## Why Discord?

The vast majority of Web3 coordination—DAOs, trading groups, developer guilds, hackathon teams—happens inside Discord. But Discord has a problem they cannot solve. In 2021, their CEO tried to integrate a wallet. The gaming community revolted. Within 48 hours, they backed down permanently. Discord is politically paralyzed from building financial infrastructure.

That leaves millions of users forced to leave the platform just to execute a simple transfer, exposing their entire financial history on public block explorers every time they do.

AlfredOS fills the gap Discord cannot address. It is not a wallet. You never paste a seed phrase into a chat. No browser extensions. No new accounts. No platform risk for Discord. Instead, Alfred acts as a secure, non-custodial routing engine directly inside your existing Discord server. He cannot touch your funds. He only orchestrates them with your explicit permission.

The biggest fintech companies of the last decade won by embedding payments where users already spent their time: Venmo in text messaging, Cash App in Twitter, WeChat Pay in China's chat infrastructure. Web3's chat app is Discord. AlfredOS is the payment layer Discord never built—and now cannot build.

---

## Built on Solana

AlfredOS is built on Solana, a high-performance blockchain optimized for low latency and low fees. Two key advantages of Solana's architecture made this possible:

1. **Low-latency execution** — near-instant user feedback, with fast on-chain settlement. When Alfred executes a transfer through MagicBlock's Ephemeral Rollup, the user experience feels immediate. On other chains, privacy protocols struggle with latency. On Solana, they feel instant.

2. **Composable SPL tokens** — Umbra's stealth addresses and MagicBlock's shielded vault both operate on standard Solana SPL tokens. USDC on Solana is native. No wrapping. No bridging. The privacy stack works with the same assets developers already use.

Every demo shown here runs on **Solana devnet**, using devnet patterns that simulate mainnet privacy guarantees. In production, the same code deploys to mainnet with real hardware-level encryption via Intel TDX.

---

## How It Works

| Layer | Protocol | What It Does |
|-------|----------|--------------|
| **Base** | Solana | Low-latency execution, native SPL token composability |
| **Storage** | MagicBlock Private Payments API | Shields USDC balances inside a TEE-protected vault. No corresponding public balance is visible on standard explorers (e.g., Solscan). |
| **Identity** | Umbra SDK | Generates signature-derived stealth addresses. Senders see a one-time address, not your wallet. |
| **Intelligence** | Jupiter CLI | Live price feeds and swap simulation via natural language commands. |
| **Interface** | Discord bot (Node.js) | Conversation-driven. Alfred confirms before any funds move. |

### Privacy Architecture

When you tell Alfred to shield funds:

1. **L1 holds the funds** — USDC sits at your Umbra stealth address, visible to you through Alfred's scanning
2. **Alfred calls MagicBlock's deposit API** — This moves USDC from the L1 stealth address into the shielded vault
3. **The vault is invisible** — Once shielded, the USDC is no longer visible on Solscan. Your L1 balance drops. The shielded vault increases.
4. **Transfers pull from L1 first** — When you send USDC to someone, Alfred checks if the L1 has enough. If not, he withdraws exactly what's needed from the vault to L1, then sends from L1 to the recipient.

The L1 is the bridge. Funds arrive through it. Funds leave through it. The vault is the destination—where money sits invisible to the public.

### Umbra Integration

AlfredOS uses Umbra's deterministic key derivation to generate stealth addresses from your wallet's signature:

1. Alfred loads your Solana wallet
2. He signs a fixed message: `"Sign to access your Umbra Privacy Vault"`
3. The signature is hashed with SHA-256 to create a 32-byte seed
4. That seed generates a new Solana keypair—your Umbra stealth keypair
5. The public key of that keypair is your stealth address

When someone sends USDC to that address, only your viewing key can detect it. The sender never sees your main wallet. The blockchain records the transaction, but not the relationship between sender and receiver.

The Umbra devnet program ID used: `DSuKkyqGVGgo4QtPABfxKJKygUDACbUhirnuv63mEpAJ`

### MagicBlock Integration

Four confirmed on-chain transactions on Solana devnet prove the vault works:
- Deposits that move USDC from L1 into the shielded vault
- Withdrawals that pull funds back from the vault to L1
- Private transfers that send USDC from L1 to external wallets

The vault balance query requires cryptographic authentication—Alfred signs a message with your keypair to prove ownership before MagicBlock returns the shielded balance.

---

## Proof of Privacy (Devnet Demo)

- **Public explorer (Solscan):** No new activity on the recipient's public address
- **Wallet (Phantom):** Funds received and spendable
- **Interpretation:** The blockchain records the transaction, but not the relationship between sender and receiver

Thanks to Umbra's stealth addresses and MagicBlock's TEE shielding, the transfer occurred without public linkage between sender and receiver. In this demo, we use devnet patterns that simulate mainnet privacy.

---

## Security & Transparency

### What Alfred Cannot Do

Alfred cannot move funds without your explicit verbal confirmation. Every financial transaction requires you to type "proceed." The AI proposes. You dispose.

Alfred does not transmit or store your private keys. Keys remain on your local machine and are used only for local signing. If your Discord account is compromised, your funds are not.

Alfred relies on an LLM, which carries hallucination risk. That's exactly why every financial action requires your verbal confirmation before anything moves.

### Current Limitations (Hackathon Demo)

This is a hackathon demo built on Solana devnet. It simulates mainnet privacy patterns.

| Limitation | Production Plan |
|------------|-----------------|
| Devnet simulation | Mainnet deployment with live TEE |
| Local key storage | MPC or hardware security modules |
| No compliance hooks | MSB/AML integrations, narrow delegations |
| LLM hallucination risk | Verbal confirmation guardrails (already in place) |
| Single Discord server | Multi-server, cross-platform support |

In a real deployment, we would add formal security audits, mobile support, and compliance hooks. We understand the hurdles. We're not hiding from them.

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

## Why This Is Important in 2026

1. **Regulatory harmony** — By using Umbra's viewing key architecture, AlfredOS allows voluntary disclosure. You are private to the public, but you can generate a viewing key for an auditor. This is the "bank vault" model—the only approach that survives the current regulatory environment.

2. **MEV defiance** — MEV on Solana has grown into a massive industry. Retail users pay a "transparency tax" on every transaction. AlfredOS eliminates this by moving execution into shielded infrastructure where front-runners can't see your orders.

3. **The AI shift** — We are moving from wallets to agents. An agent that can't act privately is a liability. AlfredOS gives an AI agent a shroud, making it a viable tool for serious financial work.

---

## Full Setup Guide

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
4. Under Privileged Gateway Intents, enable: Message Content Intent, Server Members Intent, Presence Intent
5. Go to OAuth2 → URL Generator. Under Scopes, check bot. Under Bot Permissions, check Send Messages, Read Messages/View Channels, Read Message History
6. Copy the generated URL, paste in a new browser tab, invite the bot to your server
7. Go back to Bot → Reset Token → copy the token
8. Add it to your .env file as DISCORD_BOT_TOKEN

Step 5: Get an NVIDIA API Key

1. Go to build.nvidia.com
2. Sign up or log in, navigate to API Keys, generate a new key
3. Add it to your .env file as NVIDIA_API_KEY

Step 6: Get a Jupiter API Key

1. Go to developers.jup.ag
2. Sign up and create a new API key
3. Use it in Step 2 when configuring the Jupiter CLI

Step 7: Fund Your Wallet

```bash
solana airdrop 2 --url devnet
```

For devnet USDC, visit a Solana faucet that supports the mint Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr and request test USDC.

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

· Solana — Low-latency execution and native SPL token composability
· Solana Web3.js — Blockchain interaction
· Discord.js — Conversational interface
· NVIDIA NIM — AI model (Qwen 3.5 122B)
· MagicBlock Private Payments API — Shielded vault via TEE
· Umbra SDK — Stealth addresses for private receiving
· Jupiter CLI — Market data and swap simulation

---

Say what you want. It happens—privately.

Built on Solana during the Colosseum Frontier Hackathon.
