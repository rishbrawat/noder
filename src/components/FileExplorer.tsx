import React, { useState, useEffect } from 'react';
import { 
  LuFolder, 
  LuFolderPlus, 
  LuFilePlus, 
  LuFile, 
  LuChevronRight, 
  LuChevronLeft,
  LuChevronDown, 
  LuSearch, 
  LuTrash, 
  LuCheck,
  LuX
} from 'react-icons/lu';
import { useFileSystemStore } from '../store/fileSystemStore';
import { useAuth } from '../contexts/AuthContext';

interface FileExplorerProps {
  projectId: string;
  onFileSelect: (fileId: string) => void;
  selectedFileId: string | null;
  onTogglePanel?: (isOpen: boolean) => void;
  isPanelOpen?: boolean;
}

interface ContextMenu {
  isOpen: boolean;
  x: number;
  y: number;
  type: 'file' | 'folder' | null;
  itemId: string | null;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  projectId,
  onFileSelect,
  selectedFileId,
  onTogglePanel,
  isPanelOpen = true,
}) => {
  const { currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [editingParentId, setEditingParentId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenu>({
    isOpen: false,
    x: 0,
    y: 0,
    type: null,
    itemId: null,
  });
  const [sortBy, setSortBy] = useState<'name' | 'type'>('name');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  
  // Access file system store
  const {
    hierarchicalFiles,
    fetchFiles,
    createFile,
    deleteFile,
    toggleFolder,
  } = useFileSystemStore();

  useEffect(() => {
    if (projectId) {
      fetchFiles(projectId);
    }
  }, [projectId, fetchFiles]);

  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.isOpen) {
        setContextMenu({ isOpen: false, x: 0, y: 0, type: null, itemId: null });
      }
    };

    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [contextMenu.isOpen]);

  const handleContextMenu = (e: React.MouseEvent, type: 'file' | 'folder', id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      type,
      itemId: id,
    });
  };

  const handleCreateFileUI = (parentId: string | null) => {
    setEditingParentId(parentId);
    setIsCreatingFile(true);
    setIsCreatingFolder(false);
    setNewItemName('');
  };

  const handleCreateFolderUI = (parentId: string | null) => {
    setEditingParentId(parentId);
    setIsCreatingFolder(true);
    setIsCreatingFile(false);
    setNewItemName('');
  };

  const handleCreateItem = async () => {
    if (!newItemName.trim()) {
      setIsCreatingFile(false);
      setIsCreatingFolder(false);
      return;
    }

    try {
      if (isCreatingFile) {
        const fileName = newItemName.endsWith('.ueblueprint') 
          ? newItemName 
          : `${newItemName}.ueblueprint`;

        const newFile = await createFile({
          name: fileName,
          type: 'file',
          projectId,
          parentId: editingParentId,
          userId: currentUser?.uid || 'guest_local_user',
          content: JSON.stringify({ nodes: [], edges: [] }),
        });

        if (newFile.id) {
          onFileSelect(newFile.id);
        }
      } else if (isCreatingFolder) {
        await createFile({
          name: newItemName,
          type: 'folder',
          projectId,
          parentId: editingParentId,
          userId: currentUser?.uid || 'guest_local_user',
          content: '',
        });
      }
    } catch (error) {
      console.error('Error creating item:', error);
    } finally {
      setIsCreatingFile(false);
      setIsCreatingFolder(false);
      setNewItemName('');
      setEditingParentId(null);
    }
  };

  const handleContextMenuAction = async (action: string) => {
    const { itemId } = contextMenu;
    setContextMenu({ isOpen: false, x: 0, y: 0, type: null, itemId: null });

    if (!itemId) return;

    if (action === 'newFile') {
      handleCreateFileUI(itemId);
    } else if (action === 'newFolder') {
      handleCreateFolderUI(itemId);
    } else if (action === 'delete') {
      try {
        await deleteFile(itemId);
        if (selectedFileId === itemId) {
          onFileSelect('');
        }
      } catch (error) {
        console.error('Error deleting item:', error);
      }
    }
  };

  const handleToggleFolder = (folderId: string) => {
    toggleFolder(folderId);
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const renderFileSystem = (items: any[]) => {
    return items.map(item => (
      <div key={item.id} className="relative">
        <div
          className={`flex items-center px-2.5 py-1.5 cursor-pointer rounded transition-colors ${
            selectedFileId === item.id 
              ? 'bg-zinc-100 dark:bg-zinc-900 border-l-2 border-gold-500 text-zinc-900 dark:text-white font-medium' 
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-white'
          }`}
          onClick={() => item.type === 'folder' ? handleToggleFolder(item.id) : onFileSelect(item.id)}
          onContextMenu={(e) => handleContextMenu(e, item.type, item.id)}
        >
          {item.type === 'folder' ? (
            <>
              {item.childrenObjects && item.childrenObjects.length > 0 ? (
                expandedFolders.has(item.id) ? (
                  <LuChevronDown className="w-3.5 h-3.5 mr-1 text-gold-500" />
                ) : (
                  <LuChevronRight className="w-3.5 h-3.5 mr-1 text-gold-500" />
                )
              ) : (
                <div className="w-3.5 mr-1" />
              )}
              <LuFolder className="w-3.5 h-3.5 mr-2 text-gold-500" />
            </>
          ) : (
            <>
              <div className="w-3.5 mr-1" />
              <LuFile className={`w-3.5 h-3.5 mr-2 ${selectedFileId === item.id ? 'text-gold-500' : 'text-zinc-400'}`} />
            </>
          )}
          <span 
            className="flex-1 truncate text-xs"
            onClick={() => item.type === 'file' && onFileSelect(item.id)}
          >
            {item.name.replace(/\.ueblueprint$/, '')}
          </span>
          <button
            className="ml-auto opacity-0 group-hover:opacity-100 p-0.5 text-zinc-400 hover:text-red-500"
            onClick={(e) => {
              e.stopPropagation();
              handleContextMenu(e, item.type, item.id);
            }}
          >
            ···
          </button>
        </div>

        {item.type === 'folder' && expandedFolders.has(item.id) && item.childrenObjects && (
          <div className="pl-3 border-l border-zinc-200 dark:border-zinc-800 ml-2.5 my-0.5">
            {renderFileSystem(item.childrenObjects)}
          </div>
        )}
      </div>
    ));
  };

  const filteredFiles = hierarchicalFiles.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedFiles = [...filteredFiles].sort((a, b) => {
    if (sortBy === 'type') {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  if (!isPanelOpen) {
    return (
      <div className="w-10 h-full bg-white dark:bg-noder-panel border-r border-zinc-200 dark:border-zinc-800 flex flex-col items-center py-3 select-none z-10 shrink-0">
        <button
          onClick={() => onTogglePanel?.(true)}
          className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-gold-500 transition-colors"
          title="Expand Content Browser"
        >
          <LuChevronRight size={16} />
        </button>
        <span
          onClick={() => onTogglePanel?.(true)}
          className="mt-6 text-[10px] font-mono tracking-widest uppercase text-zinc-500 hover:text-gold-500 [writing-mode:vertical-lr] rotate-180 cursor-pointer"
        >
          Content Browser
        </span>
      </div>
    );
  }

  return (
    <div className="w-64 h-full bg-white dark:bg-noder-panel border-r border-zinc-200 dark:border-zinc-800 flex flex-col font-sans select-none text-zinc-900 dark:text-zinc-100 shrink-0 transition-all">
      {/* Header & Controls */}
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <div className="flex items-center space-x-1.5">
          {onTogglePanel && (
            <button
              onClick={() => onTogglePanel(false)}
              className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Collapse Panel"
            >
              <LuChevronLeft size={14} />
            </button>
          )}
          <h2 className="text-xs font-semibold tracking-wider uppercase text-zinc-500 dark:text-zinc-400">
            Blueprints
          </h2>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => handleCreateFileUI(null)}
            className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
            title="New Blueprint File"
          >
            <LuFilePlus size={15} />
          </button>
          <button
            onClick={() => handleCreateFolderUI(null)}
            className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
            title="New Folder"
          >
            <LuFolderPlus size={15} />
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-900">
        <div className="relative">
          <LuSearch className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search graphs..."
            className="w-full py-1.5 pl-8 pr-2.5 text-xs rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-gold-500 transition-colors"
          />
        </div>
      </div>

      {/* Inline Creation Input */}
      {(isCreatingFile || isCreatingFolder) && (
        <div className="p-2 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center space-x-1.5">
          <input
            type="text"
            autoFocus
            placeholder={isCreatingFile ? "Blueprint name..." : "Folder name..."}
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateItem();
              if (e.key === 'Escape') {
                setIsCreatingFile(false);
                setIsCreatingFolder(false);
              }
            }}
            className="flex-1 px-2 py-1 text-xs bg-white dark:bg-black border border-zinc-300 dark:border-zinc-700 rounded text-zinc-900 dark:text-white focus:outline-none focus:border-gold-500"
          />
          <button
            onClick={handleCreateItem}
            className="p-1 text-green-600 dark:text-green-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded"
            title="Confirm"
          >
            <LuCheck size={14} />
          </button>
          <button
            onClick={() => {
              setIsCreatingFile(false);
              setIsCreatingFolder(false);
            }}
            className="p-1 text-red-600 dark:text-red-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded"
            title="Cancel"
          >
            <LuX size={14} />
          </button>
        </div>
      )}

      {/* Files Tree */}
      <div className="flex-1 overflow-y-auto p-2">
        {renderFileSystem(sortedFiles)}
        {sortedFiles.length === 0 && (
          <div className="py-8 text-center text-xs text-zinc-400">
            No blueprints found.
          </div>
        )}
      </div>

      {/* Footer Sort & Summary */}
      <div className="p-2.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-noder-dark flex items-center justify-between text-[11px] text-zinc-500">
        <span>Sort by:</span>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'name' | 'type')}
          className="bg-transparent text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 rounded px-1.5 py-0.5 focus:outline-none cursor-pointer"
        >
          <option value="name" className="bg-white dark:bg-zinc-900">Name</option>
          <option value="type" className="bg-white dark:bg-zinc-900">Type</option>
        </select>
      </div>

      {/* Context Menu */}
      {contextMenu.isOpen && (
        <div 
          className="fixed z-50 bg-white dark:bg-noder-dark border border-zinc-200 dark:border-zinc-800 rounded-md shadow-2xl py-1 min-w-[140px] text-xs font-sans animate-fade-in"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          {contextMenu.type === 'folder' && (
            <>
              <button 
                className="w-full text-left px-3 py-1.5 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center"
                onClick={() => handleContextMenuAction('newFile')}
              >
                <LuFilePlus size={13} className="mr-2 text-gold-500" />
                New Blueprint
              </button>
              <button 
                className="w-full text-left px-3 py-1.5 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center"
                onClick={() => handleContextMenuAction('newFolder')}
              >
                <LuFolderPlus size={13} className="mr-2 text-gold-500" />
                New Folder
              </button>
              <div className="my-1 border-t border-zinc-200 dark:border-zinc-800"></div>
            </>
          )}
          <button 
            className="w-full text-left px-3 py-1.5 text-red-600 dark:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center"
            onClick={() => handleContextMenuAction('delete')}
          >
            <LuTrash size={13} className="mr-2 text-red-500" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
};
