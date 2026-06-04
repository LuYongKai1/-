<script setup lang="tsx">
import { computed, ref, watch } from 'vue';
import type { SelectOption } from 'naive-ui';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';
import { enableStatusOptions, menuIconTypeOptions, menuTypeOptions } from '@/constants/business';
import SvgIcon from '@/components/custom/svg-icon.vue';
import { getLocalIcons } from '@/utils/icon';
import { fetchCreateMenu, fetchGetAllRoles, fetchUpdateMenu } from '@/service/api';
import {
  getLayoutAndPage,
  getPathParamFromRoutePath,
  getRoutePathByRouteName,
  getRoutePathWithParam,
  transformLayoutAndPageToComponent
} from './shared';
import { useRouteStore} from '@/store/modules/route';
import { handleApiResponseError, handleApiCatchError } from "@/utils/common";

defineOptions({
  name: 'MenuOperateModal'
});

export type OperateType = 'add' | 'edit' | 'addChild';

interface Props {
  /** the type of operation */
  operateType: OperateType;
  /** the edit menu data or the parent menu data when adding a child menu */
  rowData?: Api.SystemManage.Menu | null;
  /** all pages */
  allPages: string[];
}

const props = defineProps<Props>();

interface Emits {
  (e: 'submitted'): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>('visible', {
  default: false
});

const { formRef, validate, restoreValidation } = useNaiveForm();
const { defaultRequiredRule } = useFormRules();
const routeStore = useRouteStore();

const title = computed(() => {
  const titles: Record<OperateType, string> = {
    add: $t('page.manage.menu.addMenu'),
    edit: $t('page.manage.menu.editMenu'),
    addChild: $t('page.manage.menu.addChildMenu')
  };
  return titles[props.operateType];
});

type MenuType = 'M' | 'C' | 'F';
type IconType = '1' | '2';

type Model = Pick<
  Api.SystemManage.Menu,
  | 'menuName'
  | 'routeName'
  | 'path'
  | 'routePath'
  | 'component'
  | 'order'
  | 'i18nKey'
  | 'icon'
  | 'status'
  | 'parentId'
  | 'keepAlive'
  | 'constant'
  | 'href'
  | 'activeMenu'
  | 'multiTab'
  | 'fixedIndexInTab'
  | 'visible'
  | 'perms'
> & {
  menuType: MenuType;
  iconType: IconType;
  query: any;
  buttons: any[];
  layout: string;
  page: string;
  orderNum: number;
};

const model = ref(createDefaultModel());

function createDefaultModel(): Model {
  return {
    menuType: 'M',
    menuName: '',
    routeName: '',
    path: '',
    routePath: '',
    query: '',
    component: '',
    layout: '',
    page: '',
    i18nKey: null,
    icon: '',
    iconType: '1',
    parentId: 0,
    status: '0',
    visible: '0',
    keepAlive: false,
    constant: false,
    order: 0,
    orderNum: 0,
    href: null,
    activeMenu: null,
    multiTab: false,
    fixedIndexInTab: null,
    perms: '',
    buttons: []
  };
}

type RuleKey = Extract<keyof Model, 'menuName' | 'status' | 'routeName' | 'perms'>;

const rules: Record<RuleKey, App.Global.FormRule> = {
  menuName: defaultRequiredRule,
  status: defaultRequiredRule,
  routeName: defaultRequiredRule,
  perms:defaultRequiredRule
};

// const disabledMenuType = computed(() => props.operateType === 'edit' || props.operateType === 'addChild');
const disabledMenuType = computed(() => props.operateType === 'addChild');

// 添加判断是否为按钮类型菜单
const isButtonType = computed(() => model.value.menuType === 'F');

const localIcons = getLocalIcons();
const localIconOptions = localIcons.map<SelectOption>(item => ({
  label: () => (
    <div class="flex-y-center gap-16px">
      <SvgIcon localIcon={item} class="text-icon" />
      <span>{item}</span>
    </div>
  ),
  value: item
}));

const showLayout = computed(() => model.value.parentId === 0);

const showPage = computed(() => model.value.menuType === 'M');

const pageOptions = computed(() => {
  const allPages = [...props.allPages];

  if (model.value.routeName && !allPages.includes(model.value.routeName)) {
    allPages.unshift(model.value.routeName);
  }


  const opts: CommonType.Option[] = allPages.map(page => ({
    label: page,
    value: page
  }));

  return opts;
});

const layoutOptions: CommonType.Option[] = [
  {
    label: 'base',
    value: 'base'
  },
  {
    label: 'blank',
    value: 'blank'
  }
];

/** the enabled role options */
const roleOptions = ref<CommonType.Option<string>[]>([]);

async function getRoleOptions() {
  const { error, data } = await fetchGetAllRoles();


  if (!error) {
    const options = data.map(item => ({
      label: item.roleName,
      value: item.roleCode
    }));

    roleOptions.value = [...options];
  }
}

function handleInitModel() {
  model.value = createDefaultModel();

  if (!props.rowData) return;

  if (props.operateType === 'addChild') {
    const { id, path: parentPath } = props.rowData;
    // 保存父菜单的路径和ID
    Object.assign(model.value, {
      parentId: id,
      // 如果父菜单有路径，将其作为前缀
      path: parentPath ? parentPath : '',
    });
  }

  if(props.rowData) {
    Object.assign(model.value, props.rowData);
  }

  if (props.operateType === 'edit') {
    const { component, ...rest } = props.rowData;
    const { layout, page } = getLayoutAndPage(component);
    const { path, param } = getPathParamFromRoutePath(rest.path || '');
    Object.assign(model.value, props.rowData, { layout, page, path: path, query: param });
  }

  if (!model.value.query) {
    model.value.query = [];
  }
  if (!model.value.buttons) {
    model.value.buttons = [];
  }
}

function closeDrawer() {
  visible.value = false;
}

function handleUpdateRoutePathByRouteName() {
  if (model.value.routeName) {
    // 如果是目录，直接使用 /${routeName} 作为路径
    if (model.value.menuType === 'M') {
      model.value.path = `${model.value.routeName.toLowerCase()}`;
    } else {
      // 如果是子菜单，需要考虑父菜单的路径
      if (props.operateType === 'addChild' && props.rowData?.path) {
        model.value.path = `${props.rowData.path}${model.value.routeName.toLowerCase()}`;
      } else {
        const path = getRoutePathByRouteName(model.value.routeName);
        model.value.path = path;
      }
    }
  } else {
    model.value.path = '';
  }
}

function handleUpdateI18nKeyByRouteName() {
  if (model.value.routeName) {
    model.value.i18nKey = `route.${model.value.routeName}` as App.I18n.I18nKey;
  } else {
    model.value.i18nKey = null;
  }
}

function handleCreateButton() {
  const buttonItem: Api.SystemManage.MenuButton = {
    code: '',
    desc: ''
  };

  return buttonItem;
}

function getSubmitParams() {
  const { layout, page, ...params } = model.value;

  // 设置组件路径
  if (model.value.menuType === 'M') {
    params.component = 'layout.' + (layout || 'base');
    // 确保目录的路径正确
    params.path = `${model.value.path.toLowerCase()}`;
  } else if (model.value.menuType === 'F') {
    // 按钮类型不需要组件和路径
    params.component = '';
    // 确保按钮类型时设置父菜单ID
    if (props.operateType === 'addChild' && props.rowData?.id) {
      params.parentId = props.rowData.id;
    }
    // 确保routePath有值，避免后端出错
    params.routePath = '';
    params.path = '';
  } else {
    params.component = 'view.' + model.value.routeName.toLowerCase();
    // 处理路由路径
    if (props.operateType === 'addChild' && props.rowData?.routePath) {
      // 如果是子菜单，使用父菜单的路径作为前缀
      params.path = `${props.rowData.path}/${model.value.routeName.toLowerCase()}`;
    } else {
      const path = getRoutePathWithParam(model.value.path, model.value.query);
      params.path = path;
    }
  }

  // 确保按钮类型菜单的menuId正确设置
  if (model.value.menuType === 'F' && props.operateType === 'addChild' && props.rowData?.id) {
    params.menuId = props.rowData.id;
  }

  return params;
}

async function handleSubmit() {
  await validate();
  const params = getSubmitParams();
  // 确保buttons和query总是字符串类型
  if (params.buttons) {
    params.buttons = JSON.stringify(params.buttons || []) as any;
  }
  if (params.query) {
    params.query = JSON.stringify(params.query || []) as any;
  }

  try {
    let response;
    if(props.operateType === 'edit') {
      response = await fetchUpdateMenu(params);
      // 检查是否有错误
      if (handleApiResponseError(response, '更新菜单')) {
        return;
      }
      window.$message?.success($t('common.updateSuccess'));
    } else {
      response = await fetchCreateMenu(params);
      // 检查是否有错误
      if (handleApiResponseError(response, '创建菜单')) {
        return;
      }
      window.$message?.success($t('common.addSuccess'));
    }

    closeDrawer();
    emit('submitted');
    // 这里刷新菜单
    routeStore.initAuthRoute()
  } catch (error) {
    // 处理捕获的异常错误
    const operationType = props.operateType === 'edit' ? '更新菜单' : '创建菜单';
    handleApiCatchError(error, operationType);
  }
}

watch(visible, () => {
  // console.log(visible.value);
  if (visible.value) {
    handleInitModel();
    restoreValidation();
    getRoleOptions();
  }
});

watch(
  () => model.value.routeName,
  () => {
    handleUpdateRoutePathByRouteName();
    handleUpdateI18nKeyByRouteName();
  }
);
</script>

<template>
  <NModal v-model:show="visible" :title="title" preset="card" class="w-800px">
    <NScrollbar class="h-480px pr-20px">
      <NForm ref="formRef" :model="model" :rules="rules" label-placement="left" :label-width="100">
        <NGrid responsive="screen" item-responsive>
          <NFormItemGi span="24 m:12" :label="$t('page.manage.menu.menuType')" path="menuType">
            <NRadioGroup v-model:value="model.menuType" :disabled="disabledMenuType">
              <NRadio v-for="item in menuTypeOptions" :key="item.value" :value="item.value" :label="$t(item.label)" />
            </NRadioGroup>
          </NFormItemGi>
          <NFormItemGi span="24 m:12" :label="$t('page.manage.menu.menuName')" path="menuName">
            <NInput v-model:value="model.menuName" :placeholder="$t('page.manage.menu.form.menuName')" />
          </NFormItemGi>

          <!-- 按钮类型专用字段 -->
          <template v-if="isButtonType">
            <NFormItemGi span="24 m:12" :label="$t('page.manage.menu.perms')" path="perms">
              <NInput v-model:value="model.perms" :placeholder="$t('page.manage.menu.form.perms')" />
            </NFormItemGi>
            <NFormItemGi span="24 m:12" :label="$t('page.manage.menu.order')" path="order">
              <NInputNumber v-model:value="model.orderNum" class="w-full" :placeholder="$t('page.manage.menu.form.order')" />
            </NFormItemGi>
          </template>

          <!-- 非按钮类型时的字段 -->
          <template v-else>
            <NFormItemGi span="24 m:12" :label="$t('page.manage.menu.routeName')" path="routeName">
              <NInput v-model:value="model.routeName" :placeholder="$t('page.manage.menu.form.routeName')" />
            </NFormItemGi>
            <NFormItemGi span="24 m:12" :label="$t('page.manage.menu.path')" path="path">
              <NInput
                v-model:value="model.path"
                :placeholder="$t('page.manage.menu.form.path')"
                disabled
              />
            </NFormItemGi>

            <NFormItemGi span="24 m:12" :label="$t('page.manage.menu.perms')" path="perms"  v-if="model.menuType !== 'M'">
              <NInput v-model:value="model.perms" :placeholder="$t('page.manage.menu.form.perms')" />
            </NFormItemGi>

            <NFormItemGi span="24 m:12" :label="$t('page.manage.menu.query')" path="query">
              <NInput v-model:value="model.query" :placeholder="$t('page.manage.menu.form.query')" />
            </NFormItemGi>

            <NFormItemGi v-if="showLayout" span="24 m:12" :label="$t('page.manage.menu.layout')" path="layout">
              <NSelect
                v-model:value="model.layout"
                :options="layoutOptions"
                :placeholder="$t('page.manage.menu.form.layout')"
              />
            </NFormItemGi>

            <NFormItemGi v-if="showPage" span="24 m:12" :label="$t('page.manage.menu.page')" path="page">
              <NSelect
                v-model:value="model.page"
                :options="pageOptions"
                :placeholder="$t('page.manage.menu.form.page')"
              />
            </NFormItemGi>

            <NFormItemGi span="24 m:12" :label="$t('page.manage.menu.i18nKey')" path="i18nKey">
              <NInput v-model:value="model.i18nKey" :placeholder="$t('page.manage.menu.form.i18nKey')" />
            </NFormItemGi>

            <NFormItemGi span="24 m:12" :label="$t('page.manage.menu.order')" path="order">
              <NInputNumber v-model:value="model.orderNum" class="w-full" :placeholder="$t('page.manage.menu.form.order')" />
            </NFormItemGi>

            <NFormItemGi span="24 m:12" :label="$t('page.manage.menu.iconTypeTitle')" path="iconType">
              <NRadioGroup v-model:value="model.iconType">
                <NRadio
                  v-for="item in menuIconTypeOptions"
                  :key="item.value"
                  :value="item.value"
                  :label="$t(item.label)"
                />
              </NRadioGroup>
            </NFormItemGi>

            <NFormItemGi span="24 m:12" :label="$t('page.manage.menu.icon')" path="icon">
              <template v-if="model.iconType === '1'">
                <CustomIconSelect  v-model:value="model.icon"  />
              </template>
              <template v-if="model.iconType === '2'">
                <NSelect
                  v-model:value="model.icon"
                  :placeholder="$t('page.manage.menu.form.localIcon')"
                  :options="localIconOptions"
                />
              </template>
            </NFormItemGi>

            <NFormItemGi span="24 m:12" :label="$t('page.manage.menu.menuStatus')" path="status">
              <NRadioGroup v-model:value="model.status">
                <NRadio
                  v-for="item in enableStatusOptions"
                  :key="item.value"
                  :value="item.value"
                  :label="$t(item.label)"
                />
              </NRadioGroup>
            </NFormItemGi>

            <NFormItemGi span="24 m:12" :label="$t('page.manage.menu.keepAlive')" path="keepAlive">
              <NRadioGroup v-model:value="model.keepAlive">
                <NRadio :value="true" :label="$t('common.yesOrNo.yes')" />
                <NRadio :value="false" :label="$t('common.yesOrNo.no')" />
              </NRadioGroup>
            </NFormItemGi>
            <NFormItemGi span="24 m:12" :label="$t('page.manage.menu.constant')" path="constant">
              <NRadioGroup v-model:value="model.constant">
                <NRadio :value="true" :label="$t('common.yesOrNo.yes')" />
                <NRadio :value="false" :label="$t('common.yesOrNo.no')" />
              </NRadioGroup>
            </NFormItemGi>
            <NFormItemGi span="24 m:12" :label="$t('page.manage.menu.href')" path="href">
              <NInput v-model:value="model.href" :placeholder="$t('page.manage.menu.form.href')" />
            </NFormItemGi>
            <NFormItemGi span="24 m:12" :label="$t('page.manage.menu.hideInMenu')" path="visible">
              <NRadioGroup v-model:value="model.visible">
                <NRadio :value="1" :label="$t('common.yesOrNo.yes')" />
                <NRadio :value="0" :label="$t('common.yesOrNo.no')" />
              </NRadioGroup>
            </NFormItemGi>

            <NFormItemGi span="24 m:12" :label="$t('page.manage.menu.multiTab')" path="multiTab">
              <NRadioGroup v-model:value="model.multiTab">
                <NRadio :value="true" :label="$t('common.yesOrNo.yes')" />
                <NRadio :value="false" :label="$t('common.yesOrNo.no')" />
              </NRadioGroup>
            </NFormItemGi>
          </template>
        </NGrid>
      </NForm>
    </NScrollbar>
    <template #footer>
      <NSpace justify="end" :size="16">
        <NButton @click="closeDrawer">{{ $t('common.cancel') }}</NButton>
        <NButton type="primary" @click="handleSubmit">{{ $t('common.confirm') }}</NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped></style>
