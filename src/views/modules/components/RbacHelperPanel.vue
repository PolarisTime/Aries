<script setup lang="ts">
import { useRouter } from 'vue-router'

defineProps<{
  title: string
  roleCount: number
  permissionCount: number
  dataScope: string
  permissionSummary: string
  showRoleLink: boolean
}>()

const router = useRouter()
</script>

<template>
  <div class="rbac-helper-panel">
    <div class="rbac-helper-title">{{ title }}</div>
    <div class="rbac-helper-grid">
      <div class="rbac-helper-item">
        <span class="rbac-helper-label">已选角色</span>
        <strong>{{ roleCount }}</strong>
      </div>
      <div class="rbac-helper-item">
        <span class="rbac-helper-label">自动汇总权限</span>
        <strong>{{ permissionCount }}</strong>
      </div>
      <div class="rbac-helper-item">
        <span class="rbac-helper-label">数据范围</span>
        <strong>{{ dataScope }}</strong>
      </div>
      <div class="rbac-helper-item">
        <span class="rbac-helper-label">权限摘要</span>
        <strong>{{ permissionSummary }}</strong>
      </div>
    </div>
    <a
      v-if="showRoleLink"
      class="rbac-helper-link"
      @click="router.push('/role-action-editor')"
    >
      前往角色权限配置，管理详细权限矩阵 →
    </a>
  </div>
</template>
