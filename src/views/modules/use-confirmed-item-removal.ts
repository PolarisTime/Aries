import { Button } from 'antd'
import { createElement, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { ModuleLineItem } from '@/types/module-page'
import { message, modal } from '@/utils/antd-app'

/** 撤销快照：被删的行 + 它们在原数组里的下标，恢复时按原位插回。 */
export interface RemovedItemsSnapshot {
  positions: number[]
  items: ModuleLineItem[]
}

/** 撤销 toast 的 message key：只销毁这一条，不误伤页面上其它提示。 */
const UNDO_MESSAGE_KEY = 'module-editor-remove-selected'

/**
 * 把一次删除落成「可复原快照」：按原下标插回，行序与删除前完全一致。
 *
 * <p>**本函数是撤销的唯一口径**：不要在任何调用点另写一遍「splice 回去」，
 * 否则行序、以及「撤销后又删一次」的行为会分叉。空快照返回原数组引用，
 * React 不会因为一次空撤销白白重渲染。</p>
 *
 * <p>**幂等**：已经在数组里的 id 不再插入。toast 上的「撤销」是普通按钮，双击、
 * 或 React 严格模式下的重复调用都可能让同一个快照落两次；实测重复落盘会得到两行
 * 相同 `data-row-key` 的明细（表格 key 冲突）。按 id 去重后，撤销点多少次结果都一样。</p>
 */
export function restoreRemovedItems(
  current: ModuleLineItem[],
  snapshot: RemovedItemsSnapshot | null,
): ModuleLineItem[] {
  if (!snapshot || snapshot.items.length === 0) return current
  const existingIds = new Set(current.map((item) => item.id))
  const next = [...current]
  snapshot.items.forEach((item, index) => {
    if (existingIds.has(item.id)) return
    existingIds.add(item.id)
    const position = snapshot.positions[index] ?? next.length
    next.splice(Math.min(position, next.length), 0, item)
  })
  return next
}

/**
 * 计算「删除这些 id」对应的快照：只取真正存在于当前数组的 id。
 *
 * <p>勾选集合与明细数组可能短暂不同步（例如刚导入完），用不存在于数组的 id 去算
 * 快照会得到错位的 positions，撤销时把行插到错误位置。这里是唯一的快照构造处。</p>
 */
export function buildRemovalSnapshot(
  items: ModuleLineItem[],
  selectedIds: readonly string[],
): RemovedItemsSnapshot {
  const selected = new Set(selectedIds)
  const positions: number[] = []
  const removed: ModuleLineItem[] = []
  items.forEach((item, index) => {
    if (!selected.has(item.id)) return
    positions.push(index)
    removed.push(item)
  })
  return { positions, items: removed }
}

interface Options {
  items: ModuleLineItem[]
  selectedItemIds: readonly string[]
  /**
   * 真正执行删除（并清空勾选）。由调用方注入 —— 删除还要处理「上游导入来源分组重算」
   * 等模块行为，不在本 hook 里复制一份。
   */
  onConfirmDelete: () => void
  /** 撤销：把快照里的行按原位插回。 */
  onRestore: (snapshot: RemovedItemsSnapshot) => void
}

/**
 * 「删除选中」的二次确认 + 撤销入口。
 *
 * <p>此前删除选中是**一键不可逆**：勾选 → 点「删除选中 (N)」→ 行直接消失，没有确认也没有
 * 撤销，而已填的仓库/品牌/材质/规格/数量/单价全部是手工录入，重新新增只得到空白行
 * （审查报告 P1-4，实测行数 1→0 后 `confirmModal=[]`、`undoLike=[]`、`restored888=false`）。</p>
 *
 * <p>两层防护都在这里，且只有这一处：</p>
 * 1. **删前**：antd 确认框说明「将删除 N 行、不可恢复」，默认焦点在「取消」侧
 *    （`autoFocusButton: 'cancel'`，回车不会直接删）；
 * 2. **删后**：toast 带「撤销」动作，10 秒内可一次性恢复原行与原行序。
 *
 * <p>撤销只是本地状态回滚（明细在保存前不落库），不触发任何写请求。</p>
 */
export function useConfirmedItemRemoval({
  items,
  selectedItemIds,
  onConfirmDelete,
  onRestore,
}: Options) {
  const { t } = useTranslation()

  return useCallback(() => {
    if (selectedItemIds.length === 0) return
    const snapshot = buildRemovalSnapshot(items, selectedItemIds)
    if (snapshot.items.length === 0) return
    const count = snapshot.items.length

    modal.confirm({
      title: t('modules.itemsSection.confirmRemoveTitle', { count }),
      content: t('modules.itemsSection.confirmRemoveContent', { count }),
      okText: t('modules.itemsSection.confirmRemoveOk', { count }),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      /* 破坏性操作默认焦点不能落在确认按钮上：回车即删是这类框最典型的事故。 */
      autoFocusButton: 'cancel',
      onOk: () => {
        onConfirmDelete()
        /*
         * 用 message 的 `content` 渲染「文案 + 撤销按钮」：antd 6 的 message 没有
         * `actions` 字段（那是 notification 的能力），ReactNode content 承担同样语义，
         * 同时把 duration 拉长到 10s —— 默认 3s 对「发现删错 → 点撤销」太短。
         * 按钮用 antd 的 link Button，命中区沿用全局 --app-control-height，无需额外 CSS。
         */
        message.info({
          key: UNDO_MESSAGE_KEY,
          duration: 10,
          content: createElement(
            'span',
            { className: 'module-item-removal-toast' },
            t('modules.itemsSection.removedToast', { count }),
            createElement(
              Button,
              {
                type: 'link',
                size: 'small',
                /*
                 * 点一次就销毁这条 toast：撤销本身是幂等的（restoreRemovedItems 按 id 去重），
                 * 但让按钮在复原后继续可点会让人以为"还能再撤一次"。
                 */
                onClick: () => {
                  onRestore(snapshot)
                  message.destroy(UNDO_MESSAGE_KEY)
                },
              },
              t('modules.itemsSection.undoRemove'),
            ),
          ),
        })
      },
    })
  }, [items, onConfirmDelete, onRestore, selectedItemIds, t])
}
