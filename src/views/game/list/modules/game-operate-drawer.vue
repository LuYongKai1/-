<script setup lang="ts">
import { computed, ref, watch, onMounted } from "vue";
import { useFormRules, useNaiveForm } from "@/hooks/common/form";
import {
  fetchGetChannelList,
  fetchAddGame,
  fetchUpdateGame,
} from "@/service/api";
import { $t } from "@/locales";
import { gameGenderOptions, gameUsermergeOptions } from "@/constants/business";

import { NUl, NCheckboxGroup, NCheckbox, NSpace, NDatePicker } from "naive-ui";

defineOptions({
  name: "UserOperateDrawer",
});

interface Props {
  /** the type of operation */
  operateType: NaiveUI.TableOperateType;
  /** the edit row data */
  rowData?: Api.SystemManage.Game | null;
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
    add: $t("page.manage.game.addGame"),
    edit: $t("page.manage.game.editGame"),
  };
  return titles[props.operateType];
});

type Model = Omit<
  Pick<
    Api.SystemManage.Game,
    | "gameName"
    | "gameAlias"
    | "callbackUrl"
    | "gmUrl"
    | "enable"
    | "userMerge"
    | "gameKey"
    | "gameSecret"
  >,
  "enable"
> & {
  enable: Api.SystemManage.GameStatus | null | "";
  channelIds: number[];
  pioneerEnableDate: number | null;
};

const model = ref(createDefaultModel());

//随机生成后期后端修改
function generateRandomString(length = 16) {
  return Math.random().toString(36).substr(2, length).toUpperCase();
}

function createDefaultModel(): Model {
  return {
    gameName: "",
    gameAlias: "",
    callbackUrl: "",
    gmUrl: "",
    gameKey: generateRandomString(20), // 生成默认 gameKey
    gameSecret: generateRandomString(32), // 生成默认 gameSecret
    enable: "" as Api.SystemManage.GameStatus | null | "",
    channelIds: [] as number[],
    userMerge: "",
    pioneerEnableDate: null,
  };
}

type RuleKey = Extract<keyof Model, "gameName" | "enable" | "channelIds">;

const rules: Record<RuleKey, App.Global.FormRule> = {
  gameName: defaultRequiredRule,
  enable: defaultRequiredRule,
  channelIds: defaultRequiredRule,
};

/** the enabled role options */
const roleOptions = ref<CommonType.Option<string>[]>([]);
const channelOptions = ref<CommonType.Option<number>[]>([]);

async function getChannelOptions() {
  try {
    const data = await fetchGetChannelList();

    if (data?.response?.data?.data && Array.isArray(data.response.data.data)) {
      channelOptions.value = data.response.data.data.map((item: any) => ({
        label: item.channelName,
        value: item.channelId,
      }));
    } else {
      console.error("渠道数据格式不正确:", data);
    }
  } catch (err) {
    console.error("获取渠道列表失败:", err);
    window.$message?.error($t("common.requestFailed"));
  }
}

function handleInitModel() {
  model.value = createDefaultModel();

  if (props.operateType === "edit" && props.rowData) {
    const { channelIds, enable, userMerge, pioneerEnableDate, ...rest } = props.rowData as any;
    // 将日期字符串转换为时间戳（支持包含时间的格式）
    let pioneerEnableDateTimestamp: number | null = null;
    if (pioneerEnableDate) {
      const date = new Date(pioneerEnableDate);
      if (!isNaN(date.getTime())) {
        pioneerEnableDateTimestamp = date.getTime();
      }
    }

    Object.assign(model.value, {
      ...rest,
      channelIds: channelIds ? channelIds.split(",").map(Number) : [], // 确保是数组
      enable: enable !== undefined ? String(enable) : "", // 确保是字符串
      userMerge: userMerge !== undefined ? String(userMerge) : "", // 确保是字符串
      pioneerEnableDate: pioneerEnableDateTimestamp,
    });
  }
}


function closeDrawer() {
  visible.value = false;
}

async function handleSubmit() {
  await validate();
  try {
    // 将时间戳转换为日期时间字符串格式 yyyy-MM-dd HH:mm:ss
    let pioneerEnableDateStr: string | null = null;
    if (model.value.pioneerEnableDate) {
      const date = new Date(model.value.pioneerEnableDate);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      pioneerEnableDateStr = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }

    const GameData = {
      ...model.value,
      gameKey: model.value.gameKey || generateRandomString(20),
      channelIds: Array.isArray(model.value.channelIds)
        ? model.value.channelIds.join(",")
        : model.value.channelIds,
      pioneerEnableDate: pioneerEnableDateStr,
    };

    if (props.operateType === "add") {
      await fetchAddGame(GameData);
      window.$message?.success($t("common.addSuccess"));
    } else {
      await fetchUpdateGame(GameData);
      window.$message?.success($t("common.updateSuccess"));
    }
    closeDrawer();
    emit("submitted");
  } catch (error) {
    window.$message?.error($t("common.requestFailed"));
  }
}

onMounted(() => {
  getChannelOptions();
});

watch(visible, (newVal) => {
  if (newVal) {
    handleInitModel();
    restoreValidation();
    getChannelOptions();
  }
});
</script>


<template>
  <NModal v-model:show="visible" :title="title" preset="card" class="w-800px">
    <NScrollbar class="h-400px pr-20px">
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
            :label="$t('page.manage.game.gameName')"
            path="gameName"
          >
            <NInput
              v-model:value="model.gameName"
              :placeholder="$t('page.manage.game.form.gameName')"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24 m:12"
            :label="$t('page.manage.game.gameAlias')"
            path="gameAlias"
          >
            <NInput
              v-model:value="model.gameAlias"
              :placeholder="$t('page.manage.game.form.gameAlias')"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24 m:12"
            :label="$t('page.manage.game.gameKey')"
            path="gameKey"
          >
            <NInput
              v-model:value="model.gameKey"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24 m:12"
            :label="$t('page.manage.game.callbackUrl')"
            path="callbackUrl"
          >
            <NInput
              v-model:value="model.callbackUrl"
              :placeholder="$t('page.manage.game.form.callbackUrl')"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24 m:24"
            :label="$t('page.manage.game.gmUrl')"
            path="gmUrl"
          >
            <NInput
              v-model:value="model.gmUrl"
              :placeholder="$t('page.manage.game.form.gmUrl')"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24 m:24"
            :label="$t('page.manage.game.enable')"
            path="maintenance"
          >
            <NRadioGroup v-model:value="model.enable">
              <NRadio
                v-for="item in gameGenderOptions"
                :key="item.value"
                :value="item.value"
                :label="$t(item.label)"
              />
            </NRadioGroup>
          </NFormItemGi>

          <NFormItemGi
            span="24 m:12"
            :label="$t('page.manage.game.pioneerEnableDate')"
            path="pioneerEnableDate"
          >
            <NDatePicker
              v-model:value="model.pioneerEnableDate"
              type="datetime"
              clearable
              format="yyyy-MM-dd HH:mm:ss"
              style="width: 100%"
            />
          </NFormItemGi>

          <!-- <NFormItemGi
            span="24 m:24"
            :label="$t('page.manage.game.userMerge')"
            path="maintenance"
          >
            <NRadioGroup v-model:value="model.userMerge">
              <NRadio
                v-for="item in gameUsermergeOptions"
                :key="item.value"
                :value="item.value"
                :label="$t(item.label)"
              />
            </NRadioGroup>
          </NFormItemGi> -->

          <NFormItemGi
            span="24"
            :label="$t('page.manage.game.channel')"
            path="channelIds"
          >
            <NSpace vertical>
              <NCheckboxGroup v-model:value="model.channelIds">
                <NSpace>
                  <NCheckbox
                    v-for="item in channelOptions"
                    :key="item.value"
                    :value="item.value"
                  >
                    {{ item.label }}
                  </NCheckbox>
                </NSpace>
              </NCheckboxGroup>
            </NSpace>
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

<style scoped></style>
