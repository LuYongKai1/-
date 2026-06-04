  import { request } from '../request';

  /** get constant routes */
  export function fetchGetConstantRoutes() {
    return request<Api.Route.MenuRoute[]>({ url: '/route/getConstantRoutes' });
  }

  /** get user routes */
  // export function fetchGetUserRoutes() {
  //   return request<Api.Route.UserRoute>({ url: '/platform-system/menu/getRouters' });
  // }

  /** get user routes */
  export function fetchGetUserRoutes() {
    return request<Api.Route.UserRoute>({ url: '/platform-system/menu/getRouters' });
  }

  // export function fetchGetUserRoutes() {
  //   return request<Api.Route.UserRoute>({ url: '/platform-system/menu/getRouters' })
  //     .then((response) => {
  //       console.log("fetchGetUserRoutes 成功:", response); // 打印成功返回的数据
  //       return { data: response, error: null };
  //     })
  //     .catch((error) => {
  //       .error("fetchGetUserRoutes 失败:", error); // 打印错误信息
  //       return { data: null, error };
  //     });
  // }

  /**
   * whether the route is exist
   *
   * @param routeName route name
   */
  export function fetchIsRouteExist(routeName: string) {
    return request<boolean>({ url: '/route/isRouteExist', params: { routeName } });
  }
