import type { TFunction } from 'i18next'
import { editorSessionStore } from '@/layouts/editor-session/editor-session-store'
import { modal } from '@/utils/antd-app'

/** 弹窗互斥标记：避免连续关闭多个 Tab 时叠加弹窗 */
let confirming = false

/**
 * 请求关闭某个 Tab 的编辑器会话：clean 直接关，
 * submitting 提示保存中，dirty 弹「放弃更改」确认框。
 * 多标签页容器与编辑器内部（requestClose）共用此流程。
 */
export function requestEditorSessionClose(
  t: TFunction,
  tabId: string,
  onClose: () => void,
): void {
  const current = editorSessionStore.getSession(tabId)
  if (!current || current.status === 'clean') {
    editorSessionStore.endSession(tabId)
    onClose()
    return
  }

  if (current.status === 'submitting') {
    if (confirming) {
      return
    }
    confirming = true
    modal.info({
      title: t('common.saveInProgressTitle'),
      content: t('common.saveInProgressContent'),
      okText: t('common.confirm'),
      afterClose: () => {
        confirming = false
      },
    })
    return
  }

  if (confirming) {
    return
  }
  confirming = true
  modal.confirm({
    title: t('common.unsavedChangesTitle'),
    content: t('common.unsavedChangesContent'),
    okText: t('common.discardChanges'),
    cancelText: t('common.cancel'),
    mask: { closable: false },
    onOk: () => {
      editorSessionStore.endSession(tabId)
      onClose()
    },
    afterClose: () => {
      confirming = false
    },
  })
}

/**
 * 批量关闭前的统一确认：任一目标 Tab 存在未保存会话时弹一次确认框，
 * 确认后执行 doClose。返回 true 表示已弹出确认（doClose 延后执行）。
 */
export function confirmBatchTabClose(
  t: TFunction,
  tabIds: string[],
  doClose: () => void,
): boolean {
  const hasDirty = tabIds.some((tabId) =>
    editorSessionStore.requiresConfirmation(tabId),
  )
  if (!hasDirty) {
    doClose()
    return false
  }
  if (confirming) {
    return true
  }
  confirming = true
  modal.confirm({
    title: t('common.unsavedChangesTitle'),
    content: t('common.unsavedChangesContent'),
    okText: t('common.discardChanges'),
    cancelText: t('common.cancel'),
    mask: { closable: false },
    onOk: () => {
      tabIds.forEach((tabId) => {
        editorSessionStore.endSession(tabId)
      })
      doClose()
    },
    afterClose: () => {
      confirming = false
    },
  })
  return true
}
