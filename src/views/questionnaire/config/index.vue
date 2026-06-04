<script setup lang="tsx">
import {
  fetchGetQuestionnaireList,
  fetchDeleteQuestionnaire,
} from "@/service/api/game-manage";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import { NButton, NPopconfirm, NTag, NProgress, NTooltip } from "naive-ui";
import {
  unlockTypeRecord,
  questionnaireStatusRecord,
} from "@/constants/business";
import { useTable, useTableOperate } from "@/hooks/common/table";
// import QuestionnaireSearch from "./modules/questionnaire-search.vue";
import QuestionnaireOperateDrawer from "./modules/questionnaire-operate-drawer.vue";
import { ref, onMounted, h } from "vue";
import { useAuth } from "@/hooks/business/auth";
import { format } from "date-fns";
import { useItemPackage } from "@/hooks/business/useItemPackage";


const { hasAuth } = useAuth();
const appStore = useAppStore();

// 添加物品数据状态
const itemData = ref<any>(null);

// 获取物品数据
onMounted(async () => {
  try {
    const data = await useItemPackage();
    itemData.value = data;
  } catch (error) {
    console.error("获取物品数据失败:", error);
    itemData.value = null;
  }
});

// 解析并格式化物品信息
function formatGoodsJson(goodsJson: string) {
  if (!goodsJson || !itemData.value?.data?.item) {
    return goodsJson || '-';
  }

  try {
    const goodsData = JSON.parse(goodsJson);
    const itemIds = goodsData.item_ids || [];
    const itemCounts = goodsData.item_counts || [];

    if (itemIds.length === 0) {
      return '-';
    }

    const items = itemIds.map((id: number, index: number) => {
      const item = itemData.value.data.item[id];
      const itemName = item?.names || item?.name || `物品${id}`;
      const count = itemCounts[index] || 1;
      return `${itemName} x${count}`;
    });

    return items.join(', ');
  } catch (e) {
    console.error('解析goodsJson失败:', e);
    return goodsJson;
  }
}

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
  apiFn: fetchGetQuestionnaireList,
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
      title: $t("page.manage.questionnaire.id"),
      align: "center",
      width: 60,
    },
    {
      key: "title",
      title: $t("page.manage.questionnaire.title"),
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
    },
    {
      key: "mailTitle",
      title: $t("page.manage.questionnaire.mailTitle"),
      align: "center",
      width: 150,
      ellipsis: { tooltip: true },
    },
    {
      key: "mailContent",
      title: $t("page.manage.questionnaire.mailContent"),
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
    },
    {
      key: "unlockType",
      title: $t("page.manage.questionnaire.unlockType"),
      align: "center",
      width: 80,
      render: (row: any) => {
        if (row.unlockType === null) {
          return null;
        }
        const label = $t(unlockTypeRecord[row.unlockType]);
        return <span>{label}</span>;
      },
    },
    {
      key: "unlockLevel",
      title: $t("page.manage.questionnaire.unlockLevel"),
      align: "center",
      width: 80,
    },
    {
      key: "goodsJson",
      title: $t("page.manage.questionnaire.goodsJson"),
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
      render: (row: any) => {
        const formattedGoods = formatGoodsJson(row.goodsJson);
        return <span title={formattedGoods}>{formattedGoods}</span>;
      },
    },
    {
      key: "wjxUrl",
      title: $t("page.manage.questionnaire.wjxUrl"),
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
    },
    {
      key: "status",
      title: $t("page.manage.questionnaire.status"),
      align: "center",
      width: 80,
      ellipsis: { tooltip: true },
      render: (row: any) => {
        if (row.status === null) {
          return null;
        }

        const tagMap: Record<string, NaiveUI.ThemeColor> = {
          0: "error",
          1: "success",
        };

        const label = $t(questionnaireStatusRecord[row.status]);

        return <NTag type={tagMap[row.status]}>{label}</NTag>;
      },
    },
    {
      key: "createdBy",
      title: $t("page.manage.questionnaire.createdBy"),
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
    },
    {
      key: "createdAt",
      title: $t("page.manage.questionnaire.createdAt"),
      align: "center",
      width: 180,
      ellipsis: { tooltip: true },
      render: (row: any) => {
        return format(new Date(row.createdAt), "yyyy-MM-dd HH:mm:ss");
      },
    },
    {
      key: "updatedAt",
      title: $t("page.manage.questionnaire.updatedAt"),
      align: "center",
      width: 180,
      ellipsis: { tooltip: true },
      render: (row: any) => {
        return format(new Date(row.updatedAt), "yyyy-MM-dd HH:mm:ss");
      },
    },
    {
      key: "operate",
      title: $t("common.operate"),
      align: "center",
      width: 120,
      render: (row: any) => (
        <div class="flex-center gap-8px">
          {hasAuth("operate:survey:edit") && (
            <NButton
              type="primary"
              ghost
              size="small"
              onClick={() => edit(row.id, row)}
            >
              {$t("common.edit")}
            </NButton>
          )}

          {hasAuth("operate:survey:remove") && (
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
  handleAdd,
  handleEdit,
  checkedRowKeys,
  onBatchDeleted,
  onDeleted,
  // closeDrawer
} = useTableOperate(data, getData);

function handleSearch(title: string, status: string, createdBy: string) {
  const params: any = {
    title,
    status,
    createdBy,
  };
  updateSearchParams(params);
  getData();
}

async function handleBatchDelete() {
  try {
    const deletePromises = checkedRowKeys.value.map((id: string) => {
      return fetchDeleteQuestionnaire({ id: Number(id) });
    });
    const responses = await Promise.all(deletePromises);

    onBatchDeleted(responses);
  } catch (error: any) {
    onBatchDeleted(error);
  }
}

async function handleDelete(id: number) {
  try {
    const response = await fetchDeleteQuestionnaire({ id });

    onDeleted(response);
  } catch (error: any) {
    onDeleted(error);
  }
}

function edit(id: number, row: any) {
  const editData = {
    ...row,
  };
  handleEdit(id, editData);
}

const currentServerId = ref("");
</script>

<template>
  <div
    class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto"
  >
    <!-- <QuestionnaireSearch
      ref="questionnaireSearchRef"
      v-model:model="searchParams"
      @reset="resetSearchParams"
      @search="handleSearch"
    /> -->
    <NCard
      :title="$t('page.manage.questionnaire.titles')"
      :bordered="false"
      size="small"
      class="sm:flex-1-hidden card-wrapper"
    >
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :disabled-delete="checkedRowKeys.length === 0"
          :loading="loading"
          @add="handleAdd"
          @delete="handleBatchDelete"
          @refresh="getData"
          :show-add="hasAuth('operate:survey:add')"
          :show-batch-delete="hasAuth('operate:survey:remove')"
        />
      </template>

      <NDataTable
        v-model:checked-row-keys="checkedRowKeys"
        :columns="columns"
        :data="data"
        size="small"
        :flex-height="!appStore.isMobile"
        :scroll-x="1080"
        :loading="loading"
        remote
        :row-key="(row) => row.id"
        :pagination="mobilePagination"
        class="sm:h-full"
      />

      <QuestionnaireOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        :server-id="currentServerId"
        @submitted="getDataByPage"
      />
    </NCard>
  </div>
</template>

<style scoped>
</style>
