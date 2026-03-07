const { spawn } = require('child_process');

const child = spawn('npx.cmd', ['drizzle-kit', 'push'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: true,
  env: { ...process.env }
});

child.stdout.on('data', (d) => {
  const s = d.toString();
  process.stdout.write(s);
  
  // Any question ending in '?' or prompt-like patterns
  if (s.includes('?') || s.includes('❯')) {
     console.log('  [Auto-Reply] Sending Enter to prompt...');
     child.stdin.write('\r\n'); 
  }
  
  if (s.includes('Do you still want to push changes?')) {
     console.log('  [Auto-Reply] Selecting "Yes" for data loss...');
     child.stdin.write('\x1B[B\r\n'); // Down arrow + enter
  }
});

child.stderr.on('data', (d) => {
  process.stderr.write(d.toString());
});

child.on('exit', (c) => {
  console.log('Exited with', c);
});
