<script setup lang="ts">
import { computed } from 'vue';
import { $t } from '@/locales';

defineOptions({
  name: 'ProjectNews'
});

interface NewsItem {
  id: number;
  content: string;
  time: string;
}

const newses = computed<NewsItem[]>(() => [
  { id: 1, content: '游戏服务器更新到v3.5.2版本', time: '2023-05-28 22:22:22' },
  { id: 2, content: '新增角色"暗夜猎手"上线', time: '2023-10-27 10:24:54' },
  { id: 3, content: '周年庆活动将于下周开启', time: '2023-10-31 22:43:12' },
  { id: 4, content: '系统优化完成，提升游戏体验', time: '2023-11-03 20:33:31' },
  { id: 5, content: '新地图"龙岛"已开放', time: '2023-11-07 22:45:32' }
]);
</script>

<template>
  <NCard title="项目动态" :bordered="false" size="small" segmented class="card-wrapper">
    <template #header-extra>
      <a class="text-primary" href="javascript:;">更多动态</a>
    </template>
    <NList>
      <NListItem v-for="item in newses" :key="item.id">
        <template #prefix>
          <div class="flex-center size-48px! bg-primary/10 rounded-full">
            <icon-carbon:game-console class="text-primary text-22px" />
          </div>
        </template>
        <NThing :title="item.content" :description="item.time" />
      </NListItem>
    </NList>
  </NCard>
</template>

<style scoped></style>
