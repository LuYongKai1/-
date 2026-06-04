<script setup lang="ts">
import { computed, h, ref, watch } from "vue";
import { useItemPackage } from "@/hooks/business/useItemPackage";
import RoleSearchSelector from "@/components/business/role-search-selector.vue";
import ResultModal from "./result-modal.vue";
import { fetchmultiplerole } from "@/service/api";
import { fetchCompletePlayerQuest } from "@/service/api/game-manage";
import { handleApiCatchError, handleApiResponseError } from "@/utils/common";
import { NButton } from "naive-ui";

defineOptions({
  name: "ForceCompleteTaskModal"
});

interface Props {
  rowData?: any | null;
}

const props = defineProps<Props>();

interface Emits {
  (e: "submitted"): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>("visible", {
  default: false
});

type TaskOption = {
  label: string;
  value: string;
};

const model = ref({
  roleId: "",
  roleName: "",
  taskId: "",
  taskName: ""
});

const selectedRoles = ref<
  { id: string; name: string; serverId: number; serverName?: string }[]
>([]);

const taskKeyword = ref("");
const allTaskOptions = ref<TaskOption[]>([]);
const selectedTaskIds = ref<string[]>([]);
const loadingTasks = ref(false);
const submitting = ref(false);
const resultModalVisible = ref(false);
const resultData = ref<any[] | null>(null);

const filteredTaskOptions = computed(() => {
  const keyword = taskKeyword.value.trim().toLowerCase();
  if (!keyword) return allTaskOptions.value;
  return allTaskOptions.value.filter(item => {
    return item.value.toLowerCase().includes(keyword) || item.label.toLowerCase().includes(keyword);
  });
});

const taskSearchOptions = computed(() => {
  if (!taskKeyword.value.trim()) return [];
  return filteredTaskOptions.value.slice(0, 100).map(item => ({
    label: `${item.label} (${item.value})`,
    value: item.value
  }));
});

const selectedTaskList = computed(() => {
  return selectedTaskIds.value.map(id => {
    const target = allTaskOptions.value.find(item => item.value === id);
    return {
      id,
      name: target?.label || id
    };
  });
});

const taskTableColumns = computed(() => [
  {
    title: "任务名称",
    key: "name",
    ellipsis: {
      tooltip: true
    }
  },
  {
    title: "任务ID",
    key: "id",
    width: 220,
    ellipsis: {
      tooltip: true
    }
  },
  {
    title: "操作",
    key: "actions",
    width: 90,
    render: (row: { id: string }) => {
      return h(
        NButton,
        {
          text: true,
          type: "error",
          size: "small",
          onClick: () => handleRemoveTask(row.id)
        },
        { default: () => "删除" }
      );
    }
  }
]);

function initModel() {
  model.value = {
    roleId: String(props.rowData?.roleId || ""),
    roleName: props.rowData?.roleName || "",
    taskId: "",
    taskName: ""
  };
  taskKeyword.value = "";
  selectedRoles.value = [];
  selectedTaskIds.value = [];

  if (model.value.roleId) {
    selectedRoles.value = [{
      id: model.value.roleId,
      name: model.value.roleName || model.value.roleId,
      serverId: 1,
      serverName: ""
    }];
  }
}

function closeModal() {
  visible.value = false;
}

function extractServerId(source: any): number | string | null {
  const candidates = [
    source?.serverId,
    source?.sid,
    source?.server_id,
    source?.serverID
  ];
  for (const value of candidates) {
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return null;
}

async function resolveRoleServerId(role: { id: string; serverId?: number | string }) {
  try {
    const response = await fetchmultiplerole({ param: role.id, type: "1" });
    const raw = (response as any)?.response?.data;
    const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
    const exact = list.find((item: any) => String(item?.roleId || item?.id || "") === String(role.id)) || list[0];
    return extractServerId(exact) ?? role.serverId ?? null;
  } catch {
    return role.serverId ?? null;
  }
}

async function handleConfirm() {
  if (!selectedRoles.value.length) {
    window.$message?.warning("请先添加角色");
    return;
  }
  if (!selectedTaskIds.value.length) {
    window.$message?.warning("请先添加任务");
    return;
  }

  try {
    submitting.value = true;
    const requestTargets: Array<{ roleId: string; serverId: number | string }> = [];
    for (const role of selectedRoles.value) {
      const resolvedServerId = await resolveRoleServerId(role);
      if (resolvedServerId === undefined || resolvedServerId === null || resolvedServerId === "") {
        continue;
      }
      requestTargets.push({ roleId: role.id, serverId: resolvedServerId });
    }

    if (!requestTargets.length) {
      window.$message?.warning("未获取到有效的服务器ID");
      return;
    }

    const payload = requestTargets.map(target => ({
      gameId: 101,
      serverId: target.serverId,
      roleId: target.roleId,
      questIds: selectedTaskIds.value.map(id => Number(id))
    }));

    const response = await fetchCompletePlayerQuest(payload);
    
    // 提取返回数据
    const rawData = (response as any)?.data?.data || (response as any)?.data || [];
    
    if (handleApiResponseError(response, "强制完成任务")) {
      // 即使有错误，也尝试展示结果
      if (Array.isArray(rawData) && rawData.length > 0) {
        resultData.value = rawData;
        resultModalVisible.value = true;
      }
      return;
    }

    // 展示结果弹窗
    if (Array.isArray(rawData) && rawData.length > 0) {
      resultData.value = rawData;
      resultModalVisible.value = true;
      window.$message?.success(`强制完成任务请求已提交（共${payload.length}个角色）`);
    } else {
      window.$message?.success(`强制完成任务请求已提交（共${payload.length}个角色）`);
    }
    
    emit("submitted");
    closeModal();
  } catch (error) {
    handleApiCatchError(error, "强制完成任务");
  } finally {
    submitting.value = false;
  }
}

function normalizeQuestOptions(rawQuest: any): TaskOption[] {
  const result: TaskOption[] = [];

  if (Array.isArray(rawQuest)) {
    rawQuest.forEach((item: any) => {
      const id = String(item?.id ?? item?.questId ?? item?.tid ?? "");
      const name = String(item?.name ?? item?.questName ?? item?.names ?? id);
      if (id) {
        result.push({ value: id, label: name });
      }
    });
    return result;
  }

  if (rawQuest && typeof rawQuest === "object") {
    Object.entries(rawQuest).forEach(([key, value]) => {
      const questObj = value as any;
      const id = String(questObj?.id ?? questObj?.questId ?? key);
      const name = String(questObj?.name ?? questObj?.questName ?? questObj?.names ?? key);
      if (id) {
        result.push({ value: id, label: name });
      }
    });
  }

  return result;
}

function findQuestDataDeep(source: any, depth = 0): any {
  if (!source || typeof source !== "object" || depth > 6) return null;

  if (Array.isArray(source)) {
    for (const item of source) {
      const found = findQuestDataDeep(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  const directKeys = ["quest", "quests", "quest_data", "questData", "Quest"];
  for (const key of directKeys) {
    if (key in source && (source as any)[key]) {
      return (source as any)[key];
    }
  }

  for (const value of Object.values(source)) {
    const found = findQuestDataDeep(value, depth + 1);
    if (found) return found;
  }

  return null;
}

async function loadQuestOptions() {
  if (allTaskOptions.value.length) return;

  loadingTasks.value = true;
  try {
    const itemPackage = await useItemPackage();
    const rawQuest =
      itemPackage?.data?.quest ??
      itemPackage?.quest ??
      itemPackage?.data?.quests ??
      itemPackage?.quests ??
      itemPackage?.data?.quest_data ??
      itemPackage?.quest_data ??
      findQuestDataDeep(itemPackage);

    allTaskOptions.value = normalizeQuestOptions(rawQuest);
    if (!allTaskOptions.value.length) {
      window.$message?.warning("任务数据为空，请确认数据包中是否包含 quest");
    }
  } catch {
    allTaskOptions.value = [];
    window.$message?.error("加载任务列表失败");
  } finally {
    loadingTasks.value = false;
  }
}

function handleSelectTask(values: string[] | null) {
  if (!values || values.length === 0) {
    model.value.taskId = "";
    model.value.taskName = "";
    return;
  }

  const names = values.map(id => allTaskOptions.value.find(item => item.value === id)?.label || id);
  model.value.taskId = values.join(",");
  model.value.taskName = names.join(",");
}

function handleTaskSearchSelect(value: string) {
  if (!selectedTaskIds.value.includes(value)) {
    selectedTaskIds.value = [...selectedTaskIds.value, value];
  }
  handleSelectTask(selectedTaskIds.value);
  window.setTimeout(() => {
    taskKeyword.value = "";
  }, 0);
}

function handleRemoveTask(taskId: string) {
  selectedTaskIds.value = selectedTaskIds.value.filter(id => id !== taskId);
  handleSelectTask(selectedTaskIds.value);
}

watch(selectedRoles, (roles) => {
  if (roles.length > 0) {
    model.value.roleId = roles.map(role => role.id).join(",");
    model.value.roleName = roles.map(role => role.name).join(",");
  } else {
    model.value.roleId = "";
    model.value.roleName = "";
  }
}, { deep: true });

watch(visible, () => {
  if (visible.value) {
    initModel();
    loadQuestOptions();
  }
});

watch(taskKeyword, (value) => {
  if (!value.trim()) return;
});
</script>

<template>
  <NModal v-model:show="visible" preset="card" title="强制完成任务" class="w-1200px">
    <NAlert type="info" :show-icon="false" class="mb-12px">
      先添加角色，再搜索任务点击添加到下方列表
    </NAlert>
    <div style="height: 560px; overflow: hidden;">
      <NGrid :cols="24" :x-gap="16" :y-gap="16" style="height: 100%;">
        <NGi :span="12" style="height: 100%;">
          <NCard size="small" title="角色搜索并添加" style="height: 100%;">
            <RoleSearchSelector
              v-model="selectedRoles"
              :placeholder="'请输入角色名称或ID搜索'"
              :max-height="360"
            />
          </NCard>
        </NGi>

        <NGi :span="12" style="height: 100%;">
          <NCard size="small" title="任务搜索并添加" style="height: 100%;">
            <NForm label-placement="left" :label-width="90">
              <NFormItem label="任务搜索">
                <NAutoComplete
                  v-model:value="taskKeyword"
                  :options="taskSearchOptions"
                  :loading="loadingTasks"
                  placeholder="请输入任务ID或任务名搜索"
                  clearable
                  @select="handleTaskSearchSelect"
                />
              </NFormItem>

              <NFormItem>
                <div class="w-full">
                  <NDataTable
                    v-if="selectedTaskList.length"
                    :columns="taskTableColumns"
                    :data="selectedTaskList"
                    size="small"
                    :single-line="false"
                    :max-height="360"
                    striped
                    bordered
                  />
                  <NEmpty
                    v-else
                    description="暂无任务"
                    size="small"
                    class="py-8px"
                  />
                </div>
              </NFormItem>
            </NForm>
          </NCard>
        </NGi>
      </NGrid>
    </div>

    <template #footer>
      <NSpace justify="end" :size="16">
        <NButton @click="closeModal">取消</NButton>
        <NButton type="primary" :loading="submitting" @click="handleConfirm">确认</NButton>
      </NSpace>
    </template>
  </NModal>

  <ResultModal
    v-model:visible="resultModalVisible"
    :result-data="resultData"
    title="强制完成任务结果"
  />
</template>
