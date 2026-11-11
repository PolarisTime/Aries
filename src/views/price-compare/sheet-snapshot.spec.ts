import { describe, expect, it } from 'vitest'
import type { QuoteSheetRecord } from '@/api/market/quote-sheets'
import {
  buildBaseline,
  buildHeaderPayload,
  buildItemPayload,
  buildPayload,
  headerSignature,
  isCompleteRow,
  isPersistable,
  isPersistableRow,
  isServerId,
  itemSignature,
  mergeRowsPreservingIncomplete,
  orderSignature,
  remapInputKeys,
  sheetContentFingerprint,
  toPriceSheet,
} from './sheet-snapshot'
import type { Brand, PriceRow, PriceSheet, ProjectConfig } from './types'

function makeRow(overrides: Partial<PriceRow> = {}): PriceRow {
  return {
    id: 'row-1',
    category: '螺纹钢',
    material: 'HRB400',
    spec: 20,
    length: '9米',
    ...overrides,
  }
}

function makeSheet(overrides: Partial<PriceSheet> = {}): PriceSheet {
  return {
    id: 'sheet-1',
    name: '批次 1',
    status: '报价',
    projectId: 'project-1',
    projectName: '项目一',
    orderDate: '2026-10-31',
    refDate: '2026-10-31',
    refPeriod: '上午',
    lengthPremium: 30,
    inputs: {},
    rows: [makeRow()],
    ...overrides,
  }
}

const brands: Brand[] = [{ name: '中天', freight: 30 }]

function makeConfig(overrides: Partial<ProjectConfig> = {}): ProjectConfig {
  return {
    brands,
    lengthPremium: 30,
    hrb400eFallback: false,
    version: '1',
    ...overrides,
  }
}

describe('服务端快照纯逻辑(sheet-snapshot)', () => {
  it('isServerId 只认十进制雪花 id, 本地临时行 id 不算', () => {
    expect(isServerId('363907829455855616')).toBe(true)
    expect(isServerId('0')).toBe(false)
    expect(isServerId('abc123')).toBe(false)
    expect(isServerId('')).toBe(false)
  })

  it('商品行完整性/可落库判定: 隔断行恒可落库, 商品行需商品信息齐全', () => {
    expect(isCompleteRow(makeRow())).toBe(true)
    expect(isCompleteRow(makeRow({ material: '' }))).toBe(false)
    expect(isPersistableRow({ ...makeRow(), rowType: 'SEPARATOR' })).toBe(true)
    expect(isPersistableRow(makeRow({ spec: null }))).toBe(false)
  })

  it('单据可持久化: 需参照/报单日期、品牌与非空完整行', () => {
    const sheet = makeSheet()
    expect(isPersistable(sheet, makeConfig())).toBe(true)
    expect(isPersistable(makeSheet({ refDate: '' }), makeConfig())).toBe(false)
    expect(isPersistable(sheet, makeConfig({ brands: [] }))).toBe(false)
    expect(
      isPersistable(
        makeSheet({ rows: [makeRow({ category: '' })] }),
        makeConfig(),
      ),
    ).toBe(false)
  })

  it('刷新合并: 不完整商品行按本地位次保留, 完整行以服务端为准', () => {
    const incomplete = makeRow({ id: 'local-1', category: '' })
    const local = [makeRow({ id: 'r1' }), incomplete, makeRow({ id: 'r2' })]
    const server = [makeRow({ id: 'r1' }), makeRow({ id: 'r3' })]

    const merged = mergeRowsPreservingIncomplete(local, server)
    expect(merged.map((row) => row.id)).toEqual(['r1', 'local-1', 'r3'])
  })

  it('行指纹感知: 吨位/锁定/关联集合/价格任一变化都会不同, 无关字段不敏感', () => {
    const row = makeRow()
    const base = itemSignature(row, { '中天:row-1': { spot: 3200 } })

    expect(itemSignature({ ...row, ton: 10 }, {})).not.toBe(base)
    expect(itemSignature({ ...row, locked: true }, {})).not.toBe(base)
    expect(itemSignature(row, { '中天:row-1': { spot: 3201 } })).not.toBe(
      itemSignature(row, { '中天:row-1': { spot: 3200 } }),
    )
    // 行 id / 隔断行无关字段(remark 之外)不参与: 同一内容重复计算结果稳定
    expect(itemSignature(row, { '中天:row-1': { spot: 3200 } })).toBe(base)
  })

  it('表头指纹只覆盖头字段, 行/品牌改动不影响', () => {
    const sheet = makeSheet()
    const changedRows = makeSheet({ rows: [makeRow({ id: 'row-2' })] })
    expect(headerSignature(changedRows)).toBe(headerSignature(sheet))
    expect(headerSignature(makeSheet({ name: '批次 2' }))).not.toBe(
      headerSignature(sheet),
    )
  })

  it('行顺序签名只统计可落库行', () => {
    const sheet = makeSheet({
      rows: [
        makeRow({ id: 'r1' }),
        makeRow({ id: 'local', material: '' }),
        { ...makeRow({ id: 'r2' }), rowType: 'SEPARATOR' },
      ],
    })
    expect(orderSignature(sheet)).toBe('r1,r2')
  })

  it('内容指纹随头部/行/输入变化', () => {
    const sheet = makeSheet()
    expect(sheetContentFingerprint(sheet)).toBe(
      sheetContentFingerprint(makeSheet()),
    )
    expect(sheetContentFingerprint(makeSheet({ remark: 'x' }))).not.toBe(
      sheetContentFingerprint(sheet),
    )
  })

  it('基线只记录可落库行(未完成行不进基线)', () => {
    const sheet = makeSheet({
      rows: [
        makeRow({ id: 'r1' }),
        makeRow({ id: 'local', category: '' }),
        { ...makeRow({ id: 'r2' }), rowType: 'SEPARATOR' },
      ],
    })
    const baseline = buildBaseline(sheet)
    expect([...baseline.items.keys()]).toEqual(['r1', 'r2'])
    expect(baseline.order).toBe('r1,r2')
    expect(baseline.header).toBe(headerSignature(sheet))
  })

  it('保存载荷: 不可持久化返回 null; 品牌与行价格按白名单组装', () => {
    expect(buildPayload(makeSheet({ refDate: '' }), makeConfig())).toBeNull()

    const payload = buildPayload(
      makeSheet({
        inputs: {
          '中天:row-1': { spot: 3200, supplierId: '77', supplierName: '杭州' },
        },
      }),
      makeConfig(),
    )
    expect(payload).not.toBeNull()
    expect(payload?.brands).toEqual([
      { brandName: '中天', freight: 30, sortOrder: 0 },
    ])
    expect(payload?.items).toHaveLength(1)
    expect(payload?.items[0].prices).toEqual([
      { brandName: '中天', spotPrice: 3200, supplierId: '77' },
    ])
  })

  it('行载荷: 隔断行/不完整行语义不变, 且不含任何采购字段', () => {
    expect(
      buildItemPayload(
        makeSheet(),
        { ...makeRow(), rowType: 'SEPARATOR' },
        brands,
      ),
    ).toEqual({ rowType: 'SEPARATOR', prices: [] })
    expect(
      buildItemPayload(makeSheet(), makeRow({ category: '' }), brands),
    ).toBeNull()
    const payload = buildItemPayload(
      makeSheet(),
      makeRow({ ton: 12, locked: true }),
      brands,
    )
    // 吨位与行锁仍随载荷下发(比价页自己的字段)
    expect(payload?.ton).toBe(12)
    expect(payload?.locked).toBe(true)
    // 载荷字段白名单: 比价页与采购已彻底解耦, 不允许再出现采购前缀字段
    expect(Object.keys(payload ?? {}).sort()).toEqual([
      'category',
      'length',
      'locked',
      'material',
      'prices',
      'rowType',
      'spec',
      'ton',
    ])
    expect(
      Object.keys(payload ?? {}).filter((key) => /^purchase/i.test(key)),
    ).toEqual([])
  })

  it('表头载荷不含 brands/items', () => {
    const payload = buildHeaderPayload(makeSheet())
    expect(payload).not.toHaveProperty('brands')
    expect(payload).not.toHaveProperty('items')
    expect(payload.specQuantityLocked).toBe(false)
  })

  it('inputs 键在行 id 迁移时同步改名', () => {
    expect(
      remapInputKeys(
        {
          '中天:local-1': { spot: 3100 },
          '中天:other': { spot: 3200 },
        },
        'local-1',
        'server-1',
      ),
    ).toEqual({
      '中天:server-1': { spot: 3100 },
      '中天:other': { spot: 3200 },
    })
  })

  it('服务端记录归一: 行/输入/版本/保存时间按契约映射', () => {
    const record = {
      id: 'sheet-server-1',
      name: '批次 1',
      status: '报价',
      projectId: 'project-1',
      projectName: '项目一',
      orderDate: '2026-10-31',
      refDate: '2026-10-31',
      refPeriod: '上午',
      locked: false,
      specQuantityLocked: false,
      lengthPremium: 30,
      version: '2',
      updatedAt: '2026-10-31T01:00:00',
      brands: [{ brandName: '中天', freight: 30 }],
      items: [
        {
          id: 'item-1',
          rowType: 'PRODUCT',
          category: '螺纹钢',
          material: 'HRB400',
          spec: 20,
          length: '9米',
          prices: [
            {
              brandName: '中天',
              spotPrice: 3200,
              supplierId: '77',
              supplierName: '杭州',
              spotSourceMaterial: null,
            },
          ],
        },
      ],
    } as unknown as QuoteSheetRecord

    const sheet = toPriceSheet(record)
    expect(sheet).toMatchObject({
      id: 'sheet-server-1',
      serverId: 'sheet-server-1',
      version: '2',
      savedAt: '2026-10-31T01:00:00',
    })
    expect(sheet.rows[0]).toMatchObject({ id: 'item-1', spec: 20 })
    // spotSourceMaterial 的 null 必须带进本地模型(重开单据后角标才能判定)
    expect(sheet.inputs['中天:item-1']).toEqual({
      spot: 3200,
      supplierId: '77',
      supplierName: '杭州',
      spotSourceMaterial: null,
    })
  })
})
