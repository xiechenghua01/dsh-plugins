    /* ================================================================== *
     * 00-prelude.js                                                       *
     * Constants, locale dictionaries, helpers, mutable state and loaders. *
     * Every symbol here is shared with the later fragments.               *
     * ================================================================== */

    const NS = 'skillManager'
    const PANEL_ID = 'skill-manager'
    const DEFAULT_FONT_SIZE = 14
    const API_BASE = '/skill-manager/api/'

    /** Display order, rank and writability of the seven installation roots. */
    const LOCATION_ORDER = [
        { id: 'project-dsh', label: '项目技能', key: 'loc.projectDsh', filterKey: 'project', rank: 100, layer: 'preset', writable: true },
        { id: 'project-agents', label: '项目共享', key: 'loc.projectAgents', filterKey: 'projectShared', rank: 200, layer: 'preset', writable: true },
        { id: 'custom', label: '自定义目录', key: 'loc.custom', filterKey: 'custom', rank: 300, layer: 'preset', writable: true },
        { id: 'preset', label: '预设内置', key: 'loc.preset', filterKey: 'builtin', rank: 300, layer: 'preset', writable: false },
        { id: 'user-dsh', label: '用户技能', key: 'loc.userDsh', filterKey: 'user', rank: 400, layer: 'preset', writable: true },
        { id: 'user-agents', label: '用户共享', key: 'loc.userAgents', filterKey: 'userShared', rank: 500, layer: 'preset', writable: true },
        { id: 'bundled', label: '插件内置', key: 'loc.bundled', filterKey: 'builtin', rank: 600, layer: 'global', writable: false },
    ]

    /* ------------------------------------------------------------------ *
     * Locale dictionaries. zh/en must keep identical key sets.            *
     * Placeholders use {name} and are interpolated by t().                *
     * ------------------------------------------------------------------ */

                        const zh = {
      'action.addSource': '添加源',
      'action.cancel': '取消',
      'action.checkUpdates': '检查更新',
      'action.clearFilter': '查看全部技能',
      'action.clearSearch': '清除搜索',
      'action.close': '关闭',
      'action.collapse': '收起',
      'action.copyPath': '复制路径',
      'action.delete': '删除',
      'action.disable': '停用',
      'action.disableSkill': '停用技能',
      'action.edit': '编辑',
      'action.editContent': '编辑原文',
      'action.enable': '恢复',
      'action.enableSkill': '恢复技能',
      'action.expand': '展开',
      'action.import': '导入技能',
      'action.install': '安装',
      'action.more': '更多操作',
      'action.newSkill': '新建技能',
      'action.openFolder': '打开目录',
      'action.refresh': '刷新',
      'action.retry': '重试',
      'action.save': '保存',
      'action.undo': '撤销',
      'action.uninstall': '卸载',
      'action.update': '更新',
      'action.viewActive': '查看生效项',
      'action.viewDetails': '查看详情',
      'badge.builtin': '内置',
      'badge.disabled': '已停用',
      'badge.invalid': '格式异常',
      'badge.model': '模型可用',
      'badge.modelTip': '模型会按描述自动匹配调用',
      'badge.readonly': '只读',
      'badge.readonlyTip': '内置技能不支持修改',
      'badge.shadowed': '被覆盖',
      'badge.shadowedTip': '被更高优先级位置覆盖：{path}',
      'badge.update': '有更新',
      'badge.updateTip': '可升级至新版本 {version}',
      'badge.user': '用户可调用',
      'badge.userOnly': '仅用户可调用',
      'badge.userTip': '可在对话中输入斜杠命令调用',
      'banner.checking': '正在检查更新…',
      'banner.issues': '{count} 个技能未生效，可能导致 Agent 行为与预期不符。',
      'banner.unreadable': '无法读取技能目录 {path}，其余位置已正常加载。',
      'banner.upToDate': '已是最新',
      'banner.viewIssues': '查看原因',
      'delete.confirm.body': '将删除 {path} 及其所有资源文件，无法撤销。',
      'delete.confirm.title': '删除技能？',
      'delete.success': '已删除 {name}',
      'detail.allPresets': '所有预设共享',
      'detail.author': '作者',
      'detail.backInstalled': '返回已安装列表',
      'detail.backMarket': '返回市场列表',
      'detail.commit': 'Commit',
      'detail.conflictMtime': '文件已被外部修改，请刷新后重试',
      'detail.content': '原文',
      'detail.copyCommand': '复制调用命令',
      'detail.description': '描述',
      'detail.diagAfterInstall': '安装后可在此查看诊断',
      'detail.diagOk': '未发现问题',
      'detail.diagnostics': '诊断',
      'detail.engines': '兼容 DSH',
      'detail.escHint': 'Esc 返回列表',
      'detail.files': '文件与资源',
      'detail.installedAt': '安装时间',
      'detail.invocation': '调用方式',
      'detail.layer': '层',
      'detail.license': '许可证',
      'detail.localModified': '本地已修改',
      'detail.location': '位置',
      'detail.marketReadmeMissing': '该市场条目未提供 README',
      'detail.meta': '元信息',
      'detail.mtimeHint': '保存时校验文件修改时间',
      'detail.noFiles': '没有可列出的文件',
      'detail.notInstalled': '未安装',
      'detail.notInstalledMeta': '未安装',
      'detail.presetInvisible': '不可见',
      'detail.provider': 'Provider',
      'detail.source': '来源',
      'detail.unsaved': '未保存',
      'detail.updatedAt': '修改时间',
      'detail.visibility': '可见性',
      'detail.whenToUse': '何时使用',
      'detail.whenToUseEmpty': '未填写「何时使用」',
      'diag.error': '错误',
      'diag.explain': '格式不合法的技能会被静默跳过，不进入模型目录。这里集中列出原因与修复方式。',
      'diag.fix.openFile': '打开文件',
      'diag.fix.removeLink': '移除链接',
      'diag.fix.rename': '重命名',
      'diag.fix.renameHint': '建议改名为 {name}',
      'diag.fix.viewActive': '查看生效项',
      'diag.fixed': '已处理 {name}',
      'diag.info': '提示',
      'diag.issuesCount': '{errors} 个错误 · {warnings} 个警告',
      'diag.kind.brokenLink': '断链',
      'diag.kind.crossLayer': '跨层覆盖',
      'diag.kind.frontmatter': 'frontmatter 非法',
      'diag.kind.name': '名称非法',
      'diag.kind.oversize': '正文过大',
      'diag.kind.sameLayer': '同层覆盖',
      'diag.kind.unreadable': '目录不可读',
      'diag.noActive': '找不到生效项',
      'diag.none': '全部正常，没有发现问题',
      'diag.open': '打开诊断',
      'diag.recheck': '重新检查',
      'diag.title': '技能诊断',
      'diag.viewReasons': '查看原因',
      'diag.warning': '警告',
      'empty.filter': '当前筛选下没有技能',
      'empty.importAction': '导入技能',
      'empty.installed.body': '从市场安装，或把 SKILL.md 放进技能目录。',
      'empty.installed.title': '还没有可管理的技能',
      'empty.market.noEnabledSource': '没有启用的市场源',
      'empty.market.noEnabledSourceBody': '在「来源」中启用至少一个市场源。',
      'empty.market.noSourceBody': '添加一个索引地址即可浏览技能。',
      'empty.marketAction': '去市场安装',
      'empty.newAction': '新建技能',
      'empty.search': '没有匹配「{query}」的技能',
      'error.badRequest': '请求参数不正确',
      'error.canceled': '已取消',
      'error.checkUpdates': '无法检查更新',
      'error.checksum': '文件校验失败，安装已取消',
      'error.frontmatter': '技能格式不正确',
      'error.generic': '发生未知错误',
      'error.loadInstalled': '无法读取已安装技能',
      'error.loadMarket': '无法读取市场',
      'error.loadSources': '无法读取市场源',
      'error.notFound': '找不到该技能',
      'error.pathOutside': '目标位置不允许写入',
      'error.readLocation': '无法读取技能目录 {path}',
      'error.readonly': '内置技能不支持修改',
      'error.retryHint': '请检查权限后重试。',
      'error.space': '磁盘空间不足',
      'error.toggleState': '无法切换技能状态：{reason}',
      'error.tooLarge': '技能文件过大',
      'error.unauthorized': '当前页面未获授权',
      'filter.all': '全部',
      'filter.builtin': '内置',
      'filter.custom': '自定义',
      'filter.disabled': '已停用',
      'filter.label': '按位置筛选',
      'filter.project': '项目',
      'filter.projectShared': '项目共享',
      'filter.user': '用户',
      'filter.userShared': '用户共享',
      'form.body': '正文',
      'form.bodyHint': 'Markdown 正文',
      'form.bodyRequired': '请填写正文',
      'form.create': '创建技能',
      'form.description': '描述',
      'form.descriptionHint': '一句话说明，≤500 字',
      'form.descriptionTooLong': '描述不能超过 500 字',
      'form.locationProjectDisabled': '当前没有项目目录',
      'form.name': '名称',
      'form.nameHint': 'kebab-case，≤64 字符',
      'form.nameInvalid': '名称只能使用小写字母、数字与连字符',
      'form.nameTaken': '目标位置已有同名技能',
      'form.urlRequired': '请填写索引地址',
      'form.whenToUse': '何时使用',
      'form.whenToUseHint': '选填，≤200 字',
      'import.confirm': '导入技能',
      'import.dir': '从目录导入',
      'import.dirFilesHint': '将复制该目录下的 SKILL.md 与资源文件',
      'import.dirLabel': '目录路径',
      'import.parse': '解析',
      'import.parseFail': '解析失败：{reason}',
      'import.parseOk': '格式正确',
      'import.parsing': '解析中…',
      'import.paste': '粘贴 SKILL.md',
      'import.pasteLabel': 'SKILL.md 内容',
      'import.target': '保存到',
      'import.title': '导入技能',
      'install.button': '安装',
      'install.conflict': '目标位置已有同名技能',
      'install.conflict.changeTarget': '换位置',
      'install.conflict.overwrite': '覆盖',
      'install.conflict.skip': '跳过',
      'install.failed': '安装失败：{reason}',
      'install.installed': '已安装',
      'install.noFreeLocation': '没有可用的安装位置',
      'install.stageDownload': '下载文件',
      'install.stageVerify': '校验 sha256',
      'install.stageWrite': '写入磁盘',
      'install.success': '已安装 {name}',
      'install.target': '安装到',
      'install.title': '安装技能',
      'install.version': '版本',
      'install.yanked': '已撤回',
      'layer.global': '全局层',
      'layer.preset': '预设层',
      'loc.bundled': '插件内置',
      'loc.disabledGroup': '已停用',
      'loc.disabledPath': '<root>/.disabled/',
      'loc.groupCount': '{count} 个',
      'loc.projectDsh': '项目技能',
      'loc.rank': 'rank {rank}',
      'loc.userAgents': '用户共享',
      'loc.userDsh': '用户技能',
      'market.allSources': '全部启用源（{count} 个 · 共 {total} 个技能）',
      'market.by': '{author} · {source}',
      'market.dot.installed': '已安装',
      'market.dot.notInstalled': '未安装',
      'market.dot.update': '可更新',
      'market.empty': '该源暂时没有技能',
      'market.installedState': '已安装',
      'market.loadMore': '加载更多',
      'market.loading': '正在读取市场源…',
      'market.manageSources': '管理源',
      'market.offline': '无法连接市场源',
      'market.sortRecommended': '推荐',
      'market.sortUpdated': '最近更新',
      'market.sourceLabel': '市场源',
      'panel.description': '管理 Agent 可用的技能：安装、查看来源、修复未生效的条目。',
      'panel.title': '技能',
      'search.clear': '清除搜索',
      'search.installed': '搜索技能名称或描述',
      'search.market': '搜索市场技能',
      'sort.label': '排序',
      'sort.location': '位置优先级',
      'sort.modified': '最近修改',
      'sort.name': '名称',
      'source.add.title': '添加市场源',
      'source.added': '已添加源 {name}',
      'source.delete': '删除源',
      'source.deleteConfirm': '确定删除该市场源？已安装的技能不受影响。',
      'source.deleteFailed': '删除失败：{reason}',
      'source.disable': '停用',
      'source.disabled': '已停用',
      'source.empty': '还没有添加市场源',
      'source.enable': '启用',
      'source.enabled': '已启用',
      'source.error.fetch': '无法读取该源',
      'source.error.path': '位置 {path}',
      'source.lastChecked': '上次检查 {time}',
      'source.localPath': '本地目录',
      'source.name': '源名称',
      'source.neverChecked': '从未检查',
      'source.preset.fallbackDesc': '由预设决定是否挂载本地发现',
      'source.preset.mounted': '已挂载',
      'source.preset.stats': '{skills} 个预设技能 · {roots} 个本地根',
      'source.preset.unmounted': '未挂载',
      'source.sample': '示例',
      'source.skillCount': '{count} 个技能',
      'source.stale': '缓存已过期',
      'source.title': '标题',
      'source.trust': '该源由第三方提供，安装前请确认来源可信。',
      'source.type.index': '索引源',
      'source.type.local': '本地目录',
      'source.url': '索引地址',
      'source.validate': '校验',
      'source.validated': '已读取 {count} 个技能',
      'source.warnings': '{count} 条提示',
      'sources.disabledCount': '{count} 个已停用',
      'sources.locationsTitle': '本地安装位置',
      'sources.marketTitle': '市场源',
      'sources.minimalNoSkills': '该预设的 Agent 没有技能',
      'sources.missingDir': '目录不存在，新建技能时会自动创建',
      'sources.noLocations': '没有可用的安装位置',
      'sources.noPresets': '没有可用的预设信息',
      'sources.presetNote': '未挂载本地发现的预设，其 Agent 没有技能。',
      'sources.presetsTitle': 'Agent 预设可见性',
      'sources.priority': '同一预设内按 rank 排序；预设层覆盖全局层。',
      'sources.priorityDetail': '被覆盖的技能在「诊断」中列出，可查看生效项或重命名。',
      'sources.priorityTitle': '优先级规则',
      'sources.skillCount': '{count} 个技能',
      'sources.viewOverrides': '查看覆盖',
      'sources.viewSkills': '查看技能',
      'state.active': '生效中',
      'state.disabled': '已停用',
      'state.emptyDescription': '暂无描述',
      'state.error': '加载失败',
      'state.invalid': '格式异常，未进入模型目录',
      'state.loadFailed': '加载失败',
      'state.loading': '正在加载…',
      'state.loadingInstalled': '正在读取已安装技能…',
      'state.loadingUpdates': '正在检查更新…',
      'state.readonly': '只读内置技能',
      'state.shadowed': '被同名高优技能覆盖',
      'state.unauthorized': '当前页面未获授权',
      'status.missing': '目录不存在',
      'status.readable': '可读',
      'status.readonly': '内置技能不支持修改',
      'status.unreadable': '不可读',
      'tab.attention': '{count} 项需要关注',
      'tab.installed': '已安装',
      'tab.market': '市场',
      'tab.sources': '来源',
      'time.daysAgo': '{count} 天前',
      'time.hoursAgo': '{count} 小时前',
      'time.justNow': '刚刚',
      'time.minutesAgo': '{count} 分钟前',
      'time.monthsAgo': '{count} 个月前',
      'time.never': '从未',
      'time.unknown': '未知时间',
      'time.weeksAgo': '{count} 周前',
      'toast.copied': '已复制',
      'toast.copyFailed': '复制失败，请手动复制路径',
      'toast.created': '已创建技能 {name}',
      'toast.deleted': '已删除 {name}',
      'toast.disabled': '已停用 {name}',
      'toast.enabled': '已恢复 {name}',
      'toast.imported': '已导入 {name}（{count} 个文件）',
      'toast.openedFolder': '已打开目录：{path}',
      'toast.refreshDone': '已刷新',
      'toast.saved': '已保存',
      'toast.sourceDisabled': '已停用源 {name}',
      'toast.sourceEnabled': '已启用源 {name}',
      'toast.sourceRefreshFailed': '刷新失败：{reason}',
      'toast.sourceRefreshed': '已刷新 {name}',
      'toast.sourceToggleFailed': '操作失败：{reason}',
      'uninstall.confirm.body': '将删除 {name} 及安装记录；不会影响其他技能。',
      'uninstall.confirm.title': '卸载技能？',
      'uninstall.keepBackup': '保留备份副本',
      'uninstall.success': '已卸载 {name}',
      'update.available': '有新版本 {version}',
      'update.backupHint': '更新前会备份当前版本（保留最近 3 份）',
      'update.banner': '{count} 个技能有更新',
      'update.checkAll': '检查全部来源',
      'update.checkNow': '检查更新',
      'update.checking': '正在检查更新…',
      'update.checkingShort': '检查中…',
      'update.confirm': '更新',
      'update.count': '{count} 个可更新',
      'update.failed': '上次检查失败',
      'update.item': '{name} {current} → {available}',
      'update.lastChecked': '上次检查 {time}',
      'update.localModified': '本地文件已修改，更新会覆盖这些修改。',
      'update.none': '已是最新',
      'update.sourceCommit': '来源 commit',
      'update.success': '已更新到 {version}',
      'update.toast': '{count} 个技能有更新',
    }

                        const en = {
      'action.addSource': 'Add source',
      'action.cancel': 'Cancel',
      'action.checkUpdates': 'Check for updates',
      'action.clearFilter': 'Show all skills',
      'action.clearSearch': 'Clear search',
      'action.close': 'Close',
      'action.collapse': 'Collapse',
      'action.copyPath': 'Copy path',
      'action.delete': 'Delete',
      'action.disable': 'Disable',
      'action.disableSkill': 'Disable skill',
      'action.edit': 'Edit',
      'action.editContent': 'Edit source',
      'action.enable': 'Restore',
      'action.enableSkill': 'Restore skill',
      'action.expand': 'Expand',
      'action.import': 'Import skill',
      'action.install': 'Install',
      'action.more': 'More actions',
      'action.newSkill': 'New skill',
      'action.openFolder': 'Open folder',
      'action.refresh': 'Refresh',
      'action.retry': 'Retry',
      'action.save': 'Save',
      'action.undo': 'Undo',
      'action.uninstall': 'Uninstall',
      'action.update': 'Update',
      'action.viewActive': 'View active',
      'action.viewDetails': 'View details',
      'badge.builtin': 'Built-in',
      'badge.disabled': 'Disabled',
      'badge.invalid': 'Invalid',
      'badge.model': 'Model',
      'badge.modelTip': 'The model can invoke this skill from its description',
      'badge.readonly': 'Read-only',
      'badge.readonlyTip': 'Bundled skills are read-only',
      'badge.shadowed': 'Shadowed',
      'badge.shadowedTip': 'Shadowed by a higher priority location: {path}',
      'badge.update': 'Update',
      'badge.updateTip': 'Can upgrade to version {version}',
      'badge.user': 'User',
      'badge.userOnly': 'User only',
      'badge.userTip': 'Invoke this skill with a slash command',
      'banner.checking': 'Checking for updates…',
      'banner.issues': '{count} skills are not active. Agent behavior may differ from expectations.',
      'banner.unreadable': 'Could not read skill folder {path}. Other locations loaded normally.',
      'banner.upToDate': 'Up to date',
      'banner.viewIssues': 'View issues',
      'delete.confirm.body': 'This deletes {path} and all its resources. This cannot be undone.',
      'delete.confirm.title': 'Delete skill?',
      'delete.success': 'Deleted {name}',
      'detail.allPresets': 'Shared by all presets',
      'detail.author': 'Author',
      'detail.backInstalled': 'Back to installed',
      'detail.backMarket': 'Back to market',
      'detail.commit': 'Commit',
      'detail.conflictMtime': 'The file changed on disk; refresh and retry',
      'detail.content': 'Source',
      'detail.copyCommand': 'Copy command',
      'detail.description': 'Description',
      'detail.diagAfterInstall': 'Diagnostics appear after installation',
      'detail.diagOk': 'No problems found',
      'detail.diagnostics': 'Diagnostics',
      'detail.engines': 'DSH engines',
      'detail.escHint': 'Esc returns to the list',
      'detail.files': 'Files and resources',
      'detail.installedAt': 'Installed',
      'detail.invocation': 'Invocation',
      'detail.layer': 'Layer',
      'detail.license': 'License',
      'detail.localModified': 'Locally modified',
      'detail.location': 'Location',
      'detail.marketReadmeMissing': 'No README for this entry',
      'detail.meta': 'Metadata',
      'detail.mtimeHint': 'Save validates the file mtime',
      'detail.noFiles': 'No files',
      'detail.notInstalled': 'Not installed',
      'detail.notInstalledMeta': 'Not installed',
      'detail.presetInvisible': 'hidden',
      'detail.provider': 'Provider',
      'detail.source': 'Source',
      'detail.unsaved': 'Unsaved',
      'detail.updatedAt': 'Modified',
      'detail.visibility': 'Visibility',
      'detail.whenToUse': 'When to use',
      'detail.whenToUseEmpty': 'No when-to-use text',
      'diag.error': 'Error',
      'diag.explain': 'Invalid skills are skipped silently. Fix them here.',
      'diag.fix.openFile': 'Open file',
      'diag.fix.removeLink': 'Remove link',
      'diag.fix.rename': 'Rename',
      'diag.fix.renameHint': 'Suggested name: {name}',
      'diag.fix.viewActive': 'View active',
      'diag.fixed': 'Fixed {name}',
      'diag.info': 'Info',
      'diag.issuesCount': '{errors} errors · {warnings} warnings',
      'diag.kind.brokenLink': 'Broken link',
      'diag.kind.crossLayer': 'Cross-layer shadow',
      'diag.kind.frontmatter': 'Invalid frontmatter',
      'diag.kind.name': 'Invalid name',
      'diag.kind.oversize': 'Oversized',
      'diag.kind.sameLayer': 'Same-layer shadow',
      'diag.kind.unreadable': 'Unreadable',
      'diag.noActive': 'No active skill found',
      'diag.none': 'All clear. No problems found.',
      'diag.open': 'Open diagnostics',
      'diag.recheck': 'Re-check',
      'diag.title': 'Skill diagnostics',
      'diag.viewReasons': 'View reasons',
      'diag.warning': 'Warning',
      'empty.filter': 'No skills match this filter',
      'empty.importAction': 'Import skill',
      'empty.installed.body': 'Install from the market, or add a SKILL.md to a skill folder.',
      'empty.installed.title': 'No skills yet',
      'empty.market.noEnabledSource': 'No enabled market sources',
      'empty.market.noEnabledSourceBody': 'Enable at least one market source in Sources.',
      'empty.market.noSourceBody': 'Add an index URL to browse skills.',
      'empty.marketAction': 'Browse market',
      'empty.newAction': 'New skill',
      'empty.search': 'No skills match "{query}"',
      'error.badRequest': 'Invalid request',
      'error.canceled': 'Cancelled',
      'error.checkUpdates': 'Could not check for updates',
      'error.checksum': 'Checksum failed; installation cancelled',
      'error.frontmatter': 'Invalid skill format',
      'error.generic': 'An unknown error occurred',
      'error.loadInstalled': 'Could not read installed skills',
      'error.loadMarket': 'Could not read the market',
      'error.loadSources': 'Could not read market sources',
      'error.notFound': 'Skill not found',
      'error.pathOutside': 'That location is not writable',
      'error.readLocation': 'Could not read skill folder {path}',
      'error.readonly': 'Bundled skills are read-only',
      'error.retryHint': 'Check permissions and try again.',
      'error.space': 'Not enough disk space',
      'error.toggleState': 'Could not change skill state: {reason}',
      'error.tooLarge': 'Skill file too large',
      'error.unauthorized': 'This page is not authorized',
      'filter.all': 'All',
      'filter.builtin': 'Bundled',
      'filter.custom': 'Custom',
      'filter.disabled': 'Disabled',
      'filter.label': 'Filter by location',
      'filter.project': 'Project',
      'filter.projectShared': 'Project shared',
      'filter.user': 'User',
      'filter.userShared': 'User shared',
      'form.body': 'Body',
      'form.bodyHint': 'Markdown body',
      'form.bodyRequired': 'Body is required',
      'form.create': 'Create skill',
      'form.description': 'Description',
      'form.descriptionHint': 'One line, ≤500 chars',
      'form.descriptionTooLong': 'Description must be 500 chars or fewer',
      'form.locationProjectDisabled': 'No project directory',
      'form.name': 'Name',
      'form.nameHint': 'kebab-case, 64 chars or fewer',
      'form.nameInvalid': 'Use lowercase letters, digits and hyphens',
      'form.nameTaken': 'A skill with this name already exists',
      'form.urlRequired': 'Index URL is required',
      'form.whenToUse': 'When to use',
      'form.whenToUseHint': 'Optional, 200 chars or fewer',
      'import.confirm': 'Import skill',
      'import.dir': 'From folder',
      'import.dirFilesHint': 'Copies SKILL.md and resources from that folder',
      'import.dirLabel': 'Folder path',
      'import.parse': 'Parse',
      'import.parseFail': 'Parse failed: {reason}',
      'import.parseOk': 'Looks valid',
      'import.parsing': 'Parsing…',
      'import.paste': 'Paste SKILL.md',
      'import.pasteLabel': 'SKILL.md content',
      'import.target': 'Save to',
      'import.title': 'Import skill',
      'install.button': 'Install',
      'install.conflict': 'A skill with this name already exists here',
      'install.conflict.changeTarget': 'Change location',
      'install.conflict.overwrite': 'Overwrite',
      'install.conflict.skip': 'Skip',
      'install.failed': 'Install failed: {reason}',
      'install.installed': 'Installed',
      'install.noFreeLocation': 'No writable location',
      'install.stageDownload': 'Downloading',
      'install.stageVerify': 'Verifying',
      'install.stageWrite': 'Writing',
      'install.success': 'Installed {name}',
      'install.target': 'Install to',
      'install.title': 'Install skill',
      'install.version': 'Version',
      'install.yanked': 'Yanked',
      'layer.global': 'Global',
      'layer.preset': 'Preset',
      'loc.bundled': 'Bundled',
      'loc.disabledGroup': 'Disabled',
      'loc.disabledPath': '<root>/.disabled/',
      'loc.groupCount': '{count} skills',
      'loc.projectDsh': 'Project',
      'loc.rank': 'rank {rank}',
      'loc.userAgents': 'User shared',
      'loc.userDsh': 'User',
      'market.allSources': 'All enabled sources ({count} · {total} skills)',
      'market.by': '{author} · {source}',
      'market.dot.installed': 'Installed',
      'market.dot.notInstalled': 'Not installed',
      'market.dot.update': 'Update available',
      'market.empty': 'This source has no skills',
      'market.installedState': 'Installed',
      'market.loadMore': 'Load more',
      'market.loading': 'Reading market sources…',
      'market.manageSources': 'Manage sources',
      'market.offline': 'Cannot reach the market source',
      'market.sortRecommended': 'Recommended',
      'market.sortUpdated': 'Recently updated',
      'market.sourceLabel': 'Market source',
      'panel.description': 'Manage the skills available to agents: install, inspect sources, and fix inactive entries.',
      'panel.title': 'Skills',
      'search.clear': 'Clear search',
      'search.installed': 'Search skills',
      'search.market': 'Search market skills',
      'sort.label': 'Sort',
      'sort.location': 'Location priority',
      'sort.modified': 'Recently modified',
      'sort.name': 'Name',
      'source.add.title': 'Add market source',
      'source.added': 'Added source {name}',
      'source.delete': 'Delete source',
      'source.deleteConfirm': 'Delete this source? Installed skills are unaffected.',
      'source.deleteFailed': 'Delete failed: {reason}',
      'source.disable': 'Disable',
      'source.disabled': 'Disabled',
      'source.empty': 'No market sources yet',
      'source.enable': 'Enable',
      'source.enabled': 'Enabled',
      'source.error.fetch': 'Could not read this source',
      'source.error.path': 'At {path}',
      'source.lastChecked': 'Last checked {time}',
      'source.localPath': 'Local folder',
      'source.name': 'Source name',
      'source.neverChecked': 'Never checked',
      'source.preset.fallbackDesc': 'The preset decides local discovery',
      'source.preset.mounted': 'Mounted',
      'source.preset.stats': '{skills} preset skills · {roots} roots',
      'source.preset.unmounted': 'Not mounted',
      'source.sample': 'Sample',
      'source.skillCount': '{count} skills',
      'source.stale': 'Stale',
      'source.title': 'Title',
      'source.trust': 'This source is provided by a third party. Verify trust before installing.',
      'source.type.index': 'Index',
      'source.type.local': 'Local folder',
      'source.url': 'Index URL',
      'source.validate': 'Validate',
      'source.validated': 'Found {count} skills',
      'source.warnings': '{count} warnings',
      'sources.disabledCount': '{count} disabled',
      'sources.locationsTitle': 'Local install locations',
      'sources.marketTitle': 'Market sources',
      'sources.minimalNoSkills': 'This preset gives its agent no skills',
      'sources.missingDir': 'Folder does not exist yet; it is created on demand',
      'sources.noLocations': 'No install locations',
      'sources.noPresets': 'No preset information',
      'sources.presetNote': 'Presets without local discovery give their agents no skills.',
      'sources.presetsTitle': 'Agent preset visibility',
      'sources.priority': 'Within a preset, lower rank wins; preset layers override the global layer.',
      'sources.priorityDetail': 'Shadowed skills appear in Diagnostics; view the active one or rename.',
      'sources.priorityTitle': 'Priority rules',
      'sources.skillCount': '{count} skills',
      'sources.viewOverrides': 'View overrides',
      'sources.viewSkills': 'View skills',
      'state.active': 'Active',
      'state.disabled': 'Disabled',
      'state.emptyDescription': 'No description',
      'state.error': 'Load failed',
      'state.invalid': 'Invalid format; skipped by the model catalog',
      'state.loadFailed': 'Load failed',
      'state.loading': 'Loading…',
      'state.loadingInstalled': 'Reading installed skills…',
      'state.loadingUpdates': 'Checking for updates…',
      'state.readonly': 'Read-only bundled skill',
      'state.shadowed': 'Shadowed by a higher priority skill with the same name',
      'state.unauthorized': 'This page is not authorized',
      'status.missing': 'Missing',
      'status.readable': 'Readable',
      'status.readonly': 'Bundled skills are read-only',
      'status.unreadable': 'Unreadable',
      'tab.attention': '{count} items need attention',
      'tab.installed': 'Installed',
      'tab.market': 'Market',
      'tab.sources': 'Sources',
      'time.daysAgo': '{count} days ago',
      'time.hoursAgo': '{count} hours ago',
      'time.justNow': 'just now',
      'time.minutesAgo': '{count} minutes ago',
      'time.monthsAgo': '{count} months ago',
      'time.never': 'Never',
      'time.unknown': 'Unknown time',
      'time.weeksAgo': '{count} weeks ago',
      'toast.copied': 'Copied',
      'toast.copyFailed': 'Copy failed. Copy the path manually.',
      'toast.created': 'Created {name}',
      'toast.deleted': 'Deleted {name}',
      'toast.disabled': 'Disabled {name}',
      'toast.enabled': 'Restored {name}',
      'toast.imported': 'Imported {name} ({count} files)',
      'toast.openedFolder': 'Opened folder: {path}',
      'toast.refreshDone': 'Refreshed',
      'toast.saved': 'Saved',
      'toast.sourceDisabled': 'Disabled source {name}',
      'toast.sourceEnabled': 'Enabled source {name}',
      'toast.sourceRefreshFailed': 'Refresh failed: {reason}',
      'toast.sourceRefreshed': 'Refreshed {name}',
      'toast.sourceToggleFailed': 'Failed: {reason}',
      'uninstall.confirm.body': 'This removes {name} and its install record. Other skills are unaffected.',
      'uninstall.confirm.title': 'Uninstall skill?',
      'uninstall.keepBackup': 'Keep a backup copy',
      'uninstall.success': 'Uninstalled {name}',
      'update.available': 'Version {version} available',
      'update.backupHint': 'The current version is backed up (last 3 kept)',
      'update.banner': '{count} skills have updates',
      'update.checkAll': 'Check all sources',
      'update.checkNow': 'Check for updates',
      'update.checking': 'Checking for updates…',
      'update.checkingShort': 'Checking…',
      'update.confirm': 'Update',
      'update.count': '{count} updatable',
      'update.failed': 'Last check failed',
      'update.item': '{name} {current} → {available}',
      'update.lastChecked': 'Last checked {time}',
      'update.localModified': 'Local files changed; updating overwrites them.',
      'update.none': 'Up to date',
      'update.sourceCommit': 'Source commit',
      'update.success': 'Updated to {version}',
      'update.toast': '{count} skills have updates',
    }

    /* ------------------------------------------------------------------ *
     * State.                                                              *
     * ------------------------------------------------------------------ */

    const appState = {
        tab: 'installed',
        view: 'list',
        detail: null,
        cwd: '',
        search: '',
        filter: 'all',
        sort: 'location',
        marketSourceId: 'all',
        marketTag: 'all',
        marketSort: 'relevance',
        marketSkills: [],
        marketTotal: 0,
        marketNextOffset: null,
        marketLoading: false,
        sources: [],
        sourcesLoading: false,
        installed: null,
        loading: false,
        loadingInstalled: false,
        loadingSources: false,
        loadingUpdates: false,
        checkingUpdates: false,
        updates: null,
        error: null,
        lastErrorToast: null,
        fontSize: DEFAULT_FONT_SIZE,
        locale: 'zh',
        toasts: [],
        rowMenu: null,
        disabledExpanded: false,
        busySkillId: null,
        highlightId: null,
        listScrollTop: null,
        restoreListScroll: null,
    }

    function setState(patch) {
        if (patch !== null && typeof patch === 'object') Object.assign(appState, patch)
        rerender()
    }

    /* ------------------------------------------------------------------ *
     * Locale and formatting helpers.                                      *
     * ------------------------------------------------------------------ */

    /** Bound by 99-apply through the slot props (ctx.locale.bind(NS)). */
    let boundT = null

    function isEnglishLocale() {
        return String(appState.locale === undefined || appState.locale === null ? '' : appState.locale).toLowerCase().indexOf('en') === 0
    }

    function t(key, vars) {
        const name = String(key)
        let value = null
        if (typeof boundT === 'function') {
            try {
                const bound = boundT(name, vars)
                if (typeof bound === 'string' && bound !== '') value = bound
            } catch {
                value = null
            }
        }
        if (value === null || value === name) {
            const dict = isEnglishLocale() ? en : zh
            value = dict[name]
        }
        if (typeof value !== 'string' || value === '') value = name
        if (vars !== null && typeof vars === 'object' && value.indexOf('{') !== -1) {
            value = value.replace(/\{([A-Za-z0-9_]+)\}/g, function (match, token) {
                const replacement = vars[token]
                return replacement === undefined || replacement === null ? match : String(replacement)
            })
        }
        return value
    }

    function fmtSize(bytes) {
        const value = Number(bytes)
        if (!Number.isFinite(value) || value < 0) return '—'
        if (value < 1024) return Math.round(value) + ' B'
        const units = ['KB', 'MB', 'GB', 'TB']
        let size = value / 1024
        let index = 0
        while (size >= 1024 && index < units.length - 1) {
            size /= 1024
            index += 1
        }
        const digits = size >= 100 ? 0 : 1
        return size.toFixed(digits).replace(/\.0$/, '') + ' ' + units[index]
    }

    function fmtTime(sec) {
        const value = Number(sec)
        if (!Number.isFinite(value) || value <= 0) return t('time.never')
        const ms = value > 1000000000000 ? value : value * 1000
        const diff = Date.now() - ms
        if (!Number.isFinite(diff)) return t('time.unknown')
        if (diff < 60000) return t('time.justNow')
        const minutes = Math.floor(diff / 60000)
        if (minutes < 60) return t('time.minutesAgo', { count: minutes })
        const hours = Math.floor(minutes / 60)
        if (hours < 24) return t('time.hoursAgo', { count: hours })
        const days = Math.floor(hours / 24)
        if (days < 7) return t('time.daysAgo', { count: days })
        if (days < 30) return t('time.weeksAgo', { count: Math.floor(days / 7) })
        if (days < 365) return t('time.monthsAgo', { count: Math.floor(days / 30) })
        try {
            return new Date(ms).toLocaleDateString(isEnglishLocale() ? 'en' : 'zh-CN')
        } catch {
            return t('time.unknown')
        }
    }

    function versionLabel(version) {
        const text = String(version === undefined || version === null ? '' : version)
        if (text === '') return ''
        return text.charAt(0) === 'v' ? text : 'v' + text
    }

    function cx() {
        const parts = []
        for (let index = 0; index < arguments.length; index += 1) {
            const value = arguments[index]
            if (value === null || value === undefined || value === false || value === '') continue
            if (Array.isArray(value)) {
                const nested = cx.apply(null, value)
                if (nested !== '') parts.push(nested)
                continue
            }
            if (typeof value === 'object') {
                Object.keys(value).forEach(function (name) {
                    if (value[name]) parts.push(name)
                })
                continue
            }
            parts.push(String(value))
        }
        return parts.join(' ')
    }

    /* ------------------------------------------------------------------ *
     * HTTP wrapper. Returns data on success; throws { code, message }.    *
     * ------------------------------------------------------------------ */

    async function api(path, options) {
        const opts = options !== null && typeof options === 'object' ? options : {}
        const raw = String(path === undefined || path === null ? '' : path)
        const url = /^https?:/iu.test(raw) ? raw : API_BASE + raw.replace(/^\/+/u, '')
        const headers = Object.assign({ accept: 'application/json' }, opts.headers !== null && typeof opts.headers === 'object' ? opts.headers : {})
        const init = {
            method: opts.method !== undefined ? String(opts.method) : 'GET',
            credentials: 'same-origin',
            cache: 'no-store',
            headers: headers,
        }
        if (opts.body !== undefined) {
            if (typeof opts.body === 'string') {
                init.body = opts.body
            } else {
                headers['content-type'] = 'application/json'
                init.body = JSON.stringify(opts.body)
            }
        }
        if (opts.signal !== undefined) init.signal = opts.signal
        let response
        try {
            response = await fetch(url, init)
        } catch (error) {
            throw { code: 'E_SOURCE_UNREACHABLE', message: error && error.message ? error.message : t('error.generic') }
        }
        let payload = null
        try {
            payload = await response.json()
        } catch {
            payload = null
        }
        if (response.status === 401) {
            throw { code: 'E_UNAUTHORIZED', message: t('error.unauthorized'), status: 401 }
        }
        if (payload !== null && typeof payload === 'object' && payload.ok === true) return payload.data
        const failure = payload !== null && typeof payload === 'object' && payload.error !== null && typeof payload.error === 'object' ? payload.error : null
        throw {
            code: failure !== null && failure.code ? failure.code : 'E_INTERNAL',
            message: failure !== null && failure.message ? failure.message : t('error.generic'),
            path: failure !== null && failure.path ? failure.path : undefined,
            file: failure !== null && failure.file ? failure.file : undefined,
            status: response.status,
        }
    }

    /* ------------------------------------------------------------------ *
     * Toast host state. 50-modals.js renders appState.toasts.             *
     * ------------------------------------------------------------------ */

    let toastSeq = 0

    function dismissToast(id) {
        if (!Array.isArray(appState.toasts)) return
        const next = appState.toasts.filter(function (item) { return item.id !== id })
        if (next.length === appState.toasts.length) return
        appState.toasts = next
        rerender()
    }

    function toast(message, options) {
        const opts = options !== null && typeof options === 'object' ? options : {}
        toastSeq += 1
        const id = 'sm-toast-' + String(toastSeq)
        const item = {
            id: id,
            message: String(message === undefined || message === null ? '' : message),
            tone: opts.tone === 'error' ? 'error' : opts.tone === 'ok' ? 'ok' : 'info',
            actionLabel: typeof opts.actionLabel === 'string' ? opts.actionLabel : '',
            onAction: typeof opts.onAction === 'function' ? opts.onAction : null,
        }
        if (!Array.isArray(appState.toasts)) appState.toasts = []
        appState.toasts = appState.toasts.concat([item])
        rerender()
        const duration = typeof opts.duration === 'number' && opts.duration > 0 ? opts.duration : 4000
        if (typeof window !== 'undefined' && window !== null && typeof window.setTimeout === 'function') {
            window.setTimeout(function () { dismissToast(id) }, duration)
        }
        return id
    }

    function copyPath(path) {
        const text = String(path === undefined || path === null ? '' : path)
        try {
            if (typeof navigator !== 'undefined' && navigator !== null && navigator.clipboard !== undefined && typeof navigator.clipboard.writeText === 'function') {
                navigator.clipboard.writeText(text).then(function () {
                    toast(t('toast.copied'))
                }, function () {
                    toast(t('toast.copyFailed'), { tone: 'error' })
                })
                return
            }
        } catch {
            /* fall through to the visible failure toast */
        }
        toast(t('toast.copyFailed'), { tone: 'error' })
    }

    function openFolder(path) {
        toast(t('toast.openedFolder', { path: String(path === undefined || path === null ? '' : path) }))
    }

    /* ------------------------------------------------------------------ *
     * Inline SVG icon set (contract section 6).                          *
     * ------------------------------------------------------------------ */

    const ICON_GLYPHS = {
        skill: [
            ['path', { d: 'M4 5.5A1.5 1.5 0 0 1 5.5 4H10l2 2h6.5A1.5 1.5 0 0 1 20 7.5v11a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5Z' }],
            ['path', { d: 'm12 10.4 1.2 2.43 2.68.39-1.94 1.89.46 2.67L12 16.52l-2.4 1.26.46-2.67-1.94-1.89 2.68-.39Z' }],
        ],
        installed: [
            ['path', { d: 'M4.5 5.5A1.5 1.5 0 0 1 6 4h12a1.5 1.5 0 0 1 1.5 1.5v13A1.5 1.5 0 0 1 18 20H6a1.5 1.5 0 0 1-1.5-1.5Z' }],
            ['path', { d: 'm8.5 12 2.4 2.4 4.6-5' }],
        ],
        market: [
            ['path', { d: 'M4 9.5 5.6 4h12.8L20 9.5' }],
            ['path', { d: 'M4 9.5a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0' }],
            ['path', { d: 'M5.5 12.5V20h13v-7.5' }],
            ['path', { d: 'M9.5 20v-4.5h5V20' }],
        ],
        sources: [
            ['path', { d: 'M12 3.5 21 8l-9 4.5L3 8Z' }],
            ['path', { d: 'm3 12 9 4.5 9-4.5' }],
            ['path', { d: 'm3 16 9 4.5 9-4.5' }],
        ],
        search: [
            ['circle', { cx: 11, cy: 11, r: 7 }],
            ['path', { d: 'm16.2 16.2 4.3 4.3' }],
        ],
        refresh: [
            ['path', { d: 'M20 12a8 8 0 1 1-2.34-5.66' }],
            ['path', { d: 'M20 4v5h-5' }],
        ],
        plus: [
            ['path', { d: 'M12 5v14M5 12h14' }],
        ],
        import: [
            ['path', { d: 'M12 3v11' }],
            ['path', { d: 'm8 10 4 4 4-4' }],
            ['path', { d: 'M5 15v3.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V15' }],
        ],
        folder: [
            ['path', { d: 'M3.5 6.5A1.5 1.5 0 0 1 5 5h4l2 2h8a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5Z' }],
        ],
        user: [
            ['circle', { cx: 12, cy: 8, r: 3.5 }],
            ['path', { d: 'M5 20a7 7 0 0 1 14 0' }],
        ],
        users: [
            ['path', { d: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z' }],
            ['path', { d: 'M3 20a6 6 0 0 1 12 0' }],
            ['path', { d: 'M16 5.5a3 3 0 0 1 0 5.5' }],
            ['path', { d: 'M18 14.5a5.5 5.5 0 0 1 3 5' }],
        ],
        sliders: [
            ['path', { d: 'M4 7h5M13 7h7M4 12h9M17 12h3M4 17h3M11 17h9' }],
            ['path', { d: 'M11 5v4M15 10v4M9 15v4' }],
        ],
        puzzle: [
            ['path', { d: 'M10 4.5a2 2 0 1 1 4 0V6h2.5A1.5 1.5 0 0 1 18 7.5V10h1.5a2 2 0 1 1 0 4H18v2.5a1.5 1.5 0 0 1-1.5 1.5H14v-1.5a2 2 0 1 0-4 0V18H7.5A1.5 1.5 0 0 1 6 16.5V14H4.5a2 2 0 1 1 0-4H6V7.5A1.5 1.5 0 0 1 7.5 6H10Z' }],
        ],
        layers: [
            ['path', { d: 'M12 3 21 8l-9 5-9-5Z' }],
            ['path', { d: 'm3 12 9 5 9-5' }],
            ['path', { d: 'm3 16 9 5 9-5' }],
        ],
        shield: [
            ['path', { d: 'M12 3.5 20 6v5.5c0 4.6-3.3 7.8-8 9.5-4.7-1.7-8-4.9-8-9.5V6Z' }],
            ['path', { d: 'm8.5 12 2.4 2.4 4.6-5' }],
        ],
        database: [
            ['ellipse', { cx: 12, cy: 6, rx: 7.5, ry: 3 }],
            ['path', { d: 'M4.5 6v12c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3V6' }],
            ['path', { d: 'M4.5 12c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3' }],
        ],
        git: [
            ['circle', { cx: 6, cy: 6, r: 2.5 }],
            ['circle', { cx: 18, cy: 6, r: 2.5 }],
            ['circle', { cx: 12, cy: 18, r: 2.5 }],
            ['path', { d: 'M6 8.5v3A3.5 3.5 0 0 0 9.5 15H12M18 8.5v1A3.5 3.5 0 0 1 14.5 13H12M12 15v.5' }],
        ],
        file: [
            ['path', { d: 'M6 3.5h7L18.5 9v11a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1Z' }],
            ['path', { d: 'M13 3.5V9h5.5' }],
        ],
        image: [
            ['rect', { x: 4, y: 5, width: 16, height: 14, rx: 2 }],
            ['circle', { cx: 9, cy: 10, r: 1.5 }],
            ['path', { d: 'm5 17 4.5-4.5L14 17m-1.5-1.5L16 12l3 3' }],
        ],
        script: [
            ['path', { d: 'M8 7 4 12l4 5' }],
            ['path', { d: 'm16 7 4 5-4 5' }],
            ['path', { d: 'm13.5 5-3 14' }],
        ],
        'chevron-down': [
            ['path', { d: 'm6 9 6 6 6-6' }],
        ],
        'chevron-right': [
            ['path', { d: 'm9 6 6 6-6 6' }],
        ],
        'arrow-up': [
            ['path', { d: 'M12 19V5m0 0-5 5m5-5 5 5' }],
        ],
        check: [
            ['path', { d: 'm5 12.5 4.5 4.5L19 7' }],
        ],
        x: [
            ['path', { d: 'M6 6l12 12M18 6 6 18' }],
        ],
        edit: [
            ['path', { d: 'M4 20h4l10.5-10.5a2.12 2.12 0 0 0-3-3L5 17v3Z' }],
            ['path', { d: 'm13.5 6.5 3 3' }],
        ],
        trash: [
            ['path', { d: 'M4.5 7h15' }],
            ['path', { d: 'M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7' }],
            ['path', { d: 'm6.5 7 .8 12A1.5 1.5 0 0 0 8.8 20.5h6.4a1.5 1.5 0 0 0 1.5-1.5l.8-12' }],
            ['path', { d: 'M10 11v5M14 11v5' }],
        ],
        power: [
            ['path', { d: 'M12 3v9' }],
            ['path', { d: 'M7.05 6.05a8 8 0 1 0 9.9 0' }],
        ],
        more: [
            ['circle', { cx: 12, cy: 5.5, r: 1.4, fill: 'currentColor', stroke: 'none' }],
            ['circle', { cx: 12, cy: 12, r: 1.4, fill: 'currentColor', stroke: 'none' }],
            ['circle', { cx: 12, cy: 18.5, r: 1.4, fill: 'currentColor', stroke: 'none' }],
        ],
        copy: [
            ['rect', { x: 8, y: 8, width: 12, height: 12, rx: 2 }],
            ['path', { d: 'M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2' }],
        ],
        alert: [
            ['path', { d: 'M12 4 21 19.5H3Z' }],
            ['path', { d: 'M12 9.5v4M12 16.5h.01' }],
        ],
        info: [
            ['circle', { cx: 12, cy: 12, r: 8.5 }],
            ['path', { d: 'M12 11v5M12 8h.01' }],
        ],
        clock: [
            ['circle', { cx: 12, cy: 12, r: 8.5 }],
            ['path', { d: 'M12 7.5V12l3 2' }],
        ],
        link: [
            ['path', { d: 'M9.5 14.5 14.5 9.5' }],
            ['path', { d: 'M8 11 5.5 13.5a3.5 3.5 0 0 0 5 5L13 16' }],
            ['path', { d: 'M16 13l2.5-2.5a3.5 3.5 0 0 0-5-5L11 8' }],
        ],
        package: [
            ['path', { d: 'M12 3 20.5 7.5v9L12 21l-8.5-4.5v-9Z' }],
            ['path', { d: 'M3.5 7.5 12 12l8.5-4.5M12 12v9' }],
        ],
    }

    function icon(name, size) {
        const key = String(name === undefined || name === null ? 'skill' : name)
        const glyph = ICON_GLYPHS[key] || ICON_GLYPHS.skill
        const px = typeof size === 'number' && size > 0 ? size : 16
        const children = glyph.map(function (entry, index) {
            return h(entry[0], Object.assign({ key: 'glyph-' + String(index) }, entry[1]))
        })
        return h('svg', {
            width: px,
            height: px,
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: 1.5,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            'aria-hidden': 'true',
            focusable: 'false',
            className: 'sm-icon',
        }, children)
    }

    function upgradeIcon(size) {
        const px = typeof size === 'number' && size > 0 ? size : 13
        return h('svg', {
            width: px,
            height: px,
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: 1.8,
            'aria-hidden': 'true',
            focusable: 'false',
            className: 'sm-upgrade-icon',
        },
        h('circle', { cx: 12, cy: 12, r: 9 }),
        h('path', { d: 'M8.5 11.5L12 8m0 0l3.5 3.5M12 8v8', strokeLinecap: 'round', strokeLinejoin: 'round' }))
    }

    /* ------------------------------------------------------------------ *
     * Location / badge / icon helpers shared with the market and detail   *
     * fragments.                                                          *
     * ------------------------------------------------------------------ */

    function locationMeta(id) {
        const key = String(id === undefined || id === null ? '' : id)
        return LOCATION_ORDER.find(function (item) { return item.id === key }) || null
    }

    function locationById(id) {
        const meta = locationMeta(id)
        const fallback = {
            id: meta !== null ? meta.id : String(id === undefined || id === null ? '' : id),
            label: meta !== null ? meta.label : '',
            path: '',
            absPath: '',
            rank: meta !== null ? meta.rank : 0,
            layer: meta !== null ? meta.layer : 'preset',
            writable: meta !== null ? meta.writable : false,
            exists: true,
            readable: true,
            skillCount: 0,
            disabledCount: 0,
            presets: [],
        }
        const data = appState.installed
        if (data !== null && typeof data === 'object' && Array.isArray(data.locations)) {
            const found = data.locations.find(function (item) { return item !== null && typeof item === 'object' && item.id === fallback.id })
            if (found !== undefined) return found
        }
        return fallback
    }

    function locationLabel(location) {
        const raw = location !== null && typeof location === 'object' ? location.id : location
        const meta = locationMeta(raw)
        if (meta !== null) return t(meta.key)
        if (location !== null && typeof location === 'object' && typeof location.label === 'string' && location.label !== '') return location.label
        return String(raw === undefined || raw === null ? '' : raw)
    }

    function locationFilterKey(id) {
        const meta = locationMeta(id)
        return meta !== null ? meta.filterKey : ''
    }

    /** Latest completed update check, or null when no check has ever produced a result. */
    function updateCheckState() {
        const state = appState.updates
        if (state === null || typeof state !== 'object') return null
        if (typeof state.checkedAt !== 'number' || state.checkedAt === 0) return null
        return state
    }

    /** Find the latest update entry for a skill by name + location (fresh state only). */
    function skillUpdateEntry(skill) {
        if (skill === null || typeof skill !== 'object') return null
        const state = updateCheckState()
        if (state === null || !Array.isArray(state.updates)) return null
        const list = state.updates
        const name = String(skill.name === undefined || skill.name === null ? '' : skill.name)
        const location = String(skill.location === undefined || skill.location === null ? '' : skill.location)
        const found = list.find(function (item) {
            return item !== null && typeof item === 'object'
                && String(item.name === undefined || item.name === null ? '' : item.name) === name
                && String(item.location === undefined || item.location === null ? '' : item.location) === location
        })
        return found === undefined ? null : found
    }

    /**
     * Newer version available for a skill.
     * The latest completed check is authoritative: when it ran and has no entry for
     * this skill, the result is '' even if a stale market.updateAvailable remains.
     * Only when no check has ever run do we fall back to market.updateAvailable.
     */
    function skillUpdateVersion(skill) {
        if (skill === null || typeof skill !== 'object') return ''
        if (updateCheckState() !== null) {
            const entry = skillUpdateEntry(skill)
            if (entry !== null && entry.available !== undefined && entry.available !== null && String(entry.available) !== '') {
                return String(entry.available)
            }
            return ''
        }
        if (skill.market !== null && typeof skill.market === 'object' && skill.market.updateAvailable) {
            return String(skill.market.updateAvailable)
        }
        return ''
    }

    function skillStatusDot(skill) {
        if (skill === null || typeof skill !== 'object') return 'sm-dot sm-dot-idle'
        if (skill.status === 'disabled') return 'sm-dot sm-dot-idle'
        if (skill.status === 'invalid') return 'sm-dot sm-dot-error'
        if (skill.status === 'shadowed') return 'sm-dot sm-dot-warn'
        if (skillUpdateVersion(skill) !== '') return 'sm-dot sm-dot-update'
        if (skill.writable === false) return 'sm-dot sm-dot-idle'
        return 'sm-dot sm-dot-ok'
    }

    function skillStatusTip(skill) {
        if (skill === null || typeof skill !== 'object') return t('state.loadFailed')
        if (skill.status === 'disabled') return t('state.disabled')
        if (skill.status === 'invalid') return t('state.invalid')
        if (skill.status === 'shadowed') return t('state.shadowed')
        const updateVersion = skillUpdateVersion(skill)
        if (updateVersion !== '') {
            return t('update.available', { version: versionLabel(updateVersion) })
        }
        if (skill.writable === false) return t('state.readonly')
        return t('state.active')
    }

    /** Pick a stable semantic glyph for a skill name and location. */
    function skillIconName(skillOrName, location) {
        const name = typeof skillOrName === 'string'
            ? skillOrName
            : skillOrName !== null && typeof skillOrName === 'object' && typeof skillOrName.name === 'string'
                ? skillOrName.name
                : ''
        const loc = location !== undefined && location !== null
            ? location
            : skillOrName !== null && typeof skillOrName === 'object' && typeof skillOrName.location === 'string'
                ? skillOrName.location
                : ''
        const text = name.toLowerCase()
        if (text.includes('review') || text.includes('audit') || text.includes('security')) return 'shield'
        if (text.includes('sql') || text.includes('database') || text.includes('query') || text.includes('postgres') || text.includes('clickhouse')) return 'database'
        if (text.includes('git') || text.includes('commit') || text.includes('pull-request')) return 'git'
        if (text.includes('pdf') || text.includes('doc') || text.includes('markdown')) return 'file'
        if (text.includes('image') || text.includes('design') || text.includes('frontend')) return 'image'
        if (text.includes('script') || text.includes('python') || text.includes('bash')) return 'script'
        if (text.includes('plugin') || text.includes('arch') || text.includes('cordis')) return 'puzzle'
        if (text.includes('creator') || text.includes('skill')) return 'skill'
        if (loc === 'preset' || loc === 'bundled') return 'package'
        return 'folder'
    }

    function renderSkillIconBox(skill, options) {
        const opts = options !== null && typeof options === 'object' ? options : {}
        const size = typeof opts.iconSize === 'number' && opts.iconSize > 0 ? opts.iconSize : 24
        return h('div', { className: cx('sm-row-icon', opts.className) },
            icon(skillIconName(skill), size),
            h('span', { className: skillStatusDot(skill), 'data-tip': skillStatusTip(skill) }))
    }

    function badge(label, tone, tip, key) {
        return h('span', {
            key: key,
            className: cx('sm-badge', tone === 'warn' ? 'sm-badge-warn' : tone === 'error' ? 'sm-badge-error' : tone === 'success' ? 'sm-badge-success' : null),
            'data-tip': tip,
        }, String(label === undefined || label === null ? '' : label))
    }

    function renderUpgradeBadge(version, options) {
        const opts = options !== null && typeof options === 'object' ? options : {}
        const text = versionLabel(version)
        const interactive = typeof opts.onClick === 'function'
        return h('span', {
            key: opts.key !== undefined ? opts.key : 'upgrade',
            className: cx('sm-badge', 'sm-badge-update', 'sm-mono', opts.className),
            'data-tip': t('badge.updateTip', { version: text }),
            title: t('update.available', { version: text }),
            role: interactive ? 'button' : undefined,
            tabIndex: interactive ? 0 : undefined,
            onClick: interactive ? opts.onClick : undefined,
            onKeyDown: interactive
                ? function (event) {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        opts.onClick(event)
                    }
                }
                : undefined,
        },
        upgradeIcon(13),
        h('span', null, text === '' ? t('badge.update') : text))
    }

    /* ------------------------------------------------------------------ *
     * Loaders. Failures are stored in appState.error and toasted once.    *
     * ------------------------------------------------------------------ */

    function reportError(scope, error, fallback, options) {
        const opts = options !== null && typeof options === 'object' ? options : {}
        const code = error !== null && typeof error === 'object' && error.code ? String(error.code) : 'E_INTERNAL'
        const message = error !== null && typeof error === 'object' && error.message ? String(error.message) : fallback
        appState.error = { scope: scope, code: code, message: message }
        const fingerprint = String(scope) + ':' + code + ':' + message
        if (opts.silent !== true && appState.lastErrorToast !== fingerprint) {
            appState.lastErrorToast = fingerprint
            toast(code === 'E_UNAUTHORIZED' ? t('error.unauthorized') : message, { tone: 'error' })
        }
    }

    async function loadInstalled(force) {
        if (appState.loadingInstalled === true && force !== true) return null
        appState.loadingInstalled = true
        if (appState.installed === null) appState.loading = true
        appState.error = null
        rerender()
        try {
            const data = await api('installed?cwd=' + encodeURIComponent(appState.cwd === undefined || appState.cwd === null ? '' : appState.cwd))
            if (data !== null && typeof data === 'object') {
                appState.installed = data
                if (data.updates !== null && typeof data.updates === 'object') appState.updates = data.updates
                if (typeof data.cwd === 'string' && data.cwd !== '') appState.cwd = data.cwd
            }
            appState.lastErrorToast = null
            return data
        } catch (error) {
            reportError('installed', error, t('error.loadInstalled'))
            return null
        } finally {
            appState.loadingInstalled = false
            appState.loading = false
            rerender()
        }
    }

    async function loadSources(force) {
        if (appState.loadingSources === true && force !== true) return null
        appState.loadingSources = true
        rerender()
        try {
            const data = await api('sources')
            if (data !== null && typeof data === 'object' && Array.isArray(data.sources)) appState.sources = data.sources
            appState.lastErrorToast = null
            return data
        } catch (error) {
            reportError('sources', error, t('error.loadSources'))
            return null
        } finally {
            appState.loadingSources = false
            rerender()
        }
    }

    /* Market request coordination: one monotonically increasing id ensures only
       the newest response may touch the shared list. The signature check below
       covers the case where the query changed while the newest request was in
       flight (no replacement request has been sent yet). */
    let marketRequestSeq = 0
    let marketLatestRequestId = 0
    let marketInFlightSig = ''
    let marketLastSettledSig = ''
    let marketLastSettledAt = 0
    let marketCorrectionTimer = null

    /** Canonical query signature, shared with 20-market's scheduler. */
    function marketQuerySignature(query) {
        const input = query !== null && typeof query === 'object' ? query : {}
        const sourceId = input.sourceId !== undefined ? input.sourceId : appState.marketSourceId
        const tag = input.tag !== undefined ? input.tag : appState.marketTag
        const sort = input.sort !== undefined ? input.sort : appState.marketSort
        const text = typeof input.q === 'string' ? input.q : appState.search
        const normSource = sourceId === undefined || sourceId === null || sourceId === '' ? 'all' : String(sourceId)
        const normTag = tag === undefined || tag === null || tag === '' ? 'all' : String(tag)
        const normSort = sort === undefined || sort === null || sort === '' ? 'relevance' : String(sort)
        return [normSource, String(text === undefined || text === null ? '' : text), normTag, normSort].join('|')
    }

    function marketCurrentSignature() {
        return marketQuerySignature({
            sourceId: appState.marketSourceId,
            tag: appState.marketTag,
            sort: appState.marketSort,
            q: appState.search,
        })
    }

    /** True when a request for this exact query is in flight or just succeeded. */
    function marketRequestIsFresh(sig) {
        const signature = String(sig === undefined || sig === null ? '' : sig)
        if (signature === '') return false
        if (marketInFlightSig === signature) return true
        return marketLastSettledSig === signature && (Date.now() - marketLastSettledAt) < 300
    }

    function marketSkillKey(item) {
        if (item === null || typeof item !== 'object') return ''
        const sourceId = typeof item.sourceId === 'string' ? item.sourceId : ''
        const name = typeof item.name === 'string' ? item.name : ''
        if (sourceId !== '' || name !== '') return sourceId + '::' + name
        return typeof item.id === 'string' ? item.id : ''
    }

    /** Append a page to the shared list, de-duplicating by sourceId + name. */
    function marketMergeSkills(previous, page) {
        const merged = Array.isArray(previous) ? previous.slice() : []
        const seen = Object.create(null)
        merged.forEach(function (item) {
            const key = marketSkillKey(item)
            if (key !== '') seen[key] = true
        })
        ;(Array.isArray(page) ? page : []).forEach(function (item) {
            if (item === null || typeof item !== 'object') return
            const key = marketSkillKey(item)
            if (key !== '' && seen[key] === true) return
            if (key !== '') seen[key] = true
            merged.push(item)
        })
        return merged
    }

    /** Re-fetch the current query once, debounced, after discarding a stale page. */
    function marketScheduleCorrection() {
        if (marketCorrectionTimer !== null) clearTimeout(marketCorrectionTimer)
        marketCorrectionTimer = setTimeout(function () {
            marketCorrectionTimer = null
            const sig = marketCurrentSignature()
            if (marketRequestIsFresh(sig)) return
            void loadMarket({
                q: appState.search,
                sourceId: appState.marketSourceId,
                tag: appState.marketTag,
                sort: appState.marketSort,
            })
        }, 300)
    }

    async function loadMarket(query) {
        const input = query !== null && typeof query === 'object'
            ? query
            : { q: typeof query === 'string' ? query : appState.search }
        const params = new URLSearchParams()
        const sourceId = input.sourceId !== undefined ? input.sourceId : appState.marketSourceId
        const tag = input.tag !== undefined ? input.tag : appState.marketTag
        const sort = input.sort !== undefined ? input.sort : appState.marketSort
        const text = typeof input.q === 'string' ? input.q : appState.search
        if (sourceId !== undefined && sourceId !== null && sourceId !== '' && sourceId !== 'all') params.set('sourceId', String(sourceId))
        if (tag !== undefined && tag !== null && tag !== '' && tag !== 'all') params.set('tag', String(tag))
        if (sort !== undefined && sort !== null && sort !== '' && sort !== 'relevance') params.set('sort', String(sort))
        if (text !== '') params.set('q', text)
        if (input.refresh === true) params.set('refresh', '1')
        if (typeof input.offset === 'number') params.set('offset', String(input.offset))
        if (typeof input.limit === 'number') params.set('limit', String(input.limit))
        const append = typeof input.offset === 'number' && input.offset > 0
        const sig = marketQuerySignature({ sourceId: sourceId, tag: tag, sort: sort, q: text })
        const previous = append ? (Array.isArray(appState.marketSkills) ? appState.marketSkills.slice() : []) : null

        marketRequestSeq += 1
        const requestId = marketRequestSeq
        marketLatestRequestId = requestId
        marketInFlightSig = sig
        if (appState.error !== null && typeof appState.error === 'object' && appState.error.scope === 'market') appState.error = null
        appState.marketLoading = true
        rerender()
        try {
            const data = await api('market?' + params.toString())
            /* A newer request owns the shared state; drop this response. */
            if (requestId !== marketLatestRequestId) return null
            /* The query changed after this request started and no replacement
               request has been sent yet: drop the payload and re-fetch. */
            if (sig !== marketCurrentSignature()) {
                marketScheduleCorrection()
                return null
            }
            if (data !== null && typeof data === 'object') {
                const page = Array.isArray(data.skills) ? data.skills : []
                appState.marketSkills = append ? marketMergeSkills(previous, page) : page
                appState.marketTotal = typeof data.total === 'number' ? data.total : appState.marketSkills.length
                appState.marketNextOffset = typeof data.nextOffset === 'number' ? data.nextOffset : null
                if (Array.isArray(data.sources)) appState.sources = data.sources
            }
            marketLastSettledSig = sig
            marketLastSettledAt = Date.now()
            appState.lastErrorToast = null
            return data
        } catch (error) {
            if (requestId !== marketLatestRequestId) return null
            if (sig !== marketCurrentSignature()) {
                marketScheduleCorrection()
                return null
            }
            reportError('market', error, t('error.loadMarket'))
            return null
        } finally {
            if (requestId === marketLatestRequestId) {
                marketInFlightSig = ''
                appState.marketLoading = false
                rerender()
            }
        }
    }

    async function loadUpdates(force) {
        if (appState.loadingUpdates === true && force !== true) return null
        appState.loadingUpdates = true
        rerender()
        try {
            const data = await api('updates')
            if (data !== null && typeof data === 'object') appState.updates = data
            rerender()
            return data
        } catch (error) {
            reportError('updates', error, t('error.checkUpdates'), { silent: true })
            return null
        } finally {
            appState.loadingUpdates = false
            rerender()
        }
    }

    async function checkUpdates(force) {
        if (appState.updates !== null && typeof appState.updates === 'object' && appState.updates.checking === true) return null
        appState.updates = Object.assign({}, appState.updates !== null && typeof appState.updates === 'object' ? appState.updates : {}, { checking: true })
        appState.checkingUpdates = true
        rerender()
        try {
            const data = await api('check-updates', { method: 'POST', body: { force: force === true } })
            if (data !== null && typeof data === 'object') appState.updates = data
            appState.lastErrorToast = null
            const count = data !== null && typeof data === 'object' && Array.isArray(data.updates) ? data.updates.length : 0
            toast(count > 0 ? t('update.toast', { count: count }) : t('update.none'))
            return data
        } catch (error) {
            reportError('updates', error, t('error.checkUpdates'))
            return null
        } finally {
            appState.checkingUpdates = false
            if (appState.updates !== null && typeof appState.updates === 'object') {
                appState.updates = Object.assign({}, appState.updates, { checking: false })
            }
            rerender()
        }
    }

    /* ------------------------------------------------------------------ *
     * Page shell.                                                         *
     * ------------------------------------------------------------------ */

    function installedIssues() {
        const data = appState.installed
        return data !== null && typeof data === 'object' && Array.isArray(data.issues) ? data.issues : []
    }

    function issueAttentionCount() {
        return installedIssues().filter(function (issue) {
            return issue !== null && typeof issue === 'object' && (issue.severity === 'error' || issue.severity === 'warning')
        }).length
    }

    function updateAttentionCount() {
        const updates = appState.updates !== null && typeof appState.updates === 'object'
            ? appState.updates
            : appState.installed !== null && typeof appState.installed === 'object'
                ? appState.installed.updates
                : null
        return updates !== null && typeof updates === 'object' && Array.isArray(updates.updates) ? updates.updates.length : 0
    }

    function sourceErrorCount() {
        return appState.sources.filter(function (source) {
            return source !== null && typeof source === 'object' && source.status === 'error'
        }).length
    }

    function switchTab(tab) {
        if (tab !== 'installed' && tab !== 'market' && tab !== 'sources') return
        setState({ tab: tab, view: 'list', detail: null, rowMenu: null })
        if (tab === 'market' && appState.marketSkills.length === 0 && appState.marketLoading !== true) void loadMarket({ q: appState.search })
        if (tab === 'sources' && appState.sources.length === 0 && appState.sourcesLoading !== true) void loadSources()
    }

    let searchTimer = null

    function onSearchChange(event) {
        const value = event !== null && event !== undefined && event.target !== undefined && event.target !== null ? String(event.target.value) : ''
        if (appState.tab === 'market') {
            /* 顶栏搜索与市场内搜索共用 appState.marketLoading；防抖窗口内
               也保持骨架，直到最新请求落定。 */
            setState({ search: value, marketLoading: true })
            if (searchTimer !== null) clearTimeout(searchTimer)
            searchTimer = setTimeout(function () {
                searchTimer = null
                void loadMarket({ q: appState.search })
            }, 300)
            return
        }
        setState({ search: value })
    }

    function clearSearch() {
        if (searchTimer !== null) {
            clearTimeout(searchTimer)
            searchTimer = null
        }
        if (appState.tab === 'market') {
            setState({
                search: '',
                marketSkills: [],
                marketTotal: 0,
                marketNextOffset: null,
            })
            void loadMarket({ q: '' })
            return
        }
        setState({ search: '' })
    }

    async function refreshCurrent() {
        let result = null
        if (appState.tab === 'market') result = await loadMarket({ q: appState.search, refresh: true })
        else if (appState.tab === 'sources') result = await loadSources(true)
        else result = await loadInstalled(true)
        if (result !== null) toast(t('toast.refreshDone'))
    }

    function renderSearchBox() {
        const placeholder = appState.tab === 'market' ? t('search.market') : t('search.installed')
        return h('div', { className: 'sm-search' },
            h('span', { className: 'sm-search-icon' }, icon('search', 15)),
            h('input', {
                className: 'sm-search-input',
                type: 'search',
                value: appState.search,
                placeholder: placeholder,
                'aria-label': placeholder,
                onChange: onSearchChange,
            }),
            appState.search !== ''
                ? h('button', {
                    type: 'button',
                    className: 'sm-search-clear',
                    'aria-label': t('search.clear'),
                    'data-tip': t('search.clear'),
                    onClick: clearSearch,
                }, icon('x', 14))
                : null)
    }

    function renderPageHeader() {
        const showSearch = appState.tab !== 'sources'
        const checking = appState.checkingUpdates === true || (appState.updates !== null && typeof appState.updates === 'object' && appState.updates.checking === true)
        return h('div', { className: 'sm-page-head' },
            h('div', { className: 'sm-page-head-text' },
                h('h1', { className: 'sm-page-title' }, t('panel.title')),
                h('p', { className: 'sm-page-desc' }, t('panel.description'))),
            h('div', { className: 'sm-toolbar' },
                showSearch ? renderSearchBox() : null,
                h('button', {
                    type: 'button',
                    className: 'sm-btn sm-btn-ghost sm-check-updates',
                    disabled: checking,
                    'data-tip': t('update.checkAll'),
                    onClick: function () { void checkUpdates(true) },
                }, icon('clock', 15), h('span', null, checking ? t('update.checkingShort') : t('update.checkNow'))),
                h('button', {
                    type: 'button',
                    className: 'sm-icon-btn',
                    'aria-label': t('action.refresh'),
                    'data-tip': t('action.refresh'),
                    onClick: function () { void refreshCurrent() },
                }, icon('refresh', 16)),
                appState.tab === 'installed'
                    ? h('button', {
                        type: 'button',
                        className: 'sm-btn sm-btn-secondary',
                        onClick: function () { if (typeof openModal === 'function') openModal('import', {}) },
                    }, icon('import', 15), h('span', null, t('action.import')))
                    : null,
                appState.tab === 'installed'
                    ? h('button', {
                        type: 'button',
                        className: 'sm-btn sm-btn-primary',
                        onClick: function () { if (typeof openModal === 'function') openModal('new', {}) },
                    }, icon('plus', 15), h('span', null, t('action.newSkill')))
                    : h('button', {
                        type: 'button',
                        className: 'sm-btn sm-btn-primary',
                        onClick: function () { if (typeof openModal === 'function') openModal('add-source', {}) },
                    }, icon('plus', 15), h('span', null, t('action.addSource')))))
    }

    function renderTabs() {
        const issueCount = issueAttentionCount()
        const updateCount = updateAttentionCount()
        const installedCount = issueCount > 0 ? issueCount : updateCount
        const sourceCount = sourceErrorCount()
        const items = [
            { id: 'installed', label: t('tab.installed'), count: installedCount, warn: issueCount > 0 },
            { id: 'market', label: t('tab.market'), count: 0, warn: false },
            { id: 'sources', label: t('tab.sources'), count: sourceCount, warn: true },
        ]
        return h('div', { className: 'sm-tabs', role: 'tablist' },
            items.map(function (item) {
                const active = appState.tab === item.id
                return h('button', {
                    key: item.id,
                    type: 'button',
                    role: 'tab',
                    className: cx('sm-tab', active && 'sm-tab-active'),
                    'aria-selected': active,
                    onClick: function () { switchTab(item.id) },
                },
                h('span', null, item.label),
                item.count > 0
                    ? h('span', {
                        className: cx('sm-tab-count', item.warn && 'sm-tab-count-warn'),
                        'data-tip': t('tab.attention', { count: item.count }),
                    }, String(item.count))
                    : null)
            }))
    }

    function renderActiveTab() {
        if (appState.tab === 'market') return typeof renderMarketTab === 'function' ? renderMarketTab() : null
        if (appState.tab === 'sources') return typeof renderSourcesTab === 'function' ? renderSourcesTab() : null
        return typeof renderInstalledTab === 'function' ? renderInstalledTab() : null
    }

    function renderOverlays() {
        return h(Fragment, null,
            typeof renderModalLayer === 'function' ? renderModalLayer() : null,
            typeof renderDiagnosticsDrawer === 'function' ? renderDiagnosticsDrawer() : null,
            typeof renderTooltipLayer === 'function' ? renderTooltipLayer() : null,
            typeof renderToastHost === 'function' ? renderToastHost() : null)
    }

    /* ------------------------------------------------------------------ *
     * List scroll memory and [data-tip] hover delegation.                 *
     * ------------------------------------------------------------------ */

    let tipNode = null

    function closestTipNode(event) {
        const target = event !== null && event !== undefined ? event.target : null
        if (target === null || target === undefined || typeof target.closest !== 'function') return null
        return target.closest('[data-tip]')
    }

    function handlePageTipOver(event) {
        if (typeof smTip !== 'function') return
        const node = closestTipNode(event)
        if (node === null || node === tipNode) return
        tipNode = node
        const label = typeof node.getAttribute === 'function' ? node.getAttribute('data-tip') : ''
        if (label === null || label === undefined || label === '') return
        const props = smTip(label)
        if (props !== null && typeof props === 'object' && typeof props.onMouseEnter === 'function') {
            props.onMouseEnter({ currentTarget: node })
        }
    }

    function handlePageTipOut(event) {
        const node = closestTipNode(event)
        if (node === null) return
        const related = event.relatedTarget
        if (related !== null && related !== undefined && typeof node.contains === 'function' && node.contains(related)) return
        if (tipNode === node) {
            tipNode = null
            if (typeof smHideTooltip === 'function') smHideTooltip()
        }
    }

    function listScrollNode() {
        if (typeof document === 'undefined' || document === null || typeof document.querySelector !== 'function') return null
        const node = document.querySelector('.sm-root .sm-tab-view.sm-scroll')
        return node !== null && node !== undefined && typeof node.scrollTop === 'number' ? node : null
    }

    function rememberListScroll() {
        const node = listScrollNode()
        if (node !== null) appState.listScrollTop = node.scrollTop
    }

    function restoreListScroll() {
        const pending = typeof appState.restoreListScroll === 'number' ? appState.restoreListScroll : null
        if (pending === null) return
        appState.restoreListScroll = null
        const apply = function (attempt) {
            const node = listScrollNode()
            if (node !== null) {
                node.scrollTop = pending
                return
            }
            if (attempt < 2 && typeof requestAnimationFrame === 'function') {
                requestAnimationFrame(function () { apply(attempt + 1) })
            }
        }
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(function () { apply(0) })
        else apply(0)
    }

    function renderPage(props) {
        const source = props !== null && typeof props === 'object' ? props : {}
        if (typeof source.t === 'function') boundT = source.t
        if (typeof source.locale === 'string' && /^(zh|en)/iu.test(source.locale)) appState.locale = source.locale
        if (typeof source.fontSize === 'number' && Number.isFinite(source.fontSize)) appState.fontSize = Math.round(source.fontSize)
        const size = Number.isFinite(appState.fontSize) && appState.fontSize > 0 ? appState.fontSize : DEFAULT_FONT_SIZE
        const rootStyle = { '--sm-fs': size + 'px' }
        const rootListeners = {
            onMouseOver: handlePageTipOver,
            onMouseOut: handlePageTipOut,
            onClickCapture: rememberListScroll,
        }
        if (appState.view === 'detail' && typeof renderDetailPage === 'function') {
            return h('div', Object.assign({ className: 'sm-root sm-root-detail', style: rootStyle }, rootListeners),
                h('div', { className: 'sm-page sm-page-detail' }, renderDetailPage()),
                renderOverlays())
        }
        restoreListScroll()
        return h('div', Object.assign({ className: 'sm-root', style: rootStyle }, rootListeners),
            h('div', { className: 'sm-page' },
                renderPageHeader(),
                renderTabs(),
                h('div', { className: 'sm-tab-view sm-scroll' }, renderActiveTab())),
            renderOverlays())
    }
