const cp = require('child_process');

const child = cp.spawn('npx.cmd', ['drizzle-kit', 'push'], {
  stdio: ['pipe', 'inherit', 'inherit'],
  shell: true
});

child.stdin.write('\x1B[B\r\n');

setTimeout(() => {
  child.stdin.write('\x1B[B\r\n');
}, 5000);

setTimeout(() => {
  child.stdin.write('\x1B[B\r\n');
}, 10000);

setTimeout(() => {
  child.stdin.write('\x1B[B\r\n');
}, 15000);

setTimeout(() => {
  child.stdin.write('\x1B[B\r\n\x1B[B\r\n\x1B[B\r\n');
}, 20000);
