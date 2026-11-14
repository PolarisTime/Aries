// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import {
  draftsKey,
  gridQueryKey,
  materialTabsKey,
  readMaterialTabs,
  readSupplierTabs,
  supplierTabsKey,
  writeMaterialTabs,
  writeSupplierTabs,
} from './supplier-quote-view-prefs'

afterEach(() => {
  window.localStorage.clear()
})

describe('供应商报价视图偏好(supplier-quote-view-prefs)', () => {
  it('草稿键按供应商隔离, 换供应商不会读到别人的草稿', () => {
    expect(draftsKey('sup-1')).toBe('aries:supplier-quote-drafts:sup-1')
    expect(draftsKey('sup-2')).not.toBe(draftsKey('sup-1'))
  })

  it('网格查询键由品牌名组成, 不同品牌互不命中', () => {
    expect(gridQueryKey('甲')).toEqual(['supplier-price-grid', '甲'])
    expect(gridQueryKey('甲')).not.toEqual(gridQueryKey('乙'))
  })
})

/*
 * 供应商页签的持久化：刷新后必须还能看到之前打开的第二个/第三个供应商。
 * 组件里的「恢复判断」只做一次，这里锁存储层的读写与坏数据兜底。
 */
describe('供应商页签持久化', () => {
  it('写进去能原样读回来（页签顺序 + 激活项）', () => {
    writeSupplierTabs({
      openSupplierIds: ['sup-1', 'sup-2'],
      activeSupplierId: 'sup-2',
    })
    expect(readSupplierTabs()).toEqual({
      openSupplierIds: ['sup-1', 'sup-2'],
      activeSupplierId: 'sup-2',
    })
  })

  it('没有存档时返回 null（调用方回落到"打开第一个供应商"）', () => {
    expect(readSupplierTabs()).toBeNull()
  })

  it('空页签列表不当作存档：避免用户关光页签后刷新又冒出来', () => {
    writeSupplierTabs({ openSupplierIds: [] })
    expect(readSupplierTabs()).toBeNull()
  })

  it('坏数据一律当作没有存档，不让页面打不开', () => {
    window.localStorage.setItem(supplierTabsKey, '{not json')
    expect(readSupplierTabs()).toBeNull()

    window.localStorage.setItem(supplierTabsKey, JSON.stringify([1, 2, 3]))
    expect(readSupplierTabs()).toBeNull()

    window.localStorage.setItem(
      supplierTabsKey,
      JSON.stringify({ openSupplierIds: ['ok', 42, '', null] }),
    )
    // 非法元素被过滤，合法的保留
    expect(readSupplierTabs()).toEqual({ openSupplierIds: ['ok'] })
  })
})

/*
 * 材质 tab（直条 / 盘螺各自的 HRB400 / HRB400E）按供应商记住：
 * 刷新后应回到上次停留的材质，而不是永远回到第一个。
 */
describe('材质 tab 持久化', () => {
  it('写进去能读回来，且按供应商隔离', () => {
    writeMaterialTabs('sup-1', { 直条: 'HRB400E', 盘螺: 'HRB400' })
    expect(readMaterialTabs('sup-1')).toEqual({
      直条: 'HRB400E',
      盘螺: 'HRB400',
    })
    // 另一个供应商读不到别人的选择
    expect(readMaterialTabs('sup-2')).toEqual({})
    expect(materialTabsKey('sup-1')).not.toBe(materialTabsKey('sup-2'))
  })

  it('没有存档时返回空对象（渲染侧回落到第一个材质）', () => {
    expect(readMaterialTabs('sup-1')).toEqual({})
  })

  it('清空选择时删掉键，避免留下空对象存档', () => {
    writeMaterialTabs('sup-1', { 直条: 'HRB400E' })
    writeMaterialTabs('sup-1', {})
    expect(window.localStorage.getItem(materialTabsKey('sup-1'))).toBeNull()
  })

  it('坏数据一律当作没有存档，且非法成员被过滤', () => {
    window.localStorage.setItem(materialTabsKey('sup-1'), '{bad json')
    expect(readMaterialTabs('sup-1')).toEqual({})

    window.localStorage.setItem(
      materialTabsKey('sup-1'),
      JSON.stringify({ 直条: 'HRB400E', 盘螺: 42, '': 'HRB400' }),
    )
    expect(readMaterialTabs('sup-1')).toEqual({ 直条: 'HRB400E' })
  })
})
