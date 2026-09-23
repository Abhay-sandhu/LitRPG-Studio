import React, { useState } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { fetchLore, createLore, updateLore, deleteLore } from '../../api'
import type { LoreEntity } from '../../api'
import { Search, Plus, BookOpen, Edit2, Trash2, X, Check, Filter } from 'lucide-react'

interface BibleViewProps {
    projectId?: number
}

export const BibleView: React.FC<BibleViewProps> = ({ projectId = 1 }) => {
    const queryClient = useQueryClient()
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
    const [editingEntity, setEditingEntity] = useState<Partial<LoreEntity> | null>(null)
    const [rawAttributes, setRawAttributes] = useState("")
    const [isCreating, setIsCreating] = useState(false)

    const { data: lore = [], isLoading } = useQuery({
        queryKey: ['lore', projectId],
        queryFn: () => fetchLore(projectId)
    })

    const createMutation = useMutation({
        mutationFn: createLore,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lore'] })
            setIsCreating(false)
            setEditingEntity(null)
        },
        onError: (err: any) => {
            alert(`Failed to create lore entry: ${err?.response?.data?.detail || err.message || 'Unknown error'}`)
        }
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number, data: Partial<LoreEntity> }) => updateLore(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lore'] })
            setEditingEntity(null)
        },
        onError: (err: any) => {
            alert(`Failed to update lore entry: ${err?.response?.data?.detail || err.message || 'Unknown error'}`)
        }
    })

    const deleteMutation = useMutation({
        mutationFn: deleteLore,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lore'] })
        },
        onError: (err: any) => {
            alert(`Failed to delete lore entry: ${err?.response?.data?.detail || err.message || 'Unknown error'}`)
        }
    })

    // Extract unique categories
    const categories = Array.from(new Set(lore.map(l => (l.category || '').trim()).filter(Boolean))).sort()

    const filteredLore = lore.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              (item.description || '').toLowerCase().includes(searchTerm.toLowerCase())
        const matchesCat = selectedCategory ? (item.category || '').toLowerCase() === selectedCategory.toLowerCase() : true
        return matchesSearch && matchesCat
    })

    const handleSave = () => {
        const trimmedName = editingEntity?.name?.trim()
        if (!trimmedName) {
            alert("Lore entity name cannot be empty.")
            return
        }

        let parsedAttrs: Record<string, any> = {}
        if (rawAttributes && rawAttributes.trim()) {
            try {
                parsedAttrs = JSON.parse(rawAttributes)
            } catch (e) {
                alert("Invalid JSON in attributes. Please fix before saving.")
                return
            }
        }

        if (typeof parsedAttrs !== 'object' || parsedAttrs === null || Array.isArray(parsedAttrs)) {
            alert("Attributes must be a valid JSON object (e.g. {\"rank\": \"Rare\"}).")
            return
        }

        if (isCreating && editingEntity) {
            createMutation.mutate({
                project_id: projectId,
                name: trimmedName,
                category: editingEntity.category || 'Concept',
                description: editingEntity.description || '',
                attributes: parsedAttrs,
                is_promoted: false
            })
        } else if (editingEntity && editingEntity.id) {
            updateMutation.mutate({
                id: editingEntity.id,
                data: {
                    name: trimmedName,
                    category: editingEntity.category,
                    description: editingEntity.description,
                    attributes: parsedAttrs,
                }
            })
        }
    }

    const openCreateModal = () => {
        setIsCreating(true)
        setEditingEntity({ name: '', category: selectedCategory || 'Concept', description: '', attributes: {} })
        setRawAttributes("{}")
    }

    const openEditModal = (item: LoreEntity) => {
        setIsCreating(false)
        setEditingEntity(item)
        setRawAttributes(JSON.stringify(item.attributes || {}, null, 2))
    }

    return (
        <div className="flex-1 flex bg-slate-50 dark:bg-slate-950 animate-in fade-in duration-500 overflow-hidden relative">
            
            {/* Sidebar / Filters */}
            <div className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                    <h2 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                        Story Bible
                    </h2>
                </div>
                <div className="p-4 flex-1 overflow-y-auto">
                    <div className="mb-4 relative">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search lore..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:border-sky-500"
                        />
                    </div>

                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Filter className="w-3.5 h-3.5" /> Categories
                    </h3>
                    <div className="space-y-1">
                        <button
                            onClick={() => setSelectedCategory(null)}
                            className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${!selectedCategory ? 'bg-sky-50 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                        >
                            All Categories
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${selectedCategory === cat ? 'bg-sky-50 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {selectedCategory || 'All Lore'}
                    </h1>
                    <button 
                        onClick={openCreateModal}
                        className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Add Entry
                    </button>
                </div>

                {isLoading ? (
                    <div className="text-slate-500 text-center py-12">Loading lore database...</div>
                ) : filteredLore.length === 0 ? (
                    <div className="text-slate-500 text-center py-12">No entries found. Adjust your search or add a new entry.</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredLore.map(item => (
                            <div key={item.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:border-sky-300 dark:hover:border-sky-700 transition-colors group relative flex flex-col h-64">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                        {item.category}
                                    </span>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                        <button onClick={() => openEditModal(item)} className="p-1 text-slate-400 hover:text-sky-500" title="Edit">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => { if(confirm('Delete this entry?')) deleteMutation.mutate(item.id) }} className="p-1 text-slate-400 hover:text-red-500" title="Delete">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2 truncate" title={item.name}>{item.name}</h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-4 flex-1">{item.description}</p>
                                
                                {item.attributes && typeof item.attributes === 'object' && !Array.isArray(item.attributes) && Object.keys(item.attributes).length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-1">
                                        {Object.entries(item.attributes).slice(0,3).map(([k,v]) => (
                                            <span key={k} className="text-[10px] bg-slate-50 dark:bg-slate-950 px-1.5 py-0.5 rounded text-slate-500 border border-slate-200 dark:border-slate-800 truncate max-w-full">
                                                {k}: {String(v)}
                                            </span>
                                        ))}
                                        {Object.keys(item.attributes).length > 3 && (
                                            <span className="text-[10px] text-slate-400">+{Object.keys(item.attributes).length - 3} more</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Edit / Create Modal Overlay */}
            {editingEntity && (
                <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-6 z-50">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-xl flex flex-col max-h-full">
                        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                {isCreating ? 'Create Lore Entry' : 'Edit Lore Entry'}
                            </h2>
                            <button onClick={() => setEditingEntity(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Name</label>
                                    <input 
                                        type="text"
                                        value={editingEntity.name || ''}
                                        onChange={e => setEditingEntity({...editingEntity, name: e.target.value})}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Category</label>
                                    <input 
                                        type="text"
                                        value={editingEntity.category || ''}
                                        onChange={e => setEditingEntity({...editingEntity, category: e.target.value})}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-500"
                                        placeholder="e.g. Location, Concept"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Description</label>
                                <textarea 
                                    value={editingEntity.description || ''}
                                    onChange={e => setEditingEntity({...editingEntity, description: e.target.value})}
                                    className="w-full h-32 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-500 resize-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Attributes (JSON)</label>
                                <textarea 
                                    value={rawAttributes}
                                    onChange={e => setRawAttributes(e.target.value)}
                                    className="w-full h-32 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-sky-500"
                                />
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
                            <button 
                                onClick={() => setEditingEntity(null)}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSave}
                                disabled={createMutation.isPending || updateMutation.isPending}
                                className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                                <Check className="w-4 h-4" /> Save Entry
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
