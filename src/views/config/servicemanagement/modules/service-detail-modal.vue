<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useFormRules, useNaiveForm } from "@/hooks/common/form";
import { $t } from "@/locales";
import {
  fetchGetServiceParamList,
  fetchAddServiceParam,
  fetchUpdateServiceParam,
  fetchDeleteServiceParam,
} from "@/service/api/game-manage";
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";

defineOptions({
  name: "ServiceDetailModal",
});

interface Props {
  serviceId: number | null;
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

const loading = ref(false);
const serviceInfo = ref<any>(null);
const editingParam = ref<any>(null);
const paramDrawerVisible = ref(false);
const selectedServiceType = ref<string>("");

// 参数表单
const paramForm = ref({
  paramCode: "",
  paramName: "",
  paramType: "",
  paramUnit: "",
  helpText: "",
  sortOrder: 1,
});

// 参数列表
const paramsList = ref<any[]>([]);

// 加载服务数据
async function loadServiceData() {
  if (!props.serviceId) return;

  loading.value = true;
  try {
    // 获取服务参数列表
    const paramsResponse = await fetchGetServiceParamList({
      serviceTypeId: props.serviceId,
    });
    if (paramsResponse.data) {
      paramsList.value = paramsResponse.data.rows || paramsResponse.data || [];
    }

    // 尝试从全局获取服务数据，如果没有则使用默认值
    const currentServiceData = (window as any).currentServiceData;
    if (currentServiceData) {
      serviceInfo.value = {
        id: currentServiceData.id,
        serviceType:
          currentServiceData.typeCode || currentServiceData.serviceType,
        serviceName:
          currentServiceData.typeName ||
          currentServiceData.serviceName ||
          `服务类型 ${props.serviceId}`,
        typeName:
          currentServiceData.typeName ||
          currentServiceData.serviceName ||
          `服务类型 ${props.serviceId}`,
        description: currentServiceData.description || "服务详细配置",
      };
    } else {
      // 默认值
      serviceInfo.value = {
        id: props.serviceId,
        serviceType: "service",
        serviceName: `服务类型 ${props.serviceId}`,
        typeName: `服务类型 ${props.serviceId}`,
        description: "服务详细配置",
      };
    }
  } catch (error) {
    console.error("加载服务数据失败:", error);
    window.$message?.error("加载服务数据失败");
  } finally {
    loading.value = false;
  }
}

// 添加参数
function handleAddParam() {
  editingParam.value = null;
  selectedServiceType.value = "";
  // 显示空白表单
  paramForm.value = {
    paramCode: "",
    paramName: "",
    paramType: "",
    paramUnit: "",
    helpText: "",
    sortOrder: 1,
  };
  paramDrawerVisible.value = true;
}

// 编辑参数
function handleEditParam(param: any) {
  editingParam.value = param;
  // 处理字段名映射，支持驼峰和下划线两种格式
  paramForm.value = {
    paramCode: param.paramCode || param.param_code || "",
    paramName: param.paramName || param.param_name || "",
    paramType: param.paramType || param.param_type || "",
    paramUnit: param.paramUnit || param.param_unit || "",
    helpText: param.helpText || param.help_text || "",
    sortOrder: param.sortOrder || param.sort_order || 1,
  };
  paramDrawerVisible.value = true;
}

// 删除参数
async function handleDeleteParam(id: number) {
  try {
    const response = await fetchDeleteServiceParam({ id });
    if (response.data) {
      window.$message?.success("参数删除成功");
      // 从列表中移除
      const index = paramsList.value.findIndex((p) => p.id === id);
      if (index > -1) {
        paramsList.value.splice(index, 1);
      }
    }
  } catch (error) {
    console.error("删除参数失败:", error);
    window.$message?.error("删除参数失败");
  }
}

// 保存参数
async function handleSaveParam() {
  await validate();

  try {
    loading.value = true;

    // 添加serviceTypeId到参数数据中
    const paramData = {
      ...paramForm.value,
      serviceTypeId: props.serviceId,
    };

    if (editingParam.value) {
      // 更新参数
      const response = await fetchUpdateServiceParam({
        ...paramData,
        id: editingParam.value.id,
      });
      if (handleApiResponseError(response, "更新参数")) {
        return;
      }
      // 更新列表中的参数
      const index = paramsList.value.findIndex(
        (p) => p.id === editingParam.value.id
      );
      if (index > -1) {
        paramsList.value[index] = {
          ...paramData,
          id: editingParam.value.id,
        } as any;
      }
      window.$message?.success("参数更新成功");
    } else {
      // 创建参数
      const response = await fetchAddServiceParam(paramData);
      if (handleApiResponseError(response, "创建参数")) {
        return;
      }
      // 重新加载参数列表
      await loadServiceData();
      window.$message?.success("参数创建成功");
    }

    paramDrawerVisible.value = false;
  } catch (error: any) {
    handleApiCatchError(error, "操作失败");
  } finally {
    loading.value = false;
  }
}

function closeModal() {
  visible.value = false;
}

watch(visible, () => {
  if (visible.value && props.serviceId) {
    loadServiceData();
    restoreValidation();
  }
});
</script>

<template>
  <NModal
    v-model:show="visible"
    preset="card"
    style="width: 1000px; height: 80vh"
    :title="`${serviceInfo?.serviceName || '服务'} - 参数配置`"
  >
    <template #header>
      <div class="flex items-center gap-12px">
        <div v-if="serviceInfo" class="flex items-center gap-12px">
          <div
            class="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-lg"
          >
            {{ serviceInfo.serviceType?.charAt(0)?.toUpperCase() || "S" }}
          </div>
          <div>
            <div class="text-lg font-semibold">
              {{ serviceInfo.serviceName }}
            </div>
            <div class="text-sm text-gray-500">
              {{ serviceInfo.serviceType }}
            </div>
          </div>
        </div>
      </div>
    </template>

    <NSpin :show="loading">
      <div
        v-if="serviceInfo"
        class="space-y-24px max-h-[60vh] overflow-y-auto pr-4"
      >
        <!-- 服务描述 -->
        <div class=" p-16px rounded-lg">
          <div class="text-sm text-gray">{{ serviceInfo.description }}</div>
        </div>

        <!-- 参数定义区域 -->
        <div>
          <div class="flex items-center justify-between mb-16px">
            <div class="flex items-center gap-8px">
              <icon-ic-round-settings class="text-18px text-blue-500" />
              <span class="text-16px font-medium"
                >参数定义 ({{ paramsList.length }}个)</span
              >
            </div>
            <NButton type="primary" size="small" @click="handleAddParam">
              <template #icon>
                <icon-ic-round-plus />
              </template>
              添加参数
            </NButton>
          </div>

          <!-- 参数列表 -->
          <div v-if="paramsList.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-16px">
            <div
              v-for="param in paramsList"
              :key="param.id"
              class="border border-gray-200 rounded-lg p-16px hover:shadow-md transition-shadow"
            >
              <div class="flex items-start justify-between mb-8px">
                <div class="flex-1">
                  <!-- 参数名称 - 主要信息 -->
                  <div class="mb-4px flex items-center gap-2">
                    <span class="text-gray text-sm">参数名称:</span>
                    <span class="text-base font-medium text-gray">{{
                      param.paramName || param.param_name || "未命名参数"
                    }}</span>
                  </div>

                  <!-- 紧凑的信息行 -->
                  <div class="space-y-1 text-sm text-gray-600">
                    <div class="flex items-center gap-2">
                      <span class="text-gray w-10 text-sm">代码:</span>
                      <span class="font-mono text-sm">{{
                        param.paramCode || param.param_code || "-"
                      }}</span>
                    </div>

                    <div class="flex items-center gap-2">
                      <span class="text-gray w-10 text-sm">类型:</span>
                      <span class="text-sm">{{
                        param.paramType || param.param_type || "-"
                      }}</span>
                    </div>

                    <div
                      v-if="param.paramUnit || param.param_unit"
                      class="flex items-center gap-2"
                    >
                      <span class="text-gray w-10 text-sm">单位:</span>
                      <span class="text-sm">{{
                        param.paramUnit || param.param_unit
                      }}</span>
                    </div>

                    <div class="flex items-center gap-2">
                      <span class="text-gray w-10 text-sm">排序:</span>
                      <span class="text-sm">{{
                        param.sortOrder || param.sort_order || "-"
                      }}</span>
                    </div>

                    <div v-if="param.helpText || param.help_text" class="mt-2">
                      <div class="text-gray text-sm mb-1">说明:</div>
                      <div class="text-gray text-sm leading-relaxed">
                        {{ param.helpText || param.help_text }}
                      </div>
                    </div>
                  </div>
                </div>
                <NDropdown
                  :options="[
                    { label: '编辑', key: 'edit' },
                    { label: '删除', key: 'delete' },
                  ]"
                  @select="
                    (key) => {
                      if (key === 'edit') handleEditParam(param);
                      else if (key === 'delete') handleDeleteParam(param.id);
                    }
                  "
                >
                  <NButton text size="small">
                    <icon-ic-round-more-vert />
                  </NButton>
                </NDropdown>
              </div>
            </div>
          </div>

          <!-- 空状态提示 -->
          <div v-else class="text-center py-32px">
            <icon-ic-round-settings class="text-48px text-gray-300 mb-16px" />
            <div class="text-gray-500 mb-8px">该服务还没有配置参数</div>
            <div class="text-sm text-gray-400 mb-16px">点击上方"添加参数"按钮开始配置</div>
            <NButton type="primary" @click="handleAddParam">
              <template #icon>
                <icon-ic-round-plus />
              </template>
              立即添加参数
            </NButton>
          </div>
        </div>
      </div>
    </NSpin>

    <template #action>
      <NSpace justify="end">
        <NButton @click="closeModal"> 关闭 </NButton>
      </NSpace>
    </template>
  </NModal>

  <!-- 参数编辑抽屉 -->
  <NDrawer v-model:show="paramDrawerVisible" :width="600" :height="100">
    <NDrawerContent :title="editingParam ? '编辑参数' : '添加参数'" closable>
      <div class="max-h-[80vh] overflow-y-auto pr-4">
        <NForm
          ref="formRef"
          :model="paramForm"
          label-placement="left"
          label-width="100"
        >
          <NFormItem label="所属服务" path="serviceName">
            <NInput
              :value="
                serviceInfo?.serviceName ||
                serviceInfo?.typeName ||
                `服务 ${props.serviceId}`
              "
              readonly
              disabled
              placeholder="当前服务名称"
            />
            <template #feedback>
              <span class="text-xs text-gray"
                >当前服务的名称，不可修改</span
              >
            </template>
          </NFormItem>

          <NFormItem
            label="参数代码"
            path="paramCode"
            :rule="defaultRequiredRule"
          >
            <NInput
              v-model:value="paramForm.paramCode"
              placeholder="如：cpu_cores"
            />
            <template #feedback>
              <span class="text-xs text-gray-500"
                >用于配置文件的键名，建议使用下划线命名</span
              >
            </template>
          </NFormItem>

          <NFormItem
            label="参数名称"
            path="paramName"
            :rule="defaultRequiredRule"
          >
            <NInput
              v-model:value="paramForm.paramName"
              placeholder="如：CPU核数"
            />
          </NFormItem>

          <NFormItem
            label="参数类型"
            path="paramType"
            :rule="defaultRequiredRule"
          >
            <NInput
              v-model:value="paramForm.paramType"
              placeholder="如：number、string、text等"
            />
          </NFormItem>

          <NFormItem label="参数单位" path="paramUnit">
            <NInput
              v-model:value="paramForm.paramUnit"
              placeholder="如：核、GB、MB等（可选）"
            />
          </NFormItem>

          <NFormItem
            label="帮助文本"
            path="helpText"
            :rule="defaultRequiredRule"
          >
            <NInput
              v-model:value="paramForm.helpText"
              type="textarea"
              placeholder="请输入参数说明"
              :rows="3"
            />
          </NFormItem>

          <NFormItem label="排序" path="sortOrder">
            <NInputNumber
              v-model:value="paramForm.sortOrder"
              :min="1"
              placeholder="参数显示顺序"
              style="width: 100%"
            />
          </NFormItem>
        </NForm>
      </div>

      <template #footer>
        <NSpace>
          <NButton @click="paramDrawerVisible = false">取消</NButton>
          <NButton type="primary" @click="handleSaveParam" :loading="loading">
            {{ editingParam ? "更新" : "创建" }}
          </NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped>
.space-y-24px > * + * {
  margin-top: 24px;
}
</style>
