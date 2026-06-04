<script setup lang="tsx">
import { NButton, NPopconfirm, NTag } from "naive-ui";
import {
  fetchGetgmrolelist, fetchchatrole, fetchKickRole, fetchChangePlayerMapPosition, fetchShadowLogin,
  fetchBanrole
} from "@/service/api";
import { fetchDeleteItems } from "@/service/api/game-manage";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import { enableStatusRecord, userGenderRecord } from "@/constants/business";
import { useTable, useTableOperate } from "@/hooks/common/table";
import { useRouterPush } from '@/hooks/common/router';
import UserOperateDrawer from "./modules/user-operate-drawer.vue";
import ForceRenameModal from "./modules/force-rename-modal.vue";
import ModifyCoordsModal from "./modules/modify-coords-modal.vue";
import DeleteItemsModal from "@/views/gs/role/modules/delete-items-modal.vue";
import RoleBanImportModal from "./modules/role-ban-import-modal.vue";
import RoleUnbanImportModal from "./modules/role-unban-import-modal.vue";
import RoleKickImportModal from "./modules/role-kick-import-modal.vue";
import ShadowLoginModal from "./modules/shadow-login-modal.vue";
import SetPeakPointsModal from "./modules/set-peak-points-modal.vue";
import ForceCompleteTaskModal from "./modules/force-complete-task-modal.vue";
import WhiteSelect from "./modules/white-select.vue";
import { onMounted, ref, watch } from "vue";
import { format } from 'date-fns';
import { useMessage } from 'naive-ui';
import { useAuth } from '@/hooks/business/auth';
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";

const { hasAuth } = useAuth();

const appStore = useAppStore();
const { routerPushByKey } = useRouterPush();
const message = useMessage();

// 新增：导入弹窗显示状态
const importBanModalVisible = ref(false);
const importUnbanModalVisible = ref(false);
const importKickModalVisible = ref(false);

// 处理封禁导入
function handleImportBan() {
  importBanModalVisible.value = true;
}

// 处理解封导入
function handleImportUnban() {
  importUnbanModalVisible.value = true;
}
// 处理踢人导入
function handleImportKick() {
  importKickModalVisible.value = true;
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
} = useTable({
  apiFn: fetchGetgmrolelist,
  showTotal: true,
  apiParams: {
    current: 1,
    size: 10,
    openId: null,
    roleId: null,
    roleName: null,
    serverId: null,
    chat: null,
  },
  columns: () => [
    {
      type: "selection",
      align: "center",
      width: 48,
    },
    {
      key: "openId",
      title: $t("page.manage.gmrole.openId"),
      align: "center",
      minWidth: 100,
      ellipsis: { tooltip: true }

    },
    {
      key: "roleId",
      title: $t("page.manage.gmrole.roleId"),
      align: "center",
      width: 200,
    },
    {
      key: "roleName",
      title: $t("page.manage.gmrole.roleName"),
      align: "center",
      minWidth: 100,
      ellipsis: { tooltip: true }
    },
    {
      key: "serverName",
      title: $t("page.manage.gmrole.serverName"),
      align: "center",
      minWidth: 100,
      ellipsis: { tooltip: true }
    },

    {
      key: "roleType",
      title: $t("page.manage.gmrole.roleType"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "roleLevel",
      title: $t("page.manage.gmrole.roleLevel"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "chatDate",
      title: $t("page.manage.gmrole.chatDate"),
      align: "center",
      minWidth: 100,
      ellipsis: { tooltip: true },

    },
    {
      key: "chatReason",
      title: $t("page.manage.gmrole.chatReason"),
      align: "center",
      minWidth: 100,
      ellipsis: { tooltip: true }
    },
    {
      key: "banReason",
      title: "封禁原因",
      align: "center",
      minWidth: 100,
      ellipsis: { tooltip: true }
    },
    {
      key: "vipLevel",
      title: $t("page.manage.gmrole.vipLevel"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "vipTotalPoints",
      title: $t("page.manage.gmrole.vipTotalPoints"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "online",
      title: $t("page.manage.gmrole.loginStatus"),
      align: "center",
      minWidth: 100,
      render: (row: any) => {
        const isOnline = row.online;
        const statusKey = String(isOnline);
        const colorMap: Record<string, string> = {
          'true': '#00FF00',   // 绿色 - 在线
          'false': '#86909c'   // 灰色 - 离线
        };

        return (
          <div class="flex-center">
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: colorMap[statusKey] || '#86909c'
            }}></div>
          </div>
        );
      }
    },
    {
      key: "roleStage",
      title: $t("page.manage.gmrole.roleStage"),
      align: "center",
      minWidth: 100,
      render: (row: any) => {
        const roleStage = row.roleStage;
        const deleteTime = row.deleteTime;

        if (roleStage === 1) {
          return (
            <NTag type="error" size="small">
              {$t("page.manage.gmrole.roleStageDeleted")}
            </NTag>
          );
        }

        if (deleteTime !== null && deleteTime !== undefined) {
          return (
            <NTag type="warning" size="small">
              删除中
            </NTag>
          );
        }

        if (roleStage === 0) {
          return (
            <NTag type="success" size="small">
              {$t("page.manage.gmrole.roleStageNormal")}
            </NTag>
          );
        } else if(roleStage === 2){
          return (
            <NTag type="error" size="small">
              {$t("page.manage.gmrole.roleStageBanned")}
            </NTag>
          );
        }

        return null;
      }
    },
    // {
    //   key: "serverName",
    //   title: $t("page.manage.gmrole.serverName"),
    //   align: "center",
    //   minWidth: 100,
    // },
    // {
    //   key: "partyId",
    //   title: $t("page.manage.gmrole.partyId"),
    //   align: "center",
    //   width: 130,
    // },
    // {
    //   key: "partyName",
    //   title: $t("page.manage.gmrole.partyName"),
    //   align: "center",
    //   width: 130,
    // },
    // {
    //   key: "balance",
    //   title: $t("page.manage.gmrole.balance"),
    //   align: "center",
    //   width: 130,
    // },
    // {
    //   key: "ip",
    //   title: $t("page.manage.gmrole.ip"),
    //   align: "center",
    //   width: 130,
    // },

    {
      key: "operate",
      title: $t("common.operate"),
      align: "center",
      width: 200,
      render: (row: PlayerData) => (
        <div class="flex-center gap-8px">
          {hasAuth('user:role:query') && (
            <NButton
              type="primary"
              ghost
              size="small"
              onClick={() => {
                const params = {
                  roleId: String(row.roleId),
                  roleName: row.roleName,
                  serverId: String(row.serverId)  // 添加serverId参数
                };
                routerPushByKey('user_rolelist', { query: params });
              }}
            >
              {$t("common.view")}
            </NButton>
          )}

          {hasAuth('user:role:chat') && (
            row.chatDate ? (
              <NPopconfirm
                onPositiveClick={() => handleUnmuteClick(row.roleId)}
                positiveText={$t("common.confirm")}
                negativeText={$t("common.cancel")}
              >
                {{
                  trigger: () => (
                    <NButton type="success" ghost size="small">
                      {$t("common.unchat")}
                    </NButton>
                  ),
                  default: () => $t("common.confirmUnban")
                }}
              </NPopconfirm>
            ) : (
              <NButton
                type="error"
                ghost
                size="small"
                onClick={() => handleMute(row.roleId, row)}
              >
                {$t("common.chat")}
              </NButton>
            )
          )}

          {/* 新增：封禁/解禁按钮 */}
          {hasAuth('user:role:ban') && (
            row.roleStage === 2 && row.roleStage !==1 ? (
              <NPopconfirm
                onPositiveClick={() => handleUnbanClick(row.roleId)}
                positiveText={$t("common.confirm")}
                negativeText={$t("common.cancel")}
              >
                {{
                  trigger: () => (
                    <NButton type="warning" ghost size="small">
                      解封
                    </NButton>
                  ),
                  default: () => "确认解封此角色？"
                }}
              </NPopconfirm>
            ) : (
              <NButton
                type="error"
                ghost
                size="small"
                onClick={() => handleBan(row.roleId, row)}
              >
                封禁
              </NButton>
            )
          )}
        </div>
      ),
    },
  ],
  defaultHiddenKeys: ['chatDate','chatReason',],
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


function handleSearch() {
  getData();
}

function handleMute(roleId : number, row: any) {
  const muteData = {
    ...row,
    roleId,
    operationType: 'mute'
  };
  handleEdit(roleId, muteData);
}

// 点击解除禁言按钮
async function handleUnmuteClick(roleId : number) {
  try {
    await fetchchatrole({
      roleId: String(roleId),
      action: 'unchat',
      banChatting: '0,1,2,3,4',
      keepTime: 1,
      banReason: '11'
    });
    getData();
    message.success($t("common.unmuteSuccess"));
  } catch (error) {
    console.error('解除禁言失败:', error);
    message.error($t("common.unmuteFailed"));
  }
}

// 新增：封禁角色
async function handleBan(roleId: number, row: any) {
  try {
    const banData = {
      ...row,
      roleId,
      operationType: 'ban'
    };
    handleEdit(roleId, banData);
  } catch (error) {
    console.error('打开封禁弹窗失败:', error);
  }
}

// 新增：解禁角色
async function handleUnbanClick(roleId: number) {
  try {
    await fetchBanrole({
      roleId: String(roleId),
      banReason: '1',
      action: 'unban'
    });
    getData();
    message.success("解禁成功");
  } catch (error) {
    console.error('解禁角色失败:', error);
    message.error("解禁失败");
  }
}

async function handleBatchKick() {
  if (checkedRowKeys.value.length === 0) {
    return;
  }
  try {
    for (const roleId of checkedRowKeys.value) {
      await fetchKickRole({ roleId: String(roleId) });
    }
    checkedRowKeys.value = [];
    getData();
    message.success($t("common.kickSuccess"));
  } catch (error) {
    window.$message?.error('Batch kick failed');
    console.error('批量踢出用户失败:', error);
    message.error($t("common.kickFailed"));
  }
}

// 强制改名相关
const renameModalVisible = ref(false);
const renameData = ref<any>(null);

// 修改坐标相关
const coordsModalVisible = ref(false);
const coordsData = ref<any>(null);

// 删除物品相关
const deleteItemsModalVisible = ref(false);
const deleteItemsData = ref<any>(null);

// 影子登录相关状态
const shadowLoginVisible = ref(false);
const shadowLoginRole = ref<any>(null);

// 设置巅峰点数相关状态
const setPeakPointsVisible = ref(false);
const setPeakPointsData = ref<any>(null);

// 强制完成任务相关状态
const forceCompleteTaskVisible = ref(false);
const forceCompleteTaskData = ref<any>(null);

function handleForceRename() {
  if (checkedRowKeys.value.length === 0) {
    message.warning($t("common.pleaseSelectData"));
    return;
  }
  if (checkedRowKeys.value.length > 1) {
    message.warning("请只选择一个角色进行改名");
    return;
  }

  // 找到选中的角色数据
  const selectedRole = data.value.find((item: any) => item.roleId === checkedRowKeys.value[0]);
  if (selectedRole) {
    renameData.value = selectedRole;
    renameModalVisible.value = true;
  }
}

function handleRenameSubmitted() {
  checkedRowKeys.value = [];
  getData();
}

// 修改坐标相关
function handleModifyCoords() {
  if (checkedRowKeys.value.length === 0) {
    message.warning($t("common.pleaseSelectData"));
    return;
  }
  if (checkedRowKeys.value.length > 1) {
    message.warning("请只选择一个角色进行坐标修改");
    return;
  }

  // 找到选中的角色数据
  const selectedRole = data.value.find((item: any) => item.roleId === checkedRowKeys.value[0]);
  if (selectedRole) {
    coordsData.value = selectedRole;
    coordsModalVisible.value = true;
  }
}

function handleCoordsSubmitted() {
  checkedRowKeys.value = [];
  getData();
}

// 删除物品相关
function handleDeleteItem() {
  if (checkedRowKeys.value.length === 0) {
    message.warning($t("common.pleaseSelectData"));
    return;
  }
  if (checkedRowKeys.value.length > 1) {
    message.warning("请只选择一个角色进行物品删除");
    return;
  }

  // 找到选中的角色数据
  const selectedRole = data.value.find((item: any) => item.roleId === checkedRowKeys.value[0]);
  if (selectedRole) {
    deleteItemsData.value = selectedRole;
    deleteItemsModalVisible.value = true;
  }
}

function handleDeleteItemsSubmitted() {
  checkedRowKeys.value = [];
  getData();
}

// 影子登录相关
function handleShadowLogin() {
  if (checkedRowKeys.value.length === 0) {
    message.warning($t("page.manage.gmuser.pleaseSelectUser"));
    return;
  }
  if (checkedRowKeys.value.length > 1) {
    message.warning($t("page.manage.gmuser.pleaseSelectOnlyOneUser"));
    return;
  }
  const roleId = checkedRowKeys.value[0];
  // 确保类型一致，都转换为字符串进行比较
  const selectedRole = data.value.find((role: any) => {
    const roleIdStr = String(role.roleId || "");
    const checkedRoleIdStr = String(roleId || "");
    return roleIdStr === checkedRoleIdStr;
  });

  if (!selectedRole) {
    message.warning("未找到选中的角色数据，请刷新后重试");
    return;
  }

  // 打开影子登录弹框
  shadowLoginRole.value = selectedRole;
  shadowLoginVisible.value = true;
}

// 确认影子登录
async function handleShadowLoginConfirm(params: { operatorOpenId: string; targetOpenId: string }) {
  try {
    const res = await fetchShadowLogin(params);
    if (handleApiResponseError(res)) return;
    message.success($t("page.manage.gmuser.shadowLoginSuccess"));
    checkedRowKeys.value = [];
    shadowLoginVisible.value = false;
  } catch (error) {
    handleApiCatchError(error);
  }
}

// 设置巅峰点数相关
function handleSetPeakPoints() {
  if (checkedRowKeys.value.length === 0) {
    message.warning($t("common.pleaseSelectData"));
    return;
  }
  if (checkedRowKeys.value.length > 1) {
    message.warning("请只选择一个角色进行巅峰点数设置");
    return;
  }

  // 找到选中的角色数据
  const selectedRole = data.value.find((item: any) => item.roleId === checkedRowKeys.value[0]);
  if (selectedRole) {
    setPeakPointsData.value = selectedRole;
    setPeakPointsVisible.value = true;
  }
}

function handleSetPeakPointsSubmitted() {
  checkedRowKeys.value = [];
  getData();
}

// 强制完成任务
function handleForceCompleteTask() {
  const selectedRole = data.value.find((item: any) => item.roleId === checkedRowKeys.value[0]);
  forceCompleteTaskData.value = selectedRole || null;
  forceCompleteTaskVisible.value = true;
}


// 监听选中项变化，确保玩家数据修改相关操作只能选择一个
watch(checkedRowKeys, (newKeys) => {
  // 如果选择了多个，只保留最后一个（单选模式）
  if (newKeys.length > 1) {
    checkedRowKeys.value = [newKeys[newKeys.length - 1]];
  }
}, { immediate: false });

onMounted(() => {
  data.value = [];
});

</script>

<template>
  <div
    class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto"
  >
    <whiteSelect
      :model="searchParams"
      @reset="resetSearchParams"
      @search="handleSearch"
    />

    <NCard
      :title="$t('page.manage.gmrole.title')"
      :bordered="false"
      size="small"
      class="sm:flex-1-hidden card-wrapper"
    >
      <template #header-extra>
        <TableHeader
          v-model:columns="columnChecks"
          :disabled-delete="checkedRowKeys.length !== 1 || !hasAuth('operate:gsGrantRecords:delete:item')"
          :disabled-kick="checkedRowKeys.length === 0 || !hasAuth('user:role:kick')"
          :disabled-force-rename="checkedRowKeys.length !== 1"
          :disabled-modify-coords="checkedRowKeys.length !== 1 || !hasAuth('user:role:changeMapPosition')"
          :disabled-shadow-login="checkedRowKeys.length !== 1"
          :disabled-set-peak-points="checkedRowKeys.length !== 1"
          :disabled-force-complete-task="false"
          :disabled-import-ban="!hasAuth('user:role:ban:import')"
          :disabled-import-unban="!hasAuth('user:role:unban:import')"
          :disabled-import-kick="!hasAuth('user:role:kick:import')"
          :loading="loading"
          @refresh="getData"
          :show-delete="hasAuth('operate:gsGrantRecords:delete:item')"
          :show-kick="hasAuth('user:role:kick')"
          :show-force-rename="hasAuth('user:role:rename')"
          :show-modify-coords="hasAuth('user:role:changeMapPosition')"
          :show-shadow-login="hasAuth('game:user:shadow')"
          :show-set-peak-points="true"
          :show-force-complete-task="true"
          :show-import-ban="hasAuth('user:role:ban:import')"
          :show-import-unban="hasAuth('user:role:unban:import')"
          :show-import-kick="hasAuth('user:role:kick:import')"
          @delete-item="handleDeleteItem"
          @kick="handleBatchKick"
          @force-rename="handleForceRename"
          @modify-coords="handleModifyCoords"
          @shadow-login="handleShadowLogin"
          @set-peak-points="handleSetPeakPoints"
          @force-complete-task="handleForceCompleteTask"
          @import-ban="handleImportBan"
          @import-unban="handleImportUnban"
          @import-kick="handleImportKick"
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
        :row-key="(row) => row.roleId "
        :pagination="mobilePagination"
        class="sm:h-full"
      />
      <UserOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        @submitted="getDataByPage"
      />

      <ForceRenameModal
        v-model:visible="renameModalVisible"
        :row-data="renameData"
        @submitted="handleRenameSubmitted"
      />
      <ModifyCoordsModal
        v-model:visible="coordsModalVisible"
        :row-data="coordsData"
        @submitted="handleCoordsSubmitted"
      />
      <DeleteItemsModal
        v-model:visible="deleteItemsModalVisible"
        :row-data="deleteItemsData"
        @submitted="handleDeleteItemsSubmitted"
      />
      <ShadowLoginModal
        v-model:visible="shadowLoginVisible"
        :role-data="shadowLoginRole"
        @confirm="handleShadowLoginConfirm"
      />
      <SetPeakPointsModal
        v-model:visible="setPeakPointsVisible"
        :row-data="setPeakPointsData"
        @submitted="handleSetPeakPointsSubmitted"
        />
      <ForceCompleteTaskModal
        v-model:visible="forceCompleteTaskVisible"
        :row-data="forceCompleteTaskData"
        @submitted="getData"
      />
      <!-- 封禁导入弹窗 -->
      <RoleBanImportModal
        v-model:visible="importBanModalVisible"
        @success="getData"
      />
      <!-- 解封导入弹窗 -->
      <RoleUnbanImportModal
        v-model:visible="importUnbanModalVisible"
        @success="getData"
      />

      <!-- 踢出导入弹窗 -->
      <RoleKickImportModal
        v-model:visible="importKickModalVisible"
        @success="getData"
      />
    </NCard>
  </div>
</template>

<style scoped></style>
