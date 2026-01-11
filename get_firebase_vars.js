const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');

const vars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
    'NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID'
];

vars.forEach(varName => {
    const regex = new RegExp(`${varName}="?([^"\\n]+)"?`);
    const match = envContent.match(regex);
    if (match) {
        console.log(`${varName}=${match[1]}`);
    }
});
