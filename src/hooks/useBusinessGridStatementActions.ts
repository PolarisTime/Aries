import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import {
  generateBusinessPrimaryNo,
  getBusinessModuleDetail,
  saveBusinessModule,
} from '@/api/business'
import { listAllStatementCandidates } from '@/api/statements'
import {
  isDisplaySwitchEnabled,
  listDisplaySwitches,
} from '@/api/system-settings'
import type { ModuleRecord } from '@/types/module-page'
import { cloneLineItems } from '@/utils/clone-utils'
import { asString } from '@/utils/type-narrowing'
import {
  buildCustomerStatementDraftData,
  buildFreightStatementDraftData,
  buildSupplierStatementDraftData,
} from '@/views/modules/module-adapter-statements'

type StatementType = 'supplier' | 'customer' | 'freight'

interface Props {
  refreshModuleQueries: () => Promise<void>
}

export function useBusinessGridStatementActions({
  refreshModuleQueries,
}: Props) {
  const { data: displaySwitches = [] } = useQuery({
    queryKey: ['display-switches'],
    queryFn: () => listDisplaySwitches(),
    staleTime: 5 * 60 * 1000,
  })

  const customerReceiptZero = useMemo(
    () =>
      isDisplaySwitchEnabled(
        displaySwitches,
        'SYS_CUSTOMER_STATEMENT_RECEIPT_ZERO_FROM_SALES_ORDER',
      ),
    [displaySwitches],
  )

  const supplierFullPayment = useMemo(
    () =>
      isDisplaySwitchEnabled(
        displaySwitches,
        'SYS_SUPPLIER_STATEMENT_FULL_PAYMENT_FROM_PURCHASE',
      ),
    [displaySwitches],
  )
  const buildDraftLineItemId = useCallback((prefix: string) => {
    let index = 0
    return () => `${prefix}-${Date.now()}-${index++}`
  }, [])

  const handleStatementGenerate = useCallback(
    async (
      type: StatementType,
      counterpartyName: string,
      startDate: string,
      endDate: string,
    ) => {
      const statementModuleKey =
        type === 'supplier'
          ? 'supplier-statement'
          : type === 'customer'
            ? 'customer-statement'
            : 'freight-statement'
      const sourceModuleKey =
        type === 'supplier'
          ? 'purchase-inbound'
          : type === 'customer'
            ? 'sales-order'
            : 'freight-bill'
      const candidateRows = await listAllStatementCandidates(
        statementModuleKey,
        '',
      )
      const filteredCandidates = candidateRows.filter((candidate) => {
        const dateField =
          type === 'supplier'
            ? candidate.inboundDate
            : type === 'customer'
              ? candidate.deliveryDate
              : candidate.billTime
        const currentDate = asString(dateField)

        if (!currentDate || currentDate < startDate || currentDate > endDate) {
          return false
        }

        if (type === 'supplier') {
          return asString(candidate.supplierName) === counterpartyName
        }
        if (type === 'customer') {
          return asString(candidate.customerName) === counterpartyName
        }

        return asString(candidate.carrierName) === counterpartyName
      })

      if (!filteredCandidates.length) {
        throw new Error('当前筛选条件下没有可生成的候选单据')
      }

      const detailedRecords = await Promise.all(
        filteredCandidates.map((candidate) =>
          getBusinessModuleDetail(sourceModuleKey, String(candidate.id)),
        ),
      )
      const sourceRecords = detailedRecords.map((detail) => detail.data)
      const statementPeriod = { startDate, endDate }

      if (type === 'customer') {
        const recordsByProject = new Map<string, ModuleRecord[]>()

        for (const record of sourceRecords) {
          const projectName = asString(record.projectName)
          const current = recordsByProject.get(projectName) || []
          current.push(record)
          recordsByProject.set(projectName, current)
        }

        for (const [projectName, projectRecords] of recordsByProject) {
          const buildLineItemId = buildDraftLineItemId(
            `draft-customer-${projectName || 'project'}`,
          )
          const draft = buildCustomerStatementDraftData({
            baseDraft: {
              id: '',
              statementNo:
                await generateBusinessPrimaryNo('customer-statement'),
              status: '待确认',
              remark: '',
            },
            sourceOrders: projectRecords,
            today: endDate,
            statementPeriod,
            defaultReceiptAmountZero: customerReceiptZero,
            cloneLineItems,
            buildLineItemId,
          })
          await saveBusinessModule('customer-statement', {
            ...draft,
            remark: '',
          })
        }
      } else if (type === 'supplier') {
        const buildLineItemId = buildDraftLineItemId('draft-supplier')
        const draft = buildSupplierStatementDraftData({
          baseDraft: {
            id: '',
            statementNo: await generateBusinessPrimaryNo('supplier-statement'),
            status: '待确认',
            remark: '',
          },
          sourceInbounds: sourceRecords,
          payments: [],
          today: endDate,
          statementPeriod,
          defaultFullPayment: supplierFullPayment,
          cloneLineItems,
          buildLineItemId,
        })
        await saveBusinessModule('supplier-statement', {
          ...draft,
          remark: '',
        })
      } else {
        const buildLineItemId = buildDraftLineItemId('draft-freight')
        const draft = buildFreightStatementDraftData({
          baseDraft: {
            id: '',
            statementNo: await generateBusinessPrimaryNo('freight-statement'),
            remark: '',
          },
          sourceBills: sourceRecords,
          today: endDate,
          statementPeriod,
          cloneLineItems,
          buildLineItemId,
        })
        await saveBusinessModule('freight-statement', {
          ...draft,
          remark: '',
        })
      }

      await refreshModuleQueries()
    },
    [
      buildDraftLineItemId,
      refreshModuleQueries,
      customerReceiptZero,
      supplierFullPayment,
    ],
  )

  return { handleStatementGenerate }
}
