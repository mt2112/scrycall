import type { Result } from '../utils/result.js';
import type { ImportError } from '../models/errors.js';
import { ok, err } from '../utils/result.js';

interface BulkDataEntry {
  type: string;
  download_uri: string;
  updated_at: string;
}

interface BulkDataResponse {
  data: BulkDataEntry[];
}

const BULK_DATA_URL = 'https://api.scryfall.com/bulk-data';
export const IMPORT_REQUEST_HEADERS = {
  'User-Agent': 'scrycall/0.1.0',
  Accept: 'application/json',
} as const;

export async function fetchBulkDataUri(): Promise<Result<string, ImportError>> {
  try {
    const response = await fetch(BULK_DATA_URL, {
      headers: IMPORT_REQUEST_HEADERS,
    });
    if (!response.ok) {
      return err({
        kind: 'import',
        message: `Failed to fetch bulk data manifest: HTTP ${response.status} ${response.statusText} - ${await response.text()}`,
      });
    }

    const data = (await response.json()) as BulkDataResponse;
    const oracleCards = data.data.find((entry) => entry.type === 'oracle_cards');

    if (!oracleCards) {
      return err({
        kind: 'import',
        message: 'Could not find oracle_cards in bulk data manifest',
      });
    }

    return ok(oracleCards.download_uri);
  } catch (e) {
    return err({
      kind: 'import',
      message: `Failed to fetch bulk data manifest: ${e instanceof Error ? e.message : String(e)}`,
      cause: e instanceof Error ? e : undefined,
    });
  }
}
