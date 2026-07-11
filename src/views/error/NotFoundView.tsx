import { AppResult } from '@/components/AppResult'

export function NotFoundView() {
  return (
    <AppResult className="app-result--page" status="404" showHomeButton />
  )
}
