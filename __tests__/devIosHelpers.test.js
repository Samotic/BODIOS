/**
 * @jest-environment node
 */

const http = require('node:http');
const path = require('node:path');
const {
  parseArgs,
  satisfiesMinimum,
  iosRuntimeVersion,
  listIphoneSimulators,
  pickSimulator,
  podsStatus,
  isSameProjectRoot,
  probePort,
  findMetroPort,
} = require('../scripts/lib/dev-ios-helpers');

const ROOT = path.resolve(__dirname, '..');

const simctlFixture = {
  devices: {
    'com.apple.CoreSimulator.SimRuntime.iOS-18-6': [
      {
        name: 'iPhone 16',
        udid: 'OLD-16',
        state: 'Shutdown',
        isAvailable: true,
      },
    ],
    'com.apple.CoreSimulator.SimRuntime.iOS-26-0': [
      {
        name: 'iPhone 17',
        udid: 'NEW-17',
        state: 'Shutdown',
        isAvailable: true,
      },
      {
        name: 'iPhone 17 Pro',
        udid: 'NEW-17P',
        state: 'Shutdown',
        isAvailable: true,
      },
      {
        name: 'iPad Air 11-inch (M3)',
        udid: 'IPAD',
        state: 'Shutdown',
        isAvailable: true,
      },
      {
        name: 'iPhone 16',
        udid: 'NEW-16',
        state: 'Shutdown',
        isAvailable: true,
      },
    ],
    'com.apple.CoreSimulator.SimRuntime.watchOS-26-0': [
      {
        name: 'Apple Watch Series 11',
        udid: 'WATCH',
        state: 'Shutdown',
        isAvailable: true,
      },
    ],
  },
};

describe('parseArgs', () => {
  test('defaults to port 8081 and no simulator', () => {
    expect(parseArgs([], {})).toEqual({
      simulator: null,
      udid: null,
      port: 8081,
      help: false,
    });
  });

  test('reads flags in both "--flag value" and "--flag=value" form', () => {
    expect(
      parseArgs(['--simulator', 'iPhone 17 (26.0)', '--port=8090'], {}),
    ).toMatchObject({
      simulator: 'iPhone 17 (26.0)',
      port: 8090,
    });
  });

  test('uses env vars as defaults and flags override them', () => {
    const env = { BODIOS_SIMULATOR: 'iPhone 16', RCT_METRO_PORT: '9000' };
    expect(parseArgs([], env)).toMatchObject({
      simulator: 'iPhone 16',
      port: 9000,
    });
    expect(parseArgs(['--port', '9100'], env)).toMatchObject({ port: 9100 });
  });

  test('rejects bad input with a clear message', () => {
    expect(() => parseArgs(['--port', 'abc'], {})).toThrow('Invalid port');
    expect(() => parseArgs(['--udid'], {})).toThrow('--udid needs a value');
    expect(() => parseArgs(['--fast'], {})).toThrow('Unknown option: --fast');
  });
});

test('satisfiesMinimum compares Node versions numerically', () => {
  expect(satisfiesMinimum('v24.21.0', '>= 22.11.0')).toBe(true);
  expect(satisfiesMinimum('v22.9.0', '>= 22.11.0')).toBe(false);
  expect(satisfiesMinimum('v22.11.0', '>= 22.11.0')).toBe(true);
});

describe('simulators', () => {
  const sims = listIphoneSimulators(simctlFixture);

  test('keeps only iPhones on iOS runtimes', () => {
    expect(
      iosRuntimeVersion('com.apple.CoreSimulator.SimRuntime.iOS-26-0'),
    ).toBe('26.0');
    expect(
      iosRuntimeVersion('com.apple.CoreSimulator.SimRuntime.watchOS-26-0'),
    ).toBeNull();
    expect(sims.map(s => s.udid)).toEqual([
      'OLD-16',
      'NEW-17',
      'NEW-17P',
      'NEW-16',
    ]);
  });

  test('defaults to the first iPhone on the newest runtime', () => {
    expect(pickSimulator(sims).udid).toBe('NEW-17');
  });

  test('prefers a simulator that is already booted', () => {
    const withBooted = sims.map(s =>
      s.udid === 'OLD-16' ? { ...s, state: 'Booted' } : s,
    );
    expect(pickSimulator(withBooted).udid).toBe('OLD-16');
  });

  test('matches by name, and by name plus iOS version', () => {
    expect(pickSimulator(sims, { simulator: 'iPhone 16' }).udid).toBe('NEW-16');
    expect(pickSimulator(sims, { simulator: 'iPhone 16 (18.6)' }).udid).toBe(
      'OLD-16',
    );
    expect(pickSimulator(sims, { simulator: 'iPhone 16 (18)' }).udid).toBe(
      'OLD-16',
    );
  });

  test('explains what is available when nothing matches', () => {
    expect(() => pickSimulator(sims, { simulator: 'iPhone 99' })).toThrow(
      /No available simulator matches "iPhone 99"[\s\S]*iPhone 17 \(iOS 26\.0\)/,
    );
    expect(() => pickSimulator(sims, { udid: 'NOPE' })).toThrow('UDID NOPE');
    expect(() => pickSimulator([])).toThrow('No iPhone simulators');
  });
});

test('podsStatus detects missing and stale Pods', () => {
  expect(podsStatus(null, null)).toBe('not-installed');
  expect(podsStatus('lock-a', null)).toBe('not-installed');
  expect(podsStatus('lock-a', 'lock-b')).toBe('stale');
  expect(podsStatus('lock-a', 'lock-a')).toBe('ok');
});

test('isSameProjectRoot decodes the header Metro sends', () => {
  expect(isSameProjectRoot('/Users/sam/My%20App', '/Users/sam/My App')).toBe(
    true,
  );
  expect(isSameProjectRoot('/Users/sam/Other', '/Users/sam/My App')).toBe(
    false,
  );
  expect(isSameProjectRoot(undefined, '/Users/sam/My App')).toBe(false);
});

describe('Metro port detection (fake local servers)', () => {
  const servers = [];

  function serve(handler) {
    return new Promise(resolve => {
      const server = http.createServer(handler);
      servers.push(server);
      server.listen(0, () => resolve(server.address().port));
    });
  }

  const metroFor = root => (req, res) => {
    res.setHeader('X-React-Native-Project-Root', encodeURI(root));
    res.end('packager-status:running');
  };

  afterAll(async () => {
    await Promise.all(
      servers.map(s => new Promise(resolve => s.close(resolve))),
    );
  });

  test('recognises this project, another project and a non-Metro server', async () => {
    const ours = await serve(metroFor(ROOT));
    const other = await serve(metroFor('/somewhere/else'));
    const web = await serve((req, res) => res.end('<html>hello</html>'));

    expect(await probePort(ours, ROOT)).toBe('ours');
    expect(await probePort(other, ROOT)).toBe('other-metro');
    expect(await probePort(web, ROOT)).toBe('occupied');
  });

  test('reports a closed port as free', async () => {
    const port = await serve(() => {});
    await new Promise(resolve => servers.pop().close(resolve));
    expect(await probePort(port, ROOT)).toBe('free');
  });

  test('findMetroPort reuses this project, else takes the first free port', async () => {
    const states = {
      8081: 'other-metro',
      8082: 'occupied',
      8083: 'free',
      8084: 'ours',
    };
    const probe = async port => states[port] ?? 'free';

    expect(await findMetroPort(8081, ROOT, { probe })).toEqual({
      port: 8084,
      reuse: true,
      // Only busy ports are reported; the free 8083 isn't "in use".
      skipped: [
        { port: 8081, state: 'other-metro' },
        { port: 8082, state: 'occupied' },
      ],
    });

    delete states[8084];
    expect(await findMetroPort(8081, ROOT, { probe })).toEqual({
      port: 8083,
      reuse: false,
      skipped: [
        { port: 8081, state: 'other-metro' },
        { port: 8082, state: 'occupied' },
      ],
    });

    await expect(
      findMetroPort(8081, ROOT, { probe: async () => 'occupied' }),
    ).rejects.toThrow('all in use');
  });
});
