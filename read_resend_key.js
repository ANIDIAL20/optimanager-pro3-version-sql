const fs = require('fs');
const path = require('path');

try {
    const envContent = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
    const match = envContent.match(/RESEND_API_KEY="?([^"\n]+)"?/);

    if (match && match[1]) {
        console.log(match[1]);
    } else {
        console.error('Could not find RESEND_API_KEY');
    }
} catch (error) {
    console.error('Error reading file:', error);
}
