/** 菜单类型 */
interface SysMenu {
  /** 菜单ID */
  menuId: number;
  /** 菜单名称 */
  menuName: string;
  /** 父菜单名称 */
  parentName?: string;
  /** 父菜单ID */
  parentId: number;
  /** 显示顺序 */
  orderNum: number;
  /** 路由地址 */
  path: string;
  /** 组件路径 */
  component: string;
  /** 路由参数 */
  query?: string;
  /** 路由名称 */
  routeName: string;
  /** 是否为外链（0是 1否） */
  isFrame: '0' | '1';
  /** 是否缓存（0缓存 1不缓存） */
  isCache: '0' | '1';
  /** 类型（M目录 C菜单 F按钮） */
  menuType: 'M' | 'C' | 'F';
  /** 显示状态（0显示 1隐藏） */
  visible: '0' | '1';
  /** 菜单状态（0正常 1停用） */
  status: '0' | '1';
  /** 权限字符串 */
  perms?: string;
  /** 菜单图标 */
  icon?: string;
  /** 子菜单 */
  children?: SysMenu[];
  /** 创建时间 */
  createTime?: string;
  /** 更新时间 */
  updateTime?: string;
  /** 备注 */
  remark?: string;
}

declare namespace Api.SystemManage {
  /** 菜单列表 */
  // type MenuList = SysMenu[];

  /** 菜单权限 */
  interface MenuAuth {
    /** 菜单ID列表 */
    menuIds: number[];
  }

  /** 角色菜单权限 */
  interface RoleMenuAuth {
    /** 角色ID */
    roleId: number;
    /** 菜单ID列表 */
    menuIds: number[];
  }
}
