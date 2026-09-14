import { Button, Space, Typography } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  type MaterialBatchRollbackResult,
  rollbackMaterialImportBatch,
} from '@/api/master/materials'
import { message, modal } from '@/utils/antd-app'

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
    } finally {
      setRollingBack(false)
    }
  }

  const handleClick = () => {
    modal.confirm({
      title: t('modules.pages.material.rollbackConfirmTitle'),
      content: t('modules.pages.material.rollbackConfirmContent', {
        batchNo: importBatchNo,
      }),
      okButtonProps: { danger: true },
      onOk: execute,
    })
  }

  return (
    <Space direction="vertical" size={4}>
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
