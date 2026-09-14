import React from 'react'
import { Library, LineChart, Settings, Construction } from 'lucide-react'

interface PlaceholderViewProps {
  title: string
  icon: React.ElementType
  description: string
}

const PlaceholderView: React.FC<PlaceholderViewProps> = ({ title, icon: Icon, description }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-8 text-center animate-in fade-in duration-500">
      <div className="w-16 h-16 bg-sky-100 dark:bg-sky-500/10 rounded-2xl flex items-center justify-center mb-6 border border-sky-200 dark:border-sky-500/20 shadow-sm">
        <Icon className="w-8 h-8 text-sky-600 dark:text-sky-400" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">{title}</h2>
      <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8">{description}</p>
      
      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-500/10 px-4 py-2 rounded-lg border border-amber-200 dark:border-amber-500/30 text-sm font-medium">
        <Construction className="w-4 h-4" />
        <span>Under Construction</span>
      </div>
    </div>
  )
}

export const ProjectsView = () => (
  <PlaceholderView
    title="My Projects"
    icon={Library}
    description="Manage all your LitRPG series, novels, and short stories from a single dashboard. View word counts, cover art, and publishing statuses."
  />
)



export const AnalyticsView = () => (
  <PlaceholderView
    title="Analytics & Goals"
    icon={LineChart}
    description="Track your writing velocity, set daily word count goals, and monitor character stat distributions over time."
  />
)

export const SettingsView = () => (
  <PlaceholderView
    title="Settings"
    icon={Settings}
    description="Configure your editor preferences, AI ambient extraction sensitivity, theme choices, and account details."
  />
)
