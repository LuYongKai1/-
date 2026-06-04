<script setup lang="tsx">
import { NButton, NPopconfirm, NTag, NAvatar } from 'naive-ui';
import { fetchGetUserList,fetchDeleteUser } from '@/service/api';
import { $t } from '@/locales';
import { useAppStore } from '@/store/modules/app';
import { enableStatusRecord, userGenderRecord } from '@/constants/business';
import { useTable, useTableOperate } from '@/hooks/common/table';
import UserOperateDrawer from './modules/user-operate-drawer.vue';
import UserSearch from './modules/user-search.vue';
import { useAuth } from '@/hooks/business/auth';
import { format } from 'date-fns';

const { hasAuth } = useAuth();

const appStore = useAppStore();

const {
  columns,
  columnChecks,
  data,
  getData,
  getDataByPage,
  loading,
  mobilePagination,
  searchParams,
  resetSearchParams
} = useTable({
  apiFn: fetchGetUserList,
  showTotal: true,
  apiParams: {
    current: 1,
    size: 10,
    status: null,
    userName: null,
    userGender: null,
    nickName: null,
    phonenumber: null,
    email: null
  },
  columns: () => [
    {
      type: 'selection',
      align: 'center',
      width: 48
    },
    {
      key: 'userId',
      title: $t('common.index'),
      align: 'center',
      width: 64
    },
    {
      key: 'userName',
      title: $t('page.manage.user.userName'),
      align: 'center',
      minWidth: 100
    },
    {
      key: 'avatar',
      title: $t('page.manage.user.avatar'),
      align: 'center',
      width: 80,
      render: row => {
        const avatar = row.avatar;
        let avatarUrl: string | undefined = undefined;

        if (avatar) {
          // 处理 base64 格式的图片数据
          if (avatar.startsWith('data:image/')) {
            avatarUrl = avatar;
          } else if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
            avatarUrl = avatar;
          } else if (avatar.startsWith('/statics/')) {
            const backendUrl = import.meta.env.VITE_SERVICE_BASE_URL || window.location.origin;
            const pathParts = avatar.split('/');
            const encodedPath = pathParts.map((part, index) =>
              index === pathParts.length - 1 ? encodeURIComponent(part) : part
            ).join('/');
            avatarUrl = `${backendUrl}/platform-system${encodedPath}`;
          } else {
            const baseUrl = import.meta.env.VITE_SERVICE_BASE_URL || window.location.origin;
            const encodedAvatar = avatar.split('/').map((part, index, arr) =>
              index === arr.length - 1 ? encodeURIComponent(part) : part
            ).join('/');
            avatarUrl = avatar.startsWith('/') ? `${baseUrl}${encodedAvatar}` : `${baseUrl}/${encodedAvatar}`;
          }
        }

        const avatarSize = 40;
        const avatarStyle = {
          width: `${avatarSize}px`,
          height: `${avatarSize}px`,
          borderRadius: '50%',
          border: '2px solid #e0e0e6',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          cursor: 'pointer',
          transition: 'all 0.2s ease-in-out'
        };

        const handleAvatarClick = () => {
          if (avatarUrl) {
            const modal = document.createElement('div');
            modal.style.cssText = `
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: rgba(0,0,0,0.7);
              display: flex;
              justify-content: center;
              align-items: center;
              z-index: 9999;
              cursor: pointer;
            `;

            const img = document.createElement('img');
            img.src = avatarUrl;
            img.style.cssText = `
              max-width: 90vw;
              max-height: 90vh;
              border-radius: 8px;
              box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            `;

            modal.appendChild(img);
            document.body.appendChild(modal);

            modal.onclick = () => {
              document.body.removeChild(modal);
            };
          }
        };

        return (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            height: '100%'
          }}>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={`${row.userName}的头像`}
                style={{
                  ...avatarStyle,
                  objectFit: 'cover'
                }}
                onClick={handleAvatarClick}
                onMouseenter={(e: MouseEvent) => {
                  const target = e.target as HTMLImageElement;
                  target.style.transform = 'scale(1.1)';
                  target.style.borderColor = '#1890ff';
                  target.style.boxShadow = '0 4px 16px rgba(24,144,255,0.3)';
                }}
                onMouseleave={(e: MouseEvent) => {
                  const target = e.target as HTMLImageElement;
                  target.style.transform = 'scale(1)';
                  target.style.borderColor = '#e0e0e6';
                  target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                }}

              />
            ) : (
              <div
                style={{
                  ...avatarStyle,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
                onMouseenter={(e: MouseEvent) => {
                  const target = e.target as HTMLElement;
                  target.style.transform = 'scale(1.1)';
                  target.style.borderColor = '#1890ff';
                  target.style.boxShadow = '0 4px 16px rgba(24,144,255,0.3)';
                }}
                onMouseleave={(e: MouseEvent) => {
                  const target = e.target as HTMLElement;
                  target.style.transform = 'scale(1)';
                  target.style.borderColor = '#e0e0e6';
                  target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                }}
              >
                {row.nickName?.charAt(0) || row.userName?.charAt(0) || '用'}
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'sex',
      title: $t('page.manage.user.userGender'),
      align: 'center',
      width: 100,
      render: row => {
        if (row.sex === null) {
          return null;
        }

        const tagMap: Record<Api.SystemManage.UserGender, NaiveUI.ThemeColor> = {
          0: 'primary',
          1: 'error'
        };

        const label = $t(userGenderRecord[row.sex]);

        return <NTag type={tagMap[row.sex]}>{label}</NTag>;
      }
    },
    {
      key: 'nickName',
      title: $t('page.manage.user.nickName'),
      align: 'center',
      minWidth: 100,
    },
    {
      key: 'phonenumber',
      title: $t('page.manage.user.userPhone'),
      align: 'center',
      minWidth: 120
    },
    {
      key: 'email',
      title: $t('page.manage.user.userEmail'),
      align: 'center',
      minWidth: 120,
      ellipsis: { tooltip: true }
    },
    {
      key: 'loginIp',
      title: $t('page.manage.user.loginIp'),
      align: 'center',
      minWidth: 100
    },
    {
      key: 'loginDate',
      title: $t('page.manage.user.loginDate'),
      align: 'center',
      minWidth: 200,
      ellipsis: { tooltip: true },
      render: (row) => {
         return format(new Date(row.loginDate), 'yyyy-MM-dd HH:mm:ss');
       },
    },
    {
      key: 'createTime',
      title: $t('page.manage.user.createtime'),
      align: 'center',
      minWidth: 200
    },
    // {
    //   key: 'updatetime',
    //   title: $t('page.manage.user.updateTime'),
    //   align: 'center',
    //   minWidth: 200
    // },
    {
      key: 'status',
      title: $t('page.manage.user.userStatus'),
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
          {hasAuth('system:user:edit') && (
          <NButton type="primary" ghost size="small" onClick={() => edit(row.id, row)}>
            {$t('common.edit')}
          </NButton>
          )}
          {hasAuth('system:user:remove') && (
            <NPopconfirm onPositiveClick={() => handleDelete(row.userId)}>
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

//批量删除
async function handleBatchDelete() {
  const response = await fetchDeleteUser({ userId: checkedRowKeys.value });
  onBatchDeleted();
}

async function handleDelete(userId: number) {
    await fetchDeleteUser({ userId });
    onDeleted();
}

function edit(id: number, row: Api.UserInfo['user']) {
  const editData = {
    ...row,
    userGender: row.sex,
    userRoles: row.roles?.map(role => role.roleId) ?? []
  };
  handleEdit(id, editData);
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <UserSearch v-model:model="searchParams" @reset="resetSearchParams" @search="getDataByPage" />
    <NCard :title="$t('page.manage.user.title')" :bordered="false" size="small" class="sm:flex-1-hidden card-wrapper">
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :disabled-delete="checkedRowKeys.length === 0"
          :loading="loading"
          @add="handleAdd"
          @delete="handleBatchDelete"
          @refresh="getData"
          :show-add="hasAuth('system:user:add')"
          :show-batch-delete="hasAuth('system:user:remove')"
        />
      </template>
      <NDataTable
        v-model:checked-row-keys="checkedRowKeys"
        :columns="columns"
        :data="data"
        size="small"
        :flex-height="!appStore.isMobile"
        :scroll-x="962"
        :loading="loading"
        remote
        :row-key="row => row.userId"
        :pagination="mobilePagination"
        class="sm:h-full"
      />
      <UserOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        @submitted="getDataByPage"
      />
    </NCard>
  </div>
</template>

<style scoped></style>
