import type { AxiosResponse } from 'axios';
import { BACKEND_ERROR_CODE, createFlatRequest, createRequest } from '@sa/axios';
import { h } from 'vue';
import { useAuthStore } from '@/store/modules/auth';
import { $t } from '@/locales';
import { localStg } from '@/utils/storage';
import { getServiceBaseURL } from '@/utils/service';
import { useRouterPush } from '@/hooks/common/router';
import { getAuthorization, handleExpiredRequest, showErrorMsg } from './shared';
import type { RequestInstanceState } from './type';

const isHttpProxy = import.meta.env.DEV && import.meta.env.VITE_HTTP_PROXY === 'Y';
const { baseURL, otherBaseURL } = getServiceBaseURL(import.meta.env, isHttpProxy);

// 统一的弹窗防重复机制 (与 Alova 共享)
const globalDialogState = {
  isAccountKickedDialogShowing: false,
  isProcessing: false // 添加处理中标志，防止并发
};

// 检查全局弹窗状态（兼容 Alova）
function getGlobalDialogState() {
  // 如果 window 上已有 Alova 的状态，使用它
  if ((window as any)._globalAccountKickedState) {
    return (window as any)._globalAccountKickedState;
  }
  // 否则设置自己的状态并共享给全局
  (window as any)._globalAccountKickedState = globalDialogState;
  return globalDialogState;
}

// 统一的账号被踢处理函数
function handleAccountKicked(authStore: any) {
  const state = getGlobalDialogState();

  // 立即检查并设置处理状态，防止并发调用
  if (state.isProcessing || state.isAccountKickedDialogShowing) {
    return;
  }

  // 立即设置处理状态，防止其他并发调用
  state.isProcessing = true;
  state.isAccountKickedDialogShowing = true;

  function handleLogout() {
    authStore.resetStore();
  }

  function logoutAndCleanup() {
    handleLogout();
    window.removeEventListener('beforeunload', handleLogout);
    // 重置状态，允许下次显示（比如用户重新登录后）
    state.isAccountKickedDialogShowing = false;
    state.isProcessing = false;
  }

  const accountKickedOut = $t('request.accountKickedOut');
  const accountKickedOutMsg = $t('request.accountKickedOutMsg');

  // prevent the user from refreshing the page
  window.addEventListener('beforeunload', handleLogout);

  if (window.$dialog) {
    window.$dialog.warning({
      title: accountKickedOut,
      content: () => h('div', {
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '20px 0',
          textAlign: 'center'
        }
      }, [
        // 主要图标
        h('div', {
          style: {
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
            boxShadow: '0 8px 24px rgba(102, 126, 234, 0.25)',
            position: 'relative'
          }
        }, [
          // 内层光效
          h('div', {
            style: {
              position: 'absolute',
              top: '8px',
              left: '8px',
              right: '8px',
              bottom: '8px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(10px)'
            }
          }),
          // 警告图标
          h('svg', {
            width: '28',
            height: '28',
            viewBox: '0 0 24 24',
            fill: 'none',
            xmlns: 'http://www.w3.org/2000/svg',
            style: { position: 'relative', zIndex: 1 }
          }, [
            h('path', {
              d: 'M12 2L1 21h22L12 2zm0 3.84L20.43 19H3.57L12 5.84zM11 14h2v2h-2v-2zm0-6h2v4h-2V8z',
              fill: 'white',
              'fill-opacity': '0.95'
            })
          ])
        ]),
        // 标题文字
        h('div', {
          style: {
            fontSize: '18px',
            fontWeight: '600',
            // color: '#1a1a1a',
            marginBottom: '12px',
            letterSpacing: '0.02em'
          }
        }, accountKickedOut),
        // 内容文字
        h('div', {
          style: {
            fontSize: '14px',
            color: '#6b7280',
            lineHeight: '1.6',
            maxWidth: '320px',
            margin: '0 auto'
          }
        }, accountKickedOutMsg)
      ]),
      positiveText: $t('common.confirm'),
      maskClosable: false,
      closeOnEsc: false,
      style: {
        width: '420px',
        borderRadius: '16px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(20px)'
      },
      onPositiveClick() {
        logoutAndCleanup();
      },
      onClose() {
        logoutAndCleanup();
      }
    });
  } else {
    // alert(accountKickedOutMsg);
    handleLogout();
    state.isAccountKickedDialogShowing = false;
    state.isProcessing = false;
  }
}

export const request = createFlatRequest<App.Service.Response, RequestInstanceState>(
  {
    baseURL,
    headers: {
      apifoxToken: 'XL299LiMEDZ0H5h3A29PxwQXdMJqWyY2'
    }
  },
  {
    async onRequest(config) {
      const Authorization = getAuthorization();
      Object.assign(config.headers, { Authorization });

      return config;
    },

    isBackendSuccess(response) {
      // 处理直接返回数组的情况
      if (Array.isArray(response.data)) {
        return true;
      }

      // 处理返回对象但没有 code 字段的情况
      if (typeof response.data === 'object' && !('code' in response.data)) {
        return true;
      }

      // 处理标准响应格式
      return String(response.data.code) === import.meta.env.VITE_SERVICE_SUCCESS_CODE;
    },
    async onBackendFail(response, instance) {
      // 早期检查：如果账号被踢弹窗正在处理中，直接返回
      const state = getGlobalDialogState();
      if (state.isProcessing || state.isAccountKickedDialogShowing) {
        const responseCode = String(response.data.code);
        if (responseCode === '401') {
          return null;
        }
      }

      const authStore = useAuthStore();

      const responseCode = String(response.data.code);

      function handleLogout() {
        authStore.resetStore();
      }

      function logoutAndCleanup() {
        handleLogout();
        window.removeEventListener('beforeunload', handleLogout);

        request.state.errMsgStack = request.state.errMsgStack.filter(msg => msg !== response.data.msg);
      }

      // 检测业务状态码401，提示账号在其他设备登录
      if (responseCode === '401') {
        // handleAccountKicked(authStore);
        return null;
      }

      // when the backend response code is in `logoutCodes`, it means the user will be logged out and redirected to login page
      const logoutCodes = import.meta.env.VITE_SERVICE_LOGOUT_CODES?.split(',') || [];
      if (logoutCodes.includes(responseCode)) {
        handleLogout();
        return null;
      }

      // when the backend response code is in `modalLogoutCodes`, it means the user will be logged out by displaying a modal
      const modalLogoutCodes = import.meta.env.VITE_SERVICE_MODAL_LOGOUT_CODES?.split(',') || [];
      if (modalLogoutCodes.includes(responseCode) && !request.state.errMsgStack?.includes(response.data.msg)) {
        request.state.errMsgStack = [...(request.state.errMsgStack || []), response.data.msg];

        // prevent the user from refreshing the page
        window.addEventListener('beforeunload', handleLogout);

        window.$dialog?.error({
          title: $t('common.error'),
          content: response.data.msg,
          positiveText: $t('common.confirm'),
          maskClosable: false,
          closeOnEsc: false,
          onPositiveClick() {
            logoutAndCleanup();
          },
          onClose() {
            logoutAndCleanup();
          }
        });

        return null;
      }

      // when the backend response code is in `expiredTokenCodes`, it means the token is expired, and refresh token
      // the api `refreshToken` can not return error code in `expiredTokenCodes`, otherwise it will be a dead loop, should return `logoutCodes` or `modalLogoutCodes`
      const expiredTokenCodes = import.meta.env.VITE_SERVICE_EXPIRED_TOKEN_CODES?.split(',') || [];
      if (expiredTokenCodes.includes(responseCode)) {
        const success = await handleExpiredRequest(request.state);
        if (success) {
          const Authorization = getAuthorization();
          Object.assign(response.config.headers, { Authorization });

          return instance.request(response.config) as Promise<AxiosResponse>;
        }
      }

      return null;
    },
    transformBackendResponse(response) {
      return response.data.data;
    },
    async onError(error) {
      // when the request is fail, you can show error message

      // 早期检查：如果账号被踢弹窗正在处理中，直接返回
      const state = getGlobalDialogState();
      if (state.isProcessing || state.isAccountKickedDialogShowing) {
        const isAccountRelated = error.response?.status === 401 || error.response?.status === 403;
        if (isAccountRelated) {
          return;
        }
      }

      let message = error.message;
      let backendErrorCode = '';

      // get backend error message and code
      if (error.code === BACKEND_ERROR_CODE) {
        message = error.response?.data?.msg || message;
        backendErrorCode = String(error.response?.data?.code || '');

        // 100001错误码已在onBackendFail中处理，这里不再重复处理
      }

      // 检测HTTP 401状态码，提示账号在其他设备登录
      if (error.response?.status === 401) {
        const authStore = useAuthStore();
        return;
      }

      // 检测HTTP 403状态码，如果业务code是100001则显示登录过期弹窗
      if (error.response?.status === 403) {

        // 获取业务code，保证是字符串类型，避免异常
        const businessCode: string = String(error?.response?.data?.code ?? '');
        if (businessCode === '100001') {
          const authStore = useAuthStore();
          const { toLogin } = useRouterPush(false);

           // 显示登录过期提示弹窗
           if (window.$dialog) {
             window.$dialog.warning({
               title: $t('request.loginExpiredTitle'),
               content: () => h('div', {
                 style: {
                   display: 'flex',
                   flexDirection: 'column',
                   alignItems: 'center',
                   padding: '20px 0',
                   textAlign: 'center'
                 }
               }, [
                 // 时钟图标
                 h('div', {
                   style: {
                     width: '64px',
                     height: '64px',
                     borderRadius: '50%',
                     background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center',
                     marginBottom: '20px',
                     boxShadow: '0 8px 24px rgba(240, 147, 251, 0.25)',
                     position: 'relative'
                   }
                 }, [
                   // 内层光效
                   h('div', {
                     style: {
                       position: 'absolute',
                       top: '8px',
                       left: '8px',
                       right: '8px',
                       bottom: '8px',
                       borderRadius: '50%',
                       background: 'rgba(255, 255, 255, 0.2)',
                       backdropFilter: 'blur(10px)'
                     }
                   }),
                   // 时钟图标
                   h('svg', {
                     width: '28',
                     height: '28',
                     viewBox: '0 0 24 24',
                     fill: 'none',
                     xmlns: 'http://www.w3.org/2000/svg',
                     style: { position: 'relative', zIndex: 1 }
                   }, [
                     h('path', {
                       d: 'M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z',
                       fill: 'white',
                       'fill-opacity': '0.95'
                     }),
                     h('path', {
                       d: 'M13 7h-2v5.414l3.293 3.293 1.414-1.414L13 11.586V7z',
                       fill: 'white',
                       'fill-opacity': '0.95'
                     })
                   ])
                 ]),
                 // 标题文字
                 h('div', {
                   style: {
                     fontSize: '18px',
                     fontWeight: '600',
                     marginBottom: '12px',
                     letterSpacing: '0.02em'
                   }
                 }, $t('request.loginExpiredTitle')),
                 // 内容文字
                 h('div', {
                   style: {
                     fontSize: '14px',
                     color: '#6b7280',
                     lineHeight: '1.6',
                     maxWidth: '320px',
                     margin: '0 auto'
                   }
                 }, $t('request.loginExpiredMsg'))
               ]),
               positiveText: $t('common.confirm'),
               maskClosable: false,
               closeOnEsc: false,
               style: {
                 width: '420px',
                 borderRadius: '16px',
                 boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.05)',
                 border: '1px solid rgba(255, 255, 255, 0.1)',
                 backdropFilter: 'blur(20px)'
               },
               onPositiveClick() {
                 authStore.resetStore();
                 toLogin('pwd-login').catch(err => console.error('跳转登录页面错误:', err));
               },
               onClose() {
                 authStore.resetStore();
                 toLogin('pwd-login').catch(err => console.error('跳转登录页面错误:', err));
               }
             });
           } else {
             // 降级处理：如果没有dialog组件，使用alert
            //  alert($t('request.loginExpiredMsg'));
             authStore.resetStore();
             toLogin('pwd-login').catch(err => console.error('跳转登录页面错误:', err));
           }
         }

         // 检测业务错误码100005，显示账号被踢弹窗
         else if (businessCode === '100005') {
           const authStore = useAuthStore();
           handleAccountKicked(authStore);
         }
        return;
      }

      // 检测特定的loginUser为null错误，自动跳转到登录页面
      if (message && message.includes("LoginUser.getSysUser()") && message.includes("loginUser is null")) {
        const authStore = useAuthStore();
        authStore.resetStore();
        return;
      }

      // the error message is displayed in the modal
      const modalLogoutCodes = import.meta.env.VITE_SERVICE_MODAL_LOGOUT_CODES?.split(',') || [];
      if (modalLogoutCodes.includes(backendErrorCode)) {
        return;
      }

      // when the token is expired, refresh token and retry request, so no need to show error message
      const expiredTokenCodes = import.meta.env.VITE_SERVICE_EXPIRED_TOKEN_CODES?.split(',') || [];
      if (expiredTokenCodes.includes(backendErrorCode)) {
        return;
      }

      // showErrorMsg(request.state, message);
    }
  }
);

export const demoRequest = createRequest<App.Service.DemoResponse>(
  {
    baseURL: otherBaseURL.demo
  },
  {
    async onRequest(config) {
      const { headers } = config;

      // set token
      const token = localStg.get('token');
      console.log(token);

      const Authorization = token ? `Bearer ${token}` : null;
      Object.assign(headers, { Authorization });

      return config;
    },
    isBackendSuccess(response) {
      // when the backend response code is "200", it means the request is success
      // you can change this logic by yourself
      return response.data.status === '200';
    },
    async onBackendFail(_response) {
      // when the backend response code is not "200", it means the request is fail
      // for example: the token is expired, refresh token and retry request
    },
    transformBackendResponse(response) {
      return response.data.result;
    },
    onError(error) {
      // when the request is fail, you can show error message

      let message = error.message;

      // show backend error message
      if (error.code === BACKEND_ERROR_CODE) {
        message = error.response?.data?.message || message;
      }

      window.$message?.error(message);
    }
  }
);

// 添加全局未捕获的 Promise 错误处理
// window.addEventListener('unhandledrejection', event => {
//   console.error('未捕获的 Promise 错误:', event.reason);
//   // 可以在这里添加通用的错误处理逻辑
//   event.preventDefault(); // 阻止默认处理
// });
