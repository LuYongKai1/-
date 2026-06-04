<script setup lang="tsx">
import { ref, computed, h, watch } from 'vue';
import { NDataTable, NSelect, NInputNumber, NForm, NGrid, NFormItemGi, NButton, NSpace } from 'naive-ui';
import type { SelectOption } from 'naive-ui';
import { Icon } from '@iconify/vue';
import { fetchGetResourceTopN } from '@/service/api';
import { useTable } from '@/hooks/common/table';
import { useAppStore } from '@/store/modules/app';
import { handleApiResponseError } from '@/utils/common';

interface Props {
  serverId: number | null;
}

const props = defineProps<Props>();
const appStore = useAppStore();

const resourceType = ref<string | null>(null);
const topN = ref<number>(10);
const resourceOptions: SelectOption[] = [
  { label: '点券', value: 'dianquan' },
  { label: '金币', value: 'jinbi' },
  { label: '元宝', value: 'yuanbao' },
  { label: '结锲之叶', value: 'jieqiezhiye' },
  { label: '通天玉珀', value: 'tongtianyupo' }
];

const resourceFieldMap: Record<string, string> = {
  dianquan: 'dianquan_count',
  jinbi: 'jinbi_count',
  yuanbao: 'yuanbao_count',
  jieqiezhiye: 'jieqiezhiye_count',
  tongtianyupo: 'tongtianyupo_count'
};

function extractDataFromResponse(response: any): any[] {
  if (!response?.response?.data) return [];

  const responseData = response.response.data;

  if (responseData.code === 200 && responseData.data) {
    return Array.isArray(responseData.data) ? responseData.data : [];
  }

  if (Array.isArray(responseData)) {
    return responseData;
  }

  if (responseData.data && Array.isArray(responseData.data)) {
    return responseData.data;
  }

  return [];
}

async function getResourceTopNAdapter(params?: any) {
  if (!props.serverId || !resourceType.value) {
    return {
      response: {
        data: {
          rows: [],
          data: [],
          current: 1,
          size: 10,
          total: 0
        }
      }
    } as any;
  }

  try {
    const response = await fetchGetResourceTopN({
      serverId: props.serverId,
      resourceType: String(resourceType.value)
    });

    const hasError = handleApiResponseError(response, '获取资源TopN');
    if (hasError) {
      return {
        response: {
          data: {
            rows: [],
            data: [],
            current: 1,
            size: 10,
            total: 0
          }
        }
      } as any;
    }

    const dataList = extractDataFromResponse(response);
    const limit = topN.value || 10;
    const limitedData = dataList.slice(0, limit);

    return {
      response: {
        data: {
          rows: limitedData,
          data: limitedData,
          current: params?.current || 1,
          size: params?.size || 10,
          total: limitedData.length
        }
      }
    } as any;
  } catch (error) {
    return {
      response: {
        data: {
          rows: [],
          data: [],
          current: 1,
          size: 10,
          total: 0
        }
      }
    } as any;
  }
}

const {
  columns,
  data,
  getData,
  loading,
  mobilePagination
} = useTable({
  apiFn: getResourceTopNAdapter as any,
  showTotal: true,
  immediate: false,
  apiParams: {
    current: 1,
    size: 10
  },
  columns: () => {
    return [
      {
        key: 'rank' as any,
        title: '排名',
        align: 'center' as const,
        minWidth: 80,
        render: (_: any, index: number): number => {
          const pagination = mobilePagination.value as any;
          const currentPage = pagination?.page || 1;
          const pageSize = pagination?.pageSize || 10;
          return (currentPage - 1) * pageSize + index + 1;
        }
      },
      {
        key: 'role_guid' as any,
        title: '角色GUID',
        align: 'center' as const,
        minWidth: 180,

      },
      {
        key: 'count' as any,
        title: '数量',
        align: 'center' as const,
        minWidth: 200,
        render: (row: any) => {
          // 动态获取资源数量字段，在 render 时实时获取
          const currentResourceType = resourceType.value;
          const countField = currentResourceType ? resourceFieldMap[currentResourceType] : 'count';
          const count = Number(row[countField] || row.count || 0);

          // 格式化数字（与资源总量统计保持一致）
          let formattedValue: string;
          if (count >= 100000000) {
            formattedValue = `${(count / 100000000).toFixed(2)}亿`;
          } else if (count >= 10000) {
            formattedValue = `${(count / 10000).toFixed(2)}万`;
          } else {
            formattedValue = count.toLocaleString();
          }

          // 确保返回正确的 VNode 结构
          return h('div', {
            class: 'amount-cell',
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }
          }, [
            h('span', {
              class: 'amount-value',
              style: {
                fontSize: '16px',
                color: 'var(--text-color)'
              }
            }, `${formattedValue}(${count.toLocaleString()})`)
          ]);
        }
      }
    ];
  }
});

function handleQuery() {
  if (!props.serverId) {
    window.$message?.warning('请先选择服务器');
    return;
  }
  if (!resourceType.value) {
    window.$message?.warning('请选择资源类型');
    return;
  }
  if (!topN.value || topN.value <= 0) {
    window.$message?.warning('请输入有效的TopN数量');
    return;
  }
  getData();
}

// 监听资源类型变化，自动查询
watch(
  resourceType,
  (newVal) => {
    if (newVal && props.serverId && topN.value && topN.value > 0) {
      handleQuery();
    }
  }
);
</script>

<template>
  <div class="tab-content flex-col-stretch">
    <NForm
      :model="{ resourceType, topN }"
      label-placement="left"
      :label-width="100"
      class="search-form"
    >
      <NGrid responsive="screen" item-responsive>
        <NFormItemGi span="24 s:12 m:6" label="资源类型">
          <NSelect
            v-model:value="resourceType"
            :options="resourceOptions"
            placeholder="请选择资源类型"
            clearable
          />
        </NFormItemGi>
        <NFormItemGi span="24 s:12 m:6" label="TopN数量">
          <NInputNumber
            v-model:value="topN"
            :min="1"
            :max="100"
            placeholder="请输入数量"
            style="width: 100%"
          />
        </NFormItemGi>
        <NFormItemGi span="24 s:12">
          <NSpace class="w-full" justify="end">
            <NButton
              type="primary"
              :disabled="!props.serverId || !resourceType || !topN || topN <= 0"
              :loading="loading"
              @click="handleQuery"
            >
              <template #icon>
                <Icon icon="mdi:refresh" />
              </template>
              查询
            </NButton>
          </NSpace>
        </NFormItemGi>
      </NGrid>
    </NForm>

    <div class="table-wrapper sm:flex-1-hidden">
      <NDataTable
        :columns="columns"
        :data="data"
        :loading="loading"
        :pagination="mobilePagination"
        size="small"
        :bordered="true"
        :flex-height="!appStore.isMobile"
        remote
        class="resource-table sm:h-full"
      />
    </div>
  </div>
</template>

<style scoped>
.tab-content {
  padding: 16px;
  min-height: 500px;
  display: flex;
  flex-direction: column;
}

.search-form {
  margin-bottom: 16px;
  flex-shrink: 0;
}

.table-wrapper {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  margin-top: 16px;
}

.resource-table {
  flex: 1;
  min-height: 0;
}

.amount-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.amount-value {
  font-size: 16px;
  color: var(--text-color);
}

.amount-original {
  font-size: 12px;
  color: var(--text-color-2);
  opacity: 0.7;
}

@media (max-width: 640px) {
  .table-wrapper {
    min-height: 400px;
  }
}
</style>

