import { EnvironmentOutlined, ProfileOutlined } from '@ant-design/icons'
import type { ReactNode } from 'react'
import {
  formatDocumentReferenceText,
  isDocumentReferenceField,
} from '@/components/document-reference/document-reference-utils'
import { renderModuleRecordStatus } from '@/components/ModuleRecordStatus'
import { shouldDisplayPieceWeightAsDash } from '@/module-system/presentation/module-line-item-display'
import type {
  ModuleDetailField,
  ModulePageConfig,
  ModuleRecord,
} from '@/types/module-page'

/**
 * 值超过这个字符数就整行展示（纯展示口径，按值字面长度，不参与任何业务计算）。
 *
 * <p>**这是「这段值算不算长文本」的唯一常量**：antd Descriptions 分支用它决定要不要跨两列
 * （`resolveDetailFieldSpan`），方案 B 的流式网格用它决定要不要整行 + 底框。两处各写一份
 * 24 的话，改一处就会让「同样长度的项目名在两种布局里一个跨行一个不跨」。</p>
 */
export const DETAIL_FIELD_WIDE_TEXT_LENGTH = 24

/** 该字段在信息区是否按「整行 + 浅灰底框」呈现。 */
export function isWideDetailField(
  record: ModuleRecord,
  field: ModuleDetailField,
): boolean {
  if (field.fullRow) return true
  return String(record[field.key] ?? '').length > DETAIL_FIELD_WIDE_TEXT_LENGTH
}

interface FieldValueProps {
  config: ModulePageConfig
  field: ModuleDetailField
  formatCellValue: (value: unknown, columnType?: string) => string
  record: ModuleRecord
}

/**
 * 单个详情字段的取值：单重占位 / 单据引用 / 状态 / 列自定义渲染 / 通用格式化。
 *
 * <p>**两种信息区布局（Descriptions 与方案 B 流式网格）共用这一个取值出口**，
 * 不再各自实现一遍 —— 否则「单重该显示 `-`」「单据引用只出单号」「状态走 statusMap」
 * 这三条口径必然在两处漂移，详情弹层与行展开会对同一个字段给出不同答案。</p>
 */
export function ModuleRecordDetailFieldValue({
  config,
  field,
  formatCellValue,
  record,
}: FieldValueProps) {
  if (
    field.key === 'pieceWeightTon' &&
    shouldDisplayPieceWeightAsDash(record)
  ) {
    return <>-</>
  }
  const colDef = config.columns.find((c) => c.dataIndex === field.key)
  const fieldType = colDef?.type || field.type
  if (isDocumentReferenceField(field.key)) {
    // 单据引用字段只展示单号纯文本（文本口径见 formatDocumentReferenceText）
    return formatDocumentReferenceText(record[field.key]) || '-'
  }
  if (fieldType === 'status') {
    return renderModuleRecordStatus({
      record,
      statusKey: field.key,
      statusMap: config.statusMap,
      renderFallback: (status) => formatCellValue(status, fieldType),
    })
  }
  if (colDef?.render) {
    return colDef.render(record[field.key], record)
  }
  return formatCellValue(record[field.key], fieldType)
}

/**
 * 整行长文本字段的前置小图标。
 *
 * <p>只是装饰（`aria-hidden`），所以按字段语义挑一个即可：项目名称用定位图标
 * （与列表里的项目列标识同义），其余长文本（备注等）用文档图标。</p>
 */
function resolveWideFieldIcon(fieldKey: string): ReactNode {
  return fieldKey === 'projectName' ? (
    <EnvironmentOutlined aria-hidden className="module-detail-field__icon" />
  ) : (
    <ProfileOutlined aria-hidden className="module-detail-field__icon" />
  )
}

interface GridProps {
  config: ModulePageConfig
  fields: ModuleDetailField[]
  formatCellValue: (value: unknown, columnType?: string) => string
  record: ModuleRecord
  /** 行展开的窄容器：固定 2 列，不再跟视口断点走（视口宽但容器窄）。 */
  compact?: boolean
}

/**
 * 方案 B 的信息区：紧凑「标签：值」流式网格。
 *
 * <p>与 antd `Descriptions` 表格的区别是**没有表头、没有单元格边框、没有固定标签列**：
 * 2 列（md 起 4 列）的纯文本网格，行间距 8px、列间距 16px，label 次要色、值主色，
 * 一屏能读完的字段密度更高，也不会出现「八九个等重方块拼成表单」的观感。</p>
 *
 * <p>长文本字段（项目名称、备注这类）整行铺满：值放进浅灰圆角底框并前置一个小图标，
 * 视觉上从「一串字段」里跳出来，读起来是「这一段是地址/说明」而不是又一个短值。</p>
 *
 * <p>标签后的冒号写在中式标点里（与 `ModuleTablePagination`、`PrintJobModalSummaryBar`
 * 的既有写法一致），不新造 i18n key。</p>
 */
export function ModuleDetailFieldGrid({
  config,
  fields,
  formatCellValue,
  record,
  compact = false,
}: GridProps) {
  return (
    <div
      className={`module-detail-field-grid${compact ? ' module-detail-field-grid--compact' : ''}`}
    >
      {fields.map((field) => {
        const value = (
          <ModuleRecordDetailFieldValue
            key={field.key}
            config={config}
            field={field}
            formatCellValue={formatCellValue}
            record={record}
          />
        )
        if (!isWideDetailField(record, field)) {
          return (
            <div key={field.key} className="module-detail-field">
              <span className="module-detail-field__label">
                {field.label}：
              </span>
              <span className="module-detail-field__value">{value}</span>
            </div>
          )
        }
        return (
          <div
            key={field.key}
            className="module-detail-field module-detail-field--wide"
          >
            <span className="module-detail-field__label">{field.label}：</span>
            <span className="module-detail-field__box">
              {resolveWideFieldIcon(field.key)}
              <span className="module-detail-field__value">{value}</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}
