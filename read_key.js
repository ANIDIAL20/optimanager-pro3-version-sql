const fs = require('fs');
const path = require('path');

try {
    const envContent = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
    const lines = envContent.split('\n');
    let privateKey = '';
    for (const line of lines) {
        if (line.startsWith('FIREBASE_PRIVATE_KEY=')) {
            // Extract content inside quotes
            const match = line.match(/FIREBASE_PRIVATE_KEY="(.*)"/);
            if (match) {
                privateKey = match[1];
            }
            break;
        }
    }

    if (privateKey) {
        console.log(privateKey);
    } else {
        console.error('Could not find FIREBASE_PRIVATE_KEY');
    }
} catch (error) {
    console.error('Error reading file:', error);
}
