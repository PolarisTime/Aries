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
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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
            {t('receiptReconcile.amountReceivedYuan')}
          </span>
          <div
            className="mt-1 inline-flex items-center rounded-full px-3 py-0.5"
            style={{
              background: token.colorPrimaryBg,
              color: token.colorPrimary,
              width: 'fit-content',
            }}
          >
            {t('receiptReconcile.rmbPrefix')}
            {digitToChineseUppercase(amount ?? 0)}
          </div>
        </Flex>
      </Flex>
    </div>
  )
}

export function ReceiptBasicInfoFields() {
  const { t } = useTranslation()
  return (
    <Row gutter={12} className="mt-4">
      <Col span={8}>
        <Form.Item
          name="settlementEntity"
          label={t('receiptReconcile.ourSettlementCompany')}
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
        <Form.Item
          name="bizType"
          label={t('receiptReconcile.counterpartyType')}
          rules={[{ required: true }]}
        >
          <Select options={BIZ_TYPES.map((v) => ({ value: v, label: v }))} />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item
          name="customerId"
          label={t('receiptReconcile.counterpartyCustomer')}
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
          label={t('receiptReconcile.receiptDate')}
          rules={[{ required: true }]}
        >
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item
          name="receiptMethod"
          label={t('receiptReconcile.receiptMethod')}
        >
          <Select options={PAY_METHODS.map((v) => ({ value: v, label: v }))} />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item name="bankAccount" label={t('receiptReconcile.bankAccount')}>
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
  const { t } = useTranslation()
  return (
    <>
      <Divider titlePlacement="left" plain>
        {t('receiptReconcile.voucherAndRemark')}
      </Divider>
      <Row gutter={12}>
        <Col span={12}>
          <Form.Item name="remark" label={t('receiptReconcile.remark')}>
            <Input.TextArea
              rows={3}
              placeholder={t('receiptReconcile.remarkPlaceholder')}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={t('receiptReconcile.uploadEReceipt')}>
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
                {t('receiptReconcile.uploadHint')}
              </Typography.Text>
            </Upload.Dragger>
          </Form.Item>
        </Col>
      </Row>
    </>
  )
}
