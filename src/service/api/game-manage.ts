import { log } from 'console';
import { request } from '../request';
import exp from 'constants';
import JSONbig from 'json-bigint';

// 游戏管理游戏列表
export function fetchGetGameList(data: any) {
  return request({
    url: '/platform-game/game/list',
    method: 'get',
    data
  });
}

// 删除游戏列表
export function fetchDeleteGameList(params: { gameId: number }) {
  return request({
    url: `/platform-game/game/${params.gameId}`,
    method: 'delete'
  });
}

// 新增游戏
export function fetchAddGame(data: any) {
  return request({
    url: '/platform-game/game',
    method: 'post',
    data
  });
}

// 修改游戏
export function fetchUpdateGame(data: any) {
  return request({
    url: '/platform-game/game',
    method: 'put',
    data
  });
}

//获取渠道列表
export function fetchGetChannelList() {
  return request({
    url: '/platform-game/channel/select',
    method: 'get'
  });
}

// 获取渠道列表
export function fetchGetChannel(params?: Api.SystemManage.channeSearchParams) {
  return request<Api.SystemManage.channelList>({
    url: '/platform-game/channel/list',
    method: 'get',
    params
  });
}

// 渠道管理新增渠道
export function fetchAddChannel(data: any) {
  return request({
    url: '/platform-game/channel',
    method: 'post',
    data
  });
}

// 删除渠道
export function fetchDeleteChannelList(params: { ids: number[] }) {
  return request({
    url: `/platform-game/channel/logic/${params.ids.join(',')}`,
    method: 'delete'
  });
}

// 修改渠道
export function fetchUpdateChannel(data: any) {
  return request({
    url: '/platform-game/channel',
    method: 'put',
    data
  });
}

// 将渠道分配区服
export function fetchAddChannelRelation(data: { channelId: string; serverIds: number[] }) {
  return request({
    url: `/platform-game/channelServerMapping/addBatch?channelId=${data.channelId}`,
    method: 'post',
    data: data.serverIds
  });
}

// 查询渠道与区服关联列表
export function fetchGetChannelRelation(params: { channelId: string | number }) {
  return request({
    url: `/platform-game/channelServerMapping/inner/getIds?channelId=${params.channelId}`,
    method: 'get'
  });
}


// 获取服务器专区列表
export function fetchGetServer(params?: { current: number; size: number; }) {
  return request<Api.SystemManage.serverregion>({
    url: '/platform-game/region/list',
    method: 'get',
    params
  });
}

// 添加服务器专区
export function fetchAddServerregion(data: any) {
  return request({
    url: '/platform-game/region',
    method: 'post',
    data
  });
}
// 修改服务器专区
export function fetchUpdateServerregion(data: any) {
  return request({
    url: '/platform-game/region',
    method: 'put',
    data
  });
}
// 删除服务器专区
export function fetchDeleteServerregion(params: { id: number }) {
  return request({
    url: `/platform-game/region/${params.id}`,
    method: 'delete'
  });
}

//获取白名单
export function fetchGetWhiteList() {
  return request({
    url: '/platform-game/white/list',
    method: 'get',
  });
}

/*获取服务器分组*/
export function fetchGetServerGroup(params?: { current: number; size: number; }) {
  return request({
    url: '/platform-game/group/list',
    method: 'get',
    params
  });
}

/*添加服务器分组*/
export function fetchAddServerGroup(data: any) {
  return request({
    url: '/platform-game/group',
    method: 'post',
    data
  });
}

// 修改服务器分组
export function fetchUpdateServerGroup(data: any) {
  return request({
    url: '/platform-game/group',
    method: 'put',
    data
  });
}

// 删除服务器分组
export function fetchDeleteServerGroup(params: { id: number }) {
  return request({
    url: `/platform-game/group/${params.id}`,
    method: 'delete'
  });
}


// 日志服务管理log
export function fetchGetServerlog() {
  return request({
    url: '/platform-game/log/list',
    method: 'get',
  });
}

// 添加日志服务管理log
export function fetGetServerAdd(data: any) {
  return request({
    url: '/platform-game/log',
    method: 'post',
    data
  })
}

// 修改日志服务管理log
export function fetchGetServerUpdate(data: any) {
  return request({
    url: '/platform-game/log',
    method: 'put',
    data
  })
}

// 删除日志服务管理log
export function fetchGetServerDelete(params: { id: number }) {
  return request({
    url: `/platform-game/log/${params.id}`,
    method: 'delete'
  })
}

// 服务器列表
export function fetchGetServeritemList(params?: { current: number; size: number; groupId?: string | number; groupIds?: (string | number)[] }) {
  return request({
    url: '/platform-game/item/list',
    method: 'get',
    params
  });
}

// 添加服务器列表
export function fetchGetServeritemAdd(data: any) {
  return request({
    url: '/platform-game/item',
    method: 'post',
    data
  })
}

export function fetchGetServeritemUpdate(data: any) {
  return request({
    url: '/platform-game/item',
    method: 'put',
    data
  })
}

// 获取服务器列表状态列表
export function fetchGetServeritemStatusList() {
  return request({
    url: '/platform-game/item/status',
    method: 'get'
  })
}


export function fetchGetServeritemDelete(params: { id: number }) {
  return request({
    url: `/platform-game/item/${params.id}`,
    method: 'delete'
  })
}

// 同步服务器状态 部署状态
export function fetchGetServeritemSync(params: { taskId: string }) {
  return request({
    url: `/platform-game/api/server/progress/${params.taskId}/update`,
    method: 'get'
  })
}

// 取消部署 部署状态
export function fetchCancelDeploy(params: { serverId: number }) {
  return request({
    url: '/platform-game/api/k8s/cancel-create',
    method: 'post',
    params
  })
}

// 白名单管理
export function fetchGetWhiteListManage(params?: { current: number; size: number; channelId?: string }) {
  return request({
    url: '/platform-game/white/list',
    method: 'get',
    params
  });
}

// 添加白名单
export function fetchAddWhiteListManage(data: any) {
  return request({
    url: '/platform-game/white',
    method: 'post',
    data
  })
}

// 修改白名单
export function fetchUpdateWhiteListManage(data: any) {
  return request({
    url: '/platform-game/white',
    method: 'put',
    data
  })
}

// 删除白名单
export function fetchDeleteWhiteListManage(params: { id: number }) {
  return request({
    url: `/platform-game/white/${params.id}`,
    method: 'delete'
  })
}

//获取server_id
export function fetchGetServerId() {
  return request({
    url: 'platform-game/region/servers',
    method: 'get',
  });
}

// 获取服务器列表树结构
export function fetchGetServerList() {
  return request({
    url: '/platform-game/group/itemsByGroup',
    method: 'get',
  });
}


// 获取用户白名单列表
export function fetchGetUserWhiteList(params?: { current: number; size: number; type?: string; }) {
  return request({
    url: '/platform-user/white/list',
    method: 'get',
    params
  });
}

//添加白名单
export function fetchAddUserWhiteList(data: any) {
  return request({
    url: '/platform-user/white/add',
    method: 'post',
    data
  })
}

// 删除白名单
export function fetchDeleteUserWhiteList(params: { id: number }) {
  return request({
    url: `/platform-user/white/${params.id}`,
    method: 'delete'
  })
}

// 修改白名单
export function fetchUpdateUserWhiteList(data: any) {
  return request({
    url: 'platform-user/white/edit',
    method: 'put',
    data
  })
}

// 排队设置接口
export function fetchQueuePlayerCount(data: { gameId: number; setto: number; serverList: number[] }) {
  return request({
    url: '/platform-game/server/queuePlayerCount',
    method: 'post',
    data
  })
}

//维护设置
export function fetchGetMaintenanceSetting(serverIds: number[]) {
  return request({
    url: '/platform-game/item/maintenance',
    method: 'post',
    data: serverIds
  });
}

// 正常模式
export function fetchSetNormalMode(serverIds: number[]) {
  return request({
    url: '/platform-game/item/normalstate',
    method: 'post',
    data: serverIds
  });
}
// 最大人数
export function fetchSetMaxPlayerCount(data: { gameId: number; setto: number; serverList: number[] }) {
  return request({
    url: '/platform-game/server/setPlayerCount',
    method: 'post',
    data
  });
}


// 同步GM地址
export function fetchgetServerInfo(params: { gmUrl: string }) {
  return request({
    url: `/platform-game/server/getServerInfo?gmUrl=${params.gmUrl}`,
    method: 'get'
  });
}

// ==================== 以下接口已废弃，统一使用历史数据接口 ====================
// 角色详情 - 已废弃，使用 fetchGetRoleVehicleInfo 替代
// export function fetchGetVehicleInfo(params: { roleId: number | string }) {
//   return request({
//     url: `/platform-user/client/getVehicleInfo?cuid=${params.roleId}`,
//     method: 'get',
//   });
// }

// 获取角色基本信息 - 已废弃，使用 fetchGetRoleInfo 替代
// export function fetchGetclientRoleList(params: { roleId: number | string }) {
//   return request({
//     url: `/platform-user/client/getRole?cuid=${params.roleId}`,
//     method: 'get',
//   });
// }

// 获取宠物信息 - 已废弃，使用 fetchGetRolePetInfo 替代
// export function fetchGetPetInfo(params: { roleId: number | string }) {
//   return request({
//     url: `/platform-user/client/getPetInfo?cuid=${params.roleId}`,
//     method: 'get',
//   });
// }

// 获取职业信息 - 已废弃，使用 fetchGetRoleProfessionInfo 替代
// export function fetchGetProfessionInfo(params: { roleId: number | string }) {
//   return request({
//     url: `/platform-user/client/getProfessionInfo?cuid=${params.roleId}`,
//     method: 'get',
//   });
// }

// 获取技能信息 - 已废弃，使用 fetchGetRoleSkillInfo 替代
// export function fetchGetSKillInfo(params: { roleId: number | string }) {
//   return request({
//     url: `/platform-user/client/getSkillInfo?cuid=${params.roleId}`,
//     method: 'get',
//   });
// }

// 获取任务信息 - 已废弃，使用 fetchGetRoleQuestInfo 替代
// export function fetchGetQuestInfo(params: { roleId: number | string }) {
//   return request({
//     url: `/platform-user/client/getQuestInfo?cuid=${params.roleId}`,
//     method: 'get',
//   });
// }

// 获取物品信息 - 已废弃，使用 fetchGetRoleItem 替代
// export function fetchGetItemInfo(params: { roleId: number | string }) {
//   return request({
//     url: `/platform-user/client/getItem1?cuid=${params.roleId}`,
//     method: 'get',
//   });
// }
// ==================== 以上接口已废弃 ====================




// 跑马灯
export function fetchGetMarquee(params?: { current: number; size: number; }) {
  return request({
    url: '/platform-operate/marquee/list',
    method: 'get',
    params
  });
}

// 添加跑马灯
export function fetchAddMarquee(data: any) {
  return request({
    url: '/platform-operate/marquee',
    method: 'post',
    data
  });
}

// 更新跑马灯
export function fetchUpdateMarquee(data: any) {
  return request({
    url: '/platform-operate/marquee',
    method: 'put',
    data
  });
}

// 删除跑马灯
export function fetchDeleteMarquee(params: { id: number }) {
  return request({
    url: `/platform-operate/marquee/${params.id}`,
    method: 'delete'
  });
}

// 发送跑马灯
export function fetchSendMarquee(params: { id: number }) {
  return request({
    url: `/platform-operate/marquee/start?id=${params.id}`,
    method: 'post'
  });
}

// 停止跑马灯
export function fetchStopMarquee(params: { id: number }) {
  return request({
    url: `/platform-operate/marquee/stop?id=${params.id}`,
    method: 'post'
  });
}

// 模板管理
export function fetchPostTemplateList(params?: { current: number; size: number; }) {
  return request({
    url: '/platform-operate/activityTemplate/list',
    method: 'post',
    params,
    data: params
  });
}

// 获取模板
export function fetchGetTemplate() {
  return request({
    url: `/platform-operate/activityGM/list`,
    method: 'get',
  });
}

export function fetchGetTemplateAll() {
  return request({
    url: `/platform-operate/activityTemplate/getAll`,
    method: 'get',
  });
}

// 添加模板
export function fetchAddTemplate(data: any) {
  return request({
    url: '/platform-operate/activityTemplate/add',
    method: 'post',
    data
  });
}

// 修改模板
export function fetchUpdateTemplate(data: any) {
  return request({
    url: '/platform-operate/activityTemplate/edit',
    method: 'put',
    data
  });
}

// 删除模板
export function fetchDeleteTemplate(params: { id: number }) {
  return request({
    url: `/platform-operate/activityTemplate/remove/${params.id}`,
    method: 'delete'
  });
}

// 获取活动公告
export function fetchGetActivityNotice(params?: { current: number; size: number; }) {
  return request({
    url: '/platform-operate/activity/list',
    method: 'post',
    params,
    data: params
  });
}

// 添加活动公告
export function fetchAddActivityNotice(data: any) {
  return request({
    url: '/platform-operate/activity/add',
    method: 'post',
    data
  });
}

// 修改活动模块
export function fetchUpdateActivityNotice(data: any) {
  return request({
    url: '/platform-operate/activity/edit',
    method: 'put',
    data
  });
}

// 删除活动模块
export function fetchDeleteActivityNotice(params: { id: number }) {
  return request({
    url: `/platform-operate/activity/remove/${params.id}`,
    method: 'delete'
  });
}

// 审核活动模块
export function fetchAuditActivityNotice(data: any) {
  return request({
    url: '/platform-operate/activity/audit',
    method: 'post',
    data
  });
}
// 启用停用
export function fetchEnableActivityNotice(data: any) {
  return request({
    url: '/platform-operate/activity/enable',
    method: 'post',
    data
  });
}
// 活动log
export function fetchGetActivityLog(params?: { current: number; size: number; }) {
  return request({
    url: '/platform-operate/activityLog/list',
    method: 'post',
    params,
    data: params
  });
}

// 查看详情
export function fetchGetActivityLogDetail(params: { id: number }) {
  return request({
    url: `/platform-operate/activity/get/${params.id}`,
    method: 'get'
  });
}

// 参数配置列表
export function fetchGetActivityGMList(params?: { current: number; size: number; }) {
  return request({
    url: '/platform-operate/activityGM/list1',
    method: 'post',
    params,
    data: params
  });
}

// 新增gm配置
export function fetchAddActivityGM(data: any) {
  return request({
    url: '/platform-operate/activityGM/add',
    method: 'post',
    data
  });
}

// 修改gm配置
export function fetchUpdateActivityGM(data: any) {
  return request({
    url: '/platform-operate/activityGM/edit',
    method: 'put',
    data
  });
}

// 删除gm配置
export function fetchDeleteActivityGM(params: { id: number }) {
  return request({
    url: `/platform-operate/activityGM/remove/${params.id}`,
    method: 'delete'
  });
}

// 模板参数配置列表
export function fetchGetActivityGMParamsList(params?: { current: number; size: number; }) {
  return request({
    url: '/platform-operate/activityGMParam/list',
    method: 'post',
    params,
    data: params
  });
}

// 新增参数配置
export function fetchAddActivityGMParams(data: any) {
  return request({
    url: '/platform-operate/activityGMParam/add',
    method: 'post',
    data
  });
}

// 修改参数配置
export function fetchUpdateActivityGMParams(data: any) {
  return request({
    url: '/platform-operate/activityGMParam/edit',
    method: 'put',
    data
  });
}

// 删除参数配置
export function fetchDeleteActivityGMParams(params: { id: number }) {
  return request({
    url: `/platform-operate/activityGMParam/remove/${params.id}`,
    method: 'delete'
  });
}
// 获取模板列表
export function fetchGetActivityGM() {
  return request({
    url: '/platform-operate/activityGM/list',
    method: 'get',
  });
}

// 获取活动图片
export function fetchGetActivityImages(params?: { current: number; size: number; }) {
  return request({
    url: '/platform-operate/activityImage/list',
    method: 'post',
    params,
    data: params
  });
}

// 添加活动图片
export function fetchAddActivityImages(data: any) {
  return request({
    url: '/platform-operate/activityImage/add',
    method: 'post',
    data
  });
}

// 修改活动图片
export function fetchUpdateActivityImages(data: any) {
  return request({
    url: '/platform-operate/activityImage/edit',
    method: 'put',
    data
  });
}

// 删除活动图片
export function fetchDeleteActivityImages(params: { id: number }) {
  return request({
    url: `/platform-operate/activityImage/remove/${params.id}`,
    method: 'delete'
  });
}

// 获取维护公告
export function fetchGetMaintenanceNotice(params?: { current: number; size: number; }) {
  return request({
    url: '/platform-operate/maintenanceNotice/list',
    method: 'post',
    params,
    data: params
  });
}

// 添加维护公告
export function fetchAddMaintenanceNotice(data: any) {
  return request({
    url: '/platform-operate/maintenanceNotice',
    method: 'post',
    data
  });
}

// 修改维护公告
export function fetchUpdateMaintenanceNotice(data: any) {
  return request({
    url: '/platform-operate/maintenanceNotice',
    method: 'put',
    data
  });
}

// 删除维护公告
export function fetchDeleteMaintenanceNotice(params: { id: number }) {
  return request({
    url: `/platform-operate/maintenanceNotice/${params.id}`,
    method: 'delete'
  });
}

// 获取公会列表
export function fetchGetGuildList(params?: Api.Common.CommonSearchParams) {
  return request({
    // url: `/platform-operate/operate/mail/guild/getGuildList`,
    url: '/platform-operate/guild/list',
    method: 'get',
    params,
    transformResponse: [
      function (data) {
        try {
          // 保留所有大整数为字符串
          return JSONbig({ storeAsString: true }).parse(data);
        } catch {
          return data;
        }
      }
    ]
  });
}

// 强制修改公会名称
export function fetchForceRenameGuild(data: any) {
  return request({
    url: `/platform-game/guild/changeGuildName`,
    method: 'post',
    data,
  });
}

// 强制修改公会公告
export function fetchForceEditAnnouncement(data: any) {
  return request({
    url: `/platform-game/guild/changeGuidNotice`,
    method: 'post',
    data,
  });
}

// 解散公会
export function fetchDisbandGuild(params?: { serverId: string, guildId: string; }) {
  return request({
    url: `/platform-game/guild/disband`,
    method: 'get',
    params
  });
}



// 获取易盾日志记录列表
export function fetchGetYidunRecordList(params?: { current: number; size: number; }) {
  return request({
    url: `/platform-user/yidun/record/list`,
    method: 'get',
    params,
  });
}

// 获取封禁规则列表
export function fetchGetBanRuleList(params?: { current: number; size: number; }) {
  return request({
    url: `/platform-user/banRule/list`,
    method: 'get',
    params,
  });
}


// 添加封禁规则
export function fetchAddBanRule(data: any) {
  return request({
    url: `/platform-user/banRule/add`,
    method: 'post',
    data,
  });
}

// 修改封禁规则
export function fetchUpdateBanRule(data: any) {
  return request({
    url: `/platform-user/banRule/edit`,
    method: 'put',
    data,
  });
}

// 删除封禁规则
export function fetchDeleteBanRule(id: number) {
  return request({
    url: `/platform-user/banRule/${id}`,
    method: 'delete',
  })
}


// 获取公会邮件列表
export function fetchGetGuildMailList(params?: { current: number; size: number; }) {
  return request({
    url: `/platform-operate/operate/mail/guild/list`,
    method: 'get',
    params,
  });
}

// 获取公会邮件列表不带分页
export function fetchGetGuildMailListNoPage(params?: { serverId: number, current: number; size: number; }) {
  return request({
    url: `/platform-operate/operate/mail/guild/getGuidNoPage`,
    method: 'get',
    params,
  });
}

// 添加邮件公会
export function fetchAddGuildMail(data: any) {
  return request({
    url: `/platform-operate/operate/mail/guild/add`,
    method: 'post',
    data,
  });
}

// 修改公会邮件
export function fetchUpdateGuildMail(data: any) {
  return request({
    url: `/platform-operate/operate/mail/guild/edit`,
    method: 'put',
    data,
  });
}

// 发送公会邮件
export function fetchSendGuildMail(id: number) {
  return request({
    url: `/platform-operate/operate/mail/guild/start?id=${id}`,
    method: 'post',
  })
}

//停止发送公会邮件
export function fetchStopSendGuildMail(id: number) {
  return request({
    url: `/platform-operate/operate/mail/guild/stop?id=${id}`,
    method: 'post',
  })
}

// 删除公会邮件
export function fetchDeleteGuildMail(id: number) {
  return request({
    url: `/platform-operate/operate/mail/guild/remove/${id}`,
    method: 'delete',
  })
}

// 导入公会邮件
export function fetchImportGuildMail(data: any) {
  return request({
    url: `/platform-operate/operate/mail/guild/importExcel`,
    method: 'post',
    data,
  })
}

// 下载导入公会模板
export function fetchDownloadImportGuildMailTemplate() {
  return request({
    url: `/platform-operate/operate/mail/guild/downloadTemplate`,
    method: 'get',
    responseType: 'blob'
  })
}


// 查询用户留存列表
export function fetchGetUserRetentionList(params?: { current: number; size: number; channelId?: string; dataType?: string; ignoreTypes?: string; }) {
  return request({
    url: '/platform-bi/retentionUser/list',
    method: 'get',
    params,
  });
}

// 查询活跃留存列表
export function fetchGetActiveRetentionList(params?: { current: number; size: number; channelId?: string; dataType?: string; ignoreTypes?: string; }) {
  return request({
    url: '/platform-bi/retentionUser/actionList',
    method: 'get',
    params,
  });
}

// 查询角色用户留存列表
export function fetchGetRoleRetentionList(params?: { current: number; size: number; channelId?: string; dataType?: string; serverId?: string; ignoreTypes?: string; }) {
  return request({
    url: '/platform-bi/retentionRole/list',
    method: 'get',
    params
  });
}

// 支付留存
export function fetchGetPayRetentionList(params?: { current: number; size: number; channelId?: string; dataType?: string; beginTime?: string; }) {
  return request({
    url: '/platform-bi/retentionPayed/list',
    method: 'get',
    params
  });
}

// 用户角色留存
export function fetchGetRolePayRetentionList(params?: { current: number; size: number; channelId?: string; dataType?: string; serverId?: string; ignoreTypes?: string; }) {
  return request({
    url: '/platform-bi/retentionPayRole/list',
    method: 'get',
    params,
  });
}

// 角色概览接口
export function fetchGetRoleOverview(params?: { current: number; size: number; channelId?: string; dataType?: string; serverId?: string; ignoreTypes?: string; }) {
  return request({
    url: '/platform-bi/OverviewRole/overview/role',
    method: 'get',
    params
  });
}

// 聊天监控接口（新格式 - 事件分析）
export function fetchChatMonitor(params?: {
  eventView?: {
    comparedByTime?: boolean;
    comparedTimeList?: any[];
    endTime?: string;
    filts?: any[];
    groupBy?: any[];
    recentDay?: string;
    relation?: string;
    startTime?: string;
    timeParticleSize?: string;
  };
  events?: any[];
  projectId?: number;
}) {
  return request({
    url: '/platform-bi/OverviewRole/overview/role',
    method: 'post',
    data: params
  });
}

// 用户概览接口
export function fetchGetUserOverview(params?: { current: number; size: number; channelId?: string; dataType?: string; serverId?: string; ignoreTypes?: string; }) {
  return request({
    url: '/platform-bi/OverviewUserDevice/user',
    method: 'get',
    params
  });
}

// 获取商品管理列表
export function fetchGetProductList(params?: { current: number; size: number; channelId?: string }) {
  return request({
    url: '/platform-game/gameProduct/list',
    method: 'get',
    params
  });
}

// 添加商品
export function fetchAddProduct(data: any) {
  return request({
    url: '/platform-game/gameProduct',
    method: 'post',
    data
  });
}

// 修改商品
export function fetchUpdateProduct(data: any) {
  return request({
    url: '/platform-game/gameProduct',
    method: 'put',
    data
  });
}

// 删除商品
export function fetchDeleteProduct(params: { id: number }) {
  return request({
    url: `/platform-game/gameProduct/${params.id}`,
    method: 'delete'
  });
}

// 导入商品
export function fetchImportProduct(data: any) {
  return request({
    url: '/platform-game/gameProduct/importCoverData',
    method: 'post',
    data
  });
}

// 导出商品
export function fetchExportProduct(params: { channelId: string }) {
  return request({
    url: '/platform-game/gameProduct/export',
    method: 'post',
    params,
    responseType: 'blob'
  });
}

// 下载模板
export function fetchDownloadTemplate(params: { channelId: string }) {
  return request({
    url: '/platform-game/gameProduct/downloadTemplate',
    method: 'get',
    params,
    responseType: 'blob'
  });
}

// 获取元宝商城列表
export function fetchGemsShopList(params?: { current: number; size: number; channelId?: string }) {
  return request({
    url: '/platform-game/gemsShop/list',
    method: 'get',
    params
  });
}

// 添加元宝商城
export function fetchAddGemsShop(data: any) {
  return request({
    url: '/platform-game/gemsShop',
    method: 'post',
    data
  });
}

// 修改元宝商城
export function fetchUpdateGemsShop(data: any) {
  return request({
    url: '/platform-game/gemsShop',
    method: 'put',
    data
  });
}

// 导入元宝商城
export function fetchImportGemsShop(data: any) {
  return request({
    url: '/platform-game/gemsShop/import',
    method: 'post',
    data
  });
}

// 导出元宝商城
export function fetchExportGemsShop(data: { serverId?: string }) {
  return request({
    url: '/platform-game/gemsShop/export',
    method: 'get',
    data,
    responseType: 'blob'
  });
}

// 下载元宝商城模板
export function fetchDownloadGemsShopTemplate(params: { serverId?: string }) {
  return request({
    url: '/platform-game/gemsShop/downloadTemplate',
    method: 'get',
    params,
    responseType: 'blob'
  });
}

// 删除元宝商城商品
export function fetchDeleteGemsShop(params: { id: number }) {
  return request({
    url: `/platform-game/gemsShop/${params.id}`,
    method: 'delete'
  });
}

// 同步跨服元宝商城
export function fetchSyncGemsShop(serverIds: number[]) {
  return request({
    url: `/platform-game/gemsShop/syncFile/${serverIds}`,
    method: 'get',
    data: {
      serverIds
    }
  });
}

// 获取内置商城
export function fetchStoreList(params?: { serverId?: string; keyword?: string }) {
  return request({
    url: '/platform-game/store/list',
    method: 'get',
    params
  });
}

// 导入内置商城
export function fetchImportStore(data: FormData) {
  return request({
    url: '/platform-game/store/import',
    method: 'post',
    data
  });
}

//导出内置商城
export function fetchExportStore(params: { serverId?: string }) {
  return request({
    url: '/platform-game/store/export',
    method: 'get',
    params,
    responseType: 'blob'
  });
}

// 同步内置商城
export function fetchSyncStore(serverIds: number[]) {
  // 将数组转换为查询参数字符串格式：serverIds=1&serverIds=2&serverIds=3
  const params = new URLSearchParams();
  serverIds.forEach(id => {
    params.append('serverIds', String(id));
  });

  return request({
    url: `/platform-game/store/syncToJson?${params.toString()}`,
    method: 'post'
  });
}

// 获取发放商城列表
export function fetchGetStoreList(params?: { current: number; size: number; }) {
  return request({
    url: '/platform-game/reward/list',
    method: 'get',
    params
  });
}

// 导入发放商城
export function fetchImportReward(data: FormData) {
  return request({
    url: '/platform-game/reward/import',
    method: 'post',
    data
  });
}

// 导出发放商城
export function fetchExportReward(params: { serverId?: string }) {
  return request({
    url: '/platform-game/reward/export',
    method: 'get',
    params,
    responseType: 'blob'
  });
}

// 同步发放商城
export function fetchSyncReward(serverIds: number | number[]) {
  const ids = Array.isArray(serverIds) ? serverIds : [serverIds];
  return request({
    url: '/platform-game/reward/syncToJson',
    method: 'post',
    params: { serverIds: ids },
    paramsSerializer: (params) => {
      // 将数组序列化为 serverIds=1&serverIds=2&serverIds=3 格式
      return params.serverIds.map((id: number) => `serverIds=${id}`).join('&');
    }
  });
}



// 获取服务器文件列表
export function fetchServerFileList(params?: { path?: string; serverId?: string; keyword?: string }) {
  return request({
    url: '/platform-operate/serverFile/file/list',
    method: 'get',
    params
  });
}

// 下载服务器文件
export function fetchDownloadServerFile(params?: { dir?: string; fileName?: string; serverId?: string }) {
  return request({
    url: '/platform-operate/serverFile/file/download',
    method: 'get',
    params,
    responseType: 'blob'
  });
}

// 上传服务器文件
export function fetchUploadServerFile(data: FormData) {
  return request({
    url: '/platform-operate/serverFile/file/upload',
    method: 'post',
    data,
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    timeout: 300000 // 5分钟超时
  });
}

// 获取文件的哈希值
export function fetchGetFileHash(params?: { dir?: string; fileName?: string; serverId?: string }) {
  return request({
    url: '/platform-operate/serverFile/file/hash',
    method: 'get',
    params
  });
}

// 创建文件夹
// 创建文件夹（支持多服务器）
export function fetchCreateFolder(data: FormData) {
  return request({
    url: '/platform-operate/serverFile/folder/create',
    method: 'post',
    data
  });
}

// 删除文件
export function fetchDeleteFile(params: { path: string; name: string; serverId: string | number }) {
  return request({
    url: '/platform-operate/serverFile/delete',
    method: 'delete',
    params
  });
}

// 重命名文件或文件夹 - 统一接口
export function fetchRenameFile(params: { path: string; oldName: string; newName: string; serverId: string | number }) {
  return request({
    url: '/platform-operate/serverFile/rename',
    method: 'post',
    params: {
      ...params,
      serverId: Number(params.serverId) // 确保serverId为数字类型
    }
  });
}

// 订单管理页
export function fetchGetOrderList(params?: Api.Common.CommonSearchParams) {
  // (params?: {
  //   current: number;
  //   size: number;
  //   channelId?: string;
  //   serverId?: string;
  //   openId?: string;
  //   roleId?: string;
  //   itemId?: string;
  //   orderNo?: string;
  //   outOrderNo?: string;
  //   uid?: string;
  //   loginName?: string;
  //   status?: string;
  //   statusList?: string[];
  //   callbackStatus?: string;
  // })
  return request({
    url: '/platform-pay/order/quick/list',
    method: 'get',
    params,
    transformResponse: [
      function (data) {
        try {
          // 保留所有大整数为字符串
          return JSONbig({ storeAsString: true }).parse(data);
        } catch {
          return data;
        }
      }
    ]
  });
}

// 状态检查
export function fetchCheckStatus(params: { outOrderNo: string | number, serverId: string | number }) {
  return request({
    url: '/platform-pay/order/order/status',
    method: 'get',
    params,
    transformResponse: [
      function (data) {
        try {
          // 保留所有大整数为字符串
          return JSONbig({ storeAsString: true }).parse(data);
        } catch {
          return data;
        }
      }
    ]
  });
}

// 批量补单
export function fetchBatchRecharge(data: any) {
  return request({
    url: '/platform-pay/order/reissue/batch',
    method: 'post',
    data
  });
}


// 区服活动
export function fetchGetServerActivityList(data?: { current: number; size: number; serverId?: number; }) {
  return request({
    url: `/platform-operate/relay/activity/list`,
    method: 'post',
    data
  });
}

// 区服活动
// export function fetchGetServerActivityList(params?: { current: number; size: number; serverId?: number; }) {
//   return request({
//     url: `/platform-operate/relay/activity/list`,
//     method: 'get',
//     params
//   });
// }



// 新增区服活动
export function fetchAddServerActivity(data: any) {
  return request({
    url: `/platform-operate/relay/activity/add`,
    method: 'post',
    data
  });

}

// export function fetchGetServerActivityList(params?: { current: number; size: number; serverId?: number; }) {
//   return request({
//     url: `/platform-operate/relay/activity/list`,
//     method: 'get',
//     params
//   });
// }


// 开启区服活动
export function fetchGetServerActivity(serverId: number, activityGuid: string) {
  return request({
    url: `/platform-operate/relay/activity/buildGmJson`,
    method: 'post',
    data: {
      serverId,
      activityGuid
    }
  });
}

// 控制活动开启关闭/删除
export function fetchToggleServerActivity(data: {
  serverId: number;
  activityGuid: string;
  tag: number;
  isDel?: boolean;
}) {
  return request({
    url: `/platform-operate/relay/activity/buildGmJson`,
    method: 'post',
    data
  });
}


// 动态副本列表
export function fetchGetDynamicEventDungeonList(params?: { current: number; size: number; serverId?: number; }) {
  return request({
    url: `/platform-operate/relay/activity/dynamicDungeons`,
    method: 'get',
    params
  });
}

// 新增动态副本
export function fetchAddDynamicEventDungeon(data: any) {
  return request({
    url: `/platform-operate/relay/activity/addDynamicDungeon`,
    method: 'post',
    data
  });
}

// 更新动态副本
export function fetchUpdateDynamicDungeon(data: any) {
  return request({
    url: `/platform-operate/relay/activity/updateDynamicDungeon`,
    method: 'post',
    data
  });
}

// 删除活动副本
export function fetchDeleteDynamicEventDungeon(data: {
  serverIds: number[];  // 服务器ID数组
  indunId: number;      // 副本配置ID
}) {
  return request({
    url: `/platform-operate/relay/activity/deleteDynamicDungeon`,
    method: 'post',
    data
  });
}

// 控制副本开启关闭
export function fetchToggleDynamicEventDungeon(data: {
  serverIds: number[];  // 服务器ID数组
  indunId: number;      // 副本配置ID
  isClosed: number;     // 开关状态：0-开启，1-关闭
}) {
  return request({
    url: `/platform-operate/relay/activity/toggleDynamicDungeon`,
    method: 'post',
    data
  });
}

// 获取用户LTV
export function fetchGetUserLTV(params?: { current: number; size: number; channelId?: string; dataType?: string; serverId?: string; ignoreTypes?: string; }) {
  return request({
    url: '/platform-bi/bi/ltv/user',
    method: 'get',
    params
  });
}

// 付费LTV
export function fetchGetPayLTV(params?: { current: number; size: number; channelId?: string; dataType?: string; serverId?: string; ignoreTypes?: string; }) {
  return request({
    url: '/platform-bi/bi/ltv/payed',
    method: 'get',
    params
  });
}

// 获取服务器跨服列表
export function fetchGetServerCrossList(params?: { current: number; size: number; }) {
  return request({
    url: '/platform-game/serverCrossRelation/crossServerList',
    method: 'get',
    params
  });
}

// 获取跨服下的普通服列表
export function fetchGetServerCrossServerList(crossServerId: number) {
  return request({
    url: `/platform-game/serverCrossRelation/getNormalByCrossId/${crossServerId}`,
    method: 'get'
  });
}

// 批量分配跨服关联
export function fetchBatchAddServerCross(data: any) {
  return request({
    url: '/platform-game/serverCrossRelation/batchAdd',
    method: 'post',
    data
  });
}

// 同步跨服接口 (改为 POST)
export function fetchSyncServerCross(data: { gameId: number; crossServerId: number; serverIds: number[] }) {
  return request({
    url: '/platform-game/server/syncCrossServer',
    method: 'post',
    data
  });
}



// 获取问卷列表
export function fetchGetQuestionnaireList(params?: { current: number; size: number; }) {
  return request({
    url: '/platform-operate/survey/list',
    method: 'get',
    params
  });
}

// 新增问卷列表
export function fetchAddQuestionnaire(data: any) {
  return request({
    url: '/platform-operate/survey',
    method: 'post',
    data
  });
}

// 修改问卷列表
export function fetchUpdateQuestionnaire(data: any) {
  return request({
    url: '/platform-operate/survey',
    method: 'put',
    data
  });
}

// 删除问卷列表
export function fetchDeleteQuestionnaire(params: { id: number }) {
  return request({
    url: `/platform-operate/survey/${params.id}`,
    method: 'delete'
  });
}

// 获取问卷记录
export function fetchGetQuestionnaireRecord(params?: { current: number; size: number; }) {
  return request({
    url: '/platform-operate/survey/answer/list',
    method: 'get',
    params,
    transformResponse: [
      function (data) {
        try {
          // 保留所有大整数为字符串
          return JSONbig({ storeAsString: true }).parse(data);
        } catch {
          return data;
        }
      }
    ]
  });
}

// 导出问卷记录
export function fetchExportQuestionnaireRecord() {
  return request({
    url: '/platform-operate/survey/export',
    method: 'get',
    responseType: 'blob'
  });
}

// 获取礼包活动列表
export function fetchGetGiftActivityList(params?: { current: number; size: number; }) {
  return request({
    url: '/platform-operate/gift/campaign/list',
    method: 'get',
    params
  });
}

// 新增礼包活动
export function fetchAddGiftActivity(data: any) {
  return request({
    url: '/platform-operate/gift/campaign',
    method: 'post',
    data
  });
}

// 修改礼包活动
export function fetchUpdateGiftActivity(data: any) {
  return request({
    url: '/platform-operate/gift/campaign',
    method: 'put',
    data
  });
}

// 删除礼包活动
export function fetchDeleteGiftActivity(params: { id: number }) {
  return request({
    url: `/platform-operate/gift/campaign/${params.id}`,
    method: 'delete'
  });
}

// 获取礼包批次列表
export function fetchGetGiftBatchList(params?: { current: number; size: number; campaignId?: number; }) {
  return request({
    url: '/platform-operate/giftCodeBatch/list',
    method: 'get',
    params
  });
}

// 创建专码批次
export function fetchAddGiftBatch(data: any) {
  return request({
    url: '/platform-operate/giftCodeBatch/unique/create',
    method: 'post',
    data
  });
}
// 创建通码批次
export function fetchAddGiftBatchPublic(data: any) {
  return request({
    url: '/platform-operate/giftCodeBatch/public/create',
    method: 'post',
    data
  });
}

// 修改礼包批次
export function fetchUpdateGiftBatch(data: any) {
  return request({
    url: '/platform-operate/giftCodeBatch',
    method: 'put',
    data
  });
}

// 作废礼包批次
export function fetchInvalidGiftBatch(params: { id: number }) {
  return request({
    url: `/platform-operate/giftCodeBatch/logic/${params.id}`,
    method: 'delete'
  });
}

// 生成兑换码
export function fetchGenerateGiftCodes(data: { batchId: number }) {
  return request({
    url: '/platform-operate/giftCodeBatch/generate',
    method: 'post',
    data
  });
}

// 查看兑换码
export function fetchGetGiftCodes(params: { batchId: number }) {
  return request({
    url: '/platform-operate/gift/code/list',
    method: 'get',
    params,
    transformResponse: [
      function (data) {
        try {
          return JSONbig({ storeAsString: true }).parse(data);
        } catch {
          return data;
        }
      }
    ]
  });
}

// 分配区服范围
export function fetchAssignServerRange(data: { campaignId: number, serverIds: string[] }) {
  return request({
    url: '/platform-operate/gift/campaignServer/add',
    method: 'post',
    data
  });
}


// 分配渠道范围
export function fetchAssignChannelRange(data: { campaignId: number, channelIds: string[] }) {
  return request({
    url: '/platform-operate/gift/campaignChannel/add',
    method: 'post',
    data
  });
}

// 按活动查询分配的渠道列表
export function fetchGetAssignChannelList(params: { campaignId: number }) {
  return request({
    url: `/platform-operate/gift/campaignChannel/list/${params.campaignId}`,
    method: 'get',
    params
  });
}

// 按活动查询分配的区服列表
export function fetchGetAssignServerList(params: { campaignId: number }) {
  return request({
    url: `/platform-operate/gift/campaignServer/list/${params.campaignId}`,
    method: 'get',
    params
  });
}

// 兑换记录
export function fetchGetGiftRecordList(params: {
  current: number;
  size: number;
  channelId?: number;
  channelName?: string;
  status?: number;
  openId?: string;
  serverId?: number;
}) {
  return request({
    url: '/platform-operate/gift/redeem/list',
    method: 'get',
    params,
    transformResponse: [
      function (data) {
        try {
          return JSONbig({ storeAsString: true }).parse(data);
        } catch {
          return data;
        }
      }
    ]
  });
}

// 导出兑换码
export function fetchExportGiftRecord(data: { batchId: number }) {
  return request({
    url: '/platform-operate/gift/redeem/export',
    method: 'post',
    data,
    responseType: 'blob'
  });
}

// 礼包码兑换码导出
export function fetchExportGiftCodes(data: { batchId: number }) {
  return request({
    url: '/platform-operate/gift/code/export',
    method: 'post',
    data,
    responseType: 'blob'
  });
}

// 导入角色数据
export function fetchImportRoleData(data: any) {
  return request({
    url: '/platform-operate/operate/mail/multiple/importExcel',
    method: 'post',
    data
  });
}

// 下载导入角色模板
export function fetchDownloadImportRoleTemplate() {
  return request({
    url: '/platform-operate/operate/mail/multiple/downloadTemplate',
    method: 'get',
    responseType: 'blob'
  });
}


// 获取服务列表
export function fetchGetServiceList(params?: { current: number; size: number; typeCode?: string; typeName?: string; isEnabled?: number }) {
  return request<Api.SystemManage.ServiceList>({
    url: '/platform-game/serviceType/list',
    method: 'get',
    params
  });
}

// 添加服务
export function fetchAddService(data: any) {
  return request({
    url: '/platform-game/serviceType',
    method: 'post',
    data
  });
}

// 修改服务
export function fetchUpdateService(data: any) {
  return request({
    url: '/platform-game/serviceType',
    method: 'put',
    data
  });
}

// 删除服务
export function fetchDeleteService(params: { id: number }) {
  return request({
    url: `/platform-game/serviceType/${params.id}`,
    method: 'delete'
  });
}

// 获取服务参数列表
export function fetchGetServiceParamList(params: { serviceTypeId: number }) {
  return request({
    url: '/platform-game/serviceParamDefinition/list',
    method: 'get',
    params
  });
}

// 添加服务参数
export function fetchAddServiceParam(data: any) {
  return request({
    url: '/platform-game/serviceParamDefinition',
    method: 'post',
    data
  });
}

// 更新服务参数
export function fetchUpdateServiceParam(data: any) {
  return request({
    url: '/platform-game/serviceParamDefinition',
    method: 'put',
    data
  });
}

// 删除服务参数
export function fetchDeleteServiceParam(params: { id: number }) {
  return request({
    url: `/platform-game/serviceParamDefinition/${params.id}`,
    method: 'delete'
  });
}

// 更新服务状态
export function fetchUpdateServiceStatus(params: { id: number; isEnabled: number }) {
  return request({
    url: `/platform-game/serviceType/${params.id}/status`,
    method: 'put',
    data: { isEnabled: params.isEnabled }
  });
}

/** ==================== 规格模板管理 ==================== */
// 获取规格模板列表
export function fetchGetSpecList(params?: Api.SystemManage.SpecSearchParams) {
  return request<Api.SystemManage.SpecList>({
    url: '/platform-game/specTemplate/list',
    method: 'get',
    params
  });
}

// 获取规格下的服务
export function fetchGetSpecServiceList(params: { specId: number }) {
  return request({
    url: `/platform-game/serviceInstance/overview/${params.specId}`,
    method: 'get',
    params
  });
}

// 复制规格模板
export function fetchCopySpec(data: { id: number; newSpecName: string; newSpecCode: string }) {
  const { id, newSpecName, newSpecCode } = data;
  return request({
    url: `/platform-game/specTemplate/${id}/copy`,
    method: 'post',
    params: {
      newSpecName,
      newSpecCode
    }
  });
}

// 添加规格模板
export function fetchAddSpec(data: any) {
  return request({
    url: '/platform-game/specTemplate',
    method: 'post',
    data
  });
}

// 修改规格模板
export function fetchUpdateSpec(data: any) {
  return request({
    url: '/platform-game/specTemplate',
    method: 'put',
    data
  });
}

// 删除规格模板
export function fetchDeleteSpec(params: { id: number | number[] }) {
  return request({
    url: `/platform-game/specTemplate/${params.id}`,
    method: 'delete'
  });
}


// 导入规格
export function fetchImportSpec(data: any) {
  return request({
    url: '/platform-game/serviceInstance/import-params',
    method: 'post',
    data
  });
}

// 导出规格
export function fetchExportSpec() {
  return request({
    url: '/platform-game/serviceInstance/export-params',
    method: 'get',
    responseType: 'blob'
  });
}

// 下载规格模板
export function fetchDownloadTemplateSpec() {
  return request({
    url: '/platform-game/serviceInstance/export-params',
    method: 'get',
    responseType: 'blob'
  });
}

// 获取服务实力的所有参数值
export function fetchGetServiceParamValue(params: { instanceId: number }) {
  return request({
    url: '/platform-game/serviceInstanceParamValue/list',
    method: 'get',
    params
  });
}

// 同步云服务器接口
export function fetchSyncCloudServer(serverId: number, chart_name: string, chart_version: string) {
  return request({
    url: '/platform-game/api/server/create',
    method: 'post',
    params: {
      serverId,
      chart_name,
      chart_version
    }
  });
}

//更新服务器
export function fetchUpdateServer(serverId: number, chart_name: string, chart_version: string) {
  return request({
    url: `/platform-game/api/server/update`,
    method: 'post',
    params: {
      serverId,
      chart_name,
      chart_version
    }
  });
}

// 停止服务器
export function fetchStopServer(serverId: number) {
  return request({
    url: '/platform-game/api/k8s/scale-down',
    method: 'post',
    params: {
      serverId
    }
  });
}

// 重启服务器
export function fetchRestartServer(serverId: number) {
  return request({
    url: '/platform-game/api/k8s/restart-pods',
    method: 'post',
    params: {
      serverId
    }
  });
}

// 开启服务器接口
export function fetchStartServer(serverId: number) {
  return request({
    url: '/platform-game/api/k8s/scale-up',
    method: 'post',
    params: {
      serverId
    }
  });
}

// 获取更新服务器的状态
export function fetchUpdateServerStatus(taskId: string) {
  return request({
    url: `/platform-game/api/server/update-progress/${taskId}/summary`,
    method: 'get'
  });
}

// 获取同步云服务器状态
export function fetchSyncCloudServerStatus(taskId: string) {
  return request({
    url: `/platform-game/api/server/progress/${taskId}/summary`,
    method: 'get'
  });
}

// 获取同步云服务日志 - SSE流
export function fetchSyncCloudServerLog(taskId: string) {
  return request({
    url: `/platform-game/api/server/task/${taskId}/history`,
    method: 'get'
  });
}

// 释放服务器
export function fetchReleaseServer(serverId: number) {
  return request({
    url: '/platform-game/api/server/delete',
    method: 'post',
    params: {
      serverId
    }
  });
}

// 获取释放服务器状态
export function fetchReleaseServerStatus(taskId: string) {
  return request({
    url: `/platform-game/api/server/delete-progress/${taskId}/summary`,
    method: 'get'
  });
}

// 查看服务器所有仓库列表
export function fetchServerRepos() {
  return request({
    url: '/platform-game/api/k8s/acr/repositories',
    method: 'get'
  })
}

// 查看某一个仓库当中的包
export function fetchServerRepoCharts(params: { repoId: string | number }) {
  return request({
    url: '/platform-game/api/k8s/acr/charts',
    method: 'get',
    params: {
      repoId: params.repoId
    }
  });
}

// 查看服务器configMap列表
export function fetchServerConfigMaps(serverId: number) {
  return request({
    url: '/platform-game/api/k8s/configmap/list',
    method: 'get',
    params: {
      serverId
    }
  });
}

// 查看ConfigMap详情
export function fetchServerConfigMapDetail(configMapId: number) {
  return request({
    url: '/platform-game/api/k8s/configmap/detail',
    method: 'get',
    params: {
      configMapId
    }
  });
}

// 查看ConfigMap内容
export function fetchServerConfigMapContent(params: {
  serverId: string | number;
  configmapName: string;
}) {
  return request({
    url: '/platform-game/api/k8s/configmap/content',
    method: 'get',
    params
  });
}

// 修改ConfigMap内容
export function fetchUpdateServerConfigMapContent(data: any) {
  return request({
    url: '/platform-game/api/k8s/configmap/update',
    method: 'post',
    data
  });
}


// 查询GS角色标记列表
export function fetchGetGsRoleTagsList(params?: {
  current: number;
  size: number;
  roleId: number;
  tagType: number;
  userName: string;
  status: number;
}) {
  return request({
    url: '/platform-operate/gsRoleTags/list',
    method: 'get',
    params,
    transformResponse: [
      function (data) {
        try {
          // 保留所有大整数为字符串
          return JSONbig({ storeAsString: true }).parse(data);
        } catch {
          return data;
        }
      }
    ]
  });
}

// 添加GS角色标记
export function fetchAddGsRoleTag(data: any) {
  return request({
    url: '/platform-operate/gsRoleTags',
    method: 'post',
    data
  });
}

// 修改GS角色标记
export function fetchUpdateGsRoleTag(data: any) {
  return request({
    url: '/platform-operate/gsRoleTags',
    method: 'put',
    data
  });
}

// 审核GS角色标记
export function fetchAuditGsRoleTag(data: any) {
  return request({
    url: '/platform-operate/gsRoleTags/audit',
    method: 'post',
    data
  });
}

//移除标记
export function fetchRemoveGsRoleTag(params: { id: number }) {
  return request({
    url: `/platform-operate/gsRoleTags/${params.id}`,
    method: 'delete'
  });
}


// 统计标记信息
export function fetchGetGsRoleTagStatistics(params?: { roleId?: number }) {
  return request({
    url: `/platform-operate/gsRoleTags/statistics`,
    method: 'get',
    params
  });
}

// 发放物品
export function fetchSendItems(data: any) {
  return request({
    url: '/platform-operate/gsGrantRecords/grantItem',
    method: 'post',
    data
  });
}

// 删除物品
export function fetchDeleteItems(data: any) {
  return request({
    url: `/platform-operate/gsGrantRecords/deleteItem`,
    method: 'post',
    data
  });
}

// 获取GS订单
export function fetchGetGsOrderList(params?: {
  current: number;
  size: number;
  channelId?: string;
  serverId?: string;
  openId?: string;
  roleId?: string;
  itemId?: string;
  orderNo?: string;
  outOrderNo?: string;
  uid?: string;
  loginName?: string;
  status?: string;
  statusList?: string[];
  callbackStatus?: string;
}) {
  return request({
    url: '/platform-operate/gsOrder/list',
    method: 'get',
    params,
    transformResponse: [
      function (data) {
        try {
          // 保留所有大整数为字符串
          return JSONbig({ storeAsString: true }).parse(data);
        } catch {
          return data;
        }
      }
    ]
  });
}

// 获取发放记录列表
export function fetchGetGsGrantRecordsList(params?: {
  current: number;
  size: number;
  roleId?: number;
  targetType?: number;
  grantType?: number;
  operator?: string;
}) {
  return request({
    url: '/platform-operate/gsGrantRecords/list',
    method: 'get',
    params,
    transformResponse: [
      function (data) {
        try {
          // 保留所有大整数为字符串
          return JSONbig({ storeAsString: true }).parse(data);
        } catch {
          return data;
        }
      }
    ]
  });
}


// gs操作日志
export function fetchGetGsOperateLogsList(params: {
  current: number;
  size: number;
  operator?: string;
  operationType?: string;
  roleId?: string;
  startDate?: string;
  endDate?: string;
}) {
  return request({
    url: '/platform-operate/gsOperationLogs/list',
    method: 'get',
    params,
    transformResponse: [
      function (data) {
        try {
          // 保留所有大整数为字符串
          return JSONbig({ storeAsString: true }).parse(data);
        } catch {
          return data;
        }
      }
    ]
  });
}

// 传宝阁b2c订单列表
export function fetchGetB2cOrderList(params?: Api.Common.CommonSearchParams) {
  return request({
    // url: `/platform-operate/operate/mail/guild/getGuildList`,
    url: '/platform-treasure/transaction/shipping/list',
    method: 'get',
    params,
    transformResponse: [
      function (data) {
        try {
          // 保留所有大整数为字符串
          return JSONbig({ storeAsString: true }).parse(data);
        } catch {
          return data;
        }
      }
    ]
  });
}

// 传宝阁C2C订单列表
export function fetchGetC2cOrderList(params?: Api.Common.CommonSearchParams) {
  return request({
    url: '/platform-treasure/transaction/consignment/list',
    method: 'get',
    params,
    transformResponse: [
      function (data) {
        try {
          // 保留所有大整数为字符串
          return JSONbig({ storeAsString: true }).parse(data);
        } catch {
          return data;
        }
      }
    ]
  });
}

// 传宝阁发货C2C状态检查
export function fetchCheckC2cOrderStatus(params: { consignmentId: string | number; serverId: string | number; status: string | number }) {
  return request({
    url: '/platform-treasure/transaction/transaction/status',
    method: 'get',
    params,
    transformResponse: [
      function (data) {
        try {
          // 保留所有大整数为字符串
          return JSONbig({ storeAsString: true }).parse(data);
        } catch {
          return data;
        }
      }
    ]
  });
}

// 传宝阁C2C补单列表
export function fetchGetC2cOrderListForSupplement(params?: Api.Common.CommonSearchParams) {
  return request({
    url: '/platform-treasure/transaction/resend/history',
    method: 'get',
    params,
    transformResponse: [
      function (data) {
        try {
          // 保留所有大整数为字符串
          return JSONbig({ storeAsString: true }).parse(data);
        } catch {
          return data;
        }
      }
    ]
  });
}

// 传宝阁C2C重新发货
export function fetchC2cReship(params: { consignmentId: string | number; serverId: string | number; plaintext?: string }) {
  return request({
    url: '/platform-treasure/transaction/reship',
    method: 'post',
    data: params,
    transformResponse: [
      function (data) {
        try {
          return JSONbig({ storeAsString: true }).parse(data);
        } catch {
          return data;
        }
      }
    ]
  });
}

// 传宝阁历史订单
export function fetchGetHistoryOrderList(params?: Api.Common.CommonSearchParams) {
  return request({
    url: '/platform-treasure/transaction/consignment/history/list',
    method: 'get',
    params,
    transformResponse: [
      function (data) {
        try {
          return JSONbig({ storeAsString: true }).parse(data);
        } catch {
          return data;
        }
      }
    ]
  });
}

// 传宝阁C2C补单
export function fetchC2cRetry(params: { consignmentId: string | number; serverId: string | number; plaintext?: string }) {
  return request({
    url: '/platform-treasure/transaction/retry',
    method: 'post',
    data: params,
    transformResponse: [
      function (data) {
        try {
          return JSONbig({ storeAsString: true }).parse(data);
        } catch {
          return data;
        }
      }
    ]
  });
}

// ==================== 角色详细信息和历史信息相关接口 ====================

// 获取角色物品信息
export function fetchGetRoleItem(params: { cuid: number | string; serverId: number | string }) {
  return request({
    url: `/platform-operate/operate/role/getItem1`,
    method: 'get',
    params
  });
}

// 获取角色职业信息
export function fetchGetRoleProfessionInfo(params: { cuid: number | string; serverId: number | string }) {
  return request({
    url: `/platform-operate/operate/role/getProfessionInfo`,
    method: 'get',
    params
  });
}

// 获取角色任务信息
export function fetchGetRoleQuestInfo(params: { cuid: number | string; serverId: number | string }) {
  return request({
    url: `/platform-operate/operate/role/getQuestInfo`,
    method: 'get',
    params
  });
}

// 获取角色基本信息
export function fetchGetRoleInfo(params: { cuid: number | string; serverId: number | string }) {
  return request({
    url: `/platform-operate/operate/role/getRole`,
    method: 'get',
    params
  });
}

// 获取角色技能信息
export function fetchGetRoleSkillInfo(params: { cuid: number | string; serverId: number | string }) {
  return request({
    url: `/platform-operate/operate/role/getSkillInfo`,
    method: 'get',
    params
  });
}

// 获取角色宠物信息
export function fetchGetRolePetInfo(params: { cuid: number | string; serverId: number | string }) {
  return request({
    url: `/platform-operate/operate/role/getPetInfo`,
    method: 'get',
    params
  });
}

// 获取角色载具信息
export function fetchGetRoleVehicleInfo(params: { cuid: number | string; serverId: number | string }) {
  return request({
    url: `/platform-operate/operate/role/getVehicleInfo`,
    method: 'get',
    params
  });
}

// 获取角色兑换信息
export function fetchGetRoleListedExchange(params: { cuid: number | string; serverId: number | string }) {
  return request({
    url: `/platform-operate/operate/role/listedExchange`,
    method: 'get',
    params
  });
}

// 获取角色已购买的兑换信息
export function fetchGetRolePurchasedExchange(params: { cuid: number | string; serverId: number | string }) {
  return request({
    url: `/platform-operate/operate/role/purchasedExchange`,
    method: 'get',
    params
  });
}

// 排序服务器列表
export function fetchSortServerList(params: { serverId: number; sortWeight: number }) {
  return request({
    url: '/platform-game/item/changeSort',
    method: 'post',
    params
  });
}


// 获取专区列表
export function fetchGetAreaList() {
  return request({
    url: '/platform-game/region/listregion',
    method: 'get'
  });
}

// 根据专区ID查询分组
export function fetchGetGroupListByRegionId(params: { regionId: number }) {
  return request({
    url: `/platform-game/group/listByRegion/${params.regionId}`,
    method: 'get'
  });
}

// 更改服务器版本号
export function fetchBatchUpdateServerConfig(data: {
  serverIds: number[];
  serverConfig: string;
  needHotUpdate: boolean;
}) {
  return request({
    url: '/platform-game/item/batchUpdateConfig',
    method: 'post',
    data
  });
}

// 批量手动触发游戏配置重载
export function fetchRefreshConfig(serverIds: string[]) {
  return request({
    url: '/platform-game/api/k8s/config/reload',
    method: 'post',
    data: serverIds
  });
}

// 批量修改版本配置
export function fetchBatchUpdateServerVersion(data: {
  serverIds: string[];
  configmap_name: string;
  config_key: string;
  updates: Array<{
    section: string;
    key: string;
    value: string;
  }>;
}) {
  return request({
    url: '/platform-game/api/k8s/config/update-custom-batch',
    method: 'post',
    data
  });
}

// 批量修改配置开关
export function fetchUpdateConfigSwitch(params: {
  gid: number[];
  isOpen: number;
}) {
  return request({
    url: '/platform-game/item/updateConfigSwitch',
    method: 'post',
    params: {
      gid: params.gid.join(','), // 将数组转换为逗号分隔的字符串
      isOpen: params.isOpen
    }
  });
}

// 设置VIP点数(巅峰点数)，roleId 使用 string 避免大整数丢失精度
export function fetchSetVIPPoints(params: {
  gameId?: number;
  points: number;
  serverId: number;
  roleId: number | string;
}) {
  return request({
    url: '/platform-game/user/gm/setVIPPoints',
    method: 'get',
    params: {
      gameId: params.gameId || 101, // 默认值101
      points: params.points,
      serverId: params.serverId,
      roleId: params.roleId
    }
  });
}

// 合服计划列表
export function fetchGetMergePlanList(params: { current: number; size: number }) {
  return request({
    url: '/platform-game/game/merge/list',
    method: 'get',
    params
  });
}

// 新增合服计划
export function fetchAddMergePlan(data: { current: number; size: number }) {
  return request({
    url: '/platform-game/game/merge',
    method: 'post',
    data
  });
}

// 执行合服
export function fetchExecuteMergePlan(id: number) {
  return request({
    url: `/platform-game/game/merge/execute/${id}`,
    method: 'post'
  });
}

// 删除合服计划
export function fetchDeleteMergePlan(ids: number[]) {
  return request({
    url: `/platform-game/game/merge/${ids.join(',')}`,  // 将 ID 拼接到 URL 路径中
    method: 'delete'
  });
}

// 同步合服数据
export function fetchSyncMergePlan(serverId: number, mergeTaskId: number) {
  return request({
    url: `/platform-user/role/syncDeletedRoles`,
    method: 'post',
    data: {
      serverId,
      mergeTaskId
    }
  });
}

// 合服列表
export function fetchGetMergeList(params: { current: number; size: number }) {
  return request({
    url: '/platform-game/game/merge/topology',
    method: 'get',
    params
  });
}

// 开启/关闭沙巴克
export function fetchToggleSabak(data: {
  serverList: number[];
  gameId: number;
  status: boolean;
}) {
  return request({
    url: '/platform-game/server/openOrCloseSBK',
    method: 'post',
    data
  });
}

// 设置极品属性
export function fetchSetPerfectAttribute(data: {
  gameId: number;
  serverId: number | string;
  roleId: number | string;
  itemData: any;
  mailId: number | string;
  keepTime: number;
  descParams?: Record<string, string>;
  titleParams?: Record<string, string>;
}) {
  return request({
    url: '/platform-game/user/gm/sendItemDataMail',
    method: 'post',
    data
  });
}

// ==================== 备份管理 ====================

// 按区备份
export function fetchBackupByZone(params: {
  gameZone: string;
}) {
  return request({
    url: '/platform-game/server/rds/backup/zone',
    method: 'post',
    params
  });
}

// 单实例备份
export function fetchBackupByInstance(params: {
  singleRds: string;
}) {
  return request({
    url: '/platform-game/server/rds/backup/instance',
    method: 'post',
    params
  });
}

// 全量备份
export function fetchBackupAll() {
  return request({
    url: '/platform-game/server/rds/backup/all',
    method: 'post'
  });
}

// 查询运行中的备份任务
export function fetchRunningBackupTasks() {
  return request({
    url: '/platform-game/server/rds/backup/tasks/running',
    method: 'get'
  });
}

// 查询备份任务详情
export function fetchBackupTaskDetail(taskId: string) {
  return request({
    url: `/platform-game/server/rds/backup/task/${taskId}`,
    method: 'get'
  });
}

// 查询备份统计信息
export function fetchBackupStats() {
  return request({
    url: '/platform-game/server/rds/backup/stats',
    method: 'get'
  });
}

// 查询备份批次任务状态
export function fetchBackupBatchStatus(batchId: string) {
  return request({
    url: `/platform-game/server/rds/backup/batch/${batchId}`,
    method: 'get'
  });
}

// 设置赛季功能开关状态（批量）
export function fetchSetSeasonFeatureState(data: {
  gameId?: number;
  serverList: number[];
  feature: number;
  state: number;
}) {
  return request({
    url: '/platform-game/server/setSeasonFeatureState',
    method: 'post',
    data: {
      gameId: data.gameId || 101,
      serverList: data.serverList,
      feature: data.feature,
      state: data.state
    }
  });
}

/** 赛季排行奖励规则列表（按赛季 + 奖励类型查询）*/
export function fetchGetSeasonRankRewardRuleList(params: {
  seasonId: number;
  rewardType: string;
  current?: number;
  size?: number;
}) {
  return request({
    url: '/platform-operate/season/reward/list',
    method: 'get',
    params: {
      seasonId: params.seasonId,
      rewardType: params.rewardType,
      current: params.current,
      size: params.size
    }
  });
}

/** 新增或修改一条奖励规则（有 id 时为修改） */
export function fetchSaveSeasonRankRewardRule(params: {
  id?: string | number;
  seasonId: number;
  seasonName?: string;
  rankStart: number;
  rankEnd: number;
  rewardContent: string;
  rewardType?: string;
  thumbnail?: string;
  detail?: string;
}) {
  return request({
    url: '/platform-operate/season/reward/save',
    method: 'post',
    data: {
      id: params.id ?? undefined,
      gameId: 101,
      seasonId: params.seasonId,
      seasonName: params.seasonName,
      rewardType: params.rewardType ?? 'INDIVIDUAL',
      rankStart: params.rankStart,
      rankEnd: params.rankEnd,
      rewardContent: params.rewardContent,
      thumbnail: params.thumbnail,
      detail: params.detail
    }
  });
}

/** 删除奖励规则 */
export function fetchDeleteSeasonRankRewardRule(params: {
  seasonId: string | number;
}) {
  return request({
    url: '/platform-operate/season/reward/delete',
    method: 'delete',
    data: {
      seasonId: params.seasonId
    }
  });
}

/** 删除赛季奖励配置 */
export function fetchDeleteSeasonRewardConfig(params: { id: string | number }) {
  return request({
    url: `/platform-operate/season/reward/delete-one/${params.id}`,
    method: 'delete'
  });
}

// 获取赛季列表
export function fetchGetSeasonList(data?: { current: number; size: number; }) {
  return request({
    url: '/platform-operate/season/status',
    method: 'post',
    data: data
  });
}

// 禁止货币
export function fetchBanCurrency(data: {
  gameId?: number;
  serverList: number[];
  banList: number[];
}) {
  return request({
    url: '/platform-game/server/banGoodList',
    method: 'post',
    data: data
  });
}

// 赛季黑名单
export function fetchSeasonBlackList(data: {
  act: string;
  data: {
    modify?: Array<{
      cuid: number;
      ranking_type: number;
      expire: number;
      reason: string;
    }>;
    remove?: Array<{
      cuid: number;
      ranking_type: number;
    }>;
  };
  SN: number;
}) {
  return request({
    url: '/platform-game/server/season/banList',
    method: 'post',
    data: data
  });
}

// 控制季后赛
export function fetchControlPlayoffs(data: {
  gameId: number;
  serverList: number[];
  semifinal: boolean;
  final: boolean;
}) {
  return request({
    url: '/platform-game/server/controlPlayoffs',
    method: 'post',
    data: data
  });
}

// 设置赛季竞价
export function fetchSetSeasonBidding(data: {
  gameId: number;
  serverId: number;
  guildId: number | string;
  score: number;
}) {
  return request({
    url: '/platform-game/server/setSBKBidding',
    method: 'post',
    data: data
  });
}

/** 强制完成玩家任务 */
export function fetchCompletePlayerQuest(data: Array<{
  gameId: number;
  serverId: number | string;
  roleId: number | string;
  questIds: Array<number | string>;
}>) {
  return request({
    url: '/platform-game/user/gm/completePlayerQuest',
    method: 'post',
    data
  });
}

// 商城页签列表
export function fetchGetMallTabList(params?: {
  current: number;
  size: number;
}) {
  return request({
    url: '/platform-game/category/list',
    method: 'get',
    params,
  });
}

// 导入商城页签
export function fetchImportMallTab(data: FormData) {
  return request({
    url: '/platform-game/category/import',
    method: 'post',
    data,
  });
}

// 导出商城页签
export function fetchExportMallTab(params: {
  serverIds?: string;
}) {
  return request({
    url: '/platform-game/category/export',
    method: 'get',
    params,
  });
}

// 同步商城页签（Spring @RequestParam List 需重复键 serverIds=1&serverIds=2）
export function fetchSyncMallTab(serverIds: number[]) {
  const params = new URLSearchParams();
  serverIds.forEach(id => {
    params.append('serverIds', String(id));
  });
  return request({
    url: `/platform-game/category/syncToJson?${params.toString()}`,
    method: 'post'
  });
}
