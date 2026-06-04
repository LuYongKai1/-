<script setup lang="ts">
import { NCard, NForm, NFormItemGi, NGrid, NButton, NSpace, NDivider, NSelect, NInputNumber, NDataTable, NEmpty } from "naive-ui";
import { $t } from "@/locales";
import { reactive, ref, computed, h } from "vue";
import ItemSearchSelector from "@/components/business/item-search-selector.vue";
import RoleSearchSelector from "@/components/business/role-search-selector.vue";
import type { ItemInfo } from "@/utils/item";
import { fetchSetPerfectAttribute } from "@/service/api/game-manage";
import { useServerStore } from "@/store/modules/server";
import ConfirmDialog from "./modules/confirm-dialog.vue";

type AttributeOption = {
  label: string;
  value: string | number; // 使用 string 作为唯一标识符
  actualId: number; // 实际的属性 ID
  type: "refine" | "entry";
  /** single input mode (value == valueMax when submitting) */
  singleInput?: boolean;
  /**
   * For attributes that need two inputs (min/max) but map to two entry ids.
   * Example: 魔法攻击 -> [最小魔法攻击id, 最大魔法攻击id]
   */
  rangeIds?: [number, number];
  rangeLabels?: [string, string];
};

// 角色信息接口
interface RoleInfo {
  id: string;
  name: string;
  serverId: number;
  serverName?: string;
}

// 洗练属性配置项接口
interface RefineAttributeConfig {
  id: number;
  name: string;
  value: number;
  valueMax: number;
  grade: number; // 稀有度: 1=普通(白), 2=高级(绿), 3=宝物(蓝), 4=圣物(紫), 5=神物(橙), 6=传说(红)
}

// 词条属性配置项接口
type EntryAttributeConfig =
  | {
      kind: "single";
      id: number;
      name: string;
      value: number;
    }
  | {
      kind: "range";
      ids: [number, number];
      name: string;
      labels: [string, string];
      values: [number, number];
    };

// 表单模型
const model = reactive({
  attributeType: null as string | null,
  attributeValue: 1 as number,
  attributeValueMax: 1 as number,
  luck: 0 as number,
  reinforce: 0 as number,
  gemSlotCount: 0 as number,
  refineGrade: 1 as number, // 洗练词条稀有度
  selectedGroup: null as "refine" | "entry" | null
});

// 选中的物品列表
const selectedItems = ref<ItemInfo[]>([]);

// 选中的角色列表
const selectedRoles = ref<RoleInfo[]>([]);

// 已添加的洗练属性列表
const refineAttributeList = ref<RefineAttributeConfig[]>([]);

// 已添加的词条属性列表
const entryAttributeList = ref<EntryAttributeConfig[]>([]);

// 提交加载状态
const submitLoading = ref(false);

// 获取服务器信息
const serverStore = useServerStore();

// 稀有度选项
const gradeOptions = [
  { label: "普通(白)", value: 1 },
  { label: "高级(绿)", value: 2 },
  { label: "宝物(蓝)", value: 3 },
  { label: "圣物(紫)", value: 4 },
  { label: "神物(橙)", value: 5 },
  { label: "传说(红)", value: 6 }
];

// 洗练属性选项（洗练词条）
const refineAttributeOptions: AttributeOption[] = [
  { label: "生命值", value: "refine_1", actualId: 1, type: "refine", singleInput: true },
  { label: "魔法值", value: "refine_2", actualId: 2, type: "refine", singleInput: true },
  { label: "物理攻击 (洗练)", value: "refine_342", actualId: 342, type: "refine", rangeIds: [342, 342], rangeLabels: ["最小值", "最大值"] },
  { label: "魔法攻击 (洗练)", value: "refine_343", actualId: 343, type: "refine", rangeIds: [343, 343], rangeLabels: ["最小值", "最大值"] },
  { label: "物理防御 (洗练)", value: "refine_344", actualId: 344, type: "refine", rangeIds: [344, 344], rangeLabels: ["最小值", "最大值"] },
  { label: "魔法防御 (洗练)", value: "refine_345", actualId: 345, type: "refine", rangeIds: [345, 345], rangeLabels: ["最小值", "最大值"] },
];

// 词条属性选项（随机词条）
const entryAttributeOptions: AttributeOption[] = [
  { label: "生命值", value: "entry_1", actualId: 1, type: "entry" },
  { label: "魔法值", value: "entry_2", actualId: 2, type: "entry" },
  { label: "物理攻击", value: "entry_3", actualId: 3, type: "entry", rangeIds: [3, 4], rangeLabels: ["最小物理攻击", "最大物理攻击"] },
  { label: "魔法攻击", value: "entry_5", actualId: 5, type: "entry", rangeIds: [5, 6], rangeLabels: ["最小魔法攻击", "最大魔法攻击"] },
  { label: "物理防御", value: "entry_7", actualId: 7, type: "entry", rangeIds: [7, 8], rangeLabels: ["最小物理防御", "最大物理防御"] },
  { label: "魔法防御", value: "entry_9", actualId: 9, type: "entry", rangeIds: [9, 10], rangeLabels: ["最小魔法防御", "最大魔法防御"] },
  { label: "暴击", value: "entry_11", actualId: 11, type: "entry" },
  { label: "暴击抗性", value: "entry_12", actualId: 12, type: "entry" },
  { label: "异常状态命中", value: "entry_13", actualId: 13, type: "entry" },
  { label: "异常状态闪避", value: "entry_14", actualId: 14, type: "entry" },
  { label: "移动速度", value: "entry_15", actualId: 15, type: "entry" },
  { label: "移速", value: "entry_16", actualId: 16, type: "entry" },
  { label: "命中", value: "entry_17", actualId: 17, type: "entry" },
  { label: "闪避", value: "entry_18", actualId: 18, type: "entry" },
  { label: "护甲穿透", value: "entry_32", actualId: 32, type: "entry" },
  { label: "百分比物理攻击", value: "entry_91", actualId: 91, type: "entry" },
  { label: "百分比魔法攻击", value: "entry_92", actualId: 92, type: "entry" },
  { label: "百分比物理防御", value: "entry_93", actualId: 93, type: "entry" },
  { label: "百分比魔法防御", value: "entry_94", actualId: 94, type: "entry" },
  { label: "神力倍功", value: "entry_298", actualId: 298, type: "entry" },
  { label: "倍功抗性", value: "entry_300", actualId: 300, type: "entry" },
  { label: "穿透抗性", value: "entry_339", actualId: 339, type: "entry" },
  { label: "暴伤增加", value: "entry_340", actualId: 340, type: "entry" },
  { label: "暴伤减免", value: "entry_341", actualId: 341, type: "entry" },
  { label: "职业最小攻击", value: "entry_349", actualId: 349, type: "entry" },
  { label: "职业最大攻击", value: "entry_350", actualId: 350, type: "entry" },
];

// 合并所有属性选项，按类型分组
const attributeOptions = computed(() => [
  {
    type: "group",
    label: "洗练词条",
    key: "refine",
    children: refineAttributeOptions
  },
  {
    type: "group",
    label: "随机词条",
    key: "entry",
    children: entryAttributeOptions
  }
]);

// 获取所有属性的扁平列表（用于查找属性名称）
const allAttributesFlat = computed(() => {
  return [...refineAttributeOptions, ...entryAttributeOptions];
});

// 判断选中的属性类型
const selectedAttributeInfo = computed(() => {
  if (model.attributeType === null) return null;
  // 根据用户选择的分组来查找属性
  if (model.selectedGroup === 'refine') {
    return refineAttributeOptions.find(opt => opt.value === model.attributeType);
  } else if (model.selectedGroup === 'entry') {
    return entryAttributeOptions.find(opt => opt.value === model.attributeType);
  }
  return null;
});

const isRefineAttribute = computed(() => {
  return model.selectedGroup === 'refine';
});

const isEntryRangeAttribute = computed(() => {
  return selectedAttributeInfo.value?.type === "entry" && !!selectedAttributeInfo.value?.rangeIds;
});

const isSingleInputAttribute = computed(() => {
  return !!selectedAttributeInfo.value?.singleInput;
});

function isSingleInputRefineById(id: number) {
  return !!refineAttributeOptions.find(opt => opt.actualId === id)?.singleInput;
}

// 根据稀有度获取名称
function getGradeName(grade: number): string {
  const gradeOption = gradeOptions.find(opt => opt.value === grade);
  return gradeOption?.label || "普通(白)";
}

// 洗练属性表格列配置
const refineAttributeColumns = computed(() => [
  {
    title: '属性类型',
    key: 'name',
    width: 180,
    ellipsis: { tooltip: true }
  },
  {
    title: '稀有度',
    key: 'grade',
    width: 120,
    render: (row: RefineAttributeConfig): any => {
      return h('span', getGradeName(row.grade));
    }
  },
  {
    title: '最小值',
    key: 'value',
    width: 150,
    render: (row: RefineAttributeConfig, index: number): any => {
      const isSingleInput = isSingleInputRefineById(row.id);
      return h(NInputNumber, {
        value: row.value,
        min: 1,
        max: 999999,
        showButton: false,
        style: { width: '140px' },
        onUpdateValue: (value: number | null) => {
          if (value !== null) {
            refineAttributeList.value[index].value = value;
            // singleInput 属性保持 value 和 valueMax 一致
            if (isSingleInput) {
              refineAttributeList.value[index].valueMax = value;
            }
          }
        }
      });
    }
  },
  {
    title: '最大值',
    key: 'valueMax',
    width: 150,
    render: (row: RefineAttributeConfig, index: number): any => {
      if (isSingleInputRefineById(row.id)) {
        return h("span", { class: "text-[#999]" }, "-");
      }
      return h(NInputNumber, {
        value: row.valueMax,
        min: 1,
        max: 999999,
        showButton: false,
        style: { width: '140px' },
        onUpdateValue: (value: number | null) => {
          if (value !== null) {
            refineAttributeList.value[index].valueMax = value;
          }
        }
      });
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 100,
    fixed: 'right' as const,
    render: (row: RefineAttributeConfig, index: number): any => {
      return h(NButton, {
        text: true,
        type: 'error',
        size: 'small',
        onClick: () => removeRefineAttribute(index)
      }, { default: () => '删除' });
    }
  }
]);

// 词条属性表格列配置
const entryAttributeColumns = computed(() => [
  {
    title: '属性类型',
    key: 'name',
    width: 220,
    ellipsis: { tooltip: true }
  },
  {
    title: '最小值',
    key: 'valueMin',
    width: 200,
    render: (row: EntryAttributeConfig, index: number): any => {
      if (row.kind === "range") {
        const [minValue, maxValue] = row.values;
        return h(NInputNumber, {
          value: minValue,
          min: 1,
          max: 999999,
          showButton: false,
          style: { width: "140px" },
          onUpdateValue: (value: number | null) => {
            if (value !== null && entryAttributeList.value[index]?.kind === "range") {
              (entryAttributeList.value[index] as Extract<EntryAttributeConfig, { kind: "range" }>).values[0] = value;
            }
          }
        });
      }

      return h(NInputNumber, {
        value: row.value,
        min: 1,
        max: 999999,
        showButton: false,
        style: { width: '140px' },
        onUpdateValue: (value: number | null) => {
          if (value !== null && entryAttributeList.value[index]?.kind === "single") {
            (entryAttributeList.value[index] as Extract<EntryAttributeConfig, { kind: "single" }>).value = value;
          }
        }
      });
    }
  },
  {
    title: '最大值',
    key: 'valueMax',
    width: 200,
    render: (row: EntryAttributeConfig, index: number): any => {
      if (row.kind === "range") {
        const [, maxValue] = row.values;
        return h(NInputNumber, {
          value: maxValue,
          min: 1,
          max: 999999,
          showButton: false,
          style: { width: "140px" },
          onUpdateValue: (value: number | null) => {
            if (value !== null && entryAttributeList.value[index]?.kind === "range") {
              (entryAttributeList.value[index] as Extract<EntryAttributeConfig, { kind: "range" }>).values[1] = value;
            }
          }
        });
      }

      return h("span", { class: "text-[#999]" }, "-");
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 80,
    fixed: 'right' as const,
    render: (row: EntryAttributeConfig, index: number): any => {
      return h(NButton, {
        text: true,
        type: 'error',
        size: 'small',
        onClick: () => removeEntryAttribute(index)
      }, { default: () => '删除' });
    }
  }
]);

// 处理属性类型选择变化
function handleAttributeTypeChange(value: string | null) {
  model.attributeType = value;
  if (value === null) {
    model.selectedGroup = null;
    return;
  }

  // 根据 value 的前缀判断属于哪个分组
  if (value.startsWith('refine_')) {
    model.selectedGroup = 'refine';
  } else if (value.startsWith('entry_')) {
    model.selectedGroup = 'entry';
  }
}

// 添加属性到列表
function addAttribute() {
  if (model.attributeType === null) {
    window.$message?.warning("请选择属性类型");
    return;
  }

  const attrOption = selectedAttributeInfo.value;
  if (!attrOption) {
    window.$message?.warning("无效的属性类型");
    return;
  }

  const attrName = attrOption.label;
  const actualId = attrOption.actualId;

  if (isRefineAttribute.value) {
    // 洗练属性
    const useSingleInput = !!attrOption.singleInput;
    if (!useSingleInput && model.attributeValue > model.attributeValueMax) {
      window.$message?.warning("最小值不能大于最大值");
      return;
    }

    refineAttributeList.value.push({
      id: actualId,
      name: attrName,
      value: model.attributeValue,
      valueMax: useSingleInput ? model.attributeValue : model.attributeValueMax,
      grade: model.refineGrade
    });
  } else {
    // 词条属性
    if (attrOption.rangeIds) {
      const [minId, maxId] = attrOption.rangeIds;
      const [minLabel, maxLabel] = attrOption.rangeLabels || [`最小${attrName}`, `最大${attrName}`];

      if (model.attributeValue > model.attributeValueMax) {
        window.$message?.warning("最小值不能大于最大值");
        return;
      }

      entryAttributeList.value.push({
        kind: "range",
        ids: [minId, maxId],
        name: attrName,
        labels: [minLabel, maxLabel],
        values: [model.attributeValue, model.attributeValueMax]
      });
    } else {
      if (entryAttributeList.value.length >= 20) {
        window.$message?.warning("随机词条最多只能添加20条");
        return;
      }

      entryAttributeList.value.push({ kind: "single", id: actualId, name: attrName, value: model.attributeValue });
    }
  }

  // 清空输入框
  model.attributeType = null;
  model.attributeValue = 1;
  model.attributeValueMax = 1;
  model.refineGrade = 1;
  model.selectedGroup = null;
}

// 删除洗练属性
function removeRefineAttribute(index: number) {
  refineAttributeList.value.splice(index, 1);
}

// 删除词条属性
function removeEntryAttribute(index: number) {
  entryAttributeList.value.splice(index, 1);
}

// 重置表单
function reset() {
  selectedItems.value = [];
  selectedRoles.value = [];
  refineAttributeList.value = [];
  entryAttributeList.value = [];
  model.attributeType = null;
  model.attributeValue = 1;
  model.attributeValueMax = 1;
  model.luck = 0;
  model.reinforce = 0;
  model.gemSlotCount = 0;
  model.refineGrade = 1;
  model.selectedGroup = null;
}

// 提交表单
async function handleSubmit() {
  // 防止重复提交
  if (submitLoading.value) {
    return;
  }

  // 验证必填项
  if (selectedRoles.value.length === 0) {
    window.$message?.warning("请选择角色");
    return;
  }
  if (selectedItems.value.length === 0) {
    window.$message?.warning("请选择物品");
    return;
  }
  if (refineAttributeList.value.length === 0 && entryAttributeList.value.length === 0 && model.luck === 0 && model.reinforce === 0 && model.gemSlotCount === 0) {
    window.$message?.warning("请至少添加一个属性或设置祝福/强化/宝石卡槽");
    return;
  }

  // 显示确认对话框
  showConfirmDialog();
}

// 显示确认对话框
function showConfirmDialog() {
  const confirmData = {
    roles: selectedRoles.value,
    items: selectedItems.value,
    luck: model.luck,
    reinforce: model.reinforce,
    gemSlotCount: model.gemSlotCount,
    refineAttributes: refineAttributeList.value,
    entryAttributes: entryAttributeList.value
  };

  window.$dialog?.warning({
    title: "确认操作",
    style: { width: '900px' },
    content: () => h(ConfirmDialog, {
      data: confirmData,
      getGradeName,
      isSingleInputRefineById
    }),
    positiveText: "确定提交",
    negativeText: "取消",
    onPositiveClick: async () => {
      await executeSubmit();
    }
  });
}

// 执行提交
async function executeSubmit() {

  try {
    submitLoading.value = true;

    // 遍历每个角色和每个物品发送请求
    for (const role of selectedRoles.value) {
      for (const item of selectedItems.value) {
        // 构造listEnchant数组（洗练属性，最多4条）
        const listEnchant = Array(4).fill({});
        refineAttributeList.value.forEach((attr, index) => {
          if (index < 4) {
            listEnchant[index] = {
              id: attr.id,
              value: attr.value,
              valueMax: attr.valueMax,
              grade: attr.grade
            };
          }
        });

        // 构造listExtra数组（词条属性，最多20条） - range 属性展开成两条 id
        const listExtra = Array(20).fill({});
        const expandedExtras: Array<{ id: number; value: number }> = [];
        entryAttributeList.value.forEach(attr => {
          if (attr.kind === "range") {
            expandedExtras.push({ id: attr.ids[0], value: attr.values[0] }, { id: attr.ids[1], value: attr.values[1] });
          } else {
            expandedExtras.push({ id: attr.id, value: attr.value });
          }
        });
        expandedExtras.slice(0, 20).forEach((attr, index) => {
          listExtra[index] = { id: attr.id, value: attr.value };
        });

        // 根据宝石卡槽个数构造 listEnchantStone 数组
        const listEnchantStone: Array<Record<string, any>> = [];
        if (model.gemSlotCount === 0) {
          // 如果为0，填充3个空对象
          listEnchantStone.push({}, { tid: -1 }, { tid: -1 });
        } else if (model.gemSlotCount === 1) {
          // 如果为1，第一个为空对象，后两个为 {tid: -1}
          listEnchantStone.push({}, { tid: -1 }, { tid: -1 });
        } else if (model.gemSlotCount === 2) {
          // 如果为2，前两个为空对象，最后一个为 {tid: -1}
          listEnchantStone.push({}, {}, { tid: -1 });
        } else if (model.gemSlotCount === 3) {
          // 如果为3，全部为空对象
          listEnchantStone.push({}, {}, {});
        }

        // 构造 option 对象（与 SEND_ITEM_DATA_MAIL 协议一致）
        const option: Record<string, any> = {
          listEnchant,
          uniqOption: {},
          listEnchantStone,
          jadeOption: {},
          listExtra,
          luck: model.luck
        };
        if (model.reinforce > 0) {
          option.reinforce = model.reinforce;
        }

        // item_data 结构：iuid, id, count, haveOption, option, durability, maxDurability
        const itemData = [
          {
            iuid: "0",
            id: Number(item.id),
            count: 1,
            haveOption: true,
            option,
            durability: 9999,
            maxDurability: 9999
          }
        ];

        await fetchSetPerfectAttribute({
          gameId: 101,
          serverId: role.serverId,
          roleId: role.id,
          itemData,
          mailId: 8888,
          keepTime: 604800
        });
      }
    }

    window.$message?.success("极品属性设置成功");
    reset();
  } catch (error) {
    console.error("设置极品属性失败:", error);
    window.$message?.error("设置极品属性失败");
  } finally {
    submitLoading.value = false;
  }
}
</script>

<template>
  <div class="flex-col-stretch gap-16px overflow-y-auto">
    <!-- 角色和物品信息 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-16px">
      <!-- 角色信息卡片 -->
      <NCard
        title="角色信息"
        :bordered="false"
        size="small"
        class="card-wrapper"
      >
        <RoleSearchSelector
          v-model="selectedRoles"
          placeholder="请输入角色名称或ID搜索"
          :max-height="200"
        />
      </NCard>

      <!-- 物品信息卡片 -->
      <NCard
        title="物品信息"
        :bordered="false"
        size="small"
        class="card-wrapper"
      >
        <ItemSearchSelector
          v-model="selectedItems"
          :max-count="5"
          placeholder="请输入物品名称或ID搜索"
          :max-height="200"
        />
      </NCard>
    </div>

    <!-- 属性配置卡片 -->
    <NCard
      title="属性配置"
      :bordered="false"
      size="small"
      class="card-wrapper"
    >
      <!-- 祝福、强化和宝石卡槽个数 -->
      <div class="grid grid-cols-3 gap-4 mb-4">
        <div>
          <div class="text-sm mb-2 text-[#666] dark:text-[#aaa]">祝福</div>
          <NInputNumber
            v-model:value="model.luck"
            :min="0"
            :max="13"
            placeholder="0-13"
            style="width: 100%"
          />
        </div>
        <div>
          <div class="text-sm mb-2 text-[#666] dark:text-[#aaa]">强化</div>
          <NInputNumber
            v-model:value="model.reinforce"
            :min="0"
            :max="20"
            placeholder="0-20"
            style="width: 100%"
          />
        </div>
        <div>
          <div class="text-sm mb-2 text-[#666] dark:text-[#aaa]">宝石卡槽个数</div>
          <NInputNumber
            v-model:value="model.gemSlotCount"
            :min="0"
            :max="3"
            placeholder="0-3"
            style="width: 100%"
          />
        </div>
      </div>

      <NDivider style="margin: 16px 0">添加属性</NDivider>

      <!-- 属性添加区域 - 默认全部显示 -->
      <div class="space-y-3">
        <!-- 第一行：属性选择和数值输入，按钮固定在最右边 -->
        <div class="flex items-center gap-3">
          <NSelect
            v-model:value="model.attributeType"
            :options="attributeOptions"
            placeholder="请选择属性类型"
            clearable
            filterable
            style="width: 280px"
            @update:value="handleAttributeTypeChange"
          />
          <NInputNumber
            v-model:value="model.attributeValue"
            :min="1"
            :max="999999"
            placeholder="最小值"
            style="width: 160px"
          />
          <NInputNumber
            v-model:value="model.attributeValueMax"
            :min="1"
            :max="999999"
            placeholder="最大值"
            style="width: 160px"
          />
          <NButton
            type="primary"
            @click="addAttribute"
            style="width: 120px"
          >
            <template #icon>
              <icon-ic-round-add class="text-icon" />
            </template>
            添加属性
          </NButton>
        </div>

        <!-- 第二行：稀有度选择（仅洗练属性显示） -->
        <div v-if="isRefineAttribute" class="flex items-center gap-3">
          <div class="text-sm text-[#666] dark:text-[#aaa]" style="width: 80px">稀有度:</div>
          <NSelect
            v-model:value="model.refineGrade"
            :options="gradeOptions"
            placeholder="请选择稀有度"
            style="width: 200px"
          />
        </div>
      </div>

      <NDivider style="margin: 16px 0">已配置属性</NDivider>

      <!-- 属性列表展示区域 -->
      <div class="space-y-4">
        <!-- 洗练属性列表 -->
        <div v-if="refineAttributeList.length > 0" class="rounded-8px border border-[#e5e7eb] dark:border-[#2a2f3a] p-3">
          <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-[#333] dark:text-[#ddd]">洗练词条</span>
            <span class="text-xs text-[#999]">{{ refineAttributeList.length }}/4</span>
          </div>
          <NDataTable
            :columns="refineAttributeColumns"
            :data="refineAttributeList"
            :bordered="false"
            :single-line="false"
            size="small"
            :max-height="200"
            class="attr-table"
          />
        </div>

        <!-- 词条属性列表 -->
        <div v-if="entryAttributeList.length > 0" class="rounded-8px border border-[#e5e7eb] dark:border-[#2a2f3a] p-3">
          <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-[#333] dark:text-[#ddd]">随机词条</span>
            <span class="text-xs text-[#999]">{{ entryAttributeList.length }}/20</span>
          </div>
          <NDataTable
            :columns="entryAttributeColumns"
            :data="entryAttributeList"
            :bordered="false"
            :single-line="false"
            size="small"
            :max-height="200"
            class="attr-table"
          />
        </div>

        <!-- 空状态提示 -->
        <NEmpty
          v-if="refineAttributeList.length === 0 && entryAttributeList.length === 0"
          description="暂无属性配置，请在上方添加属性"
          size="small"
          class="py-4"
        />
      </div>

      <!-- 操作按钮 -->
      <div class="mt-12px">
        <NSpace justify="end">
          <NButton @click="reset">
            <template #icon>
              <icon-ic-round-refresh class="text-icon" />
            </template>
            {{ $t("common.reset") }}
          </NButton>
          <NButton
            type="primary"
            :loading="submitLoading"
            @click="handleSubmit"
          >
            <template #icon>
              <icon-ic-round-check class="text-icon" />
            </template>
            {{ $t("common.confirm") }}
          </NButton>
        </NSpace>
      </div>
    </NCard>
  </div>
</template>

<style scoped>

</style>
