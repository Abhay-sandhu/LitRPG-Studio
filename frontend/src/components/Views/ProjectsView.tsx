import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Folder, Trash2 } from 'lucide-react'
import { fetchProjects, createProject, deleteProject } from '../../api'

interface ProjectsViewProps {
  activeProjectId: number | null
  onSelectProject: (id: number) => void
  onOpenProject?: (id: number) => void
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({ activeProjectId, onSelectProject, onOpenProject }) => {
  const queryClient = useQueryClient()
  const [newProjectTitle, setNewProjectTitle] = useState('')

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects
  })

  const createMutation = useMutation({
    mutationFn: (title: string) => createProject(title),
    onSuccess: (newProj: any) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setNewProjectTitle('')
      if (newProj?.id) {
        onSelectProject(newProj.id)
      }
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteProject(id),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      if (activeProjectId === deletedId) {
        // Find next available project if we deleted the active one
        const remaining = projects.filter(p => p.id !== deletedId)
        if (remaining.length > 0) {
          onSelectProject(remaining[0].id)
        }
      }
    }
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (newProjectTitle.trim()) {
      createMutation.mutate(newProjectTitle.trim())
    }
  }

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-500">Loading projects...</div>
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <header>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">My Projects</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your web novel series, short stories, and universes.</p>
        </header>

        {/* Create Project Form */}
        <form onSubmit={handleCreate} className="flex items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
          <input 
            type="text" 
            value={newProjectTitle}
            onChange={e => setNewProjectTitle(e.target.value)}
            placeholder="New project title..."
            className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <button 
            type="submit"
            disabled={!newProjectTitle.trim() || createMutation.isPending}
            className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create
          </button>
        </form>

        {/* Project Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => {
            const isActive = project.id === activeProjectId
            
            return (
              <div 
                key={project.id}
                className={`relative group bg-white dark:bg-slate-900 rounded-xl p-5 border-2 transition-all cursor-pointer ${
                  isActive 
                    ? 'border-sky-500 shadow-md shadow-sky-500/10' 
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm hover:shadow-md'
                }`}
                onClick={() => onOpenProject ? onOpenProject(project.id) : onSelectProject(project.id)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-2 rounded-lg ${isActive ? 'bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                    <Folder className="w-6 h-6" />
                  </div>
                  {isActive && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 bg-sky-100 dark:bg-sky-500/10 px-2 py-1 rounded">Active</span>
                  )}
                </div>
                
                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 mb-1">{project.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                  {project.description || 'No description provided.'}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center text-xs font-medium text-sky-600 dark:text-sky-400">
                  <span>Open in Editor &rarr;</span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm('Are you sure you want to delete this project? All chapters and lore will be lost forever.')) {
                      deleteMutation.mutate(project.id)
                    }
                  }}
                  className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                  title="Delete Project"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )
          })}

          {projects.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500 dark:text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              No projects found. Create one to get started.
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
