# MagicBlock DX Report — AlfredOS

**Project:** AlfredOS — Ambient Financial Hypervisor on Solana
**Integration:** MagicBlock Private Payments API for shielded vault operations
**Author:** Daniel Brighten
**Contact:** danielbrighten9@gmail.com
**GitHub:** https://github.com/Daniel536t/Alfred

---

## What We Built

AlfredOS uses MagicBlock's Private Payments API to create a shielded vault where USDC balances are invisible to public block explorers. Every deposit, withdrawal, and transfer happens through MagicBlock's infrastructure. We confirmed four on-chain devnet transactions: deposits that moved USDC into the shielded vault, withdrawals that pulled funds back to L1, and private transfers that sent USDC to external wallets without exposing the sender.

This worked. The proof is in our terminal logs from the authenticated API response, MagicBlock returned the exact shielded balance when we provided the correct cryptographic signature.

---

## 1. Onboarding & Documentation

**Time to first successful deposit:** Roughly 90 minutes.

MagicBlock's documentation is split between the Private Payments API reference and the Ephemeral Rollup quickstart. For our use case, shielding SPL tokens via REST API—the Payments reference was exactly what we needed. The ER quickstart was not.

- **The Right Docs Are Hard to Find:** We initially tried to use the Ephemeral Rollup SDK because the quickstart pushes it heavily. That was a mistake. The Private Payments API is a separate surface, and it took time to realize that's what we actually needed.
- **Missing Native SOL Support:** The SPL Private Payments API does not support native SOL deposits. We tried. We got errors. We eventually learned that SOL must be wrapped into an SPL token first. This should be stated clearly in the API reference.
- **Recommendation:** Add a "What API should I use?" section at the top of the docs. If you're shielding tokens, use the Private Payments API. If you're building a program that needs private state, use the ER. The distinction matters and isn't obvious to newcomers.

---

## 2. The `/v1/spl/deposit` Journey

This is the endpoint we used most. It works. But getting the parameters right took trial and error.

| What We Tried | What Happened |
|---------------|---------------|
| Deposit with `cluster: 'devnet'` | Worked once we had the correct mint |
| Deposit with wrong USDC mint | `insufficient funds` error—took 20 minutes to realize we had the wrong mint address |
| Deposit with native SOL mint | Failed. The API expects SPL tokens, not native SOL |
| Deposit without `initIfMissing` | Failed when the token account didn't exist yet |

**The Fix:** Once we added `initIfMissing: true`, `initAtasIfMissing: true`, and `idempotent: true`, deposits became reliable. These flags should be mentioned in the deposit endpoint's example payload. We had to discover them through trial and error.

**Recommendation:** Include a full, working deposit payload example in the API reference that includes all the optional flags that make deposits work reliably on devnet.

---

## 3. Balance Queries & Private Data

Querying the vault balance required more work than expected.

- **Public Balance:** `/v1/spl/balance?address=...&mint=...&cluster=devnet` works cleanly. No issues.
- **Private Balance:** `/v1/spl/private-balance` requires an `authorization` field that isn't documented in the API reference. We had to generate a cryptographic signature to authenticate the request.

Our `getSecureBalance` function signs a message with the user's keypair and passes the signature as both a query parameter and a Bearer token. This is not documented anywhere. We figured it out by reading the error messages.

**Recommendation:** Document the authorization flow for the private-balance endpoint. A code snippet showing how to sign the message and pass the authorization would eliminate this friction entirely.

---

## 4. The Transfer Flow

The `/v1/spl/transfer` endpoint works, but parameter naming cost us time.

| Parameter We Tried | Correct Parameter |
|--------------------|-------------------|
| `owner`, `destination` | `from`, `to` |
| `sourceLocation`, `destinationLocation` | `fromBalance`, `toBalance` |
| Missing `visibility` | `"private"` or `"public"` |

The error messages are helpful once you trigger them, but the required fields aren't obvious from the API reference alone. We discovered the correct parameter names by reading validation errors.

**Recommendation:** The API reference should list all required fields for the transfer endpoint. An example payload in the docs would eliminate this entire section of the report.

---

## 5. The Withdrawal Simulation Problem (Critical Finding)

This was the most difficult issue we encountered with MagicBlock. It consumed significant debugging time and required an architectural workaround.

### The Problem

When the L1 balance was insufficient for a transfer, we attempted to withdraw from the vault and transfer in a single API call. The `/v1/spl/transfer` endpoint with `fromBalance: 'ephemeral'` was supposed to handle this automatically. It didn't.

The simulation failed with `custom program error: 0x1` every time the L1 balance was zero and the funds needed to come from the vault. The error message was `insufficient funds`, but the vault had sufficient funds. The issue was that the simulation was checking against the base layer state, not the ephemeral rollup state.

### The Workaround

We implemented a dedicated `withdrawFromVault` function that performs the withdrawal as a separate confirmed transaction before the transfer. The flow became:

1. Check L1 balance
2. If insufficient, withdraw from vault as a standalone transaction
3. Wait for network confirmation (2-second delay)
4. Execute the transfer from L1 to recipient

This added latency but made transfers reliable. The two-step flow should be documented as a known pattern for devnet usage.

### Recommendation

Document that `fromBalance: 'ephemeral'` may not work reliably on devnet. Provide the two-step withdrawal-then-transfer pattern as a recommended workaround. Better yet, fix the simulation to properly reference ephemeral state during pre-flight checks.

---

## 6. What Worked Brilliantly

- **Deposit Reliability:** Once configured correctly, deposits executed consistently. Four confirmed on-chain transactions. Zero failures after the initial setup.
- **Withdrawal Speed:** Withdrawals from the vault to L1 confirmed quickly. The funds were available for transfer within seconds.
- **Private Balance Authentication:** Once we figured out the signature requirement, the private balance query worked correctly and returned the exact shielded balance.
- **Devnet Availability:** The devnet deployment is functional and allowed us to build and test without mainnet funds. This is exactly what developers need.

---

## 7. Feature Requests

1. **Document the authorization flow** for `/v1/spl/private-balance` with a code snippet
2. **Add native SOL support** or clearly document that it's SPL-only
3. **Include full example payloads** in the API reference for deposit, transfer, and withdrawal
4. **Add a "Which API?" guide** to the top of the docs to help developers choose between Private Payments and Ephemeral Rollups
5. **Document the deposit flags** (`initIfMissing`, `initAtasIfMissing`, `idempotent`) in the deposit example
6. **Document the `fromBalance: 'ephemeral'` limitation** on devnet and provide the two-step withdrawal-then-transfer workaround

---

## 8. What We Loved

The Private Payments API is the right abstraction for what we built. We didn't need to understand Ephemeral Rollups or TEE architecture. We just called REST endpoints with our wallet address and amounts, and MagicBlock handled the rest. The shielded vault is invisible to Solscan. The deposit transactions are confirmed on-chain. The privacy proof is verifiable by anyone who checks the block explorer and sees nothing.

This is exactly the kind of developer experience that makes privacy accessible to builders who aren't cryptographers. More of this, please.

---

*This report was written based on the integration of MagicBlock into AlfredOS, an ambient AI financial hypervisor on Solana, during the Colosseum Frontier Hackathon.*
