<script setup lang="tsx">
import { NTag } from "naive-ui";
import { fetchStoreList, fetchExportStore } from "@/service/api";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import { useTable, useTableOperate } from "@/hooks/common/table";
import { handleApiResponseError, handleApiCatchError } from '@/utils/common';
import { ref, onMounted, h } from "vue";
import ProductsSearch from "./modules/products-search.vue";
import ProductsImportModal from "./modules/products-import-modal.vue";
import StoreSyncModal from "./modules/store-sync-modal.vue";
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
  scrollX,
  loading,
  mobilePagination,
  searchParams,
  resetSearchParams,
  updateSearchParams,
} = useTable({
  apiFn: fetchStoreList,
  showTotal: true,
  // immediate: false/,
  apiParams: {
    current: 1,
    size: 15,
  },
  columns: () => [
    {
      key: "id",
      title: "ID",
      align: "center",
      minWidth: 80,
    },
    {
      key: "serverId",
      title: "服务器ID",
      align: "center",
      minWidth: 100,
    },
    {
      key: "leixing",
      title: "类型",
      align: "center",
      minWidth: 120,
    },
    {
      key: "name",
      title: "商品名称",
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
    },
    {
      key: "sellCategoryId",
      title: "销售分类ID",
      align: "center",
      minWidth: 100,
    },
    {
      key: "sellCategoryOrder",
      title: "销售分类排序",
      align: "center",
      minWidth: 120,
    },
    {
      key: "orderId",
      title: "排序ID",
      align: "center",
      minWidth: 100,
    },
    {
      key: "recommendOrder",
      title: "推荐排序",
      align: "center",
      minWidth: 100,
    },
    {
      key: "bannerOrder",
      title: "Banner排序",
      align: "center",
      minWidth: 100,
    },
    {
      key: "nameId",
      title: "名称ID",
      align: "center",
      minWidth: 100,
    },
    {
      key: "hideInClient",
      title: "客户端隐藏",
      align: "center",
      minWidth: 100,
      render: (row: any) => row.hideInClient ? '是' : '否',
    },
    {
      key: "grade",
      title: "等级",
      align: "center",
      minWidth: 80,
    },
    {
      key: "productType",
      title: "产品类型",
      align: "center",
      minWidth: 100,
    },
    {
      key: "viewType",
      title: "显示类型",
      align: "center",
      minWidth: 100,
      render: (row: any) => row.viewType ? '是' : '否',
    },
    {
      key: "rewardDescId",
      title: "奖励描述ID",
      align: "center",
      minWidth: 120,
    },
    {
      key: "descId",
      title: "描述ID",
      align: "center",
      minWidth: 100,
    },
    {
      key: "descDetailId",
      title: "详细描述ID",
      align: "center",
      minWidth: 120,
    },
    {
      key: "saleType",
      title: "销售类型",
      align: "center",
      minWidth: 100,
    },
    {
      key: "saleTypeId",
      title: "销售类型ID",
      align: "center",
      minWidth: 120,
    },
    {
      key: "saleTime",
      title: "销售时间",
      align: "center",
      minWidth: 100,
    },
    {
      key: "validityTime",
      title: "有效时间",
      align: "center",
      minWidth: 100,
    },
    {
      key: "vipLevelLimit",
      title: "VIP等级限制",
      align: "center",
      minWidth: 120,
    },
    {
      key: "limitType",
      title: "限制类型",
      align: "center",
      minWidth: 100,
    },
    {
      key: "limitCount",
      title: "限制数量",
      align: "center",
      minWidth: 100,
    },
    {
      key: "vipLimitCount",
      title: "VIP限制数量(数组)",
      align: "center",
      minWidth: 150,
      ellipsis: { tooltip: true },
    },
    {
      key: "requireLeague",
      title: "需要联盟",
      align: "center",
      minWidth: 100,
    },
    {
      key: "requireLevel",
      title: "需要等级",
      align: "center",
      minWidth: 100,
    },
    {
      key: "levellimitHide",
      title: "等级限制隐藏",
      align: "center",
      minWidth: 120,
      render: (row: any) => row.levellimitHide ? '是' : '否',
    },
    {
      key: "itemMaintype",
      title: "物品主类型",
      align: "center",
      minWidth: 120,
    },
    {
      key: "itemType",
      title: "物品类型",
      align: "center",
      minWidth: 100,
    },
    {
      key: "goodsSymbol",
      title: "商品符号",
      align: "center",
      minWidth: 100,
    },
    {
      key: "price",
      title: "价格",
      align: "center",
      minWidth: 100,
    },
    {
      key: "discountPrice",
      title: "折扣价格",
      align: "center",
      minWidth: 100,
    },
    {
      key: "discountRate",
      title: "折扣率",
      align: "center",
      minWidth: 100,
    },
    {
      key: "applePrice",
      title: "苹果价格",
      align: "center",
      minWidth: 100,
    },
    {
      key: "appleDiscountPrice",
      title: "苹果折扣价格",
      align: "center",
      minWidth: 120,
    },
    {
      key: "appleDiscountRate",
      title: "苹果折扣率",
      align: "center",
      minWidth: 120,
    },
    {
      key: "costotheritemid",
      title: "消耗其他物品ID",
      align: "center",
      minWidth: 140,
    },
    {
      key: "singleothercount",
      title: "单个其他数量",
      align: "center",
      minWidth: 120,
    },
    {
      key: "countType",
      title: "数量类型",
      align: "center",
      minWidth: 100,
      render: (row: any) => row.countType ? '是' : '否',
    },
    {
      key: "maxCount",
      title: "最大数量",
      align: "center",
      minWidth: 100,
    },
    {
      key: "getreward",
      title: "获得奖励",
      align: "center",
      minWidth: 100,
    },
    {
      key: "mailId",
      title: "邮件ID",
      align: "center",
      minWidth: 100,
    },
    {
      key: "cashshopgroupId",
      title: "现金商店组ID",
      align: "center",
      minWidth: 120,
    },
    {
      key: "petSpawnId",
      title: "宠物生成ID",
      align: "center",
      minWidth: 120,
    },
    {
      key: "directProductId",
      title: "直接产品ID",
      align: "center",
      minWidth: 120,
    },
    {
      key: "shopShowRate",
      title: "商店显示率",
      align: "center",
      minWidth: 120,
    },
    {
      key: "benefitRate",
      title: "收益率",
      align: "center",
      minWidth: 100,
    },
    {
      key: "tagThumbnail",
      title: "标签缩略图",
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
    },
    {
      key: "tagStringId",
      title: "标签字符串ID(数组)",
      align: "center",
      minWidth: 150,
      ellipsis: { tooltip: true },
    },
    {
      key: "thumbnail",
      title: "缩略图",
      align: "center",
      minWidth: 200,
      ellipsis: { tooltip: true },
    },
    {
      key: "thumbnailBg",
      title: "缩略图背景",
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
    },
    {
      key: "popupImage",
      title: "弹窗图片",
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
    },
    {
      key: "rewardMileage",
      title: "奖励里程",
      align: "center",
      minWidth: 100,
    },
    {
      key: "rewardViewcount",
      title: "奖励查看次数",
      align: "center",
      minWidth: 120,
    },
    {
      key: "resaleType",
      title: "转售类型",
      align: "center",
      minWidth: 100,
      render: (row: any) => row.resaleType ? '是' : '否',
    },
    {
      key: "inappGoogle",
      title: "谷歌内购",
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
    },
    {
      key: "inappGoogle12",
      title: "谷歌内购12",
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
    },
    {
      key: "inappApple",
      title: "苹果内购",
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
    },
    {
      key: "inappApple12",
      title: "苹果内购12",
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
    },
    {
      key: "onestore",
      title: "OneStore",
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
    },
    {
      key: "xsolla",
      title: "Xsolla",
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
    },
    {
      key: "huawei",
      title: "华为",
      align: "center",
      minWidth: 120,
      ellipsis: { tooltip: true },
    },
    {
      key: "stepGroup",
      title: "步骤组",
      align: "center",
      minWidth: 100,
    },
    {
      key: "stepCount",
      title: "步骤数量",
      align: "center",
      minWidth: 100,
    },
    {
      key: "stepMax",
      title: "步骤最大值",
      align: "center",
      minWidth: 120,
    },
    {
      key: "rewardView",
      title: "奖励视图",
      align: "center",
      minWidth: 100,
    },
    {
      key: "multiSaleType",
      title: "多重销售类型",
      align: "center",
      minWidth: 120,
      render: (row: any) => row.multiSaleType ? '是' : '否',
    },
    {
      key: "recommendType",
      title: "推荐类型",
      align: "center",
      minWidth: 100,
      render: (row: any) => row.recommendType ? '是' : '否',
    },
    {
      key: "newType",
      title: "新品类型",
      align: "center",
      minWidth: 100,
      render: (row: any) => row.newType ? '是' : '否',
    },
    {
      key: "eventType",
      title: "活动类型",
      align: "center",
      minWidth: 100,
      render: (row: any) => row.eventType ? '是' : '否',
    },
    {
      key: "saletagType",
      title: "销售标签类型",
      align: "center",
      minWidth: 120,
      render: (row: any) => row.saletagType ? '是' : '否',
    },
    {
      key: "buyType",
      title: "购买类型",
      align: "center",
      minWidth: 100,
      render: (row: any) => row.buyType ? '是' : '否',
    },
    {
      key: "limittagType",
      title: "限制标签类型",
      align: "center",
      minWidth: 120,
      render: (row: any) => row.limittagType ? '是' : '否',
    },
    {
      key: "freeType",
      title: "免费类型",
      align: "center",
      minWidth: 100,
      render: (row: any) => row.freeType ? '是' : '否',
    },
    {
      key: "discountType",
      title: "折扣类型",
      align: "center",
      minWidth: 100,
      render: (row: any) => row.discountType ? '是' : '否',
    },
    {
      key: "discountNumid",
      title: "折扣数字ID",
      align: "center",
      minWidth: 120,
    },
    {
      key: "spawnLink",
      title: "生成链接",
      align: "center",
      minWidth: 100,
    },
    {
      key: "spawnString",
      title: "生成字符串",
      align: "center",
      minWidth: 120,
    },
    {
      key: "spawnCount",
      title: "生成数量",
      align: "center",
      minWidth: 100,
    },
    {
      key: "saleWeekType",
      title: "销售周类型",
      align: "center",
      minWidth: 120,
      render: (row: any) => row.saleWeekType ? '是' : '否',
    },
    {
      key: "saleMonday",
      title: "周一销售",
      align: "center",
      minWidth: 100,
      render: (row: any) => row.saleMonday ? '是' : '否',
    },
    {
      key: "saleTuesday",
      title: "周二销售",
      align: "center",
      minWidth: 100,
      render: (row: any) => row.saleTuesday ? '是' : '否',
    },
    {
      key: "saleWednesday",
      title: "周三销售",
      align: "center",
      minWidth: 100,
      render: (row: any) => row.saleWednesday ? '是' : '否',
    },
    {
      key: "saleThursday",
      title: "周四销售",
      align: "center",
      minWidth: 100,
      render: (row: any) => row.saleThursday ? '是' : '否',
    },
    {
      key: "saleFriday",
      title: "周五销售",
      align: "center",
      minWidth: 100,
      render: (row: any) => row.saleFriday ? '是' : '否',
    },
    {
      key: "saleSaturday",
      title: "周六销售",
      align: "center",
      minWidth: 100,
      render: (row: any) => row.saleSaturday ? '是' : '否',
    },
    {
      key: "saleSunday",
      title: "周日销售",
      align: "center",
      minWidth: 100,
      render: (row: any) => row.saleSunday ? '是' : '否',
    },
    {
      key: "saleStartData",
      title: "销售开始日期",
      align: "center",
      minWidth: 120,
    },
    {
      key: "saleCloseData",
      title: "销售结束日期",
      align: "center",
      minWidth: 120,
    },
    {
      key: "dailyItemCount",
      title: "每日物品数量",
      align: "center",
      minWidth: 120,
    },
    {
      key: "saleStoreActive",
      title: "销售商店激活",
      align: "center",
      minWidth: 120,
    },
    {
      key: "wemixPayment",
      title: "Wemix支付",
      align: "center",
      minWidth: 120,
      render: (row: any) => row.wemixPayment ? '是' : '否',
    },
    {
      key: "thumbnailWarriorFemale",
      title: "战士女性缩略图",
      align: "center",
      minWidth: 140,
      ellipsis: { tooltip: true },
    },
    {
      key: "thumbnailWarriorMale",
      title: "战士男性缩略图",
      align: "center",
      minWidth: 140,
      ellipsis: { tooltip: true },
    },
    {
      key: "thumbnailWizardFemale",
      title: "法师女性缩略图",
      align: "center",
      minWidth: 140,
      ellipsis: { tooltip: true },
    },
    {
      key: "thumbnailWizardMale",
      title: "法师男性缩略图",
      align: "center",
      minWidth: 140,
      ellipsis: { tooltip: true },
    },
    {
      key: "thumbnailTaoistFemale",
      title: "道士女性缩略图",
      align: "center",
      minWidth: 140,
      ellipsis: { tooltip: true },
    },
    {
      key: "thumbnailTaoistMale",
      title: "道士男性缩略图",
      align: "center",
      minWidth: 140,
      ellipsis: { tooltip: true },
    },
  ],
  defaultHiddenKeys: [
    'orderId',
    'recommendOrder',
    'bannerOrder',
    'nameId',
    'hideInClient',
    'viewType',
    'rewardDescId',
    'descId',
    'descDetailId',
    'saleType',
    'saleTypeId',
    'saleTime',
    'validityTime',
    'vipLevelLimit',
    'vipLimitCount',
    'requireLeague',
    'levellimitHide',
    'itemMaintype',
    'itemType',
    'goodsSymbol',
    'discountPrice',
    'discountRate',
    'applePrice',
    'appleDiscountPrice',
    'appleDiscountRate',
    'costotheritemid',
    'singleothercount',
    'countType',
    'maxCount',
    'getreward',
    'mailId',
    'cashshopgroupId',
    'petSpawnId',
    'directProductId',
    'shopShowRate',
    'benefitRate',
    'tagThumbnail',
    'tagStringId',
    'thumbnailBg',
    'popupImage',
    'rewardMileage',
    'rewardViewcount',
    'resaleType',
    'inappGoogle',
    'inappGoogle12',
    'inappApple',
    'inappApple12',
    'onestore',
    'xsolla',
    'huawei',
    'stepGroup',
    'stepCount',
    'stepMax',
    'rewardView',
    'multiSaleType',
    'recommendType',
    'newType',
    'eventType',
    'saletagType',
    'buyType',
    'limittagType',
    'freeType',
    'discountType',
    'discountNumid',
    'spawnLink',
    'spawnString',
    'spawnCount',
    'saleWeekType',
    'saleMonday',
    'saleTuesday',
    'saleWednesday',
    'saleThursday',
    'saleFriday',
    'saleSaturday',
    'saleSunday',
    'saleStartData',
    'saleCloseData',
    'dailyItemCount',
    'saleStoreActive',
    'wemixPayment',
    'thumbnailWarriorFemale',
    'thumbnailWarriorMale',
    'thumbnailWizardFemale',
    'thumbnailWizardMale',
    'thumbnailTaoistFemale',
    'thumbnailTaoistMale',
    'thumbnail'
  ],
});

const {
  checkedRowKeys,
} = useTableOperate(data, getData);

function handleSearch(serverId: string, leixing: string) {
  currentServerId.value = serverId;
  const params: any = {
    serverId,
    leixing,
  };
  updateSearchParams(params);
  getData();
}

// 当前选中的服务器ID
const currentServerId = ref("");

// 同步弹框显示状态
const syncModalVisible = ref(false);

// 处理导入文件
function handleImport() {
  importModalVisible.value = true;
}

// 处理同步 - 打开弹框
function handleSync() {
  syncModalVisible.value = true;
}

// 处理导出
async function handleExport() {
  // 验证是否选择了服务器
  if (!currentServerId.value) {
    // @ts-ignore
    window.$message?.warning("请先选择服务器");
    return;
  }

  try {
    // @ts-ignore
    window.$message?.info($t("common.exportingData"));

    // 调用导出API
    const response = await fetchExportStore({
      serverId: currentServerId.value
    });

    // 对于文件下载，直接处理blob响应
    const blob = (response as any)?.data || (response as any)?.response?.data || response;

    // 检查是否获取到有效的blob数据
    if (!blob) {
      // @ts-ignore
      window.$message?.error($t("common.exportFailed") + ": 没有数据");
      return;
    }

    // 如果blob是JSON类型，说明是错误响应
    if (blob instanceof Blob) {
      // 检查blob类型，如果是JSON说明是错误
      if (blob.type === 'application/json' || blob.type.includes('json')) {
        const text = await blob.text();
        try {
          const errorData = JSON.parse(text);
          // 使用通用错误处理
          handleApiResponseError({ data: errorData } as any, "导出内置商城");
          return;
        } catch (e) {
          // 如果解析失败，显示原始文本
          // @ts-ignore
          window.$message?.error("导出失败: " + text);
          return;
        }
      }

      // 检查文件大小
      if (blob.size === 0) {
        // @ts-ignore
        window.$message?.warning($t("common.exportFailed") + ": 没有数据");
        return;
      }
    }

    // 如果响应不是blob，尝试创建blob
    let fileBlob;
    if (blob instanceof Blob) {
      fileBlob = blob;
    } else {
      // 创建CSV blob对象
      fileBlob = new Blob([blob], {
        type: 'text/csv;charset=utf-8;'
      });
    }

    // 创建下载链接
    const url = window.URL.createObjectURL(fileBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `内置商城_${currentServerId.value}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    // @ts-ignore
    window.$message?.success($t("common.exportSuccess"));
  } catch (error) {
    // 使用通用异常处理函数
    handleApiCatchError(error, '导出内置商城');
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
          :loading="loading"
          @refresh="getData"
          @sync="handleSync"
          @import="handleImport"
          @export="handleExport"
          :show-import="hasAuth('game:store:import')"
          :show-export="hasAuth('game:store:export')"
          :show-sync="hasAuth('game:store:sync')"
          :show-export-confirm="true"
          :show-add="false"
          :show-delete="false"
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
      <ProductsImportModal
        v-model:visible="importModalVisible"
        :server-id="currentServerId || undefined"
        @success="getData"
      />

      <!-- 同步弹框 -->
      <StoreSyncModal
        v-model:visible="syncModalVisible"
        @success="getData"
      />
    </NCard>
  </div>
</template>

<style scoped></style>
