import { http } from './client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'

export interface CarrierOption {
  value: string
  label: string
}

let cachedCarriers: CarrierOption[] | null = null

export async function fetchCarrierOptions(): Promise<CarrierOption[]> {
  if (cachedCarriers) return cachedCarriers
  try {
    const response = await http.get<ApiResponse<CarrierOption[]>>(ENDPOINTS.CARRIERS_OPTIONS)
    cachedCarriers = response.data || []
    return cachedCarriers
  } catch {
    return []
  }
}
