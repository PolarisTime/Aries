import { EditOutlined } from '@ant-design/icons'
import { Card, Form, Input, Select } from 'antd'
import { useTranslation } from 'react-i18next'
import { STATUS } from '@/constants/status-constants'

interface Props {
  canSave: boolean
}
export function CompanySubjectCard({ canSave }: Props) {
  const { t } = useTranslation()
  return (
    <Card
      size="small"
      title={
        <span>
          <EditOutlined /> {t('system.companySubject.sectionTitle')}
        </span>
      }
    >
      <Form.Item
        name="companyName"
        label={t('system.companySubject.companyName')}
        rules={[{ required: true, whitespace: true }]}
      >
        <Input
          disabled={!canSave}
          placeholder={t('system.companySubject.companyNamePlaceholder')}
        />
      </Form.Item>
      <Form.Item
        name="taxNo"
        label={t('system.companySubject.taxNo')}
        rules={[{ required: true, whitespace: true }]}
      >
        <Input
          disabled={!canSave}
          placeholder={t('system.companySubject.taxNoPlaceholder')}
        />
      </Form.Item>
      <Form.Item
        name="status"
        label={t('system.companySubject.status')}
        required
      >
        <Select
          disabled={!canSave}
          options={[
            {
              label: t('system.companySubject.statusNormal'),
              value: STATUS.NORMAL,
            },
            {
              label: t('system.companySubject.statusDisabled'),
              value: STATUS.DISABLED,
            },
          ]}
        />
      </Form.Item>
    </Card>
  )
}
