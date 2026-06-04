<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useFormRules, useNaiveForm } from "@/hooks/common/form";
import {
  fetchAddMaintenanceNotice,
  fetchUpdateMaintenanceNotice,
} from "@/service/api";
import { $t } from "@/locales";

defineOptions({
  name: "MaintenanceOperateDrawer",
});

interface Props {
  /** the type of operation */
  operateType: NaiveUI.TableOperateType;
  /** the edit row data */
  rowData?: Api.SystemManage.maintenanceNotice | null;
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
    add: $t("page.manage.maintenance.addMaintenance"),
    edit: $t("page.manage.maintenance.editMaintenance"),
  };
  return titles[props.operateType];
});

type Model = {
  title: string;
  content: string;
  banner: string;
  linitTime: number | null;
  publishTime: number | null;
};

const model = ref(createDefaultModel());
function createDefaultModel(): Model {
  const now = Date.now();
  const sevenDaysLater = now + 7 * 24 * 60 * 60 * 1000;
  return {
    title: "",
    content: "",
    banner: "",
    linitTime: sevenDaysLater,
    publishTime: now,
  };
}

const rules = {
  title: defaultRequiredRule,
  content: defaultRequiredRule,
  banner: defaultRequiredRule,
};

function handleInitModel() {
  model.value = createDefaultModel();

  if (props.operateType === "edit" && props.rowData) {
    const { id, createBy, createTime, updateBy, updateTime, status, ...rest } =
      props.rowData;
    let linitTime = null;
    let publishTime = null;
    if (rest.linitTime) {
      linitTime = new Date(rest.linitTime).getTime();
    }
    if (rest.publishTime) {
      publishTime = new Date(rest.publishTime).getTime();
    }
    Object.assign(model.value, {
      ...rest,
      linitTime,
      publishTime,
    });
  }
}

function closeDrawer() {
  visible.value = false;
}

async function handleSubmit() {
  await validate();
  try {
    const formatDateTime = (dateValue: number | null) => {
      if (!dateValue) return "";
      const date = new Date(dateValue);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const seconds = String(date.getSeconds()).padStart(2, "0");
      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    };

    const linitTime = formatDateTime(model.value.linitTime);
    const publishTime = formatDateTime(model.value.publishTime);

    const maintenanceData: any = {
      title: model.value.title,
      content: model.value.content,
      banner: model.value.banner,
      linitTime,
      publishTime,
    };

    if (props.operateType === "edit" && props.rowData) {
      maintenanceData.id = props.rowData.id;
    }
    if (props.operateType === "add") {
      await fetchAddMaintenanceNotice(maintenanceData);
      window.$message?.success($t("common.addSuccess"));
    } else {
      await fetchUpdateMaintenanceNotice(maintenanceData);
      window.$message?.success($t("common.updateSuccess"));
    }
    closeDrawer();
    emit("submitted");
  } catch (error) {
    console.error("提交失败:", error);
    window.$message?.error($t("common.requestFailed"));
  }
}

watch(visible, (newVal) => {
  if (newVal) {
    handleInitModel();
    restoreValidation();
  }
});
</script>

<template>
  <NModal v-model:show="visible" :title="title" preset="card" class="w-800px">
    <NScrollbar class="h-530px pr-20px">
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
            :label="$t('page.manage.maintenance.title')"
            path="title"
          >
            <NInput
              v-model:value="model.title"
              :placeholder="$t('page.manage.maintenance.form.title')"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24"
            :label="$t('page.manage.maintenance.content')"
            path="content"
          >
            <NInput
              v-model:value="model.content"
              type="textarea"
              :rows="4"
              :placeholder="$t('page.manage.maintenance.form.content')"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24"
            :label="$t('page.manage.maintenance.banner')"
            path="banner"
          >
            <NInput
              v-model:value="model.banner"
              :placeholder="$t('page.manage.maintenance.form.banner')"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24 m:12"
            :label="$t('page.manage.maintenance.publishTime')"
          >
            <NDatePicker
              v-model:value="model.publishTime"
              type="datetime"
              :placeholder="$t('page.manage.maintenance.form.publishTime')"
              clearable
              format="yyyy-MM-dd HH:mm:ss"
              style="width: 100%"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24 m:12"
            :label="$t('page.manage.maintenance.linitTime')"
          >
            <NDatePicker
              v-model:value="model.linitTime"
              type="datetime"
              :placeholder="$t('page.manage.maintenance.form.linitTime')"
              clearable
              format="yyyy-MM-dd HH:mm:ss"
              style="width: 100%"
            />
          </NFormItemGi>

          <NFormItemGi v-if="model.banner" span="24">
            <div class="image-preview-container">
              <div class="image-preview">
                <NImage
                  :src="model.banner"
                  object-fit="contain"
                  :preview-src="model.banner"
                  width="300"
                  show-toolbar-tooltip
                  class="preview-image"
                />
                <div class="image-hint">
                  <NIcon size="14" class="mr-1">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4v-2h4V5h-4V3m-1 4h-2.5A1.5 1.5 0 0 0 10 8.5V11h2V9h2v2h-2v6h5v2H9v-2h2v-6H9v-2h2V8.5A3.5 3.5 0 0 1 14.5 5H14v2z"
                      />
                    </svg>
                  </NIcon>
                  {{ $t("common.preview") }}
                </div>
              </div>
            </div>
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

<style scoped>
.image-preview-container {
  padding: 16px;
  display: flex;
  justify-content: center;
  margin: 0 auto;
  max-width: 90%;
}

.image-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  width: 100%;
  max-width: 500px;
}

.preview-image {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
  object-fit: contain;
  background-color: white;
  padding: 4px;
  max-height: 250px;
}

.preview-image:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.image-hint {
  margin-top: 12px;
  font-size: 13px;
  color: #606266;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f0f0f0;
  padding: 6px 12px;
  border-radius: 4px;
  width: fit-content;
}

.mr-1 {
  margin-right: 4px;
}
</style>
