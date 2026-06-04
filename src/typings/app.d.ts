/** The global namespace for the app */
declare namespace App {
  /** Theme namespace */
  namespace Theme {
    type ColorPaletteNumber = import('@sa/color').ColorPaletteNumber;

    /** Theme setting */
    interface ThemeSetting {
      /** Theme scheme */
      themeScheme: UnionKey.ThemeScheme;
      /** grayscale mode */
      grayscale: boolean;
      /** colour weakness mode */
      colourWeakness: boolean;
      /** Whether to recommend color */
      recommendColor: boolean;
      /** Theme color */
      themeColor: string;
      /** Other color */
      otherColor: OtherColor;
      /** Whether info color is followed by the primary color */
      isInfoFollowPrimary: boolean;
      /** Reset cache strategy */
      resetCacheStrategy: UnionKey.ResetCacheStrategy;
      /** Layout */
      layout: {
        /** Layout mode */
        mode: UnionKey.ThemeLayoutMode;
        /** Scroll mode */
        scrollMode: UnionKey.ThemeScrollMode;
        /**
         * Whether to reverse the horizontal mix
         *
         * if true, the vertical child level menus in left and horizontal first level menus in top
         */
        reverseHorizontalMix: boolean;
      };
      /** Page */
      page: {
        /** Whether to show the page transition */
        animate: boolean;
        /** Page animate mode */
        animateMode: UnionKey.ThemePageAnimateMode;
      };
      /** Header */
      header: {
        /** Header height */
        height: number;
        /** Header breadcrumb */
        breadcrumb: {
          /** Whether to show the breadcrumb */
          visible: boolean;
          /** Whether to show the breadcrumb icon */
          showIcon: boolean;
        };
        /** Multilingual */
        multilingual: {
          /** Whether to show the multilingual */
          visible: boolean;
        };
      };
      /** Tab */
      tab: {
        /** Whether to show the tab */
        visible: boolean;
        /**
         * Whether to cache the tab
         *
         * If cache, the tabs will get from the local storage when the page is refreshed
         */
        cache: boolean;
        /** Tab height */
        height: number;
        /** Tab mode */
        mode: UnionKey.ThemeTabMode;
      };
      /** Fixed header and tab */
      fixedHeaderAndTab: boolean;
      /** Sider */
      sider: {
        /** Inverted sider */
        inverted: boolean;
        /** Sider width */
        width: number;
        /** Collapsed sider width */
        collapsedWidth: number;
        /** Sider width when the layout is 'vertical-mix' or 'horizontal-mix' */
        mixWidth: number;
        /** Collapsed sider width when the layout is 'vertical-mix' or 'horizontal-mix' */
        mixCollapsedWidth: number;
        /** Child menu width when the layout is 'vertical-mix' or 'horizontal-mix' */
        mixChildMenuWidth: number;
      };
      /** Footer */
      footer: {
        /** Whether to show the footer */
        visible: boolean;
        /** Whether fixed the footer */
        fixed: boolean;
        /** Footer height */
        height: number;
        /** Whether float the footer to the right when the layout is 'horizontal-mix' */
        right: boolean;
      };
      /** Watermark */
      watermark: {
        /** Whether to show the watermark */
        visible: boolean;
        /** Watermark text */
        text: string;
      };
      /** define some theme settings tokens, will transform to css variables */
      tokens: {
        light: ThemeSettingToken;
        dark?: {
          [K in keyof ThemeSettingToken]?: Partial<ThemeSettingToken[K]>;
        };
      };
    }

    interface OtherColor {
      info: string;
      success: string;
      warning: string;
      error: string;
    }

    interface ThemeColor extends OtherColor {
      primary: string;
    }

    type ThemeColorKey = keyof ThemeColor;

    type ThemePaletteColor = {
      [key in ThemeColorKey | `${ThemeColorKey}-${ColorPaletteNumber}`]: string;
    };

    type BaseToken = Record<string, Record<string, string>>;

    interface ThemeSettingTokenColor {
      /** the progress bar color, if not set, will use the primary color */
      nprogress?: string;
      container: string;
      layout: string;
      inverted: string;
      'base-text': string;
    }

    interface ThemeSettingTokenBoxShadow {
      header: string;
      sider: string;
      tab: string;
    }

    interface ThemeSettingToken {
      colors: ThemeSettingTokenColor;
      boxShadow: ThemeSettingTokenBoxShadow;
    }

    type ThemeTokenColor = ThemePaletteColor & ThemeSettingTokenColor;

    /** Theme token CSS variables */
    type ThemeTokenCSSVars = {
      colors: ThemeTokenColor & { [key: string]: string };
      boxShadow: ThemeSettingTokenBoxShadow & { [key: string]: string };
    };
  }

  /** Global namespace */
  namespace Global {
    type VNode = import('vue').VNode;
    type RouteLocationNormalizedLoaded = import('vue-router').RouteLocationNormalizedLoaded;
    type RouteKey = import('@elegant-router/types').RouteKey;
    type RouteMap = import('@elegant-router/types').RouteMap;
    type RoutePath = import('@elegant-router/types').RoutePath;
    type LastLevelRouteKey = import('@elegant-router/types').LastLevelRouteKey;

    /** The global header props */
    interface HeaderProps {
      /** Whether to show the logo */
      showLogo?: boolean;
      /** Whether to show the menu toggler */
      showMenuToggler?: boolean;
      /** Whether to show the menu */
      showMenu?: boolean;
    }

    /** The global menu */
    type Menu = {
      /**
       * The menu key
       *
       * Equal to the route key
       */
      key: string;
      /** The menu label */
      label: string;
      /** The menu i18n key */
      i18nKey?: I18n.I18nKey | null;
      /** The route key */
      routeKey: RouteKey;
      /** The route path */
      routePath: RoutePath;
      /** The menu icon */
      icon?: () => VNode;
      /** The menu children */
      children?: Menu[];
    };

    type Breadcrumb = Omit<Menu, 'children'> & {
      options?: Breadcrumb[];
    };

    /** Tab route */
    type TabRoute = Pick<RouteLocationNormalizedLoaded, 'name' | 'path' | 'meta'> &
      Partial<Pick<RouteLocationNormalizedLoaded, 'fullPath' | 'query' | 'matched'>>;

    /** The global tab */
    type Tab = {
      /** The tab id */
      id: string;
      /** The tab label */
      label: string;
      /**
       * The new tab label
       *
       * If set, the tab label will be replaced by this value
       */
      newLabel?: string;
      /**
       * The old tab label
       *
       * when reset the tab label, the tab label will be replaced by this value
       */
      oldLabel?: string;
      /** The tab route key */
      routeKey: LastLevelRouteKey;
      /** The tab route path */
      routePath: RouteMap[LastLevelRouteKey];
      /** The tab route full path */
      fullPath: string;
      /** The tab fixed index */
      fixedIndex?: number | null;
      /**
       * Tab icon
       *
       * Iconify icon
       */
      icon?: string;
      /**
       * Tab local icon
       *
       * Local icon
       */
      localIcon?: string;
      /** I18n key */
      i18nKey?: I18n.I18nKey | null;
    };

    /** Form rule */
    type FormRule = import('naive-ui').FormItemRule;

    /** The global dropdown key */
    type DropdownKey = 'closeCurrent' | 'closeOther' | 'closeLeft' | 'closeRight' | 'closeAll';
  }

  /**
   * I18n namespace
   *
   * Locales type
   */
  namespace I18n {
    type RouteKey = import('@elegant-router/types').RouteKey;

    type LangType = 'en-US' | 'zh-CN' | 'ko-KR';

    type LangOption = {
      label: string;
      key: LangType;
    };

    type I18nRouteKey = Exclude<RouteKey, 'root' | 'not-found'>;

    type FormMsg = {
      required: string;
      invalid: string;
    };

    type Schema = {
      system: {
        title: string;
        updateTitle: string;
        updateContent: string;
        updateConfirm: string;
        updateCancel: string;
      };
      common: {
        action: string;
        add: string;
        addSuccess: string;
        backToHome: string;
        batchDelete: string;
        cancel: string;
        close: string;
        check: string;
        expandColumn: string;
        columnSetting: string;
        config: string;
        confirm: string;
        delete: string;
        deleteSuccess: string;
        confirmDelete: string;
        edit: string;
        warning: string;
        error: string;
        index: string;
        keywordSearch: string;
        logout: string;
        logoutConfirm: string;
        lookForward: string;
        modify: string;
        modifySuccess: string;
        noData: string;
        operate: string;
        operateSuccess: string;
        queueSuccess: string;
        pleaseCheckValue: string;
        refresh: string;
        reset: string;
        search: string;
        switch: string;
        tip: string;
        trigger: string;
        update: string;
        updateSuccess: string;
        userCenter: string;
        requestFailed: string;
        ControlPanel: string;
        ban: string;
        unban: string;
        banSuccess: string;
        unbanSuccess: string;
        banFailed: string;
        unbanFailed: string;
        chat: string;
        unchat: string;
        muteSuccess: string;
        unmuteSuccess: string;
        muteFailed: string;
        unmuteFailed: string;
        unmuteUser: string;
        confirmUnban: string;
        kick: string;
        confirmKickMany: string;
        kickAll: string;
        kickSuccess: string;
        kickFailed: string;
        kickPartialSuccess: string;
        kickAllFailed: string;
        kickPartialFailed: string;
        kickAllSuccess: string;
        confirmKickAll: string;
        view: string;
        send: string;
        confirmSend: string;
        sendSuccess: string;
        sendFailed: string;
        stop: string;
        confirmStop: string;
        stopSuccess: string;
        stopFailed: string;
        all: string;
        banTimeInvalid: string;
        maintenance: string;
        queue: string;
        banAndMuteUser: string;
        sync: string;
        syncSuccess: string;
        syncFailed: string;
        exporting: string;
        maintenanceSuccess: string;
        maintenanceFailed: string;
        confirmMaintenance: string;
        cancelMail: string;
        confirmCancel: string;
        cancelSuccess: string;
        cancelFailed: string;
        selectMailFirst: string;
        confirmDeleteMail: string;
        audit: string;
        auditSuccess: string;
        auditFailed: string;
        auditPass: string;
        auditReject: string;
        enable: string;
        disable: string;
        enableSuccess: string;
        disableSuccess: string;
        enableFailed: string;
        disableFailed: string;
        preview: string;
        realTime: string;
        history: string;
        securityTips: string;
        updateFailed: string;
        uploadSuccess: string;
        uploadFailed: string;
        invalidImageUrl: string;
        import: string;
        export: string;
        total: string;
        day: string;
        week: string;
        month: string;
        confirmExport: string;
        download: string;
        downloadingFile: string;
        fileDataEmpty: string;
        fileDownloadSuccess: string;
        hash: string;
        upload: string;
        fileSizeExceeded: string;
        selectedFile: string;
        pleaseSelectFile: string;
        pleaseSelectServer: string;
        pleaseSelectFileToUpload: string;
        fileSize: string;
        selectFile: string;
        selectFiles: string;
        selectedFiles: string;
        pleaseSelectFilesToUpload: string;
        clearAll: string;
        remove: string;
        targetServer: string;
        uploadPath: string;
        hashInfo: string;
        fileName: string;
        hashAlgo: string;
        hashValue: string;
        hashDataEmpty: string;
        hashCopiedToClipboard: string;
        copyFailed: string;
        copySuccess: string;
        batchRecharge: string;
        batchCancel: string;
        confirmBatchCancel: string;
        copy: string;
        startServer: string;
        confirmStartServer: string;
        startServerAllSuccess: string;
        startServerAllFailed: string;
        yesOrNo: {
          yes: string;
          no: string;
        };
      };
      request: {
        logout: string;
        logoutMsg: string;
        logoutWithModal: string;
        logoutWithModalMsg: string;
        refreshToken: string;
        tokenExpired: string;
        accountKickedOut: string;
        accountKickedOutMsg: string;
        loginExpiredTitle: string;
        loginExpiredMsg: string;
      };
      theme: {
        themeSchema: { title: string } & Record<UnionKey.ThemeScheme, string>;
        grayscale: string;
        colourWeakness: string;
        layoutMode: { title: string; reverseHorizontalMix: string } & Record<UnionKey.ThemeLayoutMode, string>;
        recommendColor: string;
        recommendColorDesc: string;
        themeColor: {
          title: string;
          followPrimary: string;
        } & Theme.ThemeColor;
        scrollMode: { title: string } & Record<UnionKey.ThemeScrollMode, string>;
        page: {
          animate: string;
          mode: { title: string } & Record<UnionKey.ThemePageAnimateMode, string>;
        };
        fixedHeaderAndTab: string;
        header: {
          height: string;
          breadcrumb: {
            visible: string;
            showIcon: string;
          };
          multilingual: {
            visible: string;
          };
        };
        tab: {
          visible: string;
          cache: string;
          height: string;
          mode: { title: string } & Record<UnionKey.ThemeTabMode, string>;
        };
        sider: {
          inverted: string;
          width: string;
          collapsedWidth: string;
          mixWidth: string;
          mixCollapsedWidth: string;
          mixChildMenuWidth: string;
        };
        footer: {
          visible: string;
          fixed: string;
          height: string;
          right: string;
        };
        watermark: {
          visible: string;
          text: string;
        };
        themeDrawerTitle: string;
        pageFunTitle: string;
        resetCacheStrategy: { title: string } & Record<UnionKey.ResetCacheStrategy, string>;
        configOperation: {
          copyConfig: string;
          copySuccessMsg: string;
          resetConfig: string;
          resetSuccessMsg: string;
        };
      };
      route: Record<I18nRouteKey, string>;
      page: {
        login: {
          common: {
            loginOrRegister: string;
            userNamePlaceholder: string;
            phonePlaceholder: string;
            codePlaceholder: string;
            passwordPlaceholder: string;
            confirmPasswordPlaceholder: string;
            codeLogin: string;
            confirm: string;
            back: string;
            validateSuccess: string;
            loginSuccess: string;
            welcomeBack: string;
          };
          pwdLogin: {
            title: string;
            rememberMe: string;
            forgetPassword: string;
            register: string;
            otherAccountLogin: string;
            otherLoginMode: string;
            superAdmin: string;
            admin: string;
            user: string;
          };
          codeLogin: {
            title: string;
            getCode: string;
            reGetCode: string;
            sendCodeSuccess: string;
            imageCodePlaceholder: string;
          };
          register: {
            title: string;
            agreement: string;
            protocol: string;
            policy: string;
          };
          resetPwd: {
            title: string;
          };
          bindWeChat: {
            title: string;
          };
        };
        about: {
          title: string;
          introduction: string;
          projectInfo: {
            title: string;
            version: string;
            latestBuildTime: string;
            githubLink: string;
            previewLink: string;
          };
          prdDep: string;
          devDep: string;
        };
        home: {
          branchDesc: string;
          greeting: string;
          weatherDesc: string;
          projectCount: string;
          todo: string;
          message: string;
          downloadCounts: string;
          downloadCount: string;
          registerCount: string;
          schedule: string;
          study: string;
          work: string;
          rest: string;
          entertainment: string;
          visitCount: string;
          turnover: string;
          todayPay: string;
          dealCount: string;
          serverOnline: string;
          channelOnline: string;
          levelOnline: string;
          level: string;
          projectNews: {
            title: string;
            moreNews: string;
            desc1: string;
            desc2: string;
            desc3: string;
            desc4: string;
            desc5: string;
          };
          creativity: string;
        };

        manage: {
          common: {
            status: {
              enable: string;
              disable: string;
            };
            enable: {
              normal: string;
              disable: string;
            }
          };
          role: {
            title: string;
            roleName: string;
            roleCode: string;
            roleStatus: string;
            roleDesc: string;
            form: {
              roleName: string;
              roleCode: string;
              roleStatus: string;
              roleDesc: string;
            };
            addRole: string;
            editRole: string;
            menuAuth: string;
            buttonAuth: string;
          };
          user: {
            title: string;
            userName: string;
            userGender: string;
            nickName: string;
            userPhone: string;
            userEmail: string;
            passWord: string;
            userStatus: string;
            userRole: string;
            form: {
              userName: string;
              userGender: string;
              nickName: string;
              userPhone: string;
              userEmail: string;
              userStatus: string;
              userRole: string;
            };
            addUser: string;
            editUser: string;
            gender: {
              male: string;
              female: string;
            };
          };
          menu: {
            home: string;
            title: string;
            id: string;
            parentId: string;
            menuType: string;
            menuName: string;
            routeName: string;
            routePath: string;
            pathParam: string;
            layout: string;
            page: string;
            i18nKey: string;
            icon: string;
            localIcon: string;
            iconTypeTitle: string;
            order: string;
            constant: string;
            keepAlive: string;
            href: string;
            hideInMenu: string;
            activeMenu: string;
            multiTab: string;
            fixedIndexInTab: string;
            query: string;
            button: string;
            buttonCode: string;
            buttonDesc: string;
            menuStatus: string;
            form: {
              home: string;
              menuType: string;
              menuName: string;
              routeName: string;
              routePath: string;
              pathParam: string;
              layout: string;
              page: string;
              i18nKey: string;
              icon: string;
              localIcon: string;
              order: string;
              keepAlive: string;
              href: string;
              hideInMenu: string;
              activeMenu: string;
              multiTab: string;
              fixedInTab: string;
              fixedIndexInTab: string;
              queryKey: string;
              queryValue: string;
              button: string;
              buttonCode: string;
              buttonDesc: string;
              menuStatus: string;
            };
            addMenu: string;
            editMenu: string;
            addChildMenu: string;
            type: {
              directory: string;
              menu: string;
              button: string;
            };
            iconType: {
              iconify: string;
              local: string;
            };
          };
          logininfor: {
            title: string;
            infoId: string;
            userName: string;
            ipaddr: string;
            loginLocation: string;
            status: string;
            msg: string;
            accessTime: string;
            statusTypes: {
              success: string;
              error: string;
            }
          },
          operlog: {
            operId: string;
            title: string;
            method: string;
            requestMethod: string;
            operatorType: string;
            operName: string;
            deptName: string;
            operUrl: string;
            operIp: string;
            jsonResult: string;
            status: string;
            operParam: string;
            operatorTypes: {
              other: string;
              add: string;
              edit: string;
              delete: string;
            },
            statusTypes: {
              normal: string;
              error: string;
            }
          },
          gmlog: {
            title: string;
            gmCode: string;
            gmName: string;
            operate: string;
            timeRange: string;
            startTime: string;
            endTime: string;
            serverId: string;
            paramJson: string;
            gmUrl: string;
            roleId: string;
            userId: string;
            msg: string;
            createDate: string;
            status: string;
            form: {
              gmCode: string;
              operate: string;
            }
          },
          game: {
            title: string;
            gameId: string;
            gameName: string;
            userMerge: string;
            gameKey: string;
            gameAlias: string;
            biAlias: string;
            createDate: string;
            callbackUrl: string;
            gmUrl: string;
            channel: string;
            updateDate: string;
            enable: string;
            form: {
              gameId: string;
              gameName: string;
              gameAlias: string;
              callbackUrl: string;
              gmUrl: string;
              enable: string;
            },
            type: {
              disable: string;
              normal: string;
            },
            usermerge: {
              dataisolation: string;
              dataaccess: string;
            },
            addGame: string;
            editGame: string;
          },
          channel: {
            title: string;
            channelId: string;
            channelName: string;
            channelBriefName: string;
            channelUserTotal: string;
            platform: string;
            createDate: string;
            updateDate: string;
            enable: string;
            addchannel: string;
            editChannel: string;
            form: {
              channelId: string;
              channelName: string;
              channelBriefName: string;
              channelUserTotal: string;
              platform: string;
              enable: string;
            },
            Callback: {
              server: string;
              client: string;
            },
            platformgame: {
              ios: string;
              android: string;
            },
            status: {
              disable: string;
              normal: string;
            },
          },
          serverregion: {
            id: string;
            title: string;
            regionName: string;
            regionIndex: string;
            commonHost: string;
            channelMedia: string;
            groupList: string;
            whiteList: string;
            updateDate: string;
            maintenance: string;
            clientVersionMax: string;
            clientVersionMin: string;
            commonPort: string;
            resUrl: string;
            maintenanceMsg: string;
            addserver: string;
            editserver: string;
            form: {
              regionName: string;
              regionIndex: string;
              clientVersionMax: string;
              clientVersionMin: string;
              resUrl: string;
              commonHost: string;
              commonPort: string;
              channelMedia: string;
              maintenanceMsg: string;
            },
            status: {
              normal: string;
              disable: string;
            }
          },
          servergroup: {
            title: string;
            addservergroup: string;
            editservergroup: string;
            gameId: string;
            groupIndex: string;
            groupName: string;
            groupTag: string;
            groupTest: string;
            createDate: string;
            updateDate: string;
            form: {
              groupName: string;
              groupTag: string;
              groupIndex: string;
            },
            status: {
              Normalgrouping: string;
              Testgrouping: string;
            }
          }
          serverwhite: {
            title: string;
            id: string;
            type: string;
            param: string;
            channel: string;
            operateUser: string;
            operateTime: string;
            addwhite: string;
            editwhite: string;
            form: {
              type: string;
              param: string;
              channel: string;
            },
            whitetypeIp: {
              userWhite: string;
              ipWhitelist: string;
            },
          },
          serveritem: {
            id: string;
            title: string;
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
            serverRecommendNew: string;
            noCreateRole: string;
            hidden: string;
            addserveritem: string;
            editserveritem: string;
            selectgroup: string;
            serverTags: string;
            new: string;
            recommend: string;
            hot: string;
            busyUser: string;
            fullUser: string;
            maxUser: string;
            onlineUser: string;
            runState: string;
            syncSuccess: string;
            syncFailed: string;
            syncFailedTip: string;
            syncFailedTip2: string;
            serverTypecategory: string;
            serverVisibles: {
              invisible: string;
              whitelist: string;
              visible: string;
            },
            serverStatusitem: {
              normal: string;
              crowd: string;
              full: string;
              maintain: string;
              close: string;
              prepare: string;
              invisible: string;
            },
            serverRecommenditem: {
              recommend: string;
              unrecommend: string;
            },
            serverNewitem: {
              oldserver: string;
              newserver: string;
            },
            serverRunStateitem: {
              normal: string;
              warning: string;
              offline: string;
              maintenance: string;
            },
            serverTypeCategory: {
              normal: string;
              cross: string;
              merge: string;
            },
            form: {
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
              selectgroup: string;
              busyUser: string;
              fullUser: string;
              maxUser: string;
              serverTypecategory: string;
            }
          },
          servercross: {
            title: string;
            addservercross: string;
            editservercross: string;
            assign: string;
            assignSuccess: string;
            assignFailed: string;
            loadAssignedServers: string;
            cross: string;
            normal: string;
            assignTarget: string;
            crossServer: string;
            assignServers: string;
            form: {
              crossServer: string;
              normalServer: string;
            }
          },
          log: {
            title: string;
            gameId: string;
            logName: string;
            logIp: string;
            logPort: string;
            saveEnable: string;
            groupList: string;
            enable: string;
            updateDate: string;
            addserverlog: string;
            editserverlog: string;
            form: {
              logName: string;
              logIp: string;
              logPort: string;
              saveEnable: string;
            },
            status: {
              Shutdown: string;
              normal: string;
            },
            serverenablelog: {
              Nosave: string;
              instantlysave: string;
            }
          },
          serverFile: {
            title: string;
            Contents: string;
            name: string;
            size: string;
            lastModified: string;
            rootDirectory: {
              table: string;
              script: string;
              script_cabin: string;
              script_common: string;
              script_config_tables: string;
              script_framework: string;
              script_header: string;
              script_hotfix: string;
              script_proto: string;
              script_rebot: string;
              script_scheduler: string;
              script_test_client: string;
              script_test_server: string;
              script_world: string;
            };
            form: {
              selectserver: string;
              Contents: string;
            };
          },
          gmuser: {
            userId: string;
            mediaId: string;
            channelId: string;
            ip: string;
            deviceId: string;
            regDate: string;
            banTime: string;
            banReason: string;
            chatChannels: string;
            form: {
              userId: string;
              mediaId: string;
              channelId: string;
              deviceId: string;
              regDate: string;
              banTime: string;
              banReason: string;
            }
          },
          gmrole: {
            userId: string;
            openId: string;
            roleId: string;
            roleName: string;
            roleType: string;
            roleLevel: string;
            vipLevel: string;
            partyId: string;
            partyName: string;
            balance: string;
            ip: string;
            serverId: string;
            form: {
              roleId: string;
              roleName: string;
              serverId: string;
            }
          },
          norice: {
            title: string;
            selectregion: string;
            noticeIndex: string;
            noticeName: string;
            noticeType: string;
            noticeExplain: string;
            enable: string;
            createDate: string;
            updateDate: string;
            noticeContent: string;
            noriceadd: string;
            noriceedit: string;
            content: string;
            NoticeType: {
              announcement: string;
              activity: string;
              festival: string;
            },
            NoticeLabel: {
              not: string;
              hot: string;
              new: string;
            },
            NoticeStatus: {
              normal: string;
              disable: string;
            },
            form: {
              noticeIndex: string;
              createDate: string;
              updateDate: string;
              noticeName: string;
              noticeType: string;
              noticeContent: string;
              status: string;
            }
          },
          maintenance: {
            id: string;
            title: string;
            content: string;
            banner: string;
            linitTime: string;
            publishTime: string;
            addMaintenance: string;
            editMaintenance: string;
            form: {
              title: string;
              content: string;
              banner: string;
              linitTime: string;
              publishTime: string;
            }
          },
          notifications: {
            title: string;
            marqueeName: string;
            marqueeContent: string;
            serverIds: string;
            roundTimes: string;
            roundDelay: string;
            startTime: string;
            addMarquee: string;
            editMarquee: string;
            form: {
              marqueeName: string;
              marqueeContent: string;
              serverIds: string;
              roundTimes: string;
              roundDelay: string;
              startTime: string;
              mailServerJson: string;
            }
          },
          activityimages: {
            announceTitle: string;
            graphicGuideTitle: string,
            addActivityimages: string;
            editActivityimages: string;
            addAnnouncementImages: string;
            editAnnouncementImages: string;
            addGraphicGuideImages: string;
            editGraphicGuideImages: string;
            ID: string;
            name: string;
            url: string;
            serverNames: string;
            action: string;
            endTime: string;
            startTime: string;
            form: {
              name: string;
              url: string;
              action: string;
            }
          },
          operateserver: {
            title: string;
            titleserver: string;
            addservermail: string;
            editservermail: string;
            mailRemark: string;
            mailStatus: string;
            mailTitle: string;
            mailExpire: string;
            mailContent: string;
            goodsJson: string;
            createDate: string;
            mailSendDate: string;
            updateDate: string;
            mailId: string;
            mailServerJson: string;
            serverId: string;
            serverName: string;
            Sending: string;
            msg: string;
            activeFrom: string;
            activeTo: string;
            form: {
              mailRemark: string;
              mailTitle: string;
              mailContent: string;
              mailServerJson: string;
              mailSendDate: string;
              mailId: string;
              goodsJson: string;
              activeFrom: string;
              activeTo: string;
            }
          },
          template: {
            title: string;
            id: string;
            templateName: string;
            createTime: string;
            addtemplate: string;
            edittemplate: string;
            templateType: string;
            form: {
              templateName: string;
              templateType: string;
              templateContent: string;
            }
          },
          activity: {
            title: string;
            ID: string;
            activityName: string;
            templateId: string;
            servers: string;
            startTime: string;
            endTime: string;
            status: string;
            addActivity: string;
            editActivity: string;
            imageUrl: string;
            preview: string;
            audit: string;
            auditPass: string;
            auditReject: string;
            enable: string;
            disable: string;
            expired: string;
            auditModal: string;
            templateInfo: string;
            templateName: string;
            gmParam: string;
            activityInfo: string;
            flag: string;
            createTime: string;
            updateTime: string;
            form: {
              activityName: string;
              templateId: string;
              servers: string;
              startTime: string;
              endTime: string;
              imageUrl: string;
            }
          },
          serveractivity: {
            title: string;
            activityConfigId: string;
            activityId: string;
            activityGuid: string;
            activityName: string;
            activityType: string;
            createTime: string;
            beginShowTime: string;
            openTime: string;
            closeTime: string;
            removeTime: string;
            state: string;
            isActive: string;
            activityStateGreaterThan5: string;
            activityOpen: string;
            activityClose: string;
            serverState: {
              null: string;
              preshow: string;
              showing: string;
              endshow: string;
              preopen: string;
              openning: string;
              endopen: string;
              closed: string;
              remove: string;
            },
            form: {
              activityGuid: string;
              state: string;
            },
            activitytype: {
              bigtype: {
                null: string;
                system: string;
                rank: string;
                task: string;
                map: string;
                shop: string;
                income: string;
              },
              smalltype_rank: {
                null: string;
                zhanli: string;
              },
              smalltype_task: {
                null: string;
                xinshouqiri: string;
                dengjijiangli: string;
                renwudacheng: string;
                shouchonghuodong: string;
                leichonghuodong: string;
                tongxinzhen: string;
              },
              smalltype_map: {
                null: string;
                flush_monster: string;
                flush_npc: string;
              },
              smalltype_shop: {
                null: string;
                monster: string;
                npc: string;
              },
              smalltype_income: {
                null: string;
                shouyizengjia: string;
              },
              smalltype_system: {
                null: string;
                shangcheng: string;
                meirixiangou: string;
              },
              unknown: string;
            }
          },
          overviewrole: {
            title: string;
            targetDay: string;
            serverID: string;
            channelID: string;
            roleAdd: string;
            addPayedRole: string;
            addTotal: string;
            NewPayingRate: string;
            NewARPU: string;
            LoginRoles: string;
            LoginPayingRoles: string;
            TotalPayingIncome: string;
            LoginPayingRate: string;
            LoginARPU: string;
            AverageOnlineTime: string;
            AverageGameSessions: string;
            AverageOnlineUsers: string;
            tooltips: {
              targetDay: string;
              NewUsers: string;
              roleAdd: string;
              addPayedRole: string;
              addTotal: string;
              NewPayingRate: string;
              NewARPU: string;
              LoginRoles: string;
              LoginPayingRoles: string;
              TotalPayingIncome: string;
              LoginPayingRate: string;
              LoginARPU: string;
              AverageGameSessions: string;
            }
          },
          overviewuser: {
            title: string;
            targetDay: string;
            channelID: string;
            ActivatedDevices: string;
            NewDevices: string;
            NewUsers: string;
            NewPayingUsers: string;
            NewPayingIncome: string;
            NewARPU: string;
            NewPayingRate: string;
            NewPayingARPU: string;
            BootedDevices: string;
            LoggedInDevices: string;
            LoggedInUsers: string;
            LoggedInPayingUsers: string;
            TotalPayingIncome: string;
            LoggedInPayingARPU: string;
            LoggedInPayingRate: string;
            LoggedInARPU: string;
            PayingSuccessRate: string;
            AverageLaunchTimes: string;
            tooltips: {
              NewUsers: string;
              NewPayingUsers: string;
              NewPayingIncome: string;
              NewARPU: string;
              NewPayingRate: string;
              NewPayingARPU: string;
              LoggedInDevices: string;
              LoggedInUsers: string;
              LoggedInPayingUsers: string;
              TotalPayingIncome: string;
              LoggedInPayingARPU: string;
              LoggedInPayingRate: string;
              LoggedInARPU: string;
              PayingSuccessRate: string;
            }
          },
          retention: {
            title: string;
            targetDay: string;
            serverID: string;
            channelID: string;
            selectchannel: string;
            selectserver: string;
            retentionGroupType: string;
            sum: string;
            channel: string;
            server: string;
            combo: string;
            date: string;
            retentionType: string;
            percentage: string;
            value: string;
            selectTime: string;
            dateRange: string;
            today: string;
            yesterday: string;
            last7days: string;
            last14days: string;
            last30days: string;
            thisMonth: string;
            lastMonth: string;
            thisYear: string;
            lastYear: string;
            New: string;
            Retention1: string;
            Retention3: string;
            Retention4: string;
            Retention5: string;
            Retention6: string;
            Retention7: string;
            Retention8: string;
            Retention9: string;
            Retention10: string;
            Retention11: string;
            Retention12: string;
            Retention13: string;
            Retention14: string;
            Retention15: string;
            Retention16: string;
            Retention17: string;
            Retention18: string;
            Retention19: string;
            Retention20: string;
            Retention21: string;
            Retention22: string;
            Retention23: string;
            Retention24: string;
            Retention25: string;
            Retention26: string;
            Retention27: string;
            Retention28: string;
            Retention29: string;
            Retention30: string;
            Retention45: string;
            Retention60: string;
            Retention90: string;
            form: {
              selectchannel: string;
              selectserver: string;
              selectIgnoreTypes: string;
              retentionGroupType: string;
              retentionType: string;
              dateRange: string;
              datePreset: string;
            }
          },
          activitylog: {
            title: string;
            ID: string;
            activityId: string;
            activityName: string;
            applyIp: string;
            applyUser: string;
            auditIp: string;
            auditUser: string;
            auditTime: string;
            endTime: string;
            operate: string;
          },
          activitygm: {
            title: string;
            addActivity: string;
            editActivity: string;
            ID: string;
            name: string;
            description: string;
            createTime: string;
            updateTime: string;
            status: string;
            form: {
              name: string;
              description: string;
            }
          },
          gmTemplateParams: {
            title: string;
            addActivity: string;
            editActivity: string;
            ID: string;
            activeGmId: string;
            gmName: string;
            paramIndex: string;
            paramName: string;
            templateName: string;
            status: string;
            form: {
              activeGmId: string;
              templateName: string;
              paramIndex: string;
              paramName: string;
            }
          },
          guildslist: {
            title: string;
            guildId: string;
            guildName: string;
            leadercuid: string;
            leaderName: string;
            memberCount: string;
            guildLevel: string;
          },
          mailGuildController: {
            title: string;
            titleserver: string;
            addservermail: string;
            editservermail: string;
            mailRemark: string;
            mailStatus: string;
            mailTitle: string;
            mailExpire: string;
            mailContent: string;
            goodsJson: string;
            createDate: string;
            mailSendDate: string;
            updateDate: string;
            mailId: string;
            mailServerJson: string;
            serverId: string;
            serverName: string;
            Sending: string;
            activeFrom: string;
            activeTo: string;
            custom: string;
            goods: string;
            mailGuildJson: string;
            mailGuildJsonTitle: string;
            form: {
              mailRemark: string;
              mailTitle: string;
              mailContent: string;
              goodsJson: string;
              mailServerJson: string;
              mailGuildJson: string;
            },
          },
          products: {
            title: string;
            pleaseSelectChannel: string;
            addProduct: string;
            editProduct: string;
            productId: string;
            productIndex: string;
            channelName: string;
            channelProductId: string;
            gameProductId: string;
            productName: string;
            productPrice: string;
            nativePrice: string;
            dollarPrice: string;
            productNumber: string;
            productDescribe: string;
            productType: string;
            enable: string;
            createDate: string;
            updateDate: string;
            producttype: {
              sdk: string;
              web: string;
            },
            productstatus: {
              enable: string;
              disable: string;
            },
            importModal: {
              title: string,
              fileFormatTip: string,
              selectFile: string,
              downloadTemplate: string,
              selectedFile: string,
              updateExistingData: string,
              importing: string,
              downloadingTemplate: string,
              templateDownloadFailed: string,
              templateDownloadSuccess: string,
              pleaseSelectFile: string,
              channelIdRequired: string,
              fileImportSuccess: string,
              fileImportFailed: string,
              invalidFileFormat: string,
              fileSizeExceeded: string,
              errorFileDownloadSuccess: string,
            },
            exportSuccess: string;
            exportFailed: string;
            exporting: string;
            form: {
              channelProductId: string;
              gameProductId: string;
              productName: string;
              dollarPrice: string;
              productNumber: string;
              productDescribe: string;
              productType: string;
              enable: string;
            },
          },
          Gems: {
            title: string,
            addGems: string,
            editGems: string,
            serverId: string,
            serverName: string,
            id: string,
            nameId: string,
            price: string,
            discountRate: string,
            discountPrice: string,
            limitCount: string,
            requireLevel: string,
            limitType: string,
            saleType: string,
            sellCategoryOrder: string,
            hideinclient: string,
            saleStartData: string,
            saleCloseData: string,
            saleWeekType: string,
            pleaseSelectServer: string,
            operator: string,
            searchTime: string,
            selectServer: string,
            selectServerTips: string,
            selectServerDesc: string,
            selectServerTipsSearch: string,
            weekdays: {
              yes: string,
              no: string,
              monday: string,
              tuesday: string,
              wednesday: string,
              thursday: string,
              friday: string,
              saturday: string,
              sunday: string,
              allWeek: string,
              notSet: string,
            },
            form: {
              id: string,
              nameId: string,
              saleType: string,
              discountPrice: string,
              limitType: string,
              limitCount: string,
              sellCategoryOrder: string,
              hideinclient: string,
              saleStartData: string,
              saleCloseData: string,
              saleWeekType: string,
              operator: string,
              searchTime: string,

            },
          },
          orders: {
            title: string,
            gameId: string,
            channelID: string,
            serverId: string,
            serverName: string,
            roleId: string,
            openId: string,
            loginName: string,
            itemId: string,
            itemName: string,
            amount: string,
            price: string,
            orderNo: string,
            outOrderNo: string,
            count: string,
            payTime: string,
            remark: string,
            serverOrderNo: string,
            callbackCount: string,
            uid: string,
            createIp: string,
            callbackIp: string,
            status: string,
            callbackStatus: string,
            createTime: string,
            updateTime: string,
            extrasParams: string,
            searchType: string,
            selectOrder: string,
            noOrder: string,
            noOrderReplenish: string,
            reason: string,
            operator: string,
            batchRechargeSuccess: string,
            batchRechargeFailed: string,
            batchRechargeSelected: string,
            batchRechargeConfirm: string,
            batchRechargeValidOrders: string,
            Status: {
              success: string,
              pending: string,
              failed: string,
              processing: string,
              shipped: string,
              cancelled: string,
              pendingReplenish: string,
            },
            CallbackStatus: {
              success: string,
              failed: string,
              processing: string,
            },
            form: {
              searchValue: string,
              status: string,
              callbackStatus: string,
            }
          },
          questionnaire: {
            titles: string,
            addQuestionnaire: string,
            editQuestionnaire: string,
            id: string,
            title: string,
            richContentMd: string,
            unlockType: string,
            unlockLevel: string,
            goodsJson: string,
            wjxUrl: string,
            status: string,
            createdBy: string,
            createdAt: string,
            updatedAt: string,
            mailTemplate: string,
            mailTitle: string,
            mailContent: string,
            unlocktype: {
              level: string,
            },
            questionnaireStatus: {
              open: string,
              close: string,
            },
            form: {
              title: string,
              richContentMd: string,
              unlockType: string,
              unlockLevel: string,
              wjxUrl: string,
              goodsJson: string,
              status: string,
              count: string,
              pleaseSelectGoods: string,
              mailTemplate: string,
              mailTitle: string,
              mailContent: string,
            }
          },
          surveyrecord: {
            title: string,
            surveyId: string,
            openId: string,
            roleId: string,
            serverId: string,
            finishedAt: string,
            wjxRespId: string,
            extPayload: string,
            createdAt: string,
            updatedAt: string,
          },
          giftactivity: {
            title: string,
            addGiftActivity: string,
            editGiftActivity: string,
            ID: string,
            name: string,
            campaignCode: string,
            scopeChannel: string,
            scopeServer: string,
            perUserLimit: string,
            totalLimit: string,
            rewardJson: string,
            remark: string,
            startTime: string,
            endTime: string,
            status: string,
            creator: string,
            batch: string,
            allocation: string,
            mailTitle: string,
            mailContent: string,
            form: {
              name: string,
              mailTitle: string,
              mailContent: string,
            },
            batchlist: {
              title: string,
              addBatch: string,
              editBatch: string,
              ID: string,
              codeType: string,
              codePrefix: string,
              codeLen: string,
              randomCodeLength: string,
              amount: string,
              generatedCount: string,
              exportedCountL: string,
              status: string,
              total: string,
              used: string,
              remain: string,
              giftCodeBatch: string,
              generateSuccess: string,
              view: string,
              void: string,
              confirmVoid: string,
              voidSuccess: string,
              batchVoidSuccess: string,
              batchVoidFailed: string,
              maxRedeemCount: string,
              addBatchSuccess: string,
              updateBatchSuccess: string,
              form: {
                activityName: string,
                codeType: string,
                randomCodeLength: string,
                amount: string,
                codePrefix: string,
                codePrefixPlaceholder: string,
                maxRedeemCount: string,
                randomCodeLengthPlaceholder: string,
              },
              example: {
                title: string,
                inputPrefix: string,
                result: string,
                generated: string,
                randomCodeLengthPlaceholder: string,
              },
            },
            allocationDrawer: {
              title: string,
              activityId: string,
              activityName: string,
              channelScope: string,
              channelScopeTips: string,
              selectChannel: string,
              selectedChannel: string,
              serverScope: string,
              serverScopeTips: string,
              selectServer: string,
              selectedServer: string,
              success: string,
              pleaseSelectChannelOrServer: string,
              allocationFailed: string,
            },
            herder: {
              title: string,
              description: string,
              totalActivity: string,
              generateCode: string,
              exchangedCount: string,
            },
            giftType: {
              common: string,
              special: string,
            },
            scopeType: {
              all: string,
              list: string,
            },
            giftActivityStatus: {
              enable: string,
              disable: string,
              archive: string,
            },
          },
          gitcodeBachController: {
            giftBatchStatus: {
              initial: string,
              generating: string,
              completed: string,
              cancelled: string,
            },
          },
          redeemrecord: {
            title: string,
            campaignId: string,
            codeId: string,
            codeType: string,
            openId: string,
            roleId: string,
            serverId: string,
            channelId: string,
            ip: string,
            deviceId: string,
            traceId: string,
            status: string,
            failReason: string,
            rewardSnapshot: string,
            createdAt: string,
          },
          giftCode: {
            title: string,
            pleaseSelectBatch: string,
            ID: string,
            codePlain: string,
            codeType: string,
            status: string,
            maxRedeemCount: string,
            redeemedCount: string,
            usedByOpenId: string,
            createdAt: string,
            usedTime: string,
            copyCodeSuccess: string,
            batchId: string,
            backToGiftActivity: string,
            codePlainPlaceholder: string,
            clickCodeToCopy: string,
            statusPlaceholder: string,
            usedByOpenIdPlaceholder: string,
          },
          saletype: {
            none: string,
            serveropen: string,
            characterLevel: string,
            achievement: string,
            characterClass: string,
            quest: string,
            returnDayCount: string,
            uniquePetGain: string,
            epicPetGain: string,
            legendPetGain: string,
            uniqueReflectionGain: string,
            epicReflectionGain: string,
            legendReflectionGain: string,
            heroReflectionGain: string,
            endEnum: string,
          },
          limittype: {
            none: string,
            dailyLimit: string,
            weeklyLimit: string,
            monthlyLimit: string,
            account: string,
            server: string,
            character: string,
            accountLimit: string,
            accountDailyLimit: string,
            accountWeeklyLimit: string,
            accountMonthlyLimit: string,
            serverLimit: string,
            serverDailyLimit: string,
            serverWeeklyLimit: string,
            serverMonthlyLimit: string,
            characterLimit: string,
            characterDailyLimit: string,
            characterWeeklyLimit: string,
            characterMonthlyLimit: string,
            exchange1CharacterLimit: string,
            exchange2ServerLimit: string,
            exchange2ServerDailyLimit: string,
            exchange2CharacterLimit: string,
            exchange2CharacterDailyLimit: string,
            scheduleLimit: string,
            endEnum: string,
          },
          productstatus: {
            Visible: string,
            Hidden: string,
          }
        },
        userCenter: {
          title: string;
          editProfile: string;
          changePassword: string;
          avatarUploadSuccess: string;
          avatarUploadFailed: string;
          profileUpdateSuccess: string;
          profileUpdateFailed: string;
          passwordChangeSuccess: string;
          passwordChangeFailed: string;
          passwordCheckFailed: string;
          userInfo: {
            username: string;
            nickname: string;
            email: string;
            phone: string;
            department: string;
            lastLogin: string;
            loginIp: string;
            createTime: string;
            notSet: string;
            unassigned: string;
            unknown: string;
          },
          statistics: {
            loginCount: string;
            onlineTime: string;
            rolePermissions: string;
            department: string;
            onlineTimeUnit: string;
          },
          gender: {
            male: string;
            female: string;
            unknown: string;
          },
          rolePermissions: {
            title: string;
            noRoles: string;
          },
          editModal: {
            title: string;
            nickname: string;
            email: string;
            phone: string;
            gender: string;
            remark: string;
            form: {
              nicknamePlaceholder: string;
              emailPlaceholder: string;
              phonePlaceholder: string;
              genderPlaceholder: string;
              remarkPlaceholder: string;
            }
          },
          passwordModal: {
            title: string;
            currentPassword: string;
            newPassword: string;
            confirmPassword: string;
            confirmChange: string;
            form: {
              currentPasswordPlaceholder: string;
              newPasswordPlaceholder: string;
              confirmPasswordPlaceholder: string;
              currentPasswordRequired: string;
              newPasswordRequired: string;
              newPasswordLength: string;
              confirmPasswordRequired: string;
              passwordMismatch: string;
            }
          }
        },
      };
    };
    form: {
      required: string;
      userName: FormMsg;
      phone: FormMsg;
      pwd: FormMsg;
      confirmPwd: FormMsg;
      code: FormMsg;
      email: FormMsg;
    };
    dropdown: Record<Global.DropdownKey, string>;
    icon: {
      themeConfig: string;
      themeSchema: string;
      lang: string;
      fullscreen: string;
      fullscreenExit: string;
      reload: string;
      collapse: string;
      expand: string;
      pin: string;
      unpin: string;
    };
    datatable: {
      itemCount: string;
    };
  };

  type GetI18nKey<T extends Record<string, unknown>, K extends keyof T = keyof T> = K extends string
    ? T[K] extends Record<string, unknown>
    ? `${K}.${GetI18nKey<T[K]>}`
    : K
    : never;

  type I18nKey = GetI18nKey<Schema>;

  type TranslateOptions<Locales extends string> = import('vue-i18n').TranslateOptions<Locales>;

  interface $T {
    (key: I18nKey): string;
    (key: I18nKey, plural: number, options?: TranslateOptions<LangType>): string;
    (key: I18nKey, defaultMsg: string, options?: TranslateOptions<I18nKey>): string;
    (key: I18nKey, list: unknown[], options?: TranslateOptions<I18nKey>): string;
    (key: I18nKey, list: unknown[], plural: number): string;
    (key: I18nKey, list: unknown[], defaultMsg: string): string;
    (key: I18nKey, named: Record<string, unknown>, options?: TranslateOptions<LangType>): string;
    (key: I18nKey, named: Record<string, unknown>, plural: number): string;
    (key: I18nKey, named: Record<string, unknown>, defaultMsg: string): string;
  }
}

/** Service namespace */
namespace Service {
  /** Other baseURL key */
  type OtherBaseURLKey = 'demo';


  // interface GameResponse {
  //   data: GameInfo[];
  // }

  interface ServiceConfigItem {
    /** The backend service base url */
    baseURL: string;
    /** The proxy pattern of the backend service base url */
    proxyPattern: string;
  }

  interface OtherServiceConfigItem extends ServiceConfigItem {
    key: OtherBaseURLKey;
  }

  /** The backend service config */
  interface ServiceConfig extends ServiceConfigItem {
    /** Other backend service config */
    other: OtherServiceConfigItem[];
  }

  interface SimpleServiceConfig extends Pick<ServiceConfigItem, 'baseURL'> {
    other: Record<OtherBaseURLKey, string>;
  }

  /** The backend service response data */
  type Response<T = unknown> = {
    /** The backend service response code */
    code: string;
    /** The backend service response message */
    msg: string;
    /** The backend service response data */
    data: T;
  };

  /** The demo backend service response data */
  type DemoResponse<T = unknown> = {
    /** The backend service response code */
    status: string;
    /** The backend service response message */
    message: string;
    /** The backend service response data */
    result: T;
  };
}
