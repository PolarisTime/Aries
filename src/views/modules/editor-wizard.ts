import { usesSnowflakeBusinessNo } from '@/module-system/core/business-no-policy'
import { validateEditorSubmission } from '@/module-system/editor/module-editor-validation'
import { isModuleFormFieldVisible } from '@/module-system/presentation/module-form-field-visibility'
import type {
  ModuleFormFieldDefinition,
  ModuleFormStep,
  ModulePageConfig,
} from '@/types/module-page'
import { message } from '@/utils/antd-app'
import {
  focusFirstInvalidField,
  readAntdFormValidationErrorFields,
} from '@/utils/form-control-a11y'
import type { WorkspaceFormApi } from '@/views/modules/module-editor-workspace-support'

/**
 * 编辑器多步向导纯逻辑（**唯一来源**）。
 *
 * <p>把「当前步可校验字段」「新建态跨步中间校验」「步进校验跳转」「24 栅格打包」
 * 「字段→步骤映射」「单区块隐藏重复 Divider」集中在这里，供 `useEditorWizard`（外壳托管）
 * 与 `ModuleEditorFormSection`（独立使用）共用，避免向导规则散落成两份漂移实现。</p>
 */

export interface EditorWizardControl {
  currentStep: number
  onStepChange: (nextStep: number) => void
  /** 为 true 时隐藏表单底部的内联导航条，由弹层固定 footer 统一承载。 */
  hideInlineNav?: boolean
}

export interface WizardFieldGroup {
  section?: string
  fields: ModuleFormFieldDefinition[]
}

export interface WizardStepValidationFailure {
  stepIndex: number
  fieldKey: string
  message: string
}

export type WizardTransitionOutcome =
  | { kind: 'stay' }
  | { kind: 'move'; stepIndex: number; focusFieldKey?: string }

/** 计算表单字段在 24 栅格中的列宽（向导与单页表单唯一来源）。 */
export function getModuleFormFieldSpan(
  field: ModuleFormFieldDefinition,
  layoutVariant: 'default' | 'finance',
): number {
  if (typeof field.colSpan === 'number' && Number.isFinite(field.colSpan)) {
    const span = Math.max(6, Math.min(24, Math.trunc(field.colSpan)))
    return layoutVariant === 'finance' && span === 6 ? 8 : span
  }
  if (field.fullRow || field.type === 'textarea') {
    return 24
  }
  return layoutVariant === 'finance' ? 12 : 6
}

/**
 * 向导模式下按 24 栅格打包字段成行：`groupFieldsByRow` 依赖单页行号 `row`，
 * 拆步后同一步里的 `row` 可能不连续，这里按列宽贪心打包保证各行铺满。
 */
export function packWizardFieldRows(
  fields: ModuleFormFieldDefinition[],
  layoutVariant: 'default' | 'finance' = 'default',
): ModuleFormFieldDefinition[][] {
  const rows: ModuleFormFieldDefinition[][] = []
  let current: ModuleFormFieldDefinition[] = []
  let spanSum = 0
  for (const field of fields) {
    const span = getModuleFormFieldSpan(field, layoutVariant)
    if (current.length > 0 && spanSum + span > 24) {
      rows.push(current)
      current = []
      spanSum = 0
    }
    current.push(field)
    spanSum += span
    if (spanSum >= 24) {
      rows.push(current)
      current = []
      spanSum = 0
    }
  }
  if (current.length > 0) {
    rows.push(current)
  }
  return rows
}

/** 过滤在当前表单值与模式下实际可见的字段列表（与 `ModuleEditorFormSection` 同口径）。 */
export function resolveVisibleModuleFormFields(options: {
  config: ModulePageConfig
  moduleKey: string
  isEdit: boolean
  formValues: Record<string, unknown>
}): ModuleFormFieldDefinition[] {
  const { config, moduleKey, isEdit, formValues } = options
  return (config.formFields || []).filter(
    (field) =>
      isModuleFormFieldVisible(field, formValues) &&
      !(
        !isEdit &&
        !config.showGeneratedPrimaryNoOnCreate &&
        field.key === config.primaryNoKey &&
        usesSnowflakeBusinessNo(moduleKey, config.primaryNoKey)
      ),
  )
}

/**
 * 某一步内「用户可修改且需要校验」的字段 key 列表。
 *
 * <p>与保存链路保持同一跳过口径：
 * - `disabled` / `disabledWhen` 置灰字段用户改不了，拦在向导里只会造成死循环；
 * - 雪花号主单号与 `use-editor-submission-controller` 的 `skipRequiredFieldKeys` 同口径跳过。</p>
 */
export function resolveWizardStepValidatableKeys(options: {
  config: ModulePageConfig
  moduleKey: string
  isEdit: boolean
  formValues: Record<string, unknown>
  stepIndex: number
}): string[] {
  const { config, moduleKey, isEdit, formValues, stepIndex } = options
  const visibleFields = resolveVisibleModuleFormFields({
    config,
    moduleKey,
    isEdit,
    formValues,
  })
  return visibleFields
    .filter((field) => field.formStep === stepIndex + 1)
    .filter((field) => !field.disabled && !field.disabledWhen?.(formValues))
    .filter(
      (field) =>
        !(
          field.key === config.primaryNoKey &&
          usesSnowflakeBusinessNo(moduleKey, config.primaryNoKey)
        ),
    )
    .map((field) => field.key)
}

/**
 * 新建态跨步向前跳转（例如从第 1 步直接点第 3 步）时，检查中间未挂载步骤
 * `[fromStepIndex + 1 .. toStepIndex - 1]` 是否存在必填缺失或自定义校验失败。
 */
export function findFirstInvalidWizardFieldInRange(options: {
  config: ModulePageConfig
  moduleKey: string
  formValues: Record<string, unknown>
  fromStepIndex: number
  toStepIndex: number
}): WizardStepValidationFailure | null {
  const { config, moduleKey, formValues, fromStepIndex, toStepIndex } = options
  if (toStepIndex <= fromStepIndex + 1) {
    return null
  }
  const skipRequiredFieldKeys = [
    ...(config.primaryNoKey &&
    usesSnowflakeBusinessNo(moduleKey, config.primaryNoKey)
      ? [config.primaryNoKey]
      : []),
    ...(config.formFields || [])
      .filter((field) => field.disabled || field.disabledWhen?.(formValues))
      .map((field) => field.key),
  ]

  for (
    let stepIndex = fromStepIndex + 1;
    stepIndex < toStepIndex;
    stepIndex += 1
  ) {
    const stepFields = (config.formFields || []).filter(
      (field) => field.formStep === stepIndex + 1,
    )
    const validation = validateEditorSubmission({
      moduleKey,
      fields: stepFields,
      editorForm: formValues,
      hasItemColumns: false,
      itemCount: 0,
      skipRequiredFieldKeys,
      collectAll: false,
    })
    if (validation.message && validation.firstInvalidFieldKey) {
      return {
        stepIndex,
        fieldKey: validation.firstInvalidFieldKey,
        message: validation.message,
      }
    }
  }
  return null
}

/**
 * 执行一次向导步进判定（**唯一实现**，外壳托管与独立表单共用）：
 * - 编辑态或回跳直接放行；
 * - 新建态前进/跨步先校验当前步，再核对中间未挂载步。
 */
export async function resolveWizardStepTransition(options: {
  config: ModulePageConfig
  moduleKey: string
  isEdit: boolean
  currentStep: number
  rawNextStep: number
  form: Pick<
    WorkspaceFormApi,
    'getFieldsValue' | 'validateFields' | 'focusField'
  >
}): Promise<WizardTransitionOutcome> {
  const { config, moduleKey, isEdit, currentStep, rawNextStep, form } = options
  const totalSteps = config.formSteps?.length ?? 0
  if (totalSteps <= 0) {
    return { kind: 'stay' }
  }
  const nextStep = Math.max(0, Math.min(rawNextStep, totalSteps - 1))
  if (nextStep === currentStep) {
    return { kind: 'stay' }
  }
  if (isEdit || nextStep < currentStep) {
    return { kind: 'move', stepIndex: nextStep }
  }

  const currentStepKeys = resolveWizardStepValidatableKeys({
    config,
    moduleKey,
    isEdit,
    formValues: form.getFieldsValue(true),
    stepIndex: currentStep,
  })
  if (currentStepKeys.length > 0) {
    try {
      await form.validateFields(currentStepKeys)
    } catch (error) {
      const errorFields = readAntdFormValidationErrorFields(error)
      if (errorFields) {
        focusFirstInvalidField(form, errorFields)
      }
      return { kind: 'stay' }
    }
  }

  const intermediateFailure = findFirstInvalidWizardFieldInRange({
    config,
    moduleKey,
    formValues: form.getFieldsValue(true),
    fromStepIndex: currentStep,
    toStepIndex: nextStep,
  })
  if (intermediateFailure) {
    message.warning(intermediateFailure.message)
    return {
      kind: 'move',
      stepIndex: intermediateFailure.stepIndex,
      focusFieldKey: intermediateFailure.fieldKey,
    }
  }

  return { kind: 'move', stepIndex: nextStep }
}

/** 查找字段在向导中所属的步骤索引（0-based）；未声明向导或字段无归属步时返回 `null`。 */
export function findStepIndexForField(
  config: ModulePageConfig,
  fieldKey: string,
): number | null {
  const stepCount = config.formSteps?.length ?? 0
  if (stepCount <= 0) {
    return null
  }
  const field = (config.formFields || []).find((item) => item.key === fieldKey)
  if (typeof field?.formStep !== 'number') {
    return null
  }
  const stepIndex = field.formStep - 1
  return stepIndex >= 0 && stepIndex < stepCount ? stepIndex : null
}

/**
 * 向导模式下若当前步仅有一个区块，且区块标题与当前步骤条标题相同，
 * 省略重复的 `<Divider>`，避免步骤条下方紧跟一条同名分割线。
 */
export function shouldRenderWizardSectionDivider(options: {
  isWizard: boolean
  steps: readonly ModuleFormStep[]
  currentStep: number
  groups: readonly WizardFieldGroup[]
  section?: string
}): boolean {
  const { isWizard, steps, currentStep, groups, section } = options
  if (!section) {
    return false
  }
  if (
    isWizard &&
    groups.length === 1 &&
    section === steps[currentStep]?.title
  ) {
    return false
  }
  return true
}

/** 将滚动容器安全滚回顶部（兼容 jsdom 中可能未实现 `scrollTo` 的环境）。 */
export function scrollContainerToTop(container: HTMLElement | null) {
  if (!container) {
    return
  }
  if (typeof container.scrollTo === 'function') {
    container.scrollTo({ top: 0 })
  }
  container.scrollTop = 0
}
