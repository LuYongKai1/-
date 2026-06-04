import { request } from '../request';
import JSONbig from 'json-bigint';



// 玩家管理账号管理
export function fetchGetgmuserlist(params?: Api.Common.CommonSearchParams) {
  return request({
    url: '/platform-user/record/list',
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

// export function fetchGetgmrolelist(params?: { current: number; size: number; channelId?: string }) {
//   return request({
//     url: '/platform-user/role/roleList',
//     method: 'get',
//     params
//   });
// }

// 批量导入封禁列表
export function fetchImportUserBan(data: any) {
  return request({
    url: '/platform-game/user/gm/importBanUserData',
    method: 'post',
    data
  });
}

// 用户封禁列表模板
export function fetchDownloadTemplateUserBan() {
  return request({
    url: '/platform-game/user/gm/downloadBanUserTemplate',
    method: 'get',
    responseType: 'blob'
  });
}

// 批量导入解封列表
export function fetchImportUserUnBan(data: any) {
  return request({
    url: '/platform-game/user/gm/importUnbanUserData',
    method: 'post',
    data
  });
}

// 用户解封列表模板
export function fetchDownloadTemplateUserUnBan() {
  return request({
    url: '/platform-game/user/gm/downloadUnBanUserTemplate',
    method: 'get',
    responseType: 'blob'
  });
}

// 用户封禁/解封
export function fetchBanUser(params: { userId: string; keepTime: number; banReason: string, action: string }) {
  return request({
    url: '/platform-game/user/gm/banOrUnban',
    method: 'post',
    params
  });
}

// 批量导入角色踢出列表
export function fetchImportRoleKick(data: any) {
  return request({
    url: '/platform-game/user/gm/importKickRoleData',
    method: 'post',
    data
  });
}

// 角色踢出列表模板
export function fetchDownloadTemplateRoleKick() {
  return request({
    url: '/platform-game/user/gm/role/kick/downloadTemplate',
    method: 'get',
    responseType: 'blob'
  });
}

// 批量导入角色封禁列表
export function fetchImportRoleBan(data: any) {
  return request({
    url: '/platform-game/user/gm/importBanRoleData',
    method: 'post',
    data
  });
}

// 角色封禁列表模板
export function fetchDownloadTemplateRoleBan() {
  return request({
    url: '/platform-game/user/gm/role/ban/downloadTemplate',
    method: 'get',
    responseType: 'blob'
  });
}

// 批量导入角色解封列表
export function fetchImportRoleUnBan(data: any) {
  return request({
    url: '/platform-game/user/gm/importUnbanRoleData',
    method: 'post',
    data
  });
}

// 角色解封列表模板
export function fetchDownloadTemplateRoleUnBan() {
  return request({
    url: '/platform-game/user/gm/role/unban/downloadTemplate',
    method: 'get',
    responseType: 'blob'
  });
}

// 获取角色管理
export function fetchGetgmrolelist(params?: Api.Common.CommonSearchParams) {
  return request({
    url: '/platform-user/role/roleList',
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

// 角色信息强制改名
export function fetchForceRename(params: { roleId: number | string; renameReason: string }) {
  return request({
    url: '/platform-game/user/gm/rename',
    method: 'post',
    params
  });
}

// 修改玩家地图位置
export function fetchChangePlayerMapPosition(params: {
  roleId: number | string;
  mapId: number | string;
  x: number | string;
  y: number | string;
  z: number | string
}) {
  return request({
    url: '/platform-game/user/gm/changePlayerMapPosition',
    method: 'get',
    params
  });
}


export function fetchchatuser(params: { userId: string; keepTime: number; chatReason: string }) {
  return request({
    url: '/platform-game/user/gm/chatOrUnchat',
    method: 'post',
    params
  });
}

export function fetchBanrole(params: { roleId: string; banReason: string, action: string }) {
  return request({
    url: '/platform-game/user/gm/roleBanOrUnban',
    method: 'post',
    params
  });
}

export function fetchchatrole(params: { roleId: string; keepTime: number; banReason: string; action: string; banChatting: string }) {
  return request({
    url: '/platform-game/user/gm/roleChatOrUnchat',
    method: 'post',
    params
  });
}

// gm测试接口
export function fetchGmTest(params: { type: string; data: string }) {
  return request({
    url: '/platform-game/gm/custom',
    method: 'post',
    params
  });
}

// 踢出下线用户接口
export function fetchKickUser(params: { userId: string }) {
  return request({
    url: '/platform-game/user/gm/kickUser',
    method: 'post',
    params
  });
}

// 影子登录接口
export function fetchShadowLogin(params: { operatorOpenId: string; targetOpenId: string }) {
  return request({
    url: '/platform-game/user/shadow',
    method: 'get',
    params
  });
}

// 踢出下线角色接口
export function fetchKickRole(params: { roleId: string }) {
  return request({
    url: '/platform-game/user/gm/kickRole',
    method: 'post',
    params
  });
}

// 踢出服务器接口
export function fetchKickServer(params: { serverId: string }) {
  return request({
    url: '/platform-game/user/gm/kickAll',
    method: 'post',
    params
  });
}

// 执行自定义GM命令
export function fetchCustomGm(params: { gameId: number; serverId: number; commandJson: string }) {
  return request({
    url: '/platform-operate/gmCommandHistory/executeCustomCommand',
    method: 'post',
    params
  });
}

// 查询最近GM历史
export function fetchRecentGmHistory(params?: { serverId?: string; act?: string; limit?: number }) {
  return request({
    url: '/platform-operate/gmCommandHistory/recentHistory',
    method: 'get',
    params
  });
}

// 查询gm命令统计
export function fetchGmCommandStatistics(params: any) {
  return request({
    url: '/platform-operate/gmCommandHistory/statistics/list',
    method: 'get',
    params
  });
}


// 开启沙巴克活动
export function fetchCreateShabakActivity(params: { serverId: string; phase: number; crossServer: boolean }) {
  return request({
    url: '/platform-game/activity/createSbuke',
    method: 'get',
    params
  });
}

// 创建娱乐活动
export function fetchCreateEntertainmentActivity(params: { serverId: string; amusementId: string }) {
  return request({
    url: '/platform-game/server/createAmusement',
    method: 'get',
    params
  });
}

// 清空排行榜
export function fetchClearRank(params: { serverId: string; rankingType: string; action: string; updateBless: boolean; rewardKindGroup: number }) {
  return request({
    url: '/platform-game/server/rebuildRanking',
    method: 'get',
    params
  });
}

// 召唤怪物
export function fetchSpawnMonster(params: { serverId: number; GmParam: string }) {
  return request({
    url: '/platform-game/activity/activity',
    method: 'post',
    params
  });
}


// 快速封禁/解封 聊天监控
export function quicklyBanOrUnban(params: { roleId: string; keepTime: number; banReason: string; action: string }) {
  return request({
    url: '/platform-game/user/gm/quicklyBanOrUnban',
    method: 'post',
    params
  });
}

// 快速禁言/解禁言 聊天监控
export function quicklyChatOrUnchat(params: { roleId: string; keepTime: number; banReason: string; action: string; banChatting: string }) {
  return request({
    url: '/platform-game/user/gm/quicklyChatOrUnchat',
    method: 'post',
    params
  });
}

// 批量操作特权
export function fetchBatchOperationPrivilege(params: { openId: number | string; privilegeCode: number[] }) {
  return request({
    url: '/platform-user/userPrivilegeList/batch',
    method: 'post',
    data: params
  });
}
