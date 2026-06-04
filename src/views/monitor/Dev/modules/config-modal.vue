<script lang="ts">
export default {
  name: 'ConfigModal'
}
</script>

/* eslint-disable */
// @ts-nocheck
<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  NCard,
  NTabs,
  NTabPane,
  NDivider,
  NScrollbar,
  NSpin,
  NEmpty,
  NAlert
} from 'naive-ui'
import { fetchConfig } from '@/service/api'

const props = defineProps<{
  serverId: string | number
  title: string
}>()

// 数据相关
interface ConfigData {
  [key: string]: string
}

const configData = ref<[string, string][]>([])
const activeTab = ref(0)
const loading = ref(false)
const error = ref<string | null>(null)

// 监听serverId变化，获取配置数据
watch(
  () => props.serverId,
  async (newId) => {
    if (newId) {
      loading.value = true
      error.value = null
      try {
        const response = await fetchConfig(typeof newId === 'string' ? parseInt(newId, 10) : newId)
        if (response?.response?.data) {
          configData.value = Object.entries(response.response.data) as [string, string][]
        } else {
          error.value = '获取配置数据失败: 服务器返回数据格式错误'
        }
      } catch (err) {
        error.value = '获取配置数据失败: ' + (err as Error).message
        console.error('获取配置失败:', err)
      } finally {
        loading.value = false
      }
    }
  },
  { immediate: true }
)

// 格式化配置数据
const formatConfigData = (data: string) => {
  try {
    // 尝试解析JSON
    const parsed = JSON.parse(data)
    return JSON.stringify(parsed, null, 2)
  } catch {
    // 如果不是JSON,直接返回原始数据
    return data
  }
}
</script>

<template>
  <NCard :bordered="false">
    <template #header>
      <div class="text-16px font-bold">{{ title }} 服务器配置</div>
    </template>

    <NDivider />

    <NSpin :show="loading">
      <div v-if="error" class="flex justify-center items-center h-300px">
        <NAlert type="error" :title="error" />
      </div>
      <div v-else-if="configData.length" class="flex gap-4">
        <NTabs
          v-model:value="activeTab"
          type="line"
          placement="left"
        >
          <NTabPane
            v-for="(data, index) in configData"
            :key="data[0]"
            :name="index"
            :tab="data[1]?.split('server_type_')[1]?.split('\n')[0] || data[0]"
          >
            <NScrollbar >
              <pre class="whitespace-pre-wrap code-block">{{ formatConfigData(data[1]) }}</pre>
            </NScrollbar>
          </NTabPane>
        </NTabs>
      </div>
      <div v-else class="flex justify-center items-center h-300px">
        <NEmpty description="暂无配置数据" />
      </div>
    </NSpin>
  </NCard>
</template>

<style scoped>


</style>
