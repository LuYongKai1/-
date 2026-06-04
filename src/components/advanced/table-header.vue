<script setup lang="ts">
import { $t } from "@/locales";
import { computed } from "vue";
import { useDialog } from "naive-ui";
import { NButton, NPopconfirm, NSpace, NDropdown } from "naive-ui";
import { useSvgIcon } from "@/hooks/common/icon";

defineOptions({
  name: "UserOperation",
});

const dialog = useDialog();
const { SvgIconVNode } = useSvgIcon();

interface Props {
  itemAlign?: NaiveUI.Align;
  disabledBan?: boolean; // 禁用封禁按钮
  disabledMute?: boolean; // 禁用禁言按钮
  disabledUnmute?: boolean; // 禁用解除禁言按钮
  disabledKick?: boolean; // 禁用踢出下线按钮
  disabledForceRename?: boolean; // 禁用强制改名按钮
  disabledModifyCoords?: boolean; // 禁用修改坐标按钮
  disabledDelete?: boolean; // 禁用删除物品按钮
  disabledShadowLogin?: boolean; // 禁用影子登录按钮
  disabledSkipQueue?: boolean; // 禁用特权按钮
  disabledSetPeakPoints?: boolean; // 禁用设置巅峰点数按钮
  disabledForceCompleteTask?: boolean; // 禁用强制完成任务按钮
  disabledImportBan?: boolean; // 新增：禁用封禁导入按钮
  disabledImportUnban?: boolean; // 新增：禁用解封导入按钮
  disabledImportKick?: boolean; // 新增：禁用踢出导入按钮
  loading?: boolean; // 加载状态
  showKick?: boolean; // 新增：控制踢下线按钮显示
  showImport?: boolean; // 新增导入禁用用户按钮显示
  showForceRename?: boolean; // 控制强制改名按钮显示
  showModifyCoords?: boolean; // 控制修改坐标按钮显示
  showDelete?: boolean; // 控制删除物品按钮显示
  showSync?: boolean; // 控制同步按钮显示
  showShadowLogin?: boolean; // 控制影子登录按钮显示
  showSkipQueue?: boolean; // 控制特权按钮显示
  showSetPeakPoints?: boolean; // 控制设置巅峰点数按钮显示
  showForceCompleteTask?: boolean; // 控制强制完成任务按钮显示
  showImportBan?: boolean; // 新增：控制封禁导入按钮显示
  showImportUnban?: boolean; // 新增：控制解封导入按钮显示
  showImportKick?: boolean;//新增：批量踢出导入按钮显示
}

const props = defineProps<Props>();

interface Emits {
  (e: "ban"): void; // 封禁用户
  (e: "import"): void; // 导入用户
  (e: "unban"): void; // 解封用户
  (e: "chat"): void; // 禁言用户
  (e: "unchat"): void; // 解除禁言
  (e: "kick"): void; // 踢出下线
  (e: "force-rename"): void; // 强制改名
  (e: "modify-coords"): void; // 修改坐标
  (e: "delete-item"): void; // 删除物品
  (e: "shadow-login"): void; // 影子登录
  (e: "skip-queue"): void; // 特权
  (e: "set-peak-points"): void; // 设置巅峰点数
  (e: "force-complete-task"): void; // 强制完成任务
  (e: 'refresh'): void;
  (e: "import-ban"): void; // 新增：封禁导入
  (e: "import-unban"): void; // 新增：解封导入
  (e: "import-kick"): void; // 新增：批量踢出导入
}

const columns = defineModel<NaiveUI.TableColumnCheck[]>("columns", {
  default: () => [],
});

const emit = defineEmits<Emits>();

function importData() {
  emit("import");
}

function importBanData() {
  emit("import-ban");
}

function importUnbanData() {
  emit("import-unban");
}

function importKickData() {
  emit("import-kick");
}

function refresh() {
  emit('refresh');
}

function kick() {
  emit('kick');
}

function forceRename() {
  emit('force-rename');
}

function modifyCoords() {
  emit('modify-coords');
}

function deleteItem() {
  emit('delete-item');
}

function shadowLogin() {
  emit('shadow-login');
}

function skipQueue() {
  emit('skip-queue');
}

function setPeakPoints() {
  emit('set-peak-points');
}

function forceCompleteTask() {
  emit('force-complete-task');
}

// 处理封禁/解封操作选择
function handleBanOperationSelect(key: string) {
  switch (key) {
    case "kick":
      dialog.warning({
        title: $t("common.tip"),
        content: $t("common.confirmKickMany"),
        positiveText: $t("common.confirm"),
        negativeText: $t("common.cancel"),
        onPositiveClick: () => {
          kick();
        },
      });
      break;
    case "importBan":
      importBanData();
      break;
    case "importUnban":
      importUnbanData();
      break;
    case "importKick":
      importKickData();
      break;
    case "import":
      importData();
      break;
  }
}

// 处理玩家数据操作选择
function handlePlayerDataOperationSelect(key: string) {
  switch (key) {
    case "forceRename":
      forceRename();
      break;
    case "modifyCoords":
      modifyCoords();
      break;
    case "deleteItem":
      deleteItem();
      break;
    case "setPeakPoints":
      setPeakPoints();
      break;
    case "forceCompleteTask":
      forceCompleteTask();
      break;
  }
}

// 处理登录/权限操作选择
function handleLoginOperationSelect(key: string) {
  switch (key) {
    case "shadowLogin":
      shadowLogin();
      break;
    case "skipQueue":
      skipQueue();
      break;
  }
}

// 定义封禁/解封操作下拉菜单选项
const banOperationOptions = computed(() => {
  const options: any[] = [];

  if (props.showKick === true) {
    options.push({
      label: $t("common.kick"),
      key: "kick",
      icon: SvgIconVNode({ icon: "mdi:logout", fontSize: 18 }),
      disabled: props.disabledKick,
    });
  }

  if (props.showImportBan === true) {
    options.push({
      label: "封禁导入",
      key: "importBan",
      icon: SvgIconVNode({ icon: "mdi:upload", fontSize: 18 }),
      disabled: props.disabledImportBan,
    });
  }

  if (props.showImportKick === true) {
    options.push({
      label: "踢出导入",
      key: "importKick",
      icon: SvgIconVNode({ icon: "mdi:upload", fontSize: 18 }),
      disabled: props.disabledImportKick,
    });
  }

  if (props.showImportUnban === true) {
    options.push({
      label: "解封导入",
      key: "importUnban",
      icon: SvgIconVNode({ icon: "mdi:upload", fontSize: 18 }),
      disabled: props.disabledImportUnban,
    });
  }

  if (props.showImport === true) {
    options.push({
      label: $t("common.import"),
      key: "import",
      icon: SvgIconVNode({ icon: "mdi:upload", fontSize: 18 }),
      disabled: false,
    });
  }

  return options;
});

// 定义玩家数据操作下拉菜单选项
const playerDataOperationOptions = computed(() => {
  const options: any[] = [];

  if (props.showForceRename === true) {
    options.push({
      label: $t("common.forceRename"),
      key: "forceRename",
      icon: SvgIconVNode({ icon: "mdi:pencil", fontSize: 18 }),
      disabled: props.disabledForceRename,
    });
  }

  if (props.showModifyCoords === true) {
    options.push({
      label: $t("common.modifyCoords"),
      key: "modifyCoords",
      icon: SvgIconVNode({ icon: "mdi:map-marker", fontSize: 18 }),
      disabled: props.disabledModifyCoords,
    });
  }

  if (props.showDelete === true) {
    options.push({
      label: $t("page.manage.gsRole.deleteItems"),
      key: "deleteItem",
      icon: SvgIconVNode({ icon: "mdi:delete", fontSize: 18 }),
      disabled: props.disabledDelete,
    });
  }

  if (props.showSetPeakPoints === true) {
    options.push({
      label: "设置巅峰点数",
      key: "setPeakPoints",
      icon: SvgIconVNode({ icon: "mdi:chart-line", fontSize: 18 }),
      disabled: props.disabledSetPeakPoints,
    });
  }

  if (props.showForceCompleteTask === true) {
    options.push({
      label: "强制完成任务",
      key: "forceCompleteTask",
      icon: SvgIconVNode({ icon: "mdi:checkbox-marked-circle-outline", fontSize: 18 }),
      disabled: props.disabledForceCompleteTask,
    });
  }

  return options;
});

// 定义登录/权限操作下拉菜单选项
const loginOperationOptions = computed(() => {
  const options: any[] = [];

  if (props.showShadowLogin === true) {
    options.push({
      label: $t("common.shadowLogin"),
      key: "shadowLogin",
      icon: SvgIconVNode({ icon: "mdi:account-arrow-right", fontSize: 18 }),
      disabled: props.disabledShadowLogin,
    });
  }

  if (props.showSkipQueue === true) {
    options.push({
      label: $t("common.skipQueue"),
      key: "skipQueue",
      icon: SvgIconVNode({ icon: "mdi:account-check", fontSize: 18 }),
      disabled: props.disabledSkipQueue,
    });
  }

  return options;
});

</script>


<template>
  <NSpace :align="itemAlign" wrap justify="end" class="lt-sm:w-200px">
    <slot name="prefix"></slot>
    <slot name="default">
      <!-- 封禁/解封操作下拉菜单 -->
      <NDropdown
        v-if="banOperationOptions.length > 0"
        trigger="click"
        :options="banOperationOptions"
        @select="handleBanOperationSelect"
      >
        <NButton size="small" ghost type="error">
          <template #icon>
            <icon-mdi-shield-account class="text-icon" />
          </template>
          {{ $t("common.banUnbanOperations") }}
          <icon-mdi-chevron-down class="text-icon ml-1" />
        </NButton>
      </NDropdown>

      <!-- 踢出下线按钮 (独立显示时) -->
      <NPopconfirm
        v-if="showKick && banOperationOptions.length === 0"
        @positive-click="kick"
        :positive-text="$t('common.confirm')"
        :negative-text="$t('common.cancel')"
      >
        <template #trigger>
          <NButton
            size="small"
            ghost
            type="error"
            :disabled="disabledKick"
          >
            <template #icon>
              <icon-mdi-logout class="text-icon" />
            </template>
            {{ $t("common.kick") }}
          </NButton>
        </template>
        {{ $t("common.confirmKickMany") }}
      </NPopconfirm>

      <!-- 封禁导入按钮 (独立显示时) -->
      <NButton
        v-if="showImportBan && banOperationOptions.length === 0"
        size="small"
        ghost
        type="error"
        :disabled="disabledImportBan"
        @click="importBanData"
      >
        <template #icon>
          <icon-mdi-upload class="text-icon" />
        </template>
        封禁导入
      </NButton>

      <!-- 解封导入按钮 (独立显示时) -->
      <NButton
        v-if="showImportUnban && banOperationOptions.length === 0"
        size="small"
        ghost
        type="success"
        :disabled="disabledImportUnban"
        @click="importUnbanData"
      >
        <template #icon>
          <icon-mdi-upload class="text-icon" />
        </template>
        解封导入
      </NButton>

      <!-- 踢出导入按钮 (独立显示时) -->
      <NButton
        v-if="showImportKick && banOperationOptions.length === 0"
        size="small"
        ghost
        type="success"
        :disabled="disabledImportKick"
        @click="importKickData"
      >
        <template #icon>
          <icon-mdi-upload class="text-icon" />
        </template>
        踢出导入
      </NButton>

      <!-- 导入按钮 (独立显示时) -->
      <NButton
        v-if="showImport && banOperationOptions.length === 0"
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

      <!-- 玩家数据操作下拉菜单 -->
      <NDropdown
        v-if="playerDataOperationOptions.length > 0"
        trigger="click"
        :options="playerDataOperationOptions"
        @select="handlePlayerDataOperationSelect"
      >
        <NButton size="small" ghost type="warning">
          <template #icon>
            <icon-mdi-account-edit class="text-icon" />
          </template>
          {{ $t("common.playerDataOperations") }}
          <icon-mdi-chevron-down class="text-icon ml-1" />
        </NButton>
      </NDropdown>

      <!-- 强制改名按钮 (独立显示时) -->
      <NButton
        v-if="showForceRename && playerDataOperationOptions.length === 0"
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

      <!-- 修改坐标按钮 (独立显示时) -->
      <NButton
        v-if="showModifyCoords && playerDataOperationOptions.length === 0"
        size="small"
        ghost
        type="info"
        :disabled="disabledModifyCoords"
        @click="modifyCoords"
      >
        <template #icon>
          <icon-mdi-map-marker class="text-icon" />
        </template>
        {{ $t("common.modifyCoords") }}
      </NButton>

      <!-- 删除物品按钮 (独立显示时) -->
      <NButton
        v-if="showDelete && playerDataOperationOptions.length === 0"
        size="small"
        ghost
        type="error"
        :disabled="disabledDelete"
        @click="deleteItem"
      >
        <template #icon>
          <icon-mdi-delete class="text-icon" />
        </template>
        {{ $t("page.manage.gsRole.deleteItems") }}
      </NButton>

      <!-- 设置巅峰点数按钮 (独立显示时) -->
      <NButton
        v-if="showSetPeakPoints && playerDataOperationOptions.length === 0"
        size="small"
        ghost
        type="warning"
        :disabled="disabledSetPeakPoints"
        @click="setPeakPoints"
      >
        <template #icon>
          <icon-mdi-chart-line class="text-icon" />
        </template>
        设置巅峰点数
      </NButton>

      <!-- 强制完成任务按钮 (独立显示时) -->
      <NButton
        v-if="showForceCompleteTask && playerDataOperationOptions.length === 0"
        size="small"
        ghost
        type="warning"
        :disabled="disabledForceCompleteTask"
        @click="forceCompleteTask"
      >
        <template #icon>
          <icon-mdi-checkbox-marked-circle-outline class="text-icon" />
        </template>
        强制完成任务
      </NButton>

      <!-- 登录/权限操作下拉菜单 -->
      <NDropdown
        v-if="loginOperationOptions.length > 0"
        trigger="click"
        :options="loginOperationOptions"
        @select="handleLoginOperationSelect"
      >
        <NButton size="small" ghost type="primary">
          <template #icon>
            <icon-mdi-account-key class="text-icon" />
          </template>
          {{ $t("common.loginPrivilegeOperations") }}
          <icon-mdi-chevron-down class="text-icon ml-1" />
        </NButton>
      </NDropdown>

      <!-- 影子登录按钮 (独立显示时) -->
      <NButton
        v-if="showShadowLogin && loginOperationOptions.length === 0"
        size="small"
        ghost
        type="primary"
        :disabled="disabledShadowLogin"
        @click="shadowLogin"
      >
        <template #icon>
          <icon-mdi-account-arrow-right class="text-icon" />
        </template>
        {{ $t("common.shadowLogin") }}
      </NButton>

      <!-- 特权按钮 (独立显示时) -->
      <NButton
        v-if="showSkipQueue && loginOperationOptions.length === 0"
        size="small"
        ghost
        type="success"
        :disabled="disabledSkipQueue"
        @click="skipQueue"
      >
        <template #icon>
          <icon-mdi-account-check class="text-icon" />
        </template>
        {{ $t("common.skipQueue") }}
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
