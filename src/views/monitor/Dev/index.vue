<script setup lang="tsx">
import { ref, onMounted, watch, computed, h, onUnmounted } from "vue";
import type { Ref } from 'vue';
import {
  NCard,
  NDataTable,
  NButton,
  NTag,
  NTabs,
  NTabPane,
  NDescriptions,
  NDescriptionsItem,
  NCollapse,
  NCollapseItem,
  NPagination,
  NEmpty,
  NSpin,
  NModal,
  NInputNumber,
  NRadioGroup,
  NRadio,
  NForm,
  NFormItem,
  DataTableColumn,
  DataTableColumns,
} from "naive-ui";
import { Icon } from '@iconify/vue';
// @ts-ignore
import WhiteSelect from "./modules/white-select.vue";
// @ts-ignore
import ConfigModal from "./modules/config-modal.vue";
// @ts-ignore
import Summary from "./modules/summary.vue";
// @ts-ignore
import MapData from "./modules/mapdata.vue";
// @ts-ignore
import Instance from "./modules/instance.vue";
import { fetchServerInfo, fetchServerMap, fetchConfig, fetchClearServer, fetchGetMaintenanceSetting, fetchPrintServerLog, fetchSetServerState } from "@/service/api";
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";
import { useAuth } from '@/hooks/business/auth';

interface CommonData {
  serverGroupId: number;
  serverType: number;
  binVersion: string;
  updateTime: number;
  serverId: string;
  serverSubType?: number;
  reporterInfo: string;
  serverName: string;
}

interface ServerData {
  commonData: CommonData;
  serverData: Record<string, any>;
  sessions?: Record<string, any>;
  dbData?: Record<string, any>;
  zoneInfo?: Record<string, any>;
  indunInfo?: Record<string, any>;
  playersStateCount?: any;
  playerData?: {
    players?: Array<{
      cuid: string;
      nickname: string;
    }>;
  };
}

const serverId = ref<string>("");
const data = ref<[string, ServerData][]>([]);
const loading = ref(false);
const searchParams = ref("");
const isCollapsed = ref<Record<string | number, boolean>>({});
let timer: NodeJS.Timer | null = null;
const language = ref("CS");
const mapString = ref<Record<string, string>>({});
const isMapLoading = ref(false);

// 权限控制
const { hasAuth } = useAuth();
const canPrintLog = computed(() => hasAuth('game:item:printAllPlayerInfo'));
const canSetServerStat = computed(() => hasAuth('game:item:setServerState'));

// 添加数据更新时间的响应式变量
const dataFetchTime = ref(new Date());
// 添加标签页控制变量
const activeTab = ref("server-logs");

// 运维状态弹框相关变量
const maintenanceModalVisible = ref(false);
const currentMaintenanceServer = ref<{
  serverId: number;
  server: string;
} | null>(null);
const maintenanceLoading = ref(false);
const maintenanceStatus = ref<number>(0); // 0: 关闭, 1: 开启
const maintenanceTimestamp = ref<number | null>(null); // 时间戳（秒）

const toggleCollapse = (key: string | number) => {
  isCollapsed.value[key] = !isCollapsed.value[key];
};

// 获取数据并处理
const fetchData = async () => {
  if (!serverId.value) return; // 如果没有 serverId，不执行请求

  loading.value = true;

  try {
    const response = await fetchServerInfo(Number(serverId.value));

    if (response?.response?.data) {
      // 解析API返回的数据，每个服务器的数据都是JSON字符串格式
      const parsedData: [string, ServerData][] = [];

      for (const [serverId, jsonString] of Object.entries(response.response.data)) {
        if (typeof jsonString === 'string' && jsonString.trim()) {
          try {
            const serverData = JSON.parse(jsonString);
            parsedData.push([serverId, serverData]);
          } catch (parseError) {
            console.error(`解析服务器 ${serverId} 数据失败:`, parseError);
            // 如果解析失败，跳过这个服务器的数据
            continue;
          }
        } else if (typeof jsonString === 'object' && jsonString !== null) {
          // 如果已经是对象格式，直接使用
          parsedData.push([serverId, jsonString as ServerData]);
        }
      }

      data.value = parsedData;
      dataFetchTime.value = new Date(); // 更新数据获取时间
    }
  } catch (error) {
    console.error("获取服务器信息时发生错误:", error);
  } finally {
    loading.value = false;
  }
};

// 开始轮询
const startPolling = () => {
  if (timer) return; // 如果已经存在定时器,则不重复创建
  fetchData(); // 立即执行一次
  timer = setInterval(fetchData, 3000); // 每3秒执行一次
};

// 停止轮询
const stopPolling = () => {
  if (timer) {
    clearInterval(timer as unknown as number);
    timer = null;
  }
};

// 数据排序
const dataArr = ref<[string, ServerData][]>([]);
// 监听数据变化并排序
watch(data, (newData) => {
  if (newData) {
    dataArr.value = newData.sort(
      (a, b) => {
        const aServerId = a[0];
        const bServerId = b[0];

        // 尝试从serverId中提取数字进行排序
        const aMatch = aServerId.match(/\d+$/);
        const bMatch = bServerId.match(/\d+$/);

        if (aMatch && bMatch) {
          return parseInt(aMatch[0]) - parseInt(bMatch[0]);
        }

        // 如果没有数字，按字符串排序
        return aServerId.localeCompare(bServerId);
      }
    );
  }
});

// 根据服务器类型过滤数据
const filteredData = (serverType: number) => {
  if (!dataArr.value) return [];
  const filtered = dataArr.value.filter(
    ([_, item]) => {
      // 添加安全检查，确保数据结构完整
      return item &&
             item.commonData &&
             typeof item.commonData.serverType === 'number' &&
             item.commonData.serverType === serverType;
    }
  );
  return filtered;
};

// 过滤其他未匹配的服务器类型
const filteredDataOther = computed(() => {
  if (!dataArr.value) return [];
  return dataArr.value.filter(
    ([_, item]) => {
      // 添加安全检查
      return item &&
             item.commonData &&
             typeof item.commonData.serverType === 'number' &&
             !serverTypes.includes(item.commonData.serverType);
    }
  );
});

const getTableTitle = (serverType: number) => {
  const titles: Record<number, string> = {
    5: "Center Process",
    12: "GM Process",
    2: "Cabin Process Group",
    3: "Login Process Group",
    4: "DB Proxy Process Group",
    6: "World Process Group",
    1: "Gate Process Group",
  };
  return titles[serverType] || "Contents Process Group";
};

// 确保包含所有需要的服务器类型
const serverTypes = [5, 12, 2, 3, 4, 6, 1];

// 重置搜索参数
const resetSearchParams = () => {
  searchParams.value = "";
  serverId.value = "";
  data.value = []; // 清空服务器信息
  stopPolling(); // 停止轮询
};

// 处理子组件的搜索事件
const handleSearch = async (newServerId: number) => {

  if (!newServerId) {
    console.warn('Invalid serverId received');
    return;
  }
  try {
    serverId.value = newServerId.toString();
    searchParams.value = newServerId.toString();
    stopPolling(); // 停止之前的轮询
    startPolling(); // 开始新的轮询
  } catch (error) {
    console.error('Error in handleSearch:', error);
  }
};

// 添加新的响应式变量
const openStates = ref({});
const tabSubValues = ref<Record<string, string>>({});

// 获取菜单列表的函数
const getMenus = (row: [string, ServerData]) => {
  const menus = [];
  const { commonData, serverData, sessions, dbData, zoneInfo, indunInfo } =
    row[1];

  if (
    commonData.serverType === 1 ||
    commonData.serverType === 6 ||
    (serverData && serverData?.zoneCount)
  ) {
    menus.push("Info");
  }
  if (sessions) menus.push("Sessions");
  if (dbData) menus.push("DB");
  if (zoneInfo) menus.push("Zone");
  if (indunInfo) menus.push("Indun");
  if ([5, 2, 1].includes(commonData?.serverType)) {
    menus.push("Player State");
  }
  // 添加 Reporter Info 菜单项
  if (commonData.reporterInfo) {
    menus.push("Reporter Info");
  }

  return menus;
};

const currentPage = ref(1);
const pageSize = ref(10);
const isSort = ref(false);

// 展开行的渲染函数
const renderExpand = (row: [string, ServerData]) => {
  const {
    serverData,
    commonData,
    sessions,
    zoneInfo,
    indunInfo,
    dbData,
    playersStateCount,
    playerData,
  } = row[1];

  const menus = getMenus(row);

  return (
    <div class="p-4">
      <NTabs
        type="line"
        animated
        defaultValue={menus[0]?.toLowerCase()}
        onUpdateValue={(value: string) => (tabSubValues.value[row[0]] = value)}
      >

        {menus.includes("Info") && (
          <NTabPane name="info" tab="INFO">
            <NDataTable
              columns={[
                {
                  title: 'Zone Count',
                  key: 'zoneCount',
                  align: 'center' as const
                },
                {
                  title: 'Indun Count',
                  key: 'indunCount',
                  align: 'center' as const
                },
                ...(commonData.serverType === 1 ? [
                  {
                    title: 'Connected Socket Count',
                    key: 'connectedSocketCount',
                    align: 'center' as const
                  },
                  {
                    title: 'Ghost Socket Count',
                    key: 'ghostSocketCount',
                    align: 'center' as const
                  },
                  {
                    title: 'Max Socket Count',
                    key: 'maxSocketCount',
                    align: 'center' as const
                  },
                  {
                    title: 'Session Count',
                    key: 'sessionCount',
                    align: 'center' as const
                  },
                  {
                    title: 'Login User Count',
                    key: 'loginUserCount',
                    align: 'center' as const
                  },
                  {
                    title: 'Zone User Count',
                    key: 'zoneUserCount',
                    align: 'center' as const
                  },
                  {
                    title: 'Block User Count',
                    key: 'blockUserCount',
                    align: 'center' as const
                  }
                ] : [])
              ]}
              data={[{
                zoneCount: serverData?.zoneCount,
                indunCount: serverData?.indunCount,
                ...(commonData.serverType === 1 ? {
                  connectedSocketCount: serverData?.connectedSocketCount,
                  ghostSocketCount: serverData?.ghostSocketCount,
                  maxSocketCount: serverData?.maxSocketCount,
                  sessionCount: serverData?.sessionCount,
                  loginUserCount: serverData?.loginUserCount,
                  zoneUserCount: serverData?.zoneUserCount,
                  blockUserCount: serverData?.blockUserCount
                } : {})
              }]}
              size="small"
              bordered={false}
              single-line
              style={{
                backgroundColor: 'var(--n-color)'
              }}
            />
          </NTabPane>
        )}

        {menus.includes('Sessions') && (
          <NTabPane name="sessions" tab="SESSIONS">
            <NDataTable
              columns={[
                {
                  title: 'IP',
                  key: 'ip',
                  align: 'center' as const,
                  render: (row: any) => `${row.ipAddr}:`
                },
                {
                  title: 'Server ID',
                  key: 'serverId',
                  align: 'center' as const
                },
                {
                  title: 'Server Type',
                  key: 'serverType',
                  align: 'center' as const,
                  render: (row: any) => `${SERVER_TYPE[row.serverType] || "-"} (${row.serverType})`
                },
                {
                  title: 'Server Sub Type',
                  key: 'serverSubType',
                  align: 'center' as const,
                  render: (row: any) => `${SERVER_SUB_TYPE[row.serverSubType] || "-"} (${row.serverSubType})`
                },
                {
                  title: 'Peer State',
                  key: 'peerState',
                  align: 'center' as const
                },
                {
                  title: 'Peer Type',
                  key: 'peerType',
                  align: 'center' as const
                }
              ]}
              data={sessions?.peer || []}
              size="small"
              bordered={false}
              single-line
              style={{
                backgroundColor: 'var(--n-color)'
              }}
            />
          </NTabPane>
        )}


        {menus.includes("DB") && (
          <NTabPane name="db" tab="DB">
            {(() => {
              const workerData = dbData?.workerInfo || [];
              const midPoint = Math.ceil(workerData.length / 2);
              const leftData = workerData.slice(0, midPoint);
              const rightData = workerData.slice(midPoint);

              const columns = [
                {
                  title: 'Worker Index',
                  key: 'workerIndex',
                  align: 'center' as const
                },
                {
                  title: 'Query Count',
                  key: 'queryCount',
                  align: 'center' as const
                },
                {
                  title: 'Total Worked Query Count',
                  key: 'totalWorkedQueryCount',
                  align: 'center' as const
                }
              ];

              return (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <NDataTable
                    columns={columns}
                    data={leftData}
                    size="small"
                    bordered={false}
                    single-line
                    style={{
                      backgroundColor: 'var(--n-color)'
                    }}
                  />
                  <NDataTable
                    columns={columns}
                    data={rightData}
                    size="small"
                    bordered={false}
                    single-line
                    style={{
                      backgroundColor: 'var(--n-color)'
                    }}
                  />
                </div>
              );
            })()}
          </NTabPane>
        )}

        {menus.includes("Zone") && (
          <NTabPane name="zone" tab="ZONE">
            <div class="zone-table-container">
              <NDataTable
                columns={zoneColumns}
                data={computed(() => {
                  const sortedData = [...(zoneInfo?.zoneData || [])].sort((a, b) =>
                    isSort.value
                      ? (b?.attachUser || 0) - (a?.attachUser || 0)
                      : (a.stageId || 0) - (b.stageId || 0)
                  );
                  const start = (currentPage.value - 1) * pageSize.value;
                  const end = start + pageSize.value;
                  const paginatedData = sortedData.slice(start, end);
                  return paginatedData;
                }).value}
                size="small"
                bordered={false}
                single-line
                style={{
                  backgroundColor: 'var(--n-color)'
                }}
              />
              <div style="display: flex; justify-content: center; margin-top: 16px;">
                <NPagination
                  page={currentPage.value}
                  pageSize={pageSize.value}
                  pageCount={Math.ceil((zoneInfo?.zoneData?.length || 0) / pageSize.value)}
                  onUpdatePage={(page) => currentPage.value = page}
                />
              </div>
            </div>
          </NTabPane>
        )}

        {menus.includes("Indun") && (
          <NTabPane name="indun" tab="INDUN">
            <div class="indun-table-container">
              <NDataTable
                columns={[
                  {
                    title: 'Unique ID',
                    key: 'uniqueId',
                    align: 'center' as const
                  },
                  {
                    title: 'Stage ID',
                    key: 'stageId',
                    align: 'center' as const
                  },
                  {
                    title: 'Stage Name',
                    key: 'stageName',
                    align: 'center' as const
                  },
                  {
                    title: 'Channel ID',
                    key: 'channelId',
                    align: 'center' as const
                  },
                  {
                    title: () => h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center' } }, [
                    'Attach User',
                    h(NButton, {
                      text: true,
                      style: { marginLeft: '8px', padding: 0 },
                      onClick: () => isSort.value = !isSort.value
                    }, () => h(Icon, { icon: 'mdi:sort', style: { fontSize: '16px' } }))
                  ]),
                    key: 'attachUser',
                    align: 'center' as const
                  },
                  {
                    title: 'Recommend User',
                    key: 'recommendUser',
                    align: 'center' as const
                  },
                  {
                    title: 'Max User',
                    key: 'maxUser',
                    align: 'center' as const
                  }
                ]}
                data={computed(() => {
                  const sortedData = [...(indunInfo?.zoneData || [])].sort((a, b) =>
                    isSort.value
                      ? (b?.attachUser || 0) - (a?.attachUser || 0)
                      : (a.stageId || 0) - (b.stageId || 0)
                  );

                  const start = (currentPage.value - 1) * pageSize.value;
                  const end = start + pageSize.value;
                  return sortedData.slice(start, end);
                }).value}
                size="small"
                bordered={false}
                single-line
                style={{
                  backgroundColor: 'var(--n-color)'
                }}
              />
              <div style="display: flex; justify-content: center; margin-top: 16px;">
                <NPagination
                  page={currentPage.value}
                  pageSize={pageSize.value}
                  pageCount={Math.ceil((indunInfo?.zoneData?.length || 0) / pageSize.value)}
                  onUpdatePage={(page) => currentPage.value = page}
                />
              </div>
            </div>
          </NTabPane>
        )}

        {menus.includes("Player State") && (
          <NTabPane name="player-state" tab="PLAYER STATE">
            {commonData.serverType === 5 && playersStateCount?.centerStateCount && (
              <NDataTable
                columns={[
                  {
                 title: 'Unknown',
                    key: 'unknown',
               align: 'center' as const
                  },
                  {
                    title: 'Not Regist',
                    key: 'notRegist',
                    align: 'center' as const
                  },
                  {
                    title: 'In Queue',
                    key: 'inQueue',
                    align: 'center' as const
                  },
                  {
                    title: 'Registed',
                  key: 'registed',
                    align: 'center' as const
                  },
                  {
                    title:'Waiting Map',
                    key:'waitingMap',
                    align: 'center' as const
                  },
                  {
                    title:'In Map',
                    key:'inMap',
                    align: 'center' as const
                  },
                  {
                    title:'Kicking',
                    key:'kicking',
                    align: 'center' as const
                  },
                ]}
                data={[{
                  unknown: playersStateCount.centerStateCount?.unknowState || 0,
                  notRegist: playersStateCount.centerStateCount?.notRegist || 0,
                  inQueue: playersStateCount.centerStateCount?.inQueue || 0,
                  registed: playersStateCount.centerStateCount?.registed || 0,
                  waitingMap: playersStateCount.centerStateCount?.waitingMap || 0,
                  inMap: playersStateCount.centerStateCount?.inMap || 0,
                  kicking: playersStateCount.centerStateCount?.kicking || 0
                }]}
                size="small"
                bordered={false}
                single-line
                 style={{
                    backgroundColor: 'var(--n-color)'
                  }}
              />
            )}
            {commonData.serverType === 2 && playersStateCount?.cabinStateCount && (
              <NDataTable
                columns={[
                  {
                    title: 'Unknown',
                    key: 'unknown',
                    align: 'center' as const
                  },
                  {
                    title: 'Null',
                    key: 'null',
                    align: 'center' as const
                  },
                  {
                    title: 'Loading',
                    key: 'loading',
                    align: 'center' as const
                  },
                  {
                    title: 'Creating',
                    key: 'creating',
                    align: 'center' as const
                  },
                  {
                    title: 'Register Role',
                    key: 'registerRole',
                    align: 'center' as const
                  },
                  {
                    title: 'In Queue',
                    key: 'inQueue',
                    align: 'center' as const
                  },
                  {
                    title: 'Login Load World Role',
                    key: 'loginLoadWorldRole',
                    align: 'center' as const
                  },
                  {
                    title: 'Online',
                    key: 'online',
                    align: 'center' as const
                  },
                  {
                    title: 'Teleport',
                    key: 'teleport',
                    align: 'center' as const
                  },
                  {
                    title: 'Teleport Load World Role',
                    key: 'teleportLoadWorldRole',
                    align: 'center' as const
                  },
                  {
                    title: 'Waiting Reconnect',
                    key: 'waitingReconnect',
                    align: 'center' as const
                  },
                  {
                    title: 'Waiting Map',
                    key: 'waitingMap',
                    align: 'center' as const
                  },
                  {
                    title: 'Leaving map',
                    key: 'leavingMap',
                    align: 'center' as const
                  },
                  {
                    title: 'Saving',
                    key: 'saving',
                    align: 'center' as const
                  }
                ]}
                data={[{
                  unknown: playersStateCount.cabinStateCount?.unknowState || 0,
                  null: playersStateCount.cabinStateCount?.eLoadPlayerStateNull || 0,
                  loading: playersStateCount.cabinStateCount?.eLoadPlayerStateLoading || 0,
                  creating: playersStateCount.cabinStateCount?.eLoadPlayerStateCreating || 0,
                  registerRole: playersStateCount.cabinStateCount?.eLoadPlayerStateRegistRole || 0,
                  inQueue: playersStateCount.cabinStateCount?.eLoadPlayerWaiteInQueue || 0,
                  loginLoadWorldRole: playersStateCount.cabinStateCount?.eLoadPlayerStateLoginLoadWorldRole || 0,
                  online: playersStateCount.cabinStateCount?.eLoadPlayerStateOnline || 0,
                  teleport: playersStateCount.cabinStateCount?.eLoadPlayerStateTeleport || 0,
                  teleportLoadWorldRole: playersStateCount.cabinStateCount?.eLoadPlayerStateTeleportLoadWorldRole || 0,
                  waitingReconnect: playersStateCount.cabinStateCount?.eLoadPlayerStateWaitingReconnect || 0,
                  waitingMap: playersStateCount.cabinStateCount?.eLoadPlayerStateWaitingMap || 0,
                  leavingMap: playersStateCount.cabinStateCount?.eLoadPlayerStateLeavingMap || 0,
                  saving: playersStateCount.cabinStateCount?.eLoadPlayerStateSaving || 0
                }]}
                size="small"
                bordered={false}
                single-line
                style={{
                backgroundColor: 'var(--n-color)'
               }}
              />
            )}
            {commonData.serverType === 1 && playersStateCount?.gateStateCount && (
              <NDataTable
                columns={[
                  {
                    title: 'Unknown',
                    key: 'unknown',
                    align: 'center' as const
                  },
                  {
                    title: 'Null',
                    key: 'null',
                    align: 'center' as const
                  },
                  {
                    title: 'Not Login',
                    key: 'notLogin',
                    align: 'center' as const
                  },
                  {
                    title: 'Version Check OK',
                    key: 'versionCheckOk',
                    align: 'center' as const
                  },
                  {
                    title: 'Account Logging In',
                    key: 'accountLoggingIn',
                    align: 'center' as const
                  },
                  {
                    title: 'Account Logged In',
                    key: 'accountLoggedIn',
                    align: 'center' as const
                  },
                  {
                    title: 'Character Selected',
                    key: 'characterSelected',
                    align: 'center' as const
                  },
                  {
                    title: 'Character Loading',
                    key: 'characterLoading',
                    align: 'center' as const
                  },
                  {
                    title: 'Character Creating',
                    key: 'characterCreating',
                    align: 'center' as const
                  },
                  {
                    title: 'Character In Queue',
                    key: 'characterInQueue',
                    align: 'center' as const
                  },
                  {
                    title: 'Character Loaded',
                    key: 'characterLoaded',
                    align: 'center' as const
                  }
                ]}
                data={[{
                  unknown: playersStateCount.gateStateCount?.unknowState || 0,
                  null: playersStateCount.gateStateCount?.null || 0,
                  notLogin: playersStateCount.gateStateCount?.notLogin || 0,
                  versionCheckOk: playersStateCount.gateStateCount?.versionCheckOk || 0,
                  accountLoggingIn: playersStateCount.gateStateCount?.accountLoggingIn || 0,
                  accountLoggedIn: playersStateCount.gateStateCount?.accountLoggedIn || 0,
                  characterSelected: playersStateCount.gateStateCount?.characterSelected || 0,
                  characterLoading: playersStateCount.gateStateCount?.characterLoading || 0,
                  characterCreating: playersStateCount.gateStateCount?.characterCreating || 0,
                  characterInQueue: playersStateCount.gateStateCount?.characterInQueue || 0,
                  characterLoaded: playersStateCount.gateStateCount?.characterLoaded || 0
                }]}
                size="small"
                bordered={false}
                single-line
                style={{
                backgroundColor: 'var(--n-color)'
              }}
              />
            )}
          </NTabPane>
        )}

        {menus.includes("Reporter Info") && (
          <NTabPane name="reporter-info" tab="REPORTER INFO">
            {(() => {
              let reporterData: any = null;
              try {
                reporterData = JSON.parse(commonData.reporterInfo);
              } catch (error) {
                console.error('解析 reporterInfo 失败:', error);
                return <div class="text-red-500">解析 Reporter Info 数据失败</div>;
              }

                            return (
                <div class="space-y-4">
                  {/* 渲染 playerData.players */}
                  {playerData?.players && Array.isArray(playerData.players) && playerData.players.length > 0 && (
                    <div>
                      <h4 class="text-lg font-semibold mb-2 capitalize">Player Data</h4>
                      {(() => {
                        const players = playerData.players.map((player, index) => ({
                          index: index + 1,
                          cuid: player.cuid || '-',
                          nickname: player.nickname || '-'
                        }));
                        const midPoint = Math.ceil(players.length / 2);
                        const leftData = players.slice(0, midPoint);
                        const rightData = players.slice(midPoint);

                        const columns = [
                          {
                            title: '序号',
                            key: 'index',
                            align: 'center' as const,
                            width: 80
                          },
                          {
                            title: 'CUID',
                            key: 'cuid',
                            align: 'center' as const,
                            ellipsis: { tooltip: true }
                          },
                          {
                            title: 'Nickname',
                            key: 'nickname',
                            align: 'center' as const,
                            ellipsis: { tooltip: true }
                          }
                        ];

                        return (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <NDataTable
                              columns={columns}
                              data={leftData}
                              size="small"
                              bordered={false}
                              single-line
                              style={{ backgroundColor: 'var(--n-color)' }}
                            />
                            <NDataTable
                              columns={columns}
                              data={rightData}
                              size="small"
                              bordered={false}
                              single-line
                              style={{ backgroundColor: 'var(--n-color)' }}
                            />
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* 动态渲染所有 reporterInfo 数据 */}
                  {Object.keys(reporterData || {}).map(sectionKey => {
                    const sectionData = reporterData[sectionKey];

                    // 递归函数：将嵌套对象扁平化并合并到一个对象中
                    const flattenObject = (obj: any, prefix = ''): any => {
                      const result: any = {};

                      for (const [key, value] of Object.entries(obj)) {
                        const fullKey = prefix ? `${prefix}_${key}` : key;

                        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                          // 递归处理嵌套对象
                          Object.assign(result, flattenObject(value, fullKey));
                        } else {
                          // 叶子节点
                          result[fullKey] = Array.isArray(value) ? JSON.stringify(value) : value;
                        }
                      }

                      return result;
                    };

                    // 如果是对象类型，用水平表格形式显示
                    if (typeof sectionData === 'object' && sectionData !== null && !Array.isArray(sectionData)) {
                      const flattenedData = flattenObject(sectionData);

                      // 生成动态列
                      const dynamicColumns = Object.keys(flattenedData).map(key => ({
                        title: key,
                        key: key,
                        align: 'center' as const,
                        ellipsis: {
                          tooltip: true
                        }
                      }));

                      return (
                        <div key={sectionKey}>
                          <h4 class="text-lg font-semibold mb-2 capitalize">{sectionKey}</h4>
                          <NDataTable
                            columns={dynamicColumns}
                            data={[flattenedData]}
                            size="small"
                            bordered={false}
                            single-line
                            style={{
                              backgroundColor: 'var(--n-color)'
                            }}
                          />
                        </div>
                      );
                    } else if (Array.isArray(sectionData)) {
                      // 数组类型的处理
                      return (
                        <div key={sectionKey}>
                          <h4 class="text-lg font-semibold mb-2 capitalize">{sectionKey} </h4>
                          <NDataTable
                            columns={[
                              {
                                title: '索引',
                                key: 'index',
                                align: 'center' as const,
                                width: 80
                              },
                              {
                                title: '值',
                                key: 'value',
                                align: 'center' as const,
                                ellipsis: {
                                  tooltip: true
                                }
                              }
                            ]}
                            data={sectionData.map((item, index) => ({
                              index,
                              value: typeof item === 'object' ? JSON.stringify(item) : String(item)
                            }))}
                            size="small"
                            bordered={false}
                            single-line
                            style={{
                              backgroundColor: 'var(--n-color)'
                            }}
                          />
                        </div>
                      );
                    } else {
                      // 非对象类型直接显示
                      return (
                        <div key={sectionKey}>
                          <h4 class="text-lg font-semibold mb-2 capitalize">{sectionKey}</h4>
                          <div class="bg-gray-100 p-3 rounded text-sm">
                            {String(sectionData)}
                          </div>
                        </div>
                      );
                    }
                  })}
                </div>
              );
            })()}
          </NTabPane>
        )}
      </NTabs>
    </div>
  );
};

const columns: DataTableColumns<[string, ServerData]> = [
  {
    type: "expand",
    expandable: (_rowData) => true,
    renderExpand: (row) => {
      const {
        serverData,
        commonData,
        sessions,
        dbData,
        zoneInfo,
        indunInfo,
        playersStateCount,
      } = row[1];

      const menus = getMenus(row);
      return renderExpand(row);
    }
  },
  {
    title: "Server",
    key: "server",
    render: (row) => row[0],
  },
  {
    title: "Server Index",
    key: "serverIndex",
  },
  {
    title: "Status",
    key: "status",
    render: (row) => {
      const status = getStatus(row);
      return h(
        NTag,
        {
          type: status.type,
          style: status.style,
        }
        ,
        { default: () => status.label }
      );
    },
  },
  {
    title: "Server Type",
    key: "serverType",
    align: "center",
    render: (row) => {
      if (!row[1] || !row[1].commonData) {
        return "Unknown";
      }
      const serverSubType = row[1].commonData.serverSubType === 16 ? "Indun" : "";
      const serverType = SERVER_TYPE[row[1].commonData.serverType] || "-";
      return `${serverSubType} ${serverType} (${row[1].commonData.serverType})`;
    },
  },
  {
    title: "Server Name",
    key: "serverName",
    render: (row) => {
      return (row[1] && row[1].commonData && row[1].commonData.serverName) ?
             row[1].commonData.serverName : "-";
    },
  },
  {
    title: "SVN",
    key: "svn",
    render: (row) => {
      if (!row[1] || !row[1].commonData || !row[1].commonData.binVersion) {
        return "-";
      }
      try {
        const binVersionData = JSON.parse(row[1].commonData.binVersion);
        return binVersionData.svn || binVersionData.server_version || "-";
      } catch {
        return row[1].commonData.binVersion || "-";
      }
    },
  },
  {
    title: "Compile",
    key: "compile",
    render: (row) => {
      if (!row[1] || !row[1].commonData || !row[1].commonData.binVersion) {
        return "-";
      }
      try {
        const binVersionData = JSON.parse(row[1].commonData.binVersion);
        return binVersionData.compile || "-";
      } catch {
        return "-";
      }
    },
  },
  {
    title: "Server Group ID",
    key: "serverGroupId",
    render: (row) => {
      return (row[1] && row[1].commonData && typeof row[1].commonData.serverGroupId === 'number') ?
             row[1].commonData.serverGroupId : "-";
    },
  },
  {
    title: "Updated Time",
    key: "updatedTime",
    render: (row) => {
      if (!row[1] || !row[1].commonData || (!row[1].commonData.updateTime && row[1].commonData.updateTime !== 0)) {
        return "-";
      }

      // 处理updateTime，支持字符串和数字类型
      let timestamp = typeof row[1].commonData.updateTime === 'string'
        ? parseInt(row[1].commonData.updateTime)
        : row[1].commonData.updateTime;

      if (isNaN(timestamp)) {
        return "-";
      }

      return new Date(timestamp * 1000).toLocaleString();
    },
  },
];

// 根据 serverType 生成 columns，在 Cabin Process Group (serverType === 2) 和 World Process Group (serverType === 6) 时包含操作列
const getColumns = (serverType?: number): DataTableColumns<[string, ServerData]> => {
  const baseColumns = [...columns];

  // 在 Cabin Process Group (serverType === 2) 和 World Process Group (serverType === 6) 时添加运维状态列和操作列
  if (serverType === 2 || serverType === 6) {
    // 在 Status 列后插入运维状态列
    const statusIndex = baseColumns.findIndex(col => 'key' in col && col.key === 'status');
    if (statusIndex !== -1) {
      baseColumns.splice(statusIndex + 1, 0, {
        title: "Maintenance Status",
        key: "maintenanceStatus",
        align: "center",
        render: (row) => {
          const maintenanceStatus = getMaintenanceStatus(row);
          return h(
            NTag,
            {
              type: maintenanceStatus.type,
              style: maintenanceStatus.style,
            },
            { default: () => maintenanceStatus.label }
          );
        },
      });
    }

    // 添加操作列
    baseColumns.push({
      title: "操作",
      key: "operation",
      align: "center",
      width: 150,
      render: (row) => {
        // 使用 serverGroupId 作为 serverId
        const currentServerId = row[1]?.commonData?.serverGroupId;
        if (!currentServerId || typeof currentServerId !== 'number') {
          return "-";
        }

        return h(
          NButton,
          {
            type: "primary",
            size: "small",
            ghost: true,
            disabled: !canSetServerStat.value,
            onClick: () => handleSetMaintenance(currentServerId, row)
          },
          {
            default: () => h('span', { style: { display: 'flex', alignItems: 'center', gap: '4px' } }, [
              h(Icon, { icon: 'mdi:wrench', style: { fontSize: '16px' } }),
              '设置运维状态'
            ])
          }
        );
      },
    });
  }

  return baseColumns;
};

const SERVER_TYPE: Record<number, string> = {
  0: "Client",
  1: "Gate",
  2: "Cabin",
  3: "Login",
  4: "DB Proxy",
  5: "Center",
  6: "World",
  7: "Party",
  8: "Guild",
  9: "Payment",
  10: "Third Party",
  11: "Ranking",
  12: "GM",
  13: "Info",
  14: "Social",
  15: "Chat",
  16: "Indun",
  17: "Scheduler",
  18: "Exchange",
  19: "Lobby",
  100: "Test Client",
  101: "Test Server"
};

// 定义 SERVER_SUB_TYPE 类型
const SERVER_SUB_TYPE: Record<number, string> = {
  0: "Client",
  1: "Gate",
  2: "Cabin",
  3: "Login",
  4: "DB Proxy",
  5: "Center",
  6: "World",
  7: "Party",
  8: "Guild",
  9: "Payment",
  10: "Third Party",
  11: "Ranking",
  12: "GM",
  13: "Info",
  14: "Social",
  15: "Chat",
  16: "Indun",
  17: "Actionlog",
  18: "Scheduler",
  19: "Exchange",
  20: "Battle",
  21: "Match",
  22: "Lobby",
  100: "Test Client",
  101: "Test Server"
};

const getStatus = (row: [string, ServerData]) => {
  // 安全检查，确保数据结构完整
  if (!row[1] || !row[1].commonData || (!row[1].commonData.updateTime && row[1].commonData.updateTime !== 0)) {
    return {
      type: 'error' as const,
      label: 'Error',
      style: {
        backgroundColor: 'rgba(255, 72, 66, 0.16)',
        color: 'rgb(255, 72, 66)'
      }
    };
  }

  const { commonData } = row[1];
  const currentTime = Date.now() / 1000; // 当前时间戳（秒）

  // 处理updateTime，支持字符串和数字类型
  let serverUpdateTime = typeof commonData.updateTime === 'string'
    ? parseInt(commonData.updateTime)
    : commonData.updateTime;

  // 如果转换失败，返回错误状态
  if (isNaN(serverUpdateTime)) {
    return {
      type: 'error' as const,
      label: 'Error',
      style: {
        backgroundColor: 'rgba(255, 72, 66, 0.16)',
        color: 'rgb(255, 72, 66)'
      }
    };
  }

  // 检测时间戳格式 - 如果数值太大，可能是毫秒，需要转换为秒
  if (serverUpdateTime > 9999999999) { // 大于10位数，可能是毫秒时间戳
    serverUpdateTime = serverUpdateTime / 1000;
  }

  // 计算时间差（秒）
  const timeDiff = Math.abs(currentTime - serverUpdateTime);

  // 如果时间差超过30秒，认为是超时状态（放宽时间限制）
  const isActive = timeDiff < 30;
  if (!isActive) {
    return {
      type: 'error' as const,
      label: 'Error',
      style: {
        backgroundColor: 'rgba(255, 72, 66, 0.16)',
        color: 'rgb(255, 72, 66)'
      }
    };
  }

  return {
    type: 'success' as const,
    label: 'Running',
    style: {
      backgroundColor: 'rgba(84, 214, 44, 0.16)',
      color: 'rgb(34, 197, 94)'
    }
  };
};

// 获取运维状态
const getMaintenanceStatus = (row: [string, ServerData]) => {
  const { commonData, serverData } = row[1] || {};
  if (!commonData) {
    return { type: 'default' as const, label: '-', style: { backgroundColor: 'rgba(128, 128, 128, 0.16)', color: 'rgb(128, 128, 128)' } };
  }

  // 获取运维状态：优先从 serverData，其次从 reporterInfo
  let opRunState: number | undefined;

  opRunState = serverData?.opRunState ?? serverData?.workerOpRunState ?? serverData?.e_worker_op_run_state;

  if (opRunState === undefined && commonData.reporterInfo) {
    try {
      const workerState = JSON.parse(commonData.reporterInfo)?.worker?.op_run_state;
      if (workerState !== undefined) {
        const stateMap: Record<string, number> = { 'close': 0, 'open': 1, 'closing': 2 };
        opRunState = typeof workerState === 'string' ? stateMap[workerState.toLowerCase()] : workerState;
      }
    } catch (e) {
      // 解析失败，忽略
    }
  }

  // 状态映射
  const statusMap: Record<number, { type: 'warning' | 'default' | 'success', label: string, style: { backgroundColor: string, color: string } }> = {
    0: { type: 'default', label: 'Closed', style: { backgroundColor: 'rgba(128, 128, 128, 0.16)', color: 'rgb(128, 128, 128)' } },
    1: { type: 'success', label: 'Open', style: { backgroundColor: 'rgba(84, 214, 44, 0.16)', color: 'rgb(34, 197, 94)' } },
    2: { type: 'warning', label: 'Closing', style: { backgroundColor: 'rgba(250, 173, 20, 0.16)', color: 'rgb(250, 173, 20)' } }
  };

  return statusMap[opRunState ?? 1] ?? statusMap[1];
};

// 修改 NDataTable 组件的使用
const renderTable = (data: [string, ServerData][], serverType?: number) => {
  return h(NDataTable, {
    columns: getColumns(serverType),
    data,
    rowKey: (row) => row[0],
    bordered: false,
    singleLine: false,
    style: {
      backgroundColor: 'var(--n-color)'
    },
    class: 'text-center',
    size: 'medium'
  });
};

// 修改 zoneColumns 的类型定义
const zoneColumns: DataTableColumns<any> = [
  {
    title: 'Unique ID',
    key: 'uniqueId',
    align: 'center' as const
  },
  {
    title: 'Stage ID',
    key: 'stageId',
    align: 'center' as const
  },
  {
    title: 'Stage Name',
    key: 'stageId',
    align: 'center' as const,
    render: (row) => {
      const stageId = row.stageId?.toString();
      return mapString.value[stageId] || "-";
    }
  },
  {
    title: 'Channel ID',
    key: 'channelId',
    align: 'center' as const
  },
  {
    title: () => h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center' } }, [
      'Attach User',
      h(NButton, {
        text: true,
        style: { marginLeft: '8px', padding: 0 },
        onClick: () => isSort.value = !isSort.value
      }, () => h(Icon, { icon: 'mdi:sort', style: { fontSize: '16px' } }))
    ]),
    key: 'attachUser',
    align: 'center' as const,
    render: (row) => row.attachUser || 0
  },
  {
    title: 'Recommend User',
    key: 'recommendUser',
    align: 'center' as const,
    render: (row) => row.recommendUser || 0
  },
  {
    title: 'Max User',
    key: 'maxUser',
    align: 'center' as const,
    render: (row) => row.maxUser || 0
  }
];

// 在组件挂载时获取 summary 数据
onMounted(async () => {
  // 初始化所有服务器类型的折叠状态
  serverTypes.forEach(type => {
    isCollapsed.value[type] = true;
  });
  // 初始化 Contents Process Group 的折叠状态
  isCollapsed.value['contentsProcessGroup'] = true;

  // 原有的地图数据获取
  await fetchMapData();
});

// 组件卸载时清理定时器
onUnmounted(() => {
  stopPolling();
});

// 修改 fetchMapData 函数
const fetchMapData = async () => {
  if (isMapLoading.value) return;

  try {
    isMapLoading.value = true;
    const response = await fetchServerMap(language.value);
    if (response?.response?.data) {
      mapString.value = response.response.data as Record<string, string>;
    }
  } catch (error) {
    console.error('Failed to fetch map data:', error);
  } finally {
    isMapLoading.value = false;
  }
};

const getSummaryDataByType = (serverType: number) => {
  if (!data.value) return [];
  return data.value.filter(
    ([_, item]) => {
      return item &&
             item.commonData &&
             typeof item.commonData.serverType === 'number' &&
             item.commonData.serverType === serverType;
    }
  );
};

const getOtherSummaryData = computed(() => {
  if (!data.value) return [];
  return data.value.filter(
    ([_, item]) => item?.commonData && !serverTypes.includes(item.commonData.serverType)
  );
});


const getHeaderStatus = (serverType: number | 'contentsProcessGroup') => {
  const currentData = serverType === 'contentsProcessGroup'
    ? getOtherSummaryData.value
    : getSummaryDataByType(serverType as number);

  if (!currentData?.length) {
    return {
      type: 'error' as const,
      label: 'Error',
      style: {
        backgroundColor: 'rgba(255, 72, 66, 0.16)',
        color: 'rgb(255, 72, 66)'
      }
    };
  }

    // 检查是否有任何服务器超时
  const hasError = currentData.some(([_, value]) => {
    if (!value || !value.commonData || (!value.commonData.updateTime && value.commonData.updateTime !== 0)) {
      return true; // 如果数据结构不完整，认为是错误状态
    }
    const currentTime = Date.now() / 1000;
    let serverUpdateTime = value.commonData.updateTime;

    // 处理updateTime，支持字符串和数字类型
    if (typeof serverUpdateTime === 'string') {
      serverUpdateTime = parseInt(serverUpdateTime);
    }

    // 如果转换失败，返回错误状态
    if (isNaN(serverUpdateTime)) {
      return true;
    }

    // 检测时间戳格式 - 如果数值太大，可能是毫秒，需要转换为秒
    if (serverUpdateTime > 9999999999) {
      serverUpdateTime = serverUpdateTime / 1000;
    }

    const timeDiff = Math.abs(currentTime - serverUpdateTime);

    // 使用与getStatus相同的30秒超时逻辑
    const isTimeout = timeDiff >= 30;
    return isTimeout;
  });

  if (hasError) {
    return {
      type: 'error' as const,
      label: 'Error',
      style: {
        backgroundColor: 'rgba(255, 72, 66, 0.16)',
        color: 'rgb(255, 72, 66)'
      }
    };
  }

  return {
    type: 'success' as const,
    label: 'Running',
    style: {
      backgroundColor: 'rgba(84, 214, 44, 0.16)',
      color: 'rgb(34, 197, 94)'
    }
  };
};

// 添加 getTagStyle 函数
const getTagStyle = (serverType: number | 'contentsProcessGroup') => {
  const headerTag = getHeaderStatus(serverType);
  return {
    minWidth: '80px',
    fontWeight: 'bold',
    borderRadius: '4px',
    padding: '4px 12px',
    backgroundColor: headerTag.style.backgroundColor,
    color: headerTag.style.color,
    border: 'none',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
    textAlign: 'center' as const,
    display: 'inline-block',
  };
};

// 添加计算总数的函数
const calculateTotals = computed(() => {
  if (!data.value) return {
    users: 0,
    inQueue: 0,
    accountLoggingIn: 0,
    characterCreating: 0
  };

  return data.value.reduce((acc, [_, item]) => {
    return {
      users: acc.users + (item?.commonData?.serverName ? 1 : 0), // 统计活跃服务器数量
      inQueue: acc.inQueue + (Number(item?.serverData?.inQueue) || 0),
      accountLoggingIn: acc.accountLoggingIn + (Number(item?.serverData?.accountLoggingIn) || 0),
      characterCreating: acc.characterCreating + (Number(item?.serverData?.characterCreating) || 0)
    };
  }, {
    users: 0,
    inQueue: 0,
    accountLoggingIn: 0,
    characterCreating: 0
  });
});

// 添加处理Summary组件行点击事件的函数
const handleSummaryRowClick = async (clickedServerId: number) => {
  try {
    // 调用 fetchServerInfo
    await fetchServerInfo(clickedServerId);

    // 设置 serverId 并开始轮询
    serverId.value = clickedServerId.toString();
    searchParams.value = clickedServerId.toString();
    stopPolling();
    startPolling();

    // 切换到监控标签页
    activeTab.value = "server-monitor";
  } catch (error) {
    console.error('Error handling summary row click:', error);
  }
};

// 添加清空服务器功能
const handleClearServer = async () => {
  if (!serverId.value) {
    window.$message?.warning('请先选择服务器');
    return;
  }

  try {
    const response = await fetchClearServer(Number(serverId.value));

    // 使用封装的错误处理函数检查响应
    const hasError = handleApiResponseError(response, '清空服务器');

    if (!hasError) {
      // 清空成功后先刷新数据
      fetchData();

      // 延迟 2 秒提示清空成功
      setTimeout(() => {
        window.$message?.success('清空成功');
      }, 1000);
    }
  } catch (error) {
    // 使用封装的异常处理函数
    handleApiCatchError(error, '清空服务器');
  }
};

// 打印Log功能
const handlePrintLog = async () => {
  if (!serverId.value) {
    window.$message?.warning('请先选择服务器');
    return;
  }

  // 检查权限
  if (!canPrintLog.value) {
    window.$message?.warning('您没有权限执行此操作');
    return;
  }

  try {
    const response = await fetchPrintServerLog(Number(serverId.value));

    // 使用封装的错误处理函数检查响应
    const hasError = handleApiResponseError(response, '打印服务器日志');
    if (!hasError) {
      window.$message?.success('打印日志请求已发送');
    }
  } catch (error) {
    // 使用封装的异常处理函数
    handleApiCatchError(error, '打印服务器日志');
  }
};

// 设置服务器运维状态 - 打开弹框
const handleSetMaintenance = (targetServerId: number | string, rowData?: [string, ServerData]) => {
  if (!targetServerId) {
    window.$message?.warning('服务器ID不存在');
    return;
  }

  // 检查权限
  if (!canSetServerStat.value) {
    window.$message?.warning('您没有权限执行此操作');
    return;
  }

  const serverId = typeof targetServerId === 'string' ? parseInt(targetServerId) : targetServerId;

  // 获取 Server 的值（row[0]）
  let serverValue = '';
  if (rowData) {
    serverValue = rowData[0] || serverId.toString();
  } else {
    // 通过 serverGroupId 查找对应的服务器
    const serverData = dataArr.value.find(([_, item]) =>
      item?.commonData?.serverGroupId === serverId
    );
    serverValue = serverData?.[0] || serverId.toString();
  }

  // 重置表单
  maintenanceStatus.value = 0;
  maintenanceTimestamp.value = null;

  currentMaintenanceServer.value = {
    serverId,
    server: serverValue
  };
  maintenanceModalVisible.value = true;
};

// 处理运维状态设置提交
const handleMaintenanceSubmit = async () => {
  if (!currentMaintenanceServer.value) {
    window.$message?.warning('服务器信息不存在');
    return;
  }

  // 检查权限
  if (!canSetServerStat.value) {
    window.$message?.warning('您没有权限执行此操作');
    return;
  }

  if (maintenanceTimestamp.value === null || maintenanceTimestamp.value <= 0) {
    window.$message?.warning('请输入有效的时间戳');
    return;
  }

  maintenanceLoading.value = true;

  try {
    // 调用 fetchSetServerState API
    // k8sServerId 传递 Server 的值（row[0]）
    // state 传递维护状态（0=关闭，1=开启）
    // interval 传递时间戳（秒）
    const response = await fetchSetServerState({
      serverId: currentMaintenanceServer.value.serverId,
      k8sServerId: currentMaintenanceServer.value.server,
      state: maintenanceStatus.value,
      interval: maintenanceTimestamp.value!
    });

    // 使用封装的错误处理函数检查响应
    const hasError = handleApiResponseError(response, '设置服务器运维状态');
    if (!hasError) {
      window.$message?.success(`服务器运维状态已${maintenanceStatus.value === 1 ? '开启' : '关闭'}`);
      // 关闭弹框
      maintenanceModalVisible.value = false;
      currentMaintenanceServer.value = null;
      maintenanceStatus.value = 0;
      maintenanceTimestamp.value = null;
      // 刷新数据
      fetchData();
    }
  } catch (error) {
    // 使用封装的异常处理函数
    handleApiCatchError(error, '设置服务器运维状态');
  } finally {
    maintenanceLoading.value = false;
  }
};

// 关闭弹框
const handleCloseMaintenanceModal = () => {
  maintenanceModalVisible.value = false;
  currentMaintenanceServer.value = null;
  maintenanceStatus.value = 0;
  maintenanceTimestamp.value = null;
};



</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px lt-sm:overflow-auto">
    <WhiteSelect
      v-model:model="searchParams"
      @reset="resetSearchParams"
      @search="handleSearch"
    />

    <NTabs v-model:value="activeTab" type="line" animated>

      <template #suffix>
        <div style="display: flex; gap: 8px; align-items: center;">
          <NButton
            size="small"
            ghost
            type="primary"
            :disabled="!serverId"
            @click="handleClearServer"
          >
            <template #icon>
              <Icon icon="mdi:delete" class="text-icon" />
            </template>
            <!-- {{ $t("common.clear") }} -->
              清理缓存
          </NButton>
          <NButton
            size="small"
            ghost
            type="info"
            :disabled="!serverId || !canPrintLog"
            @click="handlePrintLog"
          >
            <template #icon>
              <Icon icon="mdi:printer" class="text-icon" />
            </template>
            打印Log
          </NButton>
        </div>
      </template>


      <NTabPane name="server-logs" tab="概览">
        <Summary :language="language" @row-click="handleSummaryRowClick" />
      </NTabPane>

      <NTabPane name="server-monitor" tab="监控">
        <div v-for="serverType in serverTypes" :key="serverType">
          <NCard :bordered="true">
            <template #header>
              <div class="card-header">
                <div class="header-title">
                  <span>{{ getTableTitle(serverType) }}</span>
                  <NTag
                    :type="getHeaderStatus(serverType)?.type || 'default'"
                    size="small"
                    class="status-tag"
                    :style="getTagStyle(serverType)"
                  >
                    {{ getHeaderStatus(serverType)?.label || 'Unknown' }}
                  </NTag>
                </div>
                <div class="header-actions">
                  <span class="fetch-time">
                    Data fetched at Local Time
                    <span class="fetch-time-value">
                      {{
                        dataFetchTime.toLocaleString("en-US", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "numeric",
                          minute: "numeric",
                          second: "numeric",
                          hour12: true,
                          timeZoneName: "short",
                        })
                      }}
                    </span>
                  </span>
                  <NButton
                    text
                    class="collapse-btn"
                    @click="toggleCollapse(serverType)"
                  >
                    <Icon
                      :icon="
                        isCollapsed[serverType]
                          ? 'mdi:chevron-down'
                          : 'mdi:chevron-up'
                      "
                      style="font-size: 18px"
                    />
                  </NButton>
                </div>
              </div>
            </template>

            <div v-show="!isCollapsed[serverType]" class="table-container">
              <component :is="renderTable(filteredData(serverType), serverType)" />
            </div>
          </NCard>
        </div>

        <NCard :bordered="true">
          <template #header>
            <div class="card-header">
              <div class="header-title">
                <span>Contents Process Group</span>
                <NTag
                  :type="getHeaderStatus('contentsProcessGroup')?.type || 'default'"
                  size="small"
                  class="status-tag"
                  :style="getTagStyle('contentsProcessGroup')"
                >
                  {{ getHeaderStatus("contentsProcessGroup")?.label || 'Unknown' }}
                </NTag>
              </div>
              <div class="header-actions">
                <span class="fetch-time">
                  Data fetched at Local Time
                  <span class="fetch-time-value">
                    {{
                      dataFetchTime.toLocaleString("en-US", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "numeric",
                        minute: "numeric",
                        second: "numeric",
                        hour12: true,
                        timeZoneName: "short",
                      })
                    }}
                  </span>
                </span>
                <NButton
                  text
                  class="collapse-btn"
                  @click="toggleCollapse('contentsProcessGroup')"
                >
                  <Icon
                    :icon="
                      isCollapsed['contentsProcessGroup']
                        ? 'mdi:chevron-down'
                        : 'mdi:chevron-up'
                    "
                    style="font-size: 18px"
                  />
                </NButton>
              </div>
            </div>
          </template>

          <div
            v-show="!isCollapsed['contentsProcessGroup']"
            class="table-container"
          >
            <component :is="renderTable(filteredDataOther)" />
          </div>
        </NCard>
      </NTabPane>

      <NTabPane name="system-status" tab="配置">
        <div v-if="serverId">
          <ConfigModal :server-id="serverId" :title="'Server ' + serverId" />
        </div>
        <div v-else class="empty-container">
          <NEmpty description="请先选择服务器" />
        </div>
      </NTabPane>

      <NTabPane name="map-data" tab="地图">
        <div v-if="serverId">
          <MapData :server-id="serverId" :title="'Server ' + serverId" />
        </div>
        <div v-else class="empty-container">
          <NEmpty description="请先选择服务器" />
        </div>
      </NTabPane>

      <NTabPane name="instance" tab="副本">
        <div v-if="serverId">
          <Instance :server-id="serverId" :title="'Server ' + serverId" />
        </div>
        <div v-else class="empty-container">
          <NEmpty description="请先选择服务器" />
        </div>
      </NTabPane>
    </NTabs>

    <!-- 运维状态设置弹框 -->
    <NModal
      v-model:show="maintenanceModalVisible"
      preset="card"
      title="设置服务器运维状态"
      :mask-closable="true"
      style="width: 500px"
      :on-close="handleCloseMaintenanceModal"
    >
      <div v-if="currentMaintenanceServer" style="padding: 10px 0;">
        <NDescriptions label-placement="left" :column="1" bordered style="margin-bottom: 20px;">
          <NDescriptionsItem label="Server ID">
            {{ currentMaintenanceServer.serverId }}
          </NDescriptionsItem>
          <NDescriptionsItem label="Server">
            {{ currentMaintenanceServer.server }}
          </NDescriptionsItem>
        </NDescriptions>

        <NForm label-placement="left" :label-width="100">
          <NFormItem label="状态" required>
            <NRadioGroup v-model:value="maintenanceStatus">
              <NRadio :value="0" :disabled="maintenanceLoading">
                关闭
              </NRadio>
              <NRadio :value="1" :disabled="maintenanceLoading">
                开启
              </NRadio>
            </NRadioGroup>
          </NFormItem>

          <NFormItem label="间隔时间" required>
            <NInputNumber
              v-model:value="maintenanceTimestamp"
              placeholder="请输入踢人的间隔时间，毫秒为单位"
              :min="0"
              :precision="0"
              :disabled="maintenanceLoading"
              style="width: 100%"
            />
          </NFormItem>
        </NForm>

        <div style="margin-top: 24px; display: flex; justify-content: flex-end; gap: 12px;">
          <NButton
            :disabled="maintenanceLoading"
            @click="handleCloseMaintenanceModal"
          >
            取消
          </NButton>
          <NButton
            type="primary"
            :loading="maintenanceLoading"
            :disabled="maintenanceLoading || !canSetServerStat"
            @click="handleMaintenanceSubmit"
          >
            确定
          </NButton>
        </div>
      </div>
    </NModal>
  </div>
</template>



<style scoped>
/* 全局样式优化 */
.min-h-500px {
  min-height: 500px;
}

.flex-col-stretch {
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

.gap-16px {
  gap: 16px;
}

/* 表格样式优化 */
:deep(.n-data-table .n-data-table-td) {
  text-align: center !important;
}

:deep(.n-data-table-th) {
  text-align: center !important;
  background-color: var(--primary-color-opacity-1) !important;
}

/* 卡片间距和样式 */
.n-card {
  margin-bottom: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  border-radius: 8px;
}

.n-card :deep(.n-card-header) {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(235, 235, 235, 0.2);
}

/* 标签样式优化 */
.status-tag {
  min-width: 80px;
  padding: 4px 12px;
  text-align: center;
  font-weight: 600;
  border-radius: 4px;
}

/* 分页样式 */
.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}

/* 表格容器样式 */
.table-container {
  overflow-x: auto;
  border-radius: 8px;
}

/* 标题和按钮样式 */
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.header-title {
  font-weight: bold;
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 数据获取时间样式 */
.fetch-time {
  font-size: 14px;
}

.fetch-time-value {
  color: rgb(255, 171, 0);
  font-weight: bold;
}

/* 空状态样式 */
.empty-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
  background-color: rgba(250, 250, 250, 0.05);
  border-radius: 8px;
}

/* 标签页和内容样式 */
:deep(.n-tabs-nav) {
  margin-bottom: 16px;
}

:deep(.n-tabs-pane) {
  padding: 8px 0;
}

/* 折叠按钮样式 */
.collapse-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

/* 辅助类 */
.text-center {
  text-align: center;
}

.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.gap-8px {
  gap: 8px;
}
</style>

