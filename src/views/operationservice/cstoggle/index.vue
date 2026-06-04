<script setup lang="tsx">
import { NButton, NTag, NTooltip } from "naive-ui";
import {
  fetchGetCustomerServiceSwitchList,
} from "@/service/api/operate-mange";
import { useAppStore } from "@/store/modules/app";
import { useTable, useTableOperate } from "@/hooks/common/table";
import CsToggleOperateDrawer from "./modules/cstoggle-operate-drawer.vue";
import { format } from 'date-fns';
import { useAuth } from '@/hooks/business/auth';
import { computed } from 'vue';

const { hasAuth } = useAuth();
const appStore = useAppStore();

// 判断是否有数据
const hasData = computed(() => {
  return data.value && data.value.length > 0;
});

const {
  columns,
  columnChecks,
  data,
  getData,
  loading,
} = useTable({
  apiFn: fetchGetCustomerServiceSwitchList,
  immediate: true,
  apiParams: {
    current: 1,
    size: 9999,
  },
  columns: () => [
    {
      key: "id",
      title: "ID",
      align: "center",
      width: 80,
    },
    {
      key: "channelCodes",
      title: "渠道代码",
      align: "center",
      minWidth: 300,
      render: (row: any) => {
        if (!row.channelCodes) return "-";
        
        const codes = row.channelCodes.split(',').map((code: string) => code.trim()).filter(Boolean);
        const maxDisplay = 5; // 最多显示5个标签
        
        if (codes.length === 0) return "-";
        
        const displayCodes = codes.slice(0, maxDisplay);
        const remainingCount = codes.length - maxDisplay;
        const allCodesText = codes.join(', ');
        
        return (
          <NTooltip>
            {{
              default: () => allCodesText,
              trigger: () => (
                <div class="flex flex-wrap gap-4px justify-center items-center">
                  {displayCodes.map((code: string) => (
                    <NTag key={code} size="small" type="info">
                      {code}
                    </NTag>
                  ))}
                  {remainingCount > 0 && (
                    <NTag size="small" type="default">
                      +{remainingCount}
                    </NTag>
                  )}
                </div>
              )
            }}
          </NTooltip>
        );
      }
    },
    {
      key: "status",
      title: "状态",
      align: "center",
      minWidth: 120,
      render: (row: any) => (
        <NTag type={row.status === 1 ? 'success' : 'default'}>
          {row.status === 1 ? '启用' : '禁用'}
        </NTag>
      )
    },
    {
      key: "createTime",
      title: "创建时间",
      align: "center",
      minWidth: 180,
      render: (row: any) => {
        if (!row.createTime) return "-";
        return format(new Date(row.createTime), "yyyy-MM-dd HH:mm:ss");
      }
    },
    {
      key: "updateTime",
      title: "更新时间",
      align: "center",
      minWidth: 180,
      render: (row: any) => {
        if (!row.updateTime) return "-";
        return format(new Date(row.updateTime), "yyyy-MM-dd HH:mm:ss");
      }
    },
    {
      key: "operate",
      title: "操作",
      align: "center",
      width: 100,
      fixed: "right",
      render: (row: any) => (
        <div class="flex-center gap-8px">
          {hasAuth('operate:customerServiceSwitch:edit') && (
            <NButton
              type="primary"
              ghost
              size="small"
              onClick={() => handleEdit(row.id, row)}
            >
              编辑
            </NButton>
          )}
        </div>
      ),
    },
  ],
});

const {
  drawerVisible,
  operateType,
  editingData,
  handleEdit,
} = useTableOperate(data, getData);

function handleAdd() {
  // 如果有数据，不允许新增
  if (hasData.value) {
    window.$message?.warning('已有配置数据，请先编辑现有配置');
    return;
  }
  drawerVisible.value = true;
  operateType.value = 'add';
}
</script>

<template>
  <div
    class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto"
  >
    <NCard
      title="客服开关配置"
      :bordered="false"
      size="small"
      class="sm:flex-1-hidden card-wrapper"
    >
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :loading="loading"
          :show-add="hasAuth('operate:customerServiceSwitch:add')"
          :show-delete="false"
          :show-batch-delete="false"
          @add="handleAdd"
          @refresh="getData"
        />
      </template>

      <NDataTable
        :columns="columns"
        :data="data"
        size="small"
        :flex-height="!appStore.isMobile"
        :scroll-x="800"
        :loading="loading"
        remote
        :row-key="(row) => row.id"
        :pagination="false"
        class="sm:h-full"
      />
    </NCard>

    <CsToggleOperateDrawer
      v-model:visible="drawerVisible"
      :operate-type="operateType"
      :row-data="editingData"
      @submitted="getData"
    />
  </div>
</template>
