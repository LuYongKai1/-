<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { NCard, NGrid, NGi, NBadge, NAvatar, NSpace, NTag, NButton, NEmpty } from 'naive-ui';

interface LiveStream {
  id: string;
  platform: string;
  streamerName: string;
  streamerAvatar: string;
  title: string;
  thumbnail: string;
  viewerCount: number;
  isLive: boolean;
  category: string;
  startTime: string;
}

const liveStreams = ref<LiveStream[]>([]);
const loading = ref(true);

// 模拟获取直播数据
const fetchLiveStreams = () => {
  loading.value = true;

  // 模拟API调用延迟
  setTimeout(() => {
    liveStreams.value = [
      {
        id: '1',
        platform: '抖音',
        streamerName: '游戏主播小明',
        streamerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=1',
        title: 'MirM传奇手游 - 激情攻城战！带你体验热血PK',
        thumbnail: 'https://picsum.photos/seed/live1/400/300',
        viewerCount: 12580,
        isLive: true,
        category: '游戏',
        startTime: '2小时前'
      },
      {
        id: '2',
        platform: '抖音',
        streamerName: '电竞解说小红',
        streamerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=2',
        title: '【MirM】新手教学 - 快速升级攻略分享',
        thumbnail: 'https://picsum.photos/seed/live2/400/300',
        viewerCount: 8920,
        isLive: true,
        category: '游戏',
        startTime: '1小时前'
      },
      {
        id: '3',
        platform: '抖音',
        streamerName: '传奇老玩家',
        streamerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=3',
        title: '装备强化直播间 - 今天必出+10武器！',
        thumbnail: 'https://picsum.photos/seed/live3/400/300',
        viewerCount: 15600,
        isLive: true,
        category: '游戏',
        startTime: '3小时前'
      },
      {
        id: '4',
        platform: '抖音',
        streamerName: '游戏达人阿强',
        streamerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=4',
        title: 'MirM公会战实况 - 百人团战精彩对决',
        thumbnail: 'https://picsum.photos/seed/live4/400/300',
        viewerCount: 23400,
        isLive: true,
        category: '游戏',
        startTime: '30分钟前'
      },
      {
        id: '5',
        platform: '抖音',
        streamerName: '美女主播小雅',
        streamerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=5',
        title: '【MirM】萌新求带 - 一起组队打BOSS',
        thumbnail: 'https://picsum.photos/seed/live5/400/300',
        viewerCount: 6780,
        isLive: true,
        category: '游戏',
        startTime: '45分钟前'
      },
      {
        id: '6',
        platform: '抖音',
        streamerName: '职业选手Pro',
        streamerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=6',
        title: 'MirM竞技场冲榜 - 目标服务器第一！',
        thumbnail: 'https://picsum.photos/seed/live6/400/300',
        viewerCount: 31200,
        isLive: true,
        category: '游戏',
        startTime: '4小时前'
      }
    ];
    loading.value = false;
  }, 800);
};

// 格式化观看人数
const formatViewerCount = (count: number): string => {
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1)}万`;
  }
  return count.toString();
};

// 刷新直播列表
const refreshStreams = () => {
  fetchLiveStreams();
};

onMounted(() => {
  fetchLiveStreams();
});
</script>

<template>
  <div class="live-stream-viewer">
    <div class="header">
      <div class="title-section">
        <h2 class="title">
          <span class="icon">📺</span>
          正在直播
        </h2>
        <p class="subtitle">实时游戏直播内容</p>
      </div>
      <NButton type="primary" @click="refreshStreams" :loading="loading">
        刷新列表
      </NButton>
    </div>

    <NGrid v-if="!loading && liveStreams.length > 0" :x-gap="16" :y-gap="16" :cols="3" responsive="screen">
      <NGi v-for="stream in liveStreams" :key="stream.id" span="24 s:24 m:12 l:8">
        <NCard class="live-card" hoverable>
          <div class="live-thumbnail-wrapper">
            <img :src="stream.thumbnail" :alt="stream.title" class="live-thumbnail" />
            <NBadge :value="formatViewerCount(stream.viewerCount)" class="viewer-badge">
              <template #value>
                <span class="viewer-count">
                  <span class="live-dot"></span>
                  {{ formatViewerCount(stream.viewerCount) }}
                </span>
              </template>
            </NBadge>
            <div class="live-indicator">
              <NTag type="error" size="small" :bordered="false">
                <template #icon>
                  <span class="pulse-dot"></span>
                </template>
                直播中
              </NTag>
            </div>
          </div>

          <div class="live-info">
            <NSpace align="center" :size="12">
              <NAvatar
                round
                :size="40"
                :src="stream.streamerAvatar"
                :fallback-src="'https://api.dicebear.com/7.x/avataaars/svg?seed=default'"
              />
              <div class="streamer-info">
                <div class="streamer-name">{{ stream.streamerName }}</div>
                <div class="platform-tag">
                  <NTag size="tiny" type="info" :bordered="false">
                    {{ stream.platform }}
                  </NTag>
                  <span class="start-time">{{ stream.startTime }}</span>
                </div>
              </div>
            </NSpace>

            <div class="live-title">{{ stream.title }}</div>

            <div class="live-footer">
              <NTag size="small" :bordered="false">
                {{ stream.category }}
              </NTag>
              <NButton size="small" type="primary" ghost>
                进入直播间
              </NButton>
            </div>
          </div>
        </NCard>
      </NGi>
    </NGrid>

    <NEmpty
      v-else-if="!loading && liveStreams.length === 0"
      description="暂无直播内容"
      class="empty-state"
    />

    <div v-if="loading" class="loading-state">
      <NSpace vertical align="center" :size="16">
        <div class="loading-spinner"></div>
        <p>加载直播内容中...</p>
      </NSpace>
    </div>
  </div>
</template>

<style scoped>
.live-stream-viewer {
  width: 100%;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #f0f0f0;
}

.title-section {
  flex: 1;
}

.title {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #333;
}

.icon {
  font-size: 28px;
}

.subtitle {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.live-card {
  height: 100%;
  transition: all 0.3s ease;
  cursor: pointer;
  overflow: hidden;
}

.live-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.live-thumbnail-wrapper {
  position: relative;
  width: 100%;
  padding-top: 75%; /* 4:3 aspect ratio */
  overflow: hidden;
  border-radius: 8px;
  margin-bottom: 16px;
}

.live-thumbnail {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.live-card:hover .live-thumbnail {
  transform: scale(1.05);
}

.viewer-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(0, 0, 0, 0.7);
  padding: 4px 12px;
  border-radius: 12px;
  backdrop-filter: blur(4px);
}

.viewer-count {
  display: flex;
  align-items: center;
  gap: 6px;
  color: white;
  font-size: 12px;
  font-weight: 600;
}

.live-dot {
  width: 6px;
  height: 6px;
  background: #ff4d4f;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.live-indicator {
  position: absolute;
  top: 12px;
  left: 12px;
}

.pulse-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  background: white;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.2);
  }
}

.live-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.streamer-info {
  flex: 1;
  min-width: 0;
}

.streamer-name {
  font-weight: 600;
  font-size: 14px;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.platform-tag {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.start-time {
  font-size: 12px;
  color: #999;
}

.live-title {
  font-size: 14px;
  color: #666;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  min-height: 42px;
}

.live-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.empty-state {
  padding: 60px 0;
}

.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 60px 0;
  color: #666;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f0f0f0;
  border-top-color: #18a058;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .title {
    font-size: 20px;
  }
}
</style>
