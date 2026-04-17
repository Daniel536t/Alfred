#!/bin/bash

echo "🏗️ 1. Building AlfredOS Directory Structure..."
mkdir -p src/brain
mkdir -p src/tools
mkdir -p submissions

echo "📄 2. Creating empty JS files..."
touch src/index.js
touch src/brain/router.js
touch src/tools/jupiter.js
touch src/tools/magicblock.js
touch src/tools/umbra.js
touch src/tools/encrypt-ika.js

echo "🤫 3. Setting up GitIgnore & Env..."
cat << 'IGNOREEOF' > .gitignore
node_modules/
.env
.DS_Store
IGNOREEOF

cat << 'ENVEOF' > .env
# AlfredOS Environment Variables
GEMINI_API_KEY="AIzaSyAdFr4B5gWNZ_Kei-bYP3pvnFP3OI_xcv8"
ZERION_API_KEY="zk_1ceff0ea58c44f23ad9ace0f7b1694e2"
JUPITER_API_KEY="jup_afd59c647fdfb540a53d0ed85a1ff25f944ece5774efa4482a61ee7fa26928f4"
ENVEOF

echo "📦 4. Initializing Node.js and dependencies..."
npm init -y
npm install @google/generative-ai dotenv

echo "🔗 5. Cloning your Zerion Fork as the execution engine..."
# We clone your specific fork into the tools folder
git clone https://github.com/Daniel536t/zerion-ai-A.git src/tools/zerion-cli

echo "📝 6. Creating Submission Markdown templates..."
touch submissions/100xDevs.md
touch submissions/Zerion.md
touch submissions/Jupiter-DX.md
touch submissions/MagicBlock.md
touch submissions/Umbra.md
touch submissions/Encrypt-Ika.md

echo "✅ AlfredOS Architecture Successfully Scaffolded!"
