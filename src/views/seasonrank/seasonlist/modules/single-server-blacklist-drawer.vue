<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { handleApiCatchError } from "@/utils/common";
import { fetchSeasonBlackList } from "@/service/api/game-manage";
import RoleSearchSelector from "@/components/business/role-search-selector.vue";

defineOptions({
  name: "SingleServerBlacklistDrawer"
});

interface RoleInfo {
  id: string;
  name: string;
  serverId: number;
  serverName?: string;
}

interface Emits {
  (e: "submitted"): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>("visible", {
  default: false
});

const submitLoading = ref(false);

// 操作类型选项
const operationOptions = [
  { label: "设置黑名单", value: "add" },
  { label: "移除黑名单", value: "remove" }
];

// 黑名单类型选项 (ranking_type)
const blacklistTypeOptions = [
  { label: "个人排行榜", value: 0 },
  { label: "公会排行榜", value: 1 },
  { label: "战力排行榜", value: 3 }
];

const selectedRoles = ref<RoleInfo[]>([]);

// 过期时间（时间戳，毫秒）
const expireTime = ref<number | null>(null);

const model = reactive({
  operation: "add" as "add" | "remove",
  blacklistType: 0,
  reason: ""
});

const canSubmit = computed(() => {
  const hasRoleId = selectedRoles.value.length > 0;
  const hasReason = model.operation === "add" ? model.reason.trim() !== "" : true;
  return hasRoleId && hasReason && !submitLoading.value;
});

const isBusy = computed(() => submitLoading.value);

function resetForm() {
  model.operation = "add";
  model.blacklistType = 0;
  model.reason = "";
  selectedRoles.value = [];
  expireTime.value = null;
}

function closeDrawer() {
  visible.value = false;
}

async function handleSubmit() {
  if (submitLoading.value) return;

  if (selectedRoles.value.length === 0) {
    window.$message?.warning("请选择角色");
    return;
  }

  if (model.operation === "add" && model.reason.trim() === "") {
    window.$message?.warning("请输入黑名单原因");
    return;
  }

  if (model.operation === "add" && !expireTime.value) {
    window.$message?.warning("请选择过期时间");
    return;
  }

  submitLoading.value = true;

  try {
    // 构建请求数据
    const requestData: any = {
      act: "MODIFY_RANKING_BAN_LIST",
      data: {},
      SN: Date.now()
    };

    if (model.operation === "add") {
      // 设置黑名单 - 支持多个角色
      // 计算过期秒数（从当前时间到选择的时间）
      const expireSeconds = Math.floor((expireTime.value! - Date.now()) / 1000);
      
      requestData.data.modify = selectedRoles.value.map(role => ({
        cuid: Number(role.id),
        ranking_type: model.blacklistType,
        expire: expireSeconds,
        reason: model.reason
      }));
    } else {
      // 移除黑名单 - 支持多个角色
      requestData.data.remove = selectedRoles.value.map(role => ({
        cuid: Number(role.id),
        ranking_type: model.blacklistType
      }));
    }

    console.log("请求数据：", JSON.stringify(requestData, null, 2));

    // 调用API
    const response = await fetchSeasonBlackList(requestData);

    // 检查响应
    const responseData = response?.data || response;
    const code = responseData?.code;
    
    if (code === 200 || code === 0) {
      const operationText = model.operation === "add" ? "设置" : "移除";
      window.$message?.success(`${operationText}黑名单成功`);
      emit("submitted");
      closeDrawer();
    } else {
      window.$message?.error(responseData?.msg || responseData?.message || "操作失败");
    }
  } catch (error) {
    handleApiCatchError(error, model.operation === "add" ? "设置黑名单" : "移除黑名单");
  } finally {
    submitLoading.value = false;
  }
}

watch(visible, (newVal) => {
  if (newVal) {
    resetForm();
  }
});
</script>

<template>
  <NDrawer v-model:show="visible" :width="720" display-directive="show">
    <NDrawerContent title="单服黑名单" :native-scrollbar="false" closable>
      <NForm label-placement="left" :label-width="120" :show-feedback="false">
        <NGrid responsive="screen" item-responsive :x-gap="16" :y-gap="16">
          <NFormItemGi span="24" label="操作类型">
            <NRadioGroup v-model:value="model.operation">
              <NSpace>
                <NRadio
                  v-for="option in operationOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </NRadio>
              </NSpace>
            </NRadioGroup>
          </NFormItemGi>

          <NFormItemGi span="24" label="角色搜索">
            <RoleSearchSelector
              v-model="selectedRoles"
              placeholder="请输入角色名称或ID搜索"
              :max-height="200"
            />
          </NFormItemGi>

          <NFormItemGi span="24" label="黑名单类型">
            <NSelect
              v-model:value="model.blacklistType"
              :options="blacklistTypeOptions"
              placeholder="请选择黑名单类型"
            />
          </NFormItemGi>

          <NFormItemGi v-if="model.operation === 'add'" span="24" label="过期时间">
            <NDatePicker
              v-model:value="expireTime"
              type="datetime"
              placeholder="请选择过期时间"
              style="width: 100%"
              clearable
              :is-date-disabled="(ts: number) => ts < Date.now()"
            />
          </NFormItemGi>

          <NFormItemGi v-if="model.operation === 'add'" span="24" label="原因">
            <NInput
              v-model:value="model.reason"
              type="textarea"
              placeholder="请输入黑名单原因"
              :rows="3"
              clearable
            />
          </NFormItemGi>
        </NGrid>
      </NForm>

      <template #footer>
        <NSpace justify="end" :size="16">
          <NButton secondary :disabled="isBusy" @click="resetForm">
            重置
          </NButton>
          <NButton secondary :disabled="isBusy" @click="closeDrawer">
            取消
          </NButton>
          <NButton type="primary" :loading="submitLoading" :disabled="!canSubmit" @click="handleSubmit">
            确认
          </NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>
