
<script setup lang="ts">
import { ref, watch } from 'vue';
import { NModal, NSpin, NButton, NRadio } from 'naive-ui';
import { fetchServerRepos, fetchServerRepoCharts } from '@/service/api';
import { handleApiResponseError, handleApiCatchError } from '@/utils/common';

defineOptions({
  name: 'UpdateServerModal',
});

interface Props {
  visible: boolean;
  serverId?: number;
  mode?: 'update' | 'sync'; // update=更新服务器, sync=同步云服务器
}

const props = withDefaults(defineProps<Props>(), {
  serverId: undefined,
  mode: 'update',
});

interface Emits {
  (e: 'update:visible', value: boolean): void;
  (e: 'confirm', repo: any): void;
}

const emit = defineEmits<Emits>();

const loading = ref(false);
const confirmLoading = ref(false);
const error = ref<string>('');
const repos = ref<any[]>([]);
const selectedRepo = ref<any>(null);
const charts = ref<any[]>([]);
const selectedChart = ref<any>(null);
const loadingCharts = ref(false);
const chartsError = ref<string>('');

// 监听 visible 变化，打开时加载数据
watch(
  () => props.visible,
  (newValue) => {
    if (newValue) {
      loadRepos();
    } else {
      // 关闭时重置状态
      resetState();
    }
  }
);

/**
 * 加载仓库列表
 */
async function loadRepos() {
  loading.value = true;
  error.value = '';
  repos.value = [];
  selectedRepo.value = null;

  try {
    const response = await fetchServerRepos();

    if (!handleApiResponseError(response, '获取仓库列表')) {
      // 处理响应数据
      const responseData = response?.data || response?.response?.data || response;

      if (Array.isArray(responseData)) {
        repos.value = responseData;
      } else if (responseData?.data && Array.isArray(responseData.data)) {
        repos.value = responseData.data;
      } else if (responseData?.rows && Array.isArray(responseData.rows)) {
        repos.value = responseData.rows;
      } else if (responseData?.list && Array.isArray(responseData.list)) {
        repos.value = responseData.list;
      } else {
        repos.value = [];
      }

      if (repos.value.length === 0) {
        error.value = '暂无仓库数据';
      }
    } else {
      error.value = '获取仓库列表失败';
    }
  } catch (err) {
    handleApiCatchError(err, '获取仓库列表');
    error.value = '获取仓库列表失败';
  } finally {
    loading.value = false;
  }
}

/**
 * 选择仓库
 */
async function handleSelectRepo(repo: any) {
  selectedRepo.value = repo;
  selectedChart.value = null; // 重置选中的包
  await loadCharts(repo);
}

/**
 * 加载仓库下的包列表
 */
async function loadCharts(repo: any) {
  if (!repo?.repo_id) {
    chartsError.value = '缺少必要参数';
    return;
  }

  loadingCharts.value = true;
  chartsError.value = '';
  charts.value = [];

  try {
    const response = await fetchServerRepoCharts({
      repoId: repo.repo_id
    });

    if (!handleApiResponseError(response, '获取包列表')) {
      const responseData = response?.data || response?.response?.data || response;

      if (Array.isArray(responseData)) {
        charts.value = responseData;
      } else if (responseData?.data && Array.isArray(responseData.data)) {
        charts.value = responseData.data;
      } else if (responseData?.rows && Array.isArray(responseData.rows)) {
        charts.value = responseData.rows;
      } else if (responseData?.list && Array.isArray(responseData.list)) {
        charts.value = responseData.list;
      } else {
        charts.value = [];
      }

      if (charts.value.length === 0) {
        chartsError.value = '该仓库下暂无包数据';
      }
    } else {
      chartsError.value = '获取包列表失败';
    }
  } catch (err) {
    handleApiCatchError(err, '获取包列表');
    chartsError.value = '获取包列表失败';
  } finally {
    loadingCharts.value = false;
  }
}

/**
 * 选择包
 */
function handleSelectChart(chart: any) {
  selectedChart.value = chart;
}

/**
 * 确认更新
 */
async function handleConfirm() {
  if (!selectedRepo.value) {
    window.$message?.warning('请先选择仓库');
    return;
  }

  if (!selectedChart.value) {
    window.$message?.warning('请先选择包');
    return;
  }

  confirmLoading.value = true;
  try {
    emit('confirm', {
      repo: selectedRepo.value,
      chart: selectedChart.value
    });
    // 注意：这里不自动关闭弹框，由父组件决定何时关闭
  } catch (err) {
    handleApiCatchError(err, '操作');
  } finally {
    confirmLoading.value = false;
  }
}

/**
 * 处理 NModal 的 update:show 事件
 */
function handleUpdateShow(value: boolean) {
  emit('update:visible', value);
}

/**
 * 关闭弹框
 */
function handleClose() {
  emit('update:visible', false);
}

/**
 * 重置状态
 */
function resetState() {
  loading.value = false;
  confirmLoading.value = false;
  error.value = '';
  repos.value = [];
  selectedRepo.value = null;
  charts.value = [];
  selectedChart.value = null;
  loadingCharts.value = false;
  chartsError.value = '';
}
</script>


<template>
  <NModal
    :show="props.visible"
    preset="card"
    :title="props.mode === 'sync' ? '同步云服务器' : '更新服务器'"
    :bordered="false"
    :segmented="false"
    style="width: 1200px;"
    @update:show="handleUpdateShow"
    @close="handleClose"
  >
    <div v-if="loading" class="flex justify-center items-center py-12">
      <NSpin size="large" />
      <span class="ml-4 text-lg" style="color: var(--n-text-color);">加载中...</span>
    </div>

    <div v-else-if="error" class="text-center py-12">
      <div class="mb-4" style="color: var(--n-error-color);">
        <icon-mdi-alert-circle class="w-16 h-16 mx-auto" />
      </div>
      <p class="text-lg" style="color: var(--n-error-color);">{{ error }}</p>
    </div>

    <div v-else-if="repos && repos.length > 0" class="modal-content-wrapper">
      <!-- 左右分栏布局 -->
      <div class="flex gap-4 h-[600px]">
        <!-- 左侧：仓库列表 -->
        <div class="flex-1 flex flex-col border-r pr-4" style="border-color: var(--n-divider-color);">
          <div class="mb-4">
            <h3 class="text-base font-semibold mb-1" style="color: var(--n-text-color);">查看 ACR 仓库列表</h3>
            <p class="text-xs" style="color: var(--n-text-color-2);">请从左侧选择要更新的仓库</p>
          </div>

          <div class="repos-list flex-1 overflow-y-auto">
            <div
              v-for="(repo, index) in repos"
              :key="index"
              class="repo-item flex items-center justify-between p-4 mb-3 rounded-lg border hover:shadow-md transition-all cursor-pointer"
              :style="{
                borderColor: selectedRepo?.repo_id === repo.repo_id ? 'var(--n-primary-color)' : 'var(--n-border-color)',
                backgroundColor: selectedRepo?.repo_id === repo.repo_id ? 'var(--n-primary-color-pressed)' : 'transparent'
              }"
              :class="{ 'shadow-md': selectedRepo?.repo_id === repo.repo_id }"
              @click="handleSelectRepo(repo)"
            >
              <div class="flex items-center space-x-3 flex-1 min-w-0">
                <div class="flex-shrink-0">
                  <icon-mdi-package-variant class="text-2xl text-primary-500" />
                </div>
                <div class="flex-1 min-w-0">
                  <h4 class="font-medium text-sm truncate mb-1" style="color: var(--n-text-color);">
                    {{ repo.repo_name || repo.name || `仓库 ${index + 1}` }}
                  </h4>
                  <p v-if="repo.repo_id" class="text-xs truncate" style="color: var(--n-text-color-2);">
                    ID: {{ repo.repo_id }}
                  </p>
                </div>
              </div>
              <div class="flex-shrink-0 ml-3">
                <NRadio :checked="selectedRepo?.repo_id === repo.repo_id" />
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧：Chart 版本列表 -->
        <div class="flex-1 flex flex-col pl-4">
          <div class="mb-4 flex-shrink-0">
            <h3 class="text-base font-semibold mb-1" style="color: var(--n-text-color);">
              查看 Chart 版本列表
              <span v-if="selectedRepo" class="text-sm font-normal ml-2" style="color: var(--n-primary-color);">
                (server)
              </span>
            </h3>
            <p class="text-xs" style="color: var(--n-text-color-2);">
              请从右侧选择 server 仓库下的 Chart 版本
            </p>
          </div>

          <div class="flex-1 overflow-y-auto relative charts-container">
            <NSpin :show="loadingCharts" class="h-full">
              <div v-if="!selectedRepo" class="flex items-center justify-center h-full">
                <div class="text-center">
                  <div class="mb-2" style="color: var(--n-text-color-3);">
                    <icon-mdi-arrow-left class="w-16 h-16 mx-auto" />
                  </div>
                  <p class="text-sm" style="color: var(--n-text-color-2);">请先选择左侧的仓库</p>
                </div>
              </div>

              <div v-else-if="chartsError" class="flex items-center justify-center h-full">
                <div class="text-center">
                  <div class="mb-2" style="color: var(--n-error-color);">
                    <icon-mdi-alert-circle class="w-12 h-12 mx-auto" />
                  </div>
                  <p class="text-sm" style="color: var(--n-error-color);">{{ chartsError }}</p>
                </div>
              </div>

              <div v-else-if="charts && charts.length > 0" class="charts-list h-full overflow-y-auto">
                <div
                  v-for="(chart, index) in charts"
                  :key="index"
                  class="chart-item flex items-center justify-between p-4 mb-3 rounded-lg border hover:shadow-md transition-all cursor-pointer"
                  :style="{
                    borderColor: selectedChart === chart ? 'var(--n-primary-color)' : 'var(--n-border-color)',
                    backgroundColor: selectedChart === chart ? 'var(--n-primary-color-pressed)' : 'transparent'
                  }"
                  :class="{ 'shadow-md': selectedChart === chart }"
                  @click="handleSelectChart(chart)"
                >
                  <div class="flex items-center space-x-3 flex-1 min-w-0">
                    <div class="flex-shrink-0">
                      <icon-mdi-book-open-page-variant class="text-2xl text-primary-500" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 mb-1">
                        <h4 class="font-medium text-sm" style="color: var(--n-text-color);">
                          {{ chart.game_name || '未知游戏' }}
                        </h4>
                        <span class="text-xs" style="color: var(--n-text-color-2);">/</span>
                        <span class="text-sm" style="color: var(--n-text-color-1);">
                          {{ chart.repo_name || chart.name || selectedRepo?.repo_name || selectedRepo?.name || '未知仓库' }}
                        </span>
                      </div>
                      <p class="text-xs truncate" style="color: var(--n-text-color-2);">
                        版本标签: {{ chart.tag || chart.version || '无版本' }}
                      </p>
                    </div>
                  </div>
                  <div class="flex-shrink-0 ml-3">
                    <NRadio :checked="selectedChart === chart" />
                  </div>
                </div>
              </div>

              <div v-else-if="!loadingCharts && selectedRepo" class="flex items-center justify-center h-full">
                <div class="text-center">
                  <div class="mb-2" style="color: var(--n-text-color-3);">
                    <icon-mdi-package class="w-12 h-12 mx-auto" />
                  </div>
                  <p class="text-sm" style="color: var(--n-text-color-2);">该仓库下暂无包数据</p>
                </div>
              </div>
            </NSpin>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-12">
      <div class="mb-4" style="color: var(--n-text-color-3);">
        <icon-mdi-package-variant class="w-16 h-16 mx-auto" />
      </div>
      <p class="text-lg" style="color: var(--n-text-color-2);">
        暂无仓库数据
      </p>
    </div>

    <template #footer>
      <div class="flex justify-end gap-3">
        <NButton @click="handleClose">
          取消
        </NButton>
        <NButton
          type="primary"
          :disabled="!selectedRepo || !selectedChart || loading || loadingCharts"
          :loading="confirmLoading"
          @click="handleConfirm"
        >
          确认
        </NButton>
      </div>
    </template>
  </NModal>
</template>


<style scoped>
.modal-content-wrapper {
  min-height: 600px;
}

.repos-list {
  scrollbar-width: thin;
  scrollbar-color: #cbd5e0 #f7fafc;
}

.repos-list::-webkit-scrollbar {
  width: 6px;
}

.repos-list::-webkit-scrollbar-track {
  background: #f7fafc;
  border-radius: 3px;
}

.repos-list::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 3px;
}

.repos-list::-webkit-scrollbar-thumb:hover {
  background: #a0aec0;
}

.repo-item {
  transition: all 0.2s ease;
}

.repo-item:hover {
  transform: translateY(-1px);
  border-color: var(--n-primary-color) !important;
}

.charts-container {
  scrollbar-width: thin;
  scrollbar-color: #cbd5e0 #f7fafc;
}

.charts-container::-webkit-scrollbar {
  width: 6px;
}

.charts-container::-webkit-scrollbar-track {
  background: #f7fafc;
  border-radius: 3px;
}

.charts-container::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 3px;
}

.charts-container::-webkit-scrollbar-thumb:hover {
  background: #a0aec0;
}

.charts-list {
  scrollbar-width: thin;
  scrollbar-color: #cbd5e0 #f7fafc;
}

.charts-list::-webkit-scrollbar {
  width: 6px;
}

.charts-list::-webkit-scrollbar-track {
  background: #f7fafc;
  border-radius: 3px;
}

.charts-list::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 3px;
}

.charts-list::-webkit-scrollbar-thumb:hover {
  background: #a0aec0;
}

.chart-item {
  transition: all 0.2s ease;
}

.chart-item:hover {
  transform: translateY(-1px);
  border-color: var(--n-primary-color) !important;
}
</style>

