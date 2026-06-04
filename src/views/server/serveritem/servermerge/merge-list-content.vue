<script setup lang="tsx">
import { computed, ref, onMounted } from "vue";
import { NButton, NTag, NSpace, NDataTable, NModal, NCard, NDescriptions, NDescriptionsItem } from "naive-ui";
import { format } from 'date-fns';
import { fetchGetMergeList } from "@/service/api/game-manage";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import { useTable } from "@/hooks/common/table";
import { useAuth } from '@/hooks/business/auth';
import { handleApiCatchError } from '@/utils/common';

defineOptions({
  name: "MergeListContent",
});

const { hasAuth } = useAuth();
const appStore = useAppStore();

// 查看子服弹窗状态
const showChildrenModal = ref(false);
const currentServerData = ref<any>(null);

const {
  columns,
  columnChecks,
  data,
  getData,
  loading,
  pagination,
  searchParams,
  resetSearchParams,
  updateSearchParams,
} = useTable({
  apiFn: fetchGetMergeList as any,
  showTotal: true,
  immediate: false,
  apiParams: {
    current: 1,
    size: 10,
  },
  columns: () => [
    {
      type: "selection",
      align: "center",
      width: 48,
    },
    {
      key: "id",
      title: "ID",
      align: "center",
      minWidth: 60,
    },
    {
      key: "serverId",
      title: "服务器ID",
      align: "center",
      minWidth: 100,
      render: (row: any) => row.serverId
    },
    {
      key: "serverName",
      title: "服务器名称",
      align: "center",
      minWidth: 200,
      render: (row: any) => {
        if (row.serverType === 'MERGE' && row.children && row.children.length > 0) {
          const targetServerId = row.children[0]?.serverId;
          return (
            <span style={{ whiteSpace: 'nowrap' }}>
              {row.serverName} [已并入{targetServerId}]
            </span>
          );
        }
        return <span>{row.serverName}</span>;
      }
    },
    {
      key: "serverType",
      title: "服务器类型",
      align: "center",
      minWidth: 100,
      render: (row: any) => {
        const typeMap: Record<string, { type: string; label: string }> = {
          'NORMAL': { type: "success", label: "普通服" },
          'CROSS': { type: "info", label: "跨服" },
          'MERGE': { type: "info", label: "合服" },
        };
        const type = typeMap[row.serverType] || { type: "default", label: row.serverType };
        return (
          <NTag type={type.type as any} size="small">
            {type.label}
          </NTag>
        );
      },
    },
    {
      key: "children",
      title: "已合并的服务器",
      align: "center",
      minWidth: 300,
      render: (row: any) => {
        if (row.children && Array.isArray(row.children) && row.children.length > 0) {
          const displayCount = 2; // 最多显示2个
          const hasMore = row.children.length > displayCount;
          const displayChildren = row.children.slice(0, displayCount);

          return (
            <div class="flex-center gap-2" style={{ whiteSpace: 'nowrap' }}>
              {displayChildren.map((child: any) => (
                <NTag type="info" size="small" key={child.serverId}>
                  {child.serverId} - {child.serverName}
                </NTag>
              ))}
              {hasMore && (
                <NButton
                  text
                  type="primary"
                  size="tiny"
                  onClick={() => handleViewChildren(row)}
                >
                  +{row.children.length - displayCount} 更多
                </NButton>
              )}
            </div>
          );
        }
        return <span class="text-gray-400">-</span>;
      }
    },
    {
      key: "serverOpenDate",
      title: "开服时间",
      align: "center",
      minWidth: 180,
      render: (row: any) => {
        if (row.serverOpenDate) {
          try {
            const date = new Date(row.serverOpenDate);
            return <span style={{ whiteSpace: 'nowrap' }}>{format(date, 'yyyy-MM-dd HH:mm:ss')}</span>;
          } catch (error) {
            return row.serverOpenDate;
          }
        }
        return <span class="text-gray-400">-</span>;
      },
    },
    {
      key: "clusterStatus",
      title: "集群状态",
      align: "center",
      minWidth: 100,
      render: (row: any) => {
        const statusMap: Record<number, { type: string; label: string }> = {
          '-1': { type: "default", label: "初始化" },
          '0': { type: "info", label: "创建中" },
          '1': { type: "success", label: "创建成功" },
          '2': { type: "error", label: "创建失败" },
          '3': { type: "warning", label: "部署中" },
          '4': { type: "success", label: "运行中" },
          '5': { type: "warning", label: "已停止" },
          '6': { type: "error", label: "删除中" },
          '7': { type: "default", label: "已删除" },
          '8': { type: "info", label: "更新中" },
          '9': { type: "default", label: "已回滚" },
        };
        const status = statusMap[row.clusterStatus] || { type: "default", label: "未知" };
        return (
          <NTag type={status.type as any} size="small">
            {status.label}
          </NTag>
        );
      },
    },
    {
      key: "serverVersion",
      title: "服务器版本",
      align: "center",
      minWidth: 120,
      render: (row: any) => row.serverVersion || <span class="text-gray-400">-</span>
    },
    {
      key: "updateDate",
      title: "更新时间",
      align: "center",
      minWidth: 180,
      render: (row: any) => {
        if (row.updateDate) {
          try {
            const date = new Date(row.updateDate);
            return <span style={{ whiteSpace: 'nowrap' }}>{format(date, 'yyyy-MM-dd HH:mm:ss')}</span>;
          } catch (error) {
            return row.updateDate;
          }
        }
        return <span class="text-gray-400">-</span>;
      },
    },
    {
      key: "operate",
      title: $t("common.operate"),
      align: "center",
      width: 100,
      render: (row) => (
        <div class="flex-center gap-8px">
          {row.children && row.children.length > 0 ? (
            <NButton
              text
              type="info"
              size="small"
              onClick={() => handleViewChildren(row)}
            >
              {{
                icon: () => <icon-mdi-eye-outline class="text-icon" />,
                default: () => "查看子服"
              }}
            </NButton>
          ) : (
            <span class="text-gray-400">-</span>
          )}
        </div>
      ),
    },
  ],
});

// 选中的行
const checkedRowKeys = ref<string[]>([]);

// 默认隐藏部分列
const defaultHiddenKeys = ['updateDate'];
columnChecks.value.forEach((columnCheck) => {
  if (defaultHiddenKeys.includes(columnCheck.key as string)) {
    columnCheck.checked = false;
  }
});

function handleViewChildren(row: any) {
  currentServerData.value = row;
  showChildrenModal.value = true;
}

onMounted(() => {
  getData();
});

defineExpose({
  columnChecks,
  checkedRowKeys,
  loading,
  getData,
});
</script>

<template>
  <div class="h-full">
    <NDataTable
      v-model:checked-row-keys="checkedRowKeys"
      :columns="columns"
      :data="data"
      size="small"
      :flex-height="!appStore.isMobile"
      :scroll-x="1400"
      :loading="loading"
      remote
      :row-key="(row) => row.id"
      :pagination="pagination"
      class="sm:h-full"
    />

    <!-- 查看子服弹窗 -->
    <NModal
      v-model:show="showChildrenModal"
      preset="card"
      :title="`${currentServerData?.serverName || ''} 的合并服务器`"
      class="w-600px"
    >
      <div v-if="currentServerData?.children && currentServerData.children.length > 0">
        <NSpace vertical size="large">
          <NCard
            v-for="(child, index) in currentServerData.children"
            :key="child.serverId"
            size="small"
            :bordered="false"
          >
            <template #header>
              <div class="flex items-center justify-between">
                <span class="font-medium">子服 {{ Number(index) + 1 }}</span>
                <NTag :type="child.serverType === 'MERGE' ? 'info' : 'success'" size="small">
                  {{ child.serverType === 'MERGE' ? '已合并' : '普通服' }}
                </NTag>
              </div>
            </template>
            <NDescriptions :column="2" label-placement="left" bordered size="small">
              <NDescriptionsItem label="服务器ID">
                {{ child.serverId }}
              </NDescriptionsItem>
              <NDescriptionsItem label="服务器名称">
                {{ child.serverName }}
              </NDescriptionsItem>
              <NDescriptionsItem label="服务器类型" :span="2">
                {{ child.serverType || '-' }}
              </NDescriptionsItem>
            </NDescriptions>
          </NCard>
        </NSpace>
      </div>
      <div v-else class="text-center py-8">
        暂无合并的服务器
      </div>
    </NModal>
  </div>
</template>
