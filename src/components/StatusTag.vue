<script setup lang="ts">
import { computed } from 'vue'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
  FileTextOutlined
} from '@ant-design/icons-vue'

const props = withDefaults(defineProps<{
  status: string
  color?: string
}>(), {
  color: 'default'
})

const icon = computed(() => {
  const c = props.color
  if (c === 'success' || c === 'green') return CheckCircleOutlined
  if (c === 'error' || c === 'red') return CloseCircleOutlined
  if (c === 'warning' || c === 'orange') return ExclamationCircleOutlined
  if (c === 'processing') return SyncOutlined
  return FileTextOutlined
})

const spin = computed(() => props.color === 'processing')
</script>

<template>
  <a-tag :color="color">
    <component :is="icon" :spin="spin" />
    <span>{{ status }}</span>
  </a-tag>
</template>

<style scoped>
.ant-tag .anticon {
  margin-right: 4px;
}
</style>
