# Jupiter DX Report — AlfredOS

**Project:** AlfredOS — Ambient Financial Hypervisor on Solana  
**Integration:** Jupiter CLI + Price API via AI agent (Node.js)  
**Author:** Daniel Brighten
**Contact:** danielbrighten9@gmail.com  
**GitHub:** https://github.com/Daniel536t/Alfred

---

## What We Built

AlfredOS uses Jupiter as its market intelligence layer. Every price check, token swap simulation, and market overview flows through the Jupiter CLI. The CLI is called from a Node.js backend via `child_process.exec`, parsed, and returned through a conversational Discord interface. We combined three Jupiter surfaces—Quote, Price, and Swap—into a unified agent capability.

---

## Onboarding & First API Call

**Time to first successful call:** ~25 minutes.

The CLI installed cleanly (`npm i -g @jup-ag/cli`). No issues there. The friction started when we tried to actually use it.

### Command Structure Discovery

We expected swap commands at the root level (`jup swap`). They're under `jup spot swap`. That's a 15-minute detour. The CLI help system is solid once you know where to look, but the initial navigation isn't intuitive for developers coming from REST API backgrounds.

### Parameter Names

The CLI uses `--from` and `--to`. The REST API docs use `inputMint` and `outputMint`. We tried both. The CLI's names are actually better—more human-readable—but the mismatch cost time.

### Token Symbol Support

Being able to type `SOL` instead of `So11111111111111111111111111111111111111112` is a genuinely great experience. This made our AI prompts much simpler. This should be the first thing mentioned in the docs.

---

## Key Management

This was the most frustrating part of onboarding. **Total time lost: ~14 minutes.**

| What We Tried | What Happened | Time |
|---------------|---------------|------|
| `jup spot swap --from SOL --to USDC --amount 0.01` | `Key "default" does not exist` | 5 min |
| `jup keys import` | Command doesn't exist | 3 min |
| `jup keys --help` | Found the `add` command | 2 min |
| `jup keys add alfred --keypair ~/dev-wallet.json` | Flag is `--file`, not `--keypair` | 2 min |
| `jup keys solana-import` | Expected key at `~/.config/solana/id.json`, our key was elsewhere | 2 min |

**Recommendation:** Add a first-run wizard. If no key is configured, the CLI should say exactly what command to run. The current error (`Key "default" does not exist`) is accurate but unhelpful without context. A message like `No key configured. Run: jup keys add <name> --file <path-to-keypair>` would eliminate this entire section of the report.

---

## Network Configuration

**Severity: Critical.** This is the most dangerous issue we encountered.

The CLI defaults to mainnet. There is no `--network` flag. There is no `jup config set --network devnet`. There is no way to test swaps without real mainnet funds.

| Problem | Impact |
|---------|--------|
| CLI ignores Solana CLI config | We had `solana config set --url devnet` but Jupiter still used mainnet |
| Error says "Insufficient funds" | Doesn't mention it's checking mainnet, not devnet |
| No devnet swap simulation | Can't test agent logic without risking real money |

We lost significant time debugging "Insufficient funds" errors before realizing the CLI was checking our mainnet balance (0 SOL) instead of devnet (10 SOL). The error message should say: `Insufficient funds on mainnet. Did you mean to use devnet?`

**Recommendation:** Add `--network` flag or `jup config set --network devnet`. A devnet sandbox for swap simulation would make Jupiter the go-to tool for agent development.

---

## Amount Precision & Data Integrity

### The $891M Bug

We passed `--amount 10000000` thinking it was 0.1 SOL in lamports. Jupiter interpreted it as 10,000,000 SOL. The quote returned ~$891M. No error. No warning. Just an absurd number.

The CLI expects human-readable amounts (0.01), not raw lamports. This makes sense once you know it, but the documentation should explicitly call this out. For AI agents that might generate amounts programmatically, this could be a silent data corruption risk.

We don't know if this would have actually gone through on mainnet, we never tried. But the fact that the quote returned at all, without flagging the amount as unusual, feels like a footgun waiting for someone more tired than us. The docs should call this out explicitly.


### Slippage Flag

The flag is `--slippage`, not `--slippage-bps`. Minor, but cost 10 minutes of trial and error.

### Micro-Cap Precision

For tokens like BONK, quoting 1 token returns $0.0000—meaningless. We had to increase the quote amount to 1000 tokens to get useful decimal precision. A `/price` endpoint that handles this automatically would be ideal.

---

## Swap Command: No JSON Output

`jup spot quote` supports `--format json`. `jup spot swap` does not.

We had to write a custom regex parser to extract amounts from the human-readable swap output. This code lives in our repository at:

**[src/tools/jupiter.js — executeJupiterSwap function](https://github.com/Daniel536t/Alfred/blob/main/src/tools/jupiter.js#L85-L110)**

The function uses regex patterns to parse output that should have been structured JSON. This is technical debt that wouldn't exist if the swap command supported `--format json`.

For AI agents that need structured data, JSON output on every command is essential. The global JSON config (`jup config set --output json`) is brilliant—but the swap command needs to respect it.

**Recommendation:** Extend `--format json` to the swap command.

---

## API Reliability

Direct REST API calls to `quote-api.jup.ag` failed intermittently with DNS resolution errors (`ENOTFOUND`) on our network. The CLI worked flawlessly during these outages.

| Failure | Recovery |
|---------|----------|
| REST API unreachable | CLI continued working |
| DNS errors on quote endpoint | CLI handled routing internally |

### CLI as Fallback

When direct REST API calls to Jupiter failed with DNS errors, the CLI kept working. We didn't plan this—we just noticed that while our `fetch()` requests were timing out, `jup spot quote` returned instantly.

This turned out to be valuable. The CLI handles routing internally, so it doesn't depend on our server's network reaching Jupiter's API directly. For anyone building agents on unreliable connections, the CLI is the safer integration path.

**Recommendation:** A status page or health check endpoint for API availability would help developers distinguish between their bugs and network issues.

---

## The AI Agent Experience

Using `child_process.exec` to call the Jupiter CLI from Node.js is elegant. I think Jupiter built an AI-native tool without realizing it.

### What Worked Brilliantly

- **Global JSON Config:** `jup config set --output json` makes every command return parseable JSON. This should be the first thing in the AI integration docs.
- **Dry-Run Preview:** `--dry-run` returns a base64 transaction that an agent can inspect before signing. Powerful safety feature.
- **Non-Interactive Design:** Every command runs and returns. No prompts. No waiting for input. Perfect for automation.

### What's Missing

- **Swap Command JSON:** The swap command needs structured output like the quote command.
- **Multi-Token Price Endpoint:** We query 9 tokens individually for market overviews. A `?ids=SOL,JUP,BONK` endpoint would reduce 9 calls to 1.
- **Dry-Run Structured Response:** A JSON wrapper around the base64 transaction with parsed amounts and routes.

---

## Feature Requests Summary

1. **Devnet sandbox** — Let developers simulate swaps without mainnet funds
2. **Multi-token price endpoint** — `GET /price?ids=SOL,JUP,BONK`
3. **JSON output on swap command** — Extend `--format json`
4. **First-run key wizard** — Guide new users through `jup keys add`
5. **Network flag** — `--network devnet` or `jup config set --network`
6. **Amount format documentation** — Explicitly state human-readable vs lamports
7. **Status page** — API health check endpoint

---

## What We Loved

The CLI's architecture is phenomenal for AI agents. The global JSON config eliminated parsing headaches. Token symbol support made our prompts cleaner. The dry-run safety net gave us confidence during autonomous testing. The CLI's reliability as a fallback when the REST API was unreachable saved our demo.

Jupiter built an agent-native tool without marketing it that way. Lean into it. The CLI is your best AI integration surface.

---

*This report was written based on the integration of Jupiter into AlfredOS, an ambient AI financial hypervisor on Solana, during the Colosseum Frontier Hackathon.*
