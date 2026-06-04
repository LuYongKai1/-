<script setup lang="ts">
import { $t } from "@/locales";
import { ref, h, computed } from "vue";
import { useDialog } from "naive-ui";
import { useSvgIcon } from "@/hooks/common/icon";

defineOptions({
  name: "TableHeaderOperation",
});

const dialog = useDialog();
const { SvgIconVNode } = useSvgIcon();

interface Props {
  itemAlign?: NaiveUI.Align;
  disabledDelete?: boolean;
  loading?: boolean;
  syncLoading?: boolean;
  showSync?: boolean;
  disabledSync?: boolean;
  showAdd?: boolean;
  showBatchDelete?: boolean;
  showImport?: boolean;
  showExport?: boolean;
  showExportConfirm?: boolean;
  showTimeFilter?: boolean;
  disabledCancel?: boolean;
  showCancel?: boolean;
  showStartServer?: boolean;
  disabledStartServer?: boolean;
  showStopServer?: boolean;
  disabledStopServer?: boolean;
  showRestartServer?: boolean;
  disabledRestartServer?: boolean;
  showMaintenance?: boolean;
  showQueue?: boolean;
  showNormal?: boolean;
  showKickAll?: boolean;
  showsynv?: boolean;
  showUpload?: boolean;
  showBatchRecharge?: boolean;
  showBatchCancel?: boolean;
  showSyncCloudServer?: boolean;
  disabledSyncCloudServer?: boolean;
  showServerOperations?: boolean;
  showModeOperations?: boolean;
  showPlayerOperations?: boolean;
  showMaxPlayers?: boolean;
  showCreateFolder?: boolean;
  showCopySpecs?: boolean;
  disabledCopySpecs?: boolean;
  showReleaseServer?: boolean;
  disabledReleaseServer?: boolean;
  showUpdateServer?: boolean;
  disabledUpdateServer?: boolean;
  showRevokeNotice?: boolean;
  disabledRevokeNotice?: boolean;
  showCloneMail?: boolean;
  disabledCloneMail?: boolean;
  showForceRename?: boolean;
  disabledForceRename?: boolean;
  showDisbandGuild?: boolean;
  disabledDisbandGuild?: boolean;
  showEditAnnouncement?: boolean;
  disabledEditAnnouncement?: boolean;
  showUpdateDataPackage?: boolean;
  disabledUpdateDataPackage?: boolean;
  showGetPackageVersion?: boolean;
  disabledGetPackageVersion?: boolean;
  showStatusCheck?: boolean;
  disabledStatusCheck?: boolean;
  showUploadFile?: boolean;
  disabledUploadFile?: boolean;
  showAudit?: boolean;
  disabledAudit?: boolean;
  showVersionManagement?: boolean;
  disabledVersionManagement?: boolean;
  showRefreshConfig?: boolean;
  disabledRefreshConfig?: boolean;
  showModifyVersion?: boolean;
  disabledModifyVersion?: boolean;
  showLevelSwitch?: boolean;
  showDungeonSwitch?: boolean;
  showSeasonSwitch?: boolean;
  showBanCurrency?: boolean;
  showSingleServerBlacklist?: boolean;
  disabledSingleServerBlacklist?: boolean;
  showPlayoffsControl?: boolean;
  showBiddingSettings?: boolean;
}

const props = defineProps<Props>();

interface Emits {
  (e: "add"): void;
  (e: "delete"): void;
  (e: "refresh"): void;
  (e: "import"): void;
  (e: "export"): void;
  (e: "filterTime", range: "day" | "week" | "month"): void;
  (e: "cancel"): void;
  (e: "maintenance"): void; // 维护
  (e: "queue"): void; // 队列
  (e: "normal"): void; // 正常
  (e: "max-players"): void; // 最大人数
  (e: "start-server"): void; // 启动服务器
  (e: "stop-server"): void; // 停止服务器
  (e: "restart-server"): void; // 重启服务器
  (e: "kick-all"): void; // 踢出所有
  (e: "sync"): void; // 同步
  (e: "upload"): void; // 上传
  (e: "batchRecharge"): void; // 批量补单
  (e: "batchCancel"): void; // 批量作废
  (e: "sync-cloud-server"): void; // 同步云服务器
  (e: "create-folder"): void; // 创建文件夹
  (e: "copy-specs"): void; // 复制规格
  (e: "release-server"): void; // 释放服务器
  (e: "update-server"): void; // 更新服务器
  (e: "revoke-notice"): void; // 撤销滚动通知
  (e: "clone-mail"): void; // 克隆邮件
  (e: "force-rename"): void; // 强制改名
  (e: "disband-guild"): void; // 解散公会
  (e: "edit-announcement"): void; // 公告修改
  (e: "update-data-package"): void; // 更新数据包
  (e: "get-package-version"): void; // 获取版本号
  (e: "status-check"): void; // 状态检查
  (e: "upload-file"): void; // 上传文件
  (e: "audit"): void; // 审核
  (e: "version-management"): void; // 版本号管理
  (e: "refresh-config"): void; // 刷新配置
  (e: "modify-version"): void; // 修改版本
  (e: "level-switch"): void; // 等级开关
  (e: "dungeon-switch"): void; // 副本开关
  (e: "season-switch"): void; // 赛季开关
  (e: "ban-currency"): void; // 禁止货币
  (e: "single-server-blacklist"): void; // 单服黑名单
  (e: "playoffs-control"): void; // 控制季后赛
  (e: "bidding-settings"): void; // 设置赛季竞价
}

const emit = defineEmits<Emits>();

const columns = defineModel<NaiveUI.TableColumnCheck[]>("columns", {
  default: () => [],
});

const activeTimeRange = ref<"day" | "week" | "month">("day");

function add() {
  emit("add");
}

function filterTime(range: "day" | "week" | "month") {
  activeTimeRange.value = range;
  emit("filterTime", range);
}

function batchDelete() {
  emit("delete");
}

function refresh() {
  emit("refresh");
}

function importData() {
  emit("import");
}

function exportData() {
  emit("export");
}

function cancel() {
  emit("cancel");
}

function maintenance() {
  emit("maintenance");
}

function queue() {
  emit("queue");
}

function normal() {
  emit("normal");
}

function maxPlayers() {
  emit("max-players");
}

function startServer() {
  emit("start-server");
}

function stopServer() {
  emit("stop-server");
}

function restartServer() {
  emit("restart-server");
}

function kickAll() {
  emit("kick-all");
}

function sync() {
  emit("sync");
}

function upload() {
  emit("upload");
}

function batchRecharge() {
  emit("batchRecharge");
}

function batchCancel() {
  emit("batchCancel");
}

function syncCloudServer() {
  emit("sync-cloud-server");
}

function createFolder() {
  emit("create-folder");
}

function copySpecs() {
  emit("copy-specs");
}

function releaseServer() {
  emit("release-server");
}

function updateServer() {
  emit("update-server");
}

function revokeNotice() {
  emit("revoke-notice");
}

function cloneMail() {
  emit("clone-mail");
}

function forceRename() {
  emit("force-rename");
}

function disbandGuild() {
  emit("disband-guild");
}

function editAnnouncement() {
  emit("edit-announcement");
}

function updateDataPackage() {
  emit("update-data-package");
}

function getPackageVersion() {
  emit("get-package-version");
}

function statusCheck() {
  emit("status-check");
}

function uploadFile() {
  emit("upload-file");
}

function audit() {
  emit("audit");
}

function versionManagement() {
  emit("version-management");
}

function refreshConfig() {
  emit("refresh-config");
}

function modifyVersion() {
  emit("modify-version");
}

function levelSwitch() {
  emit("level-switch");
}

function dungeonSwitch() {
  emit("dungeon-switch");
}

function seasonSwitch() {
  emit("season-switch");
}

function banCurrency() {
  emit("ban-currency");
}

function singleServerBlacklist() {
  emit("single-server-blacklist");
}

function playoffsControl() {
  emit("playoffs-control");
}

function biddingSettings() {
  emit("bidding-settings");
}

// 处理服务器操作选择  服务器管理操作
function handleServerOperationSelect(key: string) {
  switch (key) {
    case "start":
      dialog.warning({
        title: $t("common.tip"),
        content: $t("common.confirmStartServer"),
        positiveText: $t("common.confirm"),
        negativeText: $t("common.cancel"),
        onPositiveClick: () => {
          startServer();
        },
      });
      break;
    case "stop":
      dialog.warning({
        title: $t("common.tip"),
        content: $t("common.confirmStopServer"),
        positiveText: $t("common.confirm"),
        negativeText: $t("common.cancel"),
        onPositiveClick: () => {
          stopServer();
        },
      });
      break;
    case "restart":
      dialog.warning({
        title: $t("common.tip"),
        content: $t("common.confirmRestartServer"),
        positiveText: $t("common.confirm"),
        negativeText: $t("common.cancel"),
        onPositiveClick: () => {
          restartServer();
        },
      });
      break;
    case "sync":
      syncCloudServer();
      break;
    case "update":
      updateServer();
      break;
    case "release":
      dialog.warning({
        title: $t("common.tip"),
        content: $t("common.confirmReleaseServer"),
        positiveText: $t("common.confirm"),
        negativeText: $t("common.cancel"),
        onPositiveClick: () => {
          releaseServer();
        },
      });
      break;
  }
}

// 处理模式操作选择  模式管理操作
function handleModeOperationSelect(key: string) {
  switch (key) {
    case "maintenance":
      dialog.warning({
        title: $t("common.tip"),
        content: $t("common.confirmMaintenance"),
        positiveText: $t("common.confirm"),
        negativeText: $t("common.cancel"),
        onPositiveClick: () => {
          maintenance();
        },
      });
      break;
    case "queue":
      // 排队模式直接执行，不需要确认
      queue();
      break;
    case "normal":
      dialog.warning({
        title: $t("common.tip"),
        content: $t("common.confirmNormal"),
        positiveText: $t("common.confirm"),
        negativeText: $t("common.cancel"),
        onPositiveClick: () => {
          normal();
        },
      });
      break;
    case "maxPlayers":
      maxPlayers();
      break;
    case "versionManagement":
      // 版本号管理直接执行，不需要确认
      versionManagement();
      break;
    case "refreshConfig":
      // 刷新配置直接执行，不需要确认
      refreshConfig();
      break;
    case "modifyVersion":
      // 修改版本直接执行，不需要确认
      modifyVersion();
      break;
  }
}

// 处理玩家操作选择  玩家管理操作
function handlePlayerOperationSelect(key: string) {
  switch (key) {
    case "kickAll":
      dialog.warning({
        title: $t("common.tip"),
        content: $t("common.confirmKickAll"),
        positiveText: $t("common.confirm"),
        negativeText: $t("common.cancel"),
        onPositiveClick: () => {
          kickAll();
        },
      });
      break;
  }
}

// 定义服务器操作下拉菜单选项
const serverOperationOptions = computed(() => {
  const options: any[] = [];
  // 目标顺序： 同步 -> 更新 -> 停止 -> 开启 -> 重启 -> 释放

  if (props.showSyncCloudServer === true) {
    options.push({
      label: $t("common.syncCloudServer"),
      key: "sync",
      icon: SvgIconVNode({ icon: "mdi:cloud-sync", fontSize: 18 }),
      disabled: props.disabledSyncCloudServer,
    });
  }

  if (props.showUpdateServer === true) {
    options.push({
      label: $t("common.updateServer"),
      key: "update",
      icon: SvgIconVNode({ icon: "mdi:refresh", fontSize: 18 }),
      disabled: props.disabledUpdateServer,
    });
  }

  if (props.showStopServer === true) {
    options.push({
      label: $t("common.stopServer"),
      key: "stop",
      icon: SvgIconVNode({ icon: "mdi:server-off", fontSize: 18 }),
      disabled: props.disabledStopServer,
    });
  }

  if (props.showStartServer === true) {
    options.push({
      label: $t("common.startServer"),
      key: "start",
      icon: SvgIconVNode({ icon: "mdi:server", fontSize: 18 }),
      disabled: props.disabledStartServer,
    });
  }

  if (props.showRestartServer === true) {
    options.push({
      label: $t("common.restartServer"),
      key: "restart",
      icon: SvgIconVNode({ icon: "mdi:restart", fontSize: 18 }),
      disabled: props.disabledRestartServer,
    });
  }

  if (props.showReleaseServer === true) {
    options.push({
      label: $t("common.releaseServer"),
      key: "release",
      icon: SvgIconVNode({ icon: "mdi:delete-forever", fontSize: 18 }),
      disabled: props.disabledReleaseServer,
    });
  }

  return options;
});

// 定义模式操作下拉菜单选项
const modeOperationOptions = computed(() => {
  const options: any[] = [];

  // 维护模式
  if (props.showMaintenance === true) {
    options.push({
      label: $t("common.maintenance"),
      key: "maintenance",
      icon: SvgIconVNode({ icon: "mdi:tools", fontSize: 18 }),
      disabled: props.disabledDelete,
    });
  }

  // 排队模式
  if (props.showQueue === true) {
    options.push({
      label: $t("common.queue"),
      key: "queue",
      icon: SvgIconVNode({ icon: "mdi:account-multiple", fontSize: 18 }),
      disabled: props.disabledDelete,
    });
  }

  // 正常模式
  if (props.showNormal === true) {
    options.push({
      label: $t("common.normal"),
      key: "normal",
      icon: SvgIconVNode({ icon: "mdi:check-circle", fontSize: 18 }),
      disabled: props.disabledDelete,
    });
  }

  // 最大人数
  if (props.showMaxPlayers === true) {
    options.push({
      label: $t("common.maxPlayers"),
      key: "maxPlayers",
      icon: SvgIconVNode({ icon: "mdi:account-multiple-check", fontSize: 18 }),
      disabled: props.disabledDelete,
    });
  }

    // 版本号管理
    if (props.showVersionManagement === true) {
    options.push({
      label: $t("common.versionManagement"),
      key: "versionManagement",
      icon: SvgIconVNode({ icon: "mdi:tag-text", fontSize: 18 }),
      disabled: props.disabledVersionManagement,
    });
  }

  // 刷新配置
  if (props.showRefreshConfig === true) {
    options.push({
      label: $t("common.refreshConfig"),
      key: "refreshConfig",
      icon: SvgIconVNode({ icon: "mdi:refresh-circle", fontSize: 18 }),
      disabled: props.disabledRefreshConfig,
    });
  }

  // 修改版本
  if (props.showModifyVersion === true) {
    options.push({
      label: $t("common.modifyVersion"),
      key: "modifyVersion",
      icon: SvgIconVNode({ icon: "mdi:tag-edit", fontSize: 18 }),
      disabled: props.disabledModifyVersion,
    });
  }

  return options;
});

// 定义玩家操作下拉菜单选项
const playerOperationOptions = computed(() => {
  const options: any[] = [];

  // 踢出全部
  if (props.showKickAll === true) {
    options.push({
      label: $t("common.kickAll"),
      key: "kickAll",
      icon: SvgIconVNode({ icon: "mdi:logout", fontSize: 18 }),
      disabled: props.disabledDelete,
    });
  }

  return options;
});
</script>

<template>
  <NSpace :align="itemAlign" wrap justify="end" class="lt-sm:w-200px">
    <slot name="prefix"></slot>

    <NButtonGroup v-if="showTimeFilter" size="small">
      <NButton
        :focusable="false"
        :type="activeTimeRange === 'day' ? 'primary' : 'default'"
        ghost
        @click="filterTime('day')"
        >{{ $t("common.day") }}</NButton
      >
      <NButton
        :focusable="false"
        :type="activeTimeRange === 'week' ? 'primary' : 'default'"
        ghost
        @click="filterTime('week')"
        >{{ $t("common.week") }}</NButton
      >
      <NButton
        :focusable="false"
        :type="activeTimeRange === 'month' ? 'primary' : 'default'"
        ghost
        @click="filterTime('month')"
        >{{ $t("common.month") }}</NButton
      >
    </NButtonGroup>

    <slot name="default">
      <NButton v-if="showAdd" size="small" ghost type="primary" @click="add">
        <template #icon>
          <icon-ic-round-plus class="text-icon" />
        </template>
        {{ $t("common.add") }}
      </NButton>

      <NButton
        v-if="showImport"
        size="small"
        ghost
        type="primary"
        @click="importData"
      >
        <template #icon>
          <icon-mdi-upload class="text-icon" />
        </template>
        {{ $t("common.import") }}
      </NButton>

      <NButton
        v-if="showUpload"
        size="small"
        ghost
        type="primary"
        @click="upload"
      >
        <template #icon>
          <icon-mdi-upload class="text-icon" />
        </template>
        {{ $t("common.upload") }}
      </NButton>

      <NButton
        v-if="showCreateFolder"
        size="small"
        ghost
        type="primary"
        @click="createFolder"
      >
        <template #icon>
          <icon-mdi-folder-plus class="text-icon" />
        </template>
        {{ $t("common.createFolder") }}
      </NButton>

      <NButton
        v-if="showCopySpecs"
        size="small"
        ghost
        type="success"
        :disabled="disabledCopySpecs"
        @click="copySpecs"
      >
        <template #icon>
          <icon-mdi-content-copy class="text-icon" />
        </template>
        {{ $t("common.copySpecs") }}
      </NButton>

      <NButton
        v-if="showBatchRecharge"
        size="small"
        ghost
        type="primary"
        @click="batchRecharge"
      >
        {{ $t("common.batchRecharge") }}
        <template #icon>
          <icon-mdi-sync class="text-icon" />
        </template>
      </NButton>

      <!-- 导出按钮 -->
      <NPopconfirm
        v-if="showExport && showExportConfirm"
        @positive-click="exportData"
      >
        <template #trigger>
          <NButton size="small" ghost type="success">
            <template #icon>
              <icon-mdi-download class="text-icon" />
            </template>
            {{ $t("common.export") }}
          </NButton>
        </template>
        {{ $t("common.confirmExport") }}
      </NPopconfirm>

      <!-- 导出按钮 (独立显示时) -->
      <NButton
        v-if="showExport && !showExportConfirm"
        size="small"
        ghost
        type="success"
        @click="exportData"
      >
        <template #icon>
          <icon-mdi-download class="text-icon" />
        </template>
        {{ $t("common.export") }}
      </NButton>

      <!-- 同步云服务器按钮 (独立显示时) -->
      <NButton
        v-if="showSyncCloudServer && !showServerOperations"
        size="small"
        ghost
        type="success"
        :disabled="disabledSyncCloudServer"
        @click="syncCloudServer"
      >
        <template #icon>
          <icon-mdi-cloud-sync class="text-icon" />
        </template>
        {{ $t("common.syncCloudServer") }}
      </NButton>

      <!-- 更新服务器按钮 (独立显示时) -->
      <NButton
        v-if="showUpdateServer && !showServerOperations"
        size="small"
        ghost
        type="primary"
        :disabled="disabledUpdateServer"
        @click="updateServer"
      >
        <template #icon>
          <icon-mdi-refresh class="text-icon" />
        </template>
        {{ $t("common.updateServer") }}
      </NButton>

      <!-- 批量删除按钮 -->
      <NPopconfirm v-if="showBatchDelete" @positive-click="batchDelete">
        <template #trigger>
          <NButton size="small" ghost type="error" :disabled="disabledDelete">
            <template #icon>
              <icon-ic-round-delete class="text-icon" />
            </template>
            {{ $t("common.batchDelete") }}
          </NButton>
        </template>
        {{ $t("common.confirmDelete") }}
      </NPopconfirm>

      <!-- 批量作废按钮 -->
      <NPopconfirm v-if="showBatchCancel" @positive-click="batchCancel">
        <template #trigger>
          <NButton size="small" ghost type="error" :disabled="disabledDelete">
            <template #icon>
              <icon-ic-round-delete class="text-icon" />
            </template>
            {{ $t("common.batchCancel") }}
          </NButton>
        </template>
        {{ $t("common.confirmBatchCancel") }}
      </NPopconfirm>

      <!-- 撤销滚动通知按钮 -->
      <NPopconfirm v-if="showRevokeNotice" @positive-click="revokeNotice">
        <template #trigger>
          <NButton size="small" ghost type="warning" :disabled="disabledRevokeNotice">
            <template #icon>
              <icon-mdi-undo class="text-icon" />
            </template>
            {{ $t("common.revokeNotice") }}
          </NButton>
        </template>
        {{ $t("common.confirmRevokeNotice") }}
      </NPopconfirm>

      <!-- 克隆邮件按钮 -->
      <NButton
        v-if="showCloneMail"
        size="small"
        ghost
        type="info"
        :disabled="disabledCloneMail"
        @click="cloneMail"
      >
        <template #icon>
          <icon-mdi-content-copy class="text-icon" />
        </template>
        {{ $t("common.cloneMail") }}
      </NButton>

      <!-- 强制改名按钮 -->
      <NButton
        v-if="showForceRename"
        size="small"
        ghost
        type="warning"
        :disabled="disabledForceRename"
        @click="forceRename"
      >
        <template #icon>
          <icon-mdi-pencil class="text-icon" />
        </template>
        {{ $t("common.forceRename") }}
      </NButton>

      <!-- 解散公会按钮 -->
      <NButton
        v-if="showDisbandGuild"
        size="small"
        ghost
        type="error"
        :disabled="disabledDisbandGuild"
        @click="disbandGuild"
      >
        <template #icon>
          <icon-mdi-delete-forever class="text-icon" />
        </template>
        {{ $t("common.disbandGuild") }}
      </NButton>

      <!-- 公告修改按钮 -->
      <NButton
        v-if="showEditAnnouncement"
        size="small"
        ghost
        type="primary"
        :disabled="disabledEditAnnouncement"
        @click="editAnnouncement"
      >
        <template #icon>
          <icon-mdi-bullhorn class="text-icon" />
        </template>
        {{ $t("common.editAnnouncement") }}
      </NButton>

      <!-- 更新数据包按钮 -->
      <NButton
        v-if="showUpdateDataPackage"
        size="small"
        ghost
        type="primary"
        :disabled="disabledUpdateDataPackage"
        :loading="disabledUpdateDataPackage"
        @click="updateDataPackage"
      >
        <template #icon>
          <icon-mdi-refresh class="text-icon" />
        </template>
        {{ $t("common.updateDataPackage") }}
      </NButton>

      <!-- 获取版本号按钮 -->
      <NButton
        v-if="showGetPackageVersion"
        size="small"
        ghost
        type="info"
        :disabled="disabledGetPackageVersion"
        :loading="disabledGetPackageVersion"
        @click="getPackageVersion"
      >
        <template #icon>
          <icon-mdi-information-outline class="text-icon" />
        </template>
        {{ $t("common.getPackageVersion") }}
      </NButton>

      <!-- 状态检查按钮 -->
      <NPopconfirm v-if="showStatusCheck" @positive-click="statusCheck">
        <template #trigger>
          <NButton
            size="small"
            ghost
            type="info"
            :disabled="disabledStatusCheck"
          >
            <template #icon>
              <icon-mdi-check-circle-outline class="text-icon" />
            </template>
            {{ $t("common.statusCheck") }}
          </NButton>
        </template>
        {{ $t("common.confirmStatusCheck") }}
      </NPopconfirm>

      <!-- 取消邮件按钮 -->
      <NPopconfirm v-if="showCancel" @positive-click="cancel">
        <template #trigger>
          <NButton size="small" ghost type="warning" :disabled="disabledCancel">
            <template #icon>
              <icon-mdi-cancel class="text-icon" />
            </template>
            {{ $t("common.cancelMail") }}
          </NButton>
        </template>
        {{ $t("common.confirmCancel") }}
      </NPopconfirm>

      <!-- 服务器管理操作下拉菜单 -->
      <NDropdown
        v-if="showServerOperations"
        trigger="click"
        :options="serverOperationOptions"
        @select="handleServerOperationSelect"
      >
        <NButton size="small" ghost type="primary">
          <template #icon>
            <icon-mdi-server-network class="text-icon" />
          </template>
          {{ $t("common.serverManagement") }}
          <icon-mdi-chevron-down class="text-icon ml-1" />
        </NButton>
      </NDropdown>

      <!-- 开启服务器按钮 (独立显示时) -->
      <NPopconfirm
        v-if="showStartServer && !showServerOperations"
        @positive-click="startServer"
      >
        <template #trigger>
          <NButton size="small" ghost type="success" :disabled="disabledStartServer">
            <template #icon>
              <icon-mdi-server class="text-icon" />
            </template>
            {{ $t("common.startServer") }}
          </NButton>
        </template>
        {{ $t("common.confirmStartServer") }}
      </NPopconfirm>

      <!-- 停止服务器按钮 (独立显示时) -->
      <NPopconfirm
        v-if="showStopServer && !showServerOperations"
        @positive-click="stopServer"
      >
        <template #trigger>
          <NButton size="small" ghost type="error" :disabled="disabledStopServer">
            <template #icon>
              <icon-mdi-server-off class="text-icon" />
            </template>
            {{ $t("common.stopServer") }}
          </NButton>
        </template>
        {{ $t("common.confirmStopServer") }}
      </NPopconfirm>

      <!-- 重启服务器按钮 (独立显示时) -->
      <NPopconfirm
        v-if="showRestartServer && !showServerOperations"
        @positive-click="restartServer"
      >
        <template #trigger>
          <NButton size="small" ghost type="warning" :disabled="disabledRestartServer">
            <template #icon>
              <icon-mdi-restart class="text-icon" />
            </template>
            {{ $t("common.restartServer") }}
          </NButton>
        </template>
        {{ $t("common.confirmRestartServer") }}
      </NPopconfirm>

      <!-- 释放服务器按钮 (独立显示时) -->
      <NPopconfirm
        v-if="showReleaseServer && !showServerOperations"
        @positive-click="releaseServer"
      >
        <template #trigger>
          <NButton
            size="small"
            ghost
            type="error"
            :disabled="disabledReleaseServer"
          >
            <template #icon>
              <icon-mdi-delete-forever class="text-icon" />
            </template>
            {{ $t("common.releaseServer") }}
          </NButton>
        </template>
        {{ $t("common.confirmReleaseServer") }}
      </NPopconfirm>

      <!-- 模式操作下拉菜单 -->
      <NDropdown
        v-if="showModeOperations"
        trigger="click"
        :options="modeOperationOptions"
        @select="handleModeOperationSelect"
      >
        <NButton size="small" ghost type="warning">
          <template #icon>
            <icon-mdi-cog class="text-icon" />
          </template>
          {{ $t("common.modeManagement") }}
          <icon-mdi-chevron-down class="text-icon ml-1" />
        </NButton>
      </NDropdown>

      <!-- 维护按钮 (独立显示时) -->
      <NPopconfirm
        v-if="showMaintenance && !showModeOperations"
        @positive-click="maintenance"
      >
        <template #trigger>
          <NButton size="small" ghost type="warning" :disabled="disabledDelete">
            <template #icon>
              <icon-mdi-tools class="text-icon" />
            </template>
            {{ $t("common.maintenance") }}
          </NButton>
        </template>
        {{ $t("common.confirmMaintenance") }}
      </NPopconfirm>

      <!-- 排队按钮 (独立显示时) - 直接点击触发 -->
      <NButton
        v-if="showQueue && !showModeOperations"
        size="small"
        ghost
        type="info"
        :disabled="disabledDelete"
        @click="queue"
      >
        <template #icon>
          <icon-mdi-account-multiple class="text-icon" />
        </template>
        {{ $t("common.queue") }}
      </NButton>

      <!-- 修改版本按钮 (独立显示时) -->
      <NButton
        v-if="showModifyVersion && !showModeOperations"
        size="small"
        ghost
        type="primary"
        :disabled="disabledModifyVersion"
        @click="modifyVersion"
      >
        <template #icon>
          <icon-mdi-tag-edit class="text-icon" />
        </template>
        {{ $t("common.modifyVersion") }}
      </NButton>

      <!-- 玩家操作下拉菜单 -->
      <NDropdown
        v-if="showPlayerOperations"
        trigger="click"
        :options="playerOperationOptions"
        @select="handlePlayerOperationSelect"
      >
        <NButton size="small" ghost type="error">
          <template #icon>
            <icon-mdi-account-group class="text-icon" />
          </template>
          {{ $t("common.playerManagement") }}
          <icon-mdi-chevron-down class="text-icon ml-1" />
        </NButton>
      </NDropdown>

      <!-- 踢出所有按钮 (独立显示时) -->
      <NPopconfirm
        v-if="showKickAll && !showPlayerOperations"
        @positive-click="kickAll"
      >
        <template #trigger>
          <NButton size="small" ghost type="error" :disabled="disabledDelete">
            <template #icon>
              <icon-mdi-logout class="text-icon" />
            </template>
            {{ $t("common.kickAll") }}
          </NButton>
        </template>
        {{ $t("common.confirmKickAll") }}
      </NPopconfirm>

      <!-- 同步 -->
      <NPopconfirm v-if="showSync" @positive-click="sync">
        <template #trigger>
          <NButton
            size="small"
            ghost
            type="success"
            :disabled="disabledSync"
            :loading="syncLoading"
          >
            <template #icon>
              <icon-mdi-sync
                class="text-icon"
                :class="{ 'animate-spin': syncLoading }"
              />
            </template>
            {{ $t("common.sync") }}
          </NButton>
        </template>
        {{ $t("common.confirmSync") }}
      </NPopconfirm>

      <!-- 同步跨服 -->
      <NButton v-if="showsynv" size="small" ghost type="success" @click="sync">
        <template #icon>
          <icon-mdi-sync class="text-icon" />
        </template>
        {{ $t("common.syncCross") }}
      </NButton>

      <!-- 上传文件按钮 -->
      <NButton
        v-if="showUploadFile"
        size="small"
        ghost
        type="primary"
        :disabled="disabledUploadFile"
        @click="uploadFile"
      >
        <template #icon>
          <icon-mdi-file-upload class="text-icon" />
        </template>
        {{ $t("common.upload") }}
      </NButton>

      <!-- 等级开关按钮 -->
      <NButton
        v-if="showLevelSwitch"
        size="small"
        ghost
        type="primary"
        @click="levelSwitch"
      >
        <template #icon>
          <icon-mdi-toggle-switch class="text-icon" />
        </template>
        {{ $t("common.levelSwitch") }}
      </NButton>

      <!-- 副本开关按钮 -->
      <NButton
        v-if="showDungeonSwitch"
        size="small"
        ghost
        type="primary"
        @click="dungeonSwitch"
      >
        <template #icon>
          <icon-mdi-toggle-switch class="text-icon" />
        </template>
        {{ $t("common.dungeonSwitch") }}
      </NButton>

      <!-- 赛季开关按钮 -->
      <NButton
        v-if="showSeasonSwitch"
        size="small"
        ghost
        type="primary"
        @click="seasonSwitch"
      >
        <template #icon>
          <icon-ic-round-settings class="text-icon" />
        </template>
        赛季开关
      </NButton>

      <!-- 禁止货币按钮 -->
      <NButton
        v-if="showBanCurrency"
        size="small"
        ghost
        type="error"
        @click="banCurrency"
      >
        <template #icon>
          <icon-mdi-currency-usd-off class="text-icon" />
        </template>
        禁止货币
      </NButton>

      <!-- 审核按钮 -->
      <NButton
        v-if="showAudit"
        size="small"
        ghost
        type="info"
        :disabled="disabledAudit"
        @click="audit"
      >
        <template #icon>
          <icon-mdi-check-decagram class="text-icon" />
        </template>
        {{ $t("common.audit") }}
      </NButton>

      <!-- 单服黑名单按钮 -->
      <NButton
        v-if="showSingleServerBlacklist"
        size="small"
        ghost
        type="warning"
        :disabled="disabledSingleServerBlacklist"
        @click="singleServerBlacklist"
      >
        <template #icon>
          <icon-mdi-account-cancel class="text-icon" />
        </template>
        单服黑名单
      </NButton>

      <!-- 控制季后赛按钮 -->
      <NButton
        v-if="showPlayoffsControl"
        size="small"
        ghost
        type="info"
        @click="playoffsControl"
      >
        <template #icon>
          <icon-mdi-trophy class="text-icon" />
        </template>
        控制季后赛
      </NButton>

      <!-- 设置赛季竞价按钮 -->
      <NButton
        v-if="showBiddingSettings"
        size="small"
        ghost
        type="success"
        @click="biddingSettings"
      >
        <template #icon>
          <icon-mdi-gavel class="text-icon" />
        </template>
        设置赛季竞价
      </NButton>
    </slot>
    <NButton size="small" @click="refresh">
      <template #icon>
        <icon-mdi-refresh
          class="text-icon"
          :class="{ 'animate-spin': loading }"
        />
      </template>
      {{ $t("common.refresh") }}
    </NButton>
    <TableColumnSetting v-model:columns="columns" />
    <slot name="suffix"></slot>
  </NSpace>
</template>

<style scoped></style>
