import { EditOutlined, IdcardOutlined } from '@ant-design/icons'
import type { FormInstance } from 'antd'
import Card from 'antd/es/card'
import Form from 'antd/es/form'
import Input from 'antd/es/input'
import Select from 'antd/es/select'
import Typography from 'antd/es/typography'
type Props = {
  form: FormInstance
  canSave: boolean
  settlementAccountCount: number
}
export function CompanySubjectCard({
  form,
  canSave,
  settlementAccountCount,
}: Props) {
  return (
    <Card size="small" style={{ background: '#fafafa', borderRadius: 12 }}>
      <Typography.Title level={5}>
        <EditOutlined /> 基础主体
      </Typography.Title>
      <Form.Item name="companyName" label="公司名称" required>
        <Input disabled placeholder="由 OOBE 初始化写入" />
      </Form.Item>
      <Form.Item name="taxNo" label="税号" required>
        <Input disabled placeholder="由 OOBE 初始化写入" />
      </Form.Item>
      <Form.Item name="status" label="状态" required>
        <Select
          disabled={!canSave}
          options={[
            { label: '正常', value: '正常' },
            { label: '禁用', value: '禁用' },
          ]}
        />
      </Form.Item>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: 16,
          borderRadius: 12,
          background: 'linear-gradient(135deg, #e6f4ff 0%, #f6ffed 100%)',
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#1677ff',
            color: '#fff',
            fontSize: 20,
          }}
        >
          <IdcardOutlined />
        </div>
        <div>
          <div style={{ fontWeight: 600 }}>
            {getFormString(form, 'companyName') || '公司主体待配置'}
          </div>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>
            {getFormString(form, 'taxNo') || '税号待配置'} / 结算银行{' '}
            {settlementAccountCount} 个
          </div>
        </div>
      </div>
    </Card>
  )
}
