import {
  collection,
  doc,
  setDoc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { firestore } from './firebase';

// Collection names
export const COLLECTIONS = {
  USERS: 'users',
  PROJECTS: 'projects',
  BLUEPRINTS: 'blueprints',
  FILES: 'files',
  TEMPLATES: 'templates',
};

// Interface for a project
export interface Project {
  id?: string;
  name: string;
  description?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  userId: string;
}

// Interface for a blueprint
export interface Blueprint {
  id?: string;
  name: string;
  description?: string;
  nodes: any[];
  edges: any[];
  projectId: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  userId: string;
}

// Interface for a file system item (file or folder)
export interface FileSystemItem {
  id?: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  projectId: string;
  parentId?: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  userId: string;
}

// Interface for blueprint templates
export interface BlueprintTemplateDocument {
  id?: string;
  name: string;
  description: string;
  content: string;
  category: string;
  userId: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// User methods
export const createUserProfile = async (userId: string, data: any) => {
  try {
    const userRef = doc(firestore, COLLECTIONS.USERS, userId);
    await setDoc(userRef, {
      ...data,
      createdAt: serverTimestamp()
    });
    return userRef;
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
};

export const getUserProfile = async (userId: string) => {
  try {
    const userDoc = await getDoc(doc(firestore, COLLECTIONS.USERS, userId));
    return userDoc.exists() ? userDoc.data() : null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

// Project methods
export const createProject = async (project: Project) => {
  try {
    const projectData = {
      ...project,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const projectRef = await addDoc(collection(firestore, COLLECTIONS.PROJECTS), projectData);
    return { id: projectRef.id, ...projectData };
  } catch (error) {
    console.error('Error creating project:', error);
    throw error;
  }
};

export const getUserProjects = async (userId: string) => {
  try {
    const projectsQuery = query(
      collection(firestore, COLLECTIONS.PROJECTS),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(projectsQuery);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting user projects:', error);
    throw error;
  }
};

export const getProject = async (projectId: string) => {
  try {
    const projectDoc = await getDoc(doc(firestore, COLLECTIONS.PROJECTS, projectId));
    if (!projectDoc.exists()) {
      throw new Error('Project not found');
    }
    return { id: projectDoc.id, ...projectDoc.data() };
  } catch (error) {
    console.error('Error getting project:', error);
    throw error;
  }
};

export const updateProject = async (projectId: string, data: Partial<Project>) => {
  try {
    const projectRef = doc(firestore, COLLECTIONS.PROJECTS, projectId);
    await updateDoc(projectRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    return projectRef;
  } catch (error) {
    console.error('Error updating project:', error);
    throw error;
  }
};

export const deleteProject = async (projectId: string) => {
  try {
    await deleteDoc(doc(firestore, COLLECTIONS.PROJECTS, projectId));
  } catch (error) {
    console.error('Error deleting project:', error);
    throw error;
  }
};

// Blueprint methods
export const createBlueprint = async (blueprint: Blueprint) => {
  try {
    const blueprintData = {
      ...blueprint,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const blueprintRef = await addDoc(collection(firestore, COLLECTIONS.BLUEPRINTS), blueprintData);
    return { id: blueprintRef.id, ...blueprintData };
  } catch (error) {
    console.error('Error creating blueprint:', error);
    throw error;
  }
};

export const getProjectBlueprints = async (projectId: string) => {
  try {
    const blueprintsQuery = query(
      collection(firestore, COLLECTIONS.BLUEPRINTS),
      where('projectId', '==', projectId),
      orderBy('updatedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(blueprintsQuery);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting project blueprints:', error);
    throw error;
  }
};

export const getBlueprint = async (blueprintId: string) => {
  try {
    const blueprintDoc = await getDoc(doc(firestore, COLLECTIONS.BLUEPRINTS, blueprintId));
    if (!blueprintDoc.exists()) {
      throw new Error('Blueprint not found');
    }
    return { id: blueprintDoc.id, ...blueprintDoc.data() };
  } catch (error) {
    console.error('Error getting blueprint:', error);
    throw error;
  }
};

export const updateBlueprint = async (blueprintId: string, data: Partial<Blueprint>) => {
  try {
    const blueprintRef = doc(firestore, COLLECTIONS.BLUEPRINTS, blueprintId);
    await updateDoc(blueprintRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    return blueprintRef;
  } catch (error) {
    console.error('Error updating blueprint:', error);
    throw error;
  }
};

export const deleteBlueprint = async (blueprintId: string) => {
  try {
    await deleteDoc(doc(firestore, COLLECTIONS.BLUEPRINTS, blueprintId));
  } catch (error) {
    console.error('Error deleting blueprint:', error);
    throw error;
  }
};

// File system methods
export const createFile = async (file: FileSystemItem) => {
  try {
    const fileData = {
      ...file,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const fileRef = await addDoc(collection(firestore, COLLECTIONS.FILES), fileData);
    return { id: fileRef.id, ...fileData };
  } catch (error) {
    console.error('Error creating file:', error);
    throw error;
  }
};

export const getProjectFiles = async (projectId: string) => {
  try {
    const filesQuery = query(
      collection(firestore, COLLECTIONS.FILES),
      where('projectId', '==', projectId)
    );
    
    const querySnapshot = await getDocs(filesQuery);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting project files:', error);
    throw error;
  }
};

export const getFile = async (fileId: string) => {
  try {
    const fileDoc = await getDoc(doc(firestore, COLLECTIONS.FILES, fileId));
    if (!fileDoc.exists()) {
      throw new Error('File not found');
    }
    return { id: fileDoc.id, ...fileDoc.data() };
  } catch (error) {
    console.error('Error getting file:', error);
    throw error;
  }
};

export const updateFile = async (fileId: string, data: Partial<FileSystemItem>) => {
  try {
    const fileRef = doc(firestore, COLLECTIONS.FILES, fileId);
    await updateDoc(fileRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    return fileRef;
  } catch (error) {
    console.error('Error updating file:', error);
    throw error;
  }
};

export const deleteFile = async (fileId: string) => {
  try {
    await deleteDoc(doc(firestore, COLLECTIONS.FILES, fileId));
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};

// Blueprint file specific methods
export interface BlueprintFile {
  id?: string;
  name: string;
  content: string;
  type: 'file' | 'folder';
  projectId: string;
  parentId?: string | null;
  children?: string[]; // Array of file IDs for folders
  childrenObjects?: BlueprintFile[]; // Computed tree hierarchy for UI rendering
  isOpen?: boolean;
  path?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  userId: string;
}

export const createBlueprintFile = async (file: Omit<BlueprintFile, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const fileData = {
      ...file,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const fileRef = await addDoc(collection(firestore, COLLECTIONS.FILES), fileData);
    
    // If this is a child of a folder, update the parent folder
    if (file.parentId) {
      const parentRef = doc(firestore, COLLECTIONS.FILES, file.parentId);
      const parentDoc = await getDoc(parentRef);
      
      if (parentDoc.exists() && parentDoc.data().type === 'folder') {
        const parentData = parentDoc.data();
        const children = parentData.children || [];
        
        await updateDoc(parentRef, {
          children: [...children, fileRef.id],
          updatedAt: serverTimestamp()
        });
      }
    }
    
    return { id: fileRef.id, ...fileData };
  } catch (error) {
    console.error('Error creating blueprint file:', error);
    throw error;
  }
};

export const getBlueprintFiles = async (projectId: string) => {
  try {
    const filesQuery = query(
      collection(firestore, COLLECTIONS.FILES),
      where('projectId', '==', projectId)
    );
    
    const querySnapshot = await getDocs(filesQuery);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as BlueprintFile[];
  } catch (error) {
    console.error('Error getting blueprint files:', error);
    throw error;
  }
};

export const updateBlueprintFile = async (fileId: string, data: Partial<BlueprintFile>) => {
  try {
    const fileRef = doc(firestore, COLLECTIONS.FILES, fileId);
    
    // Don't allow updating projectId or userId
    const { projectId: _projectId, userId: _userId, ...updateData } = data;
    
    await updateDoc(fileRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    });
    
    return fileRef;
  } catch (error) {
    console.error('Error updating blueprint file:', error);
    throw error;
  }
};

export const deleteBlueprintFile = async (fileId: string, recursive = true) => {
  try {
    const fileDoc = await getDoc(doc(firestore, COLLECTIONS.FILES, fileId));
    if (!fileDoc.exists()) {
      console.warn(`File ${fileId} not found, already deleted?`);
      return;
    }
    
    const fileData = fileDoc.data() as BlueprintFile;
    
    if (fileData.type === 'folder' && recursive) {
      console.log(`Deleting folder ${fileId} and its contents recursively`);
      
      const childrenQuery = query(
        collection(firestore, COLLECTIONS.FILES),
        where('parentId', '==', fileId)
      );
      
      const childrenSnapshot = await getDocs(childrenQuery);
      
      const deletePromises = childrenSnapshot.docs.map(doc => 
        deleteBlueprintFile(doc.id, recursive)
      );
      
      await Promise.all(deletePromises);
    }
    
    console.log(`Deleting file ${fileId}`);
    await deleteDoc(doc(firestore, COLLECTIONS.FILES, fileId));
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};

// Blueprint Template methods
export const saveBlueprintTemplate = async (
  template: Omit<BlueprintTemplateDocument, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  try {
    const templateData = {
      ...template,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(firestore, COLLECTIONS.TEMPLATES), templateData);
    return docRef.id;
  } catch (error) {
    console.error('Error saving blueprint template:', error);
    throw error;
  }
};

export const getBlueprintTemplates = async (): Promise<BlueprintTemplateDocument[]> => {
  try {
    const templatesQuery = query(
      collection(firestore, COLLECTIONS.TEMPLATES),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(templatesQuery);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as BlueprintTemplateDocument[];
  } catch (error) {
    console.error('Error getting blueprint templates:', error);
    throw error;
  }
};
