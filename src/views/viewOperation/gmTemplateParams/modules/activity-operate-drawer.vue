<script setup lang="ts">
import { computed, ref, watch, onMounted } from "vue";
import { useFormRules, useNaiveForm } from "@/hooks/common/form";
import {
  fetchAddActivityGMParams,
  fetchUpdateActivityGMParams,
  fetchGetActivityGM
} from "@/service/api";
import { $t } from "@/locales";

defineOptions({
  name: "ActivityOperateDrawer",
});

interface Props {
  operateType: NaiveUI.TableOperateType;
  rowData?: Api.SystemManage.activitygmparams | null;
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
    add: $t("page.manage.gmTemplateParams.addActivity"),
    edit: $t("page.manage.gmTemplateParams.editActivity"),
  };
  return titles[props.operateType];
});

type Model = Pick<
  Api.SystemManage.activitygmparams,
  | "activeGmId"
  | "paramIndex"
  | "paramName"
  | "status"
>;

const model = ref<Model>(createDefaultModel());
const templateOptions = ref<{ label: string; value: string }[]>([]);
const templatesLoading = ref(false);

function createDefaultModel(): Model {
  return {
    activeGmId: null,
    paramIndex: 1,
    paramName: "",
    status: "0",
  };
}

// 修正rules类型
type RuleKey = "activeGmId" | "paramName" | "paramIndex";

const rules: Record<RuleKey, App.Global.FormRule> = {
  activeGmId: defaultRequiredRule,
  paramName: defaultRequiredRule,
  paramIndex: defaultRequiredRule,
};

function closeDrawer() {
  visible.value = false;
}

async function handleSubmit() {
  await validate();
  try {
    const activityData = {
      ...model.value,
    };

    if (props.operateType === "add") {
      await fetchAddActivityGMParams(activityData);
      window.$message?.success($t("common.addSuccess"));
    } else {
      if (props.rowData && props.rowData.id) {
        await fetchUpdateActivityGMParams({
          ...activityData,
          id: props.rowData.id
        });
      } else {
        await fetchUpdateActivityGMParams(activityData);
      }
      window.$message?.success($t("common.updateSuccess"));
    }
    closeDrawer();
    emit("submitted");
  } catch (error) {
    console.error('提交失败:', error);
    window.$message?.error($t("common.requestFailed"));
  }
}

function handleInitModel() {
  if (props.operateType === 'edit' && props.rowData) {
    model.value = {
      activeGmId: props.rowData.activeGmId || '',
      paramIndex: props.rowData.paramIndex ? Number(props.rowData.paramIndex) : 1,
      paramName: props.rowData.paramName || '',
      status: props.rowData.status || '0',
    };
  } else {
    model.value = createDefaultModel();
  }
}

// 获取模板列表
async function fetchTemplateList() {
  try {
    templatesLoading.value = true;
    const { data } = await fetchGetActivityGM();
    if (data && Array.isArray(data)) {
      templateOptions.value = data.map(item => ({
        label: item.name || '',
        value: item.id || ''
      }));
    }
  } catch (error) {
    console.error('获取模板列表失败:', error);
    window.$message?.error($t("common.requestFailed"));
  } finally {
    templatesLoading.value = false;
  }
}

watch(visible, async (newVal) => {
  if (newVal) {
    restoreValidation();
    handleInitModel();
    await fetchTemplateList();
  }
});

onMounted(() => {
  handleInitModel();
  fetchTemplateList();
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
            span="24"
            :label="$t('page.manage.gmTemplateParams.templateName')"
            path="activeGmId"
          >
            <NSelect
              v-model:value="model.activeGmId"
              :options="templateOptions"
              :placeholder="$t('page.manage.gmTemplateParams.form.activeGmId')"
              :loading="templatesLoading"
              clearable
            />
          </NFormItemGi>

          <NFormItemGi
            span="24 "
            :label="$t('page.manage.gmTemplateParams.paramName')"
            path="paramName"
          >
            <NInput
              v-model:value="model.paramName"
              :placeholder="$t('page.manage.gmTemplateParams.form.paramName')"
            />
          </NFormItemGi>


          <NFormItemGi
            span="24 "
            :label="$t('page.manage.gmTemplateParams.paramIndex')"
            path="paramIndex"
          >
            <NInputNumber
              v-model:value="model.paramIndex"
              :placeholder="$t('page.manage.gmTemplateParams.form.paramIndex')"
              style="width: 100%"
            />
          </NFormItemGi>
        </NGrid>
      </NForm>
    </NScrollbar>
    <template #footer>
      <NSpace justify="end" :size="16">
        <NButton @click="closeDrawer">{{ $t("common.cancel") }}</NButton>
        <NButton type="primary" @click="handleSubmit">{{
          $t("common.confirm")
        }}</NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped></style>
