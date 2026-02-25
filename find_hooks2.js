const fs = require('fs');
const path = require('path');

// Find hooks-after-return patterns by simply checking:
// After any "return" at component level, is there another hook call?

const HOOKS = ['useState','useEffect','useMemo','useCallback','useRef','useContext','useReducer',
  'useRouter','usePathname','useSearchParams','useParams','useSession','useToast','useForm',
  'useSidebar','usePrivacy','useMode','useBreadcrumbStore','useQueryClient','useSupplierStatement',
  'useKeyboardShortcuts','usePosCartStore','useLoadingContext','useGlobalLoading','React.useState',
  'React.useEffect','React.useMemo','React.useCallback','React.useRef','React.useContext','React.use('];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const violations = [];

  // Simple approach: find component functions and track return vs hook
  let inComponent = false;
  let componentName = '';
  let braceStack = 0;
  let componentBraceLevel = -1;
  let foundReturnAtLevel = {};  // brace level -> line number of return

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Track brace changes CHARACTER BY CHARACTER
    for (const ch of line) {
      if (ch === '{') braceStack++;
      if (ch === '}') {
        braceStack--;
        // If we drop below component level, reset
        if (inComponent && braceStack <= componentBraceLevel) {
          inComponent = false;
          componentBraceLevel = -1;
          foundReturnAtLevel = {};
        }
      }
    }

    // Detect component start: export default function Foo(  OR  function Foo(  OR  const Foo = 
    const compMatch = trimmed.match(/^(?:export\s+(?:default\s+)?)?(?:function\s+([A-Z]\w*)|(?:const|let)\s+([A-Z]\w*)\s*=)/);
    if (compMatch) {
      const name = compMatch[1] || compMatch[2];
      if (name) {
        inComponent = true;
        componentName = name;
        componentBraceLevel = braceStack - 1; // The opening brace is the one we just counted
        foundReturnAtLevel = {};
      }
    }

    if (!inComponent) continue;

    const depthInComponent = braceStack - componentBraceLevel;

    // Look for return statements at component body level (depth 1) or inside if-blocks (depth 2)
    if (depthInComponent <= 2) {
      // Check for: if(...) return, if(...) { return, return ( at component level
      if (trimmed.match(/^if\s*\(/) && trimmed.includes('return')) {
        foundReturnAtLevel[depthInComponent] = i + 1;
      }
      if (trimmed.match(/^return[\s(;]/) && depthInComponent === 1) {
        // This is the main return, anything after this is dead code (or the component ended)
        // But hooks after this would be in a different component below - not our issue
      }
    }

    // Now check if THIS line has a hook call at component body level
    if (depthInComponent === 1) {
      for (const hook of HOOKS) {
        if (trimmed.includes(hook + '(') || trimmed.includes(hook + '<')) {
          // Check if there was a conditional return at depth 1 or 2 BEFORE this line
          for (const [level, retLine] of Object.entries(foundReturnAtLevel)) {
            if (retLine < i + 1) {
              violations.push({
                file: filePath,
                component: componentName,
                earlyReturnLine: retLine,
                hookLine: i + 1,
                hookCode: trimmed.substring(0, 100),
                hook: hook
              });
            }
          }
          break;
        }
      }
    }
  }

  return violations;
}

function walkDir(dir) {
  let results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (['node_modules', '.next', '.git', 'dist', 'build'].includes(entry.name)) continue;
        results = results.concat(walkDir(fullPath));
      } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
        try {
          results = results.concat(scanFile(fullPath));
        } catch(e) {
          // skip
        }
      }
    }
  } catch(e) {
    // skip
  }
  return results;
}

const violations = walkDir('src');

if (violations.length === 0) {
  console.log('No violations found.');
} else {
  console.log(`Found ${violations.length} potential violation(s):\n`);
  const unique = new Map();
  violations.forEach(v => {
    const key = `${v.file}:${v.hookLine}`;
    if (!unique.has(key)) {
      unique.set(key, v);
    }
  });
  unique.forEach(v => {
    console.log(`FILE: ${v.file}`);
    console.log(`  Component: ${v.component}`);
    console.log(`  Early return: line ${v.earlyReturnLine}`);
    console.log(`  Hook after: line ${v.hookLine} -> ${v.hookCode}`);
    console.log('');
  });
}
