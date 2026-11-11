import { message as messageApi, notification as notificationApi } from 'antd'
import type AntdApp from 'antd/es/app'

type AntdAppApi = ReturnType<typeof AntdApp.useApp>
type UnknownMethod = (...args: unknown[]) => unknown

function isUnknownMethod(value: unknown): value is UnknownMethod {
  return typeof value === 'function'
}

function callMethod<Api, K extends keyof Api>(
  api: Api | undefined,
  method: K,
  args: unknown[],
  fallbackApi?: Api,
): unknown {
  if (api) {
    const callable = api[method]
    if (isUnknownMethod(callable)) {
      return callable(...args)
    }
  }
  if (fallbackApi) {
    const callable = fallbackApi[method]
    if (isUnknownMethod(callable)) {
      return callable(...args)
    }
  }
  return undefined
}

function getMessageApi() {
  return currentAntdAppApi?.message
}

function getModalApi() {
  return currentAntdAppApi?.modal
}

function getNotificationApi() {
  return currentAntdAppApi?.notification
}

let currentAntdAppApi: AntdAppApi | null = null

export function bindAntdAppApi(api: AntdAppApi | null): void {
  currentAntdAppApi = api
}

type MsgMethod = Parameters<AntdAppApi['message'][keyof AntdAppApi['message']]>
type ModMethod = Parameters<AntdAppApi['modal'][keyof AntdAppApi['modal']]>
type NotifMethod = Parameters<
  AntdAppApi['notification'][keyof AntdAppApi['notification']]
>

export const message = {
  success: (...args: MsgMethod) =>
    callMethod(getMessageApi(), 'success', args, messageApi),
  error: (...args: MsgMethod) =>
    callMethod(getMessageApi(), 'error', args, messageApi),
  warning: (...args: MsgMethod) =>
    callMethod(getMessageApi(), 'warning', args, messageApi),
  info: (...args: MsgMethod) =>
    callMethod(getMessageApi(), 'info', args, messageApi),
  loading: (...args: MsgMethod) =>
    callMethod(getMessageApi(), 'loading', args, messageApi),
  destroy: (...args: MsgMethod) =>
    callMethod(getMessageApi(), 'destroy', args, messageApi),
}

export const modal = {
  confirm: (...args: ModMethod) => callMethod(getModalApi(), 'confirm', args),
  info: (...args: ModMethod) => callMethod(getModalApi(), 'info', args),
  success: (...args: ModMethod) => callMethod(getModalApi(), 'success', args),
  warning: (...args: ModMethod) => callMethod(getModalApi(), 'warning', args),
  error: (...args: ModMethod) => callMethod(getModalApi(), 'error', args),
}

/**
 * 卡片式通知（右上角）。
 *
 * <p>与 {@link message} 的分工是**信息量**，不是强调程度：</p>
 * <ul>
 *   <li>`message`（toast）= 操作回执。点完就知道结果，3 秒内不需要再理解它；
 *       例如"已保存""已复制"。</li>
 *   <li>`notification`（卡片）= 需要**读完或要操作**的结果。多行清单（批量失败逐条原因、
 *       导入逐行错误）、带按钮的提示（撤销删除），以及用户可能要对照着改数据的说明。</li>
 * </ul>
 *
 * <p>和 {@link message} 一样先走 antd `App` 实例（跟着 `ConfigProvider` 的主题与语言），
 * 拿不到实例时（React 树外，例如拦截器）退回 antd 静态 API。</p>
 */
export const notification = {
  open: (...args: NotifMethod) =>
    callMethod(getNotificationApi(), 'open', args, notificationApi),
  success: (...args: NotifMethod) =>
    callMethod(getNotificationApi(), 'success', args, notificationApi),
  info: (...args: NotifMethod) =>
    callMethod(getNotificationApi(), 'info', args, notificationApi),
  warning: (...args: NotifMethod) =>
    callMethod(getNotificationApi(), 'warning', args, notificationApi),
  error: (...args: NotifMethod) =>
    callMethod(getNotificationApi(), 'error', args, notificationApi),
  destroy: (...args: NotifMethod) =>
    callMethod(getNotificationApi(), 'destroy', args, notificationApi),
}
