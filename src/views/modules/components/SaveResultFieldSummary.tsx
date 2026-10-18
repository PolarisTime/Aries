import { Card, Space, Typography } from 'antd'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { readModuleRecordField } from '@/module-system/record/module-record-fields'
import type {
  ModuleFormFieldDefinition,
  ModulePageConfig,
} from '@/types/module-page'
import { resolveSummaryDisplayValue } from './save-result-field-values'

/**
 * 保存回执的字段摘要卡片。
 *
 * <p>从 SaveResultOverlay 抽出的原因：字段遍历里的「空值跳过 + 重量/金额后缀」
 * 是一组独立分支，内联在弹窗里会把弹窗控制流复杂度推过 react-doctor 阈值
 * (no-high-complexity-react-function)。DOM 结构、Typography 层级与全角冒号
 * 文案保持逐字不变。</p>
 *
 * <p>取值口径（显示名优先、取不到才回退原值）在 `save-result-field-values.ts`，
 * 那里是「回执字段显示值」的唯一出口；本文件只负责渲染。</p>
 */

interface Props {
  config: ModulePageConfig
  record: object
}

/** 重量/金额后缀: 复用列标题里的单位文案, 去掉括号后的字号说明。 */
function resolveFieldSuffix(field: ModuleFormFieldDefinition, t: TFunction) {
  if (readModuleRecordField(field, 'type') === 'weight') {
    return ` ${t('modules.itemColumns.weightTon').replace(/\(.*\)/, '')}`
  }
  if (readModuleRecordField(field, 'type') === 'amount') {
    return ` ${t('modules.itemColumns.amount')}`
  }
  return ''
}

export function SaveResultFieldSummary({ config, record }: Props) {
  const { t } = useTranslation()

  return (
    <Card size="small" className="mb-16">
      <Space orientation="vertical" size={4}>
        {(config.formFields || []).map((field) => {
          const val = resolveSummaryDisplayValue(record, field.key)
          if (val == null || val === '') return null
          return (
            <div key={field.key}>
              <Typography.Text type="secondary">
                {field.label}：
              </Typography.Text>
              <Typography.Text>
                {String(val)}
                {resolveFieldSuffix(field, t)}
              </Typography.Text>
            </div>
          )
        })}
      </Space>
    </Card>
  )
}
