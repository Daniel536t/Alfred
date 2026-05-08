# NVIDIA Qwen 3.5 122B — Integration Guide

AlfredOS uses Qwen 3.5 122B on NVIDIA's hosted API. Here's exactly how to set it up.

---

## Step 1: Get Your API Key

1. Go to [build.nvidia.com/qwen/qwen3.5-122b-a10b](https://build.nvidia.com/qwen/qwen3.5-122b-a10b)
2. Click **Get API Key**
3. Copy the key

## Step 2: Add It to Your .env File

```env
NVIDIA_API_KEY=nvapi-your-key-here
```

The variable name NVIDIA_API_KEY is already used in the code. Just paste your key.

Step 3: That's It

Alfred is configured to call NVIDIA's hosted API at https://integrate.api.nvidia.com/v1/chat/completions. No Docker. No local model. No GPU required. The model runs on NVIDIA's servers.

How Alfred Uses the Model

Every message you send in Discord goes to this endpoint:

```javascript
const payload = {
    model: 'qwen/qwen3.5-122b-a10b',
    messages: messages,
    max_tokens: 100,
    temperature: 0.6,
    top_p: 0.85,
    stream: false
};

const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
        'Authorization': 'Bearer ' + process.env.NVIDIA_API_KEY,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
});
```

Parameters We Tuned

Parameter Value Why
max_tokens 100 Keeps Alfred brief and punchy
temperature 0.6 Enough personality without hallucination
top_p 0.85 Balanced creativity and reliability
stream false We need complete JSON, not streaming chunks

What If the API Is Down?

Alfred logs the error and returns a fallback message: "My apologies, Sir. The neural network appears to be taking a brief rest." The bot stays online. The vault still works. Only the conversational layer is affected.

Swapping to Another Model

See the main README, Step 9. The architecture is model-agnostic. Any OpenAI-compatible API works.
