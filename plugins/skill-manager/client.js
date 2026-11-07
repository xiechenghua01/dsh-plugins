window.__ModuleLoader__.load({
  id: '@xiechenghua01/dsh-skill-manager',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const useState = React.useState
    const useEffect = React.useEffect
    const useLayoutEffect = React.useLayoutEffect
    const useMemo = React.useMemo
    const useCallback = React.useCallback
    const useRef = React.useRef
    const Fragment = React.Fragment
// ===== 00-prelude.js =====
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
      'loc.custom': '自定义目录',
      'loc.disabledGroup': '已停用',
      'loc.disabledPath': '<root>/.disabled/',
      'loc.groupCount': '{count} 个',
      'loc.preset': '预设内置',
      'loc.projectAgents': '项目共享',
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
      'loc.custom': 'Custom folder',
      'loc.disabledGroup': 'Disabled',
      'loc.disabledPath': '<root>/.disabled/',
      'loc.groupCount': '{count} skills',
      'loc.preset': 'Preset built-in',
      'loc.projectAgents': 'Project shared',
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
// ===== 10-installed.js =====
    /* ================================================================== *
     * 10-installed.js                                                     *
     * Installed tab: banners, filters, location groups, skill rows, menu. *
     * ================================================================== */

    function findInstalledSkill(id) {
        const data = appState.installed
        if (data === null || typeof data !== 'object' || !Array.isArray(data.skills)) return null
        return data.skills.find(function (skill) {
            return skill !== null && typeof skill === 'object' && skill.id === id
        }) || null
    }

    function patchInstalledSkill(skill) {
        const data = appState.installed
        if (data === null || typeof data !== 'object' || !Array.isArray(data.skills)) return
        if (skill === null || typeof skill !== 'object') return
        const index = data.skills.findIndex(function (item) {
            return item !== null && typeof item === 'object' && item.id === skill.id
        })
        if (index >= 0) data.skills[index] = skill
        else data.skills.push(skill)
    }

    function skillMatchesQuery(skill, query) {
        if (query === '') return true
        const fields = [skill.name, skill.description, skill.whenToUse, skill.path, skill.rootPath]
        return fields.some(function (field) {
            return typeof field === 'string' && field.toLowerCase().includes(query)
        })
    }

    function sortInstalledSkills(items, sort) {
        const copy = items.slice()
        if (sort === 'name') {
            copy.sort(function (left, right) {
                return String(left.name || '').localeCompare(String(right.name || ''))
            })
        } else if (sort === 'modified') {
            copy.sort(function (left, right) {
                return (Number(right.mtime) || 0) - (Number(left.mtime) || 0)
            })
        }
        return copy
    }

    function installedFilterMatches(skill, filter) {
        if (filter === 'all') return true
        if (filter === 'disabled') return skill.status === 'disabled'
        return locationFilterKey(skill.location) === filter
    }

    function selectInstalledFilter(filter) {
        setState({
            filter: filter,
            disabledExpanded: filter === 'disabled' ? true : appState.disabledExpanded,
        })
    }

    function setInstalledSort(sort) {
        setState({ sort: sort })
    }

    function toggleDisabledGroup() {
        if (appState.filter === 'disabled') return
        setState({ disabledExpanded: appState.disabledExpanded !== true })
    }

    function clearInstalledSearch() {
        setState({ search: '' })
    }

    async function toggleSkillEnabled(skill, enabled, options) {
        const opts = options !== null && typeof options === 'object' ? options : {}
        if (skill === null || typeof skill !== 'object') return
        if (skill.writable === false) {
            toast(t('error.readonly'), { tone: 'error' })
            return
        }
        if (appState.busySkillId === skill.id) return
        appState.busySkillId = skill.id
        rerender()
        try {
            const data = await api('skill/state', {
                method: 'POST',
                body: { path: skill.path, enabled: enabled === true },
            })
            const updated = data !== null && typeof data === 'object' && data.skill !== null && typeof data.skill === 'object'
                ? data.skill
                : Object.assign({}, skill, { status: enabled === true ? 'active' : 'disabled' })
            patchInstalledSkill(updated)
            if (opts.silent !== true) {
                toast(enabled === true ? t('toast.enabled', { name: skill.name }) : t('toast.disabled', { name: skill.name }), {
                    tone: 'ok',
                    actionLabel: t('action.undo'),
                    onAction: function () {
                        void toggleSkillEnabled(updated, enabled !== true, { silent: true })
                    },
                })
            }
            await loadInstalled(true)
        } catch (error) {
            toast(t('error.toggleState', {
                reason: error !== null && typeof error === 'object' && error.message ? error.message : t('error.generic'),
            }), { tone: 'error' })
        } finally {
            appState.busySkillId = null
            rerender()
        }
    }

    function openRowMenu(event, skill) {
        if (event !== null && event !== undefined) {
            if (typeof event.stopPropagation === 'function') event.stopPropagation()
            if (typeof event.preventDefault === 'function') event.preventDefault()
        }
        if (skill === null || typeof skill !== 'object') {
            toast(t('error.notFound'), { tone: 'error' })
            return
        }
        let rect = null
        if (event !== null && event !== undefined && event.currentTarget !== null && event.currentTarget !== undefined && typeof event.currentTarget.getBoundingClientRect === 'function') {
            rect = event.currentTarget.getBoundingClientRect()
        }
        const width = 208
        const height = 258
        const viewportWidth = typeof window !== 'undefined' && window !== null && typeof window.innerWidth === 'number' ? window.innerWidth : 1024
        const viewportHeight = typeof window !== 'undefined' && window !== null && typeof window.innerHeight === 'number' ? window.innerHeight : 768
        const anchorX = rect !== null ? rect.right - width : viewportWidth - width - 24
        const anchorY = rect !== null ? rect.bottom + 4 : 120
        const x = Math.max(8, Math.min(viewportWidth - width - 8, anchorX))
        const y = Math.max(8, Math.min(viewportHeight - height - 8, anchorY))
        setState({ rowMenu: { id: skill.id, x: x, y: y } })
    }

    function closeRowMenu() {
        if (appState.rowMenu !== null) setState({ rowMenu: null })
    }

    function menuButton(label, onClick, options) {
        const opts = options !== null && typeof options === 'object' ? options : {}
        return h('button', {
            type: 'button',
            role: 'menuitem',
            className: cx('sm-menu-item', opts.danger === true && 'sm-menu-item-danger'),
            disabled: opts.disabled === true,
            'data-tip': opts.disabled === true ? t('badge.readonlyTip') : undefined,
            onClick: onClick,
        },
        opts.iconName ? icon(opts.iconName, 15) : null,
        h('span', null, label))
    }

    function renderRowMenu() {
        const menu = appState.rowMenu
        if (menu === null || typeof menu !== 'object') return null
        const skill = findInstalledSkill(menu.id)
        if (skill === null) return null
        const disabled = skill.status === 'disabled'
        const readonly = skill.writable === false
        const isMarket = skill.market !== null && typeof skill.market === 'object' && typeof skill.market.sourceId === 'string'
        const run = function (action) {
            return function (event) {
                if (event !== null && event !== undefined && typeof event.stopPropagation === 'function') event.stopPropagation()
                closeRowMenu()
                if (typeof action === 'function') action()
            }
        }
        return h(Fragment, null,
            h('div', {
                className: 'sm-menu-backdrop',
                style: { position: 'fixed', inset: 0 },
                onClick: run(null),
                onContextMenu: function (event) {
                    event.preventDefault()
                    closeRowMenu()
                },
            }),
            h('div', {
                className: 'sm-menu',
                role: 'menu',
                style: { position: 'fixed', left: menu.x + 'px', top: menu.y + 'px' },
            },
            menuButton(t('action.viewDetails'), run(function () {
                rememberListScroll()
                setState({ view: 'detail', detail: { kind: 'installed', id: skill.id } })
            }), { iconName: 'file' }),
            menuButton(t('action.editContent'), run(function () {
                rememberListScroll()
                setState({ view: 'detail', detail: { kind: 'installed', id: skill.id, edit: true } })
            }), { iconName: 'edit', disabled: readonly }),
            skill.path ? menuButton(t('action.openFolder'), run(function () { openFolder(skill.path) }), { iconName: 'folder' }) : null,
            skill.path ? menuButton(t('action.copyPath'), run(function () { copyPath(skill.path) }), { iconName: 'copy' }) : null,
            h('div', { className: 'sm-menu-sep' }),
            menuButton(disabled ? t('action.enable') : t('action.disable'), run(function () {
                void toggleSkillEnabled(skill, disabled)
            }), { iconName: 'power', disabled: readonly }),
            menuButton(isMarket ? t('action.uninstall') : t('action.delete'), run(function () {
                if (typeof openModal === 'function') openModal(isMarket ? 'uninstall' : 'delete', { skill: skill, id: skill.id, name: skill.name })
            }), { iconName: 'trash', danger: true, disabled: readonly })))
    }

    function renderInstalledSkeleton() {
        const rows = [0, 1, 2, 3, 4, 5].map(function (index) {
            return h('div', { key: 'skeleton-row-' + String(index), className: 'sm-skeleton-row' },
                h('div', { className: 'sm-skeleton sm-skeleton-icon' }),
                h('div', { className: 'sm-skeleton-lines' },
                    h('div', { className: 'sm-skeleton sm-skeleton-line sm-skeleton-line-lg' }),
                    h('div', { className: 'sm-skeleton sm-skeleton-line' })))
        })
        return h('div', { className: 'sm-installed sm-installed-loading', 'aria-busy': 'true', 'aria-label': t('state.loading') },
            h('div', { className: 'sm-skeleton sm-skeleton-banner' }),
            h('div', { className: 'sm-skeleton-filters' },
                h('div', { className: 'sm-skeleton sm-skeleton-chip' }),
                h('div', { className: 'sm-skeleton sm-skeleton-chip' }),
                h('div', { className: 'sm-skeleton sm-skeleton-chip' }),
                h('div', { className: 'sm-skeleton sm-skeleton-chip' })),
            h('div', { className: 'sm-skeleton-rows' }, rows),
            h('div', { className: 'sm-sr-only' }, t('state.loadingInstalled')))
    }

    function renderInstalledError(error) {
        const unauthorized = error !== null && typeof error === 'object' && error.code === 'E_UNAUTHORIZED'
        return h('div', { className: 'sm-empty sm-empty-error', 'aria-label': t('state.error') },
            h('div', { className: 'sm-empty-icon' }, icon('alert', 40)),
            h('div', { className: 'sm-empty-title' }, unauthorized ? t('state.unauthorized') : t('error.loadInstalled')),
            h('div', { className: 'sm-empty-body' }, error !== null && typeof error === 'object' && error.message ? error.message : t('error.retryHint')),
            h('div', { className: 'sm-empty-actions' },
                h('button', {
                    type: 'button',
                    className: 'sm-btn sm-btn-primary',
                    onClick: function () { void loadInstalled(true) },
                }, t('action.retry'))))
    }

    function renderInstalledBanners(data, updates, issues) {
        const banners = []
        const updateState = updates !== null && typeof updates === 'object' ? updates : {}
        const updateItems = Array.isArray(updateState.updates) ? updateState.updates : []
        const updateErrors = Array.isArray(updateState.errors) ? updateState.errors : []

        if (updateState.checking === true) {
            banners.push(h('div', { key: 'banner-checking', className: 'sm-banner sm-banner-update', 'aria-label': t('state.loadingUpdates'), title: t('update.checking') },
                h('div', { className: 'sm-banner-main' },
                    icon('clock', 16),
                    h('span', null, t('banner.checking')))))
        } else if (updateErrors.length > 0) {
            banners.push(h('div', { key: 'banner-update-error', className: 'sm-banner sm-banner-warn' },
                h('div', { className: 'sm-banner-main' },
                    icon('alert', 16),
                    h('span', null, t('update.failed'))),
                h('button', {
                    type: 'button',
                    className: 'sm-btn sm-btn-ghost sm-btn-sm',
                    onClick: function () { void checkUpdates(true) },
                }, t('action.retry'))))
        } else if (updateItems.length > 0) {
            const list = updateItems.map(function (item, index) {
                const name = item !== null && typeof item === 'object' && item.name ? String(item.name) : ''
                const current = item !== null && typeof item === 'object' ? versionLabel(item.current) : ''
                const available = item !== null && typeof item === 'object' ? versionLabel(item.available) : ''
                return h('code', {
                    key: 'update-' + String(index) + '-' + name,
                    className: 'sm-mono sm-banner-code',
                    title: item !== null && typeof item === 'object' && item.localModified === true ? t('update.localModified') : undefined,
                }, t('update.item', { name: name, current: current, available: available }))
            })
            banners.push(h('div', { key: 'banner-updates', className: 'sm-banner sm-banner-update' },
                h('div', { className: 'sm-banner-main' },
                    icon('arrow-up', 16),
                    h('span', { className: 'sm-banner-title', 'data-tip': t('update.count', { count: updateItems.length }) }, t('update.banner', { count: updateItems.length })),
                    h('span', { className: 'sm-banner-items' }, list)),
                h('button', {
                    type: 'button',
                    className: 'sm-btn sm-btn-ghost sm-btn-sm',
                    onClick: function () { void checkUpdates(true) },
                }, t('action.checkUpdates'))))
        } else if (updateState.checkedAt) {
            banners.push(h('div', { key: 'banner-uptodate', className: 'sm-banner sm-banner-quiet' },
                h('div', { className: 'sm-banner-main' },
                    icon('check', 16),
                    h('span', null, t('banner.upToDate') + ' · ' + t('update.lastChecked', { time: fmtTime(updateState.checkedAt) })))))
        }

        const issueList = issues.filter(function (issue) {
            return issue !== null && typeof issue === 'object' && (issue.severity === 'error' || issue.severity === 'warning')
        })
        if (issueList.length > 0) {
            const errors = issueList.filter(function (issue) { return issue.severity === 'error' }).length
            const warnings = issueList.length - errors
            const summary = t('diag.issuesCount', { errors: errors, warnings: warnings })
            const summaryTip = t('diag.error') + ': ' + String(errors) + ' · ' + t('diag.warning') + ': ' + String(warnings)
            banners.push(h('div', { key: 'banner-issues', className: 'sm-banner sm-banner-warn' },
                h('div', { className: 'sm-banner-main' },
                    icon('alert', 16),
                    h('span', null, t('banner.issues', { count: issueList.length })),
                    h('span', { className: 'sm-banner-meta', 'data-tip': summaryTip }, summary)),
                h('button', {
                    type: 'button',
                    className: 'sm-btn sm-btn-ghost sm-btn-sm',
                    'aria-label': t('diag.open'),
                    'data-tip': t('diag.viewReasons'),
                    title: t('diag.title'),
                    onClick: function () {
                        if (typeof openDiagnosticsDrawer === 'function') openDiagnosticsDrawer()
                        else toast(t('diag.none'))
                    },
                }, t('banner.viewIssues') + ' →')))
        }

        const locations = data !== null && typeof data === 'object' && Array.isArray(data.locations) ? data.locations : []
        locations.forEach(function (location) {
            if (location === null || typeof location !== 'object' || location.readable !== false) return
            banners.push(h('div', { key: 'banner-location-' + String(location.id), className: 'sm-banner sm-banner-error', 'aria-label': t('error.readLocation', { path: String(location.path || '') }) },
                h('div', { className: 'sm-banner-main' },
                    icon('alert', 16),
                    h('span', null, t('banner.unreadable', { path: String(location.path || '') }))),
                h('button', {
                    type: 'button',
                    className: 'sm-btn sm-btn-ghost sm-btn-sm',
                    onClick: function () { void loadInstalled(true) },
                }, t('action.retry'))))
        })

        if (appState.error !== null && typeof appState.error === 'object' && appState.error.scope === 'installed') {
            banners.push(h('div', { key: 'banner-load-error', className: 'sm-banner sm-banner-error' },
                h('div', { className: 'sm-banner-main' },
                    icon('alert', 16),
                    h('span', null, appState.error.message || t('error.loadInstalled'))),
                h('button', {
                    type: 'button',
                    className: 'sm-btn sm-btn-ghost sm-btn-sm',
                    onClick: function () { void loadInstalled(true) },
                }, t('action.retry'))))
        }

        return banners.length > 0 ? h('div', { className: 'sm-banners' }, banners) : null
    }

    function renderInstalledFilters() {
        const chips = [
            { key: 'all', label: t('filter.all') },
            { key: 'project', label: t('filter.project') },
            { key: 'projectShared', label: t('filter.projectShared') },
            { key: 'custom', label: t('filter.custom') },
            { key: 'user', label: t('filter.user') },
            { key: 'userShared', label: t('filter.userShared') },
            { key: 'builtin', label: t('filter.builtin') },
            { key: 'disabled', label: t('filter.disabled') },
        ]
        return h('div', { className: 'sm-filter-row' },
            h('div', { className: 'sm-chips', role: 'radiogroup', 'aria-label': t('filter.label') },
                chips.map(function (chip) {
                    const active = appState.filter === chip.key
                    return h('button', {
                        key: chip.key,
                        type: 'button',
                        role: 'radio',
                        'aria-checked': active,
                        className: cx('sm-chip', active && 'sm-chip-active'),
                        onClick: function () { selectInstalledFilter(chip.key) },
                    }, chip.label)
                })),
            h('label', { className: 'sm-sort' },
                h('span', { className: 'sm-sort-label' }, t('sort.label')),
                h('select', {
                    className: 'sm-select',
                    value: appState.sort,
                    'aria-label': t('sort.label'),
                    onChange: function (event) { setInstalledSort(event.target.value) },
                },
                h('option', { value: 'location' }, t('sort.location')),
                h('option', { value: 'name' }, t('sort.name')),
                h('option', { value: 'modified' }, t('sort.modified')))))
    }

    function renderLocationGroup(location, meta, items) {
        const writable = location.writable !== false && (meta === null || meta.writable !== false)
        const exists = location.exists !== false
        const rank = typeof location.rank === 'number' ? location.rank : meta !== null ? meta.rank : 0
        const path = typeof location.path === 'string' ? location.path : ''
        const canOpen = exists && path !== '' && location.absPath !== ''
        return h('section', {
            key: location.id,
            className: 'sm-group',
            'aria-label': locationLabel(location),
        },
        h('div', { className: 'sm-group-head' },
            h('div', { className: 'sm-group-head-left' },
                h('span', { className: 'sm-group-title' }, locationLabel(location)),
                path !== '' ? h('span', { className: 'sm-group-path sm-mono', title: path }, path) : null,
                h('span', { className: 'sm-badge sm-mono' }, t('loc.rank', { rank: rank })),
                h('span', { className: 'sm-group-count' }, t('loc.groupCount', { count: items.length }))),
            h('div', { className: 'sm-group-head-right' },
                writable !== true
                    ? h('span', { className: 'sm-badge', 'data-tip': t('badge.readonlyTip') }, t('badge.readonly'))
                    : null,
                canOpen
                    ? h('button', {
                        type: 'button',
                        className: 'sm-btn sm-btn-ghost sm-btn-sm',
                        onClick: function (event) {
                            if (event !== null && event !== undefined && typeof event.stopPropagation === 'function') event.stopPropagation()
                            openFolder(path)
                        },
                    }, t('action.openFolder'))
                    : null)),
        h('div', { className: 'sm-rows', role: 'list' }, items.map(function (skill) {
            return renderInstalledSkillRow(skill, location)
        })))
    }

    function renderInstalledSkillRow(skill, location) {
        const disabled = skill.status === 'disabled'
        const readonly = skill.writable === false
        const busy = appState.busySkillId === skill.id
        const updateVersion = skillUpdateVersion(skill)
        const version = skill.market !== null && typeof skill.market === 'object' && skill.market.version
            ? versionLabel(skill.market.version)
            : ''
        const tags = []
        if (updateVersion) {
            tags.push(renderUpgradeBadge(updateVersion, {
                key: 'upgrade',
                onClick: function (event) {
                    event.stopPropagation()
                    if (typeof openModal === 'function') openModal('update', { skill: skill, id: skill.id })
                },
            }))
        }
        tags.push(badge(locationLabel(location !== null && location !== undefined ? location : skill.location), null, skill.location, 'loc'))
        if (skill.invocation !== null && typeof skill.invocation === 'object' && skill.invocation.modelInvocable === true) {
            tags.push(badge(t('badge.model'), null, t('badge.modelTip'), 'model'))
        }
        if (skill.invocation !== null && typeof skill.invocation === 'object' && skill.invocation.userInvocable === true) {
            tags.push(badge(t('badge.user'), null, t('badge.userTip'), 'user'))
        }
        if (readonly) tags.push(badge(t('badge.builtin'), null, t('badge.readonlyTip'), 'builtin'))
        if (skill.status === 'shadowed') {
            tags.push(badge(t('badge.shadowed'), 'warn', t('badge.shadowedTip', { path: skill.shadowedBy || '' }), 'shadowed'))
        }
        if (disabled) tags.push(badge(t('badge.disabled'), null, t('state.disabled'), 'disabled'))
        if (skill.status === 'invalid') tags.push(badge(t('badge.invalid'), 'error', t('state.invalid'), 'invalid'))
        const visibleTags = tags.slice(0, 4)
        const openDetail = function () {
            if (busy) return
            rememberListScroll()
            setState({ view: 'detail', detail: { kind: 'installed', id: skill.id } })
        }
        return h('div', {
            key: skill.id,
            className: cx('sm-row', 'sm-skill-row', disabled && 'sm-row-disabled', appState.highlightId === skill.id && 'sm-row-highlight'),
            tabIndex: 0,
            role: 'listitem',
            'data-skill-id': skill.id,
            onClick: openDetail,
            onKeyDown: function (event) {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    openDetail()
                }
            },
        },
        h('div', { className: 'sm-row-main' },
            renderSkillIconBox(skill),
            h('div', { className: 'sm-row-text' },
                h('div', { className: 'sm-row-title' },
                    h('span', { className: cx('sm-row-name', 'sm-mono', disabled && 'sm-row-name-disabled') }, String(skill.name || '')),
                    version !== '' ? h('span', { className: 'sm-row-version sm-mono' }, version) : null,
                    h('div', { className: 'sm-row-badges' }, visibleTags)),
                h('div', { className: 'sm-row-desc' }, typeof skill.description === 'string' && skill.description !== ''
                    ? skill.description
                    : t('state.emptyDescription')))),
        h('div', { className: 'sm-row-tail', onClick: function (event) { event.stopPropagation() } },
            readonly
                ? h('span', { className: 'sm-row-builtin', 'data-tip': t('status.readonly') }, t('badge.builtin'))
                : h('button', {
                    type: 'button',
                    className: cx('sm-switch', disabled && 'sm-switch-off'),
                    role: 'switch',
                    'aria-checked': disabled ? 'false' : 'true',
                    'aria-label': disabled ? t('action.enableSkill') : t('action.disableSkill'),
                    'data-tip': disabled ? t('action.enableSkill') : t('action.disableSkill'),
                    disabled: busy,
                    onClick: function (event) {
                        event.stopPropagation()
                        void toggleSkillEnabled(skill, disabled)
                    },
                }, h('span', { className: 'sm-switch-thumb' })),
            h('button', {
                type: 'button',
                className: 'sm-icon-btn sm-row-more',
                'aria-label': t('action.more'),
                'data-tip': t('action.more'),
                onClick: function (event) { openRowMenu(event, skill) },
            }, icon('more', 16))))
    }

    function renderDisabledGroup(items) {
        const expanded = appState.filter === 'disabled' || appState.disabledExpanded === true
        const canToggle = appState.filter !== 'disabled'
        return h('section', { key: 'disabled-group', className: 'sm-group sm-group-disabled' },
            h('div', {
                className: cx('sm-group-head', canToggle && 'sm-group-head-toggle'),
                role: canToggle ? 'button' : undefined,
                tabIndex: canToggle ? 0 : undefined,
                'aria-expanded': expanded,
                onClick: canToggle ? toggleDisabledGroup : undefined,
                onKeyDown: canToggle
                    ? function (event) {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            toggleDisabledGroup()
                        }
                    }
                    : undefined,
            },
            h('div', { className: 'sm-group-head-left' },
                icon(expanded ? 'chevron-down' : 'chevron-right', 14),
                h('span', { className: 'sm-group-title' }, t('loc.disabledGroup')),
                h('span', { className: 'sm-group-path sm-mono' }, t('loc.disabledPath')),
                h('span', { className: 'sm-badge' }, t('loc.groupCount', { count: items.length }))),
            canToggle
                ? h('button', {
                    type: 'button',
                    className: 'sm-btn sm-btn-ghost sm-btn-sm',
                    onClick: function (event) {
                        event.stopPropagation()
                        toggleDisabledGroup()
                    },
                }, expanded ? t('action.collapse') : t('action.expand'))
                : null),
            expanded
                ? h('div', { className: 'sm-rows', role: 'list' }, items.map(function (skill) {
                    return renderInstalledSkillRow(skill, locationById(skill.location))
                }))
                : null)
    }

    function renderInstalledEmpty(kind, query) {
        if (kind === 'search') {
            return h('div', { className: 'sm-empty' },
                h('div', { className: 'sm-empty-icon' }, icon('search', 40)),
                h('div', { className: 'sm-empty-title' }, t('empty.search', { query: query })),
                h('div', { className: 'sm-empty-actions' },
                    h('button', {
                        type: 'button',
                        className: 'sm-btn sm-btn-secondary',
                        onClick: clearInstalledSearch,
                    }, t('action.clearSearch'))))
        }
        if (kind === 'filter') {
            return h('div', { className: 'sm-empty' },
                h('div', { className: 'sm-empty-icon' }, icon('folder', 40)),
                h('div', { className: 'sm-empty-title' }, t('empty.filter')),
                h('div', { className: 'sm-empty-actions' },
                    h('button', {
                        type: 'button',
                        className: 'sm-btn sm-btn-secondary',
                        onClick: function () { setState({ filter: 'all' }) },
                    }, t('action.clearFilter'))))
        }
        return h('div', { className: 'sm-empty sm-empty-installed' },
            h('div', { className: 'sm-empty-icon' }, icon('skill', 48)),
            h('div', { className: 'sm-empty-title' }, t('empty.installed.title')),
            h('div', { className: 'sm-empty-body' }, t('empty.installed.body')),
            h('div', { className: 'sm-empty-actions' },
                h('button', {
                    type: 'button',
                    className: 'sm-btn sm-btn-primary',
                    onClick: function () { switchTab('market') },
                }, t('empty.marketAction')),
                h('button', {
                    type: 'button',
                    className: 'sm-btn sm-btn-secondary',
                    onClick: function () { if (typeof openModal === 'function') openModal('new', {}) },
                }, t('empty.newAction')),
                h('button', {
                    type: 'button',
                    className: 'sm-btn sm-btn-secondary',
                    onClick: function () { if (typeof openModal === 'function') openModal('import', {}) },
                }, t('empty.importAction'))))
    }

    function renderInstalledTab() {
        const data = appState.installed
        if (data === null || typeof data !== 'object') {
            if (appState.error !== null && typeof appState.error === 'object' && appState.error.scope === 'installed' && appState.loadingInstalled !== true) {
                return renderInstalledError(appState.error)
            }
            return renderInstalledSkeleton()
        }

        const locations = Array.isArray(data.locations) ? data.locations : []
        const skills = Array.isArray(data.skills) ? data.skills : []
        const issues = Array.isArray(data.issues) ? data.issues : []
        const updates = appState.updates !== null && typeof appState.updates === 'object' ? appState.updates : data.updates
        const query = String(appState.search || '').trim().toLowerCase()
        const filter = appState.filter
        const matchesQuery = function (skill) { return skillMatchesQuery(skill, query) }

        const activeSkills = skills.filter(function (skill) {
            return skill !== null && typeof skill === 'object'
                && skill.status !== 'disabled'
                && matchesQuery(skill)
                && installedFilterMatches(skill, filter === 'disabled' ? 'all' : filter)
        })
        const disabledSkills = skills.filter(function (skill) {
            return skill !== null && typeof skill === 'object' && skill.status === 'disabled' && matchesQuery(skill)
        })
        const visibleActive = filter === 'disabled' ? [] : activeSkills
        const showDisabled = filter === 'all' || filter === 'disabled'
        const visibleDisabled = showDisabled ? disabledSkills : []
        const sortedActive = sortInstalledSkills(visibleActive, appState.sort)

        const groups = []
        if (filter !== 'disabled') {
            LOCATION_ORDER.forEach(function (meta) {
                const items = sortedActive.filter(function (skill) { return skill.location === meta.id })
                if (items.length === 0) return
                const found = locations.find(function (location) {
                    return location !== null && typeof location === 'object' && location.id === meta.id
                })
                const location = found !== undefined
                    ? found
                    : Object.assign({}, meta, {
                        path: '',
                        absPath: '',
                        exists: true,
                        readable: true,
                        skillCount: items.length,
                        disabledCount: 0,
                        presets: [],
                    })
                groups.push(renderLocationGroup(location, meta, items))
            })
        }
        if (showDisabled && visibleDisabled.length > 0) {
            groups.push(renderDisabledGroup(sortInstalledSkills(visibleDisabled, appState.sort)))
        }

        let content = null
        if (skills.length === 0) {
            content = renderInstalledEmpty('installed', '')
        } else if (query !== '' && visibleActive.length === 0 && visibleDisabled.length === 0) {
            content = renderInstalledEmpty('search', appState.search)
        } else if (groups.length === 0) {
            content = renderInstalledEmpty('filter', '')
        } else {
            content = h('div', { className: 'sm-groups' }, groups)
        }

        return h('div', { className: 'sm-installed' },
            renderInstalledBanners(data, updates, issues),
            renderInstalledFilters(),
            content,
            renderRowMenu())
    }
// ===== 20-market.js =====
    /* ------------------------------------------------------------------ *
     * C2 · 市场 Tab                                                       *
     *                                                                    *
     * 数据来源：appState.marketSkills / appState.sources / appState.installed
     * 所有跨 Tab 的状态写入都走 setState，避免直接操作 DOM。               *
     * ------------------------------------------------------------------ */

    const SM_MARKET_PAGE_SIZE = 20

    /* 市场请求的瞬时状态（不承载数据）。搜索词、筛选、分页游标与列表全部以
       appState.search / appState.market* 为唯一事实源。 */
    let smMarketLoaded = false
    let smMarketLoading = false
    let smMarketAppending = false
    let smMarketTimer = null
    let smMarketTimerSig = ''
    let smMarketLastSig = ''

    function smMarketErrorText(err) {
        if (err === null || err === undefined) return ''
        if (typeof err === 'string') return err
        if (typeof err === 'object') {
            if (typeof err.message === 'string' && err.message !== '') return err.message
            if (typeof err.code === 'string' && err.code !== '') return err.code
        }
        return String(err)
    }

    function smMarketSig() {
        /* 来源增删改由 smMarketInvalidate 显式失效，不把 sources 计入 sig，
           避免首次加载 sources 后多发一次请求。签名算法与 00-prelude 的
           marketQuerySignature 完全一致，供 requestId 校验与去重复用。 */
        return marketQuerySignature({
            sourceId: appState.marketSourceId,
            q: appState.search,
            tag: appState.marketTag,
            sort: appState.marketSort,
        })
    }

    function smMarketSourceList() {
        /* appState.sources 是唯一事实源；即使为空也不回退旧缓存。 */
        return Array.isArray(appState.sources) ? appState.sources : []
    }

    function smMarketEnabledSources(sources) {
        return (Array.isArray(sources) ? sources : []).filter(function (src) {
            return src !== null && typeof src === 'object' && src.enabled !== false
        })
    }

    function smMarketTotalValue(enabledSources) {
        if (typeof appState.marketTotal === 'number' && appState.marketTotal > 0) return appState.marketTotal
        let sum = 0
        let hasCount = false
        ;(Array.isArray(enabledSources) ? enabledSources : []).forEach(function (src) {
            if (src !== null && typeof src === 'object' && typeof src.skillCount === 'number') {
                sum += src.skillCount
                hasCount = true
            }
        })
        if (hasCount && sum > 0) return sum
        return smMarketSharedSkills().length
    }

    function smMarketNextValue() {
        return typeof appState.marketNextOffset === 'number' ? appState.marketNextOffset : null
    }

    /* 共享缓存 appState.marketSkills 是唯一事实源：顶栏搜索/刷新（00-prelude.js）
       与市场分页都读写同一份列表。 */
    function smMarketSharedSkills() {
        return Array.isArray(appState.marketSkills) ? appState.marketSkills : []
    }

    function smMarketCurrentSkills() {
        /* 服务端已按 q/sourceId/tag/sort 过滤并排序，渲染直接用共享列表，
           避免第二套本地过滤与分页结果不一致。 */
        return smMarketSharedSkills()
    }

    function smMarketTopTags(skills) {
        const counts = Object.create(null)
        ;(Array.isArray(skills) ? skills : []).forEach(function (item) {
            if (item === null || typeof item !== 'object' || !Array.isArray(item.tags)) return
            item.tags.forEach(function (tag) {
                if (typeof tag === 'string' && tag !== '') counts[tag] = (counts[tag] || 0) + 1
            })
        })
        const tags = Object.keys(counts).sort(function (a, b) {
            return (counts[b] - counts[a]) || a.localeCompare(b)
        })
        const selected = appState.marketTag
        if (selected !== 'all' && tags.indexOf(selected) < 0) tags.unshift(selected)
        return tags.slice(0, 12)
    }

    function smMarketInstalledInfo(item) {
        if (item === null || typeof item !== 'object') return null
        /* 优先读已安装列表（安装/更新后 C3 会刷新它），再退回市场条目自带的状态。
           同名但来源不同的安装记录绝不能关联到本条目；只有安装记录缺 sourceId
           时才按 name 回退。 */
        const installed = appState.installed !== null && typeof appState.installed === 'object' &&
            Array.isArray(appState.installed.skills) ? appState.installed.skills : []
        let exact = null
        let fallback = null
        for (let i = 0; i < installed.length; i += 1) {
            const skill = installed[i]
            if (skill === null || typeof skill !== 'object') continue
            if (skill.name !== item.name) continue
            if (skill.status === 'disabled') continue
            const recordSource = skill.market !== null && typeof skill.market === 'object' &&
                typeof skill.market.sourceId === 'string' ? skill.market.sourceId : ''
            if (recordSource !== '') {
                if (recordSource === item.sourceId) {
                    exact = skill
                    break
                }
                continue
            }
            if (fallback === null) fallback = skill
        }
        const found = exact !== null ? exact : fallback
        if (found !== null) {
            const market = found.market !== null && typeof found.market === 'object' ? found.market : {}
            return {
                version: typeof market.version === 'string' ? market.version : '',
                location: found.location,
                /* 最新检查结果优先：checkedAt>0 且无条目时必须为空，不能回退旧字段。 */
                updateAvailable: skillUpdateVersion(found),
            }
        }
        if (item.installed !== null && typeof item.installed === 'object') {
            const embedded = {
                name: item.name,
                location: item.installed.location,
                market: { updateAvailable: item.installed.updateAvailable },
            }
            return {
                version: typeof item.installed.version === 'string' ? item.installed.version : (item.version || ''),
                location: item.installed.location,
                updateAvailable: skillUpdateVersion(embedded),
            }
        }
        return null
    }

    /* 与 00-prelude.js 的 skillIconName 保持一致，确保同一技能在市场与已安装里图标相同。 */
    function smMarketIconName(item, info) {
        const text = String(item !== null && typeof item === 'object' && item.name ? item.name : '').toLowerCase()
        if (text.includes('review') || text.includes('audit') || text.includes('security')) return 'shield'
        if (text.includes('sql') || text.includes('database') || text.includes('query') ||
            text.includes('postgres') || text.includes('clickhouse')) return 'database'
        if (text.includes('git') || text.includes('commit') || text.includes('pull-request')) return 'git'
        if (text.includes('pdf') || text.includes('doc') || text.includes('markdown')) return 'file'
        if (text.includes('image') || text.includes('design') || text.includes('frontend')) return 'image'
        if (text.includes('script') || text.includes('python') || text.includes('bash')) return 'script'
        if (text.includes('plugin') || text.includes('arch') || text.includes('cordis')) return 'puzzle'
        if (text.includes('creator') || text.includes('skill')) return 'skill'
        const loc = info !== null && info !== undefined && typeof info === 'object' ? info.location : ''
        if (loc === 'preset' || loc === 'bundled') return 'package'
        return 'folder'
    }

    function smMarketUpgradeGlyph() {
        return h('svg', {
            width: 13,
            height: 13,
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: 1.8,
            'aria-hidden': 'true',
            focusable: 'false',
        },
            h('circle', { cx: 12, cy: 12, r: 9 }),
            h('path', {
                d: 'M8.5 11.5L12 8m0 0l3.5 3.5M12 8v8',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
            })
        )
    }

    /* 所有共享状态的写入（替换 / 追加 / 错误 / 加载态）都由 00-prelude 的
       loadMarket 在 requestId + 查询签名校验之后完成；这里只负责发起请求与
       维护按钮级瞬时状态。 */
    async function smFetchMarket(options) {
        const opts = options !== null && typeof options === 'object' ? options : {}
        const append = opts.append === true
        if (smMarketLoading) return
        const sig = smMarketSig()
        const offset = append ? smMarketNextValue() : 0
        if (append && offset === null) return
        smMarketLoading = true
        smMarketAppending = append
        /* 先登记本次 sig，避免渲染调度在请求期间重复补发。失败时同样保留，
           由错误条提供显式重试，而不是自动循环重试。 */
        smMarketLastSig = sig
        setState({})
        try {
            const result = await loadMarket({
                sourceId: appState.marketSourceId,
                q: String(appState.search || ''),
                tag: appState.marketTag,
                sort: appState.marketSort,
                offset: offset,
                limit: SM_MARKET_PAGE_SIZE,
                refresh: opts.refresh === true,
            })
            if (result !== null && result !== undefined && smMarketSig() === sig) smMarketLoaded = true
        } finally {
            smMarketLoading = false
            smMarketAppending = false
            rerender()
        }
    }

    /* 去抖调度：顶栏搜索/清空由 00-prelude 直接发请求。共享的
       marketRequestIsFresh 记录「在途 / 最近 300ms 内成功」的查询签名，
       签名相同就跳过，避免同一次查询发两遍。 */
    function smScheduleMarketLoad() {
        const sig = smMarketSig()
        if (smMarketLastSig === sig) return
        if (marketRequestIsFresh(sig)) {
            /* 外部请求已覆盖当前查询，采纳其结果，不再补发。 */
            smMarketLastSig = sig
            return
        }
        if (smMarketTimer !== null && smMarketTimerSig === sig) return
        if (smMarketTimer !== null) clearTimeout(smMarketTimer)
        smMarketTimerSig = sig
        smMarketTimer = setTimeout(function () {
            smMarketTimer = null
            smMarketTimerSig = ''
            if (smMarketSig() !== sig) return
            if (smMarketLoading) return
            if (smMarketLastSig === sig) return
            if (marketRequestIsFresh(sig)) {
                smMarketLastSig = sig
                return
            }
            void smFetchMarket({ append: false })
        }, 300)
    }

    function smMarketOpenSources() {
        setState({ tab: 'sources', view: 'list', detail: null })
        try {
            const pending = loadSources()
            if (pending !== null && pending !== undefined && typeof pending.catch === 'function') {
                pending.catch(function () { /* 来源页会展示错误态 */ })
            }
        } catch (err) {
            void err
        }
    }

    function smMarketCancelPending() {
        if (smMarketTimer !== null) {
            clearTimeout(smMarketTimer)
            smMarketTimer = null
        }
        smMarketTimerSig = ''
    }

    function smMarketChangeSource(event) {
        const value = event !== null && event !== undefined && event.target !== null && event.target !== undefined
            ? String(event.target.value || 'all')
            : 'all'
        if (value === appState.marketSourceId) return
        smMarketCancelPending()
        smMarketLastSig = ''
        setState({ marketSourceId: value })
        void smFetchMarket({ append: false })
    }

    function smMarketChangeTag(tag) {
        if (tag === appState.marketTag) return
        smMarketCancelPending()
        smMarketLastSig = ''
        setState({ marketTag: tag })
        void smFetchMarket({ append: false })
    }

    function smMarketChangeSort(event) {
        const value = event !== null && event !== undefined && event.target !== null && event.target !== undefined
            ? String(event.target.value || 'relevance')
            : 'relevance'
        if (value === appState.marketSort) return
        smMarketCancelPending()
        smMarketLastSig = ''
        setState({ marketSort: value })
        void smFetchMarket({ append: false })
    }

    function smMarketOnSearchInput(event) {
        const value = event !== null && event !== undefined && event.target !== null && event.target !== undefined
            ? String(event.target.value || '')
            : ''
        if (value === appState.search) return
        /* 顶栏与市场内搜索共用 appState.search；请求统一由
           smScheduleMarketLoad 去抖，避免两套搜索词。 */
        smMarketLastSig = ''
        setState({ search: value })
    }

    function smMarketClearFilters() {
        smMarketCancelPending()
        smMarketLastSig = ''
        setState({ search: '', marketTag: 'all' })
        /* 清空搜索必须重新请求第 1 页（不能只清本地输入）。 */
        void smFetchMarket({ append: false })
    }

    function smMarketRetry() {
        smMarketCancelPending()
        smMarketLastSig = ''
        void smFetchMarket({ append: false, refresh: true })
    }

    /** 供来源 Tab 在源增删改/启停后让市场列表失效并重新读取。 */
    function smMarketInvalidate() {
        smMarketCancelPending()
        smMarketLastSig = ''
        smScheduleMarketLoad()
    }

    function smMarketLoadMore() {
        if (smMarketNextValue() === null) return
        void smFetchMarket({ append: true })
    }

    function smMarketOpenDetail(item) {
        if (item === null || typeof item !== 'object') return
        /* 键盘 Enter/Space 不会触发 renderPage 的 onClickCapture，需显式记录滚动位置。 */
        if (typeof rememberListScroll === 'function') rememberListScroll()
        setState({
            view: 'detail',
            detail: { kind: 'market', id: item.id, sourceId: item.sourceId, name: item.name },
        })
    }

    function smMarketInstall(item) {
        openModal('install', { sourceId: item.sourceId, name: item.name, version: item.version })
    }

    function smMarketUpdate(item, info) {
        openModal('update', {
            sourceId: item.sourceId,
            name: item.name,
            version: info.updateAvailable,
            currentVersion: info.version,
            /* 50-modals.js 的 SmUpdateModal 读取 available/current，这里同时给出。 */
            available: info.updateAvailable,
            current: info.version,
            location: info.location,
        })
    }

    /* ------------------------------------------------------------------ *
     * 渲染：工具栏 / 行 / 空态 / 骨架                                      *
     * ------------------------------------------------------------------ */

    function smMarketControls(sources, enabledSources, tags, total) {
        const optionSources = enabledSources.slice()
        if (appState.marketSourceId !== 'all') {
            let hasSelected = false
            for (let i = 0; i < optionSources.length; i += 1) {
                if (optionSources[i].id === appState.marketSourceId) {
                    hasSelected = true
                    break
                }
            }
            if (!hasSelected) {
                for (let j = 0; j < sources.length; j += 1) {
                    if (sources[j] !== null && typeof sources[j] === 'object' && sources[j].id === appState.marketSourceId) {
                        optionSources.push(sources[j])
                        break
                    }
                }
            }
        }

        const sourceOptions = [
            h('option', { key: 'all', value: 'all' }, t('market.allSources', {
                count: enabledSources.length,
                total: total,
            })),
        ]
        optionSources.forEach(function (src) {
            const dot = src.status === 'ok' ? '●' : src.status === 'checking' ? '◐' : '○'
            const count = typeof src.skillCount === 'number' ? ' (' + src.skillCount + ')' : ''
            const disabled = src.enabled === false ? ' · ' + t('source.disabled') : ''
            sourceOptions.push(h('option', {
                key: src.id || src.url || src.name,
                value: src.id || src.url || src.name,
            }, dot + ' ' + (src.name || src.url || '') + count + disabled))
        })

        const chips = [
            h('button', {
                key: 'all',
                type: 'button',
                className: cx('sm-chip', appState.marketTag === 'all' && 'sm-active'),
                'aria-pressed': appState.marketTag === 'all',
                onClick: function () { smMarketChangeTag('all') },
            }, t('filter.all')),
        ]
        tags.forEach(function (tag) {
            chips.push(h('button', {
                key: tag,
                type: 'button',
                className: cx('sm-chip', appState.marketTag === tag && 'sm-active'),
                'aria-pressed': appState.marketTag === tag,
                onClick: function () { smMarketChangeTag(tag) },
            }, tag))
        })

        return h('div', {
            key: 'controls',
            className: 'sm-market-controls',
            style: { display: 'flex', flexDirection: 'column', gap: '10px' },
        },
            h('div', {
                className: 'sm-market-controls-row',
                style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    flexWrap: 'wrap',
                },
            },
                h('div', {
                    className: 'sm-market-source-control',
                    style: { display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flexWrap: 'wrap' },
                },
                    h('span', { className: 'sm-label' }, t('market.sourceLabel')),
                    h('select', {
                        className: 'sm-select sm-market-source-select',
                        value: appState.marketSourceId,
                        'aria-label': t('market.sourceLabel'),
                        onChange: smMarketChangeSource,
                    }, sourceOptions),
                    h('button', {
                        type: 'button',
                        className: 'sm-btn sm-btn-ghost sm-btn-sm',
                        onClick: smMarketOpenSources,
                    }, t('market.manageSources'))
                ),
                h('div', {
                    className: 'sm-market-tools',
                    style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
                },
                    h('div', { className: 'sm-search sm-market-search' },
                        icon('search', 14),
                        h('input', {
                            type: 'search',
                            value: appState.search,
                            placeholder: t('search.market'),
                            'aria-label': t('search.market'),
                            spellCheck: false,
                            onChange: smMarketOnSearchInput,
                        })
                    ),
                    h('span', { className: 'sm-label' }, t('sort.label')),
                    h('select', {
                        className: 'sm-select sm-market-sort',
                        value: appState.marketSort,
                        'aria-label': t('sort.label'),
                        onChange: smMarketChangeSort,
                    },
                        h('option', { value: 'relevance' }, t('market.sortRecommended')),
                        h('option', { value: 'published' }, t('market.sortUpdated')),
                        h('option', { value: 'name' }, t('sort.name'))
                    )
                )
            ),
            h('div', { className: 'sm-chips sm-market-chips' }, chips)
        )
    }

    function smMarketRow(item) {
        const info = smMarketInstalledInfo(item)
        const hasUpdate = !!(info !== null && info.updateAvailable)
        const dotClass = hasUpdate ? 'sm-dot-update' : info !== null ? 'sm-dot-ok' : 'sm-dot-idle'
        const dotTitle = hasUpdate ? t('market.dot.update') : info !== null ? t('market.dot.installed') : t('market.dot.notInstalled')
        const tagNodes = []

        if (hasUpdate) {
            tagNodes.push(h('span', {
                key: 'update',
                className: 'sm-badge sm-badge-update',
                title: t('badge.updateTip', { version: 'v' + info.updateAvailable }),
            }, smMarketUpgradeGlyph(), h('span', null, 'v' + info.updateAvailable)))
        }
        const maxTags = hasUpdate ? 3 : 4
        const itemTags = Array.isArray(item.tags) ? item.tags : []
        itemTags.slice(0, maxTags).forEach(function (tag) {
            tagNodes.push(h('span', { key: 'tag-' + tag, className: 'sm-badge' }, tag))
        })

        let byline = ''
        if (item.author && item.sourceName) byline = t('market.by', { author: item.author, source: item.sourceName })

        let action = null
        if (info === null) {
            action = h('button', {
                type: 'button',
                className: 'sm-btn sm-btn-primary sm-btn-sm',
                onClick: function (event) {
                    if (event && event.stopPropagation) event.stopPropagation()
                    smMarketInstall(item)
                },
            }, t('action.install'))
        } else if (hasUpdate) {
            action = h('button', {
                type: 'button',
                className: 'sm-btn sm-btn-primary sm-btn-sm',
                onClick: function (event) {
                    if (event && event.stopPropagation) event.stopPropagation()
                    smMarketUpdate(item, info)
                },
            }, t('action.update'))
        } else {
            /* v2.3：行尾只保留唯一按钮；已安装且最新时用弱化按钮，点击不安装，切到已安装页。 */
            action = h('button', {
                type: 'button',
                className: 'sm-btn sm-btn-ghost sm-btn-sm sm-market-installed',
                onClick: function (event) {
                    if (event && event.stopPropagation) event.stopPropagation()
                    setState({
                        tab: 'installed',
                        view: 'list',
                        detail: null,
                        filter: 'all',
                        search: typeof item.name === 'string' ? item.name : '',
                    })
                },
            }, t('market.installedState'))
        }

        const key = item.id || String(item.sourceId || '') + '/' + String(item.name || '')
        return h('div', {
            key: key,
            className: 'sm-row sm-row-market',
            role: 'button',
            tabIndex: 0,
            onClick: function () { smMarketOpenDetail(item) },
            onKeyDown: function (event) {
                if (event && (event.key === 'Enter' || event.key === ' ')) {
                    if (event.preventDefault) event.preventDefault()
                    smMarketOpenDetail(item)
                }
            },
        },
            h('div', { className: 'sm-row-main' },
                h('div', { className: 'sm-row-icon' },
                    icon(smMarketIconName(item, info), 24),
                    h('span', { className: cx('sm-dot', dotClass), title: dotTitle })
                ),
                h('div', {
                    className: 'sm-row-text',
                    style: { flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' },
                },
                    h('div', {
                        className: 'sm-row-title',
                        style: { display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, overflow: 'hidden' },
                    },
                        h('span', { className: 'sm-row-name sm-mono' }, item.name),
                        h('span', { className: 'sm-row-version sm-mono' }, 'v' + String(item.version || '')),
                        tagNodes.length > 0 ? h('div', { className: 'sm-row-badges' }, tagNodes) : null,
                        byline !== '' ? h('span', { className: 'sm-row-by sm-caption sm-ellipsis' }, byline) : null
                    ),
                    h('div', { className: 'sm-row-desc', title: item.description || '' }, item.description || '')
                )
            ),
            h('div', { className: 'sm-row-tail' }, action)
        )
    }

    function smMarketSkeleton() {
        const rows = []
        for (let i = 0; i < 6; i += 1) {
            rows.push(h('div', { key: 'sk-' + i, className: 'sm-row sm-row-market' },
                h('div', { className: 'sm-row-main' },
                    h('div', { className: 'sm-row-icon' },
                        h('span', { className: 'sm-skeleton', style: { width: '24px', height: '24px' } })
                    ),
                    h('div', {
                        className: 'sm-row-text',
                        style: { flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '8px' },
                    },
                        h('div', { className: 'sm-skeleton', style: { maxWidth: '220px' } }),
                        h('div', { className: 'sm-skeleton', style: { maxWidth: '420px', minHeight: '12px' } })
                    )
                )
            ))
        }
        return h('div', { key: 'skeleton', className: 'sm-market-list sm-stack', 'aria-busy': 'true' },
            h('div', { className: 'sm-caption sm-muted', style: { padding: '4px 8px' } }, t('market.loading')),
            rows
        )
    }

    function smMarketEmptyBlock(iconName, title, body, actions, keyName) {
        return h('div', { key: keyName || 'empty', className: 'sm-empty sm-market-empty' },
            h('div', { className: 'sm-empty-icon' }, icon(iconName, 40)),
            h('div', { className: 'sm-empty-title sm-card-title' }, title),
            body ? h('div', { className: 'sm-empty-body sm-desc' }, body) : null,
            actions && actions.length > 0
                ? h('div', {
                    className: 'sm-empty-actions',
                    style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' },
                }, actions)
                : null
        )
    }

    function smMarketNoSourceState(hasAnySource) {
        const title = hasAnySource ? t('empty.market.noEnabledSource') : t('source.empty')
        const body = hasAnySource ? t('empty.market.noEnabledSourceBody') : t('empty.market.noSourceBody')
        const actions = [
            h('button', {
                key: 'add',
                type: 'button',
                className: 'sm-btn sm-btn-primary sm-btn-sm',
                onClick: function () { openModal('add-source') },
            }, t('action.addSource')),
        ]
        if (hasAnySource) {
            actions.push(h('button', {
                key: 'manage',
                type: 'button',
                className: 'sm-btn sm-btn-ghost sm-btn-sm',
                onClick: smMarketOpenSources,
            }, t('market.manageSources')))
        }
        return smMarketEmptyBlock('sources', title, body, actions, 'no-source')
    }

    function smMarketNoSkillsState() {
        const search = String(appState.search || '')
        const hasQuery = search !== '' || appState.marketTag !== 'all'
        if (hasQuery) {
            return smMarketEmptyBlock('search', t('empty.search', {
                query: search || appState.marketTag,
            }), '', [
                h('button', {
                    key: 'clear',
                    type: 'button',
                    className: 'sm-btn sm-btn-ghost sm-btn-sm',
                    onClick: smMarketClearFilters,
                }, t('action.clearSearch')),
            ], 'no-match')
        }
        return smMarketEmptyBlock('market', t('market.empty'), '', [
            h('button', {
                key: 'refresh',
                type: 'button',
                className: 'sm-btn sm-btn-ghost sm-btn-sm',
                onClick: smMarketRetry,
            }, t('action.refresh')),
        ], 'no-skills')
    }

    function smMarketErrorState(error) {
        const detail = smMarketErrorText(error)
        return smMarketEmptyBlock('alert', t('error.loadMarket'), detail || t('source.error.fetch'), [
            h('button', {
                key: 'retry',
                type: 'button',
                className: 'sm-btn sm-btn-primary sm-btn-sm',
                onClick: smMarketRetry,
            }, t('action.retry')),
            h('button', {
                key: 'sources',
                type: 'button',
                className: 'sm-btn sm-btn-ghost sm-btn-sm',
                onClick: smMarketOpenSources,
            }, t('market.manageSources')),
        ], 'error')
    }

    function smMarketErrorBanner(error) {
        const detail = smMarketErrorText(error)
        return h('div', { key: 'error-banner', className: 'sm-banner sm-error', role: 'alert' },
            icon('alert', 16),
            h('span', {
                className: 'sm-banner-text',
                style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', minWidth: 0 },
            },
                t('market.offline'),
                h('span', { className: 'sm-badge sm-warn' }, t('source.stale')),
                detail !== '' ? h('span', { className: 'sm-banner-detail sm-caption sm-muted' }, detail) : null
            ),
            h('button', {
                type: 'button',
                className: 'sm-btn sm-btn-ghost sm-btn-sm',
                onClick: smMarketRetry,
            }, t('action.retry'))
        )
    }

    function smMarketList(skills) {
        return h('div', { key: 'list', className: 'sm-market-list sm-stack' }, skills.map(function (item) {
            return smMarketRow(item)
        }))
    }

    /* ------------------------------------------------------------------ *
     * 市场 Tab 入口                                                       *
     * ------------------------------------------------------------------ */

    function renderMarketTab() {
        smScheduleMarketLoad()

        const sources = smMarketSourceList()
        const enabledSources = smMarketEnabledSources(sources)
        const skills = smMarketCurrentSkills()
        const tagSource = smMarketSharedSkills()
        const tags = smMarketTopTags(tagSource)
        const total = smMarketTotalValue(enabledSources)
        const nextOffset = smMarketNextValue()
        /* 顶栏与市场内请求共用 appState.marketLoading / appState.error。 */
        const marketError = appState.error !== null && typeof appState.error === 'object' && appState.error.scope === 'market'
            ? appState.error
            : null
        const sourceIssue = enabledSources.find(function (src) {
            return src.stale === true || src.status === 'error'
        })
        const failure = marketError !== null
            ? marketError
            : (sourceIssue !== undefined
                ? { message: typeof sourceIssue.error === 'string' ? sourceIssue.error : '' }
                : null)
        const hasFailure = failure !== null
        /* 清空/切换搜索会先清空列表并把 appState.marketLoading 置 true；此时
           即使此前已加载过（smMarketLoaded），也必须优先显示骨架，等请求落定
           后再走空态。列表非空（例如加载更多）时不打断已有内容。 */
        const pending = !hasFailure && skills.length === 0 &&
            (appState.marketLoading === true ||
                (!smMarketLoaded && (smMarketLoading || appState.installed === null)))

        const nodes = []
        if (hasFailure && skills.length > 0) nodes.push(smMarketErrorBanner(failure))
        if (sources.length > 0) nodes.push(smMarketControls(sources, enabledSources, tags, total))

        if (pending) {
            nodes.push(smMarketSkeleton())
        } else if (sources.length === 0) {
            nodes.push(smMarketNoSourceState(false))
        } else if (enabledSources.length === 0) {
            nodes.push(smMarketNoSourceState(true))
        } else if (hasFailure && skills.length === 0) {
            nodes.push(smMarketErrorState(failure))
        } else if (skills.length === 0) {
            nodes.push(smMarketNoSkillsState())
        } else {
            nodes.push(smMarketList(skills))
            if (nextOffset !== null && nextOffset !== undefined) {
                nodes.push(h('div', {
                    key: 'more',
                    className: 'sm-market-more',
                    style: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 0' },
                },
                    h('button', {
                        type: 'button',
                        className: 'sm-btn sm-btn-ghost sm-btn-sm',
                        disabled: smMarketAppending,
                        onClick: smMarketLoadMore,
                    }, smMarketAppending ? t('state.loading') : t('market.loadMore'))
                ))
            }
        }

        return h('div', { className: 'sm-page sm-market' }, nodes)
    }
// ===== 30-sources.js =====
    /* ------------------------------------------------------------------ *
     * C2 · 来源 Tab                                                       *
     *                                                                    *
     * 数据来源：appState.installed（locations / presets）与 appState.sources
     * 「添加源」走 50-modals.js 的 add-source；编辑/删除在卡片内联确认，
     * 因为该模态只实现了新增，没有 source 的编辑/删除分支。                 *
     * ------------------------------------------------------------------ */

    let smSourcesCache = []
    let smSourcesLoading = false
    let smSourcesError = null
    let smSourcesBootScheduled = false
    let smSourcesBusy = Object.create(null)
    let smSourcesEditing = null
    let smSourcesEditName = ''
    let smSourcesEditUrl = ''
    let smSourcesEditError = ''
    let smSourcesSaving = false
    let smSourcesConfirmDelete = null
    let smSourcesDeleting = false

    const SM_SOURCES_GRID_STYLE = {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))',
        gap: '12px',
    }

    function smSourcesErrorText(err) {
        if (err === null || err === undefined) return ''
        if (typeof err === 'string') return err
        if (typeof err === 'object') {
            if (typeof err.message === 'string' && err.message !== '') return err.message
            if (typeof err.code === 'string' && err.code !== '') return err.code
        }
        return String(err)
    }

    function smSourcesCurrent() {
        if (Array.isArray(appState.sources)) return appState.sources
        return smSourcesCache
    }

    function smSourcesExtractList(result) {
        if (result === null || result === undefined) return null
        if (Array.isArray(result)) return result
        if (typeof result === 'object') {
            if (Array.isArray(result.sources)) return result.sources
            if (result.data !== null && typeof result.data === 'object' && Array.isArray(result.data.sources)) {
                return result.data.sources
            }
        }
        return null
    }

    async function smSourcesReload(force) {
        /* 00-prelude 的 loadSources 失败时返回 null 并写入 appState.error。 */
        if (appState.loadingSources === true && force !== true) return true
        try {
            const result = await loadSources(force)
            if (result === null || result === undefined) {
                const scoped = appState.error !== null && typeof appState.error === 'object' && appState.error.scope === 'sources'
                    ? appState.error
                    : null
                smSourcesError = scoped || { code: 'E_INTERNAL', message: t('error.loadSources') }
                return false
            }
            const list = smSourcesExtractList(result)
            if (list !== null) {
                smSourcesCache = list
                appState.sources = list
            } else if (Array.isArray(appState.sources)) {
                smSourcesCache = appState.sources.slice()
            }
            smSourcesError = null
            return true
        } catch (err) {
            smSourcesError = err !== null && typeof err === 'object' ? err : { message: smSourcesErrorText(err) }
            return false
        }
    }

    async function smInstalledReload(force) {
        if (appState.loadingInstalled === true && force !== true) return true
        try {
            const result = await loadInstalled(force)
            if (result === null || result === undefined) {
                const scoped = appState.error !== null && typeof appState.error === 'object' && appState.error.scope === 'installed'
                    ? appState.error
                    : null
                if (scoped !== null && smSourcesError === null) smSourcesError = scoped
                return false
            }
            return true
        } catch (err) {
            if (smSourcesError === null) {
                smSourcesError = err !== null && typeof err === 'object' ? err : { message: smSourcesErrorText(err) }
            }
            return false
        }
    }

    async function smSourcesPageLoad(force) {
        if (smSourcesLoading) return
        smSourcesLoading = true
        smSourcesError = null
        setState({ loading: true })
        await Promise.all([smSourcesReload(force), smInstalledReload(force)])
        smSourcesLoading = false
        setState({ loading: false })
    }

    function smEnsureSourcesData() {
        if (smSourcesBootScheduled) return
        const hasInstalled = appState.installed !== null && typeof appState.installed === 'object'
        const hasSources = Array.isArray(appState.sources) && appState.sources.length > 0
        if (hasInstalled && hasSources) return
        smSourcesBootScheduled = true
        setTimeout(function () {
            void smSourcesPageLoad(false)
        }, 0)
    }

    function smRetrySources() {
        smSourcesBootScheduled = true
        void smSourcesPageLoad(true)
    }

    function smSetSourceBusy(id, busy) {
        if (!id) return
        if (busy) smSourcesBusy[id] = true
        else delete smSourcesBusy[id]
        /* 传一个真实字段，确保 setState 一定触发重渲染。 */
        setState({ sources: smSourcesCurrent().slice() })
    }

    async function smRefreshOneSource(src) {
        if (src === null || typeof src !== 'object' || !src.id) return
        if (smSourcesBusy[src.id]) return
        smSetSourceBusy(src.id, true)
        try {
            await api('sources/' + encodeURIComponent(src.id) + '/refresh', { method: 'POST' })
            toast(t('toast.sourceRefreshed', { name: src.name || src.url || src.id }), { tone: 'ok' })
        } catch (err) {
            toast(t('toast.sourceRefreshFailed', { reason: smSourcesErrorText(err) }), { tone: 'error' })
        }
        await smSourcesReload()
        smMarketInvalidate()
        smSetSourceBusy(src.id, false)
    }

    async function smToggleSource(src) {
        if (src === null || typeof src !== 'object' || !src.id) return
        if (smSourcesBusy[src.id]) return
        smSetSourceBusy(src.id, true)
        const nextEnabled = src.enabled === false
        try {
            await api('/sources/' + encodeURIComponent(src.id), {
                method: 'PUT',
                body: { enabled: nextEnabled },
            })
            const message = nextEnabled
                ? t('toast.sourceEnabled', { name: src.name || src.url || src.id })
                : t('toast.sourceDisabled', { name: src.name || src.url || src.id })
            toast(message, { tone: 'ok' })
        } catch (err) {
            toast(t('toast.sourceToggleFailed', { reason: smSourcesErrorText(err) }), { tone: 'error' })
        }
        await smSourcesReload()
        smMarketInvalidate()
        smSetSourceBusy(src.id, false)
    }

    function smSourcesOpenFolder(path) {
        const value = typeof path === 'string' ? path : ''
        if (value === '') return
        /* 宿主没有提供“打开目录”路由；与 00-prelude 的 openFolder 行为保持一致。 */
        toast(t('toast.openedFolder', { path: value }), { tone: 'ok' })
    }

    async function smSourcesCopyPath(path) {
        const value = typeof path === 'string' ? path : ''
        if (value === '') return
        try {
            if (typeof navigator !== 'undefined' && navigator !== null &&
                navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                await navigator.clipboard.writeText(value)
                toast(t('toast.copied'), { tone: 'ok' })
                return
            }
            toast(t('toast.copyFailed'), { tone: 'error' })
        } catch (err) {
            toast(t('toast.copyFailed'), { tone: 'error' })
        }
    }

    function smStartSourceEdit(src) {
        if (src === null || typeof src !== 'object' || !src.id) return
        smSourcesEditing = src.id
        smSourcesEditName = typeof src.name === 'string' ? src.name : ''
        smSourcesEditUrl = typeof src.url === 'string' ? src.url : ''
        smSourcesEditError = ''
        smSourcesConfirmDelete = null
        setState({})
    }

    function smCancelSourceEdit() {
        smSourcesEditing = null
        smSourcesEditError = ''
        setState({})
    }

    function smOnSourceEditName(event) {
        smSourcesEditName = event !== null && event !== undefined && event.target !== null && event.target !== undefined
            ? String(event.target.value || '')
            : ''
        setState({})
    }

    function smOnSourceEditUrl(event) {
        smSourcesEditUrl = event !== null && event !== undefined && event.target !== null && event.target !== undefined
            ? String(event.target.value || '')
            : ''
        setState({})
    }

    async function smSaveSourceEdit(src) {
        if (smSourcesSaving || src === null || typeof src !== 'object' || !src.id) return
        const name = smSourcesEditName.trim()
        const url = smSourcesEditUrl.trim()
        if (url === '') {
            smSourcesEditError = t('form.urlRequired')
            setState({})
            return
        }
        smSourcesSaving = true
        smSourcesEditError = ''
        setState({})
        try {
            const body = { url: url }
            if (name !== '') body.name = name
            await api('/sources/' + encodeURIComponent(src.id), { method: 'PUT', body: body })
            smSourcesEditing = null
            toast(t('toast.saved'), { tone: 'ok' })
            await smSourcesReload(true)
            smMarketInvalidate()
        } catch (err) {
            smSourcesEditError = smSourcesErrorText(err)
        }
        smSourcesSaving = false
        setState({})
    }

    function smAskDeleteSource(src) {
        if (src === null || typeof src !== 'object' || !src.id) return
        smSourcesConfirmDelete = src.id
        smSourcesEditing = null
        setState({})
    }

    function smCancelDeleteSource() {
        smSourcesConfirmDelete = null
        setState({})
    }

    async function smDeleteSource(src) {
        if (smSourcesDeleting || src === null || typeof src !== 'object' || !src.id) return
        smSourcesDeleting = true
        setState({})
        try {
            await api('/sources/' + encodeURIComponent(src.id), { method: 'DELETE' })
            smSourcesConfirmDelete = null
            toast(t('toast.deleted', { name: src.name || src.url || src.id }), { tone: 'ok' })
            await smSourcesReload(true)
            smMarketInvalidate()
        } catch (err) {
            toast(t('source.deleteFailed', { reason: smSourcesErrorText(err) }), { tone: 'error' })
        }
        smSourcesDeleting = false
        setState({})
    }

    function smViewLocationSkills(loc) {
        if (loc === null || typeof loc !== 'object') return
        /* 已安装筛选按别名比较（10-installed.js:47），位置 id 必须先映射；
           未知位置回退到「全部」，避免筛选到空列表。 */
        const filter = locationFilterKey(loc.id) || 'all'
        setState({ tab: 'installed', view: 'list', detail: null, filter: filter, search: '' })
    }

    /* ------------------------------------------------------------------ *
     * 渲染：规则卡 / 位置卡 / 预设卡 / 市场源卡                            *
     * ------------------------------------------------------------------ */

    function smSourcesSectionHeader(title, extra) {
        return h('div', { className: 'sm-group-head sm-sources-section-header' },
            h('div', null, h('span', { className: 'sm-group-title' }, title)),
            extra !== null && extra !== undefined ? extra : null
        )
    }

    function smSourcesRetryButton() {
        return h('button', {
            type: 'button',
            className: 'sm-btn sm-btn-ghost sm-btn-sm',
            onClick: smRetrySources,
        }, t('action.retry'))
    }

    function smPriorityCard() {
        return h('div', { key: 'priority', className: 'sm-card sm-priority-card' },
            h('div', { className: 'sm-card-title' }, t('sources.priorityTitle')),
            h('div', {
                className: 'sm-caption',
                style: { color: 'var(--dsw-alias-label-secondary)', lineHeight: 1.55 },
            }, t('sources.priority')),
            h('div', {
                className: 'sm-caption',
                style: { color: 'var(--dsw-alias-label-caption)', lineHeight: 1.55 },
            }, t('sources.priorityDetail')),
            h('div', null,
                h('button', {
                    type: 'button',
                    className: 'sm-btn sm-btn-ghost sm-btn-sm',
                    onClick: function () { openDiagnosticsDrawer() },
                }, t('sources.viewOverrides'))
            )
        )
    }

    function smLocationCard(loc) {
        const readable = loc.readable !== false
        const exists = loc.exists === true
        const dotClass = !readable ? 'sm-dot-error' : exists ? 'sm-dot-ok' : 'sm-dot-idle'
        const statusText = !readable ? t('status.unreadable') : exists ? t('status.readable') : t('status.missing')
        const pathText = typeof loc.path === 'string' && loc.path !== '' ? loc.path : (loc.absPath || '')
        const canOpen = exists && typeof loc.absPath === 'string' && loc.absPath !== ''
        const activeCount = typeof loc.skillCount === 'number' ? loc.skillCount : 0
        const disabledCount = typeof loc.disabledCount === 'number' ? loc.disabledCount : 0
        const actions = []

        if (pathText !== '' || (typeof loc.absPath === 'string' && loc.absPath !== '')) {
            actions.push(h('button', {
                key: 'path',
                type: 'button',
                className: 'sm-btn sm-btn-ghost sm-btn-sm',
                onClick: function () {
                    if (canOpen) smSourcesOpenFolder(loc.absPath)
                    else void smSourcesCopyPath(loc.absPath || pathText)
                },
            }, canOpen ? t('action.openFolder') : t('action.copyPath')))
        }
        actions.push(h('button', {
            key: 'view',
            type: 'button',
            className: 'sm-btn sm-btn-ghost sm-btn-sm',
            onClick: function () { smViewLocationSkills(loc) },
        }, t('sources.viewSkills')))

        return h('div', {
            key: loc.id,
            className: 'sm-card sm-source-card',
            style: !exists ? { opacity: 0.72, borderStyle: 'dashed' } : undefined,
        },
            h('div', {
                className: 'sm-source-card-head',
                style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', minWidth: 0 },
            },
                h('span', { className: cx('sm-dot', dotClass), title: statusText }),
                h('span', { className: 'sm-card-title' }, loc.label || loc.id),
                h('span', { className: 'sm-badge sm-mono' }, 'rank ' + String(loc.rank)),
                h('span', { className: 'sm-badge' }, loc.layer === 'preset' ? t('layer.preset') : t('layer.global')),
                loc.writable ? null : h('span', { className: 'sm-badge' }, t('badge.readonly'))
            ),
            h('div', {
                className: 'sm-source-path sm-mono sm-caption sm-ellipsis',
                title: loc.absPath || pathText,
            }, pathText),
            !exists ? h('div', { className: 'sm-source-note sm-caption sm-muted' }, t('sources.missingDir')) : null,
            h('div', {
                className: 'sm-source-card-foot',
                style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    flexWrap: 'wrap',
                },
            },
                h('span', { className: 'sm-source-count sm-caption sm-muted' },
                    t('sources.skillCount', { count: activeCount }),
                    disabledCount > 0 ? ' · ' + t('sources.disabledCount', { count: disabledCount }) : null
                ),
                h('div', {
                    className: 'sm-source-actions',
                    style: { display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' },
                }, actions)
            )
        )
    }

    function smPresetCard(preset) {
        const mounted = preset.mounted === true
        let desc = ''
        if (preset.id === 'minimal' && !mounted) {
            desc = t('sources.minimalNoSkills')
        } else if (typeof preset.desc === 'string' && preset.desc !== '') {
            desc = preset.desc
        } else {
            desc = t('source.preset.fallbackDesc')
        }
        const stats = mounted
            ? t('source.preset.stats', {
                skills: typeof preset.presetSkills === 'number' ? preset.presetSkills : 0,
                roots: typeof preset.localRoots === 'number' ? preset.localRoots : 0,
            })
            : t('sources.minimalNoSkills')
        return h('div', {
            key: preset.id,
            className: 'sm-card sm-preset-card',
        },
            h('div', {
                className: 'sm-source-card-head',
                style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    flexWrap: 'wrap',
                },
            },
                h('span', { className: 'sm-card-title sm-mono' }, preset.id),
                h('span', {
                    className: cx('sm-badge', mounted ? 'sm-success' : 'sm-warn'),
                }, mounted ? t('source.preset.mounted') : t('source.preset.unmounted'))
            ),
            h('div', {
                className: 'sm-caption',
                style: { color: 'var(--dsw-alias-label-secondary)', lineHeight: 1.55 },
            }, desc),
            h('div', { className: 'sm-source-count sm-caption sm-muted' }, stats)
        )
    }

    function smPresetCards(presets) {
        const order = ['cordis', 'standard', 'ptc', 'minimal']
        const byId = Object.create(null)
        ;(Array.isArray(presets) ? presets : []).forEach(function (preset) {
            if (preset !== null && typeof preset === 'object' && typeof preset.id === 'string') {
                byId[preset.id] = preset
            }
        })
        return order.map(function (id) {
            return smPresetCard(byId[id] || {
                id: id,
                mounted: false,
                presetSkills: 0,
                localRoots: 0,
                desc: '',
            })
        })
    }

    function smMarketSourceCard(src) {
        const status = typeof src.status === 'string' ? src.status : 'ok'
        const dotClass = status === 'ok' ? 'sm-dot-ok' : status === 'checking' ? 'sm-dot-warn' : 'sm-dot-error'
        const enabled = src.enabled !== false
        const busy = status === 'checking' || smSourcesBusy[src.id] === true
        const checked = typeof src.lastCheckedAt === 'number' && src.lastCheckedAt > 0
            ? t('source.lastChecked', { time: fmtTime(src.lastCheckedAt) })
            : t('source.neverChecked')
        const errorText = typeof src.error === 'string'
            ? src.error
            : (src.error ? smSourcesErrorText(src.error) : '')
        const dotTitle = status === 'ok' ? t('source.enabled') : status === 'checking' ? t('state.loading') : t('state.loadFailed')
        const isEditing = smSourcesEditing === src.id
        const isConfirming = smSourcesConfirmDelete === src.id

        const head = h('div', {
            className: 'sm-source-card-head',
            style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', minWidth: 0 },
        },
            h('span', { className: cx('sm-dot', dotClass), title: dotTitle }),
            h('span', { className: 'sm-card-title' }, src.name || src.url || src.id),
            h('span', { className: 'sm-badge sm-mono' }, src.type === 'local' ? t('source.type.local') : t('source.type.index')),
            !enabled ? h('span', { className: 'sm-badge sm-warn' }, t('source.disabled')) : null,
            src.stale ? h('span', { className: 'sm-badge sm-warn' }, t('source.stale')) : null
        )

        if (isEditing) {
            return h('div', {
                key: src.id || src.url,
                className: 'sm-card sm-market-source-card',
            },
                head,
                h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
                    h('input', {
                        type: 'text',
                        className: 'sm-input',
                        value: smSourcesEditName,
                        placeholder: t('source.name'),
                        onChange: smOnSourceEditName,
                    }),
                    h('input', {
                        type: 'text',
                        className: 'sm-input sm-mono',
                        value: smSourcesEditUrl,
                        placeholder: t('source.url'),
                        onChange: smOnSourceEditUrl,
                    }),
                    smSourcesEditError !== ''
                        ? h('div', {
                            className: 'sm-caption',
                            style: { color: 'var(--dsw-alias-state-error-primary)' },
                        }, smSourcesEditError)
                        : null,
                    h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' } },
                        h('button', {
                            type: 'button',
                            className: 'sm-btn sm-btn-ghost sm-btn-sm',
                            onClick: smCancelSourceEdit,
                        }, t('action.cancel')),
                        h('button', {
                            type: 'button',
                            className: 'sm-btn sm-btn-primary sm-btn-sm',
                            disabled: smSourcesSaving,
                            onClick: function () { void smSaveSourceEdit(src) },
                        }, smSourcesSaving ? t('state.loading') : t('action.save'))
                    )
                )
            )
        }

        if (isConfirming) {
            return h('div', {
                key: src.id || src.url,
                className: 'sm-card sm-market-source-card',
            },
                head,
                h('div', {
                    className: 'sm-banner sm-warn',
                    style: {
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        flexWrap: 'wrap',
                    },
                },
                    h('span', { className: 'sm-caption' }, t('source.deleteConfirm', {
                        name: src.name || src.url || src.id,
                    })),
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
                        h('button', {
                            type: 'button',
                            className: 'sm-btn sm-btn-ghost sm-btn-sm',
                            onClick: smCancelDeleteSource,
                        }, t('action.cancel')),
                        h('button', {
                            type: 'button',
                            className: 'sm-btn sm-btn-danger sm-btn-sm',
                            disabled: smSourcesDeleting,
                            onClick: function () { void smDeleteSource(src) },
                        }, smSourcesDeleting ? t('state.loading') : t('action.delete'))
                    )
                )
            )
        }

        return h('div', {
            key: src.id || src.url,
            className: 'sm-card sm-market-source-card',
        },
            head,
            h('div', {
                className: 'sm-source-path sm-mono sm-caption sm-ellipsis',
                title: src.url || '',
            }, src.url || ''),
            status === 'error' && errorText !== ''
                ? h('div', {
                    className: 'sm-source-error sm-caption',
                    style: {
                        color: 'var(--dsw-alias-state-error-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        minWidth: 0,
                    },
                }, icon('alert', 14), h('span', { className: 'sm-ellipsis' }, errorText))
                : null,
            h('div', {
                className: 'sm-source-card-foot',
                style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    flexWrap: 'wrap',
                },
            },
                h('span', { className: 'sm-source-count sm-caption sm-muted' },
                    t('source.skillCount', { count: typeof src.skillCount === 'number' ? src.skillCount : 0 }),
                    ' · ',
                    checked
                ),
                h('div', {
                    className: 'sm-source-actions',
                    style: { display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' },
                },
                    h('button', {
                        key: 'refresh',
                        type: 'button',
                        className: 'sm-btn sm-btn-ghost sm-btn-sm',
                        disabled: busy,
                        onClick: function () { void smRefreshOneSource(src) },
                    }, t('action.refresh')),
                    h('button', {
                        key: 'edit',
                        type: 'button',
                        className: 'sm-btn sm-btn-ghost sm-btn-sm',
                        onClick: function () { smStartSourceEdit(src) },
                    }, t('action.edit')),
                    h('button', {
                        key: 'toggle',
                        type: 'button',
                        className: 'sm-btn sm-btn-ghost sm-btn-sm',
                        disabled: busy,
                        onClick: function () { void smToggleSource(src) },
                    }, enabled ? t('source.disable') : t('source.enable')),
                    h('button', {
                        key: 'delete',
                        type: 'button',
                        className: 'sm-btn sm-btn-ghost sm-btn-sm sm-btn-danger',
                        onClick: function () { smAskDeleteSource(src) },
                    }, t('source.delete'))
                )
            )
        )
    }

    function smSourcesSkeletonGrid(count) {
        const cards = []
        for (let i = 0; i < count; i += 1) {
            cards.push(h('div', { key: 'sk-' + i, className: 'sm-card' },
                h('div', { className: 'sm-skeleton', style: { maxWidth: '160px' } }),
                h('div', { className: 'sm-skeleton', style: { maxWidth: '260px', minHeight: '12px' } }),
                h('div', { className: 'sm-skeleton', style: { maxWidth: '120px', minHeight: '12px' } })
            ))
        }
        return h('div', { className: 'sm-sources-grid', style: SM_SOURCES_GRID_STYLE }, cards)
    }

    function smSourcesStateCard(title, body, action) {
        return h('div', { className: 'sm-card sm-empty' },
            h('div', { className: 'sm-card-title' }, title),
            body !== null && body !== undefined && body !== ''
                ? h('div', { className: 'sm-caption sm-muted' }, body)
                : null,
            action !== null && action !== undefined
                ? h('div', { style: { display: 'flex', justifyContent: 'center', gap: '8px' } }, action)
                : null
        )
    }

    function smSourcesErrorBanner(error) {
        const detail = smSourcesErrorText(error)
        return h('div', { key: 'error-banner', className: 'sm-banner sm-error', role: 'alert' },
            icon('alert', 16),
            h('span', {
                className: 'sm-banner-text',
                style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', minWidth: 0 },
            },
                t('error.loadSources'),
                detail !== '' ? h('span', { className: 'sm-caption sm-muted' }, detail) : null
            ),
            h('button', {
                type: 'button',
                className: 'sm-btn sm-btn-ghost sm-btn-sm',
                onClick: smRetrySources,
            }, t('action.retry'))
        )
    }

    /* ------------------------------------------------------------------ *
     * 来源 Tab 入口                                                       *
     * ------------------------------------------------------------------ */

    function renderSourcesTab() {
        smEnsureSourcesData()

        const installed = appState.installed !== null && typeof appState.installed === 'object'
            ? appState.installed
            : null
        const locations = installed !== null && Array.isArray(installed.locations) ? installed.locations : null
        const presets = installed !== null && Array.isArray(installed.presets) ? installed.presets : null
        const sources = smSourcesCurrent()
        const fallbackError = installed === null &&
            appState.error !== null && typeof appState.error === 'object' && appState.error.scope === 'installed'
            ? appState.error
            : null
        const error = smSourcesError !== null ? smSourcesError : fallbackError
        const hasError = error !== null && error !== undefined
        const pending = installed === null && !hasError
        const sections = []

        if (hasError && (installed !== null || sources.length > 0)) {
            sections.push(smSourcesErrorBanner(error))
        }
        sections.push(smPriorityCard())

        let locationsBody = null
        if (locations !== null) {
            locationsBody = locations.length > 0
                ? h('div', { className: 'sm-sources-grid', style: SM_SOURCES_GRID_STYLE }, locations.map(function (loc) {
                    return smLocationCard(loc)
                }))
                : smSourcesStateCard(t('sources.noLocations'), '', smSourcesRetryButton())
        } else if (pending) {
            locationsBody = smSourcesSkeletonGrid(3)
        } else {
            locationsBody = smSourcesStateCard(
                t('sources.noLocations'),
                hasError ? smSourcesErrorText(error) : t('error.loadInstalled'),
                smSourcesRetryButton()
            )
        }
        sections.push(h('section', { key: 'locations', className: 'sm-group sm-sources-section' },
            smSourcesSectionHeader(t('sources.locationsTitle')),
            locationsBody
        ))

        let presetsBody = null
        if (presets !== null) {
            presetsBody = h('div', { className: 'sm-sources-grid sm-presets-grid', style: SM_SOURCES_GRID_STYLE }, smPresetCards(presets))
        } else if (pending) {
            presetsBody = smSourcesSkeletonGrid(4)
        } else {
            presetsBody = smSourcesStateCard(
                t('sources.noPresets'),
                hasError ? smSourcesErrorText(error) : t('error.loadInstalled'),
                smSourcesRetryButton()
            )
        }
        sections.push(h('section', { key: 'presets', className: 'sm-group sm-sources-section' },
            smSourcesSectionHeader(t('sources.presetsTitle'),
                h('span', { className: 'sm-sources-hint' }, t('sources.presetNote'))),
            presetsBody
        ))

        let sourcesBody = null
        if (sources.length > 0) {
            sourcesBody = h('div', { className: 'sm-sources-grid', style: SM_SOURCES_GRID_STYLE }, sources.map(function (src) {
                return smMarketSourceCard(src)
            }))
        } else if (pending || (smSourcesLoading && !hasError)) {
            sourcesBody = smSourcesSkeletonGrid(3)
        } else if (hasError) {
            sourcesBody = smSourcesStateCard(
                t('source.error.fetch'),
                smSourcesErrorText(error),
                smSourcesRetryButton()
            )
        } else {
            sourcesBody = smSourcesStateCard(t('source.empty'), t('empty.market.noSourceBody'),
                h('button', {
                    type: 'button',
                    className: 'sm-btn sm-btn-primary sm-btn-sm',
                    onClick: function () { openModal('add-source') },
                }, t('action.addSource'))
            )
        }
        sections.push(h('section', { key: 'sources', className: 'sm-group sm-sources-section' },
            smSourcesSectionHeader(t('sources.marketTitle'),
                h('button', {
                    type: 'button',
                    className: 'sm-btn sm-btn-ghost sm-btn-sm',
                    onClick: function () { openModal('add-source') },
                }, icon('plus', 14), t('action.addSource'))),
            sourcesBody
        ))

        return h('div', { className: 'sm-page sm-sources-page' }, sections)
    }
// ===== 40-detail.js =====
    /* ------------------------------------------------------------------ *
     * 40-detail.js — v2.3 in-page, full-width two-column detail view.     *
     *                                                                    *
     * Replaces the old right-side drawer: the list is swapped out for a  *
     * page with `← 返回`, a unified 56×56 icon header, and a 2fr : 1fr    *
     * body. Everything reads `appState.detail` and the Host JSON shapes   *
     * from the implementation contract (§3/§4).                          *
     * ------------------------------------------------------------------ */

    const SM_MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
    const SM_PRESETS = ['cordis', 'standard', 'ptc', 'minimal']
    const SM_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
    const SM_TARGET_LOCATIONS = ['user-dsh', 'user-agents', 'project-dsh']
    const SM_LOCATION_LABEL_KEYS = {
        'project-dsh': 'loc.projectDsh',
        'project-agents': 'loc.projectAgents',
        custom: 'loc.custom',
        preset: 'loc.preset',
        'user-dsh': 'loc.userDsh',
        'user-agents': 'loc.userAgents',
        bundled: 'loc.bundled',
    }

    /** GET /installed payload (or null). */
    function smInstalledPayload() {
        const value = appState.installed
        return value !== null && typeof value === 'object' ? value : null
    }

    /** Installed SkillView[] (never null). */
    function smSkillList() {
        const payload = smInstalledPayload()
        return payload !== null && Array.isArray(payload.skills) ? payload.skills : []
    }

    /** LocationView[] (never null). */
    function smLocationList() {
        const payload = smInstalledPayload()
        return payload !== null && Array.isArray(payload.locations) ? payload.locations : []
    }

    /** IssueView[] (never null). */
    function smIssueList() {
        const payload = smInstalledPayload()
        return payload !== null && Array.isArray(payload.issues) ? payload.issues : []
    }

    function smFindLocation(id) {
        if (typeof id !== 'string' || id === '') return null
        const list = smLocationList()
        for (let index = 0; index < list.length; index += 1) {
            if (list[index] && list[index].id === id) return list[index]
        }
        return null
    }

    function smLocationLabel(id, fallback) {
        if (typeof fallback === 'string' && fallback !== '') return fallback
        const key = SM_LOCATION_LABEL_KEYS[id]
        return key ? t(key) : String(id || '')
    }

    /** A location is only disabled when the Host explicitly says it is not writable. */
    function smLocationDisabled(id) {
        if (id === 'project-dsh' && (typeof appState.cwd !== 'string' || appState.cwd === '')) return true
        const location = smFindLocation(id)
        return location !== null && location.writable === false
    }

    function smFindSkillById(id) {
        if (typeof id !== 'string' || id === '') return null
        const list = smSkillList()
        for (let index = 0; index < list.length; index += 1) {
            if (list[index] && list[index].id === id) return list[index]
        }
        return null
    }

    function smFindSkillByName(name) {
        if (typeof name !== 'string' || name === '') return null
        const list = smSkillList()
        for (let index = 0; index < list.length; index += 1) {
            if (list[index] && list[index].name === name) return list[index]
        }
        return null
    }

    /** Installed copy of a market skill. When both `location` and `sourceId`
     *  are given only an exact `name + sourceId + location` record matches;
     *  the sole fallback is `name + location` for records that lack `sourceId`.
     *  Never fall back to another location or to name alone. */
    function smFindInstalledCopy(name, location, sourceId) {
        if (typeof name !== 'string' || name === '') return null
        const hasSource = typeof sourceId === 'string' && sourceId !== ''
        const hasLocation = typeof location === 'string' && location !== ''
        const list = smSkillList()
        let unknownSourceAtLocation = null
        let sameSource = null
        let sameLocation = null
        let sameName = null
        for (let index = 0; index < list.length; index += 1) {
            const skill = list[index]
            if (!skill || skill.name !== name) continue
            const record = skill.market !== null && typeof skill.market === 'object' ? skill.market : null
            const recordSource = record !== null && typeof record.sourceId === 'string' ? record.sourceId : ''
            const atLocation = hasLocation && skill.location === location
            if (hasSource) {
                if (recordSource === sourceId) {
                    /* 同源记录：给了 location 时必须位置也一致。 */
                    if (!hasLocation || atLocation) return skill
                    if (sameSource === null) sameSource = skill
                } else if (recordSource === '' && hasLocation && atLocation && unknownSourceAtLocation === null) {
                    /* 安装记录本身缺 sourceId：仅允许 name + location 兜底。 */
                    unknownSourceAtLocation = skill
                }
                continue
            }
            /* 调用方未给 sourceId：按 location 优先，最后才按 name。 */
            if (hasLocation) {
                if (atLocation) return skill
                if (sameLocation === null) sameLocation = skill
            } else if (sameName === null) {
                sameName = skill
            }
        }
        if (hasSource) return hasLocation ? unknownSourceAtLocation : sameSource
        return hasLocation ? sameLocation : sameName
    }

    /** Prefer the effective (non-shadowed) copy when a name exists in several locations. */
    function smFindActiveSkillByName(name) {
        if (typeof name !== 'string' || name === '') return null
        const list = smSkillList()
        let fallback = null
        for (let index = 0; index < list.length; index += 1) {
            const skill = list[index]
            if (!skill || skill.name !== name) continue
            if (skill.status === 'active') return skill
            if (fallback === null) fallback = skill
        }
        return fallback
    }

    /** Locate a market entry by `sourceId + name` (id alone when no source given). */
    function smFindMarketSkill(id, sourceId, name) {
        const list = Array.isArray(appState.marketSkills) ? appState.marketSkills : []
        const hasId = typeof id === 'string' && id !== ''
        const hasSource = typeof sourceId === 'string' && sourceId !== ''
        const hasName = typeof name === 'string' && name !== ''
        if (!hasId && !(hasSource && hasName)) return null
        for (let index = 0; index < list.length; index += 1) {
            const skill = list[index]
            if (!skill) continue
            if (hasSource && skill.sourceId !== sourceId) continue
            if (hasId && skill.id === id) return skill
            if (hasSource && hasName && skill.name === name) return skill
        }
        return null
    }

    /** Version the user can update to ('' when up to date).
     *  `skillUpdateVersion` is authoritative: when the latest check ran
     *  (`checkedAt > 0`) and has no entry for this skill it returns '', and we
     *  must not resurrect the stale `market.installed.updateAvailable` field.
     *  Only a never-checked state (`updates === null` / `checkedAt === 0`) may
     *  fall back to the market payload. */
    function smUpdateVersionFor(skill, market) {
        if (skill !== null && skill !== undefined && typeof skillUpdateVersion === 'function') {
            return skillUpdateVersion(skill)
        }
        /* 从未检查过（或没有本地记录可判定）时才回退市场条目。 */
        const state = typeof updateCheckState === 'function' ? updateCheckState() : null
        if (state === null && market !== null && market !== undefined && market.installed !== undefined && market.installed !== null) {
            if (typeof market.installed.updateAvailable === 'string' && market.installed.updateAvailable !== '') return market.installed.updateAvailable
        }
        return ''
    }

    function smVersionOf(skill, market) {
        if (skill !== null && skill !== undefined && skill.market !== undefined && skill.market !== null && typeof skill.market.version === 'string' && skill.market.version !== '') {
            return skill.market.version
        }
        if (market !== null && market !== undefined && typeof market.version === 'string') return market.version
        return ''
    }

    function smStatusTone(status) {
        if (status === 'active') return 'ok'
        if (status === 'disabled') return 'idle'
        if (status === 'shadowed') return 'warn'
        if (status === 'invalid') return 'error'
        return 'idle'
    }

    function smDotColor(tone) {
        if (tone === 'ok') return 'var(--dsw-alias-state-success-primary)'
        if (tone === 'warn') return 'var(--dsw-alias-state-warn-primary)'
        if (tone === 'error') return 'var(--dsw-alias-state-error-primary)'
        if (tone === 'update') return 'var(--dsw-alias-brand-primary)'
        return 'var(--dsw-alias-label-caption)'
    }

    function smText(value, fallback) {
        if (typeof value === 'string' && value !== '') return value
        return fallback === undefined ? '' : fallback
    }

    /** Copy helper (clipboard API with a hidden-textarea fallback). */
    function smCopyText(value) {
        const text = value === null || value === undefined ? '' : String(value)
        if (text === '') return
        const done = () => {
            if (typeof smPushToast === 'function') smPushToast(t('toast.copied'))
        }
        try {
            if (typeof navigator !== 'undefined' && navigator !== null && navigator.clipboard !== undefined && navigator.clipboard !== null && typeof navigator.clipboard.writeText === 'function') {
                navigator.clipboard.writeText(text).then(done).catch(() => smCopyFallback(text, done))
                return
            }
        } catch (failure) {
            /* fall through */
        }
        smCopyFallback(text, done)
    }

    function smCopyFallback(text, done) {
        if (typeof document === 'undefined' || document === null || document.body === undefined) return
        try {
            const area = document.createElement('textarea')
            area.value = text
            area.setAttribute('readonly', 'readonly')
            area.style.position = 'fixed'
            area.style.left = '-9999px'
            document.body.appendChild(area)
            area.select()
            if (typeof document.execCommand === 'function') document.execCommand('copy')
            document.body.removeChild(area)
            done()
        } catch (failure) {
            /* clipboard is best effort */
        }
    }

    /** Leave the detail page and ask the list to restore its previous scroll offset. */
    function smGoBackToList() {
        const restore = typeof appState.listScrollTop === 'number'
            ? appState.listScrollTop
            : (typeof appState.listScroll === 'number' ? appState.listScroll : null)
        setState({ view: 'list', detail: null, restoreListScroll: restore })
    }

    function smDetailSignature(detail) {
        if (detail === null || typeof detail !== 'object') return 'none'
        return String(detail.kind || 'installed') + '|' + String(detail.id || '') + '|' + String(detail.sourceId || '') + '|' + String(detail.name || '')
    }

    /* ------------------------------------------------------------------ *
     * Small presentational pieces.                                        *
     * ------------------------------------------------------------------ */

    function SmBadge(props) {
        const tone = props.tone || ''
        let background = 'var(--dsw-alias-bg-layer-2)'
        let color = 'var(--dsw-alias-label-secondary)'
        let border = '1px solid var(--dsw-alias-border-l2)'
        if (tone === 'ok') {
            background = 'color-mix(in srgb, var(--dsw-alias-state-success-primary) 12%, transparent)'
            color = 'color-mix(in srgb, var(--dsw-alias-state-success-primary) 82%, var(--dsw-alias-label-primary))'
            border = '1px solid color-mix(in srgb, var(--dsw-alias-state-success-primary) 28%, transparent)'
        } else if (tone === 'warn') {
            background = 'color-mix(in srgb, var(--dsw-alias-state-warn-primary) 12%, transparent)'
            color = 'color-mix(in srgb, var(--dsw-alias-state-warn-primary) 82%, var(--dsw-alias-label-primary))'
            border = '1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary) 28%, transparent)'
        } else if (tone === 'error') {
            background = 'color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, transparent)'
            color = 'color-mix(in srgb, var(--dsw-alias-state-error-primary) 82%, var(--dsw-alias-label-primary))'
            border = '1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 28%, transparent)'
        } else if (tone === 'idle') {
            background = 'var(--dsw-alias-bg-layer-2)'
            color = 'var(--dsw-alias-label-tertiary)'
        }
        return h(
            'span',
            {
                className: 'sm-badge' + (tone !== '' ? ' sm-badge-' + tone : ''),
                style: {
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '1px 8px',
                    borderRadius: '999px',
                    background: background,
                    color: color,
                    border: border,
                    fontSize: 'calc(var(--sm-fs) - 3px)',
                    lineHeight: '18px',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                },
            },
            props.children,
        )
    }

    /** v2.3 upgrade badge: circle + up arrow, fixed first in the tag bar. */
    function SmUpgradeBadge(props) {
        const version = smText(props.version)
        const style = {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '1px 8px 1px 6px',
            borderRadius: '999px',
            background: 'color-mix(in srgb, var(--dsw-alias-state-success-primary) 12%, transparent)',
            color: 'color-mix(in srgb, var(--dsw-alias-state-success-primary) 82%, var(--dsw-alias-label-primary))',
            border: '1px solid color-mix(in srgb, var(--dsw-alias-state-success-primary) 28%, transparent)',
            fontSize: 'calc(var(--sm-fs) - 3px)',
            lineHeight: '18px',
            fontWeight: 500,
            whiteSpace: 'nowrap',
        }
        return h(
            'span',
            {
                className: 'sm-badge sm-badge-update',
                style: style,
                title: t('badge.updateTip', { version: version }),
            },
            h(
                'svg',
                {
                    width: 13,
                    height: 13,
                    viewBox: '0 0 24 24',
                    fill: 'none',
                    stroke: 'currentColor',
                    strokeWidth: 1.8,
                    'aria-hidden': 'true',
                    style: { opacity: 0.9, flexShrink: 0 },
                },
                h('circle', { cx: 12, cy: 12, r: 9 }),
                h('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M8.5 11.5L12 8m0 0l3.5 3.5M12 8v8' }),
            ),
            h('span', { className: 'sm-mono' }, 'v' + version),
        )
    }

    function SmCard(props) {
        return h(
            'div',
            {
                className: 'sm-card' + (props.className ? ' ' + props.className : ''),
                style: Object.assign(
                    {
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        minWidth: 0,
                        padding: '16px 18px',
                        borderRadius: '20px',
                        background: 'var(--dsw-alias-bg-layer-1)',
                        border: '1px solid var(--dsw-alias-border-l2)',
                    },
                    props.style || {},
                ),
            },
            props.children,
        )
    }

    function SmCardTitle(props) {
        return h(
            'div',
            { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' } },
            h('span', { style: { fontSize: 'var(--sm-fs)', fontWeight: 500, color: 'var(--dsw-alias-label-primary)' } }, props.children),
            props.extra === undefined ? null : props.extra,
        )
    }

    function SmMetaRow(props) {
        return h(
            'div',
            { style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' } },
            h('span', { style: { flexShrink: 0, color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, props.label),
            h(
                'span',
                {
                    className: props.mono === true ? 'sm-mono' : undefined,
                    style: {
                        minWidth: 0,
                        textAlign: 'right',
                        wordBreak: 'break-all',
                        color: 'var(--dsw-alias-label-primary)',
                        fontSize: 'calc(var(--sm-fs) - 1px)',
                    },
                },
                props.children,
            ),
        )
    }

    function SmButton(props) {
        const tone = props.tone || 'secondary'
        const tones = {
            primary: {
                background: 'var(--dsw-alias-label-primary)',
                color: 'var(--dsw-alias-bg-base)',
                border: '1px solid transparent',
            },
            secondary: {
                background: 'var(--dsw-alias-bg-layer-2)',
                color: 'var(--dsw-alias-label-primary)',
                border: '1px solid var(--dsw-alias-border-l2)',
            },
            ghost: {
                background: 'transparent',
                color: 'var(--dsw-alias-label-secondary)',
                border: '1px solid transparent',
            },
            danger: {
                background: 'color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, transparent)',
                color: 'var(--dsw-alias-state-error-primary)',
                border: '1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 30%, transparent)',
            },
            dangerSolid: {
                background: 'var(--dsw-alias-state-error-primary)',
                color: 'var(--dsw-alias-bg-base)',
                border: '1px solid transparent',
            },
        }
        const palette = tones[tone] || tones.secondary
        const baseProps = {
            type: 'button',
            className: 'sm-btn sm-btn-' + tone,
            disabled: props.disabled === true,
            onClick: props.onClick,
            style: Object.assign(
                {
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    height: '32px',
                    padding: '0 14px',
                    borderRadius: '10px',
                    fontSize: 'calc(var(--sm-fs) - 1px)',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    cursor: props.disabled === true ? 'not-allowed' : 'pointer',
                    opacity: props.disabled === true ? 0.5 : 1,
                },
                palette,
                props.style || {},
            ),
        }
        if (props.tip !== undefined && props.tip !== null && props.tip !== '' && typeof smTip === 'function') {
            Object.assign(baseProps, smTip(props.tip))
        }
        return h(
            'button',
            baseProps,
            props.icon ? icon(props.icon, 14) : null,
            props.children,
        )
    }

    function SmDetailIcon(props) {
        return h(
            'div',
            {
                className: 'sm-detail-icon',
                style: {
                    position: 'relative',
                    width: '56px',
                    height: '56px',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '16px',
                    background: 'var(--dsw-alias-bg-layer-1)',
                    border: '1px solid var(--dsw-alias-border-l2)',
                    color: 'var(--dsw-alias-label-secondary)',
                },
            },
            icon(skillIconName(props.skill !== null && props.skill !== undefined ? props.skill : props.name), 28),
            h('span', {
                className: 'sm-dot sm-dot-' + (props.tone || 'idle'),
                style: {
                    position: 'absolute',
                    left: '8px',
                    bottom: '8px',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: smDotColor(props.tone),
                    boxShadow: '0 0 0 2px var(--dsw-alias-bg-layer-1)',
                },
            }),
        )
    }

    /** Line-numbered monospace preview. */
    function SmCodePreview(props) {
        const text = typeof props.text === 'string' ? props.text : ''
        const lines = text.split('\n')
        return h(
            'div',
            {
                className: 'sm-code',
                style: {
                    maxHeight: props.maxHeight || '420px',
                    overflow: 'auto',
                    padding: '12px',
                    borderRadius: '14px',
                    background: 'var(--dsw-alias-bg-base)',
                    border: '1px solid var(--dsw-alias-border-l1)',
                },
            },
            h(
                'table',
                {
                    className: 'sm-mono',
                    style: {
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontFamily: SM_MONO,
                        fontSize: 'calc(var(--sm-fs) - 2px)',
                        lineHeight: '20px',
                    },
                },
                h(
                    'tbody',
                    null,
                    lines.map((line, index) =>
                        h(
                            'tr',
                            { key: index },
                            h(
                                'td',
                                {
                                    style: {
                                        width: '32px',
                                        paddingRight: '12px',
                                        textAlign: 'right',
                                        verticalAlign: 'top',
                                        userSelect: 'none',
                                        color: 'var(--dsw-alias-label-caption)',
                                    },
                                },
                                String(index + 1),
                            ),
                            h(
                                'td',
                                {
                                    style: {
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        color: 'var(--dsw-alias-label-primary)',
                                    },
                                },
                                line === '' ? ' ' : line,
                            ),
                        ),
                    ),
                ),
            ),
        )
    }

    function SmDetailSkeleton() {
        const block = (width, height) =>
            h('div', {
                style: {
                    width: width,
                    height: height,
                    borderRadius: '10px',
                    background: 'var(--dsw-alias-bg-layer-2)',
                },
            })
        return h(
            'div',
            { className: 'sm-detail sm-detail-skeleton', style: { display: 'flex', flexDirection: 'column', gap: '24px' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '14px' } }, block('56px', '56px'), h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } }, block('220px', '20px'), block('140px', '14px'))),
            h(
                'div',
                { style: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' } },
                h('div', { style: { display: 'flex', flexDirection: 'column', gap: '16px' } }, block('100%', '140px'), block('100%', '220px'), block('100%', '160px')),
                h('div', { style: { display: 'flex', flexDirection: 'column', gap: '16px' } }, block('100%', '180px'), block('100%', '160px'), block('100%', '120px')),
            ),
            h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 1px)' } }, t('state.loading')),
        )
    }

    function SmDetailErrorState(props) {
        const kind = props.kind === 'market' ? 'market' : 'installed'
        return h(
            'div',
            {
                className: 'sm-card',
                style: {
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '56px 20px',
                    borderRadius: '20px',
                    background: 'var(--dsw-alias-bg-layer-1)',
                    border: '1px solid var(--dsw-alias-border-l2)',
                    color: 'var(--dsw-alias-label-secondary)',
                },
            },
            h('span', { style: { color: 'var(--dsw-alias-state-error-primary)' } }, icon('alert', 28)),
            h('div', { style: { fontSize: 'var(--sm-fs)', fontWeight: 500, color: 'var(--dsw-alias-label-primary)' } }, (kind === 'market' ? t('error.loadMarket') : t('error.loadInstalled'))),
            props.message ? h('div', { style: { fontSize: 'calc(var(--sm-fs) - 2px)' } }, props.message) : null,
            h(SmButton, { tone: 'secondary', onClick: props.onRetry }, t('action.retry')),
        )
    }

    /* ------------------------------------------------------------------ *
     * Detail page component.                                             *
     * ------------------------------------------------------------------ */

    function SmDetailView(props) {
        const detail = props.detail !== null && typeof props.detail === 'object' ? props.detail : {}
        const kind = detail.kind === 'market' ? 'market' : 'installed'
        const signature = smDetailSignature(detail)

        const [data, setData] = useState(null)
        const [loading, setLoading] = useState(true)
        const [error, setError] = useState(null)
        const [editing, setEditing] = useState(false)
        const [draft, setDraft] = useState('')
        const [dirty, setDirty] = useState(false)
        const [saving, setSaving] = useState(false)
        const [saveError, setSaveError] = useState('')
        const [sourceData, setSourceData] = useState(null)
        const [sourceLoading, setSourceLoading] = useState(false)
        const [sourceError, setSourceError] = useState('')

        const alive = useRef(true)
        const saveRef = useRef(() => {})
        const autoEdit = useRef(detail.edit === true)

        useEffect(() => {
            alive.current = true
            return () => {
                alive.current = false
            }
        }, [])

        const reload = useCallback(async () => {
            setLoading(true)
            setError(null)
            setSaveError('')
            setSourceError('')
            try {
                let payload = null
                if (kind === 'installed') {
                    const skill = smFindSkillById(detail.id) || smFindSkillByName(detail.name) || null
                    let path = skill !== null ? smText(skill.path) : ''
                    if (path === '' && typeof detail.path === 'string') path = detail.path
                    if (path === '' && typeof detail.id === 'string' && detail.id.indexOf('/') !== -1) path = detail.id
                    if (path === '') {
                        throw { code: 'E_NOT_FOUND', message: (kind === 'market' ? t('error.loadMarket') : t('error.loadInstalled')) }
                    }
                    payload = await api('/skill?path=' + encodeURIComponent(path))
                    // Market-origin skills carry license/engines/source URL only on the
                    // market detail endpoint; enrich the right column best-effort.
                    if (payload !== null && typeof payload === 'object' && payload.skill !== undefined && payload.skill !== null
                        && payload.skill.market !== undefined && payload.skill.market !== null
                        && typeof payload.skill.market.sourceId === 'string' && payload.skill.market.sourceId !== '') {
                        try {
                            const extra = await api('/market/skill?sourceId=' + encodeURIComponent(payload.skill.market.sourceId) + '&name=' + encodeURIComponent(payload.skill.name))
                            if (extra !== null && typeof extra === 'object' && extra.skill !== undefined && extra.skill !== null) payload.marketInfo = extra.skill
                        } catch (failure) {
                            /* metadata enrichment is best effort */
                        }
                    }
                } else {
                    const cached = smFindMarketSkill(detail.id, detail.sourceId, detail.name)
                    const sourceId = smText(detail.sourceId, cached !== null ? smText(cached.sourceId) : '')
                    const name = smText(detail.name, cached !== null ? smText(cached.name) : '')
                    if (sourceId === '' || name === '') {
                        throw { code: 'E_NOT_FOUND', message: (kind === 'market' ? t('error.loadMarket') : t('error.loadInstalled')) }
                    }
                    payload = await api('/market/skill?sourceId=' + encodeURIComponent(sourceId) + '&name=' + encodeURIComponent(name))
                }
                if (!alive.current) return
                setData(payload !== null && typeof payload === 'object' ? payload : null)
                setLoading(false)
            } catch (failure) {
                if (!alive.current) return
                setError(failure !== null && typeof failure === 'object' ? failure : {})
                setLoading(false)
            }
        }, [signature])

        useEffect(() => {
            void reload()
        }, [reload])

        // Esc returns to the list only when no dialog / drawer is layered on top.
        useEffect(() => {
            const onKeyDown = (event) => {
                if (event.key !== 'Escape') return
                if (typeof dialogStack !== 'undefined' && Array.isArray(dialogStack) && dialogStack.length > 0) return
                event.preventDefault()
                event.stopPropagation()
                smGoBackToList()
            }
            document.addEventListener('keydown', onKeyDown, true)
            return () => document.removeEventListener('keydown', onKeyDown, true)
        }, [])

        const marketCache = kind === 'market'
            ? (data !== null && data.skill !== undefined && data.skill !== null ? data.skill : smFindMarketSkill(detail.id, detail.sourceId, detail.name))
            : null
        const installedSkill = kind === 'installed'
            ? (data !== null && data.skill !== undefined ? data.skill : (smFindSkillById(detail.id) || smFindSkillByName(detail.name)))
            : smFindInstalledCopy(
                smText(detail.name, marketCache !== null ? smText(marketCache.name) : ''),
                marketCache !== null && marketCache.installed !== undefined && marketCache.installed !== null ? smText(marketCache.installed.location) : '',
                marketCache !== null ? smText(marketCache.sourceId) : smText(detail.sourceId),
            )
        const installedMarketSourceId = installedSkill !== null && installedSkill !== undefined &&
            installedSkill.market !== null && typeof installedSkill.market === 'object' &&
            typeof installedSkill.market.sourceId === 'string' ? installedSkill.market.sourceId : ''
        const marketSkill = kind === 'market'
            ? marketCache
            : (data !== null && data.marketInfo !== undefined && data.marketInfo !== null
                ? data.marketInfo
                : smFindMarketSkill('', installedMarketSourceId, installedSkill !== null && installedSkill !== undefined ? installedSkill.name : ''))
        const skill = kind === 'installed' ? installedSkill : marketSkill

        const displayName = smText(skill !== null && skill !== undefined ? skill.name : '', smText(detail.name))
        const description = smText(skill !== null && skill !== undefined ? skill.description : '', kind === 'market' && marketSkill !== null ? smText(marketSkill.description) : '')
        const whenToUse = smText(skill !== null && skill !== undefined ? skill.whenToUse : '')
        const currentVersion = smVersionOf(installedSkill, marketSkill)
        const updateVersion = smUpdateVersionFor(installedSkill, marketSkill)
        const isInstalled = installedSkill !== null && installedSkill !== undefined
        const writable = isInstalled && installedSkill.writable === true
        const location = isInstalled ? smFindLocation(installedSkill.location) : null
        const statusTone = isInstalled ? smStatusTone(installedSkill.status) : 'idle'

        const beginEdit = (payload) => {
            setDraft(payload !== null && payload !== undefined && typeof payload.content === 'string' ? payload.content : '')
            setDirty(false)
            setSaveError('')
            setEditing(true)
        }

        const startEdit = () => {
            if (!writable || sourceLoading) return
            if (kind === 'installed') {
                beginEdit(data)
                return
            }
            // Market entry whose skill is also installed: lazily load the
            // installed copy so the editor gets real content and mtime.
            const path = installedSkill !== null && installedSkill !== undefined ? smText(installedSkill.path) : ''
            if (path === '') {
                setSourceError(t('error.notFound'))
                return
            }
            setSourceLoading(true)
            setSourceError('')
            api('/skill?path=' + encodeURIComponent(path)).then((payload) => {
                if (!alive.current) return
                setSourceLoading(false)
                setSourceData(payload !== null && typeof payload === 'object' ? payload : null)
                beginEdit(payload)
            }).catch((failure) => {
                if (!alive.current) return
                setSourceLoading(false)
                setSourceError(smErrorMessage(failure))
            })
        }

        const saveEdit = async () => {
            if (!writable || saving) return
            const editSource = kind === 'market' ? sourceData : data
            const editSkill = editSource !== null && editSource !== undefined && editSource.skill !== undefined && editSource.skill !== null
                ? editSource.skill
                : null
            const path = editSkill !== null && typeof editSkill.path === 'string' && editSkill.path !== ''
                ? editSkill.path
                : (installedSkill !== null && installedSkill !== undefined ? smText(installedSkill.path) : '')
            const mtime = editSkill !== null && typeof editSkill.mtime === 'number'
                ? editSkill.mtime
                : (installedSkill !== null && installedSkill !== undefined ? installedSkill.mtime : 0)
            if (path === '') {
                setSaveError(t('error.notFound'))
                return
            }
            setSaving(true)
            setSaveError('')
            try {
                await api('/skill', { method: 'PUT', body: { path: path, mtime: mtime, content: draft } })
                setSaving(false)
                setEditing(false)
                setDirty(false)
                setSourceData(null)
                if (typeof smPushToast === 'function') smPushToast(t('toast.saved'))
                void loadInstalled(true)
                await reload()
            } catch (failure) {
                setSaving(false)
                if (failure !== null && typeof failure === 'object' && failure.code === 'E_CONFLICT_MTIME') {
                    setSaveError(t('detail.conflictMtime'))
                } else {
                    setSaveError(smErrorMessage(failure))
                }
            }
        }
        saveRef.current = saveEdit

        // Cmd/Ctrl + S saves while the inline editor is open.
        useEffect(() => {
            if (!editing) return undefined
            const onKeyDown = (event) => {
                if ((event.metaKey || event.ctrlKey) && String(event.key).toLowerCase() === 's') {
                    event.preventDefault()
                    saveRef.current()
                }
            }
            document.addEventListener('keydown', onKeyDown, true)
            return () => document.removeEventListener('keydown', onKeyDown, true)
        }, [editing])

        // The row menu can open the detail straight into the editor (`detail.edit`).
        useEffect(() => {
            if (!autoEdit.current || data === null || !writable) return
            autoEdit.current = false
            setDraft(typeof data.content === 'string' ? data.content : '')
            setDirty(false)
            setSaveError('')
            setEditing(true)
        }, [data])

        if (loading) {
            return h(
                'div',
                { className: 'sm-detail-page sm-scroll', style: { display: 'flex', flexDirection: 'column', gap: '20px', flex: '1 1 auto', minHeight: 0, overflowY: 'auto' } },
                h('button', {
                    type: 'button',
                    className: 'sm-detail-back',
                    onClick: smGoBackToList,
                    style: {
                        alignSelf: 'flex-start',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        height: '28px',
                        padding: '0 8px',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--dsw-alias-label-tertiary)',
                        fontSize: 'calc(var(--sm-fs) - 1.5px)',
                        cursor: 'pointer',
                    },
                }, '← ' + (kind === 'market' ? t('detail.backMarket') : t('detail.backInstalled'))),
                h(SmDetailSkeleton),
            )
        }

        if (error !== null) {
            return h(
                'div',
                { className: 'sm-detail-page sm-scroll', style: { display: 'flex', flexDirection: 'column', gap: '20px', flex: '1 1 auto', minHeight: 0, overflowY: 'auto' } },
                h('button', {
                    type: 'button',
                    className: 'sm-detail-back',
                    onClick: smGoBackToList,
                    style: {
                        alignSelf: 'flex-start',
                        height: '28px',
                        padding: '0 8px',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--dsw-alias-label-tertiary)',
                        fontSize: 'calc(var(--sm-fs) - 1.5px)',
                        cursor: 'pointer',
                    },
                }, '← ' + (kind === 'market' ? t('detail.backMarket') : t('detail.backInstalled'))),
                h(SmDetailErrorState, { kind: kind, message: smErrorMessage(error), onRetry: () => { void reload() } }),
            )
        }

        /* ---------------- header tags ---------------- */

        const tags = []
        if (updateVersion !== '') tags.push(h(SmUpgradeBadge, { key: 'update', version: updateVersion }))
        if (location !== null) tags.push(h(SmBadge, { key: 'loc', tone: 'ok' }, smLocationLabel(location.id, location.label) + ' · rank ' + String(location.rank)))
        if (marketSkill !== null && marketSkill !== undefined && Array.isArray(marketSkill.tags)) {
            marketSkill.tags.slice(0, 3).forEach((tag, index) => tags.push(h(SmBadge, { key: 'tag' + String(index) }, tag)))
        } else if (installedSkill !== null && installedSkill !== undefined && installedSkill.invocation !== undefined) {
            if (installedSkill.invocation.modelInvocable === true) tags.push(h(SmBadge, { key: 'model' }, t('badge.model')))
            if (installedSkill.invocation.userInvocable === true) tags.push(h(SmBadge, { key: 'user' }, t('badge.user')))
        }
        const visibleTags = tags.slice(0, 4)

        const statusLabel = !isInstalled
            ? t('detail.notInstalled')
            : (updateVersion !== '' ? t('badge.update') : t('install.installed'))
        const statusBadgeTone = !isInstalled ? 'idle' : (updateVersion !== '' ? 'ok' : 'ok')

        /* ---------------- header actions ---------------- */

        const headerActions = []
        if (!isInstalled && marketSkill !== null && marketSkill !== undefined) {
            headerActions.push(h(SmButton, {
                key: 'install',
                tone: 'primary',
                onClick: () => openModal('install', { sourceId: marketSkill.sourceId, name: marketSkill.name, version: marketSkill.version, skill: marketSkill }),
            }, t('action.install')))
        }
        if (isInstalled) {
            if (updateVersion !== '') {
                headerActions.push(h(SmButton, {
                    key: 'update',
                    tone: 'primary',
                    onClick: () => openModal('update', { skill: installedSkill }),
                }, t('action.update') + ' v' + updateVersion))
            }
            headerActions.push(h(SmButton, {
                key: 'copy',
                tone: 'secondary',
                icon: 'copy',
                tip: t('badge.userTip'),
                onClick: () => smCopyText('/' + displayName),
            }, t('detail.copyCommand') + ' (/' + displayName + ')'))
            if (writable) {
                headerActions.push(h(SmButton, {
                    key: 'edit',
                    tone: updateVersion !== '' ? 'secondary' : 'primary',
                    icon: 'edit',
                    disabled: sourceLoading,
                    onClick: startEdit,
                }, sourceLoading ? t('state.loading') : t('action.editContent')))
            } else if (kind === 'installed') {
                headerActions.push(h(SmButton, { key: 'readonly', tone: 'secondary', disabled: true, tip: t('status.readonly') }, t('status.readonly')))
            }
            if (writable) {
                headerActions.push(h(SmButton, {
                    key: 'remove',
                    tone: 'danger',
                    icon: 'trash',
                    onClick: () => openModal('confirm-delete', {
                        mode: installedSkill.market !== undefined && installedSkill.market !== null ? 'uninstall' : 'delete',
                        skill: installedSkill,
                    }),
                }, installedSkill.market !== undefined && installedSkill.market !== null ? t('action.uninstall') : t('action.delete')))
            }
        }

        /* ---------------- left column ---------------- */

        const leftCards = []

        if (sourceError !== '') leftCards.push(h(SmBanner, { tone: 'error' }, sourceError))

        if (isInstalled) {
            const bannerTone = installedSkill.status === 'shadowed' ? 'warn' : (installedSkill.status === 'invalid' ? 'error' : (installedSkill.status === 'disabled' ? 'idle' : 'ok'))
            leftCards.push(h(
                SmCard,
                { key: 'installed-banner', style: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' } },
                h(
                    'div',
                    { style: { display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 } },
                    h(
                        'div',
                        { style: { fontSize: 'calc(var(--sm-fs) - 1px)', fontWeight: 500, color: 'var(--dsw-alias-label-primary)' } },
                        t('detail.location') + ' · ' + smLocationLabel(installedSkill.location, location !== null ? location.label : ''),
                    ),
                    h(
                        'div',
                        { className: 'sm-mono', style: { wordBreak: 'break-all', color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)' } },
                        smText(installedSkill.path, installedSkill.sourceType === 'bundled' ? t('loc.bundled') : '—'),
                    ),
                    h(
                        'div',
                        { style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', fontSize: 'calc(var(--sm-fs) - 2px)', color: 'var(--dsw-alias-label-secondary)' } },
                        h(SmBadge, { tone: bannerTone }, installedSkill.status === 'shadowed'
                            ? t('badge.shadowedTip', { path: smText(installedSkill.shadowedBy, '—') })
                            : (installedSkill.status === 'disabled' ? t('state.disabled') : (installedSkill.status === 'invalid' ? t('state.invalid') : t('state.active')))),
                        currentVersion !== '' ? h('span', null, t('install.version') + ': v' + currentVersion) : null,
                        installedSkill.market !== undefined && installedSkill.market !== null && typeof installedSkill.market.installedAt === 'number'
                            ? h('span', null, t('detail.installedAt') + ': ' + fmtTime(installedSkill.market.installedAt))
                            : null,
                        typeof installedSkill.mtime === 'number' ? h('span', null, t('detail.updatedAt') + ': ' + fmtTime(installedSkill.mtime)) : null,
                        installedSkill.market !== undefined && installedSkill.market !== null && installedSkill.market.localModified === true
                            ? h('span', { style: { color: 'var(--dsw-alias-state-warn-primary)' } }, t('detail.localModified'))
                            : null,
                    ),
                ),
                smText(installedSkill.path) !== ''
                    ? h(SmButton, { tone: 'secondary', icon: 'copy', onClick: () => smCopyText(installedSkill.path) }, t('action.copyPath'))
                    : null,
            ))
        }

        leftCards.push(h(
            SmCard,
            { key: 'description' },
            h(
                'div',
                null,
                h('div', { style: { marginBottom: '4px', color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, t('detail.description')),
                h('div', { style: { color: 'var(--dsw-alias-label-primary)', fontSize: 'var(--sm-fs)', lineHeight: '1.55' } }, description !== '' ? description : '—'),
            ),
            h(
                'div',
                { style: { paddingTop: '10px', borderTop: '1px solid var(--dsw-alias-border-l1)' } },
                h('div', { style: { marginBottom: '4px', color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, t('detail.whenToUse')),
                h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 1px)', lineHeight: '1.5' } }, whenToUse !== '' ? whenToUse : t('detail.whenToUseEmpty')),
            ),
        ))

        const content = data !== null && typeof data.content === 'string' ? data.content : ''
        const readme = data !== null && typeof data.readme === 'string' ? data.readme : ''

        if (editing && writable) {
            leftCards.push(h(
                SmCard,
                { key: 'content-edit' },
                h(
                    'div',
                    { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' } },
                    h('span', { style: { fontSize: 'var(--sm-fs)', fontWeight: 500, color: 'var(--dsw-alias-label-primary)' } }, t('action.editContent')),
                    h('span', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                        dirty ? h(SmBadge, { tone: 'warn' }, t('detail.unsaved')) : null,
                        h('span', { className: 'sm-mono', style: { color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 3px)' } }, t('detail.mtimeHint')),
                    ),
                ),
                h('textarea', {
                    className: 'sm-mono',
                    value: draft,
                    spellCheck: false,
                    onChange: (event) => {
                        setDraft(event.target.value)
                        setDirty(true)
                        setSaveError('')
                    },
                    style: {
                        minHeight: '320px',
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '12px',
                        resize: 'vertical',
                        borderRadius: '14px',
                        background: 'var(--dsw-alias-bg-base)',
                        border: '1px solid var(--dsw-alias-border-l2)',
                        color: 'var(--dsw-alias-label-primary)',
                        fontFamily: SM_MONO,
                        fontSize: 'calc(var(--sm-fs) - 2px)',
                        lineHeight: '20px',
                    },
                }),
                saveError !== '' ? h('div', { className: 'sm-form-error', style: { color: 'var(--dsw-alias-state-error-primary)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, saveError) : null,
                h(
                    'div',
                    { style: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' } },
                    saveError === t('detail.conflictMtime')
                        ? h(SmButton, { tone: 'secondary', icon: 'refresh', onClick: () => { setEditing(false); setDirty(false); setSaveError(''); void reload() } }, t('action.refresh'))
                        : null,
                    h(SmButton, { tone: 'ghost', onClick: () => { setEditing(false); setDirty(false); setSaveError('') } }, t('action.cancel')),
                    h(SmButton, { tone: 'primary', disabled: saving, onClick: () => { void saveEdit() } }, saving ? (t('action.save') + '…') : t('action.save')),
                ),
            ))
        } else if (kind === 'installed') {
            leftCards.push(h(
                SmCard,
                { key: 'content-preview' },
                h(
                    SmCardTitle,
                    { extra: h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                        h('span', { className: 'sm-mono', style: { color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 3px)', wordBreak: 'break-all' } }, smText(installedSkill !== null && installedSkill !== undefined ? installedSkill.path : '')),
                        writable ? h(SmButton, { tone: 'secondary', icon: 'edit', style: { height: '26px', padding: '0 10px' }, onClick: startEdit }, t('action.editContent')) : null,
                    ) },
                    'SKILL.md · ' + t('detail.content'),
                ),
                h(SmCodePreview, { text: content }),
            ))
        } else {
            leftCards.push(h(
                SmCard,
                { key: 'content-readme' },
                h(SmCardTitle, null, 'README · ' + t('detail.content')),
                readme !== ''
                    ? h(SmCodePreview, { text: readme, maxHeight: '460px' })
                    : h('div', { style: { color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, t('detail.marketReadmeMissing')),
            ))
        }

        const files = data !== null && Array.isArray(data.files)
            ? data.files
            : (marketSkill !== null && marketSkill !== undefined && Array.isArray(marketSkill.files) ? marketSkill.files : [])

        leftCards.push(h(
            SmCard,
            { key: 'files' },
            h(SmCardTitle, null, t('detail.files') + ' (' + String(files.length) + ')'),
            files.length === 0
                ? h('div', { style: { color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, t('detail.noFiles'))
                : h(
                    'div',
                    { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
                    files.map((file, index) => {
                        const entry = file !== null && typeof file === 'object' ? file : {}
                        return h(
                            'div',
                            {
                                key: index,
                                style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '12px',
                                    padding: '10px 12px',
                                    borderRadius: '12px',
                                    background: 'var(--dsw-alias-bg-base)',
                                    border: '1px solid var(--dsw-alias-border-l1)',
                                },
                            },
                            h('span', { className: 'sm-mono', style: { minWidth: 0, wordBreak: 'break-all', color: 'var(--dsw-alias-label-primary)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, smText(entry.path, '—')),
                            h(
                                'span',
                                { className: 'sm-mono', style: { display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 3px)' } },
                                typeof entry.sha256 === 'string' && entry.sha256 !== '' ? h('span', null, 'sha256: ' + entry.sha256.slice(0, 12) + '…') : null,
                                typeof entry.size === 'number' ? h('span', null, fmtSize(entry.size)) : null,
                                typeof entry.type === 'string' && entry.type !== '' ? h('span', null, entry.type) : null,
                            ),
                        )
                    }),
                ),
        ))

        /* ---------------- right column ---------------- */

        const rightCards = []

        const metaSourceName = marketSkill !== null && marketSkill !== undefined && smText(marketSkill.sourceName) !== ''
            ? smText(marketSkill.sourceName)
            : (installedSkill !== null && installedSkill !== undefined && installedSkill.market !== undefined && installedSkill.market !== null ? smText(installedSkill.market.sourceName) : '')
        const metaSourceUrl = marketSkill !== null && marketSkill !== undefined ? smText(marketSkill.sourceUrl) : ''
        const metaAuthor = marketSkill !== null && marketSkill !== undefined ? smText(marketSkill.author) : ''
        const metaLicense = marketSkill !== null && marketSkill !== undefined ? smText(marketSkill.license) : ''
        const metaEngines = marketSkill !== null && marketSkill !== undefined ? smText(marketSkill.enginesDsh) : ''
        const metaCommit = marketSkill !== null && marketSkill !== undefined && smText(marketSkill.commit) !== ''
            ? smText(marketSkill.commit)
            : (installedSkill !== null && installedSkill !== undefined && installedSkill.market !== undefined && installedSkill.market !== null ? smText(installedSkill.market.commit) : '')
        const metaProvider = installedSkill !== null && installedSkill !== undefined ? smText(installedSkill.provider) : ''
        const metaLocationLabel = isInstalled
            ? smLocationLabel(installedSkill.location, location !== null ? location.label : '') + (location !== null ? ' · rank ' + String(location.rank) : '')
            : t('detail.notInstalledMeta')
        const metaLayer = location !== null ? String(location.layer) : ''

        rightCards.push(h(
            SmCard,
            { key: 'meta' },
            h(SmCardTitle, null, t('detail.meta')),
            h(
                'div',
                { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
                h(SmMetaRow, { label: t('detail.location') }, metaLocationLabel),
                metaLayer !== '' ? h(SmMetaRow, { label: t('detail.layer'), mono: true }, metaLayer) : null,
                metaProvider !== '' ? h(SmMetaRow, { label: t('detail.provider'), mono: true }, metaProvider) : null,
                metaSourceName !== '' ? h(SmMetaRow, { label: t('detail.source') }, metaSourceName) : null,
                metaSourceUrl !== '' ? h(SmMetaRow, { label: t('detail.source') + ' URL', mono: true }, metaSourceUrl) : null,
                metaAuthor !== '' ? h(SmMetaRow, { label: t('detail.author') }, metaAuthor) : null,
                metaLicense !== '' ? h(SmMetaRow, { label: t('detail.license'), mono: true }, metaLicense) : null,
                metaEngines !== '' ? h(SmMetaRow, { label: t('detail.engines'), mono: true }, metaEngines) : null,
                metaCommit !== '' ? h('div', null,
                    h('div', { style: { marginBottom: '2px', color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, t('detail.commit')),
                    h('div', { className: 'sm-mono', style: { wordBreak: 'break-all', color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 3px)' } }, metaCommit),
                ) : null,
            ),
        ))

        const invocation = installedSkill !== null && installedSkill !== undefined && installedSkill.invocation !== undefined ? installedSkill.invocation : null
        const modelInvocable = invocation !== null ? invocation.modelInvocable === true : true
        const userInvocable = invocation !== null ? invocation.userInvocable === true : true
        const visiblePresets = installedSkill !== null && installedSkill !== undefined && Array.isArray(installedSkill.visiblePresets) ? installedSkill.visiblePresets : []
        const globalLayer = location !== null && location.layer === 'global'

        rightCards.push(h(
            SmCard,
            { key: 'visibility' },
            h(SmCardTitle, null, t('detail.invocation')),
            h(
                'div',
                { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
                h(
                    'div',
                    { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' } },
                    h('span', { style: { color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, t('detail.invocation')),
                    h('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' } },
                        modelInvocable ? h(SmBadge, { tone: 'ok' }, t('badge.model')) : null,
                        userInvocable ? h(SmBadge, { tone: 'ok' }, t('badge.user')) : h(SmBadge, { tone: 'idle' }, t('badge.userOnly')),
                        userInvocable ? h(SmBadge, { key: 'cmd', mono: true }, '/' + displayName) : null,
                    ),
                ),
                h('div', null,
                    h('div', { style: { marginBottom: '6px', color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, t('detail.visibility')),
                    globalLayer
                        ? h('div', null, h(SmBadge, { tone: 'ok' }, t('detail.allPresets')))
                        : h(
                            'div',
                            { style: { display: 'flex', flexWrap: 'wrap', gap: '6px' } },
                            SM_PRESETS.map((preset) => {
                                const visible = !isInstalled
                                    ? false
                                    : (visiblePresets.indexOf(preset) !== -1)
                                const label = preset + (visible ? '' : ' (' + t('detail.presetInvisible') + ')')
                                return h(SmBadge, {
                                    key: preset,
                                    tone: visible ? 'ok' : 'idle',
                                    className: 'sm-chip',
                                }, label)
                            }),
                        ),
                ),
            ),
        ))

        const relatedIssues = smIssueList().filter((issue) => {
            if (!issue) return false
            if (installedSkill !== null && installedSkill !== undefined && issue.path === installedSkill.path) return true
            if (installedSkill !== null && installedSkill !== undefined && typeof issue.name === 'string' && issue.name === installedSkill.name) return true
            return false
        })
        const shadowed = installedSkill !== null && installedSkill !== undefined && installedSkill.status === 'shadowed'
        const diagTone = !isInstalled
            ? 'idle'
            : (relatedIssues.length === 0 && !shadowed ? 'ok' : (relatedIssues.some((issue) => issue.severity === 'error') ? 'error' : 'warn'))

        rightCards.push(h(
            SmCard,
            { key: 'diagnostics' },
            h(
                SmCardTitle,
                { extra: h(SmBadge, { tone: diagTone }, !isInstalled
                    ? t('detail.notInstalled')
                    : (diagTone === 'ok' ? '✓ ' + t('detail.diagOk') : (shadowed ? t('badge.shadowed') : t('badge.invalid')))) },
                t('detail.diagnostics'),
            ),
            h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)', lineHeight: '1.5' } },
                !isInstalled
                    ? t('detail.diagAfterInstall')
                    : (shadowed
                        ? t('badge.shadowedTip', { path: smText(installedSkill.shadowedBy, '—') })
                        : (relatedIssues.length === 0
                            ? t('diag.none')
                            : relatedIssues.map((issue, index) => h('div', { key: index, style: { marginBottom: '4px' } }, '· ' + smText(issue.message, issue.kind))))),
            ),
            shadowed
                ? h(SmButton, {
                    tone: 'secondary',
                    onClick: () => {
                        const active = smFindActiveSkillByName(installedSkill.name)
                        if (active !== null) setState({ tab: 'installed', view: 'detail', detail: { kind: 'installed', id: active.id, name: active.name } })
                    },
                }, t('action.viewActive') + ' →')
                : (relatedIssues.length > 0
                    ? h(SmButton, { tone: 'secondary', onClick: () => openDiagnosticsDrawer() }, t('diag.viewReasons') + ' →')
                    : null),
        ))

        /* ---------------- page ---------------- */

        return h(
            'div',
            { className: 'sm-detail-page sm-scroll', style: { display: 'flex', flexDirection: 'column', gap: '20px', flex: '1 1 auto', minHeight: 0, overflowY: 'auto' } },
            h(
                'div',
                { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' } },
                h('button', {
                    type: 'button',
                    className: 'sm-detail-back',
                    onClick: smGoBackToList,
                    style: {
                        height: '28px',
                        padding: '0 8px',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--dsw-alias-label-tertiary)',
                        fontSize: 'calc(var(--sm-fs) - 1.5px)',
                        cursor: 'pointer',
                    },
                }, '← ' + (kind === 'market' ? t('detail.backMarket') : t('detail.backInstalled'))),
                h(
                    'div',
                    { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                    h('span', { style: { color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 3px)' } }, t('detail.escHint')),
                    h(SmBadge, { tone: statusBadgeTone }, statusLabel),
                ),
            ),
            h(
                'div',
                {
                    className: 'sm-detail-head',
                    style: {
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: '16px',
                        flexWrap: 'wrap',
                        paddingBottom: '20px',
                        borderBottom: '1px solid var(--dsw-alias-border-l2)',
                    },
                },
                h(
                    'div',
                    { style: { display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 } },
                    h(SmDetailIcon, { tone: statusTone, skill: skill, name: displayName }),
                    h(
                        'div',
                        { style: { display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 } },
                        h(
                            'div',
                            { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } },
                            h('h2', { className: 'sm-mono sm-detail-title', style: { margin: 0, fontSize: 'calc(var(--sm-fs) + 2px)', lineHeight: '1.4', fontWeight: 500, color: 'var(--dsw-alias-label-primary)' } }, displayName),
                            currentVersion !== '' ? h('span', { className: 'sm-mono', style: { color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, 'v' + currentVersion) : null,
                            h(
                                'div',
                                { className: 'sm-chips', style: { display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'nowrap', overflow: 'hidden', maxWidth: '340px' } },
                                visibleTags,
                            ),
                        ),
                        h(
                            'div',
                            { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)' } },
                            kind === 'market' && marketSkill !== null && marketSkill !== undefined
                                ? t('detail.author') + ': ' + smText(marketSkill.author, '—')
                                    + ' · ' + t('detail.source') + ': ' + smText(marketSkill.sourceName, '—')
                                    + ' · ' + t('detail.updatedAt') + ': ' + (typeof marketSkill.publishTimestamp === 'number' ? fmtTime(marketSkill.publishTimestamp) : '—')
                                : t('detail.location') + ': ' + smLocationLabel(installedSkill !== null && installedSkill !== undefined ? installedSkill.location : '', location !== null ? location.label : '—')
                                    + ' · ' + t('detail.provider') + ': ' + smText(installedSkill !== null && installedSkill !== undefined ? installedSkill.provider : '', '—')
                                    + ' · ' + t('detail.updatedAt') + ': ' + (installedSkill !== null && installedSkill !== undefined && typeof installedSkill.mtime === 'number' ? fmtTime(installedSkill.mtime) : '—'),
                        ),
                    ),
                ),
                h('div', { className: 'sm-detail-actions', style: { display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' } }, headerActions),
            ),
            h(
                'div',
                {
                    className: 'sm-detail sm-detail-body',
                    style: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', alignItems: 'start', minWidth: 0 },
                },
                h('div', { className: 'sm-detail-main', style: { display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 } }, leftCards),
                h('div', { className: 'sm-detail-side', style: { display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 } }, rightCards),
            ),
        )
    }

    /** Entry point used by the page shell when `appState.view === 'detail'`. */
    function renderDetailPage() {
        const detail = appState.detail
        if (detail === null || typeof detail !== 'object') {
            if (appState.tab === 'market') return renderMarketTab()
            if (appState.tab === 'sources') return renderSourcesTab()
            return renderInstalledTab()
        }
        return h(SmDetailView, { key: smDetailSignature(detail), detail: detail })
    }
// ===== 50-modals.js =====
    /* ------------------------------------------------------------------ *
     * 50-modals.js — six dialogs, the diagnostics drawer, toasts and the  *
     * singleton tooltip.                                                  *
     *                                                                    *
     * Playbook §2/§3: no glow, transparent backdrop, host-coloured body,  *
     * layered Escape/backdrop handling, scrolling body with min-height:0. *
     * ------------------------------------------------------------------ */

    const SM_INPUT_STYLE = {
        width: '100%',
        height: '32px',
        boxSizing: 'border-box',
        padding: '0 10px',
        borderRadius: '10px',
        border: '1px solid var(--dsw-alias-border-l2)',
        background: 'var(--dsw-alias-bg-base)',
        color: 'var(--dsw-alias-label-primary)',
        fontSize: 'calc(var(--sm-fs) - 1px)',
        outline: 'none',
    }
    const SM_TEXTAREA_STYLE = {
        width: '100%',
        minHeight: '120px',
        boxSizing: 'border-box',
        padding: '10px',
        borderRadius: '10px',
        border: '1px solid var(--dsw-alias-border-l2)',
        background: 'var(--dsw-alias-bg-base)',
        color: 'var(--dsw-alias-label-primary)',
        fontFamily: SM_MONO,
        fontSize: 'calc(var(--sm-fs) - 2px)',
        lineHeight: '20px',
        resize: 'vertical',
        outline: 'none',
    }
    const SM_SELECT_STYLE = {
        width: '100%',
        height: '32px',
        boxSizing: 'border-box',
        padding: '0 8px',
        borderRadius: '10px',
        border: '1px solid var(--dsw-alias-border-l2)',
        background: 'var(--dsw-alias-bg-base)',
        color: 'var(--dsw-alias-label-primary)',
        fontSize: 'calc(var(--sm-fs) - 1px)',
        outline: 'none',
    }

    /* ------------------------------------------------------------------ *
     * Layer state.                                                       *
     * ------------------------------------------------------------------ */

    const smModals = []
    const dialogStack = []
    let smModalSeq = 0

    const smDiagnostics = {
        open: false,
        loading: false,
        error: null,
        data: null,
        checkedAt: 0,
    }

    function smErrorMessage(failure) {
        const code = failure !== null && failure !== undefined && typeof failure.code === 'string' ? failure.code : ''
        const keys = {
            E_UNAUTHORIZED: 'error.unauthorized',
            E_PATH_OUTSIDE_ROOT: 'error.pathOutside',
            E_READONLY_LOCATION: 'error.readonly',
            E_NAME_TAKEN: 'form.nameTaken',
            E_FRONTMATTER: 'error.frontmatter',
            E_NAME_INVALID: 'form.nameInvalid',
            E_NOT_FOUND: 'error.notFound',
            E_CONFLICT_MTIME: 'detail.conflictMtime',
            E_SOURCE_UNREACHABLE: 'source.error.fetch',
            E_SOURCE_SCHEMA: 'source.error.schema',
            E_CHECKSUM: 'error.checksum',
            E_NOT_ENOUGH_SPACE: 'error.space',
            E_CANCELED: 'error.canceled',
            E_TOO_LARGE: 'error.tooLarge',
            E_BAD_REQUEST: 'error.badRequest',
            E_INTERNAL: 'error.generic',
        }
        if (code !== '' && keys[code] !== undefined) return t(keys[code])
        if (failure !== null && failure !== undefined && typeof failure.message === 'string' && failure.message !== '') return failure.message
        return t('error.generic')
    }

    function smMarketFromPayload(payload) {
        const source = payload !== null && typeof payload === 'object' ? payload : {}
        const sourceId = typeof source.sourceId === 'string' ? source.sourceId : ''
        /* 同源校验：payload 带 sourceId 时，任何候选条目（含 payload.skill）
           都必须同源，缺 sourceId 的条目才允许按 name 回退。 */
        const matchesSource = (item) => sourceId === ''
            || typeof item.sourceId !== 'string'
            || item.sourceId === ''
            || item.sourceId === sourceId
        if (source.skill !== null && typeof source.skill === 'object' && typeof source.skill.name === 'string' && matchesSource(source.skill)) return source.skill
        if (source.marketSkill !== null && typeof source.marketSkill === 'object' && typeof source.marketSkill.name === 'string' && matchesSource(source.marketSkill)) return source.marketSkill
        const list = Array.isArray(appState.marketSkills) ? appState.marketSkills : []
        for (let index = 0; index < list.length; index += 1) {
            const item = list[index]
            if (!item) continue
            if (typeof source.id === 'string' && source.id !== '' && item.id === source.id) return item
            if (typeof source.name === 'string' && source.name !== '' && item.name === source.name && matchesSource(item)) return item
        }
        return null
    }

    function smLocationOptions() {
        return [
            { value: 'user-dsh', label: t('loc.userDsh') + ' (~/.dsh/skills)', disabled: smLocationDisabled('user-dsh') },
            { value: 'user-agents', label: t('loc.userAgents') + ' (~/.agents/skills)', disabled: smLocationDisabled('user-agents') },
            {
                value: 'project-dsh',
                label: t('loc.projectDsh') + ' (<repo>/.dsh/skills)',
                hint: typeof appState.cwd !== 'string' || appState.cwd === '' ? t('form.locationProjectDisabled') : '',
                disabled: smLocationDisabled('project-dsh'),
            },
        ]
    }

    /* ------------------------------------------------------------------ *
     * Toasts.                                                            *
     * ------------------------------------------------------------------ */

    /** Thin alias over the prelude's canonical toast queue (appState.toasts). */
    function smPushToast(message, options) {
        return toast(message, options)
    }

    function smDismissToast(id) {
        if (!Array.isArray(appState.toasts)) return
        const next = appState.toasts.filter((item) => item && item.id !== id)
        if (next.length === appState.toasts.length) return
        appState.toasts = next
        if (typeof rerender === 'function') rerender()
    }

    function smNormalizeToast(item, index) {
        if (typeof item === 'string') {
            return { id: 'ext-' + String(index), message: item, tone: 'info', actionLabel: '', onAction: null }
        }
        if (item === null || typeof item !== 'object') return null
        const message = typeof item.message === 'string' ? item.message : (typeof item.text === 'string' ? item.text : '')
        if (message === '') return null
        return {
            id: item.id !== undefined && item.id !== null ? item.id : 'ext-' + String(index),
            message: message,
            tone: item.tone === 'error' || item.type === 'error' ? 'error' : (item.tone === 'info' || item.type === 'info' ? 'info' : 'ok'),
            actionLabel: typeof item.actionLabel === 'string' ? item.actionLabel : (typeof item.action === 'string' ? item.action : ''),
            onAction: typeof item.onAction === 'function' ? item.onAction : (typeof item.undo === 'function' ? item.undo : null),
        }
    }

    /** Bottom-centre toast list, rendered from the shared `appState.toasts` queue. */
    function renderToastHost() {
        const items = []
        if (Array.isArray(appState.toasts)) {
            for (let index = 0; index < appState.toasts.length; index += 1) {
                const normalized = smNormalizeToast(appState.toasts[index], index)
                if (normalized !== null) items.push(normalized)
            }
        }
        if (items.length === 0) return null
        return h(
            'div',
            {
                className: 'sm-toast-host sm-toasts',
                style: {
                    position: 'fixed',
                    left: '50%',
                    bottom: '20px',
                    transform: 'translateX(-50%)',
                    zIndex: 2100,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    maxWidth: 'min(480px, calc(100vw - 32px))',
                    pointerEvents: 'none',
                },
            },
            items.map((item) => h(
                'div',
                {
                    key: String(item.id),
                    className: 'sm-toast sm-toast-' + (item.tone === 'error' ? 'error' : (item.tone === 'info' ? 'info' : 'ok')) + ' sm-' + (item.tone === 'error' ? 'error' : (item.tone === 'info' ? 'info' : 'ok')),
                    role: 'status',
                    style: {
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        maxWidth: '100%',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        background: 'var(--dsw-alias-bg-layer-3)',
                        border: '1px solid var(--dsw-alias-border-l2)',
                        color: 'var(--dsw-alias-label-primary)',
                        fontSize: 'calc(var(--sm-fs) - 1px)',
                        lineHeight: '18px',
                        boxShadow: 'none',
                        pointerEvents: 'auto',
                    },
                },
                h('span', {
                    style: {
                        flexShrink: 0,
                        color: item.tone === 'error'
                            ? 'var(--dsw-alias-state-error-primary)'
                            : (item.tone === 'info' ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-state-success-primary)'),
                    },
                }, icon(item.tone === 'error' ? 'alert' : (item.tone === 'info' ? 'info' : 'check'), 16)),
                h('span', { style: { minWidth: 0, wordBreak: 'break-word' } }, item.message),
                item.actionLabel !== '' && item.onAction !== null
                    ? h('button', {
                        type: 'button',
                        className: 'sm-toast-action',
                        onClick: () => {
                            try {
                                item.onAction()
                            } finally {
                                smDismissToast(item.id)
                            }
                        },
                        style: {
                            flexShrink: 0,
                            height: '24px',
                            padding: '0 6px',
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--dsw-alias-brand-primary)',
                            fontSize: 'calc(var(--sm-fs) - 1px)',
                            fontWeight: 500,
                            cursor: 'pointer',
                        },
                    }, item.actionLabel)
                    : null,
            )),
        )
    }

    /* ------------------------------------------------------------------ *
     * Singleton tooltip. 300 ms hover delay, copied --sm-fs, no glow.     *
     * ------------------------------------------------------------------ */

    const smTooltip = { timer: null, target: null, label: '', node: null }

    function smEnsureTooltipNode() {
        if (typeof document === 'undefined' || document === null) return null
        if (smTooltip.node !== null && document.body.contains(smTooltip.node)) return smTooltip.node
        const node = document.createElement('div')
        node.className = 'sm-tooltip'
        node.setAttribute('role', 'tooltip')
        node.style.cssText = 'position:fixed;left:0;top:0;z-index:2000;max-width:290px;padding:6px 10px;border-radius:7px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:calc(var(--sm-fs) - 4px);line-height:1.35;box-shadow:none;pointer-events:none;opacity:0;visibility:hidden;white-space:normal;transition:opacity .12s ease;'
        const root = document.querySelector('.sm-root')
        let scale = ''
        if (root !== null && typeof getComputedStyle === 'function') {
            scale = getComputedStyle(root).getPropertyValue('--sm-fs').trim()
        }
        node.style.setProperty('--sm-fs', scale !== '' ? scale : '14px')
        document.body.appendChild(node)
        smTooltip.node = node
        return node
    }

    function smHideTooltip() {
        if (smTooltip.timer !== null) {
            clearTimeout(smTooltip.timer)
            smTooltip.timer = null
        }
        smTooltip.target = null
        smTooltip.label = ''
        if (smTooltip.node !== null) {
            smTooltip.node.style.opacity = '0'
            smTooltip.node.style.visibility = 'hidden'
        }
    }

    function smPlaceTooltip() {
        const target = smTooltip.target
        if (target === null || target === undefined || typeof target.getBoundingClientRect !== 'function') {
            smHideTooltip()
            return
        }
        if (typeof document === 'undefined' || document === null || !document.body.contains(target)) {
            smHideTooltip()
            return
        }
        const node = smEnsureTooltipNode()
        if (node === null) return
        node.textContent = smTooltip.label
        node.style.visibility = 'hidden'
        node.style.opacity = '1'
        const rect = target.getBoundingClientRect()
        const tipRect = node.getBoundingClientRect()
        const viewWidth = typeof window !== 'undefined' && window !== null ? window.innerWidth : 0
        let left = rect.left + rect.width / 2 - tipRect.width / 2
        let top = rect.top - tipRect.height - 8
        if (left < 8) left = 8
        if (viewWidth > 0 && left + tipRect.width > viewWidth - 8) left = viewWidth - tipRect.width - 8
        if (top < 8) top = rect.bottom + 8
        node.style.left = Math.round(left) + 'px'
        node.style.top = Math.round(top) + 'px'
        node.style.visibility = 'visible'
    }

    function smScheduleTooltip(label, target) {
        smHideTooltip()
        const text = label === null || label === undefined ? '' : String(label)
        if (text === '' || target === null || target === undefined) return
        smTooltip.target = target
        smTooltip.label = text
        smTooltip.timer = setTimeout(() => {
            smTooltip.timer = null
            smPlaceTooltip()
        }, 300)
    }

    function smTip(label) {
        const text = label === null || label === undefined ? '' : String(label)
        if (text === '') return {}
        return {
            onMouseEnter: (event) => {
                smScheduleTooltip(text, event.currentTarget)
            },
            onMouseLeave: () => {
                smHideTooltip()
            },
            onMouseDown: () => {
                smHideTooltip()
            },
        }
    }

    function SmTooltipLifecycle() {
        useEffect(() => {
            smEnsureTooltipNode()
            return () => {
                smHideTooltip()
                if (smTooltip.node !== null && smTooltip.node.parentNode !== null && smTooltip.node.parentNode !== undefined) {
                    smTooltip.node.parentNode.removeChild(smTooltip.node)
                }
                smTooltip.node = null
            }
        }, [])
        return null
    }

    function renderTooltipLayer() {
        return h(SmTooltipLifecycle)
    }

    /* ------------------------------------------------------------------ *
     * Dialog stack + Escape layering.                                    *
     * ------------------------------------------------------------------ */

    function openModal(kind, payload) {
        let name = String(kind)
        let source = payload !== null && typeof payload === 'object' ? payload : {}
        // Accept the short aliases the list/source tabs use.
        if (name === 'new') name = 'new-skill'
        else if (name === 'import') name = 'import-skill'
        else if (name === 'delete' || name === 'uninstall') {
            source = Object.assign({}, source)
            if (source.mode === undefined) source.mode = name
            name = 'confirm-delete'
        }
        const id = ++smModalSeq
        smModals.push({
            id: id,
            kind: name,
            payload: source,
        })
        dialogStack.push('modal:' + String(id))
        smHideTooltip()
        if (typeof rerender === 'function') rerender()
    }

    function closeModal() {
        if (smModals.length === 0) return
        const entry = smModals[smModals.length - 1]
        smModals.splice(smModals.length - 1, 1)
        const token = 'modal:' + String(entry.id)
        const index = dialogStack.lastIndexOf(token)
        if (index !== -1) dialogStack.splice(index, 1)
        smHideTooltip()
        if (typeof rerender === 'function') rerender()
    }

    function smCloseDiagnostics() {
        smDiagnostics.open = false
        const index = dialogStack.lastIndexOf('diagnostics')
        if (index !== -1) dialogStack.splice(index, 1)
        smHideTooltip()
        if (typeof rerender === 'function') rerender()
    }

    function smCloseTopLayer() {
        const top = dialogStack[dialogStack.length - 1]
        if (top === undefined) return
        if (top === 'diagnostics') {
            smCloseDiagnostics()
            return
        }
        if (typeof top === 'string' && top.indexOf('modal:') === 0) {
            const id = Number(top.slice('modal:'.length))
            for (let index = smModals.length - 1; index >= 0; index -= 1) {
                if (smModals[index].id === id) {
                    smModals.splice(index, 1)
                    break
                }
            }
            dialogStack.pop()
            smHideTooltip()
            if (typeof rerender === 'function') rerender()
        }
    }

    function smBindEscapeLayers() {
        if (typeof document === 'undefined' || document === null) return
        document.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape') return
            if (dialogStack.length === 0) return
            event.preventDefault()
            event.stopPropagation()
            if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation()
            smCloseTopLayer()
        }, true)
    }

    smBindEscapeLayers()

    function renderModalLayer() {
        if (smModals.length === 0) return null
        const topEntry = smModals[smModals.length - 1]
        const topToken = dialogStack[dialogStack.length - 1]
        return h(
            Fragment,
            null,
            smModals.map((entry) => h(SmModalHost, {
                key: String(entry.id),
                entry: entry,
                isTop: entry === topEntry && topToken === 'modal:' + String(entry.id),
            })),
        )
    }

    function SmModalHost(props) {
        const entry = props.entry
        const shared = { isTop: props.isTop === true, payload: entry.payload }
        if (entry.kind === 'new-skill') return h(SmNewSkillModal, shared)
        if (entry.kind === 'import-skill') return h(SmImportModal, shared)
        if (entry.kind === 'install') return h(SmInstallModal, shared)
        if (entry.kind === 'update') return h(SmUpdateModal, shared)
        if (entry.kind === 'add-source') return h(SmAddSourceModal, shared)
        if (entry.kind === 'confirm-delete') return h(SmConfirmDeleteModal, shared)
        return h(
            SmDialogFrame,
            { isTop: props.isTop === true, title: t('action.close'), footer: h(SmButton, { tone: 'secondary', onClick: closeModal }, t('action.close')) },
            h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 1px)' } }, t('error.generic')),
        )
    }

    /* ------------------------------------------------------------------ *
     * Shared dialog chrome + form primitives.                            *
     * ------------------------------------------------------------------ */

    function SmDialogFrame(props) {
        const confirm = props.confirm === true
        const boxRef = useRef(null)
        useEffect(() => {
            const node = boxRef.current
            if (node !== null && typeof node.querySelector === 'function') {
                const field = node.querySelector('input, select, textarea, button')
                if (field !== null && typeof field.focus === 'function') {
                    try {
                        field.focus({ preventScroll: true })
                    } catch (failure) {
                        /* focus is best effort */
                    }
                }
            }
        }, [])
        return h(
            'div',
            {
                className: 'sm-modal-backdrop',
                style: {
                    position: 'fixed',
                    inset: 0,
                    zIndex: 1200,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                    background: 'transparent',
                },
                onMouseDown: (event) => {
                    if (event.target !== event.currentTarget) return
                    if (props.isTop !== true) return
                    smHideTooltip()
                    closeModal()
                },
            },
            h(
                'div',
                {
                    ref: boxRef,
                    className: 'sm-dialog' + (confirm ? ' sm-narrow sm-dialog-confirm' : ''),
                    role: 'dialog',
                    'aria-modal': 'true',
                    'aria-label': props.title,
                    style: {
                        width: confirm ? '360px' : '560px',
                        maxWidth: 'calc(100vw - 32px)',
                        maxHeight: 'calc(100vh - 48px)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        borderRadius: confirm ? '14px' : '20px',
                        border: '0.5px solid var(--dsw-alias-border-l2)',
                        background: 'var(--dsw-static-neutral-bluish-850, var(--dsw-alias-bg-layer-1))',
                        boxShadow: 'none',
                    },
                },
                h(
                    'div',
                    {
                        className: 'sm-dialog-head',
                        style: {
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                            padding: confirm ? '18px 20px 4px' : '18px 24px',
                            borderBottom: confirm ? 'none' : '1px solid var(--dsw-alias-border-l2)',
                        },
                    },
                    h('h3', { style: { margin: 0, fontSize: 'calc(var(--sm-fs) + 1px)', fontWeight: 500, color: 'var(--dsw-alias-label-primary)' } }, props.title),
                    confirm
                        ? null
                        : h('button', {
                            type: 'button',
                            className: 'sm-icon-btn sm-dialog-close',
                            'aria-label': t('action.close'),
                            onClick: () => {
                                smHideTooltip()
                                closeModal()
                            },
                            style: {
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '28px',
                                height: '28px',
                                padding: 0,
                                border: 'none',
                                borderRadius: '8px',
                                background: 'transparent',
                                color: 'var(--dsw-alias-label-secondary)',
                                cursor: 'pointer',
                            },
                        }, icon('x', 16)),
                ),
                h(
                    'div',
                    {
                        className: 'sm-dialog-body',
                        style: {
                            flex: 1,
                            minHeight: 0,
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '14px',
                            padding: confirm ? '10px 20px 18px' : '20px 24px',
                        },
                    },
                    props.children,
                ),
                props.footer === undefined || props.footer === null
                    ? null
                    : h(
                        'div',
                        {
                            className: 'sm-dialog-foot',
                            style: {
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '8px',
                                padding: confirm ? '0 20px 20px' : '14px 24px',
                                borderTop: confirm ? 'none' : '1px solid var(--dsw-alias-border-l2)',
                            },
                        },
                        props.footer,
                    ),
            ),
        )
    }

    function SmField(props) {
        return h(
            'div',
            { className: 'sm-field', style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
            h(
                'div',
                { className: 'sm-label', style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' } },
                h('span', { style: { fontSize: 'calc(var(--sm-fs) - 1px)', fontWeight: 500, color: 'var(--dsw-alias-label-primary)' } }, props.label),
                props.hint ? h('span', { style: { fontSize: 'calc(var(--sm-fs) - 3px)', color: 'var(--dsw-alias-label-caption)' } }, props.hint) : null,
            ),
            props.children,
            props.error ? h('div', { style: { fontSize: 'calc(var(--sm-fs) - 2px)', color: 'var(--dsw-alias-state-error-primary)' } }, props.error) : null,
        )
    }

    function SmBanner(props) {
        const tone = props.tone || 'info'
        const color = tone === 'error'
            ? 'var(--dsw-alias-state-error-primary)'
            : (tone === 'warn'
                ? 'var(--dsw-alias-state-warn-primary)'
                : (tone === 'ok' ? 'var(--dsw-alias-state-success-primary)' : 'var(--dsw-alias-brand-primary)'))
        return h(
            'div',
            {
                className: 'sm-banner sm-banner-' + tone,
                style: {
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: 'color-mix(in srgb, ' + color + ' 10%, transparent)',
                    border: '1px solid color-mix(in srgb, ' + color + ' 28%, transparent)',
                    color: 'var(--dsw-alias-label-secondary)',
                    fontSize: 'calc(var(--sm-fs) - 2px)',
                    lineHeight: '1.5',
                },
            },
            props.children,
        )
    }

    function SmRadioOptions(props) {
        const options = Array.isArray(props.options) ? props.options : []
        return h(
            'div',
            { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
            options.map((option) => {
                const selected = props.value === option.value
                return h(
                    'label',
                    {
                        key: option.value,
                        style: {
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '8px',
                            padding: '8px 10px',
                            borderRadius: '10px',
                            border: '1px solid ' + (selected ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-border-l2)'),
                            background: selected ? 'color-mix(in srgb, var(--dsw-alias-brand-primary) 8%, transparent)' : 'var(--dsw-alias-bg-base)',
                            color: 'var(--dsw-alias-label-primary)',
                            fontSize: 'calc(var(--sm-fs) - 1px)',
                            opacity: option.disabled === true ? 0.5 : 1,
                            cursor: option.disabled === true ? 'not-allowed' : 'pointer',
                        },
                    },
                    h('input', {
                        type: 'radio',
                        name: props.name || 'sm-radio',
                        value: option.value,
                        checked: selected,
                        disabled: option.disabled === true,
                        onChange: () => {
                            if (option.disabled !== true && typeof props.onChange === 'function') props.onChange(option.value)
                        },
                        style: { marginTop: '2px', flexShrink: 0 },
                    }),
                    h(
                        'span',
                        { style: { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 } },
                        h('span', { style: { wordBreak: 'break-word' } }, option.label),
                        option.hint ? h('span', { style: { color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 3px)' } }, option.hint) : null,
                    ),
                )
            }),
        )
    }

    function SmSegmented(props) {
        const options = Array.isArray(props.options) ? props.options : []
        return h(
            'div',
            { style: { display: 'inline-flex', gap: '2px', padding: '2px', borderRadius: '14px', background: 'var(--dsw-alias-bg-layer-3)', alignSelf: 'flex-start' } },
            options.map((option) => {
                const selected = props.value === option.value
                return h(
                    'button',
                    {
                        key: option.value,
                        type: 'button',
                        'aria-selected': selected,
                        onClick: () => {
                            if (typeof props.onChange === 'function') props.onChange(option.value)
                        },
                        style: {
                            height: '30px',
                            padding: '0 12px',
                            border: 'none',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            background: selected ? 'var(--dsw-alias-bg-layer-1)' : 'transparent',
                            color: selected ? 'var(--dsw-alias-label-primary)' : 'var(--dsw-alias-label-secondary)',
                            fontSize: 'calc(var(--sm-fs) - 1px)',
                            fontWeight: selected ? 500 : 400,
                        },
                    },
                    option.label,
                )
            }),
        )
    }

    function SmFooter(props) {
        return h(
            Fragment,
            null,
            h(SmButton, { tone: 'secondary', onClick: closeModal }, t('action.cancel')),
            props.children,
        )
    }

    /* ------------------------------------------------------------------ *
     * 1. New skill.                                                      *
     * ------------------------------------------------------------------ */

    function SmNewSkillModal(props) {
        const [name, setName] = useState('')
        const [description, setDescription] = useState('')
        const [whenToUse, setWhenToUse] = useState('')
        const [body, setBody] = useState('')
        const [location, setLocation] = useState('user-dsh')
        const [busy, setBusy] = useState(false)
        const [serverError, setServerError] = useState('')

        const trimmedName = name.trim()
        let nameError = ''
        if (trimmedName !== '' && (!SM_NAME_PATTERN.test(trimmedName) || trimmedName.length > 64)) {
            nameError = t('form.nameInvalid')
        } else if (trimmedName !== '' && smSkillList().some((skill) => skill && skill.name === trimmedName && skill.location === location && skill.status !== 'disabled')) {
            nameError = t('form.nameTaken')
        }
        const descriptionError = description.trim().length > 500 ? t('form.descriptionTooLong') : ''
        const canSubmit = trimmedName !== ''
            && nameError === ''
            && description.trim() !== ''
            && descriptionError === ''
            && body.trim() !== ''
            && !smLocationDisabled(location)
            && !busy

        async function submit() {
            if (!canSubmit) return
            setBusy(true)
            setServerError('')
            const payload = { location: location, name: trimmedName, description: description.trim(), body: body }
            if (whenToUse.trim() !== '') payload.whenToUse = whenToUse.trim()
            try {
                const result = await api('/skill', { method: 'POST', body: payload })
                setBusy(false)
                smPushToast(t('toast.created', { name: trimmedName }))
                closeModal()
                setState({
                    tab: 'installed',
                    view: 'list',
                    detail: null,
                    highlightId: result !== null && result !== undefined && result.skill !== undefined ? result.skill.id : null,
                })
                void loadInstalled(true)
            } catch (failure) {
                setBusy(false)
                setServerError(smErrorMessage(failure))
            }
        }

        return h(
            SmDialogFrame,
            {
                isTop: props.isTop,
                title: t('action.newSkill'),
                footer: h(SmFooter, null, h(SmButton, { tone: 'primary', disabled: !canSubmit, onClick: () => { void submit() } }, t('form.create'))),
            },
            serverError !== '' ? h(SmBanner, { tone: 'error' }, serverError) : null,
            h(SmField, { label: t('form.name'), hint: t('form.nameHint'), error: nameError },
                h('input', {
                    type: 'text',
                    className: 'sm-mono',
                    value: name,
                    placeholder: 'code-review',
                    onChange: (event) => {
                        setName(event.target.value)
                        setServerError('')
                    },
                    style: Object.assign({}, SM_INPUT_STYLE, { fontFamily: SM_MONO }),
                }),
            ),
            h(SmField, { label: t('form.description'), hint: t('form.descriptionHint'), error: descriptionError },
                h('input', {
                    type: 'text',
                    value: description,
                    placeholder: '',
                    onChange: (event) => {
                        setDescription(event.target.value)
                        setServerError('')
                    },
                    style: SM_INPUT_STYLE,
                }),
            ),
            h(SmField, { label: t('form.whenToUse'), hint: t('form.whenToUseHint') },
                h('input', {
                    type: 'text',
                    value: whenToUse,
                    placeholder: '',
                    onChange: (event) => setWhenToUse(event.target.value),
                    style: SM_INPUT_STYLE,
                }),
            ),
            h(SmField, { label: t('detail.location') },
                h(SmRadioOptions, { name: 'new-skill-location', value: location, onChange: setLocation, options: smLocationOptions() }),
            ),
            h(SmField, { label: t('form.body'), hint: t('form.bodyHint') },
                h('textarea', {
                    value: body,
                    placeholder: '',
                    onChange: (event) => setBody(event.target.value),
                    style: Object.assign({}, SM_TEXTAREA_STYLE, { minHeight: '140px' }),
                }),
            ),
        )
    }

    /* ------------------------------------------------------------------ *
     * 2. Import skill.                                                   *
     * ------------------------------------------------------------------ */

    function SmImportModal(props) {
        const [mode, setMode] = useState('paste')
        const [content, setContent] = useState('')
        const [dirPath, setDirPath] = useState('')
        const [location, setLocation] = useState('user-dsh')
        const [parsed, setParsed] = useState(null)
        const [parseError, setParseError] = useState('')
        const [parsing, setParsing] = useState(false)
        const [busy, setBusy] = useState(false)
        const [serverError, setServerError] = useState('')

        async function parse() {
            if (content.trim() === '') {
                setParseError(t('form.bodyRequired'))
                setParsed(null)
                return
            }
            setParsing(true)
            setParseError('')
            setParsed(null)
            try {
                const result = await api('/validate', { method: 'POST', body: { content: content } })
                if (result !== null && result !== undefined && result.valid === true) {
                    setParsed(result)
                } else {
                    setParseError(result !== null && result !== undefined && typeof result.error === 'string' && result.error !== '' ? result.error : t('import.parseFail', { reason: t('error.generic') }))
                }
            } catch (failure) {
                setParseError(smErrorMessage(failure))
            } finally {
                setParsing(false)
            }
        }

        const canSubmit = mode === 'paste'
            ? content.trim() !== '' && !busy
            : dirPath.trim() !== '' && !busy

        async function submit() {
            if (!canSubmit) return
            setBusy(true)
            setServerError('')
            const payload = { mode: mode, location: location }
            if (mode === 'paste') payload.content = content
            else payload.dirPath = dirPath.trim()
            try {
                const result = await api('/import', { method: 'POST', body: payload })
                const imported = result !== null && result !== undefined && result.skill !== undefined && result.skill !== null ? result.skill : null
                const files = result !== null && result !== undefined && typeof result.files === 'number' ? result.files : 0
                setBusy(false)
                smPushToast(t('toast.imported', { name: imported !== null ? smText(imported.name) : '', count: files }))
                closeModal()
                setState({
                    tab: 'installed',
                    view: 'list',
                    detail: null,
                    highlightId: imported !== null ? imported.id : null,
                })
                void loadInstalled(true)
            } catch (failure) {
                setBusy(false)
                setServerError(smErrorMessage(failure))
            }
        }

        return h(
            SmDialogFrame,
            {
                isTop: props.isTop,
                title: t('import.title'),
                footer: h(SmFooter, null, h(SmButton, { tone: 'primary', disabled: !canSubmit, onClick: () => { void submit() } }, t('import.confirm'))),
            },
            serverError !== '' ? h(SmBanner, { tone: 'error' }, serverError) : null,
            h(SmSegmented, {
                value: mode,
                onChange: (value) => {
                    setMode(value)
                    setParseError('')
                },
                options: [
                    { value: 'paste', label: t('import.paste') },
                    { value: 'dir', label: t('import.dir') },
                ],
            }),
            mode === 'paste'
                ? h(
                    Fragment,
                    null,
                    h(SmField, {
                        label: t('import.pasteLabel'),
                        hint: h('button', {
                            type: 'button',
                            className: 'sm-link-btn',
                            onClick: () => { void parse() },
                            style: {
                                height: '24px',
                                padding: '0 6px',
                                border: 'none',
                                background: 'transparent',
                                color: 'var(--dsw-alias-brand-primary)',
                                fontSize: 'calc(var(--sm-fs) - 2px)',
                                cursor: 'pointer',
                            },
                        }, parsing ? t('import.parsing') : t('import.parse')),
                    },
                        h('textarea', {
                            value: content,
                            placeholder: '',
                            onChange: (event) => {
                                setContent(event.target.value)
                                setParsed(null)
                                setParseError('')
                            },
                            style: Object.assign({}, SM_TEXTAREA_STYLE, { minHeight: '160px' }),
                        }),
                    ),
                    parseError !== '' ? h(SmBanner, { tone: 'error' }, parseError) : null,
                    parsed !== null
                        ? h(SmBanner, { tone: 'ok' },
                            h('span', { style: { color: 'var(--dsw-alias-state-success-primary)', fontWeight: 500 } }, '✓ ' + t('import.parseOk')),
                            h('span', null, t('form.name') + ': ' + smText(parsed.name, '—')),
                            h('span', null, t('form.description') + ': ' + smText(parsed.description, '—')),
                        )
                        : null,
                )
                : h(
                    Fragment,
                    null,
                    h(SmField, { label: t('import.dirLabel') },
                        h('input', {
                            type: 'text',
                            className: 'sm-mono',
                            value: dirPath,
                            placeholder: '',
                            onChange: (event) => setDirPath(event.target.value),
                            style: Object.assign({}, SM_INPUT_STYLE, { fontFamily: SM_MONO }),
                        }),
                    ),
                    h(SmBanner, { tone: 'info' }, t('import.dirFilesHint')),
                ),
            h(SmField, { label: t('import.target') },
                h(SmRadioOptions, { name: 'import-location', value: location, onChange: setLocation, options: smLocationOptions() }),
            ),
        )
    }

    /* ------------------------------------------------------------------ *
     * 3. Market install (target + version + conflict + progress).        *
     * ------------------------------------------------------------------ */

    function SmInstallModal(props) {
        const payload = props.payload !== null && typeof props.payload === 'object' ? props.payload : {}
        const [market, setMarket] = useState(() => smMarketFromPayload(payload))
        const [versions, setVersions] = useState([])
        const [loading, setLoading] = useState(() => smMarketFromPayload(payload) === null)
        const [loadError, setLoadError] = useState('')
        const [reloadTick, setReloadTick] = useState(0)
        const [location, setLocation] = useState('user-dsh')
        const [version, setVersion] = useState(() => {
            const cached = smMarketFromPayload(payload)
            return smText(payload.version, cached !== null ? smText(cached.version) : '')
        })
        const [conflictChoice, setConflictChoice] = useState('overwrite')
        const [busy, setBusy] = useState(false)
        const [stage, setStage] = useState(0)
        const [error, setError] = useState('')
        const timerRef = useRef(null)

        useEffect(() => {
            if (market !== null) return undefined
            let alive = true
            async function load() {
                setLoading(true)
                setLoadError('')
                const sourceId = smText(payload.sourceId)
                const name = smText(payload.name)
                if (sourceId === '' || name === '') {
                    setLoading(false)
                    setLoadError(t('install.failed', { reason: t('error.notFound') }))
                    return
                }
                try {
                    const data = await api('/market/skill?sourceId=' + encodeURIComponent(sourceId) + '&name=' + encodeURIComponent(name))
                    if (!alive) return
                    const skill = data !== null && data !== undefined && data.skill !== undefined ? data.skill : null
                    setMarket(skill)
                    setVersions(data !== null && data !== undefined && Array.isArray(data.versions) ? data.versions : [])
                    if (skill !== null && version === '') setVersion(smText(skill.version))
                    setLoading(false)
                } catch (failure) {
                    if (!alive) return
                    setLoadError(smErrorMessage(failure))
                    setLoading(false)
                }
            }
            void load()
            return () => {
                alive = false
            }
        }, [reloadTick])

        useEffect(() => () => {
            if (timerRef.current !== null) clearInterval(timerRef.current)
        }, [])

        const conflict = market !== null && smSkillList().some((skill) => skill && skill.name === market.name && skill.location === location && skill.status !== 'disabled')

        const versionOptions = versions.length > 0
            ? versions
            : (market !== null ? [{ version: market.version, publishTimestamp: market.publishTimestamp, enginesDsh: market.enginesDsh, yanked: false }] : [])

        function changeLocation() {
            if (market === null) return
            for (let index = 0; index < SM_TARGET_LOCATIONS.length; index += 1) {
                const candidate = SM_TARGET_LOCATIONS[index]
                if (candidate === location) continue
                if (smLocationDisabled(candidate)) continue
                const taken = smSkillList().some((skill) => skill && skill.name === market.name && skill.location === candidate && skill.status !== 'disabled')
                if (!taken) {
                    setLocation(candidate)
                    setConflictChoice('overwrite')
                    return
                }
            }
            smPushToast(t('install.noFreeLocation'), { tone: 'error' })
        }

        async function submit() {
            if (market === null || busy) return
            setBusy(true)
            setStage(1)
            setError('')
            if (timerRef.current !== null) clearInterval(timerRef.current)
            timerRef.current = setInterval(() => {
                setStage((previous) => (previous < 2 ? previous + 1 : previous))
            }, 700)
            try {
                const body = {
                    sourceId: market.sourceId,
                    name: market.name,
                    version: version,
                    location: location,
                }
                if (conflict) body.conflict = conflictChoice === 'skip' ? 'skip' : 'overwrite'
                const result = await api('/market/install', { method: 'POST', body: body })
                if (timerRef.current !== null) {
                    clearInterval(timerRef.current)
                    timerRef.current = null
                }
                setBusy(false)
                setStage(2)
                smPushToast(t('install.success', { name: market.name }))
                closeModal()
                setState({
                    tab: 'installed',
                    view: 'list',
                    detail: null,
                    highlightId: result !== null && result !== undefined && result.skill !== undefined ? result.skill.id : null,
                })
                void loadInstalled(true)
                void loadMarket()
            } catch (failure) {
                if (timerRef.current !== null) {
                    clearInterval(timerRef.current)
                    timerRef.current = null
                }
                setBusy(false)
                setError(smErrorMessage(failure))
            }
        }

        if (loading) {
            return h(
                SmDialogFrame,
                { isTop: props.isTop, title: t('install.title'), footer: h(SmFooter, null) },
                h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 1px)' } }, t('state.loading')),
            )
        }

        if (market === null) {
            return h(
                SmDialogFrame,
                { isTop: props.isTop, title: t('install.title'), footer: h(SmFooter, null, h(SmButton, { tone: 'secondary', onClick: () => setReloadTick((value) => value + 1) }, t('action.retry'))) },
                h(SmBanner, { tone: 'error' }, loadError !== '' ? loadError : t('error.notFound')),
            )
        }

        const stageLabels = [t('install.stageDownload'), t('install.stageVerify'), t('install.stageWrite')]
        const pct = stage <= 0 ? 8 : (stage === 1 ? 42 : (stage === 2 ? 88 : 100))

        return h(
            SmDialogFrame,
            {
                isTop: props.isTop,
                title: t('install.title') + ' · ' + market.name,
                footer: h(SmFooter, null, h(SmButton, { tone: 'primary', disabled: busy, onClick: () => { void submit() } }, busy ? (t('install.button') + '…') : t('install.button'))),
            },
            error !== '' ? h(SmBanner, { tone: 'error' }, error) : null,
            h(SmField, { label: t('install.target') },
                h(SmRadioOptions, { name: 'install-location', value: location, onChange: setLocation, options: smLocationOptions() }),
            ),
            h(SmField, { label: t('install.version') },
                h('select', {
                    value: version,
                    onChange: (event) => setVersion(event.target.value),
                    style: SM_SELECT_STYLE,
                }, versionOptions.map((item) => h(
                    'option',
                    { key: item.version, value: item.version, disabled: item.yanked === true },
                    'v' + item.version + (item.yanked === true ? ' (' + t('install.yanked') + ')' : '') + (typeof item.publishTimestamp === 'number' ? ' · ' + fmtTime(item.publishTimestamp) : ''),
                ))),
            ),
            h(
                'div',
                { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '10px 12px', borderRadius: '12px', background: 'var(--dsw-alias-bg-base)', border: '1px solid var(--dsw-alias-border-l1)', color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)' } },
                h('span', null,
                    h('span', { style: { color: 'var(--dsw-alias-label-caption)' } }, t('install.version') + ': '),
                    h('span', { className: 'sm-mono', style: { color: 'var(--dsw-alias-label-primary)' } }, 'v' + smText(version, market.version)),
                    typeof market.commit === 'string' && market.commit !== ''
                        ? h('span', { className: 'sm-mono', style: { marginLeft: '6px', color: 'var(--dsw-alias-label-caption)' } }, '(' + market.commit.slice(0, 7) + ')')
                        : null,
                ),
                h('span', null, t('detail.files') + ': ' + String(Array.isArray(market.files) ? market.files.length : 0)),
            ),
            conflict
                ? h(SmBanner, { tone: 'warn' },
                    h('span', { style: { color: 'var(--dsw-alias-state-warn-primary)', fontWeight: 500 } }, '⚠ ' + t('install.conflict')),
                    h(SmRadioOptions, {
                        name: 'install-conflict',
                        value: conflictChoice,
                        onChange: setConflictChoice,
                        options: [
                            { value: 'overwrite', label: t('install.conflict.overwrite') },
                            { value: 'skip', label: t('install.conflict.skip') },
                        ],
                    }),
                    h(SmButton, { tone: 'secondary', style: { alignSelf: 'flex-start', height: '28px' }, onClick: changeLocation }, t('install.conflict.changeTarget')),
                )
                : null,
            busy || stage > 0
                ? h(
                    'div',
                    { style: { display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 14px', borderRadius: '12px', background: 'var(--dsw-alias-bg-base)', border: '1px solid var(--dsw-alias-border-l1)' } },
                    h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)' } },
                        h('span', null, stageLabels[Math.min(stage, stageLabels.length - 1)]),
                        h('span', { className: 'sm-mono' }, String(pct) + '%'),
                    ),
                    h(
                        'div',
                        { role: 'progressbar', 'aria-valuenow': pct, 'aria-valuemin': 0, 'aria-valuemax': 100, style: { width: '100%', height: '6px', borderRadius: '999px', background: 'var(--dsw-alias-bg-layer-3)', overflow: 'hidden' } },
                        h('div', { style: { width: String(pct) + '%', height: '100%', background: 'var(--dsw-alias-brand-primary)', transition: 'width 220ms' } }),
                    ),
                )
                : null,
        )
    }

    /* ------------------------------------------------------------------ *
     * 4. Manual update confirmation.                                     *
     * ------------------------------------------------------------------ */

    function SmUpdateModal(props) {
        const payload = props.payload !== null && typeof props.payload === 'object' ? props.payload : {}
        const payloadSkill = payload.skill !== null && typeof payload.skill === 'object' ? payload.skill : null
        const payloadMarket = payloadSkill !== null && payloadSkill.market !== null && typeof payloadSkill.market === 'object' ? payloadSkill.market : null
        const payloadSourceId = smText(payload.sourceId, payloadMarket !== null ? smText(payloadMarket.sourceId) : '')
        const payloadName = smText(payload.name, payloadSkill !== null ? smText(payloadSkill.name) : '')
        const payloadLocation = smText(payload.location, payloadSkill !== null ? smText(payloadSkill.location) : '')
        const payloadHasSource = payloadSourceId !== ''
        const payloadHasLocation = payloadLocation !== ''
        /* 本地记录必须与 payload 的 sourceId + location 精确一致；记录本身缺
           sourceId 时只允许 name + location 匹配，绝不跨源/跨位置取值。 */
        const payloadRecordMatches = (record) => {
            if (record === null || record === undefined || typeof record !== 'object') return false
            if (payloadHasLocation && smText(record.location) !== payloadLocation) return false
            const recordMarket = record.market !== null && typeof record.market === 'object' ? record.market : null
            const recordSource = recordMarket !== null ? smText(recordMarket.sourceId) : ''
            if (payloadHasSource && recordSource !== '' && recordSource !== payloadSourceId) return false
            if (payloadHasSource && recordSource === '' && !payloadHasLocation) return false
            return true
        }
        let skill = typeof smFindInstalledCopy === 'function'
            ? smFindInstalledCopy(payloadName, payloadLocation, payloadSourceId)
            : null
        if (skill === null && payloadSkill !== null && payloadRecordMatches(payloadSkill)) skill = payloadSkill
        if (skill === null && typeof payload.id === 'string' && payload.id !== '') {
            const byId = smFindSkillById(payload.id)
            if (byId !== null && payloadRecordMatches(byId)) skill = byId
        }
        const market = skill !== null && skill.market !== undefined && skill.market !== null ? skill.market : null

        const sourceId = smText(payloadSourceId, market !== null ? smText(market.sourceId) : '')
        const name = smText(payloadName, skill !== null ? smText(skill.name) : '')
        const cached = smFindMarketSkill('', sourceId, name)
        /* 解析不到精确记录时 available/current/location/commit 全部留空，
           绝不复用其他来源或位置的版本、位置。 */
        const location = skill !== null ? smText(skill.location) : ''
        const resolvedSourceId = market !== null ? smText(market.sourceId) : ''
        const updateVersion = skill !== null ? skillUpdateVersion(skill) : ''
        /* payload 中的版本只在与解析出的本地记录同源时才可采用，绝不跨源取值。 */
        const payloadAvailable = smText(payload.available, smText(payload.version))
        const sameSourcePayload = payloadAvailable !== '' && sourceId !== '' && resolvedSourceId === sourceId
        const available = skill !== null
            ? (updateVersion !== '' ? updateVersion : (sameSourcePayload ? payloadAvailable : ''))
            : ''
        const current = skill !== null
            ? (market !== null && smText(market.version) !== ''
                ? smText(market.version)
                : smText(payload.current, smText(payload.currentVersion, cached !== null ? smText(cached.version) : '')))
            : ''
        const commit = skill !== null
            ? (market !== null ? smText(market.commit) : (cached !== null ? smText(cached.commit) : ''))
            : ''
        const localModified = market !== null && market.localModified === true

        const [busy, setBusy] = useState(false)
        const [error, setError] = useState('')

        async function submit() {
            if (busy || available === '' || sourceId === '' || name === '' || location === '') return
            setBusy(true)
            setError('')
            try {
                await api('/market/update', { method: 'POST', body: { sourceId: sourceId, name: name, version: available, location: location } })
                setBusy(false)
                smPushToast(t('update.success', { version: available }))
                closeModal()
                void loadInstalled(true)
                void loadUpdates(true)
                void loadMarket()
            } catch (failure) {
                setBusy(false)
                setError(smErrorMessage(failure))
            }
        }

        return h(
            SmDialogFrame,
            {
                isTop: props.isTop,
                title: t('action.update') + (name !== '' ? ' · ' + name : ''),
                footer: h(SmFooter, null, h(SmButton, { tone: 'primary', disabled: busy || available === '' || location === '', onClick: () => { void submit() } }, t('update.confirm'))),
            },
            error !== '' ? h(SmBanner, { tone: 'error' }, error) : null,
            location === '' ? h(SmBanner, { tone: 'warn' }, t('error.notFound')) : null,
            h(
                'div',
                { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px 14px', borderRadius: '12px', background: 'var(--dsw-alias-bg-base)', border: '1px solid var(--dsw-alias-border-l1)', color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)' } },
                h('span', null, t('install.version')),
                h('span', { className: 'sm-mono', style: { fontWeight: 500, color: 'var(--dsw-alias-label-primary)' } },
                    'v' + smText(current, '—'),
                    ' → ',
                    h('span', { style: { color: 'var(--dsw-alias-state-success-primary)' } }, available !== '' ? 'v' + available : t('update.none')),
                ),
            ),
            commit !== ''
                ? h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)' } },
                    h('span', null, t('update.sourceCommit')),
                    h('span', { className: 'sm-mono', style: { wordBreak: 'break-all', color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 3px)' } }, commit),
                )
                : null,
            localModified
                ? h(SmBanner, { tone: 'warn' },
                    h('span', { style: { color: 'var(--dsw-alias-state-warn-primary)', fontWeight: 500 } }, '⚠ ' + t('update.localModified')),
                    h('span', null, t('update.backupHint')),
                )
                : null,
        )
    }

    /* ------------------------------------------------------------------ *
     * 5. Add market source.                                              *
     * ------------------------------------------------------------------ */

    function SmAddSourceModal(props) {
        const [type, setType] = useState('index')
        const [name, setName] = useState('')
        const [url, setUrl] = useState('')
        const [validating, setValidating] = useState(false)
        const [result, setResult] = useState(null)
        const [validateError, setValidateError] = useState(null)
        const [busy, setBusy] = useState(false)
        const [serverError, setServerError] = useState('')

        async function validate() {
            if (url.trim() === '') {
                setValidateError({ code: 'E_BAD_REQUEST', message: t('form.urlRequired') })
                setResult(null)
                return
            }
            setValidating(true)
            setValidateError(null)
            setResult(null)
            setServerError('')
            try {
                const data = await api('/sources/validate', { method: 'POST', body: { url: url.trim() } })
                setResult(data !== null && typeof data === 'object' ? data : null)
            } catch (failure) {
                setValidateError(failure !== null && typeof failure === 'object' ? failure : {})
            } finally {
                setValidating(false)
            }
        }

        const canSave = result !== null && validateError === null && url.trim() !== '' && !busy

        async function submit() {
            if (!canSave) return
            setBusy(true)
            setServerError('')
            const payload = { url: url.trim() }
            if (name.trim() !== '') payload.name = name.trim()
            try {
                const data = await api('/sources', { method: 'POST', body: payload })
                const source = data !== null && data !== undefined && data.source !== undefined ? data.source : null
                setBusy(false)
                smPushToast(t('source.added', { name: source !== null ? smText(source.name, name.trim()) : name.trim() }))
                closeModal()
                void loadSources()
                void loadMarket()
            } catch (failure) {
                setBusy(false)
                setServerError(smErrorMessage(failure))
            }
        }

        const samples = result !== null && Array.isArray(result.sample) ? result.sample : []
        const warnings = result !== null && Array.isArray(result.warnings) ? result.warnings : []

        return h(
            SmDialogFrame,
            {
                isTop: props.isTop,
                title: t('source.add.title'),
                footer: h(SmFooter, null, h(SmButton, { tone: 'primary', disabled: !canSave, onClick: () => { void submit() } }, t('action.save'))),
            },
            serverError !== '' ? h(SmBanner, { tone: 'error' }, serverError) : null,
            h(SmSegmented, {
                value: type,
                onChange: (value) => {
                    setType(value)
                    setResult(null)
                    setValidateError(null)
                },
                options: [
                    { value: 'index', label: t('source.type.index') },
                    { value: 'local', label: t('source.type.local') },
                ],
            }),
            type === 'index' ? h(SmBanner, { tone: 'warn' }, '⚠ ' + t('source.trust')) : null,
            h(SmField, { label: t('source.name') },
                h('input', {
                    type: 'text',
                    value: name,
                    placeholder: '',
                    onChange: (event) => setName(event.target.value),
                    style: SM_INPUT_STYLE,
                }),
            ),
            h(SmField, { label: type === 'local' ? t('source.localPath') : t('source.url') },
                h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
                    h('input', {
                        type: 'text',
                        className: 'sm-mono',
                        value: url,
                        placeholder: type === 'local' ? '~/.dsh/skills' : 'https://…/index.json',
                        onChange: (event) => {
                            setUrl(event.target.value)
                            setResult(null)
                            setValidateError(null)
                        },
                        style: Object.assign({}, SM_INPUT_STYLE, { fontFamily: SM_MONO, flex: 1 }),
                    }),
                    h(SmButton, { tone: 'secondary', disabled: validating, onClick: () => { void validate() } }, validating ? (t('source.validate') + '…') : t('source.validate')),
                ),
            ),
            validateError !== null
                ? h(SmBanner, { tone: 'error' },
                    h('span', { style: { fontWeight: 500 } }, '[' + smText(validateError.code, 'E_BAD_REQUEST') + '] ' + smErrorMessage(validateError)),
                    typeof validateError.path === 'string' && validateError.path !== ''
                        ? h('span', { className: 'sm-mono' }, t('source.error.path', { path: validateError.path }))
                        : null,
                )
                : null,
            result !== null
                ? h(SmBanner, { tone: 'ok' },
                    h('span', { style: { color: 'var(--dsw-alias-state-success-primary)', fontWeight: 500 } }, '✓ ' + t('source.validated', { count: typeof result.skillCount === 'number' ? result.skillCount : 0 })),
                    result.title ? h('span', null, t('source.title') + ': ' + smText(result.title)) : null,
                    result.description ? h('span', null, smText(result.description)) : null,
                    samples.length > 0
                        ? h('span', { className: 'sm-mono', style: { wordBreak: 'break-all' } }, t('source.sample') + ': ' + samples.slice(0, 3).map((item) => smText(item.name) + (item.version ? ' v' + item.version : '')).join(' · '))
                        : null,
                    warnings.length > 0 ? h('span', { style: { color: 'var(--dsw-alias-state-warn-primary)' } }, t('source.warnings', { count: warnings.length }) + ': ' + warnings.join('; ')) : null,
                )
                : null,
        )
    }

    /* ------------------------------------------------------------------ *
     * 6. Delete / uninstall confirmation (360px).                        *
     * ------------------------------------------------------------------ */

    function SmConfirmDeleteModal(props) {
        const payload = props.payload !== null && typeof props.payload === 'object' ? props.payload : {}
        const payloadSkill = payload.skill !== null && typeof payload.skill === 'object' ? payload.skill : null
        /* 缺 payload.skill 时按 id 精确定位；退回 name 时必须带上调用方给出的
           location / sourceId，避免卸载另一个位置或来源的同名副本。 */
        const skill = payloadSkill !== null
            ? payloadSkill
            : (smFindSkillById(payload.id) || (typeof smFindInstalledCopy === 'function'
                ? smFindInstalledCopy(smText(payload.name), smText(payload.location), smText(payload.sourceId))
                : smFindSkillByName(payload.name)))
        const mode = payload.mode === 'uninstall'
            || payload.kind === 'uninstall'
            || (payload.mode === undefined && payload.kind === undefined
                && skill !== null && skill !== undefined && skill.market !== undefined && skill.market !== null)
            ? 'uninstall'
            : 'delete'
        const name = skill !== null && skill !== undefined ? smText(skill.name) : smText(payload.name)
        const path = skill !== null && skill !== undefined ? smText(skill.path) : ''
        const location = skill !== null && skill !== undefined ? smText(skill.location) : ''

        const [preserveBackup, setPreserveBackup] = useState(false)
        const [busy, setBusy] = useState(false)
        const [error, setError] = useState('')

        async function submit() {
            if (busy) return
            if (mode === 'delete' && path === '') {
                setError(t('error.notFound'))
                return
            }
            if (mode === 'uninstall' && (name === '' || location === '')) {
                setError(t('error.notFound'))
                return
            }
            setBusy(true)
            setError('')
            try {
                if (mode === 'uninstall') {
                    await api('/market/uninstall', { method: 'POST', body: { name: name, location: location, preserveBackup: preserveBackup } })
                } else {
                    await api('/skill?path=' + encodeURIComponent(path), { method: 'DELETE' })
                }
                setBusy(false)
                smPushToast(mode === 'uninstall' ? t('uninstall.success', { name: name }) : t('delete.success', { name: name }))
                closeModal()
                const detail = appState.detail
                if (detail !== null && typeof detail === 'object' && (detail.id === (skill !== null ? skill.id : '') || detail.name === name)) {
                    setState({ view: 'list', detail: null })
                }
                void loadInstalled(true)
                void loadMarket()
            } catch (failure) {
                setBusy(false)
                setError(smErrorMessage(failure))
            }
        }

        return h(
            SmDialogFrame,
            {
                isTop: props.isTop,
                confirm: true,
                title: mode === 'uninstall' ? t('uninstall.confirm.title') : t('delete.confirm.title'),
                footer: h(
                    Fragment,
                    null,
                    h(SmButton, { tone: 'secondary', onClick: closeModal }, t('action.cancel')),
                    h(SmButton, { tone: 'dangerSolid', disabled: busy, onClick: () => { void submit() } }, mode === 'uninstall' ? t('action.uninstall') : t('action.delete')),
                ),
            },
            error !== '' ? h(SmBanner, { tone: 'error' }, error) : null,
            h(
                'p',
                { style: { margin: 0, color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 1px)', lineHeight: '1.55' } },
                mode === 'uninstall'
                    ? t('uninstall.confirm.body', { name: name !== '' ? name : '—' })
                    : t('delete.confirm.body', { path: path !== '' ? path : '—' }),
            ),
            path !== '' && mode === 'uninstall'
                ? h('div', { className: 'sm-mono', style: { wordBreak: 'break-all', color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 3px)' } }, path)
                : null,
            mode === 'uninstall'
                ? h(
                    'label',
                    { style: { display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)', cursor: 'pointer' } },
                    h('input', {
                        type: 'checkbox',
                        checked: preserveBackup,
                        onChange: (event) => setPreserveBackup(event.target.checked),
                    }),
                    h('span', null, t('uninstall.keepBackup')),
                )
                : null,
        )
    }

    /* ------------------------------------------------------------------ *
     * Diagnostics drawer.                                                *
     * ------------------------------------------------------------------ */

    const SM_DIAG_KINDS = [
        { kind: 'broken-link', labelKey: 'diag.kind.brokenLink', tone: 'error' },
        { kind: 'frontmatter', labelKey: 'diag.kind.frontmatter', tone: 'error' },
        { kind: 'name', labelKey: 'diag.kind.name', tone: 'error' },
        { kind: 'same-layer-shadow', labelKey: 'diag.kind.sameLayer', tone: 'warn' },
        { kind: 'cross-layer-shadow', labelKey: 'diag.kind.crossLayer', tone: 'warn' },
        { kind: 'unreadable', labelKey: 'diag.kind.unreadable', tone: 'error' },
        { kind: 'oversize', labelKey: 'diag.kind.oversize', tone: 'idle' },
    ]

    function openDiagnosticsDrawer() {
        if (!smDiagnostics.open) {
            smDiagnostics.open = true
            dialogStack.push('diagnostics')
        }
        if (typeof rerender === 'function') rerender()
        void smLoadDiagnostics()
    }

    async function smLoadDiagnostics() {
        smDiagnostics.loading = true
        smDiagnostics.error = null
        if (typeof rerender === 'function') rerender()
        try {
            const query = typeof appState.cwd === 'string' && appState.cwd !== '' ? '?cwd=' + encodeURIComponent(appState.cwd) : ''
            const data = await api('/diagnostics' + query)
            smDiagnostics.data = data !== null && typeof data === 'object' ? data : null
            smDiagnostics.checkedAt = data !== null && typeof data === 'object' && typeof data.checkedAt === 'number' ? data.checkedAt : 0
            smDiagnostics.error = null
        } catch (failure) {
            smDiagnostics.error = failure !== null && typeof failure === 'object' ? failure : {}
        } finally {
            smDiagnostics.loading = false
            if (typeof rerender === 'function') rerender()
        }
    }

    function smFixLabel(issue) {
        const action = issue !== null && issue !== undefined && issue.fix !== undefined && issue.fix !== null ? issue.fix.action : ''
        if (action === 'remove-link') return t('diag.fix.removeLink')
        if (action === 'open-file') return t('diag.fix.openFile')
        if (action === 'rename') return t('diag.fix.rename')
        if (action === 'view-active') return t('diag.fix.viewActive')
        if (action === 'retry') return t('action.retry')
        return t('action.retry')
    }

    function smOpenSkillDetail(skill) {
        if (skill === null || skill === undefined) return
        setState({ tab: 'installed', view: 'detail', detail: { kind: 'installed', id: skill.id, name: skill.name } })
    }

    function smOpenActiveForIssue(issue) {
        const name = issue !== null && issue !== undefined ? smText(issue.name) : ''
        const active = smFindActiveSkillByName(name)
        if (active !== null) {
            smCloseDiagnostics()
            smOpenSkillDetail(active)
            return
        }
        smPushToast(t('diag.noActive'), { tone: 'error' })
    }

    function smOpenIssueSkill(issue) {
        const name = issue !== null && issue !== undefined ? smText(issue.name) : ''
        const path = issue !== null && issue !== undefined ? smText(issue.path) : ''
        const skill = smFindSkillByName(name) || smFindSkillById(path)
        if (skill !== null) {
            smCloseDiagnostics()
            smOpenSkillDetail(skill)
            return
        }
        if (path !== '') {
            smCopyText(path)
            return
        }
        smPushToast(t('error.notFound'), { tone: 'error' })
    }

    async function smRemoveBrokenLink(issue) {
        const path = issue !== null && issue !== undefined ? smText(issue.path) : ''
        if (path === '') {
            smPushToast(t('error.notFound'), { tone: 'error' })
            return
        }
        try {
            await api('/skill?path=' + encodeURIComponent(path), { method: 'DELETE' })
            smPushToast(t('diag.fixed', { name: smText(issue.name, path) }))
            void loadInstalled(true)
            void smLoadDiagnostics()
        } catch (failure) {
            smPushToast(smErrorMessage(failure), { tone: 'error' })
        }
    }

    function smRunDiagnosticFix(issue) {
        const action = issue !== null && issue !== undefined && issue.fix !== undefined && issue.fix !== null ? issue.fix.action : 'retry'
        if (action === 'view-active') {
            smOpenActiveForIssue(issue)
            return
        }
        if (action === 'open-file') {
            smOpenIssueSkill(issue)
            return
        }
        if (action === 'retry') {
            void smLoadDiagnostics()
            return
        }
        if (action === 'remove-link') {
            void smRemoveBrokenLink(issue)
            return
        }
        if (action === 'rename') {
            const suggested = issue !== null && issue !== undefined ? smText(issue.name) : ''
            if (suggested !== '') smCopyText(suggested)
            smPushToast(t('diag.fix.renameHint', { name: suggested }))
        }
    }

    function SmDiagnosticsDrawer() {
        const data = smDiagnostics.data
        const rawIssues = data !== null && Array.isArray(data.issues) ? data.issues : []
        const issues = rawIssues.filter((issue) => issue !== null && typeof issue === 'object')
        const errors = issues.filter((issue) => issue.severity === 'error').length
        const warnings = issues.filter((issue) => issue.severity !== 'error').length
        const checkedAt = smDiagnostics.checkedAt
        const loading = smDiagnostics.loading || (data === null && smDiagnostics.error === null)

        const body = loading
            ? h(
                'div',
                { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
                h('div', { style: { height: '64px', borderRadius: '14px', background: 'var(--dsw-alias-bg-layer-2)' } }),
                h('div', { style: { height: '64px', borderRadius: '14px', background: 'var(--dsw-alias-bg-layer-2)' } }),
                h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 1px)' } }, t('state.loading')),
            )
            : smDiagnostics.error !== null
                ? h(
                    'div',
                    { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '48px 20px', textAlign: 'center' } },
                    h('span', { style: { color: 'var(--dsw-alias-state-error-primary)' } }, icon('alert', 28)),
                    h('div', { style: { color: 'var(--dsw-alias-label-primary)', fontSize: 'var(--sm-fs)', fontWeight: 500 } }, t('diag.error')),
                    h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, smErrorMessage(smDiagnostics.error)),
                    h(SmButton, { tone: 'secondary', onClick: () => { void smLoadDiagnostics() } }, t('action.retry')),
                )
                : issues.length === 0
                    ? h(
                        'div',
                        { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '56px 20px', textAlign: 'center' } },
                        h('span', { style: { color: 'var(--dsw-alias-state-success-primary)' } }, icon('check', 32)),
                        h('div', { style: { color: 'var(--dsw-alias-label-primary)', fontSize: 'var(--sm-fs)', fontWeight: 500 } }, t('diag.none')),
                        h('div', { style: { maxWidth: '340px', color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)', lineHeight: '1.5' } }, t('diag.explain')),
                    )
                    : h(
                        'div',
                        { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
                        SM_DIAG_KINDS.map((meta) => {
                            const group = issues.filter((issue) => issue && issue.kind === meta.kind)
                            if (group.length === 0) return null
                            return h(
                                'div',
                                { key: meta.kind, style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
                                h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 2px)' } },
                                    h(SmBadge, { tone: meta.tone }, meta.labelKey !== '' ? t(meta.labelKey) : meta.kind),
                                    h('span', null, String(group.length)),
                                ),
                                group.map((issue, index) => h(
                                    'div',
                                    {
                                        key: String(issue.id || meta.kind + '-' + String(index)),
                                        style: {
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '8px',
                                            padding: '14px 16px',
                                            borderRadius: '16px',
                                            background: 'var(--dsw-alias-bg-layer-1)',
                                            border: '1px solid var(--dsw-alias-border-l2)',
                                        },
                                    },
                                    h(
                                        'div',
                                        { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' } },
                                        h('span', { className: 'sm-mono', style: { minWidth: 0, wordBreak: 'break-all', color: 'var(--dsw-alias-label-primary)', fontSize: 'calc(var(--sm-fs) - 1px)', fontWeight: 500 } }, smText(issue.name, issue.kind)),
                                        h(SmBadge, { tone: issue.severity === 'error' ? 'error' : (issue.severity === 'warning' ? 'warn' : 'idle') }, issue.severity === 'error' ? t('diag.error') : (issue.severity === 'warning' ? t('diag.warning') : t('diag.info'))),
                                    ),
                                    h('div', { className: 'sm-mono', style: { wordBreak: 'break-all', color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 3px)' } }, smText(issue.path)),
                                    h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)', lineHeight: '1.5' } }, smText(issue.message)),
                                    h(
                                        'div',
                                        { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } },
                                        h(SmButton, {
                                            tone: 'secondary',
                                            style: { height: '28px' },
                                            onClick: () => smRunDiagnosticFix(issue),
                                        }, smFixLabel(issue)),
                                        issue.fix !== undefined && issue.fix !== null && typeof issue.fix.hint === 'string' && issue.fix.hint !== ''
                                            ? h('span', { style: { color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 3px)' } }, issue.fix.hint)
                                            : null,
                                    ),
                                )),
                            )
                        }),
                        h('div', { style: { paddingTop: '4px', color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 3px)', lineHeight: '1.5' } }, t('diag.explain')),
                    )

        return h(
            'div',
            {
                className: 'sm-drawer-backdrop',
                style: { position: 'fixed', inset: 0, zIndex: 1240, background: 'transparent' },
                onMouseDown: (event) => {
                    if (event.target !== event.currentTarget) return
                    if (dialogStack[dialogStack.length - 1] !== 'diagnostics') return
                    smHideTooltip()
                    smCloseDiagnostics()
                },
            },
            h(
                'aside',
                {
                    className: 'sm-drawer sm-diagnostics',
                    role: 'dialog',
                    'aria-modal': 'true',
                    'aria-label': t('diag.title'),
                    style: {
                        position: 'fixed',
                        top: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 1250,
                        width: 'min(560px, 100vw)',
                        display: 'flex',
                        flexDirection: 'column',
                        background: 'var(--dsw-static-neutral-bluish-850, var(--dsw-alias-bg-layer-1))',
                        borderLeft: '0.5px solid var(--dsw-alias-border-l2)',
                        boxShadow: 'none',
                    },
                },
                h(
                    'div',
                    { style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', padding: '20px 24px 16px', borderBottom: '1px solid var(--dsw-alias-border-l2)' } },
                    h(
                        'div',
                        { style: { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 } },
                        h('h3', { style: { margin: 0, fontSize: 'calc(var(--sm-fs) + 1px)', fontWeight: 500, color: 'var(--dsw-alias-label-primary)' } }, t('diag.title')),
                        h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)' } },
                            loading
                                ? t('state.loading')
                                : t('diag.issuesCount', { errors: errors, warnings: warnings }) + ' · ' + t('update.lastChecked', { time: checkedAt > 0 ? fmtTime(checkedAt) : '—' }),
                        ),
                    ),
                    h(
                        'div',
                        { style: { display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 } },
                        h(SmButton, { tone: 'secondary', style: { height: '28px' }, disabled: loading, onClick: () => { void smLoadDiagnostics() } }, t('diag.recheck')),
                        h('button', {
                            type: 'button',
                            className: 'sm-icon-btn',
                            'aria-label': t('action.close'),
                            onClick: smCloseDiagnostics,
                            style: {
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '28px',
                                height: '28px',
                                padding: 0,
                                border: 'none',
                                borderRadius: '8px',
                                background: 'transparent',
                                color: 'var(--dsw-alias-label-secondary)',
                                cursor: 'pointer',
                            },
                        }, icon('x', 16)),
                    ),
                ),
                h(
                    'div',
                    { style: { flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' } },
                    body,
                ),
            ),
        )
    }

    function renderDiagnosticsDrawer() {
        if (!smDiagnostics.open) return null
        return h(SmDiagnosticsDrawer)
    }
// ===== 90-styles.js =====
    /** Every style rule of the panel, scoped under .sm-root. */
    const STYLES = `
/* ------------------------------------------------------------------ *
 * Root, font scale and layout                                        *
 * ------------------------------------------------------------------ */

.sm-root,
.sm-root *,
.sm-root *::before,
.sm-root *::after {
  box-sizing: border-box;
}

.sm-root {
  --sm-fs: var(--dsh-content-font-size, 14px);
  font-size: calc(var(--sm-fs) - 1px);
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  width: 100%;
  overflow: hidden;
  line-height: 1.5;
  font-family: var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif);
  -webkit-font-smoothing: antialiased;
}

/* Low-specificity reset: :where() keeps component classes (.sm-btn*,
 * .sm-chip*, .sm-tab*) in control of background/color/font-size. */
.sm-root :where(button),
.sm-root :where(input),
.sm-root :where(select),
.sm-root :where(textarea) {
  font-family: inherit;
  font-size: inherit;
  color: inherit;
  background: none;
  border: none;
  outline: none;
}

.sm-root :where(button) {
  cursor: pointer;
}

.sm-root :where(button):disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.sm-root :where(button):focus-visible,
.sm-root :where(input):focus-visible,
.sm-root :where(select):focus-visible,
.sm-root :where(textarea):focus-visible,
.sm-root [tabindex]:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-brand-primary));
  outline-offset: 1px;
}

.sm-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  scrollbar-gutter: stable;
  /* The page frame owns the horizontal inset and the centred content column;
   * a scroll view only contributes the bottom breathing room. */
  padding: 0 0 48px;
  scrollbar-width: thin;
  scrollbar-color: var(--dsw-alias-scrollbar-bg-l1) transparent;
}

.sm-scroll::-webkit-scrollbar,
.sm-dialog-body::-webkit-scrollbar,
.sm-drawer::-webkit-scrollbar,
.sm-code::-webkit-scrollbar,
.sm-files::-webkit-scrollbar,
.sm-editor::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.sm-scroll::-webkit-scrollbar-track,
.sm-dialog-body::-webkit-scrollbar-track,
.sm-drawer::-webkit-scrollbar-track,
.sm-code::-webkit-scrollbar-track,
.sm-files::-webkit-scrollbar-track,
.sm-editor::-webkit-scrollbar-track {
  background: transparent;
}

.sm-scroll::-webkit-scrollbar-thumb,
.sm-dialog-body::-webkit-scrollbar-thumb,
.sm-drawer::-webkit-scrollbar-thumb,
.sm-code::-webkit-scrollbar-thumb,
.sm-files::-webkit-scrollbar-thumb,
.sm-editor::-webkit-scrollbar-thumb {
  background: var(--dsw-alias-scrollbar-bg-l1);
  border-radius: 999px;
}

.sm-page {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
}

/* Only the outer page (list/detail shell) fills the panel; nested tab pages
 * (.sm-market, .sm-sources-page) grow naturally inside .sm-tab-view.sm-scroll. */
.sm-root > .sm-page {
  flex: 1 1 auto;
  overflow: hidden;
  /* Matches the conversation page: one centred content column with an inset
   * that shrinks on narrow windows instead of the content hugging the frame. */
  --sm-content-max: 960px;
  padding: 28px clamp(20px, 4vw, 48px) 0;
}

/* Header, tabs, list and detail all share the same column, so their left edges
 * line up instead of the header sitting on the window edge. */
.sm-root > .sm-page > * {
  width: 100%;
  max-width: var(--sm-content-max);
  margin-inline: auto;
}

.sm-tab-view {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
}

.sm-page-detail {
  min-height: 0;
}

.sm-page > * + * {
  margin-top: 16px;
}

.sm-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  min-width: 0;
}

.sm-header > div:first-child {
  min-width: 0;
}

.sm-title {
  margin: 0;
  font-size: calc(var(--sm-fs) + 2px);
  font-weight: 500;
  line-height: 1.4;
  letter-spacing: -0.01em;
  color: var(--dsw-alias-label-primary);
}

.sm-desc {
  margin: 4px 0 0;
  font-size: calc(var(--sm-fs) - 1px);
  line-height: 1.5;
  color: var(--dsw-alias-label-secondary);
}

.sm-page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  min-width: 0;
}

.sm-page-head-text {
  min-width: 0;
}

.sm-page-title {
  margin: 0;
  font-size: calc(var(--sm-fs) + 2px);
  font-weight: 500;
  line-height: 1.4;
  letter-spacing: -0.01em;
  color: var(--dsw-alias-label-primary);
}

.sm-page-desc {
  margin: 4px 0 0;
  font-size: calc(var(--sm-fs) - 1px);
  line-height: 1.5;
  color: var(--dsw-alias-label-secondary);
}

.sm-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
  margin-left: auto;
  min-width: 0;
}

.sm-search {
  position: relative;
  width: 240px;
  height: 33px;
  padding: 0 28px 0 32px;
  border-radius: 12px;
  background: var(--dsw-alias-bg-layer-1);
  border: 0.5px solid var(--dsw-alias-border-l2);
  color: var(--dsw-alias-label-primary);
  font-size: calc(var(--sm-fs) - 1px);
  line-height: 31px;
  outline: none;
}

.sm-search::placeholder {
  color: var(--dsw-alias-label-caption);
}

.sm-search:focus {
  border-color: var(--dsw-alias-border-l3);
}

.sm-search input,
.sm-search .sm-search-input {
  display: block;
  width: 100%;
  height: 100%;
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  outline: none;
}

.sm-search > svg,
.sm-search .sm-search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 15px;
  height: 15px;
  color: var(--dsw-alias-label-caption);
  pointer-events: none;
}

.sm-search-clear {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--dsw-alias-label-caption);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.sm-search-clear:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}

.sm-tabs {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  height: 34px;
  padding: 2px;
  border-radius: 14px;
  background: var(--dsw-alias-bg-layer-3);
  width: fit-content;
  max-width: 100%;
  flex-shrink: 0;
}

.sm-tab {
  height: 30px;
  padding: 0 12px;
  border-radius: 12px;
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: var(--sm-fs);
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease;
}

.sm-tab:hover {
  color: var(--dsw-alias-label-primary);
}

.sm-tab.active,
.sm-tab.sm-active,
.sm-tab.sm-tab-active,
.sm-tab[aria-selected="true"] {
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font-weight: 500;
}

.sm-tab-badge,
.sm-tab-count {
  min-width: 16px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--dsw-specific-sidebar-nav-item-active);
  color: var(--dsw-alias-label-primary);
  font-size: calc(var(--sm-fs) - 3px);
  font-weight: 500;
  line-height: 16px;
  text-align: center;
  white-space: nowrap;
}

.sm-tab-count-warn {
  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 16%, transparent);
  color: var(--dsw-alias-state-warn-primary);
}

/* ------------------------------------------------------------------ *
 * Location groups and rows                                           *
 * ------------------------------------------------------------------ */

.sm-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.sm-group + .sm-group {
  margin-top: 40px;
}

.sm-group-head {
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 8px;
  margin-bottom: 10px;
  min-width: 0;
  font-size: var(--sm-fs);
  font-weight: 500;
}

.sm-group-head > div:first-child {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.sm-group-path {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: calc(var(--sm-fs) - 2px);
  font-weight: 400;
  color: var(--dsw-alias-label-caption);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 380px;
  min-width: 0;
}

.sm-group-count {
  font-size: calc(var(--sm-fs) - 2px);
  font-weight: 400;
  color: var(--dsw-alias-label-caption);
  white-space: nowrap;
  flex-shrink: 0;
}

.sm-installed {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.sm-installed-loading {
  gap: 12px;
}

.sm-groups {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.sm-filter-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
  min-width: 0;
}

.sm-sort {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.sm-sort-label {
  font-size: calc(var(--sm-fs) - 1px);
  color: var(--dsw-alias-label-secondary);
  white-space: nowrap;
}

.sm-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.sm-group-head-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.sm-group-head-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.sm-group-title {
  font-size: var(--sm-fs);
  font-weight: 500;
  color: var(--dsw-alias-label-primary);
  white-space: nowrap;
}

.sm-group-head-toggle {
  cursor: pointer;
  user-select: none;
}

.sm-group-disabled {
  opacity: 0.72;
}

.sm-row {
  min-height: 72px;
  padding: 8px 10px;
  border-radius: 20px;
  border: 1px solid transparent;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  min-width: 0;
  cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease;
}

.sm-row:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}

.sm-row.selected {
  background: var(--dsw-alias-interactive-bg-hover);
  border-color: var(--dsw-alias-border-l2);
}

.sm-row.market,
.sm-row-market,
.sm-market .sm-row,
.sm-row[data-kind="market"] {
  min-height: 84px;
  background: var(--dsw-alias-bg-layer-1);
  border-color: var(--dsw-alias-border-l1);
}

.sm-row.market:hover,
.sm-row-market:hover,
.sm-market .sm-row:hover,
.sm-row[data-kind="market"]:hover {
  background: var(--dsw-alias-bg-layer-2);
  border-color: var(--dsw-alias-border-l2);
}

.sm-row-icon,
.sm-icon-box {
  width: 49px;
  height: 49px;
  border-radius: 16px;
  background: var(--dsw-alias-bg-layer-1);
  border: 1px solid var(--dsw-alias-border-l2);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  flex-shrink: 0;
  color: var(--dsw-alias-label-secondary);
}

.sm-row-icon svg,
.sm-icon-box svg {
  width: 24px;
  height: 24px;
}

.sm-row.market .sm-icon-box,
.sm-row-market .sm-icon-box,
.sm-market .sm-row .sm-icon-box {
  background: var(--dsw-alias-bg-layer-2);
}

.sm-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--dsw-alias-label-caption);
  border: 1.5px solid var(--dsw-alias-bg-base);
  flex-shrink: 0;
}

.sm-icon-box > .sm-dot,
.sm-row-icon > .sm-dot,
.sm-detail-icon > .sm-dot {
  position: absolute;
  left: 5px;
  bottom: 5px;
}

.sm-dot-ok {
  background: var(--dsw-alias-state-success-primary);
}

.sm-dot-warn {
  background: var(--dsw-alias-state-warn-primary);
}

.sm-dot-error {
  background: var(--dsw-alias-state-error-primary);
}

.sm-dot-idle {
  background: var(--dsw-alias-label-caption);
}

.sm-dot-update {
  background: var(--dsw-alias-brand-primary);
}

.sm-row-main {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 14px;
}

.sm-row-text {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.sm-row-title {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-wrap: nowrap;
}

.sm-row-name {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: var(--sm-fs);
  font-weight: 500;
  line-height: 1.4;
  color: var(--dsw-alias-label-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  max-width: 100%;
}

.sm-row-version {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: calc(var(--sm-fs) - 2px);
  color: var(--dsw-alias-label-caption);
  white-space: nowrap;
  flex-shrink: 0;
}

.sm-row-desc {
  flex: 0 0 auto;
  font-size: calc(var(--sm-fs) - 1px);
  line-height: 1.45;
  color: var(--dsw-alias-label-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.sm-row-tail {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  margin-left: auto;
}

.sm-row-badges,
.sm-row-tags,
.sm-tag-bar {
  max-width: 340px;
  overflow: hidden;
  flex-wrap: nowrap;
  display: flex;
  gap: 6px;
  align-items: center;
  min-width: 0;
  flex-shrink: 1;
}

.sm-row-builtin {
  font-size: calc(var(--sm-fs) - 2px);
  color: var(--dsw-alias-label-caption);
  white-space: nowrap;
  flex-shrink: 0;
}

.sm-row-by {
  font-size: calc(var(--sm-fs) - 2px);
  color: var(--dsw-alias-label-caption);
  min-width: 0;
}

.sm-row-disabled {
  opacity: 0.62;
}

.sm-row-name-disabled {
  color: var(--dsw-alias-label-tertiary);
}

.sm-row-highlight {
  background: var(--dsw-alias-interactive-bg-hover);
  outline: 1.5px solid var(--dsw-alias-brand-primary);
}

.sm-skill-row {
  min-height: 65px;
}

.sm-row-more {
  flex-shrink: 0;
}

/* ------------------------------------------------------------------ *
 * Badges                                                             *
 * ------------------------------------------------------------------ */

.sm-badge,
.sm-badge-update,
.sm-badge-builtin,
.sm-badge-model,
.sm-badge-user,
.sm-badge-loc {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 8px;
  border-radius: 999px;
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-secondary);
  font-size: calc(var(--sm-fs) - 3px);
  font-weight: 500;
  line-height: 17px;
  white-space: nowrap;
  flex-shrink: 0;
}

.sm-badge-update {
  background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 12%, transparent);
  color: color-mix(in srgb, var(--dsw-alias-state-success-primary) 82%, var(--dsw-alias-label-primary));
  border-color: color-mix(in srgb, var(--dsw-alias-state-success-primary) 28%, transparent);
  font-weight: 500;
}

.sm-badge-update svg {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
}

.sm-badge-builtin {
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-tertiary);
  border-color: var(--dsw-alias-border-l1);
}

.sm-badge-model {
  background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 12%, transparent);
  color: color-mix(in srgb, var(--dsw-alias-state-success-primary) 82%, var(--dsw-alias-label-primary));
  border-color: color-mix(in srgb, var(--dsw-alias-state-success-primary) 28%, transparent);
}

.sm-badge-user {
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent);
  color: color-mix(in srgb, var(--dsw-alias-brand-primary) 82%, var(--dsw-alias-label-primary));
  border-color: color-mix(in srgb, var(--dsw-alias-brand-primary) 28%, transparent);
}

.sm-badge-loc {
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-secondary);
  border-color: var(--dsw-alias-border-l1);
}

.sm-badge.warn,
.sm-badge.sm-warn,
.sm-badge-warn {
  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 14%, transparent);
  color: var(--dsw-alias-state-warn-primary);
  border-color: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 32%, transparent);
}

.sm-badge.error,
.sm-badge.sm-error,
.sm-badge-error {
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 14%, transparent);
  color: var(--dsw-alias-state-error-primary);
  border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 32%, transparent);
}

.sm-badge.success,
.sm-badge.sm-success,
.sm-badge-success,
.sm-badge-ok {
  background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 14%, transparent);
  color: var(--dsw-alias-state-success-primary);
  border-color: color-mix(in srgb, var(--dsw-alias-state-success-primary) 32%, transparent);
}

.sm-badge-idle {
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-tertiary);
  border-color: var(--dsw-alias-border-l1);
}

/* ------------------------------------------------------------------ *
 * Controls                                                           *
 * ------------------------------------------------------------------ */

.sm-btn,
.sm-btn-primary,
.sm-btn-secondary,
.sm-btn-ghost,
.sm-btn-icon,
.sm-btn-danger {
  height: 32px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font-size: calc(var(--sm-fs, 14px) - 1px);
  font-weight: 500;
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  white-space: nowrap;
  cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease, color 120ms ease, opacity 120ms ease;
}

.sm-btn:disabled,
.sm-btn-primary:disabled,
.sm-btn-secondary:disabled,
.sm-btn-ghost:disabled,
.sm-btn-icon:disabled,
.sm-btn-danger:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.sm-btn-primary {
  background: var(--dsw-alias-label-primary);
  border-color: var(--dsw-alias-label-primary);
  color: var(--dsw-alias-bg-base);
}

.sm-btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.sm-btn-secondary {
  background: var(--dsw-alias-bg-layer-2);
  border-color: var(--dsw-alias-border-l2);
  color: var(--dsw-alias-label-primary);
}

.sm-btn-secondary:hover:not(:disabled) {
  background: var(--dsw-alias-bg-layer-3);
}

.sm-btn-ghost {
  padding: 0 10px;
  background: transparent;
  border-color: transparent;
  color: var(--dsw-alias-label-secondary);
}

.sm-btn-ghost:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}

.sm-btn-icon {
  width: 32px;
  height: 32px;
  padding: 0;
  border-radius: 12px;
  background: var(--dsw-alias-bg-layer-1);
  border-color: var(--dsw-alias-border-l2);
  color: var(--dsw-alias-label-secondary);
}

.sm-btn-icon:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}

.sm-btn-danger {
  background: var(--dsw-alias-state-error-primary);
  border-color: var(--dsw-alias-state-error-primary);
  color: var(--dsw-alias-label-primary);
}

.sm-btn-danger:hover:not(:disabled) {
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 85%, transparent);
}

.sm-btn-dangerSolid {
  background: var(--dsw-alias-state-error-primary);
  border-color: var(--dsw-alias-state-error-primary);
  color: var(--dsw-alias-bg-base);
}

.sm-btn-sm {
  height: 26px;
  padding: 0 10px;
  border-radius: 10px;
  font-size: calc(var(--sm-fs) - 2px);
}

.sm-check-updates {
  gap: 6px;
}

.sm-icon-btn {
  width: 32px;
  height: 32px;
  padding: 0;
  border-radius: 12px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-secondary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease;
}

.sm-icon-btn:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}

.sm-icon-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.sm-link-btn {
  padding: 0;
  border: none;
  background: transparent;
  color: var(--dsw-alias-brand-primary);
  font-size: inherit;
  font-family: inherit;
  cursor: pointer;
}

.sm-link-btn:hover {
  color: var(--dsw-alias-label-primary);
  text-decoration: underline;
}

.sm-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.sm-upgrade-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--dsw-alias-state-success-primary);
}

.sm-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.sm-chips {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  min-width: 0;
}

.sm-chip {
  height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-secondary);
  font-size: calc(var(--sm-fs) - 2px);
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease, border-color 120ms ease;
}

.sm-chip:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}

.sm-chip.active,
.sm-chip.sm-active,
.sm-chip.sm-chip-active,
.sm-chip[aria-pressed="true"] {
  background: var(--dsw-specific-sidebar-nav-item-active);
  border-color: transparent;
  color: var(--dsw-alias-label-primary);
  font-weight: 500;
}

.sm-chip-active {
  background: var(--dsw-specific-sidebar-nav-item-active);
  border-color: transparent;
  color: var(--dsw-alias-label-primary);
  font-weight: 500;
}

.sm-select {
  height: 30px;
  padding: 0 10px;
  border-radius: 10px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font-size: calc(var(--sm-fs) - 1px);
  font-family: inherit;
  cursor: pointer;
  outline: none;
}

.sm-select:focus {
  border-color: var(--dsw-alias-border-l3);
}

.sm-switch {
  position: relative;
  width: 36px;
  height: 20px;
  padding: 2px;
  border-radius: 999px;
  border: none;
  background: var(--dsw-alias-border-l3);
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  cursor: pointer;
  transition: background 150ms ease;
}

.sm-switch[aria-checked="true"],
.sm-switch.on {
  background: var(--dsw-alias-label-primary);
}

.sm-switch.sm-switch-off {
  background: var(--dsw-alias-border-l3);
}

.sm-switch:empty::after {
  content: "";
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--dsw-alias-bg-base);
  transform: translateX(0);
  transition: transform 150ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.sm-switch[aria-checked="true"]:empty::after,
.sm-switch.on:empty::after {
  transform: translateX(16px);
}

.sm-switch > .sm-switch-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--dsw-alias-bg-base);
  transform: translateX(0);
  transition: transform 150ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.sm-switch[aria-checked="true"] > .sm-switch-thumb,
.sm-switch.on > .sm-switch-thumb {
  transform: translateX(16px);
}

.sm-input {
  width: 100%;
  height: 33px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font-size: calc(var(--sm-fs) - 1px);
  font-family: inherit;
  outline: none;
  transition: border-color 120ms ease;
}

.sm-input::placeholder {
  color: var(--dsw-alias-label-caption);
}

.sm-input:focus {
  border-color: var(--dsw-alias-border-l3);
}

.sm-textarea {
  width: 100%;
  min-height: 96px;
  padding: 8px 12px;
  border-radius: 12px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font-size: calc(var(--sm-fs) - 1px);
  font-family: inherit;
  line-height: 1.6;
  resize: vertical;
  outline: none;
  transition: border-color 120ms ease;
}

.sm-textarea:focus {
  border-color: var(--dsw-alias-border-l3);
}

/* ------------------------------------------------------------------ *
 * State surfaces                                                     *
 * ------------------------------------------------------------------ */

.sm-banner {
  padding: 10px 16px;
  border-radius: 16px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font-size: calc(var(--sm-fs) - 1px);
  line-height: 1.5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
}

.sm-banner.warn,
.sm-banner.sm-warn,
.sm-banner-warn {
  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 12%, transparent);
  border-color: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 30%, transparent);
}

.sm-banner.error,
.sm-banner.sm-error,
.sm-banner-error {
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, transparent);
  border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 30%, transparent);
}

.sm-banner.update,
.sm-banner.sm-update,
.sm-banner-update,
.sm-banner.info,
.sm-banner.sm-info,
.sm-banner-info {
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent);
  border-color: color-mix(in srgb, var(--dsw-alias-brand-primary) 30%, transparent);
}

.sm-banner.ok,
.sm-banner.sm-ok,
.sm-banner-ok,
.sm-banner.success,
.sm-banner.sm-success,
.sm-banner-success {
  background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 12%, transparent);
  border-color: color-mix(in srgb, var(--dsw-alias-state-success-primary) 30%, transparent);
}

.sm-banner-quiet {
  background: var(--dsw-alias-bg-layer-1);
  border-color: var(--dsw-alias-border-l1);
  color: var(--dsw-alias-label-secondary);
}

.sm-banners {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.sm-banner-main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
}

.sm-banner-text {
  min-width: 0;
  font-size: inherit;
  color: inherit;
}

.sm-banner-title {
  font-weight: 500;
  color: var(--dsw-alias-label-primary);
}

.sm-banner-items {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  min-width: 0;
}

.sm-banner-meta {
  font-size: calc(var(--sm-fs) - 2px);
  color: var(--dsw-alias-label-secondary);
  min-width: 0;
}

.sm-banner-detail {
  color: var(--dsw-alias-label-tertiary);
  min-width: 0;
}

.sm-banner-code {
  font-size: calc(var(--sm-fs) - 2px);
  color: var(--dsw-alias-label-caption);
  overflow-wrap: anywhere;
}

.sm-empty {
  padding: 48px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  text-align: center;
  color: var(--dsw-alias-label-tertiary);
  font-size: calc(var(--sm-fs) - 1px);
  line-height: 1.5;
}

.sm-empty-installed {
  padding: 64px 20px;
}

.sm-empty-error .sm-empty-icon {
  color: var(--dsw-alias-state-error-primary);
}

.sm-empty-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--dsw-alias-label-tertiary);
  margin-bottom: 2px;
}

.sm-empty-title {
  font-size: calc(var(--sm-fs) + 1px);
  font-weight: 500;
  line-height: 1.4;
  color: var(--dsw-alias-label-primary);
}

.sm-empty-body {
  max-width: 420px;
  font-size: calc(var(--sm-fs) - 1px);
  line-height: 1.5;
  color: var(--dsw-alias-label-tertiary);
}

.sm-empty-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 6px;
}

.sm-market-empty {
  padding: 40px 20px;
}

.sm-skeleton {
  width: 100%;
  min-height: 14px;
  border-radius: 12px;
  background: var(--dsw-alias-bg-skeleton);
  animation: sm-skeleton-pulse 1.4s ease-in-out infinite;
}

.sm-skeleton-row {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 65px;
  padding: 8px;
}

.sm-skeleton-rows {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sm-skeleton-icon {
  width: 49px;
  height: 49px;
  border-radius: 16px;
  flex-shrink: 0;
}

.sm-skeleton-lines {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sm-skeleton-line {
  height: 12px;
  max-width: 420px;
  border-radius: 6px;
}

.sm-skeleton-line-lg {
  height: 16px;
  width: 40%;
  max-width: 220px;
}

.sm-skeleton-banner {
  height: 42px;
  border-radius: 16px;
}

.sm-skeleton-filters {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.sm-skeleton-chip {
  width: 64px;
  height: 24px;
  border-radius: 999px;
}

.sm-spinner {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid color-mix(in srgb, var(--dsw-alias-label-tertiary) 30%, transparent);
  border-top-color: var(--dsw-alias-label-primary);
  animation: sm-spin 0.8s linear infinite;
  flex-shrink: 0;
}

.sm-error-panel {
  padding: 24px;
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 30%, transparent);
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent);
  color: var(--dsw-alias-label-primary);
  font-size: calc(var(--sm-fs) - 1px);
  line-height: 1.5;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
}

@keyframes sm-skeleton-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}

@keyframes sm-spin {
  to { transform: rotate(360deg); }
}

/* ------------------------------------------------------------------ *
 * In-page two-column detail                                          *
 * ------------------------------------------------------------------ */

.sm-detail {
  display: flex;
  flex-direction: column;
  gap: 22px;
  min-width: 0;
  min-height: 0;
}

.sm-detail-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
}

.sm-detail-skeleton {
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-width: 0;
}

.sm-root-detail {
  min-height: 0;
}

.sm-detail-back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 8px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  font-size: calc(var(--sm-fs) - 1.5px);
  font-family: inherit;
  cursor: pointer;
  align-self: flex-start;
  transition: background 120ms ease, color 120ms ease;
}

.sm-detail-back:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}

.sm-detail-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
  min-width: 0;
}

.sm-detail-head > div:first-child {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.sm-detail-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: var(--dsw-alias-bg-layer-1);
  border: 1px solid var(--dsw-alias-border-l2);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  flex-shrink: 0;
  color: var(--dsw-alias-label-secondary);
}

.sm-detail-icon svg {
  width: 28px;
  height: 28px;
}

.sm-detail-title {
  margin: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: calc(var(--sm-fs) + 2px);
  font-weight: 500;
  line-height: 1.4;
  color: var(--dsw-alias-label-primary);
  overflow-wrap: anywhere;
  min-width: 0;
}

.sm-detail-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  flex-shrink: 0;
  margin-left: auto;
}

.sm-detail-body {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
  align-items: start;
  min-width: 0;
}

.sm-detail-main,
.sm-detail-side {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.sm-card {
  padding: 16px;
  border-radius: 16px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-1);
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.sm-card-title {
  margin: 0;
  font-size: var(--sm-fs);
  font-weight: 500;
  line-height: 1.4;
  color: var(--dsw-alias-label-primary);
}

.sm-code {
  margin: 0;
  padding: 12px 0;
  border-radius: 12px;
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-secondary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: calc(var(--sm-fs) - 2px);
  line-height: 1.7;
  max-height: 520px;
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--dsw-alias-scrollbar-bg-l1) transparent;
}

.sm-code-line {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 0 12px;
  min-width: max-content;
}

.sm-code-line-no {
  flex: 0 0 36px;
  text-align: right;
  color: var(--dsw-alias-label-caption);
  font-variant-numeric: tabular-nums;
  user-select: none;
}

.sm-editor {
  width: 100%;
  min-height: 420px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: calc(var(--sm-fs) - 2px);
  line-height: 1.7;
  tab-size: 2;
  resize: vertical;
  outline: none;
  scrollbar-width: thin;
  scrollbar-color: var(--dsw-alias-scrollbar-bg-l1) transparent;
}

.sm-editor:focus {
  border-color: var(--dsw-alias-border-l3);
}

.sm-files {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 320px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--dsw-alias-scrollbar-bg-l1) transparent;
}

.sm-file-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  color: var(--dsw-alias-label-secondary);
  font-size: calc(var(--sm-fs) - 2px);
  line-height: 1.45;
  min-width: 0;
}

.sm-file-row:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}

.sm-file-row .sm-mono {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ------------------------------------------------------------------ *
 * Modals                                                             *
 * ------------------------------------------------------------------ */

.sm-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: transparent;
  backdrop-filter: none;
}

.sm-dialog {
  width: 560px;
  max-width: 92vw;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  background: var(--dsw-static-neutral-bluish-850, var(--dsw-alias-bg-layer-1));
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: 20px;
  box-shadow: none;
  overflow: hidden;
  color: var(--dsw-alias-label-primary);
  font-size: var(--sm-fs, 14px);
}

.sm-dialog.narrow,
.sm-dialog.sm-narrow,
.sm-dialog.sm-dialog-confirm,
.sm-narrow {
  width: 360px;
  max-width: 92vw;
  border-radius: 14px;
}

.sm-dialog-close {
  flex-shrink: 0;
}

.sm-dialog-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 24px;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  flex-shrink: 0;
  min-width: 0;
}

.sm-dialog-head h2,
.sm-dialog-head .sm-dialog-title {
  margin: 0;
  font-size: calc(var(--sm-fs, 14px) + 1px);
  font-weight: 500;
  line-height: 1.4;
  color: var(--dsw-alias-label-primary);
  min-width: 0;
}

.sm-dialog-body {
  padding: 20px 24px;
  overflow-y: auto;
  flex: 1 1 auto;
  min-height: 0;
  font-size: var(--sm-fs, 14px);
  line-height: 1.6;
  scrollbar-width: thin;
  scrollbar-color: var(--dsw-alias-scrollbar-bg-l1) transparent;
}

.sm-dialog-foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 24px;
  border-top: 1px solid var(--dsw-alias-border-l1);
  flex-shrink: 0;
}

.sm-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
  min-width: 0;
}

.sm-field:last-child {
  margin-bottom: 0;
}

.sm-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: calc(var(--sm-fs, 14px) - 1px);
  font-weight: 500;
  line-height: 1.4;
  color: var(--dsw-alias-label-secondary);
}

.sm-form-error {
  font-size: calc(var(--sm-fs, 14px) - 2px);
  line-height: 1.4;
  color: var(--dsw-alias-state-error-primary);
}

.sm-radio-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.sm-radio {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-secondary);
  font-size: calc(var(--sm-fs, 14px) - 1px);
  line-height: 1.45;
  cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
}

.sm-radio:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}

.sm-radio.active,
.sm-radio.sm-active,
.sm-radio[data-checked="true"] {
  background: var(--dsw-alias-bg-layer-2);
  border-color: var(--dsw-alias-border-l3);
  color: var(--dsw-alias-label-primary);
}

.sm-radio input[type="radio"] {
  margin: 2px 0 0;
  flex-shrink: 0;
  accent-color: var(--dsw-alias-brand-primary);
}

/* ------------------------------------------------------------------ *
 * Diagnostics drawer                                                 *
 * ------------------------------------------------------------------ */

.sm-drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: transparent;
  backdrop-filter: none;
}

.sm-diagnostics {
  min-height: 0;
}

.sm-drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 560px;
  max-width: 90vw;
  display: flex;
  flex-direction: column;
  background: var(--dsw-static-neutral-bluish-850, var(--dsw-alias-bg-layer-1));
  border-left: 1px solid var(--dsw-alias-border-l2);
  border-top-left-radius: 20px;
  border-bottom-left-radius: 20px;
  box-shadow: none;
  z-index: 1150;
  overflow: hidden;
  color: var(--dsw-alias-label-primary);
  font-size: var(--sm-fs, 14px);
}

.sm-issue {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-1);
  min-width: 0;
}

.sm-issue.warn {
  border-color: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 30%, transparent);
}

.sm-issue.error {
  border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 30%, transparent);
}

.sm-issue-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: calc(var(--sm-fs, 14px) - 1px);
  font-weight: 500;
  line-height: 1.4;
  color: var(--dsw-alias-label-primary);
  min-width: 0;
}

.sm-issue-path {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: calc(var(--sm-fs, 14px) - 2px);
  line-height: 1.45;
  color: var(--dsw-alias-label-tertiary);
  word-break: break-all;
}

.sm-issue-action {
  align-self: flex-start;
  height: 26px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
  font-size: calc(var(--sm-fs, 14px) - 2px);
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
}

.sm-issue-action:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}

/* ------------------------------------------------------------------ *
 * Floating layers: tooltip, toast, context menu                      *
 * ------------------------------------------------------------------ */

.sm-tooltip {
  --sm-fs: var(--dsh-content-font-size, 14px);
  position: fixed;
  z-index: 2000;
  max-width: 290px;
  padding: 6px 10px;
  border-radius: 7px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-secondary);
  font-size: calc(var(--sm-fs) - 4px);
  line-height: 1.35;
  box-shadow: none;
  pointer-events: none;
  white-space: normal;
  opacity: 0;
  transition: opacity 110ms ease;
}

.sm-tooltip.visible,
.sm-tooltip.show {
  opacity: 1;
}

.sm-toast-host {
  position: fixed;
  left: 50%;
  bottom: 28px;
  transform: translateX(-50%);
  z-index: 2100;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  max-width: min(420px, calc(100vw - 32px));
  pointer-events: none;
}

.sm-toast {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  max-width: 100%;
  padding: 8px 14px;
  border-radius: 12px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-3);
  color: var(--dsw-alias-label-primary);
  font-size: calc(var(--sm-fs, 14px) - 1px);
  line-height: 1.4;
  box-shadow: none;
  pointer-events: auto;
  animation: sm-toast-in 160ms ease;
}

.sm-toast.ok,
.sm-toast.sm-ok,
.sm-toast-ok {
  border-color: color-mix(in srgb, var(--dsw-alias-state-success-primary) 40%, transparent);
}

.sm-toast.error,
.sm-toast.sm-error,
.sm-toast-error {
  border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 40%, transparent);
}

.sm-toast.info,
.sm-toast.sm-info,
.sm-toast-info {
  border-color: color-mix(in srgb, var(--dsw-alias-brand-primary) 40%, transparent);
}

.sm-toasts {
  min-width: 0;
}

.sm-toast-action {
  padding: 0 6px;
  border: none;
  background: transparent;
  color: var(--dsw-alias-brand-primary);
  font-size: inherit;
  font-family: inherit;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
}

.sm-toast-action:hover {
  color: var(--dsw-alias-label-primary);
}

@keyframes sm-toast-in {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.sm-menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1599;
  background: transparent;
}

.sm-menu {
  position: fixed;
  z-index: 1600;
  min-width: 168px;
  padding: 4px;
  border-radius: 12px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-static-neutral-bluish-850, var(--dsw-alias-bg-layer-2));
  box-shadow: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
  color: var(--dsw-alias-label-primary);
  font-size: var(--sm-fs, 14px);
}

.sm-menu-item {
  height: 30px;
  padding: 0 10px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font-size: calc(var(--sm-fs, 14px) - 1px);
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
}

.sm-menu-item:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover);
}

.sm-menu-item:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.sm-menu-item.danger,
.sm-menu-item.sm-menu-item-danger {
  color: var(--dsw-alias-state-error-primary);
}

.sm-menu-item-danger {
  color: var(--dsw-alias-state-error-primary);
}

.sm-menu-sep {
  height: 1px;
  margin: 4px 6px;
  background: var(--dsw-alias-border-l1);
  flex-shrink: 0;
}

/* ------------------------------------------------------------------ *
 * Market tab                                                         *
 * ------------------------------------------------------------------ */

.sm-market-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.sm-market-controls-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  min-width: 0;
}

.sm-market-source-control {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-wrap: wrap;
}

.sm-market-tools {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.sm-market-chips {
  min-width: 0;
}

.sm-search.sm-market-search {
  width: 220px;
}

.sm-market-source-select {
  min-width: 160px;
  max-width: 260px;
}

.sm-market-sort {
  min-width: 150px;
}

.sm-market-list {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.sm-market-list.sm-stack {
  gap: 2px;
}

.sm-market-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 0;
}

.sm-market-installed {
  font-size: calc(var(--sm-fs) - 3px);
  color: var(--dsw-alias-label-tertiary);
}

/* ------------------------------------------------------------------ *
 * Sources tab                                                        *
 * ------------------------------------------------------------------ */

.sm-sources-page {
  min-width: 0;
}

.sm-sources-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr));
  gap: 12px;
  min-width: 0;
}

.sm-presets-grid {
  grid-template-columns: repeat(auto-fill, minmax(min(260px, 100%), 1fr));
}

.sm-sources-section {
  gap: 12px;
}

.sm-sources-section-header {
  height: auto;
  margin-bottom: 2px;
}

.sm-sources-hint {
  font-size: calc(var(--sm-fs) - 2px);
  color: var(--dsw-alias-label-caption);
}

.sm-source-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
}

.sm-source-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
}

.sm-source-card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
}

.sm-source-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.sm-source-path {
  font-size: calc(var(--sm-fs) - 2px);
  color: var(--dsw-alias-label-caption);
}

.sm-source-count {
  font-size: calc(var(--sm-fs) - 2px);
  color: var(--dsw-alias-label-tertiary);
}

.sm-source-note {
  font-size: calc(var(--sm-fs) - 2px);
  color: var(--dsw-alias-label-tertiary);
}

.sm-source-error {
  font-size: calc(var(--sm-fs) - 2px);
  color: var(--dsw-alias-state-error-primary);
}

.sm-priority-card,
.sm-preset-card,
.sm-market-source-card {
  min-width: 0;
}

/* ------------------------------------------------------------------ *
 * Utilities                                                          *
 * ------------------------------------------------------------------ */

.sm-fs-16 { font-size: calc(var(--sm-fs) + 2px); }
.sm-fs-15 { font-size: calc(var(--sm-fs) + 1px); }
.sm-fs-14 { font-size: var(--sm-fs); }
.sm-fs-13 { font-size: calc(var(--sm-fs) - 1px); }
.sm-fs-12 { font-size: calc(var(--sm-fs) - 2px); }
.sm-fs-11 { font-size: calc(var(--sm-fs) - 3px); }

.sm-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.sm-muted {
  color: var(--dsw-alias-label-tertiary);
}

.sm-caption {
  font-size: calc(var(--sm-fs) - 2px);
  color: var(--dsw-alias-label-caption);
}

.sm-ellipsis {
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sm-row-gap {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.sm-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

/* ------------------------------------------------------------------ *
 * Responsive and reduced motion                                      *
 * ------------------------------------------------------------------ */

@media (max-width: 1100px) {
  .sm-detail-body {
    grid-template-columns: 1fr;
  }

  .sm-row-tail .sm-btn,
  .sm-row-tail .sm-btn-primary,
  .sm-row-tail .sm-btn-secondary,
  .sm-detail-actions .sm-btn,
  .sm-detail-actions .sm-btn-primary,
  .sm-detail-actions .sm-btn-secondary {
    height: 28px;
    padding: 0 10px;
    font-size: calc(var(--sm-fs) - 2px);
  }

  .sm-detail-actions {
    margin-left: 0;
  }
}

@media (max-width: 900px) {
  .sm-scroll {
    padding: 24px 24px 48px;
  }

  .sm-search {
    width: 100%;
  }

  .sm-row-badges {
    max-width: 220px;
  }

  .sm-dialog {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sm-root *,
  .sm-root *::before,
  .sm-root *::after,
  .sm-tooltip,
  .sm-toast-host,
  .sm-menu {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
}
`
// ===== 99-apply.js =====
    /* ------------------------------------------------------------------ *
     * Panel entry, sidebar icon, and registration.                        *
     * This fragment is written last so it can reference every symbol the  *
     * earlier fragments define.                                           *
     * ------------------------------------------------------------------ */

    /** Set by the mounted page; every state mutation funnels through it. */
    let __rerender = () => {}

    /** Re-render the page after a state mutation. */
    function rerender() {
      __rerender()
    }

    /** Sidebar glyph: the owner renders a 16px (wide) or 18px (rail) slot. */
    function SkillManagerIcon(props) {
      const requested = props !== null && typeof props === 'object' ? props.size : undefined
      // The owner asks for 16px in the wide sidebar and 18px in the collapsed rail.
      const size = requested === 18 ? 18 : 16
      const active = props !== null && typeof props === 'object' && props.active === true
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          'aria-hidden': 'true',
          focusable: 'false',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.5,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          opacity: active ? 1 : 0.72,
        },
        h('path', { d: 'M6 3.5h8.5L19 8v12.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1Z' }),
        h('path', { d: 'M14 3.5V8h5' }),
        h('path', { d: 'm12 11.2 1.35 2.75 3.05.45-2.2 2.15.5 3.05L12 18.15l-2.7 1.45.5-3.05-2.2-2.15 3.05-.45Z' }),
      )
    }

    /** The main panel: owns the state subscription and the first data load. */
    function SkillManagerPage(props) {
      const source = props !== null && typeof props === 'object' ? props : {}
      const [version, setVersion] = useState(0)
      const bootstrapped = useRef(false)

      useEffect(() => {
        __rerender = () => setVersion((value) => value + 1)
        return () => {
          __rerender = () => {}
        }
      }, [])

      useEffect(() => {
        if (bootstrapped.current) return
        bootstrapped.current = true
        void bootstrap(props)
      }, [])

      // `version` is read so React re-runs this component when setState fires.
      void version
      return renderPage(props)
    }

    /** First paint: read settings, then load the active tab's data. */
    async function bootstrap(props) {
      try {
        const settings = await api('settings')
        if (settings !== null && typeof settings === 'object') {
          if (typeof settings.fontSize === 'number') appState.fontSize = settings.fontSize
          if (typeof settings.cwd === 'string') appState.cwd = settings.cwd
        }
      } catch {
        /* settings are best effort; the page still works with defaults */
      }
      await Promise.all([loadSources(), loadInstalled()])
      void loadUpdates()
    }

    /** Browser half entry. */
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'skill-manager: dictionaries')

      ctx.effect(() => {
        if (typeof document === 'undefined' || document === null) return () => {}
        const style = document.createElement('style')
        style.dataset.plugin = '@xiechenghua01/dsh-skill-manager'
        style.textContent = STYLES
        const head = document.head !== undefined && document.head !== null ? document.head : document.documentElement
        if (head === undefined || head === null) return () => {}
        head.appendChild(style)
        return () => {
          if (typeof style.remove === 'function') style.remove()
        }
      }, 'skill-manager: styles')

      const t = ctx.locale.bind(NS)

      ctx.effect(
        () =>
          ctx.slots.inject('main', () =>
            ctx.slots.register(
              {
                name: 'main',
                key: PANEL_ID,
                locale: NS,
                inject: () => ({ t }),
              },
              SkillManagerPage,
            ),
          ),
        'skill-manager: main panel',
      )

      ctx.effect(
        () =>
          ctx.slots.inject('sidebar.panellist', () =>
            ctx.slots.register(
              {
                name: 'sidebar.panellist',
                id: PANEL_ID,
                order: 20,
                locale: NS,
                label: () => t('panel.title'),
              },
              SkillManagerIcon,
            ),
          ),
        'skill-manager: sidebar entry',
      )
    }

    return { inject: ['slots', 'locale', 'layout'], apply }
  },
})
