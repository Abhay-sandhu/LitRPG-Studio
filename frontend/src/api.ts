import axios from 'axios'

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
})

// --- Interfaces ---
export interface Chapter {
    id: number
    project_id: number
    title: string
    content: string
    words: number
    order: number
}

export interface ChapterCreatePayload {
    project_id: number
    title: string
    content?: string
    words?: number
    order?: number
}

export interface ChapterUpdatePayload {
    title?: string
    content?: string
    words?: number
    order?: number
}

export interface LoreEntity {
    id: number
    project_id: number
    name: string
    category: string
    description: string
    attributes: Record<string, any>
    is_promoted: boolean
}

export interface LoreCreatePayload {
    project_id: number
    name: string
    category: string
    description?: string
    attributes?: Record<string, any>
    is_promoted?: boolean
}

export interface Character {
    id: number
    project_id: number
    name: string
    is_protagonist: boolean
    stats: Record<string, any>
    formulas: Record<string, any>
}

export interface LedgerEntry {
    id: number
    character_id: number
    chapter_id: number
    event_name: string
    changes: Record<string, any>
    source_type: string
    timestamp: string
}

export interface TacticalAIPayload {
    system_box_text: string
    surrounding_text: string
    project_id: number
    character_id?: number
}

export interface AmbientAIPayload {
    narrative_text: string
    project_id: number
}

export interface AcceptActionPayload {
    stats: Record<string, any>
}

export interface AcceptActionLedgerPayload {
    character_id: number
    chapter_id: number
    event_name: string
    changes: Record<string, any>
    source_type: string
}

// --- API Calls ---

export const fetchChapters = async (projectId: number): Promise<Chapter[]> => {
    const { data } = await api.get<Chapter[]>('/chapters?project_id=' + projectId)
    return data
}

export const createChapter = async (payload: ChapterCreatePayload): Promise<Chapter> => {
    const { data } = await api.post<Chapter>('/chapters', payload)
    return data
}

export const updateChapter = async (chapterId: number, payload: ChapterUpdatePayload): Promise<Chapter> => {
    const { data } = await api.put<Chapter>('/chapters/' + chapterId, payload)
    return data
}

export const fetchLore = async (projectId: number): Promise<LoreEntity[]> => {
    const { data } = await api.get<LoreEntity[]>('/lore?project_id=' + projectId)
    return data
}

export const createLore = async (payload: LoreCreatePayload): Promise<LoreEntity> => {
    const { data } = await api.post<LoreEntity>('/lore', payload)
    return data
}

export const updateLore = async (loreId: number, payload: Partial<LoreCreatePayload>): Promise<LoreEntity> => {
    const { data } = await api.put<LoreEntity>('/lore/' + loreId, payload)
    return data
}

export const deleteLore = async (loreId: number): Promise<void> => {
    await api.delete('/lore/' + loreId)
}

export const createLoreRelationshipsBulk = async (projectId: number, relationships: any[]) => {
    const { data } = await api.post('/lore-relationships/bulk', {
        project_id: projectId,
        relationships
    })
    return data
}

export const fetchCharacters = async (projectId: number): Promise<Character[]> => {
    const { data } = await api.get<Character[]>('/characters?project_id=' + projectId)
    return data
}

export const fetchCharacterLedger = async (characterId: number): Promise<LedgerEntry[]> => {
    const { data } = await api.get<LedgerEntry[]>('/characters/' + characterId + '/ledger')
    return data
}

export const triggerTacticalAI = async (payload: TacticalAIPayload) => {
    const { data } = await api.post('/ai/tactical', payload)
    return data
}

export const triggerAmbientAI = async (payload: AmbientAIPayload) => {
    const { data } = await api.post('/ai/ambient', payload)
    return data
}

export const updateCharacter = async (characterId: number, payload: any) => {
    const { data } = await api.put(`/characters/${characterId}`, payload)
    return data
}

export const acceptActionDraft = async (
    characterId: number, 
    characterPayload: AcceptActionPayload & { formulas?: any }, 
    ledgerPayload: AcceptActionLedgerPayload
) => {
    const { data } = await api.post(`/characters/${characterId}/accept-draft`, {
        character_stats: characterPayload.stats,
        character_formulas: characterPayload.formulas,
        ledger: ledgerPayload
    })
    return data
}
