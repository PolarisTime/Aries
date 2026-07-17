import i18next from 'i18next'
import { getBusinessModuleDetail, saveBusinessModule } from '@/api/business'
import { listAllStatementCandidates } from '@/api/statements'
import { useRuntimeConfig } from '@/hooks/useRuntimeConfig'
import {
  buildCustomerStatementDraftData,
  buildFreightStatementDraftData,
} from '@/module-system/module-adapter-statement-drafts'
import type { EntityId } from '@/types/entity-id'
import { parseEntityId } from '@/types/entity-id'
import type { ModuleRecord } from '@/types/module-page'
import { cloneLineItems } from '@/utils/clone-utils'
import { asString } from '@/utils/type-narrowing'

type StatementType = 'customer' | 'freight'

interface Props {
  refreshModuleQueries: () => Promise<void>
}

function buildDraftLineItemId(prefix: string) {
  let index = 0
  return () => {
    const currentIndex = index
    index += 1
    return `${prefix}-${Date.now()}-${currentIndex}`
  }
}

export function useBusinessGridStatementActions({
  refreshModuleQueries,
}: Props) {
  const { data: runtimeConfig } = useRuntimeConfig()
  const customerReceiptZero =
    runtimeConfig?.business.statement.customerReceiptAmountZero ?? false

  const handleStatementGenerate = async (
    type: StatementType,
    _counterpartyName: string,
    startDate: string,
    endDate: string,
    counterpartyId?: EntityId,
  ) => {
    const identityField = type === 'customer' ? 'customerId' : 'carrierId'
    const normalizedCounterpartyId = parseEntityId(
      counterpartyId,
      identityField,
    )
    const statementModuleKey =
      type === 'customer' ? 'customer-statement' : 'freight-statement'
    const sourceModuleKey = type === 'customer' ? 'sales-order' : 'freight-bill'
    const candidateRows = await listAllStatementCandidates(
      statementModuleKey,
      '',
      200,
      {
        [identityField]: normalizedCounterpartyId,
        startDate,
        endDate,
      },
    )
    const filteredCandidates = candidateRows.filter((candidate) => {
      const dateField =
        type === 'customer' ? candidate.deliveryDate : candidate.billTime
      const currentDate = asString(dateField)

      if (!currentDate || currentDate < startDate || currentDate > endDate) {
        return false
      }

      return (
        parseEntityId(
          candidate[identityField],
          `candidate.${identityField}`,
        ) === normalizedCounterpartyId
      )
    })

    if (!filteredCandidates.length) {
      throw new Error(i18next.t('hooks.statement.noCandidateDocuments'))
    }

    const detailedRecords = await Promise.all(
      filteredCandidates.map((candidate) =>
        getBusinessModuleDetail(sourceModuleKey, String(candidate.id)),
      ),
    )
    const sourceRecords = detailedRecords.map((detail) => detail.data)
    const statementPeriod = { startDate, endDate }

    if (type === 'customer') {
      const recordsByProject = new Map<EntityId, ModuleRecord[]>()

      for (const record of sourceRecords) {
        const projectId = parseEntityId(
          record.projectId,
          'sourceOrder.projectId',
        )
        const current = recordsByProject.get(projectId) || []
        current.push(record)
        recordsByProject.set(projectId, current)
      }

      await Promise.all(
        Array.from(recordsByProject, async ([projectId, projectRecords]) => {
          const localBuildLineItemId = buildDraftLineItemId(
            `draft-customer-${projectId}`,
          )
          const draft = buildCustomerStatementDraftData({
            baseDraft: {
              id: '',
              statementNo: '',
              status: '待确认',
              remark: '',
            },
            sourceOrders: projectRecords,
            today: endDate,
            statementPeriod,
            defaultReceiptAmountZero: customerReceiptZero,
            cloneLineItems,
            buildLineItemId: localBuildLineItemId,
          })
          await saveBusinessModule('customer-statement', {
            ...draft,
            remark: '',
          })
        }),
      )
    } else {
      const buildLineItemId = buildDraftLineItemId('draft-freight')
      const draft = buildFreightStatementDraftData({
        baseDraft: {
          id: '',
          statementNo: '',
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
  }

  return { handleStatementGenerate }
}
