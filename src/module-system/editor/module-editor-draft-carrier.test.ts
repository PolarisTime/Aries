import { describe, expect, it } from 'vitest'
import { normalizeDraftRecordForModule } from '@/module-system/editor/module-editor-draft'
import type {
  LegacyModuleLineItem,
  LegacyModuleRecordInput,
} from '@/types/module-record'

/**
 * 物流方「车辆数组」提交载荷回归测试。
 *
 * <p>表单把最多 3 辆车铺成扁平字段（`vehiclePlate` / `vehicleContact` / `vehiclePhone` /
 * `vehicleRemark` 各 1~3），真正提交给后端的却是 `vehicles: [{ vehicleId?, plate, contact, phone, remark }]`。
 * 组装由 behavior `normalizeDraftRecord: normalizeCarrierDraftRecord` 完成，
 * 通用编辑器提交链路（`use-editor-submission-controller` → `normalizeDraftRecordForModule`）调用它。
 *
 * <p>覆盖点（原先由已删除的 `CarrierPage.spec` 覆盖，页面迁到通用列表页后丢失）：
 * 新建时按槽位组装并丢弃空槽位、车牌去空白转大写、编辑时整组替换（保留/删除/新增/顺序），
 * 以及库里遗留的 `id` 字段仍映射为 `vehicleId`。断言只看**提交载荷的 vehicles 数组**，
 * 不碰适配器内部实现。</p>
 */
const sumLineItemsBy = (items: LegacyModuleLineItem[], key: string) =>
  items.reduce((sum, item) => sum + (Number(item[key]) || 0), 0)

function submit(record: LegacyModuleRecordInput): LegacyModuleRecordInput {
  return normalizeDraftRecordForModule({
    moduleKey: 'carrier',
    record,
    items: [],
    currentOperatorName: 'tester',
    sumLineItemsBy,
  })
}

/** 三个槽位共 12 个扁平字段，统一清空，便于按需覆盖。 */
function emptyVehicleSlots(): LegacyModuleRecordInput {
  const slots = ['', '2', '3']
  return Object.fromEntries(
    slots.flatMap((suffix) => [
      [`vehiclePlate${suffix}`, ''],
      [`vehicleContact${suffix}`, ''],
      [`vehiclePhone${suffix}`, ''],
      [`vehicleRemark${suffix}`, ''],
    ]),
  )
}

describe('物流方提交载荷：vehicles 数组组装', () => {
  it('新建：按槽位组装、丢弃空槽位，车牌去空白转大写，空司机不落假数据', () => {
    const draft = submit({
      ...emptyVehicleSlots(),
      carrierName: '测试物流',
      // 槽位 1：带首尾空白的脏输入
      vehiclePlate: '  京a11111 ',
      vehicleContact: ' 司机一 ',
      vehiclePhone: ' 13800000001 ',
      vehicleRemark: ' 备注一 ',
      // 槽位 2：只有车牌和电话，联系人为空（合法：允许只登记车牌）
      vehiclePlate2: '京b22222',
      vehiclePhone2: '13800000002',
      // 槽位 3：全空，提交时不得出现空行
    })

    expect(draft.vehicles).toEqual([
      {
        plate: '京A11111',
        contact: '司机一',
        phone: '13800000001',
        remark: '备注一',
      },
      { plate: '京B22222', contact: '', phone: '13800000002', remark: '' },
    ])

    // 同一物流商不允许重复车牌（大小写与空白归一后再判重）
    expect(() =>
      submit({
        ...emptyVehicleSlots(),
        vehiclePlate: '京A11111',
        vehiclePlate2: ' 京a11111 ',
      }),
    ).toThrow('同一物流商不能配置重复车牌')

    // 有联系人但没车牌属于半截行，必须报错而不是静默丢弃
    expect(() =>
      submit({
        ...emptyVehicleSlots(),
        vehicleContact: '司机一',
      }),
    ).toThrow('第 1 辆车的车牌不能为空')
  })

  it('编辑：整组替换（保留/删除/新增/顺序），旧 id 兼容为 vehicleId', () => {
    const edited = submit({
      vehicles: [
        {
          vehicleId: '8001',
          plate: '京A11111',
          contact: '司机一',
          phone: '13800000001',
          remark: '旧备注',
        },
        // 槽位 2 在表单里被清空 → 此行应删除
        {
          vehicleId: '8002',
          plate: '京B22222',
          contact: '司机二',
          phone: '13800000002',
          remark: '',
        },
        // 槽位 3 库里是旧字段名 id → 提交时归一为 vehicleId 且换车牌
        {
          id: '8003',
          plate: '京C33333',
          contact: '司机三',
          phone: '13800000003',
          remark: '',
        },
        // 第 4 辆超出 3 个固定槽位：不在表单里改，按原样保留并排在最后
        {
          vehicleId: '8004',
          plate: '京D44444',
          contact: '司机四',
          phone: '13800000004',
          remark: '',
        },
      ],
      // 槽位 1：保留该行，仅改联系人（首尾空白去掉）
      vehiclePlate: '京a11111',
      vehicleContact: ' 司机一改 ',
      vehiclePhone: '13800000001',
      vehicleRemark: '旧备注',
      // 槽位 2：清空 → 删除
      vehiclePlate2: '',
      vehicleContact2: '',
      vehiclePhone2: '',
      vehicleRemark2: '',
      // 槽位 3：沿用旧 id、换车牌（车牌归一为大写）
      vehiclePlate3: ' 京e55555 ',
      vehicleContact3: '司机三',
      vehiclePhone3: '13800000003',
      vehicleRemark3: '',
    })

    expect(edited.vehicles).toEqual([
      {
        vehicleId: '8001',
        plate: '京A11111',
        contact: '司机一改',
        phone: '13800000001',
        remark: '旧备注',
      },
      {
        vehicleId: '8003',
        plate: '京E55555',
        contact: '司机三',
        phone: '13800000003',
        remark: '',
      },
      {
        vehicleId: '8004',
        plate: '京D44444',
        contact: '司机四',
        phone: '13800000004',
        remark: '',
      },
    ])

    // 只填槽位 3 时是「新增一行」，不带任何 vehicleId，且排在有 id 的行之后（槽位顺序优先）
    const appended = submit({
      ...emptyVehicleSlots(),
      vehicles: [
        {
          vehicleId: '9001',
          plate: '京A11111',
          contact: '',
          phone: '',
          remark: '',
        },
      ],
      vehiclePlate: '京A11111',
      vehiclePlate3: '京f66666',
    })

    expect(appended.vehicles).toEqual([
      {
        vehicleId: '9001',
        plate: '京A11111',
        contact: '',
        phone: '',
        remark: '',
      },
      { plate: '京F66666', contact: '', phone: '', remark: '' },
    ])
  })
})
