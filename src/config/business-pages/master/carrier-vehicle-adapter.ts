import type { EntityId } from '@/types/entity-id'
import { parseOptionalEntityId } from '@/types/entity-id'
import type { ModuleRecord } from '@/types/module-page'

type VehicleRecord = Record<string, unknown>

interface CarrierVehiclePayload {
  vehicleId?: EntityId
  plate: string
  contact: string
  phone: string
  remark: string
}

const VEHICLE_SLOTS = [
  {
    plate: 'vehiclePlate',
    contact: 'vehicleContact',
    phone: 'vehiclePhone',
    remark: 'vehicleRemark',
  },
  {
    plate: 'vehiclePlate2',
    contact: 'vehicleContact2',
    phone: 'vehiclePhone2',
    remark: 'vehicleRemark2',
  },
  {
    plate: 'vehiclePlate3',
    contact: 'vehicleContact3',
    phone: 'vehiclePhone3',
    remark: 'vehicleRemark3',
  },
] as const

function text(value: unknown): string {
  return value == null ? '' : String(value).trim()
}

function normalizePlate(value: unknown): string {
  return text(value).toUpperCase()
}

function asVehicleRecord(value: unknown, index: number): VehicleRecord {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`第 ${index + 1} 辆车辆数据格式无效`)
  }
  return value as VehicleRecord
}

function readVehicles(value: unknown): VehicleRecord[] {
  if (value === undefined || value === null) {
    return []
  }
  if (!Array.isArray(value)) {
    throw new Error('车辆集合数据格式无效')
  }
  return value.map(asVehicleRecord)
}

function resolveVehicleId(
  vehicle: VehicleRecord,
  index: number,
): EntityId | undefined {
  const vehicleId = parseOptionalEntityId(
    vehicle.vehicleId,
    `vehicles[${index}].vehicleId`,
  )
  const legacyId = parseOptionalEntityId(vehicle.id, `vehicles[${index}].id`)
  if (vehicleId && legacyId && vehicleId !== legacyId) {
    throw new Error(`第 ${index + 1} 辆车辆 ID 冲突`)
  }
  return vehicleId ?? legacyId
}

function toVehiclePayload(
  vehicle: VehicleRecord,
  index: number,
): CarrierVehiclePayload {
  const vehicleId = resolveVehicleId(vehicle, index)
  return {
    ...(vehicleId ? { vehicleId } : {}),
    plate: normalizePlate(vehicle.plate),
    contact: text(vehicle.contact),
    phone: text(vehicle.phone),
    remark: text(vehicle.remark),
  }
}

function hasOwn(record: ModuleRecord, key: string): boolean {
  return Object.hasOwn(record, key)
}

function buildSlotVehicle(
  record: ModuleRecord,
  existing: VehicleRecord | undefined,
  slotIndex: number,
): CarrierVehiclePayload | undefined {
  const slot = VEHICLE_SLOTS[slotIndex]
  if (!slot) {
    return undefined
  }
  const hasFlatValues = Object.values(slot).some((key) => hasOwn(record, key))
  if (!hasFlatValues) {
    return existing ? toVehiclePayload(existing, slotIndex) : undefined
  }

  const plate = normalizePlate(record[slot.plate])
  const contact = text(record[slot.contact])
  const phone = text(record[slot.phone])
  const remark = text(record[slot.remark])
  if (!plate) {
    if (contact || phone || remark) {
      throw new Error(`第 ${slotIndex + 1} 辆车的车牌不能为空`)
    }
    return undefined
  }

  const vehicleId = existing ? resolveVehicleId(existing, slotIndex) : undefined
  return {
    ...(vehicleId ? { vehicleId } : {}),
    plate,
    contact,
    phone,
    remark,
  }
}

function assertUniqueVehicles(vehicles: CarrierVehiclePayload[]): void {
  const ids = new Set<EntityId>()
  const plates = new Set<string>()
  for (const vehicle of vehicles) {
    if (vehicle.vehicleId) {
      if (ids.has(vehicle.vehicleId)) {
        throw new Error('车辆 ID 不能重复')
      }
      ids.add(vehicle.vehicleId)
    }
    if (!vehicle.plate) {
      throw new Error('车牌不能为空')
    }
    if (plates.has(vehicle.plate)) {
      throw new Error('同一物流商不能配置重复车牌')
    }
    plates.add(vehicle.plate)
  }
}

export function normalizeCarrierEditorRecord(
  record: ModuleRecord,
): ModuleRecord {
  if (!hasOwn(record, 'vehicles')) {
    return { ...record }
  }

  const vehicles = readVehicles(record.vehicles)
  const normalizedVehicles = vehicles.map(toVehiclePayload)
  assertUniqueVehicles(normalizedVehicles)
  const { vehicles: _vehicles, ...editorRecord } = record

  for (let index = 0; index < VEHICLE_SLOTS.length; index += 1) {
    const slot = VEHICLE_SLOTS[index]
    const vehicle = normalizedVehicles[index]
    editorRecord[slot.plate] = vehicle?.plate ?? ''
    editorRecord[slot.contact] = vehicle?.contact ?? ''
    editorRecord[slot.phone] = vehicle?.phone ?? ''
    editorRecord[slot.remark] = vehicle?.remark ?? ''
  }
  return editorRecord
}

export function normalizeCarrierDraftRecord(record: ModuleRecord): void {
  const existingVehicles = readVehicles(record.vehicles)
  const visibleVehicles = VEHICLE_SLOTS.flatMap((_, index) => {
    const vehicle = buildSlotVehicle(record, existingVehicles[index], index)
    return vehicle ? [vehicle] : []
  })
  const overflowVehicles = existingVehicles
    .slice(VEHICLE_SLOTS.length)
    .map((vehicle, index) =>
      toVehiclePayload(vehicle, index + VEHICLE_SLOTS.length),
    )
  const vehicles = [...visibleVehicles, ...overflowVehicles]
  assertUniqueVehicles(vehicles)
  record.vehicles = vehicles
}
