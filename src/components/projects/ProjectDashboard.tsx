import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LuPlus, LuTrash, LuFolder, LuLoader, LuArrowRight, LuSparkles } from 'react-icons/lu';
import Header from '../shared/Header';
import { useAuth } from '../../contexts/AuthContext';
import { useProjectStore } from '../../store/projectStore';
import FirebaseErrorAlert from '../shared/FirebaseErrorAlert';

const ProjectDashboard: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  const { currentUser } = useAuth();
  const { 
    projects, 
    isLoading, 
    error: projectError, 
    fetchProjects, 
    createProject: createProjectAction,
    deleteProject: deleteProjectAction
  } = useProjectStore();

  useEffect(() => {
    if (currentUser) {
      fetchProjects(currentUser.uid);
    }
  }, [currentUser, fetchProjects]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !currentUser) return;

    try {
      setIsCreating(true);
      const newProject = {
        name: newProjectName.trim(),
        description: newProjectDescription.trim() || undefined,
        userId: currentUser.uid
      };

      await createProjectAction(newProject);
      setNewProjectName('');
      setNewProjectDescription('');
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error creating project:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (window.confirm('Delete this workspace? All saved blueprint graphs will be removed.')) {
      try {
        await deleteProjectAction(projectId);
      } catch (err) {
        console.error('Error deleting project:', err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-noder-black text-zinc-900 dark:text-zinc-100 font-sans transition-colors duration-200">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-gold-500"></span>
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">UE5 Workspace Dashboard</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Unreal Engine Projects
            </h1>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              Author and compile AI gameplay graphs for direct Unreal Engine 5 integration.
            </p>
          </div>
          
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 bg-gold-500 hover:bg-gold-400 text-black px-4 py-2.5 rounded-lg font-semibold text-xs transition-all shadow-md shadow-gold-500/20"
          >
            <LuPlus size={16} />
            <span>New Workspace</span>
          </button>
        </div>

        {projectError && (
          <FirebaseErrorAlert message={projectError} />
        )}

        {isLoading && projects.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-64 space-y-3">
            <LuLoader className="animate-spin text-gold-500" size={32} />
            <p className="text-xs font-mono text-zinc-500">Loading workspaces...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-noder-dark rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 shadow-sm">
            <LuFolder className="mx-auto text-zinc-400 dark:text-zinc-600 mb-3" size={40} />
            <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">No workspaces yet</h3>
            <p className="text-xs text-zinc-500 mt-1 mb-6 max-w-sm mx-auto">
              Create your first project workspace to start generating and compiling Blueprint graphs.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center space-x-2 bg-gold-500 hover:bg-gold-400 text-black px-4 py-2 rounded-md font-semibold text-xs transition-colors shadow-sm"
            >
              <LuPlus size={16} />
              <span>Create Workspace</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((project) => (
              <div 
                key={project.id}
                className="group relative bg-white dark:bg-noder-panel rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-gold-500/60 dark:hover:border-gold-500/60 transition-all duration-200 shadow-sm hover:shadow-xl overflow-hidden flex flex-col justify-between"
              >
                <Link to={`/projects/${project.id}`} className="block p-5 flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 rounded bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-gold-500 group-hover:bg-gold-500 group-hover:text-black transition-colors">
                      <LuFolder size={20} />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800">
                      UE5 Blueprint
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-gold-500 dark:group-hover:text-gold-400 transition-colors mb-1.5 truncate">
                    {project.name}
                  </h3>
                  
                  {project.description ? (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-4 leading-relaxed">
                      {project.description}
                    </p>
                  ) : (
                    <p className="text-xs text-zinc-400 italic mb-4">No description provided</p>
                  )}
                  
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-3 border-t border-zinc-100 dark:border-zinc-900">
                    <span className="font-mono">
                      {project.createdAt 
                        ? ((project.createdAt as any).toDate 
                            ? (project.createdAt as any).toDate().toLocaleDateString()
                            : (project.createdAt as any).seconds 
                            ? new Date((project.createdAt as any).seconds * 1000).toLocaleDateString() 
                            : 'Active')
                        : 'Active'}
                    </span>
                    <span className="flex items-center gap-1 font-medium text-gold-600 dark:text-gold-400 group-hover:translate-x-1 transition-transform">
                      Open Studio <LuArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </Link>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleDeleteProject(project.id!);
                  }}
                  className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded opacity-0 group-hover:opacity-100 transition-all"
                  title="Delete workspace"
                >
                  <LuTrash size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* New Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-noder-dark rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <LuSparkles className="w-5 h-5 text-gold-500" />
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">Create New UE5 Workspace</h2>
            </div>
            
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label htmlFor="projectName" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Workspace Name *
                </label>
                <input
                  type="text"
                  id="projectName"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded text-zinc-900 dark:text-white focus:outline-none focus:border-gold-500"
                  placeholder="e.g. CombatGameplayFramework"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="projectDescription" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  id="projectDescription"
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded text-zinc-900 dark:text-white focus:outline-none focus:border-gold-500"
                  placeholder="e.g. Character locomotion, double-jump, projectile weapon logic"
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs rounded border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  disabled={isCreating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded bg-gold-500 hover:bg-gold-400 text-black transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  disabled={isCreating || !newProjectName.trim()}
                >
                  {isCreating ? (
                    <>
                      <LuLoader className="animate-spin w-3.5 h-3.5" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Workspace</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDashboard;
