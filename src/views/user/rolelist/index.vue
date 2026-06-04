<script setup lang="tsx">
import {
  fetchGetgmuserlist,
  fetchGetQuestName,
  fetchGetSKillName
} from "@/service/api";
// 历史详细信息接口
import {
  fetchGetRoleItem,
  fetchGetRoleProfessionInfo,
  fetchGetRoleQuestInfo,
  fetchGetRoleInfo,
  fetchGetRoleSkillInfo,
  fetchGetRolePetInfo,
  fetchGetRoleVehicleInfo,
  fetchGetRoleListedExchange,
  fetchGetRolePurchasedExchange
} from "@/service/api/game-manage";
import { $t } from "@/locales";
import { useAppStore } from "@/store/modules/app";
import { useTable } from "@/hooks/common/table";
import { getJsonData, safeJsonParse } from '@/utils/indexedDB';
import { onMounted, ref, watch, computed } from "vue";
import { useRoute } from "vue-router";
import { fetchGetDataPackage } from "@/service/api/monitor";
import { useItemPackage } from '@/hooks/business/useItemPackage';
import { useMessage, NInput } from 'naive-ui';
import { handleApiCatchError } from "@/utils/common";
// 导入 tab 组件
// @ts-ignore
import BasicInfo from './modules/basic-info.vue';
// @ts-ignore
import Items from './modules/items.vue';
// @ts-ignore
import Pet from './modules/pet.vue';
// @ts-ignore
import Profession from './modules/profession.vue';
// @ts-ignore
import Quests from './modules/quests.vue';
// @ts-ignore
import Skill from './modules/skill.vue';
// @ts-ignore
import Vehicle from './modules/vehicle.vue';
// @ts-ignore
import ListedExchange from './modules/listed-exchange.vue';
// @ts-ignore
import PurchasedExchange from './modules/purchased-exchange.vue';


// 类型定义
interface Position {
  mapName: string;
  mapId: number;
  x: number;
  y: number;
  z: number;
}

interface CashInfo {
  cash: number;
  monthCharge: number;
  lastCharge: number;
  mileage: number;
  pointVoucher: number; // 点卷 listGoods[67]
  goldIngot: number; // 元宝 listGoods[69]
  coin: number; // 金币 listGoods[68]
  contractLeaf: number; // 结契之叶 listGoods[74]
  tongtianJade: number; // 通天玉珀 listGoods[75]
  guildContribution: number; // 公会贡献 listGoods[70]
  exoticTimeMark: number; // 异域时光印记 listGoods[78]
  martialSoul: number; // 武魂 listGoods[66]
}

interface FieldBossLimit {
  teleportLeftCount: number;
  resetTime: number;
}

interface DeathsInfo {
  [key: string]: {
    deaths: number;
    reviveItemCounts: number;
    resetTime: number;
  };
}

interface RoleInfo {
  name: string;
  class: string;
  level: number;
  exp: string | number;
  power: number;
  hp: number;
  mp: number;
  forceSkillPower: number;
  position: Position;
  genderType: number;
  characterType: number;
  classType: number;
  pkSetup: number;
  guildGuid: string;
  guildName: string;
  puid: string;
  indunUid: string;
  guildMark: string;
  isShowCostume: boolean;
  lastLogoutTime: string;
  protectEquipeTime: string;
  protectBagTime: string;
  cashInfo: CashInfo;
  deathsInfo: DeathsInfo;
  fieldBossLimit: FieldBossLimit;
  vipLevel: number;
  vipTotalPoints: number;
  listGoods: number[];
  sysOpenIdList: number[];
  artifactUnlockList: number[];
}

interface OnlineUser {
  userId: number;
  channelId: string;
  ip: string;
  regDate: string;
  lastLoginTime: string;
  onlineTime: string;
}

interface NewUser {
  userId: number;
  channelId: string;
  ip: string;
  regDate: string;
  deviceType: string;
  source: string;
}

interface PetInfo {
  tid: number;
  name: string;
  level: number;
  satiety: number;
}

interface ProfessionInfo {
  grade: number;
  type: string;
  level: number;
}

interface SkillInfo {
  id: number;
  name: string;
  level: number;
}

interface QuestInfo {
  id: number;
  name: string;
  count: number;
  state: string;
  description?: string;
  objectValue?: number;
  mapId?: number;
  positionId?: number;
}

interface QuestHistoryInfo {
  id: number;
  name: string;
  completedDate: string;
  reward: string;
}

interface DailyQuestInfo {
  id: number;
  name: string;
  progress: number;
  maxProgress: number;
  reward: string;
}

interface ItemInfo {
  id: number | string; // 可以是数字ID或生成的唯一key
  name: string;
  guid: string;
  count: number | null;
  isEmpty?: boolean;
}

interface VehicleInfo {
  tid: number;
  level: number;
  exp: number;
  satiety: number;
  end_date: string;
  equip_uid: number[];
}

interface VehicleData {
  cur_vehicle: number;
  list_vehicle: VehicleInfo[];
  list_equip_vehicle: any[];
}

interface ExchangeItem {
  id: number;
  itemId: number;
  itemName: string;
  count: number;
  price: number;
  createTime: string;
  status: string;
  tradeCuid?: string;
  euid?: string;
  username?: string;
  regtime?: string;
  exchangeType?: number;
}

// 状态管理
const appStore = useAppStore();
const route = useRoute();
const message = useMessage();
const activeTab = ref('all-users');

// 判断是否为历史数据查看模式 - 已注释，只能查看当前数据
// const isHistoryMode = ref(false);
// const isSwitchingMode = ref(false);

// 获取角色ID
const currentRoleId = computed(() => route.query.roleId as string | undefined);

// 初始化时根据路由参数设置模式 - 已注释，只能查看当前数据
// onMounted(() => {
//   isHistoryMode.value = route.query.isHistory === 'true';
// });

// 构建 API 请求参数的辅助函数 - 修改为只支持当前数据
function buildApiParams(roleId: string) {
  const params: any = { cuid: roleId };
  // 不再支持历史数据，只查询当前数据
  // const serverId = isHistoryMode.value ? route.query.serverId as string : undefined;

  // if (isHistoryMode.value && !serverId) {
  //   message.error('服务器ID为空，无法获取历史数据');
  //   throw new Error('服务器ID为空');
  // }

  // if (serverId) {
  //   params.serverId = serverId;
  // }

  return params;
}

// 响应式数据
const roleInfo = ref<RoleInfo>({
  name: "",
  class: "",
  level: 0,
  exp: 0,
  power: 0,
  hp: 0,
  mp: 0,
  forceSkillPower: 0,
  position: {
    mapName: "",
    mapId: 0,
    x: 0,
    y: 0,
    z: 0
  },
  genderType: 0,
  characterType: 0,
  classType: 0,
  pkSetup: 0,
  guildGuid: "",
  guildName: "",
  puid: "",
  indunUid: "",
  guildMark: "",
  isShowCostume: true,
  lastLogoutTime: "",
  protectEquipeTime: "",
  protectBagTime: "",
  cashInfo: {
    cash: 0,
    monthCharge: 0,
    lastCharge: 0,
    mileage: 0,
    pointVoucher: 0,
    goldIngot: 0,
    coin: 0,
    contractLeaf: 0,
    tongtianJade: 0,
    guildContribution: 0,
    exoticTimeMark: 0,
    martialSoul: 0,
  },
  deathsInfo: {},
  fieldBossLimit: {
    teleportLeftCount: 0,
    resetTime: 0
  },
  vipLevel: 0,
  vipTotalPoints: 0,
  listGoods: [],
  sysOpenIdList: [],
  artifactUnlockList: []
});

const mapData = ref<Record<string, string>>({});
const currentMapName = ref("");
const itemData = ref<any>(null);

// 列表数据
const petData = ref<PetInfo[]>([]);
const professionData = ref<ProfessionInfo[]>([]);
const skillData = ref<SkillInfo[]>([]);
const questData = ref<QuestInfo[]>([]);
const questHistoryData = ref<QuestHistoryInfo[]>([]);
const dailyQuestData = ref<DailyQuestInfo[]>([]);
const achieveData = ref<{gid: number, index: number, value: number}[]>([]);
const inventoryItems = ref<ItemInfo[]>([]);
const equipItems = ref<ItemInfo[]>([]);
const storageItems = ref<ItemInfo[]>([]);
const onlineUsersData = ref<OnlineUser[]>([]);
const newUsersData = ref<NewUser[]>([]);

// 物品搜索关键词 - 已移至 Items 组件内部

// 背包物品表格列配置
const inventoryColumns = [
  {
    key: 'id',
    title: 'ID',
    align: 'center' as const,
    width: 120,
    render: (row: ItemInfo) => row.isEmpty ? '' : row.id
  },
  { key: 'name', title: 'names', align: 'center' as const, width: 300 },
  {
    key: 'count',
    title: 'Count',
    align: 'center' as const,
    width: 120,
    render: (row: ItemInfo) => row.isEmpty ? '' : row.count
  },
  {
    key: 'guid',
    title: 'GUID',
    align: 'center' as const,
    width: 220,
    render: (row: ItemInfo) => row.isEmpty ? '' : row.guid
  },
];

// 装备物品表格列配置
const equipColumns = [
  {
    key: 'id',
    title: 'ID',
    align: 'center' as const,
    width: 120,
    render: (row: ItemInfo) => row.isEmpty ? '' : row.id
  },
  { key: 'name', title: 'names', align: 'center' as const, width: 300 },
  {
    key: 'count',
    title: 'Count',
    align: 'center' as const,
    width: 120,
    render: (row: ItemInfo) => row.isEmpty ? '' : row.count
  },
  {
    key: 'guid',
    title: 'GUID',
    align: 'center' as const,
    width: 220,
    render: (row: ItemInfo) => row.isEmpty ? '' : row.guid
  },
];

// 物品过滤逻辑已移至 Items 组件内部
const vehicleData = ref<VehicleData>({
  cur_vehicle: 0,
  list_vehicle: [],
  list_equip_vehicle: []
});
const listedExchangeData = ref<ExchangeItem[]>([]);
const purchasedExchangeData = ref<ExchangeItem[]>([]);

// 加载状态
const petDataLoading = ref(false);
const professionDataLoading = ref(false);
const skillDataLoading = ref(false);
const questDataLoading = ref(false);
const questHistoryDataLoading = ref(false);
const dailyQuestDataLoading = ref(false);
const achieveDataLoading = ref(false);
const vehicleDataLoading = ref(false);
const itemInfoLoading = ref(false);
const onlineUsersLoading = ref(false);
const newUsersLoading = ref(false);
const listedExchangeLoading = ref(false);
const purchasedExchangeLoading = ref(false);

// 其他状态
let typedCheckedRowKeys = ref<(string | number)[]>([]);

// 任务状态映射
const questStateMap = {
  1: '未开始',
  2: '进行中',
  3: '已完成'
};

// 所有用户的数据表格配置
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
} = useTable({
  apiFn: fetchGetgmuserlist,
  showTotal: true,
  apiParams: {
    current: 1,
    size: 10,
    channelId: undefined,
  },
  columns: () => [
    {
      type: "selection",
      align: "center",
      width: 48,
    },
    {
      key: "index",
      title: $t("page.manage.gmuser.userId"),
      align: "center",
      width: 150,
    },
    {
      key: "index",
      title: $t("page.manage.gmuser.channelId"),
      align: "center",
      width: 150,
    },
    {
      key: "index",
      title: $t("page.manage.gmuser.ip"),
      align: "center",
      width: 150,
    },
    {
      key: "index",
      title: $t("page.manage.gmuser.regDate"),
      align: "center",
      width: 130,
    },
  ],
});

// 处理角色数据的公共函数
function processRoleData(roleData: any) {
  roleInfo.value.name = route.query.roleName as string || roleData.role_name || roleInfo.value.name;

  // 解析 data_json 字段
  let parsedData: any = null;
  if (roleData.data_json) {
    try {
      parsedData = typeof roleData.data_json === 'string'
        ? JSON.parse(roleData.data_json)
        : roleData.data_json;
    } catch (e) {
      console.error('解析 data_json 失败:', e);
      return;
    }
  }

  // 如果有 data_json，使用它的数据
  if (parsedData) {
    // 基础属性
    if (parsedData.exp !== undefined) roleInfo.value.exp = parsedData.exp;
    if (parsedData.listGoods && Array.isArray(parsedData.listGoods) && parsedData.listGoods.length > 0) {
      roleInfo.value.level = parsedData.listGoods[0] || 0;
      // 善恶值在 listGoods 数组的第5个位置（下标4）
      if (parsedData.listGoods.length > 4) {
        roleInfo.value.pkSetup = parsedData.listGoods[4] || 0;
      }
    }
    if (parsedData.power !== undefined) roleInfo.value.power = Number(parsedData.power);

    // 角色类型信息
    if (parsedData.genderType !== undefined) roleInfo.value.genderType = parsedData.genderType;
    if (parsedData.characterType !== undefined) roleInfo.value.characterType = parsedData.characterType;
    if (parsedData.classType !== undefined) roleInfo.value.classType = parsedData.classType;
    // 如果 pkSetup 直接存在，也使用它（向后兼容）
    if (parsedData.pkSetup !== undefined) roleInfo.value.pkSetup = parsedData.pkSetup;

    // 公会信息
    if (parsedData.guildGuid !== undefined) roleInfo.value.guildGuid = parsedData.guildGuid;
    if (parsedData.guildName !== undefined) roleInfo.value.guildName = parsedData.guildName;
    if (parsedData.guildMark !== undefined) roleInfo.value.guildMark = parsedData.guildMark;

    // 其他信息
    if (parsedData.puid !== undefined) roleInfo.value.puid = parsedData.puid;
    if (parsedData.indunUid !== undefined) roleInfo.value.indunUid = parsedData.indunUid;
    if (parsedData.isShowCostume !== undefined) roleInfo.value.isShowCostume = parsedData.isShowCostume;
    if (parsedData.lastLogoutTime !== undefined) roleInfo.value.lastLogoutTime = parsedData.lastLogoutTime;
    if (parsedData.protectEquipeTime !== undefined) roleInfo.value.protectEquipeTime = parsedData.protectEquipeTime;
    if (parsedData.protectBagTime !== undefined) roleInfo.value.protectBagTime = parsedData.protectBagTime;

    // 状态属性
    if (parsedData.stat) {
      const { stat } = parsedData;
      if (stat.hp !== undefined) roleInfo.value.hp = Number(stat.hp);
      if (stat.mp !== undefined) roleInfo.value.mp = Number(stat.mp);
      if (stat.forceSkillPower !== undefined) roleInfo.value.forceSkillPower = Number(stat.forceSkillPower);
    }

    // 位置信息
    if (parsedData.zone) {
      const { zone } = parsedData;
      const mapId = zone.id || 0;
      roleInfo.value.position = {
        mapName: mapId ? `地图 ${mapId}` : "未知地图",
        mapId,
        x: Number(zone.x) || 0,
        y: Number(zone.y) || 0,
        z: Number(zone.z) || 0
      };
      getMapInfo(mapId);
    }

    // 现金信息
    if (parsedData.cashInfo) {
      roleInfo.value.cashInfo = {
        cash: parsedData.cashInfo.cash || 0,
        monthCharge: parsedData.cashInfo.monthCharge || 0,
        lastCharge: parsedData.cashInfo.lastCharge || 0,
        mileage: parsedData.cashInfo.mileage || 0,
      pointVoucher: parsedData.cashInfo.pointVoucher || 0,
      goldIngot: parsedData.cashInfo.goldIngot || 0,
      coin: parsedData.cashInfo.coin || 0,
      contractLeaf: parsedData.cashInfo.contractLeaf || 0,
      tongtianJade: parsedData.cashInfo.tongtianJade || 0,
      guildContribution: parsedData.cashInfo.guildContribution || 0,
      exoticTimeMark: parsedData.cashInfo.exoticTimeMark || 0,
      martialSoul: parsedData.cashInfo.martialSoul || 0,
      };
    }

    // 从 listGoods 提取点卷和元宝
    if (parsedData.listGoods && Array.isArray(parsedData.listGoods)) {
    const goods = parsedData.listGoods;
    // cost type 对应索引
    roleInfo.value.cashInfo.martialSoul = goods[66] || 0;          // 武魂
    roleInfo.value.cashInfo.pointVoucher = goods[67] || 0;         // 点卷
    roleInfo.value.cashInfo.coin = goods[68] || 0;                 // 金币
    roleInfo.value.cashInfo.goldIngot = goods[69] || 0;            // 元宝
    roleInfo.value.cashInfo.guildContribution = goods[70] || 0;    // 公会贡献
    roleInfo.value.cashInfo.contractLeaf = goods[74] || 0;         // 结契之叶
    roleInfo.value.cashInfo.tongtianJade = goods[75] || 0;         // 通天玉珀
    roleInfo.value.cashInfo.exoticTimeMark = goods[78] || 0;       // 异域时光印记
    }

    // 死亡信息
    if (parsedData.deathsInfo) roleInfo.value.deathsInfo = parsedData.deathsInfo;

    // 野外Boss限制
    if (parsedData.fieldBossLimit) {
      roleInfo.value.fieldBossLimit = {
        teleportLeftCount: parsedData.fieldBossLimit.teleportLeftCount || 0,
        resetTime: parsedData.fieldBossLimit.resetTime || 0
      };
    }

    // VIP信息
    if (parsedData.vipLevel !== undefined) roleInfo.value.vipLevel = parsedData.vipLevel;
    if (parsedData.vipTotalPoints !== undefined) roleInfo.value.vipTotalPoints = parsedData.vipTotalPoints;

    // 物品和系统开放列表
    if (parsedData.listGoods) roleInfo.value.listGoods = parsedData.listGoods;
    if (parsedData.sysOpenIdList) roleInfo.value.sysOpenIdList = parsedData.sysOpenIdList;
    if (parsedData.artifactUnlockList) roleInfo.value.artifactUnlockList = parsedData.artifactUnlockList;
  }
  // 兼容旧的 proto_data 格式
  else if (roleData.proto_data) {
    const { proto_data } = roleData;
    if (proto_data.level !== undefined) roleInfo.value.level = Number(proto_data.level);
    if (proto_data.exp !== undefined) roleInfo.value.exp = Number(proto_data.exp);
    if (proto_data.power !== undefined) roleInfo.value.power = Number(proto_data.power);

    if (proto_data.stat) {
      const { stat } = proto_data;
      if (stat.hp !== undefined) roleInfo.value.hp = Number(stat.hp);
      if (stat.mp !== undefined) roleInfo.value.mp = Number(stat.mp);
    }

    if (proto_data.zone) {
      const { zone } = proto_data;
      const mapId = zone.id || 0;
      roleInfo.value.position = {
        mapName: mapId ? `地图 ${mapId}` : "未知地图",
        mapId,
        x: Number(zone.x) || 0,
        y: Number(zone.y) || 0,
        z: Number(zone.z) || 0
      };
      getMapInfo(mapId);
    }
  }
}

// 获取角色信息（统一接口，支持当前和历史数据）
async function getRoleHistoryInfo(roleId: string, serverId?: string) {
  try {
    const params: any = { cuid: roleId };
    if (serverId) {
      params.serverId = serverId;
    }

    const response = await fetchGetRoleInfo(params);
    if (!response?.data) return;

    const roleList = Array.isArray(response.data) ? response.data : [response.data];
    if (!roleList.length) return;

    processRoleData(roleList[0]);
  } catch (error) {
    handleApiCatchError(error, '获取角色数据');
  }
}

// 更新角色基本信息
const updateRoleInfo = () => {
  const roleName = route.query.roleName as string;
  const roleId = route.query.roleId as string;
  const roleInfoData = route.query.roleInfo as string;

  if (!roleName || !roleId) return;

  try {
    if (roleInfoData) {
      const parsedRoleInfo = JSON.parse(roleInfoData);
      roleInfo.value = {
        name: roleName,
        class: parsedRoleInfo.class || "",
        level: parsedRoleInfo.level || 0,
        exp: parsedRoleInfo.exp || 0,
        power: parsedRoleInfo.power || 0,
        hp: parsedRoleInfo.hp || 0,
        mp: parsedRoleInfo.mp || 0,
        forceSkillPower: parsedRoleInfo.forceSkillPower || 0,
        position: {
          mapName: parsedRoleInfo.mapName || "",
          mapId: parsedRoleInfo.mapId || 0,
          x: parsedRoleInfo.x || 0,
          y: parsedRoleInfo.y || 0,
          z: parsedRoleInfo.z || 0
        },
        genderType: parsedRoleInfo.genderType || 0,
        characterType: parsedRoleInfo.characterType || 0,
        classType: parsedRoleInfo.classType || 0,
        pkSetup: parsedRoleInfo.pkSetup || 0,
        guildGuid: parsedRoleInfo.guildGuid || "",
        guildName: parsedRoleInfo.guildName || "",
        puid: parsedRoleInfo.puid || "",
        indunUid: parsedRoleInfo.indunUid || "",
        guildMark: parsedRoleInfo.guildMark || "",
        isShowCostume: parsedRoleInfo.isShowCostume !== undefined ? parsedRoleInfo.isShowCostume : true,
        lastLogoutTime: parsedRoleInfo.lastLogoutTime || "",
        protectEquipeTime: parsedRoleInfo.protectEquipeTime || "",
        protectBagTime: parsedRoleInfo.protectBagTime || "",
        cashInfo: parsedRoleInfo.cashInfo || {
          cash: 0,
          monthCharge: 0,
          lastCharge: 0,
          mileage: 0,
          pointVoucher: 0,
          goldIngot: 0,
          coin: 0,
          contractLeaf: 0,
          tongtianJade: 0,
          guildContribution: 0,
          exoticTimeMark: 0,
          martialSoul: 0,
        },
        deathsInfo: parsedRoleInfo.deathsInfo || {},
        fieldBossLimit: parsedRoleInfo.fieldBossLimit || {
          teleportLeftCount: 0,
          resetTime: 0
        },
        vipLevel: parsedRoleInfo.vipLevel || 0,
        vipTotalPoints: parsedRoleInfo.vipTotalPoints || 0,
        listGoods: parsedRoleInfo.listGoods || [],
        sysOpenIdList: parsedRoleInfo.sysOpenIdList || [],
        artifactUnlockList: parsedRoleInfo.artifactUnlockList || []
      };
    } else {
      roleInfo.value = {
        name: roleName,
        class: "Warrior",
        level: 0,
        exp: 0,
        power: 0,
        hp: 0,
        mp: 0,
        forceSkillPower: 0,
        position: {
          mapName: "",
          mapId: 0,
          x: 0,
          y: 0,
          z: 0
        },
        genderType: 0,
        characterType: 0,
        classType: 0,
        pkSetup: 0,
        guildGuid: "",
        guildName: "",
        puid: "",
        indunUid: "",
        guildMark: "",
        isShowCostume: true,
        lastLogoutTime: "",
        protectEquipeTime: "",
        protectBagTime: "",
        cashInfo: {
          cash: 0,
          monthCharge: 0,
          lastCharge: 0,
          mileage: 0,
          pointVoucher: 0,
          goldIngot: 0,
          coin: 0,
          contractLeaf: 0,
          tongtianJade: 0,
          guildContribution: 0,
          exoticTimeMark: 0,
          martialSoul: 0,
        },
        deathsInfo: {},
        fieldBossLimit: {
          teleportLeftCount: 0,
          resetTime: 0
        },
        vipLevel: 0,
        vipTotalPoints: 0,
        listGoods: [],
        sysOpenIdList: [],
        artifactUnlockList: []
      };
    }
  } catch (error) {
    handleApiCatchError(error, '解析角色信息');
  }
};

// 获取角色列表数据
async function getRoleList(roleId: string) {
  try {
    const params = buildApiParams(roleId);
    await getRoleHistoryInfo(roleId, params.serverId);
  } catch (error) {
    handleApiCatchError(error, '获取角色列表数据');
  }
}

onMounted(async () => {
  try {
    const data = await useItemPackage();
    itemData.value = data;
  } catch (error) {
    console.error("获取物品数据失败:", error);
    itemData.value = null;
  }
});

// 获取地图信息
async function getMapInfo(forceMapId?: number) {
  try {
    // 如果已有地图数据，直接更新地图名称
    if (Object.keys(mapData.value).length > 0) {
      updateMapName(forceMapId);
      return;
    }
    // const response = await fetchServerMap('CS');
    // if (!response) return;

    let mapDataObj: Record<string, string> = {};
    if (itemData.value?.data?.map) {
      mapDataObj = itemData.value.data.map as Record<string, string>;
    } else if (itemData.value?.data?.map) {
      mapDataObj = itemData.value.data.map as Record<string, string>;
    }

    // 处理字符串格式的地图数据
    if (typeof mapDataObj === 'string') {
      try {
        mapDataObj = JSON.parse(mapDataObj);
      } catch (e) {
        console.error('解析地图数据字符串失败:', e);
      }
    }

    mapData.value = mapDataObj;
    updateMapName(forceMapId);
  } catch (error) {
    handleApiCatchError(error, '获取地图信息');
  }
}

// 更新地图名称
function updateMapName(forceMapId?: number) {
  const mapId = forceMapId !== undefined ? forceMapId : roleInfo.value.position.mapId;
  const mapIdStr = String(mapId);

  if (mapId && mapData.value[mapIdStr]) {
    currentMapName.value = mapData.value[mapIdStr];
    roleInfo.value.position.mapName = currentMapName.value;
  } else {
    roleInfo.value.position.mapName = roleInfo.value.position.mapId
      ? `地图 ${roleInfo.value.position.mapId}`
      : "未知地图";
  }
}

// 获取物品数据
// async function fetchItemData() {
//   try {
//     const storedData = await getJsonData();
//     if (storedData) {
//       itemData.value = safeJsonParse(storedData);
//     } else {
//       itemData.value = await fetchAndStoreCsPackageData();
//     }
//   } catch (error) {
//     console.error('获取物品数据失败:', error);
//     itemData.value = null;
//   }
// }



// 标签页切换处理
const handleTabChange = (tabName: string) => {
  activeTab.value = tabName;

  const roleId = route.query.roleId as string;
  if (!roleId) return;

  // 根据标签页加载不同数据
  switch(tabName) {
    case 'all-users':
      updateRoleInfo();
      getRoleList(roleId);
      break;
    case 'online-users':
      getItemInfo(roleId);
      break;
    case 'pet':
      getPetInfo(roleId);
      if (!itemData.value) {
        logPetData();
        checkAndLoadActorData();
      } else {
        logPetData();
        checkAndLoadActorData();
      }
      break;
    case 'profession':
      getProfessionInfo(roleId);
      break;
    case 'Skill':
      getSkillInfo(roleId);
      break;
    case 'quests':
      getQuestData();
      getQuestHistoryData();
      break;
    case 'Vehicle':
      getVehicleInfo(roleId);
      break;
    case 'listed-exchange':
      getListedExchangeData(roleId);
      break;
    case 'purchased-exchange':
      getPurchasedExchangeData(roleId);
      break;
  }
};

// 监听路由参数变化 - 修改为只支持当前数据
watch(() => route.query, (newQuery) => {
  const roleId = newQuery.roleId as string;

  // 始终调用 updateRoleInfo（不再检查历史模式）
  updateRoleInfo();

  if (roleId) {
    getRoleList(roleId);

    // 根据当前标签页加载相应数据
    switch(activeTab.value) {
      case 'pet':
        getPetInfo(roleId);
        break;
      case 'profession':
        getProfessionInfo(roleId);
        break;
      case 'Skill':
        getSkillInfo(roleId);
        break;
      case 'quests':
        getQuestData();
        getQuestHistoryData();
        break;
      case 'Vehicle':
        getVehicleInfo(roleId);
        break;
      case 'online-users':
        getItemInfo(roleId);
        break;
      case 'listed-exchange':
        getListedExchangeData(roleId);
        break;
      case 'purchased-exchange':
        getPurchasedExchangeData(roleId);
        break;
    }
  }
}, { immediate: true });

// 切换历史/当前数据模式 - 已注释，只能查看当前数据
// async function toggleHistoryMode() {
//   if (isSwitchingMode.value) return;

//   const newMode = !isHistoryMode.value;
//   const roleId = route.query.roleId as string;
//   if (!roleId) return;

//   isSwitchingMode.value = true;
//   isHistoryMode.value = newMode;

//   const modeText = newMode ? '历史数据' : '当前数据';

//   try {
//     // 根据当前标签页重新加载数据
//     switch(activeTab.value) {
//       case 'all-users':
//         await getRoleList(roleId);
//         break;
//       case 'online-users':
//         await getItemInfo(roleId);
//         break;
//       case 'pet':
//         await getPetInfo(roleId);
//         break;
//       case 'profession':
//         await getProfessionInfo(roleId);
//         break;
//       case 'Skill':
//         await getSkillInfo(roleId);
//         break;
//       case 'quests':
//         await getQuestData();
//         break;
//       case 'Vehicle':
//         await getVehicleInfo(roleId);
//         break;
//       case 'listed-exchange':
//         await getListedExchangeData(roleId);
//         break;
//       case 'purchased-exchange':
//         await getPurchasedExchangeData(roleId);
//         break;
//     }
//     message.success(`已切换到${modeText}`);
//   } catch (error) {
//     // 如果加载失败，恢复原模式
//     isHistoryMode.value = !newMode;
//     message.error('切换失败，请重试');
//   } finally {
//     setTimeout(() => {
//       isSwitchingMode.value = false;
//     }, 300);
//   }
// }

// 初始化
onMounted(() => {
  getMapInfo();
  // fetchItemData();

  // 初始加载时检查是否应该加载物品数据
  const roleId = route.query.roleId as string;
  if (roleId && activeTab.value === 'online-users') {
    getItemInfo(roleId);
  }
});

// 获取宠物信息
async function getPetInfo(roleId: string) {
  if (!roleId) return;

  petDataLoading.value = true;
  try {
    const params = buildApiParams(roleId);
    const response = await fetchGetRolePetInfo(params);

    if (!response?.data) {
      petData.value = [];
      return;
    }

    // 处理不同格式的宠物数据响应
    let pets = [];
    if (Array.isArray(response.data)) {
      pets = response.data;
    } else if (typeof response.data === 'object') {
      // 支持多种数据结构
      pets = response.data.list_pet || response.data.list || (Array.isArray(response.data.list) ? response.data.list : [response.data]);
    }

    petData.value = pets;

    // 确保IndexedDB数据已加载并更新宠物名称
    if (itemData.value?.data?.actor && itemData.value?.data?.pet) {
      updatePetNamesFromActor();
    } else {
      try {
        const storedData = await getJsonData();
        if (storedData) {
          itemData.value = safeJsonParse(storedData);
          updatePetNamesFromActor();
        } else {
          const data = await fetchGetDataPackage();
          if (data) {
            itemData.value = data;
            updatePetNamesFromActor();
          }
        }
      } catch (error) {
        console.error('加载IndexedDB数据失败:', error);
      }
    }
  } catch (error) {
    handleApiCatchError(error, '获取宠物数据');
    petData.value = [];
  } finally {
    petDataLoading.value = false;
  }
}

// 从Actor数据更新宠物名称
function updatePetNamesFromActor() {
  if (!itemData.value?.data?.actor || !itemData.value?.data?.pet || petData.value.length === 0) {
    return;
  }

  const petItems = itemData.value.data.pet;

  petData.value.forEach(pet => {
    const tidStr = String(pet.tid);
    const nameId = petItems[tidStr]?.name_id;

    if (!nameId) return;

    const foundActor = findActorByNameId(nameId);
    if (foundActor) {
      pet.name = extractActorName(foundActor);
    }
  });
}

// 根据name_id查找Actor
function findActorByNameId(nameId: string) {
  if (!itemData.value?.data?.actor) return null;

  const actorData = itemData.value.data.actor;

  // 方法1: 遍历查找带有匹配name_id的actor
  for (const actorId in actorData) {
    const actor = actorData[actorId];
    if (actor && actor.name_id === nameId) {
      return actor;
    }
  }

  // 方法2: 尝试直接通过name_id作为key查找
  if (actorData[nameId]) {
    return actorData[nameId];
  }

  // 方法3: 检查name_id的数字部分是否可以作为actorId
  const numericId = nameId.match(/\d+/)?.[0];
  if (numericId && actorData[numericId]) {
    return actorData[numericId];
  }

  return null;
}

// 提取Actor名称
function extractActorName(actor: any) {
  if (!actor) return '未知';

  // 优先使用names字段，提取中文名称
  if (actor.names) {
    if (typeof actor.names === 'object') {
      return actor.names.CS ||
             actor.names.cn ||
             Object.values(actor.names)[0] ||
             '未知';
    }
    return actor.names;
  }

  if (actor.name) {
    return actor.name;
  }

  if (actor.descriptions) {
    if (typeof actor.descriptions === 'object') {
      return actor.descriptions.CS ||
             actor.descriptions.cn ||
             Object.values(actor.descriptions)[0] ||
             '未知描述';
    }
    return actor.descriptions;
  }

  return '未知';
}

// 根据name_id查找actor中的对应名称
function getPetNameFromActor(nameId: string) {
  if (!itemData.value?.data?.actor || !nameId) {
    return '未知';
  }

  // 查找具有指定name_id的actor
  for (const actorId in itemData.value.data.actor) {
    const actor = itemData.value.data.actor[actorId];
    if (actor && actor.name_id === nameId) {
      // 优先返回中文名称
      if (actor.names) {
        if (typeof actor.names === 'object') {
          const chineseName = actor.names.CS || actor.names.cn;
          if (chineseName) return chineseName;

          for (const lang in actor.names) {
            if (actor.names[lang]) return actor.names[lang];
          }
        } else {
          return actor.names;
        }
      } else if (actor.name) {
        return actor.name;
      } else if (actor.descriptions) {
        if (typeof actor.descriptions === 'object') {
          return actor.descriptions.CS ||
                 actor.descriptions.cn ||
                 Object.values(actor.descriptions)[0] ||
                 `描述(${nameId})`;
        }
        return `${actor.descriptions} (描述)`;
      }
      return `Actor ${actorId}`;
    }
  }

  return `未知(${nameId})`;
}

// 根据tid获取宠物的actor名称
function getPetActorName(tid: number) {
  if (!itemData.value?.data?.pet) {
    return '未知';
  }

  const tidStr = String(tid);
  const pet = itemData.value.data.pet[tidStr];

  if (pet && pet.name_id) {
    return getPetNameFromActor(pet.name_id);
  }

  return '未知';
}

// 记录宠物相关数据
function logPetData() {
  setTimeout(() => {
    if (!itemData.value?.data?.actor || !itemData.value?.data?.pet) {
      return;
    }

    petData.value.forEach(pet => {
      const tidStr = String(pet.tid);
      const nameId = itemData.value.data.pet[tidStr]?.name_id;

      if (!nameId) return;

      // 查找匹配的actor
      const foundActor = findActorByNameId(nameId);

      if (foundActor) {
        // 省略后续处理...
      }
    });
  }, 1000);
}

// 检查actor数据是否存在
function checkAndLoadActorData() {
  if (!itemData.value?.data?.actor) {
    // 强制重新获取数据
    fetchGetDataPackage().then(data => {
      if (data) {
        itemData.value = data;
        if (itemData.value?.data?.actor) {
          displayActorData();
        } else {
          console.error('重新加载后仍未找到actor数据，请检查数据包完整性');
        }
      }
    }).catch(error => {
      console.error('重新加载数据包失败:', error);
    });
  } else {
    displayActorData();
  }
}

// 显示actor数据
function displayActorData() {
  if (!itemData.value?.data?.actor) {
    return;
  }
  // 功能保留，实现简化
}

// 匹配宠物与Actor
function matchPetsWithActors() {
  if (!itemData.value?.data?.pet || !itemData.value?.data?.actor) {
    return;
  }

  const petItems = itemData.value.data.pet;
  const actorData = itemData.value.data.actor;

  for (const petId in petItems) {
    const pet = petItems[petId];
    if (pet && pet.name_id) {
      let found = false;

      for (const actorId in actorData) {
        const actor = actorData[actorId];
        if (actor && actor.name_id === pet.name_id) {
          found = true;
          break;
        }
      }
    }
  }
}

// 处理并显示IndexedDB中的宠物数据
function displayPetDataFromIndexedDB() {
  if (itemData.value?.data?.pet) {
    // 比较宠物TID和IndexedDB中的ID
    comparePetIdWithTid();
  }
}

// 比较宠物TID和IndexedDB中的ID
function comparePetIdWithTid() {
  if (!itemData.value?.data?.pet || petData.value.length === 0) return;

  const petItems = itemData.value.data.pet;
  petData.value.forEach(pet => {
    const tid = String(pet.tid);
    // 简化后续处理...
  });
}

// 查找并打印特定TID的宠物name_id
function printPetNameId(tid: number) {
  if (!itemData.value?.data?.pet) {
    return;
  }

  const tidStr = String(tid);
  const pet = itemData.value.data.pet[tidStr];
  // 简化后续处理...
}

// 获取物品信息
async function getItemInfo(roleId: string) {
  if (!roleId) {
    message.error('角色ID为空，无法获取物品信息');
    return;
  }

  itemInfoLoading.value = true;
  try {
    const params = buildApiParams(roleId);
    const response: any = await fetchGetRoleItem(params);

    if (!response) {
      inventoryItems.value = [];
      equipItems.value = [];
      storageItems.value = [];
      return;
    }

    // 获取物品数据 - 支持多种数据结构
    // 从 response.data[0].proto_data 中获取数据
    const protoData = response.data?.[0]?.proto_data ||
                      response.response?.data?.[0]?.proto_data ||
                      response.data?.proto_data ||
                      response.data;

    // 背包物品：characterInventory.listItemIuid
    let inventoryData = protoData?.characterInventory?.listItemIuid || [];

    // 仓库物品：characterStorage.listItemIuid
    let storageData = protoData?.characterStorage?.listItemIuid || [];

    // 装备栏物品：listEquipIuid
    let equipData = protoData?.listEquipIuid || [];

    // 确保是数组
    if (!Array.isArray(inventoryData)) {
      inventoryData = [];
    }
    if (!Array.isArray(storageData)) {
      storageData = [];
    }
    if (!Array.isArray(equipData)) {
      equipData = [];
    }

    // 确保物品基础数据已加载
    if (!itemData.value) {
      // await fetchItemData();
    }

    // 处理背包物品
    inventoryItems.value = processItemData(inventoryData);

    // 处理仓库物品
    storageItems.value = processItemData(storageData);

    // 处理装备物品
    equipItems.value = processEquipData(equipData);
  } catch (error) {
    handleApiCatchError(error, '获取物品数据');
    inventoryItems.value = [];
    equipItems.value = [];
    storageItems.value = [];
  } finally {
    itemInfoLoading.value = false;
  }
}

// 通用的物品名称获取函数
function getItemName(itemId: number): string {
  if (!itemId || !itemData.value?.data?.item) {
    return `物品 ${itemId}`;
  }

  const itemInfo = itemData.value.data.item[itemId];
  if (!itemInfo) return `物品 ${itemId}`;

  if (typeof itemInfo.names === 'object') {
    return itemInfo.names.CS || itemInfo.names.cn || Object.values(itemInfo.names)[0] || `物品 ${itemId}`;
  }

  return itemInfo.name || itemInfo.names || `物品 ${itemId}`;
}

// 处理物品数据
function processItemData(itemList: any[]) {
  return itemList
    .map((item: any, index: number) => {
      // 判断是否为空格子
      const isEmpty = !item ||
                      item.id === null ||
                      item.guid === "0" ||
                      item.guid === null;

      return {
        id: isEmpty ? `empty-item-${index}` : item.id, // 给空格子的id生成唯一key
        name: isEmpty ? '空' : getItemName(item.id),
        guid: item.guid || `empty-guid-${index}`,
        count: isEmpty ? null : item.count,
        isEmpty: isEmpty // 标记是否为空
      };
    });
}

// 处理装备数据
function processEquipData(equipList: any[]) {
  return equipList
    .map((item: any, index: number) => {
      // 判断是否为空格子
      const isEmpty = !item ||
                      item.id === null ||
                      item.guid === "0" ||
                      item.guid === null;

      return {
        id: isEmpty ? `empty-equip-${index}` : item.id, // 给空格子的id生成唯一key
        name: isEmpty ? '空' : getItemName(item.id),
        guid: item.guid || `empty-guid-${index}`,
        count: isEmpty ? null : item.count,
        isEmpty: isEmpty // 标记是否为空
      };
    });
}

// 获取职业信息
async function getProfessionInfo(roleId: string) {
  if (!roleId) {
    message.error('角色ID为空，无法获取职业信息');
    return;
  }

  professionDataLoading.value = true;
  try {
    const params = buildApiParams(roleId);
    const response = await fetchGetRoleProfessionInfo(params);

    if (!response?.data) {
      professionData.value = [];
      return;
    }

    // 处理不同格式的职业数据响应
    if (Array.isArray(response.data) && response.data.length > 0) {
      const firstItem = response.data[0];
      professionData.value = firstItem.proto_data?.listProfesion || [];
    } else if (typeof response.data === 'object' && response.data.proto_data) {
      professionData.value = response.data.proto_data.listProfesion || [];
    } else if (typeof response.data === 'object' && response.data.listProfesion) {
      // 直接包含 listProfesion
      professionData.value = response.data.listProfesion;
    } else {
      professionData.value = [];
    }
  } catch (error) {
    handleApiCatchError(error, '获取职业数据');
    professionData.value = [];
  } finally {
    professionDataLoading.value = false;
  }
}

// 获取技能信息
async function getSkillInfo(roleId: string) {
  if (!roleId) {
    message.error('角色ID为空，无法获取技能信息');
    return;
  }

  skillDataLoading.value = true;
  try {
    const params = buildApiParams(roleId);
    const response = await fetchGetRoleSkillInfo(params);

    if (!response?.data?.skillBook?.listSkill) {
      skillData.value = [];
      return;
    }

    // 提取技能基本信息
    const skillList = response.data.skillBook.listSkill.map((skill: any) => ({
      id: skill.id || 0,
      level: skill.level || 1,
      name: `${skill.id}` // 临时名称，后续会更新
    }));

    // 如果有技能，获取技能名称
    if (skillList.length > 0) {
      await updateSkillNames(skillList);
    }

    skillData.value = skillList;
  } catch (error) {
    handleApiCatchError(error, '获取技能数据');
    skillData.value = [];
  } finally {
    skillDataLoading.value = false;
  }
}

// 更新技能名称
async function updateSkillNames(skillList: SkillInfo[]) {
  try {
    // 为每个技能创建ID（格式：ID + 两位补0的level）
    const skillIds: string[] = skillList.map((skill: SkillInfo) => {
      const levelStr = skill.level.toString().padStart(2, '0');
      return `${skill.id}${levelStr}`;
    });

    // 准备查询参数
    const params = new URLSearchParams();
    skillIds.forEach((id: string) => params.append('ids', id));
    params.append('language', 'CS');

    // 获取技能名称
    const nameResponse = await fetchGetSKillName(params);
    const nameMap = nameResponse?.response?.data || {};

    // 更新技能名称
    skillList.forEach((skill: SkillInfo) => {
      const levelStr = skill.level.toString().padStart(2, '0');
      const fullId = `${skill.id}${levelStr}`;

      if (nameMap && typeof nameMap === 'object' && fullId in nameMap) {
        skill.name = (nameMap as any)[fullId]?.name || `技能${skill.id}`;
      } else {
        skill.name = `技能${skill.id}`;
      }
    });
  } catch (e) {
    console.error('获取技能名称失败:', e);
  }
}

// 获取载具信息
async function getVehicleInfo(roleId: string) {
  if (!roleId) {
    message.error('角色ID为空，无法获取载具信息');
    return;
  }

  vehicleDataLoading.value = true;
  try {
    const params = buildApiParams(roleId);
    const response: any = await fetchGetRoleVehicleInfo(params);

    if (!response?.data) return;

    // 兼容驼峰和下划线命名
    const data = response.data;
    vehicleData.value = {
      cur_vehicle: data.curVehicle || data.cur_vehicle || 0,
      list_vehicle: data.listVehicle || data.list_vehicle || [],
      list_equip_vehicle: data.listEquipVehicle || data.list_equip_vehicle || []
    };

    // 更新当前使用的载具信息到角色信息
    const vehicleList = vehicleData.value.list_vehicle;
    if (vehicleList?.length) {
      const currentVehicle = vehicleList.find(
        (v: VehicleInfo) => v.tid === vehicleData.value.cur_vehicle
      );

      if (currentVehicle) {
        roleInfo.value.level = currentVehicle.level;
        roleInfo.value.exp = currentVehicle.exp || 0;
        roleInfo.value.power = currentVehicle.satiety;
      }
    }
  } catch (error) {
    handleApiCatchError(error, '获取载具数据');
  } finally {
    vehicleDataLoading.value = false;
  }
}

// 获取任务数据
const getQuestData = async () => {
  questDataLoading.value = true;
  achieveDataLoading.value = true;

  try {
    const roleId = route.query.roleId as string;
    if (!roleId) {
      message.error('角色ID为空，无法获取任务信息');
      return;
    }

    const params = buildApiParams(roleId);
    const response = await fetchGetRoleQuestInfo(params);

    const questBook = response?.data?.quest_data?.questBook;

    // 处理任务列表
    if (questBook?.listQuest?.length) {
      await processQuestData(questBook.listQuest);
    } else {
      questData.value = [];
    }

    // 处理任务历史
    if (questBook?.history?.data?.length) {
      await getQuestHistoryData(questBook.history.data);
    } else {
      questHistoryData.value = [];
    }

    // 处理成就数据
    achieveData.value = (questBook?.listAchieve || []).map((achieve: any) => ({
      gid: achieve.gid,
      index: achieve.index,
      value: achieve.value
    }));
  } catch (error) {
    handleApiCatchError(error, '获取任务数据');
    questData.value = [];
    achieveData.value = [];
    questHistoryData.value = [];
  } finally {
    questDataLoading.value = false;
    achieveDataLoading.value = false;
  }
};

// 处理任务数据
async function processQuestData(questList: any[]) {
  try {
    // 提取任务ID
    const questIds = questList.map((quest: any) => quest.id);

    // 准备查询参数
    const params = new URLSearchParams();
    questIds.forEach((id: number) => params.append('ids', id.toString()));
    params.append('language', 'CS');

    // 获取任务名称
    const nameResponse = await fetchGetQuestName(params);
    const nameMap = nameResponse?.response?.data || {};

    // 处理任务数据
    questData.value = questList.map((quest: any) => {
      const questId = String(quest.id || 0);
      const questName = nameMap && typeof nameMap === 'object' && questId in nameMap
        ? (nameMap as any)[questId]?.name
        : `任务 ${quest.id}`;

      const questDescription = nameMap && typeof nameMap === 'object' && questId in nameMap
        ? (nameMap as any)[questId]?.description
        : (quest.sDescriptionId ? ` ${quest.sDescriptionId}` : '');

      return {
        id: quest.id || 0,
        name: questName,
        count: quest.values?.[0] || 0,
        state: questStateMap[quest.state as keyof typeof questStateMap] || '未知状态',
        description: questDescription,
        objectValue: quest.sObjectValue || 0,
        mapId: quest.sObjectMapid || 0,
        positionId: quest.sObjectPositionid || 0
      };
    });
  } catch (error) {
    console.error('处理任务数据失败:', error);
    questData.value = [];
  }
}

// 获取任务历史数据
const getQuestHistoryData = async (historyQuestIds: number[] = []) => {
  questHistoryDataLoading.value = true;

  try {
    if (historyQuestIds.length > 0) {
      // 准备查询参数
      const params = new URLSearchParams();
      historyQuestIds.forEach((id: number) => params.append('ids', id.toString()));
      params.append('language', 'CS');

      // 获取任务名称
      const nameResponse = await fetchGetQuestName(params);
      const nameMap = nameResponse?.response?.data || {};

      // 处理任务历史数据
      const historyItems = historyQuestIds.map((id: number) => {
        const questId = String(id);
        const questName = nameMap && typeof nameMap === 'object' && questId in nameMap
          ? (nameMap as any)[questId]?.name
          : `任务 ${id}`;

        const questReward = nameMap && typeof nameMap === 'object' && questId in nameMap
          ? (nameMap as any)[questId]?.reward
          : "-";

        return {
          id,
          name: questName,
          completedDate: "", // 补充空值以兼容接口定义
          reward: questReward
        };
      });

      questHistoryData.value = historyItems;
    } else {
      questHistoryData.value = [];
    }
  } catch (error) {
    handleApiCatchError(error, '获取任务历史数据');
    questHistoryData.value = [];
  } finally {
    questHistoryDataLoading.value = false;
  }
};

// 获取交易行上架数据
async function getListedExchangeData(roleId: string) {
  if (!roleId) {
    message.error('角色ID为空，无法获取交易行上架信息');
    return;
  }

  listedExchangeLoading.value = true;
  try {
    const params = buildApiParams(roleId);
    const response = await fetchGetRoleListedExchange(params);

    if (!response?.data) {
      listedExchangeData.value = [];
      return;
    }

    // 处理响应数据
    const dataList = Array.isArray(response.data) ? response.data : [response.data];
    const allItems: ExchangeItem[] = [];

    dataList.forEach((record: any) => {
      // 如果没有 data_json，跳过
      if (!record.data_json) {
        return;
      }

      // 解析 data_json JSON 字符串
      let itemData_parsed: any = null;
      try {
        itemData_parsed = typeof record.data_json === 'string'
          ? JSON.parse(record.data_json)
          : record.data_json;
      } catch (e) {
        console.error('解析 data_json 失败:', e);
        return;
      }

      if (!itemData_parsed) return;

      const item = itemData_parsed.item || {};
      const itemId = item.id || itemData_parsed.tid || 0;
      const itemName = getItemName(itemId);

      // 根据 sellState 确定状态
      let status = '上架中';
      if (itemData_parsed.sellState === 1) {
        status = '上架中';
      } else if (itemData_parsed.sellState === 2) {
        status = '已售出';
      } else if (itemData_parsed.sellState === 3) {
        status = '已取消';
      }

      allItems.push({
        id: itemData_parsed.tid || 0,
        itemId: itemId,
        itemName: itemName,
        count: item.count || 1,
        price: itemData_parsed.price || 0,
        createTime: itemData_parsed.expire ? new Date(Number(itemData_parsed.expire) * 1000).toLocaleString() : '',
        status: status,
        euid: itemData_parsed.euid || '',
        username: itemData_parsed.username || '',
        regtime: itemData_parsed.regtime ? new Date(itemData_parsed.regtime * 1000).toLocaleString() : '',
        exchangeType: itemData_parsed.exchangeType || 0
      });
    });

    listedExchangeData.value = allItems;
  } catch (error) {
    handleApiCatchError(error, '获取交易行上架数据');
    listedExchangeData.value = [];
  } finally {
    listedExchangeLoading.value = false;
  }
}

// 获取交易行购买数据
async function getPurchasedExchangeData(roleId: string) {
  if (!roleId) {
    message.error('角色ID为空，无法获取交易行购买信息');
    return;
  }

  purchasedExchangeLoading.value = true;
  try {
    const params = buildApiParams(roleId);
    const response = await fetchGetRolePurchasedExchange(params);

    if (!response?.data) {
      purchasedExchangeData.value = [];
      return;
    }

    // 处理响应数据
    const dataList = Array.isArray(response.data) ? response.data : [response.data];
    const allItems: ExchangeItem[] = [];

    dataList.forEach((record: any) => {
      // 如果 buybag_list 为 null 或空，跳过
      if (!record.buybag_list) {
        return;
      }

      // 解析 buybag_list JSON 字符串
      let buybagList = [];
      try {
        buybagList = typeof record.buybag_list === 'string'
          ? JSON.parse(record.buybag_list)
          : record.buybag_list;
      } catch (e) {
        console.error('解析 buybag_list 失败:', e);
        return;
      }

      // 处理每个购买项
      if (Array.isArray(buybagList) && buybagList.length > 0) {
        buybagList.forEach((buyItem: any, index: number) => {
          const item = buyItem.item?.item || {};
          const itemId = item.id || 0;
          const itemName = getItemName(itemId);

          allItems.push({
            id: buyItem.item?.gid || index,
            itemId: itemId,
            itemName: itemName,
            count: item.count || 0,
            price: buyItem.item?.price || 0,
            createTime: buyItem.item?.expire ? new Date(buyItem.item.expire * 1000).toLocaleString() : '',
            status: '已购买',
            tradeCuid: buyItem.tradeCuid || '',
            euid: buyItem.item?.euid || ''
          });
        });
      }
    });

    purchasedExchangeData.value = allItems;
  } catch (error) {
    handleApiCatchError(error, '获取交易行购买数据');
    purchasedExchangeData.value = [];
  } finally {
    purchasedExchangeLoading.value = false;
  }
}

</script>

<template>
  <div
    class="min-h-500px flex-col-stretch gap-16px overflow-auto"
  >
    <!-- 数据模式切换按钮 - 已注释，只能查看当前数据 -->
    <!-- <div
      @click="toggleHistoryMode"
      class="mode-switch-button-floating"
      :class="{ 'history-mode': isHistoryMode, 'switching': isSwitchingMode }"
    >
      <span v-if="!isSwitchingMode" class="mode-indicator"></span>
      <NSpin v-else :size="10" class="mode-spinner" />
      <span class="mode-text">{{ isHistoryMode ? '历史数据' : '当前数据' }}</span>
      <svg v-if="!isSwitchingMode" class="switch-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="23 4 23 10 17 10"></polyline>
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"></path>
      </svg>
    </div> -->

    <NTabs type="line" animated v-model:value="activeTab" @update:value="handleTabChange">
      <NTabPane name="all-users" tab="基础信息">
        <BasicInfo :role-info="roleInfo" />
      </NTabPane>

      <NTabPane name="online-users" tab="物品">
        <Items
          :inventory-items="inventoryItems"
          :storage-items="storageItems"
          :equip-items="equipItems"
          :item-info-loading="itemInfoLoading"
          :inventory-columns="inventoryColumns"
          :equip-columns="equipColumns"
          :mobile-pagination="mobilePagination"
          :role-id="currentRoleId"
            />
      </NTabPane>

      <NTabPane name="pet" tab="宠物">
        <Pet
          :pet-data="petData"
          :pet-data-loading="petDataLoading"
          :mobile-pagination="mobilePagination"
        />
      </NTabPane>

      <NTabPane name="profession" tab="职业">
        <Profession
          :profession-data="professionData"
          :profession-data-loading="professionDataLoading"
          :mobile-pagination="mobilePagination"
        />
      </NTabPane>

      <NTabPane name="quests" tab="任务">
        <Quests
          :quest-data="questData"
          :quest-history-data="questHistoryData"
          :achieve-data="achieveData"
          :quest-data-loading="questDataLoading"
          :quest-history-data-loading="questHistoryDataLoading"
          :achieve-data-loading="achieveDataLoading"
          :mobile-pagination="mobilePagination"
            />
      </NTabPane>

      <NTabPane name="Skill" tab="技能">
        <Skill
          :skill-data="skillData"
          :skill-data-loading="skillDataLoading"
          :mobile-pagination="mobilePagination"
        />
      </NTabPane>

      <NTabPane name="Vehicle" tab="坐骑">
        <Vehicle
          :vehicle-data="vehicleData"
          :vehicle-data-loading="vehicleDataLoading"
          :mobile-pagination="mobilePagination"
        />
      </NTabPane>

      <NTabPane name="listed-exchange" tab="交易行上架">
        <ListedExchange
          :listed-exchange-data="listedExchangeData"
          :listed-exchange-loading="listedExchangeLoading"
          :mobile-pagination="mobilePagination"
        />
      </NTabPane>

      <NTabPane name="purchased-exchange" tab="交易行购买">
        <PurchasedExchange
          :purchased-exchange-data="purchasedExchangeData"
          :purchased-exchange-loading="purchasedExchangeLoading"
          :mobile-pagination="mobilePagination"
        />
      </NTabPane>

    </NTabs>
  </div>

</template>

<style scoped>
/* 容器样式 */
.min-h-500px {
  padding: 8px;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
  position: relative;
}

/* 悬浮的模式切换按钮 - 固定在右上角 */
.mode-switch-button-floating {
  position: absolute;
  top: 16px;
  right: 24px;
  z-index: 100;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s ease;
  user-select: none;
  /* 当前数据 - 青绿色 */
  background: rgba(16, 185, 129, 0.15);
  border: 1.5px solid rgba(16, 185, 129, 0.4);
  color: rgb(5, 150, 105);
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.2);
  backdrop-filter: blur(10px);
}

.mode-switch-button-floating:hover {
  background: rgba(16, 185, 129, 0.22);
  border-color: rgba(16, 185, 129, 0.5);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.mode-switch-button-floating:active {
  transform: translateY(0);
}

/* 历史数据模式 - 橙色 */
.mode-switch-button-floating.history-mode {
  background: rgba(251, 146, 60, 0.15);
  border: 1.5px solid rgba(251, 146, 60, 0.4);
  color: rgb(234, 88, 12);
  box-shadow: 0 2px 8px rgba(251, 146, 60, 0.2);
}

.mode-switch-button-floating.history-mode:hover {
  background: rgba(251, 146, 60, 0.22);
  border-color: rgba(251, 146, 60, 0.5);
  box-shadow: 0 4px 12px rgba(251, 146, 60, 0.3);
}

/* 切换中状态 */
.mode-switch-button-floating.switching {
  pointer-events: none;
  opacity: 0.7;
}

.min-h-500px::-webkit-scrollbar {
  width: 8px;
}

.min-h-500px::-webkit-scrollbar-track {
  background: rgba(128, 128, 128, 0.05);
  border-radius: 4px;
}

.min-h-500px::-webkit-scrollbar-thumb {
  background: rgba(128, 128, 128, 0.3);
  border-radius: 4px;
  transition: background 0.3s ease;
}

.min-h-500px::-webkit-scrollbar-thumb:hover {
  background: rgba(128, 128, 128, 0.5);
}

/* 标签页样式优化 */
:deep(.n-tabs-nav) {
  margin-bottom: 20px;
  padding-bottom: 4px;
}

:deep(.n-tabs-tab) {
  padding: 12px 24px;
  font-size: 15px;
  font-weight: 500;
  transition: all 0.3s ease;
}

:deep(.n-tabs-tab:hover) {
  opacity: 0.8;
}

:deep(.n-tabs-tab.n-tabs-tab--active) {
  font-weight: 600;
}

:deep(.n-tabs-nav__line) {
  height: 3px;
  border-radius: 2px;
}

/* 卡片样式优化 */
:deep(.n-card) {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

:deep(.n-card:hover) {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

:deep(.n-card__header) {
  padding: 20px 24px 16px;
  font-size: 16px;
  font-weight: 600;
}

:deep(.n-card__content) {
  padding: 20px 24px;
}

/* 表格样式优化 */
:deep(.n-data-table) {
  border-radius: 8px;
}

:deep(.n-data-table-th) {
  font-weight: 600;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

:deep(.n-data-table-td) {
  font-size: 14px;
}

:deep(.n-data-table-tr:hover) {
  background-color: rgba(128, 128, 128, 0.05);
}

/* 状态标签优化 */
.status-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.status-tag.offline {
  background-color: rgba(128, 128, 128, 0.15);
  border: 1px solid rgba(128, 128, 128, 0.2);
}

.status-tag.offline::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: rgba(128, 128, 128, 0.6);
}

.status-tag.history {
  background-color: rgba(24, 144, 255, 0.15);
  border: 1px solid rgba(24, 144, 255, 0.3);
  color: rgba(24, 144, 255, 1);
}

.status-tag.history::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: rgba(24, 144, 255, 0.8);
}

/* 指示点 - 简洁风格 */
.mode-indicator {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  transition: all 0.25s ease;
  /* 当前数据 - 青绿色指示点 */
  background-color: rgb(16, 185, 129);
}

.mode-switch-button-floating.history-mode .mode-indicator {
  background-color: rgb(251, 146, 60);
}

.mode-text {
  font-size: 13px;
  font-weight: 500;
}

.switch-icon {
  opacity: 0.6;
  transition: all 0.3s ease;
}

.mode-switch-button-floating:hover .switch-icon {
  opacity: 0.9;
  transform: rotate(180deg);
}

.mode-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 玩家信息卡片 */
.text-center.mb-4 {
  padding: 16px 0;
  border-bottom: 1px solid rgba(128, 128, 128, 0.1);
  margin-bottom: 24px !important;
}

.text-center.mb-4 h2 {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 8px;
  letter-spacing: 0.5px;
}

.text-center.mb-4 p {
  font-size: 14px;
  opacity: 0.7;
  font-weight: 500;
}

/* 数值网格容器 */
.stats-grid-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

/* 数值显示卡片优化 */
.level-box, .exp-box, .power-box {
  padding: 20px 12px;
  border-radius: 12px;
  background: rgba(128, 128, 128, 0.05);
  border: 1px solid rgba(128, 128, 128, 0.1);
  transition: all 0.3s ease;
  min-height: 100px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.level-box:hover, .exp-box:hover, .power-box:hover {
  background: rgba(128, 128, 128, 0.08);
  border-color: rgba(128, 128, 128, 0.2);
  transform: translateY(-2px);
}

/* 货币显示容器 */
.currency-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-top: 16px;
  padding-top: 20px;
  border-top: 1px solid rgba(128, 128, 128, 0.1);
}

.currency-item {
  padding: 16px;
  border-radius: 10px;
  /* background: linear-gradient(135deg, rgba(255, 215, 0, 0.08) 0%, rgba(255, 165, 0, 0.05) 100%); */
  border: 1px solid rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.currency-item:hover {
  /* background: linear-gradient(135deg, rgba(255, 215, 0, 0.12) 0%, rgba(255, 165, 0, 0.08) 100%); */
  /* border-color: rgba(255, 215, 0, 0.3); */
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 215, 0, 0.15);
}

.currency-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  opacity: 0.7;
  margin-bottom: 8px;
  /* color: rgba(255, 140, 0, 0.9); */
}

.currency-value {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.3px;
  /* color: rgba(255, 140, 0, 1); */
}

.value {
  font-size: 26px;
  font-weight: 700;
  margin-bottom: 8px;
  letter-spacing: -0.5px;
  word-break: keep-all;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  opacity: 0.6;
  white-space: nowrap;
}

/* 状态数值样式优化 */
.stat-label, .pos-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  opacity: 0.6;
  margin-bottom: 8px;
}

.stat-value, .pos-value {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.3px;
}

/* 网格布局优化 */
.grid {
  gap: 20px;
}

.grid.grid-cols-2 > div,
.grid.grid-cols-3 > div {
  padding: 16px;
  border-radius: 10px;
  background: rgba(128, 128, 128, 0.03);
  border: 1px solid rgba(128, 128, 128, 0.08);
  transition: all 0.3s ease;
}

.grid.grid-cols-2 > div:hover,
.grid.grid-cols-3 > div:hover {
  background: rgba(128, 128, 128, 0.06);
  border-color: rgba(128, 128, 128, 0.15);
}


:deep(.n-progress-icon) {
  font-size: 14px;
}

:deep(.n-progress-text) {
  font-size: 12px;
}

:deep(.n-progress-graph-line-fill) {
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 任务容器样式优化 */
.quest-container {
  max-height: calc(100vh - 180px);
  overflow-y: auto;
  padding-right: 12px;
  padding-bottom: 30px;
}

.quest-container::-webkit-scrollbar {
  width: 6px;
}

.quest-container::-webkit-scrollbar-track {
  background: rgba(128, 128, 128, 0.05);
  border-radius: 3px;
}

.quest-container::-webkit-scrollbar-thumb {
  background: rgba(128, 128, 128, 0.3);
  border-radius: 3px;
  transition: background 0.3s ease;
}

.quest-container::-webkit-scrollbar-thumb:hover {
  background: rgba(128, 128, 128, 0.5);
}

/* 物品搜索容器 */
.item-search-container {
  padding: 16px 20px;
  background: rgba(128, 128, 128, 0.03);
  border-radius: 12px;
  border: 1px solid rgba(128, 128, 128, 0.08);
}

.item-search-input {
  max-width: 500px;
}

.search-result-hint {
  margin-top: 12px;
  font-size: 13px;
  color: rgba(128, 128, 128, 0.7);
  font-weight: 500;
}

/* 物品容器样式优化 */
.items-container {
  max-height: calc(100vh - 180px);
  overflow-y: auto;
  padding-right: 12px;
  padding-bottom: 30px;
}

.items-container::-webkit-scrollbar {
  width: 6px;
}

.items-container::-webkit-scrollbar-track {
  background: rgba(128, 128, 128, 0.05);
  border-radius: 3px;
}

.items-container::-webkit-scrollbar-thumb {
  background: rgba(128, 128, 128, 0.3);
  border-radius: 3px;
  transition: background 0.3s ease;
}

.items-container::-webkit-scrollbar-thumb:hover {
  background: rgba(128, 128, 128, 0.5);
}

/* 表格内容溢出处理 */
:deep(.n-data-table-td) {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 14px 16px;
}

:deep(.n-data-table-th) {
  padding: 14px 16px;
}

/* 分页器样式优化 */
:deep(.n-pagination) {
  padding: 20px 0;
  justify-content: center;
}

:deep(.n-pagination-item) {
  border-radius: 8px;
  transition: all 0.3s ease;
}

:deep(.n-pagination-item:hover) {
  transform: scale(1.05);
}

/* 响应式优化 */
@media (max-width: 768px) {
  .min-h-500px {
    padding: 4px;
  }

  :deep(.n-card) {
    border-radius: 8px;
  }

  .stats-grid-container {
    gap: 12px;
  }

  .level-box, .exp-box, .power-box {
    padding: 16px 8px;
    min-height: 90px;
  }

  .value {
    font-size: 22px;
  }

  .label {
    font-size: 10px;
  }

  .stat-value, .pos-value {
    font-size: 18px;
  }

  .currency-container {
    gap: 12px;
  }

  .currency-item {
    padding: 14px;
  }

  .currency-value {
    font-size: 20px;
  }
}

@media (max-width: 520px) {
  .stats-grid-container {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .level-box, .exp-box, .power-box {
    min-height: 80px;
  }

  .currency-container {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .currency-value {
    font-size: 18px;
  }
}

/* 固定表格高度 */
.fixed-height-table {
  height: 500px !important;
}

:deep(.fixed-height-table .n-data-table) {
  height: 500px !important;
}

:deep(.fixed-height-table .n-data-table-wrapper) {
  height: 500px !important;
  overflow-y: auto;
}

:deep(.fixed-height-table .n-data-table-base-table) {
  height: auto !important;
}
</style>
