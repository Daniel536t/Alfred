console.log("🚀 AlfredOS: Engine Probe Initiated");
try {
    const dotenv = await import('dotenv');
    console.log("✅ Dotenv imported successfully");
    
    dotenv.config();
    console.log("✅ Dotenv config loaded");
    
    if (process.env.GEMINI_API_KEY) {
        console.log("✅ GEMINI_API_KEY detected");
    } else {
        console.log("❌ GEMINI_API_KEY missing!");
    }
} catch (err) {
    console.error("💥 Error during probe:", err);
}
