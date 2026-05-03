import { onBeforeUnmount, onMounted, ref } from 'vue'

export function useModuleTableErrors() {
  const tableErrorMessage = ref('')

  function handleTableError(event: Event) {
    const detail = (event as Event & { detail?: { code: number; message: string } }).detail
    if (detail?.message) {
      tableErrorMessage.value = detail.message
    }
  }

  function clearTableError() {
    tableErrorMessage.value = ''
  }

  onMounted(() => {
    window.addEventListener('leo:table-error', handleTableError)
    window.addEventListener('leo:table-error-cleared', clearTableError)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('leo:table-error', handleTableError)
    window.removeEventListener('leo:table-error-cleared', clearTableError)
  })

  return {
    clearTableError,
    tableErrorMessage,
  }
}
