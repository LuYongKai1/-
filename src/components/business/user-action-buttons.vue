<script setup lang="ts">
import { computed } from "vue";
import { NButton, NPopconfirm } from "naive-ui";
import { $t } from "@/locales";
import { useAuth } from "@/hooks/business/auth";
import { useUserActions } from "@/hooks/business/use-user-actions";
// @ts-ignore
import UserOperateDrawer from "@/views/user/users/modules/user-operate-drawer.vue";

const { hasAuth } = useAuth();

interface Props {
  /** 用户数据 */
  userData: any;
  /** 是否显示封禁按钮 */
  showBan?: boolean;
  /** 是否显示禁言按钮 */
  showMute?: boolean;
  /** 按钮尺寸 */
  size?: "tiny" | "small" | "medium" | "large";
  /** 是否使用角色ID（用于聊天监控场景） */
  useRoleId?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showBan: true,
  showMute: true,
  size: "small",
  useRoleId: false,
});

interface Emits {
  /** 操作成功后的回调 */
  (e: "success"): void;
}

const emit = defineEmits<Emits>();

const {
  drawerVisible,
  editingData,
  handleBan,
  handleUnban,
  handleMute,
  handleUnmute,
} = useUserActions();

// 计算属性：将 editingData 转换为兼容类型
const editingDataForDrawer = computed(() => editingData.value as any);

// 根据场景决定权限后缀：账号管理不加ss，聊天监控加ss
const banPermission = computed(() =>
  props.useRoleId ? 'user:record:ban:ss' : 'user:record:ban'
);
const chatPermission = computed(() =>
  props.useRoleId ? 'user:record:chat:ss' : 'user:record:chat'
);

function onBan() {
  handleBan(props.userData.userId || props.userData.roleId, props.userData, props.useRoleId);
}

function onUnban() {
  handleUnban(props.userData.userId || props.userData.roleId, () => {
    emit("success");
  }, props.useRoleId);
}

function onMute() {
  handleMute(props.userData.userId || props.userData.roleId, props.userData, props.useRoleId);
}

function onUnmute() {
  // 传递禁言备注（chatReason）
  const chatReason = props.userData.chatReason || 'unchat';
  handleUnmute(props.userData.userId || props.userData.roleId, chatReason, () => {
    emit("success");
  }, props.useRoleId);
}

function onDrawerSubmitted() {
  emit("success");
}
</script>

<template>
  <div class="flex-center gap-8px">
    <!-- 封禁/解禁 -->
    <template v-if="showBan && hasAuth(banPermission)">
      <NPopconfirm
        v-if="userData.banDate"
        @positive-click="onUnban"
        :positive-text="$t('common.confirm')"
        :negative-text="$t('common.cancel')"
      >
        <template #trigger>
          <NButton type="success" ghost :size="size">
            {{ $t("common.unban") }}
          </NButton>
        </template>
        {{ $t("common.confirmUnban") }}
      </NPopconfirm>
      <NButton
        v-else
        type="error"
        ghost
        :size="size"
        @click="onBan"
      >
        {{ $t("common.ban") }}
      </NButton>
    </template>

    <!-- 禁言/解除禁言 -->
    <template v-if="showMute && hasAuth(chatPermission)">
      <NPopconfirm
        v-if="userData.chatDate"
        @positive-click="onUnmute"
        :positive-text="$t('common.confirm')"
        :negative-text="$t('common.cancel')"
      >
        <template #trigger>
          <NButton type="success" ghost :size="size">
            {{ $t("common.unchat") }}
          </NButton>
        </template>
        {{ $t("common.confirmUnban") }}
      </NPopconfirm>
      <NButton
        v-else
        type="error"
        ghost
        :size="size"
        @click="onMute"
      >
        {{ $t("common.chat") }}
      </NButton>
    </template>

    <!-- 操作对话框 -->
    <UserOperateDrawer
      v-model:visible="drawerVisible"
      operate-type="edit"
      :row-data="editingDataForDrawer"
      @submitted="onDrawerSubmitted"
    />
  </div>
</template>

<style scoped></style>
