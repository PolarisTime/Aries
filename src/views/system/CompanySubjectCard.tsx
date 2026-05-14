import { EditOutlined, IdcardOutlined } from '@ant-design/icons'
import type { FormInstance } from 'antd'
import Card from 'antd/es/card'
import Form from 'antd/es/form'
import Input from 'antd/es/input'
import Select from 'antd/es/select'
import Typography from 'antd/es/typography'
import { getFormString } from '@/lib/antd-form'

interface Props {
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
    <Card size="small" className="bg-secondary rounded-lg">
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
        className="flex items-center gap-12 p-16 rounded-lg"
        style={{ background: 'var(--theme-highlight-bg)' }}
      >
        <div
          className="flex items-center justify-center text-xl"
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'var(--theme-primary)',
            color: '#fff',
          }}
        >
          <IdcardOutlined />
        </div>
        <div>
          <div className="font-semibold">
            {getFormString(form, 'companyName') || '公司主体待配置'}
          </div>
          <div className="text-xs text-secondary">
            {getFormString(form, 'taxNo') || '税号待配置'} / 结算银行{' '}
            {settlementAccountCount} 个
          </div>
        </div>
      </div>
    </Card>
  )
}
