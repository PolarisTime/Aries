import type { FormInstance } from 'antd'
import { Button, Col, Form, Input, Row, Select, Space } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { saveBusinessModule } from '@/api/business/business-crud'
import { normalizeCarrierDraftRecord } from '@/config/business-pages/master/carrier-vehicle-adapter'
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

const MODULE_KEY: ModuleKey = 'carrier'

export interface CarrierEditorValues {
  carrierCode?: string
  carrierName: string
  contactName?: string
  contactPhone?: string
  vehiclePlate?: string
  vehicleContact?: string
  vehiclePhone?: string
  vehicleRemark?: string
  vehiclePlate2?: string
  vehicleContact2?: string
  vehiclePhone2?: string
  vehicleRemark2?: string
  vehiclePlate3?: string
  vehicleContact3?: string
  vehiclePhone3?: string
  vehicleRemark3?: string
  defaultSettlementCompanyId: EntityId
  defaultSettlementCompanyName?: string
  status: string
  remark?: string
}

const VEHICLE_SLOT_FIELDS = [
  ['vehiclePlate', 'vehicleContact', 'vehiclePhone', 'vehicleRemark'],
  ['vehiclePlate2', 'vehicleContact2', 'vehiclePhone2', 'vehicleRemark2'],
  ['vehiclePlate3', 'vehicleContact3', 'vehiclePhone3', 'vehicleRemark3'],
] as const

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

interface CarrierEditorOverlayProps {
  open: boolean
  editorBaseRecord: LegacyModuleRecord | null
  form: FormInstance<CarrierEditorValues>
  settlementCompanyOptions: Array<{
    id: string
    companyName: string
    label: string
  }>
  onClose: () => void
  onSaved: () => Promise<void>
}

export function CarrierEditorOverlay({
  open,
  editorBaseRecord,
  form,
  settlementCompanyOptions,
  onClose,
  onSaved,
}: CarrierEditorOverlayProps) {
  const { t } = useTranslation()
  const [saving, setSaving] = useState(false)

  const syncCarrierForm = (changed: Record<string, unknown>) => {
    if (Object.hasOwn(changed, 'defaultSettlementCompanyId')) {
      form.setFieldsValue({
        defaultSettlementCompanyName: findSettlementCompanyName(
          changed.defaultSettlementCompanyId,
        ),
      })
    }
  }

  const handleEditorSave = async () => {
    let values: CarrierEditorValues
    try {
      values = await form.validateFields()
    } catch {
      // 必填校验失败时 antd 已内联提示，直接返回，避免未处理的 Promise rejection。
      return
    }
    setSaving(true)
    try {
      const draft: LegacyModuleRecordInput = {
        // 新建时沿用原页面 defaultDraftValues：计价模式默认按吨
        priceMode: '按吨',
        ...(editorBaseRecord ?? {}),
        ...values,
        carrierCode: values.carrierCode ?? '',
        contactName: values.contactName ?? '',
        contactPhone: values.contactPhone ?? '',
        defaultSettlementCompanyId: values.defaultSettlementCompanyId,
        defaultSettlementCompanyName: findSettlementCompanyName(
          values.defaultSettlementCompanyId,
        ),
        status: values.status,
        remark: values.remark ?? '',
      }
      normalizeCarrierDraftRecord(draft)
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
              title: t('modules.pages.carrier.title'),
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
          syncCarrierForm(allValues as unknown as Record<string, unknown>)
        }
      >
        <Row gutter={[12, 12]}>
          <Col span={6}>
            <Form.Item
              name="carrierCode"
              label={t('modules.pages.carrier.colCarrierCode')}
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
              name="carrierName"
              label={t('modules.pages.carrier.colCarrierName')}
              rules={[
                {
                  required: true,
                  message: t('modules.formField.inputRequired', {
                    label: t('modules.pages.carrier.colCarrierName'),
                  }),
                },
              ]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="contactName"
              label={t('modules.pages.carrier.colContactName')}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="contactPhone"
              label={t('modules.pages.carrier.colContactPhone')}
            >
              <Input />
            </Form.Item>
          </Col>
          {VEHICLE_SLOT_FIELDS.map((slot, slotIndex) => {
            const slotLabels = [
              slotIndex === 0
                ? t('modules.pages.carrier.formVehiclePlate')
                : t(`modules.pages.carrier.formVehiclePlate${slotIndex + 1}`),
              slotIndex === 0
                ? t('modules.pages.carrier.formVehicleContact')
                : t(`modules.pages.carrier.formVehicleContact${slotIndex + 1}`),
              slotIndex === 0
                ? t('modules.pages.carrier.formVehiclePhone')
                : t(`modules.pages.carrier.formVehiclePhone${slotIndex + 1}`),
              slotIndex === 0
                ? t('modules.pages.carrier.formVehicleRemark')
                : t(`modules.pages.carrier.formVehicleRemark${slotIndex + 1}`),
            ]
            return slot.map((fieldKey, fieldIndex) => (
              <Col span={6} key={fieldKey}>
                <Form.Item name={fieldKey} label={slotLabels[fieldIndex]}>
                  <Input />
                </Form.Item>
              </Col>
            ))
          })}
          <Col span={6}>
            <Form.Item
              name="defaultSettlementCompanyId"
              label={t('modules.pages.carrier.colDefaultSettlementCompany')}
              rules={[
                {
                  required: true,
                  message: t('modules.formField.selectRequired', {
                    label: t(
                      'modules.pages.carrier.colDefaultSettlementCompany',
                    ),
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
              name="status"
              label={t('modules.columns.status')}
              initialValue="正常"
            >
              <Select options={enabledStatusOptions} />
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
