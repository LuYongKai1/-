<script setup lang="ts">
import { NModal, NDataTable, NTag } from "naive-ui";
import type { DataTableColumns } from "naive-ui";
import { computed, h, ref, watch, onMounted } from "vue";
import { $t } from "@/locales";
import { parseGoodsJson } from "@/utils/item";
import { useItemPackage } from "@/hooks/business/useItemPackage";

defineOptions({
  name: "ViewStatusModal",
});

interface ServerData {
  roleId: string;
  roleName?: string;
  serverId: string;
  serverName?: string;
  success?: boolean;
  ok?: boolean;
  message?: string;
  msg?: string;
  goodsJson?: string;
  item_ids?: number[];
  item_counts?: number[];
}

interface Props {
  serverData: ServerData[] | null;
  goodsJson?: string;
}

const props = defineProps<Props>();

const visible = defineModel<boolean>("visible", {
  default: false,
});

// 分页状态
const currentPage = ref(1);
const pageSize = ref(10);

// 物品数据
const itemData = ref<any>(null);
const itemDataLoading = ref(false);

// 获取物品数据
async function loadItemData() {
  if (itemData.value || itemDataLoading.value) {
    return;
  }
  itemDataLoading.value = true;
  try {
    const data = await useItemPackage();
    itemData.value = data;
  } catch (error) {
    console.error("获取物品数据失败:", error);
    itemData.value = null;
  } finally {
    itemDataLoading.value = false;
  }
}

// 组件挂载时加载物品数据
onMounted(() => {
  loadItemData();
});

// 监听弹窗打开，确保物品数据已加载
watch(visible, (newVal) => {
  if (newVal) {
    loadItemData();
  } else {
    currentPage.value = 1;
    pageSize.value = 10;
  }
});

// 解析单个角色的物品信息
function parseRoleItems(row: ServerData, rowIndex: number) {
  // 1. 优先使用角色自己的 goodsJson
  if (row.goodsJson) {
    return parseGoodsJson(row.goodsJson, itemData.value);
  }

  // 2. 如果角色有 item_ids 和 item_counts，构造 goodsJson
  if (row.item_ids && row.item_counts) {
    const goodsJson = JSON.stringify([{ item_ids: row.item_ids, item_counts: row.item_counts }]);
    return parseGoodsJson(goodsJson, itemData.value);
  }

  // 3. 从全局 goodsJson 数组中根据索引获取对应角色的物品数据
  if (!props.goodsJson) return [];

  try {
    const goodsData = JSON.parse(props.goodsJson);
    if (!Array.isArray(goodsData)) {
      // 单个对象格式，所有角色使用相同的物品
      return parseGoodsJson(props.goodsJson, itemData.value);
    }

    // 数组格式，需要判断是多个角色对象还是单个对象包含所有物品
    if (goodsData.length === 0) return [];

    const totalRoles = props.serverData?.length || 0;
    const originalIndex = (currentPage.value - 1) * pageSize.value + rowIndex;

    // 如果 goodsData 长度等于角色数量，说明每个对象对应一个角色
    if (goodsData.length === totalRoles) {
      const roleGoods = goodsData[originalIndex];
      return roleGoods ? parseGoodsJson(JSON.stringify([roleGoods]), itemData.value) : [];
    }

    // 如果 goodsData 只有一个对象，需要检查是否需要分割物品
    if (goodsData.length === 1) {
      const singleGoods = goodsData[0];
      const itemIds = singleGoods.item_ids || [];
      const itemCounts = singleGoods.item_counts || [];

      // 如果物品数量是角色数量的整数倍，说明需要分割
      if (itemIds.length > 0 && itemIds.length % totalRoles === 0) {
        const itemsPerRole = itemIds.length / totalRoles;
        const startIdx = originalIndex * itemsPerRole;
        const endIdx = startIdx + itemsPerRole;

        const roleItemIds = itemIds.slice(startIdx, endIdx);
        const roleItemCounts = itemCounts.slice(startIdx, endIdx);

        if (roleItemIds.length > 0) {
          return parseGoodsJson(
            JSON.stringify([{ item_ids: roleItemIds, item_counts: roleItemCounts }]),
            itemData.value
          );
        }
      }

      // 否则所有角色使用相同的物品
      return parseGoodsJson(JSON.stringify([singleGoods]), itemData.value);
    }

    // 其他情况，尝试根据索引获取
    const roleGoods = goodsData[originalIndex];
    return roleGoods ? parseGoodsJson(JSON.stringify([roleGoods]), itemData.value) : [];
  } catch (error) {
    console.error('解析 goodsJson 失败:', error);
    return [];
  }
}

// 格式化物品显示（返回标签数组）
function formatItemsTags(row: ServerData, rowIndex: number) {
  const parsedItems = parseRoleItems(row, rowIndex);

  if (parsedItems.length === 0) {
    return [];
  }

  return parsedItems.map(item => {
    // 优先显示 names，如果没有则显示 name，最后显示 id
    let displayName = item.id;
    if (item.names) {
      if (typeof item.names === 'object' && item.names !== null) {
        const namesObj = item.names as Record<string, string>;
        displayName = namesObj.CS || namesObj.cn || Object.values(namesObj)[0] || item.id;
      } else {
        displayName = String(item.names);
      }
    } else if (item.name) {
      displayName = item.name;
    }
    return {
      name: displayName,
      count: item.count,
      id: item.id
    };
  });
}


// 总数据条数
const totalCount = computed(() => {
  return props.serverData?.length || 0;
});

// 分页配置
const pagination = computed(() => ({
  page: currentPage.value,
  pageSize: pageSize.value,
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100],
  showQuickJumper: true,
  prefix: (info: any) => {
    const count = totalCount.value;
    return `共 ${count.toLocaleString()} 条`;
  },
  onUpdatePage: (page: number) => {
    currentPage.value = page;
  },
  onUpdatePageSize: (size: number) => {
    pageSize.value = size;
    currentPage.value = 1;
  }
}));

const columns = computed<DataTableColumns<ServerData>>(() => [
  {
    title: $t("page.manage.operateserver.roleName"),
    key: "roleName",
    align: "center",
    width: 150,
    ellipsis: { tooltip: true },
    render: (row) => {
      return row.roleName || row.roleId || "-";
    }
  },
  {
    title: $t("page.manage.operateserver.roleId"),
    key: "roleId",
    align: "center",
    width: 120,
    ellipsis: { tooltip: true },
  },
  {
    title: $t("page.manage.operateserver.serverName"),
    key: "serverName",
    align: "center",
    width: 120,
    render: (row) => {
      return row.serverName || row.serverId || "-";
    }
  },
  {
    title: $t("page.manage.operateserver.Sending"),
    key: "success",
    align: "center",
    width: 150,
    render: (row) => {
      const statusField = row.success !== undefined ? row.success : row.ok;

      if (statusField === undefined) {
        return h(
          NTag,
          {
            type: "info",
            style: "min-width: 80px; text-align: center; display: flex; justify-content: center;",
          },
          { default: () => "未发送" }
        );
      }

      return h(
        NTag,
        {
          type: statusField ? "success" : "error",
          style: "min-width: 80px; text-align: center; display: flex; justify-content: center;",
        },
        { default: () => (statusField ? "发送成功" : "发送失败") }
      );
    },
  },
  {
    title: $t("page.manage.operateserver.msg"),
    key: "message",
    align: "center",
    ellipsis: { tooltip: true },
    render: (row) => {
      return row.message || row.msg || "-";
    }
  },
  {
    title: $t("page.manage.operateserver.goodsJson"),
    key: "goods",
    align: "center",
    ellipsis: { tooltip: true },
    minWidth: 350,
    render: (row: ServerData, rowIndex: number) => {
      const itemTags = formatItemsTags(row, rowIndex);
      if (itemTags.length === 0) {
        return h('span', { style: { color: '#909399' } }, '-');
      }
      return h(
        'div',
        {
          class: 'flex-center flex-wrap',
          style: {
            gap: '6px'
          }
        },
        itemTags.map((item: any, index: number) => {
          return h(
            NTag,
            {
              key: index,
              type: 'info',
              size: 'small'
            },
            {
              default: () => `${item.name} × ${item.count.toLocaleString()}`
            }
          );
        })
      );
    }
  }
]);
</script>

<template>
  <div
  class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto"
  >
    <NModal
      v-model:show="visible"
      preset="card"
      :title="`${$t('page.manage.operateserver.titleserver')} (共 ${totalCount.toLocaleString()} 条)`"
      style="width: 1300px; max-width: 90vw;"
      :mask-closable="true"
      :close-on-esc="true"
    >
      <div style="height: 600px; display: flex; flex-direction: column;">
        <NDataTable
          :columns="columns"
          :data="props.serverData || []"
          :bordered="true"
          :pagination="pagination"
          size="small"
          :max-height="520"
          flex-height
          style="flex: 1;"
        />
      </div>
    </NModal>
  </div>
</template>

<style scoped></style>
