<script setup lang="ts">
import { ref, watch } from "vue";
import { $t } from "@/locales";
import { fetchGetServerGroup } from "@/service/api";

defineOptions({
  name: "ItemSelect",
});

interface Emits {
  (e: "reset"): void;
  (e: "search", groupId: string): void;
}
const emit = defineEmits<Emits>();

const channeOptions = ref<CommonType.Option<string>[]>([]);

const model = ref({
  groupId: "",
});

async function getServerGroupOptions() {
  try {
    const data = await fetchGetServerGroup();
    if (data?.response?.data?.rows && Array.isArray(data.response.data.rows)) {
      const allOption: CommonType.Option<string> = {
        label: $t("common.all"),
        value: "",
      };
      channeOptions.value = [
        allOption,
        ...data.response.data.rows.map(
          (item: Api.SystemManage.servergroup) => ({
            label: item.groupName,
            value: item.id,
          })
        ),
      ];
    } else {
      channeOptions.value = [{ label: $t("common.all"), value: "" }];
    }
  } catch (error) {
    window.$message?.error($t("common.requestFailed"));
    channeOptions.value = [{ label: $t("common.all"), value: "" }];
  }
}

getServerGroupOptions();

watch(
  () => model.value.groupId,
  (newVal) => {
    emit("search", newVal);
  }
);
</script>
<template>
  <NCard :bordered="false" size="small" class="card-wrapper" :title="$t('common.search')" name="user-search">
    <!-- <NCollapse> -->
      <!-- <NCollapseItem > -->
        <NForm :model="model" label-placement="left" :label-width="80">
          <NGrid responsive="screen" item-responsive>
            <NFormItemGi
              span="24 s:12 m:6"
              :label="$t('page.manage.serveritem.selectgroup')"
              path="channelId"
              class="pr-24px"
            >
              <NSelect
                v-model:value="model.groupId"
                :placeholder="$t('page.manage.serveritem.form.selectgroup')"
                :options="channeOptions"
              />
            </NFormItemGi>
          </NGrid>
        </NForm>
      <!-- </NCollapseItem> -->
    <!-- </NCollapse> -->
  </NCard>
</template>

<style scoped></style>
