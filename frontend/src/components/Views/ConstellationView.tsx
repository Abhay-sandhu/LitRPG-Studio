import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import ForceGraph2D from 'react-force-graph-2d'
import { fetchLore, fetchLoreRelationships } from '../../api'
import type { LoreEntity } from '../../api'
import { X } from 'lucide-react'

interface ConstellationViewProps {
  projectId: number
}

const CATEGORY_COLORS: Record<string, string> = {
  Character: '#3b82f6', // blue-500
  Location: '#10b981', // emerald-500
  Item: '#f59e0b', // amber-500
  Faction: '#8b5cf6', // violet-500
  Concept: '#64748b', // slate-500
  Event: '#ef4444', // red-500
}

const getCategoryColor = (cat?: string): string => {
  if (!cat) return CATEGORY_COLORS.Concept
  const key = Object.keys(CATEGORY_COLORS).find(k => k.toLowerCase() === cat.toLowerCase())
  return key ? CATEGORY_COLORS[key] : CATEGORY_COLORS.Concept
}

export const ConstellationView: React.FC<ConstellationViewProps> = ({ projectId }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const fgRef = useRef<any>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set())
  const [selectedEntityId, setSelectedEntityId] = useState<number | null>(null)

  const { data: lore = [], isLoading: isLoadingLore } = useQuery({
    queryKey: ['lore', projectId],
    queryFn: () => fetchLore(projectId)
  })

  const { data: relationships = [] } = useQuery({
    queryKey: ['lore-relationships', projectId],
    queryFn: () => fetchLoreRelationships(projectId)
  })

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          setDimensions({ width, height })
        }
      }
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const toggleCategory = (cat: string) => {
    setHiddenCategories(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
    setSelectedEntityId(null)
  }

  const graphData = useMemo(() => {
    const visibleLore = lore.filter((e: LoreEntity) => !hiddenCategories.has(e.category || 'Concept'))
    const validNodeIds = new Set(visibleLore.map((e: LoreEntity) => e.id))

    const nodes = visibleLore.map((entity: LoreEntity) => ({
      id: entity.id,
      name: entity.name,
      val: 2,
      category: entity.category || 'Concept',
      color: getCategoryColor(entity.category)
    }))

    const links = relationships
      .filter((rel: any) => rel.source_id !== rel.target_id && validNodeIds.has(rel.source_id) && validNodeIds.has(rel.target_id))
      .map((rel: any) => ({
        source: rel.source_id,
        target: rel.target_id,
        name: rel.relationship_type
      }))

    return { nodes, links }
  }, [lore, relationships, hiddenCategories])

  const paintNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.name
    const fontSize = 12 / globalScale
    ctx.font = `${fontSize}px Sans-Serif`

    ctx.beginPath()
    ctx.arc(node.x, node.y, 4, 0, 2 * Math.PI, false)
    ctx.fillStyle = node.id === selectedEntityId ? '#fff' : node.color
    ctx.fill()
    if (node.id === selectedEntityId) {
      ctx.lineWidth = 1.5 / globalScale
      ctx.strokeStyle = node.color
      ctx.stroke()
    }

    if (globalScale > 1.2) {
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
      ctx.fillText(label, node.x, node.y + 8)
    }
  }, [selectedEntityId])

  const selectedEntity = useMemo(() => {
    return lore.find((e: LoreEntity) => e.id === selectedEntityId)
  }, [lore, selectedEntityId])

  return (
    <div className="flex-1 flex bg-slate-950 overflow-hidden relative" ref={containerRef}>
      <div className="absolute top-4 left-4 z-10 bg-slate-900/90 backdrop-blur border border-slate-700 text-slate-200 px-4 py-3 rounded-lg shadow-xl select-none">
        <h2 className="text-sm font-bold uppercase tracking-wider mb-2 text-slate-400">Legend & Filters</h2>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          {Object.entries(CATEGORY_COLORS).map(([cat, color]) => {
            const isHidden = hiddenCategories.has(cat)
            return (
              <div 
                key={cat} 
                className={`flex items-center gap-2 cursor-pointer hover:opacity-100 transition-opacity ${isHidden ? 'opacity-40' : 'opacity-90'}`}
                onClick={() => toggleCategory(cat)}
              >
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                <span className={isHidden ? 'line-through' : ''}>{cat}</span>
              </div>
            )
          })}
        </div>
      </div>
      
      <div className="flex-1 relative">
        {isLoadingLore ? (
          <div className="absolute inset-0 flex items-center justify-center text-slate-500">
            Loading constellation...
          </div>
        ) : graphData.nodes.length > 0 ? (
          <ForceGraph2D
            ref={fgRef}
            width={dimensions.width}
            height={dimensions.height}
            graphData={graphData}
            nodeLabel=""
            nodeCanvasObject={paintNode}
            onNodeClick={(node) => {
              setSelectedEntityId(node.id)
              // Optional: zoom to node
              if (fgRef.current) {
                fgRef.current.centerAt(node.x, node.y, 1000)
                fgRef.current.zoom(3, 1000)
              }
            }}
            onBackgroundClick={() => setSelectedEntityId(null)}
            linkDirectionalArrowLength={3.5}
            linkDirectionalArrowRelPos={1}
            linkLabel="name"
            linkCurvature={0.25}
            linkColor={() => '#475569'}
            backgroundColor="#020617"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-2">
            <p className="text-sm">No lore entities match the active filters.</p>
          </div>
        )}
      </div>

      {/* Slide-out Entity Details Panel */}
      <div className={`w-80 bg-slate-900 border-l border-slate-800 shadow-2xl transition-transform duration-300 ease-in-out transform ${selectedEntity ? 'translate-x-0' : 'translate-x-full'} absolute right-0 top-0 bottom-0 z-20 flex flex-col overflow-y-auto`}>
        {selectedEntity && (
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: getCategoryColor(selectedEntity.category) }}>
                  {selectedEntity.category || 'Concept'}
                </div>
                <h2 className="text-xl font-bold text-slate-100">{selectedEntity.name}</h2>
              </div>
              <button 
                onClick={() => setSelectedEntityId(null)}
                className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedEntity.description && (
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Description</h3>
                <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {selectedEntity.description}
                </p>
              </div>
            )}

            {selectedEntity.attributes && Object.keys(selectedEntity.attributes).length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Attributes</h3>
                <div className="space-y-2">
                  {Object.entries(selectedEntity.attributes).map(([key, val]) => (
                    <div key={key} className="bg-slate-800/50 rounded p-2 text-sm">
                      <span className="text-slate-400 font-medium">{key}: </span>
                      <span className="text-slate-200">{String(val)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
