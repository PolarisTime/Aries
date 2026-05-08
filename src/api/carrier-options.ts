import { http } from './client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'
export interface CarrierOption {
  value: string
  label: string
  vehiclePlates?: string[]
}

let cachedCarriers: CarrierOption[] | null = null
let fetchFailed = false
let loadingCarriers: Promise<CarrierOption[]> | null = null

export async function fetchCarrierOptions(): Promise<CarrierOption[]> {
  if (cachedCarriers !== null) return cachedCarriers
  if (loadingCarriers) return loadingCarriers

  loadingCarriers = (async () => {
    const response = await http.get<ApiResponse<CarrierOption[]>>(ENDPOINTS.CARRIERS_OPTIONS)
    cachedCarriers = normalizeCarrierOptions(response.data || [])
    fetchFailed = false
    return cachedCarriers
  })()

  try {
    return await loadingCarriers
  } catch {
    fetchFailed = true
    return []
  } finally {
    loadingCarriers = null
  }
}

export function getCarrierOptions(): CarrierOption[] {
  if (cachedCarriers === null && !loadingCarriers && !fetchFailed) {
    fetchCarrierOptions()
  }
  return cachedCarriers || []
}

export function findCarrierOption(carrierName: unknown): CarrierOption | undefined {
  const normalizedCarrierName = String(carrierName || '').trim()
  if (!normalizedCarrierName) return undefined
  return getCarrierOptions().find((option) => String(option.value).trim() === normalizedCarrierName)
}

export function getCarrierVehiclePlateOptions(form?: Record<string, unknown>) {
  const carrier = findCarrierOption(form?.carrierName)
  return (carrier?.vehiclePlates || []).map((plate) => ({ label: plate, value: plate }))
}

export function reloadCarrierOptions() {
  cachedCarriers = null
  fetchFailed = false
  loadingCarriers = null
  return fetchCarrierOptions()
}

function normalizeCarrierOptions(options: CarrierOption[]): CarrierOption[] {
  return options.map((option) => ({
    ...option,
    label: String(option.label || ''),
    value: String(option.value || ''),
    vehiclePlates: Array.isArray(option.vehiclePlates)
      ? option.vehiclePlates.map((plate) => String(plate || '').trim()).filter(Boolean)
      : [],
  }))
}
