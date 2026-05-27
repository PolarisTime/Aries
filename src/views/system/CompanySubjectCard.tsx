import { EditOutlined, IdcardOutlined } from '@ant-design/icons'
import type { FormInstance } from 'antd'
import Card from 'antd/es/card'
import Form from 'antd/es/form'
import Input from 'antd/es/input'
import Select from 'antd/es/select'
import Typography from 'antd/es/typography'
import { useTranslation } from 'react-i18next'
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
    <Card size="small" className="bg-secondary rounded-lg">
      <Typography.Title level={5}>
        <EditOutlined /> {t('system.companySubject.sectionTitle')}
      </Typography.Title>
      <Form.Item name="companyName" label={t('system.companySubject.companyName')} required>
        <Input disabled placeholder={t('system.companySubject.companyNamePlaceholder')} />
      </Form.Item>
      <Form.Item name="taxNo" label={t('system.companySubject.taxNo')} required>
        <Input disabled placeholder={t('system.companySubject.companyNamePlaceholder')} />
      </Form.Item>
      <Form.Item name="status" label={t('system.companySubject.status')} required>
        <Select
          disabled={!canSave}
          options={[
            { label: t('system.companySubject.statusNormal'), value: '正常' },
            { label: t('system.companySubject.statusDisabled'), value: '禁用' },
          ]}
        />
      </Form.Item>
      <div
        className="flex items-center gap-12 p-16 rounded-lg bg-[var(--theme-highlight-bg)]"
      >
        <div
          className="flex items-center justify-center text-xl w-[44px] h-[44px] rounded-xl bg-[var(--theme-primary)] text-white"
        >
          <IdcardOutlined />
        </div>
        <div>
          <div className="font-semibold">
            {getFormString(form, 'companyName') || t('system.companySubject.pendingCompany')}
          </div>
          <div className="text-xs text-secondary">
            {getFormString(form, 'taxNo') || t('system.companySubject.pendingTaxNo')} / {t('system.companySubject.settlementBanks')}{' '}
            {settlementAccountCount} {t('system.companySubject.unitSuffix')}
          </div>
        </div>
      </div>
    </Card>
  )
}
