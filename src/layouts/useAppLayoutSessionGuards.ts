import type { NavigateFn } from '@tanstack/react-router'
import { useEffect } from 'react'

interface Options {
  locationPathname: string
  navigate: NavigateFn
  authReady: boolean
  token: string
}

export function useAppLayoutSessionGuards(options: Options) {
  useEffect(() => {
    if (!options.authReady) {
      return
    }
    // react-doctor-disable-next-line react-doctor/no-event-handler -- 登录态守卫必须响应 authReady/token/location 的外部状态变化。
    if (!options.token && options.locationPathname !== '/login') {
      void options.navigate({ to: '/login' })
    }
  }, [
    options.authReady,
    options.locationPathname,
    options.navigate,
    options.token,
  ])
}
