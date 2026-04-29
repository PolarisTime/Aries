<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Tag } from 'ant-design-vue'
import { ArrowLeftOutlined } from '@ant-design/icons-vue'
import { getApiKeyDetail, listApiKeyActionOptions, listApiKeyResourceOptions } from '@/api/api-keys'
import type { ApiKeyActionOption, ApiKeyRecord, ApiKeyResourceOption } from '@/api/api-keys'
import { useRequestError } from '@/composables/use-request-error'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const record = ref<ApiKeyRecord | null>(null)
const resourceOptions = ref<ApiKeyResourceOption[]>([])
const actionOptions = ref<ApiKeyActionOption[]>([])
const showRequestError = useRequestError()

const id = computed(() => Number(route.params.id))

function getStatusColor(status: string) {
  if (status === '有效') return 'green'
  if (status === '已过期') return 'orange'
  if (status === '已禁用') return 'red'
  return 'default'
}

function getAllowedResourceText(resources: string[]) {
  if (!resources?.length) return '未限制'
  const map = new Map(resourceOptions.value.map((item) => [item.code, item.title]))
  return resources.map((item) => map.get(item) || item).join('、')
}

function getAllowedActionText(actions: string[]) {
  if (!actions?.length) return '未设置'
  const map = new Map(actionOptions.value.map((item) => [item.code, item.title]))
  return actions.map((item) => map.get(item) || item).join('、')
}

async function loadDetail() {
  loading.value = true
  try {
    record.value = await getApiKeyDetail(id.value)
  } catch (error) {
    showRequestError(error, '加载详情失败')
  } finally {
    loading.value = false
  }
}

async function loadOptions() {
  try {
    const [resources, actions] = await Promise.all([
      listApiKeyResourceOptions(),
      listApiKeyActionOptions(),
    ])
    resourceOptions.value = resources
    actionOptions.value = actions
  } catch {
    // silent
  }
}

function goBack() {
  router.back()
}

watch(id, (newId) => {
  if (newId) loadDetail()
})

onMounted(() => {
  loadDetail()
  loadOptions()
})
</script>

<template>
  <div class="api-key-detail-page">
    <a-page-header
      title="API Key 详情"
      @back="goBack"
    >
      <template #backIcon><ArrowLeftOutlined /></template>
    </a-page-header>

    <a-spin :spinning="loading">
      <a-card v-if="record" :bordered="false">
        <a-descriptions bordered :column="2" size="small">
          <a-descriptions-item label="密钥名称">{{ record.keyName }}</a-descriptions-item>
          <a-descriptions-item label="使用范围">{{ record.usageScope }}</a-descriptions-item>
          <a-descriptions-item label="允许资源">{{ getAllowedResourceText(record.allowedResources) }}</a-descriptions-item>
          <a-descriptions-item label="允许动作">{{ getAllowedActionText(record.allowedActions) }}</a-descriptions-item>
          <a-descriptions-item label="所属用户">
            {{ record.userName || record.loginName }}（{{ record.loginName }}）
          </a-descriptions-item>
          <a-descriptions-item label="用户 ID">{{ record.userId }}</a-descriptions-item>
          <a-descriptions-item label="密钥前缀">
            <a-typography-paragraph copyable :code="true" style="margin: 0">
              {{ record.keyPrefix }}
            </a-typography-paragraph>
          </a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="getStatusColor(record.status)">
              {{ record.status }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="创建时间">{{ record.createdAt }}</a-descriptions-item>
          <a-descriptions-item label="过期时间">
            {{ record.expiresAt || '永不过期' }}
          </a-descriptions-item>
          <a-descriptions-item label="最后使用">
            {{ record.lastUsedAt || '--' }}
          </a-descriptions-item>
        </a-descriptions>
      </a-card>
      <a-empty v-else description="未找到该 API Key" />
    </a-spin>
  </div>
</template>

<style scoped>
.api-key-detail-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
