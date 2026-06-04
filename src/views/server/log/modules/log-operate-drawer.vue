<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useFormRules, useNaiveForm } from "@/hooks/common/form";
import {
  fetGetServerAdd,
  fetchGetServerUpdate,
  fetchGetServerGroup,
} from "@/service/api";
import { $t } from "@/locales";
import {
  serverLogOptions,
  serverLogsaveEnbleOptions,
} from "@/constants/business";

defineOptions({
  name: "LogOperateDrawer",
});

interface Props {
  /** the type of operation */
  operateType: NaiveUI.TableOperateType;
  /** the edit row data */
  rowData?: Api.SystemManage.serverlog | null;
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
const { defaultRequiredRule } = useFormRules();

const title = computed(() => {
  const titles: Record<NaiveUI.TableOperateType, string> = {
    add: $t("page.manage.log.addserverlog"),
    edit: $t("page.manage.log.editserverlog"),
  };
  return titles[props.operateType];
});

// 添加表单验证规则
const rules = {
  logName: defaultRequiredRule,
  logIp:defaultRequiredRule,
  logPort:defaultRequiredRule,
  enable: defaultRequiredRule,
  saveEnable: defaultRequiredRule,
  groupList: defaultRequiredRule
};

type Model = Pick<
  Api.SystemManage.serverlog,
  "logName" | "logIp" | "logPort" | "saveEnable" | "groupList" | "enable"
>;

const model = ref(createDefaultModel());

function createDefaultModel(): Model {
  return {
    logName: "",
    logIp: "",
    logPort: "",
    saveEnable: "",
    groupList: "",
    enable: "",
  };
}

// type RuleKey = Extract<keyof Model, "userName" | "status">;

// const rules: Record<RuleKey, App.Global.FormRule> = {
//   userName: defaultRequiredRule,
//   status: defaultRequiredRule,
// };

const serverGroupOptions = ref<CommonType.Option<number>[]>([]);

async function getServerGroupOptions() {
  try {
    const data = await fetchGetServerGroup();
    if (data?.response?.data?.rows && Array.isArray(data.response.data.rows)) {
      serverGroupOptions.value = data.response.data.rows.map((item) => ({
        label: item.groupName,
        value: item.id,
      }));
    } else {
      console.error("获取服务器组数据格式不正确:", data);
    }
  } catch (err) {
    console.error("获取服务器组列表失败:", err);
    window.$message?.error($t("common.requestFailed"));
  }
}

function handleInitModel() {
  if (props.operateType === "edit" && props.rowData) {
    const { saveEnable, enable, groupList, ...rest } = props.rowData;
    model.value = {
      ...createDefaultModel(),
      ...rest,
      saveEnable: saveEnable !== undefined ? String(saveEnable) : "", // 确保是字符串
      enable: enable !== undefined ? String(enable) : "", // 确保是字符串
      groupList: groupList ? groupList.split(",").map(Number) : [],
    };
  } else {
    model.value = createDefaultModel();
  }
}

function closeDrawer() {
  visible.value = false;
}

async function handleSubmit() {
  await validate();
  try {
    const Data = {
      ...model.value,
      gameId: "101",
      groupList: Array.isArray(model.value.groupList)
        ? model.value.groupList.join(",")
        : model.value.groupList,
    };

    if (props.operateType === "add") {
      await fetGetServerAdd(Data);
      window.$message?.success($t("common.addSuccess"));
    } else {
      const { data, error } = await fetchGetServerUpdate(Data);
      window.$message?.success($t("common.updateSuccess"));
    }
    closeDrawer();
    emit("submitted");
  } catch (error) {
    window.$message?.error($t("common.requestFailed"));
  }

}
onMounted(() => {
  getServerGroupOptions();
});

watch(visible, () => {
  if (visible.value) {
    handleInitModel();
    restoreValidation();
    getServerGroupOptions();
  }
});
</script>

<template>
  <NDrawer v-model:show="visible" display-directive="show" :width="360">
    <NDrawerContent :title="title" :native-scrollbar="false" closable>
      <NForm ref="formRef" :model="model" :rules="rules">
        <NFormItem :label="$t('page.manage.log.logName')" path="logName">
          <NInput
            v-model:value="model.logName"
            :placeholder="$t('page.manage.log.form.logName')"
          />
        </NFormItem>

        <NFormItem :label="$t('page.manage.log.logIp')" path="logIp">
          <NInput
            v-model:value="model.logIp"
            :placeholder="$t('page.manage.log.form.logIp')"
          />
        </NFormItem>

        <NFormItem :label="$t('page.manage.log.logPort')" path="logPort">
          <NInput
            v-model:value="model.logPort"
            :placeholder="$t('page.manage.log.form.logPort')"
          />
        </NFormItem>

        <NFormItem :label="$t('page.manage.log.enable')" path="enable">
          <NRadioGroup v-model:value="model.enable">
            <NRadio
              v-for="item in serverLogOptions"
              :key="item.value"
              :value="item.value"
              :label="$t(item.label)"
            />
          </NRadioGroup>
        </NFormItem>

        <NFormItem :label="$t('page.manage.log.saveEnable')" path="saveEnable">
          <NRadioGroup v-model:value="model.saveEnable">
            <NRadio
              v-for="item in serverLogsaveEnbleOptions"
              :key="item.value"
              :value="item.value"
              :label="$t(item.label)"
            />
          </NRadioGroup>
        </NFormItem>

        <NFormItem
          span="24"
          :label="$t('page.manage.serverregion.groupList')"
          path="serverGroupIds"
        >
          <NSpace vertical>
            <NCheckboxGroup v-model:value="model.groupList">
              <NSpace>
                <NCheckbox
                  v-for="item in serverGroupOptions"
                  :key="item.value"
                  :value="item.value"
                >
                  {{ item.label }}
                </NCheckbox>
              </NSpace>
            </NCheckboxGroup>
          </NSpace>
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

<style scoped></style>
