import { useRef, useCallback } from 'react'
import { triggerTacticalAI, triggerAmbientAI } from '../api'
import { useStore } from '../store'

export function useStoryAI() {
  const { 
    projectId, 
    activeChapterId, 
    setIsAnalyzing,
    setRightCollapsed,
    drafts,
    setDrafts
  } = useStore()

  const aiDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const processedBlockquotesRef = useRef<Set<string>>(new Set())
  const liveContentRef = useRef<string>('')

  // Helper to decode HTML entities into clean text for AI inputs
  const unescapeHtml = (html: string): string => {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    return doc.body.textContent || ""
  }

  const handleContentChangeForAI = useCallback((content: string) => {
    liveContentRef.current = content
    
    // Extract blockquotes
    const blockquoteMatches = Array.from(content.matchAll(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi))
    if (blockquoteMatches.length === 0) return
    
    // Check if there are any new blockquotes we haven't processed yet
    const newBlockquotes = blockquoteMatches
      .map((m) => {
        const text = unescapeHtml(m[1]).trim()
        const fingerprint = `${activeChapterId}:${text}`
        return { text, fingerprint }
      })
      .filter(item => item.text.length > 0 && !processedBlockquotesRef.current.has(item.fingerprint))

    if (newBlockquotes.length === 0) return

    if (aiDebounceRef.current) clearTimeout(aiDebounceRef.current)
    
    // Wait 7 seconds after typing stops before hitting Tactical AI
    aiDebounceRef.current = setTimeout(async () => {
      try {
        setIsAnalyzing(true)
        
        // Mark these blockquotes as processed immediately so we don't double-fire
        newBlockquotes.forEach(bq => processedBlockquotesRef.current.add(bq.fingerprint))
        
        // Strip HTML tags and decode entities down to plain text for the context
        const rawStripped = content.replace(/<(?!\/?blockquote\b)[^>]+>/gi, '\n')
        const cleanedContext = unescapeHtml(rawStripped)
        // Send only the new blockquotes as the system box text
        const systemBoxText = newBlockquotes.map(bq => bq.text).join('\n---\n')
        
        const response = await triggerTacticalAI({
          system_box_text: systemBoxText,
          surrounding_text: cleanedContext,
          project_id: projectId
        })
        if (response.drafts?.length > 0) {
          const stampedDrafts = response.drafts.map((d: any, idx: number) => ({
            ...d,
            id: Date.now() + idx,
            chapter_id: activeChapterId ?? undefined
          }))
          setDrafts(prev => [...prev, ...stampedDrafts])
        }
      } catch (err) {
        console.error("Tactical AI failed:", err)
        // Release blockquotes from processed set so subsequent typing can retry
        newBlockquotes.forEach(bq => processedBlockquotesRef.current.delete(bq.fingerprint))
      } finally {
        setIsAnalyzing(false)
      }
    }, 7000)
  }, [projectId, activeChapterId, setIsAnalyzing])

  const handleScanChapter = useCallback(async (activeChapterContent?: string) => {
    try {
      setIsAnalyzing(true)
      
      const contentToScan = liveContentRef.current || activeChapterContent || ''
      // Strip HTML tags and decode HTML entities down to plain text before sending to AI
      const rawStripped = contentToScan.replace(/<(?!\/?blockquote\b)[^>]+>/gi, '\n')
      const cleanedText = unescapeHtml(rawStripped)
      
      const response = await triggerAmbientAI({
        narrative_text: cleanedText,
        project_id: projectId
      })
      if (response.drafts?.length > 0) {
        const stampedDrafts = response.drafts.map((d: any, idx: number) => ({
          ...d,
          id: Date.now() + idx,
          chapter_id: activeChapterId ?? undefined
        }))
        setDrafts(prev => [...prev, ...stampedDrafts])
        setRightCollapsed(false) // Open right sidebar if there's results
      }
    } catch (err) {
      console.error("Ambient AI failed:", err)
    } finally {
      setIsAnalyzing(false)
    }
  }, [projectId, activeChapterId, setIsAnalyzing, setRightCollapsed])

  // Clear debounce when project changes
  useCallback(() => {
    if (aiDebounceRef.current) clearTimeout(aiDebounceRef.current)
  }, [projectId])

  return {
    drafts,
    setDrafts,
    handleContentChangeForAI,
    handleScanChapter
  }
}

