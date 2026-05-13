import type { FormInstance } from 'antd'
import Col from 'antd/es/col'
import Form from 'antd/es/form'
import Input from 'antd/es/input'
import { FormModal } from '@/components/FormModal'
import Row from 'antd/es/row'
import Select from 'antd/es/select'
import Typography from 'antd/es/typography'
import {
  buildRuleSampleNo,
  buildUploadRulePreview,
  DATE_RULE_OPTIONS,
  NUMBER_RULE_STATUS_OPTIONS,
  type NumberRuleEditorKind,
  RESET_RULE_OPTIONS,
} from '@/views/system/number-rules-view-utils'

type Props = {
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
      title={kind === 'number-rule' ? '编辑单号规则' : '编辑上传规则'}
      open={open}
      onClose={onClose}
      onSave={onSave}
      confirmLoading={saving}
      width={600}
    >
      <Form form={form} layout="vertical">
        {kind === 'number-rule' ? (
          <>
            <Form.Item name="settingCode" label="规则编码">
              <Input disabled />
            </Form.Item>
            <Form.Item name="settingName" label="规则名称">
              <Input disabled />
            </Form.Item>
            <Form.Item name="billName" label="适用单据">
              <Input disabled />
            </Form.Item>
            <Form.Item name="prefix" label="规则模板" required>
              <Input placeholder="如：PO-{yyyy}{seq}" />
            </Form.Item>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="dateRule" label="日期规则">
                  <Select options={DATE_RULE_OPTIONS} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="serialLength" label="流水位数">
                  <Input type="number" min={1} max={10} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="resetRule" label="重置规则">
                  <Select options={RESET_RULE_OPTIONS} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="status" label="状态">
              <Select options={NUMBER_RULE_STATUS_OPTIONS} />
            </Form.Item>
            <Form.Item name="remark" label="备注">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Typography.Text type="secondary">
              示例单号：{numberRulePreview}
            </Typography.Text>
          </>
        ) : (
          <>
            <Form.Item name="moduleKey" label="模块编码">
              <Input disabled />
            </Form.Item>
            <Form.Item name="moduleName" label="模块名称">
              <Input disabled />
            </Form.Item>
            <Form.Item name="ruleCode" label="规则编码">
              <Input disabled />
            </Form.Item>
            <Form.Item name="ruleName" label="规则名称">
              <Input disabled />
            </Form.Item>
            <Form.Item name="renamePattern" label="重命名模板" required>
              <Input placeholder="如：{yyyyMMdd}_{originName}{ext}" />
            </Form.Item>
            <Form.Item name="status" label="状态">
              <Select options={NUMBER_RULE_STATUS_OPTIONS} />
            </Form.Item>
            <Form.Item name="remark" label="备注">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Typography.Text type="secondary">
              示例文件名：{uploadRulePreview || '--'}
            </Typography.Text>
          </>
        )}
      </Form>
    </FormModal>
  )
}
