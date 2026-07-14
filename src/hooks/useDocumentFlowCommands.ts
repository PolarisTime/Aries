import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  completePurchaseOrder,
  createSalesOutboundFromFreightBill,
  reopenPurchaseOrder,
} from '@/api/document-flow-commands'
import { QUERY_KEYS } from '@/constants/query-keys'
import type { ModuleActionDefinition, ModuleRecord } from '@/types/module-page'
import { message, modal } from '@/utils/antd-app'
import { asString } from '@/utils/type-narrowing'

type DocumentFlowCommand =
  | 'complete-purchase'
  | 'reopen-purchase'
  | 'create-sales-outbound'

interface Props {
  moduleKey: string
  selectedRecords: ModuleRecord[]
  canAuditPurchaseOrder: boolean
  canCreateSalesOutbound: boolean
  refreshCurrentModule: () => Promise<void>
  clearSelection: () => void
}

interface CommandDefinition {
  key: DocumentFlowCommand
  label: string
  confirmTitle: string
  confirmContent: string
  execute: (record: ModuleRecord) => Promise<{ message?: string }>
  refreshModules: string[]
}

function commandErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

export function useDocumentFlowCommands({
  moduleKey,
  selectedRecords,
  canAuditPurchaseOrder,
  canCreateSalesOutbound,
  refreshCurrentModule,
  clearSelection,
}: Props) {
  const queryClient = useQueryClient()
  const [runningCommand, setRunningCommand] =
    useState<DocumentFlowCommand | null>(null)
  const selectedRecord =
    selectedRecords.length === 1 ? selectedRecords[0] : undefined
  const selectedStatus = asString(selectedRecord?.status).trim()

  const command = (() => {
    if (
      moduleKey === 'purchase-order' &&
      canAuditPurchaseOrder &&
      selectedRecord &&
      selectedStatus === '已审核'
    ) {
      return {
        key: 'complete-purchase',
        label: '完成采购',
        confirmTitle: '确认完成采购',
        confirmContent:
          '系统将按当前已审核入库结果完成采购，未入库数量不再继续履约。完成后，采购数量与来源关系将被锁定。',
        execute: (record) => completePurchaseOrder(String(record.id)),
        refreshModules: ['purchase-inbound'],
      } satisfies CommandDefinition
    }
    if (
      moduleKey === 'purchase-order' &&
      canAuditPurchaseOrder &&
      selectedRecord &&
      selectedStatus === '完成采购'
    ) {
      return {
        key: 'reopen-purchase',
        label: '撤销完成采购',
        confirmTitle: '确认撤销完成采购',
        confirmContent: '仅当没有后续受限单据时可以撤销完成采购。',
        execute: (record) => reopenPurchaseOrder(String(record.id)),
        refreshModules: ['purchase-inbound'],
      } satisfies CommandDefinition
    }
    if (
      moduleKey === 'freight-bill' &&
      canCreateSalesOutbound &&
      selectedRecord &&
      selectedStatus === '未审核' &&
      !asString(selectedRecord.sourceSalesOutboundId).trim() &&
      !asString(selectedRecord.sourceSalesOutboundNo).trim()
    ) {
      return {
        key: 'create-sales-outbound',
        label: '生成销售出库',
        confirmTitle: '确认生成销售出库',
        confirmContent:
          '系统将重新校验来源销售订单、物流明细和数量，并生成唯一的销售出库草稿。',
        execute: (record) =>
          createSalesOutboundFromFreightBill(String(record.id)),
        refreshModules: ['sales-outbound', 'sales-order'],
      } satisfies CommandDefinition
    }
    return null
  })()

  const action: ModuleActionDefinition | null = command
    ? {
        key: command.key,
        label: command.label,
        type: 'default',
        loading: runningCommand === command.key,
        disabled: runningCommand !== null,
      }
    : null

  const handleAction = (actionKey: string | undefined) => {
    if (!command || !selectedRecord || actionKey !== command.key) {
      return false
    }
    modal.confirm({
      title: command.confirmTitle,
      content: command.confirmContent,
      okText: command.label,
      cancelText: '取消',
      maskClosable: false,
      onOk: async () => {
        setRunningCommand(command.key)
        try {
          const response = await command.execute(selectedRecord)
          await Promise.all([
            refreshCurrentModule(),
            ...command.refreshModules.map((targetModule) =>
              queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.businessGrid(targetModule),
              }),
            ),
          ])
          clearSelection()
          message.success(response.message || `${command.label}成功`)
        } catch (error) {
          message.error(commandErrorMessage(error, `${command.label}失败`))
          throw error
        } finally {
          setRunningCommand(null)
        }
      },
    })
    return true
  }

  return { action, handleAction }
}
