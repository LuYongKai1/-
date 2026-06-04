<script setup lang="ts">
import { NCard } from 'naive-ui';

interface Position {
  mapName: string;
  mapId: number;
  x: number;
  y: number;
  z: number;
}

interface CashInfo {
  cash: number;
  monthCharge: number;
  lastCharge: number;
  mileage: number;
  pointVoucher: number;
  goldIngot: number;
  coin: number;
  contractLeaf: number;
  tongtianJade: number;
  guildContribution: number;
  exoticTimeMark: number;
  martialSoul: number;
}

interface RoleInfo {
  name: string;
  class: string;
  level: number;
  exp: string | number;
  power: number;
  hp: number;
  mp: number;
  position: Position;
  genderType: number;
  characterType: number;
  classType: number;
  pkSetup: number;
  guildGuid: string;
  guildName: string;
  cashInfo: CashInfo;
  vipLevel: number;
  vipTotalPoints: number;
}

interface Props {
  roleInfo: RoleInfo;
}

defineProps<Props>();
</script>

<template>
  <div>
    <div class="flex flex-wrap gap-5">
      <!-- 左侧玩家信息卡片 -->
      <NCard class="w-[520px]" :bordered="false">
        <!-- 玩家信息内容 -->
        <div class="flex flex-col">
          <div class="text-center mb-4">
            <h2 class="text-xl font-bold">{{ roleInfo.name }}</h2>
            <p class="text-gray-500">{{ roleInfo.class}}</p>
          </div>

          <div class="stats-grid-container">
            <div class="level-box">
              <div class="value">{{ roleInfo.level }}</div>
              <div class="label">Level</div>
            </div>
            <div class="exp-box">
              <div class="value">{{ roleInfo.exp }}</div>
              <div class="label">Exp</div>
            </div>
            <div class="power-box">
              <div class="value">{{ roleInfo.power }}</div>
              <div class="label">Power</div>
            </div>
          </div>

          <!-- 货币与资源显示区域 -->
          <div class="currency-container">
            <div class="currency-item">
              <div class="currency-value">{{ roleInfo.cashInfo.pointVoucher ?? 0 }}</div>
              <div class="currency-label">点卷</div>
            </div>
            <div class="currency-item">
              <div class="currency-value">{{ roleInfo.cashInfo.coin ?? 0 }}</div>
              <div class="currency-label">金币</div>
            </div>
            <div class="currency-item">
              <div class="currency-value">{{ roleInfo.cashInfo.goldIngot ?? 0 }}</div>
              <div class="currency-label">元宝</div>
            </div>
            <div class="currency-item">
              <div class="currency-value">{{ roleInfo.cashInfo.guildContribution ?? 0 }}</div>
              <div class="currency-label">公会贡献</div>
            </div>
            <div class="currency-item">
              <div class="currency-value">{{ roleInfo.pkSetup ?? 0 }}</div>
              <div class="currency-label">善恶值</div>
            </div>
            <div class="currency-item">
              <div class="currency-value">{{ roleInfo.cashInfo.contractLeaf ?? 0 }}</div>
              <div class="currency-label">结契之叶</div>
            </div>
            <div class="currency-item">
              <div class="currency-value">{{ roleInfo.cashInfo.tongtianJade ?? 0 }}</div>
              <div class="currency-label">通天玉珀</div>
            </div>
            <div class="currency-item">
              <div class="currency-value">{{ roleInfo.cashInfo.exoticTimeMark ?? 0 }}</div>
              <div class="currency-label">异域时光印记</div>
            </div>
            <div class="currency-item">
              <div class="currency-value">{{ roleInfo.cashInfo.martialSoul ?? 0 }}</div>
              <div class="currency-label">武魂</div>
            </div>
          </div>
        </div>
      </NCard>

      <!-- 右侧状态信息卡片 -->
      <div class="flex flex-col gap-5 flex-1">
        <NCard :bordered="false" title="Stats">
          <div class="grid grid-cols-2 gap-6">
            <div class="flex flex-col">
              <div class="stat-label">HP</div>
              <div class="stat-value">{{ roleInfo.hp }}</div>
            </div>
            <div class="flex flex-col">
              <div class="stat-label">MP</div>
              <div class="stat-value">{{ roleInfo.mp }}</div>
            </div>
          </div>
        </NCard>

        <NCard :bordered="false" title="Position">
          <div class="grid grid-cols-2 gap-2 mb-3">
            <div class="flex flex-col">
              <div class="pos-label">Map Name</div>
              <div class="pos-value">{{ roleInfo.position.mapName }}</div>
            </div>
            <div class="flex flex-col">
              <div class="pos-label">Map ID</div>
              <div class="pos-value">{{ roleInfo.position.mapId }}</div>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-2">
            <div class="flex flex-col">
              <div class="pos-label">X</div>
              <div class="pos-value">{{ roleInfo.position.x }}</div>
            </div>
            <div class="flex flex-col">
              <div class="pos-label">Y</div>
              <div class="pos-value">{{ roleInfo.position.y }}</div>
            </div>
            <div class="flex flex-col">
              <div class="pos-label">Z</div>
              <div class="pos-value">{{ roleInfo.position.z }}</div>
            </div>
          </div>
        </NCard>

        <NCard :bordered="false" title="VIP Info">
          <div class="grid grid-cols-2 gap-6">
            <div class="flex flex-col">
              <div class="stat-label">VIP Level</div>
              <div class="stat-value">{{ roleInfo.vipLevel }}</div>
            </div>
            <div class="flex flex-col">
              <div class="stat-label">VIP Points</div>
              <div class="stat-value">{{ roleInfo.vipTotalPoints }}</div>
            </div>
          </div>
        </NCard>

        <NCard :bordered="false" title="Cash Info">
          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col">
              <div class="stat-label">Cash</div>
              <div class="stat-value">{{ roleInfo.cashInfo.cash }}</div>
            </div>
            <div class="flex flex-col">
              <div class="stat-label">Mileage</div>
              <div class="stat-value">{{ roleInfo.cashInfo.mileage }}</div>
            </div>
            <div class="flex flex-col">
              <div class="stat-label">Month Charge</div>
              <div class="stat-value">{{ roleInfo.cashInfo.monthCharge }}</div>
            </div>
            <div class="flex flex-col">
              <div class="stat-label">Last Charge</div>
              <div class="stat-value">{{ roleInfo.cashInfo.lastCharge }}</div>
            </div>
          </div>
        </NCard>
      </div>
    </div>

    <!-- Guild and Additional Info Row -->
    <div class="flex flex-wrap gap-5 mt-5" v-if="roleInfo.guildName">
      <NCard :bordered="false" title="Guild Info" class="flex-1">
        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col">
            <div class="stat-label">Guild Name</div>
            <div class="stat-value">{{ roleInfo.guildName || 'None' }}</div>
          </div>
          <div class="flex flex-col">
            <div class="stat-label">Guild GUID</div>
            <div class="stat-value text-sm">{{ roleInfo.guildGuid || 'N/A' }}</div>
          </div>
        </div>
      </NCard>
    </div>

    <!-- Character Type Info -->
    <div class="flex flex-wrap gap-5 mt-5">
      <NCard :bordered="false" title="Character Info" class="flex-1">
        <div class="grid grid-cols-3 gap-4">
          <div class="flex flex-col">
            <div class="stat-label">Class Type</div>
            <div class="stat-value">{{ roleInfo.classType }}</div>
          </div>
          <div class="flex flex-col">
            <div class="stat-label">Gender Type</div>
            <div class="stat-value">{{ roleInfo.genderType }}</div>
          </div>
          <div class="flex flex-col">
            <div class="stat-label">Character Type</div>
            <div class="stat-value">{{ roleInfo.characterType }}</div>
          </div>
        </div>
      </NCard>
    </div>
  </div>
</template>

<style scoped>
/* 数值网格容器 */
.stats-grid-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

/* 数值显示卡片优化 */
.level-box, .exp-box, .power-box {
  padding: 20px 12px;
  border-radius: 12px;
  background: rgba(128, 128, 128, 0.05);
  border: 1px solid rgba(128, 128, 128, 0.1);
  transition: all 0.3s ease;
  min-height: 100px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.level-box:hover, .exp-box:hover, .power-box:hover {
  background: rgba(128, 128, 128, 0.08);
  border-color: rgba(128, 128, 128, 0.2);
  transform: translateY(-2px);
}

/* 货币显示容器 */
.currency-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 16px;
  margin-top: 16px;
  padding-top: 20px;
  border-top: 1px solid rgba(128, 128, 128, 0.1);
}

.currency-item {
  padding: 16px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.currency-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 215, 0, 0.15);
}

.currency-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  opacity: 0.7;
  margin-bottom: 8px;
}

.currency-value {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.3px;
}

.value {
  font-size: 26px;
  font-weight: 700;
  margin-bottom: 8px;
  letter-spacing: -0.5px;
  word-break: keep-all;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  opacity: 0.6;
  white-space: nowrap;
}

/* 状态数值样式优化 */
.stat-label, .pos-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  opacity: 0.6;
  margin-bottom: 8px;
}

.stat-value, .pos-value {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.3px;
}

/* 网格布局优化 */
.grid {
  gap: 20px;
}

.grid.grid-cols-2 > div,
.grid.grid-cols-3 > div {
  padding: 16px;
  border-radius: 10px;
  background: rgba(128, 128, 128, 0.03);
  border: 1px solid rgba(128, 128, 128, 0.08);
  transition: all 0.3s ease;
}

.grid.grid-cols-2 > div:hover,
.grid.grid-cols-3 > div:hover {
  background: rgba(128, 128, 128, 0.06);
  border-color: rgba(128, 128, 128, 0.15);
}
</style>

