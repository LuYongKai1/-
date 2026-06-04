import { $t } from '@/locales';
import { format } from 'date-fns';
import { ref, type Ref } from 'vue';


/**
 * Transform record to option
 *
 * @example
 *   ```ts
 *   const record = {
 *     key1: 'label1',
 *     key2: 'label2'
 *   };
 *   const options = transformRecordToOption(record);
 *   // [
 *   //   { value: 'key1', label: 'label1' },
 *   //   { value: 'key2', label: 'label2' }
 *   // ]
 *   ```;
 *
 * @param record
 */
// 将Record类型的数据转换为Option类型的数据
export function transformRecordToOption<T extends Record<string, string>>(record: T) {
  return Object.entries(record).map(([value, label]) => ({
    value,
    label
  })) as CommonType.Option<keyof T>[];
}

/**
 * Translate options
 *
 * @param options
 */
// 导出一个函数，用于翻译选项
export function translateOptions(options: CommonType.Option<string>[]) {
  // 使用map方法遍历options数组
  return options.map(option => ({
    // 将option对象展开，并添加label属性
    ...option,
    // 使用$t函数翻译label属性
    label: $t(option.label as App.I18n.I18nKey)
  }));
}

/**
 * Toggle html class
 *
 * @param className
 */
export function toggleHtmlClass(className: string) {
  function add() {
    document.documentElement.classList.add(className);
  }

  function remove() {
    document.documentElement.classList.remove(className);
  }

  return {
    add,
    remove
  };
}

/**
 * 处理包含HTML标签的错误消息
 * @param message 原始错误消息
 * @returns 处理后的消息
 */
export function processErrorMessage(message: string, toNewline = false): string {
  if (!message || typeof message !== 'string') {
    return message;
  }

  if (toNewline) {
    return message.replace(/<br\s*\/?>/gi, '\n');
  }

  return message; // 保留 HTML 原样
}


/**
 * 通用的API响应错误处理函数
 *
 * @param response API响应对象
 * @param operationType 操作类型 ('add' | 'edit' | 'delete' 等)
 * @returns boolean 是否有错误 (true: 有错误, false: 无错误)
 */
import { h } from 'vue';

export function handleApiResponseError(response: any, operationType: string = '操作'): boolean {
  if (!response) {
    return false;
  }

  const errorInfo = response?.data || response?.response?.data || response;
  const { code: errorCode, msg: errorMsg } = errorInfo;

  // 成功状态码，不显示任何消息，让调用方处理成功逻辑
  if (errorCode === 200 || errorCode === 0) {
    return false;
  }

  // 有错误时显示API返回的错误消息
  const processedErrorMsg = processErrorMessage(errorMsg); // 保留 HTML 标签
  const renderHtmlMessage = () => h('div', { innerHTML: processedErrorMsg || `${operationType}失败` });

  // 权限错误
  if (errorCode === 403) {
    window.$message?.error(renderHtmlMessage);
    return true;
  }

  // 服务器错误
  if (errorCode === 500) {
    window.$message?.error(renderHtmlMessage);
    return true;
  }

  // 有错误消息时显示
  if (errorMsg) {
    window.$message?.error(renderHtmlMessage);
    return true;
  }

  // 非成功状态码
  if (errorCode && errorCode !== 200 && errorCode !== 0) {
    window.$message?.error(renderHtmlMessage);
    return true;
  }

  return false;
}


/**
 * 通用的API异常错误处理函数
 *
 * @param error 捕获的错误对象
 * @param operationType 操作类型 ('add' | 'edit' | 'delete' 等)
 */
export function handleApiCatchError(error: any, operationType: string = '操作') {
  console.error(`${operationType}失败:`, error);

  const errorData = error?.response?.data || {};
  const { code, msg } = errorData;

  const processedMsg = processErrorMessage(msg);
  const processedErrorMessage = processErrorMessage(error?.message);

  const renderHtmlMessage = () => h('div', {
    innerHTML: processedMsg || processedErrorMessage || `${operationType}失败，请重试`
  });

  if (code === 403) {
    window.$message?.error(renderHtmlMessage);
  } else if (code === 500) {
    window.$message?.error(renderHtmlMessage);
  } else {
    window.$message?.error(renderHtmlMessage);
  }
}


/**
 * 邮件状态映射配置
 */
export const mailStatusMap: Record<number, { type: 'default' | 'success' | 'error' | 'warning' | 'info' | 'primary'; label: string }> = {
  0: { type: 'default', label: '初始化' },
  1: { type: 'warning', label: '待发送' },
  2: { type: 'info', label: '发送中' },
  3: { type: 'success', label: '已完成' },
  4: { type: 'error', label: '已撤销' },
  5: { type: 'error', label: '已终止' }
};

/**
 * 判断邮件是否可以停止发送
 * @param status 邮件状态
 * @returns boolean
 */
export function canStopSending(status: number): boolean {
  return status === 1 || status === 2;
}

/**
 * 判断发送按钮是否应该禁用
 * @param status 邮件状态
 * @returns boolean
 */
export function isSendDisabled(status: number): boolean {
  return status === 3 || status === 4 || status === 5;
}

/**
 * 获取邮件状态信息
 * @param status 邮件状态
 * @returns 状态信息对象
 */
export function getMailStatusInfo(status: number) {
  return mailStatusMap[status] || { type: 'default', label: '未知' };
}

/**
 * 渲染邮件过期时间
 * @param expire 过期时间戳
 * @returns string
 */
export function renderMailExpire(expire: any): string {
  if (expire) {
    try {
      const timestamp = Number(expire);
      if (!isNaN(timestamp)) {
        const days = Math.ceil(timestamp / (24 * 60 * 60));
        return days <= 0 ? '已过期' : `${days}天`;
      }
      return expire;
    } catch (e) {
      return expire;
    }
  }
  return 'N/A';
}

/**
 * 渲染邮件发送日期
 * @param sendDate 发送日期
 * @returns string
 */
export function renderMailSendDate(sendDate: any): string {
  if (sendDate) {
    try {
      const timestamp = Number(sendDate);
      if (!isNaN(timestamp)) {
        const milliseconds = String(timestamp).length === 10 ? timestamp * 1000 : timestamp;
        return format(new Date(milliseconds), 'yyyy-MM-dd HH:mm:ss');
      }
      return format(new Date(sendDate), 'yyyy-MM-dd HH:mm:ss');
    } catch (e) {
      return sendDate;
    }
  }
  return 'N/A';
}

/**
 * 渲染创建日期
 * @param createDate 创建日期
 * @returns string
 */
export function renderCreateDate(createDate: any): string {
  if (createDate) {
    try {
      return format(new Date(createDate), 'yyyy-MM-dd HH:mm:ss');
    } catch (e) {
      return createDate;
    }
  }
  return 'N/A';
}

/**
 * 邮件轮询配置
 */
export const MAIL_POLL_INTERVAL = 5000;

/**
 * 创建邮件状态轮询器
 * @param data 数据源
 * @param getData 获取数据的函数
 * @param checkCondition 检查轮询条件的函数，默认检查是否有待发送或发送中的邮件
 * @returns 轮询控制对象
 */
export function createMailPoller(
  data: Ref<any[]>,
  getData: () => void,
  checkCondition?: (dataList: any[]) => boolean
) {
  const pollTimer = ref<NodeJS.Timeout | null>(null);

  const defaultCheckCondition = (dataList: any[]) =>
    dataList.some(item => item.mailStatus === 1 || item.mailStatus === 2);

  const checkFunc = checkCondition || defaultCheckCondition;

  function startPolling() {
    if (pollTimer.value) {
      clearInterval(pollTimer.value);
    }

    pollTimer.value = setInterval(() => {
      const hasInProgressMail = checkFunc(data.value);

      if (hasInProgressMail) {
        getData();
      } else {
        stopPolling();
      }
    }, MAIL_POLL_INTERVAL);
  }

  function stopPolling() {
    if (pollTimer.value) {
      clearInterval(pollTimer.value);
      pollTimer.value = null;
    }
  }

  return {
    startPolling,
    stopPolling,
    pollTimer
  };
}

/**
 * 通用邮件操作处理函数
 * @param apiFunction API函数
 * @param id 邮件ID
 * @param operationType 操作类型
 * @param onSuccess 成功回调
 * @param onError 错误回调
 */
export async function handleMailOperation(
  apiFunction: (id: number) => Promise<any>,
  id: number,
  operationType: 'send' | 'stop' | 'delete' | 'cancel',
  onSuccess?: () => void,
  onError?: (error: any) => void
) {
  try {
    const response = await apiFunction(id);

    if (response?.response?.data) {
      const { code } = response.response.data;
      if (String(code) === '200') {
        // 成功时显示本地设置的成功消息
        const successMessages = {
          send: 'common.sendSuccess',
          stop: 'common.stopSuccess',
          delete: 'common.deleteSuccess',
          cancel: 'common.cancelSuccess'
        };
        window.$message?.success($t(successMessages[operationType] as any));
        onSuccess?.();
      } else {
        // 错误时显示API返回的错误消息
        window.$message?.error(response.response.data.msg || $t(`common.${operationType}Failed` as any));
        onError?.(response);
      }
    } else {
      const errorMessages = {
        send: 'common.sendFailed',
        stop: 'common.stopFailed',
        delete: 'common.deleteFailed',
        cancel: 'common.cancelFailed'
      };
      window.$message?.error($t(errorMessages[operationType] as any));
      onError?.(response);
    }
  } catch (error) {
    console.error(`${operationType}操作失败:`, error);
    const errorMessages = {
      send: 'common.sendFailed',
      stop: 'common.stopFailed',
      delete: 'common.deleteFailed',
      cancel: 'common.cancelFailed'
    };
    window.$message?.error($t(errorMessages[operationType] as any));
    onError?.(error);
  }
}

/**
 * 解析多角色邮件发送状态
 * @param mailRolesJson 角色JSON字符串
 * @returns 发送状态统计
 */
export function parseSendStatus(mailRolesJson: string) {
  try {
    let rolesData;
    if (typeof mailRolesJson === "object" && mailRolesJson !== null) {
      rolesData = mailRolesJson;
    } else if (typeof mailRolesJson === "string") {
      try {
        rolesData = JSON.parse(mailRolesJson);
      } catch (parseError) {
        rolesData = JSON.parse(JSON.parse(mailRolesJson));
      }
    }

    if (Array.isArray(rolesData)) {
      const total = rolesData.length;
      const success = rolesData.filter(item => item.ok === true).length;
      const percentage = total > 0 ? Math.round((success / total) * 100) : 0;
      return { success, total, percentage };
    }
  } catch (error) {
    console.error("解析发送状态失败:", error);
  }
  return { success: 0, total: 0, percentage: 0 };
}

/**
 * 解析服务器JSON数据
 * @param serverJson 服务器JSON字符串
 * @returns 解析后的服务器数据数组
 */
export function parseServerJson(serverJson: string) {
  try {
    let serverData;
    if (typeof serverJson === "object" && serverJson !== null) {
      serverData = serverJson;
    } else if (typeof serverJson === "string") {
      try {
        serverData = JSON.parse(serverJson);
      } catch (parseError) {
        console.error("第一次解析失败，尝试二次解析:", parseError);
        try {
          serverData = JSON.parse(JSON.parse(serverJson));
        } catch (secondParseError) {
          console.error("二次解析也失败:", secondParseError);
          return [];
        }
      }
    }

    if (Array.isArray(serverData)) {
      return serverData.map((server) => ({
        serverId: server.serverId,
        serverName: server.serverName,
        ok: server.hasOwnProperty('ok') ? server.ok === true : undefined,
        msg: server.msg || "-",
      }));
    }
  } catch (error) {
    console.error("处理服务器数据失败:", error);
  }
  return [];
}

/**
 * 解析服务器邮件发送状态
 * @param mailServerJson 服务器JSON字符串
 * @returns 发送状态统计
 */
export function parseServerSendStatus(mailServerJson: string) {
  try {
    let serverData;
    if (typeof mailServerJson === "object" && mailServerJson !== null) {
      serverData = mailServerJson;
    } else if (typeof mailServerJson === "string") {
      try {
        serverData = JSON.parse(mailServerJson);
      } catch (parseError) {
        try {
          serverData = JSON.parse(JSON.parse(mailServerJson));
        } catch (secondParseError) {
          return { success: 0, total: 0, percentage: 0 };
        }
      }
    }

    if (Array.isArray(serverData)) {
      const total = serverData.length;
      const success = serverData.filter(item => item.ok === true).length;
      const percentage = total > 0 ? Math.round((success / total) * 100) : 0;
      return { success, total, percentage };
    }
  } catch (error) {
    console.error("解析服务器发送状态失败:", error);
  }
  return { success: 0, total: 0, percentage: 0 };
}

/**
 * 通用防抖函数
 * @param fn 需要防抖执行的函数
 * @param delay 防抖延迟，默认 500ms
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: any[]) => any>(fn: T, delay = 500): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}
