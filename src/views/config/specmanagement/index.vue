<script setup lang="tsx">
import { NButton, NPopconfirm, NTag, NSpin } from 'naive-ui';
import { $t } from '@/locales';
import { useAppStore } from '@/store/modules/app';
import { useTable, useTableOperate } from '@/hooks/common/table';
import TableHeaderOperation from '@/components/advanced/table-header-operation.vue';
import SpecOperateDrawer from './modules/spec-operate-drawer.vue';
import SpecSearch from './modules/spec-search.vue';
import ServiceOperateModal from './modules/service-operate-modal.vue';
import SpecImportModal from "./modules/spec-import-modal.vue";

import CopySpecModal from './modules/copy-spec-modal.vue';
import { useAuth } from '@/hooks/business/auth';
import { ref, computed, onMounted } from 'vue';
import {
  fetchGetSpecList,
  fetchDeleteSpec,
  fetchGetSpecServiceList,
  fetchUpdateSpec,
  fetchCopySpec,
  fetchExportSpec
} from '@/service/api/game-manage';
import { format } from 'date-fns';
import { handleApiCatchError } from '@/utils/common';
import { specSceneTypeRecord, specStatusRecord } from '@/constants/business';

const { hasAuth } = useAuth();
const appStore = useAppStore();

const specServicesMap = ref<Record<string, any[]>>({});
const loadingSpecServices = ref<Record<string, boolean>>({});
const expandedRowKeys = ref<(string | number)[]>([]);

// 服务操作相关状态
const serviceOperateModalVisible = ref(false);
const serviceOperateType = ref<'add' | 'edit'>('add');
const currentOperatingSpecId = ref<number | null>(null);
const currentOperatingService = ref<any>(null);

// 复制规格相关状态
const copySpecModalVisible = ref(false);
const currentCopyingSpec = ref<any>(null);

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
  apiFn: fetchGetSpecList,
  showTotal: true,
  apiParams: {
    current: 1,
    size: 10,
    specName: undefined,
    specCode: undefined,
    applicableScene: undefined,
    isEnabled: undefined
  },
  columns: () => [
    {
      type: 'expand',
      renderExpand: (row: any) => {
        // 检查是否需要加载数据
        if (!specServicesMap.value[row.id] && !loadingSpecServices.value[row.id]) {
          loadSingleSpecServices(row.id);
        }

        const services = specServicesMap.value[row.id] || [];
        const isLoading = loadingSpecServices.value[row.id] || false;

        return (
          <div class="p-16px">
            <div class="flex items-center justify-between mb-12px">
              <div class="text-14px font-medium">
                服务列表 ({services.length}个)
              </div>
              {hasAuth('game:specTemplate:update') && (
                <NButton
                  size="small"
                  ghost
                  type="primary"
                  onClick={() => handleAddService(row.id)}
                >
                  {{
                    icon: () => <icon-ic-round-add />,
                    default: () => '添加服务'
                  }}
                </NButton>
              )}
            </div>

            {isLoading ? (
              <div class="text-center py-16px">
                <NSpin size="small" />
                <div class="text-gray-500 mt-8px">正在加载服务配置...</div>
              </div>
            ) : services.length === 0 ? (
              <div class="text-center py-16px">
                <icon-ic-round-info class="text-20px mb-8px" />
                <div class="text-gray-500">该规格暂无服务配置</div>
              </div>
            ) : (
              <div class="grid grid-cols-5 gap-8px">
                {services.map((service: any) => (
                  <div key={service.serviceTypeId} class="p-8px rounded border border-gray-200 hover:border-blue-300 transition-colors ">
                    <div class="mb-6px">
                      <div class="flex items-center justify-between gap-4px mb-2px">
                        <span class="text-12px font-medium truncate flex-1">{service.serviceTypeName || service.typeName || '未知服务'}</span>
                        <div class="flex gap-2px">
                          {hasAuth('game:specTemplate:update') && (
                            <NButton
                              type="primary"
                              ghost
                              size="tiny"
                              onClick={() => handleEditService(row.id, service)}
                            >
                              {{
                                icon: () => <icon-ic-round-edit class="text-11px" />
                              }}
                            </NButton>
                          )}
                          {hasAuth('game:specTemplate:update') && (
                            <NPopconfirm onPositiveClick={() => handleDeleteService(row.id, service)}>
                              {{
                                default: () => '确定删除此服务吗？',
                                trigger: () => (
                                  <NButton
                                    type="error"
                                    ghost
                                    size="tiny"
                                  >
                                    {{
                                      icon: () => <icon-ic-round-delete class="text-11px" />
                                    }}
                                  </NButton>
                                )
                              }}
                            </NPopconfirm>
                          )}
                        </div>
                      </div>
                      <div class="text-11px mt-4px">
                        实例: <span class="font-semibold">{service.count || 0}</span>
                      </div>
                    </div>

                    {/* 参数配置 */}
                    {service.params && Object.keys(service.params).length > 0 && (
                      <div class="mt-6px pt-6px border-t border-gray-200">
                        <div class="text-10px mb-3px font-medium">参数({Object.keys(service.params).length}个):</div>
                        <div class="grid grid-cols-3 gap-x-4px gap-y-2px max-h-80px overflow-y-auto text-10px">
                          {Object.entries(service.params).map(([key, value]: [string, any]) => (
                            <div key={key} class="truncate">
                              <span >{value.name || key}:</span>
                              <span class="font-medium ml-1">
                                {value.value || value.paramValue || '-'}
                              </span>
                              {value.unit && <span>({value.unit})</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
      key: 'specName',
      title: '规格名称',
      align: 'center',
      minWidth: 150,
      ellipsis: { tooltip: true }
    },
    {
      key: 'specCode',
      title: '规格代码',
      align: 'center',
      minWidth: 120,
      render: row => (
        <span class="font-mono text-blue-600">{row.specCode}</span>
      )
    },
    {
      key: 'applicableScene',
      title: '适用场景',
      align: 'center',
      minWidth: 150,
      ellipsis: { tooltip: true },
      render: row => {
        const sceneKey = row.applicableScene as Api.SystemManage.SpecSceneType;
        const i18nKey = specSceneTypeRecord[sceneKey];
        return i18nKey ? $t(i18nKey) : row.applicableScene;
      }
    },
    {
      key: 'description',
      title: '说明',
      align: 'center',
      minWidth: 200,
      ellipsis: { tooltip: true }
    },
    {
      key: 'serviceCount',
      title: '服务数量',
      align: 'center',
      width: 100,
      render: row => {
        // 优先使用后端返回的 serviceCount，如果没有则使用缓存的服务列表长度
        const count = row.serviceCount !== undefined
          ? row.serviceCount
          : (specServicesMap.value[row.id] || []).length;
        return (
          <div class="flex items-center justify-center gap-4px">
            <icon-ic-round-settings class="text-14px text-blue-500" />
            <span class="text-sm">{count}</span>
          </div>
        );
      }
    },
    {
      key: 'sortOrder',
      title: '排序',
      align: 'center',
      width: 80,
      render: row => (
        <span class="text-sm font-medium">{row.sortOrder || 0}</span>
      )
    },
    {
      key: 'isEnabled',
      title: '状态',
      align: 'center',
      width: 100,
      render: row => {
        const statusKey = String(row.isEnabled) as Api.SystemManage.SpecStatusType;
        const i18nKey = specStatusRecord[statusKey];
        return (
          <NTag type={row.isEnabled ? 'success' : 'error'} >
            {i18nKey ? $t(i18nKey) : ''}
          </NTag>
        );
      }
    },
    {
      key: 'createdTime',
      title: '创建时间',
      align: 'center',
      width: 180,
      ellipsis: { tooltip: true },
      render: row => (
        <span>{format(row.createdTime, 'yyyy-MM-dd HH:mm:ss')}</span>
      )
    },
    {
      key: 'operate',
      title: '操作',
      align: 'center',
      width: 220,
      render: row => (
        <div class="flex-center gap-8px">
          {hasAuth('game:specTemplate:update') && (
            <NButton type="primary" ghost size="small" onClick={() => edit(row.id, row)}>
              编辑
            </NButton>
          )}
          {hasAuth('game:specTemplate:delete') && (
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
      return fetchDeleteSpec({ id: Number(id) });
    });
    const responses = await Promise.all(deletePromises);

    onBatchDeleted(responses);
  } catch (error: any) {
    onBatchDeleted(error);
  }
}

async function handleDelete(id: number) {
  try {
    const response = await fetchDeleteSpec({ id });

    onDeleted(response);
  } catch (error: any) {
    onDeleted(error);
  }
}

// 编辑规格模板
function edit(id: number, row: any) {
  handleEdit(id, row);
}

// 复制规格模板（从操作列）
function handleCopy(row: any) {
  currentCopyingSpec.value = row;
  copySpecModalVisible.value = true;
}

// 复制规格模板（从顶部按钮）
function handleCopyFromButton() {
  if (checkedRowKeys.value.length > 1) {
    window.$message?.warning('每次只能复制一条规格，请重新选择');
    return;
  }

  const selectedId = checkedRowKeys.value[0];
  const selectedSpec = data.value.find((spec: any) => spec.id === selectedId);

  if (selectedSpec) {
    currentCopyingSpec.value = selectedSpec;
    copySpecModalVisible.value = true;
  } else {
    window.$message?.error('未找到选中的规格');
  }
}

// 复制成功回调
function handleCopySuccess() {
  enhancedGetDataByPage();
}

// 添加服务
function handleAddService(specId: number) {
  serviceOperateType.value = 'add';
  currentOperatingSpecId.value = specId;
  currentOperatingService.value = null;
  serviceOperateModalVisible.value = true;
}

// 编辑服务
function handleEditService(specId: number, service: any) {
  serviceOperateType.value = 'edit';
  currentOperatingSpecId.value = specId;
  currentOperatingService.value = service;
  serviceOperateModalVisible.value = true;
}

// 当前规格数据
const currentSpecData = computed(() => {
  return data.value.find((spec: any) => spec.id === currentOperatingSpecId.value);
});

// 服务操作成功回调
async function handleServiceOperateSuccess() {
      // 重新加载该规格的服务数据
  if (currentOperatingSpecId.value) {
      delete specServicesMap.value[currentOperatingSpecId.value];
      delete loadingSpecServices.value[currentOperatingSpecId.value];
      if (expandedRowKeys.value.includes(currentOperatingSpecId.value) || expandedRowKeys.value.includes(String(currentOperatingSpecId.value))) {
        await loadSingleSpecServices(currentOperatingSpecId.value);
      }
  }
}

// 删除服务
async function handleDeleteService(specId: number, service: any) {
  try {
    // 获取当前规格的所有服务
    const currentServices = specServicesMap.value[specId] || [];

    // 过滤掉要删除的服务
    const remainingServices = currentServices.filter(
      s => s.serviceTypeId !== service.serviceTypeId
    );

    // 构建更新数据（不包含被删除的服务）
    const serviceConfigs = remainingServices.map(s => ({
      serviceTypeId: s.serviceTypeId,
      count: s.count,
      paramValues: s.params ? Object.keys(s.params).reduce((acc, key) => {
        const param = s.params[key];
        acc[key] = String(param.value || param.paramValue || '');
        return acc;
      }, {} as Record<string, string>) : {}
    }));

    // 获取当前规格的基本信息
    const currentSpec = data.value.find((spec: any) => spec.id === specId);

    // 调用更新接口，包含完整的规格信息
    await fetchUpdateSpec({
      id: specId,
      specName: currentSpec?.specName,
      specCode: currentSpec?.specCode,
      description: currentSpec?.description,
      applicableScene: currentSpec?.applicableScene,
      isDefault: currentSpec?.isDefault || 0,
      isEnabled: currentSpec?.isEnabled || true,
      sortOrder: (currentSpec as any)?.sortOrder || 1,
      serviceConfigs
    });

      window.$message?.success($t('common.deleteSuccess'));
      // 重新加载该规格的服务数据
      delete specServicesMap.value[specId];
      delete loadingSpecServices.value[specId];
      if (expandedRowKeys.value.includes(specId) || expandedRowKeys.value.includes(String(specId))) {
        await loadSingleSpecServices(specId);
    }
  } catch (error: any) {
    handleApiCatchError(error, '删除服务');
  }
}


// 加载单个规格的服务数据
async function loadSingleSpecServices(specId: number) {
  if (loadingSpecServices.value[specId]) {
    return; // 已经在加载中
  }

  if (specServicesMap.value[specId]) {
    return; // 已经加载过
  }

  try {
    loadingSpecServices.value[specId] = true;
    const response = await fetchGetSpecServiceList({ specId });
    const services = parseSpecServices(response.data);
    specServicesMap.value[specId] = services;
  } catch (error) {
    handleApiCatchError(error, `加载规格 ${specId} 的服务`);
    specServicesMap.value[specId] = [];
  } finally {
    loadingSpecServices.value[specId] = false;
  }
}


// 解析规格服务数据
function parseSpecServices(data: any) {
  if (!data) return [];

  const services: any[] = [];

  // 检查数据结构：data 包含 serviceStats 和 detailConfigs
  if (data.detailConfigs) {
    // 遍历 detailConfigs 中的每个服务类型
    for (const serviceTypeCode in data.detailConfigs) {
      const serviceConfigs = data.detailConfigs[serviceTypeCode];
      const serviceStats = data.serviceStats?.[serviceTypeCode];

      if (Array.isArray(serviceConfigs) && serviceConfigs.length > 0) {
        // 通常一个服务类型只有一个配置
        const config = serviceConfigs[0];

        // 构建参数对象
        const params: Record<string, any> = {};
        if (config.params) {
          Object.keys(config.params).forEach(paramKey => {
            const param = config.params[paramKey];
            params[paramKey] = {
              name: param.paramName || paramKey,
              value: param.paramValue || '',
              paramValue: param.paramValue || '',
              type: param.paramType || 'string',
              unit: param.paramUnit || ''
            };
          });
        }

        services.push({
          serviceTypeId: serviceStats?.serviceTypeId || config.id,
          serviceTypeName: serviceStats?.serviceTypeName || config.instanceName || serviceTypeCode,
          serviceTypeCode: serviceStats?.serviceTypeCode || config.instanceCode || serviceTypeCode,
          count: serviceStats?.count || config.count || 1,
          params
        });
      }
    }
  }

  return services;
}

// 清理服务数据缓存的函数
function clearServicesCache() {
  specServicesMap.value = {};
  loadingSpecServices.value = {};
  expandedRowKeys.value = [];
}

// 重写getData函数，清理缓存但不预加载服务数据
const enhancedGetData = async () => {
  clearServicesCache(); // 清理缓存
  await getData(); // 获取数据
};

// 同样处理 getDataByPage
const enhancedGetDataByPage = async () => {
  clearServicesCache(); // 清理缓存
  await getDataByPage(); // 获取数据
};

const importModalVisible = ref(false);

// 处理导入文件
function handleImport() {
  importModalVisible.value = true;
}

// 处理导出
async function handleExport() {
  try {
    // @ts-ignore
    window.$message?.info($t("common.exportingData"));

    // 调用导出API - 如果没有选择服务器则传空值导出全部
    const response = await fetchExportSpec();

    // 对于文件下载，直接处理blob响应，不使用通用错误处理
    const blob = (response as any)?.data || (response as any)?.response?.data || response;

    // 检查是否获取到有效的blob数据
    if (!blob || (blob instanceof Blob && blob.size === 0)) {
      // @ts-ignore
      window.$message?.error($t("common.exportFailed") + ": 没有数据");
      return;
    }

    // 如果响应不是blob，尝试创建blob
    let fileBlob;
    if (blob instanceof Blob) {
      fileBlob = blob;
    } else {
      // 创建blob对象
      fileBlob = new Blob([blob], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
    }

    // 检查文件大小
    if (fileBlob.size === 0) {
      // @ts-ignore
      window.$message?.warning($t("common.exportFailed") + ": 没有数据");
      return;
    }

    // 创建下载链接
    const url = window.URL.createObjectURL(fileBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `规格列表_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    // @ts-ignore
    window.$message?.success($t("common.exportSuccess"));
  } catch (error) {
    // 使用通用异常处理函数
    handleApiCatchError(error, '导出商品');
  }
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <SpecSearch
      v-model:model="searchParams"
      @reset="resetSearchParams"
      @search="enhancedGetDataByPage"
    />

    <NCard title="规格列表" :bordered="false" size="small" class="sm:flex-1-hidden card-wrapper">
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :disabled-delete="checkedRowKeys.length === 0"
          :disabled-copy-specs="checkedRowKeys.length === 0"
          :loading="loading"
          @add="() => handleAdd(null)"
          @delete="handleBatchDelete"
          @refresh="enhancedGetData"
          @copy-specs="handleCopyFromButton"
          @import="handleImport"
          @export="handleExport"
          :show-add="hasAuth('game:specTemplate:create')"
          :show-batch-delete="hasAuth('game:specTemplate:delete')"
          :show-copy-specs="hasAuth('game:specTemplate:copy')"
          :show-import="hasAuth('game:specTemplate:import')"
          :show-export="hasAuth('game:specTemplate:export')"
          :show-export-confirm="true"
          add-text="+ 创建规格模板"
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
        :row-key="row => row.id"
        :pagination="mobilePagination"
        class="sm:h-full"
      />

      <SpecOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        :hide-service-operations="true"
        @submitted="enhancedGetDataByPage"
      />

      <SpecImportModal
        v-model:visible="importModalVisible"
        @success="getData"
      />
      <!-- 服务操作弹窗（新增/编辑） -->
      <ServiceOperateModal
        v-model:visible="serviceOperateModalVisible"
        :operate-type="serviceOperateType"
        :spec-id="currentOperatingSpecId"
        :spec-data="currentSpecData"
        :original-service="currentOperatingService"
        :spec-services-map="specServicesMap"
        @success="handleServiceOperateSuccess"
      />

      <!-- 复制规格弹窗 -->
      <CopySpecModal
        v-model:visible="copySpecModalVisible"
        :source-spec="currentCopyingSpec"
        @success="handleCopySuccess"
      />
    </NCard>
  </div>
</template>

<style scoped></style>
