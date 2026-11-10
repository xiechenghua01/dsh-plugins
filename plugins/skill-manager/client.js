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
// ===== 10-skills.js =====
    /* ================================================================== *
     * 10-skills.js                                                        *
     * Skills tab: category tabs, source groups, two-column card grid,     *
     * card row menu, empty / loading / error states (contract v2 §3.3,    *
     * §5.2, §7.2, §7.3; interaction spec SL-01 ~ SL-06).                  *
     * ================================================================== */

    /* Fixed category order (interaction spec §3.2). Labels and empty-state
     * copy live in the locale dictionary; nothing here is user-visible. */
    const SKILL_CATEGORY_ORDER = ['mine', 'shared', 'project', 'system']

    const SKILL_CATEGORY_LABEL = {
        mine: 'tab.category.mine',
        shared: 'tab.category.shared',
        project: 'tab.category.project',
        system: 'tab.category.system',
    }

    const SKILL_CATEGORY_EMPTY = {
        mine: 'empty.tab.mine',
        shared: 'empty.tab.shared',
        project: 'empty.tab.project',
        system: 'empty.tab.builtin',
    }

    const SKILL_CATEGORY_ICON = {
        mine: 'user',
        shared: 'users',
        project: 'folder',
        system: 'package',
    }

    /* A skill mutation (enable / disable) is in flight; disables the row menu
     * action and keeps the undo toast from firing twice. */
    let skillsBusyId = null

    /* ------------------------------------------------------------------ *
     * Small data helpers.                                                 *
     * ------------------------------------------------------------------ */

    function skillsIsSkill(skill) {
        return skill !== null && typeof skill === 'object'
    }

    function skillsQuery() {
        return String(appState.search === undefined || appState.search === null ? '' : appState.search).trim().toLowerCase()
    }

    function skillsMatchesQuery(skill, query) {
        if (query === '') return true
        if (!skillsIsSkill(skill)) return false
        const fields = [skill.name, skill.description, skill.whenToUse]
        return fields.some(function (field) {
            return typeof field === 'string' && field.toLowerCase().indexOf(query) !== -1
        })
    }

    /** All skills, defensively copied. */
    function skillsList() {
        return Array.isArray(appState.skills) ? appState.skills.filter(skillsIsSkill) : []
    }

    /** Skills whose name / description / whenToUse match the current search. */
    function skillsMatched() {
        const query = skillsQuery()
        return skillsList().filter(function (skill) { return skillsMatchesQuery(skill, query) })
    }

    /** Host-provided category count, with a local fallback. */
    function skillsCategoryTotal(category) {
        const counts = appState.categories
        if (counts !== null && typeof counts === 'object' && typeof counts[category] === 'number') {
            return counts[category]
        }
        return skillsList().filter(function (skill) { return skill.category === category }).length
    }

    /**
     * Categories that currently exist. "project" is hidden when there is no
     * project context (no cwd) and no project skills; the contract does not
     * expose a dedicated flag, so cwd + count is the signal.
     */
    function skillsAvailableCategories() {
        const hasCwd = String(appState.cwd === undefined || appState.cwd === null ? '' : appState.cwd) !== ''
        return SKILL_CATEGORY_ORDER.filter(function (key) {
            if (key !== 'project') return true
            return hasCwd || skillsCategoryTotal('project') > 0
        })
    }

    /**
     * The category actually shown. Search is cross-category: when the current
     * category has no hit but another one does, jump to the first matching
     * category (tab order) without overwriting the remembered selection.
     */
    function skillsEffectiveCategory() {
        const available = skillsAvailableCategories()
        const fallback = available.indexOf(appState.category) !== -1 ? appState.category : 'mine'
        const query = skillsQuery()
        if (query === '') return fallback
        const matched = skillsMatched()
        for (let index = 0; index < available.length; index += 1) {
            const key = available[index]
            const hit = matched.some(function (skill) { return skill.category === key })
            if (hit) return key
        }
        return fallback
    }

    /**
     * Contract §3.1: the skills-page sort value is `modified`; `recent` is the
     * v1 name and is still mapped when an old value is read back.
     */
    function skillsSortKey() {
        return appState.sort === 'recent' ? 'modified' : appState.sort
    }

    function skillsSort(items) {
        const copy = items.slice()
        const sort = skillsSortKey()
        if (sort === 'modified') {
            copy.sort(function (left, right) {
                return (Number(right.mtime) || 0) - (Number(left.mtime) || 0)
            })
        } else if (sort === 'source') {
            const order = skillsSourceOrder()
            const rank = function (skill) {
                const id = typeof skill.sourceId === 'string' ? skill.sourceId : ''
                const index = order.indexOf(id)
                return index === -1 ? order.length : index
            }
            copy.sort(function (left, right) {
                return rank(left) - rank(right)
                    || String(left.name || '').localeCompare(String(right.name || ''))
            })
        } else {
            copy.sort(function (left, right) {
                return String(left.name || '').localeCompare(String(right.name || ''))
            })
        }
        return copy
    }

    /** Skills of one category, filtered by search and sorted. */
    function skillsInCategory(category, query) {
        const text = typeof query === 'string' ? query : skillsQuery()
        return skillsSort(skillsList().filter(function (skill) {
            return skill.category === category && skillsMatchesQuery(skill, text)
        }))
    }

    function skillsSourceOrder() {
        const ids = []
        const seen = Object.create(null)
        const push = function (id) {
            if (typeof id !== 'string' || id === '' || seen[id] === true) return
            seen[id] = true
            ids.push(id)
        }
        if (Array.isArray(appState.sourceOrder) && appState.sourceOrder.length > 0) {
            appState.sourceOrder.forEach(push)
        } else if (Array.isArray(appState.sources)) {
            appState.sources.forEach(function (source) {
                if (source !== null && typeof source === 'object') push(source.id)
            })
        }
        return ids
    }

    function skillsFindSource(sourceId) {
        if (!Array.isArray(appState.sources) || typeof sourceId !== 'string' || sourceId === '') return null
        const found = appState.sources.find(function (source) {
            return source !== null && typeof source === 'object' && source.id === sourceId
        })
        return found === undefined ? null : found
    }

    function skillsFindById(id) {
        return skillsList().find(function (skill) { return skill.id === id }) || null
    }

    /* ------------------------------------------------------------------ *
     * Grouping (contract §3.3).                                           *
     *                                                                     *
     * Each market source gets one group in `sourceOrder`; skills without  *
     * a sourceId, or whose source no longer exists, fall into `local`,    *
     * which is always last. Empty groups are omitted and system skills    *
     * are never grouped. Mirrors lib/scan.mjs#groupSkillsBySource.        *
     * ------------------------------------------------------------------ */

    function groupSkills(skills, sourceOrder) {
        const list = Array.isArray(skills) ? skills : []
        const order = []
        const seen = Object.create(null)
        const rawOrder = Array.isArray(sourceOrder) && sourceOrder.length > 0 ? sourceOrder : skillsSourceOrder()
        rawOrder.forEach(function (id) {
            if (typeof id !== 'string' || id === '' || seen[id] === true) return
            seen[id] = true
            order.push(id)
        })

        const buckets = Object.create(null)
        order.forEach(function (id) { buckets[id] = [] })
        const local = []
        list.forEach(function (skill) {
            if (!skillsIsSkill(skill) || skill.category === 'system') return
            const sourceId = typeof skill.sourceId === 'string' && skill.sourceId !== '' ? skill.sourceId : null
            if (sourceId === null || buckets[sourceId] === undefined) local.push(skill)
            else buckets[sourceId].push(skill)
        })

        const groups = []
        order.forEach(function (id) {
            const items = buckets[id]
            if (items.length === 0) return
            const named = items.find(function (skill) {
                return typeof skill.sourceName === 'string' && skill.sourceName !== ''
            })
            const source = skillsFindSource(id)
            groups.push({
                key: 'source:' + id,
                kind: 'source',
                sourceId: id,
                label: named !== undefined
                    ? named.sourceName
                    : source !== null && typeof source.name === 'string' && source.name !== ''
                        ? source.name
                        : id,
                count: items.length,
                skills: items,
            })
        })
        if (local.length > 0) {
            groups.push({
                key: 'local',
                kind: 'local',
                sourceId: null,
                label: t('group.local'),
                count: local.length,
                skills: local,
            })
        }
        return groups
    }

    /* ------------------------------------------------------------------ *
     * Navigation and row actions.                                         *
     * ------------------------------------------------------------------ */

    function skillsScrollTop() {
        if (typeof document === 'undefined' || document === null || typeof document.querySelector !== 'function') return
        const node = document.querySelector('.sm-root .sm-tab-view.sm-scroll')
        if (node !== null && node !== undefined && typeof node.scrollTop === 'number') node.scrollTop = 0
    }

    function skillsSelectCategory(key) {
        if (SKILL_CATEGORY_ORDER.indexOf(key) === -1) return
        if (appState.category === key) return
        setState({ category: key })
        skillsScrollTop()
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(skillsScrollTop)
    }

    function skillsFocusCategory(key) {
        if (typeof document === 'undefined' || document === null || typeof document.querySelector !== 'function') return
        const node = document.querySelector('.sm-subtabs [data-category="' + key + '"]')
        if (node !== null && node !== undefined && typeof node.focus === 'function') node.focus()
    }

    function skillsOnCategoryKeyDown(event) {
        const keys = skillsAvailableCategories()
        const current = skillsEffectiveCategory()
        const index = keys.indexOf(current)
        let next = null
        if (event.key === 'ArrowRight') next = keys[(index + 1) % keys.length]
        else if (event.key === 'ArrowLeft') next = keys[(index - 1 + keys.length) % keys.length]
        else if (event.key === 'Home') next = keys[0]
        else if (event.key === 'End') next = keys[keys.length - 1]
        else return
        event.preventDefault()
        skillsSelectCategory(next)
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(function () { skillsFocusCategory(next) })
    }

    function skillsOpenDetail(skill) {
        if (!skillsIsSkill(skill)) return
        rememberListScroll()
        setState({ view: 'detail', detail: { kind: 'installed', id: skill.id }, menu: null })
    }

    function skillsGoMarket() {
        if (typeof switchTab === 'function') {
            switchTab('market')
            return
        }
        setState({ tab: 'market', view: 'list', detail: null, menu: null })
    }

    function skillsOpenMenu(event, skill) {
        if (event !== null && event !== undefined) {
            if (typeof event.stopPropagation === 'function') event.stopPropagation()
            if (typeof event.preventDefault === 'function') event.preventDefault()
        }
        if (!skillsIsSkill(skill)) return
        let rect = null
        if (event !== null && event !== undefined && event.currentTarget !== null && event.currentTarget !== undefined
            && typeof event.currentTarget.getBoundingClientRect === 'function') {
            rect = event.currentTarget.getBoundingClientRect()
        }
        const width = 200
        const height = 186
        const viewportWidth = typeof window !== 'undefined' && window !== null && typeof window.innerWidth === 'number' ? window.innerWidth : 1024
        const viewportHeight = typeof window !== 'undefined' && window !== null && typeof window.innerHeight === 'number' ? window.innerHeight : 768
        const anchorX = rect !== null ? rect.right - width : viewportWidth - width - 24
        let y = rect !== null ? rect.bottom + 4 : 120
        if (y + height > viewportHeight - 8) y = rect !== null ? rect.top - height - 4 : y
        setState({
            menu: {
                type: 'skill',
                id: skill.id,
                x: Math.max(8, Math.min(viewportWidth - width - 8, anchorX)),
                y: Math.max(8, Math.min(viewportHeight - height - 8, y)),
            },
        })
    }

    function skillsCloseMenu() {
        if (appState.menu !== null && typeof appState.menu === 'object' && appState.menu.type === 'skill') {
            setState({ menu: null })
        }
    }

    function skillsFocusMore(id) {
        if (typeof document === 'undefined' || document === null || typeof document.querySelectorAll !== 'function') return
        const cards = document.querySelectorAll('.sm-card-item[data-skill-id]')
        for (let index = 0; index < cards.length; index += 1) {
            const card = cards[index]
            if (card.getAttribute('data-skill-id') !== id) continue
            const button = typeof card.querySelector === 'function' ? card.querySelector('.sm-card-more') : null
            if (button !== null && button !== undefined && typeof button.focus === 'function') button.focus()
            return
        }
    }

    function skillsMenuKeyDown(event) {
        if (event.key === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
            const id = appState.menu !== null && typeof appState.menu === 'object' ? appState.menu.id : ''
            skillsCloseMenu()
            if (typeof id === 'string' && id !== '') skillsFocusMore(id)
            return
        }
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
        const root = event.currentTarget
        if (root === null || root === undefined || typeof root.querySelectorAll !== 'function') return
        event.preventDefault()
        const items = Array.prototype.slice.call(root.querySelectorAll('[role="menuitem"]:not(:disabled)'))
        if (items.length === 0) return
        const active = typeof document !== 'undefined' && document !== null ? document.activeElement : null
        const index = items.indexOf(active)
        let next = 0
        if (event.key === 'ArrowDown') next = index < 0 ? 0 : (index + 1) % items.length
        else next = index < 0 ? items.length - 1 : (index - 1 + items.length) % items.length
        if (typeof items[next].focus === 'function') items[next].focus()
    }

    function skillsMenuItem(key, label, iconName, options) {
        const opts = options !== null && typeof options === 'object' ? options : {}
        return h('button', {
            key: key,
            type: 'button',
            role: 'menuitem',
            className: cx('sm-menu-item', opts.danger === true && 'sm-menu-item-danger'),
            disabled: opts.disabled === true,
            'data-tip': opts.disabled === true ? opts.tip : undefined,
            autoFocus: opts.autoFocus === true,
            onClick: opts.onClick,
        },
        h('span', { className: 'sm-menu-icon' }, icon(iconName, 15)),
        h('span', null, label))
    }

    /** Row menu: details / copy location / disable or restore / uninstall or delete. */
    function renderSkillMenu() {
        const menu = appState.menu
        if (menu === null || typeof menu !== 'object' || menu.type !== 'skill') return null
        const skill = skillsFindById(menu.id)
        if (skill === null) return null
        const disabled = skill.status === 'disabled'
        const readonly = skill.writable === false
        const isMarket = typeof skill.sourceId === 'string' && skill.sourceId !== ''
        const hasPath = typeof skill.path === 'string' && skill.path !== ''
        const run = function (action) {
            return function (event) {
                if (event !== null && event !== undefined) {
                    if (typeof event.stopPropagation === 'function') event.stopPropagation()
                    if (typeof event.preventDefault === 'function') event.preventDefault()
                }
                skillsCloseMenu()
                if (typeof action === 'function') action()
            }
        }
        const destructiveLabel = isMarket ? t('action.uninstall') : t('action.delete')
        const itemStyle = { left: menu.x + 'px', top: menu.y + 'px', width: '200px' }
        return [
            h('div', {
                key: 'backdrop',
                className: 'sm-menu-backdrop',
                onClick: skillsCloseMenu,
                onContextMenu: function (event) {
                    event.preventDefault()
                    skillsCloseMenu()
                },
            }),
            h('div', {
                key: 'menu',
                className: 'sm-menu',
                role: 'menu',
                style: itemStyle,
                onClick: function (event) { event.stopPropagation() },
                onKeyDown: skillsMenuKeyDown,
            },
            skillsMenuItem('view', t('action.viewDetail'), 'file', {
                autoFocus: true,
                onClick: run(function () { skillsOpenDetail(skill) }),
            }),
            skillsMenuItem('copy', t('action.copyPath'), 'copy', {
                disabled: !hasPath,
                tip: readonly ? t('detail.location.builtin') : t('error.notFound'),
                onClick: run(function () { copyPath(skill.path) }),
            }),
            skillsMenuItem('toggle', disabled ? t('action.enable') : t('action.disable'), 'power', {
                disabled: readonly,
                tip: t('error.readonly'),
                onClick: run(function () { void skillsToggleEnabled(skill, disabled) }),
            }),
            h('div', { key: 'sep', className: 'sm-menu-sep' }),
            skillsMenuItem('destructive', destructiveLabel, 'trash', {
                danger: true,
                disabled: readonly,
                tip: t('error.readonly'),
                onClick: run(function () {
                    if (typeof openModal === 'function') {
                        openModal(isMarket ? 'uninstall' : 'delete', { skill: skill, id: skill.id, name: skill.name })
                    }
                }),
            })),
        ]
    }

    async function skillsToggleEnabled(skill, enabled, options) {
        const opts = options !== null && typeof options === 'object' ? options : {}
        if (!skillsIsSkill(skill)) return
        if (skill.writable === false) {
            toast(t('error.readonly'), { tone: 'error' })
            return
        }
        if (skillsBusyId === skill.id) return
        skillsBusyId = skill.id
        rerender()
        try {
            const data = await api('skill/state', {
                method: 'POST',
                body: { path: skill.path, enabled: enabled === true },
            })
            const updated = data !== null && typeof data === 'object' && data.skill !== null && typeof data.skill === 'object'
                ? data.skill
                : Object.assign({}, skill, { status: enabled === true ? 'active' : 'disabled' })
            const list = Array.isArray(appState.skills) ? appState.skills : []
            const index = list.findIndex(function (item) { return skillsIsSkill(item) && item.id === skill.id })
            if (index >= 0) {
                const next = list.slice()
                next[index] = updated
                appState.skills = next
            }
            if (opts.silent !== true) {
                toast(enabled === true ? t('toast.enabled', { name: skill.name }) : t('toast.disabled', { name: skill.name }), {
                    tone: 'ok',
                    actionLabel: t('action.undo'),
                    onAction: function () {
                        void skillsToggleEnabled(updated, enabled !== true, { silent: true })
                    },
                })
            }
            await loadInstalled(true)
        } catch (error) {
            toast(error !== null && typeof error === 'object' && error.message ? error.message : t('error.generic'), { tone: 'error' })
        } finally {
            skillsBusyId = null
            rerender()
        }
    }

    /* ------------------------------------------------------------------ *
     * Category tabs (contract §7.2, interaction spec §4.1).               *
     * ------------------------------------------------------------------ */

    function renderCategoryTabs() {
        const categories = skillsAvailableCategories()
        const selected = skillsEffectiveCategory()
        const loading = isLoading('installed') === true && skillsList().length === 0
        return h('div', { className: 'sm-subtabs-row' },
            h('div', {
                className: 'sm-subtabs',
                role: 'tablist',
                'aria-label': t('tab.skills.label'),
                onKeyDown: skillsOnCategoryKeyDown,
            },
            categories.map(function (key) {
                const active = key === selected
                const count = skillsCategoryTotal(key)
                return h('button', {
                    key: key,
                    type: 'button',
                    role: 'tab',
                    className: 'sm-subtab',
                    'aria-selected': active,
                    tabIndex: active ? 0 : -1,
                    'data-category': key,
                    disabled: loading,
                    onClick: function () { skillsSelectCategory(key) },
                },
                h('span', null, t(SKILL_CATEGORY_LABEL[key])),
                h('span', { className: 'sm-count-badge sm-subtab-count', 'aria-label': t('group.count', { count: count }) }, String(count)))
            })))
    }

    /* ------------------------------------------------------------------ *
     * Group rendering (contract §3.3 / §7.3, interaction spec §4.10).      *
     * ------------------------------------------------------------------ */

    function skillsGroupTitleId(group) {
        return 'sm-group-' + String(group.key).replace(/[^A-Za-z0-9_-]/g, '-')
    }

    function renderSkillGroup(group) {
        const source = group.sourceId !== null ? skillsFindSource(group.sourceId) : null
        const sourceDisabled = group.kind === 'source' && source !== null && typeof source === 'object' && source.enabled === false
        const titleId = skillsGroupTitleId(group)
        return h('section', {
            key: group.key,
            className: 'sm-group',
            role: 'group',
            'aria-labelledby': titleId,
        },
        h('div', { className: 'sm-group-head' },
            h('div', { className: 'sm-group-head-left' },
                h('span', { className: 'sm-group-title', id: titleId }, group.label),
                sourceDisabled ? h('span', { className: 'sm-badge sm-badge-idle' }, t('source.disabled')) : null,
                h('span', { className: 'sm-group-count' }, t('group.count', { count: group.count })))),
        h('div', { className: 'sm-card-grid' }, group.skills.map(renderSkillCard)))
    }

    function renderSkillGroups() {
        const category = skillsEffectiveCategory()
        const items = skillsInCategory(category)
        /* System built-ins all come from the Harness: flat grid, no source groups. */
        if (category === 'system') {
            return h('div', { className: 'sm-card-grid' }, items.map(renderSkillCard))
        }
        const groups = groupSkills(items, skillsSourceOrder())
        return h('div', { className: 'sm-groups sm-skill-groups' }, groups.map(renderSkillGroup))
    }

    /* ------------------------------------------------------------------ *
     * Card (contract §7.3, interaction spec §4.2).                        *
     * ------------------------------------------------------------------ */

    function renderSkillCard(skill) {
        const disabled = skill.status === 'disabled'
        const broken = skill.status === 'broken' || skill.status === 'invalid'
        const readonly = skill.writable === false
        const updateVersion = skillUpdateVersion(skill)
        // Locale-aware description when the market index carries both languages.
        const description = typeof smSkillDescription === 'function'
            ? smSkillDescription(skill)
            : (typeof skill.description === 'string' ? skill.description : '')
        const badges = []
        /* Upgrade badge sits first in the tag bar (interaction spec §4.2). */
        if (updateVersion !== '') {
            badges.push(renderUpgradeBadge(updateVersion, { key: 'update' }))
        }
        if (broken) {
            badges.push(h('span', {
                key: 'issue',
                className: 'sm-badge sm-badge-warn',
                'data-tip': typeof skill.brokenReason === 'string' && skill.brokenReason !== '' ? skill.brokenReason : t('badge.issue'),
            }, t('badge.issue')))
        }
        if (disabled) {
            badges.push(h('span', { key: 'disabled', className: 'sm-badge sm-badge-idle' }, t('badge.disabled')))
        }
        /* The skills page lists installed skills: no install / installed action.
         * Only an available update offers a primary button, and read-only or
         * disabled cards never show a write action. */
        const primary = updateVersion !== '' && !disabled && !readonly
            ? h('button', {
                key: 'update',
                type: 'button',
                className: 'sm-btn sm-btn-primary sm-btn-sm',
                onClick: function (event) {
                    event.stopPropagation()
                    if (typeof openModal === 'function') openModal('update', { skill: skill, id: skill.id })
                },
            }, t('action.update'))
            : null
        return h('div', {
            key: skill.id,
            className: cx('sm-card-item', disabled && 'is-disabled'),
            role: 'button',
            tabIndex: 0,
            'data-skill-id': skill.id,
            onClick: function () { skillsOpenDetail(skill) },
            onKeyDown: function (event) {
                /* Child buttons (⋯ / update) handle their own keys; do not let
                 * Enter / Space bubble up into the card and open the detail. */
                if (event.target !== event.currentTarget) return
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    skillsOpenDetail(skill)
                }
            },
        },
        renderSkillIconBox(skill),
        h('div', { className: 'sm-card-main' },
            h('div', { className: 'sm-card-title-row' },
                h('span', { className: 'sm-card-name sm-mono', title: String(skill.name || '') }, String(skill.name || '')),
                badges.length > 0 ? h('span', { className: 'sm-tagbar' }, badges) : null),
            h('div', {
                className: 'sm-card-desc',
                'data-tip': description !== '' ? description : undefined,
            }, description)),
        h('div', {
            className: 'sm-card-tail',
            onClick: function (event) { event.stopPropagation() },
        },
        h('button', {
            type: 'button',
            className: 'sm-icon-btn plain sm-card-more',
            'aria-label': t('action.more'),
            'data-tip': t('action.more'),
            onClick: function (event) { skillsOpenMenu(event, skill) },
        }, icon('more', 16)),
        primary))
    }

    /* ------------------------------------------------------------------ *
     * Empty / loading / error states (interaction spec SL-04 ~ SL-06).    *
     * ------------------------------------------------------------------ */

    function renderSkillSearchEmpty() {
        const query = String(appState.search === undefined || appState.search === null ? '' : appState.search).trim()
        return h('div', { className: 'sm-empty' },
            h('div', { className: 'sm-empty-icon' }, icon('search', 40)),
            h('div', { className: 'sm-empty-title' }, t('empty.search', { query: query })),
            h('div', { className: 'sm-empty-body' }, t('empty.search.body')),
            h('div', { className: 'sm-empty-actions' },
                h('button', {
                    type: 'button',
                    className: 'sm-btn sm-btn-secondary',
                    onClick: function () { setState({ search: '' }) },
                }, t('search.clear'))))
    }

    function renderSkillCategoryEmpty(category) {
        const key = SKILL_CATEGORY_EMPTY[category] !== undefined ? SKILL_CATEGORY_EMPTY[category] : SKILL_CATEGORY_EMPTY.mine
        const actions = [
            h('button', {
                key: 'market',
                type: 'button',
                className: category === 'system' ? 'sm-btn sm-btn-secondary' : 'sm-btn sm-btn-primary',
                onClick: skillsGoMarket,
            }, t('action.goMarket')),
        ]
        /* Built-in skills cannot be created, so that category has one exit. */
        if (category !== 'system') {
            actions.push(h('button', {
                key: 'new',
                type: 'button',
                className: 'sm-btn sm-btn-secondary',
                onClick: function () {
                    if (typeof openModal === 'function') openModal('new-skill', {})
                },
            }, t('action.newSkill')))
        }
        return h('div', { className: 'sm-empty sm-empty-installed' },
            h('div', { className: 'sm-empty-icon' }, icon(SKILL_CATEGORY_ICON[category] || 'skill', 48)),
            h('div', { className: 'sm-empty-title' }, t(key)),
            h('div', { className: 'sm-empty-actions' }, actions))
    }

    function renderSkillSkeleton() {
        const cards = [0, 1, 2, 3, 4, 5].map(function (index) {
            return h('div', { key: 'skeleton-' + String(index), className: 'sm-card-item', 'aria-hidden': 'true' },
                h('div', { className: 'sm-skeleton sm-skeleton-icon' }),
                h('div', { className: 'sm-card-main' },
                    h('div', { className: 'sm-skeleton sm-skeleton-line sm-skeleton-line-lg' }),
                    h('div', { className: 'sm-skeleton sm-skeleton-line' })))
        })
        const headStyle = { height: '22px', width: '160px' }
        return h('div', { className: 'sm-installed sm-installed-loading', 'aria-busy': 'true', 'aria-label': t('state.loading') },
            h('div', { className: 'sm-skeleton', style: headStyle }),
            h('div', { className: 'sm-card-grid' }, cards.slice(0, 3)),
            h('div', { className: 'sm-skeleton', style: { height: '22px', width: '160px', marginTop: '20px' } }),
            h('div', { className: 'sm-card-grid' }, cards.slice(3, 6)),
            h('div', { className: 'sm-sr-only' }, t('state.loading')))
    }

    function renderSkillError(error) {
        const code = error !== null && typeof error === 'object' && error.code ? String(error.code) : ''
        const unauthorized = code === 'E_UNAUTHORIZED'
        const service = code.indexOf('SERVICE') !== -1 || code === 'E_NOT_LOADED'
        const title = unauthorized
            ? t('error.unauthorized')
            : service
                ? t('error.service')
                : t('state.error.skills.title')
        const body = service
            ? t('error.service.body')
            : unauthorized
                ? t('state.error.skills.body')
                : error !== null && typeof error === 'object' && error.message
                    ? String(error.message)
                    : t('state.error.skills.body')
        return h('div', { className: 'sm-empty sm-empty-error', 'aria-label': title },
            h('div', { className: 'sm-empty-icon' }, icon('alert', 40)),
            h('div', { className: 'sm-empty-title' }, title),
            h('div', { className: 'sm-empty-body' }, body),
            h('div', { className: 'sm-empty-actions' },
                h('button', {
                    type: 'button',
                    className: 'sm-btn sm-btn-primary',
                    onClick: function () { void loadInstalled(true) },
                }, t('action.retry'))))
    }

    /* ------------------------------------------------------------------ *
     * Page content. The shell (00-prelude.js) renders the page header,     *
     * primary tabs and category tabs, then calls renderSkillsTab() for    *
     * the scrollable content.                                             *
     * ------------------------------------------------------------------ */

    function renderSkillsTab() {
        const skills = skillsList()
        if (isLoading('installed') === true && skills.length === 0) {
            return renderSkillSkeleton()
        }
        if (skills.length === 0
            && appState.error !== null && typeof appState.error === 'object'
            && appState.error.scope === 'installed') {
            return renderSkillError(appState.error)
        }

        const query = skillsQuery()
        if (query !== '' && skillsMatched().length === 0) {
            return h('div', { className: 'sm-installed' },
                renderSkillSearchEmpty(),
                renderSkillMenu())
        }

        const category = skillsEffectiveCategory()
        if (skillsInCategory(category, query).length === 0) {
            return h('div', { className: 'sm-installed' },
                renderSkillCategoryEmpty(category),
                renderSkillMenu())
        }

        return h('div', { className: 'sm-installed' },
            renderSkillGroups(),
            renderSkillMenu())
    }
// ===== 20-market.js =====
    /* ------------------------------------------------------------------ *
     * C3 · 市场 Tab                                                       *
     *                                                                    *
     * 数据来源：appState.marketSources（按源分区块，见契约 §3.4）。       *
     * 每个源区块独立分页（cursor）；搜索 / 排序由 Host 完成，客户端只     *
     * 负责渲染、按 sourceOrder 排序区块与按块追加下一页。                 *
     * ------------------------------------------------------------------ */

    const SM_MARKET_PAGE_SIZE = 20

    /* 模块级瞬时状态：不进 appState，避免与 Host 数据竞争。 */
    let smMarketBootStarted = false
    let smMarketMenu = null
    let smMarketMenuKeysBound = false
    let smMarketAppending = Object.create(null)
    let smMarketRefreshing = Object.create(null)
    let smMarketSearchTimer = null

    function smMarketErrorText(err) {
        if (err === null || err === undefined) return ''
        if (typeof err === 'string') return err
        if (typeof err === 'object') {
            if (typeof err.message === 'string' && err.message !== '') return err.message
            if (typeof err.code === 'string' && err.code !== '') return err.code
        }
        return String(err)
    }

    function smMarketVersionLabel(version) {
        const text = String(version === undefined || version === null ? '' : version)
        if (text === '') return ''
        return text.charAt(0) === 'v' ? text : 'v' + text
    }

    function smMarketSortValue() {
        const sort = String(appState.marketSort === undefined || appState.marketSort === null ? '' : appState.marketSort)
        if (sort === 'updated' || sort === 'name' || sort === 'recommend') return sort
        return 'recommend'
    }

    function smMarketSourceList() {
        return Array.isArray(appState.sources) ? appState.sources : []
    }

    function smMarketSourceById(sourceId) {
        const id = String(sourceId === undefined || sourceId === null ? '' : sourceId)
        if (id === '') return null
        const sources = smMarketSourceList()
        for (let index = 0; index < sources.length; index += 1) {
            const source = sources[index]
            if (source !== null && typeof source === 'object' && String(source.id) === id) return source
        }
        return null
    }

    function smMarketBlocks() {
        return Array.isArray(appState.marketSources) ? appState.marketSources : []
    }

    function smMarketBlockSkills(block) {
        return block !== null && typeof block === 'object' && Array.isArray(block.skills) ? block.skills : []
    }

    function smMarketBlockErrorText(block) {
        if (block === null || typeof block !== 'object' || block.error === null || block.error === undefined || block.error === '') return ''
        return smMarketErrorText(block.error)
    }

    function smMarketBlockEnabled(block) {
        if (block === null || typeof block !== 'object') return false
        const source = smMarketSourceById(block.sourceId)
        if (source === null) return true
        return source.enabled !== false
    }

    /* 区块顺序 = sourceOrder；未出现在 order 里的源保持接口返回顺序并排最后。 */
    function smMarketOrderedBlocks() {
        const query = String(appState.search === undefined || appState.search === null ? '' : appState.search).trim()
        const blocks = smMarketBlocks().filter(function (block) {
            if (block === null || typeof block !== 'object') return false
            if (!smMarketBlockEnabled(block)) return false
            /* 搜索无命中的源区块连同区块头一起隐藏（ML-03）。 */
            if (query !== '' && smMarketBlockSkills(block).length === 0) return false
            return true
        })
        const order = Array.isArray(appState.sourceOrder) ? appState.sourceOrder : []
        if (order.length === 0) return blocks
        const rank = Object.create(null)
        order.forEach(function (id, index) {
            rank[String(id)] = index
        })
        return blocks
            .map(function (block, index) { return { block: block, index: index } })
            .sort(function (left, right) {
                const leftId = String(left.block.sourceId)
                const rightId = String(right.block.sourceId)
                const leftRank = rank[leftId] === undefined ? Number.MAX_SAFE_INTEGER : rank[leftId]
                const rightRank = rank[rightId] === undefined ? Number.MAX_SAFE_INTEGER : rank[rightId]
                if (leftRank !== rightRank) return leftRank - rightRank
                return left.index - right.index
            })
            .map(function (entry) { return entry.block })
    }

    function smMarketLoading() {
        if (appState.loadingMarket === true) return true
        if (appState.loading !== null && typeof appState.loading === 'object' && appState.loading.market === true) return true
        return false
    }

    function smMarketScopedError() {
        const error = appState.error
        return error !== null && typeof error === 'object' && error.scope === 'market' ? error : null
    }

    function smMarketEnsureLoaded() {
        if (smMarketBootStarted) return
        smMarketBootStarted = true
        if (smMarketBlocks().length > 0) return
        /* switchTab 可能已经发起请求；不要在渲染里重复发一次。 */
        if (smMarketLoading()) return
        if (typeof loadMarket !== 'function') return
        try {
            const pending = loadMarket({ q: String(appState.search || ''), sort: smMarketSortValue() })
            if (pending !== null && pending !== undefined && typeof pending.catch === 'function') {
                pending.catch(function () { /* 页级错误态由 appState.error 呈现 */ })
            }
        } catch (err) {
            void err
        }
    }

    function smMarketReload(options) {
        const opts = options !== null && typeof options === 'object' ? options : {}
        if (typeof loadMarket !== 'function') return
        smMarketBootStarted = true
        try {
            const pending = loadMarket({
                q: String(appState.search || ''),
                sort: smMarketSortValue(),
                refresh: opts.refresh === true,
            })
            if (pending !== null && pending !== undefined && typeof pending.catch === 'function') {
                pending.catch(function () { /* 错误由 appState.error 呈现 */ })
            }
        } catch (err) {
            void err
        }
    }

    function smMarketCancelSearchTimer() {
        if (smMarketSearchTimer !== null) {
            clearTimeout(smMarketSearchTimer)
            smMarketSearchTimer = null
        }
    }

    function smMarketClearSearch() {
        smMarketCancelSearchTimer()
        if (typeof setState === 'function') setState({ search: '' })
        smMarketReload({ refresh: true })
    }

    function smMarketOnSearchInput(event) {
        const value = event !== null && event !== undefined && event.target !== null && event.target !== undefined
            ? String(event.target.value || '')
            : ''
        if (value === appState.search) return
        if (typeof setState === 'function') setState({ search: value })
        smMarketCancelSearchTimer()
        /* 市场搜索 300ms 防抖（交互稿 §3.3）。 */
        smMarketSearchTimer = setTimeout(function () {
            smMarketSearchTimer = null
            smMarketReload()
        }, 300)
    }

    function smMarketOnSortChange(event) {
        const value = event !== null && event !== undefined && event.target !== null && event.target !== undefined
            ? String(event.target.value || 'recommend')
            : 'recommend'
        if (value === smMarketSortValue()) return
        smMarketCancelSearchTimer()
        if (typeof setState === 'function') setState({ marketSort: value })
        smMarketReload()
    }

    function smMarketManageSources() {
        if (typeof openSourceDialog === 'function') openSourceDialog()
    }

    function smMarketOpenModal(kind, payload) {
        if (typeof openModal === 'function') openModal(kind, payload)
    }

    function smMarketRefreshSource(sourceId) {
        const id = String(sourceId === undefined || sourceId === null ? '' : sourceId)
        if (id === '' || smMarketRefreshing[id] === true) return
        smMarketRefreshing[id] = true
        if (typeof setState === 'function') setState({})
        const run = async function () {
            try {
                await api('sources/' + encodeURIComponent(id) + '/refresh', { method: 'POST' })
                if (typeof loadSources === 'function') {
                    try { await loadSources(true) } catch (err) { void err }
                }
                smMarketReload({ refresh: true })
            } catch (err) {
                void err
                toast(t('source.error.refreshFailed'), { tone: 'error' })
            } finally {
                delete smMarketRefreshing[id]
                if (typeof setState === 'function') setState({})
            }
        }
        void run()
    }

    /* ------------------------------------------------------------------ *
     * 卡片菜单（源的操作统一在管理源弹窗中完成）                          *
     * ------------------------------------------------------------------ */

    function smMarketMenuKeydown(event) {
        if (event === null || event === undefined || event.key !== 'Escape') return
        if (typeof event.preventDefault === 'function') event.preventDefault()
        if (typeof event.stopPropagation === 'function') event.stopPropagation()
        smMarketCloseMenu()
    }

    function smMarketBindMenuKeys() {
        if (smMarketMenuKeysBound) return
        if (typeof document === 'undefined' || document === null || typeof document.addEventListener !== 'function') return
        document.addEventListener('keydown', smMarketMenuKeydown, true)
        smMarketMenuKeysBound = true
    }

    function smMarketUnbindMenuKeys() {
        if (!smMarketMenuKeysBound) return
        if (typeof document !== 'undefined' && document !== null && typeof document.removeEventListener === 'function') {
            document.removeEventListener('keydown', smMarketMenuKeydown, true)
        }
        smMarketMenuKeysBound = false
    }

    function smMarketOpenMenu(kind, event, payload) {
        if (event !== null && event !== undefined) {
            if (typeof event.stopPropagation === 'function') event.stopPropagation()
            if (typeof event.preventDefault === 'function') event.preventDefault()
        }
        let rect = null
        if (event !== null && event !== undefined && event.currentTarget !== null && event.currentTarget !== undefined &&
            typeof event.currentTarget.getBoundingClientRect === 'function') {
            rect = event.currentTarget.getBoundingClientRect()
        }
        const width = 200
        const viewportWidth = typeof window !== 'undefined' && window !== null && typeof window.innerWidth === 'number'
            ? window.innerWidth
            : 1024
        const viewportHeight = typeof window !== 'undefined' && window !== null && typeof window.innerHeight === 'number'
            ? window.innerHeight
            : 768
        const anchorX = rect !== null ? rect.right - width : viewportWidth - width - 24
        const anchorY = rect !== null ? rect.bottom + 4 : 120
        const x = Math.max(8, Math.min(viewportWidth - width - 8, anchorX))
        const y = Math.max(8, Math.min(viewportHeight - 240, anchorY))
        smMarketMenu = Object.assign({ kind: kind, x: x, y: y }, payload !== null && typeof payload === 'object' ? payload : {})
        smMarketBindMenuKeys()
        if (typeof setState === 'function') setState({})
    }

    function smMarketCloseMenu() {
        if (smMarketMenu === null) return
        smMarketMenu = null
        smMarketUnbindMenuKeys()
        if (typeof setState === 'function') setState({})
    }

    function smMarketMenuItem(key, iconName, label, onClick, options) {
        const opts = options !== null && typeof options === 'object' ? options : {}
        const disabled = opts.disabled === true
        return h('button', {
            key: key,
            type: 'button',
            role: 'menuitem',
            className: cx('sm-menu-item', opts.danger === true && 'sm-menu-item-danger'),
            disabled: disabled,
            'aria-disabled': disabled,
            onClick: function (event) {
                if (event !== null && event !== undefined && typeof event.stopPropagation === 'function') event.stopPropagation()
                if (disabled) return
                smMarketCloseMenu()
                if (typeof onClick === 'function') onClick()
            },
        },
        iconName ? icon(iconName, 15) : null,
        h('span', null, label))
    }

    function smMarketRenderMenu() {
        if (smMarketMenu === null || typeof smMarketMenu !== 'object') return null
        const items = []
        if (smMarketMenu.kind === 'card') {
            const item = smMarketMenu.item
            if (item !== null && typeof item === 'object') {
                items.push(smMarketMenuItem('detail', 'skill', t('action.viewDetail'), function () {
                    smMarketOpenDetail(item)
                }))
                if (smMarketCardUpdate(item) !== '') {
                    items.push(smMarketMenuItem('update', 'arrow-up-dot', t('action.update'), function () {
                        smMarketUpdate(item)
                    }))
                } else if (smMarketCardInstalled(item)) {
                    items.push(smMarketMenuItem('installed', 'check', t('market.installed'), null, { disabled: true }))
                } else {
                    items.push(smMarketMenuItem('install', 'download', t('action.install'), function () {
                        smMarketInstall(item)
                    }))
                }
            }
        }
        if (items.length === 0) return null
        return h(Fragment, null,
            h('div', {
                key: 'menu-backdrop',
                className: 'sm-menu-backdrop',
                style: { position: 'fixed', inset: 0, zIndex: 1290 },
                onClick: smMarketCloseMenu,
                onContextMenu: function (event) {
                    if (event !== null && event !== undefined && typeof event.preventDefault === 'function') event.preventDefault()
                    smMarketCloseMenu()
                },
            }),
            h('div', {
                key: 'menu',
                className: 'sm-menu',
                role: 'menu',
                style: {
                    position: 'fixed',
                    left: smMarketMenu.x + 'px',
                    top: smMarketMenu.y + 'px',
                    width: '200px',
                    zIndex: 1300,
                },
            }, items))
    }

    /* ------------------------------------------------------------------ *
     * 市场卡片                                                            *
     * ------------------------------------------------------------------ */

    function smMarketCardInstalled(item) {
        if (item === null || typeof item !== 'object') return false
        if (item.installed === true) return true
        return item.installed !== null && typeof item.installed === 'object'
    }

    /* 市场条目只带 installed 布尔值；更新模态还需要安装位置，从已安装列表补齐。 */
    function smMarketInstalledSkill(item) {
        if (item === null || typeof item !== 'object') return null
        const skills = Array.isArray(appState.skills) ? appState.skills : []
        const name = String(item.name || '')
        const sourceId = String(item.sourceId || '')
        if (name === '') return null
        for (let index = 0; index < skills.length; index += 1) {
            const skill = skills[index]
            if (skill === null || typeof skill !== 'object' || String(skill.name || '') !== name) continue
            const recordSource = typeof skill.sourceId === 'string' && skill.sourceId !== ''
                ? skill.sourceId
                : (skill.market !== null && typeof skill.market === 'object' && typeof skill.market.sourceId === 'string'
                    ? skill.market.sourceId
                    : '')
            if (recordSource === '' || recordSource === sourceId) return skill
        }
        return null
    }

    function smMarketCardInstalledVersion(item) {
        if (item === null || typeof item !== 'object') return ''
        if (typeof item.installedVersion === 'string' && item.installedVersion !== '') return item.installedVersion
        if (item.installed !== null && typeof item.installed === 'object' && typeof item.installed.version === 'string') {
            return item.installed.version
        }
        const installed = smMarketInstalledSkill(item)
        return installed !== null && typeof installed.version === 'string' ? installed.version : ''
    }

    function smMarketCardUpdate(item) {
        if (item === null || typeof item !== 'object') return ''
        if (typeof item.updateAvailable === 'string' && item.updateAvailable !== '') return item.updateAvailable
        if (item.updateAvailable !== null && item.updateAvailable !== undefined && item.updateAvailable !== false) {
            return String(item.updateAvailable)
        }
        return ''
    }

    function smMarketIconName(item) {
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
        }))
    }

    function smMarketCardKey(item) {
        const sourceId = String(item !== null && typeof item === 'object' && item.sourceId ? item.sourceId : '')
        const name = String(item !== null && typeof item === 'object' && item.name ? item.name : '')
        return sourceId + '/' + name
    }

    function smMarketOpenDetail(item) {
        if (item === null || typeof item !== 'object') return
        if (typeof rememberListScroll === 'function') rememberListScroll()
        const key = smMarketCardKey(item)
        const detailId = typeof item.id === 'string' && item.id !== '' ? item.id : key
        if (typeof setState === 'function') {
            setState({
                view: 'detail',
                detail: {
                    kind: 'market',
                    id: detailId,
                    sourceId: item.sourceId,
                    name: item.name,
                },
            })
        }
    }

    function smMarketInstall(item) {
        if (item === null || typeof item !== 'object') return
        smMarketOpenModal('install', {
            sourceId: item.sourceId,
            name: item.name,
            version: item.version,
        })
    }

    function smMarketUpdate(item) {
        if (item === null || typeof item !== 'object') return
        const next = smMarketCardUpdate(item)
        const installedSkill = smMarketInstalledSkill(item)
        const embedded = item.installed !== null && typeof item.installed === 'object' ? item.installed : null
        const current = smMarketCardInstalledVersion(item)
        const location = installedSkill !== null && typeof installedSkill.location === 'string' && installedSkill.location !== ''
            ? installedSkill.location
            : embedded !== null && typeof embedded.location === 'string' ? embedded.location : ''
        const localModified = installedSkill !== null && (
            installedSkill.localModified === true ||
            (installedSkill.market !== null && typeof installedSkill.market === 'object' && installedSkill.market.localModified === true)
        )
        /* 50-modals 的更新模态通过 payload.skill 读取目标（smSkillUpdateVersion）。 */
        const target = Object.assign({}, item, {
            id: installedSkill !== null && typeof installedSkill.id === 'string' && installedSkill.id !== ''
                ? installedSkill.id
                : (typeof item.id === 'string' && item.id !== '' ? item.id : smMarketCardKey(item)),
            location: location,
            version: current !== '' ? current : item.version,
            updateAvailable: next,
            localModified: localModified,
        })
        smMarketOpenModal('update', {
            skill: target,
            sourceId: item.sourceId,
            name: item.name,
            version: next,
            currentVersion: current,
            available: next,
            current: current,
            location: location,
        })
    }

    function smMarketCardPrimary(item) {
        const update = smMarketCardUpdate(item)
        const installed = smMarketCardInstalled(item)
        if (update !== '') {
            return h('button', {
                key: 'primary',
                type: 'button',
                className: 'sm-btn sm-btn-primary sm-btn-sm',
                onClick: function (event) {
                    if (event !== null && event !== undefined && typeof event.stopPropagation === 'function') event.stopPropagation()
                    smMarketUpdate(item)
                },
            }, t('action.update'))
        }
        if (installed) {
            return h('button', {
                key: 'primary',
                type: 'button',
                className: 'sm-btn sm-btn-ghost sm-btn-sm sm-market-installed',
                onClick: function (event) {
                    if (event !== null && event !== undefined && typeof event.stopPropagation === 'function') event.stopPropagation()
                    smMarketOpenDetail(item)
                },
            }, t('market.installed'))
        }
        return h('button', {
            key: 'primary',
            type: 'button',
            className: 'sm-btn sm-btn-primary sm-btn-sm',
            onClick: function (event) {
                if (event !== null && event !== undefined && typeof event.stopPropagation === 'function') event.stopPropagation()
                smMarketInstall(item)
            },
        }, t('action.install'))
    }

    function renderMarketCard(item) {
        if (item === null || typeof item !== 'object') return null
        const update = smMarketCardUpdate(item)
        const installed = smMarketCardInstalled(item)
        const dotClass = update !== '' ? 'sm-dot-update' : installed ? 'sm-dot-ok' : 'sm-dot-idle'
        const dotTip = update !== ''
            ? t('market.updateTo', { version: smMarketVersionLabel(update) })
            : installed
                ? t('market.installed')
                : t('action.install')
        const tags = []
        if (update !== '') {
            tags.push(h('span', {
                key: 'update',
                className: 'sm-badge sm-badge-update sm-mono',
                'data-tip': t('badge.updateTip', { version: smMarketVersionLabel(update) }),
            }, smMarketUpgradeGlyph(), h('span', null, smMarketVersionLabel(update))))
        }
        const maxTags = update !== '' ? 3 : 4
        const itemTags = Array.isArray(item.tags) ? item.tags : []
        itemTags.slice(0, maxTags).forEach(function (tag) {
            if (typeof tag !== 'string' || tag === '') return
            tags.push(h('span', { key: 'tag-' + tag, className: 'sm-badge' }, tag))
        })
        const version = smMarketVersionLabel(item.version)
        const description = typeof item.description === 'string' ? item.description : ''
        const openDetail = function () { smMarketOpenDetail(item) }

        return h('div', {
            key: smMarketCardKey(item),
            className: 'sm-card-item sm-market-card',
            role: 'button',
            tabIndex: 0,
            'data-market-key': smMarketCardKey(item),
            onClick: openDetail,
            onKeyDown: function (event) {
                if (event === null || event === undefined) return
                /* 卡片内的 ⋯ / 主按钮是独立停靠点，不能触发整卡进入详情。 */
                if (event.target !== event.currentTarget) return
                if (event.key === 'Enter' || event.key === ' ') {
                    if (typeof event.preventDefault === 'function') event.preventDefault()
                    openDetail()
                }
            },
        },
        h('div', {
            className: 'sm-card-icon',
            style: {
                width: '48px',
                height: '48px',
                borderRadius: 'var(--dsw-radius-lg)',
                border: '0.5px solid var(--dsw-alias-border-l2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 'none',
                position: 'relative',
            },
        },
        icon(smMarketIconName(item), 24),
        h('span', { className: cx('sm-dot', dotClass), title: dotTip, 'data-tip': dotTip })),
        h('div', {
            className: 'sm-card-main',
            style: { flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' },
        },
        h('div', {
            className: 'sm-card-title-row',
            style: { display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, overflow: 'hidden' },
        },
        h('span', { className: 'sm-card-name sm-mono', title: String(item.name || '') }, String(item.name || '')),
        version !== '' ? h('span', { className: 'sm-badge sm-mono' }, version) : null,
        tags.length > 0
            ? h('div', {
                className: 'sm-tagbar',
                style: { display: 'flex', alignItems: 'center', gap: '4px', maxWidth: '340px', overflow: 'hidden', flexWrap: 'nowrap' },
            }, tags)
            : null),
        h('div', {
            className: 'sm-card-desc',
            title: description,
            style: {
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: '2',
                WebkitBoxOrient: 'vertical',
            },
        }, description)),
        h('div', {
            className: 'sm-card-tail',
            style: { display: 'flex', alignItems: 'center', gap: '8px', flex: 'none', alignSelf: 'center' },
            onClick: function (event) {
                if (event !== null && event !== undefined && typeof event.stopPropagation === 'function') event.stopPropagation()
            },
        },
        smMarketCardPrimary(item)))
    }

    /* ------------------------------------------------------------------ *
     * 源区块                                                              *
     * ------------------------------------------------------------------ */

    function smMarketLoadMore(block) {
        if (block === null || typeof block !== 'object') return
        const sourceId = String(block.sourceId || '')
        const cursor = typeof block.cursor === 'string' && block.cursor !== '' ? block.cursor : null
        if (sourceId === '' || cursor === null) return
        if (smMarketAppending[sourceId] === true) return
        smMarketAppending[sourceId] = true
        if (typeof setState === 'function') setState({})
        const run = async function () {
            try {
                if (typeof loadMarket !== 'function') return
                /* 00-prelude 的 loadMarket 负责按 sourceId 追加并去重。 */
                const pending = loadMarket({
                    q: String(appState.search || ''),
                    sort: smMarketSortValue(),
                    cursor: cursor,
                    limit: SM_MARKET_PAGE_SIZE,
                    sourceId: sourceId,
                    append: true,
                })
                if (pending !== null && pending !== undefined && typeof pending.then === 'function') await pending
            } catch (err) {
                void err
                toast(t('error.unexpected'), { tone: 'error' })
            } finally {
                delete smMarketAppending[sourceId]
                if (typeof setState === 'function') setState({})
            }
        }
        void run()
    }

    function smMarketBlockRetry(block) {
        if (block === null || typeof block !== 'object') return
        smMarketRefreshSource(block.sourceId, block.name)
    }

    function smMarketBlockEmpty(block) {
        const sourceId = String(block !== null && typeof block === 'object' ? block.sourceId || '' : '')
        return h('div', {
            key: 'empty-' + sourceId,
            className: 'sm-empty sm-market-empty',
            style: { padding: '20px 12px' },
        },
        h('div', { className: 'sm-empty-icon' }, icon('package', 32)),
        h('div', { className: 'sm-empty-title sm-card-title' }, t('empty.market.noSkills.title')),
        h('div', { className: 'sm-empty-body sm-desc' }, t('empty.market.noSkills.body')),
        h('div', {
            className: 'sm-empty-actions',
            style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' },
        },
        h('button', {
            type: 'button',
            className: 'sm-btn sm-btn-ghost sm-btn-sm',
            onClick: smMarketManageSources,
        }, t('action.manageSources'))))
    }

    function smMarketBlockError(block) {
        const sourceId = String(block !== null && typeof block === 'object' ? block.sourceId || '' : '')
        const detail = smMarketBlockErrorText(block)
        return h('div', {
            key: 'error-' + sourceId,
            className: 'sm-banner sm-banner-error sm-error',
            role: 'alert',
            style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
        },
        icon('alert', 16),
        h('div', { className: 'sm-banner-main', style: { flex: '1 1 auto', minWidth: 0 } },
            h('div', { className: 'sm-banner-title' }, t('market.error.source')),
            h('div', { className: 'sm-caption sm-muted' },
                detail !== '' ? detail : t('market.error.sourceHint'))),
        h('button', {
            type: 'button',
            className: 'sm-btn sm-btn-ghost sm-btn-sm',
            onClick: function () { smMarketBlockRetry(block) },
        }, t('action.retry')))
    }

    function renderMarketSourceBlock(block) {
        if (block === null || typeof block !== 'object') return null
        const sourceId = String(block.sourceId || '')
        const name = typeof block.name === 'string' && block.name !== '' ? block.name : sourceId
        const skills = smMarketBlockSkills(block)
        const errorText = smMarketBlockErrorText(block)
        const source = smMarketSourceById(sourceId)
        const status = source !== null && typeof source.status === 'string' ? source.status : 'ok'
        const dotClass = status === 'error' ? 'sm-dot-error' : status === 'checking' ? 'sm-dot-warn' : 'sm-dot-ok'
        const dotTip = status === 'error' ? t('source.status.error') : status === 'checking' ? t('source.status.checking') : t('source.status.ok')
        const count = typeof block.total === 'number' ? block.total : skills.length
        const cursor = typeof block.cursor === 'string' && block.cursor !== '' ? block.cursor : null
        const appending = smMarketAppending[sourceId] === true
        /* 有缓存卡片时保留列表，只在顶部显示错误细条；无缓存才整块错误态。 */
        let body = null
        if (skills.length > 0) {
            body = h(Fragment, null,
                errorText !== '' ? smMarketBlockError(block) : null,
                h('div', { className: 'sm-card-grid' }, skills.map(function (item) {
                    return renderMarketCard(item)
                })))
        } else if (errorText !== '') {
            body = smMarketBlockError(block)
        } else {
            body = smMarketBlockEmpty(block)
        }
        return h('section', {
            key: sourceId,
            className: 'sm-source-block',
            'data-source-id': sourceId,
            'aria-label': name + ' · ' + t('source.skillCount', { count: count }),
        },
        h('div', {
            className: 'sm-source-block-head',
            style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '0 2px', minWidth: 0 },
        },
        h('span', { className: cx('sm-dot', dotClass), title: dotTip, 'data-tip': dotTip, style: { position: 'static', flex: 'none' } }),
        h('span', {
            className: 'sm-source-block-title',
            title: name,
            style: {
                fontSize: 'var(--sm-fs)',
                fontWeight: 500,
                color: 'var(--dsw-alias-label-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
            },
        }, name),
        h('span', {
            className: 'sm-source-block-count',
            style: { fontSize: 'calc(var(--sm-fs) - 2px)', color: 'var(--dsw-alias-label-caption)', whiteSpace: 'nowrap' },
        }, t('source.skillCount', { count: count }))),
        body,
        cursor !== null && errorText === ''
            ? h('div', {
                key: 'more',
                className: 'sm-market-more',
                style: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 0' },
            },
            h('button', {
                type: 'button',
                className: 'sm-btn sm-btn-ghost sm-btn-sm',
                disabled: appending,
                onClick: function () { smMarketLoadMore(block) },
            }, appending ? t('market.loadingMore') : t('action.more')))
            : null)
    }

    /* ------------------------------------------------------------------ *
     * 空态 / 骨架 / 页级错误                                              *
     * ------------------------------------------------------------------ */

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
                : null)
    }

    function smMarketNoSourceState(hasAnySource) {
        const actions = [
            h('button', {
                key: 'add',
                type: 'button',
                className: 'sm-btn sm-btn-primary sm-btn-sm',
                onClick: function () { smMarketOpenModal('add-source', {}) },
            }, icon('plus', 15), t('action.addSource')),
        ]
        if (hasAnySource) {
            actions.push(h('button', {
                key: 'manage',
                type: 'button',
                className: 'sm-btn sm-btn-ghost sm-btn-sm',
                onClick: smMarketManageSources,
            }, t('action.manageSources')))
        }
        return smMarketEmptyBlock(
            'sources',
            t('empty.market.noSource.title'),
            t('empty.market.noSource.body'),
            actions,
            'no-source'
        )
    }

    function smMarketNoResultsState() {
        const query = String(appState.search === undefined || appState.search === null ? '' : appState.search)
        if (query.trim() !== '') {
            return smMarketEmptyBlock(
                'search',
                t('empty.market.noResults.title', { query: query }),
                t('empty.market.noResults.body'),
                [
                    h('button', {
                        key: 'clear',
                        type: 'button',
                        className: 'sm-btn sm-btn-ghost sm-btn-sm',
                        onClick: smMarketClearSearch,
                    }, t('action.clear')),
                ],
                'no-results'
            )
        }
        return smMarketEmptyBlock(
            'package',
            t('empty.market.noSkills.title'),
            t('empty.market.noSkills.body'),
            [
                h('button', {
                    key: 'manage',
                    type: 'button',
                    className: 'sm-btn sm-btn-ghost sm-btn-sm',
                    onClick: smMarketManageSources,
                }, t('action.manageSources')),
            ],
            'no-skills'
        )
    }

    function smMarketPageError(error) {
        const detail = smMarketErrorText(error)
        return smMarketEmptyBlock(
            'alert',
            t('state.error.market.title'),
            detail !== '' ? detail : t('market.error.sourceHint'),
            [
                h('button', {
                    key: 'retry',
                    type: 'button',
                    className: 'sm-btn sm-btn-primary sm-btn-sm',
                    onClick: function () { smMarketReload() },
                }, t('action.retry')),
                h('button', {
                    key: 'sources',
                    type: 'button',
                    className: 'sm-btn sm-btn-ghost sm-btn-sm',
                    onClick: smMarketManageSources,
                }, t('action.manageSources')),
            ],
            'page-error'
        )
    }

    function smMarketStaleBanner() {
        return h('div', {
            key: 'stale-banner',
            className: 'sm-banner sm-banner-warn sm-warn',
            role: 'status',
            style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
        },
        icon('alert', 16),
        h('div', { className: 'sm-banner-main', style: { flex: '1 1 auto', minWidth: 0 } },
            h('div', { className: 'sm-banner-title' }, t('market.error.offline')),
            h('div', { className: 'sm-caption sm-muted' }, t('market.error.offlineHint'))),
        h('button', {
            type: 'button',
            className: 'sm-btn sm-btn-ghost sm-btn-sm',
            onClick: function () {
                if (typeof checkUpdates === 'function') void checkUpdates()
            },
        }, t('action.retry')),
        h('button', {
            type: 'button',
            className: 'sm-btn sm-btn-ghost sm-btn-sm',
            onClick: smMarketManageSources,
        }, t('action.manageSources')))
    }

    function smMarketSkeletonCard(index) {
        return h('div', {
            key: 'sk-' + String(index),
            className: 'sm-card-item sm-market-card',
            'aria-hidden': 'true',
            style: { pointerEvents: 'none' },
        },
        h('div', { className: 'sm-card-icon', style: { width: '48px', height: '48px', flex: 'none' } },
            h('span', { className: 'sm-skeleton', style: { width: '24px', height: '24px' } })),
        h('div', {
            className: 'sm-card-main',
            style: { flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '8px' },
        },
        h('div', { className: 'sm-skeleton', style: { maxWidth: '180px' } }),
        h('div', { className: 'sm-skeleton', style: { maxWidth: '260px', minHeight: '12px' } })))
    }

    function smMarketSkeleton() {
        const cards = []
        for (let index = 0; index < 6; index += 1) cards.push(smMarketSkeletonCard(index))
        return h('div', {
            key: 'skeleton',
            className: 'sm-market-skeleton',
            'aria-busy': 'true',
            style: { display: 'flex', flexDirection: 'column', gap: '12px' },
        },
        h('div', { className: 'sm-caption sm-muted', style: { padding: '4px 2px' } }, t('state.loadingMarket')),
        h('div', { className: 'sm-card-grid' }, cards))
    }

    function smMarketToolbar(sources, loading) {
        const hasSources = sources.length > 0
        const checking = appState.checking === true
        return h('div', {
            key: 'toolbar',
            className: 'sm-toolbar sm-market-toolbar',
        },
        h('div', { className: 'sm-search' },
            icon('search', 15),
            h('input', {
                className: 'sm-search-input',
                type: 'search',
                value: String(appState.search === undefined || appState.search === null ? '' : appState.search),
                placeholder: t('search.market.placeholder'),
                'aria-label': t('search.market.placeholder'),
                spellCheck: false,
                disabled: !hasSources,
                onChange: smMarketOnSearchInput,
            }),
            appState.search !== '' && appState.search !== undefined && appState.search !== null
                ? h('button', {
                    type: 'button',
                    className: 'sm-search-clear',
                    'aria-label': t('action.clear'),
                    'data-tip': t('action.clear'),
                    onClick: smMarketClearSearch,
                }, icon('x', 14))
                : null),
        h('select', {
            className: 'sm-select',
            value: smMarketSortValue(),
            'aria-label': t('sort.label'),
            disabled: !hasSources,
            onChange: smMarketOnSortChange,
        },
        h('option', { value: 'recommend' }, t('sort.recommended')),
        h('option', { value: 'updated' }, t('sort.updated')),
        h('option', { value: 'name' }, t('sort.name'))),
        h('div', { className: 'sm-toolbar-icons' },
            h('button', {
                type: 'button',
                className: 'sm-tool-btn',
                'aria-label': t('action.checkUpdates'),
                'data-tip': checking ? t('status.checking') : t('action.checkUpdates'),
                disabled: !hasSources || loading === true || checking,
                'aria-busy': checking ? 'true' : undefined,
                onClick: function () {
                    if (typeof checkUpdates === 'function') void checkUpdates()
                },
            }, icon('refresh', 16)),
            h('button', {
                type: 'button',
                className: 'sm-tool-btn',
                'aria-label': t('action.manageSources'),
                'data-tip': t('action.manageSources'),
                onClick: smMarketManageSources,
            }, icon('sources', 16))))
    }

    /* ------------------------------------------------------------------ *
     * 市场 Tab 入口                                                       *
     * ------------------------------------------------------------------ */

    function renderMarketTab() {
        smMarketEnsureLoaded()

        const sources = smMarketSourceList()
        const enabledSources = sources.filter(function (source) {
            return source !== null && typeof source === 'object' && source.enabled !== false
        })
        const blocks = smMarketOrderedBlocks()
        const scopedError = smMarketScopedError()
        const loading = smMarketLoading()
        const stale = appState.marketStale === true
        const hasBlockError = blocks.some(function (block) { return smMarketBlockErrorText(block) !== '' })
        const nodes = [smMarketToolbar(sources, loading)]

        if (blocks.length > 0 && (stale || hasBlockError || scopedError !== null)) nodes.push(smMarketStaleBanner())

        if (blocks.length > 0) {
            blocks.forEach(function (block) { nodes.push(renderMarketSourceBlock(block)) })
        } else if (loading) {
            nodes.push(smMarketSkeleton())
        } else if (sources.length === 0) {
            nodes.push(smMarketNoSourceState(false))
        } else if (scopedError !== null) {
            nodes.push(smMarketPageError(scopedError))
        } else if (enabledSources.length === 0) {
            nodes.push(smMarketNoSourceState(true))
        } else {
            nodes.push(smMarketNoResultsState())
        }

        /* 管理源弹窗由 00-prelude 的 renderOverlays 挂载（与原型一致），
           这里不重复渲染，避免两层遮罩。 */
        nodes.push(smMarketRenderMenu())

        return h('div', { className: 'sm-page sm-market' }, nodes)
    }
// ===== 30-source-dialog.js =====
    /* ------------------------------------------------------------------ *
     * C3 · 管理源弹窗                                                     *
     *                                                                    *
     * 720px 居中弹窗；内容少时自然收缩。源列表支持拖动排序               *
     * （HTML5 DnD + 4px 阈值）与 Alt+↑/↓ 键盘替代。排序结果写入          *
     * appState.sourceOrder 并调用 PUT /sources/order；dataTransfer key    *
     * 与拖动钩子来自 00-prelude 的 smDragSource。                         *
     * ------------------------------------------------------------------ */

    let smSourceDialogDrag = null
    let smSourceDialogPointer = null
    let smSourceDialogAnnounce = ''
    let smSourceDialogBusy = Object.create(null)
    let smSourceDialogError = Object.create(null)
    let smSourceDialogDragKeysBound = false
    let smSourceDialogEscapeBound = false
    let smSourceDialogReturnFocus = null

    function smSourceList() {
        return Array.isArray(appState.sources) ? appState.sources : []
    }

    /* 源顺序 = sourceOrder；未出现在 order 里的源保持原顺序排最后。 */
    function smSourceOrderedList() {
        const sources = smSourceList().slice()
        const order = Array.isArray(appState.sourceOrder) ? appState.sourceOrder : []
        if (order.length === 0) return sources
        const rank = Object.create(null)
        order.forEach(function (id, index) {
            rank[String(id)] = index
        })
        return sources
            .map(function (source, index) { return { source: source, index: index } })
            .sort(function (left, right) {
                const leftId = String(left.source !== null && typeof left.source === 'object' ? left.source.id : '')
                const rightId = String(right.source !== null && typeof right.source === 'object' ? right.source.id : '')
                const leftRank = rank[leftId] === undefined ? Number.MAX_SAFE_INTEGER : rank[leftId]
                const rightRank = rank[rightId] === undefined ? Number.MAX_SAFE_INTEGER : rank[rightId]
                if (leftRank !== rightRank) return leftRank - rightRank
                return left.index - right.index
            })
            .map(function (entry) { return entry.source })
    }

    function smSourceApplyOrder(sources, ids) {
        const byId = Object.create(null)
        const extras = []
        ;(Array.isArray(sources) ? sources : []).forEach(function (source) {
            if (source === null || typeof source !== 'object') return
            const id = String(source.id)
            if (ids.indexOf(id) === -1) extras.push(source)
            else byId[id] = source
        })
        const ordered = []
        ids.forEach(function (id) {
            if (byId[id] !== undefined) ordered.push(byId[id])
        })
        return ordered.concat(extras)
    }

    function smSourceFocusHandle(id) {
        if (typeof document === 'undefined' || document === null || typeof document.querySelector !== 'function') return
        const target = String(id === undefined || id === null ? '' : id)
        if (target === '') return
        const run = function () {
            const node = document.querySelector('[data-source-handle="' + target.replace(/"/g, '\\"') + '"]')
            if (node !== null && node !== undefined && typeof node.focus === 'function') {
                try {
                    node.focus({ preventScroll: true })
                } catch (err) {
                    try { node.focus() } catch (failure) { void failure }
                }
            }
        }
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run)
        else run()
    }

    function smSourceAnnounce(message) {
        smSourceDialogAnnounce = String(message === undefined || message === null ? '' : message)
        if (typeof setState === 'function') setState({})
    }

    function smSourceReloadMarket() {
        if (typeof loadMarket !== 'function') return
        try {
            const pending = loadMarket({
                q: String(appState.search || ''),
                sort: String(appState.marketSort || 'recommend'),
                refresh: true,
            })
            if (pending !== null && pending !== undefined && typeof pending.catch === 'function') {
                pending.catch(function () { /* 市场区块自行展示错误 */ })
            }
        } catch (err) {
            void err
        }
    }

    /* 乐观重排 + PUT /sources/order；失败时回滚到服务端顺序。 */
    function smSourcePersistOrder(ids, movedId) {
        const order = Array.isArray(ids) ? ids.slice() : []
        if (order.length === 0) return
        const list = smSourceOrderedList()
        const previousOrder = Array.isArray(appState.sourceOrder)
            ? appState.sourceOrder.slice()
            : list.map(function (source) { return String(source.id) })
        let moved = null
        list.forEach(function (source) {
            if (source !== null && typeof source === 'object' && String(source.id) === String(movedId)) moved = source
        })
        const position = order.indexOf(String(movedId))
        const nextSources = smSourceApplyOrder(list, order)
        if (typeof setState === 'function') setState({ sourceOrder: order, sources: nextSources })
        const run = async function () {
            try {
                await api('sources/order', { method: 'PUT', body: { order: order } })
                if (moved !== null && position >= 0) {
                    const name = typeof moved.name === 'string' && moved.name !== '' ? moved.name : String(moved.id)
                    smSourceAnnounce(t('source.orderMoved', { name: name, n: position + 1 }))
                }
                smSourceFocusHandle(movedId)
            } catch (err) {
                void err
                /* 回滚乐观重排，再向服务端对齐一次。 */
                if (typeof setState === 'function') setState({ sourceOrder: previousOrder, sources: list })
                toast(t('error.unexpected'), { tone: 'error' })
                try {
                    if (typeof loadSources === 'function') await loadSources(true)
                } catch (failure) {
                    void failure
                }
            }
        }
        void run()
    }

    /** 键盘替代：Alt+↑ / Alt+↓ 移动一位；首 / 末位不移动。 */
    function moveSource(id, delta) {
        const step = Number(delta)
        if (!Number.isFinite(step) || step === 0) return
        const ids = smSourceOrderedList().map(function (source) {
            return source !== null && typeof source === 'object' ? String(source.id) : ''
        })
        const from = ids.indexOf(String(id))
        if (from < 0) return
        const to = from + (step < 0 ? -1 : 1)
        if (to < 0 || to >= ids.length) {
            smSourceAnnounce(t('source.orderBoundary'))
            return
        }
        ids.splice(from, 1)
        ids.splice(to, 0, String(id))
        smSourcePersistOrder(ids, id)
    }

    /* ------------------------------------------------------------------ *
     * 打开 / 关闭                                                         *
     * ------------------------------------------------------------------ */

    function smSourceDialogEscape(event) {
        if (event === null || event === undefined || event.key !== 'Escape') return
        if (appState.sourceDialogOpen !== true) return
        if (smSourceDialogDrag !== null) return
        /* 上层模态（添加源 / 删除确认）打开时，Esc 只关模态。 */
        if (appState.modal !== null && appState.modal !== undefined) return
        if (typeof document !== 'undefined' && document !== null && typeof document.querySelector === 'function' &&
            document.querySelector('.sm-modal-backdrop') !== null) return
        if (typeof event.preventDefault === 'function') event.preventDefault()
        if (typeof event.stopPropagation === 'function') event.stopPropagation()
        closeSourceDialog()
    }

    function smSourceBindEscape() {
        if (smSourceDialogEscapeBound) return
        if (typeof document === 'undefined' || document === null || typeof document.addEventListener !== 'function') return
        document.addEventListener('keydown', smSourceDialogEscape, true)
        smSourceDialogEscapeBound = true
    }

    function smSourceUnbindEscape() {
        if (!smSourceDialogEscapeBound) return
        if (typeof document !== 'undefined' && document !== null && typeof document.removeEventListener === 'function') {
            document.removeEventListener('keydown', smSourceDialogEscape, true)
        }
        smSourceDialogEscapeBound = false
    }

    function openSourceDialog() {
        if (typeof document !== 'undefined' && document !== null && document.activeElement !== null &&
            document.activeElement !== undefined) {
            smSourceDialogReturnFocus = document.activeElement
        }
        if (typeof setState === 'function') setState({ sourceDialogOpen: true })
        smSourceBindEscape()
        if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(function () {
                if (typeof document === 'undefined' || document === null || typeof document.querySelector !== 'function') return
                const node = document.querySelector('.sm-source-dialog')
                if (node !== null && node !== undefined && typeof node.focus === 'function') {
                    try { node.focus({ preventScroll: true }) } catch (err) { void err }
                }
            })
        }
        if (typeof loadSources === 'function') {
            try {
                const pending = loadSources()
                if (pending !== null && pending !== undefined && typeof pending.catch === 'function') {
                    pending.catch(function () { /* 弹窗内展示错误态 */ })
                }
            } catch (err) {
                void err
            }
        }
    }

    function closeSourceDialog() {
        if (smSourceDialogDrag !== null) smSourceEndDrag(true)
        smSourceUnbindEscape()
        smSourceDialogAnnounce = ''
        smSourceDialogPointer = null
        smSourceDialogBusy = Object.create(null)
        smSourceDialogError = Object.create(null)
        if (typeof setState === 'function') setState({ sourceDialogOpen: false })
        const target = smSourceDialogReturnFocus
        smSourceDialogReturnFocus = null
        if (target !== null && target !== undefined && typeof target.focus === 'function') {
            try {
                target.focus({ preventScroll: true })
            } catch (err) {
                try { target.focus() } catch (failure) { void failure }
            }
        }
    }

    /* ------------------------------------------------------------------ *
     * 行内动作                                                            *
     * ------------------------------------------------------------------ */

    function smSourceRefresh(source) {
        if (source === null || typeof source !== 'object' || !source.id) return
        const id = String(source.id)
        if (smSourceDialogBusy[id] === true) return
        smSourceDialogBusy[id] = true
        delete smSourceDialogError[id]
        if (typeof setState === 'function') setState({})
        const run = async function () {
            try {
                await api('sources/' + encodeURIComponent(id) + '/refresh', { method: 'POST' })
                if (typeof loadSources === 'function') {
                    try { await loadSources(true) } catch (err) { void err }
                }
                smSourceReloadMarket()
            } catch (err) {
                void err
                smSourceDialogError[id] = t('source.error.refreshFailed')
            } finally {
                delete smSourceDialogBusy[id]
                if (typeof setState === 'function') setState({})
            }
        }
        void run()
    }

    function smSourceToggle(source) {
        if (source === null || typeof source !== 'object' || !source.id) return
        const id = String(source.id)
        if (smSourceDialogBusy[id] === true) return
        const nextEnabled = source.enabled === false
        smSourceDialogBusy[id] = true
        delete smSourceDialogError[id]
        if (typeof setState === 'function') setState({})
        const run = async function () {
            try {
                await api('sources/' + encodeURIComponent(id), {
                    method: 'PUT',
                    body: { enabled: nextEnabled },
                })
                if (typeof loadSources === 'function') {
                    try { await loadSources(true) } catch (err) { void err }
                }
                smSourceReloadMarket()
            } catch (err) {
                void err
                smSourceDialogError[id] = t('error.unexpected')
            } finally {
                delete smSourceDialogBusy[id]
                if (typeof setState === 'function') setState({})
            }
        }
        void run()
    }

    function smSourceDelete(source) {
        if (source === null || typeof source !== 'object' || !source.id) return
        if (typeof openModal === 'function') {
            openModal('confirm-remove-source', {
                source: source,
                sourceId: source.id,
                name: source.name,
            })
        }
    }

    /* ------------------------------------------------------------------ *
     * 拖动排序                                                            *
     * ------------------------------------------------------------------ */

    function smSourceDragKey() {
        if (typeof smDragSource !== 'undefined' && smDragSource !== null && typeof smDragSource === 'object' &&
            typeof smDragSource.key === 'string' && smDragSource.key !== '') {
            return smDragSource.key
        }
        return 'application/x-sm-source-id'
    }

    /* 00-prelude 的签名：start(id, event) / over(id, event) / drop() / end()。 */
    function smSourceDragCall(name, first, second) {
        if (typeof smDragSource === 'undefined' || smDragSource === null || typeof smDragSource !== 'object') return undefined
        if (typeof smDragSource[name] !== 'function') return undefined
        try {
            return smDragSource[name](first, second)
        } catch (err) {
            void err
            return undefined
        }
    }

    function smSourceDragKeydown(event) {
        if (event === null || event === undefined || event.key !== 'Escape') return
        if (smSourceDialogDrag === null) return
        if (typeof event.preventDefault === 'function') event.preventDefault()
        if (typeof event.stopPropagation === 'function') event.stopPropagation()
        if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation()
        smSourceEndDrag(true)
    }

    function smSourceBindDragKeys() {
        if (smSourceDialogDragKeysBound) return
        if (typeof document === 'undefined' || document === null || typeof document.addEventListener !== 'function') return
        document.addEventListener('keydown', smSourceDragKeydown, true)
        smSourceDialogDragKeysBound = true
    }

    function smSourceUnbindDragKeys() {
        if (!smSourceDialogDragKeysBound) return
        if (typeof document !== 'undefined' && document !== null && typeof document.removeEventListener === 'function') {
            document.removeEventListener('keydown', smSourceDragKeydown, true)
        }
        smSourceDialogDragKeysBound = false
    }

    function smSourceMoveGhost(x, y) {
        if (typeof document === 'undefined' || document === null || typeof document.getElementById !== 'function') return
        const ghost = document.getElementById('sm-source-ghost')
        if (ghost === null || ghost === undefined || ghost.style === null || ghost.style === undefined) return
        ghost.style.left = (Number(x) || 0) + 12 + 'px'
        ghost.style.top = (Number(y) || 0) + 12 + 'px'
    }

    function smSourceAutoScroll(clientY) {
        if (typeof document === 'undefined' || document === null || typeof document.querySelector !== 'function') return
        const list = document.querySelector('.sm-source-list')
        if (list === null || list === undefined || typeof list.getBoundingClientRect !== 'function') return
        const rect = list.getBoundingClientRect()
        const current = Number(list.scrollTop) || 0
        if (clientY < rect.top + 32) list.scrollTop = Math.max(0, current - 16)
        else if (clientY > rect.bottom - 32) list.scrollTop = current + 16
    }

    function smSourceEndDrag(canceled) {
        const drag = smSourceDialogDrag
        smSourceDialogDrag = null
        smSourceDialogPointer = null
        smSourceUnbindDragKeys()
        smSourceDragCall('end')
        void drag
        void canceled
        if (typeof setState === 'function') setState({})
    }

    function smSourceRowDragStart(event, source) {
        if (source === null || typeof source !== 'object' || !source.id) return
        const id = String(source.id)
        if (smSourceDialogBusy[id] === true) {
            if (typeof event.preventDefault === 'function') event.preventDefault()
            return
        }
        /* 4px 阈值：指针移动不足 4px 时不进入拖动，避免误触。 */
        if (smSourceDialogPointer !== null) {
            const dx = Math.abs((Number(event.clientX) || 0) - smSourceDialogPointer.x)
            const dy = Math.abs((Number(event.clientY) || 0) - smSourceDialogPointer.y)
            if (dx < 4 && dy < 4) {
                if (typeof event.preventDefault === 'function') event.preventDefault()
                return
            }
        }
        const dataTransfer = event.dataTransfer
        if (dataTransfer !== null && dataTransfer !== undefined) {
            dataTransfer.effectAllowed = 'move'
            try {
                dataTransfer.setData(smSourceDragKey(), id)
            } catch (err) {
                void err
            }
        }
        let width = 0
        if (event.currentTarget !== null && event.currentTarget !== undefined &&
            typeof event.currentTarget.getBoundingClientRect === 'function') {
            width = event.currentTarget.getBoundingClientRect().width
        }
        smSourceDialogDrag = {
            id: id,
            overId: null,
            after: false,
            x: Number(event.clientX) || 0,
            y: Number(event.clientY) || 0,
            width: Number(width) || 0,
        }
        smSourceDialogAnnounce = ''
        smSourceDragCall('start', id, event)
        smSourceBindDragKeys()
        if (typeof setState === 'function') setState({})
    }

    function smSourceRowDragOver(event, source) {
        const drag = smSourceDialogDrag
        if (drag === null || source === null || typeof source !== 'object') return
        if (typeof event.preventDefault === 'function') event.preventDefault()
        if (event.dataTransfer !== null && event.dataTransfer !== undefined) event.dataTransfer.dropEffect = 'move'
        drag.x = Number(event.clientX) || drag.x
        drag.y = Number(event.clientY) || drag.y
        smSourceMoveGhost(drag.x, drag.y)
        smSourceAutoScroll(drag.y)
        const targetId = String(source.id)
        if (targetId === drag.id) {
            if (drag.overId !== null) {
                drag.overId = null
                drag.after = false
                smSourceDragCall('over', targetId, event)
                if (typeof setState === 'function') setState({})
            }
            return
        }
        let after = false
        const shared = smSourceDragCall('over', targetId, event)
        if (shared !== null && shared !== undefined && typeof shared === 'object' && typeof shared.after === 'boolean') {
            after = shared.after
        } else if (event.currentTarget !== null && event.currentTarget !== undefined &&
            typeof event.currentTarget.getBoundingClientRect === 'function') {
            const rect = event.currentTarget.getBoundingClientRect()
            after = drag.y > rect.top + rect.height / 2
        }
        if (drag.overId !== targetId || drag.after !== after) {
            drag.overId = targetId
            drag.after = after
            if (typeof setState === 'function') setState({})
        }
    }

    function smSourceRowDrop(event, source) {
        const drag = smSourceDialogDrag
        if (drag === null || source === null || typeof source !== 'object') return
        if (typeof event.preventDefault === 'function') event.preventDefault()
        const shared = smSourceDragCall('drop')
        const fromId = shared !== null && shared !== undefined && typeof shared === 'object' && shared.from !== undefined
            ? String(shared.from)
            : drag.id
        const targetId = shared !== null && shared !== undefined && typeof shared === 'object' && shared.to !== undefined
            ? String(shared.to)
            : String(source.id)
        const after = shared !== null && shared !== undefined && typeof shared === 'object'
            ? shared.after === true
            : drag.after
        smSourceEndDrag(false)
        if (fromId === targetId) return
        const original = smSourceOrderedList().map(function (item) {
            return item !== null && typeof item === 'object' ? String(item.id) : ''
        })
        const ids = original.slice()
        const from = ids.indexOf(fromId)
        if (from < 0) return
        ids.splice(from, 1)
        let to = ids.indexOf(targetId)
        if (to < 0) to = ids.length
        if (after) to += 1
        ids.splice(to, 0, fromId)
        if (ids.join('|') === original.join('|')) return
        smSourcePersistOrder(ids, fromId)
    }

    function smSourceRowDragEnd(event) {
        void event
        if (smSourceDialogDrag === null) return
        smSourceEndDrag(true)
    }

    /* ------------------------------------------------------------------ *
     * 渲染                                                                *
     * ------------------------------------------------------------------ */

    function smSourceStatusDot(source) {
        const id = source !== null && typeof source === 'object' ? String(source.id) : ''
        if (id !== '' && smSourceDialogError[id] !== undefined) {
            return { className: 'sm-dot-warn', tip: t('source.error.refreshFailed') }
        }
        if (source !== null && typeof source === 'object' && source.stale === true) {
            return { className: 'sm-dot-warn', tip: t('source.error.refreshFailed') }
        }
        const status = source !== null && typeof source === 'object' && typeof source.status === 'string'
            ? source.status
            : 'ok'
        if (status === 'error') return { className: 'sm-dot-error', tip: t('source.status.error') }
        if (status === 'checking') return { className: 'sm-dot-warn', tip: t('source.status.checking') }
        return { className: 'sm-dot-ok', tip: t('source.status.ok') }
    }

    function smSourceCheckedText(source) {
        const value = source !== null && typeof source === 'object'
            ? (typeof source.lastCheckedAt === 'number' ? source.lastCheckedAt
                : typeof source.lastChecked === 'number' ? source.lastChecked : 0)
            : 0
        if (value > 0) return t('source.lastChecked', { time: fmtTime(value) })
        return t('source.neverChecked')
    }

    function smSourceHandle(source, total) {
        const id = String(source.id)
        return h('span', {
            key: 'handle',
            className: 'sm-drag-handle sm-source-handle',
            role: 'button',
            tabIndex: 0,
            'data-source-handle': id,
            'aria-label': t('source.dragHandle'),
            'data-tip': t('source.dragHandle'),
            'aria-disabled': total <= 1 ? 'true' : undefined,
            style: {
                width: '16px',
                height: '16px',
                flex: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'grab',
                color: 'var(--dsw-alias-label-tertiary)',
            },
        }, icon('grip', 16))
    }

    function smSourceSwitch(source, frozen) {
        const enabled = source.enabled !== false
        const busy = frozen || smSourceDialogBusy[String(source.id)] === true
        return h('button', {
            key: 'switch',
            type: 'button',
            role: 'switch',
            className: cx('sm-switch', !enabled && 'sm-switch-off'),
            'aria-checked': enabled ? 'true' : 'false',
            'aria-label': enabled ? t('action.disableSource') : t('action.enableSource'),
            'data-tip': enabled ? t('action.disableSource') : t('action.enableSource'),
            'aria-disabled': frozen ? 'true' : undefined,
            disabled: busy,
            draggable: 'false',
            onClick: function (event) {
                if (event !== null && event !== undefined && typeof event.stopPropagation === 'function') event.stopPropagation()
                if (frozen) return
                smSourceToggle(source)
            },
        }, h('span', { className: 'sm-switch-thumb' }))
    }

    function smSourceIconAction(key, iconName, label, onClick, frozen) {
        return h('button', {
            key: key,
            type: 'button',
            className: 'sm-icon-btn',
            'aria-label': label,
            'data-tip': label,
            'aria-disabled': frozen ? 'true' : undefined,
            disabled: frozen,
            draggable: 'false',
            style: { width: '28px', height: '28px' },
            onClick: function (event) {
                if (event !== null && event !== undefined && typeof event.stopPropagation === 'function') event.stopPropagation()
                if (frozen) return
                onClick()
            },
        }, icon(iconName, 14))
    }

    function smSourceRow(source, index, total) {
        const id = String(source.id)
        const frozen = smSourceDialogDrag !== null
        const busy = smSourceDialogBusy[id] === true
        const dot = smSourceStatusDot(source)
        const name = typeof source.name === 'string' && source.name !== '' ? source.name : id
        const count = typeof source.skillCount === 'number' ? source.skillCount : 0
        const remoteError = (typeof source.error === 'string' && source.error !== '') || source.stale === true
        const errorText = smSourceDialogError[id] !== undefined
            ? String(smSourceDialogError[id])
            : remoteError ? t('source.error.refreshFailed') : ''
        const rowNode = h('div', {
            key: 'row-' + id,
            className: cx(
                'sm-source-row',
                'sm-source-item',
                smSourceDialogDrag !== null && smSourceDialogDrag.id === id && 'is-dragging',
                smSourceDialogDrag !== null && smSourceDialogDrag.id === id && 'sm-source-dragging'
            ),
            'data-source-row': id,
            draggable: 'true',
            'aria-label': name,
            onMouseDown: function (event) {
                smSourceDialogPointer = {
                    x: Number(event !== null && event !== undefined ? event.clientX : 0) || 0,
                    y: Number(event !== null && event !== undefined ? event.clientY : 0) || 0,
                }
            },
            onDragStart: function (event) { smSourceRowDragStart(event, source) },
            onDragOver: function (event) { smSourceRowDragOver(event, source) },
            onDrop: function (event) { smSourceRowDrop(event, source) },
            onDragEnd: function (event) { smSourceRowDragEnd(event) },
            onKeyDown: function (event) {
                if (event === null || event === undefined || event.altKey !== true) return
                /* 只接受行本身或拖动手柄上的 Alt+↑/↓，避免在行内按钮上误触。 */
                if (event.target !== event.currentTarget) {
                    const target = event.target
                    const isHandle = target !== null && target !== undefined &&
                        typeof target.getAttribute === 'function' &&
                        target.getAttribute('data-source-handle') !== null
                    if (!isHandle) return
                }
                if (event.key === 'ArrowUp') {
                    if (typeof event.preventDefault === 'function') event.preventDefault()
                    moveSource(id, -1)
                } else if (event.key === 'ArrowDown') {
                    if (typeof event.preventDefault === 'function') event.preventDefault()
                    moveSource(id, 1)
                }
            },
            style: {
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderBottom: '1px solid var(--dsw-alias-border-l2)',
                minHeight: '56px',
                opacity: smSourceDialogDrag !== null && smSourceDialogDrag.id === id ? 0.5 : 1,
            },
        },
        smSourceHandle(source, total),
        h('span', {
            className: cx('sm-dot', dot.className),
            'data-tip': dot.tip,
            title: dot.tip,
            style: { position: 'static', flex: 'none' },
        }),
        h('div', {
            className: 'sm-source-name-wrap',
            style: { flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' },
        },
        h('span', {
            className: 'sm-source-name',
            title: name,
            style: {
                fontSize: 'var(--sm-fs)',
                fontWeight: 500,
                color: 'var(--dsw-alias-label-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
            },
        }, name),
        h('span', {
            className: 'sm-source-meta',
            style: { fontSize: 'calc(var(--sm-fs) - 3px)', color: 'var(--dsw-alias-label-caption)' },
        }, smSourceCheckedText(source))),
        h('span', {
            className: 'sm-badge sm-mono',
            style: { flex: 'none' },
        }, t('source.skillCount', { count: count })),
        h('div', {
            className: 'sm-source-actions',
            style: { display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 },
        },
        smSourceSwitch(source, frozen),
        smSourceIconAction('refresh', 'refresh', t('action.refresh'), function () {
            smSourceRefresh(source)
        }, frozen || busy),
        smSourceIconAction('delete', 'trash', t('action.deleteSource'), function () {
            smSourceDelete(source)
        }, frozen)))
        if (errorText === '') return rowNode
        const errorNode = h('div', {
            key: 'error-' + id,
            className: 'sm-source-error sm-source-error-row',
            role: 'alert',
            style: {
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 12px 10px 38px',
                color: 'var(--dsw-alias-state-error-primary)',
                fontSize: 'calc(var(--sm-fs) - 3px)',
                lineHeight: 1.5,
            },
        },
        icon('alert', 14),
        h('span', { className: 'sm-ellipsis', style: { flex: '1 1 auto', minWidth: 0 } }, errorText),
        h('button', {
            type: 'button',
            className: 'sm-btn sm-btn-ghost sm-btn-sm',
            disabled: frozen || busy,
            onClick: function (event) {
                if (event !== null && event !== undefined && typeof event.stopPropagation === 'function') event.stopPropagation()
                smSourceRefresh(source)
            },
        }, t('action.retry')))
        return h(Fragment, { key: 'item-' + id }, rowNode, errorNode)
    }

    function smSourceDropIndicator(key) {
        return h('div', {
            key: key,
            className: 'sm-drop-indicator sm-drop-line',
            'aria-hidden': 'true',
            style: {
                height: '2px',
                margin: '0 0 0 26px',
                background: 'var(--dsw-alias-state-business-primary)',
                flex: 'none',
            },
        })
    }

    function smSourceRows(list) {
        const nodes = []
        const drag = smSourceDialogDrag
        list.forEach(function (source, index) {
            if (source === null || typeof source !== 'object') return
            const id = String(source.id)
            if (drag !== null && drag.overId === id && drag.after !== true) {
                nodes.push(smSourceDropIndicator('drop-before-' + id))
            }
            nodes.push(smSourceRow(source, index, list.length))
            if (drag !== null && drag.overId === id && drag.after === true) {
                nodes.push(smSourceDropIndicator('drop-after-' + id))
            }
        })
        return nodes
    }

    function smSourceSkeletonRow(index) {
        return h('div', {
            key: 'sk-' + String(index),
            className: 'sm-source-row',
            'aria-hidden': 'true',
            style: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', minHeight: '56px' },
        },
        h('span', { className: 'sm-skeleton', style: { width: '16px', height: '16px', flex: 'none' } }),
        h('div', {
            className: 'sm-source-name-wrap',
            style: { flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px' },
        },
        h('span', { className: 'sm-skeleton', style: { maxWidth: '180px' } }),
        h('span', { className: 'sm-skeleton', style: { maxWidth: '120px', minHeight: '10px' } })))
    }

    function smSourceDialogBody(list, scopedError, loading) {
        if (list.length > 0) {
            return h('div', {
                className: 'sm-source-list',
                style: {
                    display: 'flex',
                    flexDirection: 'column',
                    overflowY: 'auto',
                    minHeight: 0,
                    flex: '1 1 auto',
                    paddingRight: '2px',
                    userSelect: smSourceDialogDrag !== null ? 'none' : 'auto',
                },
            }, smSourceRows(list))
        }
        if (loading) {
            return h('div', {
                className: 'sm-source-list',
                'aria-busy': 'true',
                style: { display: 'flex', flexDirection: 'column', overflowY: 'auto', minHeight: 0, flex: '1 1 auto' },
            }, [smSourceSkeletonRow(0), smSourceSkeletonRow(1), smSourceSkeletonRow(2)])
        }
        if (scopedError !== null) {
            return h('div', {
                className: 'sm-empty',
                style: { padding: '24px 12px' },
            },
            h('div', { className: 'sm-empty-icon' }, icon('alert', 32)),
            h('div', { className: 'sm-empty-title' }, t('state.error.sources.title')),
            h('div', { className: 'sm-empty-body' }, t('state.error.sources.body')),
            h('div', { className: 'sm-empty-actions' },
                h('button', {
                    type: 'button',
                    className: 'sm-btn sm-btn-primary sm-btn-sm',
                    onClick: function () {
                        if (typeof loadSources !== 'function') return
                        try {
                            const pending = loadSources(true)
                            if (pending !== null && pending !== undefined && typeof pending.catch === 'function') {
                                pending.catch(function () { /* 错误态保留 */ })
                            }
                        } catch (err) {
                            void err
                        }
                    },
                }, t('action.retry'))))
        }
        return h('div', {
            className: 'sm-empty',
            style: { padding: '24px 12px' },
        },
        h('div', { className: 'sm-empty-icon' }, icon('sources', 32)),
        h('div', { className: 'sm-empty-title' }, t('empty.sources.title')),
        h('div', { className: 'sm-empty-body' }, t('empty.sources.body')))
    }

    function smSourceGhost() {
        if (smSourceDialogDrag === null) return null
        let source = null
        const list = smSourceOrderedList()
        for (let index = 0; index < list.length; index += 1) {
            if (list[index] !== null && typeof list[index] === 'object' && String(list[index].id) === smSourceDialogDrag.id) {
                source = list[index]
                break
            }
        }
        if (source === null) return null
        const name = typeof source.name === 'string' && source.name !== '' ? source.name : String(source.id)
        const count = typeof source.skillCount === 'number' ? source.skillCount : 0
        return h('div', {
            key: 'ghost',
            id: 'sm-source-ghost',
            className: 'sm-source-ghost',
            'aria-hidden': 'true',
            style: {
                position: 'fixed',
                left: smSourceDialogDrag.x + 12 + 'px',
                top: smSourceDialogDrag.y + 12 + 'px',
                width: smSourceDialogDrag.width > 0 ? smSourceDialogDrag.width + 'px' : undefined,
                zIndex: 1400,
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 10px',
                borderRadius: 'var(--dsw-radius-sm)',
                border: '0.5px solid var(--dsw-alias-border-l2)',
                background: 'var(--dsw-alias-bg-layer-2)',
                fontSize: 'calc(var(--sm-fs) - 1px)',
                color: 'var(--dsw-alias-label-primary)',
            },
        },
        h('span', { className: 'sm-mono' }, name),
        h('span', { className: 'sm-caption sm-muted' }, t('source.skillCount', { count: count })))
    }

    function renderSourceDialog() {
        if (appState.sourceDialogOpen !== true) return null
        const list = smSourceOrderedList()
        const scopedError = appState.error !== null && typeof appState.error === 'object' && appState.error.scope === 'sources'
            ? appState.error
            : null
        const loading = appState.loadingSources === true ||
            (appState.loading !== null && typeof appState.loading === 'object' && appState.loading.sources === true)
        const dragging = smSourceDialogDrag !== null

        const head = h('div', {
            key: 'head',
            className: 'sm-dialog-head',
            style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                padding: '16px 20px',
                borderBottom: '0.5px solid var(--dsw-alias-border-l2)',
                flex: 'none',
            },
        },
        h('div', {
            key: 'title',
            className: 'sm-dialog-head-left',
            style: { display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 },
        },
        h('span', {
            className: 'sm-dialog-title',
            style: { fontSize: 'calc(var(--sm-fs) + 2px)', fontWeight: 500, color: 'var(--dsw-alias-label-primary)' },
        }, t('source.title')),
        h('span', { className: 'sm-badge' }, String(list.length))),
        h('button', {
            key: 'close',
            type: 'button',
            className: 'sm-icon-btn',
            'aria-label': t('action.close'),
            'data-tip': t('action.close'),
            onClick: closeSourceDialog,
        }, icon('x', 16)))

        const body = h('div', {
            key: 'body',
            className: 'sm-dialog-body',
            style: {
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                padding: '12px 20px 16px',
                minHeight: 0,
                flex: '1 1 auto',
                overflow: 'hidden',
            },
        },
        smSourceDialogBody(list, scopedError, loading),
        h('div', { key: 'live', className: 'sm-sr-only', 'aria-live': 'polite' }, smSourceDialogAnnounce))

        const foot = h('div', {
            key: 'foot',
            className: 'sm-dialog-foot',
            style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '8px',
                padding: '12px 20px',
                borderTop: '0.5px solid var(--dsw-alias-border-l2)',
                flex: 'none',
            },
        },
        h('button', {
            key: 'add',
            type: 'button',
            className: 'sm-btn sm-btn-secondary sm-btn-sm',
            disabled: dragging,
            onClick: function () {
                if (typeof openModal === 'function') openModal('add-source', {})
            },
        }, icon('plus', 15), t('action.addSource')))

        const dialog = h('div', {
            key: 'dialog',
            className: 'sm-source-dialog sm-dialog',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': t('source.title'),
            tabIndex: -1,
            style: {
                width: 'min(720px, 100vw - 32px)',
                // A list dialog needs room even with one source; 480 keeps the
                // empty space reasonable while still growing to 720 for many rows.
                minHeight: 'min(480px, 100vh - 96px)',
                maxHeight: 'min(720px, 100vh - 96px)',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                borderRadius: 'var(--dsw-radius-panel)',
                border: '0.5px solid var(--dsw-alias-border-inverted)',
                background: 'var(--dsw-alias-bg-layer-1)',
                boxShadow: 'none',
            },
        }, head, body, foot)

        const mask = h('div', {
            key: 'mask',
            className: 'sm-dialog-mask',
            style: {
                position: 'fixed',
                inset: 0,
                zIndex: 1200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
                background: 'var(--dsw-alias-bg-mask-1, rgba(0, 0, 0, 0.5))',
            },
            onMouseDown: function (event) {
                if (event === null || event === undefined) return
                if (event.target !== event.currentTarget) return
                if (smSourceDialogDrag !== null) return
                closeSourceDialog()
            },
        }, dialog)

        return h(Fragment, null, mask, smSourceGhost())
    }
// ===== 40-detail.js =====
    /* ------------------------------------------------------------------ *
     * 40-detail.js — 页内双栏详情（契约 v2 §5.2 / §7.3，交互 SD-01～SD-04）。*
     *                                                                    *
     * 左栏：这个技能做什么 / 什么时候用 / SKILL.md 预览与编辑入口。      *
     * 右栏：状态与来源 / 操作。                                          *
     * 主界面只保留用户能据此行动的信息，内部实现细节一律不展示。         *
     * ------------------------------------------------------------------ */

    const SM_MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
    const SM_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

    /* 保存到：三个用户箱子，映射到 Host 的安装位置。 */
    const SM_SAVE_TARGETS = [
        { id: 'user-dsh', category: 'mine', labelKey: 'tab.category.mine' },
        { id: 'user-agents', category: 'shared', labelKey: 'tab.category.shared' },
        { id: 'project-dsh', category: 'project', labelKey: 'tab.category.project' },
    ]

    const SM_CATEGORY_LABEL_KEYS = {
        mine: 'tab.category.mine',
        shared: 'tab.category.shared',
        project: 'tab.category.project',
        system: 'tab.category.system',
    }

    /* ------------------------------------------------------------------ *
     * 基础工具（50-modals.js 共用）。                                     *
     * ------------------------------------------------------------------ */

    function smText(value, fallback) {
        if (typeof value === 'string' && value !== '') return value
        return fallback === undefined || fallback === null ? '' : String(fallback)
    }

    function smNumber(value, fallback) {
        return typeof value === 'number' && Number.isFinite(value) ? value : fallback
    }

    /** Contract §3.5：技能列表在 appState.skills。 */
    function smSkillList() {
        return Array.isArray(appState.skills) ? appState.skills : []
    }

    function smFindSkillById(id) {
        const key = smText(id)
        if (key === '') return null
        const list = smSkillList()
        for (let index = 0; index < list.length; index += 1) {
            if (list[index] !== null && typeof list[index] === 'object' && list[index].id === key) return list[index]
        }
        const separator = key.indexOf(':')
        if (separator !== -1) {
            const location = key.slice(0, separator)
            const name = key.slice(separator + 1)
            for (let index = 0; index < list.length; index += 1) {
                const skill = list[index]
                if (skill !== null && typeof skill === 'object' && skill.name === name && skill.location === location) return skill
            }
        }
        return null
    }

    function smFindSkillByName(name) {
        const key = smText(name)
        if (key === '') return null
        const list = smSkillList()
        for (let index = 0; index < list.length; index += 1) {
            if (list[index] !== null && typeof list[index] === 'object' && list[index].name === key) return list[index]
        }
        return null
    }

    function smFindActiveSkillByName(name) {
        const key = smText(name)
        if (key === '') return null
        const list = smSkillList()
        let fallback = null
        for (let index = 0; index < list.length; index += 1) {
            const skill = list[index]
            if (skill === null || typeof skill !== 'object' || skill.name !== key) continue
            if (skill.status === 'active') return skill
            if (fallback === null) fallback = skill
        }
        return fallback
    }

    /** 市场详情定位键：兼容 {sourceId,name} 与 `source:name` 形式的 id。 */
    function smMarketKey(detail) {
        const input = detail !== null && typeof detail === 'object' ? detail : {}
        let sourceId = smText(input.sourceId)
        let name = smText(input.name)
        const id = smText(input.id)
        if (id.indexOf(':') !== -1) {
            const separator = id.indexOf(':')
            if (sourceId === '') sourceId = id.slice(0, separator)
            if (name === '') name = id.slice(separator + 1)
        }
        if (name === '') name = id
        return { sourceId: sourceId, name: name }
    }

    function smCategoryForLocation(location) {
        const id = smText(location)
        if (id === 'project-dsh' || id === 'project-agents') return 'project'
        if (id === 'user-agents') return 'shared'
        if (id === 'preset' || id === 'bundled') return 'system'
        return 'mine'
    }

    function smSkillCategory(skill) {
        if (skill === null || typeof skill !== 'object') return ''
        const declared = smText(skill.category)
        if (declared !== '') return declared
        return smCategoryForLocation(skill.location)
    }

    function smCategoryLabel(category) {
        const key = SM_CATEGORY_LABEL_KEYS[smText(category)]
        return key === undefined ? '' : t(key)
    }

    /** 只有 Harness 自带的预设 / 插件内置算「系统内置」；只读自定义目录仍是「只读」。 */
    function smIsBuiltin(skill) {
        if (skill === null || typeof skill !== 'object') return false
        return skill.location === 'preset' || skill.location === 'bundled'
    }

    function smIsReadonly(skill) {
        if (skill === null || typeof skill !== 'object') return true
        return skill.writable !== true
    }

    function smIsDisabled(skill) {
        return skill !== null && typeof skill === 'object' && skill.status === 'disabled'
    }

    function smIsBroken(skill) {
        if (skill === null || typeof skill !== 'object') return false
        return skill.status === 'broken' || skill.status === 'invalid' || skill.status === 'shadowed'
    }

    function smProjectAvailable() {
        if (typeof appState.cwd === 'string' && appState.cwd !== '') return true
        return smSkillList().some(function (skill) {
            return skill !== null && typeof skill === 'object' && smSkillCategory(skill) === 'project'
        })
    }

    function smSaveTargets() {
        return SM_SAVE_TARGETS.map(function (target) {
            return {
                value: target.id,
                category: target.category,
                label: t(target.labelKey),
                disabled: target.id === 'project-dsh' && !smProjectAvailable(),
                hint: target.id === 'project-dsh' && !smProjectAvailable() ? t('form.projectUnavailable') : '',
            }
        })
    }

    function smSkillLocalModified(skill) {
        if (skill === null || typeof skill !== 'object') return false
        if (skill.localModified === true) return true
        if (skill.market !== null && typeof skill.market === 'object' && skill.market.localModified === true) return true
        return false
    }

    /** 用户语言的错误文案；技术细节不进入主界面。 */
    function smErrorMessage(failure) {
        const code = failure !== null && failure !== undefined && typeof failure.code === 'string' ? failure.code : ''
        const keys = {
            E_UNAUTHORIZED: 'error.unauthorized',
            E_SERVICE: 'error.service',
            E_READ: 'error.read',
            E_READONLY_LOCATION: 'error.readonly',
            E_NOT_FOUND: 'error.notFound',
            E_PATH_OUTSIDE_ROOT: 'error.pathOutside',
            E_SOURCE_SCHEMA: 'error.sourceSchema',
            E_INDEX_INVALID: 'error.indexInvalid',
            E_INDEX_VERSION: 'error.indexInvalid',
            E_SOURCE_HTTP: 'source.error.fetch',
            E_SOURCE_TOO_LARGE: 'error.tooLarge',
            E_SOURCE_URL_INVALID: 'source.error.invalidUrl',
            E_SKILL_UNKNOWN: 'error.notFound',
            E_NAME_MISMATCH: 'form.name.invalid',
            E_VERSION_MUTATED: 'error.versionUnknown',
            E_VERSION_YANKED: 'market.yanked',
            E_CHECKSUM: 'error.checksum',
            E_NOT_ENOUGH_SPACE: 'error.notEnoughSpace',
            E_CANCELED: 'error.canceled',
            E_TOO_LARGE: 'error.tooLarge',
            E_VERSION_UNKNOWN: 'error.versionUnknown',
            E_NO_COMPATIBLE: 'error.noCompatible',
            E_STALE: 'error.stalePage',
            E_STALE_PAGE: 'error.stalePage',
            E_INTERNAL: 'error.generic',
            E_CONFLICT_MTIME: 'form.mtimeConflict',
            E_NAME_TAKEN: 'form.name.taken',
            E_NAME_INVALID: 'form.name.invalid',
            E_FRONTMATTER: 'form.import.invalid',
            E_SOURCE_UNREACHABLE: 'source.error.fetch',
            E_BAD_REQUEST: 'error.unexpected',
        }
        if (code !== '' && keys[code] !== undefined) {
            const key = keys[code]
            if (key === 'form.import.invalid') return t(key, { reason: t('error.unexpected') })
            return t(key)
        }
        return t('error.unexpected')
    }

    /** 复制路径；成功与失败都走 toast，不静默。 */
    function smCopyText(value, successMessage) {
        const text = value === null || value === undefined ? '' : String(value)
        if (text === '') return
        const done = function () {
            toast(successMessage === undefined || successMessage === null ? t('detail.copiedPath') : String(successMessage))
        }
        try {
            if (typeof navigator !== 'undefined' && navigator !== null && navigator.clipboard !== undefined
                && navigator.clipboard !== null && typeof navigator.clipboard.writeText === 'function') {
                navigator.clipboard.writeText(text).then(done, function () {
                    toast(t('toast.copyFailed'), { tone: 'error' })
                })
                return
            }
        } catch (failure) {
            /* fall through to the visible failure toast */
        }
        toast(t('toast.copyFailed'), { tone: 'error' })
    }

    /* ------------------------------------------------------------------ *
     * 共享小组件。                                                       *
     * ------------------------------------------------------------------ */

    function SmButton(props) {
        const tone = props.tone === undefined || props.tone === null ? 'secondary' : String(props.tone)
        const disabled = props.disabled === true
        /* 带原因的禁用按钮用 aria-disabled 而不是原生 disabled，保证 hover / focus 能看到原因。 */
        const explain = disabled && props.tip !== undefined && props.tip !== null && props.tip !== ''
        const base = {
            type: 'button',
            className: cx('sm-btn', 'sm-btn-' + tone, props.className),
            disabled: explain ? undefined : disabled,
            'aria-disabled': disabled ? 'true' : undefined,
            tabIndex: explain ? 0 : undefined,
            onClick: explain
                ? function (event) {
                    if (event !== null && event !== undefined) {
                        if (typeof event.preventDefault === 'function') event.preventDefault()
                        if (typeof event.stopPropagation === 'function') event.stopPropagation()
                    }
                }
                : props.onClick,
            style: Object.assign(
                {
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    height: '32px',
                    /* DSH plugin-page buttons: 0 12 padding, 12px radius. */
                    padding: '0 12px',
                    borderRadius: '12px',
                    fontSize: 'calc(var(--sm-fs) - 1px)',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.55 : 1,
                },
                props.style || {},
            ),
        }
        if (props.tip !== undefined && props.tip !== null && props.tip !== '' && typeof smTip === 'function') {
            Object.assign(base, smTip(props.tip))
            base['aria-label'] = String(props.tip)
        }
        return h('button', base, props.icon ? icon(props.icon, 14) : null, props.children)
    }

    function SmBadge(props) {
        const tone = props.tone === undefined || props.tone === null ? '' : String(props.tone)
        return h('span', {
            className: cx('sm-badge', tone !== '' && 'sm-badge-' + tone, props.className),
            'data-tip': props.tip,
        }, props.children)
    }

    function SmCard(props) {
        return h('section', {
            className: cx('sm-card', props.className),
            style: Object.assign({ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }, props.style || {}),
        }, props.children)
    }

    function SmCardTitle(props) {
        return h('div', { className: 'sm-card-title', style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', minWidth: 0 } },
            h('span', { style: { fontSize: 'var(--sm-fs)', fontWeight: 500, color: 'var(--dsw-alias-label-primary)' } }, props.children),
            props.extra === undefined || props.extra === null ? null : props.extra)
    }

    function SmMetaRow(props) {
        return h('div', { className: 'sm-meta-row', style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' } },
            h('span', { className: 'sm-meta-label', style: { flexShrink: 0, color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, props.label),
            h('span', {
                className: cx('sm-meta-value', props.mono === true && 'sm-mono'),
                style: {
                    minWidth: 0,
                    textAlign: 'right',
                    wordBreak: 'break-all',
                    color: 'var(--dsw-alias-label-primary)',
                    fontSize: 'calc(var(--sm-fs) - 1px)',
                },
            }, props.children))
    }

    /** 带行号的只读代码块。 */
    function SmCodeBlock(props) {
        const text = typeof props.text === 'string' ? props.text : ''
        const lines = text === '' ? [''] : text.split('\n')
        return h('div', {
            className: 'sm-code',
            style: { maxHeight: props.maxHeight || '420px', overflow: 'auto', padding: '12px', borderRadius: '14px', background: 'var(--dsw-alias-bg-base)', border: '1px solid var(--dsw-alias-border-l1)' },
        },
        h('table', { className: 'sm-mono', style: { width: '100%', borderCollapse: 'collapse', fontFamily: SM_MONO, fontSize: 'calc(var(--sm-fs) - 2px)', lineHeight: '20px' } },
            h('tbody', null, lines.map(function (line, index) {
                return h('tr', { key: index },
                    h('td', { style: { width: '32px', paddingRight: '12px', textAlign: 'right', verticalAlign: 'top', userSelect: 'none', color: 'var(--dsw-alias-label-caption)' } }, String(index + 1)),
                    h('td', { style: { whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--dsw-alias-label-primary)' } }, line === '' ? ' ' : line))
            }))))
    }

    /* ------------------------------------------------------------------ *
     * 详情数据。                                                         *
     * ------------------------------------------------------------------ */

    function smDetailSignature(detail) {
        if (detail === null || typeof detail !== 'object') return 'none'
        return [smText(detail.kind, 'installed'), smText(detail.id), smText(detail.sourceId), smText(detail.name), String(smNumber(detail.reload, 0))].join('|')
    }

    function smGoBackToList() {
        const kind = appState.detail !== null && typeof appState.detail === 'object' && appState.detail.kind === 'market' ? 'market' : 'skills'
        setState({ view: 'list', detail: null, tab: kind })
        if (typeof restoreListScroll === 'function') restoreListScroll()
    }

    /** 保存 / 删除 / 停用后让详情重新读取文件。 */
    function smRefreshDetail() {
        const detail = appState.detail
        if (detail === null || typeof detail !== 'object') return
        setState({ detail: Object.assign({}, detail, { reload: smNumber(detail.reload, 0) + 1 }) })
    }

    /** `t()` returns the key itself when the dictionary lacks it. */
    function smLocaleKeyOr(primaryKey, fallbackKey) {
        if (typeof t === 'function' && t(primaryKey) !== primaryKey) return primaryKey
        return fallbackKey
    }

    function smStatusLabelKey(skill) {
        if (smIsBuiltin(skill)) return 'detail.status.builtin'
        /* `detail.status.disabled` / `detail.status.readonly` are not in the
         * dictionary yet (owned by another fragment); fall back to the badge
         * labels so the detail header never shows a raw key. */
        if (smIsDisabled(skill)) return smLocaleKeyOr('detail.status.disabled', 'badge.disabled')
        if (smIsBroken(skill)) return 'detail.status.issue'
        if (smIsReadonly(skill)) return smLocaleKeyOr('detail.status.readonly', 'badge.readonly')
        return 'detail.status.active'
    }

    function smStatusTone(skill) {
        if (smIsBuiltin(skill) || smIsDisabled(skill) || smIsReadonly(skill)) return 'idle'
        if (smIsBroken(skill)) return 'warn'
        return 'ok'
    }

    function smStatusNote(skill) {
        if (skill === null || typeof skill !== 'object') return ''
        if (smIsBuiltin(skill)) return t('detail.builtinNote')
        if (smIsDisabled(skill)) return t('detail.disabledNote')
        if (smIsBroken(skill)) return smText(skill.brokenReason, t('detail.status.issue'))
        if (smIsReadonly(skill)) return t('detail.readonlyNote')
        return ''
    }

    /** 源展示名：优先市场区块，其次源列表，最后回退 id。 */
    function smSourceNameById(sourceId) {
        const id = smText(sourceId)
        if (id === '') return ''
        const blocks = Array.isArray(appState.marketSources) ? appState.marketSources : []
        for (let index = 0; index < blocks.length; index += 1) {
            const block = blocks[index]
            if (block !== null && typeof block === 'object' && smText(block.sourceId) === id && smText(block.name) !== '') return smText(block.name)
        }
        const sources = Array.isArray(appState.sources) ? appState.sources : []
        for (let index = 0; index < sources.length; index += 1) {
            const source = sources[index]
            if (source !== null && typeof source === 'object' && smText(source.id) === id && smText(source.name) !== '') return smText(source.name)
        }
        return id
    }

    /** 详情右侧「来源」：只说来自市场、本地文件或 Harness 自带。 */
    function smSourceLabel(skill) {
        if (skill === null || typeof skill !== 'object') return t('detail.source.local')
        if (smIsBuiltin(skill)) return t('detail.status.builtin')
        const sourceId = smText(skill.sourceId)
        const sourceName = smText(skill.sourceName, smSourceNameById(sourceId))
        if (sourceId !== '' || sourceName !== '') return t('detail.source.market', { source: sourceName })
        return t('detail.source.local')
    }

    /** 详情里只展示源名，不重复「来自市场」这层前缀。 */
    function smSourceShort(skill) {
        if (skill === null || typeof skill !== 'object') return t('detail.source.local')
        if (smIsBuiltin(skill)) return t('detail.status.builtin')
        const sourceId = smText(skill.sourceId)
        const sourceName = smText(skill.sourceName, smSourceNameById(sourceId))
        if (sourceId !== '' || sourceName !== '') return sourceName
        return t('detail.source.local')
    }

    function smSkillVersion(skill) {
        if (skill === null || typeof skill !== 'object') return ''
        const version = smText(skill.version)
        if (version === '') return ''
        return version.charAt(0) === 'v' ? version : 'v' + version
    }

    function smSkillUpdateVersion(skill) {
        if (skill === null || typeof skill !== 'object') return ''
        if (typeof skillUpdateVersion === 'function') return smText(skillUpdateVersion(skill))
        return smText(skill.updateAvailable)
    }

    /**
     * 界面语言下的技能描述：Host 在市场索引里提供 `descriptionByLocale`
     * （`{ en, zh }`）时按 `appState.locale` 选择（zh* 用 zh，其它用 en）；
     * 字段缺失或所选语言为空时回退 SKILL.md 的单语 `description`。
     * 列表卡片（10-skills.js）与详情页共用这一个选择函数。
     */
    function smSkillDescription(skill) {
        if (skill === null || typeof skill !== 'object') return ''
        const byLocale = skill.descriptionByLocale
        if (byLocale !== null && typeof byLocale === 'object') {
            const locale = String(appState.locale === undefined || appState.locale === null ? '' : appState.locale).toLowerCase()
            const localized = locale.indexOf('zh') === 0 ? smText(byLocale.zh) : smText(byLocale.en)
            if (localized !== '') return localized
        }
        return smText(skill.description)
    }

    /* ------------------------------------------------------------------ *
     * 详情页。                                                           *
     * ------------------------------------------------------------------ */

    /**
     * 整页骨架：标题 + 左栏 2 个卡片占位 + 右栏 1 个卡片占位。
     * 市场详情在拿到 `{ skill, content }` 之前只渲染这一块，避免框架先出、
     * 内容卡片后补导致的整页跳动。浅色块不带动画，避免加载期额外开销。
     */
    function SmDetailSkeleton() {
        const block = function (width, height, radius) {
            return h('div', {
                style: {
                    width: width,
                    height: height,
                    borderRadius: radius === undefined ? '10px' : radius,
                    background: 'var(--dsw-alias-bg-layer-2)',
                },
            })
        }
        const card = function (key, children) {
            return h('div', {
                key: key,
                style: {
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    padding: '16px',
                    borderRadius: '16px',
                    border: '1px solid var(--dsw-alias-border-l2)',
                    background: 'var(--dsw-alias-bg-layer-1)',
                },
            }, children)
        }
        return h('div', {
            className: 'sm-detail sm-detail-skeleton',
            'aria-busy': 'true',
            style: { display: 'flex', flexDirection: 'column', gap: '24px' },
        },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '14px', paddingBottom: '20px', borderBottom: '1px solid var(--dsw-alias-border-l2)' } },
                block('56px', '56px', '16px'),
                h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } }, block('220px', '20px'), block('140px', '14px'))),
            h('div', { className: 'sm-detail-body' },
                h('div', { className: 'sm-detail-main' },
                    card('desc', block('40%', '16px'), block('100%', '96px')),
                    card('content', block('32%', '16px'), block('100%', '240px'))),
                h('div', { className: 'sm-detail-side' },
                    card('meta', block('50%', '16px'), block('100%', '168px')))),
            h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 1px)' } }, t('state.loading')))
    }

    function SmDetailErrorState(props) {
        return h('div', { className: 'sm-card sm-detail-error', style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '56px 20px', textAlign: 'center' } },
            h('span', { style: { color: 'var(--dsw-alias-state-error-primary)' } }, icon('alert', 28)),
            h('div', { style: { fontSize: 'var(--sm-fs)', fontWeight: 500, color: 'var(--dsw-alias-label-primary)' } }, t('state.error.detail.title')),
            h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, props.message ? String(props.message) : t('state.error.detail.body')),
            h(SmButton, { tone: 'secondary', onClick: props.onRetry }, t('action.retry')))
    }

    function SmDetailHeader(props) {
        const skill = props.skill
        const version = smSkillVersion(skill)
        return h('div', { className: 'sm-detail-head', style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', paddingBottom: '20px', borderBottom: '1px solid var(--dsw-alias-border-l2)' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 } },
                h('div', {
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
                        opacity: smIsDisabled(skill) ? 0.6 : 1,
                    },
                }, icon(skillIconName(skill), 28)),
                h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } },
                        h('h2', { className: 'sm-mono sm-detail-title', style: { margin: 0, fontSize: 'calc(var(--sm-fs) + 2px)', lineHeight: '1.4', fontWeight: 500, color: 'var(--dsw-alias-label-primary)' } }, props.name),
                        version !== '' ? h('span', { className: 'sm-mono', style: { color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, version) : null,
                        props.badge !== undefined && props.badge !== null ? props.badge : null),
                    props.subtitle !== undefined && props.subtitle !== null && props.subtitle !== ''
                        ? h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, props.subtitle)
                        : null)),
            h('div', { className: 'sm-detail-actions', style: { display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' } }, props.children))
    }

    function SmDetailBack(props) {
        return h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' } },
            h('button', {
                type: 'button',
                className: 'sm-detail-back',
                onClick: smGoBackToList,
                style: { height: '28px', padding: '0 8px', border: 'none', background: 'transparent', color: 'var(--dsw-alias-label-tertiary)', fontSize: 'calc(var(--sm-fs) - 1.5px)', cursor: 'pointer' },
            }, '← ' + (props.kind === 'market' ? t('action.back.market') : t('action.back.skills'))),
            props.extra === undefined || props.extra === null ? null : props.extra)
    }

    function SmInstalledDetail(props) {
        const detail = props.detail
        const skill = props.skill
        const name = smText(skill.name, smText(detail.name, smText(detail.id)))
        const description = smSkillDescription(skill)
        const whenToUse = smText(skill.whenToUse)
        const path = smText(skill.path)
        const writable = !smIsReadonly(skill) && !smIsBuiltin(skill)
        const builtin = smIsBuiltin(skill)
        const disabled = smIsDisabled(skill)
        const statusKey = smStatusLabelKey(skill)
        const statusNote = smStatusNote(skill)
        const updateVersion = smSkillUpdateVersion(skill)
        const readonlyReason = builtin ? t('detail.builtinNote') : t('detail.readonlyNote')

        const [content, setContent] = useState('')
        const [contentMtime, setContentMtime] = useState(smNumber(skill.mtime, 0))
        const [contentState, setContentState] = useState(path === '' ? 'none' : 'loading')
        const [contentError, setContentError] = useState('')
        const autoEdit = useRef(detail.edit === true)
        const alive = useRef(true)

        useEffect(function () {
            alive.current = true
            return function () { alive.current = false }
        }, [])

        const loadContent = useCallback(function () {
            if (path === '') {
                setContentState('none')
                return
            }
            setContentState('loading')
            setContentError('')
            api('skill?path=' + encodeURIComponent(path)).then(function (payload) {
                if (!alive.current) return
                setContent(payload !== null && typeof payload === 'object' && typeof payload.content === 'string' ? payload.content : '')
                if (payload !== null && typeof payload === 'object' && payload.skill !== null && typeof payload.skill === 'object') {
                    setContentMtime(smNumber(payload.skill.mtime, smNumber(skill.mtime, 0)))
                }
                setContentState('ready')
            }).catch(function (failure) {
                if (!alive.current) return
                setContentError(smErrorMessage(failure))
                setContentState('error')
            })
        }, [path])

        useEffect(function () {
            loadContent()
        }, [loadContent])

        const openEditor = function () {
            if (!writable || disabled) return
            openModal('edit-content', {
                skill: skill,
                name: name,
                path: path,
                mtime: contentMtime,
                content: contentState === 'ready' ? content : undefined,
            })
        }

        useEffect(function () {
            if (!autoEdit.current) return
            autoEdit.current = false
            if (writable && !disabled && contentState === 'ready') openEditor()
        }, [contentState, writable])

        const setEnabled = function (nextEnabled) {
            if (!writable || path === '') return Promise.resolve()
            return api('skill/state', { method: 'POST', body: { path: path, enabled: nextEnabled } }).then(function () {
                void loadInstalled(true)
                smRefreshDetail()
            })
        }

        const toggleState = function () {
            if (!writable || path === '') return
            setEnabled(disabled).then(function () {
                toast(disabled ? t('toast.enabled', { name: name }) : t('toast.disabled', { name: name }), {
                    actionLabel: t('action.undo'),
                    duration: 8000,
                    onAction: function () {
                        setEnabled(!disabled).catch(function (failure) {
                            toast(smErrorMessage(failure), { tone: 'error' })
                        })
                    },
                })
            }).catch(function (failure) {
                toast(smErrorMessage(failure), { tone: 'error' })
            })
        }

        const actions = []
        if (updateVersion !== '') {
            actions.push(h(SmButton, {
                key: 'update',
                tone: 'primary',
                icon: 'arrow-up-dot',
                disabled: disabled || !writable,
                tip: disabled ? t('detail.disabledNote') : (writable ? '' : readonlyReason),
                onClick: function () { openModal('update', { skill: skill }) },
            }, t('market.updateTo', { version: (updateVersion.charAt(0) === 'v' ? '' : 'v') + updateVersion })))
        }
        actions.push(h(SmButton, {
            key: 'toggle',
            tone: 'secondary',
            icon: 'power',
            disabled: !writable || path === '',
            tip: !writable ? readonlyReason : (path === '' ? t('detail.location.builtin') : ''),
            onClick: toggleState,
        }, disabled ? t('action.enable') : t('action.disable')))
        const removeKind = smText(skill.sourceId) !== '' ? 'uninstall' : 'delete'
        actions.push(h(SmButton, {
            key: 'remove',
            tone: 'danger',
            icon: 'trash',
            disabled: !writable || path === '',
            tip: !writable ? readonlyReason : (path === '' ? t('detail.location.builtin') : ''),
            onClick: function () { openModal(removeKind, { skill: skill }) },
        }, removeKind === 'uninstall' ? t('action.uninstall') : t('action.delete')))

        // Icon-only actions with 300ms tooltips: copy the body, or edit in place.
        const previewActions = h('div', { style: { display: 'flex', alignItems: 'center', gap: '4px' } },
            contentState === 'ready'
                ? h('button', {
                    type: 'button',
                    className: 'sm-icon-btn',
                    'aria-label': t('action.copy'),
                    'data-tip': t('action.copy'),
                    onClick: function () {
                        smCopyText(content, t('toast.copied'))
                        openModal('preview', { name: name, content: content })
                    },
                }, icon('copy', 16))
                : null,
            h('button', {
                type: 'button',
                className: 'sm-icon-btn',
                'aria-label': t('action.edit'),
                'data-tip': disabled ? t('detail.disabledNote') : (!writable ? readonlyReason : (path === '' ? t('detail.location.builtin') : t('action.edit'))),
                disabled: disabled || !writable || path === '',
                onClick: openEditor,
            }, icon('edit', 16)))

        const badge = h(SmBadge, { tone: smStatusTone(skill) }, t(statusKey))

        return h('div', { className: 'sm-detail-page sm-scroll' },
            h(SmDetailBack, { kind: 'installed' }),
            h(SmDetailHeader, {
                skill: skill,
                name: name,
                badge: badge,
                subtitle: smSourceShort(skill) + ' · ' + t('detail.updated', { time: fmtTime(smNumber(skill.mtime, 0)) }),
            }, actions),
            h('div', { className: 'sm-detail sm-detail-body' },
                h('div', { className: 'sm-detail-main' },
                    statusNote !== ''
                        ? h('div', { className: 'sm-banner', style: { padding: '10px 14px', borderRadius: '12px', background: 'var(--dsw-alias-bg-layer-2)', color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)', lineHeight: '1.5' } }, statusNote)
                        : null,
                    h(SmCard, { className: 'sm-detail-desc' },
                        h(SmCardTitle, null, t('detail.descTitle')),
                        h('div', { style: { color: 'var(--dsw-alias-label-primary)', fontSize: 'var(--sm-fs)', lineHeight: '1.55' } }, description !== '' ? description : '—')),
                    whenToUse !== ''
                        ? h(SmCard, { className: 'sm-detail-when' },
                            h(SmCardTitle, null, t('detail.whenToUse')),
                            h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 1px)', lineHeight: '1.5' } }, whenToUse))
                        : null,
                    h(SmCard, { className: 'sm-detail-content' },
                        h(SmCardTitle, { extra: previewActions }, 'SKILL.md'),
                        contentState === 'loading'
                            ? h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 1px)' } }, t('state.loading'))
                            : contentState === 'error'
                                ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
                                    h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 1px)' } }, contentError),
                                    h(SmButton, { tone: 'secondary', style: { alignSelf: 'flex-start' }, onClick: loadContent }, t('action.retry')))
                                : contentState === 'none'
                                    ? h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 1px)' } }, t('detail.location.builtin'))
                                    : content === ''
                                        ? h('div', { style: { color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 1px)' } }, t('detail.content.empty'))
                                        : h(SmCodeBlock, { text: content.split('\n').slice(0, 40).join('\n'), maxHeight: '360px' }))),
                h('div', { className: 'sm-detail-side' },
                    h(SmCard, { className: 'sm-detail-meta' },
                        h(SmCardTitle, { extra: badge }, t('market.source')),
                        h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
                            smSkillVersion(skill) !== '' ? h(SmMetaRow, { label: t('detail.version'), mono: true }, smSkillVersion(skill)) : null,
                            smText(skill.author) !== '' ? h(SmMetaRow, { label: t('detail.author') }, smText(skill.author)) : null,
                            h(SmMetaRow, { label: t('market.source') }, smSourceShort(skill)),
                            h(SmMetaRow, { label: t('sort.modified') }, fmtTime(smNumber(skill.mtime, 0))),
                            h(SmMetaRow, { label: t('detail.location'), mono: path !== '' },
                                path !== ''
                                    ? h('span', { className: 'sm-detail-path' },
                                        h('span', { className: 'sm-mono sm-detail-path-text', 'data-tip': path }, path),
                                        h('button', {
                                            type: 'button',
                                            className: 'sm-icon-btn sm-detail-path-copy',
                                            'aria-label': t('action.copyPath'),
                                            'data-tip': t('action.copyPath'),
                                            onClick: function () { smCopyText(path) },
                                        }, icon('copy', 16)))
                                    : t('detail.location.builtin'))))))
        )
    }

    function SmMarketDetail(props) {
        const detail = props.detail
        const key = smMarketKey(detail)
        const [data, setData] = useState(props.marketSkill)
        /* 首帧一律骨架：索引里的 `marketSkill` 只有摘要、没有 SKILL.md 正文，
         * 若先渲染它，正文卡片会在请求返回后再补进来，造成整页跳动。 */
        const [loading, setLoading] = useState(true)
        const [error, setError] = useState('')
        const alive = useRef(true)
        const installed = props.installed

        useEffect(function () {
            alive.current = true
            return function () { alive.current = false }
        }, [])

        const load = useCallback(function () {
            const sourceId = smText(key.sourceId, data !== null && data !== undefined ? smText(data.sourceId) : '')
            const name = smText(key.name, data !== null && data !== undefined ? smText(data.name) : '')
            if (sourceId === '' || name === '') {
                setLoading(false)
                setError(t('error.notFound'))
                return
            }
            setLoading(true)
            setError('')
            api('market/skill?sourceId=' + encodeURIComponent(sourceId) + '&name=' + encodeURIComponent(name)).then(function (payload) {
                if (!alive.current) return
                setData(payload !== null && typeof payload === 'object' ? payload : null)
                setLoading(false)
            }).catch(function (failure) {
                if (!alive.current) return
                setError(smErrorMessage(failure))
                setLoading(false)
            })
        }, [key.sourceId, key.name])

        useEffect(function () {
            load()
        }, [load])

        /* 整页骨架 → 整页内容，中间不插入任何卡片。 */
        if (loading) {
            return h('div', { className: 'sm-detail-page sm-scroll' },
                h(SmDetailBack, { kind: 'market' }),
                h(SmDetailSkeleton))
        }
        if (data === null || typeof data !== 'object') {
            return h('div', { className: 'sm-detail-page sm-scroll' },
                h(SmDetailBack, { kind: 'market' }),
                h(SmDetailErrorState, { message: error, onRetry: load }))
        }

        const market = data.skill !== null && data.skill !== undefined && typeof data.skill === 'object' ? data.skill : data
        /* 详情正文：优先 Host 返回的 SKILL.md 原文（data.content），旧数据回退 README。 */
        const content = smText(data.content, smText(data.readme))
        const contentError = smText(data.contentError, error)
        const name = smText(market.name, key.name)
        const version = smSkillVersion(market)
        const sourceName = smText(market.sourceName, smText(detail.sourceName, smSourceNameById(smText(market.sourceId, key.sourceId))))
        const homepage = smText(market.homepage)
        const installedSkill = installed
        const updateVersion = installedSkill !== null ? smSkillUpdateVersion(installedSkill) : smText(market.updateAvailable)
        const installedNow = installedSkill !== null || market.installed === true
        const writable = installedSkill !== null && !smIsReadonly(installedSkill) && !smIsBuiltin(installedSkill)

        const actions = []
        if (!installedNow) {
            actions.push(h(SmButton, {
                key: 'install',
                tone: 'primary',
                icon: 'download',
                onClick: function () { openModal('install', { sourceId: smText(market.sourceId, key.sourceId), name: name, version: smText(market.version), skill: market }) },
            }, t('action.install')))
        } else {
            if (updateVersion !== '') {
                actions.push(h(SmButton, {
                    key: 'update',
                    tone: 'primary',
                    icon: 'arrow-up-dot',
                    disabled: installedSkill === null,
                    onClick: function () { openModal('update', { skill: installedSkill }) },
                }, t('market.updateTo', { version: (updateVersion.charAt(0) === 'v' ? '' : 'v') + updateVersion })))
            }
            actions.push(h(SmButton, {
                key: 'edit',
                tone: 'secondary',
                icon: 'edit',
                disabled: !writable,
                tip: writable ? '' : (smIsBuiltin(installedSkill) ? t('detail.builtinNote') : t('detail.readonlyNote')),
                onClick: function () {
                    const path = installedSkill !== null ? smText(installedSkill.path) : ''
                    if (path === '') return
                    openModal('edit-content', { skill: installedSkill, name: name, path: path, mtime: smNumber(installedSkill.mtime, 0) })
                },
            }, t('action.edit')))
            actions.push(h(SmButton, {
                key: 'uninstall',
                tone: 'danger',
                icon: 'trash',
                disabled: !writable,
                tip: writable ? '' : (smIsBuiltin(installedSkill) ? t('detail.builtinNote') : t('detail.readonlyNote')),
                onClick: function () { openModal('uninstall', { skill: installedSkill, name: name }) },
            }, t('action.uninstall')))
        }

        return h('div', { className: 'sm-detail-page sm-scroll' },
            h(SmDetailBack, { kind: 'market' }),
            h(SmDetailHeader, {
                skill: market,
                name: name,
                badge: installedNow ? h(SmBadge, { tone: 'ok' }, t('market.installed')) : null,
                subtitle: smText(market.author) + (smText(market.author) !== '' ? ' · ' : '') + t('detail.source.market', { source: sourceName }),
            }, actions),
            h('div', { className: 'sm-detail sm-detail-body' },
                h('div', { className: 'sm-detail-main' },
                    h(SmCard, null,
                        h(SmCardTitle, null, t('market.detailDesc')),
                        h('div', { style: { color: 'var(--dsw-alias-label-primary)', fontSize: 'var(--sm-fs)', lineHeight: '1.55' } }, smText(smSkillDescription(market), '—'))),
                    /* 正文卡片始终占位（即使正文为空），保证骨架与内容页结构一致。 */
                    h(SmCard, { className: 'sm-detail-content' },
                        h(SmCardTitle, {
                            extra: content !== ''
                                ? h('button', {
                                    type: 'button',
                                    className: 'sm-icon-btn',
                                    'aria-label': t('action.copy'),
                                    'data-tip': t('action.copy'),
                                    onClick: function () {
                                        smCopyText(content, t('toast.copied'))
                                        openModal('preview', { name: name, content: content })
                                    },
                                }, icon('copy', 16))
                                : null,
                        }, 'SKILL.md'),
                        content !== ''
                            ? h(SmCodeBlock, { text: content.split('\n').slice(0, 40).join('\n'), maxHeight: '420px' })
                            : h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 1px)' } },
                                contentError !== '' ? t('source.error.fetch') : t('detail.content.empty')))),
                h('div', { className: 'sm-detail-side' },
                    h(SmCard, null,
                        h(SmCardTitle, {
                            extra: smNumber(market.publishTimestamp, 0) > 0
                                ? h('span', { style: { fontSize: 'calc(var(--sm-fs) - 3px)', color: 'var(--dsw-alias-label-caption)', whiteSpace: 'nowrap' } }, t('market.published', { time: fmtTime(market.publishTimestamp) }))
                                : null,
                        }, t('market.source')),
                        h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
                            h(SmMetaRow, { label: t('market.source') }, sourceName || smSourceShort(market)),
                            version !== '' ? h(SmMetaRow, { label: t('market.version'), mono: true }, version) : null,
                            smText(market.author) !== '' ? h(SmMetaRow, { label: t('market.author') }, smText(market.author)) : null,
                            smText(market.license) !== '' ? h(SmMetaRow, { label: t('market.license') }, smText(market.license)) : null,
                            homepage !== ''
                                ? h(SmMetaRow, { label: t('market.homepage'), mono: true },
                                    h('span', { className: 'sm-detail-path', style: { maxWidth: '100%' } },
                                        h('span', { className: 'sm-mono sm-detail-path-text', 'data-tip': homepage }, homepage),
                                        h('button', {
                                            type: 'button',
                                            className: 'sm-icon-btn sm-detail-path-copy',
                                            'aria-label': t('action.copyPath'),
                                            'data-tip': t('action.copyPath'),
                                            onClick: function () { smCopyText(homepage) },
                                        }, icon('copy', 14))))
                                : null,
                            smText(market.enginesDsh) !== '' ? h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, t('market.engines', { range: smText(market.enginesDsh) })) : null,

                            installedNow ? h(SmMetaRow, { label: t('market.installed') }, installedSkill !== null ? fmtTime(smNumber(installedSkill.mtime, 0)) : t('market.installed')) : null)))
            )
        )
    }

    function SmDetailView(props) {
        const detail = props.detail !== null && typeof props.detail === 'object' ? props.detail : {}
        const kind = detail.kind === 'market' ? 'market' : 'installed'
        const skill = kind === 'installed'
            ? (smFindSkillById(detail.id) || smFindSkillByName(detail.name))
            : null
        const marketSkill = kind === 'market' ? smFindMarketSkill(detail) : null
        const installedCopy = kind === 'market' ? smFindInstalledCopy(marketSkill, detail) : null

        useEffect(function () {
            const onKeyDown = function (event) {
                if (event.key !== 'Escape') return
                if (typeof smHasOpenOverlay === 'function' && smHasOpenOverlay()) return
                if (appState.modal !== null && appState.modal !== undefined) return
                event.preventDefault()
                event.stopPropagation()
                smGoBackToList()
            }
            document.addEventListener('keydown', onKeyDown, true)
            return function () { document.removeEventListener('keydown', onKeyDown, true) }
        }, [])

        if (kind === 'installed' && (skill === null || typeof skill !== 'object')) {
            return h('div', { className: 'sm-detail-page sm-scroll' },
                h(SmDetailBack, { kind: 'installed' }),
                h(SmDetailErrorState, { message: '', onRetry: function () { void loadInstalled(true) } }))
        }

        if (kind === 'market') {
            return h(SmMarketDetail, { detail: detail, marketSkill: marketSkill, installed: installedCopy })
        }

        return h(SmInstalledDetail, { detail: detail, skill: skill })
    }

    function smFindMarketSkill(detail) {
        const key = smMarketKey(detail)
        const sourceId = key.sourceId
        const name = key.name
        const blocks = Array.isArray(appState.marketSources) ? appState.marketSources : []
        for (let blockIndex = 0; blockIndex < blocks.length; blockIndex += 1) {
            const block = blocks[blockIndex]
            if (block === null || typeof block !== 'object' || !Array.isArray(block.skills)) continue
            for (let index = 0; index < block.skills.length; index += 1) {
                const item = block.skills[index]
                if (item === null || typeof item !== 'object') continue
                if (sourceId !== '' && item.sourceId !== sourceId) continue
                if (item.name === name) return item
            }
        }
        return null
    }

    function smFindInstalledCopy(marketSkill, detail) {
        const key = smMarketKey(detail)
        const sourceId = smText(marketSkill !== null && marketSkill !== undefined ? marketSkill.sourceId : key.sourceId)
        const name = smText(marketSkill !== null && marketSkill !== undefined ? marketSkill.name : key.name)
        const list = smSkillList()
        let fallback = null
        for (let index = 0; index < list.length; index += 1) {
            const skill = list[index]
            if (skill === null || typeof skill !== 'object' || skill.name !== name) continue
            if (sourceId !== '' && skill.sourceId === sourceId) return skill
            if (fallback === null) fallback = skill
        }
        return sourceId === '' ? fallback : null
    }

    /** Entry point used by the page shell when `appState.view === 'detail'`. */
    function renderDetailPage() {
        const detail = appState.detail
        if (detail === null || typeof detail !== 'object') return null
        return h(SmDetailView, { key: smDetailSignature(detail), detail: detail })
    }
// ===== 50-modals.js =====
    /* ------------------------------------------------------------------ *
     * 50-modals.js — 十类模态、诊断抽屉、toast 与 tooltip。               *
     *                                                                    *
     * 宽度档（契约 §5.3 / §7.7）：                                        *
     *   488  new-skill / import-skill / install / add-source             *
     *   480  update / uninstall / delete / confirm-remove-source         *
     *   720  edit-content / preview                                      *
     * 无阴影、遮罩透明、Escape 分层、dialogStack 式的最上层优先。         *
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

    const SM_MODAL_WIDTH = {
        'new-skill': 488,
        'import-skill': 488,
        install: 488,
        'add-source': 488,
        update: 480,
        uninstall: 480,
        delete: 480,
        'confirm-remove-source': 480,
        'edit-content': 720,
        preview: 720,
    }

    /* ------------------------------------------------------------------ *
     * 模态栈、Escape 分层与滚动锁。                                       *
     * ------------------------------------------------------------------ */

    const smModalStack = []
    const smModalGuards = new Map()
    let smModalSeq = 0
    let smScrollLockCount = 0

    /** Element to restore focus to when the modal closes. */
    function smActiveElement() {
        if (typeof document === 'undefined' || document === null) return null
        const active = document.activeElement
        if (active === null || active === undefined || active === document.body) return null
        return active
    }

    function smRestoreFocus(node) {
        if (node === null || node === undefined || typeof node.focus !== 'function') return
        if (typeof document === 'undefined' || document === null) return
        if (typeof document.contains === 'function' && document.contains(node) !== true) return
        const run = function () {
            try {
                node.focus({ preventScroll: true })
            } catch (failure) {
                try { node.focus() } catch (ignored) { void ignored }
            }
        }
        /* Wait one frame so the trigger exists after the modal unmounts. */
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run)
        else setTimeout(run, 0)
    }

    const smDiagnostics = {
        open: false,
        loading: false,
        error: null,
        data: null,
    }

    function smLockScroll() {
        if (typeof document === 'undefined' || document === null || document.body === undefined || document.body === null) return
        smScrollLockCount += 1
        if (smScrollLockCount === 1) document.body.style.overflow = 'hidden'
    }

    function smUnlockScroll() {
        if (smScrollLockCount <= 0) return
        smScrollLockCount -= 1
        if (smScrollLockCount === 0 && typeof document !== 'undefined' && document !== null && document.body !== undefined && document.body !== null) {
            document.body.style.overflow = ''
        }
    }

    function smSyncModalState() {
        const top = smModalStack.length > 0 ? smModalStack[smModalStack.length - 1] : null
        appState.modal = top === null ? null : { kind: top.kind, payload: top.payload }
    }

    function smNormalizeModalKind(kind, payload) {
        const name = String(kind === undefined || kind === null ? '' : kind)
        if (name === 'new') return 'new-skill'
        if (name === 'import') return 'import-skill'
        if (name === 'confirm-uninstall') return 'uninstall'
        if (name === 'remove-source' || name === 'delete-source') return 'confirm-remove-source'
        if (name === 'confirm-delete') {
            const mode = payload !== null && typeof payload === 'object' ? String(payload.mode === undefined ? payload.kind : payload.mode) : ''
            if (mode === 'uninstall') return 'uninstall'
            if (mode === 'delete') return 'delete'
            const skill = payload !== null && typeof payload === 'object' ? payload.skill : null
            if (skill !== null && typeof skill === 'object' && smText(skill.sourceId) !== '') return 'uninstall'
            return 'delete'
        }
        return name
    }

    function openModal(kind, payload) {
        const source = payload !== null && typeof payload === 'object' ? payload : {}
        const name = smNormalizeModalKind(kind, source)
        smModalSeq += 1
        smModalStack.push({ id: smModalSeq, kind: name, payload: source, returnFocus: smActiveElement() })
        smLockScroll()
        smHideTooltip()
        smSyncModalState()
        if (typeof rerender === 'function') rerender()
    }

    function smRemoveModalById(id) {
        let removed = null
        let wasTop = false
        for (let index = smModalStack.length - 1; index >= 0; index -= 1) {
            if (smModalStack[index].id !== id) continue
            wasTop = index === smModalStack.length - 1
            removed = smModalStack.splice(index, 1)[0]
            smModalGuards.delete(id)
            smUnlockScroll()
            break
        }
        smHideTooltip()
        smSyncModalState()
        if (typeof rerender === 'function') rerender()
        if (wasTop && removed !== null) smRestoreFocus(removed.returnFocus)
    }

    /** 强制关闭最上层；提交成功后的路径使用它。 */
    function closeModal() {
        if (smModalStack.length === 0) return
        smRemoveModalById(smModalStack[smModalStack.length - 1].id)
    }

    /** 用户触发的关闭（Esc / 取消 / 遮罩）：先询问模态自己的守卫。 */
    function smRequestCloseModal(id) {
        const target = id === undefined || id === null ? (smModalStack.length > 0 ? smModalStack[smModalStack.length - 1] : null) : smModalStack[smModalStack.length - 1]
        if (target === null || target === undefined) return
        const guard = smModalGuards.get(target.id)
        if (typeof guard === 'function') {
            try {
                if (guard() === true) return
            } catch (failure) {
                /* a failing guard must not trap the user */
            }
        }
        smRemoveModalById(target.id)
    }

    function smHasOpenOverlay() {
        return smModalStack.length > 0 || smDiagnostics.open === true || appState.sourceDialogOpen === true || (appState.modal !== null && appState.modal !== undefined)
    }

    function smHandleEscape(event) {
        if (event.key !== 'Escape') return
        /* 更早注册的层（例如管理源弹窗）已经处理过这一层。 */
        if (event.defaultPrevented === true) return
        if (smModalStack.length > 0) {
            event.preventDefault()
            event.stopPropagation()
            if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation()
            smRequestCloseModal()
            return
        }
        /* 管理源弹窗叠在诊断抽屉之上时，先让 30-source-dialog 处理这一层。 */
        if (appState.sourceDialogOpen === true) return
        if (smDiagnostics.open === true) {
            event.preventDefault()
            event.stopPropagation()
            if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation()
            smCloseDiagnostics()
        }
    }

    function smFocusableIn(node) {
        if (node === null || node === undefined || typeof node.querySelectorAll !== 'function') return []
        const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        return Array.prototype.slice.call(node.querySelectorAll(selector)).filter(function (item) {
            if (item.disabled === true) return false
            if (item.getAttribute('aria-hidden') === 'true') return false
            return true
        })
    }

    /** 管理源弹窗的 Tab 循环：首尾互跳，焦点不逃出对话框。 */
    function smHandleSourceDialogTab(event) {
        if (event.key !== 'Tab') return
        if (appState.sourceDialogOpen !== true) return
        /* 上层模态打开时，由 SmDialogFrame 自己的焦点锁定接管。 */
        if (smModalStack.length > 0) return
        if (typeof document === 'undefined' || document === null || typeof document.querySelector !== 'function') return
        const node = document.querySelector('.sm-source-dialog')
        if (node === null) return
        const focusable = smFocusableIn(node)
        if (focusable.length === 0) {
            if (typeof event.preventDefault === 'function') event.preventDefault()
            if (typeof node.focus === 'function') {
                try { node.focus({ preventScroll: true }) } catch (failure) { void failure }
            }
            return
        }
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        const index = focusable.indexOf(document.activeElement)
        if (event.shiftKey) {
            if (index <= 0) {
                if (typeof event.preventDefault === 'function') event.preventDefault()
                last.focus()
            }
        } else if (index === -1 || index === focusable.length - 1) {
            if (typeof event.preventDefault === 'function') event.preventDefault()
            first.focus()
        }
    }

    if (typeof document !== 'undefined' && document !== null && typeof document.addEventListener === 'function') {
        document.addEventListener('keydown', smHandleEscape, true)
        document.addEventListener('keydown', smHandleSourceDialogTab, true)
    }

    /** 注册 Esc / 遮罩关闭守卫；返回 true 表示组件自己处理了这次关闭。 */
    function smUseModalGuard(modalId, handler) {
        const ref = useRef(handler)
        ref.current = handler
        useEffect(function () {
            const guard = function () {
                const fn = ref.current
                if (typeof fn !== 'function') return false
                try {
                    return fn() === true
                } catch (failure) {
                    return false
                }
            }
            smModalGuards.set(modalId, guard)
            return function () { smModalGuards.delete(modalId) }
        }, [modalId])
    }

    function renderModalLayer() {
        if (smModalStack.length === 0) return null
        return h(Fragment, null, smModalStack.map(function (entry, index) {
            return h(SmModalHost, {
                key: String(entry.id),
                entry: entry,
                isTop: index === smModalStack.length - 1,
                layerIndex: index,
            })
        }))
    }

    function SmModalHost(props) {
        const entry = props.entry
        const shared = { modalId: entry.id, isTop: props.isTop === true, layerIndex: props.layerIndex, payload: entry.payload }
        if (entry.kind === 'new-skill') return h(SmNewSkillModal, shared)
        if (entry.kind === 'import-skill') return h(SmImportModal, shared)
        if (entry.kind === 'install') return h(SmInstallModal, shared)
        if (entry.kind === 'update') return h(SmUpdateModal, shared)
        if (entry.kind === 'uninstall') return h(SmUninstallModal, shared)
        if (entry.kind === 'delete') return h(SmDeleteModal, shared)
        if (entry.kind === 'add-source') return h(SmAddSourceModal, shared)
        if (entry.kind === 'edit-content') return h(SmEditContentModal, shared)
        if (entry.kind === 'preview') return h(SmPreviewModal, shared)
        if (entry.kind === 'confirm-remove-source') return h(SmConfirmRemoveSourceModal, shared)
        return h(SmDialogFrame, {
            isTop: props.isTop === true,
            layerIndex: props.layerIndex,
            width: 480,
            confirm: true,
            title: t('error.unexpected'),
            footer: h(SmFooter, null),
        }, h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 1px)' } }, t('error.unexpected')))
    }

    /* ------------------------------------------------------------------ *
     * Toast host（读取 appState.toasts；同一时刻只显示最新一条）。        *
     * ------------------------------------------------------------------ */

    function smNormalizeToast(item, index) {
        if (typeof item === 'string') return { id: 'ext-' + String(index), message: item, tone: 'info', actionLabel: '', onAction: null }
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

    function renderToastHost() {
        if (!Array.isArray(appState.toasts) || appState.toasts.length === 0) return null
        const normalized = smNormalizeToast(appState.toasts[appState.toasts.length - 1], appState.toasts.length - 1)
        if (normalized === null) return null
        const toneColor = normalized.tone === 'error'
            ? 'var(--dsw-alias-state-error-primary)'
            : (normalized.tone === 'info' ? 'var(--dsw-alias-label-secondary)' : 'var(--dsw-alias-state-success-primary)')
        return h('div', {
            className: 'sm-toast-host',
            style: { position: 'fixed', left: '50%', bottom: '20px', transform: 'translateX(-50%)', zIndex: 2100, display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 'min(480px, calc(100vw - 32px))', pointerEvents: 'none' },
        },
        h('div', {
            className: 'sm-toast sm-toast-' + normalized.tone,
            role: 'status',
            'aria-live': 'polite',
            style: { display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '100%', padding: '10px 14px', borderRadius: '12px', background: 'var(--dsw-alias-bg-layer-3)', color: 'var(--dsw-alias-label-primary)', fontSize: 'calc(var(--sm-fs) - 1px)', lineHeight: '18px', boxShadow: 'none', pointerEvents: 'auto' },
        },
        h('span', { style: { flexShrink: 0, color: toneColor } }, icon(normalized.tone === 'error' ? 'alert' : (normalized.tone === 'info' ? 'info' : 'check'), 16)),
        h('span', { style: { minWidth: 0, wordBreak: 'break-word' } }, normalized.message),
        normalized.actionLabel !== '' && normalized.onAction !== null
            ? h('button', {
                type: 'button',
                className: 'sm-toast-action',
                onClick: function () {
                    try {
                        normalized.onAction()
                    } finally {
                        smDismissToast(normalized.id)
                    }
                },
                style: { flexShrink: 0, height: '24px', padding: '0 6px', border: 'none', background: 'transparent', color: 'var(--dsw-alias-label-primary)', fontSize: 'calc(var(--sm-fs) - 1px)', fontWeight: 500, cursor: 'pointer' },
            }, normalized.actionLabel)
            : null))
    }

    function smDismissToast(id) {
        if (!Array.isArray(appState.toasts)) return
        const next = appState.toasts.filter(function (item) { return item !== null && item !== undefined && item.id !== id })
        if (next.length === appState.toasts.length) return
        appState.toasts = next
        if (typeof rerender === 'function') rerender()
    }

    /* ------------------------------------------------------------------ *
     * Tooltip：反色、300ms、元素 id 固定 `tooltip`（选择器 #tooltip）。    *
     * ------------------------------------------------------------------ */

    const smTooltipState = { timer: null, target: null, label: '', node: null }

    function smEnsureTooltipNode() {
        if (typeof document === 'undefined' || document === null) return null
        if (smTooltipState.node !== null && document.body.contains(smTooltipState.node)) return smTooltipState.node
        const node = document.createElement('div')
        node.id = 'tooltip'
        node.className = 'sm-tooltip'
        node.setAttribute('role', 'tooltip')
        node.style.cssText = 'position:fixed;left:0;top:0;z-index:2000;max-width:290px;padding:6px 10px;border-radius:var(--dsw-radius-sm);border:none;background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-3);font-size:calc(var(--sm-fs) - 4px);line-height:1.35;box-shadow:none;pointer-events:none;opacity:0;visibility:hidden;white-space:normal;'
        const root = document.querySelector('.sm-root')
        let scale = ''
        if (root !== null && typeof getComputedStyle === 'function') scale = getComputedStyle(root).getPropertyValue('--sm-fs').trim()
        node.style.setProperty('--sm-fs', scale !== '' ? scale : '14px')
        document.body.appendChild(node)
        smTooltipState.node = node
        return node
    }

    function smHideTooltip() {
        if (smTooltipState.timer !== null) {
            clearTimeout(smTooltipState.timer)
            smTooltipState.timer = null
        }
        smTooltipState.target = null
        smTooltipState.label = ''
        if (smTooltipState.node !== null && smTooltipState.node !== undefined) {
            /* 样式表里 `.sm-tooltip.visible` 会把 opacity 拉回 1，必须移除。 */
            if (smTooltipState.node.classList !== null && smTooltipState.node.classList !== undefined &&
                typeof smTooltipState.node.classList.remove === 'function') {
                smTooltipState.node.classList.remove('visible')
                smTooltipState.node.classList.remove('show')
            }
            smTooltipState.node.style.opacity = '0'
            smTooltipState.node.style.visibility = 'hidden'
        }
    }

    /** 目标被卸载时 mouseout 不会触发：渲染提交后主动核对一次。 */
    function smHideTooltipIfTargetGone() {
        const target = smTooltipState.target
        if (target === null || target === undefined) return
        if (typeof document === 'undefined' || document === null) {
            smHideTooltip()
            return
        }
        const body = document.body
        if (body !== null && body !== undefined && typeof body.contains === 'function' && body.contains(target)) return
        smHideTooltip()
    }

    function smPlaceTooltip() {
        const target = smTooltipState.target
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
        node.textContent = smTooltipState.label
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
        smTooltipState.target = target
        smTooltipState.label = text
        smTooltipState.timer = setTimeout(function () {
            smTooltipState.timer = null
            smPlaceTooltip()
        }, 300)
    }

    function smTip(label) {
        const text = label === null || label === undefined ? '' : String(label)
        if (text === '') return {}
        return {
            onMouseEnter: function (event) { smScheduleTooltip(text, event.currentTarget) },
            onMouseLeave: function () { smHideTooltip() },
            onMouseDown: function () { smHideTooltip() },
            onFocus: function (event) { smScheduleTooltip(text, event.currentTarget) },
            onBlur: function () { smHideTooltip() },
        }
    }

    function SmTooltipLifecycle() {
        useEffect(function () {
            smEnsureTooltipNode()
            return function () {
                smHideTooltip()
                if (smTooltipState.node !== null && smTooltipState.node.parentNode !== null && smTooltipState.node.parentNode !== undefined) {
                    smTooltipState.node.parentNode.removeChild(smTooltipState.node)
                }
                smTooltipState.node = null
            }
        }, [])
        return null
    }

    /** 每次渲染提交后核对 hover 目标是否还在 DOM 中（卸载后 mouseout 不触发）。 */
    function SmTooltipGuard() {
        useEffect(function () {
            smHideTooltipIfTargetGone()
        })
        return null
    }

    function renderTooltipLayer() {
        return h(Fragment, null, h(SmTooltipLifecycle), h(SmTooltipGuard))
    }

    /* ------------------------------------------------------------------ *
     * 弹窗外壳与表单原语。                                               *
     * ------------------------------------------------------------------ */

    function SmDialogFrame(props) {
        const confirm = props.confirm === true
        /* 三档：480 确认 / 488 表单 / 720 大内容。 */
        const width = props.width === 720 ? 720
            : (props.width === 480 ? 480 : 488)
        const layerIndex = typeof props.layerIndex === 'number' ? props.layerIndex : 0
        const boxRef = useRef(null)
        const close = function () {
            if (typeof props.onRequestClose === 'function') props.onRequestClose()
            else smRequestCloseModal(props.modalId)
        }

        useEffect(function () {
            const node = boxRef.current
            if (node === null || typeof node.querySelector !== 'function') return
            let field = node.querySelector('input, textarea, select')
            if (field === null) field = node.querySelector('button')
            if (field !== null && typeof field.focus === 'function') {
                try {
                    field.focus({ preventScroll: true })
                } catch (failure) {
                    /* focus is best effort */
                }
            }
        }, [])

        const onKeyDown = function (event) {
            if (typeof props.onKeyDown === 'function' && props.onKeyDown(event) === true) return
            if (event.key !== 'Tab') return
            const node = boxRef.current
            if (node === null || typeof node.querySelectorAll !== 'function') return
            const focusable = Array.prototype.slice.call(node.querySelectorAll('button, input, textarea, select, [tabindex="0"]'))
                .filter(function (item) { return item.disabled !== true && item.getAttribute('aria-hidden') !== 'true' })
            if (focusable.length === 0) return
            const first = focusable[0]
            const last = focusable[focusable.length - 1]
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault()
                last.focus()
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault()
                first.focus()
            }
        }

        /* 每档都不超过视口（两侧各留 16px），窄窗口下跟着 100vw - 32px 收缩。 */
        const widthStyle = 'min(' + String(width) + 'px, calc(100vw - 32px))'
        const maxHeightStyle = width === 720
            ? 'min(720px, calc(100vh - 96px))'
            : 'calc(100vh - 48px)'

        return h('div', {
            className: 'sm-dialog-mask sm-modal-backdrop',
            style: { position: 'fixed', inset: 0, zIndex: 1300 + layerIndex * 2, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'var(--dsw-alias-bg-mask-1, rgba(0, 0, 0, 0.5))' },
            onMouseDown: function (event) {
                if (event.target !== event.currentTarget) return
                if (props.isTop !== true) return
                close()
            },
        },
        h('div', {
            ref: boxRef,
            className: cx('sm-dialog', confirm && 'sm-dialog-confirm', width === 720 && 'sm-dialog-large', width === 488 && 'sm-dialog-form'),
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': props.title,
            'aria-hidden': props.isTop === true ? undefined : 'true',
            onKeyDown: onKeyDown,
            style: {
                width: widthStyle,
                maxWidth: 'calc(100vw - 32px)',
                maxHeight: maxHeightStyle,
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                borderRadius: confirm ? 'var(--dsw-radius-xl)' : 'var(--dsw-radius-panel)',
                border: '.5px solid var(--dsw-alias-border-inverted)',
                background: 'var(--dsw-alias-bg-layer-1)',
                boxShadow: 'none',
                pointerEvents: props.isTop === true ? 'auto' : 'none',
            },
        },
        h('div', {
            className: 'sm-dialog-head',
            style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', padding: confirm ? '20px 20px 0' : '20px 24px 0' },
        },
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 } },
            h('h3', { style: { margin: 0, fontSize: 'calc(var(--sm-fs) + 1px)', lineHeight: '1.4', fontWeight: 500, color: 'var(--dsw-alias-label-primary)' } }, props.title),
            props.subtitle !== undefined && props.subtitle !== null && props.subtitle !== ''
                ? h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, props.subtitle)
                : null),
        confirm
            ? null
            : h('button', {
                type: 'button',
                className: 'sm-icon-btn sm-dialog-close',
                'aria-label': t('action.close'),
                'data-tip': t('action.close'),
                onClick: close,
            }, icon('x', 16))),
        h('div', {
            className: 'sm-dialog-body',
            style: { flex: '1 1 auto', minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: confirm ? '12px' : '16px', padding: confirm ? '12px 20px 12px' : '38px 24px 20px' },
        }, props.children),
        props.footer === undefined || props.footer === null
            ? null
            : h('div', {
                className: 'sm-dialog-foot',
                style: { display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: confirm ? '0 20px 20px' : '12px 24px', borderTop: confirm ? 'none' : '1px solid var(--dsw-alias-border-l2)', flexShrink: 0 },
            }, props.footer)))
    }

    function SmFooter(props) {
        return h(Fragment, null,
            h(SmButton, { tone: 'secondary', onClick: function () { smRequestCloseModal() } }, t('action.cancel')),
            props.children)
    }

    function SmField(props) {
        return h('div', { className: 'sm-field', style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
            h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' } },
                h('span', { style: { fontSize: 'calc(var(--sm-fs) - 1px)', fontWeight: 500, color: 'var(--dsw-alias-label-primary)' } }, props.label),
                props.hint ? h('span', { style: { fontSize: 'calc(var(--sm-fs) - 3px)', color: 'var(--dsw-alias-label-caption)' } }, props.hint) : null),
            props.children,
            props.error ? h('div', { className: 'sm-form-error', style: { fontSize: 'calc(var(--sm-fs) - 2px)', color: 'var(--dsw-alias-state-error-primary)' } }, props.error) : null)
    }

    function SmBanner(props) {
        const tone = props.tone === undefined || props.tone === null ? 'info' : String(props.tone)
        const color = tone === 'error'
            ? 'var(--dsw-alias-state-error-primary)'
            : (tone === 'warn' ? 'var(--dsw-alias-state-warn-primary)' : (tone === 'ok' ? 'var(--dsw-alias-state-success-primary)' : 'var(--dsw-alias-label-secondary)'))
        return h('div', {
            className: 'sm-banner sm-banner-' + tone,
            style: { display: 'flex', flexDirection: 'column', gap: '4px', padding: '10px 14px', borderRadius: '12px', background: 'var(--dsw-alias-bg-layer-2)', border: '1px solid ' + color, color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)', lineHeight: '1.5' },
        }, props.children)
    }

    function SmSegmented(props) {
        const options = Array.isArray(props.options) ? props.options : []
        return h('div', { role: 'tablist', style: { display: 'inline-flex', gap: '2px', padding: '2px', borderRadius: '14px', background: 'var(--dsw-alias-bg-layer-3)', alignSelf: 'flex-start' } },
            options.map(function (option) {
                const selected = props.value === option.value
                return h('button', {
                    key: option.value,
                    type: 'button',
                    role: 'tab',
                    'aria-selected': selected,
                    disabled: option.disabled === true,
                    onClick: function () {
                        if (option.disabled === true) return
                        if (typeof props.onChange === 'function') props.onChange(option.value)
                    },
                    style: { height: '28px', padding: '0 10px', border: 'none', borderRadius: '14px', cursor: option.disabled === true ? 'not-allowed' : 'pointer', background: selected ? 'var(--dsw-alias-interactive-bg-hover)' : 'transparent', color: selected ? 'var(--dsw-alias-label-primary)' : 'var(--dsw-alias-label-tertiary)', fontSize: 'calc(var(--sm-fs) - 1px)', fontWeight: selected ? 500 : 400, opacity: option.disabled === true ? 0.5 : 1 },
                }, option.label)
            }))
    }

    function SmRadioOptions(props) {
        const options = Array.isArray(props.options) ? props.options : []
        return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
            options.map(function (option) {
                const selected = props.value === option.value
                return h('label', {
                    key: option.value,
                    style: { display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '8px 10px', borderRadius: '10px', border: '1px solid ' + (selected ? 'var(--dsw-alias-border-inverted)' : 'var(--dsw-alias-border-l2)'), background: selected ? 'var(--dsw-alias-interactive-bg-hover)' : 'var(--dsw-alias-bg-base)', color: 'var(--dsw-alias-label-primary)', fontSize: 'calc(var(--sm-fs) - 1px)', opacity: option.disabled === true ? 0.5 : 1, cursor: option.disabled === true ? 'not-allowed' : 'pointer' },
                },
                h('input', {
                    type: 'radio',
                    name: props.name || 'sm-radio',
                    value: option.value,
                    checked: selected,
                    disabled: option.disabled === true,
                    onChange: function () {
                        if (option.disabled !== true && typeof props.onChange === 'function') props.onChange(option.value)
                    },
                    style: { marginTop: '2px', flexShrink: 0 },
                }),
                h('span', { style: { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 } },
                    h('span', { style: { wordBreak: 'break-word' } }, option.label),
                    option.hint ? h('span', { style: { color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 3px)' } }, option.hint) : null))
            }))
    }

    function smSaveTargetCategory(location) {
        if (location === 'user-agents') return 'shared'
        if (location === 'project-dsh') return 'project'
        return 'mine'
    }

    function smNameTaken(name, location) {
        const category = smSaveTargetCategory(location)
        return smSkillList().some(function (skill) {
            return skill !== null && typeof skill === 'object' && skill.name === name && smSkillCategory(skill) === category
        })
    }

    function smDefaultLocation(payload) {
        if (payload !== null && typeof payload === 'object') {
            if (typeof payload.location === 'string' && payload.location !== '') return payload.location
            if (payload.category === 'shared') return 'user-agents'
            if (payload.category === 'project') return 'project-dsh'
        }
        return 'user-dsh'
    }

    /* ------------------------------------------------------------------ *
     * 1. 新建技能（488）                                                 *
     * ------------------------------------------------------------------ */

    function SmNewSkillModal(props) {
        const payload = props.payload
        const [name, setName] = useState('')
        const [description, setDescription] = useState('')
        const [whenToUse, setWhenToUse] = useState('')
        const [body, setBody] = useState('')
        const [location, setLocation] = useState(smDefaultLocation(payload))
        const [busy, setBusy] = useState(false)
        const [serverError, setServerError] = useState('')

        const trimmedName = name.trim()
        let nameError = ''
        if (trimmedName !== '' && (!SM_NAME_PATTERN.test(trimmedName) || trimmedName.length > 64)) nameError = t('form.name.invalid')
        else if (trimmedName !== '' && smNameTaken(trimmedName, location)) nameError = t('form.name.taken')
        const projectBlocked = location === 'project-dsh' && !smProjectAvailable()
        const canSubmit = trimmedName !== '' && nameError === '' && description.trim() !== '' && body.trim() !== '' && !projectBlocked && !busy

        const submit = async function () {
            if (!canSubmit) return
            setBusy(true)
            setServerError('')
            const request = { location: location, name: trimmedName, description: description.trim(), body: body }
            if (whenToUse.trim() !== '') request.whenToUse = whenToUse.trim()
            try {
                await api('skill', { method: 'POST', body: request })
                setBusy(false)
                toast(t('toast.created', { name: trimmedName }))
                closeModal()
                setState({ tab: 'skills', category: smSaveTargetCategory(location), view: 'list', detail: null })
                void loadInstalled(true)
            } catch (failure) {
                setBusy(false)
                setServerError(smErrorMessage(failure))
            }
        }

        return h(SmDialogFrame, {
            modalId: props.modalId,
            isTop: props.isTop,
            layerIndex: props.layerIndex,
            width: 488,
            title: t('form.new.title'),
            footer: h(SmFooter, null, h(SmButton, { tone: 'primary', disabled: !canSubmit, onClick: function () { void submit() } }, t('action.create'))),
            onKeyDown: function (event) {
                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                    event.preventDefault()
                    void submit()
                    return true
                }
                return false
            },
        },
        serverError !== '' ? h(SmBanner, { tone: 'error' }, serverError) : null,
        h(SmField, { label: t('form.name'), hint: t('form.name.placeholder'), error: nameError },
            h('input', {
                type: 'text',
                className: 'sm-mono',
                value: name,
                placeholder: t('form.name.placeholder'),
                onChange: function (event) { setName(event.target.value); setServerError('') },
                style: Object.assign({}, SM_INPUT_STYLE, { fontFamily: SM_MONO }),
            })),
        h(SmField, { label: t('form.description') },
            h('input', {
                type: 'text',
                value: description,
                placeholder: t('form.description.placeholder'),
                onChange: function (event) { setDescription(event.target.value); setServerError('') },
                style: SM_INPUT_STYLE,
            })),
        h(SmField, { label: t('form.whenToUse') },
            h('input', {
                type: 'text',
                value: whenToUse,
                onChange: function (event) { setWhenToUse(event.target.value) },
                style: SM_INPUT_STYLE,
            })),
        h(SmField, { label: t('form.saveTo') },
            h(SmSegmented, { value: location, onChange: setLocation, options: smSaveTargets() }),
            projectBlocked ? h('div', { style: { color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 3px)' } }, t('form.projectUnavailable')) : null),
        h(SmField, { label: t('form.body') },
            h('textarea', {
                value: body,
                placeholder: t('form.body.placeholder'),
                onChange: function (event) { setBody(event.target.value); setServerError('') },
                style: Object.assign({}, SM_TEXTAREA_STYLE, { minHeight: '140px' }),
            })))
    }

    /* ------------------------------------------------------------------ *
     * 2. 导入技能（488）                                                 *
     * ------------------------------------------------------------------ */

    function SmImportModal(props) {
        const [mode, setMode] = useState('paste')
        const [content, setContent] = useState('')
        const [dirPath, setDirPath] = useState('')
        const [location, setLocation] = useState(smDefaultLocation(props.payload))
        const [parsed, setParsed] = useState(null)
        const [parseError, setParseError] = useState('')
        const [parsing, setParsing] = useState(false)
        const [busy, setBusy] = useState(false)
        const [serverError, setServerError] = useState('')

        const parse = async function () {
            if (content.trim() === '') {
                setParseError(t('form.body.required'))
                setParsed(null)
                return
            }
            setParsing(true)
            setParseError('')
            setParsed(null)
            try {
                const result = await api('validate', { method: 'POST', body: { content: content } })
                if (result !== null && typeof result === 'object' && result.valid === true) setParsed(result)
                else setParseError(t('form.import.invalid', { reason: result !== null && typeof result === 'object' && typeof result.error === 'string' ? result.error : t('error.unexpected') }))
            } catch (failure) {
                setParseError(smErrorMessage(failure))
            } finally {
                setParsing(false)
            }
        }

        const canSubmit = (mode === 'paste' ? content.trim() !== '' : dirPath.trim() !== '') && !busy
        const submit = async function () {
            if (!canSubmit) return
            setBusy(true)
            setServerError('')
            const request = { mode: mode, location: location }
            if (mode === 'paste') request.content = content
            else request.dirPath = dirPath.trim()
            try {
                const result = await api('import', { method: 'POST', body: request })
                const imported = result !== null && typeof result === 'object' && result.skill !== undefined && result.skill !== null ? result.skill : null
                const files = result !== null && typeof result === 'object' && typeof result.files === 'number' ? result.files : 0
                setBusy(false)
                toast(t('toast.imported', { name: imported !== null ? smText(imported.name) : '', count: files }))
                closeModal()
                setState({ tab: 'skills', category: smSaveTargetCategory(location), view: 'list', detail: null })
                void loadInstalled(true)
            } catch (failure) {
                setBusy(false)
                setServerError(smErrorMessage(failure))
            }
        }

        return h(SmDialogFrame, {
            modalId: props.modalId,
            isTop: props.isTop,
            layerIndex: props.layerIndex,
            width: 488,
            title: t('form.import.title'),
            footer: h(SmFooter, null, h(SmButton, { tone: 'primary', disabled: !canSubmit, onClick: function () { void submit() } }, t('action.import'))),
            onKeyDown: function (event) {
                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                    event.preventDefault()
                    void submit()
                    return true
                }
                return false
            },
        },
        serverError !== '' ? h(SmBanner, { tone: 'error' }, serverError) : null,
        h(SmSegmented, {
            value: mode,
            onChange: function (value) { setMode(value); setParseError(''); setParsed(null) },
            options: [
                { value: 'paste', label: t('form.import.paste') },
                { value: 'dir', label: t('form.import.dir') },
            ],
        }),
        mode === 'paste'
            ? h(Fragment, null,
                h(SmField, {
                    label: t('form.import.paste'),
                    hint: h('button', {
                        type: 'button',
                        className: 'sm-link-btn',
                        onClick: function () { void parse() },
                        style: { height: '24px', padding: '0 6px', border: 'none', background: 'transparent', color: 'var(--dsw-alias-label-primary)', fontSize: 'calc(var(--sm-fs) - 2px)', cursor: 'pointer' },
                    }, parsing ? t('state.validating') : t('action.parse')),
                },
                h('textarea', {
                    value: content,
                    placeholder: t('form.import.paste.placeholder'),
                    onChange: function (event) { setContent(event.target.value); setParsed(null); setParseError('') },
                    style: Object.assign({}, SM_TEXTAREA_STYLE, { minHeight: '160px' }),
                })),
                parseError !== '' ? h(SmBanner, { tone: 'error' }, parseError) : null,
                parsed !== null
                    ? h(SmBanner, { tone: 'ok' },
                        h('span', { style: { color: 'var(--dsw-alias-state-success-primary)', fontWeight: 500 } }, t('form.import.parsed')),
                        h('span', null, t('form.name') + ': ' + smText(parsed.name, '—')),
                        h('span', null, t('form.description') + ': ' + smText(parsed.description, '—')),
                        typeof parsed.files === 'number' ? h('span', null, t('form.import.preview', { count: parsed.files })) : null)
                    : null)
            : h(Fragment, null,
                h(SmField, { label: t('form.import.dir') },
                    h('input', {
                        type: 'text',
                        className: 'sm-mono',
                        value: dirPath,
                        placeholder: t('form.import.dir.placeholder'),
                        onChange: function (event) { setDirPath(event.target.value) },
                        style: Object.assign({}, SM_INPUT_STYLE, { fontFamily: SM_MONO }),
                    }))),
        h(SmField, { label: t('form.saveTo') },
            h(SmSegmented, { value: location, onChange: setLocation, options: smSaveTargets() })))
    }

    /* ------------------------------------------------------------------ *
     * 3. 安装技能（488）                                                 *
     * ------------------------------------------------------------------ */

    function SmInstallModal(props) {
        const payload = props.payload !== null && typeof props.payload === 'object' ? props.payload : {}
        const initialMarket = payload.skill !== null && typeof payload.skill === 'object' ? payload.skill : null
        const [market, setMarket] = useState(initialMarket)
        const [versions, setVersions] = useState([])
        const [loading, setLoading] = useState(initialMarket === null)
        const [loadError, setLoadError] = useState('')
        const [reloadTick, setReloadTick] = useState(0)
        const [location, setLocation] = useState(smDefaultLocation(payload))
        const [conflictChoice, setConflictChoice] = useState('')
        const [busy, setBusy] = useState(false)
        const [stage, setStage] = useState(0)
        const [error, setError] = useState('')
        const [confirmCancel, setConfirmCancel] = useState(false)
        const timerRef = useRef(null)
        const abortRef = useRef(null)
        const canceledRef = useRef(false)

        smUseModalGuard(props.modalId, function () {
            if (confirmCancel) {
                setConfirmCancel(false)
                return true
            }
            if (!busy) return false
            setConfirmCancel(true)
            return true
        })

        useEffect(function () {
            if (market !== null) return undefined
            let alive = true
            const sourceId = smText(payload.sourceId)
            const name = smText(payload.name)
            if (sourceId === '' || name === '') {
                setLoading(false)
                setLoadError(t('install.unavailable'))
                return undefined
            }
            setLoading(true)
            setLoadError('')
            api('market/skill?sourceId=' + encodeURIComponent(sourceId) + '&name=' + encodeURIComponent(name)).then(function (data) {
                if (!alive) return
                setMarket(data !== null && typeof data === 'object' && data.skill !== undefined ? data.skill : null)
                setVersions(data !== null && typeof data === 'object' && Array.isArray(data.versions) ? data.versions : [])
                setLoading(false)
            }).catch(function (failure) {
                if (!alive) return
                setLoadError(smErrorMessage(failure))
                setLoading(false)
            })
            return function () { alive = false }
        }, [reloadTick])

        useEffect(function () {
            return function () {
                if (timerRef.current !== null) clearInterval(timerRef.current)
                if (abortRef.current !== null) abortRef.current.abort()
            }
        }, [])

        const version = market !== null ? smText(market.version) : ''
        const conflict = market !== null && smSkillList().some(function (skill) {
            return skill !== null && typeof skill === 'object' && skill.name === market.name && smSkillCategory(skill) === smSaveTargetCategory(location)
        })

        const changeLocation = function () {
            if (market === null) return
            const candidates = ['user-dsh', 'user-agents', 'project-dsh']
            for (let index = 0; index < candidates.length; index += 1) {
                const candidate = candidates[index]
                if (candidate === location) continue
                if (candidate === 'project-dsh' && !smProjectAvailable()) continue
                const taken = smSkillList().some(function (skill) {
                    return skill !== null && typeof skill === 'object' && skill.name === market.name && smSkillCategory(skill) === smSaveTargetCategory(candidate)
                })
                if (!taken) {
                    setLocation(candidate)
                    setConflictChoice('')
                    return
                }
            }
            toast(t('error.pathOutside'), { tone: 'error' })
        }

        const cancelInstall = function () {
            canceledRef.current = true
            if (abortRef.current !== null) {
                abortRef.current.abort()
                abortRef.current = null
            }
            if (timerRef.current !== null) {
                clearInterval(timerRef.current)
                timerRef.current = null
            }
            setBusy(false)
            setStage(0)
            setConfirmCancel(false)
            setError(t('error.canceled'))
        }

        const submit = async function () {
            if (market === null || busy) return
            if (conflict && conflictChoice === '') return
            canceledRef.current = false
            setBusy(true)
            setStage(0)
            setError('')
            setConfirmCancel(false)
            if (timerRef.current !== null) clearInterval(timerRef.current)
            timerRef.current = setInterval(function () {
                setStage(function (previous) { return previous < 1 ? previous + 1 : previous })
            }, 700)
            const controller = new AbortController()
            abortRef.current = controller
            const request = { sourceId: market.sourceId, name: market.name, version: version, location: location }
            if (conflict) request.conflict = conflictChoice === 'skip' ? 'skip' : 'overwrite'
            try {
                const result = await api('market/install', { method: 'POST', body: request, signal: controller.signal })
                if (timerRef.current !== null) {
                    clearInterval(timerRef.current)
                    timerRef.current = null
                }
                abortRef.current = null
                setBusy(false)
                setStage(2)
                const created = result !== null && typeof result === 'object' && result.skill !== undefined ? result.skill : null
                toast(t('install.success', { name: market.name }), {
                    actionLabel: t('action.viewInstalled'),
                    onAction: function () {
                        const category = smSaveTargetCategory(location)
                        void loadInstalled(true).then(function () {
                            if (created !== null && typeof created === 'object' && typeof created.id === 'string') {
                                setState({ tab: 'skills', category: category, view: 'detail', detail: { kind: 'installed', id: created.id } })
                            } else {
                                setState({ tab: 'skills', category: category, view: 'list', detail: null })
                            }
                        })
                    },
                })
                closeModal()
                setState({ tab: 'skills', category: smSaveTargetCategory(location), view: 'list', detail: null })
                void loadInstalled(true)
                void loadMarket()
            } catch (failure) {
                if (timerRef.current !== null) {
                    clearInterval(timerRef.current)
                    timerRef.current = null
                }
                abortRef.current = null
                setBusy(false)
                setStage(0)
                if (canceledRef.current === true || (failure !== null && typeof failure === 'object' && failure.code === 'E_CANCELED')) {
                    setError(t('error.canceled'))
                } else {
                    setError(smErrorMessage(failure))
                }
            }
        }

        if (loading) {
            return h(SmDialogFrame, { modalId: props.modalId, isTop: props.isTop, layerIndex: props.layerIndex, width: 488, title: t('install.title'), footer: h(SmFooter, null) },
                h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 1px)' } }, t('state.loading')))
        }
        if (market === null) {
            return h(SmDialogFrame, { modalId: props.modalId, isTop: props.isTop, layerIndex: props.layerIndex, width: 488, title: t('install.title'), footer: h(SmFooter, null, h(SmButton, { tone: 'secondary', onClick: function () { setReloadTick(function (value) { return value + 1 }) } }, t('action.retry'))) },
                h(SmBanner, { tone: 'error' }, loadError !== '' ? loadError : t('install.unavailable')))
        }

        const stageLabel = stage === 0 ? t('install.progress.preparing') : t('install.progress.verifying')

        return h(SmDialogFrame, {
            modalId: props.modalId,
            isTop: props.isTop,
            layerIndex: props.layerIndex,
            width: 488,
            title: t('install.title'),
            subtitle: smText(market.name),
            footer: busy
                ? h(Fragment, null,
                    h(SmButton, { tone: 'secondary', onClick: function () { setConfirmCancel(true) } }, t('action.cancel')),
                    h(SmButton, { tone: 'primary', disabled: true }, t('state.installing')))
                : h(SmFooter, null, h(SmButton, { tone: 'primary', disabled: conflict && conflictChoice === '', onClick: function () { void submit() } }, t('action.install'))),
        },
        error !== '' ? h(SmBanner, { tone: 'error' }, error) : null,
        confirmCancel
            ? h(SmBanner, { tone: 'warn' },
                h('span', { style: { fontWeight: 500 } }, t('install.cancelConfirm.title')),
                h('span', null, t('install.cancelConfirm.body')),
                h('div', { style: { display: 'flex', gap: '8px', marginTop: '4px' } },
                    h(SmButton, { tone: 'secondary', style: { height: '28px' }, onClick: function () { setConfirmCancel(false) } }, t('action.cancel')),
                    h(SmButton, { tone: 'danger', style: { height: '28px' }, onClick: cancelInstall }, t('install.cancelConfirm.ok'))))
            : null,
        h(SmField, { label: t('install.target') },
            h(SmSegmented, { value: location, onChange: function (value) { setLocation(value); setConflictChoice('') }, options: smSaveTargets() })),
        h(SmField, { label: t('install.version') },
            h('div', { className: 'sm-mono', style: { color: 'var(--dsw-alias-label-primary)', fontSize: 'calc(var(--sm-fs) - 1px)' } }, version === '' ? '—' : (version.charAt(0) === 'v' ? version : 'v' + version))),
        conflict
            ? h(SmBanner, { tone: 'warn' },
                h('span', { style: { fontWeight: 500 } }, t('install.conflict')),
                h(SmRadioOptions, {
                    name: 'install-conflict',
                    value: conflictChoice,
                    onChange: setConflictChoice,
                    options: [
                        { value: 'overwrite', label: t('install.conflict.overwrite') },
                        { value: 'skip', label: t('install.conflict.skip') },
                    ],
                }),
                h(SmButton, { tone: 'secondary', style: { alignSelf: 'flex-start', height: '28px' }, onClick: changeLocation }, t('install.conflict.changeTarget')))
            : null,
        busy
            ? h('div', { role: 'progressbar', 'aria-busy': 'true', style: { display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px 12px', borderRadius: '12px', background: 'var(--dsw-alias-bg-base)', border: '1px solid var(--dsw-alias-border-l1)' } },
                h('span', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, stageLabel),
                h('div', { style: { width: '100%', height: '6px', borderRadius: '999px', background: 'var(--dsw-alias-bg-layer-3)', overflow: 'hidden' } },
                    h('div', { style: { width: stage === 0 ? '40%' : '82%', height: '100%', background: 'var(--dsw-alias-label-primary)', transition: 'width 220ms' } })))
            : null)
    }

    /* ------------------------------------------------------------------ *
     * 4. 更新确认（480，单个 / 全部）                                    *
     * ------------------------------------------------------------------ */

    function smUpdateTargets(payload) {
        const list = []
        const push = function (skill) {
            if (skill === null || typeof skill !== 'object') return
            if (skill.status === 'disabled' || skill.writable === false || smIsBuiltin(skill)) return
            if (smSkillUpdateVersion(skill) === '') return
            if (list.some(function (item) { return item.id === skill.id })) return
            list.push(skill)
        }
        if (payload !== null && typeof payload === 'object') {
            if (Array.isArray(payload.skills)) payload.skills.forEach(push)
            else if (payload.all === true) smSkillList().forEach(push)
            else if (payload.skill !== null && payload.skill !== undefined) push(payload.skill)
        }
        return list
    }

    function SmUpdateModal(props) {
        const payload = props.payload !== null && typeof props.payload === 'object' ? props.payload : {}
        const initialTargets = smUpdateTargets(payload)
        const batch = initialTargets.length > 1 || payload.all === true
        const [targets, setTargets] = useState(initialTargets)
        const [phase, setPhase] = useState('confirm')
        const [done, setDone] = useState(0)
        const [failed, setFailed] = useState([])
        const [okCount, setOkCount] = useState(0)
        const [error, setError] = useState('')
        const [confirmCancel, setConfirmCancel] = useState(false)
        const cancelRef = useRef(false)
        const abortRef = useRef(null)

        smUseModalGuard(props.modalId, function () {
            if (confirmCancel) {
                setConfirmCancel(false)
                return true
            }
            if (phase !== 'running') return false
            setConfirmCancel(true)
            return true
        })

        const modifiedCount = targets.filter(function (skill) { return smSkillLocalModified(skill) }).length
        const updateOne = async function (skill) {
            const version = smSkillUpdateVersion(skill)
            await api('market/update', {
                method: 'POST',
                body: { sourceId: smText(skill.sourceId), name: smText(skill.name), version: version, location: smText(skill.location) },
                signal: abortRef.current !== null ? abortRef.current.signal : undefined,
            })
        }

        const run = async function (queue) {
            setPhase('running')
            setDone(0)
            setOkCount(0)
            setFailed([])
            setError('')
            setConfirmCancel(false)
            cancelRef.current = false
            let ok = 0
            const failures = []
            for (let index = 0; index < queue.length; index += 1) {
                if (cancelRef.current) break
                const skill = queue[index]
                try {
                    await updateOne(skill)
                    ok += 1
                } catch (failure) {
                    if (cancelRef.current === true || (failure !== null && typeof failure === 'object' && failure.code === 'E_CANCELED')) break
                    failures.push({ skill: skill, reason: smErrorMessage(failure) })
                }
                setDone(index + 1)
                setOkCount(ok)
                setFailed(failures.slice())
            }
            abortRef.current = null
            if (cancelRef.current === true && ok === 0 && failures.length === 0) setError(t('error.canceled'))
            if (cancelRef.current !== true && !batch && queue.length === 1 && failures.length === 0) {
                toast(t('update.success', { version: smSkillUpdateVersion(queue[0]) }))
                void loadInstalled(true)
                void loadUpdates(true)
                void loadMarket()
                closeModal()
                return
            }
            setPhase('result')
            if (ok > 0) toast(t('update.result', { ok: ok, failed: failures.length }))
            void loadInstalled(true)
            void loadUpdates(true)
            void loadMarket()
        }

        const submit = function () {
            if (targets.length === 0) return
            const queue = targets.slice()
            setTargets(queue)
            if (queue.length > 1 || batch) {
                abortRef.current = null
                void run(queue)
                return
            }
            abortRef.current = new AbortController()
            void run(queue)
        }

        const cancelRun = function () {
            cancelRef.current = true
            if (abortRef.current !== null) abortRef.current.abort()
            setConfirmCancel(false)
        }

        const retryFailed = function () {
            const queue = failed.map(function (entry) { return entry.skill })
            if (queue.length === 0) return
            setTargets(queue)
            abortRef.current = null
            void run(queue)
        }

        const footer = phase === 'running'
            ? h(Fragment, null,
                h(SmButton, { tone: 'secondary', onClick: function () { setConfirmCancel(true) } }, t('action.cancel')))
            : phase === 'result'
                ? h(Fragment, null,
                    failed.length > 0 ? h(SmButton, { tone: 'secondary', onClick: retryFailed }, t('update.retryFailedCount', { count: failed.length })) : null,
                    h(SmButton, { tone: 'primary', onClick: closeModal }, t('action.close')))
                : h(SmFooter, null, h(SmButton, { tone: 'primary', disabled: targets.length === 0, onClick: submit }, t('action.update')))

        const body = []
        if (error !== '') body.push(h(SmBanner, { key: 'error', tone: 'error' }, error))
        if (confirmCancel) {
            body.push(h(SmBanner, { key: 'cancel', tone: 'warn' },
                h('span', { style: { fontWeight: 500 } }, t('update.cancelConfirm.title')),
                h('span', null, t('update.cancelConfirm.body')),
                h('div', { style: { display: 'flex', gap: '8px', marginTop: '4px' } },
                    h(SmButton, { key: 'keep', tone: 'secondary', style: { height: '28px' }, onClick: function () { setConfirmCancel(false) } }, t('action.cancel')),
                    h(SmButton, { key: 'stop', tone: 'danger', style: { height: '28px' }, onClick: cancelRun }, t('update.cancelConfirm.ok')))))
        }

        if (phase === 'confirm') {
            if (targets.length === 0) {
                body.push(h('div', { key: 'none', style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 1px)' } }, t('update.none')))
            } else if (!batch) {
                const skill = targets[0]
                body.push(h('div', { key: 'single', style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
                    h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px 14px', borderRadius: '12px', background: 'var(--dsw-alias-bg-base)', border: '1px solid var(--dsw-alias-border-l1)' } },
                        h('span', { className: 'sm-mono', style: { minWidth: 0, wordBreak: 'break-all', color: 'var(--dsw-alias-label-primary)', fontSize: 'calc(var(--sm-fs) - 1px)' } }, smText(skill.name)),
                        h('span', { className: 'sm-mono', style: { flexShrink: 0, color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)' } },
                            t('update.versionChange', {
                                current: smSkillVersion(skill) === '' ? '—' : smSkillVersion(skill),
                                next: (smSkillUpdateVersion(skill).charAt(0) === 'v' ? '' : 'v') + smSkillUpdateVersion(skill),
                            }))),
                    h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, t('market.source') + ': ' + smText(skill.sourceName, smText(skill.sourceId, '—'))),
                    smSkillLocalModified(skill) ? h(SmBanner, { tone: 'warn' }, t('update.localModified')) : null,
                    h('div', { style: { color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, t('update.backupNote'))))
            } else {
                body.push(h('div', { key: 'batch', style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
                    h('div', { style: { color: 'var(--dsw-alias-label-primary)', fontSize: 'var(--sm-fs)' } }, t('update.all.body', { count: targets.length })),
                    modifiedCount > 0 ? h(SmBanner, { tone: 'warn' }, t('update.all.modified', { count: modifiedCount })) : null,
                    h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '220px', overflowY: 'auto' } },
                        targets.map(function (skill) {
                            return h('div', { key: smText(skill.id, smText(skill.name)), style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '8px 10px', borderRadius: '10px', background: 'var(--dsw-alias-bg-base)' } },
                                h('span', { className: 'sm-mono', style: { minWidth: 0, wordBreak: 'break-all', color: 'var(--dsw-alias-label-primary)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, smText(skill.name)),
                                h('span', { className: 'sm-mono', style: { flexShrink: 0, color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 3px)' } }, 'v' + smSkillUpdateVersion(skill)))
                        })),
                    h('div', { style: { color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, t('update.backupNote'))))
            }
        } else if (phase === 'running') {
            body.push(h('div', { key: 'progress', style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
                h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 1px)' } }, t('update.progress', { done: done, total: targets.length })),
                h('div', { role: 'progressbar', style: { width: '100%', height: '6px', borderRadius: '999px', background: 'var(--dsw-alias-bg-layer-3)', overflow: 'hidden' } },
                    h('div', { style: { width: String(targets.length === 0 ? 0 : Math.round((done / targets.length) * 100)) + '%', height: '100%', background: 'var(--dsw-alias-label-primary)', transition: 'width 220ms' } }))))
        } else {
            body.push(h('div', { key: 'result', style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
                h('div', { style: { color: 'var(--dsw-alias-label-primary)', fontSize: 'var(--sm-fs)', fontWeight: 500 } }, failed.length === 0 ? t('update.result.ok') : t('update.result', { ok: okCount, failed: failed.length })),
                failed.map(function (entry) {
                    return h('div', { key: smText(entry.skill.id, smText(entry.skill.name)), style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)' } },
                        smText(entry.skill.name) + ' · ' + entry.reason)
                })))
        }

        return h(SmDialogFrame, {
            modalId: props.modalId,
            isTop: props.isTop,
            layerIndex: props.layerIndex,
            width: 480,
            confirm: true,
            title: batch ? t('update.all.title') : t('update.title'),
            footer: footer,
        }, body)
    }

    /* ------------------------------------------------------------------ *
     * 5. 卸载确认（480）                                                 *
     * ------------------------------------------------------------------ */

    function smResolveSkill(payload) {
        if (payload === null || typeof payload !== 'object') return null
        if (payload.skill !== null && typeof payload.skill === 'object') return payload.skill
        return smFindSkillById(payload.id) || smFindSkillByName(payload.name)
    }

    function SmUninstallModal(props) {
        const payload = props.payload !== null && typeof props.payload === 'object' ? props.payload : {}
        const skill = smResolveSkill(payload)
        const name = skill !== null ? smText(skill.name, smText(payload.name)) : smText(payload.name)
        const location = skill !== null ? smText(skill.location, smText(payload.location)) : smText(payload.location)
        const blocked = skill !== null && smIsReadonly(skill)
        const [preserveBackup, setPreserveBackup] = useState(false)
        const [busy, setBusy] = useState(false)
        const [error, setError] = useState('')

        const submit = async function () {
            if (busy || blocked) return
            if (name === '' || location === '') {
                setError(t('error.notFound'))
                return
            }
            setBusy(true)
            setError('')
            try {
                await api('market/uninstall', { method: 'POST', body: { name: name, location: location, preserveBackup: preserveBackup } })
                setBusy(false)
                toast(t('uninstall.success', { name: name }))
                closeModal()
                const detail = appState.detail
                if (detail !== null && typeof detail === 'object' && (detail.id === smText(skill !== null ? skill.id : '') || detail.name === name)) {
                    setState({ view: 'list', detail: null })
                }
                void loadInstalled(true)
                void loadMarket()
            } catch (failure) {
                setBusy(false)
                setError(smErrorMessage(failure))
            }
        }

        return h(SmDialogFrame, {
            modalId: props.modalId,
            isTop: props.isTop,
            layerIndex: props.layerIndex,
            width: 480,
            confirm: true,
            title: t('uninstall.title'),
            footer: h(Fragment, null,
                h(SmButton, { tone: 'secondary', onClick: function () { smRequestCloseModal() } }, t('action.cancel')),
                h(SmButton, { tone: 'danger', disabled: busy || blocked, onClick: function () { void submit() } }, t('action.uninstall'))),
        },
        error !== '' ? h(SmBanner, { tone: 'error' }, error) : null,
        blocked ? h(SmBanner, { tone: 'warn' }, t('uninstall.readonly')) : null,
        h('p', { style: { margin: 0, color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 1px)', lineHeight: '1.55' } }, t('uninstall.body', { name: name !== '' ? name : '—' })),
        h('label', { style: { display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)', cursor: 'pointer' } },
            h('input', { type: 'checkbox', checked: preserveBackup, onChange: function (event) { setPreserveBackup(event.target.checked) } }),
            h('span', null, t('action.backup'))))
    }

    /* ------------------------------------------------------------------ *
     * 6. 删除确认（480）                                                 *
     * ------------------------------------------------------------------ */

    function SmDeleteModal(props) {
        const payload = props.payload !== null && typeof props.payload === 'object' ? props.payload : {}
        const skill = smResolveSkill(payload)
        const name = skill !== null ? smText(skill.name, smText(payload.name)) : smText(payload.name)
        const path = skill !== null ? smText(skill.path, smText(payload.path)) : smText(payload.path)
        const blocked = skill !== null && smIsReadonly(skill)
        const [busy, setBusy] = useState(false)
        const [error, setError] = useState('')

        const submit = async function () {
            if (busy || blocked) return
            if (path === '') {
                setError(t('error.notFound'))
                return
            }
            setBusy(true)
            setError('')
            try {
                await api('skill?path=' + encodeURIComponent(path), { method: 'DELETE' })
                setBusy(false)
                toast(t('toast.deleted', { name: name }))
                closeModal()
                const detail = appState.detail
                if (detail !== null && typeof detail === 'object' && (detail.id === smText(skill !== null ? skill.id : '') || detail.name === name)) {
                    setState({ view: 'list', detail: null })
                }
                void loadInstalled(true)
            } catch (failure) {
                setBusy(false)
                setError(smErrorMessage(failure))
            }
        }

        return h(SmDialogFrame, {
            modalId: props.modalId,
            isTop: props.isTop,
            layerIndex: props.layerIndex,
            width: 480,
            confirm: true,
            title: t('delete.title'),
            footer: h(Fragment, null,
                h(SmButton, { tone: 'secondary', onClick: function () { smRequestCloseModal() } }, t('action.cancel')),
                h(SmButton, { tone: 'danger', disabled: busy || blocked, onClick: function () { void submit() } }, t('action.delete'))),
        },
        error !== '' ? h(SmBanner, { tone: 'error' }, error) : null,
        blocked ? h(SmBanner, { tone: 'warn' }, t('delete.readonly')) : null,
        h('p', { style: { margin: 0, color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 1px)', lineHeight: '1.55' } }, t('delete.body', { name: name !== '' ? name : '—' })))
    }

    /* ------------------------------------------------------------------ *
     * 7. 添加索引源（488）                                               *
     * ------------------------------------------------------------------ */

    function SmAddSourceModal(props) {
        const [name, setName] = useState('')
        const [url, setUrl] = useState('')
        const [validating, setValidating] = useState(false)
        const [result, setResult] = useState(null)
        const [validateError, setValidateError] = useState('')
        const [busy, setBusy] = useState(false)
        const [serverError, setServerError] = useState('')

        const validate = async function () {
            if (url.trim() === '') {
                setValidateError(t('source.error.urlRequired'))
                setResult(null)
                return
            }
            setValidating(true)
            setValidateError('')
            setResult(null)
            setServerError('')
            try {
                const data = await api('sources/validate', { method: 'POST', body: { url: url.trim() } })
                setResult(data !== null && typeof data === 'object' ? data : null)
            } catch (failure) {
                setValidateError(smErrorMessage(failure))
            } finally {
                setValidating(false)
            }
        }

        const canSave = result !== null && validateError === '' && url.trim() !== '' && !busy
        const submit = async function () {
            if (!canSave) return
            setBusy(true)
            setServerError('')
            const request = { url: url.trim() }
            if (name.trim() !== '') request.name = name.trim()
            try {
                const data = await api('sources', { method: 'POST', body: request })
                const source = data !== null && typeof data === 'object' && data.source !== undefined ? data.source : null
                setBusy(false)
                toast(t('toast.sourceAdded', { name: source !== null ? smText(source.name, name.trim()) : name.trim() }))
                closeModal()
                void loadSources()
                void loadMarket()
            } catch (failure) {
                setBusy(false)
                setServerError(smErrorMessage(failure))
            }
        }

        const samples = result !== null && Array.isArray(result.sample) ? result.sample : (result !== null && Array.isArray(result.skills) ? result.skills : [])
        const sampleNames = samples.slice(0, 3).map(function (item) { return smText(item.name) }).filter(function (text) { return text !== '' }).join(' · ')

        return h(SmDialogFrame, {
            modalId: props.modalId,
            isTop: props.isTop,
            layerIndex: props.layerIndex,
            width: 488,
            title: t('source.add.title'),
            footer: h(SmFooter, null, h(SmButton, { tone: 'primary', disabled: !canSave, onClick: function () { void submit() } }, t('action.save'))),
        },
        serverError !== '' ? h(SmBanner, { tone: 'error' }, serverError) : null,
        h(SmBanner, { tone: 'info' }, t('source.trust')),
        h(SmField, { label: t('source.name') },
            h('input', { type: 'text', value: name, placeholder: t('source.name.placeholder'), onChange: function (event) { setName(event.target.value) }, style: SM_INPUT_STYLE })),
        h(SmField, { label: t('source.url'), error: validateError },
            h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
                h('input', {
                    type: 'text',
                    className: 'sm-mono',
                    value: url,
                    placeholder: t('source.url.placeholder'),
                    onChange: function (event) { setUrl(event.target.value); setResult(null); setValidateError('') },
                    style: Object.assign({}, SM_INPUT_STYLE, { fontFamily: SM_MONO, flex: 1 }),
                }),
                h(SmButton, { tone: 'secondary', disabled: validating, onClick: function () { void validate() } }, validating ? t('state.validating') : t('action.validate')))),
        result !== null
            ? h(SmBanner, { tone: 'ok' },
                h('span', { style: { color: 'var(--dsw-alias-state-success-primary)', fontWeight: 500 } }, t('source.validated', { count: typeof result.skillCount === 'number' ? result.skillCount : (typeof result.count === 'number' ? result.count : 0) })),
                result.title ? h('span', null, t('source.title') + ': ' + smText(result.title)) : null,
                result.description ? h('span', null, smText(result.description)) : null,
                sampleNames !== '' ? h('span', { className: 'sm-mono', style: { wordBreak: 'break-all' } }, t('source.preview', { names: sampleNames })) : null)
            : null)
    }

    /* ------------------------------------------------------------------ *
     * 8. 编辑原文（720）                                                 *
     * ------------------------------------------------------------------ */

    function SmEditContentModal(props) {
        const payload = props.payload !== null && typeof props.payload === 'object' ? props.payload : {}
        const skill = payload.skill !== null && typeof payload.skill === 'object' ? payload.skill : null
        const path = smText(payload.path, skill !== null ? smText(skill.path) : '')
        const name = smText(payload.name, skill !== null ? smText(skill.name) : '')
        const [draft, setDraft] = useState(typeof payload.content === 'string' ? payload.content : '')
        const [original, setOriginal] = useState(typeof payload.content === 'string' ? payload.content : '')
        const [mtime, setMtime] = useState(smNumber(payload.mtime, skill !== null ? smNumber(skill.mtime, 0) : 0))
        const [loading, setLoading] = useState(typeof payload.content !== 'string' && path !== '')
        const [saving, setSaving] = useState(false)
        const [error, setError] = useState('')
        const [confirmDiscard, setConfirmDiscard] = useState(false)
        const alive = useRef(true)
        const textareaRef = useRef(null)
        const gutterRef = useRef(null)
        const dirty = draft !== original

        smUseModalGuard(props.modalId, function () {
            if (confirmDiscard) {
                setConfirmDiscard(false)
                return true
            }
            if (!dirty) return false
            setConfirmDiscard(true)
            return true
        })

        useEffect(function () {
            alive.current = true
            return function () { alive.current = false }
        }, [])

        const load = useCallback(function () {
            if (path === '') {
                setLoading(false)
                setError(t('error.notFound'))
                return
            }
            setLoading(true)
            setError('')
            api('skill?path=' + encodeURIComponent(path)).then(function (data) {
                if (!alive.current) return
                const content = data !== null && typeof data === 'object' && typeof data.content === 'string' ? data.content : ''
                const fetchedSkill = data !== null && typeof data === 'object' && data.skill !== null && typeof data.skill === 'object' ? data.skill : null
                setDraft(content)
                setOriginal(content)
                setMtime(fetchedSkill !== null ? smNumber(fetchedSkill.mtime, mtime) : mtime)
                setLoading(false)
            }).catch(function (failure) {
                if (!alive.current) return
                setError(smErrorMessage(failure))
                setLoading(false)
            })
        }, [path])

        useEffect(function () {
            if (typeof payload.content === 'string') return
            load()
        }, [load])

        const save = async function () {
            if (saving || path === '') return
            setSaving(true)
            setError('')
            try {
                await api('skill', { method: 'PUT', body: { path: path, mtime: mtime, content: draft } })
                setSaving(false)
                setOriginal(draft)
                toast(t('toast.saved'))
                smRefreshDetail()
                void loadInstalled(true)
                if (smDiagnostics.open) void smLoadDiagnostics()
                closeModal()
            } catch (failure) {
                setSaving(false)
                setError(failure !== null && typeof failure === 'object' && failure.code === 'E_CONFLICT_MTIME' ? t('form.mtimeConflict') : smErrorMessage(failure))
            }
        }

        const requestClose = function () {
            if (dirty) {
                setConfirmDiscard(true)
                return
            }
            smRemoveModalById(props.modalId)
        }

        const lineCount = draft.split('\n').length
        const gutter = []
        for (let index = 1; index <= Math.max(lineCount, 1); index += 1) gutter.push(h('div', { key: index }, String(index)))

        const body = []
        if (error !== '') {
            body.push(h(SmBanner, { key: 'error', tone: 'error' },
                h('span', null, error),
                error === t('form.mtimeConflict')
                    ? h(SmButton, { key: 'refresh', tone: 'secondary', style: { alignSelf: 'flex-start', height: '28px' }, onClick: function () { void load() } }, t('action.refresh'))
                    : null))
        }
        if (confirmDiscard) {
            body.push(h(SmBanner, { key: 'discard', tone: 'warn' },
                h('span', { style: { fontWeight: 500 } }, t('form.edit.discard.title')),
                h('span', null, t('form.edit.discard.body')),
                h('div', { style: { display: 'flex', gap: '8px', marginTop: '4px' } },
                    h(SmButton, { key: 'keep', tone: 'secondary', style: { height: '28px' }, onClick: function () { setConfirmDiscard(false) } }, t('action.cancel')),
                    h(SmButton, { key: 'discard', tone: 'danger', style: { height: '28px' }, onClick: function () { smRemoveModalById(props.modalId) } }, t('form.edit.discard.confirm')))))
        }
        if (loading) {
            body.push(h('div', { key: 'loading', style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 1px)' } }, t('state.loading')))
        } else {
            body.push(h('div', {
                key: 'editor',
                className: 'sm-editor',
                style: { display: 'flex', minHeight: '320px', height: 'min(52vh, 480px)', border: '1px solid var(--dsw-alias-border-l2)', borderRadius: '12px', background: 'var(--dsw-alias-bg-base)', overflow: 'hidden' },
            },
            h('div', {
                ref: gutterRef,
                className: 'sm-mono',
                'aria-hidden': 'true',
                style: { flexShrink: 0, width: '44px', padding: '10px 8px', overflow: 'hidden', textAlign: 'right', userSelect: 'none', color: 'var(--dsw-alias-label-caption)', fontFamily: SM_MONO, fontSize: 'calc(var(--sm-fs) - 2px)', lineHeight: '20px' },
            }, gutter),
            h('textarea', {
                ref: textareaRef,
                className: 'sm-mono',
                value: draft,
                spellCheck: false,
                onChange: function (event) {
                    setDraft(event.target.value)
                    setError('')
                },
                onScroll: function (event) {
                    if (gutterRef.current !== null) gutterRef.current.scrollTop = event.target.scrollTop
                },
                style: { flex: '1 1 auto', minWidth: 0, border: 'none', outline: 'none', resize: 'none', background: 'transparent', color: 'var(--dsw-alias-label-primary)', fontFamily: SM_MONO, fontSize: 'calc(var(--sm-fs) - 2px)', lineHeight: '20px', padding: '10px 12px', whiteSpace: 'pre', overflow: 'auto' },
            })))
            body.push(h('div', { key: 'hint', style: { color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 3px)' } }, t('detail.editHint')))
        }

        return h(SmDialogFrame, {
            modalId: props.modalId,
            isTop: props.isTop,
            layerIndex: props.layerIndex,
            width: 720,
            title: t('form.edit.title'),
            subtitle: name,
            onRequestClose: requestClose,
            footer: h(Fragment, null,
                h(SmButton, { tone: 'secondary', onClick: requestClose }, t('action.cancel')),
                h(SmButton, { tone: 'primary', disabled: saving || loading || !dirty || path === '', onClick: function () { void save() } }, saving ? t('state.savingContent') : t('action.save'))),
            onKeyDown: function (event) {
                if ((event.metaKey || event.ctrlKey) && String(event.key).toLowerCase() === 's') {
                    event.preventDefault()
                    void save()
                    return true
                }
                return false
            },
        },
        dirty ? h('div', { style: { color: 'var(--dsw-alias-state-warn-primary)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, t('form.edit.dirty')) : null,
        body)
    }

    /* ------------------------------------------------------------------ *
     * 9. 预览（720）                                                     *
     * ------------------------------------------------------------------ */

    function SmPreviewModal(props) {
        const payload = props.payload !== null && typeof props.payload === 'object' ? props.payload : {}
        const skill = payload.skill !== null && typeof payload.skill === 'object' ? payload.skill : null
        const path = smText(payload.path, skill !== null ? smText(skill.path) : '')
        const name = smText(payload.name, skill !== null ? smText(skill.name) : '')
        const [content, setContent] = useState(typeof payload.content === 'string' ? payload.content : '')
        const [loading, setLoading] = useState(typeof payload.content !== 'string' && path !== '')
        const [error, setError] = useState('')
        const alive = useRef(true)

        useEffect(function () {
            alive.current = true
            return function () { alive.current = false }
        }, [])

        const load = useCallback(function () {
            if (path === '') {
                setLoading(false)
                return
            }
            setLoading(true)
            setError('')
            api('skill?path=' + encodeURIComponent(path)).then(function (data) {
                if (!alive.current) return
                setContent(data !== null && typeof data === 'object' && typeof data.content === 'string' ? data.content : '')
                setLoading(false)
            }).catch(function (failure) {
                if (!alive.current) return
                setError(smErrorMessage(failure))
                setLoading(false)
            })
        }, [path])

        useEffect(function () {
            if (typeof payload.content === 'string') return
            load()
        }, [load])

        return h(SmDialogFrame, {
            modalId: props.modalId,
            isTop: props.isTop,
            layerIndex: props.layerIndex,
            width: 720,
            title: t('detail.content'),
            subtitle: name,
            footer: h(Fragment, null, h(SmButton, { tone: 'primary', onClick: function () { smRemoveModalById(props.modalId) } }, t('action.close'))),
        },
        loading
            ? h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 1px)' } }, t('state.loading'))
            : error !== ''
                ? h(SmBanner, { tone: 'error' }, error)
                : content === ''
                    ? h('div', { style: { color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 1px)' } }, t('detail.content.empty'))
                    : h(SmCodeBlock, { text: content, maxHeight: '60vh' }))
    }

    /* ------------------------------------------------------------------ *
     * 10. 删除源确认（480）                                              *
     * ------------------------------------------------------------------ */

    function SmConfirmRemoveSourceModal(props) {
        const payload = props.payload !== null && typeof props.payload === 'object' ? props.payload : {}
        const source = payload.source !== null && typeof payload.source === 'object' ? payload.source : null
        const sourceId = smText(payload.sourceId, smText(payload.id, source !== null ? smText(source.id) : ''))
        const name = smText(payload.name, source !== null ? smText(source.name) : '')
        const [busy, setBusy] = useState(false)
        const [error, setError] = useState('')

        const submit = async function () {
            if (busy) return
            if (sourceId === '') {
                setError(t('error.notFound'))
                return
            }
            setBusy(true)
            setError('')
            try {
                await api('sources/' + encodeURIComponent(sourceId), { method: 'DELETE' })
                setBusy(false)
                toast(t('toast.sourceDeleted', { name: name !== '' ? name : sourceId }))
                closeModal()
                void loadSources()
                void loadMarket()
            } catch (failure) {
                setBusy(false)
                setError(smErrorMessage(failure))
            }
        }

        return h(SmDialogFrame, {
            modalId: props.modalId,
            isTop: props.isTop,
            layerIndex: props.layerIndex,
            width: 480,
            confirm: true,
            title: t('source.confirmDelete.title'),
            footer: h(Fragment, null,
                h(SmButton, { tone: 'secondary', onClick: function () { smRequestCloseModal() } }, t('action.cancel')),
                h(SmButton, { tone: 'danger', disabled: busy, onClick: function () { void submit() } }, t('action.deleteSource'))),
        },
        error !== '' ? h(SmBanner, { tone: 'error' }, error) : null,
        h('p', { style: { margin: 0, color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 1px)', lineHeight: '1.55' } }, t('source.confirmDelete.body')),
        name !== '' ? h('div', { className: 'sm-mono', style: { wordBreak: 'break-all', color: 'var(--dsw-alias-label-primary)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, name) : null)
    }

    /* ------------------------------------------------------------------ *
     * 诊断抽屉（420，DG-01～DG-03 / PRD §9）。                            *
     * ------------------------------------------------------------------ */

    function smDiagnosticsPayload() {
        if (smDiagnostics.data !== null && typeof smDiagnostics.data === 'object') return smDiagnostics.data
        if (appState.diagnostics !== null && typeof appState.diagnostics === 'object') return appState.diagnostics
        return null
    }

    function openDiagnosticsDrawer() {
        smHideTooltip()
        if (!smDiagnostics.open) {
            smDiagnostics.open = true
            smLockScroll()
        }
        if (typeof rerender === 'function') rerender()
        void smLoadDiagnostics()
    }

    function smCloseDiagnostics() {
        if (!smDiagnostics.open) return
        smDiagnostics.open = false
        smUnlockScroll()
        smHideTooltip()
        if (typeof rerender === 'function') rerender()
    }

    async function smLoadDiagnostics() {
        smDiagnostics.loading = true
        smDiagnostics.error = null
        if (typeof rerender === 'function') rerender()
        try {
            const cwd = typeof appState.cwd === 'string' ? appState.cwd : ''
            const data = await api('diagnostics' + (cwd === '' ? '' : '?cwd=' + encodeURIComponent(cwd)))
            smDiagnostics.data = data !== null && typeof data === 'object' ? data : null
            appState.diagnostics = smDiagnostics.data
            smDiagnostics.error = null
        } catch (failure) {
            smDiagnostics.error = failure !== null && typeof failure === 'object' ? failure : {}
        } finally {
            smDiagnostics.loading = false
            if (typeof rerender === 'function') rerender()
        }
    }

    /** 八类问题归一化；同一套用户语言。 */
    function smIssueKind(issue) {
        const raw = smText(issue.kind, smText(issue.type)).toLowerCase()
        if (raw === '') return 'unreadable'
        if (raw.indexOf('same') !== -1 || raw.indexOf('shadow') !== -1 || raw.indexOf('duplicate') !== -1) return 'same-name'
        if (raw.indexOf('source') !== -1) return 'source-unreachable'
        if (raw.indexOf('broken') !== -1 || raw.indexOf('link') !== -1) return 'broken-link'
        if (raw.indexOf('frontmatter') !== -1 || raw.indexOf('format') !== -1 || raw.indexOf('schema') !== -1) return 'frontmatter'
        if (raw.indexOf('oversize') !== -1 || raw.indexOf('large') !== -1) return 'oversize'
        if (raw.indexOf('missing') !== -1 || raw.indexOf('not-found') !== -1 || raw.indexOf('enoent') !== -1) return 'missing'
        if (raw.indexOf('name') !== -1) return 'name'
        if (raw.indexOf('unreadable') !== -1 || raw.indexOf('permission') !== -1 || raw.indexOf('eacces') !== -1) return 'unreadable'
        return 'unreadable'
    }

    function smIssueSection(issue) {
        const kind = smIssueKind(issue)
        /* 同名问题无论来源层都算「未生效」，进入警示图标计数。 */
        if (kind === 'same-name') return 'inactive'
        if (kind === 'oversize' || kind === 'source-unreachable') return 'attention'
        if (issue.severity === 'info') return 'attention'
        return 'inactive'
    }

    /** 仅用于「详细信息」层；技术类型名只在这里出现。 */
    function smIssueTypeLabel(issue) {
        return smText(issue.kind, smText(issue.type, t('error.read')))
    }

    function smIssueSentence(issue) {
        const kind = smIssueKind(issue)
        const name = smText(issue.name, smText(issue.path, '—'))
        if (kind === 'same-name') {
            const category = smText(issue.category, smCategoryForLocation(issue.location))
            const group = smText(issue.group, smText(issue.categoryLabel, smText(issue.locationName, smCategoryLabel(category) || t('tab.category.mine'))))
            return t('diag.sentence.sameName', { name: name, group: group })
        }
        if (kind === 'frontmatter') return t('diag.sentence.frontmatter', { name: name })
        if (kind === 'name') return t('diag.sentence.name', { name: name })
        if (kind === 'broken-link') return t('diag.sentence.brokenLink', { name: name })
        if (kind === 'oversize') return t('diag.sentence.oversize', { name: name })
        if (kind === 'source-unreachable') return t('diag.sentence.sourceUnreachable', { name: name, source: smText(issue.source, smText(issue.sourceName, '—')) })
        return t('diag.sentence.unreadable', { name: name })
    }

    function smIssueAction(issue) {
        const kind = smIssueKind(issue)
        if (kind === 'same-name') return { id: 'view-active', label: t('action.viewActive') }
        if (kind === 'frontmatter') return { id: 'open-file', label: t('action.openFile') }
        if (kind === 'name') return { id: 'open-file', label: t('action.openFile') }
        if (kind === 'broken-link') return { id: 'remove-link', label: t('action.removeLink') }
        if (kind === 'oversize') return { id: 'trim', label: t('action.viewFile') }
        if (kind === 'source-unreachable') return { id: 'manage-sources', label: t('diag.fix.manageSources') }
        if (kind === 'missing') return { id: 'retry', label: t('action.retry') }
        return { id: 'open-folder', label: t('diag.fix.openFolder') }
    }

    function smOpenSkillDetail(skill) {
        if (skill === null || typeof skill !== 'object') return
        setState({ tab: 'skills', view: 'detail', detail: { kind: 'installed', id: smText(skill.id), name: smText(skill.name) } })
    }

    function smRunIssueFix(issue, setBusy, setError) {
        const action = smIssueAction(issue).id
        const name = smText(issue.name)
        const path = smText(issue.path)
        const findSkill = function () {
            return smFindSkillById(issue.id) || smFindSkillByName(name) || (path !== '' ? smFindSkillById(path) : null)
        }
        const openEditor = function () {
            const skill = findSkill()
            if (path === '' && (skill === null || smText(skill.path) === '')) {
                setError(t('error.notFound'))
                return
            }
            openModal('edit-content', { skill: skill, name: name, path: path !== '' ? path : smText(skill !== null ? skill.path : ''), mtime: skill !== null ? smNumber(skill.mtime, 0) : 0 })
        }

        if (action === 'view-active') {
            const active = smFindActiveSkillByName(name)
            if (active === null) {
                toast(t('error.notFound'), { tone: 'error' })
                return
            }
            smCloseDiagnostics()
            smOpenSkillDetail(active)
            return
        }
        if (action === 'open-file' || action === 'trim') {
            openEditor()
            return
        }
        if (action === 'manage-sources') {
            if (typeof openSourceDialog === 'function') {
                openSourceDialog()
                return
            }
            setError(t('error.unexpected'))
            return
        }
        if (action === 'open-folder') {
            if (typeof openFolder === 'function') {
                openFolder(path)
                return
            }
            smCopyText(path, t('toast.copied'))
            return
        }
        if (action === 'retry') {
            void smLoadDiagnostics()
            return
        }
        if (action === 'remove-link') {
            if (path === '') {
                setError(t('error.notFound'))
                return
            }
            setBusy(true)
            setError('')
            api('skill?path=' + encodeURIComponent(path), { method: 'DELETE' }).then(function () {
                setBusy(false)
                toast(t('diag.toast.fixed'))
                void loadInstalled(true)
                void smLoadDiagnostics()
            }).catch(function (failure) {
                setBusy(false)
                setError(t('diag.error.fixFailed', { reason: smErrorMessage(failure) }))
            })
        }
    }

    function SmIssueCard(props) {
        const issue = props.issue
        const [detailsOpen, setDetailsOpen] = useState(false)
        const [busy, setBusy] = useState(false)
        const [fixError, setFixError] = useState('')
        const kind = smIssueKind(issue)
        const action = smIssueAction(issue)
        const name = smText(issue.name, smText(issue.path, '—'))
        const path = smText(issue.path)
        const effective = smText(issue.effective, smText(issue.activeName, smText(issue.shadowedBy, smText(issue.effectivePath, smText(issue.activePath)))))

        return h('div', { className: 'sm-issue', style: { display: 'flex', flexDirection: 'column', gap: '8px', padding: '14px 16px', borderRadius: '16px', background: 'var(--dsw-alias-bg-layer-1)', border: '1px solid var(--dsw-alias-border-l2)' } },
            h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: '8px', minWidth: 0 } },
                h('span', { style: { flexShrink: 0, color: kind === 'oversize' || kind === 'source-unreachable' ? 'var(--dsw-alias-label-secondary)' : 'var(--dsw-alias-state-warn-primary)' } }, icon(kind === 'oversize' || kind === 'source-unreachable' ? 'info' : 'alert', 16)),
                h('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 } },
                    h('span', { className: 'sm-mono', style: { wordBreak: 'break-all', color: 'var(--dsw-alias-label-primary)', fontSize: 'calc(var(--sm-fs) - 1px)', fontWeight: 500 } }, name),
                    h('span', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)', lineHeight: '1.5' } }, smIssueSentence(issue)))),
            fixError !== '' ? h('div', { style: { color: 'var(--dsw-alias-state-error-primary)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, fixError) : null,
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } },
                h(SmButton, { tone: 'primary', style: { height: '28px' }, disabled: busy, onClick: function () { smRunIssueFix(issue, setBusy, setFixError) } }, action.label),
                h(SmButton, {
                    tone: 'ghost',
                    style: { height: '28px' },
                    onClick: function () { setDetailsOpen(!detailsOpen) },
                }, detailsOpen ? t('diag.details.hide') : t('diag.details'))),
            detailsOpen
                ? h('div', { className: 'sm-issue-detail', style: { display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '6px', borderTop: '1px solid var(--dsw-alias-border-l2)' } },
                    path !== ''
                        ? h('div', { style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' } },
                            h('span', { className: 'sm-mono', style: { minWidth: 0, wordBreak: 'break-all', color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 3px)' } }, t('diag.path') + ': ' + path),
                            h(SmButton, { tone: 'ghost', icon: 'copy', style: { height: '24px', flexShrink: 0 }, onClick: function () { smCopyText(path, t('toast.copied')) } }, t('action.copyPath')))
                        : null,
                    h('div', { style: { color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 3px)' } }, t('diag.kind') + ': ' + smIssueTypeLabel(issue)),
                    effective !== '' ? h('div', { style: { color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 3px)' } }, t('diag.effective') + ': ' + effective) : null,
                    h('div', { style: { color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 3px)' } }, t('diag.fixHint')))
                : null)
    }

    function SmDiagnosticsDrawer() {
        const payload = smDiagnosticsPayload()
        const issues = payload !== null && Array.isArray(payload.issues) ? payload.issues.filter(function (issue) { return issue !== null && typeof issue === 'object' }) : []
        const inactive = issues.filter(function (issue) { return smIssueSection(issue) === 'inactive' })
        const attention = issues.filter(function (issue) { return smIssueSection(issue) === 'attention' })
        const checkedAt = payload !== null && typeof payload.checkedAt === 'number' ? payload.checkedAt : 0
        const loading = smDiagnostics.loading || (payload === null && smDiagnostics.error === null)
        const sortByName = function (left, right) {
            return smText(left.name, left.path).localeCompare(smText(right.name, right.path))
        }
        const partial = payload !== null && (payload.partial === true || payload.incomplete === true)

        const sections = []
        if (inactive.length > 0) {
            sections.push(h('section', { key: 'inactive', style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
                h('h4', { style: { margin: 0, color: 'var(--dsw-alias-label-primary)', fontSize: 'calc(var(--sm-fs) - 1px)', fontWeight: 500 } }, t('diag.section.inactive')),
                inactive.slice().sort(sortByName).map(function (issue, index) {
                    return h(SmIssueCard, { key: smText(issue.id, 'inactive-' + String(index)), issue: issue })
                })))
        }
        if (attention.length > 0) {
            sections.push(h('section', { key: 'attention', style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
                h('h4', { style: { margin: 0, color: 'var(--dsw-alias-label-primary)', fontSize: 'calc(var(--sm-fs) - 1px)', fontWeight: 500 } }, t('diag.section.attention')),
                attention.slice().sort(sortByName).map(function (issue, index) {
                    return h(SmIssueCard, { key: smText(issue.id, 'attention-' + String(index)), issue: issue })
                })))
        }

        let body
        if (loading) {
            body = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
                h('div', { style: { height: '64px', borderRadius: '14px', background: 'var(--dsw-alias-bg-layer-1)' } }),
                h('div', { style: { height: '64px', borderRadius: '14px', background: 'var(--dsw-alias-bg-layer-1)' } }),
                h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 1px)' } }, t('state.loading')))
        } else if (smDiagnostics.error !== null) {
            body = h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '48px 20px', textAlign: 'center' } },
                h('span', { style: { color: 'var(--dsw-alias-state-error-primary)' } }, icon('alert', 28)),
                h('div', { style: { color: 'var(--dsw-alias-label-primary)', fontSize: 'var(--sm-fs)', fontWeight: 500 } }, t('state.error.diag.title')),
                h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, smErrorMessage(smDiagnostics.error)),
                h(SmButton, { tone: 'secondary', onClick: function () { void smLoadDiagnostics() } }, t('action.retry')))
        } else if (issues.length === 0) {
            body = h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '56px 20px', textAlign: 'center' } },
                h('span', { style: { color: 'var(--dsw-alias-state-success-primary)' } }, icon('check', 32)),
                h('div', { style: { color: 'var(--dsw-alias-label-primary)', fontSize: 'var(--sm-fs)', fontWeight: 500 } }, t('empty.diag.title')),
                h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)' } }, t('empty.diag.body')))
        } else {
            body = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '16px' } },
                partial ? h(SmBanner, { tone: 'warn' },
                    h('span', null, t('diag.partial')),
                    h(SmButton, { tone: 'secondary', style: { alignSelf: 'flex-start', height: '28px' }, onClick: function () { void smLoadDiagnostics() } }, t('action.retry'))) : null,
                sections,
                h('div', { style: { color: 'var(--dsw-alias-label-caption)', fontSize: 'calc(var(--sm-fs) - 3px)', lineHeight: '1.5' } }, t('diag.note')))
        }

        return h('div', {
            className: 'sm-drawer-mask sm-drawer-backdrop',
            style: { position: 'fixed', inset: 0, zIndex: 1100, background: 'var(--dsw-alias-bg-mask-1, rgba(0, 0, 0, 0.5))' },
            onMouseDown: function (event) {
                if (event.target !== event.currentTarget) return
                if (smModalStack.length > 0) return
                smCloseDiagnostics()
            },
        },
        h('aside', {
            className: 'sm-drawer sm-diagnostics',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': t('diag.title'),
            style: { position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(420px, 92vw)', display: 'flex', flexDirection: 'column', background: 'var(--dsw-alias-bg-layer-2)', borderLeft: '.5px solid var(--dsw-alias-border-l2)', boxShadow: 'none' },
        },
        h('div', { className: 'sm-drawer-head', style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', padding: '20px 20px 14px', borderBottom: '1px solid var(--dsw-alias-border-l2)' } },
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 } },
                h('h3', { style: { margin: 0, fontSize: 'calc(var(--sm-fs) + 1px)', fontWeight: 500, color: 'var(--dsw-alias-label-primary)' } }, t('diag.title')),
                h('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 'calc(var(--sm-fs) - 2px)' } },
                    t('diag.summary', { active: inactive.length, attention: attention.length }) + ' · ' + t('diag.checkedAt', { time: checkedAt > 0 ? fmtTime(checkedAt) : '—' }))),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 } },
                h(SmButton, { tone: 'secondary', style: { height: '28px' }, disabled: loading, onClick: function () { void smLoadDiagnostics() } }, loading ? t('diag.rechecking') : t('diag.recheck')),
                h('button', {
                    type: 'button',
                    className: 'sm-icon-btn',
                    'aria-label': t('action.close'),
                    onClick: smCloseDiagnostics,
                }, icon('x', 16)))),
        h('div', { className: 'sm-drawer-body', style: { flex: '1 1 auto', minHeight: 0, overflowY: 'auto', padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: '12px' } }, body)))
    }

    function renderDiagnosticsDrawer() {
        if (!smDiagnostics.open) return null
        return h(SmDiagnosticsDrawer)
    }
// ===== 90-styles.js =====
    /** Every style rule of the panel, scoped under .sm-root. */
    const STYLES = `
/* ================================================================== *
 * skill-manager v2 — DSH native-parity stylesheet                     *
 * Contract: design/implementation-contract-v2.md §7                   *
 * Rules: token colours only (--dsw-* / color-mix on tokens);          *
 *        font sizes only via --sm-fs; no gradients; no box-shadow     *
 *        except "none"; hover and selected share one background       *
 *        token and differ by text colour.                             *
 * ================================================================== */

/* ------------------------------------------------------------------ *
 * 1. Root, font scale and reset                                      *
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
  line-height: 1.5;
  font-family: var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif);
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
}

/* Low-specificity reset: :where() keeps component classes in control of
 * background / colour / font-size. */
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

/* Native focus: background + text colour, never a coloured outline. */
.sm-root :where(button, [tabindex]):focus-visible {
  outline: none;
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}

.sm-root :where(input, select, textarea):focus-visible {
  outline: none;
  border-color: var(--dsw-alias-border-l3);
}

/* Scroll surfaces share one thin scrollbar. */
.sm-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  scrollbar-gutter: stable;
  padding: 0 0 48px;
  scrollbar-width: thin;
  scrollbar-color: var(--dsw-alias-scrollbar-bg-l1) transparent;
}

.sm-scroll::-webkit-scrollbar,
.sm-dialog-body::-webkit-scrollbar,
.sm-source-list::-webkit-scrollbar,
.sm-drawer::-webkit-scrollbar,
.sm-code::-webkit-scrollbar,
.sm-files::-webkit-scrollbar,
.sm-editor::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.sm-scroll::-webkit-scrollbar-track,
.sm-dialog-body::-webkit-scrollbar-track,
.sm-source-list::-webkit-scrollbar-track,
.sm-drawer::-webkit-scrollbar-track,
.sm-code::-webkit-scrollbar-track,
.sm-files::-webkit-scrollbar-track,
.sm-editor::-webkit-scrollbar-track {
  background: transparent;
}

.sm-scroll::-webkit-scrollbar-thumb,
.sm-dialog-body::-webkit-scrollbar-thumb,
.sm-source-list::-webkit-scrollbar-thumb,
.sm-drawer::-webkit-scrollbar-thumb,
.sm-code::-webkit-scrollbar-thumb,
.sm-files::-webkit-scrollbar-thumb,
.sm-editor::-webkit-scrollbar-thumb {
  background: var(--dsw-alias-scrollbar-bg-l1);
  border-radius: 999px;
}

/* ------------------------------------------------------------------ *
 * 2. Page skeleton: 960px content column, fluid side inset           *
 * ------------------------------------------------------------------ */

.sm-page {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
}

/* Only the outer page (list / detail shell) fills the panel; nested tab
 * pages grow naturally inside .sm-tab-view.sm-scroll. */
.sm-root > .sm-page {
  flex: 1 1 auto;
  overflow: hidden;
  --sm-content-max: 960px;
  /* DSH plugin page puts its h1 28px from the window top. */
  padding: 28px clamp(20px, 4vw, 48px) 0;
}

/* Header, tabs, list and detail share the same column, so their left
 * edges line up instead of hugging the window edge. */
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

/* Header → primary tabs keeps one step above the 16px in-page rhythm, so
 * the 40px top inset reads as breathing room rather than a gap. */
.sm-page > * + * {
  margin-top: 20px;
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
  /* DSH plugin page title: 20px / 500 / 28px. */
  font-size: calc(var(--sm-fs) + 6px);
  font-weight: 500;
  line-height: 1.4;
  letter-spacing: -0.01em;
  color: var(--dsw-alias-label-primary);
}

.sm-page-desc {
  margin: 6px 0 0;
  font-size: calc(var(--sm-fs) - 1px);
  line-height: 1.5;
  color: var(--dsw-alias-label-secondary);
}

/* v1 aliases kept for the current header markup. */
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
  /* v1 alias shares the same element as .sm-page-title; keep both at 20px. */
  font-size: calc(var(--sm-fs) + 6px);
  font-weight: 500;
  line-height: 1.4;
  letter-spacing: -0.01em;
  color: var(--dsw-alias-label-primary);
}

.sm-desc {
  margin: 6px 0 0;
  font-size: calc(var(--sm-fs) - 1px);
  line-height: 1.5;
  color: var(--dsw-alias-label-secondary);
}

/* ------------------------------------------------------------------ *
 * 3. Toolbar: search, sort, native icon buttons                      *
 * ------------------------------------------------------------------ */

.sm-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
  margin-left: auto;
  min-width: 0;
}

.sm-toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
}

/* Toolbar buttons follow the plugin page: the secondary one is borderless and
 * transparent, the primary one is the near-white fill with dark label. */
.sm-toolbar .sm-btn.sm-toolbar-btn {
  height: 32px;
  padding: 0 12px;
  border-radius: 12px;
  font-size: calc(var(--sm-fs) - 1px);
  font-weight: 400;
}

.sm-toolbar .sm-btn-secondary.sm-toolbar-btn {
  background: transparent;
  border-color: transparent;
  color: var(--dsw-alias-label-primary);
}

.sm-toolbar .sm-btn-secondary.sm-toolbar-btn:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover);
}

.sm-toolbar .sm-btn-primary.sm-toolbar-btn {
  background: var(--dsw-static-neutral-bluish-50, #f9fafb);
  border-color: var(--dsw-static-neutral-bluish-50, #f9fafb);
  color: var(--dsw-static-neutral-bluish-1000, #0f1115);
}

.sm-toolbar .sm-btn-primary.sm-toolbar-btn:hover:not(:disabled) {
  background: var(--dsw-static-neutral-bluish-60, #f1f3f5);
  border-color: var(--dsw-static-neutral-bluish-60, #f1f3f5);
}

.sm-toolbar-icons {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.sm-search {
  position: relative;
  width: 240px;
  max-width: 100%;
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

.sm-search::placeholder,
.sm-search input::placeholder {
  color: var(--dsw-alias-label-caption);
}

.sm-search:focus,
.sm-search:focus-within {
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

.sm-select {
  height: 33px;
  padding: 0 10px;
  border-radius: 12px;
  border: 0.5px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-secondary);
  font-size: calc(var(--sm-fs) - 1px);
  font-family: inherit;
  cursor: pointer;
  outline: none;
}

.sm-select:focus {
  border-color: var(--dsw-alias-border-l3);
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

/* Native .iconButton: 30×30 hit area, 6px padding, radius-sm,
 * hover bg-layer-1 + label-primary. */
.sm-tool-btn {
  width: 30px;
  height: 30px;
  padding: 6px;
  border-radius: var(--dsw-radius-sm);
  background: transparent;
  border: 0;
  color: var(--dsw-alias-label-tertiary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.sm-tool-btn svg {
  width: 16px;
  height: 16px;
}

.sm-tool-btn:hover:not(:disabled),
.sm-tool-btn:focus-visible {
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
}

/* Transitional alias: market toolbar markup still renders .sm-icon-btn until
 * R3 switches it to .sm-tool-btn; both must be 30×30 here. */
.sm-toolbar-icons .sm-icon-btn {
  width: 30px;
  height: 30px;
  padding: 6px;
}

/* Plain icon button (row ⋯, refresh, dialog close). */
.sm-icon-btn {
  width: 28px;
  height: 28px;
  padding: 6px;
  border-radius: var(--dsw-radius-sm);
  border: 0;
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
}

.sm-icon-btn svg {
  width: 16px;
  height: 16px;
}

.sm-icon-btn:hover:not(:disabled),
.sm-icon-btn:focus-visible {
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
}

.sm-icon-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.sm-icon-btn.plain {
  background: transparent;
  border: 0;
}

.sm-icon-btn.plain:hover {
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
}

/* ------------------------------------------------------------------ *
 * 4. Tabs                                                            *
 * ------------------------------------------------------------------ */

/* Tab row: primary tabs on the left, status icons on the right. */
.sm-tabs-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  min-width: 0;
}

/* Primary tabs: 34px container, 28px tabs (contract §7.1). */
.sm-tabs {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  height: 34px;
  padding: 3px;
  border-radius: 14px;
  background: var(--dsw-alias-bg-layer-3);
  width: fit-content;
  max-width: 100%;
  flex-shrink: 0;
}

.sm-tab {
  height: 28px;
  padding: 0 12px;
  border-radius: var(--dsw-radius-lg);
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  font-size: var(--sm-fs);
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  cursor: pointer;
}

/* Hover only changes the background; selection is what raises the text
 * colour to primary (native parity §2.1). */
.sm-tab:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}

.sm-tab.active,
.sm-tab.sm-active,
.sm-tab.sm-tab-active,
.sm-tab[aria-selected="true"] {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
  font-weight: 500;
}

.sm-tab-badge,
.sm-tab-count,
.sm-count-badge {
  min-width: 16px;
  height: 18px;
  padding: 0 6px;
  border-radius: 999px;
  background: transparent;
  color: var(--dsw-alias-label-caption);
  font-size: calc(var(--sm-fs) - 3px);
  font-weight: 500;
  line-height: 18px;
  text-align: center;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.sm-tab.active .sm-tab-badge,
.sm-tab.sm-active .sm-tab-badge,
.sm-tab.sm-tab-active .sm-tab-badge,
.sm-tab[aria-selected="true"] .sm-tab-badge,
.sm-tab.active .sm-tab-count,
.sm-tab.sm-active .sm-tab-count,
.sm-tab.sm-tab-active .sm-tab-count,
.sm-tab[aria-selected="true"] .sm-tab-count {
  color: var(--dsw-alias-label-tertiary);
}

.sm-tab-count-warn {
  color: var(--dsw-alias-state-warn-primary);
}

/* Secondary tabs: native .filterTab — 28px / radius 14 / 0 10 padding,
 * hover and selected use the same background. */
.sm-subtabs-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.sm-subtabs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}

.sm-subtab {
  height: 28px;
  padding: 0 10px;
  border-radius: 14px;
  font-size: var(--sm-fs);
  line-height: 22px;
  color: var(--dsw-alias-label-tertiary);
  background: transparent;
  border: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.sm-subtab:hover,
.sm-subtab[aria-selected="true"] {
  background: var(--dsw-alias-interactive-bg-hover);
}

.sm-subtab[aria-selected="true"] {
  color: var(--dsw-alias-label-primary);
}

.sm-subtab[aria-selected="true"] .sm-count-badge {
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
}

/* Status icons: 32×32 hit area, 16px glyph, semantic colours. */
.sm-status-icons {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: auto;
}

.sm-status-btn {
  width: 32px;
  height: 32px;
  padding: 6px;
  border-radius: var(--dsw-radius-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--dsw-alias-label-tertiary);
  background: transparent;
  border: 0;
  flex-shrink: 0;
}

.sm-status-btn svg {
  width: 16px;
  height: 16px;
}

.sm-status-btn.warn {
  color: var(--dsw-alias-state-warn-primary);
}

.sm-status-btn.update {
  color: var(--dsw-alias-state-business-primary);
}

.sm-status-btn:hover:not(:disabled),
.sm-status-btn:focus-visible {
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
}

/* v2 markup: .sm-icon-btn.sm-status-icon — same 32×32 hit area. */
.sm-icon-btn.sm-status-icon {
  width: 32px;
  height: 32px;
  padding: 6px;
}

.sm-icon-btn.sm-status-icon svg {
  width: 16px;
  height: 16px;
}

.sm-status-icon-warn {
  color: var(--dsw-alias-state-warn-primary);
}

.sm-status-icon-update {
  color: var(--dsw-alias-state-business-primary);
}

.sm-icon-btn.sm-status-icon:hover:not(:disabled),
.sm-icon-btn.sm-status-icon:focus-visible {
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
}

/* ------------------------------------------------------------------ *
 * 5. Controls: buttons, chips, inputs, switch                        *
 * ------------------------------------------------------------------ */

.sm-btn,
.sm-btn-primary,
.sm-btn-secondary,
.sm-btn-ghost,
.sm-btn-icon,
.sm-btn-danger,
.sm-btn-dangerSolid {
  height: 32px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font-size: calc(var(--sm-fs) - 1px);
  font-weight: 500;
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  white-space: nowrap;
  cursor: pointer;
}

.sm-btn:disabled,
.sm-btn-primary:disabled,
.sm-btn-secondary:disabled,
.sm-btn-ghost:disabled,
.sm-btn-icon:disabled,
.sm-btn-danger:disabled,
.sm-btn-dangerSolid:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.sm-btn-primary {
  background: var(--dsw-alias-button-primary-fill, var(--dsw-alias-label-primary));
  border-color: var(--dsw-alias-button-primary-fill, var(--dsw-alias-label-primary));
  color: var(--dsw-alias-label-primary-foreground, var(--dsw-alias-bg-base));
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
  width: 30px;
  height: 30px;
  padding: 6px;
  border-radius: var(--dsw-radius-sm);
  background: transparent;
  border-color: transparent;
  color: var(--dsw-alias-label-tertiary);
}

.sm-btn-icon:hover:not(:disabled) {
  background: var(--dsw-alias-bg-layer-1);
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

.sm-btn-dangerSolid:hover:not(:disabled) {
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 85%, transparent);
}

.sm-btn-sm {
  height: 28px;
  padding: 0 10px;
  border-radius: 10px;
  font-size: calc(var(--sm-fs) - 2px);
}

.sm-check-updates {
  gap: 6px;
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
}

.sm-chip:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}

/* Selected chips follow the same rule as tabs: same background token as
 * hover, text colour carries the state. */
.sm-chip.active,
.sm-chip.sm-active,
.sm-chip.sm-chip-active,
.sm-chip[aria-pressed="true"] {
  background: var(--dsw-alias-interactive-bg-hover);
  border-color: transparent;
  color: var(--dsw-alias-label-primary);
  font-weight: 500;
}

.sm-chip-active {
  background: var(--dsw-alias-interactive-bg-hover);
  border-color: transparent;
  color: var(--dsw-alias-label-primary);
  font-weight: 500;
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
}

.sm-input::placeholder {
  color: var(--dsw-alias-label-caption);
}

.sm-input:focus {
  border-color: var(--dsw-alias-border-l3);
}

textarea.sm-input {
  height: auto;
  padding: 8px 12px;
  resize: vertical;
  min-height: 62px;
  line-height: 1.55;
}

textarea.sm-input.sm-edit-body {
  min-height: 320px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: calc(var(--sm-fs) - 2px);
  line-height: 1.65;
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
}

.sm-textarea:focus {
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
}

.sm-switch[aria-checked="true"],
.sm-switch.on {
  background: var(--dsw-alias-button-primary-fill, var(--dsw-alias-label-primary));
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

/* ------------------------------------------------------------------ *
 * 6. Two-column card grid (contract §7.3)                            *
 * ------------------------------------------------------------------ */

.sm-card-grid,
.sm-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  min-width: 0;
}

@media (max-width: 720px) {
  .sm-card-grid,
  .sm-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

.sm-card-item {
  min-height: 96px;
  padding: 12px;
  min-width: 0;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  border: 0.5px solid var(--dsw-alias-settings-card-stroke);
  border-radius: var(--dsw-radius-xl);
  background: var(--dsw-alias-settings-card-fill);
  cursor: pointer;
  transition: background 120ms ease;
}

/* Hover only changes the background: no border, no shift, no scale. */
.sm-card-item:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}

.sm-card-item.is-disabled {
  opacity: 0.6;
}

.sm-card-item.is-highlight {
  outline: 1.5px solid var(--dsw-alias-brand-primary);
  outline-offset: -1px;
}

.sm-card-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--dsw-radius-lg);
  border: 0.5px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  position: relative;
  color: var(--dsw-alias-label-secondary);
}

.sm-card-icon svg {
  width: 22px;
  height: 22px;
}

.sm-card-main {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding-top: 1px;
}

.sm-card-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.sm-card-name {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  /* DSH plugin card title: 16px. */
  font-size: calc(var(--sm-fs) + 2px);
  font-weight: 500;
  line-height: 1.4;
  color: var(--dsw-alias-label-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.sm-card-desc {
  font-size: calc(var(--sm-fs) - 1px);
  color: var(--dsw-alias-label-tertiary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.sm-card-item.is-disabled .sm-card-name,
.sm-card-item.is-disabled .sm-card-desc {
  color: var(--dsw-alias-label-caption);
}

/* Right side: horizontal, ⋯ on the left, primary action on the right. */
.sm-card-tail {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex: none;
  align-self: center;
  margin-left: auto;
}

/* ⋯ is hidden by default and fades in on card hover / focus. */
.sm-card-more {
  width: 26px;
  height: 26px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 120ms ease;
}

.sm-card-item:hover .sm-card-more,
.sm-card-item:focus-within .sm-card-more,
.sm-card-more:focus-visible {
  opacity: 1;
  pointer-events: auto;
}

/* ------------------------------------------------------------------ *
 * 7. Groups (source grouping in the skills tab)                      *
 * ------------------------------------------------------------------ */

.sm-installed {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.sm-installed-loading {
  gap: 12px;
}

.sm-groups,
.sm-skill-groups {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.sm-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.sm-group + .sm-group {
  margin-top: 24px;
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

.sm-group-head-toggle {
  cursor: pointer;
  user-select: none;
}

.sm-group-disabled {
  opacity: 0.72;
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

/* Market source blocks (v2) */
.sm-market-blocks {
  display: flex;
  flex-direction: column;
  gap: 28px;
  min-width: 0;
}

.sm-source-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.sm-market > .sm-source-block + .sm-source-block {
  margin-top: 28px;
}

.sm-source-block-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 2px;
  min-width: 0;
}

.sm-source-block-title {
  font-size: var(--sm-fs);
  font-weight: 500;
  color: var(--dsw-alias-label-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sm-source-block-count {
  font-size: calc(var(--sm-fs) - 2px);
  color: var(--dsw-alias-label-caption);
  white-space: nowrap;
}

.sm-source-block-actions {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

/* ------------------------------------------------------------------ *
 * 8. Rows (legacy market / skeleton rows)                            *
 * ------------------------------------------------------------------ */

.sm-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
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
  transition: background 120ms ease;
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
  background: var(--dsw-alias-settings-card-fill);
  border-color: var(--dsw-alias-border-l1);
}

.sm-row.market:hover,
.sm-row-market:hover,
.sm-market .sm-row:hover,
.sm-row[data-kind="market"]:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  border-color: var(--dsw-alias-border-l1);
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
.sm-tag-bar,
.sm-tagbar {
  max-width: 340px;
  overflow: hidden;
  flex-wrap: nowrap;
  display: flex;
  gap: 6px;
  align-items: center;
  min-width: 0;
  flex-shrink: 1;
}

.sm-market-card {
  min-height: 96px;
}

.sm-market-skeleton {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
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

/* Status dots */
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
.sm-detail-icon > .sm-dot,
.sm-card-icon > .sm-dot {
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

/* ------------------------------------------------------------------ *
 * 9. Badges                                                          *
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
}

.sm-badge-update svg {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
}

.sm-badge-builtin,
.sm-badge-loc {
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
 * 10. State surfaces: banners, empty, skeleton, spinner              *
 * ------------------------------------------------------------------ */

.sm-banners {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

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
 * 11. In-page two-column detail                                      *
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
  border-radius: var(--dsw-radius-sm);
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  font-size: calc(var(--sm-fs) - 1px);
  font-family: inherit;
  cursor: pointer;
  align-self: flex-start;
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

.sm-detail-meta,
.sm-detail-content,
.sm-detail-when,
.sm-detail-desc,
.sm-detail-error {
  min-width: 0;
}

.sm-meta-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.sm-meta-label {
  flex-shrink: 0;
  color: var(--dsw-alias-label-caption);
  font-size: calc(var(--sm-fs) - 2px);
}

.sm-meta-value {
  min-width: 0;
  text-align: right;
  word-break: break-all;
  color: var(--dsw-alias-label-primary);
  font-size: calc(var(--sm-fs) - 1px);
}

/* Location row: one line within the right column, ellipsis when it does
 * not fit; the full path is exposed through the native title tooltip. */
.sm-detail-path {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  min-width: 0;
  max-width: 100%;
}

.sm-detail-path-text {
  min-width: 0;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 24×24 copy icon button; hover inherits the native .sm-icon-btn spec
 * (bg-layer-1 + label-primary). */
.sm-detail-path-copy {
  width: 24px;
  height: 24px;
  padding: 4px;
  flex-shrink: 0;
}

.sm-detail-path-copy svg {
  width: 14px;
  height: 14px;
}

/* Detail panel card (distinct from .sm-card-item). */
.sm-card {
  padding: 16px 18px;
  border-radius: var(--dsw-radius-panel);
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-1);
  display: flex;
  flex-direction: column;
  gap: 10px;
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
  border-radius: 14px;
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-secondary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: calc(var(--sm-fs) - 2px);
  line-height: 1.7;
  max-height: 320px;
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
 * 12. Modals: 488 / 480 / 720 widths, transparent veil, no shadow    *
 * ------------------------------------------------------------------ */

.sm-modal-backdrop,
.sm-modal-layer,
.sm-dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  /* DSH dialog mask: a real dim layer, not a transparent hit area. */
  background: var(--dsw-alias-bg-mask-1, rgba(0, 0, 0, 0.5));
  backdrop-filter: none;
}

.sm-dialog {
  width: min(488px, 100%);
  max-width: 100%;
  max-height: min(720px, 100vh - 96px);
  display: flex;
  flex-direction: column;
  background: var(--dsw-static-neutral-bluish-850, var(--dsw-alias-bg-layer-1));
  border: 0.5px solid var(--dsw-alias-border-inverted);
  border-radius: var(--dsw-radius-panel);
  box-shadow: none;
  overflow: hidden;
  color: var(--dsw-alias-label-primary);
  font-size: var(--sm-fs);
}

/* 480 — confirmations */
.sm-dialog.narrow,
.sm-dialog.sm-narrow,
.sm-dialog.sm-dialog-confirm,
.sm-dialog.confirm,
.sm-dialog-confirm,
.sm-narrow {
  width: min(480px, 100vw - 32px);
  border-radius: var(--dsw-radius-xl);
}

/* 720 — large content (edit / preview) */
.sm-dialog.large,
.sm-dialog.sm-dialog-large,
.sm-dialog-preview,
.sm-dialog-edit,
.sm-dialog-large {
  width: min(720px, 100%);
  border-radius: var(--dsw-radius-panel);
}

.sm-dialog.form,
.sm-dialog-form {
  width: min(488px, 100%);
  border-radius: var(--dsw-radius-panel);
}

.sm-dialog-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px 0;
  flex-shrink: 0;
  min-width: 0;
}

.sm-dialog-head-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.sm-dialog-head h2,
.sm-dialog-head .sm-dialog-title,
.sm-dialog-title {
  margin: 0;
  font-size: calc(var(--sm-fs) + 1px);
  font-weight: 500;
  line-height: 1.4;
  color: var(--dsw-alias-label-primary);
  min-width: 0;
}

.sm-dialog-sub {
  margin: 4px 0 0;
  font-size: calc(var(--sm-fs) - 2px);
  color: var(--dsw-alias-label-caption);
}

.sm-dialog-intro {
  margin: 0 0 12px;
  font-size: calc(var(--sm-fs) - 2px);
  color: var(--dsw-alias-label-caption);
  line-height: 1.6;
  flex-shrink: 0;
}

.sm-dialog-close {
  flex-shrink: 0;
}

.sm-dialog-body {
  padding: 16px 20px;
  overflow-y: auto;
  flex: 1 1 auto;
  min-height: 0;
  font-size: var(--sm-fs);
  line-height: 1.6;
  scrollbar-width: thin;
  scrollbar-color: var(--dsw-alias-scrollbar-bg-l1) transparent;
}

.sm-dialog.form .sm-dialog-body,
.sm-dialog-form .sm-dialog-body {
  padding-top: 38px;
}

.sm-dialog.large .sm-dialog-body,
.sm-dialog-large .sm-dialog-body {
  padding-top: 18px;
}

.sm-dialog-foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  min-height: 56px;
  padding: 12px 20px;
  border-top: 1px solid var(--dsw-alias-border-l1);
  flex-shrink: 0;
}

/* Form primitives inside dialogs */
.sm-field,
.sm-form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
  min-width: 0;
}

.sm-field:last-child,
.sm-form-field:last-child {
  margin-bottom: 0;
}

.sm-label,
.sm-form-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: calc(var(--sm-fs) - 1px);
  font-weight: 500;
  line-height: 1.4;
  color: var(--dsw-alias-label-secondary);
}

.sm-form-hint {
  font-size: calc(var(--sm-fs) - 3px);
  color: var(--dsw-alias-label-caption);
  font-weight: 400;
}

.sm-form-error {
  font-size: calc(var(--sm-fs) - 2px);
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
  font-size: calc(var(--sm-fs) - 1px);
  line-height: 1.45;
  cursor: pointer;
}

.sm-radio:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}

.sm-radio.active,
.sm-radio.sm-active,
.sm-radio[data-checked="true"] {
  background: var(--dsw-alias-interactive-bg-hover);
  border-color: var(--dsw-alias-border-l3);
  color: var(--dsw-alias-label-primary);
}

.sm-radio input[type="radio"] {
  margin: 2px 0 0;
  flex-shrink: 0;
  accent-color: var(--dsw-alias-brand-primary);
}

.sm-dropzone {
  padding: 28px 20px;
  border-radius: var(--dsw-radius-lg);
  text-align: center;
  border: 1px dashed var(--dsw-alias-border-l3);
  background: var(--dsw-alias-bg-layer-1);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.sm-dropzone-icon {
  color: var(--dsw-alias-label-caption);
  display: inline-flex;
}

.sm-dropzone-title {
  font-size: calc(var(--sm-fs) - 1px);
  color: var(--dsw-alias-label-secondary);
}

.sm-dropzone-hint {
  font-size: calc(var(--sm-fs) - 3px);
  color: var(--dsw-alias-label-caption);
}

.sm-confirm {
  padding: 2px 0 4px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sm-confirm-ver {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: calc(var(--sm-fs) - 1px);
  color: var(--dsw-alias-label-secondary);
  flex-wrap: wrap;
}

.sm-confirm-ver .sm-mono {
  color: var(--dsw-alias-label-primary);
}

.sm-confirm-note {
  font-size: calc(var(--sm-fs) - 2px);
  color: var(--dsw-alias-label-caption);
  line-height: 1.65;
  margin: 0;
}

.sm-confirm-warn {
  padding: 9px 11px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary) 26%, transparent);
  font-size: calc(var(--sm-fs) - 2px);
  color: var(--dsw-alias-label-secondary);
  line-height: 1.55;
}

.sm-danger-text {
  color: var(--dsw-alias-state-error-primary);
}

/* ------------------------------------------------------------------ *
 * 13. Manage-sources dialog (contract §7.6)                          *
 * ------------------------------------------------------------------ */

.sm-source-dialog {
  /* 与大内容弹窗同档 720；列表需要留白，最少 480 高，多源时到 720 再滚动。 */
  width: min(720px, 100vw - 32px);
  min-height: min(480px, 100vh - 96px);
  max-height: min(720px, 100vh - 96px);
  border-radius: var(--dsw-radius-panel);
  border: 0.5px solid var(--dsw-alias-border-inverted);
  box-shadow: none;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--dsw-static-neutral-bluish-850, var(--dsw-alias-bg-layer-1));
  color: var(--dsw-alias-label-primary);
  font-size: var(--sm-fs);
}

.sm-source-dialog .sm-dialog-body {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-top: 14px;
  padding-bottom: 16px;
}

.sm-source-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  min-height: 0;
  padding-right: 2px;
  scrollbar-width: thin;
  scrollbar-color: var(--dsw-alias-scrollbar-bg-l1) transparent;
}

.sm-source-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  min-width: 0;
  min-height: 56px;
}

.sm-source-name-wrap {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sm-source-drag-hint {
  margin: 0;
  font-size: calc(var(--sm-fs) - 3px);
  line-height: 1.5;
  color: var(--dsw-alias-label-caption);
}

/* Drag ghost that follows the pointer while reordering sources. */
.sm-source-ghost {
  position: fixed;
  z-index: 1400;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: var(--dsw-radius-sm);
  border: 0.5px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
  font-size: calc(var(--sm-fs) - 1px);
  pointer-events: none;
}

.sm-source-row:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}

.sm-source-row.is-dragging {
  opacity: 0.5;
}

.sm-drag-handle {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  color: var(--dsw-alias-label-tertiary);
}

.sm-drag-handle:active,
.sm-source-row.is-dragging .sm-drag-handle {
  cursor: grabbing;
}

.sm-drop-indicator {
  height: 2px;
  border-radius: 2px;
  background: var(--dsw-alias-state-business-primary);
  flex-shrink: 0;
}

.sm-source-row.is-drop-before::before,
.sm-source-row.is-drop-after::after,
.sm-source.is-drop-before::before,
.sm-source.is-drop-after::after {
  content: "";
  position: absolute;
  left: 8px;
  right: 8px;
  height: 2px;
  border-radius: 2px;
  background: var(--dsw-alias-state-business-primary);
  pointer-events: none;
}

.sm-source-row.is-drop-before::before,
.sm-source.is-drop-before::before {
  top: -5px;
}

.sm-source-row.is-drop-after::after,
.sm-source.is-drop-after::after {
  bottom: -5px;
}

.sm-source-row.is-drop-before,
.sm-source-row.is-drop-after,
.sm-source.is-drop-before,
.sm-source.is-drop-after {
  position: relative;
}

.sm-source-main {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sm-source-top {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.sm-source-name {
  font-size: var(--sm-fs);
  font-weight: 500;
  flex: 1 1 auto;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--dsw-alias-label-primary);
}

.sm-source-url {
  font-size: calc(var(--sm-fs) - 3px);
  color: var(--dsw-alias-label-caption);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sm-source-meta {
  font-size: calc(var(--sm-fs) - 3px);
  color: var(--dsw-alias-label-caption);
}

.sm-source-error {
  font-size: calc(var(--sm-fs) - 3px);
  color: var(--dsw-alias-state-error-primary);
  line-height: 1.5;
}

.sm-source-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.sm-source-actions .sm-icon-btn {
  width: 28px;
  height: 28px;
}

/* Legacy source card (v1 sources page) */
.sm-source {
  padding: 10px 12px;
  border-radius: 14px;
  background: var(--dsw-alias-bg-layer-1);
  border: 1px solid var(--dsw-alias-border-l2);
  display: flex;
  flex-direction: column;
  gap: 4px;
  position: relative;
}

.sm-source.is-off {
  opacity: 0.6;
}

.sm-source.is-dragging {
  opacity: 0.4;
}

.sm-source:active .sm-drag-handle,
.sm-source.is-dragging .sm-drag-handle {
  cursor: grabbing;
}

/* ------------------------------------------------------------------ *
 * 14. Diagnostics drawer                                             *
 * ------------------------------------------------------------------ */

.sm-drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: var(--dsw-alias-bg-mask-1, rgba(0, 0, 0, 0.5));
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
  border-top-left-radius: var(--dsw-radius-panel);
  border-bottom-left-radius: var(--dsw-radius-panel);
  box-shadow: none;
  z-index: 1150;
  overflow: hidden;
  color: var(--dsw-alias-label-primary);
  font-size: var(--sm-fs);
}

.sm-drawer-head {
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  flex-shrink: 0;
}

.sm-drawer-head-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.sm-drawer-title {
  font-size: calc(var(--sm-fs) + 1px);
  font-weight: 500;
}

.sm-drawer-body {
  padding: 18px 20px 28px;
  overflow-y: auto;
  min-height: 0;
}

.sm-drawer-intro {
  margin: 0 0 16px;
  font-size: calc(var(--sm-fs) - 2px);
  color: var(--dsw-alias-label-caption);
  line-height: 1.6;
}

.sm-drawer-note {
  margin: 14px 0 0;
  font-size: calc(var(--sm-fs) - 3px);
  color: var(--dsw-alias-label-caption);
  line-height: 1.6;
}

.sm-issue {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid var(--dsw-alias-border-l2);
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
  gap: 8px;
  flex-wrap: wrap;
  justify-content: space-between;
  font-size: calc(var(--sm-fs) - 1px);
  font-weight: 500;
  line-height: 1.4;
  color: var(--dsw-alias-label-primary);
  min-width: 0;
}

.sm-issue-icon {
  width: 30px;
  height: 30px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 14%, transparent);
  color: var(--dsw-alias-state-warn-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.sm-issue-reason {
  margin: 0;
  font-size: calc(var(--sm-fs) - 1px);
  color: var(--dsw-alias-label-secondary);
  line-height: 1.65;
}

.sm-issue-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.sm-issue-path {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: calc(var(--sm-fs) - 2px);
  line-height: 1.45;
  color: var(--dsw-alias-label-tertiary);
  word-break: break-all;
}

.sm-issue-action {
  align-self: flex-start;
  height: 28px;
  padding: 0 10px;
  border-radius: var(--dsw-radius-sm);
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
  font-size: calc(var(--sm-fs) - 2px);
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
}

.sm-issue-action:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}

.sm-issue-ok {
  border-color: color-mix(in srgb, var(--dsw-alias-state-success-primary) 30%, transparent);
}

.sm-issue-ok .sm-issue-icon {
  background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 14%, transparent);
  color: var(--dsw-alias-state-success-primary);
}

.sm-details {
  border-top: 1px solid var(--dsw-alias-border-l1);
  padding-top: 8px;
}

.sm-details summary {
  cursor: pointer;
  font-size: calc(var(--sm-fs) - 2px);
  color: var(--dsw-alias-label-caption);
  list-style: none;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  user-select: none;
}

.sm-details summary::-webkit-details-marker {
  display: none;
}

.sm-details summary:hover {
  color: var(--dsw-alias-label-secondary);
}

.sm-details-body {
  padding-top: 8px;
}

/* ------------------------------------------------------------------ *
 * 15. Floating layers: tooltip, toast, menu                          *
 * ------------------------------------------------------------------ */

/* Inverted tooltip: light surface in dark mode, no border, no shadow.
 * The node is appended to <body>, so it carries its own --sm-fs. */
.sm-tooltip,
#tooltip {
  --sm-fs: var(--dsh-content-font-size, 14px);
  position: fixed;
  z-index: 2000;
  max-width: 290px;
  padding: 6px 10px;
  border-radius: var(--dsw-radius-sm);
  border: 0;
  background: var(--dsw-alias-label-primary);
  color: var(--dsw-alias-bg-layer-3);
  font-size: calc(var(--sm-fs) - 4px);
  line-height: 1.35;
  box-shadow: none;
  pointer-events: none;
  white-space: normal;
  opacity: 0;
  transition: opacity 110ms ease;
}

/* The tooltip node currently ships legacy inline colours from 50-modals.js;
 * keep the inverted palette authoritative until that module drops them. */
.sm-tooltip {
  border: 0 !important;
  border-radius: var(--dsw-radius-sm) !important;
  background: var(--dsw-alias-label-primary) !important;
  color: var(--dsw-alias-bg-layer-3) !important;
  box-shadow: none !important;
}

.sm-tooltip.visible,
.sm-tooltip.show,
#tooltip.visible {
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
  font-size: calc(var(--sm-fs) - 1px);
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
  min-width: 128px;
  max-width: 260px;
  padding: 4px;
  border-radius: 12px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-static-neutral-bluish-850, var(--dsw-alias-bg-layer-2));
  box-shadow: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
  color: var(--dsw-alias-label-primary);
  font-size: var(--sm-fs);
}

.sm-menu-item {
  height: 30px;
  padding: 0 8px;
  border-radius: var(--dsw-radius-sm);
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font-size: calc(var(--sm-fs) - 1px);
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
}

.sm-menu-item:hover:not(:disabled),
.sm-menu-item:focus-visible {
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

.sm-menu-item.danger:hover,
.sm-menu-item.danger:focus-visible,
.sm-menu-item.sm-menu-item-danger:hover,
.sm-menu-item.sm-menu-item-danger:focus-visible {
  background: var(--dsw-alias-interactive-bg-hover-danger);
}

.sm-menu-item-danger {
  color: var(--dsw-alias-state-error-primary);
}

/* Fixed 16px glyph box: never participates in the label's flex growth. */
.sm-menu-item .sm-menu-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--dsw-alias-label-secondary);
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.sm-menu-item.danger .sm-menu-icon,
.sm-menu-item.sm-menu-item-danger .sm-menu-icon {
  color: var(--dsw-alias-state-error-primary);
}

/* Only the label owns the remaining width so the whole row stays
 * clickable; the icon span keeps its fixed 16px box. */
.sm-menu-item > span:not(.sm-menu-icon) {
  flex: 1 1 auto;
  min-width: 0;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sm-menu-sep {
  height: 1px;
  margin: 4px 6px;
  background: var(--dsw-alias-border-l1);
  flex-shrink: 0;
}

/* ------------------------------------------------------------------ *
 * 16. Market and sources pages (legacy surfaces)                     *
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

.sm-priority-card,
.sm-preset-card,
.sm-market-source-card {
  min-width: 0;
}

.sm-add-source {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--dsw-alias-border-l1);
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.sm-add-label {
  font-size: calc(var(--sm-fs) - 2px);
  font-weight: 500;
  color: var(--dsw-alias-label-secondary);
}

.sm-add-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sm-add-row .sm-input {
  flex: 1;
  min-width: 0;
}

/* ------------------------------------------------------------------ *
 * 17. Prototype aliases (visual reference markup)                    *
 * ------------------------------------------------------------------ */

.sm-segmented {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  height: 34px;
  padding: 3px;
  border-radius: 14px;
  background: var(--dsw-alias-bg-layer-3);
}

.sm-seg-tab {
  height: 28px;
  padding: 0 14px;
  border-radius: var(--dsw-radius-lg);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: var(--sm-fs);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.sm-seg-tab:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}

.sm-seg-tab[aria-selected="true"] {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
  font-weight: 500;
}

.sm-back {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 2px 4px;
  border-radius: var(--dsw-radius-sm);
  color: var(--dsw-alias-label-tertiary);
  font-size: calc(var(--sm-fs) - 1px);
  cursor: pointer;
}

.sm-back:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}

.sm-detail-heading {
  flex: 1 1 auto;
  min-width: 220px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sm-detail-title-line {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.sm-detail-name {
  font-size: calc(var(--sm-fs) + 2px);
  font-weight: 500;
  line-height: 1.3;
  color: var(--dsw-alias-label-primary);
}

.sm-detail-ver {
  font-size: calc(var(--sm-fs) - 2px);
  color: var(--dsw-alias-label-caption);
}

.sm-detail-desc {
  font-size: calc(var(--sm-fs) - 1px);
  color: var(--dsw-alias-label-secondary);
  max-width: 640px;
}

.sm-detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(250px, 1fr);
  gap: 24px;
  align-items: start;
  margin-top: 22px;
  min-width: 0;
}

.sm-detail-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.sm-prose {
  margin: 0;
  font-size: calc(var(--sm-fs) - 1px);
  color: var(--dsw-alias-label-secondary);
  line-height: 1.7;
}

.sm-ln {
  width: 20px;
  flex-shrink: 0;
  text-align: right;
  color: var(--dsw-alias-label-caption);
  user-select: none;
}

.sm-code-text {
  color: var(--dsw-alias-label-primary);
}

.sm-kv {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 8px 0;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
}

.sm-kv:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.sm-kv-label {
  font-size: calc(var(--sm-fs) - 2px);
  color: var(--dsw-alias-label-caption);
  flex-shrink: 0;
}

.sm-kv-value {
  font-size: calc(var(--sm-fs) - 2px);
  color: var(--dsw-alias-label-secondary);
  text-align: right;
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.sm-status-line {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.sm-status-line .sm-dot,
.sm-source-top .sm-dot {
  position: static;
  border: none;
}

.sm-action-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sm-action-stack .sm-btn {
  width: 100%;
}

.sm-note {
  padding: 10px 12px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary) 26%, transparent);
  font-size: calc(var(--sm-fs) - 2px);
  color: var(--dsw-alias-label-secondary);
  line-height: 1.6;
}

.sm-note.neutral {
  background: var(--dsw-alias-bg-base);
  border-color: var(--dsw-alias-border-l1);
}

.sm-file-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.sm-file {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  font-size: calc(var(--sm-fs) - 2px);
}

.sm-file:last-child {
  border-bottom: none;
}

.sm-file-name {
  color: var(--dsw-alias-label-secondary);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  overflow-wrap: anywhere;
}

.sm-file-size {
  color: var(--dsw-alias-label-caption);
  flex-shrink: 0;
}

.sm-choice-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.sm-choice {
  height: 30px;
  padding: 0 10px;
  border-radius: 10px;
  font-size: calc(var(--sm-fs) - 2px);
  color: var(--dsw-alias-label-secondary);
  background: var(--dsw-alias-bg-base);
  border: 1px solid var(--dsw-alias-border-l2);
  cursor: pointer;
}

.sm-choice:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}

.sm-choice.active {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
  font-weight: 500;
}

.sm-footer {
  margin-top: 44px;
  padding-top: 16px;
  border-top: 1px solid var(--dsw-alias-border-l1);
  text-align: center;
  font-size: calc(var(--sm-fs) - 3px);
  color: var(--dsw-alias-label-caption);
}

.sm-chevron {
  display: inline-flex;
  color: var(--dsw-alias-label-caption);
  width: 14px;
}

.sm-empty-desc {
  max-width: 400px;
  font-size: calc(var(--sm-fs) - 1px);
  line-height: 1.5;
  color: var(--dsw-alias-label-tertiary);
}

/* Keyboard focus mirrors hover: background + text colour, no ring.
 * :focus-visible raises specificity above the component defaults. */
.sm-subtab:focus-visible,
.sm-card-item:focus-visible,
.sm-chip:focus-visible,
.sm-btn-ghost:focus-visible,
.sm-btn-secondary:focus-visible,
.sm-search-clear:focus-visible,
.sm-detail-back:focus-visible,
.sm-back:focus-visible,
.sm-choice:focus-visible,
.sm-file-row:focus-visible {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}

/* Primary tabs: keyboard focus mirrors hover (background only) so an
 * unselected focused tab never looks selected; the active tab keeps its
 * label-primary colour. The :not() chain outranks the generic button
 * focus rule that raises every button's text colour. */
.sm-tab:focus-visible {
  outline: none;
  background: var(--dsw-alias-interactive-bg-hover);
}

.sm-tab:not(.active):not(.sm-active):not(.sm-tab-active):not([aria-selected="true"]):focus-visible {
  color: var(--dsw-alias-label-tertiary);
}

/* ------------------------------------------------------------------ *
 * 18. Utilities                                                      *
 * ------------------------------------------------------------------ */

.sm-fs-16 { font-size: calc(var(--sm-fs) + 2px); }
.sm-fs-15 { font-size: calc(var(--sm-fs) + 1px); }
.sm-fs-14 { font-size: var(--sm-fs); }
.sm-fs-13 { font-size: calc(var(--sm-fs) - 1px); }
.sm-fs-12 { font-size: calc(var(--sm-fs) - 2px); }
.sm-fs-11 { font-size: calc(var(--sm-fs) - 3px); }
.sm-fs-10 { font-size: calc(var(--sm-fs) - 4px); }

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
 * 19. Responsive and reduced motion                                  *
 * ------------------------------------------------------------------ */

@media (max-width: 1100px) {
  .sm-detail-body,
  .sm-detail-grid {
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
  #tooltip,
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
      /* /updates depends on neither sources nor installed; start it first so all
       * three requests are in flight together. */
      void loadUpdates()
      await Promise.all([loadSources(), loadInstalled()])
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
