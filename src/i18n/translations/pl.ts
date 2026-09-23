import type { Translations } from '../types';

const pluralRules = new Intl.PluralRules('pl');

/** Polish noun plural: one / few (2-4) / many (0, 5+, teens) forms. */
function polishForm(count: number, one: string, few: string, many: string): string {
  const form = pluralRules.select(count);
  if (form === 'one') return one;
  if (form === 'few') return few;
  return many;
}

export const pl: Translations = {
  // Toolbar
  renameProjectTitle: 'Kliknij, aby zmienić nazwę projektu',
  projectNameLabel: 'Nazwa projektu',
  undoTitle: 'Cofnij (⌘Z)',
  undoLabel: 'Cofnij',
  redoTitle: 'Ponów (⌘⇧Z)',
  redoLabel: 'Ponów',
  saveProjectTitle: 'Zapisz projekt',
  saveProjectUnsavedTitle: 'Zapisz projekt (niezapisane zmiany)',
  importProjectFileTitle: 'Importuj plik projektu',
  exportProjectFileTitle: 'Eksportuj plik projektu',
  exportCsvTitle: 'Eksportuj listę cięć jako CSV',
  pdfButton: 'PDF',
  allSheetsOnOnePage: 'Wszystkie arkusze na jednej stronie',
  downloadPdf: 'Pobierz PDF',
  toggleThemeTitle: 'Przełącz motyw',
  unsavedChangesTitle: 'Niezapisane zmiany',
  languageSwitcherTitle: 'Język',

  // ProjectLibrary
  projectLibraryTitle: 'Biblioteka projektów',
  projectsHeading: 'Projekty',
  saveCurrent: 'Zapisz bieżący',
  newProject: 'Nowy',
  duplicateProject: 'Duplikuj',
  noSavedProjects: 'Brak zapisanych projektów. Kliknij „Zapisz bieżący", aby dodać ten projekt.',
  currentLabel: 'bieżący',
  deleteProjectTitle: 'Usuń projekt',
  defaultProjectName: 'Mój projekt',
  newProjectDefaultName: 'Nowy projekt',
  defaultMaterialName: 'Płyta wiórowa 18mm',

  // Sidebar
  settingsHeading: 'Ustawienia',

  // MaterialManager
  materialsHeading: 'Materiały',
  addMaterialTitle: 'Dodaj materiał',
  nameLabel: 'Nazwa',
  sheetSizeLabel: 'Rozmiar arkusza',
  customOption: 'Niestandardowy',
  widthWithUnit: (unit) => `Szerokość (${unit})`,
  heightWithUnit: (unit) => `Wysokość (${unit})`,
  pricePerSheetLabel: 'Cena za arkusz',
  pieceCountUsingMaterial: (count) =>
    `${count} ${polishForm(count, 'element wykorzystuje', 'elementy wykorzystują', 'elementów wykorzystuje')} ten materiał`,
  removeMaterialTitle: 'Usuń materiał',

  // KerfSettings
  freshEdgeLabel: 'Świeża krawędź',
  trimPerSideLabel: 'Docięcie z każdej strony',
  sawKerfLabel: 'Szerokość rzazu',

  // AlgorithmPicker
  cutModeLabel: 'Tryb cięcia',
  optimalLabel: 'Optymalny',
  optimalDesc: 'Najlepsze wykorzystanie materiału',
  easyCutLabel: 'Proste cięcie',
  easyCutDesc: 'Sekwencyjne cięcia piłą',

  // PieceList
  piecesHeading: 'Elementy',
  totalCount: (count) => `(razem: ${count})`,
  importCsvTitle: 'Importuj CSV',
  addPieceTitle: 'Dodaj element',
  noPiecesYet: 'Brak elementów.',
  addFirstPiece: 'Dodaj pierwszy element',

  // PieceForm
  nameOptionalLabel: 'Nazwa (opcjonalnie)',
  namePlaceholder: 'np. Lewy bok',
  materialLabel: 'Materiał',
  qtyLabel: 'Ilość',
  grainDirectionLabel: 'Kierunek usłojenia',
  grainNone: 'Brak',
  grainHorizontal: 'Poziomy (kierunek szerokości)',
  grainVertical: 'Pionowy (kierunek wysokości)',
  allowRotation: 'Zezwól na obrót',
  priorityPiece: 'Element priorytetowy',
  updateButton: 'Aktualizuj',
  addPieceButton: 'Dodaj element',
  cancelButton: 'Anuluj',

  // PieceRow
  grainIndicator: 'usłojenie',
  edgeIndicator: 'krawędź',
  editPieceTitle: 'Edytuj element',
  deletePieceTitle: 'Usuń element',

  // EdgeBandingPicker
  edgeBandingLabel: 'Oklejanie krawędzi',
  edgeBandingHint: '(kliknij krawędzie, aby okleić)',
  topEdge: 'Górna krawędź',
  bottomEdge: 'Dolna krawędź',
  leftEdge: 'Lewa krawędź',
  rightEdge: 'Prawa krawędź',

  // OffcutStock
  offcutStockHeading: 'Magazyn odpadów',
  saveOffcuts: 'Zapisz odpady',
  saveOffcutsTitle: 'Zapisz wszystkie bieżące odpady jako zapas',
  noSavedOffcuts: 'Brak zapisanych odpadów. Po optymalizacji kliknij „Zapisz odpady", aby ponownie wykorzystać resztki — zapisane odpady są zużywane przed cięciem nowego arkusza.',
  removeOffcutTitle: 'Usuń odpad',

  // LayoutViewer
  addPiecesPrompt: 'Dodaj elementy, aby zobaczyć układ',
  computingLayout: 'Obliczanie układu…',
  sheetCounter: (idx, total) => `Arkusz ${idx} / ${total}`,
  prevSheetTitle: 'Poprzedni arkusz',
  nextSheetTitle: 'Następny arkusz',
  offcutBadge: 'odpad',
  wastePercentOnSheet: (pct) => `${pct}% odpadu na tym arkuszu`,
  unplacedWarning: (count) =>
    `⚠ ${polishForm(
      count,
      `${count} element nie zmieścił się`,
      `${count} elementy nie zmieściły się`,
      `${count} elementów nie zmieściło się`
    )} (zbyt duże na arkusz)`,

  // SummaryPanel
  sheetsLabel: 'Arkusze',
  offcutSuffix: (count) => ` +${count} ${polishForm(count, 'odpad', 'odpady', 'odpadów')}`,
  totalWasteLabel: 'Całkowity odpad',
  materialCostLabel: 'Koszt materiału',
  unplacedLabel: 'Nierozmieszczone',

  // ErrorBoundary
  somethingWentWrong: 'Coś poszło nie tak',
  errorDescription: 'Rozkroj napotkał nieoczekiwany błąd i nie może kontynuować. Twój ostatnio zapisany projekt jest bezpieczny w bibliotece projektów — odświeżenie strony go nie usunie.',
  reloadButton: 'Odśwież',

  // Alerts / confirms
  unsavedChangesConfirm: 'Masz niezapisane zmiany, które zostaną utracone. Kontynuować?',
  deleteProjectConfirm: (name) => `Usunąć „${name}"? Tej operacji nie można cofnąć.`,
  saveFailed: 'Nie udało się zapisać — pamięć przeglądarki może być pełna lub niedostępna.',
  duplicateSaveFailed: 'Nie udało się zapisać duplikatu — pamięć przeglądarki może być pełna lub niedostępna.',
  invalidProjectFile: 'Nieprawidłowy plik projektu.',
  couldNotReadFile: 'Nie udało się odczytać pliku.',
  csvUnmatchedMaterialWarning: (count) =>
    `${polishForm(
      count,
      `${count} element miał`,
      `${count} elementy miały`,
      `${count} elementów miało`
    )} materiał, który nie pasował do żadnego istniejącego materiału, i ${polishForm(count, 'został przypisany', 'zostały przypisane', 'zostały przypisane')} do domyślnego.`,
  pdfGenerationFailed: 'Nie udało się wygenerować pliku PDF. Jeśli aplikacja została właśnie zaktualizowana, spróbuj odświeżyć stronę.',
};
