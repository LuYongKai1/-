import { transformRecordToOption } from '@/utils/common';

export const enableStatusRecord: Record<Api.Common.EnableStatus, App.I18n.I18nKey> = {
  '1': 'page.manage.common.status.enable',
  '2': 'page.manage.common.status.disable'
};
export const enableStatusOptions = transformRecordToOption(enableStatusRecord);


export const userGenderRecord: Record<Api.SystemManage.UserGender, App.I18n.I18nKey> = {
  '0': 'page.manage.user.gender.male',
  '1': 'page.manage.user.gender.female'
};

export const userGenderOptions = transformRecordToOption(userGenderRecord);

export const gameStatusRecord: Record<Api.SystemManage.GameStatus, App.I18n.I18nKey> = {
  '0': 'page.manage.common.enable.normal',
  '1': 'page.manage.common.enable.disable'
}
export const gameGenderOptions = transformRecordToOption(gameStatusRecord);


export const menuTypeRecord: Record<Api.SystemManage.MenuType, App.I18n.I18nKey> = {
  '1': 'page.manage.menu.type.directory',
  '2': 'page.manage.menu.type.menu'
};

export const menuTypeOptions = transformRecordToOption(menuTypeRecord);

export const menuIconTypeRecord: Record<Api.SystemManage.IconType, App.I18n.I18nKey> = {
  '1': 'page.manage.menu.iconType.iconify',
  '2': 'page.manage.menu.iconType.local'
};

export const menuIconTypeOptions = transformRecordToOption(menuIconTypeRecord);


//隐藏菜单
export const visibleRecord: Record<Api.SystemManage.visibleStatus, App.I18n.I18nKey> = {
  '0': 'page.manage.menu.yesOrNo.no',
  '1': 'page.manage.menu.yesOrNo.yes'
};

export const visibleOptions = transformRecordToOption(visibleRecord);

