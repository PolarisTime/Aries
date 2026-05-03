import { computed, type Ref } from 'vue'

export function useModuleListState(listTotal: Ref<number>) {
  const masterTableSummary = computed(() => `共 ${listTotal.value} 条记录`)

  return {
    masterTableSummary,
  }
}
