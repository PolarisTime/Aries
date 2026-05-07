import { http } from './client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'
import { shallowRef } from 'vue'

export interface MaterialGradeOption {
  value: string
  label: string
}

const cachedGrades = shallowRef<MaterialGradeOption[] | null>(null)
let fetchFailed = false
let loadingGrades: Promise<MaterialGradeOption[]> | null = null

export async function fetchMaterialGrades(): Promise<MaterialGradeOption[]> {
  if (cachedGrades.value !== null) return cachedGrades.value
  if (loadingGrades) return loadingGrades

  loadingGrades = (async () => {
    const response = await http.get<ApiResponse<string[]>>(ENDPOINTS.MATERIAL_GRADES)
    const list = response.data || []
    cachedGrades.value = normalizeMaterialGrades(list)
    fetchFailed = false
    return cachedGrades.value
  })()

  try {
    return await loadingGrades
  } catch {
    fetchFailed = true
    return []
  } finally {
    loadingGrades = null
  }
}

export function getCachedMaterialGrades(): MaterialGradeOption[] {
  return cachedGrades.value || []
}

export function getMaterialGradeOptions(): MaterialGradeOption[] {
  if (cachedGrades.value === null && !loadingGrades) {
    if (fetchFailed) {
      fetchFailed = false
    }
    fetchMaterialGrades()
  }
  return cachedGrades.value || []
}

export function reloadMaterialGrades() {
  cachedGrades.value = null
  fetchFailed = false
  loadingGrades = null
  return fetchMaterialGrades()
}

function normalizeMaterialGrades(values: string[]) {
  return values
    .map((value) => {
      const text = String(value || '').trim()
      return { value: text, label: text }
    })
    .filter((option) => option.value)
}
