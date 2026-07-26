import { Flex, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { fetchFreightStatementSummary } from '@/api/business'
import { useRequestError } from '@/hooks/useRequestError'
import type { SearchParams } from '@/types/api-raw'
import { message, modal } from '@/utils/antd-app'

interface Props {
  submittedFilters: SearchParams
  formatCellValue: (value: unknown, columnType?: string) => string
}

export function useBusinessGridFreightActions({
  submittedFilters,
  formatCellValue,
}: Props) {
  const { t } = useTranslation()
  const { showError } = useRequestError()

  const openFreightSummary = async () => {
    try {
      const summary = await fetchFreightStatementSummary(submittedFilters)

      if (!summary.documentCount) {
        message.info(t('hooks.freightActions.noFreightData'))
        return
      }

      modal.info({
        title: t('hooks.freightActions.freightSummaryTitle'),
        width: 720,
        content: (
          <Flex vertical gap={12} className="mt-12">
            <Typography.Text>
              {t('hooks.freightActions.documentCount', {
                count: summary.documentCount,
              })}
            </Typography.Text>
            <Typography.Text>
              {t('hooks.freightActions.totalWeight')}
              {formatCellValue(summary.totalWeight, 'weight')}
            </Typography.Text>
            <Typography.Text>
              {t('hooks.freightActions.totalFreight')}
              {formatCellValue(summary.totalFreight, 'amount')}
            </Typography.Text>
            <Typography.Text>
              {t('hooks.freightActions.paidAmount')}
              {formatCellValue(summary.paidAmount, 'amount')}
            </Typography.Text>
            <Typography.Text>
              {t('hooks.freightActions.unpaidAmount')}
              {formatCellValue(summary.unpaidAmount, 'amount')}
            </Typography.Text>
          </Flex>
        ),
      })
    } catch (error) {
      showError(error)
    }
  }

  return { openFreightSummary }
}
