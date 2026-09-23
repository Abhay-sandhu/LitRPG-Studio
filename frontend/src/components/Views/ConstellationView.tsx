import React, { useEffect, useState, useRef, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import ForceGraph2D from 'react-force-graph-2d'
import { fetchLore, fetchLoreRelationships } from '../../api'
import type { LoreEntity } from '../../api'

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
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

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

  const graphData = useMemo(() => {
    const validNodeIds = new Set(lore.map((e: LoreEntity) => e.id))

    const nodes = lore.map((entity: LoreEntity) => ({
      id: entity.id,
      name: entity.name,
      val: 2,
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
  }, [lore, relationships])

  return (
    <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden relative" ref={containerRef}>
      <div className="absolute top-4 left-4 z-10 bg-slate-900/80 backdrop-blur border border-slate-700 text-slate-200 px-4 py-3 rounded-lg shadow-xl pointer-events-none">
        <h2 className="text-sm font-bold uppercase tracking-wider mb-2 text-slate-400">Legend</h2>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
            <div key={cat} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span>{cat}</span>
            </div>
          ))}
        </div>
      </div>
      
      {isLoadingLore ? (
        <div className="flex-1 flex items-center justify-center text-slate-500">
          Loading constellation...
        </div>
      ) : graphData.nodes.length > 0 ? (
        <ForceGraph2D
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          nodeLabel="name"
          nodeColor="color"
          linkDirectionalArrowLength={3.5}
          linkDirectionalArrowRelPos={1}
          linkLabel="name"
          linkCurvature={0.25}
          linkColor={() => '#475569'}
          nodeRelSize={6}
          backgroundColor="#020617"
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-2">
          <p className="text-sm">No lore entities found in this project.</p>
          <p className="text-xs text-slate-600">Create entries in the Story Bible to visualize your world's constellation graph.</p>
        </div>
      )}
    </div>
  )
}
