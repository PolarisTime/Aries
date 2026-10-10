import { useQuery } from '@tanstack/react-query'
import type { FormInstance } from 'antd'
import { Button, Col, Form, Input, Row, Select, Space } from 'antd'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { saveBusinessModule } from '@/api/business/business-crud'
import type { CustomerOption } from '@/api/master/customer-options'
import { fetchMaterialGrades } from '@/api/master/material-grades'
import { enabledStatusOptions } from '@/constants/module-options'
import { QUERY_KEYS } from '@/constants/query-keys'
import { STALE_MASTER_OPTIONS } from '@/constants/query-policies'
import { resolveQuoteRegions } from '@/constants/quote-regions'
import { STATUS } from '@/constants/status-constants'
import { useMaterialBrands } from '@/hooks/useMaterialBrands'
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
import { ProjectPriceRuleEditor } from './ProjectPriceRuleEditor'

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
  quoteSource?: string
  quoteRegion?: string
  /** 允许的品牌; 空数组表示不限制。 */
  allowedBrands?: string[]
  /** 允许的材质; 空数组表示不限制。 */
  allowedMaterials?: string[]
  remark?: string
}

/**
 * 下拉选项与已保存值的并集: 项目已配置的品牌/材质可能已从商品主数据中移除,
 * 直接按主数据选项渲染会让这些值在编辑态「消失」(保存后即被静默清空)。
 */
function mergeSelectedOptions(
  options: Array<{ label: string; value: string }>,
  selected: readonly string[] | undefined,
) {
  const known = new Set(options.map((option) => option.value))
  const missing = (selected ?? [])
    .map((value) => asString(value).trim())
    .filter((value) => value && !known.has(value))
    .map((value) => ({ label: value, value }))
  return missing.length ? [...options, ...missing] : options
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
  /** 取价地区选项: 来自后端 runtime-config 的 business.quoteRegions。 */
  quoteRegions?: string[]
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
  quoteRegions,
  settlementCompanyOptions,
  onClose,
  onSaved,
}: ProjectEditorOverlayProps) {
  const { t } = useTranslation()
  const [saving, setSaving] = useState(false)
  const quoteRegionOptions = useMemo(
    () =>
      resolveQuoteRegions(quoteRegions).map((region) => ({
        label: region,
        value: region,
      })),
    [quoteRegions],
  )
  // 允许品牌来自商品资料去重; 允许材质复用商品资料的「材质」选项, 与明细材质取值同源。
  const materialBrands = useMaterialBrands()
  const materialGradeQuery = useQuery({
    queryKey: QUERY_KEYS.masterOptions.materialGrades,
    queryFn: () => fetchMaterialGrades(),
    staleTime: STALE_MASTER_OPTIONS,
  })
  const selectedBrands = Form.useWatch('allowedBrands', form)
  const selectedMaterials = Form.useWatch('allowedMaterials', form)
  const brandOptions = useMemo(
    () =>
      mergeSelectedOptions(
        materialBrands.map((brand) => ({ label: brand, value: brand })),
        selectedBrands,
      ),
    [materialBrands, selectedBrands],
  )
  const materialOptions = useMemo(
    () =>
      mergeSelectedOptions(
        (materialGradeQuery.data ?? []).map((option) => ({
          label: option.label,
          value: String(option.value),
        })),
        selectedMaterials,
      ),
    [materialGradeQuery.data, selectedMaterials],
  )

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
    let values: ProjectEditorValues
    try {
      values = await form.validateFields()
    } catch {
      // 必填校验失败时 antd 已内联提示，直接返回，避免未处理的 Promise rejection。
      return
    }
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
        quoteSource: values.quoteSource ?? '',
        quoteRegion: values.quoteRegion ?? '',
        allowedBrands: values.allowedBrands ?? [],
        allowedMaterials: values.allowedMaterials ?? [],
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
                showSearch={{ optionFilterProp: 'label' }}
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
                showSearch={{ optionFilterProp: 'label' }}
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
              initialValue={STATUS.NORMAL}
            >
              <Select options={enabledStatusOptions} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="quoteSource"
              label={t('modules.pages.project.quoteSource')}
              initialValue="MYSTEEL"
            >
              <Select
                options={[
                  {
                    label: t('modules.pages.project.quoteSourceMysteel'),
                    value: 'MYSTEEL',
                  },
                  {
                    label: t('modules.pages.project.quoteSourceSteelx'),
                    value: 'STEELX',
                  },
                ]}
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="quoteRegion"
              label={t('modules.pages.project.quoteRegion')}
            >
              <Select allowClear showSearch options={quoteRegionOptions} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="allowedBrands"
              label={t('modules.pages.project.allowedBrands')}
              extra={t('modules.pages.project.allowedSpecHint')}
            >
              <Select
                allowClear
                maxTagCount="responsive"
                mode="multiple"
                options={brandOptions}
                placeholder={t('modules.pages.project.allowedSpecPlaceholder')}
                showSearch={{ optionFilterProp: 'label' }}
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="allowedMaterials"
              label={t('modules.pages.project.allowedMaterials')}
              extra={t('modules.pages.project.allowedSpecHint')}
            >
              <Select
                allowClear
                maxTagCount="responsive"
                mode="multiple"
                options={materialOptions}
                placeholder={t('modules.pages.project.allowedSpecPlaceholder')}
                showSearch={{ optionFilterProp: 'label' }}
              />
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
          {editorBaseRecord?.id ? (
            <Col span={24}>
              <ProjectPriceRuleEditor
                projectId={asString(editorBaseRecord.id)}
              />
            </Col>
          ) : null}
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
