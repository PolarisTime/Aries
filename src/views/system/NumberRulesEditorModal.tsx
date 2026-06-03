import type { FormInstance } from 'antd'
import Col from 'antd/es/col'
import Form from 'antd/es/form'
import Input from 'antd/es/input'
import Row from 'antd/es/row'
import Select from 'antd/es/select'
import Typography from 'antd/es/typography'
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
      <Form form={form} layout="vertical">
        {kind === 'number-rule' ? (
          <>
            <Form.Item
              name="settingCode"
              label={t('system.numberRules.settingCode')}
            >
              <Input disabled />
            </Form.Item>
            <Form.Item
              name="settingName"
              label={t('system.numberRules.settingName')}
            >
              <Input disabled />
            </Form.Item>
            <Form.Item
              name="billName"
              label={t('system.numberRules.billNameLabel')}
            >
              <Input disabled />
            </Form.Item>
            <Form.Item
              name="prefix"
              label={t('system.numberRules.prefix')}
              required
            >
              <Input placeholder={t('system.numberRules.prefixPlaceholder')} />
            </Form.Item>
            <Row gutter={[16, 0]}>
              <Col xs={24} sm={8}>
                <Form.Item
                  name="dateRule"
                  label={t('system.numberRules.dateRule')}
                >
                  <Select options={DATE_RULE_OPTIONS} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item
                  name="serialLength"
                  label={t('system.numberRules.serialLength')}
                >
                  <Input type="number" min={1} max={10} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item
                  name="resetRule"
                  label={t('system.numberRules.resetRule')}
                >
                  <Select options={RESET_RULE_OPTIONS} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="status" label={t('common.status')}>
              <Select options={NUMBER_RULE_STATUS_OPTIONS} />
            </Form.Item>
            <Form.Item name="remark" label={t('common.remark')}>
              <Input.TextArea rows={2} />
            </Form.Item>
            <Typography.Text type="secondary">
              {t('system.numberRules.sampleNoPrefix')}
              {numberRulePreview}
            </Typography.Text>
          </>
        ) : (
          <>
            <Form.Item
              name="moduleKey"
              label={t('system.numberRules.moduleCode')}
            >
              <Input disabled />
            </Form.Item>
            <Form.Item
              name="moduleName"
              label={t('system.numberRules.moduleName')}
            >
              <Input disabled />
            </Form.Item>
            <Form.Item name="ruleCode" label={t('system.numberRules.ruleCode')}>
              <Input disabled />
            </Form.Item>
            <Form.Item name="ruleName" label={t('system.numberRules.ruleName')}>
              <Input disabled />
            </Form.Item>
            <Form.Item
              name="renamePattern"
              label={t('system.numberRules.renamePattern')}
              required
            >
              <Input
                placeholder={t('system.numberRules.renamePatternPlaceholder')}
              />
            </Form.Item>
            <Form.Item name="status" label={t('common.status')}>
              <Select options={NUMBER_RULE_STATUS_OPTIONS} />
            </Form.Item>
            <Form.Item name="remark" label={t('common.remark')}>
              <Input.TextArea rows={2} />
            </Form.Item>
            <Typography.Text type="secondary">
              {t('system.numberRules.sampleFileNamePrefix')}
              {uploadRulePreview || '--'}
            </Typography.Text>
          </>
        )}
      </Form>
    </FormModal>
  )
}
