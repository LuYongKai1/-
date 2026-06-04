/** 获取菜单列表 */
export function fetchGetMenuList() {
  return request.get<Api.SystemManage.MenuList>('/system/menu/list');
}

/** 获取角色的菜单权限 */
export function fetchGetRoleMenuIds(roleId: number) {
  return request.get<number[]>(`/system/menu/role/${roleId}`);
}

/** 更新角色的菜单权限 */
export function fetchUpdateRoleMenus(roleId: number, menuIds: number[]) {
  return request.put(`/system/menu/role/${roleId}`, { menuIds });
}
