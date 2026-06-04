  <script setup lang="tsx">
  import { NButton, NPopconfirm, NTag } from "naive-ui";
  import {
    fetchGetGuildMailList,
    fetchDeleteGuildMail,
    fetchSendGuildMail,
    fetchStopSendGuildMail,
  } from "@/service/api";
  import { $t } from "@/locales";
  import { useAppStore } from "@/store/modules/app";
  import { useTable, useTableOperate } from "@/hooks/common/table";
  import ItemOperateDrawer from "./modules/mail-operate-drawer.vue";
  import ViewStatusModal from "./modules/view-status-modal.vue";
  import GuildMailSearch from "./modules/guild-mail-search.vue";
  import { ref, onMounted, onUnmounted } from "vue";
  import { useAuth } from '@/hooks/business/auth';
  import { useItemPackage } from '@/hooks/business/useItemPackage';
  import {
    canStopSending,
    isSendDisabled,
    getMailStatusInfo,
    renderMailExpire,
    renderMailSendDate,
    renderCreateDate,
    createMailPoller,
    handleMailOperation
  } from '@/utils/common';

  const { hasAuth } = useAuth();

  const appStore = useAppStore();

  // 渲染邮件状态标签
  const renderMailStatus = (status: number) => {
    const statusInfo = getMailStatusInfo(status);
    return <NTag type={statusInfo.type}>{statusInfo.label}</NTag>;
  };

  // 创建专门用于公会数据解析的函数
  function parseGuildJson(guildJson: string) {
    try {
      let guildData;
      if (typeof guildJson === "object" && guildJson !== null) {
        guildData = guildJson;
      } else if (typeof guildJson === "string") {
        try {
          guildData = JSON.parse(guildJson);
        } catch (parseError) {
          console.error("第一次解析失败，尝试二次解析:", parseError);
          try {
            guildData = JSON.parse(JSON.parse(guildJson));
          } catch (secondParseError) {
            console.error("二次解析也失败:", secondParseError);
            return [];
          }
        }
      }

      if (Array.isArray(guildData)) {
        return guildData.map((guild) => ({
          serverId: guild.serverId,
          guildId: guild.guildId,
          guildName: guild.guildName,
          ok: guild.hasOwnProperty('ok') ? guild.ok === true : undefined,
          msg: guild.msg || "-",
        }));
      }
    } catch (error) {
      console.error("处理公会数据失败:", error);
    }
    return [];
  }

  const {
    columns,
    columnChecks,
    data,
    getData,
    getDataByPage,
    loading,
    mobilePagination,
    searchParams,
    resetSearchParams,
    updateSearchParams,
  } = useTable({
    apiFn: fetchGetGuildMailList,
    showTotal: true,
    apiParams: {
      current: 1,
      size: 10,
    },
    columns: () => [
      {
        type: "selection",
        align: "center",
        width: 48,
      },
      {
        key: "id",
        title: $t("page.manage.serveritem.id"),
        align: "center",
        width: 64,
      },
      {
        key: "mailRemark",
        title: $t("page.manage.mailGuildController.mailRemark"),
        align: "center",
        minWidth: 80,
        ellipsis: { tooltip: true }
      },
      {
        key: "mailStatus",
        title: $t("page.manage.mailGuildController.mailStatus"),
        align: "center",
        width: 80,
        render: (row: any) => renderMailStatus(row.mailStatus)
      },
      {
        key: "top",
        title: $t("page.manage.mailGuildController.topOrder"),
        align: "center",
        width: 80,
        render: (row: any) => {
          const value =
            row.top !== undefined && row.top !== null && `${row.top}` !== ""
              ? Number(row.top)
              : 0;
          return <span>{value}</span>;
        }
      },
      {
        key: "mailTitle",
        title: $t("page.manage.mailGuildController.mailTitle"),
        align: "center",
        minWidth: 80,
        ellipsis: { tooltip: true }
      },
      {
        key: "mailContent",
        title: $t("page.manage.mailGuildController.mailContent"),
        align: "center",
        minWidth: 80,
        ellipsis: { tooltip: true }
      },
      {
        key: "mailExpire",
        title: $t("page.manage.mailGuildController.mailExpire"),
        align: "center",
        minWidth: 80,
        render: (row: any) => renderMailExpire(row.mailExpire)
      },
      {
        key: "mailSendDate",
        title: $t("page.manage.mailGuildController.mailSendDate"),
        align: "center",
        minWidth: 80,
        render: (row: any) => renderMailSendDate(row.mailSendDate)
      },
      {
        key: "createDate",
        title: $t("page.manage.mailGuildController.createDate"),
        align: "center",
        minWidth: 80,
        render: (row: any) => renderCreateDate(row.createDate)
      },
      // {
      //   key: "updateDate",
      //   title: $t("page.manage.mailGuildController.updateDate"),
      //   align: "center",
      //   minWidth: 80,
      // },
      {
        key: "operate",
        title: $t("common.operate"),
        align: "center",
        width: 280,
        render: (row: any) => (
          <div class="flex-center gap-8px">
            {canStopSending(row.mailStatus) && hasAuth('operate:guildMail:stop') ? (
              <NPopconfirm onPositiveClick={() => handleStopSendMail(row.id)}>
              {{
                default: () => $t("common.confirmStop"),
                trigger: () => (
                  <NButton type="warning" ghost size="small">
                    {$t("common.stop")}
                  </NButton>
                ),
              }}
              </NPopconfirm>
            ) : hasAuth('operate:guildMail:start') && (
              <NPopconfirm onPositiveClick={() => handleSendMail(row.id)}>
              {{
                default: () => $t("common.confirmSend"),
                trigger: () => (
                  <NButton type="success" ghost size="small" disabled={isSendDisabled(row.mailStatus)}>
                    {$t("common.send")}
                  </NButton>
                ),
              }}
              </NPopconfirm>
            )}
            {hasAuth('operate:guildMail:query') && (
              <NButton
              type="info"
              ghost
              size="small"
              onClick={() => handleView(row)}
            >
              {$t("common.view")}
            </NButton>
            )}

            {hasAuth('operate:guildMail:edit') && (
              <NButton
              type="primary"
              ghost
              size="small"
              onClick={() => edit(row.id, row, isSendDisabled(row.mailStatus) || canStopSending(row.mailStatus))}
            >
              {$t("common.edit")}
            </NButton>
            )}

            {hasAuth('operate:guildMail:remove') && (
              <NPopconfirm onPositiveClick={() => handleDelete(row.id)}>
              {{
                default: () => $t("common.confirmDelete"),
                trigger: () => (
                  <NButton type="error" ghost size="small">
                    {$t("common.delete")}
                  </NButton>
                ),
              }}
              </NPopconfirm>
            )}
          </div>
        ),
      },
    ],
  });

  const {
    drawerVisible,
    operateType,
    editingData,
    handleAdd,
    handleEdit,
    checkedRowKeys,
    onBatchDeleted,
    onDeleted,
  } = useTableOperate(data, getData);

  const viewModalVisible = ref(false);
  const currentViewData = ref<any[]>([]);

  // 物品数据，用于检查物品绑定状态
  const itemData = ref<any>(null);
  let itemDataLoadingPromise: Promise<any> | null = null;

  // 创建轮询器，使用封装好的轮询工具
  const mailPoller = createMailPoller(data, getData);

  // 在组件卸载时清理定时器
  onUnmounted(() => {
    mailPoller.stopPolling();
  });

  //批量删除
  async function handleBatchDelete() {
    try {
      const deletePromises = checkedRowKeys.value.map((id: string) => {
        return fetchDeleteGuildMail(Number(id));
      });
      const responses = await Promise.all(deletePromises);

      onBatchDeleted(responses);
    } catch (error: any) {
      onBatchDeleted(error);
    }
  }

  // 删除邮件
  async function handleDelete(id: number) {
    try {
      const response = await fetchDeleteGuildMail(id);

      onDeleted(response);
    } catch (error: any) {
      onDeleted(error);
    }
  }

  // 检查邮件中是否有非绑定物品
  function hasUnboundItems(row: any): boolean {
    try {
      if (!row.goodsJson || !itemData.value?.data?.item) {
        return false;
      }

      const goodsData = JSON.parse(row.goodsJson);
      let itemIds: any[] = [];

      if (Array.isArray(goodsData)) {
        goodsData.forEach(group => {
          if (group.item_ids) {
            itemIds = itemIds.concat(group.item_ids);
          }
        });
      } else {
        itemIds = goodsData.item_ids || [];
      }

      // 检查物品数据中是否有非绑定物品
      return itemIds.some(id => {
        const item = itemData.value.data.item[id];
        return item && (item.trade === true || item.trade === 1);
      });
    } catch (error) {
      console.error('检查物品绑定状态失败:', error);
      return false;
    }
  }

  // 确保物品数据已加载（单例模式，避免重复加载）
  async function ensureItemDataLoaded() {
    if (itemData.value?.data?.item) return;
    if (itemDataLoadingPromise) {
      await itemDataLoadingPromise;
      return;
    }

    itemDataLoadingPromise = useItemPackage();
    try {
      itemData.value = await itemDataLoadingPromise;
    } catch (error) {
      console.error('加载物品数据失败:', error);
    } finally {
      itemDataLoadingPromise = null;
    }
  }

// 发送邮件
  async function handleSendMail(id: number) {
    const mailRow = data.value.find((item: any) => item.id === id);
    await ensureItemDataLoaded();

    const sendMail = async () => {
      await handleMailOperation(
        fetchSendGuildMail,
        id,
        'send',
        () => {
          getData();
          mailPoller.startPolling();
        },
        (error) => console.error('发送失败:', error)
      );
    };

    // 检查是否有非绑定物品，有则显示二次确认
    if (mailRow && hasUnboundItems(mailRow)) {
      window.$dialog?.info({
        title: $t("common.tip"),
        content: $t("page.manage.operateserver.unboundItemWarning"),
        positiveText: $t("common.confirm"),
        negativeText: $t("common.cancel"),
        onPositiveClick: sendMail
      });
    } else {
      await sendMail();
    }
  }
// 停止发送邮件
  async function handleStopSendMail(id: number) {
    await handleMailOperation(
      fetchStopSendGuildMail,
      id,
      'stop',
      () => {
        getData();
        mailPoller.stopPolling();
      },
      (error) => console.error('停止失败:', error)
    );
  }
// 编辑邮件
  function edit(id: number, row: any, isReadonly = false) {
    const editData = {
      ...row,
      isReadonly
    };
    handleEdit(id, editData);
  }
// 查看邮件
  function handleView(row: any) {
    try {
      const guildData = parseGuildJson(row.mailGuildJson);
      if (guildData.length > 0) {
        currentViewData.value = guildData;
        viewModalVisible.value = true;
      }
    } catch (error) {
      console.error("处理公会数据失败:", error);
      window.$message?.error($t("common.error"));
    }
  }
// 搜索邮件
  function handleSearch() {
    getData();
  }

  onMounted(() => {
    getData();
    // 预加载物品数据（不阻塞页面加载）
    ensureItemDataLoaded();
  });
  </script>

  <template>
  <div
    class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto"
  >
    <GuildMailSearch
      v-model:model="searchParams"
      @reset="resetSearchParams"
      @search="handleSearch"
    />
    <NCard
      :title="$t('page.manage.mailGuildController.title')"
      :bordered="false"
      size="small"
      class="sm:flex-1-hidden card-wrapper"
    >
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :disabled-delete="checkedRowKeys.length === 0"
          :loading="loading"
          @add="() => handleAdd()"
          @delete="handleBatchDelete"
          @refresh="getData"
          :show-add="hasAuth('operate:guildMail:add')"
          :show-batch-delete="hasAuth('operate:guildMail:remove')"
        />
      </template>

      <NDataTable
        v-model:checked-row-keys="checkedRowKeys"
        :columns="columns"
        :data="data"
        size="small"
        :flex-height="!appStore.isMobile"
        :scroll-x="962"
        :loading="loading"
        remote
        :row-key="(row: any) => row.id"
        :pagination="mobilePagination"
        class="sm:h-full"
      />

      <ItemOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        :readonly="editingData?.isReadonly"
        @submitted="getDataByPage"
      />

      <ViewStatusModal
        v-model:visible="viewModalVisible"
        :server-data="currentViewData"
      />
    </NCard>
  </div>
</template>

  <style scoped></style>
