<script setup lang="ts">
import { computed, ref, watch, onMounted } from "vue";
import { useFormRules, useNaiveForm } from "@/hooks/common/form";
import {
  fetchAddActivityGM,
  fetchUpdateActivityGM
} from "@/service/api";
import { $t } from "@/locales";
import { gameGenderOptions, gameUsermergeOptions } from "@/constants/business";

defineOptions({
  name: "ActivityOperateDrawer",
});

interface Props {
  operateType: NaiveUI.TableOperateType;
  rowData?: Api.SystemManage.activitygm | null;
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
    add: $t("page.manage.activitygm.addActivity"),
    edit: $t("page.manage.activitygm.editActivity"),
  };
  return titles[props.operateType];
});

type Model = Pick<
  Api.SystemManage.activitygm,
  | "name"
  | "description"
  | "status"
>;

const model = ref(createDefaultModel());

function createDefaultModel(): Model {
  return {
    name: "",
    description: "",
    status: "0",
  };
}

// 修正rules类型
type RuleKey = "name" | "description";

const rules: Record<RuleKey, App.Global.FormRule> = {
  name: defaultRequiredRule,
  description: defaultRequiredRule,
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
      await fetchAddActivityGM(activityData);
      window.$message?.success($t("common.addSuccess"));
    } else {
      if (props.rowData && props.rowData.id) {
        activityData.id = props.rowData.id;
      }
      await fetchUpdateActivityGM(activityData);
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
      name: props.rowData.name || '',
      description: props.rowData.description || '',
      status: props.rowData.status || '0',
    };
  } else {
    model.value = createDefaultModel();
  }
}

watch(visible, async (newVal) => {
  if (newVal) {
    restoreValidation();
    handleInitModel();
  }
});

onMounted(() => {
  handleInitModel();
});
</script>


<template>
  <NDrawer v-model:show="visible" display-directive="show" :width="360">
    <NDrawerContent :title="title" :native-scrollbar="false" closable>
      <NForm ref="formRef" :model="model" :rules="rules" >

        <NFormItem :label="$t('page.manage.activitygm.name')" path="name">
          <NInput
            v-model:value="model.name"
            :placeholder="$t('page.manage.activitygm.form.name')"
          />
        </NFormItem>

        <NFormItem :label="$t('page.manage.activitygm.description')" path="description">
          <NInput
            v-model:value="model.description"
            :placeholder="$t('page.manage.activitygm.form.description')"
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

<style scoped></style>
