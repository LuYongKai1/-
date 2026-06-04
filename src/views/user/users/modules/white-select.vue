<script setup lang="ts">
import { ref, watch } from "vue";
import { $t } from "@/locales";
import type { SelectOption } from "naive-ui";

defineOptions({
  name: "whiteSelect",
});

interface Props {
  model: {
    userId?: string;
    openId?: string;
    roleId?: string;
    roleName?: string;
    ban?: boolean | null;
    chat?: boolean | null;
    [key: string]: any;
  };
}
const props = defineProps<Props>();

interface Emits {
  (e: "reset"): void;
  (e: "search"): void;
}
const emit = defineEmits<Emits>();

const maxUserIdLength = 18;
const maxOpenIdLength = 36;
const maxRoleIdLength = 19;

let searchTimer: number | null = null;

// 验证数字输入
function validateNumberInput(value: string): boolean {
  return /^\d*$/.test(value);
}

// 处理用户ID输入
function handleUserIdInput(value: string) {
  if (validateNumberInput(value) && value.length <= maxUserIdLength) {
    props.model.userId = value;
  }
}

// 处理平台ID输入
function handleOpenIdInput(value: string) {
  if (validateNumberInput(value) && value.length <= maxOpenIdLength) {
    props.model.openId = value;
  }
}

// 处理角色ID输入
function handleRoleIdInput(value: string) {
  if (validateNumberInput(value) && value.length <= maxRoleIdLength) {
    props.model.roleId = value;
  }
}

const debounceSearch = () => {
  if (searchTimer) {
    clearTimeout(searchTimer);
  }
  searchTimer = window.setTimeout(() => {
    emit("search");
    searchTimer = null;
  }, 300);
};

watch(() => props.model.userId, debounceSearch);
watch(() => props.model.openId, debounceSearch);
watch(() => props.model.roleId, debounceSearch);
watch(() => props.model.roleName, debounceSearch);
watch(() => props.model.ban, debounceSearch);
watch(() => props.model.chat, debounceSearch);

const userStatus = ref("");

watch(userStatus, (newValue) => {
  if (newValue === "ban") {
    props.model.ban = true;
    props.model.chat = null;
  } else if (newValue === "chat") {
    props.model.ban = null;
    props.model.chat = true;
  } else if (newValue === "both") {
    props.model.ban = true;
    props.model.chat = true;
  } else {
    props.model.ban = null;
    props.model.chat = null;
  }
  debounceSearch();
});

function reset() {
  if (searchTimer) {
    clearTimeout(searchTimer);
    searchTimer = null;
  }
  userStatus.value = "";
  props.model.userId = "";
  props.model.openId = "";
  props.model.roleId = "";
  props.model.roleName = "";
  props.model.ban = null;
  props.model.chat = null;
  emit("reset");
}

function search() {
  if (searchTimer) {
    clearTimeout(searchTimer);
    searchTimer = null;
  }
  emit("search");
}

const userStatusOptions: SelectOption[] = [
  { value: "", label: "全部" },
  { value: "ban", label: "已封禁" },
  { value: "chat", label: "已禁言" },
  { value: "both", label: "已封禁且禁言" },
];
</script>

<template>
  <NCard
    :bordered="false"
    size="small"
    class="card-wrapper"
    :title="$t('common.search')"
    name="user-search"
  >
    <NForm :model="model" label-placement="left" :label-width="80">
      <NGrid responsive="screen" item-responsive>
        <NFormItemGi
          span="24 s:12 m:6"
          :label="$t('page.manage.gmrole.userId')"
          path="userId"
          class="pr-24px"
        >
          <NInput
            :value="model.userId"
            @update:value="handleUserIdInput"
            :placeholder="$t('page.manage.gmrole.form.userId')"
            :maxlength="maxUserIdLength"
            clearable
            style="width: 100%"
          />
        </NFormItemGi>

        <NFormItemGi
          span="24 s:12 m:6"
          :label="$t('page.manage.gmrole.openId')"
          path="openId"
          class="pr-24px"
        >
          <NInput
            :value="model.openId"
            @update:value="handleOpenIdInput"
            :placeholder="$t('page.manage.gmrole.form.openId')"
            :maxlength="maxOpenIdLength"
            clearable
            style="width: 100%"
          />
        </NFormItemGi>

        <NFormItemGi
          span="24 s:12 m:6"
          :label="$t('page.manage.gmrole.roleName')"
          path="roleName"
          class="pr-24px"
        >
          <NInput
            v-model:value="model.roleName"
            :placeholder="$t('page.manage.gmrole.form.roleName')"
            clearable
          />
        </NFormItemGi>

        <NFormItemGi
          span="24 s:12 m:6"
          :label="$t('page.manage.gmrole.roleId')"
          path="roleId"
          class="pr-24px"
        >
          <NInput
            :value="model.roleId"
            @update:value="handleRoleIdInput"
            :placeholder="$t('page.manage.gmrole.form.roleId')"
            :maxlength="maxRoleIdLength"
            clearable
            style="width: 100%"
          />
        </NFormItemGi>

        <NFormItemGi
          span="24 s:12 m:6"
          :label="$t('page.manage.gmrole.userStatus')"
          path="userStatus"
          class="pr-24px"
        >
          <NSelect v-model:value="userStatus" :options="userStatusOptions" clearable/>
        </NFormItemGi>

        <NFormItemGi span="24 m:18" class="pr-24px">
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
        </NFormItemGi>
      </NGrid>
    </NForm>
  </NCard>
</template>

<style scoped></style>
