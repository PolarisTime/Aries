import type { FormInstance } from 'antd'
import Form from 'antd/es/form'
import Input from 'antd/es/input'
import Select from 'antd/es/select'
import Switch from 'antd/es/switch'
import Typography from 'antd/es/typography'
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

export function GeneralSettingsEditorModal({
  open,
  record,
  form,
  saving,
  onSave,
  onClose,
}: Props) {
  return (
    <FormModal
      title="编辑设置"
      open={open}
      onClose={onClose}
      onSave={onSave}
      confirmLoading={saving}
      width={600}
    >
      {record && (
        <Form form={form} layout="vertical">
          <Form.Item name="settingCode" label="设置编码">
            <Input disabled />
          </Form.Item>
          <Form.Item name="settingName" label="设置名称">
            <Input disabled />
          </Form.Item>
          <Form.Item name="billName" label="适用范围">
            <Input disabled />
          </Form.Item>
          {isNumericSetting(record) ? (
            isWatermarkContentSetting(record) ? (
              <Form.Item name="numericValue" label="水印内容">
                <Input.TextArea rows={3} maxLength={200} showCount />
              </Form.Item>
            ) : (
              <Form.Item name="numericValue" label="当前值" required>
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
                ) : (
                  <Input type="number" min={0} />
                )}
              </Form.Item>
            )
          ) : (
            <>
              <Form.Item
                name="enabled"
                label="启用状态"
                valuePropName="checked"
              >
                <Switch checkedChildren="启用" unCheckedChildren="关闭" />
              </Form.Item>
              {asString(record.settingCode) ===
                'SYS_OPERATION_LOG_DETAILED_PAGE_ACTIONS' && (
                <Form.Item name="selectedActions" label="记录的操作">
                  <Select
                    mode="multiple"
                    options={DETAILED_OPERATION_ACTION_OPTIONS}
                  />
                </Form.Item>
              )}
              {asString(record.settingCode) ===
                'UI_HIDE_AUDITED_LIST_RECORDS' && (
                <Form.Item name="selectedActions" label="隐藏的状态">
                  <Select
                    mode="multiple"
                    options={HIDE_AUDITED_STATUS_OPTIONS}
                  />
                </Form.Item>
              )}
            </>
          )}
          <Form.Item name="remark" label="说明">
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
