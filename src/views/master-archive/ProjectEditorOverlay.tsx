import type { FormInstance } from 'antd'
import { Button, Col, Form, Input, Row, Select, Space } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { saveBusinessModule } from '@/api/business/business-crud'
import type { CustomerOption } from '@/api/master/customer-options'
import { enabledStatusOptions } from '@/constants/module-options'
import type { ModuleKey } from '@/module-system/core/module-key'
import { getSettlementCompanyOptions } from '@/queries/system/company-settings'
import type { EntityId } from '@/types/entity-id'
import type {
  LegacyModuleRecord,
  LegacyModuleRecordInput,
} from '@/types/module-record'
import { message } from '@/utils/antd-app'
import { asString } from '@/utils/type-narrowing'
import { WorkspaceOverlay } from '@/views/modules/components/WorkspaceOverlay'

const MODULE_KEY: ModuleKey = 'project'

export interface ProjectEditorValues {
  projectCode?: string
  projectName: string
  projectNameAbbr?: string
  customerId: EntityId
  customerCode?: string
  settlementCompanyId: EntityId
  settlementCompanyName?: string
  projectManager?: string
  projectAddress?: string
  status: string
  remark?: string
}

function findSettlementCompanyName(id: unknown, fallback = ''): string {
  const normalizedId = asString(id).trim()
  if (!normalizedId) {
    return ''
  }
  return (
    getSettlementCompanyOptions().find(
      (option) => asString(option.value).trim() === normalizedId,
    )?.companyName || fallback
  )
}

interface ProjectEditorOverlayProps {
  open: boolean
  editorBaseRecord: LegacyModuleRecord | null
  form: FormInstance<ProjectEditorValues>
  customerOptions: CustomerOption[]
  settlementCompanyOptions: Array<{
    id: string
    companyName: string
    label: string
  }>
  onClose: () => void
  onSaved: () => Promise<void>
}

export function ProjectEditorOverlay({
  open,
  editorBaseRecord,
  form,
  customerOptions,
  settlementCompanyOptions,
  onClose,
  onSaved,
}: ProjectEditorOverlayProps) {
  const { t } = useTranslation()
  const [saving, setSaving] = useState(false)

  const syncProjectForm = (changed: Record<string, unknown>) => {
    if (Object.hasOwn(changed, 'customerId')) {
      const nextCustomerId = asString(changed.customerId).trim()
      if (!nextCustomerId) {
        form.setFieldsValue({
          customerId: '',
          customerCode: '',
          settlementCompanyId: '',
          settlementCompanyName: '',
        })
      } else {
        const customer = customerOptions.find(
          (option) => option.id === nextCustomerId,
        )
        if (customer) {
          form.setFieldsValue({
            customerId: customer.id,
            customerCode: asString(customer.customerCode).trim(),
            settlementCompanyId: customer.defaultSettlementCompanyId ?? '',
            settlementCompanyName: asString(
              customer.defaultSettlementCompanyName,
            ),
          })
        }
      }
    }
    if (Object.hasOwn(changed, 'settlementCompanyId')) {
      form.setFieldsValue({
        settlementCompanyName: findSettlementCompanyName(
          changed.settlementCompanyId,
          asString(form.getFieldValue('settlementCompanyName')),
        ),
      })
    }
  }

  const handleEditorSave = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      const customer = values.customerId
        ? customerOptions.find((option) => option.id === values.customerId)
        : undefined
      const draft: LegacyModuleRecordInput = {
        ...(editorBaseRecord ?? {}),
        projectCode: values.projectCode ?? '',
        projectName: values.projectName,
        projectNameAbbr: values.projectNameAbbr ?? '',
        customerId: values.customerId,
        customerCode: customer ? asString(customer.customerCode).trim() : '',
        settlementCompanyId: values.settlementCompanyId,
        settlementCompanyName: findSettlementCompanyName(
          values.settlementCompanyId,
          asString(values.settlementCompanyName),
        ),
        projectManager: values.projectManager ?? '',
        projectAddress: values.projectAddress ?? '',
        status: values.status,
        remark: values.remark ?? '',
      }
      await saveBusinessModule(MODULE_KEY, draft)
      message.success(t('modules.saveResult.success'))
      onClose()
      await onSaved()
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : t('api.saveFailed'),
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <WorkspaceOverlay
      open={open}
      title={
        <Space size={8}>
          <span>
            {t('modules.editor.title', {
              mode: editorBaseRecord
                ? t('modules.editor.edit')
                : t('modules.editor.create'),
              title: t('modules.pages.project.title'),
            })}
          </span>
        </Space>
      }
      onClose={onClose}
    >
      <Form
        form={form}
        layout="vertical"
        disabled={saving}
        onValuesChange={(_, allValues) =>
          syncProjectForm(allValues as unknown as Record<string, unknown>)
        }
      >
        <Row gutter={[12, 12]}>
          <Col span={6}>
            <Form.Item
              name="projectCode"
              label={t('modules.pages.project.projectCode')}
              initialValue=""
            >
              <Input
                disabled
                placeholder={t(
                  'modules.editorWorkspace.autoGeneratedPlaceholder',
                )}
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="projectName"
              label={t('modules.pages.project.projectName')}
              rules={[
                {
                  required: true,
                  message: t('modules.formField.inputRequired', {
                    label: t('modules.pages.project.projectName'),
                  }),
                },
              ]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="projectNameAbbr"
              label={t('modules.pages.project.projectNameAbbr')}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="customerId"
              label={t('modules.pages.project.customer')}
              rules={[
                {
                  required: true,
                  message: t('modules.formField.selectRequired', {
                    label: t('modules.pages.project.customer'),
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
          <Col span={6}>
            <Form.Item
              name="settlementCompanyId"
              label={t('modules.pages.project.settlementCompany')}
              rules={[
                {
                  required: true,
                  message: t('modules.formField.selectRequired', {
                    label: t('modules.pages.project.settlementCompany'),
                  }),
                },
              ]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                options={settlementCompanyOptions.map((option) => ({
                  label: option.companyName || option.label,
                  value: option.id,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="projectManager"
              label={t('modules.pages.project.projectManager')}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="status"
              label={t('modules.columns.status')}
              initialValue="正常"
            >
              <Select options={enabledStatusOptions} />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item
              name="projectAddress"
              label={t('modules.pages.project.projectAddress')}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="remark" label={t('modules.columns.remark')}>
              <Input.TextArea rows={3} />
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
            onClick={() => void handleEditorSave()}
          >
            {t('common.save')}
          </Button>
        </Space>
      </div>
    </WorkspaceOverlay>
  )
}
