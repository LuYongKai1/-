<script setup lang="tsx">
import { NButton, NPopconfirm, NTag, NSpace, NModal, NCard, NSpin, NTabs, NTabPane, NDropdown, NIcon } from "naive-ui";
import { fetchGetServeritemList, fetchGetServeritemDelete, fetchSortServerList, fetchGetServeritemStatusList } from "@/service/api";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import {
  serverStatusShow,
  serverRunStateRecord,
  clusterStatusRecord,
} from "@/constants/business";
import { useTable, useTableOperate } from "@/hooks/common/table";
import ItemOperateDrawer from "./modules/item-operate-drawer.vue";
import ItemSelect from "./modules/item-select.vue";
import DeploymentStatus from "./modules/deployment-status.vue";
import CrossListContent from "./servercoross/cross-list-content.vue";
import MergePlanContent from "./servermerge/merge-plan-content.vue";
import MergeListContent from "./servermerge/merge-list-content.vue";
import UpdateServerModal from "./modules/update-server-modal.vue";
import ServerConfigModal from "./modules/server-config-modal.vue";
import VersionManagementModal from "./modules/version-management-modal.vue";
import ModifyVersionModal from "./modules/modify-version-modal.vue";
import RefreshConfigModal from "./modules/refresh-config-modal.vue";
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { format } from 'date-fns';
import GroupOperateDrawer from './modules/group-operate-drawer.vue';
import { useAuth } from '@/hooks/business/auth';
import { handleApiResponseError, handleApiCatchError } from '@/utils/common';
import { useServerOperations } from './composables/useServerOperations';

const { hasAuth } = useAuth();

const appStore = useAppStore();

const activeTab = ref('tab1');  //切换标签页

// 跨服列表组件引用
const crossListRef = ref<any>(null);

// 合服计划组件引用
const mergePlanRef = ref<any>(null);

// 合服列表组件引用
const mergeListRef = ref<any>(null);

const groupDrawerVisible = ref(false);
const groupOperateType = ref<NaiveUI.TableOperateType>('add');
const groupRowData = ref<Api.SystemManage.servergroup | null>(null);
const groupDrawerMode = ref<'queue' | 'maxPlayers'>('queue');

/** 数据自动刷新间隔(毫秒) */
const DATA_REFRESH_INTERVAL = 5000;

/** 定时刷新计时器 */
const refreshTimer = ref<number | null>(null);

/** 轮询刷新时隐藏表格 loading */
const suppressLoading = ref<boolean>(false);

/** 合服计划自动刷新间隔(毫秒) */
const MERGE_PLAN_REFRESH_INTERVAL = 5000;

/** 合服计划定时刷新计时器 */
const mergePlanRefreshTimer = ref<number | null>(null);


// 更新服务器状态、在线人数、集群状态、排队人数、服务器版本、服务器状态和服务器标签
async function updateServerStatus(): Promise<void> {
  try {
    const response = await fetchGetServeritemStatusList();
    const statusList = (Array.isArray(response) ? response : response?.data || []) as Api.SystemManage.ServeritemStatus[];
    if (statusList.length === 0) return;

    const statusMap = new Map<string, Api.SystemManage.ServeritemStatus>(
      statusList.map((item) => [String(item.serverId), item])
    );
    let hasUpdate = false;

    data.value.forEach((server: any) => {
      const statusData: Api.SystemManage.ServeritemStatus | undefined = statusMap.get(String(server.serverId));
      if (statusData) {
        const fields: (keyof Api.SystemManage.ServeritemStatus)[] = ['runState', 'onlineUser', 'clusterStatus', 'serverQueuePlayer', 'serverVersion', 'serverStatus', 'serverNew'];
        const changed = fields.some(field => server[field] !== statusData[field]);

        if (changed) {
          server.runState = statusData.runState;
          server.onlineUser = statusData.onlineUser;
          if (statusData.clusterStatus != null) server.clusterStatus = statusData.clusterStatus;
          if (statusData.serverQueuePlayer != null) server.serverQueuePlayer = statusData.serverQueuePlayer;
          if (statusData.serverVersion != null) server.serverVersion = statusData.serverVersion;
          if (statusData.serverStatus != null) server.serverStatus = statusData.serverStatus;
          if (statusData.serverNew != null) server.serverNew = statusData.serverNew;
          hasUpdate = true;
        }
      }
    });

    // 直接依赖响应式数据更新表格，无需强制重新渲染
  } catch (error) {
    console.error('更新服务器状态失败:', error);
  }
}

/*
 * 开始数据自动刷新
 */
function startDataRefresh(): void {
  // 防止重复启动
  if (refreshTimer.value) return;

  refreshTimer.value = window.setInterval(async () => {
    try {
      suppressLoading.value = true;
      await updateServerStatus();
    } catch (error) {
      console.error('自动刷新数据失败:', error);
    } finally {
      suppressLoading.value = false;
    }
  }, DATA_REFRESH_INTERVAL);
}

/**
 * 停止数据自动刷新
 */
function stopDataRefresh(): void {
  if (refreshTimer.value) {
    clearInterval(refreshTimer.value);
    refreshTimer.value = null;
  }
}

/**
 * 开始合服计划数据自动刷新
 */
function startMergePlanRefresh(): void {
  if (mergePlanRefreshTimer.value) return;

  mergePlanRefreshTimer.value = window.setInterval(async () => {
    if (activeTab.value !== 'tab3' || !mergePlanRef.value?.getData) return;
    try {
      await mergePlanRef.value.getData();
    } catch (error) {
      console.error('自动刷新合服计划失败:', error);
    }
  }, MERGE_PLAN_REFRESH_INTERVAL);
}

/**
 * 停止合服计划数据自动刷新
 */
function stopMergePlanRefresh(): void {
  if (mergePlanRefreshTimer.value) {
    clearInterval(mergePlanRefreshTimer.value);
    mergePlanRefreshTimer.value = null;
  }
}

// 表格数据管理
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
  updateSearchParams,
} = useTable<any>({
  apiFn: fetchGetServeritemList,
  showTotal: true,
  apiParams: {
    current: 1,
    size: 30,
  },
  columns: () => [
    {
      type: "selection",
      align: "center",
      width: 48,
    },
    {
      key: "sort",
      title: $t("page.manage.serveritem.sort"),
      align: "center",
      width: 60,
      render: (row: any, index: number) => {
        if (!hasAuth('game:item:edit')) {
          return null;
        }

        const currentIndex = data.value.findIndex((item: any) => item.id === row.id);
        const isFirst = currentIndex === 0;
        const isLast = currentIndex === data.value.length - 1;

        const dropdownOptions = [
          {
            label: $t("page.manage.serveritem.moveUp"),
            key: 'moveUp',
            disabled: isFirst,
            icon: () => <icon-mdi-arrow-up class="text-16px" />
          },
          {
            label: $t("page.manage.serveritem.moveDown"),
            key: 'moveDown',
            disabled: isLast,
            icon: () => <icon-mdi-arrow-down class="text-16px" />
          }
        ];

        return (
          <NDropdown
            options={dropdownOptions}
            onSelect={(key: string) => {
              if (key === 'moveUp' && !isFirst) {
                handleMoveUp(row, currentIndex);
              } else if (key === 'moveDown' && !isLast) {
                handleMoveDown(row, currentIndex);
              }
            }}
            trigger="click"
          >
            <NButton
              size="small"
              quaternary
              circle
              disabled={isFirst && isLast}
            >
              {{
                icon: () => <icon-mdi-swap-vertical class="text-16px" />
              }}
            </NButton>
          </NDropdown>
        );
      }
    },
    {
      key: "serverId",
      title: $t("page.manage.serveritem.serverId"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "serverName" as any,
      title: $t("page.manage.serveritem.serverName"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "runState" as any,
      title: $t("page.manage.serveritem.runState"),
      align: "center",
      minWidth: 100,
      render: (row: any) => {
        // 强制使用当前行数据，避免缓存
        const currentRow = data.value.find((item: any) => item.id === row.id) || row;

        if (currentRow.runState === null || currentRow.runState === undefined) {
          return null;
        }

        const stateColors: Record<number, string> = {
          0: '#00FF00', // 绿色
          1: '#FFA500', // 黄色
          2: '#FF0000', // 红色
          3: '#86909c', // 灰色
        };

        const state = Number(currentRow.runState);
        const color = stateColors[state] || '#86909c';
        const stateText = $t(serverRunStateRecord[String(state) as Api.SystemManage.serverRunState]);

        return (
          <div class="flex-center">
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: color
            }}></div>
            <span class="ml-2">{stateText}</span>
          </div>
        );
      }
    },
    {
      key: "onlineUser" as any,
      title: $t("page.manage.serveritem.onlineUser"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "serverQueuePlayer" as any,
      title: $t("page.manage.serveritem.serverQueuePlayer"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "serverIp" as any,
      title: $t("page.manage.serveritem.serverIp"),
      align: "center",
    },
    {
      key: "serverPort" as any,
      title: $t("page.manage.serveritem.serverPort"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "intranetIp" as any,
      title: $t("page.manage.serveritem.intranetIp"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "serverOpenDate" as any,
      title: $t("page.manage.serveritem.serverOpenDate"),
      align: "center",
      minWidth: 120,
      render: (row: any) => {
        if (row.serverOpenDate) {
          try {
            const date = new Date(row.serverOpenDate);
            return <span style={{ whiteSpace: 'nowrap' }}>{format(date, 'yyyy-MM-dd HH:mm:ss')}</span>;
          } catch (error) {
            console.error("Error formatting date:", error);
            return row.serverOpenDate;
          }
        }
        return null;
      },
    },
    {
      key: "serverOpenDays" as any,
      title: $t("page.manage.serveritem.serverOpenDays"),
      align: "center",
      minWidth: 100,
      render: (row: any) => {
        if (row.serverOpenDate) {
          try {
            const openDate = new Date(row.serverOpenDate);
            const now = new Date();

            // 按照自然日计算：将时间归零到当天的00:00:00
            const openDateOnly = new Date(openDate.getFullYear(), openDate.getMonth(), openDate.getDate());
            const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            // 计算自然日差值，开服当天算第1天
            const diffTime = nowDateOnly.getTime() - openDateOnly.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

            if (diffDays < 1) {
              return <span class="text-gray-400">{$t("page.manage.serveritem.notOpenYet")}</span>;
            } else if (diffDays === 1) {
              return <span class="text-success">{$t("page.manage.serveritem.today")}</span>;
            } else {
              return <span>{diffDays} {$t("page.manage.serveritem.days")}</span>;
            }
          } catch (error) {
            console.error("Error calculating days:", error);
            return null;
          }
        }
        return null;
      },
    },
    {
      key: "serverTags" as any,
      title: $t("page.manage.serveritem.serverTags"),
      align: "center",
      minWidth: 180,
      render: (row: any) => {
        if (row.serverNew === null || row.serverNew === undefined) {
          return null;
        }

        const serverNew = Number(row.serverNew);
        const tags = [];
        if (serverNew & 1) {
          tags.push(<NTag  type="success" >{$t("page.manage.serveritem.new")}</NTag>);
        }
        if (serverNew & 2) {
          tags.push(<NTag  type="info">{$t("page.manage.serveritem.recommend")}</NTag>);
        }
        if (serverNew & 4) {
          tags.push(<NTag  type="warning" >{$t("page.manage.serveritem.hot")}</NTag>);
        }
        if (serverNew & 8) {
          tags.push(<NTag type="error">{$t("page.manage.serveritem.noCreateRole")}</NTag>);
        }
        return tags.length > 0 ? <div class="flex-center flex-wrap gap-1">{tags}</div> : null;
      },
    },
    {
      key: "serverStatus" as any,
      title: $t("page.manage.serveritem.serverStatus"),
      align: "center",
      minWidth: 100,
      render: (row: any) => {
        if (row.serverStatus === null) {
          return null;
        }
        const typeMap: Record<Api.SystemManage.serverStatus, string> = {
          0: "success",
          1: "warning",
          2: "error",
          3: "default",
          4: "info",
          5: "default",
        };

        const label = $t(serverStatusShow[row.serverStatus as any]);
        return (
          <NTag  type={typeMap[row.serverStatus as any] || "default"}>
            {label}
          </NTag>
        );
      },
    },
    {
      key: "deploymentStatus" as any,
      title: $t("page.manage.serveritem.deployment.deploymentStatus"),
      align: "center",
      minWidth: 150,
      render: (row: any) => {
        // 强制使用当前行数据，避免缓存
        const currentRow = data.value.find((item: any) => item.id === row.id) || row;

        // 显示集群状态
        if (currentRow.clusterStatus !== null && currentRow.clusterStatus !== undefined) {
          const statusColors: Record<string, string> = {
            '-1': '#86909c', // 初始化 - 灰色
            '0': '#1890ff', // 创建中 - 蓝色
            '1': '#52c41a', // 创建成功 - 绿色
            '2': '#ff4d4f', // 创建失败 - 红色
            '3': '#faad14', // 部署中 - 橙色
            '4': '#52c41a', // 运行中 - 绿色
            '5': '#ff4d4f', // 已停止 - 橙黄色
            '6': '#ff4d4f', // 删除中 - 红色
            '7': '#d9d9d9', // 已删除 - 浅灰色
            '8': '#1890ff', // 更新中 - 蓝色
            '9': '#722ed1', // 已回滚 - 紫色
          };

          const status = String(currentRow.clusterStatus) as Api.SystemManage.clusterStatus;
          const color = statusColors[status] || '#86909c';
          const statusText = $t(clusterStatusRecord[status]);

          return (
            <div class="flex-center gap-8px">
              <div class="flex-center">
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: color
                }}></div>
                <span class="ml-2">{statusText}</span>
              </div>
              {currentRow.taskId && hasAuth(['server:task:view', 'server:progress:summary', 'server:progress:delete', 'server:task:history']) && (
                <NButton
                  text
                  type="primary"
                  size="small"
                  onClick={() => handleViewReward(currentRow.taskId, currentRow.clusterStatus, undefined, currentRow.serverId)}
                  class="hover:bg-primary-50"
                >
                  {{
                    icon: () => <icon-mdi-eye-outline class="text-lg" />
                  }}
                </NButton>
              )}
            </div>
          );
        }

        // 如果没有集群状态，只显示查看按钮
        if (currentRow.taskId && hasAuth(['server:task:view', 'server:progress:summary', 'server:progress:delete', 'server:task:history'])) {
          return (
            <NButton
              text
              type="primary"
              size="small"
              onClick={() => handleViewReward(currentRow.taskId, currentRow.clusterStatus)}
              class="hover:bg-primary-50"
            >
              {{
                icon: () => <icon-mdi-eye-outline class="text-lg" />
              }}
            </NButton>
          );
        }

        return <span class="text-gray-300">-</span>;
      },
    },
    {
      key: "serverVersion" as any,
      title: $t("page.manage.serveritem.serverVersion"),
      align: "center",
      minWidth: 100,
    },
    {
      key: "serverConfig" as any,
      // title: $t("page.manage.serveritem.serverConfig"),
      align: "center",
      width: 80,
      render: (row: any) => {
        return (
          <NButton
            text
            type="info"
            size="small"
            onClick={() => handleViewConfig(row.id, row)}
            class="hover:bg-primary-50"
          >
            {{
              icon: () => <icon-mdi-cog-outline class="text-lg" />
            }}
          </NButton>
        );
      },
    },
    {
      key: "operate",
      title: $t("common.operate"),
      align: "center",
      width: 130,
      render: (row) => (
        <div class="flex-center gap-8px">
          {hasAuth('game:item:edit') && (
            <NButton
              type="primary"
              ghost
              size="small"
              onClick={() => edit(row.id, row)}
            >
              {$t("common.edit")}
            </NButton>
          )}

          {hasAuth('game:item:remove') && (
            <NPopconfirm onPositiveClick={() => handleDelete(row.id)}>
            {{
              default: () => $t("common.confirmDelete"),
              trigger: () => (
                <NButton type="error" ghost size="small">
                  {$t("common.delete")}
                </NButton>
              ),
            }}
          </NPopconfirm>
          )}
        </div>
      ),
    },
  ],
});

const defaultHiddenKeys = ['serverPort', 'intranetIp','sort','serverIp'];
columnChecks.value.forEach((columnCheck) => {
  if (defaultHiddenKeys.includes(columnCheck.key as string)) {
    columnCheck.checked = false;
  }
});

const {
  drawerVisible,
  operateType,
  editingData,
  handleEdit,
  checkedRowKeys,
  onBatchDeleted,
  onDeleted,
} = useTableOperate<any>(data, getData);

// 使用服务器操作组合式函数
const serverOperations = useServerOperations(
  data,
  checkedRowKeys,
  getData,
  activeTab,
  crossListRef
);

// 统一的新增处理函数
function handleAdd() {
  // 合服计划和合服列表使用组件内部的新增方法
  if (activeTab.value === 'tab3') {
    mergePlanRef.value?.handleAdd();
  } else if (activeTab.value === 'tab4') {
    mergeListRef.value?.handleAdd();
  } else {
    // 服务器列表和跨服列表使用通用抽屉
    operateType.value = 'add';
    editingData.value = null;
    drawerVisible.value = true;
  }
}

// 跨服列表的编辑处理函数
function handleCrossEdit(id: number, rowData: any) {
  operateType.value = 'edit';
  editingData.value = rowData;
  drawerVisible.value = true;
}

// 查看合服详情
function handleViewMergeDetail(id: number, rowData: any) {
  // TODO: 实现查看合服详情的逻辑
  window.$message?.info('查看合服详情功能待实现');
}

/**
 * 检查服务器是否可以删除函数
 */
function checkDeletePermission(servers: any[]) {
  // 允许删除的状态：-1(初始化)、2(创建失败)、7(已删除)、9(已回滚)
  const allowedStatuses = ['-1', '2', '7', '9'];

  return servers.filter((server: any) => {
    // 如果没有 clusterStatus，允许删除
    if (server.clusterStatus === null || server.clusterStatus === undefined) {
      return false;
    }
    const status = String(server.clusterStatus);
    return !allowedStatuses.includes(status);
  });
}

/**
 * 将树形数据(包含 children)展开为一维数组，保证子菜单也能参与批量/单项操作。
 */
function flattenTreeRows(items: any[]): any[] {
  const result: any[] = [];
  const walk = (arr: any[]) => {
    if (!Array.isArray(arr)) return;
    for (const item of arr) {
      if (!item) continue;
      result.push(item);
      if (Array.isArray(item.children) && item.children.length > 0) {
        walk(item.children);
      }
    }
  };
  walk(items);
  return result;
}

// 批量删除
async function handleBatchDelete() {
  try {
    const selectedKeys = [...checkedRowKeys.value];

    if (selectedKeys.length === 0) {
      window.$message?.warning($t('common.pleaseSelectData'));
      return;
    }

    // 获取选中的服务器（支持子菜单）
    const flatRows = flattenTreeRows(data.value);
    const selectedKeysAsNumbers = selectedKeys.map((key) => Number(key));
    const selectedServers = flatRows.filter((item: any) =>
      selectedKeysAsNumbers.includes(Number(item.id))
    );

    if (selectedServers.length === 0) {
      window.$message?.warning($t('common.pleaseSelectData'));
      return;
    }

    // 检查删除权限
    const invalidServers = checkDeletePermission(selectedServers);

    if (invalidServers.length > 0) {
      const statusNames = invalidServers.map((server: any) => {
        const status = String(server.clusterStatus) as Api.SystemManage.clusterStatus;
        return `${server.serverName}(${$t(clusterStatusRecord[status])})`;
      }).join('、');

      window.$message?.error(
        $t('page.manage.serveritem.onlyDeleteAllowedStatus') + ': ' + statusNames
      );
      return;
    }

    const response = await fetchGetServeritemDelete({
      id: selectedKeys.map(key => Number(key)) as any,
    });

    if (!handleApiResponseError(response, '批量删除')) {
      onBatchDeleted();
      checkedRowKeys.value = [];
    }
  } catch (error) {
    handleApiCatchError(error, '批量删除');
  }
}

// 单个删除
async function handleDelete(id: number) {
  try {
    const flatRows = flattenTreeRows(data.value);
    const server = flatRows.find((item: any) => Number(item.id) === Number(id));

    if (!server) {
      window.$message?.warning($t('common.pleaseSelectData'));
      return;
    }

    // 检查删除权限
    const invalidServers = checkDeletePermission([server]);

    if (invalidServers.length > 0) {
      const status = String(server.clusterStatus) as Api.SystemManage.clusterStatus;
      const statusText = $t(clusterStatusRecord[status]);
      window.$message?.error(
        $t('page.manage.serveritem.cannotDeleteInStatus') + ': ' + statusText
      );
      return;
    }

    const response = await fetchGetServeritemDelete({ id });

    if (!handleApiResponseError(response, '删除')) {
      onDeleted();
    }
  } catch (error) {
    handleApiCatchError(error, '删除');
  }
}

function edit(id: number, row: any) {
  const editData = {
    ...row,
  };
  handleEdit(id, editData);
}

// 查看服务器配置
const showConfigModal = ref(false);
const configData = ref<any>(null);

function handleViewConfig(id: number, row: any) {
  configData.value = row;
  showConfigModal.value = true;
}

function handleSearch(groupIds: string[]) {
  updateSearchParams({
    groupIds: groupIds.length > 0 ? groupIds.map(id => Number(id)) : undefined,
  });
  getData();
}

// 踢出所有玩家 - 使用组合式函数
async function handleKickAll() {
  await serverOperations.handleKickAll();
}

// 设置维护模式 - 使用组合式函数
async function handleMaintenance() {
  await serverOperations.handleMaintenance();
}

function handleQueue() {
  const selectedIds = checkedRowKeys.value;
  if (selectedIds.length === 0) {
    window.$message?.warning($t('common.noServerSelected'));
    return;
  }

  const flatRows = flattenTreeRows(data.value);
  // 获取选中服务器的serverId
  const selectedServerIds = selectedIds.map(id => {
    const server = flatRows.find((item: any) => String(item.id) === String(id));
    return server?.serverId;
  }).filter(Boolean);

  if (selectedServerIds.length === 0) {

    window.$message?.warning($t('common.noValidServerSelected'));
    return;
  }

  groupDrawerMode.value = 'queue';
  groupOperateType.value = 'add';
  groupRowData.value = {
    gameId: "101",
    setto: "",
    serverList: selectedServerIds.join(',')
  } as any;
  groupDrawerVisible.value = true;
}

// 设置正常模式 - 使用组合式函数
async function handleNormal() {
  await serverOperations.handleNormal();
}

// 设置最大人数
function handleMaxPlayers() {
  const selectedIds = checkedRowKeys.value;
  if (selectedIds.length === 0) {
    window.$message?.warning($t('common.noServerSelected'));
    return;
  }

  const flatRows = flattenTreeRows(data.value);
  // 获取选中服务器的serverId
  const selectedServerIds = selectedIds.map(id => {
    const server = flatRows.find((item: any) => String(item.id) === String(id));
    return server?.serverId;
  }).filter(Boolean);

  if (selectedServerIds.length === 0) {
    window.$message?.warning($t('common.noValidServerSelected'));
    return;
  }

  groupDrawerMode.value = 'maxPlayers';
  groupOperateType.value = 'add';
  groupRowData.value = {
    gameId: "101",
    setto: "",
    serverList: selectedServerIds.join(',')
  } as any;
  groupDrawerVisible.value = true;
}

// 启动服务器 - 使用组合式函数
async function handleStartServer() {
  await serverOperations.handleStartServer();
}

// 停止服务器 - 使用组合式函数
async function handleStopServer() {
  await serverOperations.handleStopServer();
}

// 重启服务器 - 使用组合式函数
async function handleRestartServer() {
  await serverOperations.handleRestartServer();
}

// 释放服务器 - 使用组合式函数
async function handleReleaseServer() {
  await serverOperations.handleReleaseServer();
}

// 同步云服务器 - 使用组合式函数
async function handleSyncCloudServer() {
  await serverOperations.handleSyncCloudServer();
}

// 查看部署状态 - 使用组合式函数
async function handleViewReward(taskId: string, clusterStatus?: string | number, taskType?: 'deploy' | 'release', serverId?: number) {
  await serverOperations.handleViewReward(taskId, clusterStatus, taskType, serverId);
}

// 版本号管理 按钮操作
const showVersionManagementModal = ref(false);
function handleVersionManagement() {
  showVersionManagementModal.value = true;
}

// 刷新配置 按钮操作
const showRefreshConfigModal = ref(false);
function handleRefreshConfig() {
  showRefreshConfigModal.value = true;
}

// 修改版本 按钮操作
const showModifyVersionModal = ref(false);
function handleModifyVersion() {
  showModifyVersionModal.value = true;
}

// 使用组合式函数中的状态
const {
  isServerDeployed,
  canReleaseServer,
  canUpdateServer,
  canStartServer,
  canStopServer,
  canRestartServer,
  showSyncStatusModal,
  syncStatusData,
  syncStatusLoading,
  sseConnectionStatus,
  sseErrorMessage,
  realTimeLogs,
  modalTitle,
  showUpdateServerModal,
  updateServerId,
  syncServerModalMode,
  currentServerId
} = serverOperations;

// 处理更新服务器弹框的确认事件
function handleConfirmServerModal(data: { repo: any; chart: any }) {
  if (syncServerModalMode.value === 'sync') {
    serverOperations.handleConfirmSyncCloudServer(data);
  } else {
    serverOperations.handleConfirmUpdateServer(data);
  }
}

// 监听选中行的变化，检查部署状态
watch(checkedRowKeys, serverOperations.updateDeploymentStatus, { immediate: false });

// 监听跨服列表的选中行变化
watch(() => crossListRef.value?.checkedRowKeys, (newKeys) => {
  if (activeTab.value === 'tab2' && newKeys) {
    serverOperations.updateDeploymentStatus(newKeys);
  }
}, { immediate: false });

// 监听 tab 切换，清空复选框
watch(activeTab, (newTab) => {
  // 清空服务器列表的复选框
  checkedRowKeys.value = [];
  // 清空跨服列表的复选框
  if (crossListRef.value) {
    crossListRef.value.checkedRowKeys = [];
  }
  // 清空合服计划的复选框
  if (mergePlanRef.value) {
    mergePlanRef.value.checkedRowKeys = [];
  }
  // 清空合服列表的复选框
  if (mergeListRef.value) {
    mergeListRef.value.checkedRowKeys = [];
  }

  // 合服计划列表仅在合服计划标签页时自动刷新
  if (newTab === 'tab3') {
    startMergePlanRefresh();
  } else {
    stopMergePlanRefresh();
  }
});

/**
 * 移动服务器位置（上移/下移）
 */
async function handleMoveServer(row: any, currentIndex: number, direction: 'up' | 'down') {
  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

  if (targetIndex < 0 || targetIndex >= data.value.length) return;

  try {
    const currentRow = data.value[currentIndex];
    const targetRow = data.value[targetIndex];
    const action = direction === 'up' ? '上移' : '下移';

    // 交换排序权重
    const currentSort = currentRow.sortWeight || currentIndex + 1;
    const targetSort = targetRow.sortWeight || targetIndex + 1;

    // 同时更新两条数据的排序权重
    const [response1, response2] = await Promise.all([
      fetchSortServerList({ serverId: Number(currentRow.serverId), sortWeight: targetSort }),
      fetchSortServerList({ serverId: Number(targetRow.serverId), sortWeight: currentSort })
    ]);

    if (!handleApiResponseError(response1, action) && !handleApiResponseError(response2, action)) {
      window.$message?.success($t('common.operateSuccess'));
      await getData();
    }
  } catch (error) {
    handleApiCatchError(error, direction === 'up' ? '上移' : '下移');
  }
}

/**
 * 上移服务器
 */
function handleMoveUp(row: any, currentIndex: number) {
  handleMoveServer(row, currentIndex, 'up');
}

/**
 * 下移服务器
 */
function handleMoveDown(row: any, currentIndex: number) {
  handleMoveServer(row, currentIndex, 'down');
}

onMounted(() => {
  data.value = [];
  // 启动自动刷新功能，实时更新 runState、onlineUser、clusterStatus 和 serverQueuePlayer 字段
  startDataRefresh();
});

/**
 * 统一的操作方法 - 根据当前标签页调用对应的实现
 */
const unifiedOperations = {
  // 刷新数据
  handleRefresh: () => {
    if (activeTab.value === 'tab1') {
      return getData();
    } else if (activeTab.value === 'tab2') {
      return crossListRef.value?.getData();
    } else if (activeTab.value === 'tab3') {
      return mergePlanRef.value?.getData();
    } else if (activeTab.value === 'tab4') {
      return mergeListRef.value?.getData();
    }
  },

  // 批量删除
  handleBatchDeleteUnified: () => {
    if (activeTab.value === 'tab1') {
      return handleBatchDelete();
    } else if (activeTab.value === 'tab2') {
      return crossListRef.value?.handleBatchDelete();
    } else if (activeTab.value === 'tab3') {
      return mergePlanRef.value?.handleBatchDelete();
    } else if (activeTab.value === 'tab4') {
      return mergeListRef.value?.handleBatchDelete();
    }
  },

  // 启动服务器
  handleStartServerUnified: () => {
    if (activeTab.value === 'tab1') {
      return handleStartServer();
    } else {
      return crossListRef.value?.handleStartServer();
    }
  },

  // 停止服务器
  handleStopServerUnified: () => {
    if (activeTab.value === 'tab1') {
      return handleStopServer();
    } else {
      return crossListRef.value?.handleStopServer();
    }
  },

  // 重启服务器
  handleRestartServerUnified: () => {
    if (activeTab.value === 'tab1') {
      return handleRestartServer();
    } else {
      return crossListRef.value?.handleRestartServer();
    }
  },

  // 同步云服务器
  handleSyncCloudServerUnified: () => {
    if (activeTab.value === 'tab1') {
      return handleSyncCloudServer();
    } else {
      return crossListRef.value?.handleSyncCloudServer();
    }
  },

  // 释放服务器
  handleReleaseServerUnified: () => {
    if (activeTab.value === 'tab1') {
      return handleReleaseServer();
    } else {
      return crossListRef.value?.handleReleaseServer();
    }
  },

  // 更新服务器
  handleUpdateServerUnified: () => {
    if (activeTab.value === 'tab1') {
      return serverOperations.handleUpdateServer();
    } else {
      return crossListRef.value?.handleUpdateServer?.();
    }
  }
};

/**
 * 组件卸载前清理所有资源
 */
onBeforeUnmount(() => {
  serverOperations.cleanup();
  stopDataRefresh();
  stopMergePlanRefresh();
});
</script>

<template>
  <div
    class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto"
  >
    <!-- 搜索组件 -->
    <ItemSelect
      v-model:model="searchParams"
      @reset="resetSearchParams"
      @search="handleSearch"
    />

    <NCard
      :bordered="false"
      size="small"
      class="sm:flex-1-hidden card-wrapper"
    >
      <template #header>
        <div class="flex items-center gap-16px">
          <NTabs v-model:value="activeTab" type="line" size="small">
            <NTabPane name="tab1" :tab="$t('page.manage.serveritem.title')" />
            <NTabPane name="tab2" :tab="$t('page.manage.servercross.title')" />
            <NTabPane name="tab3" tab="合服计划" />
            <NTabPane name="tab4" tab="合服列表" />
          </NTabs>
        </div>
      </template>

      <template #header-extra>
        <!-- 服务器列表操作按钮 -->
        <NSpace v-if="activeTab === 'tab1'">
          <TableHeaderOperation
            v-model:columns="columnChecks"
            :disabled-delete="checkedRowKeys.length === 0"
            :loading="loading"
            @add="handleAdd"
            @delete="unifiedOperations.handleBatchDeleteUnified"
            @refresh="unifiedOperations.handleRefresh"
            @kick-all="handleKickAll"
            @maintenance="handleMaintenance"
            @queue="handleQueue"
            @normal="handleNormal"
            @max-players="handleMaxPlayers"
            @start-server="unifiedOperations.handleStartServerUnified"
            @stop-server="unifiedOperations.handleStopServerUnified"
            @restart-server="unifiedOperations.handleRestartServerUnified"
            @sync-cloud-server="unifiedOperations.handleSyncCloudServerUnified"
            @release-server="unifiedOperations.handleReleaseServerUnified"
            @update-server="unifiedOperations.handleUpdateServerUnified"
            :show-add="hasAuth('game:item:add')"
            :show-batch-delete="hasAuth('game:item:remove')"
            :show-start-server="hasAuth('k8s:scale:up')"
            :disabled-start-server="checkedRowKeys.length === 0 || !canStartServer"
            :show-stop-server="hasAuth('k8s:scale:down')"
            :disabled-stop-server="checkedRowKeys.length === 0 || !canStopServer"
            :show-restart-server="hasAuth('k8s:pod:restart')"
            :disabled-restart-server="checkedRowKeys.length === 0 || !canRestartServer"
            :show-sync-cloud-server="hasAuth('server:create')"
            :disabled-sync-cloud-server="checkedRowKeys.length === 0 || isServerDeployed"
            :show-release-server="hasAuth('server:delete')"
            :disabled-release-server="checkedRowKeys.length === 0 || !canReleaseServer"
            :show-update-server="hasAuth('server:update')"
            :disabled-update-server="checkedRowKeys.length === 0 || !canUpdateServer"
            :show-maintenance="hasAuth('game:item:maintenance')"
            :show-queue="hasAuth('game:item:queue')"
            :show-normal="hasAuth('game:item:normalstate')"
            :show-max-players="hasAuth('game:item:queue')"
            :show-kick-all="hasAuth('game:item:kickAll')"
            :show-server-operations="true"
            :show-mode-operations="true"
            :show-player-operations="true"
            :show-version-management="hasAuth('game:item:edit')"
            @version-management="handleVersionManagement"
            :show-modify-version="hasAuth('k8s:configmap:updateBatch')"
            @modify-version="handleModifyVersion"
            :show-refresh-config="hasAuth('k8s:config:reload')"
            @refresh-config="handleRefreshConfig"
          />
        </NSpace>

        <!-- 跨服列表操作按钮 -->
        <NSpace v-else-if="activeTab === 'tab2' && crossListRef">
          <TableHeaderOperation
            v-model:columns="crossListRef.columnChecks"
            :disabled-delete="crossListRef.checkedRowKeys.length === 0"
            :loading="crossListRef.loading"
            @add="handleAdd"
            @delete="unifiedOperations.handleBatchDeleteUnified"
            @refresh="unifiedOperations.handleRefresh"
            @sync="crossListRef.handleSync"
            @normal="crossListRef.handleNormal"
            @start-server="unifiedOperations.handleStartServerUnified"
            @stop-server="unifiedOperations.handleStopServerUnified"
            @restart-server="unifiedOperations.handleRestartServerUnified"
            @sync-cloud-server="unifiedOperations.handleSyncCloudServerUnified"
            @release-server="unifiedOperations.handleReleaseServerUnified"
            @update-server="unifiedOperations.handleUpdateServerUnified"
            :show-add="hasAuth('game:item:add')"
            :show-batch-delete="hasAuth('game:item:edit')"
            :showsynv="hasAuth('game:gm:syncCrossServer')"
            :show-start-server="hasAuth('k8s:scale:up')"
            :disabled-start-server="crossListRef.checkedRowKeys.length === 0 || !crossListRef.canStartServer"
            :show-stop-server="hasAuth('k8s:scale:down')"
            :disabled-stop-server="crossListRef.checkedRowKeys.length === 0 || !crossListRef.canStopServer"
            :show-restart-server="hasAuth('k8s:pod:restart')"
            :disabled-restart-server="crossListRef.checkedRowKeys.length === 0 || !crossListRef.canRestartServer"
            :show-sync-cloud-server="hasAuth('server:create')"
            :disabled-sync-cloud-server="crossListRef.checkedRowKeys.length === 0 || crossListRef.isServerDeployed"
            :show-release-server="hasAuth('server:delete')"
            :disabled-release-server="crossListRef.checkedRowKeys.length === 0 || !crossListRef.canReleaseServer"
            :show-update-server="hasAuth('server:update')"
            :disabled-update-server="crossListRef.checkedRowKeys.length === 0 || !crossListRef.canUpdateServer"
            :show-normal="hasAuth('game:item:normalstate')"
            :show-server-operations="true"
            :show-mode-operations="true"
            :show-version-management="hasAuth('game:item:edit')"
            @version-management="handleVersionManagement"
            :show-modify-version="hasAuth('k8s:configmap:updateBatch')"
            @modify-version="handleModifyVersion"
            :show-refresh-config="hasAuth('k8s:config:reload')"
            @refresh-config="handleRefreshConfig"
          />
        </NSpace>

        <!-- 合服计划操作按钮 -->
        <NSpace v-else-if="activeTab === 'tab3' && mergePlanRef">
          <TableHeaderOperation
            v-model:columns="mergePlanRef.columnChecks"
            :disabled-delete="mergePlanRef.checkedRowKeys.length === 0"
            :loading="mergePlanRef.loading"
            @add="handleAdd"
            @delete="unifiedOperations.handleBatchDeleteUnified"
            @refresh="unifiedOperations.handleRefresh"
            :show-add="hasAuth('game:item:add')"
            :show-batch-delete="hasAuth('game:item:remove')"
          />
        </NSpace>

        <!-- 合服列表操作按钮 -->
        <NSpace v-else-if="activeTab === 'tab4' && mergeListRef">
          <TableHeaderOperation
            v-model:columns="mergeListRef.columnChecks"
            :loading="mergeListRef.loading"
            @refresh="unifiedOperations.handleRefresh"
            :show-add="false"
            :show-batch-delete="false"
          />
        </NSpace>
      </template>

      <!-- 服务器列表标签页 -->
      <div v-if="activeTab === 'tab1'" class="h-full">
        <NDataTable
          v-model:checked-row-keys="checkedRowKeys"
          :columns="columns"
          :data="data"
          size="small"
          :flex-height="!appStore.isMobile"
          :scroll-x="1080"
          :loading="!suppressLoading && loading"
          remote
          :row-key="(row) => row.id"
          :pagination="mobilePagination"
          children-key="children"
          :cascade="false"
          class="sm:h-full"
        />

        <GroupOperateDrawer
          v-model:visible="groupDrawerVisible"
          :operate-type="groupOperateType"
          :row-data="groupRowData"
          :mode="groupDrawerMode"
          @submitted="getData"
          @clearSelection="checkedRowKeys = []"
        />
      </div>

      <!-- 跨服列表标签页 -->
      <div v-else-if="activeTab === 'tab2'" class="h-full">
        <CrossListContent
          ref="crossListRef"
          :on-sync-cloud-server="handleSyncCloudServer"
          :on-release-server="handleReleaseServer"
          :on-start-server="handleStartServer"
          :on-stop-server="handleStopServer"
          :on-restart-server="handleRestartServer"
          :on-update-server="serverOperations.handleUpdateServer"
          @view-deployment-status="handleViewReward"
          @edit="handleCrossEdit"
        />
      </div>

      <!-- 合服计划标签页 -->
      <div v-else-if="activeTab === 'tab3'" class="h-full">
        <MergePlanContent
          ref="mergePlanRef"
        />
      </div>

      <!-- 合服列表标签页 -->
      <div v-else-if="activeTab === 'tab4'" class="h-full">
        <MergeListContent
          ref="mergeListRef"
          @view-detail="handleViewMergeDetail"
        />
      </div>
    </NCard>

    <!-- 统一的服务器操作抽屉（根据标签页传递不同的 serverType） -->
    <ItemOperateDrawer
      v-model:visible="drawerVisible"
      :operate-type="operateType"
      :row-data="editingData"
      :server-type="activeTab === 'tab1' ? 'NORMAL' : 'CROSS'"
      @submitted="activeTab === 'tab1' ? getDataByPage() : crossListRef?.getData()"
    />

    <!-- 同步状态详情弹框 -->
    <NModal
      v-model:show="showSyncStatusModal"
      preset="card"
      :title="modalTitle"
      size="medium"
      :bordered="false"
      :segmented="false"
      style="width: 70%; max-width: 700px;"
    >
      <div v-if="syncStatusLoading" class="flex justify-center items-center py-12">
        <NSpin size="large" />
        <span class="ml-4 text-lg">{{ $t('page.manage.serveritem.deployment.fetchingDeploymentStatus') }}</span>
      </div>

      <div v-else-if="syncStatusData" class="min-h-96">
        <DeploymentStatus
          :data="syncStatusData"
          :realTimeLogs="realTimeLogs"
          :connectionStatus="sseConnectionStatus"
          :errorMessage="sseErrorMessage"
          :server-id="currentServerId"
        />
      </div>

      <div v-else class="text-center py-12">
        <div class="text-gray-400 mb-4">
          <svg class="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
          </svg>
        </div>
        <p class="text-gray-500 text-lg">{{ $t('page.manage.serveritem.deployment.noDeploymentData') }}</p>
        <p class="text-gray-400 text-sm mt-2">{{ $t('page.manage.serveritem.deployment.confirmTaskId') }}</p>
      </div>
    </NModal>

    <!-- 更新服务器弹框 -->
    <UpdateServerModal
      v-model:visible="showUpdateServerModal"
      :server-id="updateServerId"
      :mode="syncServerModalMode"
      @confirm="handleConfirmServerModal"
    />

    <!-- 服务器配置查看弹框 -->
    <ServerConfigModal
      v-model:visible="showConfigModal"
      :config-data="configData"
    />

    <!-- 版本号管理弹框 -->
    <VersionManagementModal
      v-model:visible="showVersionManagementModal"
    />

    <!-- 修改版本弹框 -->
    <ModifyVersionModal
      v-model:visible="showModifyVersionModal"
      @submitted="getData"
    />

    <!-- 刷新配置弹框 -->
    <RefreshConfigModal
      v-model:visible="showRefreshConfigModal"
      @submitted="getData"
    />
  </div>
</template>

<style scoped>
/* 子菜单需要支持复选框选择（不再隐藏 child 行复选框） */
</style>
