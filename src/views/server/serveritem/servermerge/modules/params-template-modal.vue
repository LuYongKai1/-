<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { fetchGetMergePlanList } from '@/service/api/game-manage';
import { handleApiCatchError } from '@/utils/common';

defineOptions({
  name: 'ParamsTemplateModal',
});

interface Props {
  /** 单个数据（如果传入则只显示这一条） */
  singleData?: any;
  /** 是否为选择模式 */
  selectMode?: boolean;
}

interface Emits {
  (e: 'select', data: any): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const visible = defineModel<boolean>('visible', {
  default: false,
});

const paramsTemplateList = ref<any[]>([]);
const paramsTemplateLoading = ref(false);
const selectedTemplateId = ref<number | null>(null);

// 计算模态框标题
const modalTitle = computed(() => {
  if (props.selectMode) {
    return '选择合服参数模板';
  }
  return props.singleData ? '合服参数详情' : '查看合服参数';
});

// 加载参数模板列表
async function loadParamsTemplates() {
  paramsTemplateLoading.value = true;
  try {
    const response = await fetchGetMergePlanList({ current: 1, size: 100 });

    // 处理响应数据结构：response.data 或 response.response?.data
    const responseData = response.response?.data || response.data;

    if (responseData && responseData.code === 200) {
      // 过滤出有参数的记录
      const allData = responseData.rows || [];
      paramsTemplateList.value = allData.filter((item: any) => item.resultData);
    } else {
      window.$message?.error(responseData?.msg || '获取合服参数失败');
    }
  } catch (error) {
    handleApiCatchError(error, '获取合服参数模板');
  } finally {
    paramsTemplateLoading.value = false;
  }
}

// 选择模板
function handleSelectTemplate(item: any) {
  if (!props.selectMode) return;
  selectedTemplateId.value = item.id;
}

// 确认选择
function handleConfirmSelect() {
  const selectedItem = paramsTemplateList.value.find(item => item.id === selectedTemplateId.value);
  if (selectedItem) {
    emit('select', selectedItem);
    visible.value = false;
  } else {
    window.$message?.warning('请选择一个参数模板');
  }
}

// 监听弹窗显示状态
watch(visible, (newVisible) => {
  if (newVisible) {
    selectedTemplateId.value = null;
    // 如果有单个数据，直接使用，否则加载所有数据
    if (props.singleData) {
      paramsTemplateList.value = [props.singleData];
    } else {
      loadParamsTemplates();
    }
  }
});
</script>

<template>
  <NModal
    v-model:show="visible"
    preset="card"
    :title="modalTitle"
    class="w-900px"
    :segmented="{
      content: true,
      footer: 'soft'
    }"
  >
    <NSpin :show="paramsTemplateLoading">
      <div v-if="paramsTemplateList.length > 0" class="space-y-12px max-h-600px overflow-y-auto">
        <NCard
          v-for="item in paramsTemplateList"
          :key="item.id"
          size="small"
          :class="{
            'cursor-pointer hover:border-primary transition-colors': selectMode,
            'border-primary border-2': selectMode && selectedTemplateId === item.id
          }"
          @click="handleSelectTemplate(item)"
        >
          <div class="space-y-8px">
            <div class="flex items-center gap-12px">
              <NRadio
                v-if="selectMode"
                :checked="selectedTemplateId === item.id"
                @click.stop="handleSelectTemplate(item)"
              />
              <NTag type="info" size="small">
                源服: {{ item.originalServerName || item.originalServerId }}
              </NTag>
              <icon-mdi-arrow-right class="text-gray-400" />
              <NTag type="success" size="small">
                目标服: {{ item.targetServerName || item.targetServerId }}
              </NTag>
            </div>
            <div class="mt-8px">
              <div class="text-12px text-gray-500 mb-4px">参数配置:</div>
              <NCard size="small" :bordered="false" class="bg-gray-50">
                <pre class="text-12px leading-relaxed whitespace-pre-wrap break-all m-0 font-mono max-h-200px overflow-y-auto">{{ item.resultData }}</pre>
              </NCard>
            </div>
          </div>
        </NCard>
      </div>
      <NEmpty v-else description="暂无参数数据" class="py-40px" />
    </NSpin>
    <template #footer>
      <div class="flex justify-end gap-12px">
        <NButton @click="visible = false">
          {{ selectMode ? '取消' : '关闭' }}
        </NButton>
        <NButton v-if="selectMode" type="primary" @click="handleConfirmSelect">
          确认选择
        </NButton>
      </div>
    </template>
  </NModal>
</template>

<style scoped>
</style>
