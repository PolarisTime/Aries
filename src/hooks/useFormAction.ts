/**
 * React 19 useActionState + Ant Design Form 适配器。
 *
 * 用法:
 *   const [state, submitAction, isPending] = useFormAction(async (values) => {
 *     await api(values)
 *     message.success('保存成功')
 *   })
 *
 *   <Form onFinish={submitAction}>
 *     <Button htmlType="submit" loading={isPending}>保存</Button>
 *   </Form>
 */
import { useActionState, useCallback } from 'react'
import type { FormInstance } from 'antd/es/form'

type FormState = {
  error: string | null
  success: boolean
}

const initialState: FormState = { error: null, success: false }

export function useFormAction<T>(
  fn: (values: T) => Promise<void>,
): [FormState, (values: T) => void, boolean] {
  const actionFn = useCallback(
    async (_prev: FormState, rawValues: unknown) => {
      try {
        await fn(rawValues as T)
        return { error: null, success: true }
      } catch (err) {
        return {
          error: err instanceof Error ? err.message : '操作失败',
          success: false,
        }
      }
    },
    [fn],
  )

  const [state, dispatch, isPending] = useActionState(actionFn, initialState)

  const submitAction = useCallback(
    (values: T) => {
      dispatch(values as unknown)
    },
    [dispatch],
  )

  return [state as FormState, submitAction, isPending]
}

export type { FormState, FormInstance }
