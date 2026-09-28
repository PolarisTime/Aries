export function downloadBlob(blob: Blob, fallbackFilename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fallbackFilename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

/**
 * 从 `Content-Disposition` 响应头解析文件名，解析失败时返回 `fallbackFilename`。
 *
 * <p>后端使用 Spring 的 {@code ContentDisposition.attachment().filename(name, UTF_8)}，
 * 非 ASCII 文件名会以 RFC 5987 的 `filename*=UTF-8''...` 形式给出，因此优先解析该参数，
 * 再退回普通的 `filename="..."`。</p>
 */
export function resolveDownloadFileName(
  dispositionHeader: unknown,
  fallbackFilename: string,
): string {
  const header = dispositionHeader == null ? '' : String(dispositionHeader)
  const encoded = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header)?.[1]
  if (encoded) {
    try {
      return decodeURIComponent(encoded.replace(/^"|"$/g, ''))
    } catch {
      // 继续尝试普通 filename 参数
    }
  }
  return /filename\s*=\s*"([^"]+)"/i.exec(header)?.[1] || fallbackFilename
}
