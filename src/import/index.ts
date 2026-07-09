import type Database from 'better-sqlite3';
import type { Readable } from 'node:stream';
import type { Result } from '../utils/result.js';
import type { ImportError } from '../models/errors.js';
import type { ImportProgressCallback } from '../models/index.js';
import { ok, err } from '../utils/result.js';
import { fetchBulkDataUri, fetchOracleTagsUri, downloadBulkData, IMPORT_REQUEST_HEADERS } from './fetch.js';
import { importCards, importOracleTags } from './importer.js';
import type { ImportStats } from './importer.js';

export interface ImportOptions {
  readonly force?: boolean;
  readonly onProgress?: ImportProgressCallback;
}

export async function runImport(
  db: Database.Database,
  options: ImportOptions = {},
): Promise<Result<ImportStats, ImportError>> {
  const { onProgress, force } = options;

  if (force) {
    return err({
      kind: 'import',
      message: '--force is not currently supported; run scrycall import without --force.',
    });
  }

  // Fetch the download URI
  onProgress?.({ phase: 'manifest' });
  const uriResult = await fetchBulkDataUri();
  if (!uriResult.ok) return uriResult;

  const downloadUri = uriResult.data;

  // Download the data as a stream
  onProgress?.({ phase: 'download' });
  let response: Response;
  try {
    response = await fetch(downloadUri, {
      headers: IMPORT_REQUEST_HEADERS,
    });
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
  const cardsResult = await importCards(db, nodeStream, onProgress);
  if (!cardsResult.ok) return cardsResult;

  // Import oracle tags (allow database to stabilize first)
  try {
    // Let the card import transaction fully settle
    await new Promise((resolve) => setTimeout(resolve, 100));

    const oracleTagsUriResult = await fetchOracleTagsUri();
    if (!oracleTagsUriResult.ok) {
      console.warn(`Oracle tags: ${oracleTagsUriResult.error.message}`);
    } else {
      const oracleTagsStream = await downloadBulkData(oracleTagsUriResult.data);
      if (!oracleTagsStream.ok) {
        console.warn(`Oracle tags: ${oracleTagsStream.error.message}`);
      } else {
        const oracleTagsResult = await importOracleTags(db, oracleTagsStream.data);
        if (!oracleTagsResult.ok) {
          console.warn(`Oracle tags: ${oracleTagsResult.error.message}`);
        }
      }
    }
  } catch (e) {
    console.warn(`Oracle tags: ${e instanceof Error ? e.message : String(e)}`);
  }

  return cardsResult;
}

export { importCards, importOracleTags } from './importer.js';
export { fetchBulkDataUri, fetchOracleTagsUri, downloadBulkData } from './fetch.js';
export type { ImportStats } from './importer.js';
