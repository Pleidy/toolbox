import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Theme } from '../types';

interface AppState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  autoUpdateEnabled: boolean;
  setAutoUpdateEnabled: (enabled: boolean) => void;
  toolVisibility: Record<string, boolean>;
  setToolVisibility: (toolId: string, enabled: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
      sidebarOpen: false,
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      autoUpdateEnabled: true,
      setAutoUpdateEnabled: (autoUpdateEnabled) => set({ autoUpdateEnabled }),
      toolVisibility: {
        qrcode: true,
        encoder: true,
        json: true,
        image: true,
        tools: false,
      },
      setToolVisibility: (toolId, enabled) =>
        set((state) => ({
          toolVisibility: {
            ...state.toolVisibility,
            [toolId]: enabled,
          },
        })),
    }),
    {
      name: 'toolbox-app-settings',
      partialize: (state) => ({
        theme: state.theme,
        autoUpdateEnabled: state.autoUpdateEnabled,
        toolVisibility: state.toolVisibility,
      }),
    }
  )
);
