import { computed, effectScope, onScopeDispose, reactive, ref, watch, h } from 'vue';
import type { Ref } from 'vue';
import type { PaginationProps } from 'naive-ui';
import { NTooltip } from 'naive-ui';
import { jsonClone } from '@sa/utils';
import { useBoolean, useHookTable } from '@sa/hooks';
import { useAppStore } from '@/store/modules/app';
import { $t } from '@/locales';
import { handleApiResponseError, handleApiCatchError } from '@/utils/common';

/**
 * 创建带工具提示的表头组件
 * @param title 表头标题
 * @param tooltipKey 提示文本的国际化键值
 * @param tooltipPrefix 提示文本的国际化前缀，默认为空
 * @returns 返回一个函数，该函数返回 VNode，并附带 __plainTitle 属性
 */
export function createTooltipHeader(title: string, tooltipKey: string, tooltipPrefix = '') {
  const tooltipPath = tooltipPrefix ? `${tooltipPrefix}.${tooltipKey}` : tooltipKey;
  const tooltipText = $t(tooltipPath as any);

  const renderFn = () => {
    return h(NTooltip, {
      trigger: 'hover',
      placement: 'top',
      style: { maxWidth: '300px' }
    }, {
      trigger: () => h('span', {
        style: {
          cursor: 'help',
          borderBottom: '1px dashed #ccc'
        }
      }, title),
      default: () => h('div', {
        style: {
          whiteSpace: 'normal',
          wordBreak: 'break-word',
          lineHeight: '1.5',
          maxWidth: '280px'
        }
      }, tooltipText)
    });
  };

  // 将纯文本标题附加到渲染函数上，供列设置使用
  (renderFn as any).__plainTitle = title;

  return renderFn;
}

// 定义类型别名，便于后续代码使用
// TableData: 表格数据类型
// GetTableData: 获取表格数据的方法
// TableColumn: 表格列的类型
type TableData = NaiveUI.TableData;
type GetTableData<A extends NaiveUI.TableApiFn> = NaiveUI.GetTableData<A>;
type TableColumn<T> = NaiveUI.TableColumn<T>;
// 主要的表格 Hook，接收一个配置对象并返回与表格交互的相关方法和状态
export function useTable<A extends NaiveUI.TableApiFn>(config: NaiveUI.NaiveTableConfig<A>) {
  const scope = effectScope();   // 创建 Vue 的 effectScope 以管理副作用
  const appStore = useAppStore();  // 获取应用状态

  const isMobile = computed(() => appStore.isMobile); // 计算是否为移动端

  const { apiFn, apiParams, immediate, showTotal } = config;

  const defaultHiddenKeys = config.defaultHiddenKeys || [];

  const SELECTION_KEY = '__selection__';  // 选择列的 key

  const scrollX = computed(() => {    //计算列的宽度
    const visibleCols = columnChecks.value
      .filter(c => c.checked && c.key !== '__selection__' && c.key !== '__expand__')
      .map(c => columns.value.find(col => (col.key as string) === c.key))
      .filter(Boolean) as TableColumn<any>[];

    const totalWidth = visibleCols.reduce((sum, col) => {
      const w = (col.width as number) || (col.minWidth as number) || 100;
      return sum + w + 2;
    }, 0);

    // 添加额外的右侧边距，确保最后一列完整显示
    return totalWidth + 50;
  });
  const EXPAND_KEY = '__expand__';


  // 使用 useHookTable 封装表格的相关逻辑
  const {
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
  } = useHookTable<A, GetTableData<A>, TableColumn<NaiveUI.TableDataWithIndex<GetTableData<A>>>>({
    apiFn,
    apiParams,
    columns: config.columns,
    transformer: res => {
      // 从响应中提取分页信息，优先使用服务端返回的值，否则使用当前分页状态
      const responseData = res.response.data || {};
      let current = responseData.current || pagination.page || 1;
      let size = responseData.size || pagination.pageSize || 10;
      let data = [];
      let total = 0;
      if (res.response.data.rows) {
        data = res.response.data.rows;
        total = res.response.data.total;
      }
      if (res.response.data.data) {
        data = res.response.data.data;
      }
      // const { data = [], current = 1, size = 10, total = 0 } = res.response.data ||{};

      // Ensure that the size is greater than 0, If it is less than 0, it will cause paging calculation errors.
      const pageSize = size <= 0 ? 10 : size;

      const recordsWithIndex = data.map((item: any, index: number) => {
        return {
          ...item,
          index: (current - 1) * pageSize + index + 1
        };
      });
      return {
        data: recordsWithIndex,
        pageNum: current,
        pageSize: size,
        total
      };

    },
    // 生成列选择配置
    getColumnChecks: cols => {
      const checks: NaiveUI.TableColumnCheck[] = [];

      cols.forEach(column => {
        if (isTableColumnHasKey(column)) {
          // 提取纯文本标题：如果 title 是函数，从函数的 __plainTitle 属性获取，否则直接使用 title
          let plainTitle = column.title as string;
          if (typeof column.title === 'function') {
            // 从渲染函数的 __plainTitle 属性获取纯文本标题
            plainTitle = (column.title as any).__plainTitle || (column.key as string);
          }

          checks.push({
            key: column.key as string,
            title: plainTitle,
            // checked: true
            // 这里根据 defaultHiddenKeys 判断默认是否选中
            checked: !defaultHiddenKeys.includes(column.key as string),
          });
        } else if (column.type === 'selection') {
          checks.push({
            key: SELECTION_KEY,
            title: $t('common.check'),
            checked: true
          });
        } else if (column.type === 'expand') {
          checks.push({
            key: EXPAND_KEY,
            title: $t('common.expandColumn'),
            checked: true
          });
        }
      });

      return checks;
    },
    getColumns: (cols, checks) => {
      const columnMap = new Map<string, TableColumn<GetTableData<A>>>();

      cols.forEach(column => {
        if (isTableColumnHasKey(column)) {
          columnMap.set(column.key as string, column);
        } else if (column.type === 'selection') {
          columnMap.set(SELECTION_KEY, column);
        } else if (column.type === 'expand') {
          columnMap.set(EXPAND_KEY, column);
        }
      });

      const filteredColumns = checks
        .filter(item => item.checked)
        .map(check => columnMap.get(check.key) as TableColumn<GetTableData<A>>);

      return filteredColumns;
    },
    // 数据获取完成后的回调，更新分页信息
    onFetched: async transformed => {
      const { pageNum, pageSize, total } = transformed;

      updatePagination({
        page: pageNum,
        pageSize,
        itemCount: total
      });
    },
    immediate
  });



  const pagination: PaginationProps = reactive({
    page: apiParams.current || 1,
    pageSize: apiParams.size || 10,
    showSizePicker: true,
    itemCount: 0,
    pageSizes: [10, 15, 20, 25, 30, 50, 100],
    onUpdatePage: async (page: number) => {

      pagination.page = page;

      updateSearchParams({
        current: page,
        size: pagination.pageSize!
      });

      getData();
    },
    onUpdatePageSize: async (pageSize: number) => {
      pagination.pageSize = pageSize;
      pagination.page = 1;

      updateSearchParams({
        current: pagination.page,
        size: pageSize
      });

      getData();
    },
    ...(showTotal
      ? {
        prefix: page => $t('datatable.itemCount', { total: page.itemCount })
      }
      : {})
  });

  // this is for mobile, if the system does not support mobile, you can use `pagination` directly
  const mobilePagination = computed(() => {
    const p: PaginationProps = {
      ...pagination,
      pageSlot: isMobile.value ? 3 : 9,
      prefix: !isMobile.value && showTotal ? pagination.prefix : undefined
    };

    return p;
  });

  function updatePagination(update: Partial<PaginationProps>) {
    Object.assign(pagination, update);
  }

  // 安全地更新搜索参数，确保始终保留分页信息
  function safeUpdateSearchParams(params: Record<string, any>) {
    updateSearchParams({
      current: pagination.page || 1,
      size: pagination.pageSize || 10,
      ...params
    });
  }

  /**
   * get data by page number
   *
   * @param pageNum the page number. default is 1
   */
  // 根据页码获取数据
  async function getDataByPage(pageNum: number = 1) {
    updatePagination({
      page: pageNum
    });

    updateSearchParams({
      current: pageNum,
      size: pagination.pageSize!
    });

    // 获取数据
    await getData();
  }

  scope.run(() => {
    watch(
      () => appStore.locale,
      () => {
        reloadColumns();
      }
    );
  });

  onScopeDispose(() => {
    scope.stop();
  });

  return {
    loading,
    empty,
    data,
    columns,
    columnChecks,
    reloadColumns,
    pagination,
    mobilePagination,
    updatePagination,
    getData,
    getDataByPage,
    searchParams,
    updateSearchParams,
    safeUpdateSearchParams,
    resetSearchParams,
    scrollX
  };
}

// 导出一个函数，用于表格操作
export function useTableOperate<T extends TableData = TableData>(data: Ref<T[]>, getData: () => Promise<void>) {
  // 使用useBoolean函数，定义drawerVisible变量，用于控制抽屉的显示与隐藏
  const { bool: drawerVisible, setTrue: openDrawer, setFalse: closeDrawer } = useBoolean();

  // 定义operateType变量，用于控制操作类型，默认为'add'
  const operateType = ref<NaiveUI.TableOperateType>('add');


  /** the editing row data */
  // 定义editingData变量，用于存储正在编辑的行数据
  const editingData: Ref<T | null> = ref(null);

  // 处理添加操作
  function handleAdd(options: any) {
    // 将操作类型设置为添加
    operateType.value = 'add';
    // 将传入的参数赋值给编辑数据
    editingData.value = options
    openDrawer();
  }


  // 定义flatData函数，用于将树形数据转换为扁平数据
  function flatData(treeData: T[]): T[] {
    return treeData.reduce((pre: T[], cur: T) => {
      return pre.concat(cur, cur.children && cur.children.length ? flatData(cur.children as T[]) : []);
    }, [] as T[]);
  }

  // 定义handleEdit函数，用于编辑行数据
  function handleEdit(id: T['id'], detail?: T) {
    operateType.value = 'edit';
    if (detail) {
      editingData.value = detail;
    } else {
      const flatTableData = flatData(data.value);
      const findItem = flatTableData.find(item => item.menuId === id || item.id === id) || null;
      editingData.value = jsonClone(findItem);
    }
    openDrawer();
  }

  /** the checked row keys of table */
  // 定义checkedRowKeys变量，用于存储表格中被选中的行的key
  const checkedRowKeys = ref<string[]>([]);

  /** the hook after the batch delete operation is completed */
  // 定义onBatchDeleted函数，用于批量删除操作完成后执行的钩子函数

  // async function onBatchDeleted() {
  //   window.$message?.success($t('common.deleteSuccess'));

  //   checkedRowKeys.value = [];

  //   await getData();

  async function onBatchDeleted(response?: any) {
    try {
      // 使用封装好的错误处理函数
      const hasError = handleApiResponseError(response, '批量删除');

      if (!hasError) {
        // 批量删除成功
        window.$message?.success($t('common.deleteSuccess'));
        checkedRowKeys.value = [];
        await getData();
      }
    } catch (error: any) {
      // 使用封装好的异常处理函数
      handleApiCatchError(error, '批量删除');
    }
  }

  /** the hook after the delete operation is completed */
  // 定义onDeleted函数，用于删除操作完成后执行的钩子函数
  // async function onDeleted() {
  //   window.$message?.success($t('common.deleteSuccess'));

  //   await getData();
  async function onDeleted(response?: any) {
    try {
      // 使用封装好的错误处理函数
      const hasError = handleApiResponseError(response, '删除');

      if (!hasError) {
        // 删除成功
        window.$message?.success($t('common.deleteSuccess'));
        await getData();
      }
    } catch (error: any) {
      // 使用封装好的异常处理函数
      handleApiCatchError(error, '删除');
    }
  }

  // 返回一个对象，包含drawerVisible、openDrawer、closeDrawer、operateType、handleAdd、editingData、handleEdit、checkedRowKeys、onBatchDeleted、onDeleted等属性
  return {
    drawerVisible,
    openDrawer,
    closeDrawer,
    operateType,
    handleAdd,
    editingData,
    handleEdit,
    checkedRowKeys,
    onBatchDeleted,
    onDeleted
  };
}

function isTableColumnHasKey<T>(column: TableColumn<T>): column is NaiveUI.TableColumnWithKey<T> {
  return Boolean((column as NaiveUI.TableColumnWithKey<T>).key);
}
