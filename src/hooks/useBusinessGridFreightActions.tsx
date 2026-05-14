import Flex from 'antd/es/flex'
import Typography from 'antd/es/typography'
import { useCallback } from 'react'
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
  const openFreightSummary = useCallback(async () => {
    const rows = await listAllBusinessModuleRows(
      'freight-statement',
      submittedFilters,
    )

    if (!rows.length) {
      message.info('当前列表暂无物流对账单数据')
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
      title: '运费对账汇总',
      width: 720,
      content: (
        <Flex vertical gap={12} className="mt-12">
          <Typography.Text>当前列表单据数：{rows.length}</Typography.Text>
          <Typography.Text>
            总重量（吨）：{formatCellValue(totalWeight, 'weight')}
          </Typography.Text>
          <Typography.Text>
            总运费：{formatCellValue(totalFreight, 'amount')}
          </Typography.Text>
          <Typography.Text>
            已付金额：{formatCellValue(paidAmount, 'amount')}
          </Typography.Text>
          <Typography.Text>
            未付金额：{formatCellValue(unpaidAmount, 'amount')}
          </Typography.Text>
        </Flex>
      ),
    })
  }, [formatCellValue, submittedFilters])

  return { openFreightSummary }
}
