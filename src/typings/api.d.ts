/**
 * Namespace Api
 *
 * All backend api type
 */
declare namespace Api {
  namespace Common {
    /** common params of paginating */
    interface PaginatingCommonParams {
      /** current page number */
      current: number;
      /** page size */
      size: number;
      /** total count */
      total: number;
    }

    /** common params of paginating query list data */
    interface PaginatingQueryRecord<T = any> extends PaginatingCommonParams {
      records: T[];
    }

    /** common search params of table */
    type CommonSearchParams = Pick<Common.PaginatingCommonParams, 'current' | 'size'>;

    /**
     * enable status
     *
     * - "1": enabled
     * - "2": disabled
     */
    type EnableStatus = '0' | '1';

    /** common record */
    type CommonRecord<T = any> = {
      /** record id */
      id: number;
      /** record creator */
      createBy: string;
      /** record create time */
      createTime: string;
      /** record updater */
      updateBy: string;
      /** record update time */
      updateTime: string;
      /** record status */
      status: EnableStatus | null;
    } & T;
  }

  /**
   * namespace GmLog
   *
   * backend api module: "gmlog"
   */
  namespace GmLog {
    /** GM log record */
    interface GmLogRecord {
      /** log id */
      id: number;
      /** game id */
      gameId?: number;
      /** operator */
      operator: string;
      /** GM code */
      gmCode: string;
      /** GM name */
      gmName: string;
      /** parameter JSON */
      paramJson: string;
      /** create date */
      createDate: string;
      /** server id */
      serverId: number;
      /** GM status */
      gmStatus: number;
      /** GM URL */
      gmUrl: string;
      /** role id */
      roleId: string;
      /** user id */
      userId: string;
      /** message */
      msg: string;
    }
  }

  /**
   * namespace Auth
   *
   * backend api module: "auth"
   */
  namespace Auth {
    interface LoginToken {
      token: string;
      refreshToken: string;
    }
    interface UserInfo {
      msg: string;
      code: number;
      permissions: string[];
      roles: {
        createBy: string | null;
        createTime: string | null;
        updateBy: string | null;
        updateTime: string | null;
        remark: string | null;
        params: { "@type": string };
        roleId: number;
        roleName: string;
        roleKey: string;
        roleSort: number;
        dataScope: string;
        menuCheckStrictly: boolean;
        deptCheckStrictly: boolean;
        status: string;
        delFlag: string | null;
        flag: boolean;
        menuIds: any | null;
        deptIds: any | null;
        permissions: any | null;
        admin: boolean;
      }[];
      user: {
        createBy: string;
        createTime: string;
        updateBy: string | null;
        updateTime: string | null;
        remark: string;
        params: { "@type": string };
        userId: number;
        deptId: number;
        userName: string;
        nickName: string;
        email: string;
        phonenumber: string;
        sex: string;
        avatar: string | null;
        password: string;
        status: string;
        delFlag: string;
        loginIp: string;
        loginDate: string;
        dept: {
          createBy: string | null;
          createTime: string | null;
          updateBy: string | null;
          updateTime: string | null;
          remark: string | null;
          params: { "@type": string };
          deptId: number;
          parentId: number;
          ancestors: string;
          deptName: string;
          orderNum: number;
          leader: string;
          phone: string | null;
          email: string | null;
          status: string;
          delFlag: string | null;
          parentName: string | null;
          children: any[];
        };
        roles: {
          createBy: string | null;
          createTime: string | null;
          updateBy: string | null;
          updateTime: string | null;
          remark: string | null;
          params: { "@type": string };
          roleId: number;
          roleName: string;
          roleKey: string;
          roleSort: number;
          dataScope: string;
          menuCheckStrictly: boolean;
          deptCheckStrictly: boolean;
          status: string;
          delFlag: string | null;
          flag: boolean;
          menuIds: any | null;
          deptIds: any | null;
          permissions: any | null;
          admin: boolean;
        }[];
        roleIds: any | null;
        postIds: any | null;
        roleId: any | null;
        admin: boolean;
      };
    }
  }


  /**
   * namespace Route
   *
   * backend api module: "route"
   */
  namespace Route {
    type ElegantConstRoute = import('@elegant-router/types').ElegantConstRoute;

    interface MenuRoute extends ElegantConstRoute {
      id: string;
    }

    interface UserRoute {
      routes: MenuRoute[];
      home: import('@elegant-router/types').LastLevelRouteKey;
    }
  }

  /**
   * namespace SystemManage
   *
   * backend api module: "systemManage"
   */
  namespace SystemManage {
    type CommonSearchParams = Pick<Common.PaginatingCommonParams, 'current' | 'size'>;
    /** role */
    type Role = Common.CommonRecord<{
      /** role name */
      roleName: string;
      /** role code */
      roleCode: string;
      /** role description */
      roleDesc: string;
      roleKey: string;
      roleSort: null[];
      displayOrder: number;
      remark: string;
      visible: string;
    }>;

    /** role search params */
    type RoleSearchParams = CommonType.RecordNullable<
      Pick<Api.SystemManage.Role, 'roleName' | 'roleCode' | 'status'> & CommonSearchParams
    >;

    /** role list */
    type RoleList = Common.PaginatingQueryRecord<Role>;

    /** all role */
    type AllRole = Pick<Role, 'id' | 'roleName' | 'roleCode'>;

    /**
     * user gender
     *
     * - "1": "male"
     * - "2": "female"
     */
    type UserGender = '0' | '1';

    /** user */
    type User = Common.CommonRecord<{
      userName: string;
      sex: null;
      nickName: string;
      phonenumber: string;
      email: string;
      password: string;
      userRoles: string[];
      avatar: string | null;
      userId: number;
      loginIp: string;
      loginDate: string | null;
    }>;

    /** user search params */
    type UserSearchParams = CommonType.RecordNullable<
      Pick<Api.SystemManage.User, 'userName' | 'sex' | 'nickName' | 'phonenumber' | 'email' | 'status'> &
      CommonSearchParams
    >;


    /** user list */
    type UserList = Common.PaginatingQueryRecord<User>;

    /** game status */
    type GameStatus = '0' | '1'; // 0:错误 1:正常
    type Usermerge = '0' | '1'; // 0:数据隔离 1:数据打通

    type GameSearchParams = CommonType.RecordNullable<
      Pick<Api.SystemManage.Game, 'gameAlias' | 'gameName'> &
      CommonSearchParams
    >;

    /** game */
    type Game = Common.CommonRecord<{
      gameId: string;
      gameName: string;
      gameAlias: string;
      callbackUrl: string;
      gmUrl: string;
      gameKey: string;
      gameSecret: string;
      enable: GameStatus | null;
      channelIds: string;
      userMerge: string;
    }
    >;

    /** 渠道 params */

    /**
    type Channelenable = '0' | '1';

    /** 渠道 */
    type channel = Common.CommonRecord<{
      channelId: string;
      channelCode: string;
      channelName: string;
      channelBriefName: string;
      channelUserTotal: string;
      platform?: string;
      channelConfig?: string | object;
      createDate: string;
      updateDate: string;
      enable: string;
    }>

    /** 渠道 search params */

    /** 渠道 list */
    type channelList = Common.PaginatingQueryRecord<channel>;

    type channeSearchParams = CommonType.RecordNullable<
      Pick<Api.SystemManage.channel, 'channelId' | 'channelName'> & CommonSearchParams
    >;


    /** 区服 */
    type serverType = '0' | '1';

    /** 服务器类型 */
    type ServerTypeCategory = 'NORMAL' | 'CROSS' | 'MERGE';

    type serverregion = Common.CommonRecord<{
      id: string;
      gameId: number;
      regionName: string;
      regionIndex: string;
      clientVersionMin: string;
      clientVersionMax: string;
      resUrl: string;
      maintenance: string;
      commonHost: string;
      commonPort: string;
      maintenanceMsg: string;
      channelMedia: string;
      whiteList: string;
      groupList: string;
    }>



    /** 服务器管理 */

    // 服务器可见
    // INVISIBLE:不可见;WHITE:白名单;VISIBLE:可见
    type serverVisible = 'INVISIBLE' | 'VISIBLE';
    // 服务器状态
    //对外显示的服务器状态：0:正常;1:繁忙;2:爆满3：关闭 4:维护;5:隐藏
    type serverStatus = '0' | '1' | '2' | '3' | '4' | '5';

    type serverStatusadd = '0' | '4' | '5';

    // 推荐状态
    type serverRecommend = '0' | '1'; // 0:不推荐 1:推荐
    // 新服状态
    type serverNew = '0' | '1'; // 0:非新服 1:新服

    // 服务器运行状态
    type serverRunState = '0' | '1' | '2' | '3'; // 0:正常 1:警告 2:离线 3:维护

    type clusterStatus = '-1' | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';

    /** 服务器状态数据 */
    interface ServeritemStatus {
      /** 服务器ID */
      serverId: number;
      /** 运行状态 */
      runState: number | null;
      /** 在线人数 */
      onlineUser: number | null;
      /** 集群状态 */
      clusterStatus: number | null;
      /** 排队人数 */
      serverQueuePlayer: number | null;
      /** 服务器版本 */
      serverVersion: string | null;
      /** 服务器状态 */
      serverStatus: string | number | null;
      /** 服务器标签 */
      serverNew: number | null;
    }

    type serveritem = Common.CommonRecord<{
      id: string;
      groupId: string;
      serverId: string;
      serverName: string;
      serverIp: string;
      serverPort: string;
      intranetIp: string;
      serverOpenDate: string;
      urlCallback: string;
      urlGm: string;
      serverVisible: string;
      serverStatus: string;
      serverNew: string;
      serverRecommend: string;
      extendParam: string;
      serverHot: string;
      busyUser: string;
      fullUser: string;
      maxUser: string;
      serverType: string;
      clusterStatus: string;
    }>

    //开启排队
    type serverqueue = Common.CommonRecord<{
      gameId: string;
      setto: string;
      serverList: string;
    }>

    /** 白名单管理  */

    type whiteTypeIp = '0' | '1' | '2' | '3' | '4';  // 0:用户白名单 1:IP白名单 2:IP黑名单 3:IP白名单(受限) 4:账号白名单(受限)

    type serverwhite = Common.CommonRecord<{
      type: string;
      channel: string;
      param: string;
      status: string;
      description: string;
    }>


    /** 服务器分组 search params */
    type servergroupTest = '0' | '1'; // 0:正常分组 1:测试分组

    type servergroup = Common.CommonRecord<{
      gameId: string;
      groupIndex: number;
      groupName: string;
      groupTag: string;
      groupTest: string;
      createDate: string;
      updateDate: string;
    }>

    /** 日志服管理 log */
    type serversaveEnble = '0' | '1'; // 0: 暂不入库 1:立即入库
    type serverenable = '0' | '1'; //  0:关闭 1正常

    type serverlog = Common.CommonRecord<{
      gameId: string;
      logName: string;
      logIp: string;
      logPort: string;
      saveEnable: string;
      groupList: string;
      enable: string;
      updateDate: string;
    }>;

    /** gmusem  */
    type gmusem = Common.CommonRecord<{
      userId: string;
      keepTime: string;
      banReason: string;
      banChatting: string;
    }>;

    type gmrole = Common.CommonRecord<{
      roleId: string;
      keepTime: string;
      banReason: string;
      banChatting: string;
    }>;

    type noticeType = '0' | '1' | '2'; // 0:公告 1:活动 2:节日
    type noticeExplain = 'null' | '0' | '1'; // null:无 0:热 1:新
    type noticeenable = '0' | '1'; //  0:启用 1停用

    type norice = Common.CommonRecord<{
      noticeName: string;
      noticeIndex: string;
      noticeType: string;
      noticeExplain: string;
      enable: string;
      startDate: string;
      endDate: string;
      noticeContent: string;
      groupId: string;
      gameId: string;
      regionId: string;
      channelId: string;
      channelCode: string;
      serverId?: string | number;
    }>;

    type marquee = Common.CommonRecord<{
      marqueeName: string;
      marqueeContent: string;
      serverIds: string;
      roundTimes: string;
      roundDelay: string;
      startTime: string;
    }>;


    /*区服邮件*/
    type operateServer = Common.CommonRecord<{
      mailRemark: string;
      mailId: string;
      mailTitle: string;
      mailExpire: string;
      mailContent: string;
      mailSendDate: string;
      mailServerJson: string;
      activeFrom: string;
      activeTo: string;
      goodsJson: string;
      createRoleAfter: string;
      createRoleBefore: string;
    }>;

    // 公会邮件
    type operateGuild = Common.CommonRecord<{
      mailRemark: string;
      mailId: string;
      mailTitle: string;
      mailExpire: string;
      mailContent: string;
      mailSendDate: string;
      serverId: string;
      goodsJson: string;
      mailGuildJson: string;
    }>;

    /*多人邮件*/
    type operateMulti = Common.CommonRecord<{
      mailRemark: string;
      mailId: string;
      mailTitle: string;
      mailExpire: string;
      mailContent: string;
      mailSendDate: string;
      mailRolesJson: string;
      goodsJson: string;
    }>

    /*模板管理*/
    type template = Common.CommonRecord<{
      templateName: string;
      gmParam: string;
    }>

    /*活动管理*/
    type activity = Common.CommonRecord<{
      name: string;
      templateId: string;
      servers: string;
      startTime: string;
      endTime: string;
      imageUrl: string;
    }>

    /* 区服活动 */
    type serverState = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' ;
    // 活动大类型
    type activityBigType = '0' | '1' | '2' | '3' | '4' | '5' | '6' ;

    // 活动小类型 - 排行榜
    type activitySmallTypeRank = '0' | '1';

    // 活动小类型 - 任务
    type activitySmallTypeTask = '0' | '1' | '2' | '3' | '4' | '5' | '6';

    // 活动小类型 - 地图
    type activitySmallTypeMap = '0' | '1' | '2';

    // 活动小类型 - 商城
    type activitySmallTypeShop = '0' | '1' | '2';

    // 活动小类型 - 收益
    type activitySmallTypeIncome = '0' | '1';

    // 活动小类型 - 商城类型活动
    type activitySmallTypeShopActivity = '0' | '1' | '2';

    type activitygm = Common.CommonRecord<{
      name: string;
      description: string;
      status: string;
    }>

    type activitygmparams = Common.CommonRecord<{
      activeGmId: string | null;
      paramName: string;
      paramIndex: number;
      status: string;
    }>

    type activityimages = Common.CommonRecord<{
      name: string;
      url: string;
      servers: string;
      endTime: number;
      startTime: number;
      sorter: number;
    }>

    type maintenanceNotice = Common.CommonRecord<{
      title: string;
      content: string;
      banner: string;
      linitTime: string;
      publishTime: string;
    }>

    /** 商品管理 */
    type productType = 'SDK' | 'WEB';
    type productStatus = 'true' | 'false'; // true:启用 false:禁用

    type product = Common.CommonRecord<{
      chanelName: string;
      gameId: string;
      productId: number;
      productIndex: number;
      channelProductId: string;
      gameProductId: string;
      productName: string;
      productPrice: number;
      nativePrice: number;
      dollarPrice: number;
      productNumber: number;
      productDescribe: string;
      productType: string | null;
      enable: string;
      otherSetting: string;
      platformChannelId: string;
    }>

    /** 元宝商城 */
    // 购买前置条件设置
    type saleType = 'NONE ' | 'SERVEROPEN ' | 'CHARACTER_LEVEL ' | 'ACHIEVEMENT ' | 'QUEST ' | 'RETURN_DAY_COUNT ' | 'UNIQUE_PET_GAIN ' | 'EPIC_PET_GAIN ' | 'LEGEND_PET_GAIN ' | 'UNIQUE_REFLECTION_GAIN ' | 'EPIC_REFLECTION_GAIN ' | 'LEGEND_REFLECTION_GAIN ' | 'HERO_REFLECTION_GAIN ' | 'EndEnum ';
    // 限购类型
    type limitType =
      | 'NONE'
      | 'DAILY_LIMIT'
      | 'WEEKLY_LIMIT'
      | 'MONTHLY_LIMIT'
      | 'ACCOUNT'
      | 'SERVER'
      | 'CHARACTER'
      | 'ACCOUNT_LIMIT'
      | 'ACCOUNT_DAILY_LIMIT'
      | 'ACCOUNT_WEEKLY_LIMIT'
      | 'ACCOUNT_MONTHLY_LIMIT'
      | 'SERVER_LIMIT'
      | 'SERVER_DAILY_LIMIT'
      | 'SERVER_WEEKLY_LIMIT'
      | 'SERVER_MONTHLY_LIMIT'
      | 'CHARACTER_LIMIT'
      | 'CHARACTER_DAILY_LIMIT'
      | 'CHARACTER_WEEKLY_LIMIT'
      | 'CHARACTER_MONTHLY_LIMIT'
      | 'CASHSHOP_EXCHANGE1_CHARACTER_LIMIT'
      | 'CASHSHOP_EXCHANGE2_SERVER_LIMIT'
      | 'CASHSHOP_EXCHANGE2_SERVER_DAILY_LIMIT'
      | 'CASHSHOP_EXCHANGE2_CHARACTER_LIMIT'
      | 'CASHSHOP_EXCHANGE2_CHARACTER_DAILY_LIMIT'
      | 'SCHEDULE_LIMIT'
      | 'EndEnum';
    // 商品状态显示与隐藏
    type HideInClient = 'true' | 'false';
    // 是否周显示
    type saleWeekType = 'true' | 'false';
    // 是否开启折扣
    type discountRate = '1' | '0';

    type gemsShop = Common.CommonRecord<{
      id: number;
      gameid: string;
      serverId: string;
      nameId: string;
      price: number;
      discountRate: string;
      saleType: string | null;
      discountPrice: number;
      limitType: string | null;
      limitCount: number;
      requireLevel: number;
      sellCategoryOrder: number;
      hideInClient: string | null;
      saleStartData: string | null;
      saleCloseData: string | null;
      saleWeekType: string;
      saleMonday: string;
      saleTuesday: string;
      saleWednesday: string;
      saleThursday: string;
      saleFriday: string;
      saleSaturday: string;
      saleSunday: string;
    }>

    /** 服务器文件 */
    // 定义根目录
    type RootDirectory = 'table' | 'script' | 'script/cabin' | 'script/common' | 'script/config_tables' | 'script/framework' | 'script/header' | 'script/hotfix' | 'script/proto' | 'script/rebot' | 'script/scheduler' | 'script/test_client' | 'script/test_server' | 'script/world';

    /** 订单管理 */
    type OrderStatus = '0' | '1' | '2' | '3' | '4' | '5'| '6';

    type callbackStatus = '0' | '1' | '2'  ;

    /* 问卷管理 */
    type questionnaire = Common.CommonRecord<{
      title: string;
      richContentMd: string;
      unlockType: string;
      unlockLevel: Number;
      wjxUrl: string;
      goodsJson: string;
      createdBy: string;
      status: string;
      mailId: string;
      mailTitle: string;
      mailContent: string;
    }>;

    // 解锁类型
    type unlockType = "1"
    // 问卷状态
    type questionnaireStatus = '0' | '1';



    // 礼包活动配置
    // 礼包类型
    type giftType = '1' | '2';
    // 渠道和区服类型
    type scopeType = '0' | '1';
    // 礼包活动状态 状态：1=启用；2=停用；3=归档
    type giftActivityStatus = '1' | '2' | '3';

    type giftActivity = Common.CommonRecord<{
      campaignCode: string;
      name: string;
      scopeChannel: string;
      scopeServer: string;
      perUserLimit: number;
      perDeviceLimit: number;
      perIpLimit: string;
      totalLimit: string;
      startTime: string;
      endTime: string;
      goodsJson: string;
      status: string;
      remark: string;
    }>;

    /* 礼包批次 */
    // 批次状态 0=初始化；1=生成中；2=完成；3=已取消
    type giftBatchStatus = '0' | '1' | '2' | '3' ;

    /* 规格模板 */
    // 规格适用场景类型
    type SpecSceneType = 'small' | 'medium' | 'large';

    // 规格类型
    type SpecType = 'NORMAL' | 'CROSS';

    // 规格模板状态类型（布尔值字符串形式）
    type SpecStatusType = 'true' | 'false';

    type giftBatch = Common.CommonRecord<{
      campaignId: string;
      codeType: string;
      codePrefix: string;
      codeLen: string | null;
      amount: number | null;
      maxRedeemCount: string | null;
      customUsePrefixOnly: string ;
    }>;

    // GS角色管理
    // 标签类型 1=GS2-内部号 2 客诉
    type gsRoleTagType = '1'| '2';
    // 状态 0=失效 1=生效 2=待审核
    type gsRoleTagStatus = '0' | '1' | '2';

    // GS额度发放任务执行状态 / 是否启用
    // 0: 否；1: 是
    type GrantTaskStatus = 0 | 1;

    type gsRoleTag = Omit<
      Common.CommonRecord<{
        /** 角色ID */
        roleId: number;
        /** 标签类型 */
        tagType: number;
        /** 使用者姓名 */
        userName: string;
        /** 手机号 */
        phoneNumber?: string;
        /** 额度 */
        quota?: number;
        /** 周期类型 */
        cycleType?: gsQuotaCycleType;
        /** 发送模式 */
        sendMode?: gsQuotaSendMode;
        /** 首次开始时间 (LocalDateTime: yyyy-MM-ddTHH:mm:ss) */
        startTime?: string;
        /** 额度发放任务状态 / 是否启用 */
        grantTaskStatus?: GrantTaskStatus;
        /** 额度任务金额 */
        amount?:number;
        /** 标记原因 */
        reason: string;
        /** 操作者 */
        operator: string;
      }>,
      "status"
    > & {
      /** 状态 */
      status: number;
    };


    // GS额度发放任务类型
    // GS额度发放任务周期类型
    type gsQuotaCycleType = 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
    // GS额度发放任务发送模式
    type gsQuotaSendMode = 'immediate' | 'scheduled';
    // GS额度发放任务状态 (1-进行中, 0-已停止/已完成)
    type gsQuotaTaskStatus = 0 | 1;

    // GS额度发放任务记录
    type gsQuotaTask = Common.CommonRecord<{
      /** 角色ID */
      roleId: string;
      /** 发放金额/额度 */
      amount: number;
      /** 周期类型 */
      cycleType: gsQuotaCycleType;
      /** 首次开始时间 */
      startTime: string;
      /** 下次执行时间 */
      nextExecTime: string | null;
      /** 任务状态 */
      status: gsQuotaTaskStatus;
      /** 任务备注 */
      remark: string;
      /** 操作者 */
      operator: string;
      /** 创建时间 */
      createdAt: string;
      /** 更新时间 */
      updatedAt: string;
    }>;



    type MenuButton = {
      /**
       * button code
       *
       * it can be used to control the button permission
       */
      code: string;
      /** button description */
      desc: string;
    };

    // 菜单
    type IconType = '1' | '2';
    type MenuType = 'M' | 'C' | "F";
    type visibleStatus = '0' | '1';

    type Menu = Common.CommonRecord<{
      menuName: string;
      routeName: string;
      path: string;
      routePath: string;
      component: string;
      order: number;
      i18nKey: string | null;
      icon: string;
      status: string;
      visible: string;
      parentId: number;
      keepAlive: boolean;
      constant: boolean;
      href: string | null;
      activeMenu: string | null;
      multiTab: boolean;
      fixedIndexInTab: number | null;
      perms: string;
    }>

    type MenuTree = {
      id: number;
      label: string;
      pId: number;
      children?: MenuTree[];
      menuId: number;
      menuType: string; // M: 目录, C: 菜单, F: 按钮
    };

    /** 服务管理相关类型 */
    type ServiceStatus = 0 | 1; // 0: 停用, 1: 启用

    // 服务状态类型（字符串形式，用于国际化）
    type ServiceStatusType = '0' | '1';

    type ServiceType = 'center' | 'gate' | 'world' | 'login' | 'db' | 'mysql' | 'redis' | 'mongodb' | 'elasticsearch' | 'rabbitmq' | 'kafka' | 'nginx';

    type Service = Common.CommonRecord<{
      typeCode: string;
      typeName: string;
      description: string;
      isEnabled: ServiceStatus;
      sortOrder: number;
      createdBy: string;
      createdTime: string;
      updatedBy: string;
      updatedTime: string;
      // 动态参数字段
      [key: string]: any;
    }>;

    /** 服务搜索参数 */
    type ServiceSearchParams = CommonType.RecordNullable<
      Pick<Api.SystemManage.Service, 'typeCode' | 'typeName' | 'isEnabled'> & CommonSearchParams
    >;

      /** 服务列表 */
      type ServiceList = Common.PaginatingQueryRecord<Service>;

      /** ==================== 规格模板管理相关类型 ==================== */

      /** 规格模板状态 */
      type SpecStatus = 0 | 1; // 0: 停用, 1: 启用

      /** 规格模板 */
      type Spec = Common.CommonRecord<{
        specName: string;
        specCode: string;
        specType?: string; // 规格类型: NORMAL-普通服, CROSS-跨服
        description: string;
        applicableScene: string;
        isDefault: SpecStatus;
        isEnabled: boolean;
        sortOrder: number;
        maxUser?: number | null;  // 最大人数
        busyUser?: number | null; // 忙碌人数
        fullUser?: number | null; // 满员人数
        serviceCount?: number;
        createdBy: string;
        createdTime: string;
        updatedBy: string;
        updatedTime: string;
      }>;

      /** 规格模板搜索参数 */
      type SpecSearchParams = CommonType.RecordNullable<
        Pick<Api.SystemManage.Spec, 'specName' | 'specCode' | 'applicableScene' | 'isEnabled' | 'specType'> & CommonSearchParams
      >;

      /** 规格模板列表 */
      type SpecList = Common.PaginatingQueryRecord<Spec>;
  }
}
