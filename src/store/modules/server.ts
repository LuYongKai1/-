import { defineStore } from 'pinia';
import { ref } from 'vue';
import { fetchGetServerId, fetchGetServerCrossList } from '@/service/api';

interface Server {
  serverId: number;
  serverName: string;
}

interface Region {
  id: number;
  regionName: string;
  children?: Server[];
}

interface CrossServer {
  id: number;
  serverId: string;
  serverName: string;
}

interface MixedServer {
  serverId: string;
  serverName: string;
  serverType: 'normal' | 'cross';
}

export const useServerStore = defineStore('server', () => {
  /** 普通服树结构 */
  const serverTreeOptions = ref<any[]>([]);
  /** 普通服扁平列表 */
  const serverList = ref<Server[]>([]);
  const regionList = ref<Region[]>([]);
  /** 跨服列表 */
  const crossServerList = ref<CrossServer[]>([]);
  /** 普通服 + 跨服合并列表 */
  const mixedServerList = ref<MixedServer[]>([]);
  /** 包含跨服的完整树结构（普通服 + 跨服专区） */
  const mixedServerTreeOptions = ref<any[]>([]);

  function buildMixedServerList() {
    const normalServers: MixedServer[] = serverList.value.map(server => ({
      serverId: String(server.serverId),
      serverName: server.serverName,
      serverType: 'normal'
    }));

    const crossServers: MixedServer[] = crossServerList.value.map(server => ({
      serverId: String(server.serverId),
      serverName: server.serverName,
      serverType: 'cross'
    }));

    mixedServerList.value = [...normalServers, ...crossServers];
  }

  function buildMixedServerTreeOptions() {
    // 复制普通服务器树结构
    const options = [...serverTreeOptions.value];

    // 添加跨服节点
    if (crossServerList.value?.length) {
      options.push({
        key: 'cross_server_group',
        label: '跨服专区',
        isLeaf: false,
        checkable: false,
        children: crossServerList.value.map((crossServer) => ({
          key: `cross_${crossServer.serverId}`,
          label: crossServer.serverName,
          isLeaf: true
        }))
      });
    }

    mixedServerTreeOptions.value = options;
  }

  async function fetchServerList() {
    try {
      const data = await fetchGetServerId();
      if (!data.response?.data) {
        throw new Error("获取服务器列表失败");
      }

      const regions = data.response.data as unknown as Region[];
      regionList.value = regions;

      // 构建树形结构
      const treeData = regions.map(region => {
        return {
          label: region.regionName,
          key: `region_${region.id}`,
          children: region.children?.map(server => ({
            label: server.serverName,
            key: String(server.serverId)
          })) || []
        };
      });

      serverTreeOptions.value = treeData;

      // 保存扁平化的服务器列表
      const servers: Server[] = [];
      regions.forEach(region => {
        if (region.children) {
          servers.push(...region.children);
        }
      });
      serverList.value = servers;
      buildMixedServerList();
      buildMixedServerTreeOptions();

      return {
        success: true,
        data: {
          treeOptions: serverTreeOptions.value,
          serverList: serverList.value,
          regionList: regionList.value,
          mixedServerList: mixedServerList.value,
          mixedServerTreeOptions: mixedServerTreeOptions.value
        }
      };
    } catch (err) {
      console.error("获取服务器列表失败:", err);
      return {
        success: false,
        error: err
      };
    }
  }

  async function fetchCrossServerList() {
    try {
      const data = await fetchGetServerCrossList({
        current: 1,
        size: 1000, // 获取足够多的数据
      });

      // 根据实际API响应结构获取数据
      // data.response?.data 是包含 msg, code, data 的对象
      // 真正的数据在 data.response?.data?.data 或 data.data 中
      let crossServers: CrossServer[] = [];

      if (data.response?.data?.data && Array.isArray(data.response.data.data)) {
        // 数据在 data.response.data.data 中
        crossServers = data.response.data.data;
      } else if (data.data && Array.isArray(data.data)) {
        // 数据在 data.data 中
        crossServers = data.data;
      } else if (data.response?.data?.records) {
        // 分页数据在 records 中
        crossServers = data.response.data.records;
      } else if (data.data?.records) {
        crossServers = data.data.records;
      }

      if (!crossServers || crossServers.length === 0) {
        console.warn("跨服列表为空，请检查是否有跨服数据");
      }

      crossServerList.value = crossServers;
      buildMixedServerList();
      buildMixedServerTreeOptions();

      return {
        success: true,
        data: {
          crossServerList: crossServers,
          mixedServerList: mixedServerList.value,
          mixedServerTreeOptions: mixedServerTreeOptions.value
        }
      };
    } catch (err) {
      console.error("获取跨服列表失败:", err);
      return {
        success: false,
        error: err
      };
    }
  }

  function searchServers(keyword: string) {
    if (!keyword) return serverList.value;
    return serverList.value.filter(server =>
      server.serverName.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  function getServerNameById(serverId: number | string): string {
    // 先从普通服务器列表中查找
    const server = serverList.value.find(s => s.serverId === Number(serverId));
    if (server) {
      return server.serverName;
    }

    // 再从跨服列表中查找
    const crossServer = crossServerList.value?.find((cs) => cs.serverId === String(serverId));
    if (crossServer) {
      return `跨服-${crossServer.serverName}`;
    }

    return String(serverId);
  }

  return {
    serverTreeOptions,
    serverList,
    regionList,
    crossServerList,
    mixedServerList,
    mixedServerTreeOptions,
    fetchServerList,
    fetchCrossServerList,
    searchServers,
    getServerNameById
  };
});
