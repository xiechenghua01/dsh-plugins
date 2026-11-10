    /* ================================================================== *
     * 00-prelude.js                                                       *
     * Constants, locale dictionaries, helpers, mutable state and loaders. *
     * Every symbol here is shared with the later fragments.               *
     * ================================================================== */

    const NS = 'skillManager'
    const PANEL_ID = 'skill-manager'
    const DEFAULT_FONT_SIZE = 14
    const API_BASE = '/skill-manager/api/'

    /** Shared dataTransfer key for source drag-and-drop (see 30-source-dialog). */
    const DRAG_KEY = 'application/x-sm-source'

    /** Secondary tabs of the skills page, in fixed display order. */
    const SKILL_CATEGORIES = ['mine', 'shared', 'project', 'system']

    /** Skills-page sort values (contract 3.1: name / modified / source). */
    const SKILL_SORTS = ['name', 'modified', 'source']
    /** Literal label keys: the checker only sees keys written as string literals. */
    const SKILL_SORT_LABEL_KEYS = { name: 'sort.name', modified: 'sort.modified', source: 'sort.source' }

    /** Market sort values (contract 3.5). */
    const MARKET_SORTS = ['recommend', 'updated', 'name']

    /* ------------------------------------------------------------------ *
     * Locale dictionaries. zh/en must keep identical key sets.            *
     * Placeholders use {name} and are interpolated by t().                *
     * ------------------------------------------------------------------ */

            const zh = {
      'action.addSource': '添加源',
      'action.back.market': '返回市场',
      'action.back.skills': '返回技能列表',
      'action.backup': '保留一份备份',
      'action.cancel': '取消',
      'action.checkUpdates': '检查更新',
      'action.clear': '清除',
      'action.close': '关闭',
      'action.copy': '复制',
      'action.copyPath': '复制路径',
      'action.create': '创建技能',
      'action.delete': '删除',
      'action.deleteSource': '删除源',
      'action.disable': '停用',
      'action.disableSource': '停用源',
      'action.edit': '编辑原文',
      'action.enable': '恢复',
      'action.enableSource': '启用源',
      'action.goMarket': '去市场看看',
      'action.import': '导入技能',
      'action.install': '安装',
      'action.manageSources': '管理源',
      'action.more': '更多',
      'action.newSkill': '新建技能',
      'action.openFile': '打开文件修正',
      'action.parse': '解析',
      'action.refresh': '刷新',
      'action.removeLink': '删除失效项',
      'action.retry': '重试',
      'action.save': '保存',
      'action.undo': '撤销',
      'action.uninstall': '卸载',
      'action.update': '更新',
      'action.validate': '校验',
      'action.viewActive': '查看生效项',
      'action.viewDetail': '查看详情',
      'action.viewFile': '查看并精简正文',
      'action.viewInstalled': '查看技能',
      'badge.disabled': '已停用',
      'badge.issue': '未生效',
      'badge.readonly': '只读',
      'badge.update': '可更新至 {version}',
      'badge.updateTip': '可升级至新版本 {version}',
      'delete.body': '将删除 {name} 及其所有文件，无法撤销。',
      'delete.readonly': '这个技能不能删除',
      'delete.title': '删除技能？',
      'detail.author': '作者',
      'detail.builtinNote': '系统内置，Harness 自带，不能修改。',
      'detail.content': '原文',
      'detail.content.empty': '正文为空',
      'detail.copiedPath': '路径已复制',
      'detail.descTitle': '描述',
      'detail.disabledNote': '已停用。Agent 暂时看不到它，文件还在，可随时恢复。',
      'detail.editHint': '如果文件在其他地方被修改，保存时会提醒你。',
      'detail.location': '文件位置',
      'detail.location.builtin': '由 Harness 内置提供，没有本地文件',
      'detail.readonlyNote': '只读技能，不能修改或删除。',
      'detail.source.local': '本地文件',
      'detail.source.market': '来自市场：{source}',
      'detail.status.active': '生效中',
      'detail.status.builtin': '系统内置',
      'detail.status.disabled': '已停用',
      'detail.status.issue': '未生效',
      'detail.status.readonly': '只读',
      'detail.updated': '最近修改 {time}',
      'detail.version': '版本',
      'detail.whenToUse': '什么时候用',
      'diag.checkedAt': '上次检查 {time}',
      'diag.details': '详细信息',
      'diag.details.hide': '收起详细信息',
      'diag.effective': '当前生效',
      'diag.error.fixFailed': '没能处理这个问题：{reason}',
      'diag.fix.manageSources': '去管理源处理',
      'diag.fix.openFolder': '打开所在目录',
      'diag.fixHint': '处理后会重新检查。',
      'diag.kind': '类型',
      'diag.note': '文件开头格式不对的技能会被跳过，不会出现在技能列表里。',
      'diag.partial': '有些位置这次没检查到',
      'diag.path': '路径',
      'diag.recheck': '重新检查',
      'diag.rechecking': '正在检查…',
      'diag.section.attention': '需要留意',
      'diag.section.inactive': '未生效',
      'diag.sentence.brokenLink': '{name} 指向的位置已经不存在了。',
      'diag.sentence.frontmatter': '{name} 的文件开头格式不对，Agent 读不到它。',
      'diag.sentence.name': '{name} 的名字不符合规则：只能用小写字母、数字和连字符。',
      'diag.sentence.oversize': '{name} 的内容比较大，加载会变慢，有些 Agent 可能读不全。',
      'diag.sentence.sameName': '{name} 与『{group}』里的另一个技能同名，现在生效的是后者。',
      'diag.sentence.sourceUnreachable': '{name} 来自市场源『{source}』，这个源暂时连不上；已安装的版本仍然能用，只是暂时不能检查更新。',
      'diag.sentence.unreadable': '{name} 所在的文件夹打不开，可能是权限问题。',
      'diag.summary': '{active} 个技能未生效 · {attention} 个需要留意',
      'diag.title': '未生效与问题',
      'diag.toast.fixed': '已处理',
      'empty.diag.body': '没有发现问题。',
      'empty.diag.title': '全部正常',
      'empty.market.noResults.body': '换个关键词或分类试试。',
      'empty.market.noResults.title': '没有匹配「{query}」的技能',
      'empty.market.noSkills.body': '到「管理源」里看看，或稍后再试。',
      'empty.market.noSkills.title': '这个源暂时没有技能',
      'empty.market.noSource.body': '添加一个索引源，就能发现并安装社区技能。',
      'empty.market.noSource.title': '还没有添加技能索引源',
      'empty.search': '没有匹配「{query}」的技能',
      'empty.search.body': '换个关键词试试。',
      'empty.sources.body': '添加后，市场里就能搜索和安装技能。',
      'empty.sources.title': '还没有添加技能索引源',
      'empty.tab.builtin': 'Harness 自带的技能都正常',
      'empty.tab.mine': '还没有自己的技能，从市场装一个或新建一个',
      'empty.tab.project': '当前项目还没有技能',
      'empty.tab.shared': '这里放所有 Agent 共用的技能',
      'error.canceled': '已取消',
      'error.checksum': '文件校验失败，安装已取消',
      'error.generic': '发生未知错误',
      'error.indexInvalid': '索引内容不正确',
      'error.noCompatible': '没有与当前 Harness 兼容的版本',
      'error.notEnoughSpace': '磁盘空间不足',
      'error.notFound': '文件已被移动或删除',
      'error.pathOutside': '目标位置不允许写入',
      'error.read': '无法读取技能目录',
      'error.readonly': '系统内置技能不能修改',
      'error.service': '技能服务未加载',
      'error.service.body': '请重启 Harness 后再试。',
      'error.sourceSchema': '索引格式不正确',
      'error.stalePage': '列表已更新，请刷新后重试',
      'error.tooLarge': '文件过大',
      'error.unauthorized': '当前页面未获授权',
      'error.unexpected': '出了点问题，请重试。',
      'error.versionUnknown': '找不到这个版本',
      'form.body': '正文',
      'form.body.placeholder': '写下这个技能的说明与步骤。',
      'form.body.required': '请填写正文。',
      'form.description': '一句话描述',
      'form.description.placeholder': '说明这个技能做什么',
      'form.edit.dirty': '未保存',
      'form.edit.discard.body': '关闭后，这次的修改不会保留。',
      'form.edit.discard.confirm': '放弃修改',
      'form.edit.discard.title': '放弃未保存的修改？',
      'form.edit.title': '编辑原文',
      'form.import.dir': '从文件夹导入',
      'form.import.dir.placeholder': '输入技能文件夹的路径',
      'form.import.invalid': '无法解析：{reason}',
      'form.import.parsed': '解析成功',
      'form.import.paste': '粘贴 SKILL.md',
      'form.import.paste.placeholder': '把 SKILL.md 的内容粘贴到这里',
      'form.import.preview': '将导入 {count} 个文件',
      'form.import.title': '导入技能',
      'form.mtimeConflict': '文件已被外部修改，请刷新后重试。',
      'form.name': '名称',
      'form.name.invalid': '名称只能用小写字母、数字和连字符。',
      'form.name.placeholder': '例如：code-review',
      'form.name.taken': '这个位置已有同名技能。',
      'form.new.title': '新建技能',
      'form.projectUnavailable': '当前没有打开项目',
      'form.saveTo': '保存到',
      'form.whenToUse': '什么时候用（选填）',
      'group.count': '{count} 个技能',
      'group.local': '本地创建',
      'install.cancelConfirm.body': '已写入的临时文件会被清理。',
      'install.cancelConfirm.ok': '取消安装',
      'install.cancelConfirm.title': '取消安装？',
      'install.conflict': '这个位置已有同名技能',
      'install.conflict.changeTarget': '换位置',
      'install.conflict.overwrite': '覆盖',
      'install.conflict.skip': '跳过',
      'install.progress.preparing': '正在准备…',
      'install.progress.verifying': '正在校验文件…',
      'install.success': '已安装 {name}',
      'install.target': '安装到',
      'install.title': '安装技能',
      'install.unavailable': '暂时无法安装这个技能',
      'install.version': '版本',
      'market.author': '作者',
      'market.detailDesc': '介绍',
      'market.engines': '需要 Harness {range}',
      'market.error.offline': '有些源暂时连不上，先显示上次的结果',
      'market.error.offlineHint': '已安装的技能不受影响。',
      'market.error.source': '这个源暂时读不了',
      'market.error.sourceHint': '检查索引地址是否可访问，或换个源。',
      'market.homepage': '主页',
      'market.installed': '已安装',
      'market.license': '许可证',
      'market.loadingMore': '正在加载更多…',
      'market.published': '发布于 {time}',
      'market.source': '来源',
      'market.updateTo': '更新到 {version}',
      'market.version': '版本',
      'market.yanked': '该版本已撤回',
      'panel.desc': '管理 Agent 可用的技能，看看哪些没生效。',
      'panel.title': '技能',
      'search.clear': '清除搜索',
      'search.market.placeholder': '搜索市场技能',
      'search.skills.placeholder': '搜索技能名称或描述',
      'sort.label': '排序',
      'sort.modified': '最近修改',
      'sort.name': '按名称',
      'sort.recommended': '推荐',
      'sort.source': '按来源',
      'sort.updated': '最近更新',
      'source.add.title': '添加技能索引源',
      'source.confirmDelete.body': '已安装的技能不会被删除，但之后无法再检查更新。',
      'source.confirmDelete.title': '删除这个源？',
      'source.disabled': '已停用',
      'source.dragHandle': '拖动排序',
      'source.error.fetch': '这个源暂时连不上',
      'source.error.invalidUrl': '请输入有效的 https 地址',
      'source.error.refreshFailed': '刷新失败，仍在显示上次成功读取的内容。',
      'source.error.urlRequired': '请填写索引地址',
      'source.lastChecked': '上次检查 {time}',
      'source.name': '名称',
      'source.name.placeholder': '选填，默认用索引标题',
      'source.neverChecked': '尚未检查',
      'source.orderBoundary': '已经在最前 / 最后面',
      'source.orderMoved': '{name} 已移到第 {n} 位',
      'source.preview': '示例：{names}',
      'source.skillCount': '{count} 个技能',
      'source.status.checking': '检查中',
      'source.status.error': '连不上',
      'source.status.ok': '正常',
      'source.title': '管理源',
      'source.trust': '该源由第三方提供，安装前请确认来源可信。',
      'source.url': '索引地址',
      'source.url.placeholder': 'https://…/index.json',
      'source.validated': '已读取 {count} 个技能',
      'state.error.detail.body': '文件可能已被移动或删除。',
      'state.error.detail.title': '无法读取该技能',
      'state.error.diag.title': '无法获取诊断结果',
      'state.error.market.title': '无法读取市场',
      'state.error.skills.body': '请检查服务是否已加载，然后重试。',
      'state.error.skills.title': '无法加载技能列表',
      'state.error.sources.body': '源列表暂时不可用，请稍后重试。',
      'state.error.sources.title': '无法读取技能索引源',
      'state.installing': '正在安装…',
      'state.loading': '正在加载技能…',
      'state.loadingMarket': '正在读取市场…',
      'state.savingContent': '正在写入文件…',
      'state.validating': '正在校验…',
      'status.brokenTooltip': '{count} 个技能未生效',
      'status.checking': '正在检查更新…',
      'status.updatesTooltip': '{count} 个技能可以更新 · 上次检查 {time}',
      'tab.category.mine': '我的技能',
      'tab.category.project': '项目技能',
      'tab.category.shared': '共享技能',
      'tab.category.system': '系统内置',
      'tab.market': '市场',
      'tab.skills': '技能',
      'tab.skills.label': '技能分类',
      'time.daysAgo': '{count} 天前',
      'time.hoursAgo': '{count} 小时前',
      'time.justNow': '刚刚',
      'time.minutesAgo': '{count} 分钟前',
      'time.monthsAgo': '{count} 个月前',
      'time.never': '从未',
      'time.unknown': '未知时间',
      'time.weeksAgo': '{count} 周前',
      'toast.checkedSources': '已检查 {sources} 个源，{updates} 个技能可更新',
      'toast.copied': '已复制',
      'toast.copyFailed': '复制失败，请手动复制路径',
      'toast.created': '已创建技能 {name}',
      'toast.deleted': '已删除 {name}',
      'toast.disabled': '已停用 {name}',
      'toast.enabled': '已恢复 {name}',
      'toast.imported': '已导入 {name}（{count} 个文件）',
      'toast.noUpdates': '已检查 {sources} 个源，已是最新',
      'toast.openedFolder': '已打开目录：{path}',
      'toast.saved': '已保存',
      'toast.sourceAdded': '已添加源 {name}',
      'toast.sourceDeleted': '已删除源 {name}',
      'uninstall.body': '将删除 {name} 和安装记录；不会影响其他技能。',
      'uninstall.readonly': '系统内置技能不能卸载',
      'uninstall.success': '已卸载 {name}',
      'uninstall.title': '卸载技能？',
      'update.all.body': '将更新 {count} 个技能。',
      'update.all.modified': '其中 {count} 个有本地修改，更新会覆盖这些修改。',
      'update.all.title': '全部更新',
      'update.backupNote': '更新前会自动备份当前版本。',
      'update.cancelConfirm.body': '当前技能会保持原版本。',
      'update.cancelConfirm.ok': '取消更新',
      'update.cancelConfirm.title': '取消更新？',
      'update.localModified': '本地文件已修改，更新会覆盖这些修改。',
      'update.none': '已是最新',
      'update.progress': '正在更新 {done}/{total}',
      'update.result': '已更新 {ok} 个，失败 {failed} 个',
      'update.result.ok': '全部更新完成',
      'update.retryFailedCount': '重试失败的 {count} 个',
      'update.success': '已更新到 {version}',
      'update.title': '更新技能',
      'update.versionChange': '{current} → {next}',
    }

            const en = {
      'action.addSource': 'Add source',
      'action.back.market': 'Back to market',
      'action.back.skills': 'Back to skills',
      'action.backup': 'Keep a backup',
      'action.cancel': 'Cancel',
      'action.checkUpdates': 'Check for updates',
      'action.clear': 'Clear',
      'action.close': 'Close',
      'action.copy': 'Copy',
      'action.copyPath': 'Copy path',
      'action.create': 'Create skill',
      'action.delete': 'Delete',
      'action.deleteSource': 'Delete source',
      'action.disable': 'Disable',
      'action.disableSource': 'Disable source',
      'action.edit': 'Edit content',
      'action.enable': 'Restore',
      'action.enableSource': 'Enable source',
      'action.goMarket': 'Browse market',
      'action.import': 'Import skill',
      'action.install': 'Install',
      'action.manageSources': 'Manage sources',
      'action.more': 'More',
      'action.newSkill': 'New skill',
      'action.openFile': 'Open file to fix',
      'action.parse': 'Parse',
      'action.refresh': 'Refresh',
      'action.removeLink': 'Remove broken item',
      'action.retry': 'Retry',
      'action.save': 'Save',
      'action.undo': 'Undo',
      'action.uninstall': 'Uninstall',
      'action.update': 'Update',
      'action.validate': 'Validate',
      'action.viewActive': 'View active skill',
      'action.viewDetail': 'View details',
      'action.viewFile': 'View and trim content',
      'action.viewInstalled': 'View skill',
      'badge.disabled': 'Disabled',
      'badge.issue': 'Not active',
      'badge.readonly': 'Read-only',
      'badge.update': 'Update to {version}',
      'badge.updateTip': 'Update available: {version}',
      'delete.body': 'This deletes {name} and all its files. It cannot be undone.',
      'delete.readonly': 'This skill cannot be deleted',
      'delete.title': 'Delete skill?',
      'detail.author': 'Author',
      'detail.builtinNote': 'Built-in with Harness; it cannot be changed.',
      'detail.content': 'Content',
      'detail.content.empty': 'No content',
      'detail.copiedPath': 'Path copied',
      'detail.descTitle': 'Description',
      'detail.disabledNote': 'Disabled. Agents cannot see it right now. Its files are kept and it can be restored.',
      'detail.editHint': 'If the file changed elsewhere, you will be told before saving.',
      'detail.location': 'File location',
      'detail.location.builtin': 'Provided by Harness; there is no local file',
      'detail.readonlyNote': 'This skill is read-only.',
      'detail.source.local': 'Local file',
      'detail.source.market': 'From market: {source}',
      'detail.status.active': 'Active',
      'detail.status.builtin': 'Built-in',
      'detail.status.disabled': 'Disabled',
      'detail.status.issue': 'Not active',
      'detail.status.readonly': 'Read-only',
      'detail.updated': 'Modified {time}',
      'detail.version': 'Version',
      'detail.whenToUse': 'When to use',
      'diag.checkedAt': 'Checked {time}',
      'diag.details': 'Details',
      'diag.details.hide': 'Hide details',
      'diag.effective': 'Currently active',
      'diag.error.fixFailed': 'Could not fix this: {reason}',
      'diag.fix.manageSources': 'Go to sources',
      'diag.fix.openFolder': 'Open containing folder',
      'diag.fixHint': 'We will check again after this.',
      'diag.kind': 'Type',
      'diag.note': 'Skills with an invalid file header are skipped and will not appear in the skills list.',
      'diag.partial': 'Some locations were not checked this time',
      'diag.path': 'Path',
      'diag.recheck': 'Check again',
      'diag.rechecking': 'Checking…',
      'diag.section.attention': 'Needs attention',
      'diag.section.inactive': 'Not active',
      'diag.sentence.brokenLink': 'The location {name} points to no longer exists.',
      'diag.sentence.frontmatter': 'The file header for {name} is invalid, so agents cannot read it.',
      'diag.sentence.name': 'The name {name} is invalid: use lowercase letters, numbers, and hyphens.',
      'diag.sentence.oversize': '{name} is large; loading may be slower and some agents may not read all of it.',
      'diag.sentence.sameName': 'Another skill in {group} has the same name as {name}; that one is currently active.',
      'diag.sentence.sourceUnreachable': '{name} comes from the market source {source}, which cannot be reached right now. The installed version still works; updates just cannot be checked for now.',
      'diag.sentence.unreadable': 'The folder for {name} cannot be opened; it may be a permissions issue.',
      'diag.summary': '{active} not active · {attention} need attention',
      'diag.title': 'Inactive and issues',
      'diag.toast.fixed': 'Fixed',
      'empty.diag.body': 'No problems found.',
      'empty.diag.title': 'All clear',
      'empty.market.noResults.body': 'Try another keyword or category.',
      'empty.market.noResults.title': 'No skills match "{query}"',
      'empty.market.noSkills.body': 'Check Manage sources, or try again later.',
      'empty.market.noSkills.title': 'This source has no skills yet',
      'empty.market.noSource.body': 'Add an index source to discover and install community skills.',
      'empty.market.noSource.title': 'No skill index sources yet',
      'empty.search': 'No skills match "{query}"',
      'empty.search.body': 'Try another keyword.',
      'empty.sources.body': 'Add one to search and install skills in the market.',
      'empty.sources.title': 'No skill index sources yet',
      'empty.tab.builtin': 'Skills shipped with Harness are all set.',
      'empty.tab.mine': 'You do not have any skills yet. Install one from the market or create one.',
      'empty.tab.project': 'This project has no skills yet.',
      'empty.tab.shared': 'Skills shared by all agents live here.',
      'error.canceled': 'Canceled',
      'error.checksum': 'File verification failed; installation was canceled',
      'error.generic': 'An unknown error occurred',
      'error.indexInvalid': 'The index content is invalid',
      'error.noCompatible': 'No version is compatible with this Harness',
      'error.notEnoughSpace': 'Not enough disk space',
      'error.notFound': 'The file has been moved or deleted',
      'error.pathOutside': 'This location does not allow writing',
      'error.read': 'Could not read skill folders',
      'error.readonly': 'Built-in skills cannot be changed',
      'error.service': 'Skill service is not loaded',
      'error.service.body': 'Restart Harness and try again.',
      'error.sourceSchema': 'The source file is invalid',
      'error.stalePage': 'The list has changed. Refresh and try again',
      'error.tooLarge': 'The file is too large',
      'error.unauthorized': 'This page is not authorized',
      'error.unexpected': 'Something went wrong. Try again.',
      'error.versionUnknown': 'This version was not found',
      'form.body': 'Content',
      'form.body.placeholder': 'Write the instructions for this skill.',
      'form.body.required': 'Enter content.',
      'form.description': 'One-line description',
      'form.description.placeholder': 'What does this skill do?',
      'form.edit.dirty': 'Unsaved',
      'form.edit.discard.body': 'Your changes will not be kept.',
      'form.edit.discard.confirm': 'Discard',
      'form.edit.discard.title': 'Discard unsaved changes?',
      'form.edit.title': 'Edit content',
      'form.import.dir': 'From folder',
      'form.import.dir.placeholder': 'Enter the skill folder path',
      'form.import.invalid': 'Could not parse: {reason}',
      'form.import.parsed': 'Parsed',
      'form.import.paste': 'Paste SKILL.md',
      'form.import.paste.placeholder': 'Paste the contents of SKILL.md here',
      'form.import.preview': '{count} files will be imported',
      'form.import.title': 'Import skill',
      'form.mtimeConflict': 'The file changed elsewhere. Refresh and try again.',
      'form.name': 'Name',
      'form.name.invalid': 'Use lowercase letters, numbers, and hyphens.',
      'form.name.placeholder': 'e.g. code-review',
      'form.name.taken': 'A skill with this name already exists here.',
      'form.new.title': 'New skill',
      'form.projectUnavailable': 'No project is open',
      'form.saveTo': 'Save to',
      'form.whenToUse': 'When to use (optional)',
      'group.count': '{count} skills',
      'group.local': 'Created locally',
      'install.cancelConfirm.body': 'Temporary files will be cleaned up.',
      'install.cancelConfirm.ok': 'Cancel installation',
      'install.cancelConfirm.title': 'Cancel installation?',
      'install.conflict': 'A skill with this name already exists here',
      'install.conflict.changeTarget': 'Change location',
      'install.conflict.overwrite': 'Overwrite',
      'install.conflict.skip': 'Skip',
      'install.progress.preparing': 'Preparing…',
      'install.progress.verifying': 'Verifying files…',
      'install.success': 'Installed {name}',
      'install.target': 'Install to',
      'install.title': 'Install skill',
      'install.unavailable': 'This skill cannot be installed right now',
      'install.version': 'Version',
      'market.author': 'Author',
      'market.detailDesc': 'About',
      'market.engines': 'Requires Harness {range}',
      'market.error.offline': 'Some sources cannot be reached; showing the last result',
      'market.error.offlineHint': 'Installed skills are not affected.',
      'market.error.source': 'This source cannot be read right now',
      'market.error.sourceHint': 'Check that the index URL is reachable, or pick another source.',
      'market.homepage': 'Homepage',
      'market.installed': 'Installed',
      'market.license': 'License',
      'market.loadingMore': 'Loading more…',
      'market.published': 'Published {time}',
      'market.source': 'Source',
      'market.updateTo': 'Update to {version}',
      'market.version': 'Version',
      'market.yanked': 'This version was withdrawn',
      'panel.desc': 'Manage the skills available to agents and see what is not working.',
      'panel.title': 'Skills',
      'search.clear': 'Clear search',
      'search.market.placeholder': 'Search market',
      'search.skills.placeholder': 'Search skills',
      'sort.label': 'Sort',
      'sort.modified': 'Recently modified',
      'sort.name': 'Name',
      'sort.recommended': 'Recommended',
      'sort.source': 'By source',
      'sort.updated': 'Recently updated',
      'source.add.title': 'Add skill index source',
      'source.confirmDelete.body': 'Installed skills will not be deleted, but they cannot be checked for updates afterward.',
      'source.confirmDelete.title': 'Delete this source?',
      'source.disabled': 'Disabled',
      'source.dragHandle': 'Drag to reorder',
      'source.error.fetch': 'This source cannot be reached right now',
      'source.error.invalidUrl': 'Enter a valid https URL',
      'source.error.refreshFailed': 'Refresh failed; showing the last successfully loaded content.',
      'source.error.urlRequired': 'Enter an index URL',
      'source.lastChecked': 'Checked {time}',
      'source.name': 'Name',
      'source.name.placeholder': 'Optional; uses the index title',
      'source.neverChecked': 'Never checked',
      'source.orderBoundary': 'Already at the top / bottom',
      'source.orderMoved': '{name} moved to position {n}',
      'source.preview': 'Preview: {names}',
      'source.skillCount': '{count} skills',
      'source.status.checking': 'Checking',
      'source.status.error': 'Unreachable',
      'source.status.ok': 'OK',
      'source.title': 'Sources',
      'source.trust': 'This is a third-party source. Verify it before installing.',
      'source.url': 'Index URL',
      'source.url.placeholder': 'https://…/index.json',
      'source.validated': 'Found {count} skills',
      'state.error.detail.body': 'The file may have moved or been deleted.',
      'state.error.detail.title': 'Could not load this skill',
      'state.error.diag.title': 'Could not load diagnostics',
      'state.error.market.title': 'Could not load market',
      'state.error.skills.body': 'Check that the service is running, then retry.',
      'state.error.skills.title': 'Could not load skills',
      'state.error.sources.body': 'Sources are unavailable right now. Try again later.',
      'state.error.sources.title': 'Could not load sources',
      'state.installing': 'Installing…',
      'state.loading': 'Loading skills…',
      'state.loadingMarket': 'Loading market…',
      'state.savingContent': 'Saving file…',
      'state.validating': 'Validating…',
      'status.brokenTooltip': '{count} skills are not active',
      'status.checking': 'Checking for updates…',
      'status.updatesTooltip': '{count} skills can be updated · Checked {time}',
      'tab.category.mine': 'My skills',
      'tab.category.project': 'Project skills',
      'tab.category.shared': 'Shared skills',
      'tab.category.system': 'Built-in',
      'tab.market': 'Market',
      'tab.skills': 'Skills',
      'tab.skills.label': 'Skill categories',
      'time.daysAgo': '{count} days ago',
      'time.hoursAgo': '{count} hours ago',
      'time.justNow': 'just now',
      'time.minutesAgo': '{count} minutes ago',
      'time.monthsAgo': '{count} months ago',
      'time.never': 'Never',
      'time.unknown': 'Unknown time',
      'time.weeksAgo': '{count} weeks ago',
      'toast.checkedSources': 'Checked {sources} sources; {updates} skills can be updated',
      'toast.copied': 'Copied',
      'toast.copyFailed': 'Copy failed. Copy the path manually.',
      'toast.created': 'Created skill {name}',
      'toast.deleted': 'Deleted {name}',
      'toast.disabled': 'Disabled {name}',
      'toast.enabled': 'Restored {name}',
      'toast.imported': 'Imported {name} ({count} files)',
      'toast.noUpdates': 'Checked {sources} sources; everything is up to date',
      'toast.openedFolder': 'Opened folder: {path}',
      'toast.saved': 'Saved',
      'toast.sourceAdded': 'Added source {name}',
      'toast.sourceDeleted': 'Deleted source {name}',
      'uninstall.body': 'This removes {name} and its install record. Other skills are unaffected.',
      'uninstall.readonly': 'Built-in skills cannot be uninstalled',
      'uninstall.success': 'Uninstalled {name}',
      'uninstall.title': 'Uninstall skill?',
      'update.all.body': 'This will update {count} skills.',
      'update.all.modified': '{count} have local changes that will be overwritten.',
      'update.all.title': 'Update all',
      'update.backupNote': 'The current version is backed up before updating.',
      'update.cancelConfirm.body': 'This skill will stay on its current version.',
      'update.cancelConfirm.ok': 'Cancel update',
      'update.cancelConfirm.title': 'Cancel update?',
      'update.localModified': 'Local files changed; updating overwrites them.',
      'update.none': 'Up to date',
      'update.progress': 'Updating {done} of {total}',
      'update.result': 'Updated {ok}; {failed} failed',
      'update.result.ok': 'All updates finished',
      'update.retryFailedCount': 'Retry {count} failed',
      'update.success': 'Updated to {version}',
      'update.title': 'Update skill',
      'update.versionChange': '{current} → {next}',
    }

    /* ------------------------------------------------------------------ *
     * State (contract 3.5). Infrastructure fields (cwd / fontSize /       *
     * locale / toasts) are kept alongside the contract fields.            *
     * ------------------------------------------------------------------ */

    const appState = {
        tab: 'skills',
        category: 'mine',
        search: '',
        sort: 'name',
        marketSort: 'recommend',
        view: 'list',
        detail: null,
        skills: [],
        categories: { mine: 0, shared: 0, project: 0, system: 0 },
        sources: [],
        sourceOrder: [],
        marketSources: [],
        updates: null,
        diagnostics: null,
        loading: { installed: false, sources: false, market: false, updates: false },
        error: null,
        restoreListScroll: null,
        menu: null,
        modal: null,
        sourceDialogOpen: false,
        checking: false,
        /* infrastructure */
        cwd: '',
        fontSize: DEFAULT_FONT_SIZE,
        locale: 'zh',
        toasts: [],
        lastErrorToast: null,
    }

    function setState(patch) {
        /* 任何状态变化都可能替换掉当前 hover 的节点。tooltip 挂在 <body>
         * 上，目标卸载后 mouseout 不会触发，所以这里必须先主动隐藏。 */
        if (typeof smHideTooltip === 'function') smHideTooltip()
        if (patch !== null && typeof patch === 'object') Object.assign(appState, patch)
        rerender()
    }

    function isLoading(key) {
        return appState.loading !== null && typeof appState.loading === 'object' && appState.loading[key] === true
    }

    function setLoading(key, value) {
        if (appState.loading === null || typeof appState.loading !== 'object') appState.loading = {}
        appState.loading[key] = value === true
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

    /** Format a timestamp in milliseconds (a value in seconds is tolerated). */
    function fmtTime(ms) {
        const value = Number(ms)
        if (!Number.isFinite(value) || value <= 0) return t('time.never')
        const stamp = value > 1000000000000 ? value : value * 1000
        const diff = Date.now() - stamp
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
            return new Date(stamp).toLocaleDateString(isEnglishLocale() ? 'en' : 'zh-CN')
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

    function delay(ms) {
        return new Promise(function (resolve) {
            if (typeof setTimeout === 'function') setTimeout(resolve, ms)
            else resolve()
        })
    }

    /* ------------------------------------------------------------------ *
     * HTTP wrapper. Returns data on success; throws { code, message }.    *
     * Non-http(s) paths are always prefixed with /skill-manager/api/.     *
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
        /* At most one toast at a time: a new one replaces the previous one. */
        appState.toasts = [item]
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
        download: [
            ['path', { d: 'M12 4v11' }],
            ['path', { d: 'm8 11 4 4 4-4' }],
            ['path', { d: 'M5 15v3.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V15' }],
        ],
        upload: [
            ['path', { d: 'M12 19V8' }],
            ['path', { d: 'm8 12 4-4 4 4' }],
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
        'arrow-up-dot': [
            ['path', { d: 'M12 19V6m-5 5 5-5 5 5' }],
            ['circle', { cx: 19, cy: 5, r: 2, fill: 'currentColor', stroke: 'none' }],
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
        grip: [
            ['circle', { cx: 9, cy: 6, r: 1.2, fill: 'currentColor', stroke: 'none' }],
            ['circle', { cx: 15, cy: 6, r: 1.2, fill: 'currentColor', stroke: 'none' }],
            ['circle', { cx: 9, cy: 12, r: 1.2, fill: 'currentColor', stroke: 'none' }],
            ['circle', { cx: 15, cy: 12, r: 1.2, fill: 'currentColor', stroke: 'none' }],
            ['circle', { cx: 9, cy: 18, r: 1.2, fill: 'currentColor', stroke: 'none' }],
            ['circle', { cx: 15, cy: 18, r: 1.2, fill: 'currentColor', stroke: 'none' }],
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
        external: [
            ['path', { d: 'M14 4h6v6' }],
            ['path', { d: 'M20 4 11 13' }],
            ['path', { d: 'M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10' }],
        ],
        pin: [
            ['path', { d: 'M9 4h6l-1 5 3 3v2H7v-2l3-3Z' }],
            ['path', { d: 'M12 14v6' }],
        ],
        package: [
            ['path', { d: 'M12 3 20.5 7.5v9L12 21l-8.5-4.5v-9Z' }],
            ['path', { d: 'M3.5 7.5 12 12l8.5-4.5M12 12v9' }],
        ],
    }

    function icon(name, size, extraClass) {
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
            className: cx('sm-icon', extraClass),
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
     * Skill helpers shared with the list, market and detail fragments.    *
     * ------------------------------------------------------------------ */

    /** Unified source of the newer version available for a skill. */
    function skillUpdateVersion(skill) {
        if (skill === null || typeof skill !== 'object') return ''
        const direct = skill.updateAvailable
        if (typeof direct === 'string' && direct !== '') return direct
        const state = appState.updates
        if (state !== null && typeof state === 'object' && Array.isArray(state.updates)) {
            const name = String(skill.name === undefined || skill.name === null ? '' : skill.name)
            const location = String(skill.location === undefined || skill.location === null ? '' : skill.location)
            const found = state.updates.find(function (item) {
                return item !== null && typeof item === 'object'
                    && String(item.name === undefined || item.name === null ? '' : item.name) === name
                    && String(item.location === undefined || item.location === null ? '' : item.location) === location
            })
            if (found !== undefined && found.available !== undefined && found.available !== null && String(found.available) !== '') {
                return String(found.available)
            }
        }
        return ''
    }

    function skillStatusDot(skill) {
        if (skill === null || typeof skill !== 'object') return 'sm-dot sm-dot-idle'
        if (skill.status === 'disabled') return 'sm-dot sm-dot-idle'
        if (skill.status === 'broken' || skill.status === 'invalid') return 'sm-dot sm-dot-warn'
        if (skillUpdateVersion(skill) !== '') return 'sm-dot sm-dot-update'
        return 'sm-dot sm-dot-ok'
    }

    function skillStatusTip(skill) {
        if (skill === null || typeof skill !== 'object') return t('error.unexpected')
        if (skill.status === 'disabled') return t('badge.disabled')
        if (skill.status === 'broken' || skill.status === 'invalid') {
            return typeof skill.brokenReason === 'string' && skill.brokenReason !== '' ? skill.brokenReason : t('badge.issue')
        }
        const updateVersion = skillUpdateVersion(skill)
        if (updateVersion !== '') return t('badge.update', { version: versionLabel(updateVersion) })
        if (skill.writable === false) return t('badge.readonly')
        return t('detail.status.active')
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
        return h('div', { className: cx('sm-card-icon', opts.className) },
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
        h('span', null, text === '' ? t('badge.update', { version: '' }) : text))
    }

    /* ------------------------------------------------------------------ *
     * Counters used by the tab bar status icons.                          *
     * ------------------------------------------------------------------ */

    function categoryCount(category) {
        const key = String(category === undefined || category === null ? '' : category)
        if (appState.categories !== null && typeof appState.categories === 'object' && typeof appState.categories[key] === 'number') {
            return appState.categories[key]
        }
        let count = 0
        appState.skills.forEach(function (skill) {
            if (skill !== null && typeof skill === 'object' && skill.category === key) count += 1
        })
        return count
    }

    /** Skills that are not active (broken / invalid), excluding attention-only issues. */
    function brokenSkillCount() {
        const diag = appState.diagnostics
        if (diag !== null && typeof diag === 'object') {
            if (Array.isArray(diag.inactive)) return diag.inactive.length
            if (Array.isArray(diag.issues)) {
                return diag.issues.filter(function (issue) {
                    if (issue === null || typeof issue !== 'object') return false
                    if (issue.severity !== 'error' && issue.severity !== 'warning') return false
                    return issue.kind !== 'oversize' && issue.kind !== 'sourceUnreachable'
                }).length
            }
        }
        return appState.skills.filter(function (skill) {
            return skill !== null && typeof skill === 'object' && (skill.status === 'broken' || skill.status === 'invalid')
        }).length
    }

    function updateSkillCount() {
        const state = appState.updates
        if (state !== null && typeof state === 'object' && Array.isArray(state.updates)) return state.updates.length
        return appState.skills.filter(function (skill) { return skillUpdateVersion(skill) !== '' }).length
    }

    function lastCheckedLabel() {
        const state = appState.updates
        if (state === null || typeof state !== 'object' || typeof state.checkedAt !== 'number' || state.checkedAt === 0) {
            return t('time.never')
        }
        return fmtTime(state.checkedAt)
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

    function clearErrorScope(scope) {
        if (appState.error !== null && typeof appState.error === 'object' && appState.error.scope === scope) appState.error = null
    }

    async function loadInstalled(force) {
        if (isLoading('installed') === true && force !== true) return null
        setLoading('installed', true)
        clearErrorScope('installed')
        rerender()
        try {
            const data = await api('installed?cwd=' + encodeURIComponent(appState.cwd === undefined || appState.cwd === null ? '' : appState.cwd))
            if (data !== null && typeof data === 'object') {
                if (Array.isArray(data.skills)) appState.skills = data.skills
                if (data.categories !== null && typeof data.categories === 'object') {
                    appState.categories = Object.assign({ mine: 0, shared: 0, project: 0, system: 0 }, data.categories)
                }
                if (Array.isArray(data.sources)) appState.sources = data.sources
                if (Array.isArray(data.sourceOrder)) appState.sourceOrder = data.sourceOrder
                if (data.diagnostics !== null && typeof data.diagnostics === 'object') appState.diagnostics = data.diagnostics
                else if (Array.isArray(data.issues)) appState.diagnostics = { issues: data.issues, checkedAt: Date.now() }
                if (data.updates !== null && typeof data.updates === 'object') appState.updates = data.updates
                if (typeof data.cwd === 'string' && data.cwd !== '') appState.cwd = data.cwd
            }
            appState.lastErrorToast = null
            return data
        } catch (error) {
            reportError('installed', error, t('error.read'))
            return null
        } finally {
            setLoading('installed', false)
            rerender()
        }
    }

    async function loadSources(force) {
        if (isLoading('sources') === true && force !== true) return null
        setLoading('sources', true)
        clearErrorScope('sources')
        rerender()
        try {
            const data = await api('sources')
            if (Array.isArray(data)) {
                appState.sources = data
            } else if (data !== null && typeof data === 'object') {
                if (Array.isArray(data.sources)) appState.sources = data.sources
                if (Array.isArray(data.sourceOrder)) appState.sourceOrder = data.sourceOrder
                else if (Array.isArray(data.order)) appState.sourceOrder = data.order
            }
            appState.lastErrorToast = null
            return data
        } catch (error) {
            reportError('sources', error, t('error.read'))
            return null
        } finally {
            setLoading('sources', false)
            rerender()
        }
    }

    /* One monotonically increasing id ensures only the newest market response
       may touch the shared state. */
    let marketRequestSeq = 0
    let marketLatestRequestId = 0

    /** Append a refreshed page of one source block onto the existing block. */
    function mergeMarketSource(previous, next, appendSourceId) {
        if (appendSourceId === undefined || appendSourceId === null || appendSourceId === '') return next
        const old = (Array.isArray(previous) ? previous : []).find(function (block) {
            return block !== null && typeof block === 'object' && block.sourceId === appendSourceId
        })
        if (old === undefined || !Array.isArray(old.skills)) return next
        return next.map(function (block) {
            if (block === null || typeof block !== 'object' || block.sourceId !== appendSourceId) return block
            const merged = old.skills.slice()
            const seen = Object.create(null)
            merged.forEach(function (skill) { if (skill !== null && typeof skill === 'object') seen[String(skill.name)] = true })
            ;(Array.isArray(block.skills) ? block.skills : []).forEach(function (skill) {
                if (skill === null || typeof skill !== 'object') return
                const key = String(skill.name)
                if (seen[key] === true) return
                seen[key] = true
                merged.push(skill)
            })
            return Object.assign({}, block, { skills: merged })
        })
    }

    /**
     * GET /market?q=&sort=&cursor=&limit=
     * opts: { q?, sort?, cursor?, limit?, sourceId?, append? }
     * `sourceId` + `append` only affects how the per-source cursor page is merged.
     */
    async function loadMarket(opts) {
        const input = opts !== null && typeof opts === 'object' ? opts : {}
        const text = typeof input.q === 'string' ? input.q : appState.search
        const sort = typeof input.sort === 'string' ? input.sort : appState.marketSort
        const params = new URLSearchParams()
        if (text !== '') params.set('q', text)
        if (sort !== '' && sort !== 'recommend') params.set('sort', sort)
        if (input.cursor !== undefined && input.cursor !== null && input.cursor !== '') params.set('cursor', String(input.cursor))
        if (typeof input.limit === 'number' && input.limit > 0) params.set('limit', String(input.limit))
        const appendSourceId = input.append === true ? String(input.sourceId === undefined || input.sourceId === null ? '' : input.sourceId) : ''
        const previous = Array.isArray(appState.marketSources) ? appState.marketSources.slice() : []

        marketRequestSeq += 1
        const requestId = marketRequestSeq
        marketLatestRequestId = requestId
        clearErrorScope('market')
        setLoading('market', true)
        rerender()
        try {
            const data = await api('market?' + params.toString())
            if (requestId !== marketLatestRequestId) return null
            if (data !== null && typeof data === 'object' && Array.isArray(data.sources)) {
                appState.marketSources = mergeMarketSource(previous, data.sources, appendSourceId)
            }
            appState.lastErrorToast = null
            return data
        } catch (error) {
            if (requestId !== marketLatestRequestId) return null
            reportError('market', error, t('error.read'))
            return null
        } finally {
            if (requestId === marketLatestRequestId) {
                setLoading('market', false)
                rerender()
            }
        }
    }

    async function loadUpdates(force) {
        if (isLoading('updates') === true && force !== true) return null
        setLoading('updates', true)
        rerender()
        try {
            const data = await api('updates')
            if (data !== null && typeof data === 'object') appState.updates = data
            rerender()
            return data
        } catch (error) {
            reportError('updates', error, t('error.unexpected'), { silent: true })
            return null
        } finally {
            setLoading('updates', false)
            rerender()
        }
    }

    /**
     * POST /check-updates { force: true }
     * Refetches every enabled source index, recomputes updates and refreshes
     * the installed scan. The spinner is kept for at least 400ms.
     */
    async function checkUpdates() {
        if (appState.checking === true) return null
        appState.checking = true
        clearErrorScope('check')
        rerender()
        const started = Date.now()
        try {
            const data = await api('check-updates', { method: 'POST', body: { force: true } })
            const remain = 400 - (Date.now() - started)
            if (remain > 0) await delay(remain)
            const sources = data !== null && typeof data === 'object' && Number.isFinite(Number(data.sources)) ? Number(data.sources) : 0
            const updates = data !== null && typeof data === 'object' && Number.isFinite(Number(data.updates)) ? Number(data.updates) : 0
            toast(updates > 0 ? t('toast.checkedSources', { sources: sources, updates: updates }) : t('toast.noUpdates', { sources: sources }))
            appState.lastErrorToast = null
            await Promise.all([loadInstalled(true), loadSources(true)])
            return data
        } catch (error) {
            /* Failures are surfaced by the inline check banner, not a toast. */
            reportError('check', error, t('error.unexpected'), { silent: true })
            return null
        } finally {
            appState.checking = false
            rerender()
        }
    }

    /* ------------------------------------------------------------------ *
     * List scroll memory. The single restoreListScroll field doubles as   *
     * the pending restore target (contract 3.5).                          *
     * ------------------------------------------------------------------ */

    function listScrollNode() {
        if (typeof document === 'undefined' || document === null || typeof document.querySelector !== 'function') return null
        const node = document.querySelector('.sm-root .sm-tab-view.sm-scroll')
        return node !== null && node !== undefined && typeof node.scrollTop === 'number' ? node : null
    }

    function rememberListScroll() {
        const node = listScrollNode()
        if (node !== null) appState.restoreListScroll = node.scrollTop
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

    /* ------------------------------------------------------------------ *
     * Shared source drag-and-drop namespace (contract 2 and 7.6).         *
     *                                                                     *
     * 30-source-dialog.js calls:                                         *
     *   smDragSource.start(id, event)                                     *
     *   smDragSource.over(id, event)   -> { id, after } | null            *
     *   smDragSource.drop()            -> { from, to, after } | null      *
     *   smDragSource.end()                                                *
     * The current drop target is exposed as smDragSource.over.target      *
     * (also mirrored as smDragSource.overId / smDragSource.overAfter).    *
     * ------------------------------------------------------------------ */

    function smDragOver(targetId, event) {
        const dragging = smDragSource.dragging
        const target = String(targetId === undefined || targetId === null ? '' : targetId)
        if (dragging === null || target === '' || target === dragging) {
            smDragSource.over.target = null
            smDragSource.overId = null
            smDragSource.overAfter = null
            return null
        }
        let after = false
        const node = event !== null && event !== undefined ? event.currentTarget : null
        if (node !== null && node !== undefined && typeof node.getBoundingClientRect === 'function') {
            const rect = node.getBoundingClientRect()
            after = (Number(event.clientY) || 0) > rect.top + rect.height / 2
        }
        const result = { id: target, after: after }
        smDragSource.over.target = result
        smDragSource.overId = target
        smDragSource.overAfter = after
        if (event !== null && event !== undefined) {
            if (typeof event.preventDefault === 'function') event.preventDefault()
            if (event.dataTransfer !== null && event.dataTransfer !== undefined) {
                try { event.dataTransfer.dropEffect = 'move' } catch { /* ignore */ }
            }
        }
        return result
    }

    const smDragSource = {
        key: DRAG_KEY,
        dragging: null,
        over: smDragOver,
        overId: null,
        overAfter: null,
        start: function (id, event) {
            const key = String(id === undefined || id === null ? '' : id)
            if (key === '') return false
            smDragSource.dragging = key
            smDragSource.over.target = null
            smDragSource.overId = null
            smDragSource.overAfter = null
            if (event !== null && event !== undefined && event.dataTransfer !== null && event.dataTransfer !== undefined) {
                try {
                    event.dataTransfer.effectAllowed = 'move'
                    event.dataTransfer.setData(DRAG_KEY, key)
                    event.dataTransfer.setData('text/plain', key)
                } catch {
                    /* some environments reject custom types; dragging still works */
                }
            }
            return true
        },
        drop: function () {
            const from = smDragSource.dragging
            const target = smDragSource.over.target
            smDragSource.dragging = null
            smDragSource.over.target = null
            smDragSource.overId = null
            smDragSource.overAfter = null
            if (from === null || target === null) return null
            return { from: from, to: target.id, after: target.after === true }
        },
        end: function () {
            smDragSource.dragging = null
            smDragSource.over.target = null
            smDragSource.overId = null
            smDragSource.overAfter = null
        },
    }

    /* ------------------------------------------------------------------ *
     * Page shell.                                                         *
     * ------------------------------------------------------------------ */

    function switchTab(tab) {
        if (tab !== 'skills' && tab !== 'market') return
        if (appState.tab === tab && appState.view === 'list') return
        setState({ tab: tab, view: 'list', detail: null, menu: null })
        if (tab === 'market' && appState.marketSources.length === 0 && isLoading('market') !== true) void loadMarket()
    }

    function renderStatusIcons() {
        const broken = brokenSkillCount()
        const updates = updateSkillCount()
        if (broken === 0 && updates === 0) return null
        const checking = appState.checking === true || (appState.updates !== null && typeof appState.updates === 'object' && appState.updates.checking === true)
        const items = []
        if (broken > 0) {
            const label = t('status.brokenTooltip', { count: broken })
            items.push(h('button', {
                key: 'broken',
                type: 'button',
                className: 'sm-icon-btn sm-status-icon sm-status-icon-warn',
                'aria-label': label,
                'data-tip': label,
                onClick: function () {
                    if (typeof openDiagnosticsDrawer === 'function') openDiagnosticsDrawer()
                },
            }, icon('alert', 16)))
        }
        if (updates > 0) {
            const label = checking
                ? t('status.checking')
                : t('status.updatesTooltip', { count: updates, time: lastCheckedLabel() })
            items.push(h('button', {
                key: 'updates',
                type: 'button',
                className: 'sm-icon-btn sm-status-icon sm-status-icon-update',
                'aria-label': label,
                'data-tip': label,
                disabled: checking,
                'aria-busy': checking ? 'true' : undefined,
                onClick: function () {
                    if (typeof openModal === 'function') openModal('update', { all: true })
                },
            }, icon('arrow-up-dot', 16)))
        }
        return h('div', { className: 'sm-status-icons' }, items)
    }

    /* Primary tabs, in display order. Roving tabindex: only the selected tab
     * is reachable with Tab; the arrow keys move between them. */
    const PRIMARY_TABS = ['skills', 'market']

    function focusPrimaryTab(id) {
        if (typeof document === 'undefined' || document === null || typeof document.querySelector !== 'function') return
        const node = document.querySelector('.sm-tabs [data-tab="' + id + '"]')
        if (node !== null && node !== undefined && typeof node.focus === 'function') node.focus()
    }

    function primaryTabKeyDown(event) {
        const keys = PRIMARY_TABS
        const index = keys.indexOf(appState.tab)
        let next = null
        if (event.key === 'ArrowRight') next = keys[(index + 1) % keys.length]
        else if (event.key === 'ArrowLeft') next = keys[(index - 1 + keys.length) % keys.length]
        else if (event.key === 'Home') next = keys[0]
        else if (event.key === 'End') next = keys[keys.length - 1]
        else return
        event.preventDefault()
        switchTab(next)
        const focus = function () { focusPrimaryTab(next) }
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(focus)
        else focus()
    }

    function renderPrimaryTabs() {
        const items = [
            { id: 'skills', label: t('tab.skills') },
            { id: 'market', label: t('tab.market') },
        ]
        return h('div', { className: 'sm-tabs', role: 'tablist', onKeyDown: primaryTabKeyDown },
            items.map(function (item) {
                const active = appState.tab === item.id
                return h('button', {
                    key: item.id,
                    type: 'button',
                    role: 'tab',
                    className: cx('sm-tab', active && 'sm-tab-active'),
                    'aria-selected': active,
                    tabIndex: active ? 0 : -1,
                    'data-tab': item.id,
                    onClick: function () { switchTab(item.id) },
                }, h('span', null, item.label))
            }))
    }

    /* Skills-page toolbar (contract 7.4): search · sort · new / import / check. */
    function renderSkillsToolbar() {
        const search = String(appState.search === undefined || appState.search === null ? '' : appState.search)
        /* v1 persisted `recent`; contract §3.1 renames it to `modified`.
         * Normalize on read so the dropdown shows the value the sorter uses. */
        const rawSort = String(appState.sort === undefined || appState.sort === null ? '' : appState.sort)
        const sort = rawSort === 'recent' ? 'modified' : rawSort
        const checking = appState.checking === true
        return h('div', { className: 'sm-toolbar sm-skills-toolbar' },
            h('div', { className: 'sm-search' },
                icon('search', 15),
                h('input', {
                    className: 'sm-search-input',
                    type: 'search',
                    value: search,
                    placeholder: t('search.skills.placeholder'),
                    'aria-label': t('search.skills.placeholder'),
                    spellCheck: false,
                    onChange: function (event) {
                        const value = event !== null && event !== undefined && event.target !== null && event.target !== undefined
                            ? String(event.target.value || '')
                            : ''
                        setState({ search: value })
                    },
                }),
                search !== ''
                    ? h('button', {
                        type: 'button',
                        className: 'sm-search-clear',
                        'aria-label': t('search.clear'),
                        'data-tip': t('search.clear'),
                        onClick: function () { setState({ search: '' }) },
                    }, icon('x', 14))
                    : null),
            h('select', {
                className: 'sm-select',
                value: SKILL_SORTS.indexOf(sort) !== -1 ? sort : 'name',
                'aria-label': t('sort.label'),
                onChange: function (event) {
                    const value = event !== null && event !== undefined && event.target !== null && event.target !== undefined
                        ? String(event.target.value || 'name')
                        : 'name'
                    setState({ sort: value })
                },
            },
            SKILL_SORTS.map(function (key) {
                return h('option', { key: key, value: key }, t(SKILL_SORT_LABEL_KEYS[key] || 'sort.name'))
            })),
            h('div', { className: 'sm-toolbar-actions' },
                h(SmButton, {
                    tone: 'secondary',
                    icon: 'refresh',
                    className: 'sm-toolbar-btn',
                    disabled: checking,
                    onClick: function () {
                        if (typeof checkUpdates === 'function') void checkUpdates()
                    },
                }, t('action.checkUpdates')),
                h(SmButton, {
                    tone: 'secondary',
                    icon: 'import',
                    className: 'sm-toolbar-btn',
                    onClick: function () {
                        if (typeof openModal === 'function') openModal('import-skill', {})
                    },
                }, t('action.import')),
                h(SmButton, {
                    tone: 'primary',
                    icon: 'plus',
                    className: 'sm-toolbar-btn',
                    onClick: function () {
                        if (typeof openModal === 'function') openModal('new-skill', {})
                    },
                }, t('action.newSkill'))))
    }

    function renderPageHeader() {
        return h('div', { className: 'sm-header sm-page-head' },
            h('div', { className: 'sm-page-head-text' },
                h('h1', { className: 'sm-title sm-page-title' }, t('panel.title')),
                h('p', { className: 'sm-desc sm-page-desc' }, t('panel.desc'))),
            appState.tab === 'skills' ? renderSkillsToolbar() : null)
    }

    function renderActiveTab() {
        if (appState.tab === 'market') return typeof renderMarketTab === 'function' ? renderMarketTab() : null
        return typeof renderSkillsTab === 'function' ? renderSkillsTab() : null
    }

    function renderCategoryTabsSlot() {
        if (appState.tab !== 'skills') return null
        return typeof renderCategoryTabs === 'function' ? renderCategoryTabs() : null
    }

    function renderOverlays() {
        return h(Fragment, null,
            typeof renderModalLayer === 'function' ? renderModalLayer() : null,
            typeof renderSourceDialog === 'function' ? renderSourceDialog() : null,
            typeof renderDiagnosticsDrawer === 'function' ? renderDiagnosticsDrawer() : null,
            typeof renderTooltipLayer === 'function' ? renderTooltipLayer() : null,
            typeof renderToastHost === 'function' ? renderToastHost() : null)
    }

    /* ------------------------------------------------------------------ *
     * [data-tip] hover delegation. 50-modals.js owns smTip/smHideTooltip. *
     * ------------------------------------------------------------------ */

    let tipNode = null
    /* Last rendered shell signature (view + tab); used to hide the tooltip
     * when list <-> detail switches even if a caller bypassed setState. */
    let smRenderedShell = null

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

    /* 统一入口：任何点击（行、Tab、工具栏、状态图标、菜单项）都先收起
     * 提示语，不用逐个 onClick 补。 */
    function handlePageTipDown() {
        tipNode = null
        if (typeof smHideTooltip === 'function') smHideTooltip()
    }

    /** 主动清理：hover 目标已从文档卸载时收起提示语。 */
    function smHideTipIfTargetGone() {
        if (typeof smHideTooltipIfTargetGone === 'function') smHideTooltipIfTargetGone()
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
            onMouseDown: handlePageTipDown,
        }
        /* list <-> detail / skills <-> market 切换时主动收起提示语。 */
        const shell = (appState.view === 'detail' ? 'detail' : 'list') + ':' + String(appState.tab)
        if (smRenderedShell !== null && smRenderedShell !== shell) {
            tipNode = null
            if (typeof smHideTooltip === 'function') smHideTooltip()
        }
        smRenderedShell = shell
        smHideTipIfTargetGone()
        if (appState.view === 'detail' && typeof renderDetailPage === 'function') {
            return h('div', Object.assign({ className: 'sm-root sm-root-detail', style: rootStyle }, rootListeners),
                h('div', { className: 'sm-page sm-page-detail' }, renderDetailPage()),
                renderOverlays())
        }
        restoreListScroll()
        return h('div', Object.assign({ className: 'sm-root', style: rootStyle }, rootListeners),
            h('div', { className: 'sm-page' },
                renderPageHeader(),
                h('div', { className: 'sm-tabs-row' },
                    renderPrimaryTabs(),
                    renderStatusIcons()),
                renderCategoryTabsSlot(),
                h('div', { className: 'sm-tab-view sm-scroll' }, renderActiveTab())),
            renderOverlays())
    }
