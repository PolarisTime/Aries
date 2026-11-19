import { describe, expect, it } from 'vitest'
import {
  applyFreightDraft,
  createFreightDraft,
  DEFAULT_FREIGHT,
  isFreightDraftDirty,
} from './project-config-draft'
import type { ProjectConfig } from './types'

/**
 * 比价「配置」弹层的草稿：**只剩每品牌运费**。
 *
 * <p>2026-11-16 定稿：品牌/品种/规格/加价/代取/指定品牌只在项目资料维护，
 * 本弹层品牌只读、保存只写运费。这里锁住三件事：草稿只搬运费、保存只改运费、
 * 脏检查只看运费。</p>
 */

const config = (): ProjectConfig => ({
  brands: [
    { name: '中天', freight: 30, categories: ['直条'] },
    { name: '沙钢', freight: 25 },
  ],
  lengthPremium: 30,
  hrb400eFallback: false,
  products: ['直条|HRB400E|12|9米'],
})

describe('运费草稿', () => {
  it('createFreightDraft 只提取品牌与运费', () => {
    const draft = createFreightDraft(config())
    expect(draft.brands).toEqual(['中天', '沙钢'])
    expect(draft.freightMap).toEqual({ 中天: 30, 沙钢: 25 })
  })

  it('applyFreightDraft 只改运费，其它字段原样保留', () => {
    const current = config()
    const draft = {
      brands: ['中天', '沙钢'],
      freightMap: { 中天: 40, 沙钢: 18 },
    }
    const next = applyFreightDraft(current, draft)
    expect(next.brands.map((brand) => brand.freight)).toEqual([40, 18])
    // 品牌清单与顺序不变（只读），行级品类快照仍保留给渲染用
    expect(next.brands.map((brand) => brand.name)).toEqual(['中天', '沙钢'])
    expect(next.brands[0]?.categories).toEqual(['直条'])
    // 非运费字段一律不动：它们由项目资料承担，前端不参与保存
    expect(next.lengthPremium).toBe(30)
    expect(next.hrb400eFallback).toBe(false)
    expect(next.products).toEqual(['直条|HRB400E|12|9米'])
  })

  it('草稿缺运费时回退到配置值，配置也缺时用默认运费', () => {
    const next = applyFreightDraft(config(), {
      brands: ['中天', '永钢'],
      freightMap: {},
    })
    expect(next.brands[0]).toMatchObject({ name: '中天', freight: 30 })
    expect(next.brands[1]).toMatchObject({
      name: '永钢',
      freight: DEFAULT_FREIGHT,
    })
  })

  it('脏检查只看运费（品牌清单不同或某个运费不同即为脏）', () => {
    const current = config()
    expect(isFreightDraftDirty(current, createFreightDraft(current))).toBe(
      false,
    )
    expect(
      isFreightDraftDirty(current, {
        brands: ['中天', '沙钢'],
        freightMap: { 中天: 31, 沙钢: 25 },
      }),
    ).toBe(true)
    expect(
      isFreightDraftDirty(current, { brands: ['中天'], freightMap: {} }),
    ).toBe(true)
  })
})
