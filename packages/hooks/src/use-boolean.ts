import { ref } from 'vue';

/**
 * Boolean
 *
 * @param initValue Init value
 */
// 导出一个默认函数，用于创建一个布尔值
export default function useBoolean(initValue = false) {
  // 创建一个ref对象，初始值为initValue
  const bool = ref(initValue);

  // 设置布尔值为value
  function setBool(value: boolean) {
    bool.value = value;
  }
  // 设置布尔值为true
  function setTrue() {
    setBool(true);
  }
  // 设置布尔值为false
  function setFalse() {
    setBool(false);
  }
  // 切换布尔值
  function toggle() {
    setBool(!bool.value);
  }

  // 返回一个对象，包含bool、setBool、setTrue、setFalse、toggle五个属性
  return {
    bool,
    setBool,
    setTrue,
    setFalse,
    toggle
  };
}
