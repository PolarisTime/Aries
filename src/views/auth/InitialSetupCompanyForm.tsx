import { BankOutlined } from '@ant-design/icons'
import Alert from 'antd/es/alert'
import Button from 'antd/es/button'
import Form from 'antd/es/form'
import Input from 'antd/es/input'
import InputNumber from 'antd/es/input-number'
import Space from 'antd/es/space'

interface Props {
  adminCompleted: boolean
  loadingCompany: boolean
  onBack: () => void
  onSubmitCompany: () => void
}

export function InitialSetupCompanyForm({
  adminCompleted,
  loadingCompany,
  onBack,
  onSubmitCompany,
}: Props) {
  return (
    <>
      {adminCompleted && (
        <Alert
          type="success"
          title="管理员账户已创建成功"
          style={{ marginBottom: 16 }}
        />
      )}
      <Form.Item
        name="companyName"
        label="公司名称"
        rules={[{ required: true, message: '请输入公司名称' }]}
      >
        <Input prefix={<BankOutlined />} placeholder="公司名称" autoFocus />
      </Form.Item>
      <Form.Item
        name="taxNo"
        label="税号"
        rules={[{ required: true, message: '请输入税号' }]}
      >
        <Input placeholder="税号" />
      </Form.Item>
      <Form.Item
        name="bankName"
        label="开户银行"
        rules={[{ required: true, message: '请输入开户银行' }]}
      >
        <Input placeholder="开户银行" />
      </Form.Item>
      <Form.Item
        name="bankAccount"
        label="银行账号"
        rules={[{ required: true, message: '请输入银行账号' }]}
      >
        <Input placeholder="银行账号" />
      </Form.Item>
      <Form.Item name="taxRate" label="税率">
        <InputNumber min={0} max={1} step={0.01} style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name="remark" label="备注">
        <Input.TextArea rows={2} />
      </Form.Item>
      <Space>
        <Button onClick={onBack}>上一步</Button>
        <Button
          type="primary"
          loading={loadingCompany}
          onClick={onSubmitCompany}
          block
        >
          完成初始化
        </Button>
      </Space>
    </>
  )
}
