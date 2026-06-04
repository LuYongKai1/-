<script setup lang="ts">
import { ref } from "vue";
import { NCard, NSpace, NButton, NAlert } from "naive-ui";
import ShabakServerModal from "./modules/shabak-server-modal.vue";
import EntertainmentModal from "./modules/entertainment-modal.vue";
import ClearRankModal from "./modules/clear-rank-modal.vue";
import { useAuth } from "@/hooks/business/auth";

defineOptions({
  name: "ShabakActivity",
});

const { hasAuth } = useAuth();

// 模态框显示状态
const modalVisible = ref(false);
const currentPhase = ref(1);
const currentPhaseName = ref("");

// 娱乐活动模态框显示状态
const entertainmentModalVisible = ref(false);

// 清空排行榜模态框显示状态
const clearRankModalVisible = ref(false);

// 沙巴克活动阶段配置
const shabakPhases = [
  {
    phase: 1,
    name: "竞标开始",
    description: "开启沙巴克竞标阶段，玩家可以开始竞标",
    type: "primary",
    icon: "icon-ic-round-gavel",
  },
  {
    phase: 2,
    name: "报名结算",
    description: "结束沙巴克竞标阶段，停止接受竞标",
    type: "warning",
    icon: "icon-ic-round-timer-off",
  },
  {
    phase: 3,
    name: "战场开始",
    description: "开启沙巴克战场，玩家可以进入战场参与战斗",
    type: "error",
    icon: "icon-ic-round-sports-kabaddi",
  },
];

// 打开服务器选择模态框
function openServerModal(phase: number, phaseName: string) {
  currentPhase.value = phase;
  currentPhaseName.value = phaseName;
  modalVisible.value = true;
}

// 打开娱乐活动模态框
function openEntertainmentModal() {
  entertainmentModalVisible.value = true;
}

// 打开清空排行榜模态框
function clearLeaderboard() {
  clearRankModalVisible.value = true;
}

// 活动开启成功回调
function handleSuccess() {
  // 可以在这里添加刷新数据或其他操作
  window.$message?.success("操作成功");
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <NCard
      title="沙巴克活动"
      :bordered="false"
      size="small"
      class="card-wrapper"
    >
      <!-- 说明信息 -->
      <NAlert
        title="沙巴克活动说明"
        type="info"
        class="mb-16px"
      >
        请选择对应的活动阶段，然后选择需要开启活动的区服。每个阶段需要按顺序开启。
      </NAlert>

      <!-- 沙巴克活动阶段卡片 -->
      <div class="shabak-phases">
        <div class="phase-card">
          <div class="phase-header">
            <icon-ic-round-sports-kabaddi class="phase-icon" />
            <h3 class="phase-title">沙巴克活动阶段</h3>
          </div>
          <p class="phase-description">开启沙巴克活动的各个阶段：竞标开始、竞标结束、战场开始</p>
          <div class="phase-buttons">
            <NButton
              v-for="item in shabakPhases"
              :key="item.phase"
              :type="item.type as any"
              size="large"
              @click="openServerModal(item.phase, item.name)"
              :disabled="!hasAuth('operate:activity:createSbuke')"
            >
              <template #icon>
                <component :is="item.icon" />
              </template>
              {{ item.name }}
            </NButton>
          </div>
        </div>

        <!-- 创建娱乐活动卡片 -->
        <div class="phase-card">
          <div class="phase-header">
            <icon-ic-round-add-circle class="phase-icon" />
            <h3 class="phase-title">创建娱乐活动</h3>
          </div>
          <p class="phase-description">创建新的娱乐活动，配置活动参数和规则</p>
          <NButton
            type="success"
            size="large"
            block
            @click="openEntertainmentModal"
            :disabled="!hasAuth('game:item:createAmusement')"
          >
            <template #icon>
              <icon-ic-round-play-arrow />
            </template>
            创建活动
          </NButton>
        </div>

        <!-- 清空排行榜卡片 -->
        <div class="phase-card">
          <div class="phase-header">
            <icon-ic-round-delete-sweep class="phase-icon" />
            <h3 class="phase-title">清空排行榜</h3>
          </div>
          <p class="phase-description">清空沙巴克活动排行榜数据，重置所有排名信息</p>
          <NButton
            type="error"
            size="large"
            block
            @click="clearLeaderboard"
            :disabled="!hasAuth('game:item:rebuildRanking')"
          >
            <template #icon>
              <icon-ic-round-delete-forever />
            </template>
            清空排行榜
          </NButton>
        </div>
      </div>
    </NCard>

    <!-- 服务器选择模态框 -->
    <ShabakServerModal
      v-model:visible="modalVisible"
      :phase="currentPhase"
      :phase-name="currentPhaseName"
      @success="handleSuccess"
    />

    <!-- 娱乐活动模态框 -->
    <EntertainmentModal
      v-model:visible="entertainmentModalVisible"
      @success="handleSuccess"
    />

    <!-- 清空排行榜模态框 -->
    <ClearRankModal
      v-model:visible="clearRankModalVisible"
      @success="handleSuccess"
    />
  </div>
</template>

<style lang="scss" scoped>
.card-wrapper {
  margin-bottom: 16px;
}

.shabak-phases {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  margin-top: 16px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.phase-card {
  padding: 24px;
  border: 1px solid var(--n-border-color);
  border-radius: 8px;
  background: var(--n-color);
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }
}

.phase-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.phase-icon {
  font-size: 32px;
  color: var(--n-color-target);
}

.phase-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--n-text-color);
}

.phase-description {
  margin: 0 0 20px 0;
  color: var(--n-text-color-2);
  line-height: 1.6;
  min-height: 48px;
}

.phase-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
