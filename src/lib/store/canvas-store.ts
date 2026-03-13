import { create } from 'zustand';

interface PdfViewerState {
  id: string;
  title: string;
  fileUrl: string;
}

interface EditingNoteState {
  id: string;
  title: string;
  content: string;
}

interface CanvasStore {
  activeWorkspaceId: string | null;
  activeWorkspaceIcon: string | null;
  workspaceHistory: string[];
  pdfViewerCard: PdfViewerState | null;
  editingNote: EditingNoteState | null;
  searchOpen: boolean;
  cardLinkerOpen: boolean;
  cardLinkerPosition: { x: number; y: number } | null;
  settingsOpen: boolean;
  drawingMode: boolean;
  eraserMode: boolean;
  drawingColor: string;
  drawingWidth: number;
  sidebarCollapsed: boolean;
  contextMenu: { x: number; y: number; canvasX: number; canvasY: number } | null;
  nodeContextMenu: { x: number; y: number; nodeId: string } | null;
  moveToPickerNodeId: string | null;

  setActiveWorkspace: (id: string | null, icon?: string | null) => void;
  setActiveWorkspaceIcon: (icon: string | null) => void;
  navigateToWorkspace: (id: string) => void;
  navigateBack: () => void;
  openPdfViewer: (card: PdfViewerState) => void;
  closePdfViewer: () => void;
  openNoteEditor: (note: EditingNoteState) => void;
  closeNoteEditor: () => void;
  openCardLinker: (position: { x: number; y: number }) => void;
  closeCardLinker: () => void;
  toggleSearch: () => void;
  toggleSettings: () => void;
  toggleDrawingMode: () => void;
  setEraserMode: (on: boolean) => void;
  setDrawingColor: (color: string) => void;
  setDrawingWidth: (width: number) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setContextMenu: (menu: { x: number; y: number; canvasX: number; canvasY: number } | null) => void;
  setNodeContextMenu: (menu: { x: number; y: number; nodeId: string } | null) => void;
  setMoveToPickerNodeId: (id: string | null) => void;
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  activeWorkspaceId: null,
  activeWorkspaceIcon: null,
  workspaceHistory: [],
  pdfViewerCard: null,
  editingNote: null,
  searchOpen: false,
  cardLinkerOpen: false,
  cardLinkerPosition: null,
  settingsOpen: false,
  drawingMode: false,
  eraserMode: false,
  drawingColor: '#000000',
  drawingWidth: 2,
  sidebarCollapsed: false,
  contextMenu: null,
  nodeContextMenu: null,
  moveToPickerNodeId: null,

  setActiveWorkspace: (id, icon) => set({ activeWorkspaceId: id, activeWorkspaceIcon: icon ?? null, workspaceHistory: [] }),
  setActiveWorkspaceIcon: (icon) => set({ activeWorkspaceIcon: icon }),
  navigateToWorkspace: (id) => {
    const { activeWorkspaceId, workspaceHistory } = get();
    if (activeWorkspaceId) {
      set({
        activeWorkspaceId: id,
        workspaceHistory: [...workspaceHistory, activeWorkspaceId],
      });
    } else {
      set({ activeWorkspaceId: id });
    }
  },
  navigateBack: () => {
    const { workspaceHistory } = get();
    if (workspaceHistory.length === 0) return;
    const prev = workspaceHistory[workspaceHistory.length - 1];
    set({
      activeWorkspaceId: prev,
      workspaceHistory: workspaceHistory.slice(0, -1),
    });
  },
  openPdfViewer: (card) => set({ pdfViewerCard: card }),
  closePdfViewer: () => set({ pdfViewerCard: null }),
  openNoteEditor: (note) => set({ editingNote: note }),
  closeNoteEditor: () => set({ editingNote: null }),
  openCardLinker: (position) => set({ cardLinkerOpen: true, cardLinkerPosition: position }),
  closeCardLinker: () => set({ cardLinkerOpen: false, cardLinkerPosition: null }),
  toggleSearch: () => set((s) => ({ searchOpen: !s.searchOpen })),
  toggleSettings: () => set((s) => ({ settingsOpen: !s.settingsOpen })),
  toggleDrawingMode: () => set((s) => ({ drawingMode: !s.drawingMode, eraserMode: false })),
  setEraserMode: (on) => set({ eraserMode: on }),
  setDrawingColor: (color) => set({ drawingColor: color }),
  setDrawingWidth: (width) => set({ drawingWidth: width }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setContextMenu: (menu) => set({ contextMenu: menu }),
  setNodeContextMenu: (menu) => set({ nodeContextMenu: menu }),
  setMoveToPickerNodeId: (id) => set({ moveToPickerNodeId: id }),
}));
