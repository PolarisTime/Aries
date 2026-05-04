<script setup lang="ts">
import { MenuOutlined } from '@ant-design/icons-vue'

interface SettingItem {
  key: string
  title: string
  visible: boolean
}

defineProps<{
  label: string
  items: SettingItem[]
  getItemClass: (key: string) => string
  onDragStart: (key: string, event: DragEvent) => void
  onDragOver: (key: string, event: DragEvent) => void
  onDrop: (key: string) => void
  onDragEnd: () => void
  onVisibleChange: (key: string, checked: boolean) => void
  onReset: () => void
}>()
</script>

<template>
  <a-popover trigger="click" placement="bottomRight" overlay-class-name="column-setting-popover">
    <template #content>
      <div class="column-setting-panel">
        <div class="column-setting-header">
          <span>{{ label }}</span>
          <span class="table-action-btn" @click="onReset">恢复默认</span>
        </div>
        <div class="column-setting-list">
          <div
            v-for="item in items"
            :key="item.key"
            :class="['column-setting-item', getItemClass(item.key)]"
            @dragover="onDragOver(item.key, $event)"
            @drop="onDrop(item.key)"
          >
            <span
              class="column-setting-drag-handle"
              draggable="true"
              title="拖拽排序"
              @dragstart="onDragStart(item.key, $event)"
              @dragend="onDragEnd"
            >
              <MenuOutlined />
            </span>
            <a-checkbox
              :checked="item.visible"
              @change="onVisibleChange(item.key, ($event.target as HTMLInputElement).checked)"
            >
              {{ item.title }}
            </a-checkbox>
          </div>
        </div>
      </div>
    </template>
    <a-button class="overlay-action-button">{{ label }}</a-button>
  </a-popover>
</template>
