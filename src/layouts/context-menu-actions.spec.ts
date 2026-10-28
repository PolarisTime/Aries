// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import { isSelectionScopedToolbarAction } from '@/hooks/useModuleToolbarActions'
import {
  CONTEXT_MENU_ACTIONS,
  contextMenuActionKeysByGroup,
  isContextMenuActionHidden,
} from '@/layouts/context-menu-actions'
import { normalizePersonalSettings } from '@/stores/uiSettingsStore'

/**
 * 右键菜单动作目录的契约。
 *
 * <p>个人设置能"逐项配置"的前提是：菜单里可能出现的动作是一份**固定词表**。
 * 这份测试把词表钉在代码里 —— 新增行级/批量动作却忘了登记时，这里会红。</p>
 */
describe('右键菜单动作目录', () => {
  it('行级动作就是 useModuleRecordActions 产出的 7 个 key', () => {
    expect(contextMenuActionKeysByGroup('row')).toEqual([
      'detail',
      'copy-doc-no',
      'edit',
      'audit',
      'reverse-audit',
      'confirm-delivery-verification',
      'attach',
    ])
  })

  it('批量动作就是横幅里那 4 个，且都被 isSelectionScopedToolbarAction 认作批量', () => {
    const bulk = contextMenuActionKeysByGroup('bulk')
    expect(bulk).toEqual([
      'export_selected',
      'bulk_audit',
      'bulk_reverse_audit',
      'bulk_delete',
    ])
    // 与「已选择 N 项」横幅共用同一判据，不会出现"设置里有、实际不出现"的僵尸项
    for (const key of bulk) {
      expect(isSelectionScopedToolbarAction({ key })).toBe(true)
    }
  })

  it('key 全局唯一（菜单项 key 是点击分发的唯一依据）', () => {
    const keys = CONTEXT_MENU_ACTIONS.map((action) => action.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('危险动作被标记（设置页要给出提示）', () => {
    const danger = CONTEXT_MENU_ACTIONS.filter((action) => action.danger).map(
      (action) => action.key,
    )
    expect(danger).toEqual(['bulk_delete'])
  })

  it('隐藏判定：缺省显示，只有显式列在 hiddenActionKeys 里才隐藏', () => {
    expect(isContextMenuActionHidden(undefined, 'attach')).toBe(false)
    expect(isContextMenuActionHidden([], 'attach')).toBe(false)
    expect(isContextMenuActionHidden(['attach'], 'attach')).toBe(true)
    expect(isContextMenuActionHidden(['attach'], 'edit')).toBe(false)
    // 没有 key 的动作（理论上不存在）不会被误隐藏
    expect(isContextMenuActionHidden(['attach'], undefined)).toBe(false)
  })
})

describe('右键菜单偏好归一化', () => {
  it('只保留字符串 key 并去重', () => {
    const normalized = normalizePersonalSettings({
      contextMenu: { hiddenActionKeys: ['attach', 'attach', ' edit ', 42, ''] },
    })
    expect(normalized?.contextMenu?.hiddenActionKeys?.sort()).toEqual([
      'attach',
      'edit',
    ])
  })

  it('旧版分组布尔迁移成隐藏 key（曾短暂上线，不能让老数据失效）', () => {
    const rowOff = normalizePersonalSettings({
      contextMenu: { showRowActions: false },
    })
    expect(rowOff?.contextMenu?.hiddenActionKeys?.sort()).toEqual(
      contextMenuActionKeysByGroup('row').sort(),
    )

    const dangerOff = normalizePersonalSettings({
      contextMenu: { showDangerActions: false },
    })
    expect(dangerOff?.contextMenu?.hiddenActionKeys).toEqual(['bulk_delete'])
  })

  it('全部显示时不留空对象', () => {
    expect(
      normalizePersonalSettings({ contextMenu: { hiddenActionKeys: [] } })
        ?.contextMenu,
    ).toBeUndefined()
  })
})
