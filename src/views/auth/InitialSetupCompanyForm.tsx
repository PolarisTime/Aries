import { BankOutlined } from '@ant-design/icons'
import Alert from 'antd/es/alert'
import Button from 'antd/es/button'
import Form from 'antd/es/form'
import Input from 'antd/es/input'
import InputNumber from 'antd/es/input-number'
import Space from 'antd/es/space'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation()

  return (
    <>
      {adminCompleted && (
        <Alert
          type="success"
          title={t('auth.initialsetup.company.adminCreated')}
          className="mb-4"
        />
      )}
      <Form.Item
        name="companyName"
        label={t('auth.initialsetup.company.companyNameLabel')}
        rules={[
          {
            required: true,
            message: t('auth.initialsetup.company.companyNameRequired'),
          },
        ]}
      >
        <Input
          prefix={<BankOutlined />}
          placeholder={t('auth.initialsetup.company.companyNamePlaceholder')}
          autoFocus
        />
      </Form.Item>
      <Form.Item
        name="taxNo"
        label={t('auth.initialsetup.company.taxNoLabel')}
        rules={[
          {
            required: true,
            message: t('auth.initialsetup.company.taxNoRequired'),
          },
        ]}
      >
        <Input placeholder={t('auth.initialsetup.company.taxNoPlaceholder')} />
      </Form.Item>
      <Form.Item
        name="bankName"
        label={t('auth.initialsetup.company.bankNameLabel')}
        rules={[
          {
            required: true,
            message: t('auth.initialsetup.company.bankNameRequired'),
          },
        ]}
      >
        <Input
          placeholder={t('auth.initialsetup.company.bankNamePlaceholder')}
        />
      </Form.Item>
      <Form.Item
        name="bankAccount"
        label={t('auth.initialsetup.company.bankAccountLabel')}
        rules={[
          {
            required: true,
            message: t('auth.initialsetup.company.bankAccountRequired'),
          },
        ]}
      >
        <Input
          placeholder={t('auth.initialsetup.company.bankAccountPlaceholder')}
        />
      </Form.Item>
      <Form.Item
        name="taxRate"
        label={t('auth.initialsetup.company.taxRateLabel')}
        rules={[{ required: true, message: t('auth.initialsetup.company.taxRateRequired') }]}
      >
        <InputNumber min={0} max={1} step={0.01} className="w-full" />
      </Form.Item>
      <Form.Item
        name="remark"
        label={t('auth.initialsetup.company.remarkLabel')}
      >
        <Input.TextArea rows={2} />
      </Form.Item>
      <Space>
        <Button onClick={onBack}>{t('auth.initialsetup.company.back')}</Button>
        <Button
          type="primary"
          loading={loadingCompany}
          onClick={onSubmitCompany}
          block
        >
          {t('auth.initialsetup.company.submit')}
        </Button>
      </Space>
    </>
  )
}
