<script setup lang="ts">
import { computed } from 'vue'
import { usePermissionStore } from '@/stores/permission'

const props = defineProps<{
  resource: string
  action: string
}>()

const permissionStore = usePermissionStore()

const visible = computed(() => permissionStore.can(props.resource, props.action))
</script>

<template>
  <a-button v-if="visible" v-bind="$attrs">
    <slot />
  </a-button>
</template>
