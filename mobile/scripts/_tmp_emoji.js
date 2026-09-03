const fs = require('fs');
const path = require('path');
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u;
const files = [];
const notifDir = path.join(__dirname, '..', 'src', 'utils', 'notifications');
for (const f of fs.readdirSync(notifDir)) {
  if (f.endsWith('.ts')) files.push(path.join(notifDir, f));
}
const svcDir = path.join(__dirname, '..', 'src', 'services');
for (const f of fs.readdirSync(svcDir)) {
  if (f.startsWith('caregiver') && f.endsWith('.ts')) files.push(path.join(svcDir, f));
}
files.push(path.join(__dirname, '..', 'index.ts'));
const root = path.join(__dirname, '..');
for (const f of files) {
  const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    if (EMOJI.test(line)) {
      console.log(`${path.relative(root, f)}:${i + 1}: ${line.trim()}`);
    }
  });
}
