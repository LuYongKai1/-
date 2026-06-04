<script setup lang="ts">
import { computed, ref, watch, h, onMounted } from "vue";
import { useNaiveForm } from "@/hooks/common/form";
import { fetchAddDynamicEventDungeon, fetchUpdateDynamicDungeon } from "@/service/api";
import { $t } from "@/locales";
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";
import { useServerStore } from '@/store/modules/server';
import { NSwitch } from "naive-ui";

import {
  NSpace,
  NInput,
  NInputNumber,
  NFormItemGi,
  NGrid,
  NModal,
  NForm,
  NButton,
  NScrollbar,
  NTreeSelect,
  NDataTable
} from "naive-ui";

defineOptions({
  name: "DungeonOperateDrawer",
});

interface Props {
  operateType?: string;
  editingData?: any;
}

const props = withDefaults(defineProps<Props>(), {
  operateType: "add",
  editingData: () => ({})
});

interface Emits {
  (e: "submitted"): void;
  (e: "update:visible", value: boolean): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>("visible", { default: false });
const { formRef, validate, restoreValidation } = useNaiveForm();
const serverStore = useServerStore();
const serverTreeOptions = computed(() => serverStore.serverTreeOptions);

// 本地存储操作类型，防止props变化导致显示异常
const currentOperateType = ref<string>("add");

// 根据操作类型确定标题
const title = computed(() => {
  return currentOperateType.value === "edit"
    ? $t("page.manage.dynamiceventdungeon.editDungeon")
    : $t("page.manage.dynamiceventdungeon.addDungeon");
});

// 表单数据模型
const model = ref({
  serverIds: [] as number[],
  indunId: null as number | string | null,
  indunName: "",
  isClosed: 0,
  indunParams: ""
});

// 树形选择框的值（字符串类型）
const selectedServerIds = ref<string[]>([]);

// 过滤服务器ID（排除区域节点），转换为数字数组
const getFilteredServerIds = () => {
  return selectedServerIds.value
    .filter(id => !String(id).startsWith('region_'))
    .map(id => Number(id));
};

// 表单验证规则
const rules = {
  serverIds: {
    required: true,
    message: $t('page.manage.activity.form.servers'),
    trigger: ['change', 'blur'],
    validator: () => getFilteredServerIds().length > 0
  },
  indunId: {
    required: true,
    message: $t('page.manage.dynamiceventdungeon.form.indunId'),
    trigger: ['change', 'blur'],
    validator: (rule: any, value: any) => {
      if (value === null || value === undefined || value === '') {
        return false;
      }
      const numValue = Number(value);
      if (isNaN(numValue) || numValue < 1) {
        return false;
      }
      return true;
    }
  },
  indunName: {
    required: true,
    message: $t('page.manage.dynamiceventdungeon.form.indunName'),
    trigger: ['change', 'blur']
  },
  indunParams: {
    required: true,
    message: $t('page.manage.dynamiceventdungeon.form.indunParams'),
    trigger: ['change', 'blur']
  }
};

// 开关状态变化处理 model.value.isClosed = value ? 1 : 0;
function handleSwitchChange(value: boolean) {
  console.log('开关状态变化:', value);
  // 确保赋值正确：true -> 0, false -> 1
  model.value.isClosed = value ? 0 : 1;
  console.log('设置后 isClosed:', model.value.isClosed);
}

// 重置表单数据
function resetForm() {
  model.value = {
    serverIds: [],
    indunId: null,
    indunName: "",
    isClosed: 0,
    indunParams: ""
  };
  selectedServerIds.value = [];
  restoreValidation();
}

// 关闭抽屉
function closeDrawer() {
  visible.value = false;
  resetForm();
  currentOperateType.value = "add";
}

// 获取服务器名称
const getServerName = (serverId: number | string): string => {
  const server = serverStore.serverList.find(s => s.serverId === Number(serverId));
  return server?.serverName || String(serverId);
};

// 提交表单
async function handleSubmit() {
  // 手动验证 indunId
  if (model.value.indunId === null || model.value.indunId === undefined || model.value.indunId === '') {
    window.$message?.error($t('page.manage.dynamiceventdungeon.form.indunId'));
    return;
  }

  const indunIdNum = Number(model.value.indunId);
  if (isNaN(indunIdNum) || indunIdNum < 1) {
    window.$message?.error('副本配置ID必须是大于0的数字');
    return;
  }

  await validate();

  try {
    const serverIds = getFilteredServerIds();
    if (serverIds.length === 0) {
      window.$message?.warning($t('page.manage.activity.form.servers'));
      return;
    }

    // 验证indunParams是否为有效的JSON
    let indunParamsObj = null;
    try {
      if (model.value.indunParams) {
        indunParamsObj = JSON.parse(model.value.indunParams);
      }
    } catch (e) {
      window.$message?.error('indunParams必须是有效的JSON格式');
      return;
    }

    // 构建请求数据
    const requestData: any = {
      serverIds: serverIds,
      indunId: indunIdNum,
      indunName: model.value.indunName,
      isClosed: model.value.isClosed
    };

    // 如果有indunParams，添加到请求中
    if (indunParamsObj) {
      requestData.indunParams = indunParamsObj;
    }

    // 根据操作类型调用不同的API
    let response;
    if (currentOperateType.value === "edit" && props.editingData) {
      // 编辑操作
      response = await fetchUpdateDynamicDungeon(requestData);
    } else {
      // 新增操作
      response = await fetchAddDynamicEventDungeon(requestData);
    }

    const responseAny = response as any;

    // 检查是否是真正的错误（code !== 200）
    const responseCode = responseAny?.data?.code || responseAny?.response?.data?.code || responseAny?.code;
    if (responseCode && responseCode !== 200) {
      const actionText = currentOperateType.value === "edit"
        ? '编辑动态副本'
        : '添加动态副本';
      if (handleApiResponseError(response, actionText)) {
        return;
      }
    }

    // 获取返回的数据
    let returnData: any = null;
    if (responseCode === 200) {
      returnData = responseAny?.data?.data || responseAny?.response?.data?.data || responseAny?.data;
    }

    // 如果返回了详细结果，显示弹框
    if (returnData && typeof returnData === 'object') {
      if (returnData.results && typeof returnData.results === 'object') {
        const dataItems = Object.entries(returnData.results).map(([serverId, msg]) => ({
          serverId,
          serverName: getServerName(serverId),
          message: String(msg)
        }));

        if (dataItems.length > 0) {
          window.$dialog?.info({
            title: `${currentOperateType.value === "edit" ? '编辑' : '新增'}动态副本 - 返回结果`,
            content: () => {
              return h('div', { style: 'max-height: 500px; overflow-y: auto;' }, [
                h(NDataTable, {
                  columns: [
                    {
                      title: '服务器ID',
                      key: 'serverId',
                      width: 150
                    },
                    {
                      title: '服务器名称',
                      key: 'serverName',
                      width: 250
                    },
                    {
                      title: '返回信息',
                      key: 'message',
                      ellipsis: { tooltip: true }
                    }
                  ],
                  data: dataItems,
                  size: 'small',
                  bordered: true
                })
              ]);
            },
            positiveText: $t('common.confirm'),
            style: { width: '900px' }
          });
        }
      }
    }

    // 操作成功
    window.$message?.success(
      currentOperateType.value === "edit"
        ? $t("common.editSuccess")
        : $t("common.addSuccess")
    );

    closeDrawer();
    emit("submitted");

  } catch (error: any) {
    const actionText = currentOperateType.value === "edit"
      ? '编辑动态副本'
      : '添加动态副本';
    handleApiCatchError(error, actionText);
  }
}

// 填充表单数据
function fillFormData() {
  if (currentOperateType.value === "edit" && props.editingData) {
    // 填充服务器ID
    if (props.editingData.serverId) {
      selectedServerIds.value = [String(props.editingData.serverId)];
    }

    // 填充其他字段
    model.value = {
      serverIds: props.editingData.serverId ? [Number(props.editingData.serverId)] : [],
      indunId: props.editingData.indunId ? String(props.editingData.indunId) : null,
      indunName: props.editingData.indunName || "",
      isClosed: props.editingData.isClosed || 0,
      indunParams: props.editingData.indunParams
        ? JSON.stringify(props.editingData.indunParams, null, 2)
        : ""
    };
  } else {
    // 新增模式，重置表单
    resetForm();
  }
}

// 监听visible变化，加载服务器列表
watch(visible, async (newVal) => {
  if (newVal) {
    // 重置表单
    resetForm();

    // 设置当前操作类型
    currentOperateType.value = props.operateType;

    // 等待服务器列表加载
    await serverStore.fetchServerList();

    // 填充表单数据
    fillFormData();

    restoreValidation();
  } else {
    // 抽屉关闭时，重置操作类型
    currentOperateType.value = "add";
  }
});

// 监听props变化，当操作类型或编辑数据变化时，如果抽屉是打开的，重新填充表单
watch(() => [props.operateType, props.editingData], ([newOperateType, newEditingData]) => {
  if (visible.value) {
    currentOperateType.value = newOperateType as string;
    fillFormData();
  }
}, { deep: true });

// 组件挂载时加载服务器列表
onMounted(async () => {
  if (visible.value) {
    await serverStore.fetchServerList();
  }
});
</script>

<template>
  <NModal
    v-model:show="visible"
    :title="title"
    preset="card"
    class="w-800px"
    :mask-closable="true"
  >
    <NScrollbar class="h-500px pr-20px">
      <NForm
        ref="formRef"
        :model="model"
        :rules="rules"
        label-placement="left"
        :label-width="120"
      >
        <NGrid responsive="screen" item-responsive>
          <!-- 服务器选择 -->
          <NFormItemGi
            span="24"
            :label="$t('page.manage.activity.servers')"
            path="serverIds"
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
              :max-tag-count="3"
              tag
            />
          </NFormItemGi>

          <!-- 副本配置ID -->
          <NFormItemGi
            span="24 s:12 m:8"
            :label="$t('page.manage.dynamiceventdungeon.indunId')"
            path="indunId"
          >
            <NInput
              v-model:value="model.indunId"
              :placeholder="$t('page.manage.dynamiceventdungeon.indunId')"
              :min="1"
              :disabled="currentOperateType === 'edit'"
              clearable
              style="width: 100%"
            />
          </NFormItemGi>

          <!-- 副本名称 -->
          <NFormItemGi
            span="24 s:12 m:8"
            :label="$t('page.manage.dynamiceventdungeon.indunName')"
            path="indunName"
          >
            <NInput
              v-model:value="model.indunName"
              :placeholder="$t('page.manage.dynamiceventdungeon.indunName')"
              clearable
            />
          </NFormItemGi>

          <!-- 开关状态 -->
          <NFormItemGi
            span="24 s:12 m:8"
            :label="$t('page.manage.dynamiceventdungeon.isClosed')"
            path="isClosed"
          >
            <div class="flex items-center h-34px">
              <NSwitch
                :value="model.isClosed === 0"
                @update:value="handleSwitchChange"
                :round="false"
              >
                <template #checked>
                  {{ $t('page.manage.dynamiceventdungeon.indunState.open') }}
                </template>
                <template #unchecked>
                  {{ $t('page.manage.dynamiceventdungeon.indunState.closed') }}
                </template>
              </NSwitch>
            </div>
          </NFormItemGi>

          <!-- 副本参数（JSON编辑框） -->
          <NFormItemGi
            span="24"
            :label="$t('page.manage.dynamiceventdungeon.indunParams')"
            path="indunParams"
          >
            <NInput
              v-model:value="model.indunParams"
              type="textarea"
              :placeholder="$t('page.manage.dynamiceventdungeon.form.indunParams')"
              :rows="12"
              clearable
            />
          </NFormItemGi>
        </NGrid>
      </NForm>
    </NScrollbar>
    <template #footer>
      <NSpace justify="end" :size="16">
        <NButton @click="closeDrawer">{{ $t("common.cancel") }}</NButton>
        <NButton type="primary" @click="handleSubmit">
          {{ currentOperateType === "edit" ? $t("common.edit") : $t("common.add") }}
        </NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped></style>
