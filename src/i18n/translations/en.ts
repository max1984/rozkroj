import type { Translations } from '../types';

export const en: Translations = {
  // Toolbar
  renameProjectTitle: 'Click to rename project',
  projectNameLabel: 'Project name',
  undoTitle: 'Undo (⌘Z)',
  undoLabel: 'Undo',
  redoTitle: 'Redo (⌘⇧Z)',
  redoLabel: 'Redo',
  saveProjectTitle: 'Save project',
  saveProjectUnsavedTitle: 'Save project (unsaved changes)',
  importProjectFileTitle: 'Import project file',
  exportProjectFileTitle: 'Export project file',
  exportCsvTitle: 'Export cut list as CSV',
  pdfButton: 'PDF',
  allSheetsOnOnePage: 'All sheets on one page',
  downloadPdf: 'Download PDF',
  toggleThemeTitle: 'Toggle theme',
  unsavedChangesTitle: 'Unsaved changes',
  languageSwitcherTitle: 'Language',

  // ProjectLibrary
  projectLibraryTitle: 'Project library',
  projectsHeading: 'Projects',
  saveCurrent: 'Save current',
  newProject: 'New',
  duplicateProject: 'Duplicate',
  noSavedProjects: 'No saved projects yet. Click "Save current" to add this one.',
  currentLabel: 'current',
  deleteProjectTitle: 'Delete project',
  defaultProjectName: 'My Project',
  newProjectDefaultName: 'New Project',
  defaultMaterialName: 'Chipboard 18mm',

  // Sidebar
  settingsHeading: 'Settings',

  // MaterialManager
  materialsHeading: 'Materials',
  addMaterialTitle: 'Add material',
  nameLabel: 'Name',
  sheetSizeLabel: 'Sheet size',
  customOption: 'Custom',
  widthWithUnit: (unit) => `Width (${unit})`,
  heightWithUnit: (unit) => `Height (${unit})`,
  pricePerSheetLabel: 'Price per sheet',
  pieceCountUsingMaterial: (count) => `${count} piece${count !== 1 ? 's' : ''} using this material`,
  removeMaterialTitle: 'Remove material',

  // KerfSettings
  freshEdgeLabel: 'Fresh Edge',
  trimPerSideLabel: 'Trim per side',
  sawKerfLabel: 'Saw Kerf',

  // AlgorithmPicker
  cutModeLabel: 'Cut Mode',
  optimalLabel: 'Optimal',
  optimalDesc: 'Best material usage',
  easyCutLabel: 'Easy Cut',
  easyCutDesc: 'Sequential saw cuts',

  // PieceList
  piecesHeading: 'Pieces',
  totalCount: (count) => `(${count} total)`,
  importCsvTitle: 'Import CSV',
  addPieceTitle: 'Add piece',
  noPiecesYet: 'No pieces yet.',
  addFirstPiece: 'Add your first piece',

  // PieceForm
  nameOptionalLabel: 'Name (optional)',
  namePlaceholder: 'e.g. Left Side',
  materialLabel: 'Material',
  qtyLabel: 'Qty',
  grainDirectionLabel: 'Grain Direction',
  grainNone: 'None',
  grainHorizontal: 'Horizontal (width direction)',
  grainVertical: 'Vertical (height direction)',
  allowRotation: 'Allow rotation',
  priorityPiece: 'Priority piece',
  updateButton: 'Update',
  addPieceButton: 'Add Piece',
  cancelButton: 'Cancel',

  // PieceRow
  grainIndicator: 'grain',
  edgeIndicator: 'edge',
  editPieceTitle: 'Edit piece',
  deletePieceTitle: 'Delete piece',

  // EdgeBandingPicker
  edgeBandingLabel: 'Edge banding',
  edgeBandingHint: '(click the edges to band)',
  topEdge: 'Top edge',
  bottomEdge: 'Bottom edge',
  leftEdge: 'Left edge',
  rightEdge: 'Right edge',

  // OffcutStock
  offcutStockHeading: 'Offcut Stock',
  saveOffcuts: 'Save offcuts',
  saveOffcutsTitle: 'Save all current offcuts as stock',
  noSavedOffcuts: 'No saved offcuts. After optimizing, click "Save offcuts" to reuse leftover pieces — saved offcuts are used up before cutting a fresh sheet.',
  removeOffcutTitle: 'Remove offcut',

  // LayoutViewer
  addPiecesPrompt: 'Add pieces to see the layout',
  computingLayout: 'Computing layout…',
  sheetCounter: (idx, total) => `Sheet ${idx} / ${total}`,
  prevSheetTitle: 'Previous sheet',
  nextSheetTitle: 'Next sheet',
  offcutBadge: 'offcut',
  wastePercentOnSheet: (pct) => `${pct}% waste on this sheet`,
  unplacedWarning: (count) => `⚠ ${count} piece${count !== 1 ? 's' : ''} could not be placed (too large for sheet)`,

  // SummaryPanel
  sheetsLabel: 'Sheets',
  offcutSuffix: (count) => ` +${count} offcut`,
  totalWasteLabel: 'Total waste',
  materialCostLabel: 'Material cost',
  unplacedLabel: 'Unplaced',

  // ErrorBoundary
  somethingWentWrong: 'Something went wrong',
  errorDescription: "Rozkroj hit an unexpected error and can't continue. Your last saved project is still safe in the project library — reloading will not lose it.",
  reloadButton: 'Reload',

  // Alerts / confirms
  unsavedChangesConfirm: 'You have unsaved changes that will be lost. Continue?',
  deleteProjectConfirm: (name) => `Delete "${name}"? This cannot be undone.`,
  saveFailed: 'Failed to save — your browser storage may be full or unavailable.',
  duplicateSaveFailed: 'Failed to save the duplicate — your browser storage may be full or unavailable.',
  invalidProjectFile: 'Invalid project file.',
  couldNotReadFile: 'Could not read the file.',
  csvUnmatchedMaterialWarning: (count) =>
    `${count} piece${count !== 1 ? 's' : ''} had a Material that didn't match any existing material and ${count !== 1 ? 'were' : 'was'} assigned to the default instead.`,
  pdfGenerationFailed: 'Failed to generate the PDF. If the app was just updated, try reloading the page.',
};
