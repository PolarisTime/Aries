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
      layout={layoutVariant === 'finance' ? 'vertical' : 'horizontal'}
      colon={false}
      labelWrap={false}
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
