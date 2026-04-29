import { http } from './client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'

export interface CarrierOption {
  value: string
  label: string
}

let cachedCarriers: CarrierOption[] | null = null
let fetchFailed = false

export async function fetchCarrierOptions(): Promise<CarrierOption[]> {
  if (cachedCarriers && cachedCarriers.length > 0) return cachedCarriers
  try {
    const response = await http.get<ApiResponse<CarrierOption[]>>(ENDPOINTS.CARRIERS_OPTIONS)
    cachedCarriers = response.data || []
    fetchFailed = false
    return cachedCarriers
  } catch {
    fetchFailed = true
    return []
  }
}

export function getCarrierOptions(): CarrierOption[] {
  if (fetchFailed || (cachedCarriers && cachedCarriers.length === 0)) {
    cachedCarriers = null
    fetchFailed = false
    fetchCarrierOptions()
  }
  return cachedCarriers || []
}

export function reloadCarrierOptions() {
  cachedCarriers = null
  fetchFailed = false
  return fetchCarrierOptions()
}
