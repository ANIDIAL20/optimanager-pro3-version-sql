const fs = require('fs');
const path = require('path');

const files = ['.env', '.env.local', '.env.development.local', '.env.production.local'];

console.log('--- ENV CHECK ---');
files.forEach(file => {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
        console.log(`[FOUND] ${file}`);
        const content = fs.readFileSync(fullPath, 'utf8');
        const dbUrlLine = content.split('\n').find(line => line.startsWith('DATABASE_URL='));
        if (dbUrlLine) {
            console.log(`   ${dbUrlLine}`);
        } else {
            console.log('   DATABASE_URL NOT FOUND in this file.');
        }
    } else {
        console.log(`[NOT FOUND] ${file}`);
    }
});
console.log('-----------------');
