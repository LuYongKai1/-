<script setup lang="tsx">
  import { NButton, NPopconfirm, NTag, NPopover, NSpace } from "naive-ui";
  import {
    fetchChatMonitor,
    fetchDeleteWhiteListManage,
    fetchGetShuShuAip,
  } from "@/service/api";
  import { $t } from "@/locales";
  import { useAppStore } from "@/store/modules/app";
  import { serverStatusWhite } from "@/constants/business";
  import { useTable, useTableOperate, createTooltipHeader } from "@/hooks/common/table";
  import UserActionButtons from "@/components/business/user-action-buttons.vue";
  // @ts-ignore
import OverviewRoleSearch from "./modules/overviewrole-search.vue";
  // @ts-ignore
import DateRangePicker from "@/components/business/date-range-picker.vue";
  import { Icon } from "@iconify/vue";
  import { ref, onMounted, computed, watch } from "vue";

  const appStore = useAppStore();

  // 聊天频道枚举映射
  const chatChannelMap: Record<string, string> = {
    '0': '地区',
    '1': '世界',
    '2': '队伍',
    '3': '公会',
    '4': '宣传',
    '7': '私聊'
  };

  // 聊天目标枚举映射
  const chatTargetMap: Record<string, string> = {
    '0': '所有',
    '1': '公会/组队',
    '3': '私聊'
  };

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

  // 构建 groupBy 数组
  function buildGroupBy() {
    return [
      {
        clusterDatePolicy: "LATEST",
        columnDesc: "事件时间",
        columnName: "#event_time",
        propertyRange: "",
        tableType: "event",
        timeTypeColumnFormart: "minute"
      },
      {
        columnDesc: "区服ID",
        columnName: "server_id",
        propertyRange: "",
        tableType: "event"
      },
      {
        columnDesc: "账户ID（JV+角色）",
        columnName: "#account_id",
        propertyRange: "",
        tableType: "event"
      },
      {
        columnDesc: "角色名称",
        columnName: "role_name",
        propertyRange: "",
        tableType: "event"
      },
      {
        clusterDatePolicy: "LATEST",
        columnDesc: "当前角色等级",
        columnName: "level",
        propertyRange: "",
        propertyRangeType: "discrete",
        tableType: "user"
      },
      {
        columnDesc: "vip_lvl",
        columnName: "vip_lvl",
        propertyRange: "",
        propertyRangeType: "def",
        tableType: "user"
      },
      {
        columnDesc: "聊天频道",
        columnName: "chat_channel",
        propertyRange: "",
        propertyRangeType: "def",
        tableType: "event"
      },
      {
        columnDesc: "聊天信息",
        columnName: "chat_msg",
        propertyRange: "",
        tableType: "event"
      },
      {
        columnDesc: "聊天目标",
        columnName: "chat_target",
        propertyRange: "",
        propertyRangeType: "def",
        tableType: "event"
      },
      {
        columnDesc: "私聊对象",
        columnName: "chat_target_param",
        propertyRange: "",
        tableType: "event"
      }
    ];
  }

  // 将 union_groups 二维数组转换为表格数据格式
  // 根据 buildGroupBy 的顺序，通过下标直接映射：
  // 0: #event_time, 1: server_id, 2: #account_id, 3: role_name, 4: level,
  // 5: vip_lvl, 6: chat_channel, 7: chat_msg, 8: chat_target, 9: chat_target_param
  function transformUnionGroupsToTableData(unionGroups: any[][]) {
    if (!Array.isArray(unionGroups)) {
      return [];
    }

    return unionGroups.map((group: any[]) => {
      // 直接通过下标映射数据
      return {
        eventTime: group[0] || '',        // 事件时间
        serverId: group[1] || '',          // 区服ID
        userId: group[2] || '',            // 账户ID（JV+角色）
        accountId: group[2] || '',         // #account_id 同时映射到 userId 和 accountId
        roleName: group[3] || '',          // 角色名称
        level: group[4] || '',             // 当前角色等级
        vipLevel: group[5] || '',          // vip等级
        chat_channel: group[6] || '',      // 聊天频道
        chat_msg: group[7] || '',          // 聊天信息
        chat_target: group[8] || '',       // 聊天目标
        chat_target_param: group[9] || ''  // 私聊对象
      };
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

  const {
    columns,
    columnChecks,
    data,
    getData,
    getDataByPage,
    loading,
    mobilePagination,
    searchParams,
    scrollX,
    resetSearchParams,
    updateSearchParams,
  } = useTable({
    apiFn: wrappedFetchChatMonitor as any,
    showTotal: true,
    immediate: false,
    apiParams: {
      current: 1,
      size: 20,
    },
    columns: () => [
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
      {
        key: "userId",
        title: "账户ID",
        align: "center",
        minWidth: 200,
        render: (row: any) => {
          return row.userId || row.accountId || "-";
        }
      },
      {
        key: "roleName",
        title: "角色名称",
        align: "center",
        minWidth: 120,
        render: (row: any) => {
          return row.roleName || "-";
        }
      },
      {
        key: "level",
        title: "角色等级",
        align: "center",
        minWidth: 100,
        render: (row: any) => {
          return row.level || "-";
        }
      },
      {
        key: "vipLevel",
        title: "VIP等级",
        align: "center",
        minWidth: 100,
        render: (row: any) => {
          return row.vipLevel || "-";
        }
      },
      {
        key: "chat_channel",
        title: "聊天频道",
        align: "center",
        minWidth: 130,
        render: (row: any) => {
          if (row.chat_channel === null || row.chat_channel === undefined || row.chat_channel === '') return "-";
          const channelValue = String(row.chat_channel);
          const channelText = chatChannelMap[channelValue] || channelValue;

          // 不同频道使用不同颜色
          const colorMap: Record<string, string> = {
            '0': 'default',  // 地区
            '1': 'success',  // 世界
            '2': 'info',     // 队伍
            '3': 'warning',  // 公会
            '4': 'error',    // 宣传
            '7': 'primary'   // 私聊
          };

          return (
            <NTag type={colorMap[channelValue] || 'default'} size="small">
              {channelText}
            </NTag>
          );
        }
      },
      {
        key: "chat_msg",
        title: "聊天信息",
        align: "center",
        minWidth: 300,
        render: (row: any) => {
          return row.chat_msg || "-";
        }
      },
      {
        key: "chat_target",
        title: "聊天目标",
        align: "center",
        minWidth: 130,
        render: (row: any) => {
          if (row.chat_target === null || row.chat_target === undefined || row.chat_target === '') return "-";
          const targetValue = String(row.chat_target);
          const targetText = chatTargetMap[targetValue] || targetValue;

          // 不同目标使用不同颜色
          const colorMap: Record<string, string> = {
            '0': 'success',  // 所有
            '1': 'warning',  // 公会/组队
            '3': 'primary'   // 私聊
          };

          return (
            <NTag type={colorMap[targetValue] || 'default'} size="small">
              {targetText}
            </NTag>
          );
        }
      },
      {
        key: "chat_target_param",
        title: "私聊对象",
        align: "center",
        minWidth: 150,
        render: (row: any) => {
          return row.chat_target_param || "-";
        }
      },
      {
        key: "operate",
        title: $t("common.operate"),
        align: "center",
        width: 130,
        fixed: "right",
        render: (row: any) => {
          // 将数据转换为用户操作组件需要的格式
          // 去掉前缀（如 5_）只保留后面的ID作为角色ID
          const rawUserId = row.userId || row.accountId || '';
          const roleId = String(rawUserId).includes('_')
            ? String(rawUserId).split('_')[1]
            : rawUserId;

          const userData = {
            ...row,
            userId: roleId,  // 用于兼容原有组件
            roleId: roleId,  // 角色ID（聊天监控场景使用）
            banDate: null,  // 从数据中获取封禁状态
            chatDate: null, // 从数据中获取禁言状态
          };
          return (
            <UserActionButtons
              userData={userData}
              onSuccess={getData}
              useRoleId={true}
            />
          );
        }
      },
    ] as any,
    defaultHiddenKeys: [],
  });

  const {
    drawerVisible,
    operateType,
    editingData,
    checkedRowKeys,
    onBatchDeleted,
    onDeleted,
  } = useTableOperate(data as any, getData);

  // 筛选条件
  const filters = ref<any[]>([]);

  // 日期范围（默认今日）
  const defaultTimeRange = getTimeRange();
  const dateRangeStartTime = ref<string | null>(defaultTimeRange.startTime);
  const dateRangeEndTime = ref<string | null>(defaultTimeRange.endTime);

  // 日期范围选择器弹窗显示状态
  const dateRangePickerVisible = ref(false);

  // 当前选中的预设范围（默认今日）
  const activePresetRange = ref<string | null>('today');

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

  // 根据 searchParams 构建筛选条件
  function buildFiltersFromSearchParams(): any[] {
    const filters: any[] = [];
    const currentParams = searchParams as any;

    // 获取当前日期（用于 specifiedClusterDate）
    const today = new Date();
    const specifiedDate = today.toISOString().split('T')[0]; // 格式：yyyy-MM-dd

    // 区服ID筛选条件（支持多选）
    const serverId = currentParams?.serverId;
    if (Array.isArray(serverId) && serverId.length > 0) {
      const serverIdArray = serverId.filter(id => id && String(id).trim().length > 0);
      if (serverIdArray.length > 0) {
        filters.push({
          columnDesc: "区服ID",
          columnName: "server_id",
          comparator: "equal",
          filterType: "SIMPLE",
          ftv: serverIdArray,
          specifiedClusterDate: specifiedDate,
          subTableType: "",
          tableType: "event",
          timeUnit: ""
        });
      }
    }

    // chat_msg 筛选条件
    const chatMsg = currentParams?.chatMsg;
    if (chatMsg && String(chatMsg).trim()) {
      filters.push({
        columnDesc: "chat_msg",
        columnName: "chat_msg",
        comparator: "include",
        filterType: "SIMPLE",
        ftv: [String(chatMsg).trim()],
        specifiedClusterDate: specifiedDate,
        subTableType: "",
        tableType: "event",
        timeUnit: ""
      });
    }

    // 账户ID筛选条件
    const accountId = currentParams?.accountId;
    if (accountId && String(accountId).trim()) {
      filters.push({
        columnDesc: "账户ID",
        columnName: "#account_id",
        comparator: "equal",
        filterType: "SIMPLE",
        ftv: [String(accountId).trim()],
        specifiedClusterDate: specifiedDate,
        subTableType: "",
        tableType: "event",
        timeUnit: ""
      });
    }

    // 注册jv筛选条件（默认值为 "4"，始终应用）
    const jv = (currentParams?.jv && String(currentParams.jv).trim()) || "4";
    filters.push({
      columnDesc: "注册jv",
      columnName: "jv",
      comparator: "equal",
      filterType: "SIMPLE",
      ftv: [jv],
      specifiedClusterDate: specifiedDate,
      subTableType: "",
      tableType: "event",
      timeUnit: ""
    });

    return filters;
  }

  // 监听数据分组变化并更新列显示状态
  function handleSearch(serverId: string | string[], searchFilters?: any[]) {
    // 构建筛选条件数组
    const filts: any[] = [];

    // 如果有筛选条件，添加到参数中
    if (searchFilters && searchFilters.length > 0) {
      filts.push(...searchFilters);
    }

    // 如果有额外的筛选条件，添加到参数中
    if (filters.value.length > 0) {
      filts.push(...filters.value);
    }

    // 获取时间范围（优先使用日期范围选择器的值）
    let timeRange = dateRangeStartTime.value && dateRangeEndTime.value
      ? { startTime: dateRangeStartTime.value, endTime: dateRangeEndTime.value }
      : getTimeRange();

    // 验证并修正时间范围
    timeRange = validateAndFixTimeRange(timeRange.startTime, timeRange.endTime);

    // 计算 recentDay
    const recentDay = calculateRecentDay(timeRange.startTime, timeRange.endTime);

    // 最终验证时间（确保在发送前时间正确）
    const finalStart = new Date(timeRange.startTime);
    const finalEnd = new Date(timeRange.endTime);
    if (finalEnd.getTime() < finalStart.getTime()) {
      const temp = timeRange.startTime;
      timeRange.startTime = timeRange.endTime;
      timeRange.endTime = temp;
    }

    // 构建请求参数（新格式）
    const params: any = {
      eventView: {
        comparedByTime: false,
        comparedTimeList: [],
        endTime: timeRange.endTime,
        filts: filts,
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

    updateSearchParams(params);
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
    // 应用按钮点击时，触发搜索
    const currentParams = searchParams as any;

    // 根据日期范围自动识别预设范围（如果还没有设置，或者当前设置不匹配）
    if (dateRangeStartTime.value && dateRangeEndTime.value) {
      const detectedPreset = detectPresetRange(dateRangeStartTime.value, dateRangeEndTime.value);
      if (detectedPreset) {
        // 如果检测到预设范围，更新 activePresetRange
        activePresetRange.value = detectedPreset;
      }
    }

    // 根据 searchParams 重新构建筛选条件
    const searchFilters = buildFiltersFromSearchParams();

    handleSearch(currentParams?.serverId || [], searchFilters);
    // 关闭弹窗
    dateRangePickerVisible.value = false;
  }

  // 添加筛选条件
  function addFilter(filter: any) {
    filters.value.push(filter);
    // 重新触发搜索
    const currentParams = searchParams as any;
    handleSearch(currentParams.serverId || [], buildFiltersFromSearchParams());
  }

  // 移除筛选条件
  function removeFilter(index: number) {
    filters.value.splice(index, 1);
    // 重新触发搜索
    const currentParams = searchParams as any;
    handleSearch(currentParams.serverId || [], buildFiltersFromSearchParams());
  }

  // 清空所有筛选条件
  function clearFilters() {
    filters.value = [];
    // 重新触发搜索
    const currentParams = searchParams as any;
    handleSearch(currentParams.serverId || [], buildFiltersFromSearchParams());
  }



  // 获取行键值
  const getRowKey = (row: any) => {
    return row.id || row.index || Math.random();
  };

  onMounted(() => {
    // 初始化日期范围（默认今日，如果还没有值则使用今日）
    if (!dateRangeStartTime.value || !dateRangeEndTime.value) {
      const todayRange = getTimeRange();
      dateRangeStartTime.value = todayRange.startTime;
      dateRangeEndTime.value = todayRange.endTime;
      activePresetRange.value = 'today';
    }

    // 确保 searchParams 包含必要的字段（初始化为数组）
    const currentParams = searchParams as any;
    if (!Array.isArray(currentParams.serverId)) {
      currentParams.serverId = [];
    }
    if (!currentParams.chatMsg) {
      currentParams.chatMsg = '';
    }
    if (!currentParams.accountId) {
      currentParams.accountId = '';
    }
    if (!currentParams.jv) {
      currentParams.jv = '4'; // 默认值为 "4"
    }

    // 初始化时自动触发搜索（使用过去7天的数据）
    const searchFilters = buildFiltersFromSearchParams();
    handleSearch(currentParams?.serverId || [], searchFilters);
  });
  </script>

  <template>
    <div
      class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto"
    >
      <OverviewRoleSearch
        v-model:model="searchParams"
        @reset="resetSearchParams"
        @search="handleSearch"
      />
      <NCard
        title="聊天监控"
        :bordered="false"
        size="small"
        class="sm:flex-1-hidden card-wrapper"
      >
        <template #header-extra>
          <NSpace align="center">
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
            <TableHeaderOperation
              v-model:columns="columnChecks"
              @refresh="getData"
            />
          </NSpace>
        </template>
        <NDataTable
          v-model:checked-row-keys="checkedRowKeys"
          :columns="columns"
          :data="data"
          size="small"
          :flex-height="!appStore.isMobile"
          :scroll-x="2830"
          :loading="loading"
          remote
          :row-key="getRowKey"
          :pagination="mobilePagination"
          :single-line="false"
          class="sm:h-full"
        />
      </NCard>
    </div>
  </template>


  <style scoped></style>
