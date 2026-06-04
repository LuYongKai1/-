<script setup lang="ts">
  import { ref, onMounted } from "vue";
  import {
    NCard,
    NTabs,
    NTabPane,
    NSelect,
    NForm,
    NFormItem,
    NGrid,
    NFormItemGi,
    type SelectOption,
    type SelectGroupOption,
  } from "naive-ui";
  import { $t } from "@/locales";
  import { fetchGetServerList } from "@/service/api";
  // @ts-ignore
  import TotalResources from "./modules/total-resources.vue";
  // @ts-ignore
  import ResourceTopN from "./modules/resource-topn.vue";
  // @ts-ignore
  import CheckResource from "./modules/check-resource.vue";
  // @ts-ignore
  import BatchCountItems from "./modules/batch-count-items.vue";

  // 服务器选择
  const serverOptions = ref<(SelectOption | SelectGroupOption)[]>([]);
  const serverLoading = ref(false);
  const selectedServerId = ref<number | null>(null);

  // 标签页
  const activeTab = ref("total-resources");

  // 获取服务器列表
  async function getServerOptions() {
    serverLoading.value = true;
    try {
      const responseWrapper = await fetchGetServerList();
      let formattedOptions: (SelectOption | SelectGroupOption)[] = [];

      if (
        responseWrapper &&
        responseWrapper.response &&
        responseWrapper.response.data
      ) {
        const serverListData = responseWrapper.response.data;
        if (Array.isArray(serverListData)) {
          const serverGroups: SelectGroupOption[] = serverListData.map(
            (group: any) => ({
              type: "group",
              label: group.groupName || `Group ${group.id}`,
              key: group.id,
              children: Array.isArray(group.serverItems)
                ? group.serverItems.map((server: any) => ({
                    value: server.serverId,
                    label: `${server.serverId}-${
                      server.serverName || "Unknown Server"
                    }`,
                  }))
                : [],
            })
          );
          formattedOptions = formattedOptions.concat(serverGroups);
        }
      }
      serverOptions.value = formattedOptions;
    } catch (error) {
      serverOptions.value = [];
      console.error("Error during fetch server list API call:", error);
    } finally {
      serverLoading.value = false;
    }
  }

  onMounted(() => {
    getServerOptions();
  });
  </script>

  <template>
    <div
      class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto"
    >
      <!-- 服务器选择 -->
      <NCard :bordered="false" size="small" class="card-wrapper" :title="$t('common.search')">
        <NForm :model="{ serverId: selectedServerId }" label-placement="left" :label-width="80">
          <NGrid responsive="screen" item-responsive>
            <NFormItemGi
              span="24 s:12 m:6"
              label="选择服务器"
              path="serverId"
              class="pr-24px"
            >
              <NSelect
                v-model:value="selectedServerId"
                :options="serverOptions"
                :loading="serverLoading"
                placeholder="请选择服务器"
                filterable
                clearable
              />
            </NFormItemGi>
          </NGrid>
        </NForm>
      </NCard>

      <!-- 功能标签页 -->
      <NCard :bordered="false" size="small" class="sm:flex-1-hidden card-wrapper">
        <NTabs v-model:value="activeTab" type="line" animated>
          <!-- 功能1：资源总量统计 -->
          <NTabPane name="total-resources" tab="资源总量统计">
            <TotalResources :server-id="selectedServerId" />
          </NTabPane>

          <!-- 功能2：资源TopN -->
          <NTabPane name="resource-topn" tab="资源TopN排行">
            <ResourceTopN :server-id="selectedServerId" />
          </NTabPane>

          <!-- 功能3：检查不存在的资源 -->
          <NTabPane name="check-resource" tab="检查不存在的资源">
            <CheckResource :server-id="selectedServerId" />
          </NTabPane>

          <!-- 功能4：批量统计物品 -->
          <NTabPane name="batch-count-items" tab="批量统计物品">
            <BatchCountItems :server-id="selectedServerId" />
          </NTabPane>
        </NTabs>
      </NCard>
    </div>
  </template>

  <style scoped>
  .card-wrapper {
    margin-bottom: 16px;
  }

  :deep(.n-card__content) {
    padding: 16px;
  }

  :deep(.n-tabs-content) {
    padding: 0;
  }

  :deep(.n-form-item-label) {
    white-space: nowrap;
  }
  </style>
