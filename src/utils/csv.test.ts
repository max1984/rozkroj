// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import Papa from 'papaparse';
import { detectUnitFromHeaders, edgesFromString, edgesToString, exportCsv, importCsv, sanitizeCsvField } from './csv';
import { MAX_PIECE_QUANTITY } from '../constants/defaults';
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

  it(
    'regression: an unrecognized Grain cell used to be cast straight through with `as PieceDefinition[\'grain\']` ' +
      '— a compile-time-only cast, so a typo or hand-edited CSV silently stored a value outside the actual ' +
      '\'none\'|\'horizontal\'|\'vertical\' union with no warning, unlike its two siblings right next to it ' +
      '(unmatched Material, invalid dimensions)',
    async () => {
      const csv = 'Name,Width (mm),Height (mm),Quantity,Grain\n'
        + 'Good,600,400,1,horizontal\n'
        + 'Typo,600,400,1,diagonal\n';
      const file = new File([csv], 'test.csv', { type: 'text/csv' });
      const onDone = vi.fn();

      importCsv(file, 'mm', 0, materials, onDone, vi.fn(), 'parse error');

      await vi.waitFor(() => expect(onDone).toHaveBeenCalled());
      const [pieces, , , invalidGrainCount] = onDone.mock.calls[0];
      expect(pieces).toHaveLength(2);
      expect(pieces[0].grain).toBe('horizontal');
      expect(pieces[1].grain).toBe('none');
      expect(invalidGrainCount).toBe(1);
    }
  );

  it('does not count a blank or valid Grain cell as invalid', async () => {
    const csv = 'Name,Width (mm),Height (mm),Quantity,Grain\n'
      + 'NoGrain,600,400,1,\n'
      + 'Vertical,600,400,1,VERTICAL\n';
    const file = new File([csv], 'test.csv', { type: 'text/csv' });
    const onDone = vi.fn();

    importCsv(file, 'mm', 0, materials, onDone, vi.fn(), 'parse error');

    await vi.waitFor(() => expect(onDone).toHaveBeenCalled());
    const [pieces, , , invalidGrainCount] = onDone.mock.calls[0];
    expect(invalidGrainCount).toBe(0);
    expect(pieces[0].grain).toBe('none');
    expect(pieces[1].grain).toBe('vertical');
  });

  it('falls back to a quantity of 1 instead of NaN when the Quantity cell is not a positive integer', async () => {
    const csv = 'Name,Width (mm),Height (mm),Quantity\nShelf,600,400,abc\n';
    const file = new File([csv], 'test.csv', { type: 'text/csv' });
    const onDone = vi.fn();

    importCsv(file, 'mm', 0, materials, onDone, vi.fn(), 'parse error');

    await vi.waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(onDone.mock.calls[0][0][0].quantity).toBe(1);
  });

  it(
    'regression: a Quantity cell wildly above MAX_PIECE_QUANTITY (typo\'d extra digit, hand-edited/foreign ' +
      'export) used to pass straight through to the piece — expandPieces() in optimizer.ts loops that many ' +
      'times per piece to build packable instances, so an unbounded value freezes the tab instead of warning',
    async () => {
      const csv = 'Name,Width (mm),Height (mm),Quantity\nShelf,600,400,50000\n';
      const file = new File([csv], 'test.csv', { type: 'text/csv' });
      const onDone = vi.fn();

      importCsv(file, 'mm', 0, materials, onDone, vi.fn(), 'parse error');

      await vi.waitFor(() => expect(onDone).toHaveBeenCalled());
      const [pieces, , , , excessiveQuantityCount] = onDone.mock.calls[0];
      expect(pieces[0].quantity).toBe(MAX_PIECE_QUANTITY);
      expect(excessiveQuantityCount).toBe(1);
    }
  );

  it('does not count a Quantity at or below MAX_PIECE_QUANTITY as excessive', async () => {
    const csv = `Name,Width (mm),Height (mm),Quantity\nShelf,600,400,${MAX_PIECE_QUANTITY}\n`;
    const file = new File([csv], 'test.csv', { type: 'text/csv' });
    const onDone = vi.fn();

    importCsv(file, 'mm', 0, materials, onDone, vi.fn(), 'parse error');

    await vi.waitFor(() => expect(onDone).toHaveBeenCalled());
    const [pieces, , , , excessiveQuantityCount] = onDone.mock.calls[0];
    expect(pieces[0].quantity).toBe(MAX_PIECE_QUANTITY);
    expect(excessiveQuantityCount).toBe(0);
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

describe('exportCsv', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it(
    'defers revoking the download blob URL instead of revoking it synchronously right after ' +
      'the click — some browsers read the blob asynchronously, so an immediate revoke can race ' +
      'the download and silently abort it (same bug class already fixed for project export in ' +
      'useLocalStorage.ts)',
    () => {
      vi.useFakeTimers();
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
      const materials: MaterialStock[] = [
        { id: 'm1', name: 'Chipboard', color: '#000', size: { label: 'Sheet', width: 2440, height: 1220 }, pricePerSheet: 0 },
      ];

      exportCsv([piece({ top: false, right: false, bottom: false, left: false })], materials, 'mm');
      expect(revokeSpy).not.toHaveBeenCalled();

      vi.runAllTimers();
      expect(revokeSpy).toHaveBeenCalledWith('blob:mock');
    }
  );
});
