// A source run (`npm start`, i.e. `electron .`) is never treated as the installed app.
// cue's postinstall renames electron.exe, and Electron decides app.isPackaged from the
// executable's name, so a source run says isPackaged too. process.defaultApp tells them
// apart: Electron sets it whenever an app folder is passed to the Electron binary.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { isInstalled } = require('../publik-updater.cjs');

function withDefaultApp(value, fn) {
  const had = Object.prototype.hasOwnProperty.call(process, 'defaultApp');
  const before = process.defaultApp;
  if (value === undefined) delete process.defaultApp; else process.defaultApp = value;
  try { return fn(); } finally { if (had) process.defaultApp = before; else delete process.defaultApp; }
}

test('isInstalled: the installed app (packaged, no defaultApp) is installed', () => {
  withDefaultApp(undefined, () => assert.equal(isInstalled({ isPackaged: true }), true));
});

test('isInstalled: a source run with the renamed Electron (packaged + defaultApp) is not installed', () => {
  withDefaultApp(true, () => assert.equal(isInstalled({ isPackaged: true }), false));
});

test('isInstalled: a source run with the plain Electron binary is not installed', () => {
  withDefaultApp(true, () => assert.equal(isInstalled({ isPackaged: false }), false));
  withDefaultApp(undefined, () => assert.equal(isInstalled({ isPackaged: false }), false));
});

test('the updater checks and writes its config only for the installed app', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'publik-updater.cjs'), 'utf8');
  const body = src.slice(src.indexOf('function startUpdates('));
  assert.doesNotMatch(body, /app\.isPackaged/, 'startUpdates and updateUI go through isInstalled(app)');
  assert.match(body, /if \(isInstalled\(app\) && process\.env\.PUBLIK_UPDATES !== '0'\) \{/);
});

test('main.js looks up the whisper runtime in the checkout on a source run', () => {
  const main = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
  const fn = main.slice(main.indexOf('function getWhisperRuntime()'), main.indexOf('function publishTranscript('));
  assert.match(fn, /isPackaged: app\.isPackaged && !process\.defaultApp,/);
});
