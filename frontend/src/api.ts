import axios from 'axios'

const api = axios.create({
    baseURL: 'http://localhost:8000/api',
})

export const fetchChapters = async (projectId: number) => {
    const { data } = await api.get('/chapters?project_id=' + projectId)
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
