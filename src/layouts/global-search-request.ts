export function normalizeGlobalSearchKeyword(value: string): string {
  return value.trim()
}

export function shouldSearchGlobalKeyword(value: string): boolean {
  return normalizeGlobalSearchKeyword(value).length >= 2
}

export interface GlobalSearchDebouncer {
  schedule: (keyword: string, dispatch: (value: string) => void) => void
  cancel: () => void
}

export function createGlobalSearchDebouncer(
  delayMs: number,
): GlobalSearchDebouncer {
  let timer: ReturnType<typeof setTimeout> | null = null

  return {
    schedule(keyword: string, dispatch: (value: string) => void) {
      if (timer !== null) {
        clearTimeout(timer)
      }

      timer = setTimeout(() => {
        timer = null
        dispatch(keyword)
      }, delayMs)
    },
    cancel() {
      if (timer === null) {
        return
      }

      clearTimeout(timer)
      timer = null
    },
  }
}
