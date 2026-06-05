import type { FormInstance } from 'antd'
import Alert from 'antd/es/alert'
import Button from 'antd/es/button'
import Form from 'antd/es/form'
import Input from 'antd/es/input'
import InputNumber from 'antd/es/input-number'
import Select from 'antd/es/select'
import Space from 'antd/es/space'
import Typography from 'antd/es/typography'
import { useTranslation } from 'react-i18next'
import type {
  ApiKeyActionOption,
  ApiKeyResourceOption,
  ApiKeyUserOption,
} from '@/api/api-keys'
import { FormModal } from '@/components/FormModal'
import { apiKeyUsageScopeOptions } from '@/views/system/api-key-form-options'
import { getApiKeyUserDisplayName } from '@/views/system/api-key-view-utils'

interface Props {
  open: boolean
  generatedKey: string | null
  generating: boolean
  totpDisabled: boolean
  form: FormInstance
  userOptions: ApiKeyUserOption[]
  resourceOptions: ApiKeyResourceOption[]
  actionOptions: ApiKeyActionOption[]
  onGenerate: () => void
  onClose: () => void
}

export function ApiKeyCreateModal({
  open,
  generatedKey,
  generating,
  totpDisabled,
  form,
  userOptions,
  resourceOptions,
  actionOptions,
  onGenerate,
  onClose,
}: Props) {
  const { t } = useTranslation()
  return (
    <FormModal
      title={t('system.apiKey.generateTitle')}
      open={open}
      onClose={onClose}
      footer={null}
    >
      {!generatedKey ? (
        <Form form={form} layout="vertical">
          <Form.Item name="userId" label={t('system.apiKey.userId')} required>
            <Select
              showSearch
              placeholder={t('system.userAccount.searchPlaceholder')}
              options={userOptions.map((item) => ({
                label: `${getApiKeyUserDisplayName(item)}${item.mobile ? ` / ${item.mobile}` : ''}`,
                value: String(item.id || ''),
              }))}
              filterOption={(input, option) =>
                String(option?.label || '')
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
            />
          </Form.Item>
          <Form.Item name="keyName" label={t('system.apiKey.keyName')} required>
            <Input
              placeholder={t('system.apiKey.keyNamePlaceholder')}
              maxLength={64}
            />
          </Form.Item>
          <Form.Item
            name="usageScope"
            label={t('system.apiKey.usageScope')}
            required
          >
            <Select options={apiKeyUsageScopeOptions} />
          </Form.Item>
          <Form.Item
            name="allowedResources"
            label={t('system.apiKey.allowedResources')}
          >
            <Select
              mode="multiple"
              allowClear
              placeholder={t('system.apiKey.allowedResourcesPlaceholder')}
              maxTagCount={4}
              options={resourceOptions.map((item) => ({
                label: `${item.group} / ${item.title}`,
                value: item.code,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="allowedActions"
            label={t('system.apiKey.allowedActions')}
            required
          >
            <Select
              mode="multiple"
              placeholder={t('system.apiKey.allowedActionsPlaceholder')}
              maxTagCount={5}
              options={actionOptions.map((item) => ({
                label: item.title,
                value: item.code,
              }))}
            />
          </Form.Item>
          <Form.Item name="expireDays" label={t('system.apiKey.expireDays')}>
            <InputNumber
              placeholder={t('system.apiKey.expireDaysPlaceholder')}
              className="w-full"
              min={1}
              max={3650}
            />
          </Form.Item>
          <div className="text-right">
            <Space>
              <Button onClick={onClose}>{t('common.cancel')}</Button>
              <Button
                type="primary"
                loading={generating}
                disabled={totpDisabled}
                onClick={onGenerate}
              >
                {t('system.apiKey.generate')}
              </Button>
            </Space>
          </div>
        </Form>
      ) : (
        <>
          <Alert
            type="warning"
            showIcon
            className="mb-4"
            title={t('system.apiKey.copyKeyHint')}
          />
          <div className="p-16 rounded bg-gray-100 border border-gray-300">
            <Typography.Paragraph copyable code className="m-0 break-all">
              {generatedKey}
            </Typography.Paragraph>
          </div>
          <div className="text-right mt-16">
            <Button type="primary" onClick={onClose}>
              {t('common.close')}
            </Button>
          </div>
        </>
      )}
    </FormModal>
  )
}
