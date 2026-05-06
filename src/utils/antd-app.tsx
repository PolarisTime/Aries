import { App } from 'antd'
import { useEffect } from 'react'

type AntdAppApis = ReturnType<typeof App.useApp>
type MessageApi = AntdAppApis['message']
type NotificationApi = AntdAppApis['notification']
type ModalApi = AntdAppApis['modal']

let messageApi: MessageApi | null = null
let notificationApi: NotificationApi | null = null
let modalApi: ModalApi | null = null

export function AntdAppBridge() {
  const { message, notification, modal } = App.useApp()

  useEffect(() => {
    messageApi = message
    notificationApi = notification
    modalApi = modal

    return () => {
      if (messageApi === message) {
        messageApi = null
      }
      if (notificationApi === notification) {
        notificationApi = null
      }
      if (modalApi === modal) {
        modalApi = null
      }
    }
  }, [message, notification, modal])

  return null
}

export const message = {
  success: (...args: Parameters<MessageApi['success']>) =>
    messageApi?.success(...args),
  error: (...args: Parameters<MessageApi['error']>) =>
    messageApi?.error(...args),
  warning: (...args: Parameters<MessageApi['warning']>) =>
    messageApi?.warning(...args),
  info: (...args: Parameters<MessageApi['info']>) =>
    messageApi?.info(...args),
}

export const notification = {
  warning: (...args: Parameters<NotificationApi['warning']>) =>
    notificationApi?.warning(...args),
}

export const modal = {
  confirm: (...args: Parameters<ModalApi['confirm']>) =>
    modalApi?.confirm(...args),
  info: (...args: Parameters<ModalApi['info']>) => modalApi?.info(...args),
  success: (...args: Parameters<ModalApi['success']>) =>
    modalApi?.success(...args),
  warning: (...args: Parameters<ModalApi['warning']>) =>
    modalApi?.warning(...args),
  error: (...args: Parameters<ModalApi['error']>) =>
    modalApi?.error(...args),
}
