import { describe, it, expect, vi, afterEach } from 'vitest';
import * as child_process from 'node:child_process';
import { openInBrowser } from '../../src/utils/browser.js';

vi.mock('node:child_process', () => ({
  execFile: vi.fn((_cmd, _args, cb) => {
    cb(null);
    return { unref: vi.fn() };
  }),
}));

describe('openInBrowser', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses cmd /c start on Windows', () => {
    vi.stubGlobal('process', { ...process, platform: 'win32' });
    openInBrowser('https://scryfall.com/card/lea/161');

    expect(child_process.execFile).toHaveBeenCalledWith(
      'cmd',
      ['/c', 'start', '""', 'https://scryfall.com/card/lea/161'],
      expect.any(Function),
    );
  });

  it('uses open on macOS', () => {
    vi.stubGlobal('process', { ...process, platform: 'darwin' });
    openInBrowser('https://scryfall.com/card/lea/161');

    expect(child_process.execFile).toHaveBeenCalledWith(
      'open',
      ['https://scryfall.com/card/lea/161'],
      expect.any(Function),
    );
  });

  it('uses xdg-open on Linux', () => {
    vi.stubGlobal('process', { ...process, platform: 'linux' });
    openInBrowser('https://scryfall.com/card/lea/161');

    expect(child_process.execFile).toHaveBeenCalledWith(
      'xdg-open',
      ['https://scryfall.com/card/lea/161'],
      expect.any(Function),
    );
  });

  it('prints error to stderr on failure', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(child_process.execFile).mockImplementation((_cmd: any, _args: any, cb: any) => {
      cb(new Error('no display'));
      return { unref: vi.fn() } as any;
    });

    openInBrowser('https://scryfall.com/card/lea/161');

    expect(errorSpy).toHaveBeenCalledWith('Could not open browser: no display');
  });
});
