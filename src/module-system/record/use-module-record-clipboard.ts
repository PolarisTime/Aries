import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { writeTextToClipboard } from '@/module-system/record/module-record-clipboard'
import { message } from '@/utils/antd-app'
import { asString } from '@/utils/type-narrowing'

/**
 * 「复制单号」统一入口：写剪贴板 + message 反馈。
 *
 * <p>目前唯一消费方是行操作菜单（useModuleRecordActions）里的「复制单号」命令：
 * 详情叠加层头部的复制按钮已下线，单号在界面上只以纯文本呈现，复制只保留菜单这一个
 * 入口（同一份成功/失败提示与空值忽略口径）。传入空单号时静默忽略，不写剪贴板也不提示。</p>
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
