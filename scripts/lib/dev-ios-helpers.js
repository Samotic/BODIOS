'use strict';

/**
 * Helpers for scripts/dev-ios.js, kept separate so they can be unit tested
 * without Xcode (see __tests__/devIosHelpers.test.js).
 */

const http = require('node:http');
const net = require('node:net');

const DEFAULT_METRO_PORT = 8081;

function parsePort(value, source) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid port from ${source}: "${value}"`);
  }
  return port;
}

/**
 * Parses `npm run dev:ios -- [--simulator "iPhone 17"] [--udid UDID] [--port 8081]`.
 * BODIOS_SIMULATOR and RCT_METRO_PORT env vars act as defaults.
 */
function parseArgs(argv, env = {}) {
  const options = {
    simulator: env.BODIOS_SIMULATOR || null,
    udid: null,
    port: env.RCT_METRO_PORT
      ? parsePort(env.RCT_METRO_PORT, 'RCT_METRO_PORT')
      : DEFAULT_METRO_PORT,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const eq = arg.indexOf('=');
    const flag = eq === -1 ? arg : arg.slice(0, eq);
    const takeValue = () => {
      if (eq !== -1) {
        return arg.slice(eq + 1);
      }
      const value = argv[++i];
      if (value === undefined || value.startsWith('--')) {
        throw new Error(`${flag} needs a value`);
      }
      return value;
    };

    switch (flag) {
      case '--simulator':
        options.simulator = takeValue();
        break;
      case '--udid':
        options.udid = takeValue();
        break;
      case '--port':
        options.port = parsePort(takeValue(), '--port');
        break;
      case '-h':
      case '--help':
        options.help = true;
        break;
      default:
        throw new Error(`Unknown option: ${arg} (try --help)`);
    }
  }
  return options;
}

/** Compares dotted versions: negative if a < b, 0 if equal, positive if a > b. */
function compareVersions(a, b) {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) {
      return diff;
    }
  }
  return 0;
}

/** Checks a Node version like "v24.21.0" against an engines range like ">= 22.11.0". */
function satisfiesMinimum(version, range) {
  const match = /^>=\s*(\d+(?:\.\d+)*)$/.exec(String(range).trim());
  if (!match) {
    return true; // Unknown range format: don't block on it.
  }
  return compareVersions(String(version).replace(/^v/, ''), match[1]) >= 0;
}

/** "com.apple.CoreSimulator.SimRuntime.iOS-26-0" -> "26.0"; null for watchOS, tvOS, etc. */
function iosRuntimeVersion(runtimeId) {
  const match = /SimRuntime\.iOS-(\d+(?:-\d+)*)$/.exec(runtimeId);
  return match ? match[1].replace(/-/g, '.') : null;
}

/** Flattens `xcrun simctl list devices available --json` into iPhone simulators. */
function listIphoneSimulators(simctlJson) {
  const simulators = [];
  for (const [runtimeId, devices] of Object.entries(simctlJson.devices || {})) {
    const iosVersion = iosRuntimeVersion(runtimeId);
    if (!iosVersion) {
      continue;
    }
    for (const device of devices) {
      if (device.isAvailable === false || !/^iPhone\b/.test(device.name)) {
        continue;
      }
      simulators.push({
        name: device.name,
        udid: device.udid,
        state: device.state,
        iosVersion,
      });
    }
  }
  return simulators;
}

function describeSimulator(sim) {
  return `${sim.name} (iOS ${sim.iosVersion})`;
}

/** Newest iOS runtime first; keeps simctl's order within a runtime (stable sort). */
function newestFirst(simulators) {
  return [...simulators].sort((a, b) =>
    compareVersions(b.iosVersion, a.iosVersion),
  );
}

/**
 * Chooses the simulator to run on:
 *   1. an explicit --udid, or --simulator "iPhone 17" / "iPhone 17 (26.0)"
 *   2. an iPhone simulator that's already booted
 *   3. the first iPhone on the newest installed iOS runtime
 */
function pickSimulator(simulators, { udid, simulator } = {}) {
  const available = () =>
    newestFirst(simulators)
      .map(s => `  - ${describeSimulator(s)}  ${s.udid}`)
      .join('\n');

  if (simulators.length === 0) {
    throw new Error('No iPhone simulators are available.');
  }

  if (udid) {
    const match = simulators.find(s => s.udid === udid);
    if (!match) {
      throw new Error(
        `No available iPhone simulator has UDID ${udid}. Available:\n${available()}`,
      );
    }
    return match;
  }

  if (simulator) {
    const parsed = /^(.*?)\s*\((\d+(?:\.\d+)*)\)$/.exec(simulator.trim());
    const name = parsed ? parsed[1] : simulator.trim();
    const version = parsed ? parsed[2] : null;
    const matches = simulators.filter(
      s =>
        s.name === name &&
        (!version ||
          s.iosVersion === version ||
          s.iosVersion.startsWith(`${version}.`)),
    );
    if (matches.length === 0) {
      throw new Error(
        `No available simulator matches "${simulator}". Available:\n${available()}`,
      );
    }
    return newestFirst(matches)[0];
  }

  const booted = simulators.filter(s => s.state === 'Booted');
  return newestFirst(booted.length > 0 ? booted : simulators)[0];
}

/**
 * CocoaPods writes the same lockfile to ios/Podfile.lock and
 * ios/Pods/Manifest.lock. Missing or different means `pod install` is needed.
 */
function podsStatus(podfileLock, manifestLock) {
  if (podfileLock == null || manifestLock == null) {
    return 'not-installed';
  }
  return podfileLock === manifestLock ? 'ok' : 'stale';
}

/** Metro reports its project root in the X-React-Native-Project-Root header. */
function isSameProjectRoot(headerValue, projectRoot) {
  if (!headerValue) {
    return false;
  }
  let decoded = String(headerValue);
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // Keep the raw value.
  }
  const normalize = p => p.replace(/\/+$/, '');
  return normalize(decoded) === normalize(projectRoot);
}

/** True if nothing is listening on the port (we could bind it). */
function canListen(port) {
  return new Promise(resolve => {
    const server = net.createServer();
    server.unref();
    server.once('error', () => resolve(false));
    server.listen(port, () => server.close(() => resolve(true)));
  });
}

/**
 * What's on a port, from this project's point of view:
 *   'ours'        - Metro serving this project (reuse it)
 *   'other-metro' - Metro serving a different project (leave it alone)
 *   'occupied'    - some other process (leave it alone)
 *   'free'        - nothing listening
 */
function probePort(port, projectRoot, { timeoutMs = 1500 } = {}) {
  return new Promise(resolve => {
    const request = http.get(
      { host: 'localhost', port, path: '/status', timeout: timeoutMs },
      response => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', chunk => {
          body += chunk;
        });
        response.on('end', () => {
          if (body.trim() !== 'packager-status:running') {
            resolve('occupied');
          } else if (
            isSameProjectRoot(
              response.headers['x-react-native-project-root'],
              projectRoot,
            )
          ) {
            resolve('ours');
          } else {
            resolve('other-metro');
          }
        });
      },
    );
    request.on('timeout', () => {
      request.destroy();
      resolve('occupied');
    });
    request.on('error', async () => {
      // No HTTP answer. It's only free if we can actually bind it.
      resolve((await canListen(port)) ? 'free' : 'occupied');
    });
  });
}

/**
 * Finds where Metro should run, starting at `preferredPort`. Reuses this
 * project's Metro if it's already on one of the next few ports; otherwise
 * returns the first free port. Never touches processes it didn't start.
 */
async function findMetroPort(
  preferredPort,
  projectRoot,
  { attempts = 10, probe = probePort } = {},
) {
  const states = [];
  for (let port = preferredPort; port < preferredPort + attempts; port++) {
    const state = await probe(port, projectRoot);
    if (state === 'ours') {
      return {
        port,
        reuse: true,
        skipped: states.filter(s => s.state !== 'free'),
      };
    }
    states.push({ port, state });
  }
  const free = states.find(s => s.state === 'free');
  if (!free) {
    throw new Error(
      `Ports ${preferredPort}-${
        preferredPort + attempts - 1
      } are all in use. ` + 'Free one or pass --port <number>.',
    );
  }
  return {
    port: free.port,
    reuse: false,
    skipped: states.filter(s => s.port < free.port),
  };
}

module.exports = {
  DEFAULT_METRO_PORT,
  parseArgs,
  compareVersions,
  satisfiesMinimum,
  iosRuntimeVersion,
  listIphoneSimulators,
  describeSimulator,
  pickSimulator,
  podsStatus,
  isSameProjectRoot,
  canListen,
  probePort,
  findMetroPort,
};
