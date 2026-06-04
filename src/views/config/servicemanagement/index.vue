<script setup lang="tsx">
import { NButton, NPopconfirm, NTag, NSpin } from 'naive-ui';
import { $t } from '@/locales';
import { useAppStore } from '@/store/modules/app';
import { useTable, useTableOperate } from '@/hooks/common/table';
import ServiceOperateDrawer from './modules/service-operate-drawer.vue';
import ServiceSearch from './modules/service-search.vue';
import ServiceDetailModal from './modules/service-detail-modal.vue';
import ServiceParamModal from './modules/service-param-modal.vue';
import { useAuth } from '@/hooks/business/auth';
import { ref } from 'vue';
import {
  fetchGetServiceList,
  fetchDeleteService,
  fetchGetServiceParamList,
  fetchAddServiceParam,
  fetchUpdateServiceParam,
  fetchDeleteServiceParam
} from '@/service/api/game-manage';
import { format } from 'date-fns';
import { serviceStatusRecord } from '@/constants/business';
const { hasAuth } = useAuth();
const appStore = useAppStore();


const detailModalVisible = ref(false);
const currentServiceId = ref<number | null>(null);
const serviceParamsMap = ref<Record<string, any[]>>({});
const loadingServiceParams = ref<Record<string, boolean>>({});
const expandedRowKeys = ref<(string | number)[]>([]);

// 参数管理相关状态
const paramModalVisible = ref(false);
const paramOperateType = ref<'add' | 'edit'>('add');
const currentParamData = ref<any>(null);
const currentServiceForParam = ref<number | null>(null);

const {
  columns,
  columnChecks,
  data,
  getData,
  getDataByPage,
  loading,
  mobilePagination,
  searchParams,
  resetSearchParams
} = useTable({
  apiFn: fetchGetServiceList,
  showTotal: true,
    apiParams: {
    current: 1,
    size: 10,
    typeCode: undefined,
    typeName: undefined,
    isEnabled: undefined
  },
  columns: () => [
    {
      type: 'expand',
      renderExpand: (row: any) => {
        // 检查是否需要加载数据
        if (!serviceParamsMap.value[row.id] && !loadingServiceParams.value[row.id]) {
          loadSingleServiceParams(row.id);
        }

        const params = serviceParamsMap.value[row.id] || [];
        const isLoading = loadingServiceParams.value[row.id] || false;

        return (
          <div class="p-16px">
            <div class="flex items-center justify-between mb-12px">
              <div class="text-14px font-medium ">
                参数列表 ({params.length}个)
              </div>
              {hasAuth('game:serviceParamDefinition:create') && (
                <NButton
                 size="small" ghost type="primary"
                  onClick={() => handleAddParam(row.id)}
                >
                  {{
                    icon: () => <icon-ic-round-add />,
                    default: () => '添加参数'
                  }}
                </NButton>
              )}
            </div>

            {isLoading ? (
              <div class="text-center py-16px">
                <NSpin size="small" />
                <div class="text-gray-500 mt-8px">正在加载参数配置...</div>
              </div>
            ) : params.length === 0 ? (
              <div class="text-center py-16px">
                <icon-ic-round-info class="text-20px mb-8px text-gray-400" />
                <div class="text-gray-500">该服务暂无参数配置</div>
              </div>
            ) : (
              <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-12px">
                {params.map((param: any) => (
                  <div key={param.id} class="p-12px rounded border border-gray-200 hover:border-blue-300 transition-colors">
                    <div class="flex items-start justify-between mb-8px">
                        <div class="text-13px font-medium  flex-1">
                          {param.paramName || param.param_name || '未命名参数'}
                        </div>
                      <div class="flex gap-4px ml-8px">
                        {hasAuth('game:serviceParamDefinition:update') && (
                          <NButton
                            type="primary"
                            ghost
                            size="tiny"
                            onClick={() => handleEditParam(row.id, param)}
                          >
                            {{
                              icon: () => <icon-ic-round-edit class="text-12px" />
                            }}
                          </NButton>
                        )}
                        {hasAuth('game:serviceParamDefinition:delete') && (
                          <NPopconfirm onPositiveClick={() => handleDeleteParam(row.id, param.id)}>
                            {{
                              default: () => '确定删除此参数吗？',
                              trigger: () => (
                                <NButton
                                  type="error"
                                  ghost
                                  size="tiny"
                                >
                                  {{
                                    icon: () => <icon-ic-round-delete class="text-12px" />
                                  }}
                                </NButton>
                              )
                            }}
                          </NPopconfirm>
                        )}
                      </div>
                    </div>
                      <div class="text-12px space-y-1">
                        <div>代码: {param.paramCode || param.param_code || '-'}</div>
                        <div>类型: {param.paramType || param.param_type || '-'}</div>
                      {(param.paramUnit || param.param_unit) && (
                        <div>单位: {param.paramUnit || param.param_unit}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }
    },
    {
      type: 'selection',
      align: 'center',
      width: 48
    },
    {
      key: 'id',
      title: 'ID',
      align: 'center',
      width: 64
    },
    {
      key: 'typeCode',
      title: '服务类型代码',
      align: 'center',
      minWidth: 120,
      render: row => {
        const typeColorMap: Record<string, string> = {
          'center': '#1890ff',
          'gate': '#52c41a',
          'world': '#fa541c',
          'login': '#722ed1',
          'db': '#13c2c2'
        };
        return (
          <NTag
            color={{ color: typeColorMap[row.typeCode] || '#1890ff', textColor: '#fff' }}
            size="small"
          >
            {row.typeCode}
          </NTag>
        );
      }
    },
    {
      key: 'typeName',
      title: '服务名称',
      align: 'center',
      minWidth: 150,
      ellipsis: { tooltip: true }
    },
    {
      key: 'description',
      title: '服务描述',
      align: 'center',
      minWidth: 200,
      ellipsis: { tooltip: true }
    },
    {
      key: 'sortOrder',
      title: '排序',
      align: 'center',
      width: 80
    },
    {
      key: 'serviceParamCount',
      title: '参数数量',
      align: 'center',
      width: 100,
      render: row => {
        // 优先使用后端返回的 serviceParamCount，如果没有则使用缓存的参数列表长度
        const paramCount = row.serviceParamCount !== undefined
          ? row.serviceParamCount
          : (serviceParamsMap.value[row.id] || []).length;
        return (
          <div class="flex items-center justify-center gap-4px">
            <icon-ic-round-settings class="text-14px text-blue-500" />
            <span class="text-sm">{paramCount}</span>
          </div>
        );
      }
    },
    {
      key: 'isEnabled',
      title: '服务状态',
      align: 'center',
      width: 100,
      render: row => {
        const statusKey = String(row.isEnabled) as Api.SystemManage.ServiceStatusType;
        const i18nKey = serviceStatusRecord[statusKey];
        return (
          <NTag type={row.isEnabled === 1 ? 'success' : 'error'} >
            {i18nKey ? $t(i18nKey) : ''}
          </NTag>
        );
      }
    },
    // {
    //   key: 'createdBy',
    //   title: '创建者',
    //   align: 'center',
    //   width: 100
    // },
    {
      key: 'createdTime',
      title: '创建时间',
      align: 'center',
      minWidth: 160,
      render: row => {
        return format(new Date(row.createdTime), 'yyyy-MM-dd HH:mm:ss');
      }
    },
    {
      key: 'operate',
      title: '操作',
      align: 'center',
      width: 220,
      render: row => (
        <div class="flex-center gap-6px">
          {hasAuth('game:serviceType:update') && (
            <NButton type="primary" ghost size="small" onClick={() => handleEdit(row.id, row)}>
              编辑
            </NButton>
          )}
          {hasAuth('game:serviceType:delete') && (
            <NPopconfirm onPositiveClick={() => handleDelete(row.id)}>
              {{
                default: () => $t("common.confirmDelete"),
                trigger: () => (
                  <NButton type="error" ghost size="small">
                    {$t("common.delete")}
                  </NButton>
                ),
              }}
            </NPopconfirm>
          )}
        </div>
      )
    }
  ]
});

const {
  drawerVisible,
  operateType,
  editingData,
  handleAdd,
  handleEdit,
  checkedRowKeys,
  onBatchDeleted,
  onDeleted
} = useTableOperate(data, getData);

// 批量删除
async function handleBatchDelete() {
  try {
    const deletePromises = checkedRowKeys.value.map((id: string) => {
      return fetchDeleteService({ id: Number(id) });
    });
    const responses = await Promise.all(deletePromises);

    onBatchDeleted(responses);
  } catch (error: any) {
    onBatchDeleted(error);
  }
}

async function handleDelete(id: number) {
  try {
    const response = await fetchDeleteService({ id });

    onDeleted(response);
  } catch (error: any) {
    onDeleted(error);
  }
}

// 加载单个服务的参数
async function loadSingleServiceParams(serviceId: number) {
  if (loadingServiceParams.value[serviceId]) {
    return; // 已经在加载中
  }

  if (serviceParamsMap.value[serviceId]) {
    return; // 已经加载过
  }

  try {
    loadingServiceParams.value[serviceId] = true;
    const response = await fetchGetServiceParamList({
      serviceTypeId: serviceId,
    });
    serviceParamsMap.value[serviceId] = response.data?.rows || response.data || [];
  } catch (error) {
    console.warn(`加载服务 ${serviceId} 的参数失败:`, error);
    serviceParamsMap.value[serviceId] = [];
  } finally {
    loadingServiceParams.value[serviceId] = false;
  }
}

// 清理参数数据缓存的函数
function clearParamsCache() {
  serviceParamsMap.value = {};
  loadingServiceParams.value = {};
  expandedRowKeys.value = [];
}

// 重写getData函数，清理缓存但不预加载参数数据
const enhancedGetData = async () => {
  clearParamsCache(); // 清理缓存
  await getData(); // 获取数据
};

// 参数管理相关函数
// 新增参数
function handleAddParam(serviceId: number) {
  currentServiceForParam.value = serviceId;
  paramOperateType.value = 'add';
  currentParamData.value = null;
  paramModalVisible.value = true;
}

// 编辑参数
function handleEditParam(serviceId: number, param: any) {
  currentServiceForParam.value = serviceId;
  paramOperateType.value = 'edit';
  currentParamData.value = param;
  paramModalVisible.value = true;
}

// 删除参数
async function handleDeleteParam(serviceId: number, paramId: number) {
  try {
    const response = await fetchDeleteServiceParam({ id: paramId });
    if (response.data) {
      window.$message?.success('参数删除成功');
      // 重新加载该服务的参数
      delete serviceParamsMap.value[serviceId];
      delete loadingServiceParams.value[serviceId];
      if (expandedRowKeys.value.includes(serviceId) || expandedRowKeys.value.includes(String(serviceId))) {
        await loadSingleServiceParams(serviceId);
      }
    }
  } catch (error) {
    console.error('删除参数失败:', error);
    window.$message?.error('删除参数失败');
  }
}

// 参数提交处理
async function handleParamSubmit(formData: any) {
  try {
    let response;
    if (paramOperateType.value === 'add') {
      response = await fetchAddServiceParam({
        ...formData,
        serviceTypeId: currentServiceForParam.value
      });
    } else {
      response = await fetchUpdateServiceParam({
        ...formData,
        id: currentParamData.value.id
      });
    }

    if (response.data) {
      window.$message?.success(paramOperateType.value === 'add' ? '参数添加成功' : '参数更新成功');
      paramModalVisible.value = false;
      // 重新加载该服务的参数
      if (currentServiceForParam.value) {
        delete serviceParamsMap.value[currentServiceForParam.value];
        delete loadingServiceParams.value[currentServiceForParam.value];
        if (expandedRowKeys.value.includes(currentServiceForParam.value) || expandedRowKeys.value.includes(String(currentServiceForParam.value))) {
          await loadSingleServiceParams(currentServiceForParam.value);
        }
      }
    }
  } catch (error) {
    console.error('参数操作失败:', error);
    window.$message?.error('参数操作失败');
  }
}
</script>

<template>
  <div
    class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto"
  >
    <ServiceSearch
      v-model:model="searchParams"
      @reset="resetSearchParams"
      @search="getDataByPage"
    />

    <NCard
      title="服务管理"
      :bordered="false"
      size="small"
      class="sm:flex-1-hidden card-wrapper"
    >
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :disabled-delete="checkedRowKeys.length === 0"
          :loading="loading"
          @add="() => handleAdd(null)"
          @delete="handleBatchDelete"
          @refresh="enhancedGetData"
          :show-add="hasAuth('game:serviceType:create')"
          :show-batch-delete="hasAuth('game:serviceType:delete')"
        />
      </template>

      <NDataTable
        v-model:checked-row-keys="checkedRowKeys"
        v-model:expanded-row-keys="expandedRowKeys"
        :columns="columns"
        :data="data"
        size="small"
        :flex-height="!appStore.isMobile"
        :scroll-x="1200"
        :loading="loading"
        remote
        :row-key="(row) => row.id"
        :pagination="mobilePagination"
        class="sm:h-full"
      />

      <ServiceOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        @submitted="getDataByPage"
      />

      <ServiceDetailModal
        v-model:visible="detailModalVisible"
        :service-id="currentServiceId"
        @submitted="enhancedGetData"
      />

      <ServiceParamModal
        v-model:visible="paramModalVisible"
        :operate-type="paramOperateType"
        :row-data="currentParamData"
        @submitted="handleParamSubmit"
      />
    </NCard>
  </div>
</template>

<style scoped></style>
