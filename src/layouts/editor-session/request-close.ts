import type { TFunction } from 'i18next'
import { editorSessionStore } from '@/layouts/editor-session/editor-session-store'
import { modal } from '@/utils/antd-app'

/** 弹窗互斥标记：避免连续关闭多个 Tab 时叠加弹窗 */
let confirming = false

/**
 * 确认框打开期间积压的关闭请求。
 *
 * <p><b>为什么必须排队而不是直接 return</b>：原先两处 `if (confirming) return` 会**静默丢弃**
 * 请求 —— 用户连点三个脏标签的 ×，只有第一个会弹确认框，后两个既不入队也不提示，表现就是
 * "点了 × 没反应"。请求被丢弃是比多弹一个框更糟的结果：多弹一个框用户至少能继续操作，
 * 丢弃则完全没有反馈。</p>
 *
 * <p>排队后行为与用户意图一致：每个脏标签各问一次，逐个确认后全部关闭。</p>
 */
const pendingCloses: Array<() => void> = []

/**
 * 确认框关闭后放行积压请求。
 *
 * <p>用 `while` 而不是"取一个"：重放的请求可能因为标签已变干净而**同步完成、不弹框**，
 * 此时 `confirming` 仍是 false，必须继续放行下一个，否则队列会卡在这里不动。</p>
 */
function drainPendingCloses(): void {
  while (!confirming && pendingCloses.length > 0) {
    const next = pendingCloses.shift()
    next?.()
  }
}

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
  /*
   * 已有确认框打开：把整次请求排队（重新走一遍本函数），等当前框关闭后处理。
   * 不能只 return —— 那会把用户的关闭意图静默吞掉。
   */
  if (confirming) {
    pendingCloses.push(() => requestEditorSessionClose(t, tabId, onClose))
    return
  }

  const current = editorSessionStore.getSession(tabId)
  if (!current || current.status === 'clean') {
    editorSessionStore.endSession(tabId)
    onClose()
    return
  }

  if (current.status === 'submitting') {
    confirming = true
    modal.info({
      title: t('common.saveInProgressTitle'),
      content: t('common.saveInProgressContent'),
      okText: t('common.confirm'),
      afterClose: () => {
        confirming = false
        drainPendingCloses()
      },
    })
    return
  }

  confirming = true
  modal.confirm({
    title: t('common.unsavedChangesTitle'),
    content: t('common.unsavedChangesContent'),
    okText: t('common.discardChanges'),
    cancelText: t('common.cancel'),
    mask: { closable: false },
    /*
     * 兜底：确认框只能由按钮关闭。
     *
     * 脏编辑器按 Esc 时，同一次 keydown 会被两个消费者读到 —— 编辑器的 useFocusTrap
     * （负责开这个框）与 antd Modal 自己的 Esc 面板栈（默认 keyboard:true，负责关自己）。
     * trap 侧已加「已有 Modal 时让出 Esc」的前置判断，这里再把 Modal 的键盘关闭关掉，
     * 双保险：任何一侧将来被改动，都不会退化成「确认框闪现约 300ms 后消失」。
     */
    keyboard: false,
    onOk: () => {
      editorSessionStore.endSession(tabId)
      onClose()
    },
    afterClose: () => {
      confirming = false
      drainPendingCloses()
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
  // 已有确认框打开：排队重试，不静默丢弃（理由见 pendingCloses 的说明）
  if (confirming) {
    pendingCloses.push(() => confirmBatchTabClose(t, tabIds, doClose))
    return true
  }

  const hasDirty = tabIds.some((tabId) =>
    editorSessionStore.requiresConfirmation(tabId),
  )
  if (!hasDirty) {
    doClose()
    return false
  }

  confirming = true
  modal.confirm({
    title: t('common.unsavedChangesTitle'),
    content: t('common.unsavedChangesContent'),
    okText: t('common.discardChanges'),
    cancelText: t('common.cancel'),
    mask: { closable: false },
    /* 同上：批量关闭的脏数据确认框同样只能由按钮关闭。 */
    keyboard: false,
    onOk: () => {
      tabIds.forEach((tabId) => {
        editorSessionStore.endSession(tabId)
      })
      doClose()
    },
    afterClose: () => {
      confirming = false
      drainPendingCloses()
    },
  })
  return true
}
