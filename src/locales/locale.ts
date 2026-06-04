import zhCN from './langs/zh-cn';
import enUS from './langs/en-us';
import koKR from './langs/ko-kr';

const locales: Record<App.I18n.LangType, App.I18n.Schema> = {
  'zh-CN': zhCN,
  'en-US': enUS,
  'ko-KR': koKR
};

export default locales;
