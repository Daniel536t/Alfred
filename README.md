# AlfredOS

**Say what you want. It happens—privately.**

Today, sending crypto requires understanding wallets, addresses, and networks. With AlfredOS, you don't need to understand any of it. You just say what you want—and it happens privately.

AlfredOS is an ambient financial hypervisor for Discord. It turns natural language into private on-chain execution. In practice, it's a Discord bot that securely routes and executes transactions on your behalf—without custody.

---

## What AlfredOS Is Not

- **Not a wallet** — You never paste a seed phrase into a chat. No browser extensions. No new accounts.
- **Not a Discord integration** — Discord doesn't have to approve anything. They don't host it. They don't touch the money. Alfred is just a bot in a server, like any other.
- **Not a platform dependency** — This pattern works on Slack, Telegram, or any chat platform where communities already gather. Discord is where Web3 lives today. Tomorrow it could be anywhere.

---

## What AlfredOS Gives Users

- **Privacy by default** — Your balances are shielded. Your transfers are unlinkable. No public explorer shows your activity.
- **Verbal confirmation for every action** — Alfred proposes. You dispose. Nothing moves without your explicit "proceed."
- **No technical knowledge required** — You don't need to understand wallets, addresses, or networks. You just say what you want.
- **Works with your existing wallet** — Export your private key once. Alfred handles the rest. Your keys never leave your machine.

---

## What AlfredOS Gives Communities

Entire DAOs, trading groups, and developer guilds can route payments, execute swaps, and manage treasuries privately—directly inside the chat platforms they already use. No new app to install. No new workflow to learn. Just conversation.

---

## TL;DR (for builders)

- Chat-native interface for on-chain actions
- Non-custodial: keys never leave the user's machine
- Platform-agnostic: Discord today, Slack and Telegram tomorrow
- Privacy layer:
  - Umbra → stealth addresses (identity privacy)
  - MagicBlock → TEE vault (balance + execution privacy)
- Execution layer:
  - Solana → fast settlement
  - Jupiter → pricing + routing
- Safety:
  - Explicit "proceed" confirmation required for all transactions
- AI provider: tested with NVIDIA Qwen 3.5 122B. Swappable to any OpenAI-compatible API.

---

## Try It (Devnet Demo)

1. Set up the bot (see Setup below)
2. Fund a devnet wallet (see Step 3)
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
- **Platform-agnostic architecture** — each layer can run on any chat platform

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

Discord doesn't have to do anything. They don't build a wallet. They don't approve an integration. They don't touch the money. Alfred is just a bot in a server—like any other bot. Users get private financial infrastructure without Discord having to move a muscle.

And this pattern doesn't stop at Discord. It works on Slack. It works on Telegram. It works on any platform where communities already gather. Web3's coordination layer can finally become its payment layer—without waiting for platform permission.

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
| **Contacts** | Address Book | Saves recipient addresses by name. Resolves names to addresses for quick sending. Auto-prompts to save after each transfer. Supports save, delete, and list operations. |
| **Intelligence** | Jupiter CLI | Live price feeds and swap simulation via natural language commands. |
| **Interface** | Discord bot (Node.js) | Conversation-driven. Alfred confirms before any funds move. |

---

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

### Address Book Integration

AlfredOS includes a persistent address book that stores recipient addresses by name. The address book:

- **Saves contacts** — After any transfer to a new address, Alfred asks "Shall I save this address to your book, Sir?" The user can reply "Yes, save as Bruce" to store the address.
- **Resolves names** — When the user says "send 10 USDC to Bruce," the router looks up "Bruce" in the address book and replaces it with the actual Solana address before calling MagicBlock.
- **Validates addresses** — Names are cleaned of accidental punctuation (periods, commas) before saving. Solana addresses are validated to ensure they're real public keys.
- **Supports deletion** — Users can say "delete Bruce" or "remove Bruce" to remove a contact.
- **Persists across restarts** — The address book is stored as a JSON file on the server (`~/.alfred-addressbook.json`).
- **Shows address previews** — When listing contacts, addresses are truncated for privacy (e.g., `7JVdFkPm...`).

The address book eliminates the need to copy-paste long Solana addresses for repeat recipients. It's the social layer that makes Alfred feel like a personal assistant, not a command-line tool.

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
- **Literally anyone** — There's no technical tutorial required. You talk. Alfred executes. That's it.

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
- **An API key** from NVIDIA, Grok, Gemini, or any OpenAI-compatible AI provider
- **Jupiter API key** (free from developers.jup.ag)

### Step 1: Clone and Install

```bash
git clone https://github.com/Daniel536t/Alfred.git
cd Alfred
npm install
```

### Step 2: Create Your Dev Wallet

Alfred needs a Solana wallet to sign transactions. Create a fresh one for devnet testing:

```bash
solana-keygen new -o ~/dev-wallet.json
```

This generates a new keypair file. You'll see a public key printed—that's your wallet address. The private key stays in the file on your server.

> **Already have a wallet?** You can use any Solana wallet. Export your private key from Phantom or Solflare and save it to the same path. Alfred just needs the keypair file.

### Step 3: Fund Your Wallet

You need both SOL (for transaction fees) and USDC (for transfers).

**Devnet SOL:**

```bash
solana airdrop 2 --url devnet
```

If the airdrop fails (rate-limited), try a community faucet or ask in the Solana devnet Discord.

**Devnet USDC:**

Visit a Solana devnet faucet that supports the mint `Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr` and request test USDC to your wallet address.

> **Which faucet?** We used **spl-token-faucet.com** during development. It provides both devnet SOL and USDC. Any community faucet that supports custom SPL mint addresses will work.

### Step 4: Install Jupiter CLI

```bash
npm i -g @jup-ag/cli
jup config set --api-key YOUR_JUPITER_KEY
jup config set --output json
jup keys add alfred --file ~/path-to-your-keypair.json
jup keys use alfred
```

### Step 5: Set Up Environment

```bash
cp .env.example .env
```

Edit `.env` with your actual values:

```env
DISCORD_BOT_TOKEN=your_discord_bot_token
NVIDIA_API_KEY=your_api_key
SOLANA_KEYPAIR_PATH=/home/ubuntu/dev-wallet.json
```

> **The variable name `NVIDIA_API_KEY` doesn't matter.** It's just a string that gets passed to your AI provider. If you're using Grok, Gemini, or any other OpenAI-compatible API, put your key here and update the base URL in Step 9.

### Step 6: Create a Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click New Application → name it "AlfredOS"
3. Go to Bot → Add Bot
4. Under Privileged Gateway Intents, enable: Message Content Intent, Server Members Intent, Presence Intent
5. Go to OAuth2 → URL Generator. Under Scopes, check bot. Under Bot Permissions, check Send Messages, Read Messages/View Channels, Read Message History
6. Copy the generated URL, paste in a new browser tab, invite the bot to your server
7. Go back to Bot → Reset Token → copy the token
8. Add it to your `.env` file as `DISCORD_BOT_TOKEN`

### Step 7: Get a Jupiter API Key

1. Go to [developers.jup.ag](https://developers.jup.ag)
2. Sign up and create a new API key
3. Use it in Step 4 when configuring the Jupiter CLI

### Step 8: Start Alfred

```bash
npm start
```

Alfred will appear online in your Discord server's `#general` channel. Type `info` to see what he can do.

### Step 9: Using a Different AI Model

Alfred was built and tested with **Qwen 3.5 122B** on NVIDIA's API. The system prompt, token limits, and response parsing are calibrated for this model.

You can swap to any OpenAI-compatible API provider. In `src/discord.js`, change these two lines:

```javascript
// NVIDIA Qwen (tested)
const BASE_URL = 'https://integrate.api.nvidia.com/v1';
const MODEL = 'qwen/qwen3.5-122b-a10b';

// Grok (example — not tested)
const BASE_URL = 'https://api.x.ai/v1';
const MODEL = 'grok-3-beta';

// Gemini (example — not tested)
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const MODEL = 'gemini-2.0-flash';
```

Your API key stays in the `.env` file. The variable name doesn't matter—it's just a string that gets passed to the provider.

#### ⚠️ What to Expect When Swapping Models

| Issue | Likelihood | What Happens |
|-------|-----------|--------------|
| Verbose responses | High | Brief Alfred becomes chatty Alfred |
| Refused commands | Medium | Safety filters block financial operations |
| Broken JSON | Medium | Commands fail silently |
| Different personality | Certain | Alfred won't sound like Alfred |

We tested with Qwen. If you swap models, expect to recalibrate the system prompt, token limits, and temperature settings. The architecture is model-agnostic. The personality is not.

---

## Commands

Alfred understands natural language. Here's how you'd actually talk to him.

### Checking Your Finances

| What You Say | What Alfred Does |
|--------------|------------------|
| `vault balance` | Shows your shielded vault balance and any incoming funds waiting on your stealth address |
| `SOL price` | Fetches the live SOL/USDC price from Jupiter |
| `market overview` | Shows live prices for 9 tokens: SOL, JUP, BONK, JTO, WIF, RNDR, HNT, PYTH, USDC |

### Receiving Money Privately

| What You Say | What Alfred Does |
|--------------|------------------|
| `generate address` | Returns your Umbra stealth address. Give this to anyone who wants to send you money privately. |
| `scan for payments` | Checks your Umbra address for incoming funds. If someone sent you USDC, Alfred finds it. |

### Managing Your Vault

| What You Say | What Alfred Does |
|--------------|------------------|
| `shield 50 USDC` | Moves 50 USDC from your stealth address into the shielded vault. The public can no longer see it. |
| `shield` | Sweeps ALL available USDC from your stealth address into the vault. |
| `withdraw 20 USDC` | Pulls 20 USDC from the vault back to your stealth address. |

### Sending Money to Anyone

| What You Say | What Alfred Does |
|--------------|------------------|
| `send 50 USDC to 7JVdFkPm...` | Transfers 50 USDC to any Solana address. If the address has never held USDC before, Alfred creates a token account for them first and lets you know. |
| `send 50 USDC to Daniel` | Transfers 50 USDC to a contact you've saved. No need to copy-paste addresses again. |

### Your Personal Address Book

You don't need to memorize or copy-paste long Solana addresses. Alfred remembers your contacts.

| What You Say | What Alfred Does |
|--------------|------------------|
| `save 7JVdFkPm... as Daniel` | Saves that address under the name "Daniel" |
| `save as Daniel` | After a transfer, Alfred asks if you want to save the address. Reply with this to save it immediately. |
| `send 20 USDC to Daniel` | Looks up "Daniel" in your address book and sends to the saved address |
| `address book` | Lists everyone you've saved |
| `delete Daniel` | Removes Daniel from your address book |

### Trading

| What You Say | What Alfred Does |
|--------------|------------------|
| `vault swap 10 USDC to SOL` | Withdraws 10 USDC from the vault, gets a live Jupiter quote, shows the expected SOL output, and re-shields everything. On mainnet, the swap executes. On devnet, it's simulated with real pricing. |

### Housekeeping

| What You Say | What Alfred Does |
|--------------|------------------|
| `info` | Lists all available commands |
| `nuke` | Clears all messages in the channel |

---

## Built With

- **Solana** — Low-latency execution and native SPL token composability
- **Solana Web3.js** — Blockchain interaction
- **Discord.js** — Conversational interface
- **NVIDIA NIM** — AI model (Qwen 3.5 122B) — swappable to any OpenAI-compatible API
- **MagicBlock Private Payments API** — Shielded vault via TEE
- **Umbra SDK** — Stealth addresses for private receiving
- **Jupiter CLI** — Market data and swap simulation

---

**Say what you want. It happens—privately.**

Built on Solana during the Colosseum Frontier Hackathon.
