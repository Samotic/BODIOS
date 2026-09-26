#!/usr/bin/env node
'use strict';

/**
 * npm run dev:ios: one command to run Bodios on an iPhone Simulator.
 *
 *   1. Checks prerequisites (full Xcode, Node, node_modules, CocoaPods).
 *   2. Picks and boots an iPhone Simulator (or the one you name).
 *   3. Reuses this project's Metro if it's already running; otherwise starts
 *      it here on a free port. It never stops processes it didn't start.
 *   4. Builds and launches the app with the local `react-native run-ios`.
 *
 * If it started Metro, Metro keeps running in this terminal until Ctrl+C.
 * Two-terminal fallback: `npm start` in one, `npm run ios` in the other.
 */

const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const helpers = require('./lib/dev-ios-helpers');

const ROOT = path.resolve(__dirname, '..');
const RN_BIN = path.join(ROOT, 'node_modules', '.bin', 'react-native');
const METRO_READY_TIMEOUT_MS = 120_000;

const HELP = `Usage: npm run dev:ios -- [options]

Options:
  --simulator <name>   Simulator name, optionally with iOS version:
                       "iPhone 17" or "iPhone 17 (26.0)"
  --udid <udid>        Exact simulator UDID
  --port <number>      Preferred Metro port (default ${helpers.DEFAULT_METRO_PORT})
  -h, --help           Show this help

Environment:
  BODIOS_SIMULATOR     Default for --simulator
  RCT_METRO_PORT       Default for --port

List simulators with: xcrun simctl list devices available`;

/** Problems the user can fix; printed without a stack trace. */
class SetupError extends Error {}

const children = new Set();

function log(message) {
  console.log(`[dev:ios] ${message}`);
}

function runSync(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  return {
    ok: !result.error && result.status === 0,
    stdout: (result.stdout || '').trim(),
    stderr: (
      result.stderr ||
      (result.error && result.error.message) ||
      ''
    ).trim(),
  };
}

function readIfExists(relativePath) {
  const file = path.join(ROOT, relativePath);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
}

function checkPrerequisites() {
  const problems = [];

  if (process.platform !== 'darwin') {
    problems.push('iOS builds need macOS.');
  }

  const engines = JSON.parse(readIfExists('package.json')).engines?.node;
  if (engines && !helpers.satisfiesMinimum(process.version, engines)) {
    problems.push(
      `Node ${process.version} is older than this project needs (${engines}).`,
    );
  }

  const devDir = runSync('xcode-select', ['-p']);
  if (!devDir.ok || !devDir.stdout) {
    problems.push(
      'No Xcode developer directory is selected. Install Xcode from the App Store, then run:\n' +
        '      sudo xcode-select -s /Applications/Xcode.app/Contents/Developer',
    );
  } else if (devDir.stdout.includes('CommandLineTools')) {
    problems.push(
      `Only the Command Line Tools are active (${devDir.stdout}). Full Xcode is required:\n` +
        '      1. Install Xcode from the App Store\n' +
        '      2. sudo xcode-select -s /Applications/Xcode.app/Contents/Developer\n' +
        '      3. Open Xcode once to accept the license and install an iOS Simulator runtime',
    );
  } else {
    const xcodebuild = runSync('xcodebuild', ['-version']);
    if (!xcodebuild.ok) {
      problems.push(
        `xcodebuild failed: ${xcodebuild.stderr || xcodebuild.stdout}\n` +
          '      If this mentions the license, open Xcode once or run: sudo xcodebuild -license accept',
      );
    }
  }

  if (!fs.existsSync(RN_BIN)) {
    problems.push('Dependencies are missing. Run: npm install');
  }

  const pods = helpers.podsStatus(
    readIfExists('ios/Podfile.lock'),
    readIfExists('ios/Pods/Manifest.lock'),
  );
  if (pods === 'not-installed') {
    problems.push(
      'CocoaPods are not installed for this project yet. Run: npm run pods',
    );
  } else if (pods === 'stale') {
    problems.push(
      'ios/Pods is out of date with ios/Podfile.lock (native dependencies changed). Run: npm run pods',
    );
  }

  if (problems.length > 0) {
    throw new SetupError(
      `Can't run on the iOS Simulator yet:\n\n${problems
        .map(p => `  • ${p}`)
        .join('\n')}`,
    );
  }
}

function loadSimulators() {
  const result = runSync('xcrun', [
    'simctl',
    'list',
    'devices',
    'available',
    '--json',
  ]);
  if (!result.ok) {
    throw new SetupError(`Couldn't list simulators: ${result.stderr}`);
  }
  const simulators = helpers.listIphoneSimulators(JSON.parse(result.stdout));
  if (simulators.length === 0) {
    throw new SetupError(
      'No iPhone Simulator is installed. In Xcode open Settings > Components and install an iOS ' +
        'Simulator runtime (or run: xcodebuild -downloadPlatform iOS).',
    );
  }
  return simulators;
}

function bootSimulator(sim) {
  if (sim.state !== 'Booted') {
    log(`Booting ${helpers.describeSimulator(sim)}...`);
    const boot = runSync('xcrun', ['simctl', 'boot', sim.udid]);
    if (!boot.ok && !/current state: Booted/i.test(boot.stderr)) {
      throw new SetupError(`Couldn't boot the simulator: ${boot.stderr}`);
    }
  }
  runSync('open', [
    '-a',
    'Simulator',
    '--args',
    '-CurrentDeviceUDID',
    sim.udid,
  ]);
  const ready = runSync('xcrun', ['simctl', 'bootstatus', sim.udid, '-b']);
  if (!ready.ok) {
    throw new SetupError(
      `The simulator didn't finish booting: ${ready.stderr}`,
    );
  }
}

function track(child) {
  children.add(child);
  child.on('exit', () => children.delete(child));
  return child;
}

function stopChildren(signal = 'SIGTERM') {
  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill(signal);
    }
  }
}

function hasExited(child) {
  return child.exitCode !== null || child.signalCode !== null;
}

function startMetro(port) {
  log(`Starting Metro on port ${port}...`);
  const metro = track(
    spawn(RN_BIN, ['start', '--port', String(port)], {
      cwd: ROOT,
      stdio: 'inherit',
    }),
  );
  metro.on('error', error => log(`Metro failed to start: ${error.message}`));
  return metro;
}

async function waitForMetro(port, metro) {
  const deadline = Date.now() + METRO_READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (hasExited(metro)) {
      throw new SetupError(
        `Metro exited before it was ready (exit code ${metro.exitCode}).`,
      );
    }
    if ((await helpers.probePort(port, ROOT)) === 'ours') {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new SetupError(
    `Metro didn't respond on port ${port} within ${
      METRO_READY_TIMEOUT_MS / 1000
    }s.`,
  );
}

/**
 * Metro is already running for this project on `port`, so run-ios sees it,
 * doesn't open another one, and builds the app to load from that port.
 */
function runIos(sim, port) {
  return new Promise((resolve, reject) => {
    const child = track(
      spawn(RN_BIN, ['run-ios', '--udid', sim.udid, '--port', String(port)], {
        cwd: ROOT,
        stdio: 'inherit',
      }),
    );
    child.on('error', reject);
    child.on('exit', (code, signal) => resolve(code ?? (signal ? 1 : 0)));
  });
}

function waitForExit(child) {
  if (hasExited(child)) {
    return Promise.resolve(child.exitCode ?? 0);
  }
  // Ctrl+C in Metro exits it normally; treat that as success.
  return new Promise(resolve => child.on('exit', code => resolve(code ?? 0)));
}

/** Helper errors (bad flags, unknown simulator, busy ports) are user-fixable. */
async function asSetupError(work) {
  try {
    return await work();
  } catch (error) {
    throw error instanceof SetupError ? error : new SetupError(error.message);
  }
}

async function main() {
  const options = await asSetupError(() =>
    helpers.parseArgs(process.argv.slice(2), process.env),
  );
  if (options.help) {
    console.log(HELP);
    return 0;
  }

  checkPrerequisites();

  const sim = await asSetupError(() =>
    helpers.pickSimulator(loadSimulators(), options),
  );
  log(`Using ${helpers.describeSimulator(sim)}  ${sim.udid}`);
  bootSimulator(sim);

  const { port, reuse, skipped } = await asSetupError(() =>
    helpers.findMetroPort(options.port, ROOT),
  );
  for (const { port: busyPort, state } of skipped) {
    const who =
      state === 'other-metro' ? "another project's Metro" : 'another process';
    log(`Port ${busyPort} is used by ${who}; leaving it alone.`);
  }

  let metro = null;
  if (reuse) {
    log(`Reusing this project's Metro on port ${port}.`);
  } else {
    metro = startMetro(port);
    await waitForMetro(port, metro);
  }

  const code = await runIos(sim, port);
  if (code !== 0) {
    throw new SetupError(
      `react-native run-ios failed (exit code ${code}). See the output above.`,
    );
  }

  if (!metro) {
    log('App launched. Metro keeps running in the terminal that started it.');
    return 0;
  }
  log(
    `App launched. Metro is running here on port ${port}; press Ctrl+C to stop it.`,
  );
  return waitForExit(metro);
}

process.on('SIGINT', () => {
  stopChildren('SIGINT');
  process.exit(130);
});
process.on('SIGTERM', () => {
  stopChildren('SIGTERM');
  process.exit(143);
});
process.on('exit', () => stopChildren());

main().then(
  code => process.exit(code),
  error => {
    const message =
      error instanceof SetupError
        ? error.message
        : error.stack || String(error);
    console.error(`\n[dev:ios] ${message}\n`);
    process.exit(1);
  },
);
