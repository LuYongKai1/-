<script setup lang="tsx">
import { onMounted, ref } from "vue";
import { NButton, NPopconfirm } from "naive-ui";
import TableHeaderOperation from "@/components/advanced/table-header-operation.vue";
import RewardConfigSearch from "./modules/rewardconfig-search.vue";
import RewardConfigAddModal from "./modules/rewardconfig-add-modal.vue";
import { useAppStore } from "@/store/modules/app";
import { useTable } from "@/hooks/common/table";
import {
  fetchDeleteSeasonRewardConfig,
  fetchGetSeasonRankRewardRuleList,
} from "@/service/api/game-manage";
import { handleApiCatchError } from "@/utils/common";
import { useItemPackage } from "@/hooks/business/useItemPackage";
import { parseGoodsJson } from "@/utils/item";

defineOptions({
  name: "SeasonRankRewardConfig"
});

const appStore = useAppStore();

type RewardRuleRow = {
  id: string;
  seasonId: number;
  seasonName: string;
  rankStart: number;
  rankEnd: number;
  rewardType: RewardType;
  rewardContent: any;
};

type RewardType = "INDIVIDUAL" | "GUILD";

const deleteLoadingId = ref<string | null>(null);
const itemPackageRef = ref<any>(null);
const addModalVisible = ref(false);
const editRow = ref<RewardRuleRow | null>(null);

function openAddModal() {
  editRow.value = null;
  addModalVisible.value = true;
}

function openEditModal(row: RewardRuleRow) {
  editRow.value = row;
  addModalVisible.value = true;
}

function unwrapResponseData(res: any) {
  return res?.data?.data ?? res?.data ?? res?.response?.data ?? res;
}

function isApiSuccess(data: any): boolean {
  if (data === null || data === undefined) return false;
  const code = data?.code ?? data?.response?.data?.code;
  if (code === undefined || code === null) return true;
  return code === 200 || code === 0;
}

function parseRewardRows(res: any): RewardRuleRow[] {
  const raw = unwrapResponseData(res);
  const list = Array.isArray(raw) ? raw : raw?.list ?? raw?.rows ?? [];
  return (list as any[]).map((row, index) => {
    const rewardContent =
      row.rewardContent ??
      row.reward_content ??
      row.rewardJson ??
      row.reward_json ??
      row.goodsJson ??
      row.goods ??
      [];

    return {
      id: String(row.id ?? row.ruleId ?? `local-${index}`),
      seasonId: Number(row.seasonId ?? row.season_id ?? 0),
      seasonName: String(row.seasonName ?? row.season_name ?? ""),
      rankStart: Number(row.rankStart ?? row.rank_start ?? row.rank_from ?? row.startRank ?? 0),
      rankEnd: Number(row.rankEnd ?? row.rank_end ?? row.rank_to ?? row.endRank ?? 0),
      rewardType: (row.rewardType ?? row.reward_type ?? "INDIVIDUAL") as RewardType,
      rewardContent
    };
  });
}

function rewardSummary(rewardContent: any): string {
  if (!rewardContent) return "—";

  // 新版：reward_content 为数组：[{ itemId, name, num }, ...]
  if (Array.isArray(rewardContent)) {
    const items = rewardContent
      .map((it: any) => ({
        id: it.itemId ?? it.id,
        name: it.name ?? it.itemName ?? it.names,
        count: it.num ?? it.count
      }))
      .filter((it: any) => it.id !== undefined && it.id !== null);

    if (!items.length) return "—";
    return (
      items
        .slice(0, 5)
        .map(it => `${it.name || it.id}×${it.count ?? 0}`)
        .join("，") + (items.length > 5 ? " …" : "")
    );
  }

  // 兼容旧版：rewardContent 是 goodsJson 字符串
  if (typeof rewardContent === "string") {
    // 新版：rewardContent 是 JSON 数组字符串
    if (rewardContent.trim().startsWith("[")) {
      try {
        const arr = JSON.parse(rewardContent);
        if (Array.isArray(arr)) {
          const items = arr
            .map((it: any) => ({
              id: it.itemId ?? it.id,
              name: it.name ?? it.itemName ?? it.names,
              count: it.num ?? it.count
            }))
            .filter((it: any) => it.id !== undefined && it.id !== null);
          if (items.length) {
            return (
              items
                .slice(0, 5)
                .map(it => `${it.name || it.id}×${it.count ?? 0}`)
                .join("，") + (items.length > 5 ? " …" : "")
            );
          }
        }
      } catch {
        return "—";
      }
    }

    try {
      const items = parseGoodsJson(rewardContent, itemPackageRef.value);
      if (!items.length) return "—";
      return items
        .slice(0, 5)
        .map(it => `${it.name || it.id}×${it.count}`)
        .join("，") + (items.length > 5 ? " …" : "");
    } catch {
      return "—";
    }
  }

  // 兜底：对象/其它类型
  try {
    const items = parseGoodsJson(JSON.stringify(rewardContent), itemPackageRef.value);
    if (!items.length) return "—";
    return items
      .slice(0, 5)
      .map(it => `${it.name || it.id}×${it.count}`)
      .join("，") + (items.length > 5 ? " …" : "");
  } catch {
    return "—";
  }
}

// useTable 适配：把后端接口转换成 NaiveUI 期望的分页数据结构
const apiFn: NaiveUI.TableApiFn<RewardRuleRow> = async (params) => {
  const current = Number(params.current ?? 1);
  const size = Number(params.size ?? 10);
  const safeSize = size > 0 ? size : 10;

  const rawParams = params as any;
  const seasonId = Number(rawParams.seasonId);
  const rewardType = (rawParams.rewardType ?? null) as RewardType | null;

  if (!Number.isFinite(seasonId) || seasonId < 1) {
    return {
      data: { records: [] } as any,
      error: null,
      response: { data: { rows: [], total: 0, current: 1, size: safeSize } }
    } as any;
  }

  const res = await fetchGetSeasonRankRewardRuleList({
    seasonId,
    rewardType: rewardType ?? "",
    current,
    size: safeSize
  });

  const data = unwrapResponseData(res);
  if (!isApiSuccess(data)) {
    return {
      data: { records: [] } as any,
      error: null,
      response: { data: { rows: [], total: 0, current: 1, size: safeSize } }
    } as any;
  }

  const rows = parseRewardRows(res);
  const total = data?.total ?? rows.length;

  return {
    data: { records: rows } as any,
    error: null,
    response: { data: { rows, total, current, size: safeSize } }
  } as any;
};

const {
  columns,
  columnChecks,
  data,
  getData,
  getDataByPage,
  loading,
  pagination,
  mobilePagination,
  searchParams,
  resetSearchParams
} = useTable({
  apiFn,
  showTotal: true,
  apiParams: {
    current: 1,
    size: 10,
    seasonId: 1,
    rewardType: null
  } as any,
  columns: () => [
    {
      key: "seasonId",
      title: "赛季",
      align: "center",
      width: 100
    },
    {
      key: "seasonName",
      title: "赛季名称",
      align: "center",
      width: 160,
      ellipsis: { tooltip: true },
      render: row => row.seasonName || "—"
    },
    {
      key: "rewardType",
      title: "奖励类型",
      align: "center",
      width: 100,
      render: row => row.rewardType === "GUILD" ? "公会" : "个人"
    },
    {
      key: "rankStart",
      title: "排名区间",
      align: "center",
      width: 140,
      render: row => `${row.rankStart} ~ ${row.rankEnd}`
    },
    {
      key: "rewardContent",
      title: "奖励物品",
      align: "left",
      minWidth: 280,
      ellipsis: { tooltip: true },
      render: row => rewardSummary(row.rewardContent)
    },
    {
      key: "operate",
      title: "操作",
      align: "center",
      width: 160,
      render: row => (
        <div class="flex-center gap-8px">
          <NButton
            type="primary"
            ghost
            size="small"
            onClick={() => openEditModal(row)}
          >
            编辑
          </NButton>
          <NPopconfirm onPositiveClick={() => handleDelete(row)}>
            {{
              default: () => "确认删除？",
              trigger: () => (
                <NButton
                  type="error"
                  ghost
                  size="small"
                  loading={deleteLoadingId.value === row.id}
                >
                  删除
                </NButton>
              )
            }}
          </NPopconfirm>
        </div>
      )
    }
  ]
});

const searchParamsAny = searchParams as any;

async function handleDelete(row: RewardRuleRow) {
  deleteLoadingId.value = row.id;
  try {
    const response = await fetchDeleteSeasonRewardConfig({ id: row.id });
    const data = unwrapResponseData(response);
    if (!isApiSuccess(data)) {
      window.$message?.error(data?.msg || "删除失败");
      return;
    }
    window.$message?.success("已删除");
    await getDataByPage();
  } catch (error) {
    handleApiCatchError(error, "删除奖励规则");
  } finally {
    deleteLoadingId.value = null;
  }
}

onMounted(async () => {
  try {
    itemPackageRef.value = await useItemPackage();
  } catch {
    itemPackageRef.value = null;
  }
});
</script>

<template>
  <div
    class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto"
  >
    <RewardConfigSearch
      v-model:model="searchParamsAny"
      @reset="resetSearchParams"
      @search="getDataByPage"
    />

    <NCard
      title="已配置的奖励规则"
      :bordered="false"
      size="small"
      class="sm:flex-1-hidden card-wrapper"
    >
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :loading="loading"
          :show-sync="false"
          :show-add="true"
          :show-batch-delete="false"
          :show-import="false"
          :show-export="false"
          @add="openAddModal"
          @refresh="getData"
        />
      </template>

      <NDataTable
        :columns="columns"
        :data="data"
        size="small"
        :flex-height="!appStore.isMobile"
        :scroll-x="1260"
        :loading="loading"
        remote
        :row-key="(row) => row.id"
        :pagination="pagination"
        class="sm:h-full"
      >
        <template #empty>
          <NEmpty description="暂无规则，请选择赛季ID与奖励类型" size="small" />
        </template>
      </NDataTable>
    </NCard>

    <RewardConfigAddModal
      v-model:visible="addModalVisible"
      :initial-season-id="searchParamsAny.seasonId"
      :initial-reward-type="searchParamsAny.rewardType ?? 'INDIVIDUAL'"
      :edit-row="editRow"
      @submitted="getDataByPage"
    />
  </div>
</template>

<style scoped></style>
