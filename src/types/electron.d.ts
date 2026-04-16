interface UpdateStatus {
  phase:
    | 'idle'
    | 'checking'
    | 'available'
    | 'not-available'
    | 'downloading'
    | 'downloaded'
    | 'error';
  message: string;
  progress: number;
  version?: string | null;
}

interface Window {
  electronAPI?: {
    platform: string;
    updater?: {
      checkForUpdates: () => Promise<UpdateStatus>;
      getStatus: () => Promise<UpdateStatus>;
      getSettings: () => Promise<{ autoUpdateEnabled: boolean }>;
      setAutoUpdateEnabled: (
        enabled: boolean
      ) => Promise<{ autoUpdateEnabled: boolean }>;
      onStatus: (callback: (payload: UpdateStatus) => void) => () => void;
    };
  };
}
