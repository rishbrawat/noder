import { create } from 'zustand';
import { 
  getBlueprintFiles, 
  createBlueprintFile, 
  updateBlueprintFile, 
  deleteBlueprintFile,
  BlueprintFile
} from '../services/firestore';
import { onSnapshot, collection, query, where, Timestamp } from 'firebase/firestore';
import { firestore, isFirebaseConfigured } from '../services/firebase';

// Convert flat structure to hierarchical for UI rendering
const buildFileTree = (files: BlueprintFile[]): BlueprintFile[] => {
  const fileMap = new Map<string, BlueprintFile>();
  const rootFiles: BlueprintFile[] = [];
  
  // First pass: create map of all files
  files.forEach(file => {
    const fileWithDefaults: BlueprintFile = {
      ...file,
      children: file.children || [],
      childrenObjects: [],
      isOpen: file.isOpen || false
    };
    fileMap.set(file.id!, fileWithDefaults);
  });
  
  // Second pass: build hierarchy
  files.forEach(file => {
    const fileWithId = fileMap.get(file.id!);
    if (!fileWithId) return;
    
    if (!file.parentId) {
      rootFiles.push(fileWithId);
    } else {
      const parent = fileMap.get(file.parentId);
      if (parent && parent.type === 'folder') {
        if (!parent.childrenObjects) {
          parent.childrenObjects = [];
        }
        parent.childrenObjects.push(fileWithId);
      } else {
        rootFiles.push(fileWithId);
      }
    }
  });
  
  return rootFiles;
};

let autoSaveTimeout: ReturnType<typeof setTimeout> | null = null;

interface FileSystemState {
  files: BlueprintFile[];
  hierarchicalFiles: BlueprintFile[];
  isLoading: boolean;
  error: string | null;
  selectedFileId: string | null;
  unsubscribe: (() => void) | null;

  // Auto-save state
  isSaving: boolean;
  lastSavedAt: Date | null;
  saveError: string | null;

  // Actions
  fetchFiles: (projectId: string) => Promise<void>;
  createFile: (file: Omit<BlueprintFile, 'id' | 'createdAt' | 'updatedAt'>) => Promise<BlueprintFile>;
  updateFile: (fileId: string, data: Partial<BlueprintFile>) => Promise<void>;
  deleteFile: (fileId: string) => Promise<void>;
  selectFile: (fileId: string | null) => void;
  toggleFolder: (folderId: string) => void;
  setupRealtimeUpdates: (projectId: string) => void;
  cleanupRealtimeUpdates: () => void;
  
  // Auto-save handlers
  saveCurrentFileContent: (fileId: string, content: string) => Promise<void>;
  debouncedSaveContent: (fileId: string, content: string) => void;

  // State management
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useFileSystemStore = create<FileSystemState>((set, get) => ({
  files: [],
  hierarchicalFiles: [],
  isLoading: false,
  error: null,
  selectedFileId: null,
  unsubscribe: null,

  isSaving: false,
  lastSavedAt: null,
  saveError: null,
  
  // Fetch all files for a project
  fetchFiles: async (projectId: string) => {
    try {
      set({ isLoading: true, error: null });
      if (isFirebaseConfigured) {
        try {
          const files = await getBlueprintFiles(projectId);
          if (files && files.length > 0) {
            set({ files, hierarchicalFiles: buildFileTree(files) });
            return;
          }
        } catch (err) {
          console.warn('Firestore getBlueprintFiles failed, checking local storage:', err);
        }
      }

      // Check local cache
      const cached = localStorage.getItem(`noder_files_${projectId}`);
      let filesList: BlueprintFile[] = [];
      if (cached) {
        try {
          filesList = JSON.parse(cached);
        } catch {
          filesList = [];
        }
      }

      // If no files exist yet for this project, provide a default MainGraph file
      if (filesList.length === 0) {
        const defaultFile: BlueprintFile = {
          id: `file_${Date.now()}`,
          name: 'MainGraph',
          type: 'file',
          projectId,
          content: JSON.stringify({ nodes: [], edges: [] }),
          userId: 'guest_local_user',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };
        filesList = [defaultFile];
        localStorage.setItem(`noder_files_${projectId}`, JSON.stringify(filesList));
      }

      set({ files: filesList, hierarchicalFiles: buildFileTree(filesList) });
    } catch (error: any) {
      console.error('Error fetching files:', error);
      set({ error: error.message || 'Failed to fetch files' });
    } finally {
      set({ isLoading: false });
    }
  },
  
  // Create a new file or folder
  createFile: async (file: Omit<BlueprintFile, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      set({ isLoading: true, error: null });
      let newFile: BlueprintFile;

      if (isFirebaseConfigured) {
        try {
          newFile = (await createBlueprintFile(file)) as BlueprintFile;
        } catch (err) {
          console.warn('Firestore createFile failed, storing locally:', err);
          newFile = {
            ...file,
            id: `file_${Date.now()}`,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          };
        }
      } else {
        newFile = {
          ...file,
          id: `file_${Date.now()}`,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };
      }

      const currentFiles = get().files;
      const updatedFiles = [...currentFiles, newFile];
      set({ 
        files: updatedFiles,
        hierarchicalFiles: buildFileTree(updatedFiles)
      });
      localStorage.setItem(`noder_files_${file.projectId}`, JSON.stringify(updatedFiles));
      return newFile;
    } catch (error: any) {
      console.error('Error creating file:', error);
      set({ error: error.message || 'Failed to create file' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  
  // Update an existing file
  updateFile: async (fileId: string, data: Partial<BlueprintFile>) => {
    try {
      if (isFirebaseConfigured) {
        try {
          await updateBlueprintFile(fileId, data);
        } catch (err) {
          console.warn('Firestore updateFile failed, caching locally:', err);
        }
      }

      const currentFiles = get().files;
      const updatedFiles = currentFiles.map(f => 
        f.id === fileId ? { ...f, ...data, updatedAt: Timestamp.now() } : f
      );
      set({ 
        files: updatedFiles,
        hierarchicalFiles: buildFileTree(updatedFiles)
      });
      const activeProject = currentFiles.find(f => f.id === fileId)?.projectId;
      if (activeProject) {
        localStorage.setItem(`noder_files_${activeProject}`, JSON.stringify(updatedFiles));
      }
    } catch (error: any) {
      console.error('Error updating file:', error);
      set({ error: error.message || 'Failed to update file' });
      throw error;
    }
  },

  // Save current file content (auto-save target)
  saveCurrentFileContent: async (fileId: string, content: string) => {
    try {
      set({ isSaving: true, saveError: null });
      if (isFirebaseConfigured) {
        try {
          await updateBlueprintFile(fileId, { content });
        } catch (err) {
          console.warn('Cloud auto-save unavailable, synced to local storage:', err);
        }
      }

      const currentFiles = get().files;
      const updatedFiles = currentFiles.map(f =>
        f.id === fileId ? { ...f, content, updatedAt: Timestamp.now() } : f
      );
      set({
        files: updatedFiles,
        hierarchicalFiles: buildFileTree(updatedFiles),
        isSaving: false,
        lastSavedAt: new Date(),
        saveError: null,
      });

      const activeProject = currentFiles.find(f => f.id === fileId)?.projectId;
      if (activeProject) {
        localStorage.setItem(`noder_files_${activeProject}`, JSON.stringify(updatedFiles));
      }
    } catch (error: any) {
      console.error('Auto-save error:', error);
      set({ isSaving: false, saveError: error.message || 'Auto-save failed' });
    }
  },

  // Debounced auto-save (1.5 seconds)
  debouncedSaveContent: (fileId: string, content: string) => {
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }
    set({ isSaving: true });
    autoSaveTimeout = setTimeout(() => {
      get().saveCurrentFileContent(fileId, content);
    }, 1500);
  },
  
  // Delete a file or folder
  deleteFile: async (fileId: string) => {
    try {
      set({ isLoading: true, error: null });
      if (isFirebaseConfigured) {
        try {
          await deleteBlueprintFile(fileId, true);
        } catch (err) {
          console.warn('Firestore deleteFile failed, removing locally:', err);
        }
      }

      const currentFiles = get().files;
      const fileToDelete = currentFiles.find(f => f.id === fileId);
      const remainingFiles = currentFiles.filter(f => f.id !== fileId);
      set({ 
        files: remainingFiles,
        hierarchicalFiles: buildFileTree(remainingFiles),
        selectedFileId: get().selectedFileId === fileId ? null : get().selectedFileId
      });

      if (fileToDelete?.projectId) {
        localStorage.setItem(`noder_files_${fileToDelete.projectId}`, JSON.stringify(remainingFiles));
      }
    } catch (error: any) {
      console.error('Error deleting file:', error);
      set({ error: error.message || 'Failed to delete file' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  
  // Select a file
  selectFile: (fileId: string | null) => {
    set({ selectedFileId: fileId });
  },
  
  // Toggle folder open/closed state
  toggleFolder: (folderId: string) => {
    const currentFiles = get().files;
    const updatedFiles = currentFiles.map(f => 
      f.id === folderId && f.type === 'folder' 
        ? { ...f, isOpen: !f.isOpen } 
        : f
    );
    set({ 
      files: updatedFiles,
      hierarchicalFiles: buildFileTree(updatedFiles)
    });
    
    if (isFirebaseConfigured) {
      const folderToUpdate = currentFiles.find(f => f.id === folderId);
      if (folderToUpdate) {
        updateBlueprintFile(folderId, { 
          isOpen: !folderToUpdate.isOpen 
        }).catch(err => {
          console.error("Error updating folder state:", err);
        });
      }
    }
  },
  
  // Setup real-time updates for files in a project
  setupRealtimeUpdates: (projectId: string) => {
    get().cleanupRealtimeUpdates();
    if (!isFirebaseConfigured) {
      return;
    }

    try {
      const filesQuery = query(
        collection(firestore, 'files'),
        where('projectId', '==', projectId)
      );
      
      const unsubscribe = onSnapshot(filesQuery, (snapshot) => {
        const files: BlueprintFile[] = [];
        snapshot.forEach(doc => {
          files.push({
            id: doc.id,
            ...doc.data()
          } as BlueprintFile);
        });
        set({ 
          files, 
          hierarchicalFiles: buildFileTree(files),
          error: null 
        });
      }, (error) => {
        console.warn("Real-time updates warning:", error.message);
      });
      
      set({ unsubscribe });
    } catch (err) {
      console.warn("Failed to subscribe to real-time updates:", err);
    }
  },
  
  // Clean up real-time updates subscription
  cleanupRealtimeUpdates: () => {
    const { unsubscribe } = get();
    if (unsubscribe) {
      unsubscribe();
      set({ unsubscribe: null });
    }
  },
  
  setLoading: (isLoading: boolean) => set({ isLoading }),
  setError: (error: string | null) => set({ error }),
}));
