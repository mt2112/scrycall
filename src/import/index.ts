import type Database from 'better-sqlite3';
import type { Readable } from 'node:stream';
import type { Result } from '../utils/result.js';
import type { ImportError } from '../models/errors.js';
import type { ImportProgressCallback } from '../models/index.js';
import { ok, err } from '../utils/result.js';
import { fetchBulkDataUri } from './fetch.js';
import { importCards } from './importer.js';
import type { ImportStats } from './importer.js';

export interface ImportOptions {
  readonly force?: boolean;
  readonly onProgress?: ImportProgressCallback;
}

export async function runImport(
  db: Database.Database,
  options: ImportOptions = {},
): Promise<Result<ImportStats, ImportError>> {
  const { onProgress } = options;

  // Fetch the download URI
  onProgress?.({ phase: 'manifest' });
  const uriResult = await fetchBulkDataUri();
  if (!uriResult.ok) return uriResult;

  const downloadUri = uriResult.data;

  // Download the data as a stream
  onProgress?.({ phase: 'download' });
  let response: Response;
  try {
    response = await fetch(downloadUri);
    if (!response.ok) {
      return err({
        kind: 'import',
        message: `Failed to download bulk data: HTTP ${response.status}`,
      });
    }
  } catch (e) {
    return err({
      kind: 'import',
      message: `Failed to download bulk data: ${e instanceof Error ? e.message : String(e)}`,
      cause: e instanceof Error ? e : undefined,
    });
  }

  if (!response.body) {
    return err({ kind: 'import', message: 'Response body is empty' });
  }

  // Convert Web ReadableStream to Node.js Readable
  const { Readable } = await import('node:stream');
  const nodeStream = Readable.fromWeb(response.body as import('node:stream/web').ReadableStream);

  onProgress?.({ phase: 'parse' });
  return importCards(db, nodeStream, onProgress);
}

export { importCards } from './importer.js';
export { fetchBulkDataUri } from './fetch.js';
export type { ImportStats } from './importer.js';
