import { request } from '../request';
import JSONbig from 'json-bigint';

/** get role list */
export function fetchGetRoleList(params?: Api.SystemManage.RoleSearchParams) {
  return request<Api.SystemManage.RoleList>({
    url: '/platform-system/role/list',
    method: 'get',
    params
  });
}
//添加角色
export function fetchCreateRole(data: any) {
  return request({
    url: '/platform-system/role',
    method: 'post',
    data
  });
}
// 编辑角色
export function fetchUpdateRole(data: {
  createBy?: string;
  createTime?: string;
  updateBy?: string;
  updateTime?: string;
  remark?: string;
  params?: {
    additionalProp1?: any;
    additionalProp2?: any;
    additionalProp3?: any;
  };
  roleId: number;
  roleName: string;
  roleKey: string;
  roleSort: number;
  dataScope?: string;
  menuCheckStrictly?: boolean;
  deptCheckStrictly?: boolean;
  status: string;
  delFlag?: string;
  flag?: boolean;
  menuIds: number[];
  deptIds?: number[];
  permissions?: string[];
  admin?: boolean;
}) {
  return request({
    url: '/platform-system/role',
    method: 'put',
    data
  });
}


//删除角色
export function fetchDeleteRole(params: { rolsId: number | number[] }) {
  return request({
    url: `/platform-system/role/${params.rolsId}`,
    method: 'delete'
  });
}

/**
 * get all roles
 *
 *  * 获取所有的角色
 */
export function fetchGetAllRoles() {
  return request<Api.SystemManage.AllRole[]>({
    url: '/platform-system/role/optionselect',
    method: 'get'
  });
}

/** 获取用户列表 */
export function fetchGetUserList(params?: Api.SystemManage.UserSearchParams) {
  return request<Api.SystemManage.UserList>({
    url: '/platform-system/user/list',
    method: 'get',
    params
  });
}

/** 获取菜单列表 */
export function fetchGetMenuList(params?: { current: number; size: number; }) {
  return request({
    url: '/platform-system/menu/list',
    method: 'get',
    params
  });
}

/** 获取所有页面信息 */
export function fetchGetAllPages() {
  return request<string[]>({
    url: '/systemManage/getAllPages',
    method: 'get'
  });
}

/** 获取菜单树 */
export function fetchGetMenuTree() {
  return request<Api.SystemManage.MenuTree[]>({
    url: '/platform-system/menu/treeselect',
    method: 'get'
  });
}


/** 修改菜单 */
export function fetchUpdateMenu(data: any) {
  return request({
    url: '/platform-system/menu',
    method: 'put',
    data
  });
}
/**添加菜单 */
export function fetchCreateMenu(data: any) {
  return request({
    url: '/platform-system/menu',
    method: 'post',
    data
  });
}
//删除菜单
export function fetchDeleteMenu(params: { menuId: number }) {
  return request({
    url: `/platform-system/menu/${params.menuId}`,
    method: 'delete'
  });
}

// 根据userid获取用户的角色
export function fetchGetUserRoleById(userId: number) {
  return request({
    url: `/platform-system/user/${userId}`,
    method: 'get',
  });
}

//新增用户
export function fetchCreateUser(data: any) {
  return request({
    url: '/platform-system/user',
    method: 'post',
    data
  });
}
// 修改用户
export function fetchUpdateUser(data: any) {
  return request({
    url: '/platform-system/user',
    method: 'put',
    data
  });
}

//用户删除接口
export function fetchDeleteUser(params: { userId: number }) {
  return request({
    url: `/platform-system/user/${params.userId}`,
    method: 'delete'
  });
}

// 获取当中角色拥有的权限
export function fetchGetUserRoleMenuTreeselect(roleId: number) {
  return request<{
    menus: any[];
    checkedKeys: number[];
  }>({
    url: `/platform-system/menu/roleMenuTreeselect/${roleId}`,
    method: 'get',
  });
}

// 角色回显
export function fetchRoleById(params: { roleId: number }) {
  return request({
    url: `/platform-system/role/${params.roleId}`,
    method: 'get'
  });
}


// 公告
export function fetchGetNoticeList(params?: { current: number; size: number; }) {
  return request({
    url: '/platform-operate/notice/list',
    method: 'get',
    params
  });
}


// 添加公告
export function fetchCreateNotice(data: any) {
  return request({
    url: '/platform-operate/notice',
    method: 'post',
    data
  })
}
// 修改公告
export function fetchUpdateNotice(data: any) {
  return request({
    url: '/platform-operate/notice',
    method: 'put',
    data
  })
}

export function fetchDeleteNotice(params: { id: number }) {
  return request({
    url: `/platform-operate/notice/${params.id}`,
    method: 'delete'
  })
}


//区服邮件

export function fetchGetMailList(params?: {
  current: number;
  size: number;
  operateUser?: string;
  mailRemark?: string;
  status?: string;
  beginTime?: string;
  endTime?: string;
}) {
  return request({
    url: '/platform-operate/operate/mail/server/list',
    method: 'get',
    params
  });
}

// 添加邮件
export function fetchAddMail(data: any) {
  return request({
    url: '/platform-operate/operate/mail/server/add',
    method: 'post',
    data
  });
}

// 修改邮件
export function fetchUpdateMail(data: any) {
  return request({
    url: '/platform-operate/operate/mail/server/edit',
    method: 'post',
    data
  });
}

// 删除邮件
export function fetchDeleteMail(params: { id: number }) {
  return request({
    url: `/platform-operate/operate/mail/server/remove/${params.id}`,
    method: 'delete'
  })
}

// 发送区服邮件
export function fetchSendMail(id: number) {
  return request({
    url: `/platform-operate/operate/mail/server/start?id=${id}`,
    method: 'post',
  })
}

// 停止发送区服邮件
export function fetchStopMail(id: number) {
  return request({
    url: `/platform-operate/operate/mail/server/stop?id=${id}`,
    method: 'post',
  })
}

// 撤销邮件
export function fetchCancelMail(id: number) {
  return request({
    url: `/platform-operate/operate/mail/server/withdraw?id=${id}`,
    method: 'post',
  })
}

// 多人邮件
export function fetchGetMultiMailList(params?: {
  current: number;
  size: number;
  operateUser?: string;
  mailRemark?: string;
  status?: string;
  audit?: string;
  beginTime?: string;
  endTime?: string;
}) {
  return request({
    url: '/platform-operate/operate/mail/multiple/list',
    method: 'get',
    params,
    transformResponse: [function (data) {
      try {
        // 保留所有大整数为字符串
        return JSONbig({ storeAsString: true }).parse(data);
      } catch {
        return data;
      }
    }]
  });
}

//停止发送多人邮件
export function fetchStopMultiMail(id: number) {
  return request({
    url: `/platform-operate/operate/mail/multiple/stop?id=${id}`,
    method: 'post',
  })
}


// 根据角色名称获取角色id
// export function fetchmultiplerole(params: { param: string }) {
//   return request({
//     url: `/platform-user/role/findByParam?param=${params.param}`,
//     method: 'post'
//   })
// }

export function fetchmultiplerole(params: { param: string; type?: string }) {
  return request({
    url: `/platform-user/role/findByParam?param=${params.param}${params.type ? `&type=${params.type}` : ''}`,
    method: 'post',
    transformResponse: [function (data) {
      try {
        // 保留所有大整数为字符串
        return JSONbig({ storeAsString: true }).parse(data);
      } catch {
        return data;
      }
    }]
  });
}

// 添加多人邮件
export function fetchAddMultiMail(data: any) {
  return request({
    url: '/platform-operate/operate/mail/multiple/add',
    method: 'post',
    data
  })
}

// 修改多人邮件
export function fetchUpdateMultiMail(data: any) {
  return request({
    url: '/platform-operate/operate/mail/multiple/edit',
    method: 'post',
    data
  })
}
// 多人邮件开启发送
export function fetchSendMultiMail(id: number) {
  return request({
    url: `/platform-operate/operate/mail/multiple/start?id=${id}`,
    method: 'post',
  })
}

// 多人邮件删除
export function fetchDeleteMultiMail(id: number) {
  return request({
    url: `/platform-operate/operate/mail/multiple/remove/${id}`,
    method: 'delete',
  })
}

// 多人邮件审核
export function fetchAuditMultiMail(id: number, audit: 1 | 2) {
  return request({
    url: `/platform-operate/operate/mail/multiple/audit`,
    method: 'post',
    data: { id, audit }
  })
}

// 导入多人邮件以及物品
export function fetchImportMultiMail(data: any) {
  return request({
    url: '/platform-operate/operate/mail/multiple/importRoleWithItems',
    method: 'post',
    data
  })
}

// 下载多人邮件以及物品模板
export function fetchDownloadMultiMailTemplate() {
  return request({
    url: '/platform-operate/operate/mail/multiple/downloadRoleWithItemsTemplate',
    method: 'get',
    responseType: 'blob'
  })
}

// 获取首页统计信息包含(在线总人数，每个区服有多少人，没个渠道有多少人)
export function fetchGetHomeData(data?: any) {
  return request({
    url: '/platform-bi/monitor/trend',
    method: 'post',
    data: data || {}
  })
}

// 获取营收排行数据
export function fetchGetRevenueRankingData(data?: any) {
  return request({
    url: '/platform-bi/monitor/revenue',
    method: 'post',
    data: data || {}
  })
}

// 获取24小时趋势数据(5分钟颗粒度)
export function fetchGet24HourTrendData(data?: any) {
  return request({
    url: '/platform-bi/monitor/trend24h',
    method: 'post',
    data: data || {}
  })
}


// 首页
// export function fetchGetHomeData() {
//   return request({
//     url: '/platform-user/statistics',
//     method: 'get',
//   })
// }

// 获取折线图服务器在线人数
// export function fetchGetLineChartData() {
//   return request({
//     url: '/platform-bi/platformServerOnline/getRolling24HourTrend',
//     method: 'get',
//   })
// }

// export function fetchGetLineChartData() {
//   return request({
//     url: '/platform-bi/serverOnline24',
//     method: 'get',
//   })
// }
// 获取今日付费
// export function fetchGetTodayPay(params: { beginDay: string, endDay: string }) {
//   return request({
//     url: '/platform-pay/order/summary/sum',
//     method: 'get',
//     params
//   })
// }
// 获取今日付费总付费金额
// export function fetchGetTodayPayTotal() {
//   return request({
//     url: '/platform-pay/order/summary/sum',
//     method: 'get',
//   })
// }

// 获取渠道折线图数据
// export function fetchGetChannelLineChartData(serverId?: string | number | null) {
//   const params: any = {};
//   if (serverId && serverId !== "") {
//     params.serverId = serverId;
//   }

//   return request({
//     url: '/platform-bi/serverChannelOnline',
//     method: 'get',
//     params
//   })
// }

// GM日志
export function fetchGetGmLogList(params: any) {
  return request({
    url: '/platform-game/gm/list',
    method: 'get',
    params,
    transformResponse: [function (data) {
      try {
        // 保留所有大整数为字符串
        return JSONbig({ storeAsString: true }).parse(data);
      } catch {
        return data;
      }
    }]
  });
}

// 登录日志
export function fetchGetLoginLogList(params: any) {
  return request({
    url: '/platform-system/logininfor/list',
    method: 'get',
    params
  });
}

// 操作日志
export function fetchGetOperLogList(params: any) {
  return request({
    url: '/platform-system/operlog/list',
    method: 'get',
    params
  });
}

// 修改用户密码
export function fetchUpdateUserPassword(data: { oldPassword: string; newPassword: string }) {
  return request({
    url: '/platform-system/user/profile/updatePwd',
    method: 'put',
    data
  });
}

// 上传头像
export function fetchUploadAvatar(data: any) {
  return request({
    url: '/platform-system/user/profile/avatar',
    method: 'post',
    data
  });
}

// 修改个人信息
export function fetchUpdateUserInfo(data: any) {
  return request({
    url: '/platform-system/user/profile',
    method: 'put',
    data
  });
}

// 获取指定区服等级分布图
export function fetchGetLevelDistributionChartData(serverId: number, startLevel?: number, endLevel?: number) {
  let url = `/platform-bi/bi/serverChannelLevel/serverLevelTrend?serverId=${serverId}`;

  if (startLevel !== undefined && endLevel !== undefined) {
    url += `&startLevel=${startLevel}&endLevel=${endLevel}`;
  }

  return request({
    url,
    method: 'get',
  })
}
