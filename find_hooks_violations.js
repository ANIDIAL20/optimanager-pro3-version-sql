const fs = require('fs');
const path = require('path');

const HOOK_PATTERN = /\b(useState|useEffect|useMemo|useCallback|useRef|useContext|useReducer|useLayoutEffect|useImperativeHandle|useDebugValue|useId|useSyncExternalStore|useTransition|useDeferredValue|useInsertionEffect|useOptimistic|useFormStatus|useFormState|useRouter|usePathname|useSearchParams|useParams|useSession|useToast|useForm|useSidebar|usePrivacy|useMode|useBreadcrumbStore|useQueryClient)\s*\(/;

const EARLY_RETURN_PATTERN = /^\s*(if\s*\(.*\)\s*return\b|return\s|return;|return\()/;

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const violations = [];

  // Find component/function boundaries
  let inComponent = false;
  let componentName = '';
  let braceDepth = 0;
  let componentStartDepth = 0;
  let foundEarlyReturn = false;
  let earlyReturnLine = 0;
  let earlyReturnDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Track brace depth
    for (const ch of line) {
      if (ch === '{') braceDepth++;
      if (ch === '}') braceDepth--;
    }

    // Detect component function start
    const componentMatch = trimmed.match(/^(?:export\s+(?:default\s+)?)?function\s+([A-Z]\w*)\s*\(/);
    const arrowComponentMatch = trimmed.match(/^(?:export\s+(?:default\s+)?)?(?:const|let)\s+([A-Z]\w*)\s*=\s*(?:\(|function)/);

    if (componentMatch || arrowComponentMatch) {
      inComponent = true;
      componentName = (componentMatch || arrowComponentMatch)[1];
      componentStartDepth = braceDepth - 1; // approx
      foundEarlyReturn = false;
      earlyReturnLine = 0;
      continue;
    }

    if (!inComponent) continue;

    // Detect early return at component body level (depth ~= componentStartDepth + 1)
    // We look for "if (...) return" or "if (...) { return" patterns at shallow depth
    if (!foundEarlyReturn) {
      // Check for: if (condition) return ... OR standalone return before the main return JSX
      if (EARLY_RETURN_PATTERN.test(trimmed)) {
        // Check it's not inside a nested function (callback, useEffect, etc)
        // Heuristic: depth should be close to component body level
        const depthInComponent = braceDepth - componentStartDepth;
        if (depthInComponent <= 2) { // Component body or one level deep (if block)
          // Check if it's a standalone return (not inside useEffect callback, etc.)
          // Look backwards to see if we're inside a hook callback
          let isInsideCallback = false;
          for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
            const prev = lines[j].trim();
            if (prev.match(/\.(map|forEach|filter|reduce|find)\s*\(/) ||
                prev.match(/=>\s*\{/) ||
                prev.match(/useEffect|useCallback|useMemo/)) {
              isInsideCallback = true;
              break;
            }
          }
          if (!isInsideCallback && trimmed.startsWith('if')) {
            foundEarlyReturn = true;
            earlyReturnLine = i + 1;
            earlyReturnDepth = braceDepth;
          }
        }
      }
    }

    // After finding early return, check for hooks
    if (foundEarlyReturn && HOOK_PATTERN.test(trimmed)) {
      // Make sure we're at the component body level, not inside a nested function
      const depthInComponent = braceDepth - componentStartDepth;
      if (depthInComponent <= 1) {
        violations.push({
          file: filePath,
          component: componentName,
          earlyReturnLine,
          hookLine: i + 1,
          hookCode: trimmed.substring(0, 80)
        });
      }
    }

    // Reset if we exit the component
    if (braceDepth <= componentStartDepth) {
      inComponent = false;
      foundEarlyReturn = false;
    }
  }

  return violations;
}

function walkDir(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') continue;
      results = results.concat(walkDir(fullPath));
    } else if (entry.name.endsWith('.tsx')) {
      results = results.concat(scanFile(fullPath));
    }
  }
  return results;
}

const violations = walkDir('src');

if (violations.length === 0) {
  console.log('No hooks-after-conditional-return violations found.');
} else {
  console.log(`Found ${violations.length} violations:\n`);
  violations.forEach(v => {
    console.log(`FILE: ${v.file}`);
    console.log(`  Component: ${v.component}`);
    console.log(`  Early return at line: ${v.earlyReturnLine}`);
    console.log(`  Hook AFTER return at line: ${v.hookLine}: ${v.hookCode}`);
    console.log('');
  });
}
