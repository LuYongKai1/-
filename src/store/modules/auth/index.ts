import { computed, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import { defineStore } from 'pinia';
import { useLoading } from '@sa/hooks';
import { SetupStoreId } from '@/enum';
import { useRouterPush } from '@/hooks/common/router';
import { fetchGetUserInfo, fetchLogin } from '@/service/api';
import { localStg } from '@/utils/storage';
import { $t } from '@/locales';
import { useRouteStore } from '../route';
import { useTabStore } from '../tab';
import { clearAuthStorage, getToken } from './shared';
export const useAuthStore = defineStore(SetupStoreId.Auth, () => {
  const route = useRoute();
  const routeStore = useRouteStore();
  const tabStore = useTabStore();
  const { toLogin, redirectFromLogin } = useRouterPush(false);
  const { loading: loginLoading, startLoading, endLoading } = useLoading();

  const token = ref(getToken());

  const userInfo: Api.Auth.UserInfo = reactive({
    msg: '',
    code: 0,
    permissions: [],
    roles: [],
    user: {
      createBy: '',
      createTime: '',
      updateBy: null,
      updateTime: null,
      remark: '',
      params: { '@type': '' },
      userId: 0,
      deptId: 0,
      userName: '',
      nickName: '',
      email: '',
      phonenumber: '',
      sex: '',
      avatar: null,
      password: '',
      status: '',
      delFlag: '',
      loginIp: '',
      loginDate: '',
      dept: {
        createBy: null,
        createTime: null,
        updateBy: null,
        updateTime: null,
        remark: null,
        params: { '@type': '' },
        deptId: 0,
        parentId: 0,
        ancestors: '',
        deptName: '',
        orderNum: 0,
        leader: '',
        phone: null,
        email: null,
        status: '',
        delFlag: null,
        parentName: null,
        children: []
      },
      roles: [],
      roleIds: null,
      postIds: null,
      roleId: null,
      admin: false
    }
  });



  /** is super role in static route */
  const isStaticSuper = computed(() => {
    const { VITE_AUTH_ROUTE_MODE, VITE_STATIC_SUPER_ROLE } = import.meta.env;


    return VITE_AUTH_ROUTE_MODE === 'static' && userInfo.roles.includes(VITE_STATIC_SUPER_ROLE);
  });


  /** Is login */
  const isLogin = computed(() => Boolean(token.value));


  /** Reset auth store */
  async function resetStore() {
    const authStore = useAuthStore();


    clearAuthStorage();

    authStore.$reset();

    if (!route.meta.constant) {
      await toLogin();
    }

    tabStore.cacheTabs();
    routeStore.resetStore();
  }

  /**
   * Login
   *
   * @param userName User name
   * @param password Password
   * @param [redirect=true] Whether to redirect after login. Default is `true`
   */
  async function login(userName: string, password: string, redirect = true) {
    startLoading();

    const { data: loginToken, error } = await fetchLogin(userName, password);


    if (!error) {
      const pass = await loginByToken(loginToken);


      if (pass) {
        await redirectFromLogin(redirect);

        window.$notification?.success({
          title: $t('page.login.common.loginSuccess'),
          content: $t('page.login.common.welcomeBack', { userName: userInfo.user.userName }),
          duration: 4500
        });
      }
    } else {
      // 显示登录失败的错误消息
      if (error.response?.data?.msg) {
        window.$message?.error(error.response.data.msg);
      }
      resetStore();
    }

    endLoading();
  }

  async function loginByToken(loginToken: Api.Auth.LoginToken) {
    // 1. stored in the localStorage, the later requests need it in headers
    localStg.set('token', loginToken.token);
    localStg.set('refreshToken', loginToken.refreshToken);

    // 2. get user info
    const pass = await getUserInfo();


    if (pass) {
      token.value = loginToken.token;

      return true;
    }

    return false;
  }

  // async function getUserInfo() {
  //   const { data: info, error } = await fetchGetUserInfo();


  //   if (!error) {
  //     // update store

  //     Object.assign(userInfo, info);
  //     console.log('User info after fetch:', userInfo); // 打印获取到的用户信息

  //     return true;
  //   }

  //   return false;
  // }

  //赋值给getinfo数组
  async function getUserInfo() {
    try {
      const response = await fetchGetUserInfo();
      if (response) {
        Object.assign(userInfo, response.response.data); // 将返回的对象赋值给 userInfo
        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  }


  async function initUserInfo() {
    const hasToken = getToken();

    if (hasToken) {
      const pass = await getUserInfo();

      if (!pass) {
        resetStore();
      }
    }
  }

  return {
    token,
    userInfo,
    isStaticSuper,
    isLogin,
    loginLoading,
    resetStore,
    login,
    initUserInfo
  };
});
