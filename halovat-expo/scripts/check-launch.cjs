const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
let slots = [], index = 0, mounted = false;
const listeners = new Set();
const dependencies = {
  react: {
    useState: initial => {
      const slot = index++;
      if (!mounted) slots[slot] = initial;
      return [slots[slot], value => { slots[slot] = typeof value === 'function' ? value(slots[slot]) : value; }];
    },
    useRef: initial => { const slot = index++; if (!mounted) slots[slot] = { current: initial }; return slots[slot]; },
    useEffect: callback => { if (!mounted) callback(); },
    useCallback: callback => callback,
  },
  'react-native': { AppState: { addEventListener: (_, callback) => { listeners.add(callback); return { remove: () => listeners.delete(callback) }; } } },
};
const box = { exports: {}, require: name => dependencies[name] };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/hooks/useLaunchAnimation.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, box);
const render = () => { index = 0; const value = box.exports.useLaunchAnimation(); mounted = true; return value; };
const state = value => listeners.forEach(listener => listener(value));
let launch = render();
assert.equal(launch.visible, true, 'Cold launch must show the animation');
state('background'); state('active'); launch = render();
assert.equal(launch.visible, true, 'Leaving during startup must preserve the current animation');
launch.onFinished(); launch = render(); assert.equal(launch.visible, false);
state('inactive'); state('active'); launch = render();
assert.equal(launch.visible, false, 'An inactive dialog must not replay loading');
for (let i = 0; i < 5; i++) {
  state('background'); state('active'); launch = render();
  assert.equal(launch.visible, false, 'Returning to a running app must not replay loading');
  state('background'); state('inactive'); state('active'); launch = render();
  assert.equal(launch.visible, false, 'Settings, lock/unlock and app switching must not replay loading');
}
launch.onFinished(); launch = render(); assert.equal(launch.visible, false);
assert.equal(listeners.size, 0, 'Startup animation must not subscribe to foreground changes');
slots = []; index = 0; mounted = false;
launch = render();
assert.equal(launch.visible, true, 'A new app root after a cold launch must show loading again');
launch.onFinished(); assert.equal(render().visible, false);
console.log('PASS: cold launch, preserved startup, repeated warm resumes, system dialogs, duplicate completion and fresh-root loading.');
