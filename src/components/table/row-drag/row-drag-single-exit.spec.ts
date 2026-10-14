// @vitest-environment node

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * 行拖动阈值与键位的**源码级单一出口守卫**。
 *
 * <p>阈值/键位"只有一个出口"不能只在文档里写: 只要有人图省事在某个文件里再注册一套
 * (触摸 250ms、手写一份键盘键位、8px 位移), 行为就会静默分叉且没有任何运行时报错。
 * 这里直接读源码守住"哪个文件不许出现什么"。</p>
 *
 * <p>回退验证(实际改错跑红): 在 `row-drag-sort.tsx` 里重新注册 `TouchSensor`, 或把
 * `keyboardCodes: rowDragKeyboardCodes()` 换成手写的 `{ start: [...] }`, 或在提货单
 * Overlay / 打印弹窗里另写一套键位, 本组用例立即变红。</p>
 */
describe('行拖动阈值与键位只有单一出口(源码守卫)', () => {
  const source = (relativePath: string) =>
    readFileSync(new URL(relativePath, import.meta.url), 'utf8')

  it('共享行拖动: 只注册 MouseSensor 与共享键位的 KeyboardSensor, 无 TouchSensor、无 250ms', () => {
    const shared = source('./row-drag-sort.tsx')
    expect(shared).toContain('rowDragActivationConstraint()')
    // 只看"真的注册/引入"的代码形态: 注释里说明"不再注册 TouchSensor"不算违规
    expect(shared).not.toMatch(/^\s*TouchSensor,$/m)
    expect(shared).not.toMatch(/useSensor\(\s*TouchSensor\b/)
    expect(shared).not.toMatch(/delay:\s*250/)
    // 键盘键位必须从共享常量取, 不允许手写一套
    expect(shared).toContain('keyboardCodes: rowDragKeyboardCodes()')
    expect(shared).not.toMatch(/keyboardCodes:\s*\{/)
  })

  it('各排序表面的 KeyboardSensor 键位都来自同一份常量(不再各写一套)', () => {
    const surfaces = {
      共享行拖动: './row-drag-sort.tsx',
      打印明细弹窗: '../../../views/modules/components/PrintJobModal.tsx',
      提货单弹层:
        '../../../views/modules/components/PurchaseOrderPickupListOverlay.tsx',
    }
    for (const [name, path] of Object.entries(surfaces)) {
      const text = source(path)
      expect(text, name).toContain('KeyboardSensor')
      expect(text, name).toContain('keyboardCodes: rowDragKeyboardCodes()')
      expect(text, name).not.toMatch(/keyboardCodes:\s*\{/)
    }
  })

  it('提货单明细取共享阈值, 不再自写一套(无 TouchSensor、无 250ms、无 distance: 8)', () => {
    const pickup = source(
      '../../../views/modules/components/PurchaseOrderPickupListOverlay.tsx',
    )
    expect(pickup).toContain('rowDragActivationConstraint()')
    expect(pickup).not.toMatch(/^\s*TouchSensor,$/m)
    expect(pickup).not.toMatch(/useSensor\(\s*TouchSensor\b/)
    expect(pickup).not.toMatch(/delay:\s*250/)
    expect(pickup).not.toMatch(/distance:\s*8/)
  })

  it('提货单的放行判定与共享 isRowDragBlockedTarget 同源(不是本地再写一份)', () => {
    const pickupActivation = source(
      '../../../views/modules/components/purchase-order-pickup-list/pickup-list-drag-activation.ts',
    )
    expect(pickupActivation).toContain(
      '@/components/table/row-drag/row-drag-activation',
    )
    const pickupSortable = source(
      '../../../views/modules/components/purchase-order-pickup-list/pickup-list-sortable.tsx',
    )
    expect(pickupSortable).toContain("from './pickup-list-drag-activation'")
  })
})
