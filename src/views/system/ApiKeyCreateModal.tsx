import type { FormInstance } from 'antd'
import {
  Alert,
  Button,
  Checkbox,
  Form,
  Input,
  InputNumber,
  Radio,
  Select,
  Space,
  Typography,
} from 'antd'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  ApiKeyActionOption,
  ApiKeyResourceOption,
  ApiKeyUserOption,
} from '@/api/api-keys'
import { FormModal } from '@/components/FormModal'
import { buildApiKeyUsageScopeOptions } from '@/views/system/api-key-form-options'
import {
  type ApiKeyPresetKey,
  buildApiKeyPresets,
  groupApiKeyResources,
} from '@/views/system/api-key-presets'
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
  const usageScopeOptions = buildApiKeyUsageScopeOptions(t)
  const presets = useMemo(
    () => buildApiKeyPresets(t, resourceOptions, actionOptions),
    [actionOptions, resourceOptions, t],
  )
  const resourceGroups = useMemo(
    () => groupApiKeyResources(resourceOptions),
    [resourceOptions],
  )

  const applyPreset = (presetKey: ApiKeyPresetKey) => {
    if (presetKey === 'custom') {
      form.setFieldValue('presetKey', presetKey)
      return
    }
    const preset = presets.find((item) => item.key === presetKey)
    if (!preset) {
      return
    }
    form.setFieldsValue({
      presetKey: preset.key,
      usageScope: preset.usageScope,
      allowedResources: preset.resourceCodes,
      allowedActions: preset.actionCodes,
    })
  }

  const markCustom = () => {
    form.setFieldValue('presetKey', 'custom')
  }

  return (
    <FormModal
      title={t('system.apiKey.generateTitle')}
      open={open}
      onClose={onClose}
      footer={null}
      width={920}
    >
      {!generatedKey ? (
        <Form form={form} layout="vertical">
          <Form.Item name="userId" label={t('system.apiKey.userId')} required>
            <Select
              showSearch={{
                filterOption: (input, option) =>
                  String(option?.label || '')
                    .toLowerCase()
                    .includes(input.toLowerCase()),
              }}
              placeholder={t('system.userAccount.searchPlaceholder')}
              options={userOptions.map((item) => ({
                label: `${getApiKeyUserDisplayName(item)}${item.mobile ? ` / ${item.mobile}` : ''}`,
                value: String(item.id || ''),
              }))}
            />
          </Form.Item>
          <Form.Item name="keyName" label={t('system.apiKey.keyName')} required>
            <Input
              placeholder={t('system.apiKey.keyNamePlaceholder')}
              maxLength={64}
            />
          </Form.Item>
          <Form.Item name="presetKey" label={t('system.apiKey.presetTemplate')}>
            <Radio.Group
              className="w-full"
              onChange={(event) => applyPreset(event.target.value)}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {presets.map((preset) => (
                  <Radio
                    key={preset.key}
                    value={preset.key}
                    className="m-0 rounded border border-[var(--theme-card-border)] px-12 py-10"
                  >
                    <div className="font-medium leading-6">{preset.label}</div>
                    <div className="text-secondary text-xs leading-5">
                      {preset.description}
                    </div>
                  </Radio>
                ))}
                <Radio
                  value="custom"
                  className="m-0 rounded border border-[var(--theme-card-border)] px-12 py-10"
                >
                  <div className="font-medium leading-6">
                    {t('system.apiKeyPresets.custom')}
                  </div>
                  <div className="text-secondary text-xs leading-5">
                    {t('system.apiKeyPresets.customDesc')}
                  </div>
                </Radio>
              </div>
            </Radio.Group>
          </Form.Item>
          <Form.Item
            name="usageScope"
            label={t('system.apiKey.usageScope')}
            required
          >
            <Select options={usageScopeOptions} onChange={markCustom} />
          </Form.Item>
          <Form.Item
            name="allowedResources"
            label={t('system.apiKey.allowedResources')}
            required
          >
            <Checkbox.Group className="w-full" onChange={markCustom}>
              <div className="max-h-[280px] overflow-auto rounded border border-[var(--theme-card-border)] p-12">
                {resourceGroups.map(({ group, resources }) => (
                  <div key={group} className="mb-12 last:mb-0">
                    <div className="mb-8 text-xs font-medium text-secondary">
                      {group || t('system.apiKeyPresets.ungrouped')}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-8 gap-x-12">
                      {resources.map((item) => (
                        <Checkbox key={item.code} value={item.code}>
                          {item.title}
                        </Checkbox>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Checkbox.Group>
          </Form.Item>
          <Form.Item
            name="allowedActions"
            label={t('system.apiKey.allowedActions')}
            required
          >
            <Checkbox.Group className="w-full" onChange={markCustom}>
              <Space wrap size={16}>
                {actionOptions.map((item) => (
                  <Checkbox key={item.code} value={item.code}>
                    {item.title}
                  </Checkbox>
                ))}
              </Space>
            </Checkbox.Group>
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
