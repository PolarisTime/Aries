import {
  ProForm,
  ProFormDigit,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components/es/form'
import type { FormInstance } from 'antd'
import { Col, Form, Row, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { FormModal } from '@/components/FormModal'
import {
  buildRuleSampleNo,
  buildUploadRulePreview,
  DATE_RULE_OPTIONS,
  NUMBER_RULE_STATUS_OPTIONS,
  type NumberRuleEditorKind,
  RESET_RULE_OPTIONS,
} from '@/views/system/number-rules-view-utils'

interface Props {
  open: boolean
  kind: NumberRuleEditorKind
  form: FormInstance
  saving: boolean
  onSave: () => void
  onClose: () => void
}

export function NumberRulesEditorModal({
  open,
  kind,
  form,
  saving,
  onSave,
  onClose,
}: Props) {
  const { t } = useTranslation()
  const watchedPrefix = Form.useWatch('prefix', form)
  const watchedDateRule = Form.useWatch('dateRule', form)
  const watchedSerialLength = Form.useWatch('serialLength', form)
  const watchedRenamePattern = Form.useWatch('renamePattern', form)

  const numberRulePreview = buildRuleSampleNo(
    watchedPrefix || '',
    watchedDateRule || 'yyyy',
    Number(watchedSerialLength || 6),
  )
  const uploadRulePreview = buildUploadRulePreview(watchedRenamePattern || '')

  return (
    <FormModal
      title={
        kind === 'number-rule'
          ? t('system.numberRules.editNumberRule')
          : t('system.numberRules.editUploadRule')
      }
      open={open}
      onClose={onClose}
      onSave={onSave}
      confirmLoading={saving}
      width={600}
    >
      <ProForm form={form} layout="vertical" submitter={false}>
        {kind === 'number-rule' ? (
          <>
            <ProFormText
              name="settingCode"
              label={t('system.numberRules.settingCode')}
              disabled
            />
            <ProFormText
              name="settingName"
              label={t('system.numberRules.settingName')}
              disabled
            />
            <ProFormText
              name="billName"
              label={t('system.numberRules.billNameLabel')}
              disabled
            />
            <ProFormText
              name="prefix"
              label={t('system.numberRules.prefix')}
              required
              placeholder={t('system.numberRules.prefixPlaceholder')}
            />
            <Row gutter={[16, 0]}>
              <Col xs={24} sm={8}>
                <ProFormSelect
                  name="dateRule"
                  label={t('system.numberRules.dateRule')}
                  options={DATE_RULE_OPTIONS}
                />
              </Col>
              <Col xs={24} sm={8}>
                <ProFormDigit
                  name="serialLength"
                  label={t('system.numberRules.serialLength')}
                  min={1}
                  max={10}
                />
              </Col>
              <Col xs={24} sm={8}>
                <ProFormSelect
                  name="resetRule"
                  label={t('system.numberRules.resetRule')}
                  options={RESET_RULE_OPTIONS}
                />
              </Col>
            </Row>
            <ProFormSelect
              name="status"
              label={t('common.status')}
              options={NUMBER_RULE_STATUS_OPTIONS}
            />
            <ProFormTextArea
              name="remark"
              label={t('common.remark')}
              fieldProps={{ rows: 2 }}
            />
            <Typography.Text type="secondary">
              {t('system.numberRules.sampleNoPrefix')}
              {numberRulePreview}
            </Typography.Text>
          </>
        ) : (
          <>
            <ProFormText
              name="moduleKey"
              label={t('system.numberRules.moduleCode')}
              disabled
            />
            <ProFormText
              name="moduleName"
              label={t('system.numberRules.moduleName')}
              disabled
            />
            <ProFormText
              name="ruleCode"
              label={t('system.numberRules.ruleCode')}
              disabled
            />
            <ProFormText
              name="ruleName"
              label={t('system.numberRules.ruleName')}
              disabled
            />
            <ProFormText
              name="renamePattern"
              label={t('system.numberRules.renamePattern')}
              required
              placeholder={t('system.numberRules.renamePatternPlaceholder')}
            />
            <ProFormSelect
              name="status"
              label={t('common.status')}
              options={NUMBER_RULE_STATUS_OPTIONS}
            />
            <ProFormTextArea
              name="remark"
              label={t('common.remark')}
              fieldProps={{ rows: 2 }}
            />
            <Typography.Text type="secondary">
              {t('system.numberRules.sampleFileNamePrefix')}
              {uploadRulePreview || '--'}
            </Typography.Text>
          </>
        )}
      </ProForm>
    </FormModal>
  )
}
