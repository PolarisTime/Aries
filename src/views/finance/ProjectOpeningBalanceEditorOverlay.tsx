import type { FormInstance } from 'antd'
import {
  Alert,
  Button,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Radio,
  Row,
  Select,
  Space,
} from 'antd'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  createProjectOpeningBalance,
  type ProjectOpeningBalanceRecord,
  updateProjectOpeningBalance,
} from '@/api/finance/project-opening-balances'
import type { ProjectOption } from '@/api/master/project-options'
import { message } from '@/utils/antd-app'
import { DATE_PICKER_FORMATS } from '@/utils/formatters'
import { WorkspaceOverlay } from '@/views/modules/components/WorkspaceOverlay'
import {
  buildOpeningBalancePayload,
  isOpeningBalanceVersionConflict,
  type ProjectOpeningBalanceFormValues,
} from './project-opening-balance-model'

interface Props {
  open: boolean
  editingRecord: ProjectOpeningBalanceRecord | null
  form: FormInstance<ProjectOpeningBalanceFormValues>
  projectOptions: ProjectOption[]
  customerNameById: ReadonlyMap<string, string>
  projectsLoading: boolean
  canConfirm: boolean
  onClose: () => void
  onSaved: () => Promise<void>
}

export function ProjectOpeningBalanceEditorOverlay({
  open,
  editingRecord,
  form,
  projectOptions,
  customerNameById,
  projectsLoading,
  canConfirm,
  onClose,
  onSaved,
}: Props) {
  const { t } = useTranslation()
  const [saving, setSaving] = useState(false)
  const watchedProjectId = Form.useWatch('projectId', form)

  const selectedProject = useMemo(
    () => projectOptions.find((option) => option.id === watchedProjectId),
    [projectOptions, watchedProjectId],
  )

  const selectOptions = useMemo(
    () =>
      projectOptions.map((option) => {
        const customerName =
          customerNameById.get(option.customerId) || option.customerCode
        return {
          label: customerName
            ? `${option.projectName}（${customerName}）`
            : option.projectName,
          value: option.id,
        }
      }),
    [customerNameById, projectOptions],
  )

  const handleSave = async (confirmAfterSave: boolean) => {
    let values: ProjectOpeningBalanceFormValues
    try {
      values = await form.validateFields()
    } catch {
      return
    }

    setSaving(true)
    try {
      const payload = buildOpeningBalancePayload(values, confirmAfterSave)
      if (editingRecord) {
        await updateProjectOpeningBalance(
          editingRecord.id,
          payload,
          editingRecord.version,
        )
      } else {
        await createProjectOpeningBalance(payload)
      }
      message.success(
        confirmAfterSave
          ? t('openingBalance.saveAndConfirmSuccess')
          : t('modules.saveResult.success'),
      )
      onClose()
      await onSaved()
    } catch (error) {
      if (isOpeningBalanceVersionConflict(error)) {
        message.error(t('openingBalance.versionConflict'))
      } else {
        message.error(
          error instanceof Error ? error.message : t('api.saveFailed'),
        )
      }
    }
    setSaving(false)
  }

  return (
    <WorkspaceOverlay
      open={open}
      className="workspace-overlay-panel--form-dialog"
      title={
        editingRecord
          ? t('openingBalance.editTitle')
          : t('openingBalance.createTitle')
      }
      onClose={onClose}
      footer={
        <Space>
          <Button onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button loading={saving} onClick={() => void handleSave(false)}>
            {t('openingBalance.saveDraft')}
          </Button>
          {canConfirm ? (
            <Button
              type="primary"
              loading={saving}
              onClick={() => void handleSave(true)}
            >
              {t('openingBalance.saveAndConfirm')}
            </Button>
          ) : null}
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        className="master-form"
        disabled={saving}
      >
        <Row gutter={[16, 8]}>
          <Col span={12}>
            <Form.Item
              name="projectId"
              label={t('openingBalance.project')}
              rules={[
                {
                  required: true,
                  message: t('modules.formField.selectRequired', {
                    label: t('openingBalance.project'),
                  }),
                },
              ]}
            >
              <Select
                showSearch={{ optionFilterProp: 'label' }}
                loading={projectsLoading}
                options={selectOptions}
                placeholder={t('openingBalance.selectProject')}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="balanceType"
              label={t('openingBalance.balanceType')}
              tooltip={t('openingBalance.balanceTypeHint')}
              extra={t('openingBalance.balanceTypeHint')}
              rules={[
                {
                  required: true,
                  message: t('modules.formField.selectRequired', {
                    label: t('openingBalance.balanceType'),
                  }),
                },
              ]}
            >
              <Radio.Group
                optionType="button"
                buttonStyle="solid"
                options={[
                  {
                    label: t('openingBalance.typeReceivable'),
                    value: 'RECEIVABLE',
                  },
                  {
                    label: t('openingBalance.typeAdvance'),
                    value: 'ADVANCE',
                  },
                ]}
              />
            </Form.Item>
          </Col>
          {selectedProject ? (
            <Col span={24}>
              <Alert
                type="info"
                showIcon
                title={t('openingBalance.projectDerivedInfo', {
                  customer:
                    customerNameById.get(selectedProject.customerId) ||
                    selectedProject.customerCode ||
                    '-',
                  company: selectedProject.settlementCompanyName || '-',
                })}
              />
            </Col>
          ) : null}
          <Col span={12}>
            <Form.Item
              name="cutoffDate"
              label={t('openingBalance.cutoffDate')}
              tooltip={t('openingBalance.cutoffDateHint')}
              extra={t('openingBalance.cutoffDateHint')}
              rules={[
                {
                  required: true,
                  message: t('modules.formField.selectRequired', {
                    label: t('openingBalance.cutoffDate'),
                  }),
                },
              ]}
            >
              <DatePicker
                style={{ width: '100%' }}
                format={DATE_PICKER_FORMATS}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="openingAmount"
              label={t('openingBalance.openingAmount')}
              rules={[
                {
                  required: true,
                  message: t('modules.formField.inputRequired', {
                    label: t('openingBalance.openingAmount'),
                  }),
                },
              ]}
            >
              <InputNumber
                min={0.01}
                precision={2}
                prefix="¥"
                suffix={t('modules.units.yuan')}
                style={{ width: '100%' }}
                placeholder={t('openingBalance.openingAmountPlaceholder')}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="balanceNo"
              label={t('openingBalance.balanceNo')}
              tooltip={t('openingBalance.balanceNoHint')}
              extra={t('openingBalance.balanceNoHint')}
            >
              <Input
                maxLength={64}
                placeholder={t('openingBalance.balanceNoPlaceholder')}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="legacyDocNo"
              label={t('openingBalance.legacyDocNo')}
              tooltip={t('openingBalance.legacyDocNoHint')}
              extra={t('openingBalance.legacyDocNoHint')}
            >
              <Input
                maxLength={64}
                placeholder={t('openingBalance.legacyDocNoPlaceholder')}
              />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="remark" label={t('modules.columns.remark')}>
              <Input.TextArea rows={2} maxLength={255} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </WorkspaceOverlay>
  )
}
