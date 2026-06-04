<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useFormRules, useNaiveForm } from "@/hooks/common/form";
import { fetchQueuePlayerCount, fetchSetMaxPlayerCount } from "@/service/api";
import { $t } from "@/locales";
import { channelStatusOptions, servergroupStatusOptions, gamePlatformOptions } from "@/constants/business";
import { request } from "@/service/request";

defineOptions({
  name: "GroupOperateDrawer",
});

interface Props {
  /** the type of operation */
  operateType: NaiveUI.TableOperateType;
  /** the edit row data */
  rowData?: Api.SystemManage.serverqueue | null;
  /** the mode: 'queue' or 'maxPlayers' */
  mode?: 'queue' | 'maxPlayers';
}

const props = defineProps<Props>();

interface Emits {
  (e: "submitted"): void;
  (e: "clearSelection"): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>("visible", {
  default: false,
});

const { formRef, validate, restoreValidation } = useNaiveForm();
const { defaultRequiredRule } = useFormRules();

// 添加特殊字符校验规则
const specialCharRule = {
  pattern: /^[a-zA-Z0-9\u4e00-\u9fa5]+$/,
  message: $t('form.itemValueInvalid' as App.I18n.I18nKey),
  trigger: ['input', 'blur']
};

// 添加表单验证规则
const rules = {
  setto: [
    defaultRequiredRule,
    {
      validator: (rule: any, value: number) => {
        if (value < 0) {
          return new Error($t('common.nonNegativeNumber' as App.I18n.I18nKey) || '不能为负数');
        }
        return true;
      },
      trigger: ['input', 'blur']
    }
  ]
};

const title = computed(() => {
  if (props.mode === 'maxPlayers') {
    return $t("common.maxPlayers" as App.I18n.I18nKey);
  }
  const titles: Record<string, string> = {
    add: $t("page.manage.serverqueue.title" as App.I18n.I18nKey),
    edit: $t("page.manage.serverqueue.title" as App.I18n.I18nKey)
  };
  return titles[props.operateType] || $t("page.manage.serverqueue.title" as App.I18n.I18nKey);
});

interface Model {
  gameId: string;
  setto: string | number;
  serverList: string;
}

const model = ref<Model>(createDefaultModel());

// 将服务器ID字符串拆分为数组，用于显示标签
const serverListArr = computed({
  get: () => {
    if (!model.value.serverList) return [];
    return model.value.serverList.split(',').filter(Boolean);
  },
  set: (val: string[]) => {
    model.value.serverList = val.join(',');
  }
});

const settoNumber = computed({
  get: () => {
    const value = model.value.setto;
    return typeof value === 'number' ? value : Number(value) || null;
  },
  set: (val: number | null) => {
    model.value.setto = val !== null ? val : '';
  }
});

function createDefaultModel(): Model {
  return {
    gameId: "101",
    setto: "",
    serverList: "",
  };
}

function handleInitModel() {
  if (props.operateType === "edit" && props.rowData) {
    model.value = {
      ...createDefaultModel(),
      ...props.rowData,
      serverList: typeof props.rowData.serverList === 'string'
        ? props.rowData.serverList
        : Array.isArray(props.rowData.serverList)
          ? (props.rowData.serverList as unknown as string[]).join(',')
          : ''
    };
  } else if (props.rowData) {
    model.value = {
      ...createDefaultModel(),
      ...props.rowData
    };
  } else {
    model.value = createDefaultModel();
  }
}

function closeDrawer() {
  visible.value = false;
}

// 移除特定服务器ID
function handleRemoveServer(index: number) {
  const arr = [...serverListArr.value];
  arr.splice(index, 1);
  serverListArr.value = arr;
}

async function handleSubmit() {
  await validate();
  try {
    // 准备基本参数
    const gameId = Number(model.value.gameId);
    const setto = Number(settoNumber.value);

    // 将服务器ID字符串数组转换为数字数组
    const serverList = serverListArr.value.map(id => Number(id));

    // 根据模式调用不同的API
    if (props.mode === 'maxPlayers') {
      await fetchSetMaxPlayerCount({
        gameId,
        setto,
        serverList
      });
      window.$message?.success($t("common.maxPlayersSuccess" as App.I18n.I18nKey));
    } else {
      await fetchQueuePlayerCount({
        gameId,
        setto,
        serverList
      });
      window.$message?.success($t("common.queueSuccess" as App.I18n.I18nKey));
    }

    closeDrawer();
    emit("submitted");
    emit("clearSelection");
  } catch (error) {
    if (props.mode === 'maxPlayers') {
      window.$message?.error($t("common.maxPlayersFailed" as App.I18n.I18nKey));
    } else {
      window.$message?.error($t("common.requestFailed"));
    }
  }
}

watch(visible, () => {
  if (visible.value) {
    handleInitModel();
    restoreValidation();
  }
});
</script>

<template>
  <NDrawer v-model:show="visible" display-directive="show" :width="360">
    <NDrawerContent :title="title" :native-scrollbar="false" closable>
      <NForm ref="formRef" :model="model" :rules="rules" >

        <NFormItem :label="$t('page.manage.serverqueue.serverList')" path="serverList">
          <div class="server-tags-container">
            <NSpace v-if="serverListArr.length > 0" style="flex-wrap: wrap;">
              <NTag
                v-for="(serverId, index) in serverListArr"
                :key="index"
                closable
                style="margin-bottom: 4px;"
                @close="handleRemoveServer(index)"
              >
                {{ serverId }}
              </NTag>
            </NSpace>
          </div>
        </NFormItem>

        <NFormItem
            span="24 m:12"
            :label="$t('page.manage.serverqueue.setto')"
            path="setto"
          >
            <NInputNumber
              v-model:value="settoNumber"
              :placeholder="$t('page.manage.serverqueue.form.setto')"
              style="width: 100%"
              clearable
              :min="0"
            />
          </NFormItem>

      </NForm>
      <template #footer>
        <NSpace :size="16">
          <NButton @click="closeDrawer">{{ $t("common.cancel") }}</NButton>
          <NButton type="primary" @click="handleSubmit">{{
            $t("common.confirm")
          }}</NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped>
.server-tags-container {
  min-height: 32px;
  background-color: var(--n-input-color);
  border: 1px solid var(--n-border-color);
  border-radius: 3px;
  padding: 8px;
}
.server-tags-container:hover {
  border-color: var(--n-border-hover-color);
}
.no-servers {
  color: #8e8e8e;
  font-size: 14px;
  padding: 4px 0;
}
</style>
