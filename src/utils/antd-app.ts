import type AntdApp from 'antd/es/app'
import modalApi from 'antd/es/modal'

type AntdAppApi = ReturnType<typeof AntdApp.useApp>
type UnknownMethod = (...args: unknown[]) => unknown

function isUnknownMethod(value: unknown): value is UnknownMethod {
  return typeof value === 'function'
}

function callMethod<Api, K extends keyof Api>(
  api: Api | undefined,
  method: K,
  args: unknown[],
  fallbackImport?: () => Promise<{ default: Api }>,
): unknown {
  if (api) {
    const callable = api[method]
    if (isUnknownMethod(callable)) {
      return callable(...args)
    }
  }
  if (fallbackImport) {
    void fallbackImport().then((mod) => {
      const callable = mod.default[method]
      if (isUnknownMethod(callable)) {
        callable(...args)
      }
    })
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
    callMethod(
      getMessageApi(),
      'success',
      args,
      () => import('antd/es/message'),
    ),
  error: (...args: MsgMethod) =>
    callMethod(getMessageApi(), 'error', args, () => import('antd/es/message')),
  warning: (...args: MsgMethod) =>
    callMethod(
      getMessageApi(),
      'warning',
      args,
      () => import('antd/es/message'),
    ),
  info: (...args: MsgMethod) =>
    callMethod(getMessageApi(), 'info', args, () => import('antd/es/message')),
  loading: (...args: MsgMethod) =>
    callMethod(
      getMessageApi(),
      'loading',
      args,
      () => import('antd/es/message'),
    ),
  destroy: (...args: MsgMethod) =>
    callMethod(
      getMessageApi(),
      'destroy',
      args,
      () => import('antd/es/message'),
    ),
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
