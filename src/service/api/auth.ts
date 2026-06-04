import { request } from '../request';

/**
 * Login
 *
 * @param userName User name
 * @param password Password
 */
// export function fetchLogin(userName: string, password: string) {
//   return request<Api.Auth.LoginToken>({
//     url: '/auth/login',
//     method: 'post',
//     data: {
//       userName,
//       password
//     }
//   });
// }

export function fetchLogin(username: string, password: string) {
  return request<Api.Auth.LoginToken>({
    // url: '/auth/login',
    url: '/auth/login',
    method: 'post',
    data: {
      username,
      password
    }
  });
}
/** Get user info */
// export function fetchGetUserInfo() {
//   return request<Api.Auth.UserInfo>({ url: '/auth/getUserInfo' });
// }
//获取用户信息
/** Get user info */
// export function fetchGetUserInfo() {
//     return request<Api.Auth.UserInfo>({ url: 'http://192.168.114.101:8080/platform-system/user/getInfo' });
//   }
// export function fetchGetUserInfo() {
//   return request<Api.Auth.UserInfo>({
//     url: '/platform-system/user/getInfo'
//   });
// }
export async function fetchGetUserInfo() {
  try {
    const response = await request<Api.Auth.UserInfo>({
      url: '/platform-system/user/getInfo'
    });
    // console.log('API Response:', response); // 打印 API 响应
    return response;
  } catch (error) {
    // console.error('API Request Error:', error); 
    throw error;
  }
}


/**
 * Refresh token
 *
 * @param refreshToken Refresh token
 */
export function fetchRefreshToken(refreshToken: string) {
  return request<Api.Auth.LoginToken>({
    url: '/auth/refreshToken',
    method: 'post',
    data: {
      refreshToken
    }
  });
}

/**
 * return custom backend error
 *
 * @param code error code
 * @param msg error message
 */
export function fetchCustomBackendError(code: string, msg: string) {
  return request({ url: '/auth/error', params: { code, msg } });
}
