import { describe, expect, it, vi } from 'vitest'
import { moduleBehaviorRegistry } from '@/module-system/module-behavior-registry-core'
import type { ModuleRecord } from '@/types/module-page'
import {
  normalizeCarrierDraftRecord,
  normalizeCarrierEditorRecord,
} from './carrier-vehicle-adapter'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

vi.mock('@/constants/module-options', () => ({
  enabledStatusOptions: [],
  getSettlementCompanyOptions: vi.fn(),
}))

import { carriersPageConfig } from './carrier-page'

describe('carriersPageConfig', () => {
  it('has correct key', () => {
    expect(carriersPageConfig.key).toBe('carrier')
  })

  it('has primaryNoKey', () => {
    expect(carriersPageConfig.primaryNoKey).toBe('carrierCode')
  })

  it('has filters', () => {
    expect(carriersPageConfig.filters).toBeDefined()
    expect(carriersPageConfig.filters!.length).toBeGreaterThanOrEqual(2)
  })

  it('has columns', () => {
    expect(carriersPageConfig.columns).toBeDefined()
    expect(carriersPageConfig.columns.length).toBeGreaterThan(0)
  })

  it('keeps carrier settlement context visible and hides secondary details by default', () => {
    const columnKeys = carriersPageConfig.columns.map(
      (column) => column.dataIndex,
    )
    const hiddenKeys = carriersPageConfig.defaultHiddenColumnKeys ?? []
    const visibleKeys = columnKeys.filter((key) => !hiddenKeys.includes(key))

    expect(hiddenKeys).toEqual(['contactPhone', 'vehicleType', 'remark'])
    expect(columnKeys).toEqual(expect.arrayContaining(hiddenKeys))
    expect(visibleKeys).toEqual(
      expect.arrayContaining([
        'carrierCode',
        'carrierName',
        'contactName',
        'priceMode',
        'defaultSettlementCompanyName',
        'status',
      ]),
    )
    expect(hiddenKeys.length).toBeLessThan(columnKeys.length * 0.6)
  })

  it('has formFields', () => {
    expect(carriersPageConfig.formFields).toBeDefined()
    expect(carriersPageConfig.formFields!.length).toBeGreaterThan(0)
  })

  it('has default settlement company field', () => {
    expect(
      carriersPageConfig.columns.map((column) => column.dataIndex),
    ).toContain('defaultSettlementCompanyName')
    expect(carriersPageConfig.formFields?.map((field) => field.key)).toContain(
      'defaultSettlementCompanyId',
    )
    expect(carriersPageConfig.saveFields?.scalar).toContain(
      'defaultSettlementCompanyName',
    )
  })

  it('saves the backend vehicles collection instead of legacy flat vehicle fields', () => {
    const scalarFields = carriersPageConfig.saveFields?.scalar ?? []

    expect(scalarFields).toContain('vehicles')
    expect(scalarFields).not.toEqual(
      expect.arrayContaining([
        'vehiclePlate',
        'vehicleContact',
        'vehiclePhone',
        'vehicleRemark',
        'vehiclePlate2',
        'vehicleContact2',
        'vehiclePhone2',
        'vehicleRemark2',
        'vehiclePlate3',
        'vehicleContact3',
        'vehiclePhone3',
        'vehicleRemark3',
      ]),
    )
  })

  it('hydrates nested vehicles into the existing three flat editor rows without mutating the API record', () => {
    const behavior = moduleBehaviorRegistry.get('carrier') as
      | {
          normalizeEditorRecord?: (record: ModuleRecord) => ModuleRecord
        }
      | undefined
    const normalizeEditorRecord = behavior?.normalizeEditorRecord
    expect(normalizeEditorRecord).toBeTypeOf('function')
    if (!normalizeEditorRecord) return

    const source = {
      id: '308251467645452280',
      carrierName: '物流商A',
      vehicles: [
        {
          id: '308251467645452281',
          vehicleId: '308251467645452281',
          plate: '沪A10001',
          contact: '司机甲',
          phone: '13800000001',
          remark: '主车',
        },
        {
          id: '308251467645452282',
          vehicleId: '308251467645452282',
          plate: '沪A10002',
          contact: '司机乙',
          phone: '13800000002',
          remark: '备用',
        },
      ],
    } as ModuleRecord

    const editorRecord = normalizeEditorRecord(source)

    expect(editorRecord).toMatchObject({
      id: source.id,
      carrierName: '物流商A',
      vehiclePlate: '沪A10001',
      vehicleContact: '司机甲',
      vehiclePhone: '13800000001',
      vehicleRemark: '主车',
      vehiclePlate2: '沪A10002',
      vehicleContact2: '司机乙',
      vehiclePhone2: '13800000002',
      vehicleRemark2: '备用',
      vehiclePlate3: '',
    })
    expect(editorRecord).not.toHaveProperty('vehicles')
    expect(source).not.toHaveProperty('vehiclePlate')
    expect(source.vehicles).toHaveLength(2)
  })

  it('rebuilds vehicles from flat editor rows while retaining each vehicle id and hidden overflow rows', () => {
    const behavior = moduleBehaviorRegistry.get('carrier') as
      | {
          normalizeDraftRecord?: (record: ModuleRecord) => void
        }
      | undefined
    const normalizeDraftRecord = behavior?.normalizeDraftRecord
    expect(normalizeDraftRecord).toBeTypeOf('function')
    if (!normalizeDraftRecord) return

    const draft = {
      id: '308251467645452280',
      vehicles: [
        {
          id: '308251467645452281',
          vehicleId: '308251467645452281',
          plate: '沪A00001',
        },
        {
          id: '308251467645452282',
          vehicleId: '308251467645452282',
          plate: '沪A00002',
        },
        {
          id: '308251467645452283',
          vehicleId: '308251467645452283',
          plate: '沪A00003',
        },
        {
          id: '308251467645452284',
          vehicleId: '308251467645452284',
          plate: '沪A00004',
          contact: '隐藏车辆',
        },
      ],
      vehiclePlate: ' 沪a10001 ',
      vehicleContact: ' 司机甲 ',
      vehiclePhone: ' 13800000001 ',
      vehicleRemark: ' 主车 ',
      vehiclePlate2: '',
      vehicleContact2: '',
      vehiclePhone2: '',
      vehicleRemark2: '',
      vehiclePlate3: '沪A10003',
      vehicleContact3: '司机丙',
      vehiclePhone3: '13800000003',
      vehicleRemark3: '三号车',
    } as ModuleRecord

    normalizeDraftRecord(draft)

    expect(draft.vehicles).toEqual([
      {
        vehicleId: '308251467645452281',
        plate: '沪A10001',
        contact: '司机甲',
        phone: '13800000001',
        remark: '主车',
      },
      {
        vehicleId: '308251467645452283',
        plate: '沪A10003',
        contact: '司机丙',
        phone: '13800000003',
        remark: '三号车',
      },
      {
        vehicleId: '308251467645452284',
        plate: '沪A00004',
        contact: '隐藏车辆',
        phone: '',
        remark: '',
      },
    ])
  })

  it('fails closed when vehicle ids conflict or normalized plates repeat', () => {
    const behavior = moduleBehaviorRegistry.get('carrier') as
      | {
          normalizeEditorRecord?: (record: ModuleRecord) => ModuleRecord
          normalizeDraftRecord?: (record: ModuleRecord) => void
        }
      | undefined
    expect(behavior?.normalizeEditorRecord).toBeTypeOf('function')
    expect(behavior?.normalizeDraftRecord).toBeTypeOf('function')
    if (!behavior?.normalizeEditorRecord || !behavior.normalizeDraftRecord) {
      return
    }

    expect(() =>
      behavior.normalizeEditorRecord?.({
        id: '308251467645452280',
        vehicles: [
          {
            id: '308251467645452281',
            vehicleId: '308251467645452282',
            plate: '沪A10001',
          },
        ],
      } as ModuleRecord),
    ).toThrow('车辆 ID 冲突')

    const duplicatePlateDraft = {
      id: '308251467645452280',
      vehicles: [],
      vehiclePlate: '沪A10001',
      vehiclePlate2: ' 沪a10001 ',
    } as ModuleRecord
    expect(() => normalizeCarrierDraftRecord(duplicatePlateDraft)).toThrow(
      '重复车牌',
    )
  })

  it('fails closed for unsafe numeric or duplicate vehicle ids', () => {
    expect(() =>
      normalizeCarrierEditorRecord({
        id: '308251467645452280',
        vehicles: [
          {
            vehicleId: Number.MAX_SAFE_INTEGER + 1,
            plate: '沪A10001',
          },
        ],
      } as ModuleRecord),
    ).toThrow('vehicles[0].vehicleId')

    expect(() =>
      normalizeCarrierDraftRecord({
        id: '308251467645452280',
        vehicles: [
          {
            vehicleId: '308251467645452281',
            plate: '沪A10001',
          },
          {
            vehicleId: '308251467645452281',
            plate: '沪A10002',
          },
        ],
      } as ModuleRecord),
    ).toThrow('车辆 ID 不能重复')
  })

  it('buildOverview returns result', () => {
    const result = carriersPageConfig.buildOverview!([])
    expect(Array.isArray(result)).toBe(true)
  })
})
