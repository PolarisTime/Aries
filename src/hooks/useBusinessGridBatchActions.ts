import { useTranslation } from 'react-i18next'
import {
  deleteBusinessModule,
  updateBusinessModuleStatus,
} from '@/api/business/business-crud'
import { getStatusI18nKey } from '@/constants/document-status'
import {
  canAuditFromStatus,
  resolveReverseAuditTargetForStatus,
  resolveStatusChangeActionKind,
  resolveStatusChangeActionLabelKey,
  type StatusChangeActionKind,
} from '@/module-system/adapter/module-adapter-actions'
import { resolveModuleRecordCapabilities } from '@/module-system/record/module-record-capabilities'
import { isDeletedModuleRecord } from '@/module-system/record/module-record-deletion'
import type { ModuleRecord } from '@/types/module-page'
import { message, modal } from '@/utils/antd-app'
import { asString } from '@/utils/type-narrowing'

export interface AuditTarget {
  key: string
  value: string
}

interface Props {
  moduleKey: string
  selectedRowKeys: string[]
  selectedRows: ModuleRecord[]
  listAuditTarget: AuditTarget | null
  listReverseAuditTarget: AuditTarget | null
  listAuditSourceStatuses?: string[]
  listAuditActionKind: StatusChangeActionKind | null
  listReverseAuditActionKind: StatusChangeActionKind | null
  refreshAndClearSelection: () => Promise<void>
}

export function useBusinessGridBatchActions({
  moduleKey,
  selectedRowKeys,
  selectedRows,
  listAuditTarget,
  listReverseAuditTarget,
  listAuditSourceStatuses,
  listAuditActionKind,
  listReverseAuditActionKind,
  refreshAndClearSelection,
}: Props) {
  const { t } = useTranslation()

  /**
   * 状态中文值 → 当前语言下的状态名。
   *
   * <p>状态文案只在 `DOCUMENT_STATUS_REGISTRY` 登记一次（i18nKey），这里用调用方的
   * `t()` 翻译；未登记的状态原样返回，避免把信息吞成空白。</p>
   */
  const statusLabel = (status: unknown) => {
    const label = String(status ?? '').trim()
    if (!label) return ''
    const key = getStatusI18nKey(label)
    return key ? t(key) : label
  }

  /**
   * 审核/反审核共用的执行体：调用方负责逐条校验（删除态 + 状态机）并给出目标状态，
   * 这里只做「弹确认框 → 并发执行 → 汇总提示」。
   *
   * <p>作用域完全由 `targets` 决定：批量入口传选中集，行右键入口只传该行，
   * 所以行恰好也在多选集合里时不会连带影响其它行。</p>
   */
  const confirmAndApplyStatusChanges = (
    actionLabel: string,
    targets: Array<{ record: ModuleRecord; targetStatus: string }>,
    skippedCount: number,
  ) => {
    /*
     * 单条时把目标单号写进标题：多选集合里右键某一行时，用户必须能确认动的是哪一单。
     * 目标清单本身没有通用文案 key（hooks.batchActions.targetNumbers 是删除专用措辞），
     * 因此不新增语言包条目，改用「动作 + 单号」的标题表达目标。
     */
    const singleTargetNo =
      targets.length === 1 ? describeTargetRecordNo(targets[0].record) : ''
    /*
     * 单条审核要把后果说清楚：哪张单、从什么状态、到什么状态、能不能退回。
     * 原来的通用文案「确定对选中的 1 条记录执行审核吗？」没有状态信息，
     * 用户无法判断这次操作会把单据推进到哪一步。
     *
     * 可逆性**按行解析**而不是写死：`receipt` / `payment` 明确
     * `supportsReverseAudit: false`，对它们不能承诺"可以用反审核退回"。
     */
    const singleTarget = targets.length === 1 ? targets[0] : null
    const singleFromStatus = singleTarget
      ? statusLabel(singleTarget.record.status)
      : ''
    const singleToStatus = singleTarget
      ? statusLabel(singleTarget.targetStatus)
      : ''
    const singleCanReverse = singleTarget
      ? Boolean(
          resolveReverseAuditTargetForStatus(
            moduleKey,
            singleTarget.targetStatus,
            listAuditTarget,
            listReverseAuditTarget,
          ),
        )
      : false
    /*
     * 推迟一个宏任务再弹确认框。
     *
     * <p><b>实测到的真实缺陷</b>：用键盘在行菜单里按 Enter 选「审核」时，确认框会
     * **闪现约 180ms 后自己消失**（MutationObserver：add=1870ms / del=2048ms），
     * 而鼠标点同一个菜单项则正常停留、焦点在「取消」。原因不是没弹出来，而是：
     * 菜单项 onClick 在 Enter 的 keydown 里同步执行 → 弹层立即挂载 →
     * `autoFocusButton:'cancel'` 把焦点移到「取消」→ **同一个 Enter keydown 的默认动作
     * 正好"点击"这个刚拿到焦点的按钮** → 取消 → 弹层关闭。键鼠差异正来自 keydown。</p>
     *
     * <p>推迟到当前事件序列之后，Enter 的默认动作已经在原焦点上完成，
     * 不会落到新出现的按钮上；`setTimeout(0)` 即可，无可感知延迟。</p>
     */
    setTimeout(() => {
      modal.confirm({
        title: singleTargetNo
          ? `${actionLabel} ${singleTargetNo}`
          : t('hooks.batchActions.batchAction', { action: actionLabel }),
        content: singleTarget
          ? t(
              singleCanReverse
                ? 'hooks.batchActions.statusChangeConfirmReversible'
                : 'hooks.batchActions.statusChangeConfirmFinal',
              {
                no: singleTargetNo,
                from: singleFromStatus,
                to: singleToStatus,
                action: actionLabel,
              },
            )
          : t('hooks.batchActions.batchActionConfirm', {
              action: actionLabel,
              count: targets.length,
              skippedPart:
                skippedCount > 0
                  ? t('hooks.batchActions.skippedPart', { count: skippedCount })
                  : '',
            }),
        /*
         * 破坏性确认的默认焦点必须在「取消」侧：antd 默认聚焦确认按钮，
         * 用户手还在回车键上时按一次就把单据推进了状态。
         * 同时用 antd 6 的新 API（focusable）与仍被读取的顶层字段，避免 5.x 语义漂移。
         */
        focusable: { autoFocusButton: 'cancel' },
        autoFocusButton: 'cancel',
        onOk: async () => {
          const statusResults = await Promise.allSettled(
            targets.map(({ record, targetStatus }) =>
              updateBusinessModuleStatus(
                moduleKey,
                String(record.id),
                targetStatus,
              ),
            ),
          )
          let successCount = 0
          let failedCount = 0
          let firstError = ''
          for (const result of statusResults) {
            if (result.status === 'fulfilled') {
              successCount += 1
            } else {
              failedCount += 1
              if (!firstError) {
                firstError =
                  result.reason instanceof Error
                    ? result.reason.message
                    : t('hooks.batchActions.actionFailed', {
                        action: actionLabel,
                      })
              }
            }
          }

          if (failedCount > 0) {
            message.warning(
              t('hooks.batchActions.actionCompletedWithFailures', {
                action: actionLabel,
                successCount,
                failedCount,
                skippedPart:
                  skippedCount > 0
                    ? t('hooks.batchActions.skippedCount', {
                        count: skippedCount,
                      })
                    : '',
                errorPart: firstError ? `；${firstError}` : '',
              }),
            )
          } else {
            message.success(
              t('hooks.batchActions.actionSuccess', {
                action: actionLabel,
                successCount,
                skippedPart:
                  skippedCount > 0
                    ? t('hooks.batchActions.skippedCount', {
                        count: skippedCount,
                      })
                    : '',
              }),
            )
          }
          await refreshAndClearSelection()
        },
      })
    }, 0)
  }

  /**
   * 对给定记录执行审核（批量入口传选中集，行级入口传 `[record]`）。
   * 校验口径与批量完全一致：删除态与状态机不通过即跳过，并在确认框里说明跳过数。
   */
  const runAudit = (records: ModuleRecord[]) => {
    const actionLabel = t(
      resolveStatusChangeActionLabelKey(listAuditActionKind || 'audit'),
    )
    if (!listAuditTarget) {
      message.warning(
        t('hooks.batchActions.noBatchStatus', { action: actionLabel }),
      )
      return
    }

    const eligible = records.filter(
      (record) =>
        !isDeletedModuleRecord(record) &&
        canAuditFromStatus(
          record.status,
          listAuditTarget,
          listReverseAuditTarget,
          listAuditSourceStatuses,
        ),
    )
    const skippedCount = records.length - eligible.length

    if (!eligible.length) {
      message.warning(
        t('hooks.batchActions.actionNotSupported', { action: actionLabel }),
      )
      return
    }

    confirmAndApplyStatusChanges(
      actionLabel,
      eligible.map((record) => ({
        record,
        targetStatus: listAuditTarget.value,
      })),
      skippedCount,
    )
  }

  const handleSelectedAuditRecords = () => {
    if (!selectedRowKeys.length) {
      message.warning(t('hooks.batchActions.pleaseSelectRecords'))
      return
    }
    runAudit(selectedRows)
  }

  const handleSelectedDeleteRecords = () => {
    if (!selectedRowKeys.length) {
      message.warning(t('hooks.batchActions.pleaseSelectRecords'))
      return
    }

    const selected = selectedRows
    const eligible = selected.filter(
      (record) => resolveModuleRecordCapabilities(record, moduleKey).canDelete,
    )
    const skippedCount = selected.length - eligible.length

    if (!eligible.length) {
      message.warning(t('hooks.batchActions.deleteNotSupported'))
      return
    }

    modal.confirm({
      title: t('hooks.batchActions.batchDelete'),
      content: t('hooks.batchActions.batchDeleteConfirm', {
        count: eligible.length,
        /* 列出将被删除的单据号: 批量动作只认选中集, 用户必须能在确认前核对目标 */
        numbersPart: describeTargetRecords(eligible, t),
        skippedPart:
          skippedCount > 0
            ? t('hooks.batchActions.skippedPart', { count: skippedCount })
            : '',
      }),
      okButtonProps: { danger: true },
      onOk: async () => {
        const deleteResults = await Promise.allSettled(
          eligible.map((record) =>
            deleteBusinessModule(moduleKey, String(record.id)),
          ),
        )
        let successCount = 0
        let failedCount = 0
        let firstError = ''
        for (const result of deleteResults) {
          if (result.status === 'fulfilled') {
            successCount += 1
          } else {
            failedCount += 1
            if (!firstError) {
              firstError =
                result.reason instanceof Error
                  ? result.reason.message
                  : t('hooks.batchActions.deleteFailed')
            }
          }
        }

        if (failedCount > 0) {
          message.warning(
            t('hooks.batchActions.deleteCompletedWithFailures', {
              successCount,
              failedCount,
              skippedPart:
                skippedCount > 0
                  ? t('hooks.batchActions.skippedCount', {
                      count: skippedCount,
                    })
                  : '',
              errorPart: firstError ? `；${firstError}` : '',
            }),
          )
        } else {
          message.success(
            t('hooks.batchActions.deleteSuccess', {
              successCount,
              skippedPart:
                skippedCount > 0
                  ? t('hooks.batchActions.skippedCount', {
                      count: skippedCount,
                    })
                  : '',
            }),
          )
        }
        await refreshAndClearSelection()
      },
    })
  }

  /**
   * 对给定记录执行反审核（批量入口传选中集，行级入口传 `[record]`）。
   * 目标状态逐行解析：同一批里目标不一致时不猜文案，回落到批量口径。
   */
  const runReverseAudit = (records: ModuleRecord[]) => {
    const fallbackActionLabel = t(
      resolveStatusChangeActionLabelKey(
        listReverseAuditActionKind || 'reverseAudit',
      ),
    )
    if (!listReverseAuditTarget) {
      message.warning(
        t('hooks.batchActions.noBatchStatus', { action: fallbackActionLabel }),
      )
      return
    }

    const eligible = records.flatMap((record) => {
      if (isDeletedModuleRecord(record)) {
        return []
      }
      const targetStatus = resolveReverseAuditTargetForStatus(
        moduleKey,
        record.status,
        listAuditTarget,
        listReverseAuditTarget,
      )
      return targetStatus ? [{ record, targetStatus }] : []
    })
    const skippedCount = records.length - eligible.length

    if (!eligible.length) {
      message.warning(
        t('hooks.batchActions.actionNotSupported', {
          action: fallbackActionLabel,
        }),
      )
      return
    }

    /*
     * 目标一致时按目标反推文案：销售订单「完成销售」回到「交付核定」其实叫「重新核定」，
     * 用固定的批量 kind 会把标题写成「反审核」，与实际动作不符。
     */
    const targetStatuses = eligible.map((item) => item.targetStatus)
    const actionKind = targetStatuses.every(
      (status) => status === targetStatuses[0],
    )
      ? resolveStatusChangeActionKind(targetStatuses[0], true)
      : listReverseAuditActionKind || 'reverseAudit'

    confirmAndApplyStatusChanges(
      t(resolveStatusChangeActionLabelKey(actionKind)),
      eligible,
      skippedCount,
    )
  }

  const handleSelectedReverseAuditRecords = () => {
    if (!selectedRowKeys.length) {
      message.warning(t('hooks.batchActions.pleaseSelectRecords'))
      return
    }
    runReverseAudit(selectedRows)
  }

  return {
    handleSelectedAuditRecords,
    handleSelectedDeleteRecords,
    handleSelectedReverseAuditRecords,
    runAudit,
    runReverseAudit,
  }
}

/** 单据号回退顺序: no -> orderNo -> code -> id。 */
function describeTargetRecordNo(record: ModuleRecord) {
  return (
    asString(record.no) ||
    asString(record.orderNo) ||
    asString(record.code) ||
    String(record.id)
  )
}

/** 确认框里列出目标单据号(最多 5 条), 让用户在删除前核对批量目标。 */
export function describeTargetRecords(
  records: ModuleRecord[],
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  const numbers = records.map(describeTargetRecordNo).filter(Boolean)
  if (!numbers.length) return ''
  const head = numbers.slice(0, 5).join('、')
  return numbers.length > 5
    ? t('hooks.batchActions.targetNumbersMore', {
        numbers: head,
        rest: numbers.length - 5,
      })
    : t('hooks.batchActions.targetNumbers', { numbers: head })
}
