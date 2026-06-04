/**
 * IndexedDB工具类
 */

const DB_NAME = 'JsonDataDB';
const STORE_NAME = 'jsonStorage';

/**
 * 打开数据库
 */
export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

/**
 * 存储数据
 */
export async function storeJsonData(jsonString: string, version?: string): Promise<void> {
  if (!jsonString || typeof jsonString !== 'string' || jsonString.trim() === '') {
    throw new Error('存储数据不能为空');
  }

  // 验证并检查错误响应
  let parsed: any;
  try {
    parsed = JSON.parse(jsonString);
  } catch (error) {
    throw new Error('无效的JSON字符串');
  }

  // 拒绝存储错误响应
  if (parsed && typeof parsed === 'object') {
    const hasError = parsed.error ||
                     parsed.errMsg ||
                     (parsed.code && parsed.code !== 200 && parsed.code !== 0);

    if (hasError) {
      throw new Error('拒绝存储错误响应数据');
    }

    if (Object.keys(parsed).length === 0) {
      throw new Error('拒绝存储空对象');
    }
  }

  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const request = store.put({
      id: 'currentData',
      jsonString: jsonString,
      timestamp: Date.now(),
      version: version || String(Date.now())
    });

    request.onsuccess = () => resolve();
    request.onerror = (event) => reject((event.target as IDBRequest).error);
  });
}

/**
 * 读取数据
 */
export async function getJsonData(): Promise<string | null> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get('currentData');

    request.onsuccess = () => {
      const result = request.result;
      resolve(result ? result.jsonString : null);
    };

    request.onerror = (event) => {
      reject((event.target as IDBRequest).error);
    };
  });
}

/**
 * 安全解析JSON
 */
export function safeJsonParse(jsonString: string): any {
  try {
    return JSON.parse(jsonString);
  } catch (initialError) {
    // 尝试修复常见问题
    try {
      const fixedJson = jsonString
        .replace(/\\\\"/g, '\\"')
        .replace(/\\\\/g, '\\')
        .replace(/\\"/g, '"')
        .replace(/^\uFEFF/, '');

      return JSON.parse(fixedJson);
    } catch (repairError) {
      throw new Error('无法解析JSON数据');
    }
  }
}

/**
 * 清理缓存
 */
export async function clearJsonData(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete('currentData');
    request.onsuccess = () => resolve();
    request.onerror = (event) => reject((event.target as IDBRequest).error);
  });
}
