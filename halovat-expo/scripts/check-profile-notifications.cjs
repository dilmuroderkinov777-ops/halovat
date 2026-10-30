// Exercise the real profile setters and permission services without a device.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const flush = () => new Promise(setImmediate);
const granted = { granted: true, canAskAgain: true };
const denied = { granted: false, canAskAgain: true };
const keys = ['prayerTimeReminderEnabled', 'reminderEnabled', 'duaReminderEnabled'];
const setter = key => `set${key[0].toUpperCase()}${key.slice(1)}`;

function setup(os = 'android') {
  let cursor = 0;
  const hooks = [], alerts = [], calls = [], storage = new Map(), cache = new Map();
  const settings = { permission: granted, request: async () => granted, channelError: null };
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    createContext: () => ({ Provider: 'Provider' }),
    useState: initial => {
      const index = cursor++;
      if (!(index in hooks)) hooks[index] = typeof initial === 'function' ? initial() : initial;
      return [hooks[index], value => { hooks[index] = typeof value === 'function' ? value(hooks[index]) : value; }];
    },
    useRef: initial => { const index = cursor++; return hooks[index] ??= { current: initial }; },
    useCallback: callback => callback,
    useMemo: callback => callback(),
    useEffect: () => {}, // Timers, network fetches and scheduling are covered separately.
  };
  const native = {
    Platform: { OS: os },
    Alert: { alert: (...args) => alerts.push(args) },
    AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) },
    Linking: { openSettings: async () => calls.push('settings') },
    PermissionsAndroid: {
      PERMISSIONS: { CAMERA: 'camera' }, RESULTS: { GRANTED: 'granted' },
      check: async () => { calls.push('camera'); return false; },
      request: async () => 'denied',
    },
  };
  const focus = {
    getStatus: () => ({ exactAlarmAccess: false, reminderPopupAccess: false, flashlightPresent: true, batteryUnrestricted: false, manufacturer: 'Xiaomi' }),
    openExactAlarmSettings: () => true,
    openReminderPopupSettings: () => true,
    openBatterySettings: () => true,
  };
  const notifications = {
    IosAuthorizationStatus: { PROVISIONAL: 3, EPHEMERAL: 4 },
    AndroidImportance: { HIGH: 4 }, AndroidAudioUsage: { ALARM: 4 },
    AndroidAudioContentType: { SONIFICATION: 4 }, AndroidNotificationVisibility: { PUBLIC: 1 },
    setNotificationHandler() {},
    setNotificationChannelAsync: async () => {
      calls.push('channel');
      if (settings.channelError) throw settings.channelError;
    },
    getPermissionsAsync: async () => { calls.push('permission'); return settings.permission; },
    requestPermissionsAsync: () => { calls.push('request'); return settings.request(); },
  };
  const modules = {
    react,
    'react-native': native,
    '@react-native-async-storage/async-storage': {
      getItem: async key => storage.get(key) ?? null,
      setItem: async (key, value) => storage.set(key, value),
    },
    'expo-haptics': {}, 'expo-location': {}, 'expo-notifications': notifications,
    'expo-router': { router: {} },
  };
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    if (file.endsWith('.json')) return require(file);
    const exports = {};
    cache.set(file, exports);
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true,
    } }).outputText, { exports, require(spec) {
      if (spec in modules) return modules[spec];
      if (spec.endsWith('/LanguageContext')) return { useLanguage: () => ({ t: text => text }) };
      if (spec.endsWith('/focusControl')) return { focusControl: os === 'android' ? focus : null };
      if (spec.endsWith('/foregroundLocation')) return {};
      if (spec.endsWith('/prayerScheduler')) return { scheduleLabels: () => ({}) };
      if (spec.startsWith('.')) {
        const target = path.resolve(path.dirname(file), spec);
        return load(path.extname(target) ? target : target + '.ts');
      }
      return require(spec);
    }, Date, console, setTimeout, clearTimeout });
    return exports;
  }
  const { AppProvider } = load(path.resolve('src/context/AppContext.tsx'));
  const render = () => {
    cursor = 0;
    return AppProvider({ children: null }).props.children[0].props.value;
  };
  return { render, settings, calls, alerts };
}

async function main() {
  for (const os of ['android', 'ios']) {
    const app = setup(os);
    for (const key of keys) {
      const enable = app.render()[setter(key)](true);
      await flush();
      assert.equal(app.render().data[key], true, `${os}: ${key} enables after notification permission`);
      await enable;
      await app.render()[setter(key)](false);
      assert.equal(app.render().data[key], false, `${os}: ${key} turns off`);
    }
    assert.equal(app.alerts.length, 0, 'Optional alarm, popup, camera and battery setup must not block notification switches');
    assert.ok(!app.calls.includes('request'), 'Granted permission does not prompt again');
  }
  const blocked = setup();
  blocked.settings.permission = { ...denied, canAskAgain: false };
  await blocked.render().setReminderEnabled(true);
  assert.equal(blocked.render().data.reminderEnabled, false);
  assert.ok(!blocked.calls.includes('request'), 'Permanent denial offers Settings instead of requesting again');
  assert.equal(blocked.alerts.length, 1);

  const rejected = setup();
  rejected.settings.permission = denied;
  rejected.settings.request = async () => denied;
  await rejected.render().setDuaReminderEnabled(true);
  assert.equal(rejected.render().data.duaReminderEnabled, false);
  assert.equal(rejected.alerts.length, 1);

  const race = setup();
  let complete;
  race.settings.permission = denied;
  race.settings.request = () => new Promise(resolve => { complete = resolve; });
  const enable = race.render().setPrayerTimeReminderEnabled(true);
  await flush();
  await race.render().setPrayerTimeReminderEnabled(false);
  complete(granted); await enable;
  assert.equal(race.render().data.prayerTimeReminderEnabled, false, 'Disabling while permission is pending wins over the old enable');

  const shared = setup();
  shared.settings.permission = denied;
  shared.settings.request = () => new Promise(resolve => { complete = resolve; });
  const enables = keys.map(key => shared.render()[setter(key)](true));
  await flush();
  assert.equal(shared.calls.filter(call => call === 'request').length, 1, 'Concurrent switches share one permission request');
  complete(granted); await Promise.all(enables);
  keys.forEach(key => assert.equal(shared.render().data[key], true));

  const failure = setup();
  failure.settings.channelError = new Error('channel unavailable');
  await failure.render().setReminderEnabled(true);
  assert.equal(failure.render().data.reminderEnabled, false);
  assert.equal(failure.alerts.length, 1);
  failure.settings.channelError = null;
  await failure.render().setReminderEnabled(true);
  assert.equal(failure.render().data.reminderEnabled, true, 'Permission setup can retry after a native error');
  console.log('PASS: Android/iOS reminder switches, optional settings isolation, granted/denied/permanent permission, pending cancellation, shared prompt and error recovery.');
}
let complete = false;
main().then(() => { complete = true; }).catch(error => { complete = true; console.error(error); process.exitCode = 1; });
process.on('beforeExit', () => { if (!complete) { console.error('FAIL: a reminder switch never completed.'); process.exitCode = 1; } });
