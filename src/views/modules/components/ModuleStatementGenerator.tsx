import { useState } from 'react'
import { Modal, Form, DatePicker, Select, message } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { searchBusinessModule } from '@/api/business'
import type { ModuleRecord } from '@/types/module-page'

interface Props {
  open: boolean
  statementType: 'customer' | 'supplier' | 'freight'
  counterpartyModuleKey: string
  onClose: () => void
  onGenerate: (counterpartyId: string, startDate: string, endDate: string) => Promise<void>
}

export function ModuleStatementGenerator({
  open, statementType, counterpartyModuleKey, onClose, onGenerate,
}: Props) {
  const [form] = Form.useForm()
  const [generating, setGenerating] = useState(false)
  const counterpartyName = Form.useWatch('counterpartyName', form)

  const { data: counterparties } = useQuery({
    queryKey: ['statement-counterparties', counterpartyModuleKey, counterpartyName],
    queryFn: () => searchBusinessModule(counterpartyModuleKey, counterpartyName || '', 50),
    enabled: open && !!counterpartyModuleKey,
  })

  const handleGenerate = async () => {
    try {
      const values = await form.validateFields()
      setGenerating(true)
      await onGenerate(
        values.counterpartyId,
        values.dateRange?.[0]?.format('YYYY-MM-DD') || '',
        values.dateRange?.[1]?.format('YYYY-MM-DD') || '',
      )
      message.success('对账单已生成')
      onClose()
    } catch (err) {
      if (err instanceof Error) message.error(err.message)
    } finally { setGenerating(false) }
  }

  return (
    <Modal
      title={`生成${statementType === 'customer' ? '客户' : statementType === 'supplier' ? '供应商' : '物流'}对账单`}
      open={open} onCancel={onClose} onOk={handleGenerate}
      confirmLoading={generating} okText="生成对账单" width={640}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="counterpartyId" label="对方单位" rules={[{ required: true, message: '请选择' }]}>
          <Select
            showSearch
            placeholder="搜索并选择..."
            filterOption={false}
            onSearch={(v) => form.setFieldValue('counterpartyName', v)}
            options={(counterparties || []).map((r: ModuleRecord) => ({
              label: String(r.customerName || r.supplierName || r.carrierName || r.id),
              value: String(r.id),
            }))}
          />
        </Form.Item>
        <Form.Item name="counterpartyName" hidden><input /></Form.Item>
        <Form.Item name="dateRange" label="对账期间" rules={[{ required: true, message: '请选择日期范围' }]}>
          <DatePicker.RangePicker style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
