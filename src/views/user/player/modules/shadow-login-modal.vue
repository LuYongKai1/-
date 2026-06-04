<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import { NModal, NForm, NFormItem, NInput, NSpace, NButton, NAlert } from "naive-ui";
import { $t } from "@/locales";
import { fetchmultiplerole } from "@/service/api";
import { useThemeStore } from "@/store/modules/theme";

defineOptions({
  name: "RoleShadowLoginModal",
});

interface Props {
  /** 角色数据 */
  roleData?: any | null;
}

const props = defineProps<Props>();

interface Emits {
  (e: "confirm", params: { operatorOpenId: string; targetOpenId: string }): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>("visible", {
  default: false,
});

const formModel = ref({
  targetOpenId: "",
  roleName: "",
  operatorOpenId: "",
});

// 操作员角色相关
interface OperatorRoleSearchResult {
  roleId: string;
  roleName: string;
  serverName?: string;
  openId?: string;
}

const operatorRoleSearchInput = ref<string>("");
const operatorRoleSearchResults = ref<OperatorRoleSearchResult[]>([]);
const skipNextOperatorRoleSearchUpdate = ref<boolean>(false);
const themeStore = useThemeStore();

// 防抖函数
function useDebounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
  let timer: number | null = null;
  return function (...args: Parameters<T>) {
    if (timer) clearTimeout(timer);
    timer = window.setTimeout(() => {
      fn(...args);
      timer = null;
    }, delay);
  };
}

function setOperatorRoleSearchInput(value: string) {
  skipNextOperatorRoleSearchUpdate.value = true;
  operatorRoleSearchInput.value = value;
  nextTick(() => {
    skipNextOperatorRoleSearchUpdate.value = false;
  });
}

// 搜索操作员角色
async function handleOperatorRoleSearch(value: string) {
  const keyword = value.trim();

  if (!keyword) {
    operatorRoleSearchResults.value = [];
    return;
  }

  try {
    const response = await fetchmultiplerole({ param: keyword, type: "1" });
    const rawData = response?.response?.data;
    if (!rawData) {
      operatorRoleSearchResults.value = [];
      return;
    }
    const list = Array.isArray(rawData) ? rawData : [rawData];
    operatorRoleSearchResults.value = list
      .map((role: any) => {
        const resolvedRoleId =
          role.roleId ?? role.id ?? role.openId ?? role.userId ?? "";
        if (!resolvedRoleId) return null;
        // 确保 openId 正确获取并转换为字符串（处理大数字精度问题）
        // API 使用 JSONbig({ storeAsString: true }) 解析，openId 应该已经是字符串格式
        let openId = "";
        // 检查 openId 是否存在
        if (role.openId !== null && role.openId !== undefined) {
          // 由于 API 使用了 JSONbig({ storeAsString: true })，openId 应该已经是字符串
          // 直接使用原始值，避免任何转换导致精度丢失
          if (typeof role.openId === 'string') {
            // 直接使用字符串，不进行任何转换
            openId = role.openId;
          } else if (typeof role.openId === 'number') {
            // 如果是数字类型（不应该发生，但可能 API 配置有问题）
            // 对于大数字，JavaScript Number 类型无法精确表示超过 2^53 的整数
            // 如果 openId 是数字类型，说明 API 配置有问题，应该返回字符串
            // 这里我们尝试使用 BigInt 来保持精度，但最终还是要转为字符串
            try {
              // 尝试使用 BigInt 保持精度
              openId = BigInt(role.openId).toString();
            } catch (e) {
              // 如果 BigInt 失败，说明值已经丢失精度，只能使用字符串
              openId = String(role.openId);
            }
          } else {
            // 其他类型，直接转为字符串
            openId = String(role.openId);
          }
        }
        return {
          roleId: String(resolvedRoleId),
          roleName: role.roleName || role.name || role.channelUid || "",
          serverName: role.serverName || "",
          openId: openId,
        } as OperatorRoleSearchResult;
      })
      .filter((item): item is OperatorRoleSearchResult => !!item?.roleId);
  } catch (error) {
    operatorRoleSearchResults.value = [];
  }
}

const debouncedOperatorRoleSearch = useDebounce(handleOperatorRoleSearch, 400);

// 监听搜索输入变化
watch(operatorRoleSearchInput, (value) => {
  if (skipNextOperatorRoleSearchUpdate.value) {
    skipNextOperatorRoleSearchUpdate.value = false;
    return;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    clearOperatorRoleSearch();
    return;
  }

  debouncedOperatorRoleSearch(trimmed);
});

// 选择操作员角色
function handleSelectOperatorRole(role: OperatorRoleSearchResult) {
  // 输入框显示角色ID（用于用户查看）
  setOperatorRoleSearchInput(role.roleId);
  operatorRoleSearchResults.value = [];
  // 保存openId用于提交（实际传递的是openId，不是roleId）
  // 确保 openId 存在且不为空
  if (role.openId && role.openId.trim() !== "" && role.openId !== "0") {
    // 直接使用已转换的字符串格式的 openId，不进行任何转换
    formModel.value.operatorOpenId = role.openId;
  } else {
    formModel.value.operatorOpenId = "";
    window.$message?.warning("无法获取该角色的平台ID，请重新选择");
  }
}

// 清空操作员角色搜索
function clearOperatorRoleSearch() {
  formModel.value.operatorOpenId = "";
  setOperatorRoleSearchInput("");
  operatorRoleSearchResults.value = [];
}

// 更新表单数据的辅助函数
function updateFormData() {
  if (props.roleData) {
    // 使用字符串保持精度,避免大数字丢失精度
    formModel.value.targetOpenId = String(props.roleData.openId || "");
    formModel.value.roleName = String(props.roleData.roleName || "");
  } else {
    formModel.value.targetOpenId = "";
    formModel.value.roleName = "";
  }
  formModel.value.operatorOpenId = "";
  clearOperatorRoleSearch();
}

// 监听角色数据变化,回显平台ID和角色名称
watch(
  () => props.roleData,
  (newData) => {
    if (newData) {
      // 如果模态框已打开，立即更新表单数据
      if (visible.value) {
        updateFormData();
      }
    }
  },
  { immediate: true }
);

// 关闭弹框
function handleClose() {
  visible.value = false;
  // 只清空操作员相关的数据，保留目标角色的数据
  formModel.value.operatorOpenId = "";
  clearOperatorRoleSearch();
}

// 监听弹框显示状态，重新初始化数据
watch(visible, (newVal) => {
  if (newVal) {
    // 弹框打开时，重新初始化目标角色数据
    // 使用 nextTick 确保在 DOM 更新后设置值
    nextTick(() => {
      updateFormData();
    });
  }
});

// 确认登录
function handleConfirm() {
  if (!formModel.value.operatorOpenId.trim()) {
    window.$message?.warning($t('page.manage.gmuser.pleaseInputOperatorOpenId'));
    return;
  }
  if (!formModel.value.targetOpenId.trim()) {
    window.$message?.warning($t('page.manage.gmuser.pleaseSelectUser'));
    return;
  }

  // 验证是否为纯数字格式（使用字符串保持精度）
  if (!/^\d+$/.test(formModel.value.operatorOpenId)) {
    window.$message?.warning($t('page.manage.gmuser.pleaseInputValidOperatorOpenId'));
    return;
  }
  if (!/^\d+$/.test(formModel.value.targetOpenId)) {
    window.$message?.warning($t('page.manage.gmuser.invalidTargetOpenId'));
    return;
  }

  // 确保传递的是 openId（字符串格式），不是 roleId
  // 直接使用字符串值，不进行任何转换，避免精度丢失
  emit("confirm", {
    operatorOpenId: formModel.value.operatorOpenId,
    targetOpenId: formModel.value.targetOpenId,
  });
  handleClose();
}
</script>

<template>
  <NModal
    v-model:show="visible"
    preset="card"
    :title="$t('page.manage.gmuser.shadowLogin')"
    class="w-600px"
    :segmented="{
      content: true,
      footer: 'soft',
    }"
  >
    <NAlert type="info" :show-icon="true" class="mb-16px">
      {{ $t('page.manage.gmuser.shadowLoginTip') }}
    </NAlert>

    <NForm :model="formModel" label-placement="left" :label-width="120">
      <NFormItem label="超登目标" path="roleName">
        <NInput
          v-model:value="formModel.roleName"
          placeholder="超登目标"
          disabled
        />
      </NFormItem>

      <NFormItem label="操作员角色" path="operatorRole">
        <div class="relative w-full">
          <NInput
            v-model:value="operatorRoleSearchInput"
            clearable
            placeholder="请输入角色名称或ID搜索"
            @clear="clearOperatorRoleSearch"
          />
          <div
            v-if="operatorRoleSearchInput && operatorRoleSearchResults.length > 0"
            class="absolute left-0 right-0 top-full z-50 mt-1 w-full max-h-[260px] overflow-y-auto rounded-md shadow-sm"
            :class="[
              themeStore.darkMode
                ? 'bg-[rgb(44,44,50)] border border-[#333]'
                : 'bg-white border border-[#e5e7eb]'
            ]"
          >
            <div
              v-for="role in operatorRoleSearchResults"
              :key="role.roleId + role.roleName"
              class="cursor-pointer px-12px py-10px text-13px transition-colors duration-200 border-b last:border-b-0"
              :class="[
                themeStore.darkMode
                  ? 'hover:bg-[rgb(55,55,60)] border-[#333] text-white'
                  : 'hover:bg-[#f3f4f6] border-[#e5e7eb] text-[#1f1f1f]'
              ]"
              @click="handleSelectOperatorRole(role)"
            >
              <div class="font-medium">
                {{ role.roleName || role.roleId }}
              </div>
              <div
                class="mt-4px text-12px"
                :class="themeStore.darkMode ? 'text-[#aaa]' : 'text-[#666]'"
              >
                ID: {{ role.roleId }}
              </div>
              <div
                v-if="role.serverName"
                class="mt-2px text-12px"
                :class="themeStore.darkMode ? 'text-[#aaa]' : 'text-[#666]'"
              >
                {{ role.serverName }}
              </div>
            </div>
          </div>
        </div>
      </NFormItem>
    </NForm>

    <template #footer>
      <NSpace justify="end">
        <NButton @click="handleClose">
          {{ $t("common.cancel") }}
        </NButton>
        <NButton type="primary" @click="handleConfirm">
          {{ $t("common.confirm") }}
        </NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped></style>

