<script setup lang="tsx">
import { NButton, NPopconfirm, NTag } from "naive-ui";
import {
  fetchGetgmuserlist,
  fetchDeleteUser,
  fetchBanUser,
  fetchchatuser,
  fetchKickUser,
  fetchShadowLogin,
  fetchBatchOperationPrivilege,
} from "@/service/api";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import { enableStatusRecord, userGenderRecord } from "@/constants/business";
import { useTable, useTableOperate } from "@/hooks/common/table";
import UserBanImportModal from "./modules/user-ban-import-modal.vue";
import UserUnBanImportModal  from "./modules/user-unBan-import-modal.vue";
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";
import UserActionButtons from "@/components/business/user-action-buttons.vue";
import WhiteSelect from "./modules/white-select.vue";
import ShadowLoginModal from "./modules/shadow-login-modal.vue";
import PrivilegeModal from "./modules/privilege-modal.vue";
import { onMounted, ref } from "vue";
import { format } from "date-fns";
import { useAuth } from "@/hooks/business/auth";

const { hasAuth } = useAuth();

const appStore = useAppStore();

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
  apiFn: fetchGetgmuserlist,
  showTotal: true,
  apiParams: {
    current: 1,
    size: 10,
    status: null,
  },
  columns: () => [
    {
      type: "selection",
      align: "center",
      width: 48,
    },
        {
      key: "userFlag",
      // title: $t("page.manage.gmuser.userFlag"),
      align: "center",
      width: 60,
      render: (row: any) => {
        return row.userFlag === "cbg" ? (
          <NTag type="success" size="small">CBG</NTag>
        ) : (
          row.userFlag || ""
        );
      },
    },
    {
      key: "openId",
      title: $t("page.manage.gmuser.openId"),
      align: "center",
      minWidth: 100,
      ellipsis: { tooltip: true },
    },
    {
      key: "channelUid",
      title: $t("page.manage.gmuser.channelUid"),
      align: "center",
      minWidth: 100,
      ellipsis: { tooltip: true },
    },
    {
      key: "channelId",
      title: $t("page.manage.gmuser.channelId"),
      align: "center",
      minWidth: 100,
    },

    {
      key: "ip",
      title: $t("page.manage.gmuser.ip"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "banDate",
      title: $t("page.manage.gmrole.banDate"),
      align: "center",
      minWidth: 100,
      ellipsis: { tooltip: true },
      render: (row: any) => {
        return row.banDate
          ? format(new Date(row.banDate), "yyyy-MM-dd HH:mm:ss")
          : "";
      },
    },
    {
      key: "banReason",
      title: $t("page.manage.gmrole.banReason"),
      align: "center",
      minWidth: 100,
      ellipsis: { tooltip: true },
    },
    {
      key: "chatDate",
      title: $t("page.manage.gmrole.chatDate"),
      align: "center",
      minWidth: 100,
      ellipsis: { tooltip: true },
      render: (row: any) => {
        return row.chatDate
          ? format(new Date(row.chatDate), "yyyy-MM-dd HH:mm:ss")
          : "";
      },
    },
    {
      key: "chatReason",
      title: $t("page.manage.gmrole.chatReason"),
      align: "center",
      minWidth: 100,
      ellipsis: { tooltip: true },
    },
    {
      key: "vipLevel",
      title: $t("page.manage.gmuser.vipLevel"),
      align: "center",
      minWidth: 100,
      render: (row: any) => {
        return row.vipLevel ?? "";
      },
    },
    {
      key: "vipTotalPoints",
      title: $t("page.manage.gmuser.vipTotalPoints"),
      align: "center",
      minWidth: 100,
      render: (row: any) => {
        return row.vipTotalPoints ?? "";
      },
    },
    {
      key: "regDate",
      title: $t("page.manage.gmuser.regDate"),
      align: "center",
      width: 180,
      render: (row: any) => {
        return row.regDate
          ? format(new Date(row.regDate), "yyyy-MM-dd HH:mm:ss")
          : "";
      },
    },
    {
      key: "operate",
      title: $t("common.operate"),
      align: "center",
      width: 130,
      render: (row) => (
        <UserActionButtons userData={row} onSuccess={getData} />
      ),
    },
  ],
});

const { drawerVisible, operateType, editingData, handleEdit, checkedRowKeys } =
  useTableOperate(data, getData);

function handleSearch() {
  getData();
}

function handleBatchBan() {
  console.warn("handleBatchBan not implemented");
  window.$message?.warning("Batch Ban not implemented");
}
function handleBatchMute() {
  console.warn("handleBatchMute not implemented");
  window.$message?.warning("Batch Mute not implemented");
}

async function handleBatchKick() {
  if (checkedRowKeys.value.length === 0) {
    return;
  }
  try {
    for (const userId of checkedRowKeys.value) {
      await fetchKickUser({ userId: String(userId) });
    }
    window.$message?.success($t("common.kickSuccess"));
    checkedRowKeys.value = [];
    getData();
  } catch (error) {
    window.$message?.error($t("common.kickFailed"));
    console.error("批量踢出用户失败:", error);
  }
}

// 打开特权弹框
function handleSkipQueue() {
  handlePrivilege();
}

function handleShadowLogin() {
  if (checkedRowKeys.value.length === 0) {
    window.$message?.warning($t("page.manage.gmuser.pleaseSelectUser"));
    return;
  }
  if (checkedRowKeys.value.length > 1) {
    window.$message?.warning($t("page.manage.gmuser.pleaseSelectOnlyOneUser"));
    return;
  }
  const userId = checkedRowKeys.value[0];
  const selectedUser = data.value.find((user: any) => user.userId === userId);

  // 打开影子登录弹框
  shadowLoginUser.value = selectedUser;
  shadowLoginVisible.value = true;
}

// 影子登录相关状态
const shadowLoginVisible = ref(false);
const shadowLoginUser = ref<any>(null);

// 确认影子登录
async function handleShadowLoginConfirm(params: { operatorOpenId: string; targetOpenId: string }) {
  try {
    const res = await fetchShadowLogin(params);
    if (handleApiResponseError(res)) return;
    window.$message?.success($t("page.manage.gmuser.shadowLoginSuccess"));
    checkedRowKeys.value = [];
  } catch (error) {
    handleApiCatchError(error);
  }
}

// 特权相关状态
const privilegeVisible = ref(false);
const privilegeUserList = ref<any[]>([]);

// 打开特权弹框
function handlePrivilege() {
  if (checkedRowKeys.value.length === 0) {
    window.$message?.warning($t("page.manage.gmuser.pleaseSelectUser"));
    return;
  }

  // 获取选中的用户列表
  const selectedUsers = data.value.filter((user: any) =>
    checkedRowKeys.value.includes(user.userId)
  );

  if (selectedUsers.length === 0) {
    window.$message?.warning($t("page.manage.gmuser.pleaseSelectUser"));
    return;
  }

  privilegeUserList.value = selectedUsers;
  privilegeVisible.value = true;
}

// 确认设置特权
async function handlePrivilegeConfirm(params: { privilegeCodes: number[] }) {
  if (params.privilegeCodes.length === 0) {
    window.$message?.warning("请至少选择一个特权选项");
    return;
  }

  if (privilegeUserList.value.length === 0) {
    window.$message?.warning($t("page.manage.gmuser.pleaseSelectUser"));
    return;
  }

  try {
    let successCount = 0;
    let failCount = 0;

    // 为每个选中的用户批量设置特权
    for (const user of privilegeUserList.value) {
      // 获取 openId - 直接使用，保持数字类型
      const openId = user.openId;
      if (!openId) {
        window.$message?.warning("用户 OpenID 不存在，无法设置特权");
        failCount++;
        continue;
      }

      try {
        // 调用批量操作特权接口
        const res = await fetchBatchOperationPrivilege({
          openId: openId,
          privilegeCode: params.privilegeCodes
        });

        // 检查请求结果
        const error = handleApiResponseError(res, "设置特权");
        if (error) {
          failCount++;
        } else {
          successCount++;
        }
      } catch (error) {
        handleApiCatchError(error, `用户 ${openId} 特权操作`);
        failCount++;
      }
    }

    // 显示最终结果
    if (successCount > 0 && failCount === 0) {
      window.$message?.success($t("common.skipQueueSuccess"));
    } else if (successCount > 0 && failCount > 0) {
      window.$message?.warning(`部分成功：成功 ${successCount} 个，失败 ${failCount} 个`);
    } else if (failCount > 0) {
      window.$message?.error(`全部失败：共 ${failCount} 个用户操作失败`);
    }

    // 无论成功还是失败，都清空选中状态并刷新数据
    checkedRowKeys.value = [];
    getData();
  } catch (error) {
    handleApiCatchError(error, $t("common.skipQueue") || "特权");
  }
}

// 新增：导入弹窗显示状态
const importBanModalVisible = ref(false);
const importUnbanModalVisible = ref(false);

// 处理封禁导入
function handleImportBan() {
  importBanModalVisible.value = true;
}

// 处理解封导入
function handleImportUnban() {
  importUnbanModalVisible.value = true;
}

onMounted(() => {
  data.value = [];
});
</script>

<template>
  <div
    class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto"
  >
    <whiteSelect
      v-model:model="searchParams"
      @reset="resetSearchParams"
      @search="handleSearch"
    />

    <NCard
      :title="$t('page.manage.gmuser.title')"
      :bordered="false"
      size="small"
      class="sm:flex-1-hidden card-wrapper"
    >
      <template #header-extra>
        <TableHeader
          v-model:columns="columnChecks"
          :disabled-delete="checkedRowKeys.length === 0"
          :disabled-kick="checkedRowKeys.length === 0"
          :disabled-shadow-login="checkedRowKeys.length !== 1"
          :loading="loading"
          @import-ban="handleImportBan"
          @import-unban="handleImportUnban"
          @ban="handleBatchBan"
          @mute="handleBatchMute"
          @kick="handleBatchKick"
          @shadow-login="handleShadowLogin"
          @refresh="getData"
          :show-kick="hasAuth('user:record:kick')"
          :show-shadow-login="hasAuth('game:user:shadow')"
          :show-skip-queue="hasAuth('user:privilege:add')"
          :show-import-ban="hasAuth('user:record:ban:import')"
          :show-import-unban="hasAuth('user:record:unban:import')"
          :disabled-skip-queue="checkedRowKeys.length === 0"
          @skip-queue="handleSkipQueue"
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
        :row-key="(row) => row.userId"
        :pagination="mobilePagination"
        class="sm:h-full"
      />

      <ShadowLoginModal
        v-model:visible="shadowLoginVisible"
        :user-data="shadowLoginUser"
        @confirm="handleShadowLoginConfirm"
      />
      <UserBanImportModal
        v-model:visible="importBanModalVisible"
        @success="getData"
      />
      <UserUnBanImportModal
        v-model:visible="importUnbanModalVisible"
        @success="getData"
      />
      <PrivilegeModal
        v-model:visible="privilegeVisible"
        :user-data-list="privilegeUserList"
        @confirm="handlePrivilegeConfirm"
      />
    </NCard>
  </div>
</template>

<style scoped></style>
