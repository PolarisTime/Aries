import { asArray } from '@/utils/type-narrowing'

export type PagePayload<T> = {
  content?: T[]
  records?: T[]
  totalElements?: number
  totalPages?: number
  currentPage?: number
  page?: number
  pageSize?: number
  size?: number
  last?: boolean
}

export function pageContent<T>(page: PagePayload<T> | null | undefined): T[] {
  return asArray<T>(page?.content ?? page?.records)
}

export function pageTotalElements<T>(
  page: PagePayload<T> | null | undefined,
): number {
  return Number(page?.totalElements ?? 0)
}

export function pageTotalPages<T>(
  page: PagePayload<T> | null | undefined,
): number {
  return Math.max(Number(page?.totalPages ?? 1), 1)
}

export function pageLast<T>(page: PagePayload<T> | null | undefined): boolean {
  if (page?.last != null) {
    return Boolean(page.last)
  }
  return (
    Number(page?.currentPage ?? page?.page ?? 0) >= pageTotalPages(page) - 1
  )
}
