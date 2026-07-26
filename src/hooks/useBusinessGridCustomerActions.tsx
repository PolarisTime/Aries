import { Flex, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { fetchCustomerStatementSummary } from '@/api/finance/customer-statement-summary'
import { useRequestError } from '@/hooks/useRequestError'
import type { SearchParams } from '@/types/api-raw'
import { message, modal } from '@/utils/antd-app'

interface Props {
  submittedFilters: SearchParams
  formatCellValue: (value: unknown, columnType?: string) => string
}

export function useBusinessGridCustomerActions({
  submittedFilters,
  formatCellValue,
}: Props) {
  const { t } = useTranslation()
  const { showError } = useRequestError()

  const openCustomerSummary = async () => {
    try {
      const summary = await fetchCustomerStatementSummary(submittedFilters)

      if (!summary.documentCount) {
        message.info(t('hooks.customerActions.noCustomerData'))
        return
      }

      modal.info({
        title: t('hooks.customerActions.customerSummaryTitle'),
        width: 720,
        content: (
          <Flex vertical gap={12} className="mt-12">
            <Typography.Text>
              {t('hooks.customerActions.documentCount', {
                count: summary.documentCount,
              })}
            </Typography.Text>
            <Typography.Text>
              {t('hooks.customerActions.salesAmount')}
              {formatCellValue(summary.salesAmount, 'amount')}
            </Typography.Text>
            <Typography.Text>
              {t('hooks.customerActions.receiptAmount')}
              {formatCellValue(summary.receiptAmount, 'amount')}
            </Typography.Text>
            <Typography.Text>
              {t('hooks.customerActions.closingAmount')}
              {formatCellValue(summary.closingAmount, 'amount')}
            </Typography.Text>
          </Flex>
        ),
      })
    } catch (error) {
      showError(error)
    }
  }

  return { openCustomerSummary }
}
