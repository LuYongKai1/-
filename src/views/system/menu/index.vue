<script setup lang="tsx">
import { ref } from 'vue';
import type { Ref } from 'vue';
import { NButton, NPopconfirm, NTag } from 'naive-ui';
import { useBoolean } from '@sa/hooks';
// import { fetchGetAllPages, fetchGetMenuList,fetchDeleteMenu } from '@/service/api';
import {fetchGetMenuList,fetchDeleteMenu } from '@/service/api';
import { useAppStore } from '@/store/modules/app';
import { useTable, useTableOperate } from '@/hooks/common/table';
import { $t } from '@/locales';
import { yesOrNoRecord } from '@/constants/common';
import { enableStatusRecord, menuTypeRecord } from '@/constants/business';
import { visibleRecord } from '@/constant/business';
import SvgIcon from '@/components/custom/svg-icon.vue';
import MenuOperateModal, { type OperateType } from './modules/menu-operate-modal.vue';
import { computed } from 'vue';
import { Icon } from '@iconify/vue';
import { useAuth } from '@/hooks/business/auth';

const { hasAuth } = useAuth();

const appStore = useAppStore();

// 表格配置
const { columns, columnChecks, data, loading, pagination, getData, getDataByPage } = useTable({
  apiFn: fetchGetMenuList,
  showTotal: true,
  apiParams: {
    current: 1,
    size: 10
  },
  columns: () => [
    {
      type: 'selection',
      align: 'center',
      width: 48
    },
    {
      key: 'menuId',
      title: $t('page.manage.menu.id'),
      align: 'center',
      tree: true
    },

    {
      key: 'menuType',
      title: $t('page.manage.menu.menuType'),
      align: 'center',
      width: 80,
      render: (row: any) => {
        const tagMap: Record<string, NaiveUI.ThemeColor> = {
          'M': 'default',
          'C': 'primary',
          'F': 'warning'
        };

        const label = $t(menuTypeRecord[row.menuType]);

        return <NTag type={tagMap[row.menuType]}>{label}</NTag>;
      }
    },
    {
      key: 'menuName',
      title: $t('page.manage.menu.menuName'),
      align: 'center',
      minWidth: 120,
      render: row => {
        const { i18nKey, menuName } = row;

        const label = i18nKey ? $t(i18nKey) : menuName;

        return <span>{label}</span>;
      }
    },

    {
  key: 'icon',
  title: $t('page.manage.menu.icon'),
  align: 'center',
  width: 60,
  render: row => {
    const icon = row.iconType === '1' ? row.icon : undefined;
    const localIcon = row.iconType === '2' ? row.icon : undefined;

    return (
      <div class="flex-center">
        <Icon icon={row.icon}  class="text-icon"></Icon>
      </div>
    );
  }
},

    {
      key: 'routeName',
      title: $t('page.manage.menu.routeName'),
      align: 'center',
      minWidth: 120
    },
    {
      key: 'path',
      title: $t('page.manage.menu.path'),
      align: 'center',
      minWidth: 120
    },
    {
      key: 'status',
      title: $t('page.manage.menu.menuStatus'),
      align: 'center',
      width: 80,
      render: row => {
        if (row.status === null) {
          return null;
        }
        const tagMap: Record<Api.Common.EnableStatus, NaiveUI.ThemeColor> = {
          0: 'success',
          1: 'warning'
        };
        const label = $t(enableStatusRecord[row.status]);
        return <NTag type={tagMap[row.status]}>{label}</NTag>;
      }
    },
    {
      key: 'visible',
      title: $t('page.manage.menu.hideInMenu'),
      align: 'center',
      width: 80,
      render: row => {
        if (row.visible === null) {
          return null;
        }
        const tagMap: Record<Api.Common.visibleRecord, NaiveUI.ThemeColor> = {
           1: 'error',
           0: 'default'
        };
        const label = $t(visibleRecord[row.visible]);
        return <NTag type={tagMap[row.visible]}>{label}</NTag>;
      }
    },
    {
      key: 'parentId',
      title: $t('page.manage.menu.parentId'),
      width: 90,
      align: 'center'
    },
    {
      key: 'orderNum',
      title: $t('page.manage.menu.order'),
      align: 'center',
      width: 60
    },
    {
      key: 'operate',
      title: $t('common.operate'),
      align: 'center',
      width: 230,
      render: row => (
        <div class="flex-center justify-end gap-8px">
          {row.menuType !== 'F' && hasAuth('system:menu:add') && (
            <NButton type="primary" ghost size="small" onClick={() => handleAddChildMenu(row)}>
              {$t('page.manage.menu.addChildMenu')}
            </NButton>
          )}

          {hasAuth('system:menu:edit') && (
            <NButton type="primary" ghost size="small" onClick={() => handleEdit1(row)}>
            {$t('common.edit')}
          </NButton>
          )}

          {hasAuth('system:menu:remove') && (
            <NPopconfirm onPositiveClick={() => handleDelete(row.menuId)}>
            {{
              default: () => $t('common.confirmDelete'),
              trigger: () => (
                <NButton type="error" ghost size="small">
                  {$t('common.delete')}
                </NButton>
              )
            }}
          </NPopconfirm>
          )}
        </div>
      )
    }
  ]
});


const { drawerVisible, openDrawer, closeDrawer,checkedRowKeys, onBatchDeleted, onDeleted, editingData, handleEdit, handleAdd } = useTableOperate(data, getData);
const operateType = ref<OperateType>('add');

async function handleBatchDelete() {
  try {
    const deletePromises = checkedRowKeys.value.map((menuId: string) => {
        return fetchDeleteMenu({ menuId: Number(menuId) });
    });
    const responses = await Promise.all(deletePromises);

    onBatchDeleted(responses);
  } catch (error: any) {
    onBatchDeleted(error);
  }
}
async function handleDelete(menuId: number) {
  try {
    const response = await fetchDeleteMenu({ menuId });

    onDeleted(response);
  } catch (error: any) {
    onDeleted(error);
  }
}



/** the edit menu data or the parent menu data when adding a child menu */
// const editingData: Ref<Api.SystemManage.Menu | null> = ref(null);

function handleEdit1(item: Api.SystemManage.Menu) {

  if (!item) {
    // console.error("handleEdit1: 传入的 item 为空！");
    return;
  }

  operateType.value = 'edit';
  editingData.value = { ...item }; // 确保数据正确赋值
  openDrawer();
}


function handleAddChildMenu(item: Api.SystemManage.Menu) {
  // operateType.value = 'add';
  // console.log(item);
  handleAdd({parentId: item.menuId})
  openDrawer()
}

const allPages = ref<string[]>([]);

async function getAllPages() {
  // const { data: pages } = await fetchGetAllPages();

  // allPages.value = pages || [];

}


const listToTree = (list, parent) => {
  const tree = [];
  list.forEach(item => {
    let realMenu;
    if (!parent && !item.parentId) {
      realMenu = item;
      realMenu.children = listToTree(
        list.filter(l => l.parentId),
        realMenu
      );
    } else if (item.parentId && parent && item.parentId === parent.menuId) {
      realMenu = item;
      realMenu.children = listToTree(
        list.filter(l => l.parentId),
        realMenu
      );
      parent.children = parent.children && parent.children.length ? parent.children.push(realMenu) : [item];
    }

    if (realMenu) {
      tree.push(realMenu);
    }
  });

  return tree;
};

const treeData = computed(() => {
  return listToTree(data.value, null)
})

function init() {
  getAllPages();
}
// init
init();
</script>

<template>
  <div
    ref="wrapperRef"
    class="flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto"
  >
    <NCard
      :title="$t('page.manage.menu.title')"
      :bordered="false"
      size="small"
      class="sm:flex-1-hidden card-wrapper"
    >
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :disabled-delete="checkedRowKeys.length === 0"
          :loading="loading"
          @add="handleAdd"
          @delete="handleBatchDelete"
          @refresh="getData"
          :show-add="hasAuth('system:menu:add')"
          :show-batch-delete="hasAuth('system:menu:remove')"
        />
      </template>
      <NDataTable
        v-model:checked-row-keys="checkedRowKeys"
        :columns="columns"
        :data="treeData"
        size="small"
        :flex-height="!appStore.isMobile"
        :scroll-x="1088"
        :loading="loading"
        :row-key="(row) => row.menuId"
        :pagination="pagination"
        remote
        class="sm:h-full"
      />
      <MenuOperateModal
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        :all-pages="allPages"
        @submitted="getDataByPage"
      />
    </NCard>
  </div>
</template>

<style scoped></style>

