import axios from 'axios'

const api = axios.create({
    baseURL: 'http://localhost:8000/api',
})

export const fetchChapters = async (projectId: number) => {
    const { data } = await api.get('/chapters?project_id=' + projectId)
    return data
}

export const createChapter = async (payload: any) => {
    const { data } = await api.post('/chapters', payload)
    return data
}

export const updateChapter = async (chapterId: number, payload: any) => {
    const { data } = await api.put('/chapters/' + chapterId, payload)
    return data
}

export const fetchLore = async (projectId: number) => {
    const { data } = await api.get('/lore?project_id=' + projectId)
    return data
}

export const createLore = async (payload: any) => {
    const { data } = await api.post('/lore', payload)
    return data
}

export const fetchCharacters = async (projectId: number) => {
    const { data } = await api.get('/characters?project_id=' + projectId)
    return data
}

export const fetchCharacterLedger = async (characterId: number) => {
    const { data } = await api.get('/characters/' + characterId + '/ledger')
    return data
}
export const triggerTacticalAI = async (payload: any) => {
    const { data } = await api.post('/ai/tactical', payload)
    return data
}

export const triggerAmbientAI = async (payload: any) => {
    const { data } = await api.post('/ai/ambient', payload)
    return data
}

export const acceptActionDraft = async (characterId: number, characterUpdate: any, ledgerEntry: any) => {
    // 1. Update character stats
    await api.put('/characters/' + characterId, characterUpdate)
    // 2. Add ledger entry
    await api.post('/characters/' + characterId + '/ledger', ledgerEntry)
}
