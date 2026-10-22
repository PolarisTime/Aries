import { describe, expect, it } from 'vitest'
import {
  applySpotSyncChanges,
  buildSpotSyncSource,
  planSpotSync,
  selectSpotSyncSheets,
} from './spot-sync'
import type { PriceRow, PriceSheet, SheetInputs } from './types'

function row(id: string, spec = 12, category = '螺纹钢'): PriceRow {
  return {
    id,
    rowType: 'PRODUCT',
    category,
    material: 'HRB400E',
    spec,
    length: '9米',
  }
}

function separator(id: string): PriceRow {
  return { id, rowType: 'SEPARATOR' } as PriceRow
}

function sheet(overrides: Partial<PriceSheet> & { id: string }): PriceSheet {
  return {
    name: `批次-${overrides.id}`,
    status: '报价',
    projectId: '100',
    projectName: '云潮筝鸣府',
    orderDate: '2026-09-16',
    refDate: '2026-09-16',
    refPeriod: '上午',
    lengthPremium: 30,
    inputs: {},
    rows: [],
    ...overrides,
  }
}

const BRANDS = ['中天', '万泰']
const brandsOf = () => BRANDS

describe('buildSpotSyncSource', () => {
  it('按 品牌+商品键 汇总现货价与供应商', () => {
    const inputs: SheetInputs = {
      '中天:a': { spot: 3200, supplierId: '5001', supplierName: '杭州物资' },
      '万泰:a': { spot: 3100 },
    }
    const source = buildSpotSyncSource(
      sheet({ id: 's1', rows: [row('a')], inputs }),
      BRANDS,
    )
    expect(source.get('中天\u0000螺纹钢|HRB400E|12|9米')).toEqual({
      spot: 3200,
      supplierId: '5001',
      supplierName: '杭州物资',
    })
    expect(source.get('万泰\u0000螺纹钢|HRB400E|12|9米')).toEqual({
      spot: 3100,
    })
  })

  it('不带 ton：报单吨位是逐行业务数据, 绝不参与同步', () => {
    const inputs: SheetInputs = { '中天:a': { spot: 3200, ton: 5 } }
    const source = buildSpotSyncSource(
      sheet({ id: 's1', rows: [row('a')], inputs }),
      BRANDS,
    )
    const value = source.get('中天\u0000螺纹钢|HRB400E|12|9米')
    expect(value).toEqual({ spot: 3200 })
    expect(value && 'ton' in value).toBe(false)
  })

  it('只有现货价没有供应商的格子也参与同步', () => {
    const inputs: SheetInputs = { '中天:a': { spot: 3200 } }
    const source = buildSpotSyncSource(
      sheet({ id: 's1', rows: [row('a')], inputs }),
      BRANDS,
    )
    expect(source.get('中天\u0000螺纹钢|HRB400E|12|9米')).toEqual({
      spot: 3200,
    })
  })

  it('隔断行与不完整行不参与', () => {
    const empty: PriceRow = { id: 'e', rowType: 'PRODUCT' } as PriceRow
    const inputs: SheetInputs = {
      '中天:sep': { spot: 9 },
      '中天:e': { spot: 8 },
    }
    const source = buildSpotSyncSource(
      sheet({ id: 's1', rows: [separator('sep'), empty], inputs }),
      BRANDS,
    )
    expect(source.size).toBe(0)
  })

  /**
   * 同批次同商品同品牌分叉时取行序第一行：结果确定、且与界面上"靠上那行"一致。
   * 分叉的真实来源：先填价再把某行规格改掉。
   */
  it('同批次内分叉时按行序取第一个, 结果确定', () => {
    const inputs: SheetInputs = {
      '中天:a': { spot: 3200 },
      '中天:b': { spot: 3300 },
    }
    const source = buildSpotSyncSource(
      sheet({ id: 's1', rows: [row('a'), row('b')], inputs }),
      BRANDS,
    )
    expect(source.get('中天\u0000螺纹钢|HRB400E|12|9米')).toEqual({
      spot: 3200,
    })
  })
})

describe('selectSpotSyncSheets —— 三档作用域', () => {
  const sheets = [
    sheet({ id: 's1', projectId: '100' }),
    sheet({ id: 's2', projectId: '100' }),
    sheet({ id: 's3', projectId: '200' }),
    sheet({ id: 's4', projectId: '' }),
  ]

  it('当前批次：只有自己', () => {
    expect(
      selectSpotSyncSheets(sheets, 's1', 'sheet').map((item) => item.id),
    ).toEqual(['s1'])
  })

  it('项目级：同 projectId 的批次', () => {
    expect(
      selectSpotSyncSheets(sheets, 's1', 'project').map((item) => item.id),
    ).toEqual(['s1', 's2'])
  })

  it('全部：所有批次(含其它项目)', () => {
    expect(
      selectSpotSyncSheets(sheets, 's1', 'all').map((item) => item.id),
    ).toEqual(['s1', 's2', 's3', 's4'])
  })

  it('未归属项目的批次不跨项目扩散', () => {
    expect(
      selectSpotSyncSheets(sheets, 's4', 'project').map((item) => item.id),
    ).toEqual(['s4'])
  })
})

describe('planSpotSync —— 影响面计算', () => {
  it('当前批次内：把同商品其它行的空缺补齐', () => {
    const active = sheet({
      id: 's1',
      rows: [row('a'), row('b')],
      inputs: { '中天:a': { spot: 3200 } },
    })
    const plan = planSpotSync({
      sheets: [active],
      activeSheetId: 's1',
      scope: 'sheet',
      resolveBrands: brandsOf,
    })
    expect(plan.targets).toHaveLength(1)
    expect(plan.targets[0].changes).toEqual([
      {
        brandName: '中天',
        rowId: 'b',
        after: { spot: 3200 },
        overwrite: false,
      },
    ])
    expect(plan.totalFill).toBe(1)
    expect(plan.totalOverwrite).toBe(0)
  })

  it('规格不同不同步：只命中商品键相同的行', () => {
    const active = sheet({
      id: 's1',
      rows: [row('a', 12), row('b', 16)],
      inputs: { '中天:a': { spot: 3200 } },
    })
    const plan = planSpotSync({
      sheets: [active],
      activeSheetId: 's1',
      scope: 'sheet',
      resolveBrands: brandsOf,
    })
    expect(plan.totalChanges).toBe(0)
  })

  /** 用户选定的口径：覆盖已有不同值，但必须在弹窗里如实计数。 */
  it('目标行已有不同价时计为覆盖(overwrite)', () => {
    const active = sheet({
      id: 's1',
      rows: [row('a'), row('b')],
      inputs: { '中天:a': { spot: 3200 }, '中天:b': { spot: 3999 } },
    })
    const plan = planSpotSync({
      sheets: [active],
      activeSheetId: 's1',
      scope: 'sheet',
      resolveBrands: brandsOf,
    })
    expect(plan.targets[0].changes).toEqual([
      {
        brandName: '中天',
        rowId: 'b',
        before: { spot: 3999 },
        after: { spot: 3200 },
        overwrite: true,
      },
    ])
    expect(plan.totalOverwrite).toBe(1)
    expect(plan.totalFill).toBe(0)
  })

  it('值相同不算变更(不产生噪音变更)', () => {
    const active = sheet({
      id: 's1',
      rows: [row('a'), row('b')],
      inputs: { '中天:a': { spot: 3200 }, '中天:b': { spot: 3200 } },
    })
    const plan = planSpotSync({
      sheets: [active],
      activeSheetId: 's1',
      scope: 'sheet',
      resolveBrands: brandsOf,
    })
    expect(plan.totalChanges).toBe(0)
    expect(plan.targets).toHaveLength(0)
  })

  it('供应商一起同步, 但不覆盖目标行的 ton', () => {
    const active = sheet({
      id: 's1',
      rows: [row('a'), row('b')],
      inputs: {
        '中天:a': { spot: 3200, supplierId: '5001', supplierName: '杭州物资' },
        '中天:b': { ton: 7 },
      },
    })
    const plan = planSpotSync({
      sheets: [active],
      activeSheetId: 's1',
      scope: 'sheet',
      resolveBrands: brandsOf,
    })
    expect(plan.targets[0].changes[0].after).toEqual({
      ton: 7,
      spot: 3200,
      supplierId: '5001',
      supplierName: '杭州物资',
    })
  })

  it('项目级只落到本项目批次', () => {
    const shared: SheetInputs = { '中天:a': { spot: 3200 } }
    const sheets = [
      sheet({ id: 's1', projectId: '100', rows: [row('a')], inputs: shared }),
      sheet({ id: 's2', projectId: '100', rows: [row('a')] }),
      sheet({ id: 's3', projectId: '200', rows: [row('a')] }),
    ]
    const plan = planSpotSync({
      sheets,
      activeSheetId: 's1',
      scope: 'project',
      resolveBrands: brandsOf,
    })
    expect(plan.targets.map((target) => target.sheetId)).toEqual(['s2'])
  })

  it('全部：跨项目也落', () => {
    const sheets = [
      sheet({
        id: 's1',
        projectId: '100',
        rows: [row('a')],
        inputs: { '中天:a': { spot: 3200 } },
      }),
      sheet({ id: 's3', projectId: '200', rows: [row('a')] }),
    ]
    const plan = planSpotSync({
      sheets,
      activeSheetId: 's1',
      scope: 'all',
      resolveBrands: brandsOf,
    })
    expect(plan.targets.map((target) => target.sheetId)).toEqual(['s3'])
  })

  it('目标批次没有该品牌时不产生变更(各项目品牌配置可能不同)', () => {
    const sheets = [
      sheet({
        id: 's1',
        projectId: '100',
        rows: [row('a')],
        inputs: { '中天:a': { spot: 3200 } },
      }),
      sheet({ id: 's3', projectId: '200', rows: [row('a')] }),
    ]
    const plan = planSpotSync({
      sheets,
      activeSheetId: 's1',
      scope: 'all',
      resolveBrands: (item) => (item.id === 's3' ? ['沙钢'] : BRANDS),
    })
    expect(plan.totalChanges).toBe(0)
  })

  /**
   * 后端 `ensureWritable` 对他人未过期锁返回 409：这类批次必须在计划阶段就摘出去，
   * 否则用户会在确认后收到一串失败提示。
   */
  it('他人已签出的批次被跳过并如实列出', () => {
    const sheets = [
      sheet({
        id: 's1',
        projectId: '100',
        rows: [row('a')],
        inputs: { '中天:a': { spot: 3200 } },
      }),
      sheet({ id: 's2', projectId: '100', rows: [row('a')] }),
    ]
    const plan = planSpotSync({
      sheets,
      activeSheetId: 's1',
      scope: 'project',
      resolveBrands: brandsOf,
      lockedSheetIds: new Set(['s2']),
    })
    expect(plan.targets).toHaveLength(0)
    expect(plan.skipped).toEqual([
      { sheetId: 's2', sheetName: '批次-s2', reason: 'lockedByOther' },
    ])
  })

  it('锁按 serverId 记账时同样能识别', () => {
    const sheets = [
      sheet({
        id: 's1',
        projectId: '100',
        rows: [row('a')],
        inputs: { '中天:a': { spot: 3200 } },
      }),
      sheet({
        id: 'local2',
        serverId: '9002',
        projectId: '100',
        rows: [row('a')],
      }),
    ]
    const plan = planSpotSync({
      sheets,
      activeSheetId: 's1',
      scope: 'project',
      resolveBrands: brandsOf,
      lockedSheetIds: new Set(['9002']),
    })
    expect(plan.skipped.map((skip) => skip.sheetId)).toEqual(['local2'])
  })

  it('没有数据源时计划为空(不会产生任何变更)', () => {
    const sheets = [sheet({ id: 's1', rows: [row('a')] })]
    const plan = planSpotSync({
      sheets,
      activeSheetId: 's1',
      scope: 'all',
      resolveBrands: brandsOf,
    })
    expect(plan.totalChanges).toBe(0)
  })

  it('当前批次不在列表时不抛错, 返回空计划', () => {
    const plan = planSpotSync({
      sheets: [sheet({ id: 's9' })],
      activeSheetId: 'missing',
      scope: 'all',
      resolveBrands: brandsOf,
    })
    expect(plan.totalChanges).toBe(0)
    expect(plan.targets).toHaveLength(0)
  })
})

describe('applySpotSyncChanges', () => {
  it('合并变更且不改原对象', () => {
    const inputs: SheetInputs = { '中天:a': { spot: 3200, ton: 5 } }
    const next = applySpotSyncChanges(inputs, [
      {
        brandName: '中天',
        rowId: 'b',
        after: { spot: 3200 },
        overwrite: false,
      },
    ])
    expect(next['中天:b']).toEqual({ spot: 3200 })
    expect(next['中天:a']).toEqual({ spot: 3200, ton: 5 })
    expect(inputs['中天:b']).toBeUndefined()
  })

  it('无变更时返回原对象(避免无谓的重渲染与保存)', () => {
    const inputs: SheetInputs = {}
    expect(applySpotSyncChanges(inputs, [])).toBe(inputs)
  })
})

/**
 * 抗震牌号代取（实测反馈）: 两个批次分别为 HRB400 12 与 HRB400E 12，商品资料里只有
 * HRB400E 的网价。在 HRB400E 批次里填好价后点「同步现货价」，此前 HRB400 那格**同步不过来**
 * —— 因为同步只按原始材质比对商品键，而网价取价早已按抗震牌号代取。
 *
 * <p>规则与取价一致：本行材质自己有价就用自己；自己没有价、且该格还是空的，才借用同强度
 * 抗震牌号的价。代取必须显式计数告知，不能悄悄换计价口径。</p>
 */
describe('抗震牌号代取同步', () => {
  const sourceRow = (id: string, material: string): PriceRow => ({
    ...row(id),
    material,
  })

  it('HRB400 无自己的价时, 借用 HRB400E 的价并标记代取', () => {
    const sourceSheet = sheet({
      id: 's1',
      rows: [sourceRow('a', 'HRB400E')],
      inputs: { '中天:a': { spot: 3420, supplierName: '中天' } },
    })
    const targetSheet = sheet({
      id: 's2',
      rows: [sourceRow('b', 'HRB400')],
      inputs: {},
    })
    const plan = planSpotSync({
      sheets: [sourceSheet, targetSheet],
      activeSheetId: 's1',
      scope: 'project',
      resolveBrands: brandsOf,
    })
    const change = plan.targets
      .flatMap((target) => target.changes)
      .find((item) => item.rowId === 'b' && item.brandName === '中天')
    expect(change?.after.spot).toBe(3420)
    expect(change?.substitutedFrom).toBe('HRB400E')
    expect(plan.totalSubstituted).toBe(1)
  })

  it('HRB400 已经有自己的价时不被 HRB400E 的价覆盖', () => {
    const sourceSheet = sheet({
      id: 's1',
      rows: [sourceRow('a', 'HRB400E')],
      inputs: { '中天:a': { spot: 3420 } },
    })
    const targetSheet = sheet({
      id: 's2',
      rows: [sourceRow('b', 'HRB400')],
      inputs: { '中天:b': { spot: 3400 } },
    })
    const plan = planSpotSync({
      sheets: [sourceSheet, targetSheet],
      activeSheetId: 's1',
      scope: 'project',
      resolveBrands: brandsOf,
    })
    // 本行材质自己有价(3400) → 走不到代取, 不会被 3420 覆盖
    expect(plan.totalChanges).toBe(0)
    expect(plan.totalSubstituted).toBe(0)
  })

  it('HRB400E 不会反向借用 HRB400 的价(单向下行)', () => {
    const sourceSheet = sheet({
      id: 's1',
      rows: [sourceRow('a', 'HRB400')],
      inputs: { '中天:a': { spot: 3400 } },
    })
    const targetSheet = sheet({
      id: 's2',
      rows: [sourceRow('b', 'HRB400E')],
      inputs: {},
    })
    const plan = planSpotSync({
      sheets: [sourceSheet, targetSheet],
      activeSheetId: 's1',
      scope: 'project',
      resolveBrands: brandsOf,
    })
    expect(plan.totalChanges).toBe(0)
    expect(plan.totalSubstituted).toBe(0)
  })
})
