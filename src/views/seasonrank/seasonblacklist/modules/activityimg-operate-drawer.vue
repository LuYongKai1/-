<script setup lang="ts">
import { computed, ref, watch, onMounted } from "vue";
import { useFormRules, useNaiveForm } from "@/hooks/common/form";
import {
  fetchAddSeasonBlacklist,
  fetchEditSeasonBlacklist,
  fetchBatchAddSeasonBlacklist,
} from "@/service/api";
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";
import { $t } from "@/locales";
import RoleSearchSelector from "@/components/business/role-search-selector.vue";
import { useServerStore } from "@/store/modules/server";


defineOptions({
  name: "ActivityOperateDrawer",
});

interface SeasonBlacklist {
  id?: number;
  seasonType?: string;
  serverId?: string;
  seasonNo?: number;
  roleId?: number;
  roleName?: string;
  reason?: string;
  banUntil?: number;
  status?: number;
  createUser?: string;
  createTime?: string;
  updateUser?: string;
  updateTime?: string;
}

interface Props {
  /** the type of operation */
  operateType: NaiveUI.TableOperateType;
  /** the edit row data */
  rowData?: SeasonBlacklist | null;
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
const serverStore = useServerStore();

const title = computed(() => {
  const titles: Record<NaiveUI.TableOperateType, string> = {
    add: "添加赛季黑名单",
    edit: "编辑赛季黑名单",
  };
  return titles[props.operateType];
});


interface RoleInfo {
  id: string;
  name: string;
  serverId: number;
  serverName?: string;
}

type Model = {
  seasonType: string;
  serverId: string;
  seasonNo: number;
  roleId: number;
  roleName: string;
  reason: string;
  banUntil: number;
  status: number;
  selectedRoles: RoleInfo[];
};

const model = ref(createDefaultModel());

function createDefaultModel(): Model {
  return {
    seasonType: "",
    serverId: "",
    seasonNo: 0,
    roleId: 0,
    roleName: "",
    reason: "",
    banUntil: -1,
    status: 1,
    selectedRoles: [],
  };
}

// 服务器选项（包含普通服和跨服）
const serverOptions = computed(() => {
  return serverStore.mixedServerList.map(server => ({
    label: server.serverType === 'cross' ? `跨服-${server.serverName}` : server.serverName,
    value: server.serverId
  }));
});

// 是否为单服模式
const isSingleServerMode = computed(() => model.value.seasonType === 'SINGLE');

// 监听赛季类型变化
watch(() => model.value.seasonType, (newType) => {
  // 如果切换到全服模式，清空服务器选择
  if (newType === 'ALL') {
    model.value.serverId = '';
  }
});

// 监听角色选择变化
watch(() => model.value.selectedRoles, (newRoles) => {
  if (newRoles && newRoles.length > 0) {
    const firstRole = newRoles[0];
    model.value.roleId = Number(firstRole.id);
    model.value.roleName = firstRole.name;
    // 只有在单服模式下才自动填充服务器
    if (isSingleServerMode.value && firstRole.serverId) {
      model.value.serverId = String(firstRole.serverId);
    }
    // 清除角色字段的验证错误
    formRef.value?.restoreValidation();
  }
}, { deep: true });

type RuleKey = "selectedRoles" | "reason" | "serverId";

const rules = computed<Record<RuleKey, App.Global.FormRule>>(() => ({
  selectedRoles: {
    required: true,
    message: "请选择角色",
    trigger: "change",
    validator: (rule: any, value: RoleInfo[]) => {
      if (!value || value.length === 0) {
        return new Error("请选择角色");
      }
      return true;
    }
  },
  // 只有单服模式下服务器才必填
  serverId: isSingleServerMode.value ? defaultRequiredRule : { required: false },
  reason: defaultRequiredRule,
}));

function handleInitModel() {
  model.value = createDefaultModel();

  if (props.operateType === "edit" && props.rowData) {
    Object.assign(model.value, {
      seasonType: props.rowData.seasonType || "SINGLE",
      serverId: props.rowData.serverId || "",
      seasonNo: props.rowData.seasonNo ?? 0,
      roleId: props.rowData.roleId ?? 0,
      roleName: props.rowData.roleName || "",
      reason: props.rowData.reason || "",
      banUntil: props.rowData.banUntil ?? -1,
      status: props.rowData.status ?? 1,
    });

    // 如果是编辑模式，恢复角色选择
    if (props.rowData.roleId && props.rowData.roleName) {
      model.value.selectedRoles = [{
        id: String(props.rowData.roleId),
        name: props.rowData.roleName,
        serverId: Number(props.rowData.serverId) || 0,
      }];
    }
  }
}

function closeDrawer() {
  visible.value = false;
}

async function handleSubmit() {
  await validate();
  try {
    let response: any;

    if (props.operateType === "add") {
      const selectedRoles = model.value.selectedRoles;

      // 判断是单个添加还是批量添加
      if (selectedRoles.length > 1) {
        // 批量添加 - 发送数组
        const batchData = selectedRoles.map(role => ({
          seasonType: model.value.seasonType || "SINGLE",
          serverId: model.value.serverId || "",
          seasonNo: model.value.seasonNo ?? 0,
          roleId: Number(role.id),
          roleName: role.name,
          reason: model.value.reason || "",
          banUntil: model.value.banUntil ?? -1,
          status: model.value.status ?? 1,
        }));
        response = await fetchBatchAddSeasonBlacklist(batchData);
      } else {
        // 单个添加
        const blacklistData = {
          seasonType: model.value.seasonType || "SINGLE",
          serverId: model.value.serverId || "",
          seasonNo: model.value.seasonNo ?? 0,
          roleId: model.value.roleId ?? 0,
          roleName: model.value.roleName || "",
          reason: model.value.reason || "",
          banUntil: model.value.banUntil ?? -1,
          status: model.value.status ?? 1,
        };
        response = await fetchAddSeasonBlacklist(blacklistData);
      }
    } else {
      // 编辑
      const blacklistData = {
        id: props.rowData!.id!,
        seasonType: model.value.seasonType || "SINGLE",
        serverId: model.value.serverId || "",
        seasonNo: model.value.seasonNo ?? 0,
        roleId: model.value.roleId ?? 0,
        roleName: model.value.roleName || "",
        reason: model.value.reason || "",
        banUntil: model.value.banUntil ?? -1,
        status: model.value.status ?? 1,
      };
      response = await fetchEditSeasonBlacklist(blacklistData);
    }

    const operationType = props.operateType === "add" ? "添加赛季黑名单" : "编辑赛季黑名单";
    if (handleApiResponseError(response, operationType)) {
      return;
    }

    if (props.operateType === "add") {
      const count = model.value.selectedRoles.length;
      window.$message?.success(count > 1 ? `批量添加成功，共添加 ${count} 个角色` : "添加成功");
    } else {
      window.$message?.success("更新成功");
    }

    closeDrawer();
    emit("submitted");
  } catch (error: any) {
    const operationType = props.operateType === "add" ? "添加赛季黑名单" : "编辑赛季黑名单";
    handleApiCatchError(error, operationType);
  }
}

watch(visible, async (newVal) => {
  if (newVal) {
    handleInitModel();
    restoreValidation();
    // 确保服务器列表已加载（包含普通服和跨服）
    if (serverStore.serverList.length === 0 || serverStore.crossServerList.length === 0) {
      await Promise.all([
        serverStore.fetchServerList(),
        serverStore.fetchCrossServerList()
      ]);
    }
  }
});

onMounted(async () => {
  // 初始化时加载服务器列表（包含普通服和跨服）
  if (serverStore.serverList.length === 0 || serverStore.crossServerList.length === 0) {
    await Promise.all([
      serverStore.fetchServerList(),
      serverStore.fetchCrossServerList()
    ]);
  }
});
</script>


<template>
  <NModal v-model:show="visible" :title="title" preset="card" class="w-900px">
    <NScrollbar class="h-600px pr-20px">
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
            label="赛季类型"
            path="seasonType"
          >
            <NSelect
              v-model:value="model.seasonType"
              :options="[
                { label: 'SINGLE-单服', value: 'SINGLE' },
                { label: 'ALL-全服', value: 'ALL' }
              ]"
              placeholder="请选择赛季类型"
              clearable
            />
          </NFormItemGi>

          <NFormItemGi
            span="24"
            label="服务器"
            path="serverId"
          >
            <div style="width: 100%;">
              <NSelect
                v-model:value="model.serverId"
                :options="serverOptions"
                :placeholder="isSingleServerMode ? '请选择服务器' : '全服模式无需选择服务器'"
                :disabled="!isSingleServerMode"
                filterable
                clearable
              />
              <NText v-if="!isSingleServerMode" depth="3" style="font-size: 12px; margin-top: 4px; display: block;">
                当前为全服模式，无需选择服务器
              </NText>
            </div>
          </NFormItemGi>

          <NFormItemGi
            span="24"
            label="赛季编号"
            path="seasonNo"
          >
            <NInputNumber
              v-model:value="model.seasonNo"
              placeholder="请输入赛季编号"
              style="width: 100%"
              :min="0"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24"
            label="角色"
            path="selectedRoles"
          >
            <RoleSearchSelector
              v-model="model.selectedRoles"
              placeholder="请输入角色名称或ID搜索"
              :max-height="200"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24"
            label="原因"
            path="reason"
          >
            <NInput
              v-model:value="model.reason"
              type="textarea"
              placeholder="请输入原因"
              :rows="3"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24"
            label="封禁时长"
            path="banUntil"
          >
            <NInputNumber
              v-model:value="model.banUntil"
              placeholder="请输入封禁时长（-1表示永久）"
              style="width: 100%"
              :min="-1"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24"
            label="状态"
            path="status"
          >
            <NSelect
              v-model:value="model.status"
              :options="[
                { label: '启用', value: 1 },
                { label: '禁用', value: 0 }
              ]"
              placeholder="请选择状态"
            />
          </NFormItemGi>

        </NGrid>
      </NForm>
    </NScrollbar>
    <template #footer>
      <NSpace justify="end" :size="16">
        <NButton @click="closeDrawer">{{ $t('common.cancel') }}</NButton>
        <NButton type="primary" @click="handleSubmit">{{ $t('common.confirm') }}</NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped>
</style>
