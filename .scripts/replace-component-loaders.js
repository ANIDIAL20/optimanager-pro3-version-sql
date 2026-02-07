const fs = require('fs');
const path = require('path');

// Additional files to update in components directory
const filesToUpdate = [
  'src/components/ui/searchable-select.tsx',
  'src/components/settings/data-backup.tsx',
  'src/components/clients/client-pos-tab.tsx',
  'src/components/dashboard/clients/tabs/client-overview.tsx',
  'src/components/dashboard/commandes/payment-dialog.tsx',
  'src/components/dashboard/commandes/quick-client-dialog.tsx',
  'src/components/dashboard/produits/columns.tsx',
  'src/components/dashboard/produits/stock-update-dialog.tsx',
  'src/components/clients/client-form.tsx',
  'src/components/admin/ClientsTable.tsx',
];

const rootDir = path.join(__dirname, '..');

filesToUpdate.forEach(filePath => {
  const fullPath = path.join(rootDir, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;

  // 1. Remove Loader2 from lucide-react imports
  content = content.replace(/import\s*{([^}]+)}\s*from\s*['"]lucide-react['"];?/g, (match, imports) => {
    if (imports.includes('Loader2')) {
      modified = true;
      // Remove Loader2 from imports
      const cleanedImports = imports
        .split(',')
        .map(i => i.trim())
        .filter(i => i !== 'Loader2' && i !== '')
        .join(', ');
      
      if (cleanedImports) {
        return `import { ${cleanedImports} } from 'lucide-react';`;
      }
      return ''; // Remove entire import if Loader2 was the only import
    }
    return match;
  });

  // 2. Add BrandLoader import if Loader2 was found
  if (modified) {
    // Check if BrandLoader import already exists
    if (!content.includes("from '@/components/ui/loader-brand'")) {
      // Find the last import statement
      const lastImportIndex = content.lastIndexOf('import ');
      const nextLineAfterImport = content.indexOf('\n', lastImportIndex);
      
      if (nextLineAfterImport !== -1) {
        content = 
          content.slice(0, nextLineAfterImport + 1) +
          "import { BrandLoader } from '@/components/ui/loader-brand';\n" +
          content.slice(nextLineAfterImport + 1);
      }
    }
  }

  // 3. Replace Loader2 usage with BrandLoader
  // Pattern: <Loader2 className="..." />
  content = content.replace(
    /<Loader2\s+className="([^"]+)"\s*\/>/g,
    (match, className) => {
      modified = true;
      // Determine size based on className
      let size = 'md';
      if (className.includes('h-4') || className.includes('w-4')) size = 'sm';
      else if (className.includes('h-5') || className.includes('w-5')) size = 'sm';
      else if (className.includes('h-6') || className.includes('w-6')) size = 'md';
      else if (className.includes('h-8') || className.includes('w-8')) size = 'md';
      
      // Extract additional classes (excluding size and animate-spin)
      const additionalClasses = className
        .split(' ')
        .filter(c => !c.startsWith('h-') && !c.startsWith('w-') && c !== 'animate-spin')
        .join(' ');
      
      if (additionalClasses) {
        return `<BrandLoader size="${size}" className="${additionalClasses}" />`;
      }
      return `<BrandLoader size="${size}" />`;
    }
  );

  // 4. Handle ternary expressions: {condition ? <Loader2 ... /> : ...}
  content = content.replace(
    /\?\s*<Loader2\s+className="([^"]+)"\s*\/>/g,
    (match, className) => {
      modified = true;
      let size = 'sm';
      if (className.includes('h-4') || className.includes('w-4')) size = 'sm';
      else if (className.includes('h-5') || className.includes('w-5')) size = 'sm';
      else if (className.includes('h-6') || className.includes('w-6')) size = 'md';
      else if (className.includes('h-8') || className.includes('w-8')) size = 'md';
      
      const additionalClasses = className
        .split(' ')
        .filter(c => !c.startsWith('h-') && !c.startsWith('w-') && c !== 'animate-spin')
        .join(' ');
      
      if (additionalClasses) {
        return `? <BrandLoader size="${size}" className="${additionalClasses}" />`;
      }
      return `? <BrandLoader size="${size}" />`;
    }
  );

  if (modified) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Updated: ${filePath}`);
  } else {
    console.log(`⏭️  Skipped (no changes): ${filePath}`);
  }
});

console.log('\n🎉 Component loader replacement complete!');
