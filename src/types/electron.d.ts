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

interface UpdateSettings {
  autoUpdateEnabled: boolean;
}

interface Window {
  electronAPI?: {
    platform: string;
    updater?: {
      checkForUpdates: () => Promise<UpdateStatus>;
      getStatus: () => Promise<UpdateStatus>;
      getSettings: () => Promise<UpdateSettings>;
      setAutoUpdateEnabled: (enabled: boolean) => Promise<UpdateSettings>;
      onStatus: (callback: (payload: UpdateStatus) => void) => () => void;
    };
  };
}
