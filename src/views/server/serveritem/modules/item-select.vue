<script setup lang="ts">
import { ref, onMounted } from "vue";
import { $t } from "@/locales";
import { fetchGetAreaList, fetchGetGroupListByRegionId } from "@/service/api";

defineOptions({
  name: "ItemSelect",
});

interface Emits {
  (e: "reset"): void;
  (e: "search", groupIds: string[]): void;
}
const emit = defineEmits<Emits>();

const loading = ref(false);
const treeOptions = ref<any[]>([]);
const expandedKeys = ref<(string | number)[]>([]);

const model = ref<{
  groupId: string | number | null;
}>({
  groupId: null,
});

// 获取专区列表并构建树结构
async function buildTreeData() {
  loading.value = true;
  try {
    const areaResponse = await fetchGetAreaList();
    const areas = Array.isArray(areaResponse?.response?.data)
      ? areaResponse.response.data
      : areaResponse?.response?.data?.rows || [];

    const treeData = await Promise.all(
      areas.map(async (area: any) => {
        const regionId = Number(area.id || area.regionId);
        if (!regionId) return null;

        try {
          const groupResponse = await fetchGetGroupListByRegionId({ regionId });

          // 尝试多种可能的数据结构
          let groups: any[] = [];
          const responseData = groupResponse?.response?.data;

          if (Array.isArray(responseData)) {
            groups = responseData;
          } else if (Array.isArray(responseData?.rows)) {
            groups = responseData.rows;
          } else if (Array.isArray(responseData?.data)) {
            groups = responseData.data;
          } else if (Array.isArray(groupResponse?.data)) {
            groups = groupResponse.data;
          }

          return {
            key: `region_${regionId}`,
            label: area.regionName || area.name || `专区${regionId}`,
            children: groups.map((group: any) => ({
              key: String(group.id || group.groupId),
              label: group.groupName || group.name || `分组${group.id || group.groupId}`,
            })),
          };
        } catch (error) {
          console.error(`获取专区 ${regionId} 的分组失败:`, error);
          return {
            key: `region_${regionId}`,
            label: area.regionName || area.name || `专区${regionId}`,
            children: [],
          };
        }
      })
    );

    const validTreeData = treeData.filter(Boolean) as any[];
    treeOptions.value = validTreeData;
    // 默认展开所有专区节点
    expandedKeys.value = validTreeData.map((item) => item.key);
  } catch (error) {
    console.error("构建树结构失败:", error);
    treeOptions.value = [];
    window.$message?.error($t("common.requestFailed"));
  } finally {
    loading.value = false;
  }
}

// 监听选择变化
const handleChange = (value: string | number | null | undefined) => {
  const stringValue = value !== null && value !== undefined ? String(value) : "";
  if (stringValue && !stringValue.startsWith("region_")) {
    emit("search", [stringValue]);
  } else {
    emit("search", []);
  }
};

onMounted(() => {
  buildTreeData();
});
</script>

<template>
  <NCard
    :bordered="false"
    size="small"
    class="card-wrapper"
    :title="$t('common.search')"
    name="user-search"
  >
    <NForm :model="model" label-placement="left" :label-width="80">
      <NGrid responsive="screen" item-responsive>
        <NFormItemGi
          span="24 s:12 m:6"
          :label="$t('page.manage.serveritem.selectgroup')"
          path="groupIds"
          class="pr-24px"
        >
          <NTreeSelect
            v-model:value="model.groupId"
            :placeholder="$t('page.manage.serveritem.form.selectgroup')"
            :options="treeOptions"
            :loading="loading"
            :node-props="({ option }) => ({
              onClick: () => {
                const key = String(option.key || '');
                if (key.startsWith('region_')) {
                  return false;
                }
              }
            })"
            :leaf-only="true"
            clearable
            :show-path="true"
            @update:value="handleChange"
          />
        </NFormItemGi>
      </NGrid>
    </NForm>
  </NCard>
</template>

<style scoped></style>
