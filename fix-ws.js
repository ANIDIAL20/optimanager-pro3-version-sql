const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const filesToFix = [];
['src', 'scripts', 'tmp'].forEach(dir => {
  if (fs.existsSync(dir)) {
    walkDir('./' + dir, function(filePath) {
      if (filePath.endsWith('.ts') || filePath.endsWith('.js') || filePath.endsWith('.mjs')) {
        filesToFix.push(filePath);
      }
    });
  }
});

let modCount = 0;

filesToFix.forEach(file => {
  const normFile = file.replace(/\\/g, '/');
  if(normFile === 'src/db/index.ts') {
     const newIndexTs = `import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schemaFile from './schema';
import * as schemaDir from './schema/index';

const schema = { ...schemaFile, ...schemaDir };

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });`;
     fs.writeFileSync(file, newIndexTs);
     console.log('Fixed', normFile);
     return;
  }

  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  
  // RegEx for matching the websocket config
  const importRegex = /import\s+\{\s*neonConfig(\s*,\s*Pool)?\s*\}\s+from\s+['"]@neondatabase\/serverless['"];/gm;
  const poolImportRegex = /import\s+\{\s*(Pool\s*,\s*)?neonConfig\s*\}\s+from\s+['"]@neondatabase\/serverless['"];/gm;
  const wsBlockRegex = /\/\/ Configure WebSocket for Node\.js environment \(required for transactions\)\r?\nif\s*\(typeof\s+process\s*!==\s*'undefined'\s*&&\s*process\.release\?.name\s*===\s*'node'\)\s*\{\r?\n\s*neonConfig\.webSocketConstructor\s*=\s*eval\('require'\)\('ws'\);\r?\n\}/gm;
  const wsBlockRegex2 = /if\s*\(!isBrowser\)\s*\{\r?\n\s*if\s*\(typeof\s+WebSocket\s*!==\s*'undefined'\)\s*\{\r?\n\s*neonConfig\.webSocketConstructor\s*=\s*WebSocket;\r?\n\s*\}\s*else\s*if\s*\(typeof\s+process\s*!==\s*'undefined'\s*&&\s*process\.release\?.name\s*===\s*'node'\)\s*\{\r?\n\s*try\s*\{\r?\n\s*\/\/ Use eval\('require'\) to prevent bundlers from capturing 'ws' in client chunks\r?\n\s*neonConfig\.webSocketConstructor\s*=\s*eval\('require'\)\('ws'\);\r?\n\s*\}\s*catch\s*\(e\)\s*\{\r?\n\s*console\.error\('.*?'\s*,\s*e\);\r?\n\s*\}\r?\n\s*\}\r?\n\}/gm;

  // Additional standalone neonConfig lines
  const wsStandaloneLine1 = /neonConfig\.webSocketConstructor\s*=\s*eval\('require'\)\('ws'\);/gm;
  const wsStandaloneLine2 = /neonConfig\.webSocketConstructor\s*=\s*ws;/gm;
  const wsImport = /import\s+ws\s+from\s+['"]ws['"];/gm;

  content = content.replace(wsBlockRegex, '');
  content = content.replace(wsBlockRegex2, '');
  content = content.replace(importRegex, '');
  content = content.replace(poolImportRegex, '');
  content = content.replace(wsStandaloneLine1, '');
  content = content.replace(wsStandaloneLine2, '');
  content = content.replace(wsImport, '');

  content = content.replace(/import\s+\{\s*Pool\s*\}\s+from\s+['"]@neondatabase\/serverless['"];/gm, '');

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log('Fixed', normFile);
    modCount++;
  }
});

// Also check root folder loose files
const rootFiles = ['check-db.js', 'check-db-direct.js', 'test-neon-query.js'];
rootFiles.forEach(rootFile => {
    if(fs.existsSync(rootFile)) {
        let content = fs.readFileSync(rootFile, 'utf8');
        let originalContent = content;
        content = content.replace(/neonConfig\.webSocketConstructor\s*=\s*eval\('require'\)\('ws'\);/gm, '');
        content = content.replace(/import\s+ws\s+from\s+['"]ws['"];/gm, '');
        content = content.replace(/const\s+ws\s*=\s*require\(['"]ws['"]\);?/gm, '');
        content = content.replace(/neonConfig\.webSocketConstructor\s*=\s*ws;/gm, '');
        if (content !== originalContent) {
            fs.writeFileSync(rootFile, content);
            console.log('Fixed', rootFile);
        }
    }
});

console.log('Modified', modCount, 'files.');
