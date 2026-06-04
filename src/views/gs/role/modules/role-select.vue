<script setup lang="ts">
import { ref, watch, reactive, onMounted, onActivated, computed } from "vue";
import { $t } from "@/locales";
import { fetchGetServerList } from "@/service/api"; // 导入 API
import type { SelectOption, SelectGroupOption } from "naive-ui"; // 导入 Naive UI 类型
import { gsRoleTagStatusOptions, gsRoleTagTypeOptions } from "@/constants/business";

defineOptions({
  name: "whiteSelect",
});

interface Props {
  model: {
    roleId?: string;
    tagType?: string;
    userName?: string;
    status?: string | number | null | undefined;
  };
}
const props = defineProps<Props>();

interface Emits {
  (e: "reset"): void;
  (e: "search", roleId: string, tagType: string, userName: string, status: string | number | null | undefined): void;
}
const emit = defineEmits<Emits>();

const localModel = reactive<Props["model"]>(
  props.model || {
    roleId: "",
    tagType: "",
    userName: "",
    status: "1",
  }
);

const maxRoleIdLength = 19;

let searchTimer: number | null = null;

// 为状态选项添加"全部"选项
const statusOptionsWithAll = computed(() => {
  return [
    { label: $t('common.all'), value: '' },
    ...gsRoleTagStatusOptions
  ];
});

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
    emit("search", localModel.roleId || "", localModel.tagType || "", localModel.userName || "", localModel.status ?? null);
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
  () => localModel.userName,
  (newValue, oldValue) => {
    if (newValue !== oldValue) {
      debounceSearch();
    }
  }
);

watch(
  () => localModel.tagType,
  (newValue, oldValue) => {
    if (newValue !== oldValue) {
      debounceSearch();
    }
  }
);

watch(
  () => localModel.userName,
  (newValue, oldValue) => {
    if (newValue !== oldValue) {
      debounceSearch();
    }
  }
);

watch(
  () => localModel.status,
  (newValue, oldValue) => {
    if (newValue !== oldValue) {
      debounceSearch();
    }
  }
);

// 清空搜索条件
function clearSearchFields() {
  localModel.roleId = "";
  localModel.tagType = "1";
  localModel.userName = "";
  localModel.status = "";
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
  emit("search", localModel.roleId || "", localModel.tagType || "", localModel.userName || "", localModel.status ?? null);
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
              :label="$t('page.manage.gsRole.tagType')"
              path="tagType"
              class="pr-24px"
            >
              <NSelect
                v-model:value="localModel.tagType"
                :options="gsRoleTagTypeOptions"
                :placeholder="$t('page.manage.gsRole.form.tagType')"
                clearable
              />
            </NFormItemGi>

            <NFormItemGi
              span="24 s:12 m:6"
              :label="$t('page.manage.gsRole.userName')"
              path="userName"
              class="pr-24px"
            >
              <NInput
                v-model:value="localModel.userName"
                :placeholder="$t('page.manage.gsRole.form.userName')"
              />
            </NFormItemGi>

            <NFormItemGi
              span="24 s:12 m:6"
              :label="$t('page.manage.gsRole.status')"
              path="status"
              class="pr-24px"
            >
              <NSelect
                v-model:value="localModel.status"
                :options="statusOptionsWithAll"
                :placeholder="$t('page.manage.gsRole.form.status')"
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
