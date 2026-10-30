import i18next from 'i18next'
import {
  DEFAULT_PRICE_CLOSED_SETTLE_DAYS,
  DEFAULT_PRICE_CLOSED_SETTLE_DIRECTION,
  DEFAULT_PRICE_DATE_BASIS,
  DEFAULT_PRICE_PERIOD_POLICY,
  DEFAULT_SCOPE_ENFORCEMENT,
  MAX_PRICE_CLOSED_SETTLE_DAYS,
  MAX_PRICE_DATE_OFFSET_DAYS,
  normalizePriceDateBasis,
  normalizePricePeriodPolicy,
  PRICE_PERIOD_OPTIONS,
} from '@/api/master/project-options'
import { enabledStatusOptions } from '@/constants/module-options'
import { STATUS } from '@/constants/status-constants'
import {
  getBrandOptions,
  getCustomerOptions,
  getQuoteRegionOptions,
  getSettlementCompanyOptions,
  materialGradeOptions,
} from '@/module-system/core/module-option-resolvers'
import type {
  ModuleFormFieldOption,
  ModulePageConfig,
} from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'
import {
  PRICE_BASIS_LABEL_KEYS,
  PRICE_BASIS_OPTIONS,
  PRICE_CLOSED_SETTLE_DIRECTION_LABEL_KEYS,
  PRICE_CLOSED_SETTLE_DIRECTION_OPTIONS,
  PRICE_PERIOD_LABEL_KEYS,
  PRICE_PERIOD_POLICY_LABEL_KEYS,
  PRICE_PERIOD_POLICY_OPTIONS,
} from '@/views/modules/components/pricing-quote-labels'
import { actionSet, buildMasterOverview, statusMap } from '../shared/shared'
import { masterStatusFilter } from '../shared/shared-filters'
import {
  projectCustomerFieldOptions,
  resolveProjectCustomerDisplay,
} from './project-page-utils'

/*
 * 取价/范围字段的选项与默认值全部取自共享口径，不在本文件另写一份枚举或文案映射：
 * - 枚举与默认档：`@/api/master/project-options`（与后端 DELIVERY/ORDER/MANUAL、
 *   PREV/NEXT、AUTO/FIXED/MANUAL、0..30 的校验区间一一对应）；
 * - 文案 key：`@/views/modules/components/pricing-quote-labels`（专用弹层与比价页同款，
 *   该模块注释明确写了「避免两处措辞漂移」）。
 * 本文件只负责把两者拼成 `ModuleFormFieldOption[]`。
 */
const QUOTE_SOURCE_OPTIONS: ModuleFormFieldOption[] = [
  {
    label: i18next.t('modules.pages.project.quoteSourceMysteel'),
    value: 'MYSTEEL',
  },
  {
    label: i18next.t('modules.pages.project.quoteSourceSteelx'),
    value: 'STEELX',
  },
]

/** 允许范围的「处理方式」：顺序与专用弹层一致（默认档 WARN 在前）。 */
const SCOPE_ENFORCEMENT_OPTIONS: ModuleFormFieldOption[] = [
  {
    label: i18next.t('modules.pages.project.scopeEnforcementWarn'),
    value: DEFAULT_SCOPE_ENFORCEMENT,
  },
  {
    label: i18next.t('modules.pages.project.scopeEnforcementBlock'),
    value: 'BLOCK',
  },
  {
    label: i18next.t('modules.pages.project.scopeEnforcementOff'),
    value: 'OFF',
  },
]

const PRICE_BASIS_FIELD_OPTIONS: ModuleFormFieldOption[] =
  PRICE_BASIS_OPTIONS.map((value) => ({
    label: i18next.t(PRICE_BASIS_LABEL_KEYS[value]),
    value,
  }))

const CLOSED_SETTLE_DIRECTION_FIELD_OPTIONS: ModuleFormFieldOption[] =
  PRICE_CLOSED_SETTLE_DIRECTION_OPTIONS.map((value) => ({
    label: i18next.t(PRICE_CLOSED_SETTLE_DIRECTION_LABEL_KEYS[value]),
    value,
  }))

const PERIOD_POLICY_FIELD_OPTIONS: ModuleFormFieldOption[] =
  PRICE_PERIOD_POLICY_OPTIONS.map((value) => ({
    label: i18next.t(PRICE_PERIOD_POLICY_LABEL_KEYS[value]),
    value,
  }))

/** 固定取价时段的取值本身是落库枚举（上午/中午/下午），只有 label 需要翻译。 */
const PERIOD_FIELD_OPTIONS: ModuleFormFieldOption[] = PRICE_PERIOD_OPTIONS.map(
  (value) => ({ label: i18next.t(PRICE_PERIOD_LABEL_KEYS[value]), value }),
)

const PRICING_SECTION = i18next.t('modules.pages.project.sectionPricing')
const SCOPE_SECTION = i18next.t('modules.pages.project.sectionScope')

/**
 * 允许品牌 / 允许材质的展示口径 —— 列表列与详情页**共用这一个出口**。
 *
 * <p>两者都是 `string[]`：不声明 render 时 antd Table 与详情渲染都会把数组显示成 `-`
 * （详情只复用「同 dataIndex 列的 render」，见 `ModuleRecordDetailFieldValue`），
 * 所以列上的 render 是唯一来源，detailFields 里不要再写第二份格式化。空值统一 `-`。</p>
 */
function formatProjectAllowedSpec(value: unknown): string {
  const values = Array.isArray(value)
    ? value.flatMap((item) => {
        const text = asString(item).trim()
        return text ? [text] : []
      })
    : []
  return values.length ? values.join('、') : '-'
}

const projectPageConfig: ModulePageConfig = {
  key: 'project',
  title: i18next.t('modules.pages.project.title'),
  kicker: 'Master Data',
  description: i18next.t('modules.pages.project.description'),
  primaryNoKey: 'projectCode',
  showGeneratedPrimaryNoOnCreate: true,
  actions: actionSet,
  filters: [
    {
      key: 'keyword',
      label: i18next.t('modules.filter.keyword'),
      type: 'input',
      placeholder: i18next.t('modules.pages.project.placeholderKeyword'),
    },
    {
      key: 'customerId',
      label: i18next.t('modules.pages.project.customer'),
      type: 'select',
      options: getCustomerOptions,
    },
    { ...masterStatusFilter },
  ],
  columns: [
    {
      title: i18next.t('modules.pages.project.projectCode'),
      dataIndex: 'projectCode',
      width: 140,
    },
    {
      title: i18next.t('modules.pages.project.projectName'),
      dataIndex: 'projectName',
      width: 200,
    },
    {
      title: i18next.t('modules.pages.project.projectNameAbbr'),
      dataIndex: 'projectNameAbbr',
      width: 140,
    },
    {
      title: i18next.t('modules.pages.project.customer'),
      dataIndex: 'customerCode',
      width: 180,
      render: (_value, record) =>
        resolveProjectCustomerDisplay(record, getCustomerOptions()),
    },
    {
      title: i18next.t('modules.pages.project.settlementCompany'),
      dataIndex: 'settlementCompanyName',
      width: 180,
    },
    {
      title: i18next.t('modules.pages.project.projectManager'),
      dataIndex: 'projectManager',
      width: 140,
    },
    {
      title: i18next.t('modules.pages.project.projectAddress'),
      dataIndex: 'projectAddress',
      width: 220,
    },
    {
      // 这两个列的主要职责是给详情页提供展示口径（详情复用同 dataIndex 列的 render），
      // 因此列宽给足但默认隐藏：数组型配置放进主表会把表格挤到横向滚动。
      title: i18next.t('modules.pages.project.allowedBrands'),
      dataIndex: 'allowedBrands',
      width: 200,
      render: formatProjectAllowedSpec,
    },
    {
      title: i18next.t('modules.pages.project.allowedMaterials'),
      dataIndex: 'allowedMaterials',
      width: 200,
      render: formatProjectAllowedSpec,
    },
    {
      title: i18next.t('modules.columns.status'),
      dataIndex: 'status',
      width: 100,
      type: 'status',
      align: 'center',
    },
    {
      title: i18next.t('modules.columns.remark'),
      dataIndex: 'remark',
      width: 180,
    },
  ],
  defaultHiddenColumnKeys: [
    'projectNameAbbr',
    'projectAddress',
    'allowedBrands',
    'allowedMaterials',
    'remark',
  ],
  detailFields: [
    {
      label: i18next.t('modules.pages.project.projectCode'),
      key: 'projectCode',
    },
    {
      label: i18next.t('modules.pages.project.projectName'),
      key: 'projectName',
    },
    {
      label: i18next.t('modules.pages.project.projectNameAbbr'),
      key: 'projectNameAbbr',
    },
    {
      label: i18next.t('modules.pages.project.customer'),
      key: 'customerCode',
    },
    {
      label: i18next.t('modules.pages.project.settlementCompany'),
      key: 'settlementCompanyName',
    },
    {
      label: i18next.t('modules.pages.project.projectManager'),
      key: 'projectManager',
    },
    {
      label: i18next.t('modules.pages.project.projectAddress'),
      key: 'projectAddress',
    },
    {
      // 展示口径由 columns 里同 dataIndex 的 render 提供（列表/详情共用），此处不再写格式化。
      label: i18next.t('modules.pages.project.allowedBrands'),
      key: 'allowedBrands',
    },
    {
      label: i18next.t('modules.pages.project.allowedMaterials'),
      key: 'allowedMaterials',
    },
    {
      label: i18next.t('modules.columns.status'),
      key: 'status',
      type: 'status',
    },
    { label: i18next.t('modules.columns.remark'), key: 'remark' },
  ],
  detailColumnCount: 4,
  /*
   * 字段长度上限以 **DB 列宽**为权威依据（md_project）：后端 `ProjectRequest` 目前对这批文案字段
   * 没有 @Size（已由后端并行补），在补齐前前端不能等它 —— 否则超长内容会直接打到 varchar 上限报错。
   * project_code 64 / project_name 200 / project_name_abbr 100 / project_manager 32 /
   * project_address 255 / remark 255。客户、结算主体、状态、取价策略等都是受控取值，不声明 maxLength。
   */
  formFields: [
    {
      key: 'projectCode',
      label: i18next.t('modules.pages.project.projectCode'),
      type: 'input',
      maxLength: 64,
      required: true,
      disabled: true,
      placeholder: i18next.t(
        'modules.editorWorkspace.autoGeneratedPlaceholder',
      ),
      row: 1,
    },
    {
      key: 'projectName',
      label: i18next.t('modules.pages.project.projectName'),
      type: 'input',
      maxLength: 200,
      required: true,
      row: 1,
    },
    {
      key: 'projectNameAbbr',
      label: i18next.t('modules.pages.project.projectNameAbbr'),
      type: 'input',
      maxLength: 100,
      row: 1,
    },
    {
      key: 'customerId',
      label: i18next.t('modules.pages.project.customer'),
      type: 'select',
      required: true,
      options: projectCustomerFieldOptions,
      masterOptionRequirements: { customers: true },
      row: 1,
    },
    {
      key: 'settlementCompanyId',
      label: i18next.t('modules.pages.project.settlementCompany'),
      type: 'select',
      required: true,
      options: getSettlementCompanyOptions,
      masterOptionRequirements: { settlementCompanies: true },
      row: 2,
    },
    {
      key: 'projectManager',
      label: i18next.t('modules.pages.project.projectManager'),
      type: 'input',
      maxLength: 32,
      row: 2,
    },
    {
      key: 'projectAddress',
      label: i18next.t('modules.pages.project.projectAddress'),
      type: 'input',
      maxLength: 255,
      row: 3,
      fullRow: true,
    },
    {
      key: 'status',
      label: i18next.t('modules.columns.status'),
      type: 'select',
      defaultValue: STATUS.NORMAL,
      options: enabledStatusOptions,
      row: 2,
    },
    {
      key: 'remark',
      label: i18next.t('modules.columns.remark'),
      type: 'textarea',
      maxLength: 255,
      row: 4,
      fullRow: true,
    },
    /*
     * ── 取价规则（与专用弹层 ProjectPricingBasisFields 同口径）──────────────────
     * 默认档全部引用共享常量而不是写 'DELIVERY' 这类字面量：前端默认档与后端
     * `DEFAULT_PRICE_*` 必须同源，否则新建时两侧口径会静默漂移。
     * 置灰一律用 `disabledWhen`（保留已填值，切回原档不用重填），不用 visibleWhen（会卸载字段）。
     */
    {
      key: 'quoteSource',
      label: i18next.t('modules.pages.project.quoteSource'),
      type: 'select',
      defaultValue: 'MYSTEEL',
      options: QUOTE_SOURCE_OPTIONS,
      row: 5,
      section: PRICING_SECTION,
    },
    {
      key: 'quoteRegion',
      label: i18next.t('modules.pages.project.quoteRegion'),
      type: 'select',
      // 选项来自 runtime-config 的 business.quoteRegions（resolveQuoteRegions 负责 trim/去重/兜底）；
      // 不选表示不限制地区。select 控件本身已内置拼音 showSearch，无需额外声明。
      options: getQuoteRegionOptions,
      allowClear: true,
      row: 5,
      section: PRICING_SECTION,
    },
    {
      key: 'priceDateBasis',
      label: i18next.t('modules.pages.project.priceDateBasis'),
      type: 'select',
      defaultValue: DEFAULT_PRICE_DATE_BASIS,
      options: PRICE_BASIS_FIELD_OPTIONS,
      tooltip: i18next.t('modules.pages.project.priceDateBasisHint'),
      extra: i18next.t('modules.pages.project.priceDateBasisHint'),
      row: 5,
      section: PRICING_SECTION,
    },
    {
      key: 'priceDateOffsetDays',
      label: i18next.t('modules.pages.project.priceDateOffsetDays'),
      type: 'number',
      defaultValue: 0,
      min: 0,
      max: MAX_PRICE_DATE_OFFSET_DAYS,
      precision: 0,
      step: 1,
      // 只有「报单日期 + N 个交易日」基准才生效；其余档位置灰但保留值。
      disabledWhen: (form) =>
        normalizePriceDateBasis(form?.priceDateBasis) !== 'ORDER',
      tooltip: i18next.t('modules.pages.project.priceDateOffsetDaysHint'),
      extra: i18next.t('modules.pages.project.priceDateOffsetDaysHint'),
      row: 5,
      section: PRICING_SECTION,
    },
    {
      key: 'priceClosedSettleDirection',
      label: i18next.t('modules.pages.project.priceClosedSettleDirection'),
      type: 'select',
      defaultValue: DEFAULT_PRICE_CLOSED_SETTLE_DIRECTION,
      options: CLOSED_SETTLE_DIRECTION_FIELD_OPTIONS,
      // MANUAL 每次手工选日期，休市口径不参与；DELIVERY/ORDER 两档都生效，因此只按 MANUAL 置灰。
      disabledWhen: (form) =>
        normalizePriceDateBasis(form?.priceDateBasis) === 'MANUAL',
      tooltip: i18next.t(
        'modules.pages.project.priceClosedSettleDirectionHint',
      ),
      extra: i18next.t('modules.pages.project.priceClosedSettleDirectionHint'),
      row: 6,
      section: PRICING_SECTION,
    },
    {
      key: 'priceClosedSettleDays',
      label: i18next.t('modules.pages.project.priceClosedSettleDays'),
      type: 'number',
      defaultValue: DEFAULT_PRICE_CLOSED_SETTLE_DAYS,
      min: 0,
      max: MAX_PRICE_CLOSED_SETTLE_DAYS,
      precision: 0,
      step: 1,
      disabledWhen: (form) =>
        normalizePriceDateBasis(form?.priceDateBasis) === 'MANUAL',
      tooltip: i18next.t('modules.pages.project.priceClosedSettleDaysHint'),
      extra: i18next.t('modules.pages.project.priceClosedSettleDaysHint'),
      row: 6,
      section: PRICING_SECTION,
    },
    {
      key: 'pricePeriodPolicy',
      label: i18next.t('modules.pages.project.pricePeriodPolicy'),
      type: 'select',
      defaultValue: DEFAULT_PRICE_PERIOD_POLICY,
      options: PERIOD_POLICY_FIELD_OPTIONS,
      tooltip: i18next.t('modules.pages.project.pricePeriodPolicyHint'),
      extra: i18next.t('modules.pages.project.pricePeriodPolicyHint'),
      row: 6,
      section: PRICING_SECTION,
    },
    {
      key: 'pricePeriodFixed',
      label: i18next.t('modules.pages.project.pricePeriodFixed'),
      type: 'select',
      allowClear: true,
      options: PERIOD_FIELD_OPTIONS,
      // 只有「固定时段」策略可选具体时段；其余档位置灰但保留值。
      disabledWhen: (form) =>
        normalizePricePeriodPolicy(form?.pricePeriodPolicy) !== 'FIXED',
      // 「固定时段」必须选具体时段。策略与时段可能在同一批变更里更新，因此校验时
      // 现读 form 快照而不是用声明期闭包，避免拿到旧策略而误放行/误拦截。
      validate: (value, form) =>
        normalizePricePeriodPolicy(form?.pricePeriodPolicy) === 'FIXED' &&
        !asString(value).trim()
          ? i18next.t('modules.pages.project.pricePeriodFixedRequired')
          : null,
      tooltip: i18next.t('modules.pages.project.pricePeriodFixedHint'),
      extra: i18next.t('modules.pages.project.pricePeriodFixedHint'),
      row: 6,
      section: PRICING_SECTION,
    },

    /*
     * ── 允许范围（与专用弹层 ProjectAllowedSpecFields 同口径）──────────────────
     * 品牌/材质选项都读主数据缓存：getBrandOptions / materialGradeOptions 自带打包安全标记，
     * 编辑器按需求预取，本文件不取数。两者都是 string[]，保存载荷与后端 List<String> 一致。
     */
    {
      key: 'allowedBrands',
      label: i18next.t('modules.pages.project.allowedBrands'),
      type: 'multiSelect',
      options: getBrandOptions,
      placeholder: i18next.t('modules.pages.project.allowedSpecPlaceholder'),
      tooltip: i18next.t('modules.pages.project.allowedSpecHint'),
      extra: i18next.t('modules.pages.project.allowedSpecHint'),
      colSpan: 12,
      row: 7,
      section: SCOPE_SECTION,
    },
    {
      key: 'allowedBrandSeverity',
      label: i18next.t('modules.pages.project.scopeEnforcement'),
      type: 'select',
      defaultValue: DEFAULT_SCOPE_ENFORCEMENT,
      options: SCOPE_ENFORCEMENT_OPTIONS,
      tooltip: i18next.t('modules.pages.project.scopeEnforcementHint'),
      extra: i18next.t('modules.pages.project.scopeEnforcementHint'),
      row: 7,
      section: SCOPE_SECTION,
    },
    {
      key: 'allowedMaterials',
      label: i18next.t('modules.pages.project.allowedMaterials'),
      type: 'multiSelect',
      options: materialGradeOptions,
      placeholder: i18next.t('modules.pages.project.allowedSpecPlaceholder'),
      tooltip: i18next.t('modules.pages.project.allowedSpecHint'),
      extra: i18next.t('modules.pages.project.allowedSpecHint'),
      colSpan: 12,
      row: 8,
      section: SCOPE_SECTION,
    },
    {
      key: 'allowedMaterialSeverity',
      label: i18next.t('modules.pages.project.scopeEnforcement'),
      type: 'select',
      defaultValue: DEFAULT_SCOPE_ENFORCEMENT,
      options: SCOPE_ENFORCEMENT_OPTIONS,
      tooltip: i18next.t('modules.pages.project.scopeEnforcementHint'),
      extra: i18next.t('modules.pages.project.scopeEnforcementHint'),
      row: 8,
      section: SCOPE_SECTION,
    },
  ],
  data: [],
  buildOverview: buildMasterOverview,
  statusMap,
  rowHighlightStatuses: [STATUS.DISABLED],
  saveFields: {
    scalar: [
      'projectCode',
      'projectName',
      'projectNameAbbr',
      'projectAddress',
      'projectManager',
      'customerId',
      'customerCode',
      'settlementCompanyId',
      'settlementCompanyName',
      'status',
      'priceFloatMode',
      'priceFloatValue',
      'quoteSource',
      'quoteRegion',
      'allowedBrands',
      'allowedMaterials',
      'allowedBrandSeverity',
      'allowedMaterialSeverity',
      'priceDateBasis',
      'priceDateOffsetDays',
      'priceClosedSettleDirection',
      'priceClosedSettleDays',
      'pricePeriodPolicy',
      'pricePeriodFixed',
      'remark',
    ],
  },
}

export const masterProjectPageConfigs: Record<string, ModulePageConfig> = {
  [projectPageConfig.key]: projectPageConfig,
}
