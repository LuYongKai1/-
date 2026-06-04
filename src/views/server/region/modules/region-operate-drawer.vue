<script setup lang="ts">
import { computed, ref, watch, onMounted } from "vue";
import { useFormRules, useNaiveForm } from "@/hooks/common/form";
import {
  fetchGetChannelList,
  fetchAddServerregion,
  fetchUpdateServerregion,
  fetchGetServerGroup,
} from "@/service/api";
import { $t } from "@/locales";
import { channelStatusOptions,serverStatusOptions,gamePlatformOptions,} from "@/constants/business";
import { NUl, NCheckboxGroup, NCheckbox, NSpace, FormItemRule } from "naive-ui";

defineOptions({
  name: "regionOperateDrawer",
});


// 添加Model接口定义
interface Model {
  gameId: number;
  regionName: string;
  regionIndex: number;
  clientVersionMin: string;
  clientVersionMax: string;
  resUrl: string;
  commonHost: string;
  commonPort: string;
  maintenance: string;
  maintenanceMsg: string;
  channelMedia: number[];
  whiteList: string;
  groupList: number[];
}

interface Props {
  /** the type of operation */
  operateType: NaiveUI.TableOperateType;
  /** the edit row data */
  rowData?: Api.SystemManage.serverregion | null;
  /** 当前最大的 regionIndex 值 */
  maxRegionIndex?: number;
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

// 添加自定义验证函数
const validatePositiveNumber = (_rule: FormItemRule, value: string | number): true | Error => {
  // 如果值存在且不为空字符串，则验证是否为正数
  if (value !== undefined && value !== "" && value !== null) {
    const numValue = Number(value);
    if (isNaN(numValue) || numValue <= 0) {
      return new Error("请输入正数");
    }
  }
  return true;
};

const validateVersion = (_rule: FormItemRule, value: string): true | Error => {
  if (!value) return true;
  if (!/^\d+(\.\d+)*$/.test(value)) {
    return new Error("请输入有效的版本号");
  }
  return true;
};

const validateUrl = (_rule: FormItemRule, value: string): true | Error => {
  if (!value) return true;
  try {
    new URL(value);
    return true;
  } catch {
    return new Error("请输入有效的URL");
  }
};

const validateHost = (_rule: FormItemRule, value: string): true | Error => {
  if (!value) return true;
  const hostRegex = /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9])$/;
  if (!hostRegex.test(value)) {
    return new Error("请输入有效的主机名");
  }
  return true;
};

const validatePort = (_rule: FormItemRule, value: string): true | Error => {
  if (!value) return true;
  const port = Number(value);
  if (isNaN(port) || port < 0 || port > 65535) {
    return new Error("请输入有效的端口号(0-65535)");
  }
  return true;
};

// 修改表单验证规则
const rules = {
  regionName: [
    {
      required: true,
      message: () => $t('form.required'),
      trigger: ['input', 'blur']
    }
  ],
  regionIndex: [
    {
      required: true,
      message: () => $t('form.required'),
      trigger: ['input', 'blur'],
      validator: (rule: any, value: any) => {
        if (value === undefined || value === null || value === '') {
          return new Error($t('form.required'));
        }
        return true;
      }
    },
    {
      validator: validatePositiveNumber,
      message: "请输入正数",
      trigger: ['input', 'blur']
    }
  ],
  channelMedia: [
    {
      required: true,
      message: () => $t('form.required'),
      trigger: ['change'],
      validator: (rule: any, value: any) => {
        if (!value || value.length === 0) {
          return new Error($t('form.required'));
        }
        return true;
      }
    }
  ],
  groupList: [
    {
      required: true,
      message: () => $t('form.required'),
      trigger: ['change'],
      validator: (rule: any, value: any) => {
        if (!value || value.length === 0) {
          return new Error($t('form.required'));
        }
        return true;
      }
    }
  ]
};

const model = ref<Model>(createDefaultModel());

function createDefaultModel(): Model {
  return {
    gameId: 101,
    regionName: "",
    regionIndex: 1,
    clientVersionMin: "1.0.0",
    clientVersionMax: "1.0.0",
    resUrl: "http://",
    commonHost: "",
    commonPort: "80",
    maintenance: "0",
    maintenanceMsg: "",
    channelMedia: [1],
    whiteList: "",
    groupList: [],
  };
}

// type RuleKey = Extract<keyof Model, "gameName" | "enable" | "channelIds">;

// const rules: Record<RuleKey, App.Global.FormRule> = {
//   gameName: defaultRequiredRule,
//   enable: defaultRequiredRule,
//   channelIds: defaultRequiredRule,
// };

const roleOptions = ref<CommonType.Option<string>[]>([]);
const channelOptions = ref<CommonType.Option<number>[]>([]);
const serverGroupOptions = ref<CommonType.Option<number>[]>([]);

// 获取服务器组数据
async function getServerGroupOptions() {
  try {
    const data = await fetchGetServerGroup();
    // 处理类型兼容问题
    const rows = data?.response?.data?.rows as any[] || [];
    if (Array.isArray(rows)) {
      serverGroupOptions.value = rows.map((item: any) => ({
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



async function getChannelOptions() {
  try {
    const data = await fetchGetChannelList();

    if (data?.response?.data?.data && Array.isArray(data.response.data.data)) {
      channelOptions.value = data.response.data.data.map((item) => ({
        label: item.channelName,
        value: item.channelId,
      }));
    } else {
      console.error("渠道数据格式不正确:", data);
    }
  } catch (err) {
    console.error("获取渠道列表失败:", err);
    window.$message?.error($t("common.requestFailed"));
  }
}

function handleInitModel() {
  if (props.operateType === "edit" && props.rowData) {
    const { channelMedia, whiteList, groupList, maintenance, regionIndex, ...rest } = props.rowData;
    model.value = {
      ...createDefaultModel(),
      ...rest,
      regionIndex: regionIndex !== undefined ? Number(regionIndex) : 1,
      maintenance: maintenance !== undefined ? String(maintenance) : "",
      channelMedia: channelMedia ? channelMedia.split(",").map(Number) : [],
      whiteList: whiteList || "",
      groupList: groupList ? groupList.split(",").map(Number) : [],
    };
  } else {
    const defaultModel = createDefaultModel();
    const nextIndex = (typeof props.maxRegionIndex === 'number' ? props.maxRegionIndex : 0) + 1;
    model.value = {
      ...defaultModel,
      regionIndex: nextIndex
    };
  }
}

function closeDrawer() {
  visible.value = false;
}

// 在handleSubmit函数前添加一个计算属性来添加title
const title = computed(() => {
  return props.operateType === 'add'
    ? $t('common.add')
    : $t('common.edit');
});

async function handleSubmit() {
  await validate();
  try {
    const data = {
      ...model.value,
      gameId: model.value.gameId || 101,
      channelMedia: Array.isArray(model.value.channelMedia)
        ? model.value.channelMedia.join(",")
        : model.value.channelMedia,
      whiteList: model.value.whiteList,
      groupList: Array.isArray(model.value.groupList)
        ? model.value.groupList.join(",")
        : model.value.groupList,
    };

    if (props.operateType === "add") {
      await fetchAddServerregion(data);
      window.$message?.success($t("common.addSuccess"));
    } else {
      await fetchUpdateServerregion(data);
      window.$message?.success($t("common.updateSuccess"));
    }

    closeDrawer();
    emit("submitted");
  } catch (error) {
    window.$message?.error($t("common.requestFailed"));
  }
}

onMounted(() => {
  getChannelOptions();
  getServerGroupOptions();
});

watch(visible, (newVal) => {
  if (newVal) {
    handleInitModel();
    restoreValidation();
    getChannelOptions();
    getServerGroupOptions();
  }
});
</script>


<template>
  <NDrawer v-model:show="visible" display-directive="show" :width="360">
    <NDrawerContent :title="title" :native-scrollbar="false" closable>
      <NForm
        ref="formRef"
        :model="model"
        :rules="rules"
      >
        <NFormItem
          :label="$t('page.manage.serverregion.regionName')"
          path="regionName"
        >
          <NInput
            v-model:value="model.regionName"
            :placeholder="$t('page.manage.serverregion.form.regionName')"
          />
        </NFormItem>

        <NFormItem
          :label="$t('page.manage.serverregion.regionIndex')"
          path="regionIndex"
        >
          <NInputNumber
            v-model:value="model.regionIndex"
            :placeholder="$t('page.manage.serverregion.form.regionIndex')"
            style="width: 100%"
            clearable
            :min="1"
          />
        </NFormItem>

        <NFormItem
          :label="$t('page.manage.serverregion.groupList')"
          path="groupList"
        >
          <NSpace vertical>
            <NCheckboxGroup v-model:value="model.groupList">
              <NSpace wrap>
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
