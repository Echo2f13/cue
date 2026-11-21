// A build without publik (no app token, or CUE_SKIP_PUBLIK=1) starts with no
// sign-in gate, and so with no publik calls and no usage telemetry.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const main = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');

test('CUE_SKIP_PUBLIK=1 makes the build count as having no publik', () => {
  const decl = main.slice(main.indexOf('const publikBuild = {'), main.indexOf('};', main.indexOf('const publikBuild = {')));
  assert.match(decl, /available: process\.env\.CUE_SKIP_PUBLIK !== '1' && \(publikModule\.hasAppToken\(\) \|\| !!process\.env\.PUBLIK_API_KEY\)/);
});

test('the sign-in gate runs only when the build has publik', () => {
  const body = main.slice(main.indexOf('app.whenReady().then(async () => {'));
  const guard = body.indexOf('if (publikBuild.available) {');
  const gate = body.indexOf('publikModule.ensureSignedIn(gateUI)');
  const apply = body.indexOf('publikApplyGate(gate);');
  assert.ok(guard > -1, 'the gate is guarded by publikBuild.available');
  assert.ok(guard < gate && gate < apply, 'the gate and publikApplyGate sit inside the guard');
  // The guard closes before the permission checks, so a build without publik still reaches them.
  const closeGuard = body.indexOf('\n  }\n', apply);
  assert.ok(closeGuard > -1 && closeGuard < body.indexOf('if (isMac) {'), 'the guard closes before the permission checks');
});

test('usage telemetry starts only from the gate', () => {
  // startTelemetry() is called from ensureSignedIn alone, so skipping the gate sends no usage events.
  assert.doesNotMatch(main, /startTelemetry\(/);
});
