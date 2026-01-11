const fs = require('fs');
const path = require('path');

try {
    const envContent = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
    const lines = envContent.split('\n');

    const config = {};
    lines.forEach(line => {
        if (line.startsWith('NEXT_PUBLIC_FIREBASE_')) {
            const match = line.match(/^([^=]+)="?([^"\n]+)"?$/);
            if (match) {
                config[match[1]] = match[2];
            }
        }
    });

    console.log(JSON.stringify(config, null, 2));
} catch (error) {
    console.error('Error:', error);
}
