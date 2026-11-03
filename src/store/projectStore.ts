import { create } from 'zustand';
import { 
  createProject as fsCreateProject, 
  getUserProjects as fsGetUserProjects, 
  getProject as fsGetProject, 
  updateProject as fsUpdateProject, 
  deleteProject as fsDeleteProject, 
  Project 
} from '../services/firestore';
import { Timestamp } from 'firebase/firestore';
import { isFirebaseConfigured } from '../services/firebase';

const LOCAL_PROJECTS_KEY = 'noder_local_projects';

const getStoredLocalProjects = (userId: string): Project[] => {
  try {
    const raw = localStorage.getItem(`${LOCAL_PROJECTS_KEY}_${userId}`) || localStorage.getItem(LOCAL_PROJECTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse local projects:', e);
  }
  return [
    {
      id: 'demo-unreal-project',
      name: 'Unreal Engine 5 Gameplay Framework',
      description: 'Default workspace for testing AI blueprints & T3D compilation',
      userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }
  ];
};

const saveStoredLocalProjects = (userId: string, projects: Project[]) => {
  try {
    localStorage.setItem(`${LOCAL_PROJECTS_KEY}_${userId}`, JSON.stringify(projects));
    localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(projects));
  } catch (e) {
    console.warn('Failed to persist local projects:', e);
  }
};

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  error: string | null;
  
  // Project list actions
  fetchProjects: (userId: string) => Promise<void>;
  
  // Current project actions
  fetchProject: (projectId: string) => Promise<void>;
  createProject: (project: Omit<Project, 'id'>) => Promise<Project>;
  updateProject: (projectId: string, data: Partial<Project>) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  
  // State management
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearCurrentProject: () => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  isLoading: false,
  error: null,
  
  // Fetch all projects for a user
  fetchProjects: async (userId: string) => {
    try {
      set({ isLoading: true, error: null });
      if (isFirebaseConfigured) {
        try {
          const projectsData = await fsGetUserProjects(userId);
          if (projectsData && projectsData.length > 0) {
            set({ projects: projectsData as Project[] });
            saveStoredLocalProjects(userId, projectsData as Project[]);
            return;
          }
        } catch (err) {
          console.warn('Firestore fetchProjects failed, falling back to local storage:', err);
        }
      }
      
      const local = getStoredLocalProjects(userId);
      set({ projects: local });
    } catch (error: any) {
      console.error('Error fetching projects:', error);
      set({ error: error.message || 'Failed to fetch projects' });
    } finally {
      set({ isLoading: false });
    }
  },
  
  // Fetch a single project
  fetchProject: async (projectId: string) => {
    try {
      set({ isLoading: true, error: null });
      if (isFirebaseConfigured) {
        try {
          const project = await fsGetProject(projectId);
          set({ currentProject: project as Project });
          return;
        } catch (err) {
          console.warn('Firestore fetchProject failed, falling back to local storage:', err);
        }
      }
      
      const inMemory = get().projects.find(p => p.id === projectId);
      if (inMemory) {
        set({ currentProject: inMemory });
        return;
      }
      
      const localList = getStoredLocalProjects('guest_local_user');
      const found = localList.find(p => p.id === projectId);
      if (found) {
        set({ currentProject: found });
      } else {
        const fallbackProject: Project = {
          id: projectId,
          name: 'Unreal Engine Project',
          description: 'Local workspace',
          userId: 'guest_local_user',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };
        set({ currentProject: fallbackProject });
      }
    } catch (error: any) {
      console.error('Error fetching project:', error);
      set({ error: error.message || 'Failed to fetch project' });
    } finally {
      set({ isLoading: false });
    }
  },
  
  // Create a new project
  createProject: async (project: Omit<Project, 'id'>) => {
    try {
      set({ isLoading: true, error: null });
      let newProject: Project;
      
      if (isFirebaseConfigured) {
        try {
          newProject = (await fsCreateProject(project as Project)) as Project;
        } catch (fbErr) {
          console.warn('Firestore createProject failed, saving locally:', fbErr);
          newProject = {
            ...project,
            id: 'proj_' + Date.now(),
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          };
        }
      } else {
        newProject = {
          ...project,
          id: 'proj_' + Date.now(),
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };
      }
      
      const updatedProjects = [newProject, ...get().projects];
      set({ projects: updatedProjects, currentProject: newProject });
      saveStoredLocalProjects(project.userId, updatedProjects);
      
      return newProject;
    } catch (error: any) {
      console.error('Error creating project:', error);
      set({ error: error.message || 'Failed to create project' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  
  // Update an existing project
  updateProject: async (projectId: string, data: Partial<Project>) => {
    try {
      set({ isLoading: true, error: null });
      if (isFirebaseConfigured) {
        try {
          await fsUpdateProject(projectId, data);
        } catch (err) {
          console.warn('Firestore updateProject failed, updating locally:', err);
        }
      }
      
      const currentProjects = get().projects;
      const updatedProjects = currentProjects.map(p => 
        p.id === projectId ? { ...p, ...data, updatedAt: Timestamp.now() } : p
      );
      
      set({ 
        projects: updatedProjects,
        currentProject: get().currentProject?.id === projectId 
          ? { ...get().currentProject!, ...data, updatedAt: Timestamp.now() } 
          : get().currentProject
      });
      
      const userId = get().currentProject?.userId || 'guest_local_user';
      saveStoredLocalProjects(userId, updatedProjects);
    } catch (error: any) {
      console.error('Error updating project:', error);
      set({ error: error.message || 'Failed to update project' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  
  // Delete a project
  deleteProject: async (projectId: string) => {
    try {
      set({ isLoading: true, error: null });
      if (isFirebaseConfigured) {
        try {
          await fsDeleteProject(projectId);
        } catch (err) {
          console.warn('Firestore deleteProject failed, deleting locally:', err);
        }
      }
      
      const currentProjects = get().projects;
      const remainingProjects = currentProjects.filter(p => p.id !== projectId);
      
      set({ 
        projects: remainingProjects,
        currentProject: get().currentProject?.id === projectId ? null : get().currentProject
      });
      
      const userId = get().currentProject?.userId || 'guest_local_user';
      saveStoredLocalProjects(userId, remainingProjects);
    } catch (error: any) {
      console.error('Error deleting project:', error);
      set({ error: error.message || 'Failed to delete project' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  
  // State management helpers
  setLoading: (isLoading: boolean) => set({ isLoading }),
  setError: (error: string | null) => set({ error }),
  clearCurrentProject: () => set({ currentProject: null }),
}));
