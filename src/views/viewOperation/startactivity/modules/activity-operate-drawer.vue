<script setup lang="ts">
import { computed, ref, watch, onMounted } from "vue";
import { useFormRules, useNaiveForm } from "@/hooks/common/form";
import {
  fetchGetTemplateAll,
  fetchAddActivityNotice,
  fetchUpdateActivityNotice,
  fetchGetServerGroup,
} from "@/service/api";
import { $t } from "@/locales";
import { gameGenderOptions, gameUsermergeOptions } from "@/constants/business";
import { useServerStore } from '@/store/modules/server';
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";

import {
  NUl,
  NCheckboxGroup,
  NCheckbox,
  NSpace,
  NInput,
  NFormItemGi,
  NGrid,
  NSelect,
  NTreeSelect,
  NDatePicker,
  NModal,
  NForm,
  NButton,
  NScrollbar,
  NImage
} from "naive-ui";

defineOptions({
  name: "ActivityOperateDrawer",
});

interface Props {
  /** the type of operation */
  operateType: NaiveUI.TableOperateType;
  /** the edit row data */
  rowData?: (Api.SystemManage.activity & { isReadonly?: boolean; status?: number }) | null;
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
const { defaultRequiredRule } = useFormRules();

const title = computed(() => {
  const titles: Record<NaiveUI.TableOperateType, string> = {
    add: $t("page.manage.activity.addActivity"),
    edit: $t("page.manage.activity.editActivity"),
  };
  return titles[props.operateType];
});

// 修正类型定义
type Model = Pick<
  Api.SystemManage.activity,
  | "name"
  | "servers"
> & {
  templateId: string;
  startTime: number | null;
  endTime: number | null;
};

const model = ref(createDefaultModel());
const templateOptions = ref<CommonType.Option<string>[]>([]);
const templateMetaData = ref<Record<string, { id: string; name: string; gmParam: string }>>({});

function createDefaultModel(): Model {
  const now = Date.now();
  const sevenDaysLater = now + 7 * 24 * 60 * 60 * 1000; // 7天后的时间戳

  return {
    name: "",
    templateId: "",
    servers: "",
    startTime: now,
    endTime: sevenDaysLater,
  };
}

// 修正rules类型
type RuleKey = "name" | "templateId" | "servers";

const rules: Record<RuleKey, App.Global.FormRule> = {
  name: defaultRequiredRule,
  templateId: defaultRequiredRule,
  servers: {
    required: true,
    message: $t('page.manage.activity.form.servers'),
    trigger: ['change', 'blur'],
    validator: (rule: any, value: string) => {
      try {
        return selectedServerIds.value.length > 0;
      } catch {
        return false;
      }
    }
  },
};

const serverGroupOptions = ref<CommonType.Option<number>[]>([]);
const serverStore = useServerStore();
// 使用封装好的包含跨服的服务器树选项
const serverTreeOptions = computed(() => serverStore.mixedServerTreeOptions);

const selectedServerIds = ref<string[]>([]);

// 单向同步：selectedServerIds → model.value.servers
// 过滤掉区域节点和跨服组节点，处理跨服ID（去掉 cross_ 前缀再存储）
watch(selectedServerIds, (val) => {
  const filteredIds = val
    .filter(id => {
      const idStr = String(id);
      return !idStr.startsWith('region_') && idStr !== 'cross_server_group';
    })
    .map(id => {
      const idStr = String(id);
      if (idStr.startsWith('cross_')) {
        return idStr.replace('cross_', '');
      }
      return String(id);
    });
  model.value.servers = JSON.stringify(filteredIds);
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

const templatesLoading = ref(false);

async function getTemplateOptions() {
  try {
    templatesLoading.value = true;
    const response = await fetchGetTemplateAll();
    const responseData = response?.response?.data;

    if (Array.isArray(responseData?.data)) {
      templateOptions.value = responseData.data.map(item => ({
        label: item.templateName || "",
        value: item.id,
      }));

      // 存储模板元数据
      templateMetaData.value = {};
      responseData.data.forEach(item => {
        templateMetaData.value[item.id] = {
          id: item.id,
          name: item.templateName || item.name,
          gmParam: item.gmParam || ""
        };
      });
    } else {
      templateOptions.value = [];
      templateMetaData.value = {};
      console.error('模板数据格式不正确', responseData);
    }
  } catch (error) {
    console.error('获取模板列表失败', error);
    window.$message?.error($t("common.requestFailed"));
    templateOptions.value = [];
    templateMetaData.value = {};
  } finally {
    templatesLoading.value = false;
  }
}

function handleInitModel() {
  model.value = createDefaultModel();

  if (props.operateType === "edit" && props.rowData) {
    const { ...rest } = props.rowData;

    let serverIds: string[] = [];
    try {
      if (rest.servers) {
        if (rest.servers.startsWith('[') && rest.servers.endsWith(']')) {
          const parsedServers = JSON.parse(rest.servers);
          if (Array.isArray(parsedServers)) {
            if (parsedServers.length > 0 && typeof parsedServers[0] === 'object' && 'serverId' in parsedServers[0]) {
              serverIds = parsedServers.map(server => String(server.serverId));
            } else {
              serverIds = parsedServers.map(id => String(id));
            }
          }
        } else {
          serverIds = rest.servers.split(',').map(id => String(id.trim()));
        }
      }
    } catch (e) {
      console.error('解析服务器ID失败:', e);
      serverIds = [];
    }

    let startTime = null;
    let endTime = null;
    if (rest.startTime) {
      startTime = new Date(rest.startTime).getTime();
    }
    if (rest.endTime) {
      endTime = new Date(rest.endTime).getTime();
    }

    Object.assign(model.value, {
      ...rest,
      templateId: rest.templateId || "",
      startTime,
      endTime,
      servers: JSON.stringify(serverIds)
    });

    // 还原时需要给跨服ID加上 cross_ 前缀，以匹配树节点的 key
    selectedServerIds.value = serverIds.map(id => {
      const isCross = serverStore.crossServerList?.some(cs => String(cs.serverId) === String(id));
      return isCross ? `cross_${id}` : String(id);
    });
  }
}

function closeDrawer() {
  visible.value = false;
  // 关闭时清空表单数据，防止下次打开时显示旧数据
  model.value = createDefaultModel();
  selectedServerIds.value = [];
  restoreValidation();
}

async function handleSubmit() {
  await validate();
  try {
    let serverData: any;

    // 统一处理：新增和编辑都传递对象数组格式（包括跨服）
    const serverObjects: { serverName: string; serverId: number }[] = [];
    if (model.value.servers) {
      try {
        const parsedIds = JSON.parse(model.value.servers);
        parsedIds.forEach((id: string | number) => {
          const serverId = Number(id);
          const serverName = serverStore.getServerNameById(serverId);
          serverObjects.push({
            serverName,
            serverId
          });
        });
      } catch (e) {
        console.error('解析服务器ID失败:', e);
      }
    }
    serverData = JSON.stringify(serverObjects);

    const formatDateTime = (dateValue: number | null) => {
      if (!dateValue) return "";
      const date = new Date(dateValue);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    };

    const startTime = formatDateTime(model.value.startTime);
    const endTime = formatDateTime(model.value.endTime);

    // 从模板元数据中获取选中模板的完整信息
    const templateInfo = templateMetaData.value[model.value.templateId];
    const templateId = model.value.templateId;
    const templateName = templateInfo?.name || templateId;
    const gmParam = templateInfo?.gmParam || "";

    const activityData = {
      ...model.value,
      templateId,
      templateName,
      gmParam,
      startTime,
      endTime,
      servers: serverData
    };

    const operationType = props.operateType === "add" ? "新增活动" : "修改活动";

    let response: any;
    if (props.operateType === "add") {
      response = await fetchAddActivityNotice(activityData);
    } else {
      response = await fetchUpdateActivityNotice(activityData);
    }

    // 使用通用错误处理函数
    const hasError = handleApiResponseError(response, operationType);
    if (hasError) {
      return;
    }

    if (props.operateType === "add") {
      window.$message?.success($t("common.addSuccess"));
    } else {
      window.$message?.success($t("common.modifySuccess"));
    }
    closeDrawer();
    emit("submitted");
  } catch (error: any) {
    // 使用通用异常错误处理函数
    const operationType = props.operateType === "add" ? "新增活动" : "修改活动";
    handleApiCatchError(error, operationType);
  }
}

watch(visible, async (newVal) => {
  if (newVal) {
    // 立即清空表单数据，防止显示上次的内容
    model.value = createDefaultModel();
    selectedServerIds.value = [];
    restoreValidation();

    // 然后异步加载数据
    await getServerGroupOptions();
    await getTemplateOptions();

    // 最后处理编辑模式的数据回填
    handleInitModel();

    await serverStore.fetchServerList();
    // 获取跨服列表
    if (!serverStore.crossServerList?.length) {
      await serverStore.fetchCrossServerList();
    }
  }
});

onMounted(async () => {
  await serverStore.fetchServerList();
  // 预加载跨服列表
  if (!serverStore.crossServerList?.length) {
    await serverStore.fetchCrossServerList();
  }
});

// 计算最终只读模式
const readonlyMode = computed(() => {
  if (typeof props.readonly === 'boolean') return props.readonly;
  return props.rowData?.isReadonly || (typeof props.rowData?.status === 'number' && props.rowData.status !== 0);
});
</script>


<template>
  <NModal v-model:show="visible" :title="title" preset="card" class="w-800px">
    <NScrollbar class="h-300px pr-20px">
      <NForm
        ref="formRef"
        :model="model"
        :rules="rules"
        label-placement="left"
        :label-width="100"
      >
        <NGrid responsive="screen" item-responsive>
          <NFormItemGi
            span="24 m:12"
            :label="$t('page.manage.activity.activityName')"
            path="name"
          >
            <NInput
              v-model:value="model.name"
              :placeholder="$t('page.manage.activity.form.activityName')"
              :disabled="readonlyMode"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24 m:12"
            :label="$t('page.manage.activity.templateId')"
            path="templateId"
          >
            <NSelect
              v-model:value="model.templateId"
              :options="templateOptions"
              :placeholder="$t('page.manage.template.form.templateType')"
              :loading="templatesLoading"
              clearable
              :disabled="readonlyMode"
            />
          </NFormItemGi>

          <!-- 添加服务器选择组件 -->
          <NFormItemGi
            span="24 m:24"
            :label="$t('page.manage.activity.servers')"
            path="servers"
          >
            <NTreeSelect
              v-model:value="selectedServerIds"
              :options="serverTreeOptions"
              :placeholder="$t('page.manage.activity.form.servers')"
              multiple
              cascade
              checkable
              clearable
              :check-strategy="'child'"
              :disabled="readonlyMode"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24 m:12"
            :label="$t('page.manage.activity.startTime')"
          >
            <NDatePicker
              v-model:value="model.startTime"
              type="datetime"
              :placeholder="$t('page.manage.activity.form.startTime')"
              clearable
              format="yyyy-MM-dd HH:mm:ss"
              style="width: 100%"
              :disabled="readonlyMode"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24 m:12"
            :label="$t('page.manage.activity.endTime')"
          >
            <NDatePicker
              v-model:value="model.endTime"
              type="datetime"
              :placeholder="$t('page.manage.activity.form.endTime')"
              clearable
              format="yyyy-MM-dd HH:mm:ss"
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


<style scoped></style>
