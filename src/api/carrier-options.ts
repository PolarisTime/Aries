import { http } from './client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'

export interface CarrierOption {
  value: string
  label: string
}

let cached: CarrierOption[] | null = null
let fetchFailed = false

export async function fetchCarrierOptions(): Promise<CarrierOption[]> {
  if (cached && cached.length > 0) return cached
  try {
    const response = await http.get<ApiResponse<CarrierOption[]>>(ENDPOINTS.CARRIERS_OPTIONS)
    cached = response.data || []
    fetchFailed = false
    return cached
  } catch {
    fetchFailed = true
    return []
  }
}

export function getCarrierOptions(): CarrierOption[] {
  if (fetchFailed || (cached && cached.length === 0)) {
    cached = null
    fetchFailed = false
    fetchCarrierOptions()
  }
  return cached || []
}
