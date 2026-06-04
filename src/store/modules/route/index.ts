import { computed, nextTick, ref, shallowRef } from 'vue';
import type { RouteRecordRaw } from 'vue-router';
import { defineStore } from 'pinia';
import { useBoolean } from '@sa/hooks';
import type { CustomRoute, ElegantConstRoute, LastLevelRouteKey, RouteKey, RouteMap } from '@elegant-router/types';
import { SetupStoreId } from '@/enum';
import { router } from '@/router';
import { createStaticRoutes, getAuthVueRoutes } from '@/router/routes';
import { ROOT_ROUTE } from '@/router/routes/builtin';
import { getRouteName, getRoutePath } from '@/router/elegant/transform';
import { fetchGetConstantRoutes, fetchGetUserRoutes, fetchIsRouteExist } from '@/service/api';
import { useAuthStore } from '../auth';
import { useTabStore } from '../tab';
import {
  filterAuthRoutesByRoles,
  getBreadcrumbsByRoute,
  getCacheRouteNames,
  getGlobalMenusByAuthRoutes,
  getSelectedMenuKeyPathByKey,
  isRouteExistByRouteName,
  sortRoutesByOrder,
  transformMenuToSearchMenus,
  updateLocaleOfGlobalMenus
} from './shared';

export const useRouteStore = defineStore(SetupStoreId.Route, () => {
  const authStore = useAuthStore();
  const tabStore = useTabStore();
  const { bool: isInitConstantRoute, setBool: setIsInitConstantRoute } = useBoolean();
  const { bool: isInitAuthRoute, setBool: setIsInitAuthRoute } = useBoolean();

  /**
   * Auth route mode
   *
     建议在开发环境中使用静态模式，在生产环境中使用动态模式。
   * 如果在开发环境中使用静态模式，认证路由将由插件 "@elegant-router/vue" 自动生成。
   */
  const authRouteMode = ref(import.meta.env.VITE_AUTH_ROUTE_MODE);

  /** Home route key */
  const routeHome = ref(import.meta.env.VITE_ROUTE_HOME);

  /**
   * Set route home
   *
   * @param routeKey Route key
   */
  function setRouteHome(routeKey: LastLevelRouteKey) {
    routeHome.value = routeKey;
  }

  /** constant routes */
  const constantRoutes = shallowRef<ElegantConstRoute[]>([]);

  function addConstantRoutes(routes: ElegantConstRoute[]) {
    const constantRoutesMap = new Map<string, ElegantConstRoute>([]);

    routes.forEach(route => {
      constantRoutesMap.set(route.name, route);
    });

    constantRoutes.value = Array.from(constantRoutesMap.values());
  }

  /** auth routes */
  const authRoutes = shallowRef<ElegantConstRoute[]>([]);

  function addAuthRoutes(routes: ElegantConstRoute[]) {
    const authRoutesMap = new Map<string, ElegantConstRoute>([]);
    // console.log(authRoutesMap)


    routes.forEach(route => {
      authRoutesMap.set(route.name, route);
    });

    authRoutes.value = Array.from(authRoutesMap.values());
  }

  const removeRouteFns: (() => void)[] = [];

  /** Global menus */
  const menus = ref<App.Global.Menu[]>([]);
  const searchMenus = computed(() => transformMenuToSearchMenus(menus.value));

  /** Get global menus */
  function getGlobalMenus(routes: ElegantConstRoute[]) {
    menus.value = getGlobalMenusByAuthRoutes(routes);
    // console.log(menus.value);
  }

  /** Update global menus by locale */
  function updateGlobalMenusByLocale() {
    menus.value = updateLocaleOfGlobalMenus(menus.value);
  }

  /** Cache routes */
  const cacheRoutes = ref<RouteKey[]>([]);

  /**
   * Exclude cache routes
   *
   * for reset route cache
   */
  const excludeCacheRoutes = ref<RouteKey[]>([]);

  /**
   * Get cache routes
   *
   * @param routes Vue routes
   */
  function getCacheRoutes(routes: RouteRecordRaw[]) {
    cacheRoutes.value = getCacheRouteNames(routes);
  }

  /**
   * Reset route cache
   *
   * @default router.currentRoute.value.name current route name
   * @param routeKey
   */
  async function resetRouteCache(routeKey?: RouteKey) {
    const routeName = routeKey || (router.currentRoute.value.name as RouteKey);

    excludeCacheRoutes.value.push(routeName);

    await nextTick();

    excludeCacheRoutes.value = [];
  }

  /** Global breadcrumbs */
  const breadcrumbs = computed(() => getBreadcrumbsByRoute(router.currentRoute.value, menus.value));

  /** Reset store */
  async function resetStore() {
    const routeStore = useRouteStore();

    routeStore.$reset();

    resetVueRoutes();

    // after reset store, need to re-init constant route
    await initConstantRoute();
  }

  /** Reset vue routes */
  function resetVueRoutes() {
    removeRouteFns.forEach(fn => fn());
    removeRouteFns.length = 0;
  }

  /** init constant route */
  async function initConstantRoute() {
    if (isInitConstantRoute.value) return;

    const staticRoute = createStaticRoutes();

    if (authRouteMode.value === 'static') {
      addConstantRoutes(staticRoute.constantRoutes);
    } else {
      // 注释掉 fetchGetConstantRoutes 接口调用，直接使用静态路由
      // const { data, error } = await fetchGetConstantRoutes();
      // if (!error) {
      //   addConstantRoutes(data);
      // } else {
      //   // if fetch constant routes failed, use static constant routes
      //   addConstantRoutes(staticRoute.constantRoutes);
      // }

      // 直接使用静态常量路由
      addConstantRoutes(staticRoute.constantRoutes);
    }

    handleConstantAndAuthRoutes();

    setIsInitConstantRoute(true);

    tabStore.initHomeTab();
  }

  /** Init auth route */
  async function initAuthRoute() {
    // check if user info is initialized
    if (!authStore.userInfo.userId) {
      await authStore.initUserInfo();
    }

    if (authRouteMode.value === 'static') {
      initStaticAuthRoute();
    } else {
      await initDynamicAuthRoute();
    }

    tabStore.initHomeTab();
  }

  /** Init static auth route */
  function initStaticAuthRoute() {
    const { authRoutes: staticAuthRoutes } = createStaticRoutes();

    if (authStore.isStaticSuper) {
      addAuthRoutes(staticAuthRoutes);
    } else {
      const filteredAuthRoutes = filterAuthRoutesByRoles(staticAuthRoutes, authStore.userInfo.roles);

      addAuthRoutes(filteredAuthRoutes);
    }

    handleConstantAndAuthRoutes();

    setIsInitAuthRoute(true);
  }


  // 转换后端路由为前端格式
  // function transformBackendRoutes(backendRoutes: any[], parentPath: string = '', parentName: string = '') {
  //   return backendRoutes.map(route => {
  //     // 拼接当前路径，确保父路径和子路径正确合并，避免没有斜杠的问题
  //     const currentPath = `${parentPath ? parentPath + '/' : ''}${route.path}`;
  //     const icon = route.meta?.icon || 'akar-icons:airplay-video'; // 如果路由中没有定义图标，使用默认图标
  //     // 生成 component 和 name
  //     const transformedRoute = {
  //       name: `${parentName ? parentName + '_' : ''}${route.name.toLowerCase()}`, // 拼接 name 为 'parentName_childName'
  //       path: currentPath, // 正确拼接路径
  //       component: route.children && route.children.length > 0
  //         ? 'layout.base' // 如果有子菜单，顶层菜单组件是 layout.base
  //         : `view.${parentName ? parentName + '_' : ''}${route.name.toLowerCase()}`, // 子菜单拼接为 views.[父路由名]/[子路由名]
  //       meta: {
  //         title: route.meta.title,
  //         i18nKey: `route.${parentName ? parentName + '_' : ''}${route.name.toLowerCase()}`,
  //         iconType: 1,
  //         // icon:  'akar-icons:airplay-video',
  //         icon: icon,
  //         order: 10, // 默认排序值
  //         roles: route.meta.roles || [], // 添加角色权限
  //         keepAlive: route.meta.keepAlive || true // 添加 keepAlive 属性
  //       },
  //       icon:  'mdi:typewrite',
  //     };

  //     // 如果有子路由，递归处理
  //     if (route.children && route.children.length > 0) {
  //       transformedRoute.children = transformBackendRoutes(route.children, currentPath, route.name.toLowerCase()); // 传递当前路由名作为父路由名
  //     }


  //     return transformedRoute;
  //   });
  // }

  function transformBackendRoutes(backendRoutes: any[], parentPath: string = '', parentName: string = '') {
    return backendRoutes.map(route => {
      // 拼接当前路径，确保父路径和子路径正确合并，避免没有斜杠的问题
      const currentPath = `${parentPath ? parentPath + '/' : ''}${route.path}`;
      const icon = route.meta?.icon || 'akar-icons:airplay-video'; // 如果路由中没有定义图标，使用默认图标
      // 确保 route.name 存在且是字符串，如果没有则赋一个默认值
      const routeName = route.name && typeof route.name === 'string' ? route.name : 'default_route';
      // 生成 component 和 name
      const transformedRoute = {
        name: `${parentName ? parentName + '_' : ''}${routeName.toLowerCase()}`, // 拼接 name 为 'parentName_childName'
        path: currentPath, // 正确拼接路径
        component: route.children && route.children.length > 0
          ? 'layout.base' // 如果有子菜单，顶层菜单组件是 layout.base
          : `view.${parentName ? parentName + '_' : ''}${routeName.toLowerCase()}`, // 子菜单拼接为 views.[父路由名]/[子路由名]
        meta: {
          title: route.meta.title,
          i18nKey: `route.${parentName ? parentName + '_' : ''}${routeName.toLowerCase()}`,
          iconType: 1,
          icon: icon,
          order: 10, // 默认排序值
          roles: route.meta.roles || [], // 添加角色权限
          keepAlive: route.meta.keepAlive || true, // 添加 keepAlive 属性
          hideInMenu: route.hidden === true // 添加 hideInMenu 属性，当 hidden 为 true 时隐藏菜单
        },
        icon: 'mdi:typewrite',
      };
      // 如果有子路由，递归处理
      if (route.children && route.children.length > 0) {
        transformedRoute.children = transformBackendRoutes(route.children, currentPath, routeName.toLowerCase()); // 传递当前路由名作为父路由名
      }

      return transformedRoute;
    });
  }



  /** Init dynamic auth route */
  async function initDynamicAuthRoute() {
    const { data, error } = await fetchGetUserRoutes();
    // console.log("data:",data);

    if (!error) {
      const { routes, home } = data;
      const transformedRoutes  = transformBackendRoutes(data);
      // const transformedRoutes  = transformBackendRoutes(data);

      // console.log("transformedRoutes:",transformedRoutes);

      transformedRoutes.push( {
        name: 'home',
        path: '/home',
        component: 'layout.base$view.home',
        meta: {
          title: 'home',
          i18nKey: 'route.home',
          icon: 'mdi:monitor-dashboard',
          order: 1
        }
      },
      {
        name: 'user-center',
        path: '/user-center',
        component: 'layout.base$view.user-center',
        meta: {
          title: 'user-center',
          i18nKey: 'route.user-center',
          hideInMenu: true
        }
      })
      // console.log(transformedRoutes);

      addAuthRoutes(transformedRoutes);

      handleConstantAndAuthRoutes();

      setRouteHome('home');

      handleUpdateRootRouteRedirect('home');

      setIsInitAuthRoute(true);
    } else {
      // if fetch user routes failed, reset store
      authStore.resetStore();
    }
  }

  /** handle constant and auth routes */
  function handleConstantAndAuthRoutes() {
    const allRoutes = [...constantRoutes.value, ...authRoutes.value];

    const sortRoutes = sortRoutesByOrder(allRoutes);

    const vueRoutes = getAuthVueRoutes(sortRoutes);

    resetVueRoutes();

    addRoutesToVueRouter(vueRoutes);

    getGlobalMenus(sortRoutes);

    getCacheRoutes(vueRoutes);
  }

  /**
   * Add routes to vue router
   *
   * @param routes Vue routes
   */
  function addRoutesToVueRouter(routes: RouteRecordRaw[]) {
    // console.log(routes);

    routes.forEach(route => {
      const removeFn = router.addRoute(route);
      addRemoveRouteFn(removeFn);
    });
  }

  /**
   * Add remove route fn
   *
   * @param fn
   */
  function addRemoveRouteFn(fn: () => void) {
    removeRouteFns.push(fn);
  }

  /**
   * Update root route redirect when auth route mode is dynamic
   *
   * @param redirectKey Redirect route key
   */
  function handleUpdateRootRouteRedirect(redirectKey: LastLevelRouteKey) {
    const redirect = getRoutePath(redirectKey);

    if (redirect) {
      const rootRoute: CustomRoute = { ...ROOT_ROUTE, redirect };

      router.removeRoute(rootRoute.name);

      const [rootVueRoute] = getAuthVueRoutes([rootRoute]);

      router.addRoute(rootVueRoute);
    }
  }

  /**
   * Get is auth route exist
   *
   * @param routePath Route path
   */
  async function getIsAuthRouteExist(routePath: RouteMap[RouteKey]) {
    const routeName = getRouteName(routePath);

    if (!routeName) {
      return false;
    }

    if (authRouteMode.value === 'static') {
      const { authRoutes: staticAuthRoutes } = createStaticRoutes();
      return isRouteExistByRouteName(routeName, staticAuthRoutes);
    }

    const { data } = await fetchIsRouteExist(routeName);

    return data;
  }

  /**
   * Get selected menu key path
   *
   * @param selectedKey Selected menu key
   */
  function getSelectedMenuKeyPath(selectedKey: string) {
    return getSelectedMenuKeyPathByKey(selectedKey, menus.value);
  }

  async function onRouteSwitchWhenLoggedIn() {
    await authStore.initUserInfo();
  }

  async function onRouteSwitchWhenNotLoggedIn() {
    // some global init logic if it does not need to be logged in
  }

  return {
    resetStore,
    routeHome,
    menus,
    searchMenus,
    updateGlobalMenusByLocale,
    cacheRoutes,
    excludeCacheRoutes,
    resetRouteCache,
    breadcrumbs,
    initConstantRoute,
    isInitConstantRoute,
    initAuthRoute,
    isInitAuthRoute,
    setIsInitAuthRoute,
    getIsAuthRouteExist,
    getSelectedMenuKeyPath,
    onRouteSwitchWhenLoggedIn,
    onRouteSwitchWhenNotLoggedIn
  };
});
