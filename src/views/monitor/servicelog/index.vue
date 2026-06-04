<script setup lang="tsx">
  import { NButton, NPopover, NSpace } from "naive-ui";
  import { fetchGetShuShuAip } from "@/service/api";
  import { useAppStore } from "@/store/modules/app";
  import { useTable, useTableOperate } from "@/hooks/common/table";
  // @ts-ignore
import TemplateSearch from "./modules/template-search.vue";
  import type { TemplateConfig } from "./config/template-config";
  import { Icon } from "@iconify/vue";
  import { ref, onMounted, computed, watch } from "vue";

  const appStore = useAppStore();

  // 当前选中的模板配置
  const currentTemplate = ref<TemplateConfig | null>(null);

  // 模板搜索参数
  const templateSearchParams = ref({
    template: undefined as string | undefined,
    startTime: '',
    endTime: '',
    serverId: [] as string[],
    channel: [] as string[],
    accountId: '',
    petId: ''
  });

  // 构建时间范围（默认今天）
  function getTimeRange() {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(today);
    endDate.setHours(23, 59, 59, 999);

    const formatDateTime = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };

    return {
      startTime: formatDateTime(startDate),
      endTime: formatDateTime(endDate),
    };
  }

  // 构建过去7天的时间范围
  function getPast7DaysRange() {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() - 1); // 昨天
    endDate.setHours(23, 59, 59, 999);

    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 6); // 7天前
    startDate.setHours(0, 0, 0, 0);

    const formatDateTime = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };

    return {
      startTime: formatDateTime(startDate),
      endTime: formatDateTime(endDate),
    };
  }

  // 根据模板动态构建 groupBy 数组
  function buildGroupBy() {
    // 如果有选中的模板，使用模板的 groupBy
    if (currentTemplate.value && currentTemplate.value.groupBy) {
      return currentTemplate.value.groupBy;
    }

    // 否则使用默认的 groupBy（聊天监控的字段）
    return [
      {
        columnDesc: "区服ID",
        columnName: "server_id",
        propertyRange: "",
        subTableType: "",
        tableType: "event"
      },
      {
        columnDesc: "账户ID",
        columnName: "#account_id",
        propertyRange: "",
        subTableType: "",
        tableType: "event"
      },
      {
        columnDesc: "账号本身的id",
        columnName: "account_id",
        propertyRange: "",
        subTableType: "",
        tableType: "event"
      },
      {
        columnDesc: "角色名称",
        columnName: "role_name",
        propertyRange: "",
        subTableType: "",
        tableType: "event"
      },
      {
        columnDesc: "渠道",
        columnName: "channel",
        propertyRange: "",
        subTableType: "",
        tableType: "event"
      },
      {
        clusterDatePolicy: "LATEST",
        columnDesc: "chat_channel",
        columnName: "chat_channel",
        propertyRange: "",
        propertyRangeType: "discrete",
        subTableType: "",
        tableType: "event"
      },
      {
        columnDesc: "chat_msg",
        columnName: "chat_msg",
        propertyRange: "",
        subTableType: "",
        tableType: "event"
      },
      {
        columnDesc: "chat_target",
        columnName: "chat_target",
        propertyRange: "",
        propertyRangeType: "def",
        subTableType: "",
        tableType: "event"
      },
      {
        columnDesc: "chat_target_param",
        columnName: "chat_target_param",
        propertyRange: "",
        subTableType: "",
        tableType: "event"
      },
      {
        columnDesc: "事件时间",
        columnName: "#event_time",
        propertyRange: "",
        subTableType: "",
        tableType: "event",
        timeTypeColumnFormart: "day"
      }
    ];
  }

  // 将 union_groups 二维数组转换为表格数据格式（支持动态字段映射）
  function transformUnionGroupsToTableData(unionGroups: any[][]) {
    if (!Array.isArray(unionGroups)) {
      return [];
    }

    const groupByFields = buildGroupBy();

    return unionGroups.map((group: any[]) => {
      const rowData: any = {};

      // 根据 groupBy 的顺序动态映射数据
      groupByFields.forEach((field: any, index: number) => {
        const columnName = field.columnName;
        const value = group[index];

        // 直接使用 columnName 作为键
        rowData[columnName] = value || '';

        // 为了兼容现有逻辑，保留一些特殊映射
        if (columnName === 'server_id') {
          rowData.serverId = value || '';
        } else if (columnName === '#account_id') {
          rowData.userId = value || '';
          rowData.accountId = value || '';
        } else if (columnName === 'account_id') {
          rowData.uid = value || '';
        } else if (columnName === 'role_name') {
          rowData.roleName = value || '';
        } else if (columnName === 'channel') {
          rowData.channelId = value || '';
        } else if (columnName === '#event_time') {
          rowData.eventTime = value || '';
        }
      });

      return rowData;
    });
  }

  // 包装函数：将 CommonSearchParams 转换为新 API 格式
  const wrappedFetchChatMonitor = async (params?: { current?: number; size?: number; [key: string]: any }) => {
    // 从 searchParams 中获取实际的请求参数（新格式）
    const actualParams = params as any;

    let requestParams: any;

    // 如果参数已经是新格式，直接使用
    if (actualParams?.eventView) {
      // 验证并修正时间范围
      const eventView = actualParams.eventView;

      const fixedTimeRange = validateAndFixTimeRange(eventView.startTime, eventView.endTime);

      // 移除 current 和 size，只保留 eventView, events, projectId
      requestParams = {
        eventView: {
          ...eventView,
          startTime: fixedTimeRange.startTime,
          endTime: fixedTimeRange.endTime
        },
        events: actualParams.events || [],
        projectId: actualParams.projectId || 3
      };

      // 最终验证：确保请求参数中的时间正确
      const finalStart = new Date(requestParams.eventView.startTime);
      const finalEnd = new Date(requestParams.eventView.endTime);
      if (finalEnd.getTime() < finalStart.getTime()) {
        // 强制交换
        const temp = requestParams.eventView.startTime;
        requestParams.eventView.startTime = requestParams.eventView.endTime;
        requestParams.eventView.endTime = temp;
      }
    } else {
    // 否则使用默认格式
      let timeRange = getTimeRange();
      // 验证并修正时间范围
      timeRange = validateAndFixTimeRange(timeRange.startTime, timeRange.endTime);
      // 计算 recentDay
      const recentDay = calculateRecentDay(timeRange.startTime, timeRange.endTime);

      requestParams = {
      eventView: {
        comparedByTime: false,
        comparedTimeList: [],
        endTime: timeRange.endTime,
        filts: [],
        groupBy: buildGroupBy(),
          recentDay: recentDay,
        relation: "and",
        startTime: timeRange.startTime,
        timeParticleSize: "day"
      },
      events: [
        {
          analysis: "TOTAL_TIMES",
          analysisParams: "",
          eventName: "chat",
          eventNameDisplay: "chat.总次数",
            eventUuid: "XPHYEea7",
          filts: [],
          quota: "",
          relation: "and",
          type: "normal"
        }
      ],
      projectId: 3
      };
    }

    // 调用接口
    const response = await fetchGetShuShuAip(requestParams);

    // createFlatRequest 返回格式: { data, error, response }
    // transformBackendResponse 返回的是 response.data.data
    // 所以实际数据在 response.data 中
    const responseData = (response as any)?.data || {};

    // 获取 union_groups 数据
    const unionGroups = responseData.union_groups || [];
    const unionGroupNum = responseData.union_group_num || 0;

    // 转换数据格式（直接通过下标映射）
    const transformedData = transformUnionGroupsToTableData(unionGroups);

    // 处理分页
    const current = requestParams.current || params?.current || 1;
    const size = requestParams.size || params?.size || 20;
    const startIndex = (current - 1) * size;
    const endIndex = startIndex + size;
    const paginatedData = transformedData.slice(startIndex, endIndex);

    // 返回符合表格期望的格式
    // useTable 的 transformer 期望: res.response.data.rows 或 res.response.data.data
    return {
      response: {
        data: {
          rows: paginatedData,
          data: paginatedData,
          current: current,
          size: size,
          total: unionGroupNum
        }
      }
    };
  };

  // 格式化复杂数据为可读字符串
  function formatComplexValue(value: any, columnName: string): string {
    if (value === null || value === undefined) return '-';

    // 处理数组类型
    if (Array.isArray(value)) {
      if (value.length === 0) return '-';

      // 如果是对象数组，显示格式化的信息
      if (typeof value[0] === 'object') {
        const items = value.map(item => {
          if (item.id !== undefined) {
            const parts = [`ID:${item.id}`];
            if (item.count !== undefined) parts.push(`数量:${item.count}`);
            if (item.total !== undefined) parts.push(`总量:${item.total}`);
            return parts.join(' ');
          }
          return JSON.stringify(item);
        });
        return items.join(' | ');
      }

      return value.join(', ');
    }

    // 处理对象类型
    if (typeof value === 'object') {
      const parts: string[] = [];
      if (value.id !== undefined) parts.push(`ID:${value.id}`);
      if (value.count !== undefined) parts.push(`数量:${value.count}`);
      if (value.total !== undefined) parts.push(`总量:${value.total}`);

      if (parts.length > 0) {
        return parts.join(' ');
      }

      return JSON.stringify(value);
    }

    return String(value);
  }

  // 动态生成表格列
  function generateDynamicColumns() {
    // 如果有选中的模板，根据模板生成列
    if (currentTemplate.value && currentTemplate.value.groupBy) {
      return currentTemplate.value.groupBy.map((field: any) => {
        const columnName = field.columnName;
        const columnDesc = field.columnDesc;

        return {
          key: columnName,
          title: columnDesc,
          align: "center" as const,
          minWidth: getColumnWidth(columnName),
          ellipsis: { tooltip: true },
          render: (row: any) => {
            const value = row[columnName];

            // 时间格式化
            if (columnName.includes('time')) {
              return formatTimeValue(value);
            }

            // 数字类型直接显示
            if (typeof value === 'number') {
              return String(value);
            }

            // 字符串类型直接显示
            if (typeof value === 'string') {
              return value || '-';
            }

            // 复杂类型（数组、对象）格式化
            return formatComplexValue(value, columnName);
          }
        };
      });
    }

    // 否则返回默认列（聊天监控的列）
    return getDefaultChatColumns();
  }

  // 获取列宽度
  function getColumnWidth(columnName: string): number {
    const widthMap: Record<string, number> = {
      'channel': 100,
      'server_id': 100,
      '#event_time': 180,
      'role_name': 150,
      '#account_id': 200,
      'account_id': 150,
      'cash_id': 120,
      'item_list': 150,
      'item_list.id': 120,
      'item_list.iuid': 150,
      'item_list.count': 120,
      'is_guaranteed_reward': 140,
      'is_yuanbao_gacha': 140,
      'old_small_guaranteed_count': 180,
      'old_big_guaranteed_count': 180,
      'new_small_guaranteed_count': 180,
      'new_big_guaranteed_count': 180,
      'chat_channel': 130,
      'chat_msg': 200,
      'chat_target': 130,
      'chat_target_param': 150,
      'pets_used_list': 180,
      'pet_product_id': 150,
      'pet_id': 120,
      'pet_id@resource': 150,
      'pet_id@quality': 130,
      'resource_info': 150,
      'resource_info.id': 130,
      'resource_info.count': 120,
      'resource_info.total': 130,
      'change_reason': 150,
      'killer_id': 120,
      'killer_name': 150,
      'killer_level': 100,
      'killer_power': 130,
      'killer_gender': 100,
      'killer_type': 120,
      'killer_guild_name': 150,
      'killer_yuanbao': 130,
      'skill_id': 100,
      'map_id': 100,
      'is_cross_server': 120,
      'ability_property.accuracy': 120,
      'ability_property.cri_rate': 120,
      'ability_property.cri_resist': 130,
      'ability_property.damage_increase_cri_value': 150,
      'ability_property.damage_reduction_cri_value': 160,
      'ability_property.def_penetrate_value': 150,
      'ability_property.evade': 120,
      'ability_property.give_all_damage_increase': 160,
      'ability_property.hp_max': 130,
      'ability_property.luck': 100,
      'ability_property.matk_max': 130,
      'ability_property.matk_min': 130,
      'ability_property.mdef_max': 150,
      'ability_property.mdef_min': 150,
      'ability_property.mp_max': 130,
      'ability_property.patk_max': 130,
      'ability_property.patk_min': 130,
      'ability_property.pdef_max': 130,
      'ability_property.pdef_min': 130,
      'ability_property.resist_penetrate_value': 160,
      'ability_property.saint_villain': 130,
      'death_drop_list': 150,
      'death_drop_list.count': 120,
      'death_drop_list.item_id': 130,
      'death_drop_list.iuid': 150,
      'buff_id': 120,
      'buff_time': 120,
      'keepup_type': 130
    };
    return widthMap[columnName] || 150;
  }

  // 格式化时间值
  function formatTimeValue(value: any): string {
    if (!value) return '-';
    try {
      if (typeof value === 'number') {
        return new Date(value * 1000).toLocaleString('zh-CN');
      }
      if (typeof value === 'string') {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toLocaleString('zh-CN');
        }
        return value;
      }
      return '-';
    } catch {
      return String(value);
    }
  }

  // 获取默认聊天监控列
  function getDefaultChatColumns() {
    return [
      {
        key: "serverId",
        title: "区服ID",
        align: "center",
        width: 120,
        render: (row: any) => {
          return row.serverId || "-";
        }
      },
      {
        key: "userId",
        title: "账户ID",
        align: "center",
        minWidth: 120,
        render: (row: any) => {
          return row.userId || row.accountId || "-";
        }
      },
      {
        key: "uid",
        title: "账号本身的id",
        align: "center",
        minWidth: 150,
        render: (row: any) => {
          return row.uid || row.accountId || "-";
        }
      },
      {
        key: "roleName",
        title: "角色名称",
        align: "center",
        minWidth: 120,
        ellipsis: { tooltip: true },
        render: (row: any) => {
          return row.roleName || "-";
        }
      },
      {
        key: "channelId",
        title: "渠道",
        align: "center",
        minWidth: 100,
        render: (row: any) => {
          return row.channelId || "-";
        }
      },
      {
        key: "chat_channel",
        title: "chat_channel",
        align: "center",
        minWidth: 130,
        ellipsis: { tooltip: true },
        render: (row: any) => {
          return row.chat_channel || "-";
        }
      },
      {
        key: "chat_msg",
        title: "chat_msg",
        align: "center",
        minWidth: 200,
        ellipsis: { tooltip: true },
        render: (row: any) => {
          return row.chat_msg || "-";
        }
      },
      {
        key: "chat_target",
        title: "chat_target",
        align: "center",
        minWidth: 130,
        ellipsis: { tooltip: true },
        render: (row: any) => {
          return row.chat_target || "-";
        }
      },
      {
        key: "chat_target_param",
        title: "chat_target_param",
        align: "center",
        minWidth: 150,
        ellipsis: { tooltip: true },
        render: (row: any) => {
          return row.chat_target_param || "-";
        }
      },
      {
        key: "eventTime",
        title: "事件时间",
        align: "center",
        minWidth: 180,
        render: (row: any) => {
          if (!row.eventTime && !row.createTime) return "-";
          const timestamp = row.eventTime || row.createTime;
          if (typeof timestamp === 'number') {
            return new Date(timestamp * 1000).toLocaleString('zh-CN');
          }
          if (typeof timestamp === 'string') {
            return timestamp;
          }
          return "-";
        }
      },
    ];
  }

  // 创建一个 ref 来存储动态生成的列，初始为空
  const tableColumns = ref<any[]>([]);

  const {
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
    apiFn: wrappedFetchChatMonitor as any,
    showTotal: true,
    immediate: false, // 不自动加载
    apiParams: {
      current: 1,
      size: 20,
    },
    columns: () => tableColumns.value.length > 0 ? tableColumns.value as any : [] as any,
    defaultHiddenKeys: [],
  });

  // 暴露 columns 供外部使用（兼容性）
  const columns = tableColumns;

  // 动态计算 scrollX（根据列数和列宽）
  const scrollX = computed(() => {
    if (tableColumns.value.length === 0) return undefined;

    // 计算所有列的总宽度
    const totalWidth = tableColumns.value.reduce((sum, col) => {
      return sum + (col.minWidth || 150);
    }, 0);

    // 如果总宽度超过1400px，则启用横向滚动
    return totalWidth > 1400 ? totalWidth : undefined;
  });

  const {
    checkedRowKeys
  } = useTableOperate(data as any, getData);

  // 日期范围（默认过去7天）
  const defaultTimeRange = getPast7DaysRange();
  const dateRangeStartTime = ref<string | null>(defaultTimeRange.startTime);
  const dateRangeEndTime = ref<string | null>(defaultTimeRange.endTime);

  // 日期范围选择器弹窗显示状态
  const dateRangePickerVisible = ref(false);

  // 当前选中的预设范围（默认过去7天）
  const activePresetRange = ref<string | null>('past7days');

  // 监听弹窗打开，同步预设范围
  watch(dateRangePickerVisible, (isVisible: boolean) => {
    if (isVisible && dateRangeStartTime.value && dateRangeEndTime.value) {
      // 弹窗打开时，根据当前日期范围识别预设范围
      // 但如果已经有预设范围且匹配，就不重新识别
      const detectedPreset = detectPresetRange(dateRangeStartTime.value, dateRangeEndTime.value);
      if (detectedPreset) {
        // 只有当检测到的预设范围与当前不同时，才更新
        // 这样可以避免覆盖用户刚刚点击的预设按钮
        if (activePresetRange.value !== detectedPreset) {
          activePresetRange.value = detectedPreset;
        }
      }
    }
  });

  // 预设范围名称映射
  const presetRangeNames: Record<string, string> = {
    'yesterday': '昨日',
    'today': '今日',
    'lastWeek': '上周',
    'thisWeek': '本周',
    'lastMonth': '上月',
    'thisMonth': '本月',
    'past7days': '过去7天',
    'last7days': '最近7天',
    'past30days': '过去30天',
    'last30days': '最近30天'
  };

  // 计算显示的日期范围文本
  const displayedDateRange = computed(() => {
    if (!dateRangeStartTime.value || !dateRangeEndTime.value) {
      return '最近4天';
    }

    const startDate = new Date(dateRangeStartTime.value);
    const endDate = new Date(dateRangeEndTime.value);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // 计算距离今天的天数
    const startDaysAgo = Math.floor((todayOnly.getTime() - startDateOnly.getTime()) / (24 * 60 * 60 * 1000));
    const endDaysAgo = Math.floor((todayOnly.getTime() - endDateOnly.getTime()) / (24 * 60 * 60 * 1000));

    // 格式化日期
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}/${month}/${day}`;
    };

    const startFormatted = formatDate(startDate);
    const endFormatted = formatDate(endDate);

    // 如果有预设范围选中，显示预设范围名称 + 日期
    if (activePresetRange.value && presetRangeNames[activePresetRange.value]) {
      // 如果开始和结束日期相同，只显示一个日期
      if (startFormatted === endFormatted) {
        return `${presetRangeNames[activePresetRange.value]} ${startFormatted})`;
      }
      return `${presetRangeNames[activePresetRange.value]} ${startFormatted} ~ ${endFormatted})`;
    }

    // 构建显示文本
    let startDisplay = startFormatted;
    let endDisplay = endFormatted;

    // 如果是动态时间模式，显示"X天前"格式
    if (startDaysAgo >= 0 && startDaysAgo <= 365) {
      if (startDaysAgo === 0) {
        startDisplay = '今日';
      } else {
        startDisplay = `${startDaysAgo}天前`;
      }
    }

    if (endDaysAgo >= 0 && endDaysAgo <= 365) {
      if (endDaysAgo === 0) {
        endDisplay = '今日';
      } else {
        endDisplay = `${endDaysAgo}天前`;
      }
    } else {
      // 静态时间模式，检查是否是今天
      const isToday = endDateOnly.getTime() === todayOnly.getTime();
      endDisplay = isToday ? '今日' : endFormatted;
    }

    // 如果开始和结束显示相同且日期相同，显示格式：12天前 2025/12/18)
    if (startDisplay === endDisplay && startFormatted === endFormatted) {
      return `${startDisplay} ${startFormatted})`;
    }

    // 如果开始和结束显示相同但日期不同，显示完整范围
    if (startDisplay === endDisplay) {
      return `${startDisplay} ${startFormatted} ~ ${endFormatted})`;
    }

    // 开始和结束不同，显示完整格式
    return `${startDisplay} → ${endDisplay} (${startFormatted} ~ ${endFormatted})`;
  });

  // 根据日期范围计算 recentDay 值
  // 示例：
  // 昨日：startTime="2025-12-28 00:00:00", endTime="2025-12-28 23:59:59" => recentDay="1-1"
  // 今日：startTime="2025-12-29 00:00:00", endTime="2025-12-29 23:59:59" => recentDay="0-1"
  // 上周：startTime="2025-12-22 00:00:00", endTime="2025-12-28 23:59:59" => recentDay="W1"
  function calculateRecentDay(startTime: string, endTime: string): string {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 解析日期，只取日期部分（忽略时间）
    const startDate = new Date(startTime);
    const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

    const endDate = new Date(endTime);
    const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

    // 确保结束时间不早于开始时间
    if (endDateOnly.getTime() < startDateOnly.getTime()) {
      return "0-1"; // 返回默认值
    }

    // 计算距离今天的天数（只比较日期部分）
    // 今天之前的天数为正数
    const endDaysAgo = Math.floor((today.getTime() - endDateOnly.getTime()) / (24 * 60 * 60 * 1000));
    const startDaysAgo = Math.floor((today.getTime() - startDateOnly.getTime()) / (24 * 60 * 60 * 1000));

    // 判断是否是昨日（1天前到1天前）
    // 昨日：startTime="2025-12-28 00:00:00", endTime="2025-12-28 23:59:59"
    if (startDaysAgo === 1 && endDaysAgo === 1) {
      return "1-1";
    }

    // 判断是否是今日（0天前到0天前，但格式是 "0-1"）
    // 今日：startTime="2025-12-29 00:00:00", endTime="2025-12-29 23:59:59"
    if (startDaysAgo === 0 && endDaysAgo === 0) {
      return "0-1";
    }

    // 判断是否是上周（上周一到上周日，共7天）
    // 上周：startTime="2025-12-22 00:00:00", endTime="2025-12-28 23:59:59"
    const startDayOfWeek = startDateOnly.getDay(); // 0=周日, 1=周一, ..., 6=周六
    const endDayOfWeek = endDateOnly.getDay();
    const daysDiff = Math.floor((endDateOnly.getTime() - startDateOnly.getTime()) / (24 * 60 * 60 * 1000));

    // 如果是本周（本周一到今天或本周日，间隔0-6天）
    // 本周一可能是周一(1)或周日(0)，结束日期是今天(0天前)
    // 情况1：本周一是周一(1)，结束日期是今天或本周日
    // 情况2：本周一是周日(0)且是今天，结束日期也是今天（只有一天）
    if (daysDiff >= 0 && daysDiff <= 6 && startDaysAgo >= 0 && startDaysAgo <= 6 && endDaysAgo === 0) {
      // 如果开始日期是本周一（周一或周日），结束日期是今天
      if ((startDayOfWeek === 1 && endDaysAgo === 0) ||
          (startDayOfWeek === 0 && endDayOfWeek === 0 && startDaysAgo === 0 && endDaysAgo === 0)) {
        return "W0";
      }
    }

    // 如果是上周（上周一到上周日，共7天，且都在7-13天前）
    // 上周一应该是周一(1)，上周日应该是周日(0)，间隔6天
    if (daysDiff === 6 && startDayOfWeek === 1 && endDayOfWeek === 0 && startDaysAgo >= 7 && startDaysAgo <= 13 && endDaysAgo >= 1 && endDaysAgo <= 7) {
      return "W1";
    }

    // 判断是否是上月（上个月的第一天到最后一天）
    // 上月：startTime="2025-11-01 00:00:00", endTime="2025-11-30 23:59:59"
    const startMonth = startDateOnly.getMonth();
    const startYear = startDateOnly.getFullYear();
    const endMonth = endDateOnly.getMonth();
    const endYear = endDateOnly.getFullYear();
    const todayMonth = today.getMonth();
    const todayYear = today.getFullYear();

    // 检查是否是上个月（开始日期是上个月的第一天，结束日期是上个月的最后一天）
    const isLastMonth = (startMonth === (todayMonth === 0 ? 11 : todayMonth - 1)) &&
                        (startYear === (todayMonth === 0 ? todayYear - 1 : todayYear)) &&
                        (endMonth === startMonth) &&
                        (endYear === startYear) &&
                        startDateOnly.getDate() === 1 && // 第一天
                        endDateOnly.getDate() === new Date(endYear, endMonth + 1, 0).getDate(); // 最后一天

    if (isLastMonth) {
      return "M1";
    }

    // 判断是否是本月（本月的第一天到今天）
    // 本月：startTime="2025-12-01 00:00:00", endTime="2025-12-29 23:59:59"
    const isThisMonth = (startMonth === todayMonth) &&
                        (startYear === todayYear) &&
                        (endMonth === todayMonth) &&
                        (endYear === todayYear) &&
                        startDateOnly.getDate() === 1 && // 第一天
                        endDaysAgo === 0; // 结束日期是今天

    if (isThisMonth) {
      return "M0";
    }

    // 判断是否是过去7天（7天前到1天前，不包含今天）
    // 过去7天：startTime="2025-12-22 00:00:00", endTime="2025-12-28 23:59:59"
    // daysDiff = 6 表示间隔6天（共7天，包含开始和结束）
    // startDaysAgo = 7 表示开始日期是7天前
    // endDaysAgo = 1 表示结束日期是1天前（昨天）
    if (daysDiff === 6 && startDaysAgo === 7 && endDaysAgo === 1) {
      return "1-7";
    }

    // 判断是否是最近7天（7天前到今天，共7天，包含今天）
    // 最近7天：startTime="2025-12-23 00:00:00", endTime="2025-12-29 23:59:59"
    // daysDiff = 6 表示间隔6天（共7天，包含开始和结束）
    // startDaysAgo = 6 表示开始日期是6天前（即7天前，因为包含今天）
    // endDaysAgo = 0 表示结束日期是今天
    // recentDay 格式应该是 "0-7"（0天前到7天前），而不是 "7-0"
    if (daysDiff === 6 && startDaysAgo === 6 && endDaysAgo === 0) {
      return "0-7";
    }

    // 判断是否是过去30天（30天前到1天前，不包含今天）
    // 过去30天：startTime="2025-11-29 00:00:00", endTime="2025-12-28 23:59:59"
    // daysDiff = 29 表示间隔29天（共30天，包含开始和结束）
    // startDaysAgo = 30 表示开始日期是30天前
    // endDaysAgo = 1 表示结束日期是1天前（昨天）
    // recentDay 格式应该是 "1-30"（1天前到30天前），而不是 "30-1"
    if (daysDiff === 29 && startDaysAgo === 30 && endDaysAgo === 1) {
      return "1-30";
    }

    // 判断是否是最近30天（30天前到今天，共30天，包含今天）
    // 最近30天：startTime="2025-11-30 00:00:00", endTime="2025-12-29 23:59:59"
    // daysDiff = 29 表示间隔29天（共30天，包含开始和结束）
    // startDaysAgo = 29 表示开始日期是29天前（即30天前，因为包含今天）
    // endDaysAgo = 0 表示结束日期是今天
    // recentDay 格式应该是 "0-30"（0天前到30天前），而不是 "30-0"
    if (daysDiff === 29 && startDaysAgo === 29 && endDaysAgo === 0) {
      return "0-30";
    }

    // 其他情况，返回计算的天数范围
    // 格式：endDaysAgo-startDaysAgo（结束天数-开始天数）
    // 注意：startDaysAgo 应该 >= endDaysAgo（因为开始日期更早）
    // API 要求的格式是：结束天数-开始天数（结束日期距离今天的天数 - 开始日期距离今天的天数）
    // 例如：12月10日(19天前)到12月24日(5天前) = "5-19"
    // 例如：7天前到今天 = "0-7"，1天前到7天前 = "1-7"
    return `${endDaysAgo}-${startDaysAgo}`;
  }

  // 验证并修正时间范围（确保结束时间不早于开始时间）
  function validateAndFixTimeRange(startTime: string, endTime: string): { startTime: string; endTime: string } {
    if (!startTime || !endTime) {
      return { startTime: startTime || '', endTime: endTime || '' };
    }

    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    // 检查日期是否有效
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return { startTime, endTime };
    }

    // 如果结束时间早于开始时间，交换它们
    if (endDate.getTime() < startDate.getTime()) {
      return {
        startTime: endTime,
        endTime: startTime
      };
    }

    return { startTime, endTime };
  }

  // 处理模板变化
  function handleTemplateChange(templateConfig: TemplateConfig | null) {
    currentTemplate.value = templateConfig;

    // 更新表格列
    tableColumns.value = generateDynamicColumns() as any;

    // 清空数据
    data.value = [];
  }

  // 处理模板搜索
  function handleTemplateSearch(templateConfig: TemplateConfig | null, queryParams: any) {
    if (!queryParams) {
      return;
    }

    currentTemplate.value = templateConfig;

    // 更新表格列
    tableColumns.value = generateDynamicColumns() as any;

    // 使用页面上的时间范围选择器的值，而不是模板的默认时间
    if (dateRangeStartTime.value && dateRangeEndTime.value) {
      // 验证并修正时间范围
      const timeRange = validateAndFixTimeRange(dateRangeStartTime.value, dateRangeEndTime.value);

      // 计算 recentDay
      const recentDay = calculateRecentDay(timeRange.startTime, timeRange.endTime);

      // 更新查询参数中的时间
      queryParams.eventView.startTime = timeRange.startTime;
      queryParams.eventView.endTime = timeRange.endTime;
      queryParams.eventView.recentDay = recentDay;
    }

    // 更新搜索参数并触发查询
    updateSearchParams(queryParams);
    getData();
  }

  // 处理日期范围变化（只更新值，不触发查询）
  function handleDateRangeChange(startTime: string | null, endTime: string | null) {
    dateRangeStartTime.value = startTime;
    dateRangeEndTime.value = endTime;
    // 不触发查询，等待用户点击"应用"按钮
    // 注意：不在这里清除预设范围，因为可能是用户手动调整日期
  }

  // 处理预设范围变化
  function handlePresetRangeChange(presetType: string | null) {
    activePresetRange.value = presetType;
  }

  // 处理取消按钮
  function handleDateRangeCancel() {
    dateRangePickerVisible.value = false;
  }

  // 根据日期范围识别预设范围
  function detectPresetRange(startTime: string, endTime: string): string | null {
    if (!startTime || !endTime) return null;

    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const startDayOfWeek = startDateOnly.getDay(); // 0=周日, 1=周一, ..., 6=周六
    const endDayOfWeek = endDateOnly.getDay();
    const daysDiff = Math.floor((endDateOnly.getTime() - startDateOnly.getTime()) / (24 * 60 * 60 * 1000));
    const startDaysAgo = Math.floor((todayOnly.getTime() - startDateOnly.getTime()) / (24 * 60 * 60 * 1000));
    const endDaysAgo = Math.floor((todayOnly.getTime() - endDateOnly.getTime()) / (24 * 60 * 60 * 1000));

    // 先检查是否是本周（优先级高于"今日"）
    // 如果是本周：本周一到今天，或者如果今天是周日，本周就是今天
    if (daysDiff >= 0 && daysDiff <= 6 && startDaysAgo >= 0 && startDaysAgo <= 6 && endDaysAgo === 0) {
      // 开始日期是本周一（周一或周日），结束日期是今天
      // 情况1：开始日期是周一，结束日期是今天
      if (startDayOfWeek === 1 && endDaysAgo === 0) {
        return 'thisWeek';
      }
      // 情况2：今天是周日，开始和结束都是今天（周日作为本周的第一天）
      if (startDayOfWeek === 0 && endDayOfWeek === 0 && startDaysAgo === 0 && endDaysAgo === 0) {
        return 'thisWeek';
      }
      // 情况3：开始日期是本周的任意一天（从周一到今天），结束日期是今天
      // 需要检查开始日期是否在本周范围内
      const thisWeekStart = new Date(todayOnly);
      if (todayOnly.getDay() === 0) {
        // 如果今天是周日，本周开始就是今天
      } else {
        // 否则，本周开始是本周一
        thisWeekStart.setDate(todayOnly.getDate() - (todayOnly.getDay() - 1));
      }
      thisWeekStart.setHours(0, 0, 0, 0);
      const thisWeekStartOnly = new Date(thisWeekStart.getFullYear(), thisWeekStart.getMonth(), thisWeekStart.getDate());

      // 如果开始日期在本周范围内（从本周一到今天），且结束日期是今天
      if (startDateOnly.getTime() >= thisWeekStartOnly.getTime() &&
          startDateOnly.getTime() <= todayOnly.getTime() &&
          endDateOnly.getTime() === todayOnly.getTime()) {
        return 'thisWeek';
      }
    }

    // 检查是否是今日（只有在不是本周的情况下）
    if (startDateOnly.getTime() === todayOnly.getTime() && endDateOnly.getTime() === todayOnly.getTime()) {
      return 'today';
    }

    // 检查是否是昨日
    const yesterday = new Date(todayOnly);
    yesterday.setDate(yesterday.getDate() - 1);
    if (startDateOnly.getTime() === yesterday.getTime() && endDateOnly.getTime() === yesterday.getTime()) {
      return 'yesterday';
    }

    // 检查是否是本月（本月的第一天到今天）
    const startMonth = startDateOnly.getMonth();
    const startYear = startDateOnly.getFullYear();
    const endMonth = endDateOnly.getMonth();
    const endYear = endDateOnly.getFullYear();
    const todayMonth = todayOnly.getMonth();
    const todayYear = todayOnly.getFullYear();

    const isThisMonth = (startMonth === todayMonth) &&
                        (startYear === todayYear) &&
                        (endMonth === todayMonth) &&
                        (endYear === todayYear) &&
                        startDateOnly.getDate() === 1 && // 第一天
                        endDaysAgo === 0; // 结束日期是今天

    if (isThisMonth) {
      return 'thisMonth';
    }

    // 检查是否是上月（上个月的第一天到最后一天）
    const isLastMonth = (startMonth === (todayMonth === 0 ? 11 : todayMonth - 1)) &&
                        (startYear === (todayMonth === 0 ? todayYear - 1 : todayYear)) &&
                        (endMonth === startMonth) &&
                        (endYear === startYear) &&
                        startDateOnly.getDate() === 1 && // 第一天
                        endDateOnly.getDate() === new Date(endYear, endMonth + 1, 0).getDate(); // 最后一天

    if (isLastMonth) {
      return 'lastMonth';
    }

    // 检查是否是过去7天（7天前到1天前，不包含今天）
    if (daysDiff === 6 && startDaysAgo === 7 && endDaysAgo === 1) {
      return 'past7days';
    }

    // 检查是否是最近7天（7天前到今天，共7天，包含今天）
    if (daysDiff === 6 && startDaysAgo === 6 && endDaysAgo === 0) {
      return 'last7days';
    }

    // 检查是否是过去30天（30天前到1天前，不包含今天）
    if (daysDiff === 29 && startDaysAgo === 30 && endDaysAgo === 1) {
      return 'past30days';
    }

    // 检查是否是最近30天（30天前到今天，共30天，包含今天）
    if (daysDiff === 29 && startDaysAgo === 29 && endDaysAgo === 0) {
      return 'last30days';
    }

    return null;
  }

  // 处理应用按钮（点击应用时才触发查询）
  function handleDateRangeApply() {
    // 根据日期范围自动识别预设范围
    if (dateRangeStartTime.value && dateRangeEndTime.value) {
      const detectedPreset = detectPresetRange(dateRangeStartTime.value, dateRangeEndTime.value);
      if (detectedPreset) {
        activePresetRange.value = detectedPreset;
      }
    }

    // 关闭弹窗
    dateRangePickerVisible.value = false;

    // 如果已选择模板，重新触发模板搜索
    if (currentTemplate.value) {
      // 使用当前时间范围重新构建查询参数
      const timeRange = validateAndFixTimeRange(
        dateRangeStartTime.value || '',
        dateRangeEndTime.value || ''
      );
      const recentDay = calculateRecentDay(timeRange.startTime, timeRange.endTime);

      // 根据模板ID获取对应的事件配置
      const eventConfigs: Record<string, any> = {
        cashShopGacha: {
          eventName: 'cash_shop_gacha',
          eventNameDisplay: '抽奖.总次数',
          eventUuid: 'CpAgAnK4'
        },
        petSynthesis: {
          eventName: 'Pet_Synthesis',
          eventNameDisplay: '灵宠合成.总次数',
          eventUuid: 'CpAgAnK4'
        },
        petGet: {
          eventName: 'pet_get',
          eventNameDisplay: '灵宠获得.总次数',
          eventUuid: 'CpAgAnK4'
        },
        resourceGet: {
          eventName: 'ta_resource_get',
          eventNameDisplay: '资源/道具获取.总次数',
          eventUuid: 'CpAgAnK4'
        },
        resourceCost: {
          eventName: 'ta_resource_cost',
          eventNameDisplay: '资源/道具消耗.总次数',
          eventUuid: 'CpAgAnK4'
        },
        death: {
          eventName: 'death',
          eventNameDisplay: 'death.总次数',
          eventUuid: 'CpAgAnK4'
        },
        deathDrop: {
          eventName: 'death_drop',
          eventNameDisplay: 'death.总次数',
          eventUuid: 'CpAgAnK4'
        },
        buffUse: {
          eventName: 'buff_use',
          eventNameDisplay: 'buff获得',
          eventUuid: 'CpAgAnK4'
        },
        buffInvalid: {
          eventName: 'buff_invalid',
          eventNameDisplay: 'buff消失',
          eventUuid: 'CpAgAnK4'
        }
      };

      const eventConfig = eventConfigs[currentTemplate.value.id] || eventConfigs.cashShopGacha;

      const queryParams = {
        eventView: {
          comparedByTime: false,
          comparedTimeList: [],
          endTime: timeRange.endTime,
          filts: [],
          firstDayOfWeek: 1,
          groupBy: currentTemplate.value.groupBy,
          recentDay: recentDay,
          relation: 'and',
          startTime: timeRange.startTime,
          timeParticleSize: 'total'
        },
        events: [
          {
            analysis: 'TOTAL_TIMES',
            analysisParams: '',
            eventName: eventConfig.eventName,
            eventNameDisplay: eventConfig.eventNameDisplay,
            eventUuid: eventConfig.eventUuid,
            filts: currentTemplate.value.filts,
            quota: '',
            relation: 'and',
            type: 'normal'
          }
        ],
        projectId: 3
      };

      updateSearchParams(queryParams);
      getData();
    }
  }

  // 获取行键值
  const getRowKey = (row: any) => {
    return row.id || row.index || Math.random();
  };

  onMounted(() => {
    if (!dateRangeStartTime.value || !dateRangeEndTime.value) {
      const past7DaysRange = getPast7DaysRange();
      dateRangeStartTime.value = past7DaysRange.startTime;
      dateRangeEndTime.value = past7DaysRange.endTime;
      activePresetRange.value = 'past7days';
    }
  });
  </script>

  <template>
    <div
      class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto"
    >
      <TemplateSearch
        v-model:model="templateSearchParams"
        @template-change="handleTemplateChange"
        @search="handleTemplateSearch"
        @reset="resetSearchParams"
      />
      <NCard
        :title="currentTemplate ? currentTemplate.name : '数据查询'"
        :bordered="false"
        size="small"
        class="sm:flex-1-hidden card-wrapper"
      >
        <template #header-extra>
          <NSpace align="center">
            <!-- 时间范围选择器 -->
            <NPopover
              v-model:show="dateRangePickerVisible"
              placement="bottom-end"
              trigger="click"
              :style="{ width: '900px', maxWidth: '90vw' }"
            >
              <template #trigger>
                <NButton
                  size="small"
                  ghost
                  style="border-color: #d9d9d9;"
                  @click="dateRangePickerVisible = !dateRangePickerVisible"
                >
                  <template #icon>
                    <Icon icon="majesticons:calendar-line" />
                  </template>
                  {{ displayedDateRange }}
                </NButton>
              </template>
              <DateRangePicker
                v-model:start-time="dateRangeStartTime"
                v-model:end-time="dateRangeEndTime"
                @change="handleDateRangeChange"
                @cancel="handleDateRangeCancel"
                @apply="handleDateRangeApply"
                @preset-change="handlePresetRangeChange"
              />
            </NPopover>

            <!-- 表格操作按钮 -->
            <TableHeaderOperation
              v-if="currentTemplate"
              v-model:columns="columnChecks"
              @refresh="getData"
            />
          </NSpace>
        </template>

        <!-- 有数据时显示表格 -->
        <NDataTable
          v-if="currentTemplate && tableColumns.length > 0"
          v-model:checked-row-keys="checkedRowKeys"
          :columns="columns"
          :data="data"
          size="small"
          :flex-height="!appStore.isMobile"
          :scroll-x="scrollX"
          :loading="loading"
          remote
          :row-key="getRowKey"
          :pagination="mobilePagination"
          class="sm:h-full"
        />

        <!-- 未选择模板时的空状态 -->
        <div v-else class="flex-center" style="min-height: 400px;">
          <NEmpty size="large">
            <template #icon>
              <Icon icon="mdi:file-document-outline" :style="{ fontSize: '80px', color: '#d0d0d0' }" />
            </template>
            <template #default>
              <div style="margin-top: 33px;">
                <NText depth="3" style="font-size: 14px;">
                  从上方下拉框中选择数据查询模板，输入筛选条件进行查询
                </NText>
              </div>
            </template>
          </NEmpty>
        </div>
      </NCard>
    </div>
  </template>


  <style scoped></style>
