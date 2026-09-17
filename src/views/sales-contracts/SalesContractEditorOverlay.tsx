import type { FormInstance } from 'antd'
import {
  Button,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
} from 'antd'
import dayjs from 'dayjs'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CustomerOption } from '@/api/master/customer-options'
import type { ProjectOption } from '@/api/master/project-options'
import type { SalesContractResponse } from '@/api/sales/sales-contracts'
import {
  createSalesContract,
  updateSalesContract,
} from '@/api/sales/sales-contracts'
import { message } from '@/utils/antd-app'
import { asString } from '@/utils/type-narrowing'
import { WorkspaceOverlay } from '@/views/modules/components/WorkspaceOverlay'
import {
  buildSalesContractUpsertPayload,
  isSalesContractDateRangeValid,
  isSalesContractVersionConflict,
  type SalesContractFormValues,
  validateSalesContractForm,
} from './sales-contract-model'

interface SalesContractEditorOverlayProps {
  open: boolean
  editorBaseRecord: SalesContractResponse | null
  form: FormInstance<SalesContractFormValues>
  customerOptions: CustomerOption[]
  projectOptions: ProjectOption[]
  projectsLoading: boolean
  onCustomerChange: (customerId: string) => void
  onClose: () => void
  onSaved: () => Promise<void>
}

export function SalesContractEditorOverlay({
  open,
  editorBaseRecord,
  form,
  customerOptions,
  projectOptions,
  projectsLoading,
  onCustomerChange,
  onClose,
  onSaved,
}: SalesContractEditorOverlayProps) {
  const { t } = useTranslation()
  const [saving, setSaving] = useState(false)

  const syncEditorForm = (changed: Record<string, unknown>) => {
    if (Object.hasOwn(changed, 'customerId')) {
      const nextCustomerId = asString(changed.customerId).trim()
      form.setFieldValue('projectId', '')
      onCustomerChange(nextCustomerId)
    }
  }

  const handleSave = async () => {
    let values: SalesContractFormValues
    try {
      values = await form.validateFields()
    } catch {
      // antd 已内联展示校验错误，直接返回避免未处理的 Promise rejection。
      return
    }
    const validationMessage = validateSalesContractForm(values, t)
    if (validationMessage) {
      message.warning(validationMessage)
      return
    }

    setSaving(true)
    try {
      const payload = buildSalesContractUpsertPayload(values)
      if (editorBaseRecord) {
        await updateSalesContract(
          editorBaseRecord.id,
          payload,
          editorBaseRecord.version,
        )
      } else {
        await createSalesContract(payload)
      }
      message.success(t('modules.saveResult.success'))
      onClose()
      await onSaved()
    } catch (error) {
      if (isSalesContractVersionConflict(error)) {
        message.error(t('modules.salesContract.versionConflict'))
      } else {
        message.error(
          error instanceof Error ? error.message : t('api.saveFailed'),
        )
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <WorkspaceOverlay
      open={open}
      title={t('modules.editor.title', {
        mode: editorBaseRecord
          ? t('modules.editor.edit')
          : t('modules.editor.create'),
        title: t('modules.pages.salesContract.title'),
      })}
      onClose={onClose}
    >
      <Form
        form={form}
        layout="vertical"
        disabled={saving}
        onValuesChange={(changedValues) => syncEditorForm(changedValues)}
      >
        <Row gutter={[12, 12]}>
          <Col span={8}>
            <Form.Item
              name="contractNo"
              label={t('modules.salesContract.contractNo')}
              tooltip={t('modules.salesContract.contractNoAutoHint')}
            >
              <Input
                maxLength={64}
                placeholder={t('modules.salesContract.contractNoAutoHint')}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="name"
              label={t('modules.salesContract.name')}
              rules={[
                {
                  required: true,
                  message: t('modules.formField.inputRequired', {
                    label: t('modules.salesContract.name'),
                  }),
                },
              ]}
            >
              <Input maxLength={128} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="customerId"
              label={t('modules.salesContract.customer')}
              rules={[
                {
                  required: true,
                  message: t('modules.formField.selectRequired', {
                    label: t('modules.salesContract.customer'),
                  }),
                },
              ]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                options={customerOptions.map((option) => ({
                  label: option.customerName || option.label,
                  value: option.id,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="projectId"
              label={t('modules.salesContract.project')}
              rules={[
                {
                  required: true,
                  message: t('modules.formField.selectRequired', {
                    label: t('modules.salesContract.project'),
                  }),
                },
              ]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                loading={projectsLoading}
                options={projectOptions.map((option) => ({
                  label: option.projectName || option.label,
                  value: option.id,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="signDate"
              label={t('modules.salesContract.signDate')}
              rules={[
                {
                  required: true,
                  message: t('modules.formField.selectRequired', {
                    label: t('modules.salesContract.signDate'),
                  }),
                },
              ]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="startDate"
              label={t('modules.salesContract.startDate')}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="endDate"
              label={t('modules.salesContract.endDate')}
              dependencies={['startDate']}
              rules={[
                {
                  validator: (_rule, value: unknown) =>
                    isSalesContractDateRangeValid({
                      startDate: form.getFieldValue('startDate'),
                      endDate: value,
                    })
                      ? Promise.resolve()
                      : Promise.reject(
                          new Error(
                            t('modules.salesContract.dateRangeInvalid'),
                          ),
                        ),
                },
              ]}
            >
              <DatePicker
                style={{ width: '100%' }}
                disabledDate={(current) => {
                  const start = dayjs(form.getFieldValue('startDate') as string)
                  return (
                    Boolean(start?.isValid()) && current.isBefore(start, 'day')
                  )
                }}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="totalAmount"
              label={t('modules.salesContract.totalAmount')}
              rules={[
                {
                  required: true,
                  message: t('modules.formField.inputRequired', {
                    label: t('modules.salesContract.totalAmount'),
                  }),
                },
              ]}
            >
              <InputNumber
                min={0}
                style={{ width: '100%' }}
                addonAfter={t('modules.units.yuan')}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="totalTonnage"
              label={t('modules.salesContract.totalTonnage')}
              rules={[
                {
                  required: true,
                  message: t('modules.formField.inputRequired', {
                    label: t('modules.salesContract.totalTonnage'),
                  }),
                },
              ]}
            >
              <InputNumber
                min={0}
                style={{ width: '100%' }}
                addonAfter={t('modules.units.ton')}
              />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="remark" label={t('modules.columns.remark')}>
              <Input.TextArea rows={3} maxLength={255} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
      <div className="workspace-overlay-footer">
        <Space>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button
            type="primary"
            loading={saving}
            onClick={() => void handleSave()}
          >
            {t('common.save')}
          </Button>
        </Space>
      </div>
    </WorkspaceOverlay>
  )
}
