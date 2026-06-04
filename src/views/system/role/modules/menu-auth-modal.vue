<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue';
import { $t } from '@/locales';
// import { fetchGetAllPages, fetchGetMenuTree } from '@/service/api';
import { fetchGetMenuTree, fetchRoleById, fetchGetUserRoleMenuTreeselect } from '@/service/api';

defineOptions({
  name: 'MenuAuthModal'
});

interface Props {
  /** the roleId */
  roleId: number;
}

const props = defineProps<Props>();

interface Emits {
  (e: 'submit', menuIds: number[]): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>('visible', {
  default: false
});

function closeModal() {
  visible.value = false;
}

const title = computed(() => $t('common.edit') + $t('page.manage.role.menuAuth'));

const home = shallowRef('');

async function getHome() {
  // console.log(props.roleId);

  home.value = 'home';
}

async function updateHome(val: string) {
  // request

  home.value = val;
}

const pages = shallowRef<string[]>([]);

async function getPages() {
  // const { error, data } = await fetchGetAllPages();


  // if (!error) {
  //   pages.value = data;
  // }
}

const pageSelectOptions = computed(() => {
  const opts: CommonType.Option[] = pages.value.map(page => ({
    label: page,
    value: page
  }));

  return opts;
});

const tree = shallowRef<Api.SystemManage.MenuTree[]>([]);

const menuTypes = shallowRef<Record<number, string>>({});

async function getTree() {
  const { error, data } = await fetchGetMenuTree();

  if (!error) {
    tree.value = data;
    processMenuTypes(data);
  }
}

function processMenuTypes(menus: Api.SystemManage.MenuTree[]) {
  menus.forEach(menu => {
    if (menu.menuType) {
      // 使用id字段而不是menuId
      const menuId = menu.id as number;
      menuTypes.value[menuId] = menu.menuType; // M: 目录, C: 菜单, F: 按钮
    }
    if (menu.children?.length) {
      processMenuTypes(menu.children);
    }
  });
}

const checks = shallowRef<number[]>([]);

async function getChecks() {
  if (!props.roleId) {
    console.warn('角色ID为空，无法获取菜单权限');
    return;
  }

  try {
    // 获取角色对应的菜单权限
    const result = await fetchGetUserRoleMenuTreeselect(props.roleId);

    if (!result) {
      console.error('接口返回为空');
      return;
    }

    let checkedKeys: number[] = [];
    let menuData: any[] = [];

    // 更严谨地处理返回数据结构
    if (result.response && result.response.data) {
      const responseData = result.response.data as any;
      if (responseData.checkedKeys && Array.isArray(responseData.checkedKeys)) {
        checkedKeys = responseData.checkedKeys;
      }
      if (responseData.menus && Array.isArray(responseData.menus)) {
        menuData = responseData.menus;
      }
    }
    else if (result.data) {
      const data = result.data as any;
      if (data.checkedKeys && Array.isArray(data.checkedKeys)) {
        checkedKeys = data.checkedKeys;
      }
      if (data.menus && Array.isArray(data.menus)) {
        menuData = data.menus;
      }
    }


    // 清除之前的数据
    checks.value = [];

    // 先设置树数据
    if (menuData.length > 0) {
      tree.value = menuData;

      // 过滤只保留末级节点或明确选中的节点
      if (checkedKeys.length > 0) {
        // 构建节点父子关系映射
        const nodeMap = new Map();
        const childToParentMap = new Map();

        // 递归构建节点映射
        function buildNodeMap(nodes: any[], parentId?: number) {
          nodes.forEach(node => {
            const id = node.id as number;
            nodeMap.set(id, node);

            if (parentId) {
              childToParentMap.set(id, parentId);
            }

            if (node.children && node.children.length) {
              buildNodeMap(node.children, id);
            }
          });
        }

        buildNodeMap(menuData);

        // 过滤出末级节点ID或明确选中的非自动添加的节点
        const filteredKeys = checkedKeys.filter(id => {
          const node = nodeMap.get(id);
          // 是末级节点(没有子节点)或是明确需要保留的节点
          return !node || !node.children || node.children.length === 0;
        });


        // 延迟设置选中项，确保树已渲染
        setTimeout(() => {
          checks.value = filteredKeys;
        }, 100);
      }
    } else {
      // 如果没有获取到菜单树，但有选中项，也设置选中项
      if (checkedKeys.length > 0) {
        setTimeout(() => {
          checks.value = checkedKeys;
        }, 100);
      }
    }
  } catch (err) {
    console.error('获取角色菜单权限出错:', err);
  }
}

function handleSubmit() {
  // 确保包含所有父级ID
  const allCheckedIds = getAllCheckedIds(tree.value, checks.value);
  emit('submit', allCheckedIds);
  window.$message?.success($t('common.modifySuccess'));
  closeModal();
}

// 递归获取所有选中节点的ID和它们的父级ID
function getAllCheckedIds(menuTree: Api.SystemManage.MenuTree[], checkedIds: number[]): number[] {
  const allIds = new Set<number>(checkedIds);

  const childToParentMap = new Map<number, number>();

  const nodeMap = new Map<number, Api.SystemManage.MenuTree>();

  function buildParentMap(menus: Api.SystemManage.MenuTree[], parentId?: number) {
    menus.forEach(menu => {
      const menuId = menu.id as number;
      nodeMap.set(menuId, menu);

      if (parentId !== undefined) {
        childToParentMap.set(menuId, parentId);
      }
      if (menu.children?.length) {
        buildParentMap(menu.children, menuId);
      }
    });
  }

  buildParentMap(menuTree);

  // 添加所有父级ID
  const processedIds = new Set<number>();

  function addParentIds(id: number) {
    if (processedIds.has(id)) return;
    processedIds.add(id);

    const parentId = childToParentMap.get(id);
    if (parentId !== undefined) {
      allIds.add(parentId);
      addParentIds(parentId);
    }
  }

  // 处理每个选中的ID
  checkedIds.forEach(id => {
    addParentIds(id);
  });

  return Array.from(allIds);
}

function init() {
  getHome();
  getPages();
  getChecks();
  getTree();
}

watch(visible, val => {
  if (val) {
    init();
  }
});
</script>

<template>
  <NModal v-model:show="visible" :title="title" preset="card" class="w-480px">
    <div class="flex-y-center gap-16px pb-12px">
      <div>{{ $t('page.manage.menu.home') }}</div>
      <NSelect :value="home" :options="pageSelectOptions" size="small" class="w-160px" @update:value="updateHome" />
    </div>
    <NTree
      v-model:checked-keys="checks"
      :data="tree"
      key-field="id"
      checkable
      selectable
      cascade
      expand-on-click
      virtual-scroll
      block-line
      class="h-280px"
    />
    <template #footer>
      <NSpace justify="end">
        <NButton size="small" class="mt-16px" @click="closeModal">
          {{ $t('common.cancel') }}
        </NButton>
        <NButton type="primary" size="small" class="mt-16px" @click="handleSubmit">
          {{ $t('common.confirm') }}
        </NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped></style>
