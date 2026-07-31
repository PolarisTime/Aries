export type PagePayload<T> = {
  content: T[]
  totalElements: number
  totalPages: number
  currentPage: number
  pageSize: number
  hasMore: boolean
}

export function pageContent<T>(page: PagePayload<T>): T[] {
  return page.content
}

export function pageTotalElements<T>(page: PagePayload<T>): number {
  return page.totalElements
}

export function pageTotalPages<T>(page: PagePayload<T>): number {
  return Math.max(page.totalPages, 1)
}

export function pageLast<T>(page: PagePayload<T>): boolean {
  return !page.hasMore
}

export function pageHasMore<T>(page: PagePayload<T>): boolean {
  return page.hasMore
}
