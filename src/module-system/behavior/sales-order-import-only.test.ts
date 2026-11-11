import { describe, expect, it } from 'vitest'
import { getBehaviorValue } from './module-behavior-registry'

/**
 * 销售订单明细**只允许从上级单据导入**。
 *
 * <p>业务口径（2026-11-12 用户确认）：销售订单的明细行一律来自采购订单 / 采购入库，不存在
 * 手写行。明细的仓库、材质、规格、件重都是来源单据的快照，手工行既没有来源可填，也没有
 * 网价核查可对应的来源行，只会在保存时被后端按来源规则打回 —— 所以入口层面就关掉。</p>
 *
 * <p>这条 flag 的唯一读取处是 `useModuleEditorCapabilities`：
 * `canAddManualEditorItems = canManageEditorItems && allowsManualLineItems !== false`，
 * 再经 `resolveModuleEditorItemCapabilities.canAddManualItemsForCurrentRecord` 决定工具栏
 * 是否出现「新增明细」。改成 `true` 会让销售订单重新出现手工新增入口。</p>
 */
describe('销售订单：明细只允许从上级单据导入', () => {
  it('不允许手工新增明细行', () => {
    expect(getBehaviorValue('sales-order', 'allowsManualLineItems')).toBe(false)
  })

  it('其他模块不受影响：采购订单仍可手工新增行', () => {
    // 未显式声明的模块默认允许（`allowsManualLineItems !== false` 才放行）
    expect(
      getBehaviorValue('purchase-order', 'allowsManualLineItems'),
    ).not.toBe(false)
  })
})
