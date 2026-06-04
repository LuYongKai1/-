<script setup lang="ts">
import { computed, ref, watch, onMounted, h } from "vue";
import { useFormRules, useNaiveForm } from "@/hooks/common/form";
import {
  NInput,
  NButton,
  NDataTable,
  NRadioGroup,
  NRadio,
  NDatePicker,
} from "naive-ui";
import { fetchAddGemsShop, fetchUpdateGemsShop } from "@/service/api";
import { $t } from "@/locales";
import {
  productTypeOptions as rawProductTypeOptions,
  saleTypeOptions,
  limitTypeOptions,
  productSaleStatusOptions,
  saleWeekTypeOptions,
  discountRateOptions,
} from "@/constants/business";
import {
  translateOptions,
  handleApiResponseError,
  handleApiCatchError,
} from "@/utils/common";

defineOptions({
  name: "GemsShopOperateDrawer",
});

interface Props {
  /** the type of operation */
  operateType: NaiveUI.TableOperateType;
  /** the edit row data */
  rowData?: Api.SystemManage.gemsShop | null;
  /** 当前选中的服务器ID */
  serverId?: string | number;
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

const title = computed(() => {
  const titles: Record<NaiveUI.TableOperateType, string> = {
    add: $t("page.manage.Gems.addGems"),
    edit: $t("page.manage.Gems.editGems"),
  };
  return titles[props.operateType];
});

type Model = Pick<
  Api.SystemManage.gemsShop,
  | "id"
  | "gameid"
  | "serverId"
  | "nameId"
  | "price"
  | "discountRate"
  | "saleType"
  | "discountPrice"
  | "limitType"
  | "limitCount"
  | "requireLevel"
  | "sellCategoryOrder"
  | "hideInClient"
  | "saleStartData"
  | "saleCloseData"
  | "saleWeekType"
  | "saleMonday"
  | "saleTuesday"
  | "saleWednesday"
  | "saleThursday"
  | "saleFriday"
  | "saleSaturday"
  | "saleSunday"
>;

const model = ref(createDefaultModel());

function createDefaultModel(): Model {
  return {
    gameid: "101",
    id: 0,
    nameId: "",
    serverId: "",
    price: 0,
    discountRate: "0",
    saleType: null,
    discountPrice: 0,
    limitType: null,
    limitCount: 0,
    requireLevel: 0,
    sellCategoryOrder: 0,
    hideInClient: "false",
    saleStartData: null,
    saleCloseData: null,
    saleWeekType: "false",
    saleMonday: "0",
    saleTuesday: "0",
    saleWednesday: "0",
    saleThursday: "0",
    saleFriday: "0",
    saleSaturday: "0",
    saleSunday: "0",
  };
}

type RuleKey = Extract<
  keyof Model,
  | "id"
  | "nameId"
  | "price"
  | "discountPrice"
  | "discountRate"
  | "saleType"
  | "limitType"
  | "limitCount"
  | "requireLevel"
  | "sellCategoryOrder"
  | "hideInClient"
  | "saleStartData"
  | "saleCloseData"
  | "saleWeekType"
>;

const rules: Record<RuleKey, App.Global.FormRule> = {
  id: defaultRequiredRule,
  nameId: defaultRequiredRule,
  price: defaultRequiredRule,
  discountPrice: defaultRequiredRule,
  saleType: defaultRequiredRule,
  limitType: defaultRequiredRule,
  limitCount: defaultRequiredRule,
  requireLevel: defaultRequiredRule,
  hideInClient: defaultRequiredRule,
  sellCategoryOrder: defaultRequiredRule,
  saleWeekType: defaultRequiredRule,
};

// 计算周选项是否禁用 - 周选项始终可以选择
const isWeekdaysDisabled = computed(() => {
  return false; // 周一到周日始终可以选择
});

watch(
  [
    () => model.value.saleMonday,
    () => model.value.saleTuesday,
    () => model.value.saleWednesday,
    () => model.value.saleThursday,
    () => model.value.saleFriday,
    () => model.value.saleSaturday,
    () => model.value.saleSunday,
  ],
  (newValues) => {
    // 检查是否有任意一天被设置为"是"
    const hasAnyDayEnabled = newValues.some((value) => value === "1");

    if (hasAnyDayEnabled && model.value.saleWeekType !== "true") {
      // 如果有任意一天选择为"是"，且当前saleWeekType不是"true"，则自动设置为"true"
      model.value.saleWeekType = "true";
    } else if (!hasAnyDayEnabled && model.value.saleWeekType === "true") {
      // 如果所有天都选择为"否"，且当前saleWeekType是"true"，则自动设置为"false"
      model.value.saleWeekType = "false";
    }
  }
);

const productTypeOptions = computed(() => {
  return translateOptions(rawProductTypeOptions).map((option) => ({
    ...option,
    value: Number(option.value),
  }));
});

function handleInitModel() {
  model.value = createDefaultModel();

  // 如果传入了服务器ID，设置serverId字段
  if (props.serverId) {
    model.value.serverId = String(props.serverId);
  }

  if (props.operateType === "edit" && props.rowData) {
    const rowDataWithExtended = props.rowData as any;
    const editData = {
      gameid: rowDataWithExtended.gameid || "101",
      id: Number(props.rowData.id) || 0,
      nameId: Number(rowDataWithExtended.nameId) || 0,
      serverId: props.serverId
        ? String(props.serverId)
        : rowDataWithExtended.serverId || "",
      saleType: String(props.rowData.saleType) || null,
      price: Number(props.rowData.price) || 0,
      discountRate: String(props.rowData.discountRate) || "0",
      discountPrice: Number(props.rowData.discountPrice) || 0,
      limitType: String(props.rowData.limitType) || null,
      limitCount: Number(props.rowData.limitCount) || 0,
      requireLevel: Number(props.rowData.requireLevel) || 0,
      hideInClient: String(
        rowDataWithExtended.hideInClient ??
          props.rowData.hideInClient ??
          "false"
      ),
      sellCategoryOrder: Number(props.rowData.sellCategoryOrder) || 0,
      saleStartData: props.rowData.saleStartData
        ? typeof props.rowData.saleStartData === "string"
          ? new Date(props.rowData.saleStartData).getTime()
          : Number(props.rowData.saleStartData) * 1000
        : null,
      saleCloseData: props.rowData.saleCloseData
        ? typeof props.rowData.saleCloseData === "string"
          ? new Date(props.rowData.saleCloseData).getTime()
          : Number(props.rowData.saleCloseData) * 1000
        : null,
      saleWeekType:
        (props.rowData.saleWeekType as any) === true ||
        (props.rowData.saleWeekType as any) === "true"
          ? "true"
          : "false",
      saleMonday: String(
        rowDataWithExtended.saleMonday === true ||
          rowDataWithExtended.saleMonday === "1"
          ? "1"
          : "0"
      ),
      saleTuesday: String(
        rowDataWithExtended.saleTuesday === true ||
          rowDataWithExtended.saleTuesday === "1"
          ? "1"
          : "0"
      ),
      saleWednesday: String(
        rowDataWithExtended.saleWednesday === true ||
          rowDataWithExtended.saleWednesday === "1"
          ? "1"
          : "0"
      ),
      saleThursday: String(
        rowDataWithExtended.saleThursday === true ||
          rowDataWithExtended.saleThursday === "1"
          ? "1"
          : "0"
      ),
      saleFriday: String(
        rowDataWithExtended.saleFriday === true ||
          rowDataWithExtended.saleFriday === "1"
          ? "1"
          : "0"
      ),
      saleSaturday: String(
        rowDataWithExtended.saleSaturday === true ||
          rowDataWithExtended.saleSaturday === "1"
          ? "1"
          : "0"
      ),
      saleSunday: String(
        rowDataWithExtended.saleSunday === true ||
          rowDataWithExtended.saleSunday === "1"
          ? "1"
          : "0"
      ),
    };
    Object.assign(model.value, editData);
  }
}

function closeDrawer() {
  visible.value = false;
}

async function handleSubmit() {
  await validate();
  try {
    const productData = {
      ...model.value,
      // 转换日期为时间戳（秒）
      saleStartData: model.value.saleStartData
        ? Math.floor(model.value.saleStartData / 1000)
        : 0,
      saleCloseData: model.value.saleCloseData
        ? Math.floor(model.value.saleCloseData / 1000)
        : 0,
      // 转换布尔值字段
      hideInClient: model.value.hideInClient === "true",
      saleMonday: model.value.saleMonday === "1",
      saleTuesday: model.value.saleTuesday === "1",
      saleWednesday: model.value.saleWednesday === "1",
      saleThursday: model.value.saleThursday === "1",
      saleFriday: model.value.saleFriday === "1",
      saleSaturday: model.value.saleSaturday === "1",
      saleSunday: model.value.saleSunday === "1",
    };

    let response;
    if (props.operateType === "add") {
      response = await fetchAddGemsShop(productData);

      if (handleApiResponseError(response)) {
        return;
      }

      window.$message?.success($t("common.addSuccess"));
    } else {
      response = await fetchUpdateGemsShop(productData);

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
    <NScrollbar class="h-640px pr-20px">
      <NForm
        ref="formRef"
        :model="model"
        :rules="rules"
        label-placement="left"
        :label-width="100"
      >
        <NGrid responsive="screen" item-responsive>
          <NFormItemGi
            span="24 m:12"
            :label="$t('page.manage.Gems.id')"
            path="id"
          >
            <NInputNumber
              v-model:value="model.id"
              :placeholder="$t('page.manage.Gems.form.id')"
              :min="0"
              :step="1"
              :show-button="false"
              style="width: 100%"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24 m:12"
            :label="$t('page.manage.Gems.nameId')"
            path="nameId"
          >
            <NInputNumber
              v-model:value="model.nameId"
              :placeholder="$t('page.manage.Gems.form.nameId')"
              :min="0"
              :step="1"
              :show-button="false"
              style="width: 100%"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24 m:12"
            :label="$t('page.manage.Gems.price')"
            path="price"
          >
            <NInputNumber
              v-model:value="model.price"
              :min="0"
              :step="0.01"
              style="width: 100%"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24 m:12"
            :label="$t('page.manage.Gems.discountPrice')"
            path="discountPrice"
          >
            <NInputNumber
              v-model:value="model.discountPrice"
              :min="0"
              :step="0.01"
              style="width: 100%"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24 m:12"
            :label="$t('page.manage.Gems.limitCount')"
            path="limitCount"
          >
            <NInputNumber
              v-model:value="model.limitCount"
              :min="0"
              :max="255"
              :step="1"
              style="width: 100%"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24 m:12"
            :label="$t('page.manage.Gems.requireLevel')"
            path="requireLevel"
          >
            <NInputNumber
              v-model:value="model.requireLevel"
              :min="0"
              :step="0.01"
              style="width: 100%"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24"
            :label="$t('page.manage.Gems.limitType')"
            path="limitType"
          >
            <NSelect
              v-model:value="model.limitType"
              :placeholder="$t('page.manage.Gems.form.limitType')"
              :options="limitTypeOptions"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24"
            :label="$t('page.manage.Gems.saleType')"
            path="saleType"
          >
            <NSelect
              v-model:value="model.saleType"
              :placeholder="$t('page.manage.Gems.form.saleType')"
              :options="saleTypeOptions"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24 m:12"
            :label="$t('page.manage.Gems.discountRate')"
            path="discountRate"
          >
            <NSelect
              v-model:value="model.discountRate"
              :options="discountRateOptions"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24 m:12"
            :label="$t('page.manage.Gems.sellCategoryOrder')"
            path="sellCategoryOrder"
          >
            <NInputNumber
              v-model:value="model.sellCategoryOrder"
              :min="0"
              :step="1"
              style="width: 100%"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24 m:12"
            :label="$t('page.manage.Gems.saleWeekType')"
            path="saleWeekType"
          >
            <NSelect
              v-model:value="model.saleWeekType"
              :placeholder="$t('page.manage.Gems.form.saleWeekType')"
              :options="saleWeekTypeOptions"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24 m:12"
            :label="$t('page.manage.Gems.hideinclient')"
            path="hideInClient"
          >
            <NSelect
              v-model:value="model.hideInClient"
              :placeholder="$t('page.manage.Gems.form.hideinclient')"
              :options="productSaleStatusOptions"
            />
          </NFormItemGi>

          <!-- 周类型字段 -->
          <NFormItemGi
            span="24 m:8"
            :label="$t('page.manage.Gems.weekdays.monday')"
            path="saleMonday"
          >
            <NRadioGroup
              v-model:value="model.saleMonday"
              :disabled="isWeekdaysDisabled"
            >
              <NRadio value="1">{{
                $t("page.manage.Gems.weekdays.yes")
              }}</NRadio>
              <NRadio value="0">{{
                $t("page.manage.Gems.weekdays.no")
              }}</NRadio>
            </NRadioGroup>
          </NFormItemGi>

          <NFormItemGi
            span="24 m:8"
            :label="$t('page.manage.Gems.weekdays.tuesday')"
            path="saleTuesday"
          >
            <NRadioGroup
              v-model:value="model.saleTuesday"
              :disabled="isWeekdaysDisabled"
            >
              <NRadio value="1">{{
                $t("page.manage.Gems.weekdays.yes")
              }}</NRadio>
              <NRadio value="0">{{
                $t("page.manage.Gems.weekdays.no")
              }}</NRadio>
            </NRadioGroup>
          </NFormItemGi>

          <NFormItemGi
            span="24 m:8"
            :label="$t('page.manage.Gems.weekdays.wednesday')"
            path="saleWednesday"
          >
            <NRadioGroup
              v-model:value="model.saleWednesday"
              :disabled="isWeekdaysDisabled"
            >
              <NRadio value="1">{{
                $t("page.manage.Gems.weekdays.yes")
              }}</NRadio>
              <NRadio value="0">{{
                $t("page.manage.Gems.weekdays.no")
              }}</NRadio>
            </NRadioGroup>
          </NFormItemGi>

          <NFormItemGi
            span="24 m:8"
            :label="$t('page.manage.Gems.weekdays.thursday')"
            path="saleThursday"
          >
            <NRadioGroup
              v-model:value="model.saleThursday"
              :disabled="isWeekdaysDisabled"
            >
              <NRadio value="1">{{
                $t("page.manage.Gems.weekdays.yes")
              }}</NRadio>
              <NRadio value="0">{{
                $t("page.manage.Gems.weekdays.no")
              }}</NRadio>
            </NRadioGroup>
          </NFormItemGi>

          <NFormItemGi
            span="24 m:8"
            :label="$t('page.manage.Gems.weekdays.friday')"
            path="saleFriday"
          >
            <NRadioGroup
              v-model:value="model.saleFriday"
              :disabled="isWeekdaysDisabled"
            >
              <NRadio value="1">{{
                $t("page.manage.Gems.weekdays.yes")
              }}</NRadio>
              <NRadio value="0">{{
                $t("page.manage.Gems.weekdays.no")
              }}</NRadio>
            </NRadioGroup>
          </NFormItemGi>

          <NFormItemGi
            span="24 m:8"
            :label="$t('page.manage.Gems.weekdays.saturday')"
            path="saleSaturday"
          >
            <NRadioGroup
              v-model:value="model.saleSaturday"
              :disabled="isWeekdaysDisabled"
            >
              <NRadio value="1">{{
                $t("page.manage.Gems.weekdays.yes")
              }}</NRadio>
              <NRadio value="0">{{
                $t("page.manage.Gems.weekdays.no")
              }}</NRadio>
            </NRadioGroup>
          </NFormItemGi>

          <NFormItemGi
            span="24 "
            :label="$t('page.manage.Gems.weekdays.sunday')"
            path="saleSunday"
          >
            <NRadioGroup
              v-model:value="model.saleSunday"
              :disabled="isWeekdaysDisabled"
            >
              <NRadio value="1">{{
                $t("page.manage.Gems.weekdays.yes")
              }}</NRadio>
              <NRadio value="0">{{
                $t("page.manage.Gems.weekdays.no")
              }}</NRadio>
            </NRadioGroup>
          </NFormItemGi>

          <NFormItemGi
            span="24 m:12"
            :label="$t('page.manage.Gems.saleStartData')"
            path="saleStartData"
          >
            <NDatePicker
              v-model:value="model.saleStartData"
              type="datetime"
              :placeholder="$t('page.manage.Gems.form.saleStartData')"
              style="width: 100%"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24 m:12"
            :label="$t('page.manage.Gems.saleCloseData')"
            path="saleCloseData"
          >
            <NDatePicker
              v-model:value="model.saleCloseData"
              type="datetime"
              :placeholder="$t('page.manage.Gems.form.saleCloseData')"
              style="width: 100%"
            />
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
