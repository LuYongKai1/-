<script setup lang="ts">
import { ref, watch, reactive, onMounted, onActivated } from "vue";
import { $t } from "@/locales";
import { fetchGetServerList } from "@/service/api"; // 导入 API
import type { SelectOption, SelectGroupOption } from "naive-ui"; // 导入 Naive UI 类型
import {  grantTargetTypeOptions, grantTypeOptions } from "@/constants/business";

defineOptions({
  name: "whiteSelect",
});

interface Props {
  model: {
    roleId?: string;
    targetType?: string;
    grantType?: string;
    operator?: string | number | null;
  };
}
const props = defineProps<Props>();

interface Emits {
  (e: "reset"): void;
  (e: "search", roleId: number, targetType: number | null, grantType: number | null, operator: string): void;
}
const emit = defineEmits<Emits>();

const localModel = reactive<Props["model"]>(
  props.model || {
    roleId: "",
    targetType: null,
    grantType: null,
    operator: "",
  }
);

const maxRoleIdLength = 19;

let searchTimer: number | null = null;

// 验证数字输入
function validateNumberInput(value: string): boolean {
  return /^\d*$/.test(value);
}



// 处理角色ID输入
function handleRoleIdInput(value: string) {
  if (validateNumberInput(value)) {
    if (value.length <= maxRoleIdLength) {
      localModel.roleId = value;
    }
  }
}

const debounceSearch = () => {
  if (searchTimer) {
    clearTimeout(searchTimer);
  }
  searchTimer = window.setTimeout(() => {
    emit("search", localModel.roleId || "", localModel.targetType || null, localModel.grantType || null, localModel.operator || "");
    searchTimer = null;
  }, 300);
};

watch(
  () => props.model,
  (newModel) => {
    Object.assign(localModel, newModel);
  },
  { deep: true }
);

watch(
  () => localModel.roleId,
  (newValue, oldValue) => {
    if (newValue !== oldValue) {
      debounceSearch();
    }
  }
);

watch(
  () => localModel.targetType,
  (newValue, oldValue) => {
    if (newValue !== oldValue) {
      debounceSearch();
    }
  }
);

watch(
  () => localModel.grantType,
  (newValue, oldValue) => {
    if (newValue !== oldValue) {
      debounceSearch();
    }
  }
);

watch(
  () => localModel.operator,
  (newValue, oldValue) => {
    if (newValue !== oldValue) {
      debounceSearch();
    }
  }
);

watch(
  () => localModel.operator,
  (newValue, oldValue) => {
    if (newValue !== oldValue) {
      debounceSearch();
    }
  }
);

// 清空搜索条件
function clearSearchFields() {
  localModel.roleId = "";
  localModel.targetType = null;
  localModel.grantType = null;
  localModel.operator = "";
}

onMounted(() => {
  clearSearchFields();
});

onActivated(() => {
  clearSearchFields();
});

function reset() {
  if (searchTimer) {
    clearTimeout(searchTimer);
    searchTimer = null;
  }
  clearSearchFields();
  emit("reset");
}

// 搜索方法
function search() {
  if (searchTimer) {
    clearTimeout(searchTimer);
    searchTimer = null;
  }
  emit("search", localModel.roleId || "", localModel.targetType || null, localModel.grantType || null, localModel.operator || "");
}

</script>


<template>
  <NCard :bordered="false" size="small" class="card-wrapper" :title="$t('common.search')" name="user-search">
    <!-- <NCollapse> -->
      <!-- <NCollapseItem > -->
        <NForm :model="localModel" label-placement="left" :label-width="80">
          <NGrid responsive="screen" item-responsive>

            <NFormItemGi
              span="24 s:12 m:6"
              :label="$t('page.manage.gmrole.roleId')"
              path="roleId"
              class="pr-24px"
            >
              <NInput
                :value="localModel.roleId"
                @update:value="handleRoleIdInput"
                :placeholder="$t('page.manage.gmrole.form.roleId')"
                :maxlength="maxRoleIdLength"
                clearable
                style="width: 100%"
              />
            </NFormItemGi>

            <NFormItemGi
              span="24 s:12 m:6"
              :label="$t('page.manage.grantRecord.targetTypeLabel')"
              path="targetType"
              class="pr-24px"
            >
              <NSelect
                v-model:value="localModel.targetType"
                :options="grantTargetTypeOptions"
                :placeholder="$t('page.manage.grantRecord.form.targetType')"
                clearable
              />
            </NFormItemGi>

            <NFormItemGi
              span="24 s:12 m:6"
              :label="$t('page.manage.grantRecord.operator')"
              path="operator"
              class="pr-24px"
            >
              <NInput
                v-model:value="localModel.operator"
                :placeholder="$t('page.manage.grantRecord.form.operator')"
              />
            </NFormItemGi>

            <NFormItemGi
              span="24 s:12 m:6"
              :label="$t('page.manage.grantRecord.grantTypeLabel')"
              path="grantType"
              class="pr-24px"

            >
              <NSelect
                v-model:value="localModel.grantType"
                :options="grantTypeOptions"
                :placeholder="$t('page.manage.grantRecord.form.grantType')"
                clearable
              />
            </NFormItemGi>

            <!-- <NFormItemGi span="24" class="pr-24px">
              <NSpace class="w-full" justify="end">
                <NButton @click="reset">
                  <template #icon>
                    <icon-ic-round-refresh class="text-icon" />
                  </template>
                  {{ $t("common.reset") }}
                </NButton>
                <NButton type="primary" ghost @click="search">
                  <template #icon>
                    <icon-ic-round-search class="text-icon" />
                  </template>
                  {{ $t("common.search") }}
                </NButton>
              </NSpace>
            </NFormItemGi> -->

          </NGrid>
        </NForm>
      <!-- </NCollapseItem> -->
    <!-- </NCollapse> -->
  </NCard>
</template>


<style scoped>
</style>
