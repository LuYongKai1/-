<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import ItemSearchSelector from "@/components/business/item-search-selector.vue";
import { fetchSaveSeasonRankRewardRule } from "@/service/api/game-manage";
import { handleApiCatchError } from "@/utils/common";
import type { ItemInfo } from "@/utils/item";

interface ItemImage {
  thumbnail: string;
  detail: string;
}

defineOptions({
  name: "RewardConfigAddModal",
});

type RewardType = "INDIVIDUAL" | "GUILD";

interface EditRow {
  id: string;
  seasonId: number;
  rankStart: number;
  rankEnd: number;
  rewardType?: RewardType;
  rewardContent: any;
}

interface Props {
  initialSeasonId: number;
  initialRewardType: RewardType;
  editRow?: EditRow | null;
}

const props = defineProps<Props>();

const isEdit = computed(() => !!props.editRow);

interface Emits {
  (e: "submitted"): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>("visible", { default: false });

const submitLoading = ref(false);

const model = reactive({
  manualSeasonId: 1,
  seasonName: "",
  rewardType: "INDIVIDUAL" as RewardType,
  rankStart: 1 as number | null,
  rankEnd: 10 as number | null,
});

const selectedItems = ref<ItemInfo[]>([]);
// 每个物品的图片，key 为物品 id
const itemImages = ref<Record<string, ItemImage>>({});

function getItemImage(id: string): ItemImage {
  if (!itemImages.value[id]) {
    itemImages.value[id] = { thumbnail: "", detail: "" };
  }
  return itemImages.value[id];
}

const rewardTypeOptions = [
  { label: "个人", value: "INDIVIDUAL" as const },
  { label: "公会", value: "GUILD" as const },
];

function getSaveValidationMessage(): string | null {
  const sid = Number(model.manualSeasonId);
  if (!Number.isFinite(sid) || sid < 1) return "请选择或填写赛季";

  const rs = model.rankStart;
  const re = model.rankEnd;

  if (rs === null || re === null || !Number.isInteger(rs) || !Number.isInteger(re)) {
    return "请填写整数排名区间";
  }
  if (rs < 1 || re < 1) return "排名需为正整数";
  if (rs > re) return "排名起始不能大于结束名次";

  if (!selectedItems.value.length) return "请选择发放物品";
  return null;
}

const canSave = computed(() => !getSaveValidationMessage());

function parseRewardContent(raw: any): { items: ItemInfo[]; images: Record<string, ItemImage> } {
  const items: ItemInfo[] = [];
  const images: Record<string, ItemImage> = {};

  let arr: any[] = [];
  if (Array.isArray(raw)) {
    arr = raw;
  } else if (typeof raw === "string" && raw.trim().startsWith("[")) {
    try { arr = JSON.parse(raw); } catch { arr = []; }
  }

  for (const it of arr) {
    const id = String(it.itemId ?? it.id ?? "");
    if (!id) continue;
    items.push({
      id,
      name: it.name ?? it.itemName ?? id,
      names: it.name ?? it.itemName ?? id,
      count: Number(it.num ?? it.count ?? 1),
    });
    if (it.thumbnail || it.detail) {
      images[id] = { thumbnail: it.thumbnail ?? "", detail: it.detail ?? "" };
    }
  }
  return { items, images };
}

function resetForm() {
  model.manualSeasonId = props.initialSeasonId;
  model.seasonName = "";
  model.rewardType = props.initialRewardType;
  model.rankStart = 1;
  model.rankEnd = 10;
  selectedItems.value = [];
  itemImages.value = {};
}

function initFromProps() {
  if (props.editRow) {
    const row = props.editRow;
    model.manualSeasonId = row.seasonId;
    model.seasonName = (row as any).seasonName || "";
    model.rewardType = (row.rewardType as RewardType) ?? props.initialRewardType;
    model.rankStart = row.rankStart;
    model.rankEnd = row.rankEnd;
    const { items, images } = parseRewardContent(row.rewardContent);
    selectedItems.value = items;
    itemImages.value = images;
  } else {
    model.manualSeasonId = props.initialSeasonId;
    model.seasonName = "";
    model.rewardType = props.initialRewardType;
    model.rankStart = 1;
    model.rankEnd = 10;
    selectedItems.value = [];
    itemImages.value = {};
  }
}

watch(
  () => [props.initialSeasonId, props.initialRewardType],
  () => {
    if (visible.value) initFromProps();
  }
);

watch(visible, (newVal) => {
  if (newVal) initFromProps();
});

async function handleSaveRule() {
  if (submitLoading.value) return;

  const validationMsg = getSaveValidationMessage();
  if (validationMsg) {
    window.$message?.warning(validationMsg);
    return;
  }

  const seasonId = Number(model.manualSeasonId);
  const rs = model.rankStart!;
  const re = model.rankEnd!;

  // 后端实际报错表明 reward_content 反序列化目标是 String
  // 因此这里需要传字符串：JSON.stringify(数组)
  const rewardContentArr = selectedItems.value.map((it) => {
    const img = itemImages.value[it.id];
    return {
      itemId: Number(it.id),
      name: (it.names && it.names.trim()) || (it.name && it.name.trim()) || String(it.id),
      num: Number(it.count ?? 1),
      thumbnail: img?.thumbnail || undefined,
      detail: img?.detail || undefined,
    };
  });

  const rewardContent = JSON.stringify(rewardContentArr);

  submitLoading.value = true;
  try {
    const response = await fetchSaveSeasonRankRewardRule({
      id: props.editRow?.id ?? undefined,
      seasonId,
      seasonName: model.seasonName,
      rewardType: model.rewardType,
      rankStart: rs,
      rankEnd: re,
      rewardContent,
    });
    const data = response?.data?.data ?? response?.data ?? response?.response?.data ?? response;
    const code = data?.code ?? data?.response?.data?.code;
    const isSuccess = code === undefined || code === null || code === 200 || code === 0;

    if (!isSuccess) {
      window.$message?.error(data?.msg || "保存失败");
      return;
    }

    window.$message?.success(isEdit.value ? "修改成功" : "新增成功");
    visible.value = false;
    emit("submitted");
    resetForm();
  } catch (error) {
    handleApiCatchError(error, "保存奖励配置");
  } finally {
    submitLoading.value = false;
  }
}

function closeModal() {
  visible.value = false;
}

onMounted(() => {
  resetForm();
});
</script>

<template>
  <NModal
    v-model:show="visible"
    preset="card"
    :title="isEdit ? '编辑奖励规则' : '新增奖励规则'"
    class="w-1200px"
    :mask-closable="true"
  >
    <NCard
      :bordered="true"
      size="small"
      class="config-card operation-card"
      :segmented="{
        content: true,
        footer: 'soft',
      }"
    >
      <template #header>
        <div class="config-card__header">
          <div class="config-card__header-main">
            <div class="config-card__icon-wrap">
              <icon-mdi-gift class="config-card__icon" />
            </div>
            <div class="config-card__titles">
              <span class="config-card__title">奖励配置</span>
              <NText depth="3" class="config-card__subtitle">
                设置赛季与名次 → 选择物品 → 保存后写入下方规则表
              </NText>
            </div>
          </div>
        </div>
      </template>

      <div class="config-card__body config-card__body--split">
        <aside class="config-aside">
          <NForm
            :show-feedback="false"
            label-placement="top"
            label-width="auto"
            class="config-form"
          >
            <div class="reward-block">
              <div class="reward-block__head">
                <span class="reward-block__head-text">规则条件</span>
                <NText depth="3" class="reward-block__head-hint">赛季与名次</NText>
              </div>
              <div class="reward-block__body">
                <NFormItem label="赛季编号">
                  <NInputNumber
                    v-model:value="model.manualSeasonId"
                    :min="1"
                    :precision="0"
                    placeholder="例如 1、2、3"
                    class="w-full"
                  />
                </NFormItem>

                <NFormItem label="赛季名称">
                  <NInput
                    v-model:value="model.seasonName"
                    placeholder="请输入赛季名称"
                    clearable
                    class="w-full"
                  />
                </NFormItem>

                <NFormItem label="奖励类型">
                  <NSelect
                    v-model:value="model.rewardType"
                    :options="rewardTypeOptions"
                    placeholder="请选择奖励类型"
                    filterable
                    class="w-full"
                  />
                </NFormItem>

                <NFormItem label="名次区间（含首尾）">
                  <div class="rank-range-wrap">
                    <div class="rank-range-row">
                      <span class="rank-range-label">从</span>
                      <NInputNumber
                        v-model:value="model.rankStart"
                        :min="1"
                        :precision="0"
                        placeholder="起始名次"
                        class="rank-range-input"
                        size="medium"
                      />
                    </div>
                    <span class="rank-range-sep">~</span>
                    <div class="rank-range-row">
                      <span class="rank-range-label">到</span>
                      <NInputNumber
                        v-model:value="model.rankEnd"
                        :min="1"
                        :precision="0"
                        placeholder="结束名次"
                        class="rank-range-input"
                        size="medium"
                      />
                    </div>
                  </div>
                </NFormItem>

              </div>
            </div>
          </NForm>
        </aside>

        <section class="config-main">
          <div class="reward-block reward-block--stretch">
            <div class="reward-block__head">
              <span class="reward-block__head-text">发放物品</span>
              <NText depth="3" class="reward-block__head-hint">
                搜索添加后可在表中改数量，最多 30 个
              </NText>
            </div>
            <div class="reward-block__body reward-block__body--items item-panel">
              <ItemSearchSelector
                v-model="selectedItems"
                :max-count="30"
                placeholder="输入物品名称或 ID，回车或点击结果以加入列表"
                :max-height="200"
              />

              <!-- 每个物品的图片配置 -->
              <template v-if="selectedItems.length > 0">
                <NDivider class="item-img-divider">
                  <span class="item-img-divider__text">物品图片配置</span>
                </NDivider>
                <div class="item-img-list">
                  <div
                    v-for="item in selectedItems"
                    :key="item.id"
                    class="item-img-row"
                  >
                    <div class="item-img-row__label">
                      <NTag size="small" type="info" :bordered="false">{{ item.names || item.name || item.id }}</NTag>
                      <NText depth="3" class="item-img-row__id">ID: {{ item.id }}</NText>
                    </div>
                    <div class="item-img-row__fields">
                      <div class="item-img-field">
                        <span class="item-img-field__title">
                          <icon-mdi-image-outline class="item-img-field__icon" />
                          缩略图
                        </span>
                        <NInput
                          v-model:value="getItemImage(item.id).thumbnail"
                          placeholder="请输入缩略图 URL"
                          clearable
                          size="small"
                          class="item-img-field__input"
                        />
                        <div v-if="getItemImage(item.id).thumbnail" class="item-img-field__preview">
                          <img :src="getItemImage(item.id).thumbnail" alt="缩略图" class="item-img-field__img" />
                        </div>
                      </div>
                      <div class="item-img-field">
                        <span class="item-img-field__title">
                          <icon-mdi-image-multiple-outline class="item-img-field__icon" />
                          详情图
                        </span>
                        <NInput
                          v-model:value="getItemImage(item.id).detail"
                          placeholder="请输入详情图 URL"
                          clearable
                          size="small"
                          class="item-img-field__input"
                        />
                        <div v-if="getItemImage(item.id).detail" class="item-img-field__preview">
                          <img :src="getItemImage(item.id).detail" alt="详情图" class="item-img-field__img" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </section>
      </div>

      <template #footer>
        <div class="config-card__footer config-card__footer--bar">
          <NSpace :size="10" :wrap="true" justify="end" class="w-full">
            <NButton @click="resetForm">
              <template #icon>
                <icon-ic-round-refresh class="text-icon" />
              </template>
              重置
            </NButton>
            <NButton @click="closeModal">
              取消
            </NButton>
            <NButton
              type="primary"
              :loading="submitLoading"
              class="config-card__btn-save"
              :disabled="!canSave"
              @click="handleSaveRule"
            >
              <template #icon>
                <icon-mdi-check class="text-icon" />
              </template>
              {{ isEdit ? '保存修改' : '保存配置' }}
            </NButton>
          </NSpace>
        </div>
      </template>
    </NCard>
  </NModal>
</template>

<style scoped>
.operation-card {
  flex-shrink: 0;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
}

.config-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.config-card__header-main {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  min-width: 0;
}

.config-card__icon-wrap {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.18) 0%,
    rgba(59, 130, 246, 0.12) 100%
  );
  border: 1px solid rgba(99, 102, 241, 0.22);
}

.config-card__icon {
  font-size: 24px;
  color: var(--n-primary-color);
}

.config-card__titles {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.config-card__title {
  font-size: 17px;
  font-weight: 600;
  line-height: 1.35;
  letter-spacing: 0.02em;
  color: var(--n-text-color-1);
}

.config-card__subtitle {
  font-size: 12px;
  line-height: 1.55;
  max-width: 640px;
}

.config-card__body--split {
  display: grid;
  gap: 20px;
  align-items: stretch;
}

@media (min-width: 1024px) {
  .config-card__body--split {
    grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
  }
}

.config-form :deep(.n-form-item-label) {
  font-weight: 600;
  font-size: 13px;
  padding-bottom: 6px;
  color: var(--n-text-color-2);
}

.config-form :deep(.n-form-item) {
  margin-bottom: 16px;
}

.reward-block__body :deep(.n-form-item:last-child) {
  margin-bottom: 0;
}

.reward-block {
  border-radius: 10px;
  border: 1px solid var(--n-border-color);
  overflow: hidden;
  background: var(--n-color-embedded);
}

.reward-block--stretch {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 480px;
  max-height: 480px;
}

.config-aside .reward-block {
  min-height: 480px;
  max-height: 480px;
  display: flex;
  flex-direction: column;
}

.config-aside .reward-block__body {
  flex: 1;
  overflow: auto;
  min-height: 0;
}

.reward-block__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px 12px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--n-border-color);
  background: var(--n-color);
}

.reward-block__head-text {
  font-size: 13px;
  font-weight: 600;
  color: var(--n-text-color-1);
}

.reward-block__head-hint {
  font-size: 12px;
}

.reward-block__body {
  padding: 12px 14px 14px;
}

.reward-block__body--items {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: auto;
}

.rank-range-wrap {
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-wrap: nowrap;
  gap: 6px;
  width: 100%;
}

.rank-range-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.rank-range-label {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--n-text-color-3);
  user-select: none;
}

.rank-range-sep {
  flex-shrink: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--n-text-color-3);
}

.rank-range-input {
  flex: 1;
  min-width: 0;
}

.rank-range-input :deep(.n-input-number) {
  width: 100%;
}

.item-panel {
  width: 100%;
}

.item-panel :deep(.n-data-table) {
  width: 100%;
}

.item-panel :deep(.n-input),
.item-panel :deep(.n-base-selection) {
  border-radius: 8px;
}

.config-card__footer {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.config-card__footer--bar {
  margin: 4px -4px -2px;
  padding-top: 14px;
  border-top: 1px solid var(--n-border-color);
}

@media (min-width: 640px) {
  .config-card__footer--bar {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.config-card__btn-save {
  min-width: 120px;
}

.item-img-divider {
  margin: 12px 0 8px;
}

.item-img-divider__text {
  font-size: 12px;
  font-weight: 600;
  color: var(--n-text-color-3);
  letter-spacing: 0.04em;
}

.item-img-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.item-img-row {
  border: 1px solid var(--n-border-color);
  border-radius: 8px;
  overflow: hidden;
  background: var(--n-color);
}

.item-img-row__label {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: var(--n-color-embedded);
  border-bottom: 1px solid var(--n-border-color);
}

.item-img-row__id {
  font-size: 11px;
}

.item-img-row__fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 10px;
}

.item-img-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.item-img-field__title {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  color: var(--n-text-color-2);
}

.item-img-field__icon {
  font-size: 14px;
  color: var(--n-text-color-3);
}

.item-img-field__input {
  width: 100%;
}

.item-img-field__preview {
  border-radius: 6px;
  overflow: hidden;
  border: 1px dashed var(--n-border-color);
  background: var(--n-color-embedded);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 52px;
  max-height: 80px;
}

.item-img-field__img {
  max-width: 100%;
  max-height: 80px;
  object-fit: contain;
  display: block;
}
</style>

