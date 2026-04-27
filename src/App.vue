<script setup lang="ts">
import { computed } from 'vue'
import enUS from 'ant-design-vue/es/locale/en_US'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import { useI18n } from 'vue-i18n'

const { locale, tm } = useI18n()

const antdLocale = computed(() => (locale.value === 'en-US' ? enUS : zhCN))
const validateMessages = computed(() => {
  const validation = tm('validation') as Record<string, unknown>

  return {
    default: String(validation.default),
    required: String(validation.required).replaceAll('{label}', '${label}'),
    enum: String(validation.enum).replaceAll('{label}', '${label}'),
    whitespace: String(validation.whitespace).replaceAll('{label}', '${label}'),
    date: replaceValidationPlaceholders(validation.date),
    types: replaceValidationPlaceholders(validation.types),
    string: replaceValidationPlaceholders(validation.string),
    number: replaceValidationPlaceholders(validation.number),
    array: replaceValidationPlaceholders(validation.array),
    pattern: replaceValidationPlaceholders(validation.pattern),
  }
})
const formConfig = computed(() => ({
  validateMessages: validateMessages.value,
}))

function replaceValidationPlaceholders(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object') {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      String(item)
        .replaceAll('{label}', '${label}')
        .replaceAll('{len}', '${len}')
        .replaceAll('{min}', '${min}')
        .replaceAll('{max}', '${max}'),
    ]),
  )
}
</script>

<template>
  <a-config-provider :locale="antdLocale" :form="formConfig">
    <router-view />
  </a-config-provider>
</template>
