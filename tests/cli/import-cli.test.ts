import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const closeMock = vi.fn();
  return {
    closeMock,
    openDatabaseMock: vi.fn(() => ({ close: closeMock })),
    runImportMock: vi.fn(),
  };
});

vi.mock('../../src/db/connection.js', () => ({
  openDatabase: mocks.openDatabaseMock,
}));

vi.mock('../../src/import/index.js', () => ({
  runImport: mocks.runImportMock,
}));

import { makeImportCommand } from '../../src/cli/commands/import.js';

describe('CLI import command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = 0;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.exitCode = 0;
  });

  it('rejects --force explicitly before opening the database', async () => {
    const command = makeImportCommand();

    await command.parseAsync(['--force'], { from: 'user' });

    expect(console.error).toHaveBeenCalledWith(
      'Import failed: --force is not currently supported; run scrycall import without --force.',
    );
    expect(process.exitCode).toBe(1);
    expect(mocks.openDatabaseMock).not.toHaveBeenCalled();
    expect(mocks.runImportMock).not.toHaveBeenCalled();
    expect(mocks.closeMock).not.toHaveBeenCalled();
  });
});