<script setup lang="ts">
import { computed, ref, watch, onMounted, h } from "vue";
import { useFormRules, useNaiveForm } from "@/hooks/common/form";
import { NInput, NButton, NDataTable } from "naive-ui";
import {
  fetchAddProduct,
  fetchUpdateProduct,
} from "@/service/api";
import { $t } from "@/locales";
import { productTypeOptions as rawProductTypeOptions, productStatusOptions } from "@/constants/business";
import { translateOptions, handleApiResponseError, handleApiCatchError } from "@/utils/common";

defineOptions({
  name: "ProductOperateDrawer",
});

interface Props {
  /** the type of operation */
  operateType: NaiveUI.TableOperateType;
  /** the edit row data */
  rowData?: Api.SystemManage.product | null;
  /** 当前选中的渠道ID */
  chanelName?: string | number;
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

// 字段管理相关
interface FieldItem {
  id: string;
  fieldName: string;
  fieldValue: string;
  isEditing?: boolean;
  originalData?: {
    fieldName: string;
    fieldValue: string;
  };
}

const fieldData = ref<FieldItem[]>([]);

const title = computed(() => {
  const titles: Record<NaiveUI.TableOperateType, string> = {
    add: $t("page.manage.products.addProduct"),
    edit: $t("page.manage.products.editProduct"),
  };
  return titles[props.operateType];
});

type Model = Pick<
  Api.SystemManage.product,
  | "chanelName"
  | "gameId"
  | "productIndex"
  | "channelProductId"
  | "gameProductId"
  | "productName"
  | "productPrice"
  | "nativePrice"
  | "dollarPrice"
  | "productNumber"
  | "productDescribe"
  | "productType"
  | "enable"
  | "otherSetting"
  | "platformChannelId"
>
const model = ref(createDefaultModel());

function createDefaultModel(): Model {
  return {
    gameId:'101',
    chanelName:'',
    productIndex: 1,
    channelProductId: "",
    gameProductId: "",
    productName: "",
    productPrice: 0.00,
    nativePrice: 0.00,
    dollarPrice: 0.00,
    productNumber: 0,
    productDescribe: "",
    productType: null,
    enable: "true",
    otherSetting: "",
    platformChannelId: "",
  };
}

type RuleKey = Extract<keyof Model,
  | "channelProductId"
  | "gameProductId"
  | "productName"
  | "productPrice"
  | "nativePrice"
  | "dollarPrice"
  | "productNumber"
  | "productIndex"
  | "productDescribe"
  | "productType"
  | "enable"
>;

const rules: Record<RuleKey, App.Global.FormRule> = {
  channelProductId: defaultRequiredRule,
  gameProductId: defaultRequiredRule,
  productName: defaultRequiredRule,
  productPrice: defaultRequiredRule,
  nativePrice: defaultRequiredRule,
  dollarPrice: defaultRequiredRule,
  productNumber: defaultRequiredRule,
  productIndex: defaultRequiredRule,
  productDescribe: defaultRequiredRule,
  productType: defaultRequiredRule,
  enable: defaultRequiredRule,
};

const productTypeOptions = computed(() => {
  return translateOptions(rawProductTypeOptions).map(option => ({
    ...option,
    value: Number(option.value)
  }));
});

function handleInitModel() {
  model.value = createDefaultModel();
  fieldData.value = []; // 重置字段数据

  // 如果传入了渠道名称，设置chanelName字段
  if (props.chanelName) {
    model.value.chanelName = String(props.chanelName);
    // 新增模式下，将platformChannelId设置为与chanelName相同
    if (props.operateType === "add") {
      model.value.platformChannelId = String(props.chanelName);
    }
  }

  if (props.operateType === "edit" && props.rowData) {
    const editData = {
      ...props.rowData,
      productPrice: Number(props.rowData.productPrice) || 0,
      nativePrice: Number(props.rowData.nativePrice) || 0,
      dollarPrice: Number(props.rowData.dollarPrice) || 0,
      productNumber: Number(props.rowData.productNumber) || 0,
      productIndex: Number(props.rowData.productIndex) || 1,
      productType: props.rowData.productType ? Number(props.rowData.productType) : null,
      enable: String(props.rowData.enable),
      otherSetting: props.rowData.otherSetting || "",
      platformChannelId: props.rowData.platformChannelId || "",
    };
    Object.assign(model.value, editData);

    // 解析 otherSetting 到字段管理
    if (editData.otherSetting) {
      try {
        const otherData = JSON.parse(editData.otherSetting);
        fieldData.value = Object.entries(otherData).map(([key, value], index) => ({
          id: (Date.now() + index).toString(),
          fieldName: key,
          fieldValue: String(value),
          isEditing: false
        }));
      } catch (error) {
        console.warn('解析 otherSetting 失败:', error);
        fieldData.value = [];
      }
    }
  }
}

function closeDrawer() {
  visible.value = false;
}

// 字段管理函数
const fieldColumns = [
  {
    key: "fieldName",
    title: "字段名称",
    align: "center" as const,
    width: 150,
    render: (row: FieldItem) => {
      if (row.isEditing) {
        return h(NInput, {
          value: row.fieldName,
          placeholder: "请输入字段名称",
          onUpdateValue: (value: string) => {
            row.fieldName = value;
          },
          onBlur: () => handleAutoSave(row)
        });
      }
      return h('span', {
        style: { cursor: 'pointer', padding: '4px' },
        onClick: () => handleEditField(row)
      }, row.fieldName || '点击编辑');
    }
  },
  {
    key: "fieldValue",
    title: "字段值",
    align: "center" as const,
    width: 150,
    render: (row: FieldItem) => {
      if (row.isEditing) {
        return h(NInput, {
          value: row.fieldValue,
          placeholder: "请输入字段值",
          onUpdateValue: (value: string) => {
            row.fieldValue = value;
          },
          onBlur: () => handleAutoSave(row)
        });
      }
      return h('span', {
        style: { cursor: 'pointer', padding: '4px' },
        onClick: () => handleEditField(row)
      }, row.fieldValue || '点击编辑');
    }
  },
  {
    key: "actions",
    title: "操作",
    align: "center" as const,
    width: 100,
    render: (row: FieldItem) => {
      if (row.isEditing) {
        return h(NButton, {
          size: "small",
          onClick: () => handleCancelField(row)
        }, { default: () => "取消" });
      }
      return h(NButton, {
        size: "small",
        type: "error",
        onClick: () => handleDeleteField(row.id)
      }, { default: () => "删除" });
    }
  }
];

// 新增字段
function handleAddField() {
  const newField: FieldItem = {
    id: Date.now().toString(),
    fieldName: '',
    fieldValue: '',
    isEditing: true
  };
  fieldData.value.push(newField);
}

// 编辑字段
function handleEditField(field: FieldItem) {
  field.originalData = {
    fieldName: field.fieldName,
    fieldValue: field.fieldValue
  };
  field.isEditing = true;
}

// 取消编辑字段
function handleCancelField(field: FieldItem) {
  if (field.originalData) {
    field.fieldName = field.originalData.fieldName;
    field.fieldValue = field.originalData.fieldValue;
    delete field.originalData;
  } else {
    fieldData.value = fieldData.value.filter(item => item.id !== field.id);
  }
  field.isEditing = false;
}

// 自动保存字段
function handleAutoSave(field: FieldItem) {
  // 延迟执行，确保用户完成输入
  setTimeout(() => {
    if (!field.fieldName || !field.fieldValue) {
      return; // 不完整的数据不自动保存
    }

    field.isEditing = false;
    delete field.originalData;
    window.$message?.success($t("common.addSuccess"));
  }, 200);
}

// 删除字段
function handleDeleteField(id: string) {
  fieldData.value = fieldData.value.filter(item => item.id !== id);
  window.$message?.success($t("common.deleteSuccess"));
}

// 获取行属性（点击事件）
function getRowProps(row: FieldItem) {
  return {
    style: {
      cursor: row.isEditing ? 'default' : 'pointer'
    },
    onClick: () => {
      if (!row.isEditing) {
        handleEditField(row);
      }
    }
  };
}

// 获取行样式类名
function getRowClassName(row: FieldItem) {
  return row.isEditing ? 'editing-row' : 'hover-row';
}

async function handleSubmit() {
  await validate();
  try {
    // 将字段管理数据转换为 otherSetting JSON 字符串
    const otherSettingObject: Record<string, string> = {};
    fieldData.value.forEach(field => {
      if (field.fieldName && field.fieldValue) {
        otherSettingObject[field.fieldName] = field.fieldValue;
      }
    });

    const productData = {
      ...model.value,
      otherSetting: Object.keys(otherSettingObject).length > 0
        ? JSON.stringify(otherSettingObject)
        : "{}"
    };

    let response;
    if (props.operateType === "add") {
      response = await fetchAddProduct(productData);

      if (handleApiResponseError(response)) {
        return;
      }

      window.$message?.success($t("common.addSuccess"));
    } else {
      response = await fetchUpdateProduct(productData);

      if (handleApiResponseError(response)) {
        return;
      }

      window.$message?.success($t("common.updateSuccess"));
    }

    closeDrawer();
    emit("submitted");
  } catch (error) {
    // 使用通用异常处理函数
    const operationType = props.operateType === "add" ? "添加商品" : "更新商品";
    console.log(error);
    handleApiCatchError(error, operationType);
  }
}

watch(visible, (newVal) => {
  if (newVal) {
    handleInitModel();
    restoreValidation();
  }
});
</script>

<template>
  <NModal v-model:show="visible" :title="title" preset="card" class="w-800px">
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
            :label="$t('page.manage.products.channelProductId')"
            path="channelProductId"
          >
            <NInput
              v-model:value="model.channelProductId"
              :placeholder="$t('page.manage.products.form.channelProductId')"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24"
            :label="$t('page.manage.products.gameProductId')"
            path="gameProductId"
          >
            <NInput
              v-model:value="model.gameProductId"
              :placeholder="$t('page.manage.products.form.gameProductId')"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24"
            :label="$t('page.manage.products.productName')"
            path="productName"
          >
            <NInput
              v-model:value="model.productName"
              :placeholder="$t('page.manage.products.form.productName')"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24 m:8"
            :label="$t('page.manage.products.productPrice')"
            path="productPrice"
          >
            <NInputNumber
              v-model:value="model.productPrice"
              :min="0"
              :step="0.01"
              style="width: 100%"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24 m:8"
            :label="$t('page.manage.products.nativePrice')"
            path="nativePrice"
          >
            <NInputNumber
              v-model:value="model.nativePrice"
              :min="0"
              :step="0.01"
              style="width: 100%"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24 m:8"
            :label="$t('page.manage.products.dollarPrice')"
            path="dollarPrice"
          >
            <NInputNumber
              v-model:value="model.dollarPrice"
              :min="0"
              :step="0.01"
              style="width: 100%"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24"
            :label="$t('page.manage.products.productNumber')"
            path="productNumber"
          >
            <NInputNumber
              v-model:value="model.productNumber"
              :placeholder="$t('page.manage.products.form.productNumber')"
              :min="0"
              style="width: 100%"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24"
            :label="$t('page.manage.products.productIndex')"
            path="productIndex"
          >
            <NInputNumber
              v-model:value="model.productIndex"
              :min="1"
              style="width: 100%"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24"
            :label="$t('page.manage.products.productDescribe')"
            path="productDescribe"
          >
            <NInput
              v-model:value="model.productDescribe"
              type="textarea"
              :placeholder="$t('page.manage.products.form.productDescribe')"
              :rows="3"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24"
            :label="$t('page.manage.products.productType')"
            path="productType"
          >
            <NSelect
              v-model:value="model.productType"
              :options="productTypeOptions"
              :placeholder="$t('page.manage.products.form.productType')"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24"
            :label="$t('page.manage.products.enable')"
            path="enable"
          >
            <NRadioGroup v-model:value="model.enable">
              <NRadio
                v-for="item in productStatusOptions"
                :key="item.value"
                :value="item.value"
                :label="item.label"
              />
            </NRadioGroup>
          </NFormItemGi>

          <!-- 字段管理区域 -->
          <NFormItemGi span="24">
            <div class="w-full border p-4 rounded">
              <div class="mb-4 flex justify-between items-center">
                <span class="font-medium">字段管理</span>
                <NButton type="primary" size="small" @click="handleAddField">
                  新增字段
                </NButton>
              </div>
              <NDataTable
                :columns="fieldColumns"
                :data="fieldData"
                size="small"
                :scroll-x="400"
                :max-height="200"
                :pagination="false"
                :row-props="getRowProps"
                :row-class-name="getRowClassName"
              />
            </div>
          </NFormItemGi>
        </NGrid>
      </NForm>
    </NScrollbar>
    <template #footer>
      <NSpace justify="end" :size="16">
        <NButton @click="closeDrawer">{{ $t("common.cancel") }}</NButton>
        <NButton type="primary" @click="handleSubmit">{{
          $t("common.confirm")
        }}</NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped>
:deep(.hover-row:hover) {
  background-color: #f5f5f5;
}

:deep(.editing-row) {
  background-color: #e6f7ff;
}

:deep(.hover-row) {
  transition: background-color 0.2s ease;
}
</style>
