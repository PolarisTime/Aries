import { queryClient } from '@/lib/query-client'
import type { LoginUser } from '@/shared/schemas'

function getIdentityKey(user: LoginUser | null | undefined) {
  return user == null ? '' : String(user.id)
}

export async function clearUserQueryCache() {
  await queryClient.cancelQueries()
  queryClient.clear()
}

export async function clearUserQueryCacheOnIdentityChange(
  previousUser: LoginUser | null | undefined,
  nextUser: LoginUser | null | undefined,
) {
  if (getIdentityKey(previousUser) === getIdentityKey(nextUser)) {
    return
  }
  await clearUserQueryCache()
}
