import React, { useState, useEffect } from 'react'
import { Moon, Sun, Monitor, Shield, Sparkles, BrainCircuit } from 'lucide-react'

type ThemeType = 'light' | 'dark' | 'system'

interface SettingsViewProps {
  currentTheme: ThemeType
  onChangeTheme: (theme: ThemeType) => void
}

export const SettingsView: React.FC<SettingsViewProps> = ({ currentTheme, onChangeTheme }) => {
  const [ambientSensitivity, setAmbientSensitivity] = useState(50)
  const [tacticalStrictness, setTacticalStrictness] = useState(80)
  
  // Try to load saved settings
  useEffect(() => {
    const savedAmbient = localStorage.getItem('ambient_sensitivity')
    if (savedAmbient) setAmbientSensitivity(parseInt(savedAmbient))
    
    const savedTactical = localStorage.getItem('tactical_strictness')
    if (savedTactical) setTacticalStrictness(parseInt(savedTactical))
  }, [])

  const handleAmbientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value)
    setAmbientSensitivity(val)
    localStorage.setItem('ambient_sensitivity', val.toString())
  }

  const handleTacticalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value)
    setTacticalStrictness(val)
    localStorage.setItem('tactical_strictness', val.toString())
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-6 md:p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <header>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Settings</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Customize your editor experience and tune the AI co-writer.</p>
        </header>

        <section className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-6">
            <Monitor className="w-5 h-5 text-sky-500" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Appearance</h2>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => onChangeTheme('light')}
              className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                currentTheme === 'light'
                  ? 'border-sky-500 bg-sky-50 text-sky-700'
                  : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <Sun className="w-6 h-6 mb-2" />
              <span className="font-medium text-sm">Light</span>
            </button>
            <button
              onClick={() => onChangeTheme('dark')}
              className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                currentTheme === 'dark'
                  ? 'border-sky-500 bg-sky-900/20 text-sky-400'
                  : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <Moon className="w-6 h-6 mb-2" />
              <span className="font-medium text-sm">Dark</span>
            </button>
            <button
              onClick={() => onChangeTheme('system')}
              className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                currentTheme === 'system'
                  ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400'
                  : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <Monitor className="w-6 h-6 mb-2" />
              <span className="font-medium text-sm">System</span>
            </button>
          </div>
        </section>

        <section className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-6">
            <BrainCircuit className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">AI Co-Writer Tuning</h2>
          </div>

          <div className="space-y-8">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Ambient Lore Extraction Sensitivity
                </label>
                <span className="text-sm font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{ambientSensitivity}%</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Higher sensitivity means the AI will extract more aggressive minor details and relationships as you write. Lower means it only grabs major proper nouns.
              </p>
              <input 
                type="range" 
                min="0" max="100" 
                value={ambientSensitivity}
                onChange={handleAmbientChange}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-indigo-500" 
              />
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <label className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-rose-500" />
                  Tactical AI Strictness
                </label>
                <span className="text-sm font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{tacticalStrictness}%</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Higher strictness forces the AI to rigorously follow mathematical progression formulas. Lower allows the AI to hallucinate dramatic or thematic stat changes.
              </p>
              <input 
                type="range" 
                min="0" max="100" 
                value={tacticalStrictness}
                onChange={handleTacticalChange}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-rose-500" 
              />
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
