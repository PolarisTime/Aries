import { ReloadOutlined, SyncOutlined } from '@ant-design/icons'
import { Button, Modal, Space, Typography } from 'antd'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { logger } from '@/utils/logger'
import { clearApplicationCacheAndReload } from './app-update-cache'

const UPDATE_NOTICE_EVENT = 'plugin_web_update_notice'
const VITE_PRELOAD_ERROR_EVENT = 'vite:preloadError'

type VitePreloadErrorEvent = Event & {
  payload?: unknown
}

export function AppUpdatePrompt() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const showUpdatePrompt = () => {
      setOpen(true)
    }
    const handlePreloadError = (event: Event) => {
      const preloadError = event as VitePreloadErrorEvent
      event.preventDefault()
      logger.warn('Frontend resource is outdated', preloadError.payload)
      setOpen(true)
      window.pluginWebUpdateNotice_?.checkUpdate()
    }

    document.body.addEventListener(UPDATE_NOTICE_EVENT, showUpdatePrompt)
    window.addEventListener(VITE_PRELOAD_ERROR_EVENT, handlePreloadError)
    window.pluginWebUpdateNotice_?.checkUpdate()

    return () => {
      document.body.removeEventListener(UPDATE_NOTICE_EVENT, showUpdatePrompt)
      window.removeEventListener(VITE_PRELOAD_ERROR_EVENT, handlePreloadError)
    }
  }, [])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await clearApplicationCacheAndReload()
  }, [])

  return (
    <Modal
      centered
      closable={false}
      footer={
        <Button
          block
          icon={<ReloadOutlined />}
          loading={refreshing}
          size="large"
          type="primary"
          onClick={() => void handleRefresh()}
        >
          {t('appUpdate.refreshButton')}
        </Button>
      }
      keyboard={false}
      mask={{ closable: false }}
      open={open}
      title={
        <Space size="small">
          <SyncOutlined />
          <span>{t('appUpdate.title')}</span>
        </Space>
      }
      width={480}
    >
      <Typography.Paragraph>{t('appUpdate.description')}</Typography.Paragraph>
      <Typography.Text type="secondary">
        {t('appUpdate.unsavedWarning')}
      </Typography.Text>
    </Modal>
  )
}
