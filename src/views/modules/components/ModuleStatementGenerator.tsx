import { useQuery } from '@tanstack/react-query'
import DatePicker from 'antd/es/date-picker'
import Form from 'antd/es/form'
import Modal from 'antd/es/modal'
import Select from 'antd/es/select'
import { useEffect, useMemo, useState } from 'react'
import { fetchCarrierOptions } from '@/api/carrier-options'
import { fetchCustomerOptions } from '@/api/customer-options'
import { fetchSupplierOptions } from '@/api/supplier-options'
import { message } from '@/utils/antd-app'
import {
  buildStatementCounterpartyOptions,
  filterStatementCounterpartyOptions,
} from '@/views/modules/module-statement-generator-options'

type Props = {
  open: boolean
  statementType: 'customer' | 'supplier' | 'freight'
  onClose: () => void
  onGenerate: (
    counterpartyName: string,
    startDate: string,
    endDate: string,
  ) => Promise<void>
}

export function ModuleStatementGenerator({
  open,
  statementType,
  onClose,
  onGenerate,
}: Props) {
  const [form] = Form.useForm()
  const [generating, setGenerating] = useState(false)
  const [keyword, setKeyword] = useState('')

  useEffect(() => {
    if (!open) {
      form.resetFields()
      setKeyword('')
    }
  }, [form, open])

  const { data: counterpartyOptions = [] } = useQuery({
    queryKey: ['statement-counterparties', statementType],
    queryFn: async () => {
      if (statementType === 'supplier') {
        return buildStatementCounterpartyOptions(
          statementType,
          await fetchSupplierOptions(),
        )
      }
      if (statementType === 'customer') {
        return buildStatementCounterpartyOptions(
          statementType,
          await fetchCustomerOptions(),
        )
      }
      return buildStatementCounterpartyOptions(
        statementType,
        await fetchCarrierOptions(),
      )
    },
    enabled: open,
    staleTime: 300_000,
  })

  const filteredOptions = useMemo(
    () => filterStatementCounterpartyOptions(counterpartyOptions, keyword),
    [counterpartyOptions, keyword],
  )

  const handleGenerate = async () => {
    try {
      const values = await form.validateFields()
      setGenerating(true)
      await onGenerate(
        values.counterpartyName,
        values.dateRange?.[0]?.format('YYYY-MM-DD') || '',
        values.dateRange?.[1]?.format('YYYY-MM-DD') || '',
      )
      message.success('对账单已生成')
      onClose()
    } catch (err) {
      if (err instanceof Error) message.error(err.message)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Modal
      title={`生成${statementType === 'customer' ? '客户' : statementType === 'supplier' ? '供应商' : '物流'}对账单`}
      open={open}
      onCancel={onClose}
      oonOk={() => { void handleGenerate }}
      confirmLoading={generating}
      okText="生成对账单"
      width={640}
      forceRender
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="counterpartyName"
          label="对方单位"
          rules={[{ required: true, message: '请选择' }]}
        >
          <Select
            showSearch
            placeholder="搜索并选择..."
            filterOption={false}
            onSearch={setKeyword}
            options={filteredOptions}
          />
        </Form.Item>
        <Form.Item
          name="dateRange"
          label="对账期间"
          rules={[{ required: true, message: '请选择日期范围' }]}
        >
          <DatePicker.RangePicker className="w-full" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
