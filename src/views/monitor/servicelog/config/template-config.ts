/**
 * 查询模板配置
 */

// 字段配置接口
interface ColumnConfig {
  columnDesc: string;
  columnName: string;
  propertyRange?: string;
  tableType: string;
  clusterDatePolicy?: string;
  timeTypeColumnFormart?: string;
  propertyRangeType?: string;
  subTableType?: string;
}

// 过滤条件接口
interface FilterConfig {
  columnDesc: string;
  columnName: string;
  comparator: string;
  filterType: string;
  ftv: string[];
  specifiedClusterDate: string;
  tableType: string;
  timeUnit: string;
  subTableType?: string;
}

// 模板配置接口
export interface TemplateConfig {
  id: string;
  name: string;
  description?: string;
  groupBy: ColumnConfig[];
  filts: FilterConfig[];
}

// 固定的过滤条件（空数组，所有过滤条件由用户输入决定）
const baseFilters: FilterConfig[] = [];

// 模板配置
export const templateConfigs: Record<string, TemplateConfig> = {
  cashShopGacha: {
    id: 'cashShopGacha',
    name: '(1) 商城-召唤',
    description: '商城召唤数据查询模板，包含完整的抽奖相关字段',
    filts: baseFilters,
    groupBy: [
      {
        columnDesc: '渠道',
        columnName: 'channel',
        propertyRange: '',
        tableType: 'event'
      },
      {
        columnDesc: '区服ID',
        columnName: 'server_id',
        propertyRange: '',
        tableType: 'event'
      },
      {
        clusterDatePolicy: 'LATEST',
        columnDesc: '事件时间',
        columnName: '#event_time',
        propertyRange: '',
        tableType: 'event',
        timeTypeColumnFormart: 'minute'
      },
      {
        columnDesc: '角色名称',
        columnName: 'role_name',
        propertyRange: '',
        tableType: 'event'
      },
      {
        columnDesc: '账户ID（JV+角色）',
        columnName: '#account_id',
        propertyRange: '',
        tableType: 'event'
      },
      {
        columnDesc: '平台ID',
        columnName: 'account_id',
        propertyRange: '',
        tableType: 'event'
      },
      {
        columnDesc: '抽奖奖池ID',
        columnName: 'cash_id',
        propertyRange: '',
        tableType: 'event'
      },
      {
        columnDesc: '召唤的道具',
        columnName: 'item_list',
        propertyRange: '',
        tableType: 'event'
      },
      {
        columnDesc: '召唤的道具id',
        columnName: 'item_list.id',
        propertyRange: '',
        tableType: 'event'
      },
      {
        columnDesc: '召唤的道具iuid',
        columnName: 'item_list.iuid',
        propertyRange: '',
        tableType: 'event'
      },
      {
        clusterDatePolicy: 'LATEST',
        columnDesc: '召唤的道具数量',
        columnName: 'item_list.count',
        propertyRange: '',
        propertyRangeType: 'discrete',
        tableType: 'event'
      },
      {
        columnDesc: '是否是保底奖励',
        columnName: 'is_guaranteed_reward',
        propertyRange: '',
        tableType: 'event'
      },
      {
        columnDesc: '是否使用元宝抽奖',
        columnName: 'is_yuanbao_gacha',
        propertyRange: '',
        tableType: 'event'
      },
      {
        clusterDatePolicy: 'LATEST',
        columnDesc: '抽奖前小保底累计次数',
        columnName: 'old_small_guaranteed_count',
        propertyRange: '',
        propertyRangeType: 'discrete',
        tableType: 'event'
      },
      {
        clusterDatePolicy: 'LATEST',
        columnDesc: '抽奖前大保底累计次数',
        columnName: 'old_big_guaranteed_count',
        propertyRange: '',
        propertyRangeType: 'discrete',
        tableType: 'event'
      },
      {
        clusterDatePolicy: 'LATEST',
        columnDesc: '抽奖后小保底累计次数',
        columnName: 'new_small_guaranteed_count',
        propertyRange: '',
        propertyRangeType: 'discrete',
        tableType: 'event'
      },
      {
        clusterDatePolicy: 'LATEST',
        columnDesc: '抽奖后大保底累计次数',
        columnName: 'new_big_guaranteed_count',
        propertyRange: '',
        propertyRangeType: 'discrete',
        tableType: 'event'
      }
    ]
  },

  petSynthesis: {
    id: 'petSynthesis',
    name: '(2) 伙伴-灵宠 合成查询',
    description: '灵宠合成数据查询模板，包含灵宠合成相关字段',
    filts: baseFilters,
    groupBy: [
      {
        columnDesc: '渠道',
        columnName: 'channel',
        propertyRange: '',
        tableType: 'event'
      },
      {
        columnDesc: '区服ID',
        columnName: 'server_id',
        propertyRange: '',
        tableType: 'event'
      },
      {
        clusterDatePolicy: 'LATEST',
        columnDesc: '事件时间',
        columnName: '#event_time',
        propertyRange: '',
        tableType: 'event',
        timeTypeColumnFormart: 'minute'
      },
      {
        columnDesc: '角色名称',
        columnName: 'role_name',
        propertyRange: '',
        tableType: 'event'
      },
      {
        columnDesc: '账户ID（JV+角色）',
        columnName: '#account_id',
        propertyRange: '',
        tableType: 'event'
      },
      {
        columnDesc: '平台ID',
        columnName: 'account_id',
        propertyRange: '',
        tableType: 'event'
      },
      {
        clusterDatePolicy: 'LATEST',
        columnDesc: '被消耗的灵宠ID',
        columnName: 'pets_used_list',
        propertyRange: '',
        tableType: 'event'
      },
      {
        columnDesc: '合成的灵宠ID',
        columnName: 'pet_product_id',
        propertyRange: '',
        tableType: 'event'
      }
    ]
  },

  petGet: {
    id: 'petGet',
    name: '(3) 伙伴-灵宠 获得',
    description: '灵宠获得数据查询模板，包含灵宠获得相关字段',
    filts: baseFilters,
    groupBy: [
      {
        columnDesc: '渠道',
        columnName: 'channel',
        propertyRange: '',
        tableType: 'event'
      },
      {
        columnDesc: '区服ID',
        columnName: 'server_id',
        propertyRange: '',
        tableType: 'event'
      },
      {
        clusterDatePolicy: 'LATEST',
        columnDesc: '事件时间',
        columnName: '#event_time',
        propertyRange: '',
        tableType: 'event',
        timeTypeColumnFormart: 'minute'
      },
      {
        columnDesc: '角色名称',
        columnName: 'role_name',
        propertyRange: '',
        tableType: 'event'
      },
      {
        columnDesc: '账户ID（JV+角色）',
        columnName: '#account_id',
        propertyRange: '',
        tableType: 'event'
      },
      {
        columnDesc: '平台ID',
        columnName: 'account_id',
        propertyRange: '',
        tableType: 'event'
      },
      {
        columnDesc: '灵宠ID',
        columnName: 'pet_id',
        propertyRange: '',
        tableType: 'event'
      },
      {
        columnDesc: '道具名_灵宠ID',
        columnName: 'pet_id@resource',
        propertyRange: '',
        subTableType: 'vprop_dict',
        tableType: 'event'
      },
      {
        columnDesc: '道具品质_灵宠ID',
        columnName: 'pet_id@quality',
        propertyRange: '',
        subTableType: 'vprop_dict',
        tableType: 'event'
      }
    ]
  },

  resourceGet: {
    id: 'resourceGet',
    name: '(4) 资源-道具获取',
    description: '资源/道具获取数据查询模板',
    filts: baseFilters,
    groupBy: [
      {
        columnDesc: '渠道',
        columnName: 'channel',
        propertyRange: '',
        tableType: 'event'
      },
      {
        columnDesc: '区服ID',
        columnName: 'server_id',
        propertyRange: '',
        tableType: 'event'
      },
      {
        clusterDatePolicy: 'LATEST',
        columnDesc: '事件时间',
        columnName: '#event_time',
        propertyRange: '',
        tableType: 'event',
        timeTypeColumnFormart: 'minute'
      },
      {
        columnDesc: '角色名称',
        columnName: 'role_name',
        propertyRange: '',
        tableType: 'event'
      },
      {
        columnDesc: '账户ID（JV+角色）',
        columnName: '#account_id',
        propertyRange: '',
        tableType: 'event'
      },
      {
        columnDesc: '平台ID',
        columnName: 'account_id',
        propertyRange: '',
        tableType: 'event'
      },
      {
        columnDesc: '资源/道具信息',
        columnName: 'resource_info',
        propertyRange: '',
        tableType: 'event'
      },
      {
        columnDesc: '资源/道具ID',
        columnName: 'resource_info.id',
        propertyRange: '',
        tableType: 'event'
      },
      {
        clusterDatePolicy: 'LATEST',
        columnDesc: '变动量',
        columnName: 'resource_info.count',
        propertyRange: '',
        propertyRangeType: 'discrete',
        tableType: 'event'
      },
      {
        clusterDatePolicy: 'LATEST',
        columnDesc: '变动后量',
        columnName: 'resource_info.total',
        propertyRange: '',
        propertyRangeType: 'discrete',
        tableType: 'event'
      },
      {
        clusterDatePolicy: 'LATEST',
        columnDesc: '变动原因',
        columnName: 'change_reason',
        propertyRange: '',
        propertyRangeType: 'discrete',
        tableType: 'event'
      }
    ]
  },

  resourceCost: {
    id: 'resourceCost',
    name: '(5) 资源-道具消耗',
    description: '资源/道具消耗数据查询模板',
    filts: baseFilters,
    groupBy: [
      {
        columnDesc: '渠道',
        columnName: 'channel',
        propertyRange: '',
        tableType: 'event'
      },
      {
        columnDesc: '区服ID',
        columnName: 'server_id',
        propertyRange: '',
        tableType: 'event'
      },
      {
        clusterDatePolicy: 'LATEST',
        columnDesc: '事件时间',
        columnName: '#event_time',
        propertyRange: '',
        tableType: 'event',
        timeTypeColumnFormart: 'minute'
      },
      {
        columnDesc: '角色名称',
        columnName: 'role_name',
        propertyRange: '',
        tableType: 'event'
      },
      {
        columnDesc: '账户ID（JV+角色）',
        columnName: '#account_id',
        propertyRange: '',
        tableType: 'event'
      },
      {
        columnDesc: '平台ID',
        columnName: 'account_id',
        propertyRange: '',
        tableType: 'event'
      },
      {
        columnDesc: '资源/道具信息',
        columnName: 'resource_info',
        propertyRange: '',
        tableType: 'event'
      },
      {
        columnDesc: '资源/道具ID',
        columnName: 'resource_info.id',
        propertyRange: '',
        tableType: 'event'
      },
      {
        clusterDatePolicy: 'LATEST',
        columnDesc: '变动量',
        columnName: 'resource_info.count',
        propertyRange: '',
        propertyRangeType: 'discrete',
        tableType: 'event'
      },
      {
        clusterDatePolicy: 'LATEST',
        columnDesc: '变动后量',
        columnName: 'resource_info.total',
        propertyRange: '',
        propertyRangeType: 'discrete',
        tableType: 'event'
      },
      {
        clusterDatePolicy: 'LATEST',
        columnDesc: '变动原因',
        columnName: 'change_reason',
        propertyRange: '',
        propertyRangeType: 'discrete',
        tableType: 'event'
      }
    ]
  },

  death: {
    id: 'death',
    name: '(6) 角色死亡',
    description: '角色死亡数据查询模板，包含击杀者详细信息',
    filts: baseFilters,
    groupBy: [
      {
        columnDesc: '渠道',
        columnName: 'channel',
        propertyRange: '',
        tableType: 'event'
      },
      {
        columnDesc: '区服ID',
        columnName: 'server_id',
        propertyRange: '',
        tableType: 'event'
      },
      {
        clusterDatePolicy: 'LATEST',
        columnDesc: '事件时间',
        columnName: '#event_time',
        propertyRange: '',
        tableType: 'event',
        timeTypeColumnFormart: 'minute'
      },
      {
        columnDesc: '角色名称',
        columnName: 'role_name',
        propertyRange: '',
        tableType: 'event'
      },
      {
        columnDesc: '账户ID（JV+角色）',
        columnName: '#account_id',
        propertyRange: '',
        tableType: 'event'
      },
      {
        columnDesc: '平台ID',
        columnName: 'account_id',
        propertyRange: '',
        tableType: 'event'
      },
      {
        columnDesc: '击杀者id',
        columnName: 'killer_id',
        propertyRange: '',
        tableType: 'event'
      },
      {
        columnDesc: '击杀者角色名',
        columnName: 'killer_name',
        propertyRange: '',
        tableType: 'event'
      },
      {
        clusterDatePolicy: 'LATEST',
        columnDesc: '击杀者角色等级',
        columnName: 'killer_level',
        propertyRange: '',
        propertyRangeType: 'discrete',
        tableType: 'event'
      },
      {
        clusterDatePolicy: 'LATEST',
        columnDesc: '击杀者战力',
        columnName: 'killer_power',
        propertyRange: '',
        propertyRangeType: 'discrete',
        tableType: 'event'
      },
      {
        columnDesc: '击杀者性别',
        columnName: 'killer_gender',
        propertyRange: '',
        propertyRangeType: 'def',
        tableType: 'event'
      },
      {
        columnDesc: '击杀者类别',
        columnName: 'killer_type',
        propertyRange: '',
        tableType: 'event'
      },
      {
        columnDesc: '击杀者公会名称',
        columnName: 'killer_guild_name',
        propertyRange: '',
        tableType: 'event'
      },
      {
        clusterDatePolicy: 'LATEST',
        columnDesc: '击杀者当前元宝',
        columnName: 'killer_yuanbao',
        propertyRange: '',
        propertyRangeType: 'discrete',
        tableType: 'event'
      },
      {
        clusterDatePolicy: 'LATEST',
        columnDesc: '技能ID',
        columnName: 'skill_id',
        propertyRange: '',
        propertyRangeType: 'discrete',
        tableType: 'event'
      },
      {
        columnDesc: '地图ID',
        columnName: 'map_id',
        propertyRange: '',
        tableType: 'event'
      },
      {
        columnDesc: '是否跨服',
        columnName: 'is_cross_server',
        propertyRange: '',
        tableType: 'event'
      },
      {
        clusterDatePolicy: 'LATEST',
        columnDesc: '击杀者的命中',
        columnName: 'ability_property.accuracy',
        propertyRange: '',
        propertyRangeType: 'discrete',
        tableType: 'event'
      },
      {
        clusterDatePolicy: 'LATEST',
        columnDesc: '击杀者的暴击',
        columnName: 'ability_property.cri_rate',
        propertyRange: '',
        propertyRangeType: 'discrete',
        tableType: 'event'
      },
      {
        clusterDatePolicy: 'LATEST',
        columnDesc: '击杀者的暴击抵抗',
        columnName: 'ability_property.cri_resist',
        propertyRange: '',
        propertyRangeType: 'discrete',
        tableType: 'event'
      },
      {
        clusterDatePolicy: 'LATEST',
        columnDesc: '击杀者的暴伤',
        columnName: 'ability_property.damage_increase_cri_value',
        propertyRange: '',
        propertyRangeType: 'discrete',
        tableType: 'event'
      },
      {
        clusterDatePolicy: 'LATEST',
        columnDesc: '击杀者的暴伤抵抗',
        columnName: 'ability_property.damage_reduction_cri_value',
        propertyRange: '',
        propertyRangeType: 'discrete',
        tableType: 'event'
      },
      {
        clusterDatePolicy: 'LATEST',
        columnDesc: '击杀者的防御穿透',
        columnName: 'ability_property.def_penetrate_value',
        propertyRange: '',
        propertyRangeType: 'discrete',
        tableType: 'event'
      },
      {
        clusterDatePolicy: 'LATEST',
        columnDesc: '击杀者的闪避',
        columnName: 'ability_property.evade',
        propertyRange: '',
        propertyRangeType: 'discrete',
        tableType: 'event'
      },
      {
        clusterDatePolicy: 'LATEST',
        columnDesc: '击杀者的神力倍攻',
        columnName: 'ability_property.give_all_damage_increase',
        propertyRange: '',
        propertyRangeType: 'discrete',
        tableType: 'event'
      },
      {
        clusterDatePolicy: 'LATEST',
        columnDesc: '击杀者的生命值',
        columnName: 'ability_property.hp_max',
        propertyRange: '',
        propertyRangeType: 'discrete',
        tableType: 'event'
      },
      {
        clusterDatePolicy: 'LATEST',
        columnDesc: '击杀者的幸运',
        columnName: 'ability_property.luck',
        propertyRange: '',
        propertyRangeType: 'discrete',
        tableType: 'event'
      },
      {
        clusterDatePolicy: 'LATEST',
        columnDesc: '击杀者的最大法术',
        columnName: 'ability_property.matk_max',
        propertyRange: '',
        propertyRangeType: 'discrete',
        tableType: 'event'
      },
      {
        clusterDatePolicy: 'LATEST',
        columnDesc: '击杀者的最小法术',
        columnName: 'ability_property.matk_min',
        propertyRange: '',
        propertyRangeType: 'discrete',
        tableType: 'event'
      },
      {
        clusterDatePolicy: 'LATEST',
        columnDesc: '击杀者的最大法术防御',
        columnName: 'ability_property.mdef_max',
        propertyRange: '',
        propertyRangeType: 'discrete',
        tableType: 'event'
      },
      {
        clusterDatePolicy: 'LATEST',
        columnDesc: '击杀者的最小法术防御',
        columnName: 'ability_property.mdef_min',
        propertyRange: '',
        propertyRangeType: 'discrete',
        tableType: 'event'
      },
      {
        clusterDatePolicy: 'LATEST',
        columnDesc: '击杀者的魔法值',
        columnName: 'ability_property.mp_max',
        propertyRange: '',
        propertyRangeType: 'discrete',
        tableType: 'event'
      },
      {
        clusterDatePolicy: 'LATEST',
        columnDesc: '击杀者的最大破坏',
        columnName: 'ability_property.patk_max',
        propertyRange: '',
        propertyRangeType: 'discrete',
        tableType: 'event'
      },
      {
        clusterDatePolicy: 'LATEST',
        columnDesc: '击杀者的最小破坏',
        columnName: 'ability_property.patk_min',
        propertyRange: '',
        propertyRangeType: 'discrete',
        tableType: 'event'
      },
      {
        clusterDatePolicy: 'LATEST',
        columnDesc: '击杀者的最大防御',
        columnName: 'ability_property.pdef_max',
        propertyRange: '',
        propertyRangeType: 'discrete',
        tableType: 'event'
      },
      {
        clusterDatePolicy: 'LATEST',
        columnDesc: '击杀者的最小防御',
        columnName: 'ability_property.pdef_min',
        propertyRange: '',
        propertyRangeType: 'discrete',
        tableType: 'event'
      },
      {
        clusterDatePolicy: 'LATEST',
        columnDesc: '击杀者的穿透抵抗',
        columnName: 'ability_property.resist_penetrate_value',
        propertyRange: '',
        propertyRangeType: 'discrete',
        tableType: 'event'
      },
      {
        clusterDatePolicy: 'LATEST',
        columnDesc: '击杀者的善恶值',
        columnName: 'ability_property.saint_villain',
        propertyRange: '',
        propertyRangeType: 'discrete',
        tableType: 'event'
      }
    ]
  },

  deathDrop: {
    id: 'deathDrop',
    name: '(7) 角色死亡掉落物品',
    description: '角色死亡掉落物品数据查询模板',
    filts: baseFilters,
    groupBy: [
      {
        columnDesc: '渠道',
        columnName: 'channel',
        propertyRange: '',
        tableType: 'event'
      },
      {
        columnDesc: '区服ID',
        columnName: 'server_id',
        propertyRange: '',
        tableType: 'event'
      },
      {
        clusterDatePolicy: 'LATEST',
        columnDesc: '事件时间',
        columnName: '#event_time',
        propertyRange: '',
        tableType: 'event',
        timeTypeColumnFormart: 'minute'
      },
      {
        columnDesc: '角色名称',
        columnName: 'role_name',
        propertyRange: '',
        tableType: 'event'
      },
      {
        columnDesc: '账户ID（JV+角色）',
        columnName: '#account_id',
        propertyRange: '',
        tableType: 'event'
      },
      {
        columnDesc: '平台ID',
        columnName: 'account_id',
        propertyRange: '',
        tableType: 'event'
      },
      {
        columnDesc: '掉落物品名称列表',
        columnName: 'death_drop_list',
        propertyRange: '',
        tableType: 'event'
      },
      {
        clusterDatePolicy: 'LATEST',
        columnDesc: '掉落物品数量',
        columnName: 'death_drop_list.count',
        propertyRange: '',
        propertyRangeType: 'discrete',
        tableType: 'event'
      },
      {
        columnDesc: '掉落物品id',
        columnName: 'death_drop_list.item_id',
        propertyRange: '',
        tableType: 'event'
      },
      {
        columnDesc: '掉落物品iuid',
        columnName: 'death_drop_list.iuid',
        propertyRange: '',
        tableType: 'event'
      },
      {
        columnDesc: '地图ID',
        columnName: 'map_id',
        propertyRange: '',
        tableType: 'event'
      },
      {
        columnDesc: '是否跨服',
        columnName: 'is_cross_server',
        propertyRange: '',
        tableType: 'event'
      }
    ]
  },

  buffUse: {
    id: 'buffUse',
    name: '(8) BUFF获得',
    description: 'BUFF获得数据查询模板',
    filts: baseFilters,
    groupBy: [
      {
        columnDesc: '渠道',
        columnName: 'channel',
        propertyRange: '',
        tableType: 'event'
      },
      {
        columnDesc: '区服ID',
        columnName: 'server_id',
        propertyRange: '',
        tableType: 'event'
      },
      {
        clusterDatePolicy: 'LATEST',
        columnDesc: '事件时间',
        columnName: '#event_time',
        propertyRange: '',
        tableType: 'event',
        timeTypeColumnFormart: 'minute'
      },
      {
        columnDesc: '角色名称',
        columnName: 'role_name',
        propertyRange: '',
        tableType: 'event'
      },
      {
        columnDesc: '账户ID（JV+角色）',
        columnName: '#account_id',
        propertyRange: '',
        tableType: 'event'
      },
      {
        columnDesc: '平台ID',
        columnName: 'account_id',
        propertyRange: '',
        tableType: 'event'
      },
      {
        clusterDatePolicy: 'LATEST',
        columnDesc: '获得的buff id',
        columnName: 'buff_id',
        propertyRange: '',
        propertyRangeType: 'discrete',
        tableType: 'event'
      },
      {
        clusterDatePolicy: 'LATEST',
        columnDesc: '获得的buff时长',
        columnName: 'buff_time',
        propertyRange: '',
        propertyRangeType: 'discrete',
        tableType: 'event'
      },
      {
        clusterDatePolicy: 'LATEST',
        columnDesc: 'buff持续类型',
        columnName: 'keepup_type',
        propertyRange: '',
        propertyRangeType: 'discrete',
        tableType: 'event'
      }
    ]
  },

  buffInvalid: {
    id: 'buffInvalid',
    name: '(9) BUFF消失',
    description: 'BUFF消失数据查询模板',
    filts: baseFilters,
    groupBy: [
      {
        columnDesc: '渠道',
        columnName: 'channel',
        propertyRange: '',
        tableType: 'event'
      },
      {
        columnDesc: '区服ID',
        columnName: 'server_id',
        propertyRange: '',
        tableType: 'event'
      },
      {
        clusterDatePolicy: 'LATEST',
        columnDesc: '事件时间',
        columnName: '#event_time',
        propertyRange: '',
        tableType: 'event',
        timeTypeColumnFormart: 'minute'
      },
      {
        columnDesc: '角色名称',
        columnName: 'role_name',
        propertyRange: '',
        tableType: 'event'
      },
      {
        columnDesc: '账户ID（JV+角色）',
        columnName: '#account_id',
        propertyRange: '',
        tableType: 'event'
      },
      {
        columnDesc: '平台ID',
        columnName: 'account_id',
        propertyRange: '',
        tableType: 'event'
      },
      {
        clusterDatePolicy: 'LATEST',
        columnDesc: '获得的buff id',
        columnName: 'buff_id',
        propertyRange: '',
        propertyRangeType: 'discrete',
        tableType: 'event'
      },
      {
        clusterDatePolicy: 'LATEST',
        columnDesc: 'buff持续类型',
        columnName: 'keepup_type',
        propertyRange: '',
        propertyRangeType: 'discrete',
        tableType: 'event'
      }
    ]
  }
};

// 获取模板配置
export function getTemplateConfig(templateId: string): TemplateConfig | null {
  return templateConfigs[templateId] || null;
}

// 获取所有模板选项
export function getTemplateOptions() {
  return Object.values(templateConfigs).map(template => ({
    label: template.name,
    value: template.id,
    description: template.description
  }));
}

// 获取模板对应的事件配置
function getEventConfig(templateId: string) {
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

  return eventConfigs[templateId] || eventConfigs.cashShopGacha;
}

/**
 * 构建完整的查询参数
 * @param templateId 模板ID
 * @param startTime 开始时间
 * @param endTime 结束时间
 * @param recentDay 最近天数
 * @param serverId 区服ID数组（可选，支持多选）
 * @param channel 渠道列表（可选）
 * @param accountId 账户ID（可选）
 * @param petId 灵宠ID（可选）
 */
export function buildQueryParams(
  templateId: string,
  startTime: string,
  endTime: string,
  recentDay: string = '0-35',
  serverId?: string[],
  channel?: string[],
  accountId?: string,
  petId?: string
) {
  const template = getTemplateConfig(templateId);
  if (!template) {
    return null;
  }

  const eventConfig = getEventConfig(templateId);

  // 构建动态过滤条件
  const dynamicFilters: FilterConfig[] = [];
  const currentDate = new Date().toISOString().split('T')[0];

  // 区服ID过滤（支持多选）
  if (serverId && serverId.length > 0) {
    // 过滤掉分组的key（以group_开头的）和空字符串
    const serverIdArray = serverId
      .filter((id: string) => id && !id.startsWith('group_') && id.trim().length > 0)
      .map((id: string) => id.trim());

    if (serverIdArray.length > 0) {
      dynamicFilters.push({
        columnDesc: '区服ID',
        columnName: 'server_id',
        comparator: 'equal',
        filterType: 'SIMPLE',
        ftv: serverIdArray,
        specifiedClusterDate: currentDate,
        subTableType: '',
        tableType: 'event',
        timeUnit: ''
      });
    }
  }

  // 渠道过滤
  if (channel && channel.length > 0) {
    dynamicFilters.push({
      columnDesc: '渠道',
      columnName: 'channel',
      comparator: 'equal',
      filterType: 'SIMPLE',
      ftv: channel,
      specifiedClusterDate: currentDate,
      subTableType: '',
      tableType: 'event',
      timeUnit: ''
    });
  }

  // 账户ID过滤
  if (accountId) {
    dynamicFilters.push({
      columnDesc: '账户ID（JV+角色）',
      columnName: '#account_id',
      comparator: 'equal',
      filterType: 'SIMPLE',
      ftv: [accountId],
      specifiedClusterDate: currentDate,
      tableType: 'event',
      timeUnit: ''
    });
  }

  // 灵宠ID过滤（用于灵宠相关模板）
  if (petId) {
    dynamicFilters.push({
      columnDesc: '灵宠ID',
      columnName: 'pet_id',
      comparator: 'equal',
      filterType: 'SIMPLE',
      ftv: [petId],
      specifiedClusterDate: currentDate,
      tableType: 'event',
      timeUnit: ''
    });
  }

  // 直接使用用户输入的过滤条件，不使用默认值
  const eventFilters = dynamicFilters;

  return {
    eventView: {
      comparedByTime: false,
      comparedTimeList: [],
      endTime,
      filts: [],
      firstDayOfWeek: 1,
      groupBy: template.groupBy,
      recentDay,
      relation: 'and',
      startTime,
      timeParticleSize: 'total'
    },
    events: [
      {
        analysis: 'TOTAL_TIMES',
        analysisParams: '',
        eventName: eventConfig.eventName,
        eventNameDisplay: eventConfig.eventNameDisplay,
        eventUuid: eventConfig.eventUuid,
        filts: eventFilters,
        quota: '',
        relation: 'and',
        type: 'normal'
      }
    ],
    projectId: 3
  };
}

