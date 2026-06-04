/**
 * 物品相关的工具函数
 */

export interface ItemInfo {
  id: string;
  name?: string;
  names: string;
  count: number;
  trade?: boolean;
}

/**
 * 解析 goodsJson 字符串为物品列表
 * @param goodsJson - JSON 字符串，支持两种格式：
 *   1. 单个对象：{"item_ids": [], "item_counts": []}
 *   2. 数组格式：[{"item_ids": [], "item_counts": []}]
 * @param itemData - 物品数据对象
 * @returns 物品列表
 */
export function parseGoodsJson(goodsJson: string, itemData?: any): ItemInfo[] {
  if (!goodsJson) {
    return [];
  }

  try {
    // 先尝试验证 JSON 格式，如果格式不正确则静默返回空数组
    let goodsData;
    try {
      goodsData = JSON.parse(goodsJson);
    } catch (parseError) {
      // JSON 格式不正确，静默返回空数组，不输出错误日志
      return [];
    }

    // 处理可能是数组或对象的情况
    let itemIds: any[] = [];
    let itemCounts: any[] = [];

    if (Array.isArray(goodsData)) {
      // 如果是数组格式 [{"item_ids": [...], "item_counts": [...]}]
      goodsData.forEach(group => {
        if (group.item_ids) {
          itemIds = itemIds.concat(group.item_ids);
        }
        if (group.item_counts) {
          itemCounts = itemCounts.concat(group.item_counts);
        }
      });
    } else {
      // 如果是单个对象格式 {"item_ids": [...], "item_counts": [...]}
      itemIds = goodsData.item_ids || [];
      itemCounts = goodsData.item_counts || [];
    }

    return itemIds.map((id: any, index: number) => {
      let itemInfo = {
        name: String(id), // 默认名称为 ID
        names: '', // 默认 names 为空字符串
        trade: undefined as boolean | undefined,
      };

      // 如果有物品数据，尝试获取物品详情
      if (itemData?.data?.item) {
        const item = itemData.data.item[id];
        if (item) {
          itemInfo = {
            name: item.name || String(id),
            names: item.names || '',
            trade: item.trade,
          };
        }
      }

      return {
        id: String(id),
        name: itemInfo.name,
        names: itemInfo.names,
        count: Number(itemCounts[index]) || 1,
        trade: itemInfo.trade,
      };
    });
  } catch (e) {
    // 其他非预期错误才输出日志
    return [];
  }
}

/**
 * 将物品列表转换为 goodsJson 字符串
 * @param items - 物品列表
 * @returns JSON 字符串，格式为 {"item_ids": [], "item_counts": []}
 */
export function stringifyGoodsJson(items: ItemInfo[]): string {
  if (!items || items.length === 0) {
    return '{"item_ids": [], "item_counts": []}';
  }

  const itemIds = items.map((item) => Number(item.id));
  const itemCounts = items.map((item) => Number(item.count));

  return JSON.stringify({
    item_ids: itemIds,
    item_counts: itemCounts,
  });
}

/**
 * 从 goodsJson 中提取物品 ID 和数量数组
 * @param goodsJson - JSON 字符串
 * @returns { itemIds: number[], itemCounts: number[] }
 */
export function extractItemArrays(goodsJson: string): {
  itemIds: number[];
  itemCounts: number[];
} {
  if (!goodsJson) {
    return { itemIds: [], itemCounts: [] };
  }

  try {
    const goodsData = JSON.parse(goodsJson);
    return {
      itemIds: goodsData.item_ids || [],
      itemCounts: goodsData.item_counts || [],
    };
  } catch (e) {
    // JSON 格式不正确，静默返回空数组
    return { itemIds: [], itemCounts: [] };
  }
}
