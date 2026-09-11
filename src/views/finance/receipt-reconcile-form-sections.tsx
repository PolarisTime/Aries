import { InboxOutlined } from '@ant-design/icons'
import {
  Col,
  DatePicker,
  Divider,
  Flex,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Typography,
  theme,
  Upload,
} from 'antd'
import {
  BANK_ACCOUNTS,
  BIZ_TYPES,
  digitToChineseUppercase,
  MOCK_CUSTOMERS,
  PAY_METHODS,
  SETTLEMENT_ENTITIES,
} from './receipt-reconcile-model'

export function ReceiptAmountField({
  amount,
  onAmountChange,
}: {
  amount: number
  onAmountChange: (value: number | null) => void
}) {
  const { token } = theme.useToken()
  return (
    <div
      className="rounded-lg p-4"
      style={{
        background: token.colorFillQuaternary,
        border: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <Flex align="center" gap={16}>
        <Form.Item name="amount" noStyle>
          <InputNumber
            size="large"
            min={0}
            precision={2}
            controls={false}
            prefix="¥"
            placeholder="0.00"
            style={{
              width: 280,
              fontSize: 32,
              fontWeight: 600,
              lineHeight: '48px',
            }}
            onChange={onAmountChange}
          />
        </Form.Item>
        <Flex vertical>
          <span
            style={{
              color: token.colorTextSecondary,
              fontSize: token.fontSizeSM,
            }}
          >
            实收金额（元）
          </span>
          <div
            className="mt-1 inline-flex items-center rounded-full px-3 py-0.5"
            style={{
              background: token.colorPrimaryBg,
              color: token.colorPrimary,
              width: 'fit-content',
            }}
          >
            人民币{digitToChineseUppercase(amount ?? 0)}
          </div>
        </Flex>
      </Flex>
    </div>
  )
}

export function ReceiptBasicInfoFields() {
  return (
    <Row gutter={12} className="mt-4">
      <Col span={8}>
        <Form.Item
          name="settlementEntity"
          label="我方结算主体"
          rules={[{ required: true }]}
        >
          <Select
            options={SETTLEMENT_ENTITIES.map((v) => ({
              value: v,
              label: v,
            }))}
          />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item name="bizType" label="往来类型" rules={[{ required: true }]}>
          <Select options={BIZ_TYPES.map((v) => ({ value: v, label: v }))} />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item
          name="customerId"
          label="往来客户"
          rules={[{ required: true }]}
        >
          <Select
            options={MOCK_CUSTOMERS.map((c) => ({
              value: c.id,
              label: c.name,
            }))}
          />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item
          name="receiptDate"
          label="收款日期"
          rules={[{ required: true }]}
        >
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item name="receiptMethod" label="收款方式">
          <Select options={PAY_METHODS.map((v) => ({ value: v, label: v }))} />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item name="bankAccount" label="入账银行账户">
          <Select
            options={BANK_ACCOUNTS.map((v) => ({ value: v, label: v }))}
          />
        </Form.Item>
      </Col>
    </Row>
  )
}

export function ReceiptVoucherFields({
  onAttachmentsChange,
}: {
  onAttachmentsChange: (names: string[]) => void
}) {
  const { token } = theme.useToken()
  return (
    <>
      <Divider titlePlacement="left" plain>
        凭证与备注
      </Divider>
      <Row gutter={12}>
        <Col span={12}>
          <Form.Item name="remark" label="备注说明">
            <Input.TextArea
              rows={3}
              placeholder="如：承兑汇票贴现、代付说明等"
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="电子回单上传">
            <Upload.Dragger
              multiple
              maxCount={5}
              beforeUpload={() => false}
              onChange={({ fileList }) =>
                onAttachmentsChange(fileList.map((f) => f.name))
              }
              style={{ padding: 8 }}
            >
              <p className="ant-upload-drag-icon" style={{ marginBottom: 4 }}>
                <InboxOutlined />
              </p>
              <Typography.Text
                type="secondary"
                style={{ fontSize: token.fontSizeSM }}
              >
                点击或拖拽上传银行电子回单（最多 5 份）
              </Typography.Text>
            </Upload.Dragger>
          </Form.Item>
        </Col>
      </Row>
    </>
  )
}
