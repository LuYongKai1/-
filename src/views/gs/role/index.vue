<script setup lang="tsx">
import {
  fetchGetGsRoleTagsList,
  fetchRemoveGsRoleTag,
  fetchGetGsRoleTagStatistics,
} from "@/service/api/game-manage";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import { NButton, NTag } from "naive-ui";
import { gsRoleTagStatusRecord, gsRoleTagTypeRecord } from "@/constants/business";
import { useTable, useTableOperate } from "@/hooks/common/table";
import GiftActivityOperateDrawer from "./modules/role-activity-operate-drawer.vue";
import RoleSelect from "./modules/role-select.vue";
import { ref, onMounted } from "vue";
import { useAuth } from "@/hooks/business/auth";
import { useRouter } from "vue-router";


const { hasAuth } = useAuth();
const router = useRouter();
const appStore = useAppStore();

type GsRoleTagStatistics = {
  gsCount: number;
  internalCount: number;
  activeCount: number;
};

const statistics = ref<GsRoleTagStatistics>({
  gsCount: 0,
  internalCount: 0,
  activeCount: 0
});

// 获取GS标记统计信息
onMounted(async () => {
  try {
    const res = await fetchGetGsRoleTagStatistics();
    const resData = (res?.data ?? {}) as Partial<GsRoleTagStatistics>;
    statistics.value = {
      gsCount: Number(resData.gsCount ?? 0),
      internalCount: Number(resData.internalCount ?? 0),
      activeCount: Number(resData.activeCount ?? 0)
    };
  } catch (error) {
    console.error("获取GS标记统计信息失败:", error);
    statistics.value = {
      gsCount: 0,
      internalCount: 0,
      activeCount: 0
    };
  }
});


const {
  columns,
  columnChecks,
  data,
  getData,
  getDataByPage,
  scrollX,
  loading,
  mobilePagination,
  searchParams,
  resetSearchParams,
  updateSearchParams,
} = useTable({
  apiFn: fetchGetGsRoleTagsList,
  showTotal: true,
  apiParams: {
    current: 1,
    size: 10,
  },
  columns: () => [
    {
      type: "selection",
      align: "center",
      width: 50,
    },
    {
      key: "roleId",
      title: $t("page.manage.gsRole.roleId"),
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
    },
    {
      key: "tagType",
      title: $t("page.manage.gsRole.tagType"),
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
      render: (row: any) => {
        if (row.tagType === null || row.tagType === undefined) {
          return "-";
        }
        const typeKey = `${row.tagType}` as keyof typeof gsRoleTagTypeRecord;
        const label = $t(gsRoleTagTypeRecord[typeKey]);
        return <NTag type="info">{label}</NTag>;
      },
    },
    {
      key: "userName",
      title: $t("page.manage.gsRole.userName"),
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
    },
    {
      key: "quota",
      title: $t("page.manage.gsRole.quota"),
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
    },
    {
      key: "reason",
      title: $t("page.manage.gsRole.reason"),
      align: "center",
      minWidth: 200,
      ellipsis: { tooltip: true },
    },
    {
      key: "status",
      title: $t("page.manage.gsRole.status"),
      align: "center",
      minWidth: 100,
      ellipsis: { tooltip: true },
      render: (row: any) => {
        if (row.status === null || row.status === undefined) {
          return "-";
        }
        const statusKey = `${row.status}` as keyof typeof gsRoleTagStatusRecord;
        const label = $t(gsRoleTagStatusRecord[statusKey]);
        // 状态为 0 时显示红色"失效"，状态为 1 时显示绿色"生效"，状态为 2 时显示橙色"待审核"
        let tagType: "error" | "success" | "warning" = "success";
        if (statusKey === "0") {
          tagType = "error";
        } else if (statusKey === "2") {
          tagType = "warning";
        } else {
          tagType = "success";
        }
        return <NTag type={tagType}>{label}</NTag>;
      },
    },
    {
      key: "viewOrders",
      title: "订单",
      align: "center",
      width: 80,
      fixed: "right",
      render: (row: any) => (
        <NButton
          text
          type="info"
          onClick={() => handleViewOrders(row)}
          title="查看订单"
        >
          <icon-mdi-file-document-outline class="text-20px" />
        </NButton>
      ),
    },
    {
      key: "operate",
      title: $t("common.operate"),
      align: "center",
      width: 280,
      fixed: "right",
      render: (row: any) => (
        <div class="flex items-center justify-center gap-4px flex-wrap">
          {hasAuth('operate:gsRoleTags:edit') && (
            <NButton type="primary" ghost size="small" onClick={() => edit(row.id, row)}>
              {$t('page.manage.gsRole.editrole')}
            </NButton>
          )}
          {hasAuth('operate:gsRoleTags:remove') && (
            <NButton type="error" ghost size="small" onClick={() => handleRemoveTag(row)}>
              {$t('page.manage.gsRole.removeTag')}
            </NButton>
          )}
        </div>
      ),
    },
  ] as any,
  defaultHiddenKeys: []
});

const {
  drawerVisible,
  operateType,
  editingData,
  handleAdd,
  handleEdit,
  checkedRowKeys,
  onBatchDeleted,
  onDeleted,
  // closeDrawer
} = useTableOperate(data, getData);

function handleSearch(roleId: string, tagType: string, userName: string, status: string | number | null | undefined) {
  const params: any = {
    roleId,
    tagType,
    userName,
    status,
  };
  updateSearchParams(params);
  getData();
}

async function handleBatchDelete() {
  try {
    const deletePromises = checkedRowKeys.value.map((id: string | number) => {
      return fetchRemoveGsRoleTag({ id: Number(id) });
    });
    const responses = await Promise.all(deletePromises);

    onBatchDeleted(responses);
  } catch (error: any) {
    onBatchDeleted(error);
  }
}

function edit(id: number, row: any) {
  const editData = {
    ...row,
  };
  handleEdit(id, editData);
}

const currentServerId = ref("");

// 添加审核处理方法
function handleAudit() {
  if (checkedRowKeys.value.length === 0) {
    window.$message?.error('请选择一条记录进行审核');
    return;
  }

  if (checkedRowKeys.value.length > 1) {
    window.$message?.error('请选择一条记录进行审核');
    return;
  }

  const selectedId = checkedRowKeys.value[0];
  const selectedRow = data.value.find(item => item.id === selectedId);

  if (!selectedRow) {
    window.$message?.error('未找到对应的记录');
    return;
  }

  // 新增：检查记录状态是否为待审核（status=2）
  if (selectedRow.status !== 2) {
    window.$message?.error('只有待审核状态的记录才能进行审核操作');
    return;
  }

  // 使用drawer进行审核，传入'audit'作为操作类型
  const editData = {
    ...selectedRow,
  };
  handleEdit(selectedRow.id, editData);
  // 手动设置操作类型为audit
  operateType.value = 'audit';
}

function handleRemoveTag(row: any) {
  fetchRemoveGsRoleTag({ id: Number(row.id) })
    .then(res => {
      onDeleted(res);
    })
    .catch((err: any) => {
      onDeleted(err);
    });
}

/**
 * 跳转到GS订单页面查看指定角色的订单
 * @param row - 角色数据行
 */
function handleViewOrders(row: any) {
  if (!row.roleId) {
    window.$message?.warning('角色ID不存在，无法查看订单');
    return;
  }

  router.push({
    name: 'gs_order',
    query: {
      roleId: row.roleId
    }
  });
}

// 处理提交完成后的逻辑
function handleSubmitted() {
  // 清空选中的记录
  checkedRowKeys.value = [];
  // 刷新数据
  getDataByPage();
}

</script>

<template>
  <div class="flex-col gap-16px lt-sm:overflow-auto">
    <!-- 统计卡片区域 -->
    <div class="simple-stats-grid">
      <NCard class="simple-card simple-card-blue" :bordered="false">
        <div class="simple-card-body">
          <div class="simple-card-title">GS标记总数</div>
          <div class="simple-card-value">{{ statistics.gsCount }}</div>
        </div>
      </NCard>

      <NCard class="simple-card simple-card-orange" :bordered="false">
        <div class="simple-card-body">
          <div class="simple-card-title">内部号总数</div>
          <div class="simple-card-value">{{ statistics.internalCount }}</div>
        </div>
      </NCard>

      <NCard class="simple-card simple-card-green" :bordered="false">
        <div class="simple-card-body">
          <div class="simple-card-title">生效中</div>
          <div class="simple-card-value">{{ statistics.activeCount }}</div>
        </div>
      </NCard>
    </div>

    <RoleSelect
      :model="searchParams"
      @reset="resetSearchParams"
      @search="handleSearch"
    />

    <NCard
      title="GS角色列表"
      :bordered="false"
      size="small"
      class="sm:flex-1-hidden card-wrapper"
    >
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :disabled-delete="checkedRowKeys.length === 0"
          :loading="loading"
          @audit="handleAudit"
          @add="handleAdd"
          @delete="handleBatchDelete"
          @refresh="getData"
          :show-audit="hasAuth('operate:gsRoleTags:audit')"
          :show-add="hasAuth('operate:gsRoleTags:add')"
          :show-batch-delete="hasAuth('operate:gsRoleTags:remove')"
        />
      </template>

      <NDataTable
        v-model:checked-row-keys="checkedRowKeys"
        :columns="columns"
        :data="data"
        size="small"
        :flex-height="!appStore.isMobile"
        :scroll-x="scrollX"
        :loading="loading"
        remote
        :row-key="(row) => row.id"
        :pagination="mobilePagination"
        class="sm:h-full"
      />

      <GiftActivityOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        :server-id="currentServerId"
        @submitted="handleSubmitted"
      />

    </NCard>
  </div>
</template>

<style scoped>
/* 统计卡片样式 */
.simple-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}
.simple-card {
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.06);
  border-left: 4px solid transparent;
}
.simple-card :deep(.n-card__content),
.simple-card :deep(.n-card-body) {
  padding: 16px 20px;
}
.simple-card-blue { border-left-color: #3b82f6; }
.simple-card-orange { border-left-color: #f59e0b; }
.simple-card-green { border-left-color: #10b981; }
.simple-card-title {
  font-size: 12px;
  color: var(--text-color-3);
  margin-bottom: 8px;
}
.simple-card-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-color);
  line-height: 1;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .simple-stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
