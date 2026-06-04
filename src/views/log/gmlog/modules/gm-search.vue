<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { $t } from '@/locales';

defineOptions({
  name: 'GmSearch'
});

interface Emits {
  (e: 'reset'): void;
  (e: 'search'): void;
}

const emit = defineEmits<Emits>();

// 定义GM日志搜索参数接口
interface GmLogSearchParams {
  current?: number;
  size?: number;
  gmCode?: string;
  operate?: string;
  beginTime?: string;
  endTime?: string;
}

const model = defineModel<GmLogSearchParams>('model', { required: true });

// 是否允许触发搜索（避免初始化时误触发）
const shouldTriggerSearch = ref(false);

// 日期范围值
const dateRange = ref<[number, number] | null>(null);

// GM代码选项
const gmCodeOptions = [
  { label: $t('common.all'), value: '' },
  { label: 'REQ_SVR_INFO - 获取服务器状态', value: 'REQ_SVR_INFO' },
  { label: 'SEND_MAIL - 玩家邮件', value: 'SEND_MAIL' },
  { label: 'SEND_GUILD_MAIL - 工会邮件', value: 'SEND_GUILD_MAIL' },
  { label: 'CALL_SERVICE_LUA_FUNCTION - 活动', value: 'CALL_SERVICE_LUA_FUNCTION' },
  { label: 'APPEND_NEW_GLOBAL_MAIL - 区服邮件', value: 'APPEND_NEW_GLOBAL_MAIL' },
  { label: 'REQ_DB_INFO - 获取数据库信息', value: 'REQ_DB_INFO' },
  { label: 'URGENT_RECALL_GLOBAL_MAIL - 撤回邮件', value: 'URGENT_RECALL_GLOBAL_MAIL' },
  { label: 'SEND_TOAST - 跑马灯', value: 'SEND_TOAST' },
  { label: 'SET_QUEUE_PLAYER_COUNT - 排队', value: 'SET_QUEUE_PLAYER_COUNT' },
  { label: 'SERVER_OPEN_UPDATE - 更新开服时间', value: 'SERVER_OPEN_UPDATE' },
  { label: 'RESET_CROSS_SERVER - 跨服同步', value: 'RESET_CROSS_SERVER' },
  { label: 'KICK_USER - 踢下线', value: 'KICK_USER' },
  { label: 'BAN_CHATTING - 禁言', value: 'BAN_CHATTING' },
  { label: 'ADD_BLACKLIST_CHARACTER - 添加角色黑名单', value: 'ADD_BLACKLIST_CHARACTER' },
  { label: 'DEL_BLACKLIST_CHARACTER - 解除角色黑名单', value: 'DEL_BLACKLIST_CHARACTER' },
  { label: 'GET_USER_STATUS - 查询玩家状态', value: 'GET_USER_STATUS' },
  { label: 'COMMAND_PLAYER - 玩家指令', value: 'COMMAND_PLAYER' },
  { label: 'COMMAND_SERVER - 区服指令', value: 'COMMAND_SERVER' },
  { label: 'FORBIDDEN_WORDS - 禁言', value: 'FORBIDDEN_WORDS' },
  { label: 'BAN - 封禁', value: 'BAN' },
  { label: 'PREVENTION_ADDICTION - 防沉迷', value: 'PREVENTION_ADDICTION' },
  { label: 'RELOAD_CASH_SHOP_JSON - 重载元宝商店', value: 'RELOAD_CASH_SHOP_JSON' },
  { label: 'OACTIVITY_REQUEST - 活动请求', value: 'OACTIVITY_REQUEST' },
  { label: 'HOTFIX_DATA - 热更', value: 'HOTFIX_DATA' },
  { label: 'OPEN_LINE - 开启地图', value: 'OPEN_LINE' },
  { label: 'CLOSE_LINE - 关闭地图', value: 'CLOSE_LINE' },
  { label: 'KICK_MAP_PLAYER - 踢地图的人到主城', value: 'KICK_MAP_PLAYER' },
  { label: 'SET_LINE_MAX_PLAYER_COUNT - 设置地图最大人数', value: 'SET_LINE_MAX_PLAYER_COUNT' }
];

// 格式化日期为后端期望的格式
function formatDateForBackend(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toISOString().slice(0, 19); // 格式: YYYY-MM-DDTHH:mm:ss
}

// 监听日期范围变化，更新模型
watch(dateRange, (newRange) => {
  if (newRange && newRange.length === 2) {
    // 开始时间设置为当天的 00:00:00
    const beginDate = new Date(newRange[0]);
    beginDate.setHours(0, 0, 0, 0);
    model.value.beginTime = formatDateForBackend(beginDate.getTime());

    // 结束时间设置为当天的 23:59:59
    const endDate = new Date(newRange[1]);
    endDate.setHours(23, 59, 59, 999);
    model.value.endTime = formatDateForBackend(endDate.getTime());
  } else {
    model.value.beginTime = '';
    model.value.endTime = '';
  }
}, { deep: true });

// 初始化日期范围（如果模型中已有值）
function initDateRange() {
  if (model.value.beginTime && model.value.endTime) {
    // 解析后端的日期格式
    const beginTime = new Date(model.value.beginTime).getTime();
    const endTime = new Date(model.value.endTime).getTime();
    dateRange.value = [beginTime, endTime];
  }
}

// 重置
function reset() {
  // 清空所有搜索字段，保留分页参数
  model.value.gmCode = '';
  model.value.operate = '';
  model.value.beginTime = '';
  model.value.endTime = '';
  dateRange.value = null;
  search(); // 重置后立即搜索
  emit('reset');
}

// 搜索
function search() {
  if (!shouldTriggerSearch.value) return;
  emit('search');
}

// 防抖搜索函数（500ms）
const debouncedSearch = useDebounceFn(search, 500);

// 监听表单字段变化，自动触发搜索
watch(
  () => [
    model.value.gmCode,
    model.value.operate,
    model.value.beginTime,
    model.value.endTime
  ],
  () => {
    if (shouldTriggerSearch.value) {
      debouncedSearch();
    }
  },
  { deep: true }
);

// 初始化
function initializeSearch() {
  initDateRange();
  shouldTriggerSearch.value = true;
  search();
}

// 组件挂载后初始化
initializeSearch();
</script>

<template>
  <NCard :bordered="false" size="small" class="card-wrapper" :title="$t('common.search')">
    <NForm :model="model" label-placement="left" :label-width="80" @keyup.enter="search">
      <NGrid responsive="screen" item-responsive>
        <NFormItemGi span="24 s:12 m:6" :label="$t('page.manage.gmlog.gmCode')" path="gmCode" class="pr-24px">
          <NSelect
            v-model:value="model.gmCode"
            :options="gmCodeOptions"
            :placeholder="$t('page.manage.gmlog.form.gmCode')"
            clearable
            filterable
          />
        </NFormItemGi>

        <NFormItemGi span="24 s:12 m:6" :label="$t('page.manage.gmlog.operate')" path="operate" class="pr-24px">
          <NInput
            v-model:value="model.operate"
        :placeholder="$t('page.manage.gmlog.form.operate')"
            @keyup.enter="search"
            clearable
          />
        </NFormItemGi>

        <NFormItemGi span="24 s:12 m:6"  :label="$t('page.manage.operateserver.timeRange')"  path="dateRange" class="pr-24px">
          <NDatePicker
            v-model:value="dateRange"
            type="daterange"
            clearable
            :start-placeholder="$t('page.manage.operateserver.form.startTime')"
            :end-placeholder="$t('page.manage.operateserver.form.endTime')"
            format="yyyy-MM-dd"
            :separator="$t('page.manage.operateserver.form.separator')"
            style="width: 100%;"
          />
        </NFormItemGi>

        <NFormItemGi span="24 s:6 m:3">
          <NSpace class="w-full" justify="end">
            <NButton @click="reset">
              <template #icon>
                <icon-ic-round-refresh class="text-icon" />
              </template>
              {{ $t("common.reset") }}
            </NButton>
            <NButton type="primary" ghost @click="search">
              <template #icon>
                <icon-ic-round-search class="text-icon" />
              </template>
              {{ $t("common.search") }}
            </NButton>
          </NSpace>
        </NFormItemGi>

      </NGrid>
    </NForm>
  </NCard>
</template>

<style scoped>

</style>
