import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { writeTextToClipboard } from '@/module-system/record/module-record-clipboard'
import { message } from '@/utils/antd-app'
import { asString } from '@/utils/type-narrowing'

/**
 * 「复制单号」统一入口：写剪贴板 + message 反馈。
 *
 * <p>行操作菜单（useModuleRecordActions）与详情叠加层头部（CopyDocNoButton）共用，
 * 保证两处的成功/失败提示与空值忽略口径完全一致。传入空单号时静默忽略，
 * 不写剪贴板也不提示。</p>
 */
export function useCopyDocNo() {
  const { t } = useTranslation()

  return useCallback(
    (rawDocNo: unknown) => {
      const docNo = asString(rawDocNo).trim()
      if (!docNo) return
      void writeTextToClipboard(docNo).then(
        () => {
          message.success(t('hooks.recordActions.copyDocNoSuccess'))
        },
        () => {
          message.warning(t('hooks.recordActions.copyDocNoFailed'))
        },
      )
    },
    [t],
  )
}
