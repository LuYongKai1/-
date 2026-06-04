<script setup lang="ts">
import { computed, reactive, watch, ref } from 'vue';
import { NModal, NForm, NFormItem, NSelect, NInput, NAlert, NSpace, NButton } from 'naive-ui';
import { $t } from '@/locales';
import { useNaiveForm } from '@/hooks/common/form';
import { useServerStore } from '@/store/modules/server';

defineOptions({
  name: 'BackupOperateModal',
});

type OperateType = 'zone' | 'instance' | 'all';

interface Props {
  operateType: OperateType;
}

interface BackupSubmitData {
  gameZone?: string;
  singleRds?: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  submit: [data: BackupSubmitData];
}>();

const visible = defineModel<boolean>('visible', { required: true });

const { formRef, validate, restoreValidation } = useNaiveForm();
const serverStore = useServerStore();

// 表单数据
const formModel = reactive({
  gameZone: '',
  singleRds: [] as string[],
});

// 加载状态
const serverLoading = ref(false);
const submitting = ref(false);


// 服务器选项 - 分组显示
const serverOptions = computed(() => {
  if (!serverStore.regionList?.length) return [];

  return serverStore.regionList
    .filter(region => region.children?.length > 0)
    .map(region => ({
      type: 'group',
      label: region.regionName,
      key: `region_${region.id}`,
      children: region.children.map(server => ({
        label: `${server.serverId}-${server.serverName}`,
        value: server.serverName,
      })),
    }));
});

// 加载服务器列表
async function loadServerList() {
  try {
    serverLoading.value = true;
    await serverStore.fetchServerList();
  } finally {
    serverLoading.value = false;
  }
}

// 备份类型配置
const backupTypeConfig = computed(() => {
  const configs = {
    zone: {
      title: $t('page.manage.backup.backupByZone'),
      tip: $t('page.manage.backup.zoneBackupTip'),
    },
    instance: {
      title: $t('page.manage.backup.backupByInstance'),
      tip: $t('page.manage.backup.instanceBackupTip'),
    },
    all: {
      title: $t('page.manage.backup.backupAll'),
      tip: $t('page.manage.backup.allBackupTip'),
    },
  };
  return configs[props.operateType];
});

const title = computed(() => backupTypeConfig.value.title);
const alertMessage = computed(() => backupTypeConfig.value.tip);

// 表单规则
const rules = computed(() => {
  const baseRules: any = {};

  if (props.operateType === 'zone') {
    baseRules.gameZone = [
      { required: true, message: $t('page.manage.backup.form.zone'), trigger: 'blur' },
    ];
  } else if (props.operateType === 'instance') {
    baseRules.singleRds = [
      {
        type: 'array',
        required: true,
        message: $t('page.manage.backup.form.serverId'),
        trigger: 'blur'
      },
    ];
  }

  return baseRules;
});

// 重置表单
function resetForm() {
  restoreValidation();
  Object.assign(formModel, {
    gameZone: '',
    singleRds: [],
  });
}

// 关闭弹窗
function closeModal() {
  visible.value = false;
  resetForm();
}

// 构建提交数据
function buildSubmitData(): BackupSubmitData | null {
  const { operateType } = props;

  if (operateType === 'zone') {
    const gameZone = formModel.gameZone.trim();
    if (!gameZone) {
      window.$message?.warning('请输入大区名称');
      return null;
    }
    return { gameZone };
  }

  if (operateType === 'instance') {
    if (formModel.singleRds.length === 0) {
      window.$message?.warning($t('page.manage.backup.form.serverId'));
      return null;
    }
    return { singleRds: formModel.singleRds.join(',') };
  }

  return {};
}

// 提交表单
async function handleSubmit() {
  try {
    await validate();

    const submitData = buildSubmitData();
    if (!submitData) return;

    submitting.value = true;
    emit('submit', submitData);
  } finally {
    setTimeout(() => {
      submitting.value = false;
    }, 1000);
  }
}

// 监听弹窗状态
watch(visible, (isVisible) => {
  if (isVisible && props.operateType === 'instance') {
    loadServerList();
  }
});
</script>

<template>
  <NModal
    v-model:show="visible"
    :title="title"
    preset="card"
    :style="{ width: '560px' }"
    :segmented="{ content: 'soft', footer: 'soft' }"
    :mask-closable="true"
    @after-leave="closeModal"
  >
    <NAlert type="info" class="mb-20px" :show-icon="true">
      <template #header>
        <span class="font-semibold">{{ $t('common.tip') }}</span>
      </template>
      {{ alertMessage }}
    </NAlert>

    <NForm
      ref="formRef"
      :model="formModel"
      :rules="rules"
      label-placement="left"
      :label-width="90"
      require-mark-placement="right-hanging"
    >
      <!-- 按区备份 -->
      <NFormItem
        v-if="operateType === 'zone'"
        :label="$t('page.manage.backup.zone')"
        path="gameZone"
      >
        <NInput
          v-model:value="formModel.gameZone"
          placeholder="请输入大区名称（如：先锋）"
          clearable
          :maxlength="50"
          show-count
        />
      </NFormItem>

      <!-- 单实例备份 - 选择区服 -->
      <NFormItem
        v-if="operateType === 'instance'"
        :label="$t('page.manage.backup.server')"
        path="singleRds"
      >
        <NSelect
          v-model:value="formModel.singleRds"
          :options="serverOptions"
          placeholder="请选择要备份的区服"
          :loading="serverLoading"
          multiple
          filterable
          :max-tag-count="3"
          clearable
        />
      </NFormItem>
    </NForm>

    <template #footer>
      <NSpace justify="end">
        <NButton @click="closeModal" :disabled="submitting">
          {{ $t('common.cancel') }}
        </NButton>
        <NButton
          type="primary"
          @click="handleSubmit"
          :loading="submitting"
        >
          {{ $t('common.confirm') }}
        </NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped></style>
