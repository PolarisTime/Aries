<script setup lang="ts">
defineProps<{
  itemCount: number
  weight: string
  amount: string
  showAmount: boolean
}>()
</script>

<template>
  <div class="editor-items-summary editor-items-summary-inline">
    <span>明细数 {{ itemCount }}</span>
    <span>总重量（吨） {{ weight }}</span>
    <span v-if="showAmount">金额 {{ amount }}</span>
  </div>
</template>
