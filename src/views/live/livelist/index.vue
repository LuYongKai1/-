<script setup lang="tsx">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { NCard, NButton, NTag, NSpace, NInput, NModal, NForm, NFormItem, NInputNumber, NSelect } from 'naive-ui';
import { fetchSpawnMonster } from '@/service/api';
import { useServerStore } from '@/store/modules/server';
import { handleApiResponseError, handleApiCatchError } from '@/utils/common';

// 直播状态
const liveData = ref({
  roomId: 'ROOM_001',
  roomName: '游戏服务器 1-001',
  status: 'live', // live, offline
  viewers: 1234,
  startTime: new Date().toLocaleTimeString()
});

// 直播内容数据（模拟聊天消息、事件日志等）
const liveMessages = ref<Array<{
  id: number;
  type: 'system' | 'player' | 'monster' | 'boss';
  content: string;
  time: string;
}>>([
  { id: 1, type: 'system', content: '直播已开始', time: '14:30:00' },
  { id: 2, type: 'player', content: '玩家 [战神] 进入了地图', time: '14:30:15' },
  { id: 3, type: 'monster', content: '刷新了 10 只小怪物', time: '14:30:30' },
]);

// 操作按钮加载状态
const loading = ref({
  spawnMonster: false,
  spawnNpc: false,
  spawnBoss: false,
  spawnEliteBoss: false,
  clearMonsters: false,
  kickPlayers: false,
  announcement: false,
});

// 直播源管理
const liveSourceUrl = ref('');
const showLiveSourceModal = ref(false);
const newLiveSource = ref('');
const liveSourceLoading = ref(false);

// 召唤怪物弹窗
const showMonsterModal = ref(false);
const monsterFormData = ref({
  serverId: '',
  cmd: 'create_boss',
  zoneid: 110,
  lineid: 1,
  monsterid: 2601,
  posx: 14630,
  posy: 16730,
  posz: 5534
});

// 召唤NPC弹窗
const showNpcModal = ref(false);
const npcFormData = ref({
  serverId: '',
  cmd: 'create_npc',
  zoneid: null,
  lineid: null,
  monsterid: null,
  posx: null,
  posy: null,
  posz: null
});

// 地图选项
const mapOptions = [
  { label: '沃玛森林', value: 110 },
  { label: '蛇谷', value: 105 },
  { label: '蛇巢3层', value: 293 },
  { label: '沙巴克', value: 103 }
];

// 怪物选项
const monsterOptions = [
  { label: '骷髅精灵', value: 2601 },
  { label: '沃玛教主', value: 2602 },
  { label: '触龙神', value: 2605 },
  { label: '祖玛教主', value: 2606 },
  { label: '黄泉教主', value: 2607 },
  { label: '牛魔王', value: 2609 },
  { label: '尸王', value: 2603 },
  { label: '石墓王', value: 2604 },
];

// 服务器数据
const serverStore = useServerStore();
const serverTreeOptions = computed(() => serverStore.serverTreeOptions);
const serverLoading = ref(false);

// 计算服务器选项
const serverOptions = computed(() => {
  const options: CommonType.Option<string>[] = [];
  serverTreeOptions.value.forEach((region: any) => {
    if (region.children && region.children.length > 0) {
      region.children.forEach((server: any) => {
        options.push({
          label: server.label,
          value: server.key,
        });
      });
    }
  });
  return options;
});

// 获取服务器列表
async function getServerOptions() {
  serverLoading.value = true;
  try {
    await serverStore.fetchServerList();
  } catch (err) {
    console.error('Error fetching server options:', err);
  } finally {
    serverLoading.value = false;
  }
}

// 自动滚动到底部
const messagesContainer = ref<HTMLElement | null>(null);
const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

// 添加消息
const addMessage = (type: 'system' | 'player' | 'monster' | 'boss', content: string) => {
  const newMessage = {
    id: Date.now(),
    type,
    content,
    time: new Date().toLocaleTimeString()
  };
  liveMessages.value.push(newMessage);
  setTimeout(scrollToBottom, 100);
};

// 打开召唤怪物弹窗
const handleSpawnMonster = async () => {
  await getServerOptions();
  showMonsterModal.value = true;
};

// 打开召唤NPC弹窗
const handleSpawnNpc = async () => {
  await getServerOptions();
  showNpcModal.value = true;
};

// 确认召唤怪物
const handleConfirmSpawnMonster = async () => {
  // 验证必填字段
  if (!monsterFormData.value.serverId) {
    window.$message?.warning('请选择服务器');
    return;
  }
  if (!monsterFormData.value.zoneid || !monsterFormData.value.monsterid) {
    window.$message?.warning('请选择地图和怪物');
    return;
  }

  loading.value.spawnMonster = true;
  try {
    // 构建GM参数
    const gmParams = {
      cmd: monsterFormData.value.cmd,
      zoneid: monsterFormData.value.zoneid,
      lineid: monsterFormData.value.lineid,
      monsterid: monsterFormData.value.monsterid,
      posx: monsterFormData.value.posx,
      posy: monsterFormData.value.posy,
      posz: monsterFormData.value.posz
    };

    // 调用API
    const response = await fetchSpawnMonster({
      serverId: Number(monsterFormData.value.serverId),
      GmParam: JSON.stringify(gmParams)
    });

    // 使用通用错误处理函数
    const hasError = handleApiResponseError(response, '召唤怪物');

    // 如果没有错误，显示成功消息
    if (!hasError) {
      addMessage('monster', `成功召唤怪物 ID: ${monsterFormData.value.monsterid}`);
      window.$message?.success('召唤怪物成功');
      showMonsterModal.value = false;
      // 重置表单
      monsterFormData.value = {
        serverId: '',
        cmd: 'create_boss',
        zoneid: 110,
        lineid: 1,
        monsterid: 2601,
        posx: 14630,
        posy: 16730,
        posz: 5534
      };
    }
  } catch (error: any) {
    // 使用通用异常处理函数
    handleApiCatchError(error, '召唤怪物');
  } finally {
    loading.value.spawnMonster = false;
  }
};

// 确认召唤NPC
const handleConfirmSpawnNpc = async () => {
  // 验证必填字段
  if (!npcFormData.value.serverId) {
    window.$message?.warning('请选择服务器');
    return;
  }
  if (!npcFormData.value.zoneid || !npcFormData.value.lineid ||
      !npcFormData.value.monsterid || npcFormData.value.posx === null ||
      npcFormData.value.posy === null || npcFormData.value.posz === null) {
    window.$message?.warning('请填写所有参数');
    return;
  }

  loading.value.spawnNpc = true;
  try {
    // 构建GM参数
    const gmParams = {
      cmd: npcFormData.value.cmd,
      zoneid: npcFormData.value.zoneid,
      lineid: npcFormData.value.lineid,
      monsterid: npcFormData.value.monsterid,
      posx: npcFormData.value.posx,
      posy: npcFormData.value.posy,
      posz: npcFormData.value.posz
    };

    // 调用API
    const response = await fetchSpawnMonster({
      serverId: Number(npcFormData.value.serverId),
      GmParam: JSON.stringify(gmParams)
    });

    // 使用通用错误处理函数
    const hasError = handleApiResponseError(response, '召唤NPC');

    // 如果没有错误，显示成功消息
    if (!hasError) {
      addMessage('player', `成功召唤NPC ID: ${npcFormData.value.monsterid}`);
      window.$message?.success('召唤NPC成功');
      showNpcModal.value = false;
      // 重置表单
      npcFormData.value = {
        serverId: '',
        cmd: 'create_npc',
        zoneid: null,
        lineid: null,
        monsterid: null,
        posx: null,
        posy: null,
        posz: null
      };
    }
  } catch (error: any) {
    // 使用通用异常处理函数
    handleApiCatchError(error, '召唤NPC');
  } finally {
    loading.value.spawnNpc = false;
  }
};

// 召唤BOSS
const handleSpawnBoss = async () => {
  loading.value.spawnBoss = true;
  try {
    // TODO: 调用实际API
    await new Promise(resolve => setTimeout(resolve, 1000));
    addMessage('boss', '世界BOSS【炎魔】已降临！');
    window.$message?.success('召唤BOSS成功');
  } catch (error) {
    window.$message?.error('召唤失败');
  } finally {
    loading.value.spawnBoss = false;
  }
};

// 召唤精英BOSS
const handleSpawnEliteBoss = async () => {
  loading.value.spawnEliteBoss = true;
  try {
    // TODO: 调用实际API
    await new Promise(resolve => setTimeout(resolve, 1000));
    addMessage('boss', '精英BOSS【霜龙】已降临！');
    window.$message?.success('召唤精英BOSS成功');
  } catch (error) {
    window.$message?.error('召唤失败');
  } finally {
    loading.value.spawnEliteBoss = false;
  }
};

// 清除所有怪物
const handleClearMonsters = async () => {
  loading.value.clearMonsters = true;
  try {
    // TODO: 调用实际API
    await new Promise(resolve => setTimeout(resolve, 1000));
    addMessage('system', '已清除地图上所有怪物');
    window.$message?.success('清除怪物成功');
  } catch (error) {
    window.$message?.error('清除失败');
  } finally {
    loading.value.clearMonsters = false;
  }
};

// 踢出所有玩家
const handleKickPlayers = async () => {
  loading.value.kickPlayers = true;
  try {
    // TODO: 调用实际API
    await new Promise(resolve => setTimeout(resolve, 1000));
    addMessage('system', '已将所有玩家踢出副本');
    window.$message?.warning('已踢出所有玩家');
  } catch (error) {
    window.$message?.error('操作失败');
  } finally {
    loading.value.kickPlayers = false;
  }
};

// 发送公告
const handleAnnouncement = async () => {
  loading.value.announcement = true;
  try {
    // TODO: 调用实际API
    await new Promise(resolve => setTimeout(resolve, 1000));
    addMessage('system', '【系统公告】服务器将在30分钟后进行维护');
    window.$message?.success('公告已发送');
  } catch (error) {
    window.$message?.error('发送失败');
  } finally {
    loading.value.announcement = false;
  }
};

// 打开直播源设置弹窗
const openLiveSourceModal = () => {
  newLiveSource.value = liveSourceUrl.value;
  showLiveSourceModal.value = true;
};

// 切换直播源
const handleSwitchLiveSource = async () => {
  if (!newLiveSource.value.trim()) {
    window.$message?.warning('请输入直播源地址');
    return;
  }

  liveSourceLoading.value = true;
  try {
    // 验证是否是有效的URL或iframe代码
    let url = newLiveSource.value.trim();

    // 如果输入的是iframe代码，提取src
    const iframeMatch = url.match(/src=["']([^"']+)["']/);
    if (iframeMatch) {
      url = iframeMatch[1];
    }

    // 更新直播源
    liveSourceUrl.value = url;
    showLiveSourceModal.value = false;
    addMessage('system', '直播源已切换');
    window.$message?.success('直播源切换成功');
  } catch (error) {
    window.$message?.error('切换失败，请检查输入格式');
  } finally {
    liveSourceLoading.value = false;
  }
};

// 获取消息类型标签颜色
const getMessageTypeTag = (type: string) => {
  const tagMap: Record<string, { color: NaiveUI.ThemeColor; text: string }> = {
    system: { color: 'info', text: '系统' },
    player: { color: 'success', text: '玩家' },
    monster: { color: 'warning', text: '怪物' },
    boss: { color: 'error', text: 'BOSS' },
  };
  return tagMap[type] || { color: 'default', text: '未知' };
};

// 模拟实时更新观众人数
let viewersInterval: any = null;
onMounted(() => {
  viewersInterval = setInterval(() => {
    liveData.value.viewers = Math.floor(Math.random() * 200) + 1000;
  }, 5000);
});

onBeforeUnmount(() => {
  if (viewersInterval) {
    clearInterval(viewersInterval);
  }
});
</script>

<template>
  <div class="h-full">
    <div class="h-full flex gap-16px p-16px">
      <!-- 左侧：直播内容展示区 -->
      <div class="flex-1 flex flex-col gap-16px">
      <!-- 直播间信息卡片 -->
      <!-- <NCard :bordered="false" size="small" class="live-info-card">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-16px">
            <NTag :type="liveData.status === 'live' ? 'error' : 'default'" size="large" round>
              <template #icon>
                <icon-mdi-record-circle-outline v-if="liveData.status === 'live'" class="animate-pulse" />
                <icon-mdi-circle-outline v-else />
              </template>
              {{ liveData.status === 'live' ? '直播中' : '离线' }}
            </NTag>
            <div>
              <div class="text-18px font-600">{{ liveData.roomName }}</div>
              <div class="text-12px text-gray-500">房间ID: {{ liveData.roomId }}</div>
            </div>
          </div>
          <div class="flex items-center gap-24px">
            <div class="flex items-center gap-8px">
              <icon-mdi-account-group class="text-20px text-blue-500" />
              <span class="text-16px font-500">{{ liveData.viewers }}</span>
              <span class="text-12px text-gray-500">在线观众</span>
            </div>
            <div class="flex items-center gap-8px">
              <icon-mdi-clock-outline class="text-20px text-green-500" />
              <span class="text-14px text-gray-600">开始时间: {{ liveData.startTime }}</span>
            </div>
          </div>
        </div>
      </NCard> -->

      <!-- 直播视频区域 -->
      <NCard :bordered="false" size="small" class="live-video-card" title="直播画面">
        <div class="video-container">
          <iframe
            v-if="liveSourceUrl"
            :key="liveSourceUrl"
            :src="liveSourceUrl"
            style="width: 100%; height: 100%;"
            frameborder="0"
            scrolling="no"
            allow="autoplay; encrypted-media"
            allowfullscreen="true"
          ></iframe>
          <div v-else class="flex items-center justify-center h-full text-gray-400">
            <div class="text-center">
              <icon-mdi-video-off class="text-48px mb-8px" />
              <div>请点击右侧"切换直播源"按钮设置直播地址</div>
            </div>
          </div>
        </div>
      </NCard>

      <!-- 直播内容区域 -->
      <NCard :bordered="false" size="small" class="live-content-card" title="直播事件日志">
        <div ref="messagesContainer" class="h-full overflow-y-auto live-messages">
          <div
            v-for="msg in liveMessages"
            :key="msg.id"
            class="message-item mb-12px p-12px rounded-8px bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div class="flex items-start gap-12px">
              <NTag :type="getMessageTypeTag(msg.type)?.color" size="small" round>
                {{ getMessageTypeTag(msg.type)?.text }}
              </NTag>
              <div class="flex-1">
                <div class="text-14px text-gray-800">{{ msg.content }}</div>
              </div>
              <div class="text-12px text-gray-400">{{ msg.time }}</div>
            </div>
          </div>
        </div>
      </NCard>
    </div>

    <!-- 右侧：操作按钮区 -->
    <div class="w-280px flex flex-col gap-16px">
      <!-- 直播源设置 -->
      <NCard :bordered="false" size="small" title="直播源设置" class="operation-card">
        <NSpace vertical size="large">
          <NButton
            type="primary"
            size="large"
            block
            @click="openLiveSourceModal"
          >
            <template #icon>
              <icon-mdi-video-switch-outline />
            </template>
            切换直播源
          </NButton>
        </NSpace>
      </NCard>

      <NCard :bordered="false" size="small" title="怪物控制" class="operation-card">
        <NSpace vertical size="large">
          <NButton
            type="warning"
            size="large"
            block
            :loading="loading.spawnMonster"
            @click="handleSpawnMonster"
          >
            <template #icon>
              <icon-mdi-skull-outline />
            </template>
            召唤怪物
          </NButton>

          <!-- <NButton
            type="error"
            size="large"
            block
            :loading="loading.spawnBoss"
            @click="handleSpawnBoss"
          >
            <template #icon>
              <icon-mdi-skull-crossbones-outline />
            </template>
            召唤世界BOSS
          </NButton> -->

          <!-- <NButton
            type="error"
            size="large"
            block
            secondary
            :loading="loading.spawnEliteBoss"
            @click="handleSpawnEliteBoss"
          >
            <template #icon>
              <icon-mdi-crown-outline />
            </template>
            召唤精英BOSS
          </NButton> -->

          <!-- <NButton
            type="info"
            size="large"
            block
            :loading="loading.clearMonsters"
            @click="handleClearMonsters"
          >
            <template #icon>
              <icon-mdi-broom />
            </template>
            清除所有怪物
          </NButton> -->
        </NSpace>
      </NCard>

      <!-- <NCard :bordered="false" size="small" title="玩家管理" class="operation-card">
        <NSpace vertical size="large">
          <NButton
            type="warning"
            size="large"
            block
            :loading="loading.kickPlayers"
            @click="handleKickPlayers"
          >
            <template #icon>
              <icon-mdi-account-remove-outline />
            </template>
            踢出所有玩家
          </NButton>

          <NButton
            type="primary"
            size="large"
            block
            :loading="loading.announcement"
            @click="handleAnnouncement"
          >
            <template #icon>
              <icon-mdi-bullhorn-outline />
            </template>
            发送系统公告
          </NButton>
        </NSpace>
      </NCard> -->

      <!-- 快捷操作提示 -->
      <NCard :bordered="false" size="small" title="操作提示" class="tips-card">
        <div class="text-12px text-gray-600 space-y-8px">
          <div class="flex items-start gap-6px">
            <icon-mdi-information class="text-blue-500 mt-2px" />
            <span>召唤怪物会立即在地图中生成</span>
          </div>
          <div class="flex items-start gap-6px">
            <icon-mdi-information class="text-blue-500 mt-2px" />
            <span>BOSS召唤有冷却时间限制</span>
          </div>
          <div class="flex items-start gap-6px">
            <icon-mdi-information class="text-blue-500 mt-2px" />
            <span>踢出玩家前请先发送公告通知</span>
          </div>
        </div>
      </NCard>
    </div>
    </div>

    <!-- 直播源设置弹窗 -->
    <NModal
    v-model:show="showLiveSourceModal"
    preset="card"
    title="切换直播源"
    style="width: 600px;"
    :bordered="false"
    :segmented="{
      content: 'soft',
      footer: 'soft'
    }"
  >
    <div class="space-y-16px">
      <div>
        <div class="text-14px font-500 mb-8px">输入B站直播嵌套代码或直播地址</div>
        <NInput
          v-model:value="newLiveSource"
          type="textarea"
          placeholder="请输入B站iframe嵌套代码或直播地址，例如：&#10;https://www.bilibili.com/blackboard/live/live-activity-player.html?cid=8545268&quality=0&#10;或完整的iframe代码"
          :rows="6"
          clearable
        />
      </div>
      <div class="text-12px text-gray-500">
        <div class="mb-4px">支持以下格式：</div>
        <div>1. 直播地址：https://www.bilibili.com/blackboard/live/live-activity-player.html?cid=xxx</div>
        <div>2. iframe代码：&lt;iframe src="..."&gt;&lt;/iframe&gt;</div>
      </div>
    </div>
    <template #footer>
      <div class="flex justify-end gap-12px">
        <NButton @click="showLiveSourceModal = false">取消</NButton>
        <NButton type="primary" :loading="liveSourceLoading" @click="handleSwitchLiveSource">
          确认切换
        </NButton>
      </div>
    </template>
    </NModal>

    <!-- 召唤怪物弹窗 -->
    <NModal
      v-model:show="showMonsterModal"
      preset="card"
      title="召唤怪物"
      style="width: 600px;"
      :bordered="false"
      :segmented="{
        content: 'soft',
        footer: 'soft'
      }"
    >
      <NForm
        :model="monsterFormData"
        label-placement="left"
        label-width="120"
        require-mark-placement="right-hanging"
      >
        <NFormItem label="服务器" path="serverId" required>
          <NSelect
            v-model:value="monsterFormData.serverId"
            placeholder="请选择服务器"
            :options="serverOptions"
            :loading="serverLoading"
            filterable
            clearable
          />
        </NFormItem>
        <NFormItem label="地图" path="zoneid" required>
          <NSelect
            v-model:value="monsterFormData.zoneid"
            placeholder="请选择地图"
            :options="mapOptions"
            filterable
            clearable
          />
        </NFormItem>



        <NFormItem label="怪物ID" path="monsterid" required>
          <NSelect
            v-model:value="monsterFormData.monsterid"
            placeholder="请选择怪物"
            :options="monsterOptions"
            filterable
            clearable
          />
        </NFormItem>
        <NFormItem label="X坐标" path="posx">
          <NInputNumber
            v-model:value="monsterFormData.posx"
            placeholder="请输入X坐标"
            style="width: 100%;"
            clearable
          />
        </NFormItem>
        <NFormItem label="Y坐标" path="posy">
          <NInputNumber
            v-model:value="monsterFormData.posy"
            placeholder="请输入Y坐标"
            style="width: 100%;"
            clearable
          />
        </NFormItem>
        <NFormItem label="Z坐标" path="posz">
          <NInputNumber
            v-model:value="monsterFormData.posz"
            placeholder="请输入Z坐标"
            style="width: 100%;"
            clearable
          />
        </NFormItem>
      </NForm>
      <template #footer>
        <div class="flex justify-end gap-12px">
          <NButton @click="showMonsterModal = false">取消</NButton>
          <NButton
            type="primary"
            :loading="loading.spawnMonster"
            @click="handleConfirmSpawnMonster"
          >
            确认召唤
          </NButton>
        </div>
      </template>
    </NModal>
  </div>
</template>

<style scoped>
.live-info-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.live-info-card :deep(.n-card__content) {
  padding: 16px 20px;
}

.live-video-card {
  height: 1100px;
}

.live-video-card :deep(.n-card__content) {
  height: calc(100% - 48px);
  padding: 0;
}

.video-container {
  width: 100%;
  height: 100%;
  background-color: #000;
}

.live-content-card {
  height: calc(100vh - 1300px);
}

.live-content-card :deep(.n-card__content) {
  height: calc(100% - 48px);
  padding: 16px;
}

.live-messages {
  max-height: 100%;
  padding-right: 8px;
}

.live-messages::-webkit-scrollbar {
  width: 6px;
}

.live-messages::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.live-messages::-webkit-scrollbar-thumb:hover {
  background-color: rgba(0, 0, 0, 0.3);
}

.message-item {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.operation-card :deep(.n-card__content) {
  padding: 16px;
}

.tips-card {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-left: 4px solid #3b82f6;
}

.tips-card :deep(.n-card__content) {
  padding: 12px;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
