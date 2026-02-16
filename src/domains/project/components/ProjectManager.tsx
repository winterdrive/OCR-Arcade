import React, { useState, useRef } from 'react'
import { useStore, type PageData } from '@/shared/store/useStore'
import { Button } from '@/shared/ui/button'
import {
  FolderOpen,
  Download,
  Upload,
  Trash2,
  Calendar,
  Image as ImageIcon,
  ChevronDown
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { useToastStore } from '@/shared/store/feedbackStore'
import { useTranslation } from 'react-i18next'

interface ProjectData {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  pages: PageData[]
  canvasStates: any[]
  thumbnail?: string
  description?: string
}

interface ProjectManagerProps {
  className?: string
}

export function ProjectManager({ className }: ProjectManagerProps) {
  const { t } = useTranslation()
  const {
    setPages,
    setCurrentPageIndex,
    setTextBoxes
  } = useStore()

  const { addToast } = useToastStore()
  const [savedProjects, setSavedProjects] = useState<ProjectData[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [showProjectList, setShowProjectList] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load saved projects from localStorage on component mount
  React.useEffect(() => {
    loadSavedProjects()
  }, [])

  const loadSavedProjects = () => {
    try {
      const saved = localStorage.getItem('ocr-arcade-saved-projects')
      if (saved) {
        const projects = JSON.parse(saved) as ProjectData[]
        setSavedProjects(projects)
      }
    } catch (error) {
      addToast(t('toasts.loadProjectsFailed'), 'error')
    }
  }

  const loadProject = (project: ProjectData) => {
    try {
      setPages(project.pages)
      setCurrentPageIndex(0)

      // Restore text overlay data for current page
      if (project.pages[0]?.textOverlayData) {
        setTextBoxes(project.pages[0].textOverlayData)
      }

      setShowProjectList(false)
      addToast(t('toasts.projectLoaded', { name: project.name }), 'success')
    } catch (error) {
      addToast(t('toasts.loadProjectFailed'), 'error')
    }
  }

  const deleteProject = (projectId: string) => {
    if (confirm(t('toasts.confirmDeleteProject'))) {
      const updatedProjects = savedProjects.filter(p => p.id !== projectId)
      localStorage.setItem('ocr-arcade-saved-projects', JSON.stringify(updatedProjects))
      setSavedProjects(updatedProjects)
      addToast(t('toasts.projectDeleted'), 'success')
    }
  }

  const exportProject = (project: ProjectData) => {
    try {
      const dataStr = JSON.stringify(project, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })

      const link = document.createElement('a')
      link.href = URL.createObjectURL(dataBlob)
      link.download = `${project.name}.ocr-arcade.json`
      link.click()

      addToast(t('toasts.projectExported'), 'success')
    } catch (error) {
      addToast(t('toasts.projectExportFailed'), 'error')
    }
  }

  const importProject = () => {
    fileInputRef.current?.click()
    setShowDropdown(false)
  }

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const projectData = JSON.parse(e.target?.result as string) as ProjectData

        // Validate project data structure
        if (!projectData.pages || !Array.isArray(projectData.pages)) {
          throw new Error('Invalid project file format')
        }

        // Generate new ID to avoid conflicts
        projectData.id = Date.now().toString()
        projectData.updatedAt = new Date().toISOString()

        const updatedProjects = [projectData, ...savedProjects].slice(0, 10)
        localStorage.setItem('ocr-arcade-saved-projects', JSON.stringify(updatedProjects))
        setSavedProjects(updatedProjects)

        addToast(t('toasts.projectImported', { name: projectData.name }), 'success')
      } catch (error) {
        addToast(t('toasts.projectImportFailed'), 'error')
      }
    }

    reader.readAsText(file)
    event.target.value = '' // Reset input
  }

  return (
    <div className={cn("relative", className)}>
      {/* Dropdown Trigger Button */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 dark:bg-white/5 dark:hover:bg-white/10 text-slate-800 dark:text-white rounded-lg font-medium transition-all border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 text-sm"
      >
        <FolderOpen size={16} />
        {t('projects.title')}
        <ChevronDown size={16} className={cn("transition-transform", showDropdown && "rotate-180")} />
      </button>

      {/* Dropdown Menu */}
      {showDropdown && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 top-full mt-2 w-64 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="p-2 space-y-1">
              {/* Load Projects */}
              <button
                onClick={() => {
                  setShowProjectList(true)
                  setShowDropdown(false)
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
              >
                <FolderOpen size={16} className="text-blue-500 dark:text-blue-400" />
                <span>{t('projects.load')}</span>
                {savedProjects.length > 0 && (
                  <span className="ml-auto text-xs bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded-full">
                    {savedProjects.length}
                  </span>
                )}
              </button>

              {/* Import */}
              <button
                onClick={importProject}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
              >
                <Upload size={16} className="text-purple-500 dark:text-purple-400" />
                <span>{t('projects.import')}</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.ocr-arcade.json"
                  className="hidden"
                  onChange={handleFileImport}
                />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Project List Modal */}
      {showProjectList && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{t('projects.savedTitle')}</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowProjectList(false)}
                className="text-slate-600 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10"
              >
                {t('projects.close')}
              </Button>
            </div>

            {/* Project Grid */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {savedProjects.length === 0 ? (
                <div className="text-center py-12 text-slate-500 dark:text-white/60">
                  <FolderOpen size={48} className="mx-auto mb-4 opacity-50" />
                  <p>{t('projects.empty')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onLoad={() => loadProject(project)}
                      onDelete={() => deleteProject(project.id)}
                      onExport={() => exportProject(project)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Individual Project Card Component
interface ProjectCardProps {
  project: ProjectData
  onLoad: () => void
  onDelete: () => void
  onExport: () => void
}

function ProjectCard({ project, onLoad, onDelete, onExport }: ProjectCardProps) {
  const { t } = useTranslation()
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="border border-slate-200 dark:border-white/10 rounded-lg overflow-hidden hover:shadow-lg hover:border-slate-300 dark:hover:border-white/20 transition-all bg-white dark:bg-slate-800/50">
      {/* Thumbnail */}
      <div className="aspect-video bg-slate-100 dark:bg-slate-950/50 relative">
        {project.thumbnail ? (
          <img
            src={project.thumbnail}
            alt={project.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon size={32} className="text-slate-300 dark:text-white/20" />
          </div>
        )}

        {/* Page count badge */}
        <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
          {t('projects.pages', { count: project.pages.length })}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-medium text-slate-900 dark:text-white truncate">{project.name}</h3>
          {project.description && (
            <p className="text-sm text-slate-500 dark:text-white/60 truncate">{project.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-white/50">
          <Calendar size={12} />
          <span>{formatDate(project.updatedAt)}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={onLoad}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {t('projects.loadAction')}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={onExport}
            className="p-2 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-white"
          >
            <Download size={14} />
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={onDelete}
            className="p-2 border-red-500/20 hover:bg-red-500/10 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>
    </div>
  )
}

