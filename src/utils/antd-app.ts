import AntdApp from 'antd/es/app'
import modalApi from 'antd/es/modal'

type AntdAppApi = ReturnType<typeof AntdApp.useApp>
type MessageApi = AntdAppApi['message']
type NotificationApi = AntdAppApi['notification']
type ModalApi = AntdAppApi['modal']
type AnyFn = (...args: any[]) => any

let currentAntdAppApi: AntdAppApi | null = null

export function bindAntdAppApi(api: AntdAppApi | null) {
  currentAntdAppApi = api
}

function runMessageMethod<K extends keyof MessageApi>(
  method: K,
  args: Parameters<MessageApi[K]>,
) {
  const api = currentAntdAppApi?.message
  if (api) {
    return (api[method] as AnyFn)(...args)
  }

  void import('antd/es/message').then(({ default: messageApi }) => {
    ;(messageApi[method as keyof typeof messageApi] as AnyFn)(...args)
  })
  return undefined
}

function runNotificationMethod<K extends keyof NotificationApi>(
  method: K,
  args: Parameters<NotificationApi[K]>,
) {
  const api = currentAntdAppApi?.notification
  if (api) {
    return (api[method] as AnyFn)(...args)
  }

  void import('antd/es/notification').then(({ default: notificationApi }) => {
    ;(
      notificationApi[method as keyof typeof notificationApi] as AnyFn
    )(...args)
  })
  return undefined
}

function runModalMethod<K extends keyof ModalApi>(
  method: K,
  args: Parameters<ModalApi[K]>,
) {
  const api = currentAntdAppApi?.modal
  if (api) {
    return (api[method] as AnyFn)(...args)
  }

  return (modalApi[method as keyof typeof modalApi] as AnyFn)(...args)
}

export const message = {
  success: (...args: Parameters<MessageApi['success']>) =>
    runMessageMethod('success', args),
  error: (...args: Parameters<MessageApi['error']>) =>
    runMessageMethod('error', args),
  warning: (...args: Parameters<MessageApi['warning']>) =>
    runMessageMethod('warning', args),
  info: (...args: Parameters<MessageApi['info']>) =>
    runMessageMethod('info', args),
  loading: (...args: Parameters<MessageApi['loading']>) =>
    runMessageMethod('loading', args),
  destroy: (...args: Parameters<MessageApi['destroy']>) =>
    runMessageMethod('destroy', args),
}

export const notification = {
  warning: (...args: Parameters<NotificationApi['warning']>) =>
    runNotificationMethod('warning', args),
  info: (...args: Parameters<NotificationApi['info']>) =>
    runNotificationMethod('info', args),
  success: (...args: Parameters<NotificationApi['success']>) =>
    runNotificationMethod('success', args),
  error: (...args: Parameters<NotificationApi['error']>) =>
    runNotificationMethod('error', args),
  open: (...args: Parameters<NotificationApi['open']>) =>
    runNotificationMethod('open', args),
  destroy: (...args: Parameters<NotificationApi['destroy']>) =>
    runNotificationMethod('destroy', args),
}

export const modal = {
  confirm: (...args: Parameters<ModalApi['confirm']>) =>
    runModalMethod('confirm', args),
  info: (...args: Parameters<ModalApi['info']>) => runModalMethod('info', args),
  success: (...args: Parameters<ModalApi['success']>) =>
    runModalMethod('success', args),
  warning: (...args: Parameters<ModalApi['warning']>) =>
    runModalMethod('warning', args),
  error: (...args: Parameters<ModalApi['error']>) =>
    runModalMethod('error', args),
  destroyAll: () => modalApi.destroyAll(),
}
