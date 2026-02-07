const fs = require('fs');
const path = require('path');

// Files to update based on grep results
const filesToUpdate = [
  'src/app/dashboard/ventes/[id]/invoice/page.tsx',
  'src/app/dashboard/ventes/new/page.tsx',
  'src/app/dashboard/supplier-orders/page.tsx',
  'src/app/dashboard/devis/[id]/print/page.tsx',
  'src/app/dashboard/compta/page.tsx',
  'src/app/dashboard/devis/[id]/page.tsx',
  'src/app/dashboard/clients/[id]/_components/contact-lens-prescription-form.tsx',
  'src/app/dashboard/clients/[id]/edit/page.tsx',
  'src/app/dashboard/clients/[id]/_components/lens-order-list.tsx',
  'src/app/dashboard/clients/[id]/_components/lens-order-form.tsx',
  'src/app/dashboard/clients/[id]/_components/prescription-form.tsx',
  'src/app/dashboard/clients/[id]/_components/sale-form.tsx',
  'src/app/dashboard/clients/[id]/_components/receive-order-dialog.tsx',
  'src/app/dashboard/clients/[id]/_components/pos/payment-section.tsx',
  'src/app/dashboard/clients/[id]/_components/pos/product-search.tsx',
  'src/app/dashboard/clients/[id]/_components/purchase-history-table.tsx',
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
  const importRegex = /from ['"]lucide-react['"];?/g;
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

  if (modified) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Updated: ${filePath}`);
  } else {
    console.log(`⏭️  Skipped (no changes): ${filePath}`);
  }
});

console.log('\n🎉 Loader replacement complete!');
