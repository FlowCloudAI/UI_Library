import { useState, type CSSProperties } from 'react'
import {
    Activity,
    AlertTriangle,
    Bell,
    CheckCircle2,
    Clock,
    Database,
    GitBranch,
    Lock,
    MoreHorizontal,
    Search,
    Settings,
    ShieldCheck,
    Sparkles,
    UploadCloud,
    Zap,
} from 'lucide-react'
import { Avatar } from 'flowcloudai-ui/Avatar'
import { Button } from 'flowcloudai-ui/Button'
import { CheckButton } from 'flowcloudai-ui/CheckButton'
import { Input } from 'flowcloudai-ui/Input'
import { Select } from 'flowcloudai-ui/Select'
import { Slider } from 'flowcloudai-ui/Slider'
import './SemanticTokensDemo.css'

const riskOptions = [
    { value: 'normal', label: '普通发布' },
    { value: 'gray', label: '灰度发布' },
    { value: 'freeze', label: '冻结窗口' },
]

const semanticColorTokenGroups = [
    {
        title: '品牌与主操作',
        tokens: [
            { name: '主色', varName: '--fc-color-primary', usage: '主要按钮、关键图标、选中态' },
            { name: '主色悬停', varName: '--fc-color-primary-hover', usage: '主操作悬停反馈' },
            { name: '主色按下', varName: '--fc-color-primary-active', usage: '主操作按下反馈' },
            { name: '主色弱背景', varName: '--fc-color-primary-subtle', usage: '选中背景、焦点提示' },
        ],
    },
    {
        title: '页面背景',
        tokens: [
            { name: '主背景', varName: '--fc-color-bg', usage: '页面和基础面板底色' },
            { name: '次级背景', varName: '--fc-color-bg-secondary', usage: '应用外壳、导航背景' },
            { name: '三级背景', varName: '--fc-color-bg-tertiary', usage: '悬停块、滚动条轨道' },
            { name: '浮层背景', varName: '--fc-color-bg-elevated', usage: '弹窗、下拉、卡片浮层' },
            { name: '遮罩背景', varName: '--fc-color-bg-overlay', usage: '弹窗遮罩、覆盖层' },
        ],
    },
    {
        title: '文本',
        tokens: [
            { name: '正文', varName: '--fc-color-text', usage: '标题、主要内容' },
            { name: '次级文本', varName: '--fc-color-text-secondary', usage: '描述、辅助信息' },
            { name: '三级文本', varName: '--fc-color-text-tertiary', usage: '标签、时间、弱提示' },
            { name: '禁用文本', varName: '--fc-color-text-disabled', usage: '不可用状态' },
            { name: '主色上文本', varName: '--fc-color-text-on-primary', usage: '主色按钮文字' },
            { name: '链接', varName: '--fc-color-text-link', usage: '普通链接' },
            { name: '链接悬停', varName: '--fc-color-text-link-hover', usage: '链接悬停反馈' },
        ],
    },
    {
        title: '边框',
        tokens: [
            { name: '默认边框', varName: '--fc-color-border', usage: '卡片、输入框、分割线' },
            { name: '浅边框', varName: '--fc-color-border-light', usage: '弱分隔、内部分割线' },
            { name: '悬停边框', varName: '--fc-color-border-hover', usage: '可交互区域悬停' },
            { name: '焦点边框', varName: '--fc-color-border-focus', usage: '键盘焦点、输入框聚焦' },
        ],
    },
    {
        title: '状态',
        tokens: [
            { name: '危险', varName: '--fc-color-danger', usage: '删除、阻断、错误' },
            { name: '危险悬停', varName: '--fc-color-danger-hover', usage: '危险操作悬停' },
            { name: '危险背景', varName: '--fc-color-danger-bg', usage: '错误提示背景' },
            { name: '危险边框', varName: '--fc-color-danger-border', usage: '错误提示边框' },
            { name: '成功', varName: '--fc-color-success', usage: '通过、完成、健康' },
            { name: '成功悬停', varName: '--fc-color-success-hover', usage: '成功操作悬停' },
            { name: '成功背景', varName: '--fc-color-success-bg', usage: '成功提示背景' },
            { name: '成功边框', varName: '--fc-color-success-border', usage: '成功提示边框' },
            { name: '警告', varName: '--fc-color-warning', usage: '等待、风险、提醒' },
            { name: '警告悬停', varName: '--fc-color-warning-hover', usage: '警告操作悬停' },
            { name: '警告背景', varName: '--fc-color-warning-bg', usage: '警告提示背景' },
            { name: '警告边框', varName: '--fc-color-warning-border', usage: '警告提示边框' },
            { name: '信息', varName: '--fc-color-info', usage: '说明、通知、提示' },
            { name: '信息背景', varName: '--fc-color-info-bg', usage: '信息提示背景' },
            { name: '信息边框', varName: '--fc-color-info-border', usage: '信息提示边框' },
        ],
    },
    {
        title: '辅助强调',
        tokens: [
            { name: '紫色', varName: '--fc-color-purple', usage: '智能、实验、策略标签' },
            { name: '紫色背景', varName: '--fc-color-purple-bg', usage: '紫色弱提示背景' },
            { name: '橙色', varName: '--fc-color-orange', usage: '处理、迁移、待确认' },
            { name: '橙色背景', varName: '--fc-color-orange-bg', usage: '橙色弱提示背景' },
            { name: '青色', varName: '--fc-color-teal', usage: '数据、联通、同步' },
            { name: '青色背景', varName: '--fc-color-teal-bg', usage: '青色弱提示背景' },
            { name: '粉色', varName: '--fc-color-pink', usage: '体验、内容、标注' },
            { name: '粉色背景', varName: '--fc-color-pink-bg', usage: '粉色弱提示背景' },
        ],
    },
]

type SwatchStyle = CSSProperties & Record<'--semantic-swatch-color', string>

function getSwatchStyle(varName: string): SwatchStyle {
    return {
        '--semantic-swatch-color': `var(${varName})`,
    }
}

export function SemanticTokensDemo() {
    const [autoGuard, setAutoGuard] = useState(true)

    return (
        <div className="semantic-token-demo">
            <div className="semantic-demo">
                <aside className="semantic-demo__rail">
                    <div className="semantic-demo__brand">
                        <span className="semantic-demo__brand-mark">
                            <Sparkles size={16} />
                        </span>
                        <span>
                            <strong>FlowOps</strong>
                            <small>发布控制台</small>
                        </span>
                    </div>

                    <nav className="semantic-demo__nav" aria-label="示例导航">
                        <button className="semantic-demo__nav-item semantic-demo__nav-item--active">
                            <Activity size={15} />
                            <span>总览</span>
                        </button>
                        <button className="semantic-demo__nav-item">
                            <GitBranch size={15} />
                            <span>流水线</span>
                        </button>
                        <button className="semantic-demo__nav-item">
                            <Database size={15} />
                            <span>数据资产</span>
                        </button>
                        <button className="semantic-demo__nav-item semantic-demo__nav-item--disabled" disabled>
                            <Lock size={15} />
                            <span>审计归档</span>
                        </button>
                    </nav>

                    <div className="semantic-demo__quota">
                        <span>本月资源预算</span>
                        <strong>72%</strong>
                        <div className="semantic-demo__quota-track">
                            <span />
                        </div>
                    </div>
                </aside>

                <section className="semantic-demo__workspace">
                    <header className="semantic-demo__topbar">
                        <Input
                            className="semantic-demo__search"
                            size="sm"
                            prefix={<Search size={14} />}
                            placeholder="搜索服务、任务或负责人"
                        />
                        <Button
                            variant="ghost"
                            iconOnly
                            aria-label="通知"
                            iconLeft={<Bell size={16} />}
                        />
                        <Button
                            variant="ghost"
                            iconOnly
                            aria-label="设置"
                            iconLeft={<Settings size={16} />}
                        />
                        <Avatar size={32} bordered alt="当前用户" />
                    </header>

                    <main className="semantic-demo__content">
                        <section className="semantic-demo__hero">
                            <div>
                                <span className="semantic-demo__eyebrow">生产环境</span>
                                <h3>订单智能体集群发布</h3>
                                <p>
                                    变更已通过策略检查，正在等待最后一轮灰度窗口确认。
                                    当前主题会直接影响背景、文字、边框、阴影与状态语义。
                                </p>
                                <div className="semantic-demo__hero-actions">
                                    <Button iconLeft={<UploadCloud size={15} />}>发布变更</Button>
                                    <Button variant="outline">查看回滚点</Button>
                                    <Button variant="ghost" color="var(--fc-color-text-link)">打开记录</Button>
                                </div>
                            </div>
                            <div className="semantic-demo__release-card">
                                <span className="semantic-demo__release-label">下一批次</span>
                                <strong>18:30</strong>
                                <small>华东一区 · 4 个服务</small>
                                <div className="semantic-demo__release-stack">
                                    <span className="semantic-demo__avatar-chip semantic-demo__avatar-chip--teal">QA</span>
                                    <span className="semantic-demo__avatar-chip semantic-demo__avatar-chip--purple">PM</span>
                                    <span className="semantic-demo__avatar-chip semantic-demo__avatar-chip--pink">AI</span>
                                </div>
                            </div>
                        </section>

                        <section className="semantic-demo__metrics" aria-label="关键指标">
                            <article className="semantic-demo__metric semantic-demo__metric--success">
                                <CheckCircle2 size={18} />
                                <span>成功率</span>
                                <strong>99.94%</strong>
                                <small>高于昨日 0.2%</small>
                            </article>
                            <article className="semantic-demo__metric semantic-demo__metric--warning">
                                <Clock size={18} />
                                <span>待审批</span>
                                <strong>6</strong>
                                <small>2 项接近超时</small>
                            </article>
                            <article className="semantic-demo__metric semantic-demo__metric--danger">
                                <AlertTriangle size={18} />
                                <span>风险拦截</span>
                                <strong>3</strong>
                                <small>含 1 个高危 SQL</small>
                            </article>
                            <article className="semantic-demo__metric semantic-demo__metric--info">
                                <Zap size={18} />
                                <span>自动修复</span>
                                <strong>14</strong>
                                <small>平均耗时 21 秒</small>
                            </article>
                        </section>

                        <section className="semantic-demo__grid">
                            <article className="semantic-demo__panel semantic-demo__panel--controls">
                                <div className="semantic-demo__panel-head">
                                    <div>
                                        <span className="semantic-demo__section-label">变更策略</span>
                                        <h4>灰度规则配置</h4>
                                    </div>
                                    <CheckButton
                                        checked={autoGuard}
                                        onChange={setAutoGuard}
                                        labelLeft="手动"
                                        labelRight="自动"
                                        size="sm"
                                    />
                                </div>

                                <div className="semantic-demo__form-grid">
                                    <label>
                                        <span>发布类型</span>
                                        <Select options={riskOptions} defaultValue="gray" />
                                    </label>
                                    <label>
                                        <span>负责人</span>
                                        <Input defaultValue="李明 / SRE" allowClear />
                                    </label>
                                </div>

                                <label className="semantic-demo__slider-field">
                                    <span>灰度流量上限</span>
                                    <Slider defaultValue={42} tooltip marks={{ 0: '0%', 50: '50%', 100: '100%' }} />
                                </label>

                                <div className="semantic-demo__focus-card">
                                    <ShieldCheck size={18} />
                                    <div>
                                        <strong>策略焦点</strong>
                                        <p>键盘聚焦、悬停边框和主色弱背景都由同一组语义令牌驱动。</p>
                                    </div>
                                </div>
                            </article>

                            <article className="semantic-demo__panel">
                                <div className="semantic-demo__panel-head">
                                    <div>
                                        <span className="semantic-demo__section-label">任务看板</span>
                                        <h4>今日发布链路</h4>
                                    </div>
                                    <Button variant="ghost" iconOnly aria-label="更多" iconLeft={<MoreHorizontal size={16} />} />
                                </div>

                                <div className="semantic-demo__task-list">
                                    <div className="semantic-demo__task semantic-demo__task--teal">
                                        <span className="semantic-demo__task-kicker">模型服务</span>
                                        <strong>推荐排序 v4.8</strong>
                                        <p>已完成 3 个探针区域的响应时间对比。</p>
                                        <span>可合并</span>
                                    </div>
                                    <div className="semantic-demo__task semantic-demo__task--orange">
                                        <span className="semantic-demo__task-kicker">数据同步</span>
                                        <strong>画像宽表迁移</strong>
                                        <p>目标集群缺少 2 个二级索引，正在等待 DBA 确认。</p>
                                        <span>需处理</span>
                                    </div>
                                    <div className="semantic-demo__task semantic-demo__task--purple">
                                        <span className="semantic-demo__task-kicker">体验策略</span>
                                        <strong>召回说明文案</strong>
                                        <p>文案回归已通过，等待产品验收。</p>
                                        <span>验收中</span>
                                    </div>
                                </div>
                            </article>

                            <article className="semantic-demo__panel semantic-demo__panel--timeline">
                                <div className="semantic-demo__panel-head">
                                    <div>
                                        <span className="semantic-demo__section-label">事件流</span>
                                        <h4>最近 20 分钟</h4>
                                    </div>
                                    <a href="#semantic-token-link">查看全部</a>
                                </div>

                                <ol className="semantic-demo__timeline">
                                    <li className="semantic-demo__event semantic-demo__event--success">
                                        <span />
                                        <div>
                                            <strong>策略检查完成</strong>
                                            <p>所有强制规则通过，建议保留自动护栏。</p>
                                        </div>
                                        <time>18:05</time>
                                    </li>
                                    <li className="semantic-demo__event semantic-demo__event--warning">
                                        <span />
                                        <div>
                                            <strong>容量阈值接近上限</strong>
                                            <p>缓存节点剩余 14%，建议降级非核心任务。</p>
                                        </div>
                                        <time>18:09</time>
                                    </li>
                                    <li className="semantic-demo__event semantic-demo__event--danger">
                                        <span />
                                        <div>
                                            <strong>高危语句已阻断</strong>
                                            <p>检测到全表更新，发布单已自动转入人工确认。</p>
                                        </div>
                                        <time>18:12</time>
                                    </li>
                                </ol>
                            </article>
                        </section>

                        <section className="semantic-demo__overlay-stage" aria-label="覆盖层示例">
                            <div className="semantic-demo__dropdown">
                                <strong>批量操作</strong>
                                <button>重新检查</button>
                                <button>复制发布单</button>
                                <button>设为观察项</button>
                            </div>

                            <div className="semantic-demo__modal-layer">
                                <div className="semantic-demo__modal">
                                    <span className="semantic-demo__section-label">审批确认</span>
                                    <h4>是否允许进入 30% 灰度？</h4>
                                    <p>覆盖层、弹窗、提示和通知分别使用 overlay、modal、tooltip 与 toast 层级。</p>
                                    <div className="semantic-demo__modal-actions">
                                        <Button variant="outline" size="sm">稍后处理</Button>
                                        <Button size="sm">确认推进</Button>
                                    </div>
                                </div>
                            </div>

                            <div className="semantic-demo__toast">
                                <CheckCircle2 size={16} />
                                <span>已保存自动护栏配置</span>
                            </div>

                            <div className="semantic-demo__tooltip">阈值来自最近 7 天基线</div>
                        </section>
                    </main>
                </section>
            </div>

            <section className="semantic-demo__palette" aria-labelledby="semantic-palette-title">
                <div className="semantic-demo__palette-head">
                    <div>
                        <span className="semantic-demo__section-label">令牌速览</span>
                        <h3 id="semantic-palette-title">语义色板</h3>
                    </div>
                    <p>色块直接读取当前主题下的 CSS 变量值，切换亮色或暗色主题会同步变化。</p>
                </div>

                <div className="semantic-demo__palette-groups">
                    {semanticColorTokenGroups.map(group => (
                        <article key={group.title} className="semantic-demo__palette-group">
                            <h4>{group.title}</h4>
                            <div className="semantic-demo__swatch-grid">
                                {group.tokens.map(token => (
                                    <div
                                        key={token.varName}
                                        className="semantic-demo__swatch"
                                        style={getSwatchStyle(token.varName)}
                                    >
                                        <span className="semantic-demo__swatch-preview" />
                                        <span className="semantic-demo__swatch-body">
                                            <strong>{token.name}</strong>
                                            <code>{token.varName}</code>
                                            <small>{token.usage}</small>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </article>
                    ))}
                </div>
            </section>
        </div>
    )
}
