import type { NavigateFn } from '@tanstack/react-router'
import { useEffect } from 'react'

interface UserLike {
  forceTotpSetup?: boolean
  totpEnabled?: boolean
}

interface Options {
  locationPathname: string
  navigate: NavigateFn
  token: string
  user: UserLike | null | undefined
}

export function useAppLayoutSessionGuards(options: Options) {
  useEffect(() => {
    if (!options.token && options.locationPathname !== '/login') {
      options.navigate({ to: '/login' })
    }
  }, [options.locationPathname, options.navigate, options.token])

  useEffect(() => {
    const user = options.user
    if (!user || user.totpEnabled === true || user.forceTotpSetup !== true) {
      return
    }

    const redirectTarget = `${options.locationPathname}${window.location.search || ''}`
    options.navigate({
      to: `/setup-2fa?redirect=${encodeURIComponent(redirectTarget)}` as '/',
    })
  }, [options.locationPathname, options.navigate, options.user])
}
