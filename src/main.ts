import { createApp } from 'vue';
import './plugins/assets';
import { setupAppVersionNotification, setupDayjs, setupIconifyOffline, setupLoading, setupNProgress } from './plugins';
import { setupStore } from './store';
import { setupRouter } from './router';
import { setupI18n } from './locales';
import App from './App.vue';
// import { fetchAndStoreCsPackageData, } from './service/api/monitor';
import { clearJsonData } from '@/utils/indexedDB';

async function setupApp() {
  setupLoading();

  setupNProgress();

  setupIconifyOffline();

  setupDayjs();

  const app = createApp(App);

  setupStore(app);

  await setupRouter(app);

  setupI18n(app);

  setupAppVersionNotification();

  // 在应用初始化时获取最新的数据包
  // await clearJsonData();
  // await fetchAndStoreCsPackageData();


  app.mount('#app');
}

setupApp();
