<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useFormRules, useNaiveForm } from "@/hooks/common/form";
import { useAuth } from '@/hooks/business/auth';
import { fetchAddSpec, fetchUpdateSpec, fetchGetSpecServiceList } from "@/service/api/game-manage";
import { handleApiResponseError, handleApiCatchError } from '@/utils/common';
import { specSceneTypeOptions, specTypeOptions, specStatusOptions } from '@/constants/business';
// @ts-ignore
import ServiceOperateModal from './service-operate-modal.vue';

defineOptions({
  name: "SpecOperateDrawer",
});

interface Props {
  /** the type of operation */
  operateType: NaiveUI.TableOperateType;
  /** the edit row data */
  rowData?: any | null;
  /** whether to hide service operations (add/edit/delete) */
  hideServiceOperations?: boolean;
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
const { hasAuth } = useAuth();

const title = computed(() => {
  const titles: Record<NaiveUI.TableOperateType, string> = {
    add: "创建规格模板",
    edit: "编辑规格模板",
  };
  return titles[props.operateType];
});


// 状态选项 - 使用国际化
const statusOptions = computed(() => {
  return specStatusOptions.map(option => ({
    label: option.label,
    value: option.value === 'true'
  }));
});

type Model = {
  specName: string;
  specCode: string;
  description: string;
  applicableScene: string; // 适用场景：'small' | 'medium' | 'large'
  specType: string; // 规格类型：'NORMAL' | 'CROSS'
  isDefault: number;
  isEnabled: boolean;
  sortOrder: number;
  maxUser: number;    // 最大人数（必填）
  busyUser: number;   // 忙碌人数（必填）
  fullUser: number;   // 满员人数（必填）
  // 服务配置
  services: Array<{
    serviceTypeId: number;
    typeName: string;
    typeCode: string;
    count: number;
    description?: string;
    params: Record<string, any>;
  }>;
};

const model = ref(createDefaultModel());

function createDefaultModel(): Model {
  return {
    specName: "",
    specCode: "",
    description: "",
    applicableScene: "small",
    specType: "NORMAL",
    isDefault: 0,
    isEnabled: true,
    sortOrder: 1,
    maxUser: 0,
    busyUser: 0,
    fullUser: 0,
    services: [],
  };
}

const rules = computed(() => {
  return {
    specName: defaultRequiredRule,
    specCode: defaultRequiredRule,
    applicableScene: defaultRequiredRule,
    specType: defaultRequiredRule,
    description: defaultRequiredRule,
    isEnabled: defaultRequiredRule,
    sortOrder: defaultRequiredRule,
    maxUser: [
      {
        validator: (rule: any, value: number) => {
          if (value === undefined || value === null) {
            return new Error('请输入最大人数');
          }
          if (value < 0) {
            return new Error('最大人数不能为负数');
          }
          return true;
        },
        trigger: ['change', 'blur']
      }
    ],
    busyUser: [
      {
        validator: (rule: any, value: number) => {
          if (value === undefined || value === null) {
            return new Error('请输入忙碌人数');
          }
          if (value < 0) {
            return new Error('忙碌人数不能为负数');
          }
          if (value > model.value.maxUser) {
            return new Error('忙碌人数不能超过最大人数');
          }
          return true;
        },
        trigger: ['change', 'blur']
      }
    ],
    fullUser: [
      {
        validator: (rule: any, value: number) => {
          if (value === undefined || value === null) {
            return new Error('请输入满员人数');
          }
          if (value < 0) {
            return new Error('满员人数不能为负数');
          }
          if (value > model.value.maxUser) {
            return new Error('满员人数不能超过最大人数');
          }
          return true;
        },
        trigger: ['change', 'blur']
      }
    ],
  };
});

// 服务操作相关状态
const serviceOperateModalVisible = ref(false);
const serviceOperateType = ref<'add' | 'edit'>('add');
const currentOperatingService = ref<any>(null);
const loadingSpecServices = ref(false);

// 用于 ServiceOperateModal 的 specServicesMap
const specServicesMap = ref<Record<string, any[]>>({});

// 加载规格的服务配置 - 用于填充 specServicesMap
async function loadSpecServices(specId: number) {
  try {
    loadingSpecServices.value = true;
    const response = await fetchGetSpecServiceList({ specId });

    if (response.data) {
      const data = response.data;
      const mappedServices: any[] = [];

      // 解析服务数据
      if (data.detailConfigs) {
        for (const serviceTypeCode in data.detailConfigs) {
          const serviceConfigs = data.detailConfigs[serviceTypeCode];
          const serviceStats = data.serviceStats?.[serviceTypeCode];

          if (Array.isArray(serviceConfigs) && serviceConfigs.length > 0) {
            const config = serviceConfigs[0];
            const params: Record<string, any> = {};

            if (config.params) {
              Object.keys(config.params).forEach(paramKey => {
                const param = config.params[paramKey];
                params[paramKey] = {
                  name: param.paramName || paramKey,
                  value: param.paramValue || '',
                  paramValue: param.paramValue || '',
                  type: param.paramType || 'string',
                  unit: param.paramUnit || ''
                };
              });
            }

            mappedServices.push({
              serviceTypeId: serviceStats?.serviceTypeId || config.id,
              typeName: serviceStats?.serviceTypeName || config.instanceName || serviceTypeCode,
              typeCode: serviceStats?.serviceTypeCode || config.instanceCode || serviceTypeCode,
              serviceTypeName: serviceStats?.serviceTypeName || config.instanceName || serviceTypeCode,
              serviceTypeCode: serviceStats?.serviceTypeCode || config.instanceCode || serviceTypeCode,
              count: config.count || serviceStats?.count || 1,
              description: config.remark || '',
              params
            });
          }
        }
      }

      model.value.services = mappedServices;
      specServicesMap.value[specId] = mappedServices;
    }
  } catch (error) {
    handleApiCatchError(error, '加载规格服务配置');
  } finally {
    loadingSpecServices.value = false;
  }
}

function handleInitModel() {
  model.value = createDefaultModel();

  if (props.operateType === "edit" && props.rowData) {
    Object.assign(model.value, props.rowData);

    // 确保 isEnabled 字段为布尔值
    model.value.isEnabled = Boolean( props.rowData.isEnabled === true );

    // 编辑模式：加载规格下的服务配置
    if (props.rowData.id) {
      loadSpecServices(props.rowData.id);
    }
  }
}

function closeDrawer() {
  visible.value = false;
}

async function handleSubmit() {
  await validate();
  try {
    if (props.operateType === "add") {
      // 新增模式：分两步操作
      await handleAddSpec();
    } else {
      // 编辑模式：直接更新
      await handleUpdateSpec();
    }
  } catch (error: any) {
    handleApiCatchError(error, '提交规格模板');
  }
}

// 准备提交数据的辅助函数
function prepareSubmitData(includeId = false): any {
  const submitData: any = {
    specName: String(model.value.specName),
    specCode: String(model.value.specCode),
    description: String(model.value.description),
    applicableScene: String(model.value.applicableScene),
    specType: String(model.value.specType),
    isDefault: model.value.isDefault === 1 ? 1 : 0,
    isEnabled: Boolean(model.value.isEnabled),
    sortOrder: Number(model.value.sortOrder || 1),
    maxUser: Number(model.value.maxUser),
    busyUser: Number(model.value.busyUser),
    fullUser: Number(model.value.fullUser),
  };

  if (includeId) {
    submitData.id = props.rowData?.id;
  }

  // 添加服务配置
  if (model.value.services && model.value.services.length > 0) {
    submitData.serviceConfigs = model.value.services.map(service => ({
      serviceTypeId: Number(service.serviceTypeId),
      count: Number(service.count),
      paramValues: service.params ? Object.keys(service.params).reduce((acc, key) => {
        const param = service.params[key];
        let value = param;
        if (typeof param === 'object' && param !== null) {
          value = param.value !== undefined ? param.value :
                 param.paramValue !== undefined ? param.paramValue :
                 param;
        }
        acc[key] = String(value);
        return acc;
      }, {} as Record<string, string>) : {}
    }));
  }

  return submitData;
}

// 新增规格模板
async function handleAddSpec() {
  const submitData = prepareSubmitData(false);
  const response = await fetchAddSpec(submitData);

  if (handleApiResponseError(response, '创建规格模板')) {
    return;
  }
  window.$message?.success("规格模板创建成功");
  closeDrawer();
  emit("submitted");
}

// 更新规格模板
async function handleUpdateSpec() {
  const submitData = prepareSubmitData(true);
  const response = await fetchUpdateSpec(submitData);

  if (handleApiResponseError(response, '更新规格模板')) {
    return;
  }
  window.$message?.success("规格模板更新成功");
  closeDrawer();
  emit("submitted");
}


// 当前规格数据（用于ServiceOperateModal）
const currentSpecData = computed(() => model.value);

// 当前规格ID（用于ServiceOperateModal）
const currentSpecId = computed(() => props.rowData?.id || null);

// 开始添加服务
function startAddService() {
  serviceOperateType.value = 'add';
  currentOperatingService.value = null;
  serviceOperateModalVisible.value = true;
}

// 开始编辑服务
function startEditService(index: number) {
  const service = model.value.services[index];
  serviceOperateType.value = 'edit';
  currentOperatingService.value = service;
  serviceOperateModalVisible.value = true;
}

// 服务操作成功后的回调
async function handleServiceOperateSuccess() {
  // 重新加载服务数据
  if (props.rowData?.id) {
    await loadSpecServices(props.rowData.id);
  }
}

// 移除服务
function removeService(index: number) {
  model.value.services.splice(index, 1);
}

// 监听最大人数变化，重新验证忙碌人数和满员人数
watch(() => model.value.maxUser, async () => {
  if (formRef.value) {
    // 重新验证忙碌人数
    await formRef.value.validate(
      undefined,
      (rule) => rule?.key === 'busyUser'
    ).catch(() => {});
    // 重新验证满员人数
    await formRef.value.validate(
      undefined,
      (rule) => rule?.key === 'fullUser'
    ).catch(() => {});
  }
});

watch(visible, () => {
  if (visible.value) {
    handleInitModel();
    restoreValidation();
  }
});
</script>

<template>
  <NDrawer v-model:show="visible" display-directive="show" :width="600">
    <NDrawerContent :title="title" :native-scrollbar="false" closable>
      <NForm ref="formRef" :model="model" :rules="rules" label-placement="left" label-width="120">
        <!-- 基础信息 -->
        <NDivider title-placement="left">基础信息</NDivider>

        <NFormItem label="规格名称" path="specName">
          <NInput
            v-model:value="model.specName"
            placeholder="如: 小型游戏服规格"
          />
        </NFormItem>

        <NFormItem label="规格代码" path="specCode">
          <NInput
            v-model:value="model.specCode"
            placeholder="如: small_game"
            :disabled="props.operateType === 'edit'"
          />
          <template #feedback>
            <span class="text-12px text-gray-400">唯一标识，仅支持小写字母、数字和下划线</span>
          </template>
        </NFormItem>

        <NFormItem label="适用场景" path="applicableScene">
          <NSelect
            v-model:value="model.applicableScene"
            :options="specSceneTypeOptions"
            placeholder="请选择适用场景"
          />
        </NFormItem>

        <NFormItem label="排序" path="sortOrder">
          <NInputNumber
            v-model:value="model.sortOrder"
            placeholder="请输入排序值"
            :min="0"
            :step="1"
            class="w-full"
          />
          <template #feedback>
            <span class="text-12px text-gray-400">数值越小，排序越靠前</span>
          </template>
        </NFormItem>

        <NFormItem label="规格描述" path="description">
          <NInput
            v-model:value="model.description"
            type="textarea"
            placeholder="请输入规格模板说明"
            :rows="3"
          />
        </NFormItem>

        <!-- <NFormItem label="默认规格" path="isDefault">
          <NRadioGroup v-model:value="model.isDefault">
            <NRadio :value="0" label="否" />
            <NRadio :value="1" label="是" />
          </NRadioGroup>
          <template #feedback>
            <span class="text-12px text-gray-400">设为默认规格后，新建服务时将优先选择此规格</span>
          </template>
        </NFormItem> -->

        <NFormItem label="规格类型" path="specType">
          <NRadioGroup v-model:value="model.specType">
            <NRadio
              v-for="(item, index) in specTypeOptions"
              :key="index"
              :value="item.value"
              :label="item.label"
            />
          </NRadioGroup>
        </NFormItem>

        <NFormItem label="状态" path="isEnabled">
          <NRadioGroup v-model:value="model.isEnabled">
            <NRadio
              v-for="(item, index) in statusOptions"
              :key="index"
              :value="item.value"
              :label="item.label"
            />
          </NRadioGroup>
        </NFormItem>

        <!-- 人数配置 -->
        <NDivider title-placement="left">人数配置</NDivider>

        <NFormItem label="最大人数" path="maxUser">
          <NInputNumber
            v-model:value="model.maxUser"
            placeholder="服务器允许的最大在线人数"
            :min="0"
            :step="1"
            class="w-full"
          />
        </NFormItem>

        <NFormItem label="忙碌人数" path="busyUser">
          <NInputNumber
            v-model:value="model.busyUser"
            placeholder="达到此人数时服务器显示为忙碌状态"
            :min="0"
            :step="1"
            class="w-full"
          />
        </NFormItem>

        <NFormItem label="满员人数" path="fullUser">
          <NInputNumber
            v-model:value="model.fullUser"
            placeholder="达到此人数时服务器显示为满员状态"
            :min="0"
            :step="1"
            class="w-full"
          />
        </NFormItem>

        <!-- 配置规格服务 -->
        <NDivider v-if="!props.hideServiceOperations" title-placement="left">
          <div class="flex items-center gap-8px">
            <icon-ic-round-settings class="text-18px text-blue-500" />
            <span>配置规格服务</span>
          </div>
        </NDivider>

        <div v-if="!props.hideServiceOperations" class="mb-16px">
          <div class="text-sm mb-12px">
            选择服务类型，设置数量并配置相应的参数配置
          </div>

          <!-- 加载中状态 -->
          <div v-if="loadingSpecServices" class="flex items-center justify-center py-16px">
            <NSpin size="small" />
            <span class="ml-8px text-gray-500">正在加载服务配置...</span>
          </div>

          <div v-else-if="model.services.length === 0" class="border border-gray-200 rounded-lg p-12px">
            <div class="flex items-center gap-8px text-gray-400">
              <icon-ic-round-warning class="text-16px" />
              <span class="text-sm">暂无服务，点击下方"添加服务"开始配置</span>
            </div>
          </div>
        </div>

        <!-- 添加服务按钮 -->
        <div v-if="!loadingSpecServices && !props.hideServiceOperations" class="mb-16px">
          <NButton
            type="success"
            @click="startAddService"
          >
            <template #icon>
              <icon-ic-round-plus />
            </template>
            添加服务
          </NButton>
        </div>


        <!-- 服务列表 -->
        <div v-if="!loadingSpecServices && !props.hideServiceOperations && model.services && model.services.length > 0" class="space-y-12px mb-24px">
          <div
            v-for="(service, index) in model.services"
            :key="index"
            class="border border-gray-200 rounded-lg p-16px"
          >
            <div class="flex items-center justify-between mb-12px">
              <div class="flex items-center gap-8px">
                <div class="w-8 h-8 bg-blue rounded text-white text-xs flex items-center justify-center font-semibold">
                  {{ index + 1 }}
                </div>
                <span class="font-semibold text-gray">{{ service.typeName || '未配置' }}</span>
                <NTag v-if="service.typeCode" type="default" size="small">
                  {{ service.typeCode }}
                </NTag>
                <NTag v-if="service.count" type="info" size="small">
                  {{ service.count }}个实例
                </NTag>
              </div>
              <div v-if="!props.hideServiceOperations" class="flex items-center gap-8px">
                <NButton
                  v-if="hasAuth('game:specTemplate:update')"
                  text
                  type="primary"
                  size="small"
                  @click="startEditService(index)"
                >
                  <template #icon>
                    <icon-ic-round-edit />
                  </template>
                </NButton>
                <NButton
                  v-if="hasAuth('game:specTemplate:update')"
                  text
                  type="error"
                  size="small"
                  @click="removeService(index)"
                >
                  <template #icon>
                    <icon-ic-round-delete />
                  </template>
                </NButton>
              </div>
            </div>
            <div v-if="service.description" class="text-sm text-gray mb-8px">
              {{ service.description }}
            </div>

            <!-- 服务参数 -->
            <div v-if="service.params && Object.keys(service.params).length > 0" class="border border-gray rounded p-12px">
              <div class="font-semibold text-gray mb-8px flex items-center gap-4px">
                <icon-ic-round-settings class="text-14px" />
                <span>参数配置 ({{ Object.keys(service.params).length }}个)</span>
              </div>
              <div class="grid grid-cols-2 gap-8px text-xs">
                <div
                  v-for="(param, paramKey) in service.params"
                  :key="paramKey"
                  class="flex items-center justify-between py-4px px-6px rounded"
                >
                  <span class="text-grayfont-medium">{{ param.name || paramKey }}:</span>
                  <div class="flex items-center gap-4px">
                    <span class="font-mono text-blue font-semibold">{{ param.value }}</span>
                    <span v-if="param.unit" class="text-gray">({{ param.unit }})</span>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="text-xs text-gray italic">
              该服务暂无参数配置
            </div>
          </div>
        </div>

      </NForm>

      <template #footer>
        <NSpace :size="16">
          <NButton @click="closeDrawer">取消</NButton>
          <NButton type="primary" @click="handleSubmit">确认</NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>

  <!-- 服务操作弹窗 -->
  <ServiceOperateModal
    v-model:visible="serviceOperateModalVisible"
    :operate-type="serviceOperateType"
    :spec-id="currentSpecId"
    :spec-data="currentSpecData"
    :original-service="currentOperatingService"
    :spec-services-map="specServicesMap"
    @success="handleServiceOperateSuccess"
  />
</template>

<style scoped></style>
