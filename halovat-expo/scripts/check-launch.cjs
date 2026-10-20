const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const slots = [], cleanup = [];
let index = 0, mounted = false, listener, removed = false;
const dependencies = {
  react: {
    useState: initial => {
      const slot = index++;
      if (!mounted) slots[slot] = initial;
      return [slots[slot], value => { slots[slot] = typeof value === 'function' ? value(slots[slot]) : value; }];
    },
    useRef: initial => { const slot = index++; if (!mounted) slots[slot] = { current: initial }; return slots[slot]; },
    useEffect: callback => { if (!mounted) cleanup.push(callback()); },
    useCallback: callback => callback,
  },
  'react-native': { AppState: { addEventListener: (_, callback) => { listener = callback; return { remove: () => { removed = true; } }; } } },
};
const box = { exports: {}, require: name => dependencies[name] };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/hooks/useLaunchAnimation.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, box);
const render = () => { index = 0; const value = box.exports.useLaunchAnimation(); mounted = true; return value; };
let launch = render();
assert.equal(launch.visible, true, 'Cold launch must show the animation');
const oldFinish = launch.onFinished;
launch.onFinished(); launch = render(); assert.equal(launch.visible, false);
listener('inactive'); listener('active'); launch = render();
assert.equal(launch.visible, false, 'An inactive dialog must not replay loading');
listener('background'); listener('active'); launch = render();
assert.equal(launch.visible, true, 'Returning to the app must replay loading');
assert.equal(launch.revision, 1);
oldFinish(); launch = render();
assert.equal(launch.visible, true, 'An old completion must not cut off a new animation');
launch.onFinished(); launch = render(); assert.equal(launch.visible, false);
listener('background'); listener('inactive'); listener('active'); launch = render();
assert.equal(launch.visible, true); assert.equal(launch.revision, 2);
cleanup.forEach(callback => callback?.()); assert.equal(removed, true);
console.log('PASS: cold/warm launch replay, dialog handling, stale-completion protection and listener cleanup.');
