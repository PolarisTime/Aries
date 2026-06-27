import { message as messageApi, Modal as modalApi } from 'antd'
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

let currentAntdAppApi: AntdAppApi | null = null

export function bindAntdAppApi(api: AntdAppApi | null): void {
  currentAntdAppApi = api
}

type MsgMethod = Parameters<AntdAppApi['message'][keyof AntdAppApi['message']]>
type ModMethod = Parameters<AntdAppApi['modal'][keyof AntdAppApi['modal']]>

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
  confirm: (...args: ModMethod) =>
    callMethod(getModalApi(), 'confirm', args) ?? modalApi.confirm(...args),
  info: (...args: ModMethod) =>
    callMethod(getModalApi(), 'info', args) ?? modalApi.info(...args),
  success: (...args: ModMethod) =>
    callMethod(getModalApi(), 'success', args) ?? modalApi.success(...args),
  warning: (...args: ModMethod) =>
    callMethod(getModalApi(), 'warning', args) ?? modalApi.warning(...args),
  error: (...args: ModMethod) =>
    callMethod(getModalApi(), 'error', args) ?? modalApi.error(...args),
  destroyAll: () => modalApi.destroyAll(),
}
