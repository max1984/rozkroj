export type Language = 'en' | 'pl' | 'de';

export const LANGUAGES: readonly Language[] = ['en', 'pl', 'de'];

export interface Translations {
  // Toolbar
  renameProjectTitle: string;
  projectNameLabel: string;
  undoTitle: string;
  undoLabel: string;
  redoTitle: string;
  redoLabel: string;
  saveProjectTitle: string;
  saveProjectUnsavedTitle: string;
  importProjectFileTitle: string;
  exportProjectFileTitle: string;
  exportCsvTitle: string;
  pdfButton: string;
  allSheetsOnOnePage: string;
  downloadPdf: string;
  toggleThemeTitle: string;
  unsavedChangesTitle: string;
  languageSwitcherTitle: string;

  // ProjectLibrary
  projectLibraryTitle: string;
  projectsHeading: string;
  saveCurrent: string;
  newProject: string;
  duplicateProject: string;
  noSavedProjects: string;
  currentLabel: string;
  deleteProjectTitle: string;
  defaultProjectName: string;
  newProjectDefaultName: string;
  defaultMaterialName: string;

  // Sidebar
  settingsHeading: string;

  // MaterialManager
  materialsHeading: string;
  addMaterialTitle: string;
  nameLabel: string;
  sheetSizeLabel: string;
  customOption: string;
  widthWithUnit: (unit: string) => string;
  heightWithUnit: (unit: string) => string;
  pricePerSheetLabel: string;
  pieceCountUsingMaterial: (count: number) => string;
  removeMaterialTitle: string;

  // KerfSettings
  freshEdgeLabel: string;
  trimPerSideLabel: string;
  sawKerfLabel: string;

  // AlgorithmPicker
  cutModeLabel: string;
  optimalLabel: string;
  optimalDesc: string;
  easyCutLabel: string;
  easyCutDesc: string;

  // PieceList
  piecesHeading: string;
  totalCount: (count: number) => string;
  importCsvTitle: string;
  addPieceTitle: string;
  noPiecesYet: string;
  addFirstPiece: string;

  // PieceForm
  nameOptionalLabel: string;
  namePlaceholder: string;
  materialLabel: string;
  qtyLabel: string;
  grainDirectionLabel: string;
  grainNone: string;
  grainHorizontal: string;
  grainVertical: string;
  allowRotation: string;
  priorityPiece: string;
  updateButton: string;
  addPieceButton: string;
  cancelButton: string;

  // PieceRow
  grainIndicator: string;
  edgeIndicator: string;
  pieceUnplacedCount: (count: number) => string;
  editPieceTitle: string;
  duplicatePieceTitle: string;
  deletePieceTitle: string;

  // EdgeBandingPicker
  edgeBandingLabel: string;
  edgeBandingHint: string;
  topEdge: string;
  bottomEdge: string;
  leftEdge: string;
  rightEdge: string;

  // OffcutStock
  offcutStockHeading: string;
  saveOffcuts: string;
  saveOffcutsTitle: string;
  noSavedOffcuts: string;
  removeOffcutTitle: string;

  // LayoutViewer
  addPiecesPrompt: string;
  computingLayout: string;
  sheetCounter: (idx: number, total: number) => string;
  prevSheetTitle: string;
  nextSheetTitle: string;
  offcutBadge: string;
  wastePercentOnSheet: (pct: number) => string;
  unplacedWarning: (count: number) => string;

  // SummaryPanel
  sheetsLabel: string;
  offcutSuffix: (count: number) => string;
  totalWasteLabel: string;
  materialCostLabel: string;
  unplacedLabel: string;

  // ErrorBoundary
  somethingWentWrong: string;
  errorDescription: string;
  reloadButton: string;

  // Alerts / confirms
  unsavedChangesConfirm: string;
  deleteProjectConfirm: (name: string) => string;
  saveFailed: string;
  duplicateSaveFailed: string;
  invalidProjectFile: string;
  couldNotReadFile: string;
  csvUnmatchedMaterialWarning: (count: number) => string;
  pdfGenerationFailed: string;
}
