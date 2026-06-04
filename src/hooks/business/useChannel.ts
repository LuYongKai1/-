import { ref } from 'vue';
import { $t } from '@/locales';
import { fetchGetChannelList } from '@/service/api';

/**
 * 渠道管理 Hook
 *
 * 功能：
 * - 获取渠道列表
 * - 包含加载状态管理
 * - 自动添加"全部"选项
 * - 错误处理
 */
export function useChannel() {
  const channelOptions = ref<CommonType.Option<string>[]>([]);
  const channelLoading = ref(false);

  /**
   * 获取渠道选项列表
   */
  async function getChannelOptions() {
    channelLoading.value = true;
    try {
      const response = await fetchGetChannelList();

      // 处理不同的响应格式
      let channelList: any[] = [];

      if (response?.response?.data?.data && Array.isArray(response.response.data.data)) {
        channelList = response.response.data.data;
      } else if (response?.data?.data && Array.isArray(response.data.data)) {
        channelList = response.data.data;
      } else if (response?.data && Array.isArray(response.data)) {
        channelList = response.data;
      } else if (Array.isArray(response)) {
        channelList = response;
      }

      const allOption: CommonType.Option<string> = {
        label: $t('common.all' as any),
        value: ''
      };

      // const options = channelList.map((item: any) => ({
      //   label: item.channelName || item.name || '',
      //   value: String(item.channelId || item.id || ''),
      // }));

      const options = channelList.map((item: any) => {
        // 获取基础名称
        const baseName = item.channelName || item.name || '';
        // 获取简称
        const briefName = item.channelBriefName || '';
        // 组合显示：有简称则显示 "名称(简称)"，无简称则只显示名称
        const label = briefName ? `${baseName}(${briefName})` : baseName;

        return {
          label,
          value: String(item.channelId || item.id || ''),
          // 可选：保留简称字段，方便后续使用
          briefName: briefName
        };
      });

      channelOptions.value = [allOption, ...options];
    } catch (error) {
      console.error('Error fetching channel options:', error);
      channelOptions.value = [{ label: $t('common.all' as any), value: '' }];
    } finally {
      channelLoading.value = false;
    }
  }

  /**
   * 重置渠道选项
   */
  function resetChannelOptions() {
    channelOptions.value = [];
  }

  return {
    channelOptions,
    channelLoading,
    getChannelOptions,
    resetChannelOptions
  };
}
