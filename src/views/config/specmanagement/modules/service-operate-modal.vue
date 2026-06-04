<script setup lang="tsx">
import { NButton, NModal, NSelect, NInputNumber, NInput, NSpace, NTag } from 'naive-ui';
import { ref, computed, watch, onMounted } from 'vue';
import { fetchGetServiceList, fetchGetServiceParamList, fetchUpdateSpec } from '@/service/api/game-manage';
import { handleApiResponseError, handleApiCatchError } from '@/utils/common';

defineOptions({
  name: 'ServiceOperateModal'
});

interface ServiceOperateProps {
  visible: boolean;
  operateType: 'add' | 'edit';
  specId: number | null;
  specData: any;
  originalService?: any;
  specServicesMap: Record<string, any[]>;
}

interface ServiceOperateEmits {
  (e: 'update:visible', value: boolean): void;
  (e: 'success'): void;
}

const props = withDefaults(defineProps<ServiceOperateProps>(), {
  visible: false,
  operateType: 'add',
  specId: null,
  specData: null,
  originalService: null
});

const emit = defineEmits<ServiceOperateEmits>();

// 服务操作相关状态
const serviceTypes = ref<any[]>([]);
const loadingServiceTypes = ref(false);
const currentOperatingService = ref({
  selectedServiceType: '',
  serviceCount: 1,
  serviceParams: [] as any[]
});

// 计算属性
const modalVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
});

const modalTitle = computed(() => {
  return props.operateType === 'add' ? '添加服务' : '编辑服务';
});

// 可选择的服务类型选项
const availableServiceOptions = computed(() => {
  if (!props.specId) return [];

  // 编辑模式下，包含当前编辑的服务类型
  if (props.operateType === 'edit') {
    const currentServices = props.specServicesMap[props.specId] || [];
    const usedServiceTypes = currentServices
      .filter(s => s.serviceTypeId !== props.originalService?.serviceTypeId)
      .map(s => s.serviceTypeCode);

    return serviceTypes.value
      .filter(service => !usedServiceTypes.includes(service.typeCode))
      .map(service => ({
        label: `${service.typeName} (${service.typeCode})`,
        value: service.typeCode
      }));
  }

  // 新增模式下，排除已使用的服务类型
  const currentServices = props.specServicesMap[props.specId] || [];
  const usedServiceTypes = currentServices.map(s => s.serviceTypeCode);

  return serviceTypes.value
    .filter(service => !usedServiceTypes.includes(service.typeCode))
    .map(service => ({
      label: `${service.typeName} (${service.typeCode})`,
      value: service.typeCode
    }));
});

// 当前选择的服务信息
const selectedServiceInfo = computed(() => {
  return serviceTypes.value.find(type => type.typeCode === currentOperatingService.value.selectedServiceType);
});

// 加载服务类型列表
async function loadServiceTypes() {
  try {
    loadingServiceTypes.value = true;
    const response = await fetchGetServiceList({
      current: 1,
      size: 100
    });

    let services: any[] = [];
    if (response.data?.records) {
      services = response.data.records;
    } else if (Array.isArray(response.data)) {
      services = response.data;
    }

    serviceTypes.value = services.filter(service => service.isEnabled);
  } catch (error) {
    handleApiCatchError(error, '加载服务列表');
  } finally {
    loadingServiceTypes.value = false;
  }
}

// 加载服务参数
async function loadServiceParams(serviceTypeId: number) {
  try {
    const paramListResponse = await fetchGetServiceParamList({ serviceTypeId });

    let paramDefinitions: any[] = [];
    if (paramListResponse.data) {
      paramDefinitions = Array.isArray(paramListResponse.data)
        ? paramListResponse.data
        : paramListResponse.data.records || paramListResponse.data.rows || [];
    }

    // 只在新增模式下重置参数，编辑模式保持现有参数值
    if (props.operateType === 'add') {
      currentOperatingService.value.serviceParams = paramDefinitions.map((param: any) => ({
        id: param.id,
        paramCode: param.paramCode || param.param_code,
        paramName: param.paramName || param.param_name,
        paramType: param.paramType || param.param_type || 'string',
        paramUnit: param.paramUnit || param.param_unit,
        helpText: param.helpText || param.help_text,
        placeholder: param.helpText || param.help_text || `请输入${param.paramName || param.param_name}`,
        paramValue: param.paramType === 'number' ? 0 : ''
      }));
    }
  } catch (error) {
    handleApiCatchError(error, '加载服务参数');
    if (props.operateType === 'add') {
      currentOperatingService.value.serviceParams = [];
    }
  }
}

// 重置服务操作表单
function resetServiceOperateForm() {
  currentOperatingService.value.selectedServiceType = '';
  currentOperatingService.value.serviceCount = 1;
  currentOperatingService.value.serviceParams = [];
}

// 初始化编辑模式数据
function initEditMode() {
  if (props.operateType === 'edit' && props.originalService) {
    currentOperatingService.value.selectedServiceType = props.originalService.serviceTypeCode;
    currentOperatingService.value.serviceCount = props.originalService.count || 1;

    // 转换参数格式
    const params = props.originalService.params || {};
    currentOperatingService.value.serviceParams = Object.keys(params).map(key => {
      const param = params[key];
      let value = param.value !== undefined ? param.value : (param.paramValue || '');

      // 如果是数字类型，确保转换为数字
      if (param.type === 'number' && typeof value === 'string') {
        value = value === '' ? 0 : Number(value);
      }

      return {
        id: key,
        paramCode: key,
        paramName: param.name || key,
        paramType: param.type || 'string',
        paramUnit: param.unit || '',
        helpText: param.helpText || '',
        placeholder: param.helpText || `请输入${param.name || key}`,
        paramValue: value
      };
    });
  }
}

// 监听服务类型选择，自动加载参数
watch(() => currentOperatingService.value.selectedServiceType, async (newServiceType) => {
  if (newServiceType && props.operateType === 'add') {
    const service = serviceTypes.value.find(s => s.typeCode === newServiceType);
    if (service) {
      await loadServiceParams(service.id);
    }
  } else if (!newServiceType && props.operateType === 'add') {
    currentOperatingService.value.serviceParams = [];
  }
});

// 监听弹框显示状态
watch(() => props.visible, async (visible) => {
  if (visible) {
    await loadServiceTypes();
    if (props.operateType === 'add') {
      resetServiceOperateForm();
    } else {
      initEditMode();
    }
  }
});

// 确认服务操作（新增或编辑）
async function confirmServiceOperate() {
  if (!currentOperatingService.value.selectedServiceType) {
    window.$message?.warning('请选择服务类型');
    return;
  }

  if (!props.specId) return;

  try {
    const selectedService = serviceTypes.value.find(s => s.typeCode === currentOperatingService.value.selectedServiceType);
    if (!selectedService) return;

    // 获取当前规格的所有服务
    const currentServices = props.specServicesMap[props.specId] || [];

    let allServiceConfigs: any[] = [];

    if (props.operateType === 'add') {
      // 新增模式：检查是否已经存在相同的服务类型
      const existingService = currentServices.find(s => s.serviceTypeCode === selectedService.typeCode);
      if (existingService) {
        window.$message?.warning('该服务类型已存在');
        return;
      }

      // 构建新服务配置
      const newServiceConfig = {
        serviceTypeId: selectedService.id,
        count: currentOperatingService.value.serviceCount,
        paramValues: currentOperatingService.value.serviceParams.reduce((acc, param) => {
          acc[param.paramCode] = String(param.paramValue || '');
          return acc;
        }, {} as Record<string, string>)
      };

      // 构建所有服务配置（包括新添加的）
      allServiceConfigs = [
        ...currentServices.map(s => ({
          serviceTypeId: s.serviceTypeId,
          count: s.count,
          paramValues: s.params ? Object.keys(s.params).reduce((acc, key) => {
            const param = s.params[key];
            acc[key] = String(param.value || param.paramValue || '');
            return acc;
          }, {} as Record<string, string>) : {}
        })),
        newServiceConfig
      ];
    } else {
      // 编辑模式：更新现有服务的配置
      allServiceConfigs = currentServices.map(s => {
        // 如果是当前编辑的服务，使用编辑后的配置
        if (s.serviceTypeId === props.originalService?.serviceTypeId) {
          return {
            serviceTypeId: selectedService.id,
            count: currentOperatingService.value.serviceCount,
            paramValues: currentOperatingService.value.serviceParams.reduce((acc, param) => {
              acc[param.paramCode] = String(param.paramValue || '');
              return acc;
            }, {} as Record<string, string>)
          };
        }
        // 其他服务保持原样
        return {
          serviceTypeId: s.serviceTypeId,
          count: s.count,
          paramValues: s.params ? Object.keys(s.params).reduce((acc, key) => {
            const param = s.params[key];
            acc[key] = String(param.value || param.paramValue || '');
            return acc;
          }, {} as Record<string, string>) : {}
        };
      });
    }

    // 调用更新接口
    const response = await fetchUpdateSpec({
      id: props.specId,
      specName: props.specData?.specName,
      specCode: props.specData?.specCode,
      description: props.specData?.description,
      applicableScene: props.specData?.applicableScene,
      isDefault: props.specData?.isDefault || 0,
      isEnabled: props.specData?.isEnabled || true,
      sortOrder: props.specData?.sortOrder || 1,
      serviceConfigs: allServiceConfigs
    });

    const operationText = props.operateType === 'add' ? '添加服务' : '编辑服务';
    if (!handleApiResponseError(response, operationText)) {
      window.$message?.success(`${operationText}成功`);
      modalVisible.value = false;
      emit('success');
    }
  } catch (error: any) {
    const operationText = props.operateType === 'add' ? '添加服务' : '编辑服务';
    handleApiCatchError(error, operationText);
  }
}

// 关闭弹框
function handleClose() {
  modalVisible.value = false;
}
</script>

<template>
  <NModal
    v-model:show="modalVisible"
    preset="card"
    :title="modalTitle"
    style="width: 700px; height: 700px"
    :segmented="{ content: 'soft', footer: 'soft' }"
  >
    <div class="h-[480px] overflow-y-auto">
      <!-- 选择服务类型 -->
      <div class="mb-16px">
        <div class="font-medium mb-8px">选择服务类型</div>
        <NSelect
          v-model:value="currentOperatingService.selectedServiceType"
          :options="availableServiceOptions"
          :loading="loadingServiceTypes"
          placeholder="请选择服务类型"
          clearable
          :disabled="operateType === 'edit'"
        />
        <div v-if="availableServiceOptions.length === 0 && !loadingServiceTypes && operateType === 'add'" class="text-xs text-gray-400 mt-4px">
          所有服务类型都已添加
        </div>
        <div v-if="operateType === 'edit'" class="text-xs text-gray-400 mt-4px">
          编辑模式下不可更改服务类型
        </div>
      </div>

      <!-- 服务信息展示 -->
      <div v-if="selectedServiceInfo" class="mb-16px">
        <div class="rounded-lg p-12px border border-gray-200">
          <div class="flex items-center gap-8px mb-8px">
            <div class="w-2 h-2 bg-indigo-500 rounded-full"></div>
            <span class="text-sm font-medium text-indigo">服务信息</span>
          </div>
          <div class="space-y-6px">
            <div class="flex items-center justify-between text-sm">
              <span class="text-gray">服务名称</span>
              <span class="font-medium text-gray">{{ selectedServiceInfo.typeName }}</span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-gray">服务代码</span>
              <span class="font-mono px-2 py-1 rounded text-gray text-xs border border-gray">{{ selectedServiceInfo.typeCode }}</span>
            </div>
            <div v-if="selectedServiceInfo.description" class="pt-4px">
              <div class="text-xs text-gray mb-2px">描述</div>
              <div class="text-sm text-gray p-2 rounded text-xs leading-relaxed border border-gray">{{ selectedServiceInfo.description }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 实例数量 -->
      <div v-if="selectedServiceInfo" class="mb-16px">
        <div class="rounded-lg p-12px border border-gray">
          <div class="flex items-center gap-8px mb-8px">
            <div class="w-2 h-2 bg-amber rounded-full"></div>
            <span class="text-sm font-medium text-amber">实例数量</span>
          </div>
          <NInputNumber
            v-model:value="currentOperatingService.serviceCount"
            :min="1"
            :max="1000"
            placeholder="请输入实例数量"
            size="small"
            style="width: 100%"
            :show-button="true"
          />
          <div class="text-xs text-gray mt-6px flex items-center gap-4px">
            <div class="w-1 h-1 bg-gray rounded-full"></div>
            <span>建议根据负载情况设置合适的实例数量</span>
          </div>
        </div>
      </div>

      <!-- 服务参数配置 -->
      <div v-if="selectedServiceInfo" class="mb-16px">
        <div class="rounded-lg p-12px border border-gray">
          <div class="flex items-center gap-8px mb-12px">
            <div class="w-2 h-2 bg-emerald rounded-full"></div>
            <span class="text-sm font-medium text-emerald">服务参数配置</span>
            <span v-if="currentOperatingService.serviceParams.length > 0" class="text-xs text-gray px-2 py-1 rounded-full">
              {{ currentOperatingService.serviceParams.length }} 个参数
            </span>
          </div>

          <div v-if="currentOperatingService.serviceParams.length > 0" class="grid grid-cols-2 gap-16px">
            <div
              v-for="param in currentOperatingService.serviceParams"
              :key="param.id"
              class="space-y-8px"
            >
              <!-- 参数标题 -->
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-6px">
                  <span class="text-sm font-medium text-gray">{{ param.paramCode }}</span>
                  <span v-if="param.paramUnit" class="text-xs text-gray">({{ param.paramUnit }})</span>
                </div>
                <NTag size="small" :type="param.paramType === 'number' ? 'info' : 'success'">
                  {{ param.paramType }}
                </NTag>
              </div>

              <!-- 参数值输入框 -->
              <div>
                <NInputNumber
                  v-if="param.paramType === 'number'"
                  v-model:value="param.paramValue"
                  :placeholder="param.placeholder"
                  size="small"
                  style="width: 100%"
                  :min="0"
                  :show-button="false"
                />
                <NInput
                  v-else
                  v-model:value="param.paramValue"
                  :placeholder="param.placeholder"
                  size="small"
                />
              </div>
            </div>
          </div>

          <div v-else class="text-center py-12px text-gray">
            <div class="text-sm">该服务暂无参数配置</div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <NSpace justify="end">
        <NButton @click="handleClose">取消</NButton>
        <NButton
          type="primary"
          @click="confirmServiceOperate"
          :disabled="!selectedServiceInfo"
          :loading="loadingServiceTypes"
        >
          {{ operateType === 'add' ? '添加' : '保存' }}
        </NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped></style>
