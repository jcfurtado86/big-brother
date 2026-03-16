// Monkey-patches console.log / .warn / .error to:
//   1. Prepend a HH:MM:SS timestamp
//   2. Color the [category] prefix (only the brackets + text)
//
// Import once at startup: import './utils/logger.js';

const COLORS = [
  '\x1b[36m',   // cyan
  '\x1b[33m',   // yellow
  '\x1b[35m',   // magenta
  '\x1b[32m',   // green
  '\x1b[34m',   // blue
  '\x1b[91m',   // bright red
  '\x1b[92m',   // bright green
  '\x1b[93m',   // bright yellow
  '\x1b[94m',   // bright blue
  '\x1b[95m',   // bright magenta
  '\x1b[96m',   // bright cyan
  '\x1b[31m',   // red
  '\x1b[37m',   // white
];
const RESET = '\x1b[0m';
const DIM = '\x1b[2m';

const colorMap = new Map();
let colorIdx = 0;

function getColor(category) {
  let c = colorMap.get(category);
  if (!c) {
    c = COLORS[colorIdx % COLORS.length];
    colorIdx++;
    colorMap.set(category, c);
  }
  return c;
}

function timestamp() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${DIM}${hh}:${mm}:${ss}${RESET}`;
}

const BRACKET_RE = /^\[([^\]]+)\]/;

function patchMethod(original) {
  return function (...args) {
    const ts = timestamp();

    if (typeof args[0] === 'string') {
      const match = args[0].match(BRACKET_RE);
      if (match) {
        const cat = match[1];
        const color = getColor(cat);
        args[0] = args[0].replace(BRACKET_RE, `${color}[${cat}]${RESET}`);
      }
      args[0] = `${ts} ${args[0]}`;
    } else {
      args.unshift(ts);
    }

    original.apply(console, args);
  };
}

console.log = patchMethod(console.log);
console.warn = patchMethod(console.warn);
console.error = patchMethod(console.error);
console.info = patchMethod(console.info);
