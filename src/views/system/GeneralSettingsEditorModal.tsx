import type { FormInstance } from 'antd'
import ColorPicker from 'antd/es/color-picker'
import Form from 'antd/es/form'
import Input from 'antd/es/input'
import Select from 'antd/es/select'
import Space from 'antd/es/space'
import Switch from 'antd/es/switch'
import Typography from 'antd/es/typography'
import { useTranslation } from 'react-i18next'
import { FormModal } from '@/components/FormModal'
import type { ModuleRecord } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'
import {
  DETAILED_OPERATION_ACTION_OPTIONS,
  HIDE_AUDITED_STATUS_OPTIONS,
  isDefaultListPageSizeSetting,
  isDefaultTaxRateSetting,
  isNumericSetting,
  isWatermarkContentSetting,
  isWatermarkPropSetting,
  SYSTEM_SWITCH_HELP_TEXT,
  WATERMARK_COLOR_CODE,
  WATERMARK_DENSITY_CODE,
  WATERMARK_FONT_SIZE_CODE,
} from '@/views/system/general-settings-view-utils'

interface Props {
  open: boolean
  record: ModuleRecord | null
  form: FormInstance
  saving: boolean
  onSave: () => void
  onClose: () => void
}

function WatermarkColorInput({
  value,
  onChange,
}: {
  value?: string
  onChange?: (value: string) => void
}) {
  return (
    <Space.Compact className="w-full">
      <ColorPicker
        format="rgb"
        value={value || undefined}
        onChange={(_, hex) => onChange?.(hex)}
      />
      <Input
        value={value ?? ''}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder="rgba(0,0,0,0.08)"
        maxLength={50}
      />
    </Space.Compact>
  )
}

export function GeneralSettingsEditorModal({
  open,
  record,
  form,
  saving,
  onSave,
  onClose,
}: Props) {
  const { t } = useTranslation()
  return (
    <FormModal
      title={`${t('system.generalSettingsEditor.editTitle')} ${asString(record?.settingName) || t('system.generalSettingsEditor.defaultTitle')}`}
      open={open}
      onClose={onClose}
      onSave={onSave}
      confirmLoading={saving}
      width={600}
    >
      {record && (
        <Form form={form} layout="vertical">
          <Form.Item name="settingCode" label={t('system.generalSettingsEditor.settingCode')}>
            <Input disabled />
          </Form.Item>
          <Form.Item name="settingName" label={t('system.generalSettingsEditor.settingName')}>
            <Input disabled />
          </Form.Item>
          <Form.Item name="billName" label={t('system.generalSettingsEditor.billScope')}>
            <Input disabled />
          </Form.Item>
          {isNumericSetting(record) ? (
            isWatermarkContentSetting(record) ? (
              <Form.Item
                name="numericValue"
                label={
                  asString(record.settingCode) === WATERMARK_COLOR_CODE
                    ? t('system.generalSettingsEditor.watermarkColor')
                    : t('system.generalSettingsEditor.watermarkContent')
                }
                rules={[
                  {
                    max:
                      asString(record.settingCode) === WATERMARK_COLOR_CODE
                        ? 50
                        : 64,
                    message: t('system.generalSettingsEditor.maxChars', { count: asString(record.settingCode) === WATERMARK_COLOR_CODE ? 50 : 64 }),
                  },
                ]}
                extra={
                  asString(record.settingCode) === WATERMARK_COLOR_CODE ? null : (
                    <Typography.Text type="secondary" className="text-xs">
                      {t('system.generalSettingsEditor.magicVars')}{' '}
                      <Typography.Text code className="text-xs">
                        {'{username}'}
                      </Typography.Text>{' '}
                      <Typography.Text code className="text-xs">
                        {'{time}'}
                      </Typography.Text>{' '}
                      <Typography.Text code className="text-xs">
                        {'{date}'}
                      </Typography.Text>{' '}
                      {t('system.generalSettingsEditor.autoReplace')}
                      {t('system.generalSettingsEditor.watermarkNewlineHint')}
                    </Typography.Text>
                  )
                }
              >
                {asString(record.settingCode) === WATERMARK_COLOR_CODE ? (
                  <WatermarkColorInput />
                ) : (
                  <Input.TextArea rows={4} maxLength={64} showCount />
                )}
              </Form.Item>
            ) : (
              <Form.Item
                name="numericValue"
                label={
                  asString(record.settingCode) === WATERMARK_FONT_SIZE_CODE
                    ? t('system.generalSettingsEditor.watermarkFontSize')
                    : asString(record.settingCode) === WATERMARK_DENSITY_CODE
                      ? t('system.generalSettingsEditor.watermarkDensity')
                      : t('system.generalSettingsEditor.currentValue')
                }
                required
              >
                {isDefaultTaxRateSetting(record) ? (
                  <Input
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    addonAfter="%"
                  />
                ) : isDefaultListPageSizeSetting(record) ? (
                  <Input type="number" min={1} max={200} step={1} />
                ) : isWatermarkPropSetting(record) ? (
                  asString(record.settingCode) === WATERMARK_FONT_SIZE_CODE ? (
                    <Input
                      type="number"
                      min={8}
                      max={72}
                      step={1}
                      addonAfter="px"
                    />
                  ) : asString(record.settingCode) ===
                    WATERMARK_DENSITY_CODE ? (
                    <Input
                      type="number"
                      min={50}
                      max={400}
                      step={10}
                      addonAfter="px"
                    />
                  ) : (
                    <Input
                      type="number"
                      min={-90}
                      max={90}
                      step={1}
                      addonAfter="°"
                    />
                  )
                ) : (
                  <Input type="number" min={0} />
                )}
              </Form.Item>
            )
          ) : (
            <>
              <Form.Item
                name="enabled"
                label={t('system.generalSettingsEditor.enabledStatus')}
                valuePropName="checked"
              >
                <Switch checkedChildren={t('system.generalSettingsEditor.switchEnabled')} unCheckedChildren={t('system.generalSettingsEditor.switchDisabled')} />
              </Form.Item>
              {asString(record.settingCode) ===
                'SYS_OPERATION_LOG_DETAILED_PAGE_ACTIONS' && (
                <Form.Item name="selectedActions" label={t('system.generalSettingsEditor.recordedActions')}>
                  <Select
                    mode="multiple"
                    options={DETAILED_OPERATION_ACTION_OPTIONS}
                  />
                </Form.Item>
              )}
              {asString(record.settingCode) ===
                'UI_HIDE_AUDITED_LIST_RECORDS' && (
                <Form.Item name="selectedActions" label={t('system.generalSettingsEditor.hiddenStatuses')}>
                  <Select
                    mode="multiple"
                    options={HIDE_AUDITED_STATUS_OPTIONS}
                  />
                </Form.Item>
              )}
            </>
          )}
          <Form.Item name="remark" label={t('system.generalSettingsEditor.remark')}>
            <Input.TextArea rows={2} disabled />
          </Form.Item>
          {SYSTEM_SWITCH_HELP_TEXT[asString(record.settingCode)] && (
            <Typography.Text type="secondary">
              {SYSTEM_SWITCH_HELP_TEXT[asString(record.settingCode)]}
            </Typography.Text>
          )}
        </Form>
      )}
    </FormModal>
  )
}
