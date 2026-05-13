import AntdApp from 'antd/es/app'
import modalApi from 'antd/es/modal'

type AntdAppApi = ReturnType<typeof AntdApp.useApp>

/**
 * Antd 静态/动态双通道消息/通知/弹窗适配。
 *
 * 使用 `as` 断言的原因：Antd 的 `messageApi[method]` 返回联类型，
 * TypeScript 无法将泛型 K 收窄到具体方法签名。此处为已知的类型系统限制，
 * 所有调用均通过具名方法导出（message.success 等），类型安全由导出层保证。
 */

function callMethod<Api, K extends keyof Api>(
  api: Api | undefined,
  method: K,
  args: unknown[],
  fallbackImport?: () => Promise<{ default: Api }>,
): unknown {
  if (api) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Antd API union type limitation
    return (api[method] as (...a: any[]) => any)(...args)
  }
  if (fallbackImport) {
    void fallbackImport().then((mod) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(mod.default[method] as (...a: any[]) => any)(...args)
    })
  }
  return undefined
}

function getMessageApi() {
  return (currentAntdAppApi as AntdAppApi | null)?.message
}

function getNotificationApi() {
  return (currentAntdAppApi as AntdAppApi | null)?.notification
}

function getModalApi() {
  return (currentAntdAppApi as AntdAppApi | null)?.modal
}

let currentAntdAppApi: unknown = null

export function bindAntdAppApi(api: AntdAppApi | null): void {
  currentAntdAppApi = api
}

type MsgMethod = Parameters<AntdAppApi['message'][keyof AntdAppApi['message']]>
type NotifMethod = Parameters<AntdAppApi['notification'][keyof AntdAppApi['notification']]>
type ModMethod = Parameters<AntdAppApi['modal'][keyof AntdAppApi['modal']]>

export const message = {
  success: (...args: MsgMethod) => callMethod(getMessageApi(), 'success', args, () => import('antd/es/message')),
  error:   (...args: MsgMethod) => callMethod(getMessageApi(), 'error', args, () => import('antd/es/message')),
  warning: (...args: MsgMethod) => callMethod(getMessageApi(), 'warning', args, () => import('antd/es/message')),
  info:    (...args: MsgMethod) => callMethod(getMessageApi(), 'info', args, () => import('antd/es/message')),
  loading: (...args: MsgMethod) => callMethod(getMessageApi(), 'loading', args, () => import('antd/es/message')),
  destroy: (...args: MsgMethod) => callMethod(getMessageApi(), 'destroy', args, () => import('antd/es/message')),
}

export const notification = {
  warning: (...args: NotifMethod) => callMethod(getNotificationApi(), 'warning', args, () => import('antd/es/notification')),
  info:    (...args: NotifMethod) => callMethod(getNotificationApi(), 'info', args, () => import('antd/es/notification')),
  success: (...args: NotifMethod) => callMethod(getNotificationApi(), 'success', args, () => import('antd/es/notification')),
  error:   (...args: NotifMethod) => callMethod(getNotificationApi(), 'error', args, () => import('antd/es/notification')),
  open:    (...args: NotifMethod) => callMethod(getNotificationApi(), 'open', args, () => import('antd/es/notification')),
  destroy: (...args: NotifMethod) => callMethod(getNotificationApi(), 'destroy', args, () => import('antd/es/notification')),
}

export const modal = {
  confirm: (...args: ModMethod) => callMethod(getModalApi(), 'confirm', args) ?? modalApi.confirm(...args),
  info:    (...args: ModMethod) => callMethod(getModalApi(), 'info', args) ?? modalApi.info(...args),
  success: (...args: ModMethod) => callMethod(getModalApi(), 'success', args) ?? modalApi.success(...args),
  warning: (...args: ModMethod) => callMethod(getModalApi(), 'warning', args) ?? modalApi.warning(...args),
  error:   (...args: ModMethod) => callMethod(getModalApi(), 'error', args) ?? modalApi.error(...args),
  destroyAll: () => modalApi.destroyAll(),
}
