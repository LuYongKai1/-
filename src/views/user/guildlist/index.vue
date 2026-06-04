<script setup lang="tsx">
import { NButton, NPopconfirm, NTag, NSpace, NCard } from "naive-ui";
import {
  fetchGetGuildList,
} from "@/service/api";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import {
  serverStatusVisible,
} from "@/constants/business";
import { useTable, useTableOperate } from "@/hooks/common/table";
import ItemSelect from "./modules/item-select.vue";
import ForceRenameModal from "./modules/force-rename-modal.vue";
import DisbandGuildModal from "./modules/disband-guild-modal.vue";
import EditAnnouncementModal from "./modules/edit-announcement-modal.vue";
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { format } from 'date-fns';
import { useRouterPush } from '@/hooks/common/router';
import { useAuth } from '@/hooks/business/auth';
import type { Api } from '@/typings/api';

const { hasAuth } = useAuth();

const appStore = useAppStore();

const groupDrawerVisible = ref(false);
const groupOperateType = ref<NaiveUI.TableOperateType>('add');
const groupRowData = ref<any>(null);

// 强制改名弹窗
const forceRenameModalVisible = ref(false);
const selectedGuildData = ref<any>(null);

// 解散公会弹窗
const disbandGuildModalVisible = ref(false);
const selectedDisbandGuildData = ref<any>(null);

// 修改公告弹窗
const editAnnouncementModalVisible = ref(false);
const selectedAnnouncementGuildData = ref<any>(null);

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
} = useTable<any>({
  apiFn: fetchGetGuildList,
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
      key: "guildGuid",
      title: $t("page.manage.guildslist.guildId"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "guildName",
      title: $t("page.manage.guildslist.guildName"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "serverId",
      title: $t("page.manage.guildslist.serverId"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "masterCuid",
      title: $t("page.manage.guildslist.leadercuid"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "masterNickname",
      title: $t("page.manage.guildslist.leaderName"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "currentMemberCount",
      title: $t("page.manage.guildslist.memberCount"),
      align: "center",
    },
    {
      key: "level",
      title: $t("page.manage.guildslist.guildLevel"),
      align: "center",
      minWidth: 100,
    },
  ],
});

const defaultHiddenKeys = ['serverIp', 'serverPort', 'intranetIp'];
columnChecks.value.forEach((columnCheck) => {
  if (defaultHiddenKeys.includes(columnCheck.key as string)) {
    columnCheck.checked = false;
  }
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
} = useTableOperate(data, getData);


function handleSearch() {
  getData();
}

// 强制改名
function handleForceRename() {
  if (checkedRowKeys.value.length === 0) {
    window.$message?.warning($t('common.pleaseSelectData'));
    return;
  }
  if (checkedRowKeys.value.length > 1) {
    window.$message?.warning($t('page.manage.guildslist.selectOneGuildForRename'));
    return;
  }

  // 获取选中的公会数据
  const selectedGuid = checkedRowKeys.value[0];
  const guildInfo: any = data.value.find((item: any) => item.guildGuid === selectedGuid);

  if (!guildInfo) {
    window.$message?.error($t('page.manage.guildslist.guildNotFound'));
    return;
  }

  // 设置选中的公会数据（包含 serverId）
  selectedGuildData.value = {
    guildGuid: guildInfo.guildGuid,
    guildName: guildInfo.guildName,
    masterCuid: guildInfo.masterCuid,
    masterNickname: guildInfo.masterNickname,
    serverId: guildInfo.serverId, // 从行数据中获取 serverId
  };

  // 打开弹窗
  forceRenameModalVisible.value = true;
}

// 强制改名成功回调
function handleForceRenameSuccess() {
  // 检查是否有选中的服务器
  if ((searchParams as any).serverId) {
    // 刷新列表
    getData();
  }
  // 清空选中项
  checkedRowKeys.value = [];
}

// 解散公会
function handleDisbandGuild() {
  if (checkedRowKeys.value.length === 0) {
    window.$message?.warning($t('common.pleaseSelectData'));
    return;
  }
  if (checkedRowKeys.value.length > 1) {
    window.$message?.warning($t('page.manage.guildslist.selectOneGuildForDisband'));
    return;
  }

  // 获取选中的公会数据
  const selectedGuid = checkedRowKeys.value[0];
  const guildInfo: any = data.value.find((item: any) => item.guildGuid === selectedGuid);

  if (!guildInfo) {
    window.$message?.error($t('page.manage.guildslist.guildNotFound'));
    return;
  }

  // 设置选中的公会数据（包含 serverId）
  selectedDisbandGuildData.value = {
    guildGuid: guildInfo.guildGuid,
    guildName: guildInfo.guildName,
    masterCuid: guildInfo.masterCuid,
    masterNickname: guildInfo.masterNickname,
    serverId: guildInfo.serverId, // 从行数据中获取 serverId
  };

  // 打开弹窗
  disbandGuildModalVisible.value = true;
}

// 解散公会成功回调
function handleDisbandGuildSuccess() {
  // 检查是否有选中的服务器
  if ((searchParams as any).serverId) {
    // 刷新列表
    getData();
  }
  // 清空选中项
  checkedRowKeys.value = [];
}

// 公告修改
function handleEditAnnouncement() {
  if (checkedRowKeys.value.length === 0) {
    window.$message?.warning($t('common.pleaseSelectData'));
    return;
  }
  if (checkedRowKeys.value.length > 1) {
    window.$message?.warning($t('page.manage.guildslist.selectOneGuildForAnnouncement'));
    return;
  }

  // 获取选中的公会数据
  const selectedGuid = checkedRowKeys.value[0];
  const guildInfo: any = data.value.find((item: any) => item.guildGuid === selectedGuid);

  if (!guildInfo) {
    window.$message?.error($t('page.manage.guildslist.guildNotFound'));
    return;
  }

  // 设置选中的公会数据（包含 serverId）
  selectedAnnouncementGuildData.value = {
    guildGuid: guildInfo.guildGuid,
    guildName: guildInfo.guildName,
    masterCuid: guildInfo.masterCuid,
    masterNickname: guildInfo.masterNickname,
    serverId: guildInfo.serverId, // 从行数据中获取 serverId
  };

  // 打开弹窗
  editAnnouncementModalVisible.value = true;
}

// 修改公告成功回调
function handleEditAnnouncementSuccess() {
  // 检查是否有选中的服务器
  if ((searchParams as any).serverId) {
    // 刷新列表
    getData();
  }
  // 清空选中项
  checkedRowKeys.value = [];
}


</script>

<template>
  <div
    class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto"
  >
    <ItemSelect
      v-model:model="searchParams"
      @reset="resetSearchParams"
      @search="handleSearch"
    />

    <NCard
      :title="$t('page.manage.guildslist.title')"
      :bordered="false"
      size="small"
      class="sm:flex-1-hidden card-wrapper"
    >
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :disabled-delete="checkedRowKeys.length === 0"
          :loading="loading"
          :show-force-rename="hasAuth('operate:guild:changeGuildName')"
          :disabled-force-rename="checkedRowKeys.length === 0"
          :show-disband-guild="hasAuth('operate:guild:disband')"
          :disabled-disband-guild="checkedRowKeys.length === 0"
          :show-edit-announcement="hasAuth('operate:guild:changeGuidNotice')"
          :disabled-edit-announcement="checkedRowKeys.length === 0"
          @refresh="getData"
          @force-rename="handleForceRename"
          @disband-guild="handleDisbandGuild"
          @edit-announcement="handleEditAnnouncement"
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
        :row-key="(row) => row.guildGuid"
        :pagination="mobilePagination"
        class="sm:h-full"
      />
    </NCard>

    <!-- 强制改名弹窗 -->
    <ForceRenameModal
      v-model:visible="forceRenameModalVisible"
      :guild-data="selectedGuildData"
      @success="handleForceRenameSuccess"
    />

    <!-- 解散公会弹窗 -->
    <DisbandGuildModal
      v-model:visible="disbandGuildModalVisible"
      :guild-data="selectedDisbandGuildData"
      @success="handleDisbandGuildSuccess"
    />

    <!-- 修改公告弹窗 -->
    <EditAnnouncementModal
      v-model:visible="editAnnouncementModalVisible"
      :guild-data="selectedAnnouncementGuildData"
      @success="handleEditAnnouncementSuccess"
    />
  </div>
</template>


<style scoped></style>
