import { create } from 'zustand'

export type ViewType = 'editor' | 'projects' | 'bible' | 'constellation' | 'analytics' | 'settings'
export type ThemeType = 'light' | 'dark' | 'system'

interface AppState {
  // Global View State
  currentView: ViewType
  setCurrentView: (view: ViewType) => void

  // Navigation & UI State
  navOpen: boolean
  setNavOpen: (open: boolean) => void
  leftCollapsed: boolean
  setLeftCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void
  rightCollapsed: boolean
  setRightCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void
  zenMode: boolean
  setZenMode: (zen: boolean) => void
  
  // Theme State
  theme: ThemeType
  setTheme: (theme: ThemeType) => void

  // Project & Editor State
  projectId: number
  setProjectId: (id: number) => void
  activeChapterId: number | null
  setActiveChapterId: (id: number | null) => void
  wordCount: number
  setWordCount: (count: number) => void
  saveStatus: 'synced' | 'saving' | 'error'
  setSaveStatus: (status: 'synced' | 'saving' | 'error') => void
  isAnalyzing: boolean
  setIsAnalyzing: (analyzing: boolean) => void

  drafts: any[]
  setDrafts: (val: any[] | ((prev: any[]) => any[])) => void
}

export const useStore = create<AppState>((set) => ({
  currentView: 'editor',
  setCurrentView: (view) => set({ currentView: view }),

  navOpen: false,
  setNavOpen: (open) => set({ navOpen: open }),
  
  leftCollapsed: false,
  setLeftCollapsed: (val) => set((state) => ({ 
    leftCollapsed: typeof val === 'function' ? val(state.leftCollapsed) : val 
  })),
  
  rightCollapsed: false,
  setRightCollapsed: (val) => set((state) => ({ 
    rightCollapsed: typeof val === 'function' ? val(state.rightCollapsed) : val 
  })),

  zenMode: false,
  setZenMode: (zen) => set({ zenMode: zen }),

  theme: (localStorage.getItem('app_theme') as ThemeType) || 'system',
  setTheme: (theme) => set({ theme }),

  projectId: 1,
  setProjectId: (id) => set({ projectId: id }),

  activeChapterId: null,
  setActiveChapterId: (id) => set({ activeChapterId: id }),

  wordCount: 0,
  setWordCount: (count) => set({ wordCount: count }),

  saveStatus: 'synced',
  setSaveStatus: (status) => set({ saveStatus: status }),

  isAnalyzing: false,
  setIsAnalyzing: (analyzing) => set({ isAnalyzing: analyzing }),

  drafts: [],
  setDrafts: (val) => set((state) => ({
    drafts: typeof val === 'function' ? val(state.drafts) : val
  })),
}))
