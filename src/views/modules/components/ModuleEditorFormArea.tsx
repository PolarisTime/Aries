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
       * label 方向全站统一 **horizontal**：标签与控件同一行。
       *
       * <p>演进记录：曾统一为 vertical（审查报告 P2-26），但单据编辑器是「一张单据几十个
       * 字段」的密集录入场景，纵向标签让每个字段多占一行，一屏能看到的字段数掉了一半，
       * 反而增加滚动与漏填。密集录入表格化的形态用横向标签更合适（对比主数据弹层字段少、
       * 以阅读为主，仍可用纵向）。</p>
       *
       * <p>横向对齐由 `.editor-form-shell` 的 `.ant-form-item-label`（`min-width:
       * var(--app-editor-label-width)` + 右对齐 + 省略号）统一提供，标签文案本身不再用
       * 全角空格补齐 —— 那种补法在纵向布局下会变成可见左缩进。</p>
       */
      layout="horizontal"
      colon={false}
      labelWrap={false}
      /* 财务版（收付款单）保留自己的间距/分隔线节奏，但 label 方向与其它单据一致。 */
      className={`editor-form-shell${
        layoutVariant === 'finance' ? ' editor-form-shell--finance' : ''
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
