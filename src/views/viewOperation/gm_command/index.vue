<script setup lang="tsx">
import { ref, computed, watch } from "vue";
import {
  NCard,
  NButton,
  NSelect,
  NInput,
  NSpace,
  NAlert,
  NTag,
  NModal,
  NDataTable,
  NPopover,
  NTree,
  NIcon,
  useDialog,
  type SelectOption,
  type TreeOption,
} from "naive-ui";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import { fetchCustomGm, fetchRecentGmHistory, fetchGmCommandStatistics, fetchGetServerList } from "@/service/api";
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";
import { format } from "date-fns";
import { useServerStore } from "@/store/modules/server";
import JSONbig from "json-bigint";

const appStore = useAppStore();
const serverStore = useServerStore();
const dialog = useDialog();

// 服务器列表
const serverOptions = ref<SelectOption[]>([]);
// 使用store中包含跨服的服务器树形选项
const serverTreeOptions = computed(() => serverStore.mixedServerTreeOptions);
const serverLoading = ref(false);
const serverPopoverVisible = ref(false);

// 表单数据
const formData = ref<{
  serverId: string[];
  act: string;
  data: Record<string, any>;
  sn: string;
}>({
  serverId: [],
  act: "",
  data: {
  },
  sn: "",
});

// JSON编辑器相关
const jsonInput = ref("");

// 执行历史记录
const executeHistory = ref<any[]>([]);
const historyVisible = ref(false);

// 统计数据
const totalExecutions = ref(0);
const successCount = ref(0);
const failureCount = ref(0);

// 加载状态
const loading = ref(false);

// 防抖定时器
let executeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_DELAY = 500; // 防抖延迟时间（毫秒）

// 可用的GM指令模板
const gmTemplates = ref([
  {
    label: "REBUILD_RANKING（重置排行榜）",
    value: "REBUILD_RANKING",
    description: "重置排行榜",
    defaultData: {
      ranking_type: "",
      action : "",
      reward_kind_group : "",
      update_bless : "",
    },
  },
  {
    label: "KICK_PLAYER（踢出玩家）",
    value: "KICK_PLAYER",
    description: "踢出玩家",
    defaultData: {
      player_id: "",
      reason: "GM操作",
    },
  },
  {
    label: "SEND_MAIL（发送邮件）",
    value: "SEND_MAIL",
    description: "发送邮件",
    defaultData: {
      title: "",
      content: "",
      items: [],
    },
  },
  {
    label: "RELOAD_CONFIG（重载配置）",
    value: "RELOAD_CONFIG",
    description: "重载配置",
    defaultData: {
      config_type: "all",
    },
  },
  {
    label: "CALL_SERVICE_LUA_FUNCTION（调用Lua函数）",
    value: "CALL_SERVICE_LUA_FUNCTION",
    description: "调用Lua函数",
    defaultData: {
      svr_type: "world",
      lua_function: "print_garbage",
      params: [],
      timeout_ms: 1233454566,
    },
  },
]);

// 初始化数据
async function initData() {
  // 获取服务器列表（树形结构）
  await getServerList();

  // 加载GM历史记录和统计数据
  await Promise.all([
    loadGmHistory(),
    loadStatistics()
  ]);

  // 初始化JSON输入
  updateJsonInput();
}

// 获取区服列表（使用store封装的功能）
async function getServerList() {
  serverLoading.value = true;
  try {
    await serverStore.fetchServerList();
    // 获取跨服列表
    if (!serverStore.crossServerList?.length) {
      await serverStore.fetchCrossServerList();
    }
  } catch (error) {
    console.error("获取服务器列表失败:", error);
  } finally {
    serverLoading.value = false;
  }
}

// 计算选中的区服显示文本
const selectedServerText = computed(() => {
  if (!formData.value.serverId || formData.value.serverId.length === 0) {
    return '请选择服务器';
  }
  return `已选择 ${formData.value.serverId.length} 个区服`;
});

// 加载GM历史记录
async function loadGmHistory() {
  try {
    const response = await fetchRecentGmHistory({
      limit: 10,
    });

    // 从 response.data.rows 获取数据
    const historyData = response?.response?.data?.rows;

    if (historyData && Array.isArray(historyData) && historyData.length > 0) {
      // 转换为本地历史记录格式
      executeHistory.value = historyData.map((item: any) => {
        // 解析commandJson获取act和data
        let parsedData = {};
        let actValue = item.act || "CUSTOM_COMMAND";

        try {
          if (item.commandJson) {
            const commandData = typeof item.commandJson === 'string'
              ? JSONbig.parse(item.commandJson)
              : item.commandJson;
            actValue = commandData.act || actValue;
            parsedData = commandData.data || {};
          } else if (item.commandData) {
            // 如果有commandData字段，也尝试解析
            parsedData = typeof item.commandData === 'string'
              ? JSONbig.parse(item.commandData)
              : item.commandData;
          }
        } catch (e) {
          console.error("解析历史记录数据失败:", e, item);
        }

        // 根据executeStatus判断状态：1=待执行, 2=成功, 3=失败
        const status = item.executeStatus === 2 ? "success" : "error";

        // 使用store封装的方法获取服务器名称
        const serverName = serverStore.getServerNameById(item.serverId);

        return {
          id: item.id,
          serverId: item.serverId,
          serverName: serverName,
          act: actValue,
          data: parsedData,
          sn: String(item.sn || ""),
          time: item.executeTime || item.createdAt || new Date().toISOString(),
          status: status,
          response: item.resultMessage || "",
          resultCode: item.resultCode,
          executeDurationMs: item.executeDurationMs,
        };
      });

    } else {
      executeHistory.value = [];
    }
  } catch (error) {
    console.error("加载GM历史记录失败:", error);
    executeHistory.value = [];
  }
}

// 加载GM命令统计数据
async function loadStatistics() {
  try {
    const response = await fetchGmCommandStatistics({});

    // 从响应中获取统计数据数组 - 数据在 response.data.rows 中
    const statsArray = response?.response?.data?.rows;

    if (statsArray && Array.isArray(statsArray)) {
      // 汇总所有act的统计数据
      let total = 0;
      let success = 0;
      let failure = 0;

      statsArray.forEach((item: any) => {
        total += item.totalCount || 0;
        success += item.successCount || 0;
        failure += item.failCount || 0;
      });

      totalExecutions.value = total;
      successCount.value = success;
      failureCount.value = failure;
    }
  } catch (error) {
    console.error("加载统计数据失败:", error);
  }
}

// 监听指令模板变化
watch(
  () => formData.value.act,
  (newAct) => {
    if (newAct) {
      const template = gmTemplates.value.find((t) => t.value === newAct);
      if (template) {
        formData.value.data = { ...template.defaultData };
        updateJsonInput();
      }
    }
  }
);

// 格式化数据对象
function formatData() {
  try {
    const parsed = JSONbig.parse(jsonInput.value);
    // 使用 JSONbig.stringify 保留大数字精度
    jsonInput.value = JSONbig.stringify(parsed, null, 2);
    // 如果JSON包含完整结构，更新formData
    if (parsed.act) {
      formData.value.act = parsed.act;
      formData.value.data = parsed.data || {};
      if (parsed.SN) {
        formData.value.sn = String(parsed.SN);
      }
    } else {
      formData.value.data = parsed;
    }
    window.$message?.success("JSON格式化成功");
  } catch (error: any) {
    window.$message?.error(`JSON格式错误: ${error.message}`);
  }
}

// 压缩JSON
function compressJson() {
  try {
    const parsed = JSONbig.parse(jsonInput.value);
    // 使用 JSONbig.stringify 保留大数字精度
    jsonInput.value = JSONbig.stringify(parsed);
    // 如果JSON包含完整结构，更新formData
    if (parsed.act) {
      formData.value.act = parsed.act;
      formData.value.data = parsed.data || {};
      if (parsed.SN) {
        formData.value.sn = String(parsed.SN);
      }
    } else {
      formData.value.data = parsed;
    }
    window.$message?.success("JSON压缩成功");
  } catch (error: any) {
    window.$message?.error(`JSON格式错误: ${error.message}`);
  }
}

// 验证JSON
function validateJson() {
  try {
    JSONbig.parse(jsonInput.value);
    window.$message?.success("JSON格式正确");
  } catch (error: any) {
    window.$message?.error(`JSON格式错误: ${error.message}`);
  }
}

// 生成SN
function generateSN() {
  const sn = Date.now().toString();
  formData.value.sn = sn;

  // 更新JSON编辑器中的SN值
  try {
    const parsed = JSONbig.parse(jsonInput.value);
    parsed.SN = parseInt(sn);
    // 使用 JSONbig.stringify 保留大数字精度
    jsonInput.value = JSONbig.stringify(parsed, null, 2);
  } catch (error) {
    console.error("更新JSON中的SN失败:", error);
  }

  window.$message?.success(`已生成SN: ${sn}`);
  return sn;
}

// 清空JSON数据
function clearJsonData() {
  jsonInput.value = "{}";
  formData.value.data = {};
  window.$message?.info("JSON数据已清空");
}

// 更新JSON输入框 - 渲染完整的命令结构
function updateJsonInput() {
  try {
    // 构建完整的命令结构
    const commandStructure = {
      act: formData.value.act || "",
      data: formData.value.data,
      SN: formData.value.sn ? parseInt(formData.value.sn) : ""
    };
    // 使用 JSONbig.stringify 保留大数字精度
    jsonInput.value = JSONbig.stringify(commandStructure, null, 2);
  } catch (error) {
    console.error("更新JSON失败:", error);
  }
}

// 清空表单
function clearForm() {
  formData.value = {
    serverId: [],
    act: "",
    data: {
      max_count: 1,
      map_id: 391,
      channel_id: 1,
    },
    sn: "",
  };
  updateJsonInput();
  window.$message?.info("表单已清空");
}

// 执行GM指令（带防抖）
function executeCommand() {
  // 清除之前的防抖定时器
  if (executeDebounceTimer) {
    clearTimeout(executeDebounceTimer);
  }

  // 设置新的防抖定时器
  executeDebounceTimer = setTimeout(() => {
    executeCommandWithConfirm();
  }, DEBOUNCE_DELAY);
}

// 执行GM指令（带确认弹窗）
function executeCommandWithConfirm() {
  // 验证必填项
  if (!formData.value.serverId || formData.value.serverId.length === 0) {
    window.$message?.warning("请选择至少一个服务器");
    return;
  }

  // 验证JSON格式并解析用户输入的数据
  let userInputData: any;
  try {
    userInputData = JSONbig.parse(jsonInput.value);
  } catch (error: any) {
    window.$message?.error(`JSON格式错误: ${error.message}`);
    return;
  }

  // 获取服务器名称列表（使用store封装的方法）
  const serverNames: string[] = [];
  formData.value.serverId.forEach(serverIdStr => {
    // 处理跨服ID，去掉 cross_ 前缀
    const actualServerId = serverIdStr.startsWith('cross_')
      ? serverIdStr.replace('cross_', '')
      : serverIdStr;
    const serverName = serverStore.getServerNameById(actualServerId);
    serverNames.push(serverName);
  });

  // 显示确认弹窗
  dialog.warning({
    title: "确认执行GM指令",
    content: () => (
      <div>
        <div class="mb-8px">
          <span class="font-medium">目标服务器：</span>
          <span class="text-primary">{formData.value.serverId.length} 个</span>
        </div>
        <div class="mb-8px text-13px text-gray-600">
          {serverNames.join(", ")}
        </div>
        <div class="mb-8px">
          <span class="font-medium">GM指令：</span>
          <span class="text-primary">{formData.value.act || "CUSTOM_COMMAND"}</span>
        </div>
        <div class="mt-12px p-8px bg-gray-50 rounded text-13px">
          <div class="font-medium mb-4px">命令数据预览：</div>
          <pre class="font-mono text-12px overflow-auto max-h-200px">
            {JSONbig.stringify(userInputData, null, 2)}
          </pre>
        </div>
        <div class="mt-12px text-error text-13px">
          ⚠️ 此操作将立即执行，请确认无误后继续
        </div>
      </div>
    ),
    positiveText: "确认执行",
    negativeText: "取消",
    onPositiveClick: () => {
      doExecuteCommand(userInputData);
    },
  });
}

// 实际执行GM指令
async function doExecuteCommand(userInputData: any) {
  loading.value = true;

  try {
    // 生成SN
    const sn = generateSN();

    let commandData: any;
    let actValue: string;

    // 检查用户输入的JSON是否已经包含完整的命令结构（包含act、data、SN字段）
    if (userInputData.act && userInputData.data && typeof userInputData.data === 'object') {
      // 用户输入的是完整的命令结构，直接使用（但更新SN）
      commandData = {
        ...userInputData,
        SN: parseInt(sn),
      };
      actValue = userInputData.act;
    } else {
      // 用户输入的是纯数据，需要包装成命令结构
      actValue = formData.value.act;
      if (!actValue || actValue.trim() === "") {
        actValue = "CUSTOM_COMMAND";
      }

      commandData = {
        act: actValue,
        data: userInputData,
        SN: parseInt(sn),
      };
    }

    const commandJson = JSONbig.stringify(commandData);

    // 并行调用接口，为每个选中的服务器执行命令
    const promises = formData.value.serverId.map(serverIdStr => {
      // 处理服务器ID，将跨服ID转换为实际的serverId
      const actualServerId = serverIdStr.startsWith('cross_')
        ? parseInt(serverIdStr.replace('cross_', ''))
        : parseInt(serverIdStr);

      return fetchCustomGm({
        gameId: 101,
        serverId: actualServerId,
        commandJson: commandJson,
      });
    });

    const responses = await Promise.allSettled(promises);

    // 统计执行结果
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    responses.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const response = result.value;
        if (!handleApiResponseError(response, `服务器 ${formData.value.serverId[index]} 执行GM指令`)) {
          successCount++;
        } else {
          failCount++;
          errors.push(`服务器 ${formData.value.serverId[index]} 执行失败`);
        }
      } else {
        failCount++;
        errors.push(`服务器 ${formData.value.serverId[index]} 请求失败: ${result.reason}`);
      }
    });

    // 显示执行结果
    if (failCount === 0) {
      window.$message?.success(`GM指令执行成功！共 ${successCount} 个服务器`);
    } else if (successCount === 0) {
      window.$message?.error(`GM指令执行失败！共 ${failCount} 个服务器失败`);
      if (errors.length > 0) {
        console.error("执行错误详情:", errors);
      }
    } else {
      window.$message?.warning(`部分成功：${successCount} 个服务器成功，${failCount} 个服务器失败`);
      if (errors.length > 0) {
        console.error("执行错误详情:", errors);
      }
    }

    // 重新加载历史记录和统计数据
    await Promise.all([
      loadGmHistory(),
      loadStatistics()
    ]);
  } catch (error: any) {
    handleApiCatchError(error, "执行GM指令");
    // 重新加载历史记录和统计数据
    await Promise.all([
      loadGmHistory(),
      loadStatistics()
    ]);
  } finally {
    loading.value = false;
  }
}

// 清空历史记录
function clearHistory() {
  executeHistory.value = [];
  window.$message?.success("历史记录已清空");
}

// 重新执行历史记录中的指令（带防抖）
let reExecuteDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function reExecuteFromHistory(item: any) {
  // 清除之前的防抖定时器
  if (reExecuteDebounceTimer) {
    clearTimeout(reExecuteDebounceTimer);
  }

  // 设置新的防抖定时器
  reExecuteDebounceTimer = setTimeout(() => {
    formData.value.serverId = [String(item.serverId)];
    formData.value.act = item.act;
    formData.value.data = item.data;
    updateJsonInput();
    historyVisible.value = false;
    window.$message?.info("已加载历史指令，点击执行按钮重新执行");
  }, DEBOUNCE_DELAY);
}

// 历史记录表格列
const historyColumns = computed(() => [
  {
    key: "time",
    title: "执行时间",
    align: "center" as const,
    width: 180,
    render: (row: any) => {
      return format(new Date(row.time), "yyyy-MM-dd HH:mm:ss");
    },
  },
  {
    key: "serverName",
    title: "服务器",
    align: "center" as const,
    width: 150,
    ellipsis: { tooltip: true },
  },
  {
    key: "act",
    title: "GM指令",
    align: "center" as const,
    width: 200,
  },
  {
    key: "sn",
    title: "SN",
    align: "center" as const,
    width: 150,
  },
  {
    key: "status",
    title: "状态",
    align: "center" as const,
    width: 100,
    render: (row: any) => {
      return (
        <NTag type={row.status === "success" ? "success" : "error"}>
          {row.status === "success" ? "成功" : "失败"}
        </NTag>
      );
    },
  },
  {
    key: "operate",
    title: "操作",
    align: "center" as const,
    width: 100,
    render: (row: any) => (
      <NButton
        type="primary"
        size="small"
        ghost
        onClick={() => reExecuteFromHistory(row)}
      >
        重新执行
      </NButton>
    ),
  },
]);

// 初始化
initData();
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-y-auto">
    <!-- 页面头部标题卡片 -->
    <NCard :bordered="false" size="small" class="card-wrapper">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-20px font-bold">
            <icon-mdi-console class="inline-block align-middle mr-2" />
            游戏自定义GM指令
          </h2>
          <p class="text-14px text-gray-500 mt-1">
            JSON格式命令平台，支持自定义
            <span class="text-primary">act</span> 和
            <span class="text-primary">data</span> 字段，SN 可自动记录
          </p>
        </div>
      </div>
    </NCard>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-3 gap-16px">
      <NCard :bordered="false" size="small" class="card-wrapper">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-14px text-gray-500 mb-4px">总执行次数</div>
            <div class="text-24px font-bold text-primary">{{ totalExecutions }}</div>
          </div>
          <div class="text-40px text-primary opacity-80">
            <icon-mdi-chart-line />
          </div>
        </div>
      </NCard>

      <NCard :bordered="false" size="small" class="card-wrapper">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-14px text-gray-500 mb-4px">成功次数</div>
            <div class="text-24px font-bold text-success">{{ successCount }}</div>
          </div>
          <div class="text-40px text-success opacity-80">
            <icon-mdi-check-circle />
          </div>
        </div>
      </NCard>

      <NCard :bordered="false" size="small" class="card-wrapper">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-14px text-gray-500 mb-4px">失败次数</div>
            <div class="text-24px font-bold text-error">{{ failureCount }}</div>
          </div>
          <div class="text-40px text-error opacity-80">
            <icon-mdi-close-circle />
          </div>
        </div>
      </NCard>
    </div>

    <div class="flex gap-16px lt-lg:flex-col">
      <!-- 左侧：GM命令执行区 -->
      <NCard
        title="GM命令执行"
        :bordered="false"
        size="small"
        class="flex-1 card-wrapper"
      >
        <template #header-extra>
          <NSpace>
            <NButton size="small" @click="clearForm">
              <template #icon>
                <icon-mdi-refresh />
              </template>
              清空
            </NButton>
          </NSpace>
        </template>

        <div class="space-y-16px">
          <!-- 提示信息 -->
          <NAlert type="info" :show-icon="true">
            <div>
              <div class="font-medium mb-1">💡 JSON格式示例：</div>
              <div class="text-13px">
                必须包含 <span class="font-mono text-primary">"act"</span> 和
                <span class="font-mono text-primary">"data"</span> 字段，SN
                可自动记录
              </div>
            </div>
          </NAlert>

          <!-- 服务器和GM指令 -->
          <div class="flex gap-16px">
            <!-- 服务器选择 -->
            <div class="flex-1">
              <div class="mb-8px text-14px font-medium">
                <span class="text-red-500">*</span> 目标服务器 (多选)
              </div>
              <NPopover
                trigger="click"
                placement="bottom-start"
                v-model:show="serverPopoverVisible"
                :width="'trigger'"
                :show-arrow="false"
              >
                <template #trigger>
                  <NInput
                    :value="selectedServerText"
                    readonly
                    placeholder="请选择服务器（支持多选）"
                    clearable
                    @clear="formData.serverId = []"
                  >
                    <template #suffix>
                      <NIcon><icon-ic-baseline-arrow-drop-down /></NIcon>
                    </template>
                  </NInput>
                </template>
                <div style="max-height: 400px; overflow-y: auto;">
                  <NTree
                    v-model:checked-keys="formData.serverId"
                    :data="serverTreeOptions"
                    :loading="serverLoading"
                    checkable
                    cascade
                    expand-on-click
                    :default-expand-all="false"
                    selectable
                    block-line
                  />
                </div>
              </NPopover>
            </div>

            <!-- GM指令选择/输入 -->
            <div class="flex-1">
              <div class="mb-8px text-14px font-medium">
                GM指令 (act 字段)
              </div>
              <NSelect
                v-model:value="formData.act"
                :options="gmTemplates"
                placeholder="请选择或输入GM指令"
                filterable
                tag
                :consistent-menu-width="false"
              />
            </div>
          </div>

          <!-- JSON数据编辑器 -->
          <div>
            <div class="mb-8px flex items-center justify-between">
              <div class="text-14px font-medium">
                <span class="text-red-500">*</span> 数据 (data 字段)
              </div>
              <NSpace size="small">
                <NButton size="small" @click="formatData">
                  <template #icon>
                    <icon-mdi-code-braces />
                  </template>
                  格式化
                </NButton>
                <NButton size="small" type="success" @click="validateJson">
                  <template #icon>
                    <icon-mdi-check-circle />
                  </template>
                  验证JSON
                </NButton>
                <NButton size="small" type="info" @click="generateSN">
                  <template #icon>
                    <icon-mdi-identifier />
                  </template>
                  生成SN
                </NButton>
                <NButton size="small" @click="compressJson">
                  <template #icon>
                    <icon-mdi-compress />
                  </template>
                  压缩
                </NButton>
                <NButton size="small" type="error" ghost @click="clearJsonData">
                  <template #icon>
                    <icon-mdi-delete />
                  </template>
                  清空
                </NButton>
              </NSpace>
            </div>
            <NInput
              v-model:value="jsonInput"
              type="textarea"
              placeholder='请输入JSON格式数据，例如: {"max_count": 1, "map_id": 391}'
              :rows="12"
              :autosize="false"
              :resizable="false"
              class="font-mono text-13px json-editor"
            />
          </div>

          <!-- SN显示 -->
          <div>
            <div class="mb-8px text-14px font-medium">SN (自动记录)</div>
            <NInput
              v-model:value="formData.sn"
              placeholder="执行时自动生成"
              readonly
              class="font-mono"
            />
          </div>

          <!-- 执行按钮 -->
          <div class="flex justify-center pt-16px">
            <NButton
              type="primary"
              size="large"
              :loading="loading"
              @click="executeCommand"
              class="w-full h-48px text-16px"
            >
              <template #icon>
                <icon-mdi-play-circle />
              </template>
              执行GM命令
            </NButton>
          </div>
        </div>
      </NCard>

      <!-- 右侧：执行历史 -->
      <NCard
        title="执行历史"
        :bordered="false"
        size="small"
        class="w-400px lt-lg:w-full card-wrapper"
      >
        <template #header-extra>
          <NTag type="info" size="small">
            最近10条执行记录
          </NTag>
        </template>

        <div class="space-y-8px max-h-600px overflow-y-auto">
          <div
            v-if="executeHistory.length === 0"
            class="text-center py-40px text-gray-400"
          >
            <icon-mdi-history class="text-48px mb-8px" />
            <div>暂无执行历史</div>
          </div>

          <div
            v-for="item in executeHistory.slice(0, 10)"
            :key="item.id"
            class="p-12px border border-gray-200 rounded-4px hover:shadow-sm transition-all cursor-pointer"
            @click="reExecuteFromHistory(item)"
          >
            <div class="flex items-center justify-between mb-8px">
              <NTag
                :type="item.status === 'success' ? 'success' : 'error'"
                size="small"
              >
                {{ item.act }}
              </NTag>
              <span class="text-12px text-gray-500">
                {{ format(new Date(item.time), "MM-dd HH:mm:ss") }}
              </span>
            </div>
            <div class="text-13px text-gray-600 mb-4px">
              服务器：{{ item.serverName }}
            </div>
            <div class="text-12px text-gray-500 font-mono truncate">
              SN: {{ item.sn }}
            </div>
          </div>

          <div v-if="executeHistory.length > 10" class="text-center pt-8px">
            <NButton text type="primary" @click="historyVisible = true">
              查看全部历史 ({{ executeHistory.length }})
            </NButton>
          </div>
        </div>
      </NCard>
    </div>

    <!-- 历史记录详情弹窗 -->
    <NModal v-model:show="historyVisible" preset="card" style="width: 1200px">
      <template #header>
        <div class="flex items-center justify-between">
          <span>执行历史详情</span>
          <NButton
            size="small"
            type="error"
            ghost
            @click="clearHistory"
          >
            清空全部
          </NButton>
        </div>
      </template>

      <NDataTable
        :columns="historyColumns"
        :data="executeHistory"
        :pagination="{ pageSize: 20 }"
        :max-height="500"
        size="small"
      />
    </NModal>
  </div>
</template>

<style scoped>
.card-wrapper {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.space-y-16px > * + * {
  margin-top: 16px;
}

.space-y-8px > * + * {
  margin-top: 8px;
}

/* JSON编辑器样式优化 */
.json-editor :deep(.n-input-wrapper),
.json-editor :deep(.n-input__textarea),
.json-editor :deep(.n-input__textarea-el) {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace !important;
  line-height: 1.6 !important;
  padding: 12px !important;
  border-radius: 4px;
  font-size: 13px;
  height: 300px !important;
  min-height: 300px !important;
  max-height: 300px !important;
  resize: none !important;
  overflow: hidden !important;
}

.json-editor :deep(.n-input__textarea-el) {
  overflow-y: auto !important;
}

:deep(.n-card__content) {
  padding: 20px;
}

/* 历史记录卡片悬浮效果 */
.hover\:shadow-sm:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border-color: var(--n-border-color-hover);
}

/* 修复滚动条样式 */
.max-h-600px {
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
}

.max-h-600px::-webkit-scrollbar {
  width: 6px;
}

.max-h-600px::-webkit-scrollbar-track {
  background: transparent;
}

.max-h-600px::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.max-h-600px::-webkit-scrollbar-thumb:hover {
  background-color: rgba(0, 0, 0, 0.3);
}
</style>
