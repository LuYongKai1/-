import { useAuthStore } from '@/store/modules/auth';
import { computed } from 'vue';


export function useAuth() {
  const authStore = useAuthStore();


  function hasAuth(codes: string | string[]) {
    // const forbidden = ['operate:activity:remove']; // 注释掉或删除
    // if (typeof codes === 'string') codes = [codes];
    // if (codes.some(code => forbidden.includes(code))) return false;

    if (!authStore.isLogin) return false;
    if (authStore.userInfo.permissions.includes('*:*:*')) return true;
    if (typeof codes === 'string') codes = [codes];
    return codes.some(code => authStore.userInfo.permissions.includes(code));
  }

  return {
    hasAuth
  };
}



// import { useAuthStore } from '@/store/modules/auth';


// export function useAuth() {
//   const authStore = useAuthStore();


//   function hasAuth(codes: string | string[]) {
//     if (!authStore.isLogin) {
//       return false;
//     }

//     if (typeof codes === 'string') {
//       return authStore.userInfo.permissions.includes(codes);
//     }

//     return codes.some(code => authStore.userInfo.permissions.includes(code));
//   }

//   return {
//     hasAuth
//   };
// }
