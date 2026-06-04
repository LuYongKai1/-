import { fetchGetPackageVersion, fetchGetDataPackage } from '@/service/api';
import { getJsonData, safeJsonParse, storeJsonData } from '@/utils/indexedDB';

// 全局缓存
let cachedDataPromise: Promise<any> | null = null;
let cachedData: any = null;
let cachedVersion: string = '';
let isCheckingVersion: boolean = false;
let lastCheckTime: number = 0;
const VERSION_CHECK_INTERVAL = 60000; // 60秒检查一次版本

/**
 * 获取物品数据包（带版本控制和缓存）
 */
export async function useItemPackage(language: string = 'CS'): Promise<any> {
  // 内存缓存优先
  if (cachedData) {
    // 定时后台检查版本更新
    const now = Date.now();
    if (now - lastCheckTime > VERSION_CHECK_INTERVAL) {
      lastCheckTime = now;
      checkVersionUpdate(language).catch(() => {});
    }
    return cachedData;
  }

  // 复用进行中的请求
  if (cachedDataPromise) {
    return cachedDataPromise;
  }

  // 发起新请求
  cachedDataPromise = (async () => {
    try {
      const data = await fetchItemPackage(language);
      cachedData = data;
      return data;
    } catch (error) {
      cachedDataPromise = null;
      throw error;
    }
  })();

  return cachedDataPromise;
}

/**
 * 后台检查版本更新
 */
async function checkVersionUpdate(language: string = 'CS'): Promise<void> {
  if (isCheckingVersion) return;

  isCheckingVersion = true;
  try {
    const versionResponse = await fetchGetPackageVersion();
    const versionData = (versionResponse as any)?.response?.data ||
                        (versionResponse as any)?.data?.data ||
                        (versionResponse as any)?.data ||
                        versionResponse;

    const newVersion = versionData?.versions?.[0]?.version || versionData?.version;

    if (newVersion && newVersion !== cachedVersion) {
      cachedDataPromise = null;
      cachedData = await fetchItemPackage(language);
    }
  } catch (error) {
    // 忽略版本检查错误
  } finally {
    isCheckingVersion = false;
  }
}

/**
 * 获取数据包
 */
async function fetchItemPackage(language: string = 'CS'): Promise<any> {
  try {
    // 获取版本号
    const versionResponse = await fetchGetPackageVersion();
    const versionData = (versionResponse as any)?.response?.data ||
                        (versionResponse as any)?.data?.data ||
                        (versionResponse as any)?.data ||
                        versionResponse;

    let newVersion = versionData?.versions?.[0]?.version ||
                     versionData?.version ||
                     String(Date.now());

    // 检查 IndexedDB 缓存
    const storedDataStr = await getJsonData();
    if (storedDataStr) {
      const storedJson = safeJsonParse(storedDataStr);
      const storedVersion = storedJson?.version || storedJson?._version;

      if (storedVersion && storedVersion === newVersion) {
        cachedVersion = newVersion;
        return storedJson;
      }
    }

    // 获取新数据
    const response = await fetchGetDataPackage(language);
    let newJson = (response as any)?.response?.data || (response as any)?.data || response;

    // 验证数据
    if (!newJson || typeof newJson !== 'object') {
      throw new Error('获取的数据包格式无效');
    }

    // 检查错误响应（不存储错误）
    if (newJson.error || newJson.errMsg ||
        (newJson.code && newJson.code !== 200 && newJson.code !== 0)) {
      throw new Error(newJson.message || newJson.errMsg || '获取数据包失败');
    }

    // 添加版本号
    if (newJson?.version) {
      newVersion = newJson.version;
    } else {
      newJson._version = newVersion;
    }

    // 存储到 IndexedDB
    try {
      await storeJsonData(JSON.stringify(newJson), newVersion);
    } catch (storeError) {
      // 存储失败不影响返回
    }

    cachedVersion = newVersion;
    return newJson;

  } catch (error) {
    // 降级：返回旧缓存
    try {
      const storedDataStr = await getJsonData();
      if (storedDataStr) {
        return safeJsonParse(storedDataStr);
      }
    } catch (cacheError) {
      // 忽略
    }

    return null;
  }
}

/**
 * 清除缓存
 */
export function clearItemPackageCache(): void {
  cachedData = null;
  cachedDataPromise = null;
  cachedVersion = '';
  isCheckingVersion = false;
  lastCheckTime = 0;
}
