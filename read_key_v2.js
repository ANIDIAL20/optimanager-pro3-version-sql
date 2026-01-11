const fs = require('fs');
const path = require('path');

try {
    const envContent = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
    const match = envContent.match(/FIREBASE_PRIVATE_KEY="([\s\S]*?)"/);

    if (match && match[1]) {
        // Print verbatim, no extra processing
        process.stdout.write(match[1]);
    } else {
        console.error('Could not find FIREBASE_PRIVATE_KEY');
    }
} catch (error) {
    console.error('Error reading file:', error);
}
