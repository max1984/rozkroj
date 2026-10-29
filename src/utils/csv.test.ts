// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import Papa from 'papaparse';
import { detectUnitFromHeaders, edgesFromString, edgesToString, importCsv, sanitizeCsvField } from './csv';
import type { MaterialStock, PieceDefinition } from '../types';

function piece(edgeBanding: PieceDefinition['edgeBanding']): PieceDefinition {
  return {
    id: 'p1', name: 'Piece', materialId: 'm1', width: 100, height: 100, quantity: 1,
    grain: 'none', rotationAllowed: true, priority: false, edgeBanding, color: '#000000',
  };
}

describe('detectUnitFromHeaders', () => {
  it('detects mm from a "Width (mm)" column', () => {
    expect(detectUnitFromHeaders(['Name', 'Width (mm)', 'Height (mm)'], 'inch')).toBe('mm');
  });

  it('detects inch from a "Width (inch)" column', () => {
    expect(detectUnitFromHeaders(['Name', 'Width (inch)', 'Height (inch)'], 'mm')).toBe('inch');
  });

  it('is case-insensitive when matching the width column', () => {
    expect(detectUnitFromHeaders(['name', 'WIDTH (INCH)'], 'mm')).toBe('inch');
  });

  it('falls back to the given default when no width column is present', () => {
    expect(detectUnitFromHeaders(['Name', 'Quantity'], 'inch')).toBe('inch');
  });

  it('falls back to the given default when fields is undefined', () => {
    expect(detectUnitFromHeaders(undefined, 'mm')).toBe('mm');
  });

  it('falls back to the given default when a width column has no unit annotation', () => {
    expect(detectUnitFromHeaders(['Name', 'Width', 'Height'], 'inch')).toBe('inch');
  });
});

describe('edgesToString', () => {
  it('returns an empty string when no edges are banded', () => {
    expect(edgesToString(piece({ top: false, right: false, bottom: false, left: false }))).toBe('');
  });

  it('joins banded edges with +, in top/right/bottom/left order', () => {
    expect(edgesToString(piece({ top: true, right: false, bottom: true, left: true }))).toBe('top+bottom+left');
  });

  it('includes all four edges when fully banded', () => {
    expect(edgesToString(piece({ top: true, right: true, bottom: true, left: true }))).toBe('top+right+bottom+left');
  });
});

describe('edgesFromString', () => {
  it('parses a +-joined edge list', () => {
    expect(edgesFromString('top+left')).toEqual({ top: true, right: false, bottom: false, left: true });
  });

  it('is case-insensitive and tolerates surrounding whitespace', () => {
    expect(edgesFromString(' TOP + Right ')).toEqual({ top: true, right: true, bottom: false, left: false });
  });

  it('returns all-false for undefined', () => {
    expect(edgesFromString(undefined)).toEqual({ top: false, right: false, bottom: false, left: false });
  });

  it('returns all-false for an empty string', () => {
    expect(edgesFromString('')).toEqual({ top: false, right: false, bottom: false, left: false });
  });

  it('round-trips through edgesToString', () => {
    const banding = { top: true, right: false, bottom: true, left: false };
    expect(edgesFromString(edgesToString(piece(banding)))).toEqual(banding);
  });
});

describe('sanitizeCsvField', () => {
  it('leaves an ordinary name untouched', () => {
    expect(sanitizeCsvField('Left Side Panel')).toBe('Left Side Panel');
  });

  it('prefixes a value starting with = to neutralize spreadsheet formula execution', () => {
    expect(sanitizeCsvField('=cmd|\'/c calc\'!A1')).toBe('\'=cmd|\'/c calc\'!A1');
  });

  it('prefixes values starting with +, -, or @', () => {
    expect(sanitizeCsvField('+1234567890')).toBe("'+1234567890");
    expect(sanitizeCsvField('-1')).toBe("'-1");
    expect(sanitizeCsvField('@SUM(A1)')).toBe("'@SUM(A1)");
  });

  it('does not touch a name that merely contains one of those characters mid-string', () => {
    expect(sanitizeCsvField('Shelf - Left')).toBe('Shelf - Left');
    expect(sanitizeCsvField('A+B panel')).toBe('A+B panel');
  });

  it('leaves an empty string untouched', () => {
    expect(sanitizeCsvField('')).toBe('');
  });
});

describe('importCsv', () => {
  const materials: MaterialStock[] = [
    { id: 'm1', name: 'Chipboard', color: '#000', size: { label: 'Sheet', width: 2440, height: 1220 }, pricePerSheet: 0 },
  ];

  it('counts rows whose Material matches nothing and assigns them to the default material', async () => {
    const csv = 'Name,Material,Width (mm),Height (mm),Quantity\nShelf,Chipboard,600,400,1\nDoor,Unknown Wood,500,300,1\n';
    const file = new File([csv], 'test.csv', { type: 'text/csv' });
    const onDone = vi.fn();

    importCsv(file, 'mm', 0, materials, onDone, vi.fn(), 'parse error');

    await vi.waitFor(() => expect(onDone).toHaveBeenCalled());
    const [pieces, unmatchedMaterialCount] = onDone.mock.calls[0];
    expect(unmatchedMaterialCount).toBe(1);
    expect(pieces).toHaveLength(2);
    expect(pieces[0].materialId).toBe('m1');
    expect(pieces[1].materialId).toBe('m1'); // fell back to the only/default material
  });

  it('does not count a blank Material cell as unmatched', async () => {
    const csv = 'Name,Width (mm),Height (mm),Quantity\nShelf,600,400,1\n';
    const file = new File([csv], 'test.csv', { type: 'text/csv' });
    const onDone = vi.fn();

    importCsv(file, 'mm', 0, materials, onDone, vi.fn(), 'parse error');

    await vi.waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(onDone.mock.calls[0][1]).toBe(0);
  });

  it('is case-insensitive when matching Material names', async () => {
    const csv = 'Name,Material,Width (mm),Height (mm),Quantity\nShelf,CHIPBOARD,600,400,1\n';
    const file = new File([csv], 'test.csv', { type: 'text/csv' });
    const onDone = vi.fn();

    importCsv(file, 'mm', 0, materials, onDone, vi.fn(), 'parse error');

    await vi.waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(onDone.mock.calls[0][1]).toBe(0);
    expect(onDone.mock.calls[0][0][0].materialId).toBe('m1');
  });

  it('drops rows with a non-numeric or zero/negative Width or Height, and counts them', async () => {
    const csv = 'Name,Width (mm),Height (mm),Quantity\n'
      + 'Good,600,400,1\n'
      + 'BadWidth,abc,400,1\n'
      + 'ZeroHeight,600,0,1\n';
    const file = new File([csv], 'test.csv', { type: 'text/csv' });
    const onDone = vi.fn();

    importCsv(file, 'mm', 0, materials, onDone, vi.fn(), 'parse error');

    await vi.waitFor(() => expect(onDone).toHaveBeenCalled());
    const [pieces, , invalidDimensionCount] = onDone.mock.calls[0];
    expect(pieces).toHaveLength(1);
    expect(pieces[0].name).toBe('Good');
    expect(invalidDimensionCount).toBe(2);
  });

  it('falls back to a quantity of 1 instead of NaN when the Quantity cell is not a positive integer', async () => {
    const csv = 'Name,Width (mm),Height (mm),Quantity\nShelf,600,400,abc\n';
    const file = new File([csv], 'test.csv', { type: 'text/csv' });
    const onDone = vi.fn();

    importCsv(file, 'mm', 0, materials, onDone, vi.fn(), 'parse error');

    await vi.waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(onDone.mock.calls[0][0][0].quantity).toBe(1);
  });

  describe('error paths', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it(
      'regression: reports the translated parseErrorMessage, not the raw Papa.parse error, ' +
        "when the file itself can't be read — the untranslated err.message used to leak " +
        'straight into the alert() shown to PL/DE users',
      async () => {
        vi.spyOn(Papa, 'parse').mockImplementation(((_file: File, config: { error: (err: { message: string }) => void }) => {
          config.error({ message: 'raw I/O failure' });
        }) as unknown as typeof Papa.parse);
        const file = new File(['irrelevant'], 'test.csv', { type: 'text/csv' });
        const onError = vi.fn();

        importCsv(file, 'mm', 0, materials, vi.fn(), onError, 'Nie udało się wczytać pliku CSV.');

        expect(onError).toHaveBeenCalledWith('Nie udało się wczytać pliku CSV.');
      }
    );

    it(
      'regression: reports the translated parseErrorMessage, not a hardcoded English string, ' +
        'when processing the already-parsed rows throws',
      async () => {
        // result.data.forEach(...) throws on null — the same shape a
        // genuinely malformed/unexpected parse result would take.
        vi.spyOn(Papa, 'parse').mockImplementation(((_file: File, config: { complete: (r: { data: null; meta: object }) => void }) => {
          config.complete({ data: null, meta: {} });
        }) as unknown as typeof Papa.parse);
        const file = new File(['irrelevant'], 'test.csv', { type: 'text/csv' });
        const onError = vi.fn();

        importCsv(file, 'mm', 0, materials, vi.fn(), onError, 'Nie udało się wczytać pliku CSV.');

        expect(onError).toHaveBeenCalledWith('Nie udało się wczytać pliku CSV.');
      }
    );
  });
});
