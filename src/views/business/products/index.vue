<script setup lang="tsx">
import { NButton, NPopconfirm, NTag } from "naive-ui";
import { fetchGetProductList, fetchDeleteProduct, fetchExportProduct } from "@/service/api";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import { productStatusRecord } from "@/constants/business";
import { useTable, useTableOperate } from "@/hooks/common/table";
import { handleApiResponseError, handleApiCatchError } from '@/utils/common';
import ProductsSearch from "./modules/products-search.vue";
import { ref, onMounted } from "vue";
import UserOperateDrawer from "./modules/products-operate-drawer.vue";
import ProductsImportModal from "./modules/products-import-modal.vue";
import { useAuth } from "@/hooks/business/auth";
import { format } from 'date-fns';
const { hasAuth } = useAuth();
const appStore = useAppStore();

const importModalVisible = ref(false);
const {
  columns,
  columnChecks,
  data,
  getData,
  getDataByPage,
  loading,
  mobilePagination,
  searchParams,
  resetSearchParams,
  updateSearchParams,
} = useTable({
  apiFn: fetchGetProductList,
  showTotal: true,
  // immediate: false/,
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
      key: "productId",
      title: $t("page.manage.products.productId"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "serverId",
      title: $t("page.manage.Gems.serverId"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "gameProductId",
      title: $t("page.manage.products.gameProductId"),
      align: "center",
      minWidth: 120,
    },
    {
      key: "productName",
      title: $t("page.manage.products.productName"),
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
    },
    {
      key: "productPrice",
      title: $t("page.manage.products.productPrice"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "nativePrice",
      title: $t("page.manage.products.nativePrice"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "dollarPrice",
      title: $t("page.manage.products.dollarPrice"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "productNumber",
      title: $t("page.manage.products.productNumber"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "productDescribe",
      title: $t("page.manage.products.productDescribe"),
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
    },
    {
      key: "productType",
      title: $t("page.manage.products.productType"),
      align: "center",
      minWidth: 120,
      render: (row: any) => {
        const typeMap: Record<number, string> = {
          1: "SDK",
          2: "WEB",
        };
        return typeMap[row.productType] || row.productType;
      },
    },
    {
      key: "enable",
      title: $t("page.manage.products.enable"),
      align: "center",
      minWidth: 120,
      render: (row:any) => {
        if (row.enable === null) {
          return null;
        }

        const tagMap: Record<Api.SystemManage.productStatus, NaiveUI.ThemeColor> = {
          'true': "success",
          'false': "error",
        };

        const label = $t(productStatusRecord[row.enable]);

        return <NTag type={tagMap[row.enable]}>{label}</NTag>;
      },
    },
    {
      key: "createDate",
      title: $t("page.manage.products.createDate"),
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
      render: (row: any) => {
        return row.createDate ? format(new Date(row.createDate), 'yyyy-MM-dd HH:mm:ss') : '';
      },
    },
    {
      key: "updateDate",
      title: $t("page.manage.products.updateDate"),
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
      render: (row: any) => {
        return row.updateDate ? format(new Date(row.updateDate), 'yyyy-MM-dd HH:mm:ss') : '';
      },
    },
    {
      key: "productIndex",
      title: $t("page.manage.products.productIndex"),
      align: "center",
      minWidth: 30,
    },
    // {
    //   key: "operate",
    //   title: $t("common.operate"),
    //   align: "center",
    //   width: 130,
    //   render: (row: any) => (
    //     <div class="flex-center gap-8px">
    //       {hasAuth('game:product:edit') && (
    //       <NButton
    //         type="primary"
    //         ghost
    //         size="small"
    //         onClick={() => edit(row.productId, row)}
    //       >
    //         {$t("common.edit")}
    //       </NButton>
    //       )}

    //       {hasAuth('game:product:remove') && (
    //       <NPopconfirm onPositiveClick={() => handleDelete(row.productId)}>
    //         {{
    //           default: () => $t("common.confirmDelete"),
    //           trigger: () => (
    //             <NButton type="error" ghost size="small">
    //               {$t("common.delete")}
    //             </NButton>
    //           ),
    //         }}
    //       </NPopconfirm>
    //       )}
    //     </div>
    //   ),
    // },
  ],
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

function handleSearch(serverId: string, gameProductId: string) {
  currentServerId.value = serverId;
  const params: any = {
    serverId,
    gameProductId,
  };
  updateSearchParams(params);
  getData();
}

async function handleBatchDelete() {
  const deletePromises = checkedRowKeys.value.map((id: string) => {
    return fetchDeleteProduct({ id: Number(id) });
  });
  await Promise.all(deletePromises);
  onBatchDeleted();
}

async function handleDelete(id: number) {
  await fetchDeleteProduct({ id });
  onDeleted();
}

function edit(id: number, row: any) {
  const editData = {
    ...row,
  };

  handleEdit(id, editData);
}

// 当前选中的服务器ID
const currentServerId = ref("");

// 添加产品时传递当前选中的服务器
function handleAddWithServer() {
  if (!currentServerId.value) {
    // @ts-ignore
    window.$message?.warning($t("page.manage.common.pleaseSelectServer"));
    return;
  }
  handleAdd();
}

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
    const response = await fetchExportProduct({
      serverId: currentServerId.value || undefined
    });

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
    link.download = `商品列表_${currentServerId.value || 'all'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
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
  <div
    class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto"
  >
    <ProductsSearch
      v-model:model="searchParams"
      @reset="resetSearchParams"
      @search="handleSearch"
    />
    <NCard
      :title="$t('page.manage.products.title')"
      :bordered="false"
      size="small"
      class="sm:flex-1-hidden card-wrapper"
    >
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :disabled-delete="checkedRowKeys.length === 0"
          :loading="loading"
          @add="handleAddWithServer"
          @delete="handleBatchDelete"
          @refresh="getData"
          @import="handleImport"
          @export="handleExport"
          :show-import="hasAuth('game:product:import')"
          :show-export="hasAuth('game:product:export')"
          :show-export-confirm="true"
        />
      </template>
      <NDataTable
        v-model:checked-row-keys="checkedRowKeys"
        :columns="columns"
        :data="data"
        size="small"
        :flex-height="!appStore.isMobile"
        :scroll-x="1900"
        :loading="loading"
        remote
        :row-key="(row) => row.productId"
        :pagination="mobilePagination"
        class="sm:h-full"
      />
      <ProductsImportModal
        v-model:visible="importModalVisible"
        :server-id="currentServerId || undefined"
        @success="getData"
      />

      <UserOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        @submitted="getDataByPage"
      />
    </NCard>
  </div>
</template>

<style scoped></style>
