<script setup lang="tsx">
import { NButton, NPopconfirm, NTag, NModal } from "naive-ui";
import {
  fetchGetCustomerServiceActivityList,
  fetchDeleteCustomerServiceActivity,
} from "@/service/api";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import { useTable, useTableOperate } from "@/hooks/common/table";
import activityOperateDrawer from "./modules/activityimg-operate-drawer.vue";
import { ref, onMounted } from "vue";
import { format } from 'date-fns';
import { useAuth } from '@/hooks/business/auth';

const { hasAuth } = useAuth();

const appStore = useAppStore();
const previewVisible = ref(false);
const previewImageUrl = ref('');
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
  apiFn: fetchGetCustomerServiceActivityList,
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
      title: $t("page.manage.operateqrcode.id"),
      align: "center",
      minWidth: 80,
    },
    {
      key: "title" as any,
      title: $t("page.manage.operateqrcode.activityTitle"),
      align: "center",
      minWidth: 120,
    },
    {
      key: "description",
      title: $t("page.manage.operateqrcode.activityDescription"),
      align: "center",
      minWidth: 150,
      ellipsis: { tooltip: true },
    },
    {
      key: "buttonText" as any,
      title: $t("page.manage.operateqrcode.buttonText"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "qrCodeUrl" as any,
      title: $t("page.manage.operateqrcode.qrCodeUrl"),
      align: "center",
      minWidth: 120,
      render: (row: any) => (
        <div class="flex-center">
          <img
            src={row.qrCodeUrl}
            alt={$t("page.manage.operateqrcode.qrCode")}
            style="max-width: 80px; max-height: 80px; object-fit: contain; cursor: pointer;"
            onClick={() => handleImageClick(row.qrCodeUrl)}
          />
        </div>
      )
    },
    {
      key: "backgroundUrl" as any,
      title: $t("page.manage.operateqrcode.backgroundUrl"),
      align: "center",
      minWidth: 120,
      render: (row: any) => (
        <div class="flex-center">
          <img
            src={row.backgroundUrl}
            alt={$t("page.manage.operateqrcode.backgroundImage")}
            style="max-width: 100px; max-height: 60px; object-fit: contain; cursor: pointer;"
            onClick={() => handleImageClick(row.backgroundUrl)}
          />
        </div>
      )
    },
    {
      key: "jumpUrl" as any,
      title: $t("page.manage.operateqrcode.jumpUrl"),
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
    },
    {
      key: "channelCode" as any,
      title: $t("page.manage.operateqrcode.channelCode"),
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
    },
    {
      key: "sortOrder" as any,
      title: $t("page.manage.operateqrcode.sortOrder"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "status" as any,
      title: $t("page.manage.operateqrcode.status"),
      align: "center",
      minWidth: 100,
      render: (row: any) => (
        <NTag type={row.status === 1 ? 'success' : 'default'}>
          {row.status === 1 ? $t("page.manage.operateqrcode.statusOptions.enable") : $t("page.manage.operateqrcode.statusOptions.disable")}
        </NTag>
      )
    },
    {
      key: "operate",
      title: $t("common.operate"),
      align: "center",
      width: 130,
      render: (row: any) => (
        <div class="flex-center gap-8px">
          {hasAuth('operate:social:edit') && (
            <NButton
            type="primary"
            ghost
            size="small"
            onClick={() => edit(row.id, row)}
          >
            {$t("common.edit")}
          </NButton>
          )}

          {hasAuth('operate:social:remove') && (
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
} = useTableOperate(data as any, getData);

function handleAdd() {
  drawerVisible.value = true;
  operateType.value = 'add';
}

async function handleBatchDelete() {
  const response = await fetchDeleteCustomerServiceActivity({
    id: checkedRowKeys.value as any,
  });
  onBatchDeleted();
}

async function handleDelete(id: number) {
  await fetchDeleteCustomerServiceActivity({ id });
  onDeleted();
}

function edit(id: number, row: any) {
  const editData = {
    ...row,
  };
  handleEdit(id, editData);
}

onMounted(() => {
  getData();
});
</script>

<template>
  <div
    class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto"
  >
    <NCard
      :title="$t('page.manage.operateqrcode.title')"
      :bordered="false"
      size="small"
      class="sm:flex-1-hidden card-wrapper"
    >
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :disabled-delete="checkedRowKeys.length === 0"
          :loading="loading"
          :show-add="hasAuth('operate:social:add')"
          :show-batch-delete="hasAuth('operate:social:remove')"
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
        :scroll-x="1400"
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

      <NModal
        v-model:show="previewVisible"
        preset="card"
        style="width: auto; max-width: 95vw; max-height: 95vh;"
        :mask-closable="true"
        :bordered="false"
        :title="$t('common.preview')"
        class="image-preview-modal"
      >
        <div class="flex justify-center items-center p-2">
          <img
            :src="previewImageUrl"
            class="preview-image rounded shadow-lg transition-all"
            style="max-width: 90vw; max-height: 80vh; object-fit: contain;"
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
