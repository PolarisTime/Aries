import { useEffect, useState } from 'react'
import { Card, Form, Input, Button, message } from 'antd'
import { SaveOutlined } from '@ant-design/icons'
import { http } from '@/api/client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'

interface CompanySettings {
  companyName: string
  taxNo: string
  bankName: string
  bankAccount: string
  taxRate: string
}

export function CompanySettingsView() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLoading(true)
    http.get<ApiResponse<CompanySettings>>(ENDPOINTS.COMPANY_SETTINGS_CURRENT)
      .then((res) => { if (res.data) form.setFieldsValue(res.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [form])

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      await http.put(ENDPOINTS.COMPANY_SETTINGS_CURRENT, values)
      message.success('保存成功')
    } catch (err) {
      if (err instanceof Error) message.error(err.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-stack">
      <Card title="公司信息" loading={loading}>
        <Form form={form} layout="vertical" style={{ maxWidth: 600 }}>
          <Form.Item name="companyName" label="公司名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="taxNo" label="税号">
            <Input />
          </Form.Item>
          <Form.Item name="bankName" label="开户银行">
            <Input />
          </Form.Item>
          <Form.Item name="bankAccount" label="银行账号">
            <Input />
          </Form.Item>
          <Form.Item name="taxRate" label="税率">
            <Input />
          </Form.Item>
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
            保存
          </Button>
        </Form>
      </Card>
    </div>
  )
}
