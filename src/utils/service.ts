import json5 from 'json5';

/**
 * Create service config by current env
 *
 * @param env The current env
 */
// 导出一个函数，用于创建服务配置
export function createServiceConfig(env: Env.ImportMeta) {
  // 从环境变量中获取服务基础URL和其它服务基础URL
  const { VITE_SERVICE_BASE_URL, VITE_OTHER_SERVICE_BASE_URL, } = env;

  // 初始化其它服务基础URL为空对象
  let other = {} as Record<App.Service.OtherBaseURLKey, string>;
  try {
    // 尝试将其它服务基础URL解析为JSON5格式
    other = json5.parse(VITE_OTHER_SERVICE_BASE_URL);
  } catch {
    // 如果解析失败，则输出错误信息
    // eslint-disable-next-line no-console
    console.error('VITE_OTHER_SERVICE_BASE_URL is not a valid json5 string');
  }

  // 创建简单的服务配置
  const httpConfig: App.Service.SimpleServiceConfig = {
    baseURL: VITE_SERVICE_BASE_URL,
    other
  };

  // 获取其它服务基础URL的键
  const otherHttpKeys = Object.keys(httpConfig.other) as App.Service.OtherBaseURLKey[];

  // 创建其它服务配置项
  const otherConfig: App.Service.OtherServiceConfigItem[] = otherHttpKeys.map(key => {
    return {
      key,
      baseURL: httpConfig.other[key],
      proxyPattern: createProxyPattern(key)
    };
  });

  // 创建服务配置
  const config: App.Service.ServiceConfig = {
    baseURL: httpConfig.baseURL,
    proxyPattern: createProxyPattern(),
    other: otherConfig
  };

  // 返回服务配置
  return config;
}

/**
 * get backend service base url
 *
 * @param env - the current env
 * @param isProxy - if use proxy
 */
export function getServiceBaseURL(env: Env.ImportMeta, isProxy: boolean) {
  const { baseURL, other } = createServiceConfig(env);

  const otherBaseURL = {} as Record<App.Service.OtherBaseURLKey, string>;

  other.forEach(item => {
    otherBaseURL[item.key] = isProxy ? item.proxyPattern : item.baseURL;
  });

  return {
    baseURL: isProxy ? createProxyPattern() : baseURL,
    otherBaseURL
  };
}

/**
 * Get proxy pattern of backend service base url
 *
 * @param key If not set, will use the default key
 */
function createProxyPattern(key?: App.Service.OtherBaseURLKey) {
  if (!key) {
    return '/proxy-default';
  }

  return `/proxy-${key}`;
}
