import { type RefObject, useCallback, useEffect, useRef, useState } from 'react'
import type { ModulePageConfig } from '@/types/module-page'
import type { WorkspaceFormApi } from '@/views/modules/module-editor-workspace-support'
import {
  findStepIndexForField,
  resolveWizardStepTransition,
  scrollContainerToTop,
} from './editor-wizard'

interface Options {
  config: ModulePageConfig
  moduleKey: string
  recordId?: string
  isEdit: boolean
  form: WorkspaceFormApi
  overlayBodyRef: RefObject<HTMLDivElement | null>
}

interface WizardStepState {
  sessionKey: string
  step: number
}

/**
 * 编辑器多步向导状态与交互控制器（挂载于打开态弹层内，关闭卸载后自然重置）。
 *
 * <p>切换编辑记录时按 `entitySessionKey` 纯派生归零（不在 effect 里调 `setState`），
 * React 19 `Activity` 隐藏恢复时实例不卸载且 key 不变，不会误重置当前步。</p>
 */
export function useEditorWizard({
  config,
  moduleKey,
  recordId,
  isEdit,
  form,
  overlayBodyRef,
}: Options) {
  const steps = config.formSteps ?? []
  const totalSteps = steps.length
  const isWizard = totalSteps > 0
  const entitySessionKey = `${moduleKey}:${recordId || 'new'}`
  const [stepState, setStepState] = useState<WizardStepState>({
    sessionKey: entitySessionKey,
    step: 0,
  })
  const currentStep =
    isWizard && stepState.sessionKey === entitySessionKey
      ? Math.max(0, Math.min(stepState.step, totalSteps - 1))
      : 0

  const pendingFocusFieldRef = useRef<string | null>(null)
  const previousStepRef = useRef(currentStep)

  // 切步后把弹层内容区滚回顶部，并在跨步校验定位后触发目标字段红框校验与聚焦。
  useEffect(() => {
    const stepChanged = previousStepRef.current !== currentStep
    previousStepRef.current = currentStep
    if (!isWizard) {
      return
    }
    if (stepChanged) {
      scrollContainerToTop(overlayBodyRef.current)
    }
    const pendingField = pendingFocusFieldRef.current
    if (!pendingField) {
      return
    }
    const targetStep = findStepIndexForField(config, pendingField)
    if (targetStep !== null && targetStep !== currentStep) {
      return
    }
    pendingFocusFieldRef.current = null
    void form
      .validateFields([pendingField])
      .catch(() => {})
      .finally(() => {
        form.focusField(pendingField)
      })
  }, [config, currentStep, form, isWizard, overlayBodyRef])

  const commitStep = useCallback(
    (nextStep: number, focusFieldKey?: string) => {
      pendingFocusFieldRef.current = focusFieldKey ?? null
      setStepState({ sessionKey: entitySessionKey, step: nextStep })
    },
    [entitySessionKey],
  )

  const goToStep = useCallback(
    async (rawNextStep: number) => {
      const outcome = await resolveWizardStepTransition({
        config,
        moduleKey,
        isEdit,
        currentStep,
        rawNextStep,
        form,
      })
      if (outcome.kind === 'move') {
        commitStep(outcome.stepIndex, outcome.focusFieldKey)
      }
    },
    [commitStep, config, currentStep, form, isEdit, moduleKey],
  )

  const goPrevious = useCallback(() => {
    void goToStep(currentStep - 1)
  }, [currentStep, goToStep])

  const goNext = useCallback(() => {
    void goToStep(currentStep + 1)
  }, [currentStep, goToStep])

  /** 保存校验发现表单字段出错时，若位于其他步骤则自动切回该步并在挂载后聚焦标红。 */
  const focusInvalidField = useCallback(
    (fieldKey: string) => {
      if (!isWizard) {
        form.focusField(fieldKey)
        return
      }
      const targetStep = findStepIndexForField(config, fieldKey)
      if (targetStep === null || targetStep === currentStep) {
        void form
          .validateFields([fieldKey])
          .catch(() => {})
          .finally(() => {
            form.focusField(fieldKey)
          })
        return
      }
      commitStep(targetStep, fieldKey)
    },
    [commitStep, config, currentStep, form, isWizard],
  )

  return {
    isWizard,
    currentStep,
    totalSteps,
    goToStep,
    goPrevious,
    goNext,
    focusInvalidField,
  }
}
