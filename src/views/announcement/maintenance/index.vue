<script setup lang="tsx">
import { NButton, NPopconfirm, NTag, NModal } from "naive-ui";
import {
  fetchGetMaintenanceNotice,
  fetchDeleteMaintenanceNotice,
} from "@/service/api";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import { useTable, useTableOperate } from "@/hooks/common/table";
import activityOperateDrawer from "./modules/maintenance-operate-drawer.vue";
import { ref, onMounted } from "vue";
import { format } from "date-fns";
import { useAuth } from "@/hooks/business/auth";
const { hasAuth } = useAuth();

const appStore = useAppStore();
const previewVisible = ref(false);
const previewImageUrl = ref("");

function handleImageClick(url: string) {
  previewImageUrl.value = url;
  previewVisible.value = true;
}

const {
  columns,
  columnChecks,
  data,
  getData,
  getDataByPage,
  loading,
  mobilePagination,
} = useTable({
  apiFn: fetchGetMaintenanceNotice,
  showTotal: true,
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
      title: $t("page.manage.activityimages.ID"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "title",
      title: $t("page.manage.maintenance.title"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "content",
      title: $t("page.manage.maintenance.content"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "banner",
      title: $t("page.manage.maintenance.banner"),
      align: "center",
      minWidth: 120,
      render: (row) => (
        <div class="flex-center">
          <img
            src={row.banner}
            alt={row.title}
            style="max-width: 100px; max-height: 60px; object-fit: contain; cursor: pointer;"
            onClick={() => handleImageClick(row.banner)}
          />
        </div>
      ),
    },

    {
      key: "publishTime",
      title: $t("page.manage.maintenance.publishTime"),
      align: "center",
      minWidth: 100,
      render: (row) => {
        return format(new Date(row.publishTime), "yyyy-MM-dd HH:mm:ss");
      },
    },
    {
      key: "linitTime",
      title: $t("page.manage.maintenance.linitTime"),
      align: "center",
      minWidth: 100,
      render: (row) => {
        return format(new Date(row.linitTime), "yyyy-MM-dd HH:mm:ss");
      },
    },
    {
      key: "operate",
      title: $t("common.operate"),
      align: "center",
      width: 130,
      render: (row) => (
        <div class="flex-center gap-8px">
          {hasAuth("operate:maintenanceNotice:edit") && (
            <NButton
              type="primary"
              ghost
              size="small"
              onClick={() => edit(row.id, row)}
            >
              {$t("common.edit")}
            </NButton>
          )}

          {hasAuth("operate:maintenanceNotice:remove") && (
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
      ),
    },
  ],
});

const {
  drawerVisible,
  operateType,
  editingData,
  openDrawer,
  handleEdit,
  checkedRowKeys,
  onBatchDeleted,
  onDeleted,
} = useTableOperate(data, getData);

function handleAdd() {
  drawerVisible.value = true;
  operateType.value = "add";
}

async function handleBatchDelete() {
  const response = await fetchDeleteMaintenanceNotice({
    id: checkedRowKeys.value,
  });
  onBatchDeleted();
}

async function handleDelete(id: number) {
  await fetchDeleteMaintenanceNotice({ id });
  onDeleted();
}

function edit(id: number, row: any) {
  const editData = {
    ...row,
  };
  handleEdit(id, editData);
}

onMounted(() => {
  data.value = [];
});
</script>

<template>
  <div
    class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto"
  >
    <NCard
      :title="$t('page.manage.norice.title')"
      :bordered="false"
      size="small"
      class="sm:flex-1-hidden card-wrapper"
    >
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :disabled-delete="checkedRowKeys.length === 0"
          :loading="loading"
          :show-add="hasAuth('operate:maintenanceNotice:add')"
          :show-batch-delete="hasAuth('operate:maintenanceNotice:remove')"
          @add="handleAdd"
          @delete="handleBatchDelete"
          @refresh="getData"
        />
      </template>

      <NDataTable
        v-model:checked-row-keys="checkedRowKeys"
        :columns="columns"
        :data="data"
        size="small"
        :flex-height="!appStore.isMobile"
        :scroll-x="962"
        :loading="loading"
        remote
        :row-key="(row) => row.id"
        :pagination="mobilePagination"
        class="sm:h-full"
      />

      <activityOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        @submitted="getDataByPage"
      />

      <!-- 图片预览模态框 -->
      <NModal
        v-model:show="previewVisible"
        preset="card"
        style="width: auto; max-width: 95vw; max-height: 95vh"
        :mask-closable="true"
        :bordered="false"
        :title="$t('common.preview')"
        class="image-preview-modal"
      >
        <div class="flex justify-center items-center p-2">
          <img
            :src="previewImageUrl"
            class="preview-image rounded shadow-lg transition-all"
            style="max-width: 90vw; max-height: 80vh; object-fit: contain"
          />
        </div>
      </NModal>
    </NCard>
  </div>
</template>


<style scoped>
.preview-image {
  transition: transform 0.3s ease;
}
.preview-image:hover {
  transform: scale(1.02);
}
.image-preview-modal :deep(.n-card) {
  background-color: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
}
</style>
