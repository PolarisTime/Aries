import type { FormInstance } from 'antd'
import { Form } from 'antd'
import type { ProjectOption } from '@/api/master/project-options'
import type { ModulePageConfig } from '@/types/module-page'
import type { EditorFormValues } from '@/views/modules/module-editor-workspace-support'
import { ModuleEditorFormSection } from './ModuleEditorFormSection'

interface Props {
  form: FormInstance<EditorFormValues>
  config: ModulePageConfig
  moduleKey: string
  auditLabel?: string
  actions: {
    canSave: boolean
    canAudit: boolean
    saving: boolean
    visible: boolean
    onCancel: () => void
    onSave: (audit: boolean) => void
  }
  editorState: {
    isEdit: boolean
    lineItemsLocked: boolean
  }
  lockedLineItemsNotice: string
  authoritativePrimaryNo?: string
  layoutVariant?: 'default' | 'finance'
  projectOptions?: readonly ProjectOption[]
  settlementAccountOptions?: readonly {
    label: string
    value: string | number | boolean
  }[]
  onValuesChange: (changedValues: Record<string, unknown>) => void
}

/** 编辑器表单区：外层 Form 上下文 + 字段分区渲染。 */
export function ModuleEditorFormArea({
  form,
  config,
  moduleKey,
  auditLabel,
  actions,
  editorState,
  lockedLineItemsNotice,
  authoritativePrimaryNo,
  layoutVariant = 'default',
  projectOptions,
  settlementAccountOptions,
  onValuesChange,
}: Props) {
  return (
    <Form
      form={form}
      /*
       * label 方向全站统一 vertical（AGENTS.md《无障碍与文案》）。历史实现只有财务版
       * 是 vertical，其余单据编辑器是 horizontal —— 同一系统里两种 label 方向，用户在
       * 「主数据弹层」与「单据编辑器」之间切换时扫读路径反复重置（审查报告 P2-26）。
       *
       * 注意：只把这里改成 vertical 不够。`module-table.css` 里 `.editor-form-shell` 的
       * 水平遗留规则（`.ant-form-item-row { display:flex; nowrap }` + label 固定宽高）
       * 会把 vertical 压回并排；因此非财务版同时加 `editor-form-shell--vertical` 类，
       * 由 CSS 末尾的同名作用域块覆盖（该块是 vertical 方向的唯一来源）。
       */
      layout="vertical"
      colon={false}
      labelWrap={false}
      /*
       * `--vertical` 只挂在非财务版：财务版（收付款单）本来就有自己的一整套
       * `.editor-form-shell--finance` 纵向规则，再挂一层会改掉它的既有节奏。
       */
      className={`editor-form-shell${
        layoutVariant === 'finance'
          ? ' editor-form-shell--finance'
          : ' editor-form-shell--vertical'
      }`}
      onValuesChange={onValuesChange}
    >
      <ModuleEditorFormSection
        config={config}
        moduleKey={moduleKey}
        projectOptions={projectOptions}
        settlementAccountOptions={settlementAccountOptions}
        auditLabel={auditLabel}
        actions={actions}
        editorState={editorState}
        lockedLineItemsNotice={lockedLineItemsNotice}
        authoritativePrimaryNo={authoritativePrimaryNo}
        layoutVariant={layoutVariant}
      />
    </Form>
  )
}
