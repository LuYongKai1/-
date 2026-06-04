<script setup lang="ts">
import { computed, reactive, ref, onMounted } from 'vue';
import { NSpace, NCard, NAvatar, NDescriptions, NDescriptionsItem, NButton, NForm, NFormItem, NInput, NSelect, NUpload, NTag, NGrid, NGi, NStatistic, NIcon, NSpin, NModal, NSwitch, useMessage } from 'naive-ui';
import { Icon } from '@iconify/vue';
import { useAuthStore } from '@/store/modules/auth';
import { useAppStore } from '@/store/modules/app';
import { $t } from '@/locales';
import { userGenderRecord } from '@/constants/business';
import {  fetchUpdateUserPassword,fetchUploadAvatar, fetchUpdateUserInfo  } from '@/service/api';

const authStore = useAuthStore();
const appStore = useAppStore();
const message = useMessage();

const loading = ref(false);
const editModalVisible = ref(false);
const passwordModalVisible = ref(false);
const avatarPreviewVisible = ref(false);
const avatarLoading = ref(false);
const passwordLoading = ref(false);

// 用户信息
const userInfo = computed(() => authStore.userInfo.user);

const avatarKey = ref(0);
const avatarUrl = computed(() => {
  const avatar = userInfo.value.avatar;

  if (!avatar) return undefined;

  // 处理 base64 格式的图片数据
  if (avatar.startsWith('data:image/')) {
    return avatar;
  }

  // if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
  //   return avatar;
  // }

  // if (avatar.startsWith('/statics/')) {
  //   const backendUrl = import.meta.env.VITE_SERVICE_BASE_URL || window.location.origin;
  //   const fullUrl = `${backendUrl}/platform-system${avatar}`;
  //   return fullUrl;
  // }

  // const baseUrl = import.meta.env.VITE_SERVICE_BASE_URL || window.location.origin;
  // const fullUrl = avatar.startsWith('/') ? `${baseUrl}${avatar}` : `${baseUrl}/${avatar}`;
  // return fullUrl;
});

const avatarLoadError = ref(false);

const handleAvatarError = () => {
  avatarLoadError.value = true;
};

const handleAvatarLoad = () => {
  avatarLoadError.value = false;
};

// 编辑表单数据
const editForm = reactive({
  nickName: '',
  email: '',
  phonenumber: '',
  sex: '',
  remark: ''
});

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
});

// 性别选项定义：0-男，1-女
const genderOptions = [
  { label: $t('page.userCenter.gender.male'), value: '0' },   // 男性选项
  { label: $t('page.userCenter.gender.female'), value: '1' }, // 女性选项
];

// 密码表单验证规则
const passwordRules = {
  oldPassword: {
    required: true,
    message: $t('page.userCenter.passwordModal.form.currentPasswordRequired'),
    trigger: 'blur'
  },
  newPassword: [
    {
      required: true,
      message: $t('page.userCenter.passwordModal.form.newPasswordRequired'),
      trigger: 'blur'
    },
    {
      min: 6,
      max: 20,
      message: $t('page.userCenter.passwordModal.form.newPasswordLength'),
      trigger: 'blur'
    }
  ],
  confirmPassword: [
    {
      required: true,
      message: $t('page.userCenter.passwordModal.form.confirmPasswordRequired'),
      trigger: 'blur'
    },
    {
      validator: (rule: any, value: string) => {
        if (value !== passwordForm.newPassword) {
          return Promise.reject($t('page.userCenter.passwordModal.form.passwordMismatch'));
        }
        return Promise.resolve();
      },
      trigger: 'blur'
    }
  ]
};

// 获取用户统计信息
const userStats = computed(() => [
  {
    title: $t('page.userCenter.statistics.loginCount'),
    value: 156,
    icon: 'mdi:account',
    color: '#18a058'
  },
  {
    title: $t('page.userCenter.statistics.onlineTime'),
    value: `2,345${$t('page.userCenter.statistics.onlineTimeUnit')}`,
    icon: 'mdi:clock-outline',
    color: '#2080f0'
  },
  {
    title: $t('page.userCenter.statistics.rolePermissions'),
    value: userInfo.value.roles?.length || 0,
    icon: 'mdi:shield-check',
    color: '#f0a020'
  },
  {
    title: $t('page.userCenter.statistics.department'),
    value: userInfo.value.dept?.deptName || $t('page.userCenter.userInfo.unassigned'),
    icon: 'mdi:office-building',
    color: '#d03050'
  }
]);

const formatDate = (dateStr: string) => {
  if (!dateStr) return $t('page.userCenter.userInfo.unknown');
  try {
    return new Date(dateStr).toLocaleString('zh-CN');
  } catch {
    return dateStr;
  }
};

const getGenderTagType = (sex: string): 'default' | 'primary' | 'info' | 'success' | 'warning' | 'error' => {
  switch (sex) {
    case '0': return 'primary';  // 男性使用蓝色
    case '1': return 'error';    // 女性使用红色
  }
};

const getGenderText = (sex: string) => {
  switch (sex) {
    case '0': return $t('page.userCenter.gender.male');    // 男
    case '1': return $t('page.userCenter.gender.female');  // 女
  }
};

const openEditModal = () => {
  editForm.nickName = userInfo.value.nickName || '';
  editForm.email = userInfo.value.email || '';
  editForm.phonenumber = userInfo.value.phonenumber || '';
  editForm.sex = userInfo.value.sex || '';
  editForm.remark = userInfo.value.remark || '';
  editModalVisible.value = true;
};

const openPasswordModal = () => {
  passwordForm.oldPassword = '';
  passwordForm.newPassword = '';
  passwordForm.confirmPassword = '';
  passwordModalVisible.value = true;
};

const openAvatarPreview = () => {
  if (avatarUrl.value) {
    avatarPreviewVisible.value = true;
  }
};

// 保存用户信息
const saveUserInfo = async () => {
  try {
    loading.value = true;

    const updateData = {
      userId: userInfo.value.userId,
      userName: userInfo.value.userName,
      nickName: editForm.nickName,
      email: editForm.email,
      phonenumber: editForm.phonenumber,
      sex: editForm.sex,
      remark: editForm.remark
    };

    const { error } = await fetchUpdateUserInfo(updateData);

    if (!error) {
      message.success($t('common.modifySuccess'));
      editModalVisible.value = false;
      await authStore.initUserInfo();
    } else {
      message.error($t('common.updateFailed'));
    }
  } catch (error) {
    message.error($t('common.updateFailed'));
  } finally {
    loading.value = false;
  }
};

// 修改密码
const changePassword = async () => {
  try {
    passwordLoading.value = true;

    const { error } = await fetchUpdateUserPassword({
      oldPassword: passwordForm.oldPassword,
      newPassword: passwordForm.newPassword
    });

    if (!error) {
      message.success($t('page.userCenter.passwordChangeSuccess'));
      passwordModalVisible.value = false;
      passwordForm.oldPassword = '';
      passwordForm.newPassword = '';
      passwordForm.confirmPassword = '';
    } else {
      message.error($t('page.userCenter.passwordCheckFailed'));
    }
  } catch (error) {
    message.error($t('page.userCenter.passwordChangeFailed'));
  } finally {
    passwordLoading.value = false;
  }
};

  // 防止重复上传
  const handleAvatarUpload = async (options: any) => {
  if (avatarLoading.value) {
    return;
  }

  try {
    avatarLoading.value = true;
    const { file, onFinish, onError } = options;
    const formData = new FormData();
    formData.append('avatarfile', file.file);
    const result = await fetchUploadAvatar(formData);
    if (result !== null && result !== undefined) {
      message.success($t('common.uploadSuccess'));
      onFinish?.();
      await authStore.initUserInfo();
      avatarKey.value++;
    } else {
      message.error($t('common.uploadFailed'));
      onError?.();
    }
  } catch (error) {
    console.error('头像上传失败:', error);
    message.error($t('common.uploadFailed'));
    options.onError?.();
  } finally {
    avatarLoading.value = false;
  }
};

const gap = computed(() => (appStore.isMobile ? 8 : 16));

onMounted(() => {
  // 页面加载时可以刷新用户信息
});
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <!-- 页面标题 -->
    <NCard :bordered="false" class="card-wrapper">
      <div class="flex items-center gap-12px">
        <Icon icon="mdi:account-circle" class="text-24px text-primary" />
        <h2 class="text-18px font-semibold m-0">{{ $t('page.userCenter.title') }}</h2>
      </div>
    </NCard>

    <NSpace vertical :size="gap">
      <!-- 用户基本信息卡片 -->
      <NCard :bordered="false" class="card-wrapper">
        <NGrid :x-gap="gap" :y-gap="16" responsive="screen" item-responsive>
          <!-- 头像和基本信息 -->
          <NGi span="24 s:24 m:8">
            <div class="flex-col-center gap-16px">
              <div class="relative">
                <NSpin :show="avatarLoading">
                  <!-- 原生 img 标签测试 -->
                  <img
                    v-if="avatarUrl"
                    :src="avatarUrl"
                    :key="avatarKey"
                    alt="头像"
                    class="w-120px h-120px rounded-full object-cover border-2 border-solid border-gray-200 hover:border-primary transition-colors cursor-pointer"
                    @load="handleAvatarLoad"
                    @error="handleAvatarError"
                    @click="openAvatarPreview"
                  />
                  <NAvatar
                    v-else
                    :size="120"
                    class="avatar-round border-2 border-solid border-gray-200 hover:border-primary transition-colors cursor-pointer"
                    @click="openAvatarPreview"
                  >
                    {{ userInfo.nickName?.[0] || userInfo.userName?.[0] || 'U' }}
                  </NAvatar>
                </NSpin>
                <NUpload
                  :custom-request="handleAvatarUpload"
                  :show-file-list="false"
                  accept="image/*"
                  class="absolute bottom-0 right-0"
                >
                  <NButton circle size="small" type="primary" class="shadow-md">
                    <template #icon>
                      <Icon icon="mdi:camera" class="text-14px" />
                    </template>
                  </NButton>
                </NUpload>
              </div>

              <div class="text-center">
                <h3 class="text-20px font-bold m-0 mb-4px">{{ userInfo.nickName || userInfo.userName }}</h3>
                <p class="text-gray-500 m-0 mb-8px">@{{ userInfo.userName }}</p>
                <NTag :type="getGenderTagType(userInfo.sex)" size="small">
                  {{ getGenderText(userInfo.sex) }}
                </NTag>
              </div>

              <div class="w-full flex flex-col gap-8px">
                <NButton type="primary" @click="openEditModal" class="w-full">
                  {{ $t('page.userCenter.editProfile') }}
                </NButton>
                <NButton type="default" @click="openPasswordModal" class="w-full">
                  <template #icon>
                    <Icon icon="mdi:lock-reset" class="text-16px" />
                  </template>
                  {{ $t('page.userCenter.changePassword') }}
                </NButton>
              </div>
            </div>
          </NGi>

          <!-- 详细信息 -->
          <NGi span="24 s:24 m:16">
            <NDescriptions :column="appStore.isMobile ? 1 : 2" label-placement="left" class="mt-16px">
              <NDescriptionsItem :label="$t('page.userCenter.userInfo.username')">
                <div class="flex items-center gap-8px">
                  <Icon icon="mdi:account" class="text-16px" />
                  {{ userInfo.userName }}
                </div>
              </NDescriptionsItem>

              <NDescriptionsItem :label="$t('page.userCenter.userInfo.nickname')">
                {{ userInfo.nickName || $t('page.userCenter.userInfo.notSet') }}
              </NDescriptionsItem>

              <NDescriptionsItem :label="$t('page.userCenter.userInfo.email')">
                <div class="flex items-center gap-8px">
                  <Icon icon="mdi:email" class="text-16px" />
                  {{ userInfo.email || $t('page.userCenter.userInfo.notSet') }}
                </div>
              </NDescriptionsItem>

              <NDescriptionsItem :label="$t('page.userCenter.userInfo.phone')">
                <div class="flex items-center gap-8px">
                  <Icon icon="mdi:phone" class="text-16px" />
                  {{ userInfo.phonenumber || $t('page.userCenter.userInfo.notSet') }}
                </div>
              </NDescriptionsItem>

              <NDescriptionsItem :label="$t('page.userCenter.userInfo.department')">
                <div class="flex items-center gap-8px">
                  <Icon icon="mdi:office-building" class="text-16px" />
                  {{ userInfo.dept?.deptName || $t('page.userCenter.userInfo.unassigned') }}
                </div>
              </NDescriptionsItem>

              <NDescriptionsItem :label="$t('page.userCenter.userInfo.lastLogin')">
                <div class="flex items-center gap-8px">
                  <Icon icon="mdi:clock-outline" class="text-16px" />
                  {{ formatDate(userInfo.loginDate) }}
                </div>
              </NDescriptionsItem>

              <NDescriptionsItem :label="$t('page.userCenter.userInfo.loginIp')">
                <div class="flex items-center gap-8px">
                  <Icon icon="mdi:map-marker" class="text-16px" />
                  {{ userInfo.loginIp || $t('page.userCenter.userInfo.unknown') }}
                </div>
              </NDescriptionsItem>

              <NDescriptionsItem :label="$t('page.userCenter.userInfo.createTime')">
                {{ formatDate(userInfo.createTime) }}
              </NDescriptionsItem>
            </NDescriptions>
          </NGi>
        </NGrid>
      </NCard>

      <!-- 统计信息 -->
      <NGrid :x-gap="gap" :y-gap="16" responsive="screen" item-responsive>
        <NGi v-for="stat in userStats" :key="stat.title" span="24 s:12 m:6">
          <NCard :bordered="false" class="card-wrapper text-center">
            <NStatistic :value="stat.value" class="mb-8px">
              <template #prefix>
                <Icon :icon="stat.icon" class="text-24px" :style="{ color: stat.color }" />
              </template>
            </NStatistic>
            <div class="text-gray-600">{{ stat.title }}</div>
          </NCard>
        </NGi>
      </NGrid>

      <!-- 角色权限信息 -->
      <NCard :bordered="false" class="card-wrapper" :title="$t('page.userCenter.rolePermissions.title')">
        <div class="flex flex-wrap gap-8px">
          <NTag
            v-for="role in userInfo.roles"
            :key="role.roleId"
            type="primary"
            size="medium"
            class="px-12px py-6px"
          >
            <div class="flex items-center gap-6px">
              <Icon icon="mdi:shield-check" class="text-14px" />
              {{ role.roleName }}
            </div>
          </NTag>
          <NTag v-if="!userInfo.roles?.length" type="warning">
            {{ $t('page.userCenter.rolePermissions.noRoles') }}
          </NTag>
        </div>
      </NCard>
    </NSpace>

    <!-- 编辑用户信息弹窗 -->
    <NModal v-model:show="editModalVisible" preset="dialog" :title="$t('page.userCenter.editModal.title')" style="width: 600px">
      <NForm :model="editForm" label-placement="left" label-width="auto" class="py-16px">
        <NFormItem :label="$t('page.userCenter.editModal.nickname')" path="nickName">
          <NInput v-model:value="editForm.nickName" :placeholder="$t('page.userCenter.editModal.form.nicknamePlaceholder')" />
        </NFormItem>

        <NFormItem :label="$t('page.userCenter.editModal.email')" path="email">
          <NInput v-model:value="editForm.email" :placeholder="$t('page.userCenter.editModal.form.emailPlaceholder')" />
        </NFormItem>

        <NFormItem :label="$t('page.userCenter.editModal.phone')" path="phonenumber">
          <NInput v-model:value="editForm.phonenumber" :placeholder="$t('page.userCenter.editModal.form.phonePlaceholder')" />
        </NFormItem>

        <NFormItem :label="$t('page.userCenter.editModal.gender')" path="sex">
          <NSelect
            v-model:value="editForm.sex"
            :options="genderOptions"
            :placeholder="$t('page.userCenter.editModal.form.genderPlaceholder')"
          />
        </NFormItem>

        <NFormItem :label="$t('page.userCenter.editModal.remark')" path="remark">
          <NInput
            v-model:value="editForm.remark"
            type="textarea"
            :placeholder="$t('page.userCenter.editModal.form.remarkPlaceholder')"
            :rows="3"
          />
        </NFormItem>
      </NForm>

      <template #action>
        <div class="flex gap-12px">
          <NButton @click="editModalVisible = false">{{ $t('common.cancel') }}</NButton>
          <NButton type="primary" :loading="loading" @click="saveUserInfo">
            {{ $t('common.confirm') }}
          </NButton>
        </div>
      </template>
    </NModal>

    <!-- 修改密码弹窗 -->
    <NModal v-model:show="passwordModalVisible" preset="dialog" :title="$t('page.userCenter.passwordModal.title')" style="width: 500px">
      <NForm :model="passwordForm" :rules="passwordRules" label-placement="left" label-width="auto" class="py-16px">
        <NFormItem :label="$t('page.userCenter.passwordModal.currentPassword')" path="oldPassword">
          <NInput
            v-model:value="passwordForm.oldPassword"
            type="password"
            :placeholder="$t('page.userCenter.passwordModal.form.currentPasswordPlaceholder')"
            show-password-on="mousedown"
          />
        </NFormItem>

        <NFormItem :label="$t('page.userCenter.passwordModal.newPassword')" path="newPassword">
          <NInput
            v-model:value="passwordForm.newPassword"
            type="password"
            :placeholder="$t('page.userCenter.passwordModal.form.newPasswordPlaceholder')"
            show-password-on="mousedown"
          />
        </NFormItem>

        <NFormItem :label="$t('page.userCenter.passwordModal.confirmPassword')" path="confirmPassword">
          <NInput
            v-model:value="passwordForm.confirmPassword"
            type="password"
            :placeholder="$t('page.userCenter.passwordModal.form.confirmPasswordPlaceholder')"
            show-password-on="mousedown"
          />
        </NFormItem>
      </NForm>

      <template #action>
        <div class="flex gap-12px">
          <NButton @click="passwordModalVisible = false">{{ $t('common.cancel') }}</NButton>
          <NButton type="primary" :loading="passwordLoading" @click="changePassword">
            <template #icon>
              <Icon icon="mdi:check" class="text-16px" />
            </template>
            {{ $t('page.userCenter.passwordModal.confirmChange') }}
          </NButton>
        </div>
      </template>
    </NModal>

    <!-- 头像预览弹窗 -->
    <NModal
      v-model:show="avatarPreviewVisible"
      preset="card"
      class="avatar-preview-modal"
      style="width: auto; max-width: 90vw; max-height: 90vh;"
      :bordered="false"
      :closable="true"
      :mask-closable="true"
    >
      <template #header>
        <div class="flex items-center gap-8px">
          <Icon icon="mdi:account-circle" class="text-20px" />
          <span>{{ $t('page.userCenter.avatarPreview') }}</span>
        </div>
      </template>

      <div class="flex justify-center p-16px">
        <img
          v-if="avatarUrl"
          :src="avatarUrl"
          :alt="$t('page.userCenter.userInfo.avatarPreview')"
          class="max-w-full max-h-70vh object-contain rounded-8px shadow-lg"
        />
      </div>
    </NModal>
  </div>
</template>

<style scoped>
.card-wrapper {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  border-radius: 12px;
}

.card-wrapper:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

.flex-col-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.avatar-round {
  border-radius: 50% !important;
  overflow: hidden;
}

.avatar-round :deep(.n-avatar) {
  border-radius: 50% !important;
}

.avatar-round :deep(img) {
  border-radius: 50% !important;
  object-fit: cover;
}

.avatar-preview-modal {
  background: rgba(0, 0, 0, 0.1);
}

.avatar-preview-modal :deep(.n-card) {
  background: white;
  border-radius: 12px;
}

.avatar-preview-modal :deep(.n-card__content) {
  padding: 0;
}

.avatar-preview-modal :deep(.n-card__header) {
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}
</style>
