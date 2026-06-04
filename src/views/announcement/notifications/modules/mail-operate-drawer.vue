<script setup lang="ts">
import { computed, ref, watch, onMounted } from "vue";
import type { Ref } from 'vue';
import { useFormRules, useNaiveForm } from "@/hooks/common/form";
import type { FormRules, FormItemRule, FormInst } from 'naive-ui';
import {
  fetchAddMarquee,
  fetchUpdateMarquee,
  fetchGetServerGroup,
} from "@/service/api";
import { $t } from "@/locales";
import { useServerStore } from '@/store/modules/server';
import { getJsonData, safeJsonParse } from '@/utils/indexedDB';
import { useThemeStore } from '@/store/modules/theme';

defineOptions({
  name: "MarqueeOperateDrawer",
});

interface Props {
  operateType: NaiveUI.TableOperateType;
  rowData?: (Api.SystemManage.marquee & { isReadonly?: boolean; marqueeStatus?: number }) | null;
  /** 外部传入的只读 */
  readonly?: boolean;
}

const props = defineProps<Props>();

interface Emits {
  (e: "submitted"): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>("visible", {
  default: false,
});

const { formRef, validate, restoreValidation } = useNaiveForm();
const typedFormRef = formRef as Ref<FormInst | null>;
const { defaultRequiredRule } = useFormRules();

// 添加表单验证规则
const rules: Record<string, FormRules | FormItemRule> = {
  marqueeName: { ...defaultRequiredRule, trigger: ['input', 'blur'] },
  marqueeContent: { ...defaultRequiredRule, trigger: ['change', 'blur'] },
  roundTimes: {
    required: true,
    message: $t('page.manage.notifications.form.roundTimes'),
    trigger: ['input', 'blur'],
    validator: (rule: FormItemRule, value: string) => {
      if (!value) return false;
      return /^\d{1,10}$/.test(value);
    }
  },
  roundDelay: {
    required: true,
    message: $t('page.manage.notifications.form.roundDelay'),
    trigger: ['input', 'blur'],
    validator: (rule: FormItemRule, value: string) => {
      if (!value) return false;
      return /^\d{1,10}$/.test(value);
    }
  },
  // startTime: { ...defaultRequiredRule, trigger: ['input', 'blur'] },
  serverIds: {
    required: true,
    message: $t('page.manage.notifications.form.mailServerJson'),
    trigger: ['change', 'blur'],
    validator: (rule: FormItemRule, value: string) => {
      try {
        return selectedServerIds.value.length > 0;
      } catch {
        return false;
      }
    }
  },
};

const title = computed(() => {
  const titles: Record<NaiveUI.TableOperateType, string> = {
    add: $t("page.manage.notifications.addMarquee"),
    edit: $t("page.manage.notifications.editMarquee"),
  };
  return titles[props.operateType];
});

type Model = {
  marqueeName: string;
  marqueeContent: string;
  serverIds: string;
  roundTimes: string;
  roundDelay: string;
  startTime: string | null;
};

const model = ref(createDefaultModel());

// 监听rowData变化，处理编辑时的数据回显
watch(() => props.rowData, (newVal) => {
  if (newVal && props.operateType === 'edit') {
    model.value = {
      marqueeName: newVal.marqueeName || '',
      marqueeContent: newVal.marqueeContent || '',
      serverIds: newVal.serverIds || '',
      roundTimes: newVal.roundTimes || '',
      roundDelay: newVal.roundDelay || '',
      startTime: newVal.startTime || null
    };
  } else {
    model.value = createDefaultModel();
  }
}, { immediate: true });

function createDefaultModel(): Model {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return {
    marqueeName: "",
    marqueeContent: "",
    serverIds: "",
    roundTimes: "",
    roundDelay:"",
    startTime: `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`,
  };
}

const serverGroupOptions = ref<CommonType.Option<number>[]>([]);

const serverStore = useServerStore();

// 在组件挂载时获取服务器列表
onMounted(async () => {
  await serverStore.fetchServerList();
});

// 计算属性获取服务器树形选项
const serverTreeOptions = computed(() => serverStore.serverTreeOptions);

// 修改selectedServerIds的计算属性
const selectedServerIds = ref<string[]>([]);

interface ServerInfo {
  serverId: number;
  serverName: string;
}

interface Server {
  id: number;
  name: string;
}

// 监听serverIds的变化
watch(() => model.value.serverIds, (newVal) => {
  try {
    const serverInfo = JSON.parse(newVal);
    selectedServerIds.value = Array.isArray(serverInfo) ? serverInfo.map(item => String(item.serverId)) : [];
  } catch {
    selectedServerIds.value = [];
  }
}, { immediate: true });

watch(selectedServerIds, (val) => {
  const filteredIds = val.filter(id => !String(id).startsWith('region_'));
  const serverInfo = filteredIds.map(id => {
    // 从服务器列表中查找对应的服务器信息
    const server = serverStore.serverList.find(s => String(s.serverId) === String(id));
    return {
      serverId: Number(id),
      serverName: server?.serverName || ''
    };
  });
  model.value.serverIds = JSON.stringify(serverInfo);
});

async function getServerGroupOptions() {
    const data = await fetchGetServerGroup();
    const responseData = data?.response?.data as { rows?: { groupName: string; id: number }[] };
    if (responseData?.rows && Array.isArray(responseData.rows)) {
      serverGroupOptions.value = responseData.rows.map((item: { groupName: string; id: number }) => ({
        label: item.groupName,
        value: item.id,
      }));
    }
}

function closeDrawer() {
  visible.value = false;
}

async function handleSubmit() {
  try {
    await validate();

    const data = {
      gameId: 101,
      marqueeName: model.value.marqueeName,
      marqueeContent: model.value.marqueeContent,
      serverIds: model.value.serverIds,
      roundTimes: model.value.roundTimes,
      roundDelay: model.value.roundDelay,
      startTime: model.value.startTime
    };

    if (props.operateType === "add") {
      await fetchAddMarquee(data);
      window.$message?.success($t("common.addSuccess"));
    } else {
      const updateData = {
        ...data,
        id: props.rowData?.id
      };
      await fetchUpdateMarquee(updateData);
      window.$message?.success($t("common.updateSuccess"));
    }

    closeDrawer();
    emit("submitted");
  } catch (error) {
    console.error(error);
  }
}

const mailExpireTimestamp = computed({
  get: () => {
    const timestamp = convertToTimestamp(model.value.mailExpire);
    return timestamp ? timestamp * 1000 : null;
  },
  set: (val) => {
    if (val === null) {
      model.value.mailExpire = "";
    } else {
      const date = new Date(val);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const seconds = String(date.getSeconds()).padStart(2, "0");
      model.value.mailExpire = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
  },
});

const startTimeTimestamp = computed({
  get: () => {
    if (model.value.startTime) {
      try {
        const date = new Date(model.value.startTime);
        return date.getTime();
      } catch (error) {
        return null;
      }
    }
    return null;
  },
  set: (val) => {
    if (val === null) {
      model.value.startTime = null;
    } else {
      const date = new Date(val);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      model.value.startTime = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    }
  }
});

// 计算最终只读模式
const readonlyMode = computed(() => {
  if (typeof props.readonly === 'boolean') return props.readonly;
  return props.rowData?.isReadonly || props.rowData?.marqueeStatus === 1 ||
         props.rowData?.marqueeStatus === 2 ||
         props.rowData?.marqueeStatus === 3 ||
         props.rowData?.marqueeStatus === 4;
});

</script>


<template>
  <NModal v-model:show="visible" :title="title" preset="card" class="w-800px">
    <NScrollbar class="h-450px pr-20px">
      <NForm
        ref="formRef"
        :model="model"
        :rules="rules"
        label-placement="left"
        :label-width="100"
      >

        <NGrid responsive="screen" item-responsive>
          <NFormItemGi
            span="24 m:24"
            :label="$t('page.manage.notifications.marqueeName')"
            path="marqueeName"
          >
            <NInput
              v-model:value="model.marqueeName"
              :placeholder="$t('page.manage.notifications.form.marqueeName')"
              :disabled="readonlyMode"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24 m:24"
            :label="$t('page.manage.notifications.marqueeContent')"
            path="marqueeContent"
          >
            <NInput
              v-model:value="model.marqueeContent"
              type="textarea"
              :placeholder="$t('page.manage.notifications.form.marqueeContent')"
              :disabled="readonlyMode"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24"
            :label="$t('page.manage.notifications.roundDelay')"
            path="roundDelay"
          >
            <NInput
              v-model:value="model.roundDelay"
              :placeholder="$t('page.manage.notifications.form.roundDelay')"
              maxlength="10"
              @input="(val) => {
                model.roundDelay = val.replace(/[^\d]/g, '');
              }"
              :disabled="readonlyMode"
            />
          </NFormItemGi>


          <NFormItemGi
            span="24 m:24"
            :label="$t('page.manage.notifications.roundTimes')"
            path="roundTimes"
          >
            <NInput
              v-model:value="model.roundTimes"
              :placeholder="$t('page.manage.notifications.form.roundTimes')"
              maxlength="10"
              @input="(val) => {
                model.roundTimes = val.replace(/[^\d]/g, '');
              }"
              :disabled="readonlyMode"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24 m:24"
            :label="$t('page.manage.notifications.serverIds')"
            path="serverIds"
          >
            <NTreeSelect
              v-model:value="selectedServerIds"
              :options="serverTreeOptions"
              :placeholder="$t('page.manage.notifications.form.serverIds')"
              multiple
              cascade
              checkable
              clearable
              :check-strategy="'child'"
              :max-tag-count="3"
              tag
              :disabled="readonlyMode"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24 m:24"
            :label="$t('page.manage.notifications.startTime')"
            path="startTime"
          >
            <NDatePicker
              v-model:value="startTimeTimestamp"
              type="datetime"
              :placeholder="$t('page.manage.notifications.form.startTime')"
              value-format="yyyy-MM-dd HH:mm:ss"
              clearable
              style="width: 100%"
              :disabled="readonlyMode"
            />
          </NFormItemGi>

        </NGrid>
      </NForm>
    </NScrollbar>
    <template #footer>
      <NSpace justify="end" :size="16">
        <NButton @click="closeDrawer">{{ $t("common.cancel") }}</NButton>
        <NButton type="primary" @click="handleSubmit" :disabled="readonlyMode">{{
          $t("common.confirm")
        }}</NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped>
.n-input--disabled {
  cursor: not-allowed;
}
</style>
