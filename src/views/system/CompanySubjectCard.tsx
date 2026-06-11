import { EditOutlined, IdcardOutlined } from '@ant-design/icons'
import type { FormInstance } from 'antd'
import Card from 'antd/es/card'
import Descriptions from 'antd/es/descriptions'
import Form from 'antd/es/form'
import Input from 'antd/es/input'
import Select from 'antd/es/select'
import Typography from 'antd/es/typography'
import { useTranslation } from 'react-i18next'
import { STATUS } from '@/constants/status-constants'
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
        required
      >
        <Input
          disabled
          placeholder={t('system.companySubject.companyNamePlaceholder')}
        />
      </Form.Item>
      <Form.Item name="taxNo" label={t('system.companySubject.taxNo')} required>
        <Input
          disabled
          placeholder={t('system.companySubject.companyNamePlaceholder')}
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
      <Descriptions
        size="small"
        column={1}
        title={
          <Typography.Text>
            <IdcardOutlined /> {t('system.companySubject.sectionTitle')}
          </Typography.Text>
        }
      >
        <Descriptions.Item label={t('system.companySubject.companyName')}>
          {getFormString(form, 'companyName') ||
            t('system.companySubject.pendingCompany')}
        </Descriptions.Item>
        <Descriptions.Item label={t('system.companySubject.taxNo')}>
          {getFormString(form, 'taxNo') ||
            t('system.companySubject.pendingTaxNo')}
        </Descriptions.Item>
        <Descriptions.Item label={t('system.companySubject.settlementBanks')}>
          {settlementAccountCount} {t('system.companySubject.unitSuffix')}
        </Descriptions.Item>
      </Descriptions>
    </Card>
  )
}
