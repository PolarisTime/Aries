import type { FormInstance } from 'antd'
import { useState } from 'react'
import { fetchGeneratedMasterDataCode } from '@/api/master/master-data-codes'
import { STATUS } from '@/constants/status-constants'
import type { ModuleKey } from '@/module-system/core/module-key'
import type { LegacyModuleRecord } from '@/types/module-record'
import { asString } from '@/utils/type-narrowing'
import type { ProjectEditorValues } from './ProjectEditorOverlay'
import {
  toAllowedSpecSeverity,
  toAllowedSpecValues,
  toPriceClosedDayPrevSettle,
  toPriceDateBasis,
  toPriceDateOffsetDays,
  toPricePeriodFixed,
  toPricePeriodPolicy,
} from './project-page-columns'

const MODULE_KEY: ModuleKey = 'project'

type ProjectListRow = LegacyModuleRecord

/** 由列表行构建编辑表单初值。 */
function toEditorFormValues(record: ProjectListRow) {
  const allowedBrands = toAllowedSpecValues(record.allowedBrands)
  const allowedMaterials = toAllowedSpecValues(record.allowedMaterials)
  const priceDateBasis = toPriceDateBasis(record.priceDateBasis)
  const pricePeriodPolicy = toPricePeriodPolicy(record.pricePeriodPolicy)
  return {
    projectCode: asString(record.projectCode),
    projectName: asString(record.projectName),
    projectNameAbbr: asString(record.projectNameAbbr),
    customerId: asString(record.customerId),
    customerCode: asString(record.customerCode),
    settlementCompanyId: asString(record.settlementCompanyId),
    settlementCompanyName: asString(record.settlementCompanyName),
    projectManager: asString(record.projectManager),
    projectAddress: asString(record.projectAddress),
    status: asString(record.status) || STATUS.NORMAL,
    quoteSource: asString(record.quoteSource) || 'MYSTEEL',
    quoteRegion: asString(record.quoteRegion),
    allowedBrands,
    allowedMaterials,
    allowedBrandSeverity: toAllowedSpecSeverity(
      record.allowedBrandSeverity,
      allowedBrands,
    ),
    allowedMaterialSeverity: toAllowedSpecSeverity(
      record.allowedMaterialSeverity,
      allowedMaterials,
    ),
    priceDateBasis,
    priceDateOffsetDays: toPriceDateOffsetDays(
      record.priceDateOffsetDays,
      priceDateBasis,
    ),
    priceClosedDayPrevSettle: toPriceClosedDayPrevSettle(
      record.priceClosedDayPrevSettle,
      priceDateBasis,
    ),
    pricePeriodPolicy,
    pricePeriodFixed: toPricePeriodFixed(
      record.pricePeriodFixed,
      pricePeriodPolicy,
    ),
    remark: asString(record.remark),
  }
}

/**
 * 项目资料页的编辑器开合与初值装填。
 *
 * <p>单独成 hook 的目的不是复用，而是把「页面主组件」压回可读规模：开合、初值、保存后刷新
 * 三者是一件事，放在页面里只会和其他列表状态互相干扰。</p>
 */
export function useProjectEditor(args: {
  form: FormInstance<ProjectEditorValues>
  /** 打开编辑器时收起已展开的行详情（展开态与编辑态同时存在会让人分不清在改哪一行）。 */
  collapseExpandedRows: () => void
  clearSelection: () => void
  refreshModuleQueries: () => Promise<void>
}) {
  const { form, collapseExpandedRows, clearSelection, refreshModuleQueries } =
    args
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorBaseRecord, setEditorBaseRecord] =
    useState<ProjectListRow | null>(null)

  const openEditor = (record: ProjectListRow | null) => {
    collapseExpandedRows()
    if (record) {
      setEditorBaseRecord({ ...record })
      form.resetFields()
      form.setFieldsValue(toEditorFormValues(record))
      setEditorOpen(true)
      return
    }
    setEditorBaseRecord(null)
    form.resetFields()
    form.setFieldsValue({ status: STATUS.NORMAL, projectCode: '' })
    setEditorOpen(true)
    void fetchGeneratedMasterDataCode(MODULE_KEY)
      .then((code) => {
        form.setFieldsValue({ projectCode: code })
      })
      .catch(() => {
        // 编码签发失败时留空，保存时由后端必填校验兜底。
      })
  }

  const closeEditor = () => {
    setEditorOpen(false)
    setEditorBaseRecord(null)
    form.resetFields()
  }

  const handleEditorSaved = async () => {
    clearSelection()
    await refreshModuleQueries()
  }

  return {
    editorOpen,
    editorBaseRecord,
    openEditor,
    closeEditor,
    handleEditorSaved,
  }
}
