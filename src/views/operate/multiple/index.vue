<script setup lang="tsx">
  import { NButton, NPopconfirm, NTag, NProgress, NTooltip } from "naive-ui";
  import {
    fetchGetMultiMailList,
    fetchDeleteMultiMail,
    fetchSendMultiMail,
    fetchStopMultiMail,
    fetchAuditMultiMail,
  } from "@/service/api";
  import { $t } from "@/locales";
  import { useAppStore } from "@/store/modules/app";
  import { useTable, useTableOperate } from "@/hooks/common/table";
  import ItemOperateDrawer from "./modules/item-operate-drawer.vue";
  import ViewStatusModal from "./modules/view-status-modal.vue";
  import MultiMailSearch from "./modules/multi-mail-search.vue";
  import BatchAddModal from "./modules/batch-add-modal.vue";
  import AuditModal from "./modules/audit-modal.vue";
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
    handleMailOperation,
    parseSendStatus
  } from '@/utils/common';
  import JSONbig from 'json-bigint';
  import { handleApiResponseError, handleApiCatchError } from "@/utils/common";
  import { auditStatusRecord } from '@/constants/business';



  const { hasAuth } = useAuth();

  const appStore = useAppStore();

  // 渲染邮件状态
  const renderMailStatus = (status: number) => {
    const statusInfo = getMailStatusInfo(status);
    return <NTag type={statusInfo.type}>{statusInfo.label}</NTag>;
  };

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
    apiFn: fetchGetMultiMailList,
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
        title: $t("page.manage.operateserver.mailRemark"),
        align: "center",
        width: 80,
        ellipsis: { tooltip: true }
      },
      {
        key: "top",
        title: $t("page.manage.operateserver.topOrder"),
        align: "center",
        width: 80,
        render: (row: any) => {
          const value =
            row.top !== undefined && row.top !== null && `${row.top}` !== ""
              ? Number(row.top)
              : 0;
          return <span>{value}</span>;
        },
      },
      {
        key: "mailStatus",
        title: $t("page.manage.operateserver.mailStatus"),
        align: "center",
        width: 80,
        render: (row: any) => renderMailStatus(row.mailStatus)
      },
      {
        key: "audit",
        title: $t("page.manage.operateserver.auditStatus"),
        align: "center",
        width: 100,
        render: (row: any) => {
          const auditStatusMap: Record<number, { type: 'default' | 'success' | 'error' | 'warning' | 'info'; label: string }> = {
            0: { type: 'warning', label: $t(auditStatusRecord['0']) },
            1: { type: 'success', label: $t(auditStatusRecord['1']) },
            2: { type: 'error', label: $t(auditStatusRecord['2']) }
          };
          const statusInfo = auditStatusMap[row.audit] || { type: 'default', label: $t('未知') };
          return <NTag type={statusInfo.type}>{statusInfo.label}</NTag>;
        }
      },
      {
        key: "mailRolesJson",
        title: $t("page.manage.operateserver.sendStatus"),
        align: "center",
        width: 150,
        render: (row: any) => {
          if (!row.mailRolesJson || row.mailStatus === 0 || row.mailStatus === 1) {
            return (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <NTooltip trigger="hover">
                {{
                  trigger: () => (
                    <div
                      style={{
                        width: '100px',
                        height: '8px',
                        backgroundColor: '#D3D3D3',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                      onClick={() => handleView(row)}
                    />
                  ),
                  default: () => (
                    <div>
                      <div>{$t("page.manage.operateserver.notSend")}</div>
                    </div>
                  )
                }}
              </NTooltip>
              </div>
            );
          }

          const { success, total, percentage } = parseSendStatus(row.mailRolesJson);

          if (total === 0) {
            return (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <span style={{ color: '#909399', fontSize: '12px' }}>{$t("page.manage.operateserver.noData")}</span>
                <NProgress
                  percentage={100}
                  status="default"
                  strokeWidth={6}
                  showIndicator={false}
                  style={{ width: '100px' }}
                />
              </div>
            );
          }

          const failed = total - success;
          const failedPercentage = total > 0 ? Math.round((failed / total) * 100) : 0;

          return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
              <NTooltip trigger="hover">
                {{
                  trigger: () => (
                    <div
                      style={{
                        width: '100px',
                        height: '8px',
                        backgroundColor: '#F0F0F0',
                        borderRadius: '4px',
                        position: 'relative',
                        overflow: 'hidden',
                        cursor: 'pointer'
                      }}
                      onClick={() => handleView(row)}
                    >
                      {/* 成功部分（绿色） */}
                      {success > 0 && (
                        <div style={{
                          position: 'absolute',
                          left: '0',
                          top: '0',
                          height: '100%',
                          width: `${percentage}%`,
                          backgroundColor: '#67C23A',
                          borderRadius: '4px 0 0 4px'
                        }} />
                      )}

                      {/* 失败部分（红色） */}
                      {failed > 0 && (
                        <div style={{
                          position: 'absolute',
                          left: `${percentage}%`,
                          top: '0',
                          height: '100%',
                          width: `${failedPercentage}%`,
                          backgroundColor: '#F56C6C',
                          borderRadius: percentage === 0 ? '4px' : '0 4px 4px 0'
                        }} />
                      )}
                    </div>
                  ),
                  default: () => (
                    <div>
                      <div>{$t("page.manage.operateserver.total")}: {total} {$t("page.manage.operateserver.item")}</div>
                      <div style={{ color: '#67C23A' }}>{$t("page.manage.operateserver.success")}: {success} {$t("page.manage.operateserver.item")}</div>
                      <div style={{ color: '#F56C6C' }}>{$t("page.manage.operateserver.failed")}: {failed} {$t("page.manage.operateserver.item")}</div>
                    </div>
                  )
                }}
              </NTooltip>
            </div>
          );
        }
      },
      {
        key: "mailTitle",
        title: $t("page.manage.operateserver.mailTitle"),
        align: "center",
        ellipsis: { tooltip: true }
      },
      {
        key: "mailContent",
        title: $t("page.manage.operateserver.mailContent"),
        align: "center",
        minWidth: 80,
        ellipsis: { tooltip: true }
      },
      {
        key: "mailExpire",
        title: $t("page.manage.operateserver.mailExpire"),
        align: "center",
        minWidth: 80,
        render: (row: any) => renderMailExpire(row.mailExpire)
      },
      {
        key: "mailSendDate",
        title: $t("page.manage.operateserver.mailSendDate"),
        align: "center",
        minWidth: 80,
        render: (row: any) => renderMailSendDate(row.mailSendDate)
      },
      {
        key: "createDate",
        title: $t("page.manage.operateserver.createDate"),
        align: "center",
        minWidth: 80,
        render: (row: any) => renderCreateDate(row.createDate)
      },
      // {
      //   key: "updateDate",
      //   title: $t("page.manage.operateserver.updateDate"),
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
            {canStopSending(row.mailStatus) && hasAuth('operate:multipleMail:stop') ? (
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
            ) : hasAuth('operate:multipleMail:start') && (
              <NPopconfirm onPositiveClick={() => handleSendMail(row.id)}>
              {{
                default: () => $t("common.confirmSend"),
                trigger: () => (
                  <NButton
                    type="success"
                    ghost
                    size="small"
                    disabled={isSendDisabled(row.mailStatus)}
                  >
                    {$t("common.send")}
                  </NButton>
                ),
              }}
              </NPopconfirm>
            )}
            {hasAuth('operate:multipleMail:query') && (
              <NButton
              type="info"
              ghost
              size="small"
              onClick={() => handleView(row)}
            >
              {$t("common.view")}
            </NButton>
            )}

            {hasAuth('operate:multipleMail:edit') && (
              <NButton
              type="primary"
              ghost
              size="small"
              disabled={row.audit === 1 || row.audit === 2 || isSendDisabled(row.mailStatus) || canStopSending(row.mailStatus)}
              onClick={() => edit(row.id, row, isSendDisabled(row.mailStatus) || canStopSending(row.mailStatus))}
            >
              {$t("common.edit")}
            </NButton>
            )}

            {hasAuth('operate:multipleMail:remove') && (
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
    defaultHiddenKeys: ['createDate'],
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
  const currentGoodsJson = ref<string>("");
  const batchAddModalVisible = ref(false);
  const auditModalVisible = ref(false);
  const currentAuditData = ref<any>(null);

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
        return fetchDeleteMultiMail(Number(id));
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
      const response = await fetchDeleteMultiMail(id);

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
        fetchSendMultiMail,
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
      fetchStopMultiMail,
      id,
      'stop',
      () => {
        getData();
        mailPoller.stopPolling();
      },
      (error) => console.error('停止失败:', error)
    );
  }

  function edit(id: number, row: any, isReadonly = false) {
    const editData = {
      ...row,
      isReadonly
    };
    handleEdit(id, editData);
  }

  function handleView(row: any) {
    try {
      let rolesData;

      if (typeof row.mailRolesJson === "object" && row.mailRolesJson !== null) {
        rolesData = row.mailRolesJson;
      } else if (typeof row.mailRolesJson === "string") {
        try {
          // 使用 JSONbig 解析，保留大整数为字符串
          rolesData = JSONbig({ storeAsString: true }).parse(row.mailRolesJson);
        } catch (parseError) {
          try {
            // 二次解析也使用 JSONbig
            const firstParse = JSONbig({ storeAsString: true }).parse(row.mailRolesJson);
            rolesData = JSONbig({ storeAsString: true }).parse(firstParse);
          } catch (secondError) {
            console.error("二次解析失败:", secondError);
          }
        }
      }

      if (Array.isArray(rolesData)) {
        // 使用 JSONbig 进行深拷贝，保留大整数为字符串
        currentViewData.value = JSONbig({ storeAsString: true }).parse(
          JSONbig({ storeAsString: true }).stringify(rolesData)
        );
        // 传递 goodsJson 到弹窗
        currentGoodsJson.value = row.goodsJson || "";
        viewModalVisible.value = true;
      } else {
        console.error("解析后的数据不是数组:", rolesData);
        window.$message?.error($t("common.error"));
      }
    } catch (error) {
      console.error("处理角色数据失败:", error);
      window.$message?.error($t("common.error"));
    }
  }

  function handleSearch() {
    getData();
  }

  // 处理提交成功后的回调
  async function handleSubmitted(addedData?: any) {
    // 如果是新增模式且有返回数据，先切换到编辑模式，再刷新数据
    if (operateType.value === 'add' && addedData && addedData.id) {
      // 直接使用返回的数据切换到编辑模式
      edit(addedData.id, addedData, false);
      // 然后刷新数据列表（不阻塞编辑对话框的打开）
      getDataByPage().catch(err => console.error('刷新数据失败:', err));
    } else {
      // 其他情况（编辑模式）只刷新数据
      await getDataByPage();
    }
  }

  function handleBatchAdd() {
    batchAddModalVisible.value = true;
  }

  function onBatchAddSuccess() {
    batchAddModalVisible.value = false;
    getData();
  }

  // 批量审核邮件 - 打开审核弹框
  function handleBatchAudit() {
    if (checkedRowKeys.value.length === 0) {
      window.$message?.warning($t("common.pleaseSelectData"));
      return;
    }

    if (checkedRowKeys.value.length > 1) {
      window.$message?.warning($t("page.manage.operateserver.selectOneMailToAudit"));
      return;
    }

    const selectedMail = data.value.find((item: any) => item.id === checkedRowKeys.value[0]);
    if (!selectedMail) return;

    try {
      const rolesData = typeof selectedMail.mailRolesJson === "string"
        ? JSONbig({ storeAsString: true }).parse(selectedMail.mailRolesJson)
        : selectedMail.mailRolesJson;

      if (Array.isArray(rolesData)) {
        currentViewData.value = JSONbig({ storeAsString: true }).parse(
          JSONbig({ storeAsString: true }).stringify(rolesData)
        );
        currentGoodsJson.value = selectedMail.goodsJson || "";
        currentAuditData.value = selectedMail;
        auditModalVisible.value = true;
      }
    } catch (error) {
      handleApiCatchError(error);
    }
  }

  // 审核通过
  async function handleAuditApprove() {
    if (!currentAuditData.value) return;

    try {
      const response = await fetchAuditMultiMail(currentAuditData.value.id, 1);
      if (!handleApiResponseError(response, '审核')) {
        window.$message?.success($t("common.auditSuccess"));
        auditModalVisible.value = false;
        checkedRowKeys.value = [];
        getData();
      } else {
        auditModalVisible.value = false;
      }
    } catch (error) {
      handleApiCatchError(error, '审核');
      auditModalVisible.value = false;
    }
  }

  // 审核拒绝
  function handleAuditReject() {
    if (!currentAuditData.value) return;

    window.$dialog?.warning({
      title: $t("common.tip"),
      content: $t("common.confirmReject"),
      positiveText: $t("common.confirm"),
      negativeText: $t("common.cancel"),
      onPositiveClick: async () => {
        try {
          const response = await fetchAuditMultiMail(currentAuditData.value.id, 2);
          if (!handleApiResponseError(response, '审核')) {
            window.$message?.success($t("common.rejectSuccess"));
            auditModalVisible.value = false;
            checkedRowKeys.value = [];
            getData();
          } else {
            auditModalVisible.value = false;
          }
        } catch (error) {
          handleApiCatchError(error, '审核');
          auditModalVisible.value = false;
        }
      }
    });
  }

  // 克隆邮件
  function handleCloneMail() {
    if (checkedRowKeys.value.length === 0) {
      window.$message?.warning($t("common.pleaseSelectData"));
      return;
    }

    if (checkedRowKeys.value.length > 1) {
      window.$message?.warning($t("page.manage.operateserver.selectOneMailToClone"));
      return;
    }

    // 找到选中的邮件数据
    const selectedId = checkedRowKeys.value[0];
    const selectedMail = data.value.find((item: any) => item.id === selectedId);

    if (selectedMail) {
      // 复制邮件数据，在备注后添加 (复制) 标识
      // 注意：不复制 id、createDate、updateDate 等字段，确保是新增而非更新
      const { id, createDate, updateDate, ...mailData } = selectedMail as any;
      const cloneData = {
        ...mailData,
        mailRemark: `${(selectedMail as any).mailRemark || ''} (${$t("common.copy")})`,
        isReadonly: false,
        audit: 0 // 克隆后的邮件审核状态始终为待审核
      };

      // 直接将克隆的数据传递给 handleAdd
      handleAdd(cloneData);
    }
  }

  onMounted(async () => {
    getData();
    // 预加载物品数据（不阻塞页面加载）
    ensureItemDataLoaded();
  });

  </script>

  <template>
    <div
    class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto"
    >
      <MultiMailSearch
        v-model:model="searchParams"
        @reset="resetSearchParams"
        @search="handleSearch"
      />

      <NCard
        :title="$t('page.manage.operateserver.title')"
        :bordered="false"
        size="small"
        class="sm:flex-1-hidden card-wrapper"
      >
        <template #header-extra>
          <TableHeaderOperation
            v-model:columns="columnChecks"
            :disabled-delete="checkedRowKeys.length === 0"
            :disabled-clone-mail="checkedRowKeys.length !== 1"
            :disabled-audit="checkedRowKeys.length === 0"
            :loading="loading"
            @add="() => handleAdd()"
            @delete="handleBatchDelete"
            @clone-mail="handleCloneMail"
            @audit="handleBatchAudit"
            @refresh="getData"
            :show-add="hasAuth('operate:multipleMail:add')"
            :show-batch-delete="hasAuth('operate:multipleMail:remove')"
            :show-clone-mail="hasAuth('operate:multipleMail:add')"
            :show-audit="hasAuth('operate:multipleMail:audit')"
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
          :readonly="(editingData)?.isReadonly"
          @submitted="handleSubmitted"
        />

        <ViewStatusModal
          v-model:visible="viewModalVisible"
          :server-data="currentViewData"
          :goods-json="currentGoodsJson"
        />

        <BatchAddModal
          v-model:visible="batchAddModalVisible"
          @success="onBatchAddSuccess"
        />

        <AuditModal
          v-model:visible="auditModalVisible"
          :server-data="currentViewData"
          :goods-json="currentGoodsJson"
          @approve="handleAuditApprove"
          @reject="handleAuditReject"
        />
      </NCard>
    </div>
  </template>

  <style scoped></style>
