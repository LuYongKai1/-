import { request } from '../request';
import JSONbig from 'json-bigint';


/*配置客服二维码活动 */
// 获取客服活动列表
export function fetchGetCustomerServiceActivityList(params?: {
  current: number;
  size: number;
}) {
  return request({
    url: '/platform-operate/social/list',
    method: 'get',
    params
  });
}

// 新增客服活动
export function fetchAddCustomerServiceActivity(data: any) {
  return request({
    url: '/platform-operate/social',
    method: 'post',
    data
  });
}

// 编辑客服活动
export function fetchEditCustomerServiceActivity(data: any) {
  return request({
    url: '/platform-operate/social',
    method: 'put',
    data
  });
}

// 删除客服活动
export function fetchDeleteCustomerServiceActivity(params: { id: number }) {
  return request({
    url: `/platform-operate/social/${params.id}`,
    method: 'delete'
  });
}

// 资源监控
// 查看某个区服下所有点券、金币、元宝、结锲之叶、通天玉珀数量接口
export function fetchGetResourceMonitorList(params: { serverId: number }) {
  return request({
    url: '/platform-operate/monitoring/totalResources',
    method: 'get',
    params,
  });
}

// 查看个人属性当中某个资源的TopN
export function fetchGetResourceTopN(params: { serverId: number, resourceType: string }) {
  return request({
    url: '/platform-operate/monitoring/topNResources',
    method: 'get',
    params,
  });
}

// 检查不存在的资源接口
export function fetchCheckNotExistResource(params: { serverId: number, itemIds: string }) {
  return request({
    url: '/platform-operate/monitoring/checkInvalidItems',
    method: 'get',
    params,
    timeout: 120000, // 设置2分钟超时，因为这个接口可能比较慢
  });
}

// 批量统计多个物品
export function fetchBatchCountItems(params: { serverId: number }, data: number[]) {
  return request({
    url: '/platform-operate/monitoring/batchCountItems',
    method: 'post',
    params,
    data,
    timeout: 120000,
  });
}


// GS额度发放任务列表
export function fetchGetGsQuotaTaskList(params?: Api.Common.CommonSearchParams) {
  return request({
    url: '/platform-operate/gsGrantTask/list',
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

// 新增GS额度发放任务
export function fetchAddGsQuotaTask(data: any) {
  return request({
    url: '/platform-operate/gsGrantTask',
    method: 'post',
    data,
  });
}

// 编辑GS额度发放任务
export function fetchEditGsQuotaTask(data: any) {
  return request({
    url: '/platform-operate/gsGrantTask',
    method: 'put',
    data,
  });
}

// 删除GS额度发放任务
export function fetchDeleteGsQuotaTask(params: { id: number }) {
  return request({
    url: `/platform-operate/gsGrantTask/${params.id}`,
    method: 'delete',
  });
}

// 导入GS额度发放任务
export function fetchImportGsQuotaTask(data: FormData, params?: {
  sendType?: number;
  startTime?: string;
  cycleType?: string;
  remark?: string;
  amount?: string;
}) {
  return request({
    url: '/platform-operate/gsGrantTask/import',
    method: 'post',
    data,
    params,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

// 下载GS额度发放任务模板
export function fetchDownloadGsQuotaTaskTemplate() {
  return request({
    url: '/platform-operate/gsGrantTask/downloadTemplate',
    method: 'get',
    responseType: 'blob'
  });
}

// 数数aip调用
export function fetchGetShuShuAip(params?: {
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
  current?: number;
  size?: number;
}) {
  return request({
    url: '/platform-operate/shushuApi/event-analyze',
    method: 'post',
    data: params,
    timeout: 60000 // 设置超时时间为60秒（默认通常是10-30秒）
  });
}

// 获取客服开关列表
export function fetchGetCustomerServiceSwitchList() {
  return request({
    url: '/platform-operate/customerServiceSwitch/get',
    method: 'get',
    transformResponse: [
      function (data) {
        try {
          const parsed = JSON.parse(data);
          // 响应格式: { code: 200, msg: "操作成功", data: { id: 2, channelCodes: "...", status: 1, ... } }
          // 需要将 data 对象包装成数组格式，以适配 useTable 的 transformer
          if (parsed && parsed.data && !Array.isArray(parsed.data)) {
            return {
              ...parsed,
              data: [parsed.data] // 包装成数组
            };
          }
          return parsed;
        } catch {
          return data;
        }
      }
    ]
  });
}

// 保存或更新客服开关配置
export function fetchSaveCustomerServiceSwitch(params: {
  channelCodes: string;
  status: number;
}) {
  return request({
    url: '/platform-operate/customerServiceSwitch/save',
    method: 'post',
    params
  });
}


// 赛级黑名单
// 赛季黑名单列表
export function fetchGetSeasonBlackList(params: {
  seasonNo: number;
  seasonType: number;
  serverId: number;
  roleId: number;
}) {
  return request({
    url: '/platform-operate/season/blacklist',
    method: 'get',
    params
  });
}

// 新增赛季黑名单
export function fetchAddSeasonBlacklist(data: {
  seasonType: string;
  serverId: string;
  seasonNo: number;
  roleId: number;
  roleName: string;
  reason: string;
  banUntil: number;
  status: number;
  createUser?: string;
  createTime?: string;
  updateUser?: string;
  updateTime?: string;
}) {
  return request({
    url: '/platform-operate/season/blacklist/add',
    method: 'post',
    data
  });
}

// 修改赛季黑名单
export function fetchEditSeasonBlacklist(data: {
  id: number;
  seasonType: string;
  serverId: string;
  seasonNo: number;
  roleId: number;
  roleName: string;
  reason: string;
  banUntil: number;
  status: number;
}) {
  return request({
    url: '/platform-operate/season/blacklist/edit',
    method: 'put',
    data
  });
}

// 删除赛季黑名单
export function fetchDeleteSeasonBlacklist(params: { id: number }) {
  return request({
    url: `/platform-operate/season/blacklist/delete/${params.id}`,
    method: 'delete'
  });
}

// 批量添加赛季黑名单
export function fetchBatchAddSeasonBlacklist(data: Array<{
  seasonType: string;
  serverId: string;
  seasonNo: number;
  roleId: number;
  roleName: string;
  reason: string;
  banUntil: number;
  status: number;
}>) {
  return request({
    url: '/platform-operate/season/blacklist/batch-add',
    method: 'post',
    data
  });
}
