<script setup lang="ts">
import { computed } from 'vue';

interface RoleInfo {
  id: string;
  name: string;
  serverId: number;
  serverName?: string;
}

interface ItemInfo {
  id: string;
  name: string;
}

interface RefineAttributeConfig {
  id: number;
  name: string;
  value: number;
  valueMax: number;
  grade: number;
}

type EntryAttributeConfig =
  | {
      kind: 'single';
      id: number;
      name: string;
      value: number;
    }
  | {
      kind: 'range';
      ids: [number, number];
      name: string;
      labels: [string, string];
      values: [number, number];
    };

interface ConfirmData {
  roles: RoleInfo[];
  items: ItemInfo[];
  luck: number;
  reinforce: number;
  gemSlotCount: number;
  refineAttributes: RefineAttributeConfig[];
  entryAttributes: EntryAttributeConfig[];
}

const props = defineProps<{
  data: ConfirmData;
  getGradeName: (grade: number) => string;
  isSingleInputRefineById: (id: number) => boolean;
}>();

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

function handleConfirm() {
  emit('confirm');
}

function handleCancel() {
  emit('cancel');
}
</script>

<template>
  <div class="confirm-dialog-content">
    <!-- 角色信息表格 -->
    <div class="section">
      <div class="section-title">角色信息 ({{ data.roles.length }}个)</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>角色名称</th>
            <th>角色ID</th>
            <th>服务器ID</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="role in data.roles" :key="role.id">
            <td>{{ role.name }}</td>
            <td>{{ role.id }}</td>
            <td>{{ role.serverId }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 物品信息表格 -->
    <div class="section">
      <div class="section-title">物品信息 ({{ data.items.length }}个)</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>物品名称</th>
            <th>物品ID</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in data.items" :key="item.id">
            <td>{{ item.name }}</td>
            <td>{{ item.id }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 基础属性表格 -->
    <div class="section">
      <div class="section-title">基础属性</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>祝福</th>
            <th>强化</th>
            <th>宝石卡槽个数</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{{ data.luck }}</td>
            <td>{{ data.reinforce }}</td>
            <td>{{ data.gemSlotCount }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 洗练词条表格 -->
    <div v-if="data.refineAttributes.length > 0" class="section">
      <div class="section-title">洗练词条 ({{ data.refineAttributes.length }}条)</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>属性名称</th>
            <th>稀有度</th>
            <th>最小值</th>
            <th>最大值</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(attr, index) in data.refineAttributes" :key="index">
            <td>{{ attr.name }}</td>
            <td>{{ getGradeName(attr.grade) }}</td>
            <td>{{ attr.value }}</td>
            <td>{{ isSingleInputRefineById(attr.id) ? '-' : attr.valueMax }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 随机词条表格 -->
    <div v-if="data.entryAttributes.length > 0" class="section">
      <div class="section-title">随机词条 ({{ data.entryAttributes.length }}条)</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>属性名称</th>
            <th>最小值</th>
            <th>最大值</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(attr, index) in data.entryAttributes" :key="index">
            <td>{{ attr.name }}</td>
            <td>{{ attr.kind === 'range' ? attr.values[0] : attr.value }}</td>
            <td>{{ attr.kind === 'range' ? attr.values[1] : '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 警告提示 -->
    <div class="warning-box">
      ⚠️ 此操作不可撤销，请确认无误后再提交！
    </div>
  </div>
</template>

<style scoped>
.confirm-dialog-content {
  width: 100%;
  max-height: 550px;
  overflow-y: auto;
}

.section {
  margin-bottom: 16px;
}

.section-title {
  font-weight: 600;
  margin-bottom: 8px;
  font-size: 14px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #d1d5db;
}

.data-table thead tr {
  background-color: #f3f4f6;
}

.data-table th,
.data-table td {
  border: 1px solid #d1d5db;
  padding: 8px 16px;
  text-align: left;
  font-size: 14px;
}

.data-table th {
  font-weight: 600;
}

.warning-box {
  margin-top: 16px;
  padding: 12px;
  background-color: #fef3c7;
  border: 1px solid #fbbf24;
  border-radius: 4px;
  font-size: 14px;
  color: #92400e;
}

/* 滚动条样式 */
.confirm-dialog-content::-webkit-scrollbar {
  width: 6px;
}

.confirm-dialog-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.confirm-dialog-content::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 3px;
}

.confirm-dialog-content::-webkit-scrollbar-thumb:hover {
  background: #999;
}
</style>
