import { computed, reactive, ref } from 'vue';
import type { Ref } from 'vue';
import { jsonClone } from '@sa/utils';
import useBoolean from './use-boolean';
import useLoading from './use-loading';

export type MaybePromise<T> = T | Promise<T>;

export type ApiFn = (args: any) => Promise<unknown>;

export type TableColumnCheck = {
  key: string;
  title: string;
  checked: boolean;
};

export type TableDataWithIndex<T> = T & { index: number };

export type TransformedData<T> = {
  data: TableDataWithIndex<T>[];
  pageNum: number;
  pageSize: number;
  total: number;
};

export type Transformer<T, Response> = (response: Response) => TransformedData<T>;

export type TableConfig<A extends ApiFn, T, C> = {
  /** api function to get table data */
  apiFn: A;
  /** api params */
  apiParams?: Parameters<A>[0];
  /** transform api response to table data */
  transformer: Transformer<T, Awaited<ReturnType<A>>>;
  /** columns factory */
  columns: () => C[];
  /**
   * get column checks
   *
   * @param columns
   */
  getColumnChecks: (columns: C[]) => TableColumnCheck[];
  /**
   * get columns
   *
   * @param columns
   */
  getColumns: (columns: C[], checks: TableColumnCheck[]) => C[];
  /**
   * callback when response fetched
   *
   * @param transformed transformed data
   */
  onFetched?: (transformed: TransformedData<T>) => MaybePromise<void>;
  /**
   * whether to get data immediately
   *
   * @default true
   */
  immediate?: boolean;
};

// 导出一个默认函数，用于创建一个表格
export default function useHookTable<A extends ApiFn, T, C>(config: TableConfig<A, T, C>) {
  // 使用useLoading钩子，获取loading状态和loading方法
  const { loading, startLoading, endLoading } = useLoading();
  // 使用useBoolean钩子，获取empty状态和empty方法
  const { bool: empty, setBool: setEmpty } = useBoolean();

  // 从config中获取apiFn、apiParams、transformer、immediate、getColumnChecks、getColumns
  const { apiFn, apiParams, transformer, immediate = true, getColumnChecks, getColumns } = config;
  

  // 创建一个响应式对象，用于存储搜索参数
  const searchParams: NonNullable<Parameters<A>[0]> = reactive(jsonClone({ ...apiParams }));

  // 创建一个ref对象，用于存储表格列
  const allColumns = ref(config.columns()) as Ref<C[]>;

  // 创建一个ref对象，用于存储表格数据
  const data: Ref<TableDataWithIndex<T>[]> = ref([]);


  // 创建一个ref对象，用于存储表格列的选中状态
  const columnChecks: Ref<TableColumnCheck[]> = ref(getColumnChecks(config.columns()));

  // 创建一个计算属性，用于获取表格列
  const columns = computed(() => getColumns(allColumns.value, columnChecks.value));



  // 定义一个方法，用于重新加载表格列
  function reloadColumns() {
    // 重新加载表格列
    allColumns.value = config.columns();

    // 创建一个map对象，用于存储表格列的选中状态
    const checkMap = new Map(columnChecks.value.map(col => [col.key, col.checked]));

    // 获取默认的表格列选中状态
    const defaultChecks = getColumnChecks(allColumns.value);

    // 更新表格列的选中状态
    columnChecks.value = defaultChecks.map(col => ({
      ...col,
      checked: checkMap.get(col.key) ?? col.checked
    }));
  }



  // 定义一个异步方法，用于获取数据
async function getData() {
    // 开始loading
  startLoading();
    // 格式化搜索参数
  const formattedParams = formatSearchParams(searchParams);
    // 调用apiFn获取数据
  const response = await apiFn(formattedParams);
    // 转换数据
  const transformed = transformer(response as Awaited<ReturnType<A>>);
    // 更新数据
  data.value = transformed.data;

    // 更新empty状态
  setEmpty(transformed.data.length === 0);

    // 调用onFetched方法
  await config.onFetched?.(transformed);

    // 结束loading
  endLoading();
}



  // 定义一个方法，用于格式化搜索参数
function formatSearchParams(params: Record<string, unknown>) {
    // 创建一个空对象，用于存储格式化后的搜索参数
  const formattedParams: Record<string, unknown> = {};


  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      // 如果参数不为null和undefined，则将其添加到格式化后的搜索参数中
      formattedParams[key] = value;
    }
  });

  return formattedParams;
    // 返回格式化后的搜索参数
}

/**
 * update search params
 *
 * @param params
 */
function updateSearchParams(params: Partial<Parameters<A>[0]>) {
  Object.assign(searchParams, params);
}

/** reset search params */
function resetSearchParams() {
  Object.assign(searchParams, jsonClone(apiParams));
}

if (immediate) {
  getData();
}

return {
  loading,
  empty,
  data,
  columns,
  columnChecks,
  reloadColumns,
  getData,
  searchParams,
  updateSearchParams,
  resetSearchParams
};
}
