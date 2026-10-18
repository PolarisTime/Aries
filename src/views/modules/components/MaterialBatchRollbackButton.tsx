import { Button, Space, Typography } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  type MaterialBatchRollbackResult,
  rollbackMaterialImportBatch,
} from '@/api/master/materials'
import { message } from '@/utils/antd-app'
import { confirmDanger } from '@/utils/confirm-danger'

interface Props {
  importBatchNo: string
  onRolledBack?: () => Promise<void> | void
}

/** 批次回滚入口：二次确认后调用回滚资源接口，并就地展示回滚统计。 */
export function MaterialBatchRollbackButton({
  importBatchNo,
  onRolledBack,
}: Props) {
  const { t } = useTranslation()
  const [rollingBack, setRollingBack] = useState(false)
  const [result, setResult] = useState<MaterialBatchRollbackResult | null>(null)

  const execute = async () => {
    setRollingBack(true)
    try {
      const rollbackResult = await rollbackMaterialImportBatch(importBatchNo)
      setResult(rollbackResult)
      message.success(t('modules.pages.material.rollbackSuccess'))
      await onRolledBack?.()
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : t('modules.pages.material.rollbackFailed'),
      )
    }
    // 不用 try/finally: React Compiler 不支持该语法(react-hooks-js/todo), 命中后组件会失去自动记忆化;
    // 此处无提前 return, 清理语句跟在 try/catch 之后即可保持等价。
    setRollingBack(false)
  }

  const handleClick = () => {
    // 批量回滚不可逆：走 confirmDanger 保证默认焦点在「取消」，回车不会直接回滚
    confirmDanger({
      title: t('modules.pages.material.rollbackConfirmTitle'),
      content: t('modules.pages.material.rollbackConfirmContent', {
        batchNo: importBatchNo,
      }),
      onOk: execute,
    })
  }

  return (
    <Space orientation="vertical" size={4}>
      <Button danger size="small" loading={rollingBack} onClick={handleClick}>
        {t('modules.pages.material.rollbackAction')}
      </Button>
      {result ? (
        <Typography.Text type="secondary" className="text-xs">
          {t('modules.pages.material.rollbackTotal')}: {result.totalRows} ·{' '}
          {t('modules.pages.material.rollbackCreatedRolledBack')}:{' '}
          {result.createdRolledBack} ·{' '}
          {t('modules.pages.material.rollbackUpdatedRestored')}:{' '}
          {result.updatedRestored} ·{' '}
          {t('modules.pages.material.rollbackMissing')}: {result.missing}
        </Typography.Text>
      ) : null}
    </Space>
  )
}
