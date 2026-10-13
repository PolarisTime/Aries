import type { FormInstance } from 'antd'
import { Button, Col, Divider, Form, Input, Row, Select, Space } from 'antd'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { saveBusinessModule } from '@/api/business/business-crud'
import type { CustomerOption } from '@/api/master/customer-options'
import type {
  ProjectPriceDateBasis,
  ProjectPricePeriod,
  ProjectPricePeriodPolicy,
  ProjectScopeEnforcement,
} from '@/api/master/project-options'
import {
  normalizePriceClosedDayPrevSettle,
  normalizePriceDateBasis,
  normalizePriceDateOffsetDays,
  normalizePricePeriodFixed,
  normalizePricePeriodPolicy,
} from '@/api/master/project-options'
import { enabledStatusOptions } from '@/constants/module-options'
import { resolveQuoteRegions } from '@/constants/quote-regions'
import { STATUS } from '@/constants/status-constants'
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
import { ProjectAllowedSpecFields } from './ProjectAllowedSpecFields'
import { ProjectPriceRuleEditor } from './ProjectPriceRuleEditor'
import { ProjectPricingBasisFields } from './ProjectPricingBasisFields'

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
  /** 允许品牌不匹配时的处理方式: OFF不校验/WARN提醒/BLOCK阻断。 */
  allowedBrandSeverity?: ProjectScopeEnforcement | null
  /** 允许材质不匹配时的处理方式: OFF不校验/WARN提醒/BLOCK阻断。 */
  allowedMaterialSeverity?: ProjectScopeEnforcement | null
  /** 取价基准日期: DELIVERY送货日期/ORDER报单日期+N个交易日/MANUAL每次手工选择。 */
  priceDateBasis: ProjectPriceDateBasis
  /** 报单日期基准顺延的交易日数(0-30); 仅基准为 ORDER 时有意义。 */
  priceDateOffsetDays: number
  /** 报单日为休市时是否按前一个交易日结算; 仅基准为 ORDER 时有意义。 */
  priceClosedDayPrevSettle: boolean
  /** 取价时段策略: AUTO自动取当日最新时段/FIXED固定时段/MANUAL每次手工选择。 */
  pricePeriodPolicy: ProjectPricePeriodPolicy
  /** 固定取价时段(上午/中午/下午); 仅策略为 FIXED 时必填, 其余固定传 null。 */
  pricePeriodFixed: ProjectPricePeriod | null
  remark?: string
}

/**
 * 编辑弹层里的一个字段区块。
 *
 * <p>分组依据是 antd 的「亲密性」原则(docs/spec/proximity): 关联性高的字段距离更近、
 * 构成一个视觉单元; 区块之间用分割线 + 24px 拉开层次。区块内横向 16px(中号间距)、
 * 纵向 8px(小号间距), 全部取自 8 的倍数规格(docs/spec/layout 的网格基数)。</p>
 *
 * <p>列宽只用 24 栅格的**整数倍**: 普通字段 6 列(四等分)、需要整行的 24 列。此前按预期输入
 * 给 5/7/8/4 这类宽度, 各行的竖边对不齐, 扫读时显得零碎; 统一到网格后列边界一致, 宽度差异
 * 只保留在「一件占一行」的字段上。</p>
 */
function ProjectSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="project-editor-section">
      <Divider className="project-section-divider" plain titlePlacement="start">
        {title}
      </Divider>
      <Row gutter={[16, 8]}>{children}</Row>
    </section>
  )
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

/**
 * 由表单值组装保存载荷。
 *
 * <p>抽成纯函数而不是留在组件里: 保存流程因此只剩「校验 → 保存 → 收尾」三步,
 * 载荷字段的增删也不再需要一个 300 行的组件来承载。</p>
 */
function buildProjectDraft(args: {
  values: ProjectEditorValues
  editorBaseRecord: LegacyModuleRecord | null
  customerOptions: CustomerOption[]
}): LegacyModuleRecordInput {
  const { values, editorBaseRecord, customerOptions } = args
  const customer = values.customerId
    ? customerOptions.find((option) => option.id === values.customerId)
    : undefined
  // 取价基准/时段先归一化再装配: 条件字段必须与主字段口径一致, 否则「非 ORDER 却带偏移」这类
  // 历史脏值会被原样下发。保存载荷里这 5 个字段始终存在(非 FIXED 时 pricePeriodFixed 传 null)。
  const priceDateBasis = normalizePriceDateBasis(values.priceDateBasis)
  const pricePeriodPolicy = normalizePricePeriodPolicy(values.pricePeriodPolicy)
  return {
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
    allowedBrandSeverity: values.allowedBrandSeverity ?? null,
    allowedMaterialSeverity: values.allowedMaterialSeverity ?? null,
    priceDateBasis,
    priceDateOffsetDays:
      priceDateBasis === 'ORDER'
        ? normalizePriceDateOffsetDays(values.priceDateOffsetDays)
        : 0,
    priceClosedDayPrevSettle:
      priceDateBasis === 'ORDER' &&
      normalizePriceClosedDayPrevSettle(values.priceClosedDayPrevSettle),
    pricePeriodPolicy,
    pricePeriodFixed:
      pricePeriodPolicy === 'FIXED'
        ? normalizePricePeriodFixed(values.pricePeriodFixed)
        : null,
    remark: values.remark ?? '',
  }
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
    if (Object.hasOwn(changed, 'priceDateBasis')) {
      // 基准不是「报单日期」时, 顺延交易日数与休市口径都无意义: 立刻复位,
      // 免得禁用控件上残留 5/true 这类值, 让人以为还在生效。
      if (normalizePriceDateBasis(changed.priceDateBasis) !== 'ORDER') {
        form.setFieldsValue({
          priceDateOffsetDays: 0,
          priceClosedDayPrevSettle: false,
        })
      }
    }
    if (Object.hasOwn(changed, 'pricePeriodPolicy')) {
      // 同理: 策略不是「固定时段」时清掉具体时段, 保存载荷按 null 下发。
      if (normalizePricePeriodPolicy(changed.pricePeriodPolicy) !== 'FIXED') {
        form.setFieldsValue({ pricePeriodFixed: null })
      }
    }
  }

  const handleEditorSave = async () => {
    // 必填校验失败时 antd 已内联提示：吞掉 rejection 后直接返回。
    // 刻意不用 try/finally —— React Compiler 目前不支持带 finally 的 TryStatement，
    // 命中后整个组件会失去自动记忆化（react-hooks-js/todo）。改为两条路径各自收尾。
    const values = await form.validateFields().catch(() => null)
    if (!values) {
      return
    }
    setSaving(true)
    try {
      await saveBusinessModule(
        MODULE_KEY,
        buildProjectDraft({ values, editorBaseRecord, customerOptions }),
      )
      message.success(t('modules.saveResult.success'))
      onClose()
      await onSaved()
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : t('api.saveFailed'),
      )
    }
    setSaving(false)
  }

  return (
    /*
      尺寸与紧凑排版都在 CSS 里(workspace-overlay.css): 全屏铺开时 4 列字段各占约 370px
      并留下大片空白, 收成居中对话框后单列约 245px; 按钮走 footer 槽固定在面板底部,
      否则 20 个字段加价格规定滚动时会把它滚出屏幕(实测按钮落在 y=978, 面板底边 880)。
    */
    <WorkspaceOverlay
      open={open}
      className="workspace-overlay-panel--project-editor"
      footer={
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
      }
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
        className="project-editor-form"
        disabled={saving}
        onValuesChange={(_, allValues) =>
          syncProjectForm(allValues as unknown as Record<string, unknown>)
        }
      >
        <ProjectSection title={t('modules.pages.project.sectionBasic')}>
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
                  message: t('modules.pages.project.projectNameRequired'),
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
                  message: t('modules.pages.project.customerRequired'),
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
                  message: t('modules.pages.project.settlementCompanyRequired'),
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
              name="projectAddress"
              label={t('modules.pages.project.projectAddress')}
            >
              <Input />
            </Form.Item>
          </Col>
        </ProjectSection>

        <ProjectSection title={t('modules.pages.project.sectionPricing')}>
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
          <ProjectPricingBasisFields form={form} />
          {editorBaseRecord?.id ? (
            <Col span={24}>
              <ProjectPriceRuleEditor
                projectId={asString(editorBaseRecord.id)}
              />
            </Col>
          ) : null}
        </ProjectSection>

        <ProjectSection title={t('modules.pages.project.sectionScope')}>
          <ProjectAllowedSpecFields form={form} />
        </ProjectSection>

        <ProjectSection title={t('modules.pages.project.sectionOther')}>
          <Col span={24}>
            <Form.Item name="remark" label={t('modules.columns.remark')}>
              <Input.TextArea rows={2} />
            </Form.Item>
          </Col>
        </ProjectSection>
      </Form>
    </WorkspaceOverlay>
  )
}
