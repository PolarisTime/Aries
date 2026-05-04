<script setup lang="ts">
import type { Component } from 'vue'
import { computed } from 'vue'

export interface ActionItem {
  key: string
  label: string
  icon?: Component
  danger?: boolean
  confirm?: string
  visible?: boolean
  disabled?: boolean
  onClick: () => void
}

const props = withDefaults(defineProps<{
  items?: ActionItem[]
}>(), {
  items: () => []
})

const visibleItems = computed(() => props.items.filter(item => item.visible !== false))

const hasAnyVisible = computed(() => visibleItems.value.length > 0)
</script>

<template>
  <div v-if="hasAnyVisible" class="table-actions" @click.stop>
    <template v-for="(item, index) in visibleItems" :key="item.key">
      <a-divider v-if="index > 0" type="vertical" />
      <a-popconfirm
        v-if="item.confirm"
        :title="item.confirm"
        @confirm="item.onClick"
      >
        <span
          class="table-action-btn"
          :class="{
            'table-action-danger': item.danger,
            'table-action-disabled': item.disabled
          }"
          @click="!item.disabled && !item.confirm && item.onClick()"
        >
          <component :is="item.icon" v-if="item.icon" />
          <span>{{ item.label }}</span>
        </span>
      </a-popconfirm>
      <span
        v-else
        class="table-action-btn"
        :class="{
          'table-action-danger': item.danger,
          'table-action-disabled': item.disabled
        }"
        @click="!item.disabled && item.onClick()"
      >
        <component :is="item.icon" v-if="item.icon" />
        <span>{{ item.label }}</span>
      </span>
    </template>
  </div>
  <span v-else class="table-action-empty">--</span>
</template>
