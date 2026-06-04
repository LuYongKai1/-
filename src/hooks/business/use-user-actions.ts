import { ref } from 'vue';
import { useMessage } from 'naive-ui';
import { fetchBanUser, fetchchatuser, quicklyBanOrUnban, quicklyChatOrUnchat } from '@/service/api/gm';
import { $t } from '@/locales';

interface UserActionData {
  userId: string | number;
  operationType?: 'mute' | 'unmute' | 'ban';
  [key: string]: any;
}

export function useUserActions() {
  const message = useMessage();
  const drawerVisible = ref(false);
  const editingData = ref<UserActionData | null>(null);

  /**
   * 打开封禁对话框
   */
  function handleBan(userId: string | number, rowData: any, useRoleId: boolean = false) {
    editingData.value = {
      ...rowData,
      userId,
      roleId: useRoleId ? String(userId) : undefined,
      useRoleId, // 标记是否使用角色ID
      operationType: 'ban',
    };
    drawerVisible.value = true;
  }

  /**
   * 解除封禁
   */
  async function handleUnban(userId: string | number, onSuccess?: () => void, useRoleId: boolean = false) {
    try {
      if (useRoleId) {
        // 使用角色ID接口（聊天监控场景）
        await quicklyBanOrUnban({
          roleId: String(userId),
          action: 'unban',
          keepTime: 1,
          banReason: 'unban',
        });
      } else {
        // 使用用户ID接口（原有逻辑）
      await fetchBanUser({
        userId: String(userId),
        action: 'unban',
        keepTime: 1,
        banReason: 'unban',
      } as any);
      }
      message.success($t('common.unbanSuccess'));
      onSuccess?.();
    } catch (error: any) {
      // 显示后端返回的具体错误消息
      const errorMsg = error?.response?.data?.msg || error?.message || $t('common.unbanFailed');
      message.error(errorMsg);
      console.error('解封用户失败:', error);
    }
  }

  /**
   * 打开禁言对话框
   */
  function handleMute(userId: string | number, rowData: any, useRoleId: boolean = false) {
    editingData.value = {
      ...rowData,
      userId,
      roleId: useRoleId ? String(userId) : undefined,
      useRoleId, // 标记是否使用角色ID
      operationType: 'mute',
    };
    drawerVisible.value = true;
  }

  /**
   * 解除禁言
   */
  async function handleUnmute(userId: string | number, chatReason: string, onSuccess?: () => void, useRoleId: boolean = false) {
    try {
      if (useRoleId) {
        // 使用角色ID接口（聊天监控场景）
        await quicklyChatOrUnchat({
          roleId: String(userId),
          action: 'unchat',
          banChatting: '0,1,2,3,4,7',
          keepTime: 1,
          banReason: chatReason || 'unchat',
        });
      } else {
        // 使用用户ID接口（原有逻辑）
      await fetchchatuser({
        userId: String(userId),
        action: 'unchat',
        banChatting: '0,1,2,3,4',
        keepTime: 1,
        banReason: chatReason || '11',
      } as any);
      }
      message.success($t('common.unmuteSuccess'));
      onSuccess?.();
    } catch (error: any) {
      // 显示后端返回的具体错误消息
      const errorMsg = error?.response?.data?.msg || error?.message || $t('common.unmuteFailed');
      message.error(errorMsg);
      console.error('解除禁言失败:', error);
    }
  }

  /**
   * 关闭对话框
   */
  function closeDrawer() {
    drawerVisible.value = false;
    editingData.value = null;
  }

  return {
    drawerVisible,
    editingData,
    handleBan,
    handleUnban,
    handleMute,
    handleUnmute,
    closeDrawer,
  };
}

