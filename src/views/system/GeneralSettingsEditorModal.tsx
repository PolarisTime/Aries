import type { FormInstance } from 'antd'
import { Form, Input, Select, Space, Switch, Typography } from 'antd'
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
  SYSTEM_SWITCH_HELP_TEXT,
} from '@/views/system/general-settings-view-utils'

interface Props {
  open: boolean
  record: ModuleRecord | null
  form: FormInstance
  saving: boolean
  onSave: () => void
  onClose: () => void
}

function NumericInputWithAddon({
  addon,
  max,
  min,
  step,
}: {
  addon: string
  max?: number
  min?: number
  step?: number
}) {
  return (
    <Space.Compact className="w-full">
      <Input type="number" min={min} max={max} step={step} />
      <Space.Addon>{addon}</Space.Addon>
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
          <Form.Item
            name="settingCode"
            label={t('system.generalSettingsEditor.settingCode')}
          >
            <Input disabled />
          </Form.Item>
          <Form.Item
            name="settingName"
            label={t('system.generalSettingsEditor.settingName')}
          >
            <Input disabled />
          </Form.Item>
          <Form.Item
            name="billName"
            label={t('system.generalSettingsEditor.billScope')}
          >
            <Input disabled />
          </Form.Item>
          {isNumericSetting(record) ? (
            <Form.Item
              name="numericValue"
              label={t('system.generalSettingsEditor.currentValue')}
              required
            >
              {isDefaultTaxRateSetting(record) ? (
                <NumericInputWithAddon addon="%" min={0} max={1} step={0.01} />
              ) : isDefaultListPageSizeSetting(record) ? (
                <Input type="number" min={1} max={200} step={1} />
              ) : (
                <Input type="number" min={0} />
              )}
            </Form.Item>
          ) : (
            <>
              <Form.Item
                name="enabled"
                label={t('system.generalSettingsEditor.enabledStatus')}
                valuePropName="checked"
              >
                <Switch
                  checkedChildren={t(
                    'system.generalSettingsEditor.switchEnabled',
                  )}
                  unCheckedChildren={t(
                    'system.generalSettingsEditor.switchDisabled',
                  )}
                />
              </Form.Item>
              {asString(record.settingCode) ===
                'SYS_OPERATION_LOG_DETAILED_PAGE_ACTIONS' && (
                <Form.Item
                  name="selectedActions"
                  label={t('system.generalSettingsEditor.recordedActions')}
                >
                  <Select
                    mode="multiple"
                    options={DETAILED_OPERATION_ACTION_OPTIONS}
                  />
                </Form.Item>
              )}
              {asString(record.settingCode) ===
                'UI_HIDE_AUDITED_LIST_RECORDS' && (
                <Form.Item
                  name="selectedActions"
                  label={t('system.generalSettingsEditor.hiddenStatuses')}
                >
                  <Select
                    mode="multiple"
                    options={HIDE_AUDITED_STATUS_OPTIONS}
                  />
                </Form.Item>
              )}
            </>
          )}
          <Form.Item
            name="remark"
            label={t('system.generalSettingsEditor.remark')}
          >
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
