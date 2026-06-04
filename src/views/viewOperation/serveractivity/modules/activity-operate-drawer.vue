<script setup lang="ts">
import { computed, ref, watch, h } from "vue";
import { useNaiveForm } from "@/hooks/common/form";
import { fetchAddServerActivity } from "@/service/api";
import { $t } from "@/locales";
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";
import { useServerStore } from '@/store/modules/server';

import {
  NSpace,
  NInput,
  NFormItemGi,
  NGrid,
  NModal,
  NForm,
  NButton,
  NScrollbar,
  NTreeSelect,
  NDataTable
} from "naive-ui";

defineOptions({
  name: "ActivityOperateDrawer",
});

interface Emits {
  (e: "submitted"): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>("visible", { default: false });
const { formRef, validate, restoreValidation } = useNaiveForm();
const serverStore = useServerStore();
// 使用封装好的包含跨服的服务器树选项
const serverTreeOptions = computed(() => serverStore.mixedServerTreeOptions);

const title = computed(() => $t("page.manage.activity.addActivity"));
const model = ref({ data: "" });
const selectedServerIds = ref<string[]>([]);

// 过滤服务器ID（排除区域节点和跨服组节点，处理跨服ID）
const getFilteredServerIds = () => {
  return selectedServerIds.value
    .filter(id => {
      const idStr = String(id);
      return !idStr.startsWith('region_') && idStr !== 'cross_server_group';
    })
    .map(id => {
      const idStr = String(id);
      // 处理跨服ID，去掉 cross_ 前缀
      if (idStr.startsWith('cross_')) {
        return Number(idStr.replace('cross_', ''));
      }
      return Number(id);
    });
};

const rules = {
  data: {
    required: true,
    message: $t('page.manage.serveractivity.form.activityData'),
    trigger: ['change', 'blur']
  },
  servers: {
    required: true,
    message: $t('page.manage.activity.form.servers'),
    trigger: ['change', 'blur'],
    validator: () => getFilteredServerIds().length > 0
  },
};

function closeDrawer() {
  visible.value = false;
  model.value = { data: "" };
  selectedServerIds.value = [];
  restoreValidation();
}

// 获取服务器名称（包括跨服）- 使用store封装的方法
const getServerName = (serverId: number | string): string => {
  return serverStore.getServerNameById(serverId);
};

async function handleSubmit() {
  await validate();
  try {
    const serverIds = getFilteredServerIds();
    if (serverIds.length === 0) {
      window.$message?.warning($t('page.manage.activity.form.servers'));
      return;
    }

    const response = await fetchAddServerActivity({
      serverIds,
      data: model.value.data
    });

    const responseAny = response as any;

    // 检查是否是真正的错误（code !== 200）
    const responseCode = responseAny?.data?.code || responseAny?.response?.data?.code || responseAny?.code;
    if (responseCode && responseCode !== 200) {
      if (handleApiResponseError(response, $t('page.manage.serveractivity.addActivity'))) {
        return;
      }
    }

    // 获取返回的数据（code === 200时）
    let returnData: any = null;
    if (responseCode === 200) {
      // 尝试从不同位置获取data字段
      returnData = responseAny?.data?.data || responseAny?.response?.data?.data || responseAny?.data;

      // 如果没获取到，检查responseData本身是否就是数据对象（键是数字字符串，值是字符串）
      if (!returnData) {
        const responseData = responseAny?.data || responseAny?.response?.data || responseAny;
        if (responseData && typeof responseData === 'object' && !Array.isArray(responseData)) {
          const keys = Object.keys(responseData);
          if (keys.length > 0 && !responseData.code &&
              keys.every(key => /^\d+$/.test(key)) &&
              Object.values(responseData).every(val => typeof val === 'string')) {
            returnData = responseData;
          }
        }
      }
    }

    // 如果data是对象且有内容，显示弹框展示数据
    if (returnData && typeof returnData === 'object' && !Array.isArray(returnData) && Object.keys(returnData).length > 0) {
      // 格式化数据为表格格式并显示弹框
      const dataItems = Object.entries(returnData).map(([serverId, msg]) => ({
        serverId,
        serverName: getServerName(serverId),
        message: String(msg)
      }));

      window.$dialog?.info({
        title: '新增活动 - 返回结果',
        content: () => {
          return h('div', { style: 'max-height: 500px; overflow-y: auto;' }, [
            h(NDataTable, {
              columns: [
                {
                  title: '服务器ID',
                  key: 'serverId',
                  width: 150
                },
                {
                  title: '服务器名称',
                  key: 'serverName',
                  width: 250
                },
                {
                  title: '返回信息',
                  key: 'message',
                  ellipsis: { tooltip: true }
                }
              ],
              data: dataItems,
              size: 'small',
              bordered: true
            })
          ]);
        },
        positiveText: $t('common.confirm'),
        style: { width: '900px' }
      });

      closeDrawer();
      emit("submitted");
      return;
    }

    // 全部成功，没有错误信息
    window.$message?.success($t("common.addSuccess"));
    closeDrawer();
    emit("submitted");
  } catch (error: any) {
    handleApiCatchError(error, $t('page.manage.serveractivity.addActivity'));
  }
}

watch(visible, async (newVal) => {
  if (newVal) {
    model.value = { data: "" };
    selectedServerIds.value = [];
    restoreValidation();
    await serverStore.fetchServerList();
    // 获取跨服列表
    if (!serverStore.crossServerList?.length) {
      await serverStore.fetchCrossServerList();
    }
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
            span="24"
            :label="$t('page.manage.activity.servers')"
            path="servers"
          >
            <NTreeSelect
              v-model:value="selectedServerIds"
              :options="serverTreeOptions"
              :placeholder="$t('page.manage.activity.form.servers')"
              multiple
              cascade
              checkable
              clearable
              :check-strategy="'child'"
              :max-tag-count="3"
              tag
            />
          </NFormItemGi>
          <NFormItemGi
            span="24"
            :label="$t('page.manage.serveractivity.activityData')"
            path="data"
          >
            <NInput
              v-model:value="model.data"
              type="textarea"
              :placeholder="$t('page.manage.serveractivity.form.activityData')"
              :rows="10"
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

<style scoped></style>
