<script setup lang="ts">
import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import dayjs from 'dayjs'
import { useI18n } from 'vue-i18n'
import { getDashboardSummary } from '@/api/dashboard'
import { appTitle } from '@/utils/env'

const { t } = useI18n()

const summaryQuery = useQuery({
  queryKey: ['dashboard-summary'],
  queryFn: getDashboardSummary,
})

const summary = computed(() => summaryQuery.data.value)
const hasError = computed(() => summaryQuery.isError.value)

const overviewRows = computed(() => [
  {
    label: t('dashboard.fields.company'),
    value: summary.value?.companyName || t('dashboard.values.unconfigured'),
  },
  {
    label: t('dashboard.fields.role'),
    value: summary.value?.roleName || t('dashboard.values.unknown'),
  },
  {
    label: t('dashboard.fields.loginName'),
    value: summary.value?.loginName || t('dashboard.values.unknown'),
  },
  {
    label: t('dashboard.fields.mfa'),
    value: summary.value?.totpEnabled ? t('dashboard.values.enabled') : t('dashboard.values.disabled'),
  },
  {
    label: t('dashboard.fields.actions'),
    value: String(summary.value?.actionCount ?? 0),
  },
  {
    label: t('dashboard.fields.visibleMenus'),
    value: String(summary.value?.visibleMenuCount ?? 0),
  },
])

const signalItems = computed(() => [
  {
    color: 'green',
    children: `${t('dashboard.fields.serverTime')}：${formatDateTime(summary.value?.serverTime)}`,
  },
  {
    color: 'blue',
    children: `${t('dashboard.fields.apiState')}：${t('dashboard.values.online')}`,
  },
  {
    color: 'blue',
    children: `${t('dashboard.fields.company')}：${summary.value?.companyName || t('dashboard.values.unconfigured')}`,
  },
])

function formatDateTime(value?: string | null) {
  if (!value) {
    return t('dashboard.values.unknown')
  }

  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm:ss') : value
}
</script>

<template>
  <div class="page-stack">
    <a-card :bordered="false" class="dashboard-card">
      <div class="dashboard-title">{{ t('dashboard.title') }}</div>
      <div class="dashboard-subtitle">
        {{ t('dashboard.subtitle', { appTitle }) }}
      </div>
    </a-card>

    <a-alert
      v-if="hasError"
      type="error"
      show-icon
      :message="t('dashboard.alerts.loadFailed')"
    />

    <a-row :gutter="[12, 12]">
      <a-col :xs="24" :sm="12" :xl="6">
        <a-card class="dashboard-stat-card" :title="t('dashboard.cards.currentUser')">
          <strong>{{ summary?.userName || t('dashboard.values.unknown') }}</strong>
          <p class="card-note">{{ t('dashboard.notes.currentUser') }}</p>
        </a-card>
      </a-col>
      <a-col :xs="24" :sm="12" :xl="6">
        <a-card class="dashboard-stat-card" :title="t('dashboard.cards.modules')">
          <strong>{{ summary?.moduleCount ?? 0 }}</strong>
          <p class="card-note">{{ t('dashboard.notes.modules') }}</p>
        </a-card>
      </a-col>
      <a-col :xs="24" :sm="12" :xl="6">
        <a-card class="dashboard-stat-card" :title="t('dashboard.cards.sessions')">
          <strong>{{ summary?.activeSessionCount ?? 0 }}</strong>
          <p class="card-note">{{ t('dashboard.notes.sessions') }}</p>
        </a-card>
      </a-col>
      <a-col :xs="24" :sm="12" :xl="6">
        <a-card class="dashboard-stat-card" :title="t('dashboard.cards.lastLogin')">
          <strong>{{ formatDateTime(summary?.lastLoginAt) }}</strong>
          <p class="card-note">{{ t('dashboard.notes.lastLogin') }}</p>
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="[12, 12]">
      <a-col :xs="24" :xl="15">
        <a-card :title="t('dashboard.sections.overview')">
          <a-alert
            type="info"
            show-icon
            :message="t('dashboard.alerts.title')"
            :description="t('dashboard.alerts.description')"
          />
          <a-descriptions
            :column="1"
            size="small"
            class="dashboard-descriptions"
          >
            <a-descriptions-item
              v-for="item in overviewRows"
              :key="item.label"
              :label="item.label"
            >
              {{ item.value }}
            </a-descriptions-item>
          </a-descriptions>
        </a-card>
      </a-col>
      <a-col :xs="24" :xl="9">
        <a-card :title="t('dashboard.sections.signals')">
          <a-timeline :items="signalItems" />
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>
