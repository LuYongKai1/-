<script setup lang="ts">
import { computed, ref, watch, onMounted } from "vue";
import { useFormRules, useNaiveForm } from "@/hooks/common/form";
import { fetchGetTemplate, fetchAddTemplate, fetchUpdateTemplate } from "@/service/api";
import { $t } from "@/locales";
import {
NUl,
 NCheckboxGroup,
  NCheckbox,
} from "naive-ui";

defineOptions({
  name: "templateOperateDrawer",
});

interface Props {
  operateType: NaiveUI.TableOperateType;
  rowData?: Api.SystemManage.template | null;
  selectedRegionId?: string;
  externalTemplates?: any[]; // 添加外部模板数据属性
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

const rules = {
  templateName: defaultRequiredRule,
  'params.*': defaultRequiredRule
};

const title = computed(() => {
  const titles: Record<NaiveUI.TableOperateType, string> = {
    add: $t("page.manage.template.addtemplate"),
    edit: $t("page.manage.template.edittemplate"),
  };
  return titles[props.operateType];
});

type Model = Pick<
  Api.SystemManage.template,
  | "templateName"
  | "gmParam"
> & {
  templateIds?: number[];
  params?: Record<string, string | number>
};

const model = ref<Model>(createDefaultModel());

interface TemplateParam {
  id: number;
  activeGmId: number;
  paramName: string;
  paramKey: string;
  paramIndex: number;
}

interface Template {
  id: number;
  name: string;
  description: string;
  createTime: string | null;
  updateTime: string | null;
  flag: string | null;
  paramList: TemplateParam[];
}

const templateList = ref<Template[]>([]);

const currentParamList = ref<Array<{
  id: number;
  activeGmId: number;
  paramName: string;
  paramKey: string;
  paramIndex: number;
}>>([]);

const templateGroups = ref<Array<{
  templateType: number | null;
  params: Record<string, string | number>;
  cmd?: string;
}>>([{
  templateType: null,
  params: {},
  cmd: ''
}]);

// 添加计算属性来处理选项
const templateOptions = computed(() => {
  return (templateList.value || []).map(item => ({
    label: item.name || item.description,
    value: item.id
  }));
});

async function getTemplateList() {
  try {
    // 如果有外部传入的模板数据，优先使用
    if (props.externalTemplates && props.externalTemplates.length > 0) {
      templateList.value = props.externalTemplates.map(template => ({
        id: template.id,
        name: template.name,
        description: template.description,
        createTime: template.createTime,
        updateTime: template.updateTime,
        flag: template.flag,
        paramList: (template.paramList || []).map((param: any) => ({
          ...param,
          // 确保每个参数都有paramKey
          paramKey: param.paramKey || param.paramName.toLowerCase().replace(/\s+/g, '_')
        }))
      }));
      return;
    }

    // 如果没有外部数据，则从API获取
    const res = await fetchGetTemplate();

    if (res && res.data) {
      const templates = Array.isArray(res.data) ? res.data : [res.data];
      templateList.value = templates.map(template => ({
        id: template.id,
        name: template.name,
        description: template.description,
        createTime: template.createTime,
        updateTime: template.updateTime,
        flag: template.flag,
        paramList: (template.paramList || []).map((param: any) => ({
          ...param,
          // 确保每个参数都有paramKey
          paramKey: param.paramKey || param.paramName.toLowerCase().replace(/\s+/g, '_')
        }))
      }));
    } else {
      templateList.value = [];
    }
  } catch (error) {
    window.$message?.error('获取模板列表失败');
    templateList.value = [];
  }
}

function handleSelectTemplates(templateIds: number[]) {
  model.value.templateIds = templateIds;

  model.value.params = {};
  currentParamList.value = [];

  templateIds.forEach(templateId => {
    const selected = templateList.value.find(item => item.id === templateId);
    if (selected) {
      if (selected.paramList) {
        currentParamList.value = [...currentParamList.value, ...selected.paramList];
      }
    }
  });

  if (currentParamList.value.length > 0) {
    currentParamList.value.forEach(param => {
      model.value.params![param.paramKey] = '';
    });
  }
}

function createDefaultModel(): Model {
  return {
    templateName: "",
    gmParam: "",
    templateIds: [],
    params: {}
  };
}

function handleInitModel() {
  if (props.operateType === 'edit' && props.rowData) {
    const row = props.rowData;
    // 打印编辑时的 row.gmParam
    model.value = {
      templateName: row.templateName || '',
      gmParam: row.gmParam || '',
      templateIds: [],
      params: {}
    };
    try {
      if (row.gmParam) {
        const parsedParams = JSON.parse(row.gmParam);
        if (Array.isArray(parsedParams)) {
          templateGroups.value = [];
          parsedParams.forEach((paramObj) => {
            const templateType = getTemplateTypeFromParams(paramObj);
            const params = transformParamsForEdit(paramObj, templateType);
            templateGroups.value.push({
              templateType,
              params,
              cmd: paramObj.cmd || '' // 回显cmd
            });
          });
          if (templateGroups.value.length === 0) {
            resetTemplateGroups();
          }
        }
      }
    } catch (error) {
      resetTemplateGroups();
    }
  } else {
    model.value = createDefaultModel();
    resetTemplateGroups();
  }
}

function getTemplateTypeFromParams(paramObj: any): number | null {

  if (paramObj.cmd) {
    const template = templateList.value.find(item => item.name === paramObj.cmd);
    if (template) {
      return template.id;
    }
  }

  // 如果cmd匹配不到，尝试通过参数特征推断（保留原有逻辑作为备选）
  if ('npcId' in paramObj && 'keepTime' in paramObj) {
    // 查找包含npcId和keepTime参数的模板
    const template = templateList.value.find(item => {
      const paramKeys = item.paramList?.map(p => p.paramKey || p.paramName.toLowerCase().replace(/\s+/g, '_')) || [];
      return paramKeys.includes('npc_id') && paramKeys.includes('keep_time');
    });
    return template?.id || null;
  } else if ('buffId' in paramObj && 'keepTime' in paramObj) {
    const template = templateList.value.find(item => {
      const paramKeys = item.paramList?.map(p => p.paramKey || p.paramName.toLowerCase().replace(/\s+/g, '_')) || [];
      return paramKeys.includes('buff_id') && paramKeys.includes('keep_time');
    });
    return template?.id || null;
  }

  return null;
}

function transformParamsForEdit(paramObj: any, templateId: number | null): Record<string, string | number> {
  const result: Record<string, string | number> = {};

  // 获取模板的参数定义
  const template = templateList.value.find(item => item.id === templateId);
  if (template && template.paramList) {
    template.paramList.forEach(param => {
      const paramKey = param.paramKey || param.paramName.toLowerCase().replace(/\s+/g, '_');

      // 处理各种可能的参数名映射
      let value = paramObj[paramKey];
      if (value === undefined) {
        // 尝试其他可能的字段名
        if (paramKey === 'npc_id') {
          value = paramObj.npcId || paramObj.npcid || paramObj.NpcId;
        } else if (paramKey === 'buff_id') {
          value = paramObj.buffId || paramObj.buffid || paramObj.BuffId;
        } else if (paramKey === 'keep_time') {
          value = paramObj.keepTime || paramObj.keeptime || paramObj.KeepTime;
        }
        // 尝试直接使用paramName
        if (value === undefined) {
          value = paramObj[param.paramName];
        }
      }

      // 如果是数组则转换为逗号分隔的字符串
      if (Array.isArray(value)) {
        value = value.join(',');
      }

      result[paramKey] = value || '';
    });
  } else {
    Object.keys(paramObj).forEach(key => {
      if (key !== 'cmd') {
        let value = paramObj[key];
        if (Array.isArray(value)) {
          value = value.join(',');
        }
        result[key] = value;
      }
    });
  }

  return result;
}

function resetTemplateGroups() {
  templateGroups.value = [{
    templateType: null,
    params: {},
    cmd: ''
  }];
}

function closeDrawer() {
  visible.value = false;
}


async function handleSubmit() {
  await validate();
  try {
    const paramsArray = templateGroups.value
      .filter(group => group.templateType)
      .map(group => transformParamsForSubmit(group));

    const submitData: any = {
      templateName: model.value.templateName,
      gmParam: JSON.stringify(paramsArray)
    };

    if (props.operateType === "edit" && props.rowData?.id) {
      submitData.id = props.rowData.id;
    }

    let response: any;
    if (props.operateType === "add") {
      response = await fetchAddTemplate(submitData);
    } else {
      response = await fetchUpdateTemplate(submitData);
    }
    // 检查响应中的错误信息
    if (response) {
      const errorInfo = response?.data || response?.response?.data || {};
      const { code: errorCode, msg: errorMsg } = errorInfo;
      console.log('errorCode', errorCode);
      console.log('errorMsg', errorMsg);
      if (errorCode === 403) {
        window.$message?.error(errorMsg || "没有操作权限");
        return;
      }

      if (errorCode === 500) {
        window.$message?.error(errorMsg || "服务器内部错误");
        return;
      }

      if (errorCode && errorCode !== 200 && errorCode !== 0) {
        window.$message?.error(errorMsg || "操作失败");
        return;
      }
    }

    // 操作成功
    if (props.operateType === "add") {
      window.$message?.success($t("common.addSuccess"));
    } else {
      window.$message?.success($t("common.modifySuccess"));
    }

    closeDrawer();
    emit("submitted");
  } catch (error: any) {
    console.error("操作失败:", error);

    // 从错误对象中提取信息
    const errorData = error?.response?.data || {};
    const { code, msg } = errorData;


    if (code === 403) {
      window.$message?.error(msg || "没有操作权限");
    } else if (code === 500) {
      window.$message?.error(msg || "服务器内部错误");
    } else {
      const operationType = props.operateType === "add" ? "新增" : "修改";
      window.$message?.error(msg || error?.message || `${operationType}失败，请重试`);
    }
  }
}

function transformParamsForSubmit(group: {templateType: number | null, params: Record<string, string | number>, cmd?: string}) {
  const params = group.params;
  const result: Record<string, any> = {
    cmd: group.cmd || '',
    ...params
  };
  return result;
}

async function handleAddTemplateGroup() {
  await getTemplateList(); // 新增前强制刷新模板列表
  templateGroups.value.push({
    templateType: null,
    params: {},
    cmd: ''
  });
}

function handleSelectTemplate(templateId: number | null, groupIndex: number) {
  if (!templateId) {
    templateGroups.value[groupIndex] = {
      templateType: null,
      params: {},
      cmd: ''
    };
    return;
  }

  const selected = templateList.value.find(item => item.id === templateId);
  if (selected) {
    const group = templateGroups.value[groupIndex];
    group.templateType = templateId;
    group.params = {};
    group.cmd = selected.name;

    if (selected.paramList && selected.paramList.length > 0) {
      selected.paramList.forEach(param => {
        if(param.paramKey) {
          group.params[param.paramKey] = '';
        } else if(param.paramName) {
          const paramKey = param.paramName.toLowerCase().replace(/\s+/g, '_');
          group.params[paramKey] = '';
        }
      });
    }
  }
}

function getTemplateParams(templateId: number) {
  const template = templateList.value.find(item => item.id === templateId);
  if (template?.paramList) {
    return template.paramList.map(param => {
      if (!param.paramKey) {
        param.paramKey = param.paramName.toLowerCase().replace(/\s+/g, '_');
      }
      return param;
    });
  }
  return [];
}

function removeTemplateGroup(index: number) {
  if(templateGroups.value.length > 1) {
    templateGroups.value.splice(index, 1);
  }
}

watch(visible, (newVal) => {
  if (newVal) {
    getTemplateList().then(() => {
      handleInitModel();
      restoreValidation();
    });
  }
});

onMounted(async () => {
  await getTemplateList();
  if (props.operateType === 'edit' && props.rowData) {
    handleInitModel();
  }
});

watch(templateList, (newVal) => {
}, { deep: true });

watch(() => props.externalTemplates, (newVal) => {
  if (newVal && newVal.length > 0) {
    getTemplateList();
  }
}, { deep: true });
</script>


<template>
  <NModal v-model:show="visible" :title="title" preset="card" class="w-700px">
    <NScrollbar class="h-500px pr-50px">
      <NForm
        ref="formRef"
        :model="model"
        :rules="rules"
        label-placement="left"
        :label-width="100"
      >
        <NGrid :cols="24" :x-gap="24">
          <!-- 最外层的模板名称 -->
          <NFormItemGi
            :span="24"
            :label="$t('page.manage.template.templateName')"
            path="templateName"
          >
            <NInput
              v-model:value="model.templateName"
              :placeholder="$t('page.manage.template.form.templateName')"
            />
          </NFormItemGi>
        </NGrid>

        <div v-for="(group, index) in templateGroups" :key="index" class="template-group mb-4">
          <div class="border rounded p-4" style="width: 580px; margin-left: 20px;">
            <NGrid :cols="24" :x-gap="24">
              <NFormItemGi
                :span="24"
                :label="$t('page.manage.template.templateType')"
                :rules="rules"
              >
                <NSelect
                  v-model:value="group.templateType"
                  :options="templateOptions"
                  @update:value="(val) => handleSelectTemplate(val, index)"
                  :placeholder="$t('page.manage.template.form.templateType')"
                />
              </NFormItemGi>

              <template v-if="group.templateType">
                <NFormItemGi
                  v-for="(param, paramIndex) in getTemplateParams(group.templateType)"
                  :key="`${group.templateType}-${param.id}-${paramIndex}`"
                  :span="12"
                  :label="param.paramName"
                  :path="`params.${param.paramKey}`"
                >
                  <NInput
                    :value="String(group.params[param.paramKey] || '')"
                    @update:value="val => group.params[param.paramKey] = val"
                    :placeholder="`请输入${param.paramName}`"
                  />
                </NFormItemGi>
              </template>
            </NGrid>

            <div class="text-right mt-2">
              <NButton
                v-if="templateGroups.length > 1"
                @click="removeTemplateGroup(index)"
              >
              {{ $t("common.cancel") }}
            </NButton>
            </div>
          </div>
        </div>

        <div class="text-right mt-4">
          <NButton type="primary" @click="handleAddTemplateGroup">
            {{ $t("common.add") }}
          </NButton>
        </div>

      </NForm>
    </NScrollbar>
    <template #footer>
      <NSpace justify="end" :size="16">
        <NButton @click="closeDrawer">{{ $t("common.cancel") }}</NButton>
        <NButton type="primary" @click="handleSubmit">
          {{ $t("common.confirm") }}
        </NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped>
.template-group {
  position: relative;
}
.template-group + .template-group {
  margin-top: 20px;
}
</style>
