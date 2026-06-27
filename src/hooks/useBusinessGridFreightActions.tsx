import { Flex, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { listAllBusinessModuleRows } from '@/api/business'
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

  const openFreightSummary = async () => {
    const rows = await listAllBusinessModuleRows(
      'freight-statement',
      submittedFilters,
    )

    if (!rows.length) {
      message.info(t('hooks.freightActions.noFreightData'))
      return
    }

    const totalWeight = rows.reduce(
      (sum, record) => sum + Number(record.totalWeight || 0),
      0,
    )
    const totalFreight = rows.reduce(
      (sum, record) => sum + Number(record.totalFreight || 0),
      0,
    )
    const paidAmount = rows.reduce(
      (sum, record) => sum + Number(record.paidAmount || 0),
      0,
    )
    const unpaidAmount = rows.reduce(
      (sum, record) =>
        sum +
        Number(
          record.unpaidAmount ||
            Number(record.totalFreight || 0) - Number(record.paidAmount || 0),
        ),
      0,
    )

    modal.info({
      title: t('hooks.freightActions.freightSummaryTitle'),
      width: 720,
      content: (
        <Flex vertical gap={12} className="mt-12">
          <Typography.Text>
            {t('hooks.freightActions.documentCount', { count: rows.length })}
          </Typography.Text>
          <Typography.Text>
            {t('hooks.freightActions.totalWeight')}
            {formatCellValue(totalWeight, 'weight')}
          </Typography.Text>
          <Typography.Text>
            {t('hooks.freightActions.totalFreight')}
            {formatCellValue(totalFreight, 'amount')}
          </Typography.Text>
          <Typography.Text>
            {t('hooks.freightActions.paidAmount')}
            {formatCellValue(paidAmount, 'amount')}
          </Typography.Text>
          <Typography.Text>
            {t('hooks.freightActions.unpaidAmount')}
            {formatCellValue(unpaidAmount, 'amount')}
          </Typography.Text>
        </Flex>
      ),
    })
  }

  return { openFreightSummary }
}
