<script setup lang="tsx">
import { NButton, NPopconfirm, NTag, useMessage } from 'naive-ui';
import { fetchDeleteRole,  fetchGetRoleList } from '@/service/api';
import { useAppStore } from '@/store/modules/app';
import { useTable, useTableOperate } from '@/hooks/common/table';
import { $t } from '@/locales';
import { enableStatusRecord } from '@/constants/business';
import RoleOperateDrawer from './modules/role-operate-drawer.vue';
import RoleSearch from './modules/role-search.vue';
import { useAuth } from '@/hooks/business/auth';

const { hasAuth } = useAuth();

const appStore = useAppStore();
const message = useMessage();

const {
  columns,
  columnChecks,
  data,
  loading,
  getData,
  getDataByPage,
  mobilePagination,
  searchParams,
  resetSearchParams
} = useTable({
  apiFn: fetchGetRoleList,
  apiParams: {
    current: 1,
    size: 10,
    // if you want to use the searchParams in Form, you need to define the following properties, and the value is null
    // the value can not be undefined, otherwise the property in Form will not be reactive
    status: null,
    roleName: null,
    roleCode: null
  },
  columns: () => [
    {
      type: 'selection',
      align: 'center',
      width: 48
    },
    {
      key: 'index',
      title: $t('common.index'),
      width: 64,
      align: 'center'
    },
    {
      key: 'roleName',
      title: $t('page.manage.role.roleName'),
      align: 'center',
      minWidth: 120
    },
    {
      key: 'remark',
      title: $t('page.manage.role.roleDesc'),
      minWidth: 120
    },
    {
      key: 'roleSort',
      title: $t('page.manage.role.roleSort'),
      align: 'center',
      minWidth: 120
    },
    {
      key: 'createTime',
      title: $t('page.manage.role.createTime'),
      align: 'center',
      minWidth: 120
    },
    // {
    //   key: 'createBy',
    //   title: $t('page.manage.role.updateTime'),
    //   align: 'center',
    //   minWidth: 120
    // },
    {
      key: 'status',
      title: $t('page.manage.role.roleStatus'),
      align: 'center',
      width: 100,
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
      key: 'operate',
      title: $t('common.operate'),
      align: 'center',
      width: 130,
      render: row => (
        <div class="flex-center gap-8px">
          {hasAuth('system:role:edit') && (
            <NButton type="primary" ghost size="small" onClick={() => edit(row.id ,row)}>
            {$t('common.edit')}
          </NButton>
          )}
          {hasAuth('system:role:remove') && (
            <NPopconfirm onPositiveClick={() => handleDelete(row.roleId)}>
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

const {
  drawerVisible,
  operateType,
  editingData,
  handleAdd,
  handleEdit,
  checkedRowKeys,
  onBatchDeleted,
  onDeleted
  // closeDrawer
} = useTableOperate(data, getData);

async function handleBatchDelete() {
  try {
    const { data, error, response } = await fetchDeleteRole({ rolsId: checkedRowKeys.value.map(Number) });

    if (response?.data?.code === 200) {
      onBatchDeleted();
    } else {
      message.error(response?.data?.msg || '批量删除失败');
    }
  } catch (error: any) {
    message.error('批量删除失败');
  }
}

//删除
async function handleDelete(roleId: number) {
  try {
    const { data, error, response } = await fetchDeleteRole({ rolsId: [roleId] });

    if (response?.data?.code === 200) {
      onDeleted();
    } else {
      message.error(response?.data?.msg || '删除失败');
    }
  } catch (error: any) {
    message.error('删除失败');
  }
}

function edit(id: number,row: any) {
  handleEdit(id, row);
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <RoleSearch v-model:model="searchParams" @reset="resetSearchParams" @search="getDataByPage" />
    <NCard :title="$t('page.manage.role.title')" :bordered="false" size="small" class="sm:flex-1-hidden card-wrapper">
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :disabled-delete="checkedRowKeys.length === 0"
          :loading="loading"
          @add="handleAdd"
          @delete="handleBatchDelete"
          @refresh="getData"
          :show-add="hasAuth('system:role:add')"
          :show-batch-delete="hasAuth('system:role:remove')"
        />
      </template>
      <NDataTable
        v-model:checked-row-keys="checkedRowKeys"
        :columns="columns"
        :data="data"
        size="small"
        :flex-height="!appStore.isMobile"
        :scroll-x="702"
        :loading="loading"
        remote
        :row-key="row => row.roleId"
        :pagination="mobilePagination"
        class="sm:h-full"
      />
      <RoleOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        @submitted="getDataByPage"
      />
    </NCard>
  </div>
</template>

<style scoped></style>
