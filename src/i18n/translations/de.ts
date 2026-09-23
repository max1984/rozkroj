import type { Translations } from '../types';

export const de: Translations = {
  // Toolbar
  renameProjectTitle: 'Klicken, um Projektnamen zu ändern',
  projectNameLabel: 'Projektname',
  undoTitle: 'Rückgängig (⌘Z)',
  undoLabel: 'Rückgängig',
  redoTitle: 'Wiederholen (⌘⇧Z)',
  redoLabel: 'Wiederholen',
  saveProjectTitle: 'Projekt speichern',
  saveProjectUnsavedTitle: 'Projekt speichern (ungespeicherte Änderungen)',
  importProjectFileTitle: 'Projektdatei importieren',
  exportProjectFileTitle: 'Projektdatei exportieren',
  exportCsvTitle: 'Zuschnittliste als CSV exportieren',
  pdfButton: 'PDF',
  allSheetsOnOnePage: 'Alle Platten auf einer Seite',
  downloadPdf: 'PDF herunterladen',
  toggleThemeTitle: 'Design umschalten',
  unsavedChangesTitle: 'Ungespeicherte Änderungen',
  languageSwitcherTitle: 'Sprache',

  // ProjectLibrary
  projectLibraryTitle: 'Projektbibliothek',
  projectsHeading: 'Projekte',
  saveCurrent: 'Aktuelles speichern',
  newProject: 'Neu',
  duplicateProject: 'Duplizieren',
  noSavedProjects: 'Noch keine gespeicherten Projekte. Klicken Sie auf „Aktuelles speichern", um dieses hinzuzufügen.',
  currentLabel: 'aktuell',
  deleteProjectTitle: 'Projekt löschen',

  // Sidebar
  settingsHeading: 'Einstellungen',

  // MaterialManager
  materialsHeading: 'Materialien',
  addMaterialTitle: 'Material hinzufügen',
  nameLabel: 'Name',
  sheetSizeLabel: 'Plattengröße',
  customOption: 'Benutzerdefiniert',
  widthWithUnit: (unit) => `Breite (${unit})`,
  heightWithUnit: (unit) => `Höhe (${unit})`,
  pricePerSheetLabel: 'Preis pro Platte',
  pieceCountUsingMaterial: (count) => `${count} Teil${count !== 1 ? 'e' : ''} verwend${count !== 1 ? 'en' : 'et'} dieses Material`,
  removeMaterialTitle: 'Material entfernen',

  // KerfSettings
  freshEdgeLabel: 'Frische Kante',
  trimPerSideLabel: 'Zuschnitt pro Seite',
  sawKerfLabel: 'Sägeblattstärke',

  // AlgorithmPicker
  cutModeLabel: 'Schnittmodus',
  optimalLabel: 'Optimal',
  optimalDesc: 'Beste Materialausnutzung',
  easyCutLabel: 'Einfacher Schnitt',
  easyCutDesc: 'Sequenzielle Sägeschnitte',

  // PieceList
  piecesHeading: 'Teile',
  totalCount: (count) => `(${count} insgesamt)`,
  importCsvTitle: 'CSV importieren',
  addPieceTitle: 'Teil hinzufügen',
  noPiecesYet: 'Noch keine Teile.',
  addFirstPiece: 'Erstes Teil hinzufügen',

  // PieceForm
  nameOptionalLabel: 'Name (optional)',
  namePlaceholder: 'z. B. Linke Seite',
  materialLabel: 'Material',
  qtyLabel: 'Menge',
  grainDirectionLabel: 'Faserrichtung',
  grainNone: 'Keine',
  grainHorizontal: 'Horizontal (Breitenrichtung)',
  grainVertical: 'Vertikal (Höhenrichtung)',
  allowRotation: 'Drehung erlauben',
  priorityPiece: 'Prioritätsteil',
  updateButton: 'Aktualisieren',
  addPieceButton: 'Teil hinzufügen',
  cancelButton: 'Abbrechen',

  // PieceRow
  grainIndicator: 'Faser',
  editPieceTitle: 'Teil bearbeiten',
  deletePieceTitle: 'Teil löschen',

  // EdgeBandingPicker
  edgeBandingLabel: 'Kantenumleimung',
  edgeBandingHint: '(Kanten anklicken zum Umleimen)',
  topEdge: 'Obere Kante',
  bottomEdge: 'Untere Kante',
  leftEdge: 'Linke Kante',
  rightEdge: 'Rechte Kante',

  // OffcutStock
  offcutStockHeading: 'Reststücklager',
  saveOffcuts: 'Reststücke speichern',
  saveOffcutsTitle: 'Alle aktuellen Reststücke als Lagerbestand speichern',
  noSavedOffcuts: 'Keine gespeicherten Reststücke. Klicken Sie nach der Optimierung auf „Reststücke speichern", um Restteile wiederzuverwenden — gespeicherte Reststücke werden vor dem Zuschnitt einer neuen Platte verwendet.',
  removeOffcutTitle: 'Reststück entfernen',

  // LayoutViewer
  addPiecesPrompt: 'Teile hinzufügen, um das Layout zu sehen',
  computingLayout: 'Layout wird berechnet…',
  sheetCounter: (idx, total) => `Platte ${idx} / ${total}`,
  prevSheetTitle: 'Vorherige Platte',
  nextSheetTitle: 'Nächste Platte',
  offcutBadge: 'Reststück',
  wastePercentOnSheet: (pct) => `${pct}% Verschnitt auf dieser Platte`,
  unplacedWarning: (count) => `⚠ ${count} Teil${count !== 1 ? 'e' : ''} konnte${count !== 1 ? 'n' : ''} nicht platziert werden (zu groß für die Platte)`,

  // SummaryPanel
  sheetsLabel: 'Platten',
  offcutSuffix: (count) => ` +${count} Reststück${count !== 1 ? 'e' : ''}`,
  totalWasteLabel: 'Gesamtverschnitt',
  materialCostLabel: 'Materialkosten',
  unplacedLabel: 'Nicht platziert',

  // ErrorBoundary
  somethingWentWrong: 'Etwas ist schiefgelaufen',
  errorDescription: 'Rozkroj ist auf einen unerwarteten Fehler gestoßen und kann nicht fortfahren. Ihr zuletzt gespeichertes Projekt ist weiterhin sicher in der Projektbibliothek — ein Neuladen geht nicht verloren.',
  reloadButton: 'Neu laden',

  // Alerts / confirms
  unsavedChangesConfirm: 'Sie haben ungespeicherte Änderungen, die verloren gehen. Fortfahren?',
  deleteProjectConfirm: (name) => `„${name}" löschen? Dies kann nicht rückgängig gemacht werden.`,
  saveFailed: 'Speichern fehlgeschlagen — der Browserspeicher ist möglicherweise voll oder nicht verfügbar.',
  duplicateSaveFailed: 'Speichern des Duplikats fehlgeschlagen — der Browserspeicher ist möglicherweise voll oder nicht verfügbar.',
  invalidProjectFile: 'Ungültige Projektdatei.',
  couldNotReadFile: 'Datei konnte nicht gelesen werden.',
  csvUnmatchedMaterialWarning: (count) =>
    `${count} Teil${count !== 1 ? 'e' : ''} hatte${count !== 1 ? 'n' : ''} ein Material, das zu keinem vorhandenen Material passte, und wurde${count !== 1 ? 'n' : ''} stattdessen dem Standard zugewiesen.`,
  pdfGenerationFailed: 'PDF-Erstellung fehlgeschlagen. Falls die App gerade aktualisiert wurde, laden Sie die Seite neu.',
};
