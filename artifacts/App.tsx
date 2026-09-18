import { type ReactNode, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  useCreateInvoice,
  useCreateMilestone,
  useCreateProject,
  useCreateTask,
  useDeleteProject,
  useGetDashboard,
  useGetProject,
  useListActivity,
  useListClients,
  useListDeliverables,
  useListInvoices,
  useListMilestones,
  useListNotifications,
  useListProjects,
  useListTasks,
  useMarkInvoicePaid,
  useUpdateMilestone,
  useUpdateProject,
  useUpdateTask,
  getGetDashboardQueryKey,
  getGetProjectQueryKey,
  getListActivityQueryKey,
  getListClientsQueryKey,
  getListInvoicesQueryKey,
  getListMilestonesQueryKey,
  getListNotificationsQueryKey,
  getListProjectsQueryKey,
  getListTasksQueryKey,
} from '@workspace/api-client-react';
import { setAuthTokenGetter } from '@workspace/api-client-react';
import type { Activity, Client, Deliverable, Invoice, Milestone, Project, Task } from '@workspace/api-client-react';
import {
  ArrowUpRight,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  CircleDot,
  DollarSign,
  FileCheck2,
  FileText,
  FolderKanban,
  Globe2,
  LayoutDashboard,
  ListFilter,
  Menu,
  MoreHorizontal,
  Palette,
  Plus,
  ReceiptText,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Target,
  Users,
  WalletCards,
  X,
} from 'lucide-react';
import { Link, Route, Switch, useLocation, useParams } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/components/auth-provider';
import { SignInPage } from '@/components/sign-in-page';
import { SignUpPage } from '@/components/sign-up-page';
import { AcceptInvitePage } from '@/components/accept-invite-page';
import { useApiAuth } from '@/lib/api-auth';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

// Authentication token getter for API calls
function AuthTokenProvider({ children }: { children: ReactNode }) {
  const { token } = useApiAuth();
  
  useMemo(() => {
    setAuthTokenGetter(() => token);
  }, [token]);

  return <>{children}</>;
}

const money = (value = 0) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
const date = (value?: string) => value ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(value)) : '—';
const fullDate = (value?: string) => value ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)) : '—';
const initials = (value = '') => value.split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase();
const cn = (...classes: Array<string | false | undefined>) => classes.filter(Boolean).join(' ');

function Avatar({ name, size = 'md', accent = false }: { name?: string; size?: 'sm' | 'md' | 'lg'; accent?: boolean }) {
  return <span className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-medium tracking-[-.04em]', size === 'sm' ? 'h-7 w-7' : size === 'lg' ? 'h-11 w-11 text-xs' : 'h-9 w-9', accent ? 'bg-[#d7ed57] text-[#26302e]' : 'bg-[#dfe5d7] text-[#405047]')} data-testid={`avatar-${name || 'user'}`}>{initials(name)}</span>;
}

function StatusBadge({ value, tone }: { value: string; tone?: 'green' | 'amber' | 'red' | 'ink' }) {
  const label = value.replaceAll('_', ' ');
  const color = tone === 'green' || ['active', 'on track', 'paid', 'complete', 'completed', 'published'].includes(value.toLowerCase()) ? 'bg-[#e3f1c0] text-[#526723]' : tone === 'red' || ['at risk', 'overdue', 'blocked'].includes(value.toLowerCase()) ? 'bg-[#f9ddd5] text-[#9c4838]' : tone === 'ink' ? 'bg-[#e2e6eb] text-[#43505c]' : 'bg-[#f5e8bf] text-[#8d6f2a]';
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${color}`} data-testid={`status-${value}`}><span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />{label}</span>;
}

function ProgressBar({ value, color = 'bg-[#b9d934]' }: { value: number; color?: string }) {
  return <div className="h-1.5 w-full rounded-full bg-[#e8e9df]" data-testid={`progress-${value}`}><div className={`h-full rounded-full ${color} transition-[width] duration-500`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>;
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-[#e8e9df] ${className}`} aria-label="Loading" data-testid="loading-skeleton" />;
}

function EmptyState({ icon: Icon, title, description, action }: { icon: typeof FolderKanban; title: string; description: string; action?: ReactNode }) {
  return <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#d7d9ce] bg-[#fbfbf6] p-8 text-center" data-testid="empty-state"><span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#edf1d9] text-[#62752c]"><Icon size={21} /></span><h3 className="font-display text-xl text-[#26302e]">{title}</h3><p className="mt-2 max-w-sm text-sm leading-6 text-[#7c837b]">{description}</p>{action && <div className="mt-5">{action}</div>}</div>;
}

function ErrorState({ retry }: { retry: () => void }) {
  return <div className="rounded-2xl border border-[#efd2c8] bg-[#fffaf7] p-8 text-center" data-testid="error-state"><CircleAlert className="mx-auto text-[#bf5d49]" size={24} /><h3 className="mt-3 font-display text-xl text-[#26302e]">The workspace took a pause</h3><p className="mt-2 text-sm text-[#8d817c]">We couldn't bring in the latest work. Try once more.</p><button onClick={retry} className="mt-5 rounded-full bg-[#26302e] px-4 py-2 text-sm font-semibold text-[#f8f8ee] transition-transform hover:-translate-y-0.5" data-testid="button-retry">Try again</button></div>;
}

const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/tasks', label: 'Tasks', icon: ListFilter },
  { href: '/invoices', label: 'Invoices', icon: ReceiptText },
];

function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: dashboard } = useGetDashboard({ query: { queryKey: getGetDashboardQueryKey() } });
  const agencyName = dashboard?.agency?.name || 'Northstar Studio';
  const agencyInitials = dashboard?.agency?.initials || initials(agencyName);
  return <div className="min-h-[100dvh] bg-[#f4f3ec] text-[#26302e]">
    <aside className={cn('fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col bg-[#26302e] px-4 py-5 text-[#eef0e7] transition-transform duration-300 lg:translate-x-0', mobileOpen ? 'translate-x-0' : '-translate-x-full')} data-testid="sidebar">
      <div className="flex items-center gap-3 px-3"><span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-[#d7ed57] text-[#26302e]"><Sparkles size={18} strokeWidth={2.5} /></span><div><div className="font-display text-[19px] leading-none">Northstar</div><div className="mt-1 font-mono text-[9px] uppercase tracking-[.16em] text-[#9da99d]">client portal</div></div></div>
      <div className="mt-10 px-3 font-mono text-[9px] uppercase tracking-[.16em] text-[#849286]">Workspace</div>
      <nav className="mt-3 space-y-1" aria-label="Primary navigation">{navItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={cn('group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors', location === href ? 'bg-[#3d4945] text-[#f5f7ef]' : 'text-[#a9b3a7] hover:bg-[#313d39] hover:text-[#f5f7ef]')} data-testid={`link-nav-${label.toLowerCase()}`}><Icon size={17} strokeWidth={location === href ? 2.2 : 1.7} /><span>{label}</span>{label === 'Invoices' && <span className="ml-auto rounded-full bg-[#d7ed57] px-1.5 py-0.5 font-mono text-[9px] text-[#26302e]">4</span>}</Link>)}</nav>
      <div className="mt-9 px-3 font-mono text-[9px] uppercase tracking-[.16em] text-[#849286]">Manage</div>
      <nav className="mt-3 space-y-1"><Link href="/settings" className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors', location === '/settings' ? 'bg-[#3d4945] text-[#f5f7ef]' : 'text-[#a9b3a7] hover:bg-[#313d39] hover:text-[#f5f7ef]')} data-testid="link-nav-settings"><Settings2 size={17} /><span>Settings</span></Link></nav>
      <div className="mt-auto rounded-2xl border border-[#43504a] bg-[#2d3935] p-3"><div className="flex items-center gap-3"><Avatar name={agencyName} accent size="sm" /><div className="min-w-0"><div className="truncate text-xs font-semibold">{agencyName}</div><div className="mt-0.5 truncate text-[10px] text-[#9da99d]">Agency workspace</div></div><ChevronDown className="ml-auto text-[#8b998d]" size={14} /></div><div className="mt-3 flex items-center gap-2 border-t border-[#43504a] pt-3 text-[10px] text-[#a9b3a7]"><span className="h-1.5 w-1.5 rounded-full bg-[#b9d934]" /> All systems operational</div></div>
    </aside>
    {mobileOpen && <button className="fixed inset-0 z-30 bg-[#26302e]/35 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close menu" data-testid="button-close-menu" />}
    <div className="lg:pl-[248px]"><header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-[#e1e2d8] bg-[#f4f3ec]/90 px-5 backdrop-blur-md sm:px-8 lg:px-10"><div className="flex items-center gap-3"><button className="rounded-lg p-2 hover:bg-[#e6e7dd] lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu" data-testid="button-open-menu"><Menu size={20} /></button><div className="hidden items-center gap-2 text-xs text-[#7e867f] sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-[#b9d934]" /> Thursday, October 24, 2024</div><div className="sm:hidden font-mono text-[10px] uppercase tracking-[.13em] text-[#7e867f]">{agencyInitials} workspace</div></div><div className="flex items-center gap-2 sm:gap-4"><button className="relative rounded-full p-2 text-[#626c65] transition-colors hover:bg-[#e6e7dd]" aria-label="View notifications" data-testid="button-notifications"><Bell size={18} /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#d15e49] ring-2 ring-[#f4f3ec]" /></button><div className="hidden h-6 w-px bg-[#dadcd2] sm:block" /><div className="flex items-center gap-2"><Avatar name={agencyName} size="sm" /><div className="hidden text-right sm:block"><div className="text-xs font-semibold">{agencyName}</div><div className="font-mono text-[9px] uppercase tracking-[.12em] text-[#8d968d]">Admin</div></div></div></div></header><main className="mx-auto max-w-[1480px] px-5 py-7 sm:px-8 sm:py-9 lg:px-10">{children}</main></div>
  </div>;
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><div className="font-mono text-[10px] font-medium uppercase tracking-[.18em] text-[#839076]">{eyebrow}</div><h1 className="mt-2 font-display text-[34px] leading-[1.05] tracking-[-.025em] text-[#26302e] sm:text-[42px]" data-testid="text-page-title">{title}</h1>{description && <p className="mt-2 max-w-xl text-sm leading-6 text-[#778078]">{description}</p>}</div>{action}</div>;
}

function StatCard({ label, value, trend, detail, icon: Icon, accent = false }: { label: string; value: string; trend?: string; detail: string; icon: typeof DollarSign; accent?: boolean }) {
  return <div className={cn('rounded-2xl border p-5 transition-transform duration-200 hover:-translate-y-0.5', accent ? 'border-[#d7ed57] bg-[#d7ed57]' : 'border-[#e0e1d7] bg-[#fbfbf6]')} data-testid={`stat-${label.toLowerCase().replaceAll(' ', '-')}`}><div className="flex items-start justify-between"><span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', accent ? 'bg-[#26302e] text-[#d7ed57]' : 'bg-[#e7ebdf] text-[#556551]')}><Icon size={17} /></span>{trend && <span className={cn('flex items-center gap-1 rounded-full px-2 py-1 font-mono text-[10px]', accent ? 'bg-[#c2dc47] text-[#34441e]' : 'bg-[#e9f1da] text-[#607732]')}><ArrowUpRight size={11} />{trend}</span>}</div><div className="mt-7 font-mono text-[27px] font-medium tracking-[-.06em]">{value}</div><div className={cn('mt-1 text-xs', accent ? 'text-[#42511e]' : 'text-[#7b847d]')}>{label} <span className="mx-1 text-[#a7ac9f]">·</span> {detail}</div></div>;
}

function ProjectRow({ project, onDelete }: { project: Project; onDelete?: (id: string) => void }) {
  return <Link href={`/projects/${project.id}`} className="group grid grid-cols-[minmax(170px,1.5fr)_minmax(110px,1fr)_100px_120px_34px] items-center gap-4 border-b border-[#e5e5dc] px-5 py-4 transition-colors last:border-0 hover:bg-[#f6f7ed]" data-testid={`row-project-${project.id}`}><div className="min-w-0"><div className="truncate text-sm font-semibold text-[#303a36]">{project.name}</div><div className="mt-1 text-xs text-[#8b948d]">{project.clientName}</div></div><div className="min-w-0"><div className="mb-2 flex items-center justify-between"><span className="font-mono text-[10px] text-[#737d76]">{project.progress}% delivered</span><span className="font-mono text-[9px] text-[#a1a89f]">{project.taskCount} tasks</span></div><ProgressBar value={project.progress} /></div><StatusBadge value={project.health} /><div><div className="font-mono text-xs text-[#4c5950]">{date(project.dueDate)}</div><div className="mt-1 text-[10px] text-[#9aa199]">due date</div></div><button className="invisible rounded-lg p-2 text-[#839079] hover:bg-[#e7eadc] hover:text-[#26302e] group-hover:visible" onClick={(event) => { event.preventDefault(); event.stopPropagation(); onDelete?.(project.id); }} aria-label={`Project actions for ${project.name}`} data-testid={`button-project-actions-${project.id}`}><MoreHorizontal size={16} /></button></Link>;
}

function DashboardPage() {
  const queryClient = useQueryClient();
  const dashboardQuery = useGetDashboard({ query: { queryKey: getGetDashboardQueryKey() } });
  const notificationsQuery = useListNotifications({ query: { queryKey: getListNotificationsQueryKey() } });
  const activityQuery = useListActivity(undefined, { query: { queryKey: getListActivityQueryKey() } });
  const [toast, setToast] = useState('');
  const projects = dashboardQuery.data?.projects || [];
  const stats = dashboardQuery.data?.stats;
  const notifications = notificationsQuery.data || dashboardQuery.data?.notifications || [];
  const activity = activityQuery.data || dashboardQuery.data?.activity || [];
  if (dashboardQuery.isLoading) return <DashboardSkeleton />;
  if (dashboardQuery.isError) return <ErrorState retry={() => queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() })} />;
  return <div className="animate-in fade-in duration-500"><PageHeading eyebrow="Thursday, October 24 · morning brief" title={`Good morning${dashboardQuery.data?.agency?.name ? `, ${dashboardQuery.data.agency.name}` : ''}.`} description="A clear view of the work moving forward, the work that needs your eye, and the money on its way." action={<Link href="/projects" className="inline-flex items-center gap-2 rounded-full bg-[#26302e] px-4 py-2.5 text-sm font-semibold text-[#f8f8ee] transition-transform hover:-translate-y-0.5" data-testid="link-view-projects">View all projects <ArrowUpRight size={15} /></Link>} />
    {toast && <div className="mb-5 flex items-center gap-2 rounded-xl bg-[#26302e] px-4 py-3 text-sm text-[#f3f5eb]" data-testid="status-toast"><CheckCircle2 size={16} className="text-[#d7ed57]" />{toast}</div>}
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Active projects" value={`${stats?.activeProjects ?? projects.length}`} detail="in motion" trend="+2 this month" icon={BriefcaseBusiness} /><StatCard label="Due this week" value={`${stats?.dueThisWeek ?? 0}`} detail="need attention" icon={CalendarDays} /><StatCard label="Outstanding" value={money(stats?.outstanding)} detail="across 4 invoices" trend="+8.4%" icon={WalletCards} accent /><StatCard label="Unread updates" value={`${stats?.unreadNotifications ?? notifications.filter((item) => !item.read).length}`} detail="since your last visit" icon={Bell} /></section>
    <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,.8fr)]"><section className="overflow-hidden rounded-2xl border border-[#e0e1d7] bg-[#fbfbf6]"><div className="flex items-center justify-between border-b border-[#e5e5dc] px-5 py-4"><div><h2 className="font-display text-[22px]">Work in motion</h2><p className="mt-1 text-xs text-[#8a938b]">The projects with a pulse right now.</p></div><Link href="/projects" className="text-xs font-semibold text-[#697a31] hover:text-[#26302e]" data-testid="link-dashboard-projects">See all <ArrowUpRight className="ml-1 inline" size={13} /></Link></div>{projects.length ? <div>{projects.slice(0, 5).map((project) => <ProjectRow key={project.id} project={project} onDelete={() => setToast('Project actions are available from the workspace.')} />)}</div> : <div className="p-5"><EmptyState icon={FolderKanban} title="No projects in motion" description="Create your first client project to give the studio a shared source of truth." action={<Link href="/projects" className="rounded-full bg-[#26302e] px-4 py-2 text-sm font-semibold text-white" data-testid="link-empty-create-project">Create a project</Link>} /></div>}</section>
      <section className="rounded-2xl border border-[#e0e1d7] bg-[#fbfbf6]"><div className="flex items-center justify-between border-b border-[#e5e5dc] px-5 py-4"><div><h2 className="font-display text-[22px]">Needs your eye</h2><p className="mt-1 text-xs text-[#8a938b]">Small nudges, before they become blockers.</p></div><button className="rounded-lg p-2 text-[#818b83] hover:bg-[#eceee5]" aria-label="Filter notifications" data-testid="button-filter-notifications"><SlidersHorizontal size={15} /></button></div><div className="divide-y divide-[#e5e5dc]">{notifications.slice(0, 4).map((item) => <div key={item.id} className="flex gap-3 px-5 py-4" data-testid={`notification-${item.id}`}><span className={cn('mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', item.type === 'payment' ? 'bg-[#f4e9bd] text-[#97742c]' : 'bg-[#e7edf0] text-[#54707b]')}><CircleDot size={13} /></span><div className="min-w-0"><div className="text-xs font-semibold text-[#3d4841]">{item.title}</div><p className="mt-1 text-[11px] leading-5 text-[#899189]">{item.description}</p><div className="mt-2 font-mono text-[9px] uppercase tracking-[.1em] text-[#a0a79e]">{date(item.createdAt)}</div></div></div>)}{!notifications.length && <div className="p-6 text-sm text-[#8a938b]">You are all caught up.</div>}</div></section></div>
    <section className="mt-6 rounded-2xl border border-[#e0e1d7] bg-[#fbfbf6]"><div className="flex items-center justify-between border-b border-[#e5e5dc] px-5 py-4"><div><h2 className="font-display text-[22px]">Studio trail</h2><p className="mt-1 text-xs text-[#8a938b]">A quiet record of what changed.</p></div><span className="font-mono text-[10px] uppercase tracking-[.12em] text-[#9aa199]">latest activity</span></div><ActivityList activity={activity.slice(0, 6)} /></section>
  </div>;
}

function DashboardSkeleton() {
  return <div><div className="mb-8"><Skeleton className="h-3 w-44" /><Skeleton className="mt-3 h-11 w-80" /><Skeleton className="mt-3 h-4 w-[420px] max-w-full" /></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-36" />)}</div><div className="mt-7 grid gap-6 xl:grid-cols-[1.6fr_.8fr]"><Skeleton className="h-[380px]" /><Skeleton className="h-[380px]" /></div></div>;
}

function ActivityList({ activity }: { activity: Activity[] }) {
  if (!activity.length) return <div className="p-8 text-center text-sm text-[#899189]">No activity yet. Your next move will appear here.</div>;
  return <div className="divide-y divide-[#e5e5dc] sm:grid sm:grid-cols-2 sm:divide-y-0">{activity.map((item) => <div key={item.id} className="flex gap-3 px-5 py-4 sm:border-b sm:border-[#e5e5dc]" data-testid={`activity-${item.id}`}><Avatar name={item.actor} size="sm" /><div className="min-w-0"><p className="text-xs leading-5 text-[#4c5750]"><span className="font-semibold">{item.actor}</span> {item.action}</p><div className="mt-1 font-mono text-[9px] uppercase tracking-[.1em] text-[#a0a79e]">{date(item.createdAt)} · {item.type}</div></div></div>)}</div>;
}

function Modal({ title, description, children, onClose }: { title: string; description?: string; children: ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#26302e]/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" role="dialog" aria-modal="true"><div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-[#d9ddd0] bg-[#fbfbf6] p-6 shadow-2xl sm:rounded-3xl sm:p-8"><div className="flex items-start justify-between"><div><h2 className="font-display text-2xl">{title}</h2>{description && <p className="mt-1 text-sm text-[#899189]">{description}</p>}</div><button onClick={onClose} className="rounded-full p-2 text-[#7a847d] hover:bg-[#e8eae0]" aria-label="Close dialog" data-testid="button-close-dialog"><X size={18} /></button></div>{children}</div></div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[.12em] text-[#778278]">{label}</span>{children}</label>;
}

const inputClass = 'h-11 w-full rounded-xl border border-[#d9ddd0] bg-[#f6f7f0] px-3 text-sm text-[#26302e] outline-none transition-colors placeholder:text-[#a4aaa1] focus:border-[#91a936] focus:ring-2 focus:ring-[#d7ed57]/40';

function ProjectForm({ clients, onClose, onCreated }: { clients: Client[]; onClose: () => void; onCreated: (project: Project) => void }) {
  const create = useCreateProject();
  const [form, setForm] = useState({ name: '', clientId: clients[0]?.id || '', dueDate: '', budget: '', description: '' });
  const submit = () => { if (!form.name || !form.clientId || !form.dueDate || !form.budget) return; create.mutate({ data: { ...form, budget: Number(form.budget) } }, { onSuccess: (project) => onCreated(project) }); };
  return <Modal title="Start a project" description="Give the work a clear home from day one." onClose={onClose}><div className="mt-6 space-y-4"><Field label="Project name"><input className={inputClass} placeholder="e.g. Alder & Co. brand refresh" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="input-project-name" /></Field><Field label="Client"><select className={inputClass} value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} data-testid="select-project-client">{clients.map((client) => <option key={client.id} value={client.id}>{client.company}</option>)}</select></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Due date"><input type="date" className={inputClass} value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} data-testid="input-project-due-date" /></Field><Field label="Budget"><input type="number" min="0" className={inputClass} placeholder="24000" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} data-testid="input-project-budget" /></Field></div><Field label="Description"><textarea className={`${inputClass} h-24 py-3`} placeholder="What does success look like?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="input-project-description" /></Field>{create.isError && <p className="text-sm text-[#b65341]">We couldn't create that project. Check the fields and try again.</p>}<button disabled={create.isPending} onClick={submit} className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#26302e] text-sm font-semibold text-[#f8f8ee] disabled:opacity-50" data-testid="button-submit-project">{create.isPending ? 'Creating…' : 'Create project'}<ArrowUpRight size={15} /></button></div></Modal>;
}

function ProjectsPage() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState(false);
  const clientsQuery = useListClients({ query: { queryKey: getListClientsQueryKey() } });
  const params = useMemo(() => ({ search: search || undefined, status: status || undefined, page: 1, pageSize: 50 }), [search, status]);
  const projectsQuery = useListProjects(params, { query: { queryKey: getListProjectsQueryKey(params) } });
  const deleteProject = useDeleteProject();
  const items = projectsQuery.data?.items || [];
  return <div><PageHeading eyebrow="Workspace / projects" title="Projects" description="Every brief, milestone, and open question in one considered place." action={<button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-full bg-[#26302e] px-4 py-2.5 text-sm font-semibold text-[#f8f8ee] transition-transform hover:-translate-y-0.5" data-testid="button-create-project"><Plus size={16} /> New project</button>} /><div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center"><div className="relative max-w-md flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a9589]" size={16} /><input className={`${inputClass} pl-10`} placeholder="Search projects or clients" value={search} onChange={(e) => setSearch(e.target.value)} data-testid="input-search-projects" /></div><div className="flex gap-2"><button onClick={() => setStatus('')} className={cn('rounded-full border px-3.5 py-2 text-xs font-semibold', !status ? 'border-[#26302e] bg-[#26302e] text-white' : 'border-[#d9ddd0] bg-[#fbfbf6] text-[#6e786f]')} data-testid="filter-projects-all">All work</button>{['active', 'completed', 'at risk'].map((item) => <button key={item} onClick={() => setStatus(item)} className={cn('rounded-full border px-3.5 py-2 text-xs font-semibold capitalize', status === item ? 'border-[#26302e] bg-[#26302e] text-white' : 'border-[#d9ddd0] bg-[#fbfbf6] text-[#6e786f]')} data-testid={`filter-projects-${item.replaceAll(' ', '-')}`}>{item}</button>)}</div></div><section className="overflow-hidden rounded-2xl border border-[#e0e1d7] bg-[#fbfbf6]">{projectsQuery.isLoading ? <div className="space-y-1 p-5">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-16" />)}</div> : projectsQuery.isError ? <div className="p-5"><ErrorState retry={() => queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey(params) })} /></div> : items.length ? <><div className="hidden grid-cols-[minmax(170px,1.5fr)_minmax(110px,1fr)_100px_120px_34px] gap-4 border-b border-[#e5e5dc] px-5 py-3 font-mono text-[9px] uppercase tracking-[.13em] text-[#969f96] md:grid"><span>Project</span><span>Delivery</span><span>Health</span><span>Due</span><span /></div>{items.map((project) => <ProjectRow key={project.id} project={project} onDelete={(id) => { if (window.confirm('Archive this project?')) deleteProject.mutate({ projectId: id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey(params) }) }); }} />)}</> : <div className="p-5"><EmptyState icon={FolderKanban} title={search ? 'No work found' : 'Your project shelf is clear'} description={search ? 'Try a different phrase or remove the filters.' : 'Create a project and give your team a calm, shared source of truth.'} action={!search && <button onClick={() => setOpen(true)} className="rounded-full bg-[#26302e] px-4 py-2 text-sm font-semibold text-white" data-testid="button-empty-create-project">Create a project</button>} /></div>}</section>{open && <ProjectForm clients={clientsQuery.data || []} onClose={() => setOpen(false)} onCreated={(project) => { setOpen(false); queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey(params) }); setLocation(`/projects/${project.id}`); }} />}</div>;
}

function ProjectWorkspace() {
  const { id = '' } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const projectQuery = useGetProject(id, { query: { enabled: !!id, queryKey: getGetProjectQueryKey(id) } });
  const milestonesQuery = useListMilestones({ projectId: id }, { query: { queryKey: getListMilestonesQueryKey({ projectId: id }) } });
  const deliverablesQuery = useListDeliverables({ projectId: id }, { query: { queryKey: ['/api/deliverables', { projectId: id }] } });
  const invoicesQuery = useListInvoices({ projectId: id }, { query: { queryKey: getListInvoicesQueryKey({ projectId: id }) } });
  const activityQuery = useListActivity({ projectId: id }, { query: { queryKey: getListActivityQueryKey({ projectId: id }) } });
  const updateProject = useUpdateProject();
  const updateMilestone = useUpdateMilestone();
  const createMilestone = useCreateMilestone();
  const markPaid = useMarkInvoicePaid();
  const [tab, setTab] = useState('Overview');
  const [milestoneOpen, setMilestoneOpen] = useState(false);
  const [milestoneName, setMilestoneName] = useState('');
  const project = projectQuery.data;
  if (projectQuery.isLoading) return <div className="space-y-4"><Skeleton className="h-9 w-28" /><Skeleton className="h-32" /><Skeleton className="h-72" /></div>;
  if (projectQuery.isError || !project) return <ErrorState retry={() => queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(id) })} />;
  const milestones = milestonesQuery.data || project.milestones || [];
  const deliverables = deliverablesQuery.data || project.deliverables || [];
  const invoices = invoicesQuery.data || project.invoices || [];
  const activity = activityQuery.data || project.activity || [];
  const tabs = ['Overview', 'Roadmap', 'Tasks', 'Deliverables', 'Invoices', 'Activity'];
  const completeMilestone = (milestone: Milestone) => updateMilestone.mutate({ milestoneId: milestone.id, data: { status: 'completed', progress: 100 } }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListMilestonesQueryKey({ projectId: id }) }); queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(id) }); } });
  const onPaid = (invoice: Invoice) => markPaid.mutate({ invoiceId: invoice.id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey({ projectId: id }) }) });
  const addMilestone = () => createMilestone.mutate({ data: { projectId: id, name: milestoneName, dueDate: new Date().toISOString(), description: '' } }, { onSuccess: () => { setMilestoneOpen(false); setMilestoneName(''); queryClient.invalidateQueries({ queryKey: getListMilestonesQueryKey({ projectId: id }) }); } });
  return <div className="rounded-2xl border border-[#e0e1d7] bg-[#fbfbf6] p-6"><Link href="/projects" className="text-xs font-semibold text-[#778278]" data-testid="link-back-projects">← All projects</Link><div className="mt-5 flex items-start justify-between gap-4"><div><StatusBadge value={project.status} /><h1 className="mt-3 font-display text-4xl" data-testid="text-project-name">{project.name}</h1><p className="mt-2 text-sm text-[#7d877e]">{project.description}</p></div><button onClick={() => updateProject.mutate({ projectId: id, data: { status: project.status === 'active' ? 'completed' : 'active' } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(id) }) })} className="rounded-full bg-[#26302e] px-4 py-2 text-xs font-semibold text-white" data-testid="button-toggle-project-status">{project.status === 'active' ? 'Mark complete' : 'Reopen project'}</button></div><div className="mt-6"><ProgressBar value={project.progress} /></div><div className="mt-6 flex gap-1 overflow-x-auto border-b border-[#dfe1d8]">{tabs.map((item) => <button key={item} onClick={() => setTab(item)} className={cn('border-b-2 px-3 py-3 text-xs font-semibold', tab === item ? 'border-[#8da633] text-[#506522]' : 'border-transparent text-[#89928a]')} data-testid={`tab-project-${item.toLowerCase()}`}>{item}</button>)}</div><div className="mt-6">{tab === 'Overview' && <OverviewTab project={project} milestones={milestones} activity={activity} />}{tab === 'Roadmap' && <RoadmapTab milestones={milestones} onComplete={completeMilestone} onAdd={() => setMilestoneOpen(true)} />}{tab === 'Tasks' && <ProjectTasks tasks={project.tasks || []} projectId={id} />}{tab === 'Deliverables' && <DeliverablesTab deliverables={deliverables} />}{tab === 'Invoices' && <InvoiceTable invoices={invoices} onPaid={onPaid} />}{tab === 'Activity' && <ActivityList activity={activity} />}</div>{milestoneOpen ? <Modal title="Add milestone" onClose={() => setMilestoneOpen(false)}><div className="mt-6 space-y-4"><Field label="Milestone name"><input className={inputClass} value={milestoneName} onChange={(e) => setMilestoneName(e.target.value)} data-testid="input-milestone-name" /></Field><button onClick={addMilestone} className="h-11 w-full rounded-full bg-[#26302e] text-sm font-semibold text-white" data-testid="button-submit-milestone">Add milestone</button></div></Modal> : null}</div>;
}

function OverviewTab({ project, milestones, activity }: { project: Project; milestones: Milestone[]; activity: Activity[] }) {
  return <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]"><div className="rounded-2xl border border-[#e0e1d7] p-5"><div className="flex items-center justify-between"><h2 className="font-display text-xl">Project pulse</h2><span className="font-mono text-[10px] uppercase tracking-[.12em] text-[#96a095]">at a glance</span></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-[#f0f2e8] p-4"><Target size={16} className="text-[#70882b]" /><div className="mt-4 font-mono text-xl">{milestones.filter((m) => m.status === 'completed').length}/{milestones.length}</div><div className="mt-1 text-xs text-[#7f8a80]">milestones complete</div></div><div className="rounded-xl bg-[#f0f2e8] p-4"><CheckCircle2 size={16} className="text-[#70882b]" /><div className="mt-4 font-mono text-xl">{project.taskCount}</div><div className="mt-1 text-xs text-[#7f8a80]">tasks in the plan</div></div></div><div className="mt-6"><div className="mb-3 flex items-center justify-between text-xs"><span className="font-semibold">Delivery confidence</span><span className="font-mono text-[#70882b]">{project.health}</span></div><ProgressBar value={project.progress} /></div></div><div className="rounded-2xl border border-[#e0e1d7] p-5"><h2 className="font-display text-xl">Latest signal</h2><div className="mt-5">{activity.slice(0, 3).map((item) => <div key={item.id} className="mb-4 flex gap-3 last:mb-0"><Avatar name={item.actor} size="sm" /><div><div className="text-xs leading-5 text-[#4c5750]"><b>{item.actor}</b> {item.action}</div><div className="mt-1 font-mono text-[9px] uppercase tracking-[.1em] text-[#a0a79e]">{date(item.createdAt)}</div></div></div>)}</div></div></div>;
}

function RoadmapTab({ milestones, onComplete, onAdd }: { milestones: Milestone[]; onComplete: (milestone: Milestone) => void; onAdd: () => void }) {
  return <div><div className="mb-4 flex items-center justify-between"><div><h2 className="font-display text-2xl">Roadmap</h2><p className="mt-1 text-sm text-[#879087]">The arc of the work, not just the list.</p></div><button onClick={onAdd} className="inline-flex items-center gap-2 rounded-full border border-[#d9ddd0] px-3.5 py-2 text-xs font-semibold hover:bg-[#f0f2e8]" data-testid="button-add-milestone"><Plus size={14} /> Add milestone</button></div>{milestones.length ? <div className="space-y-3">{milestones.map((milestone, index) => <div key={milestone.id} className="flex gap-4 rounded-2xl border border-[#e0e1d7] p-5" data-testid={`milestone-${milestone.id}`}><div className="flex flex-col items-center"><span className={cn('flex h-8 w-8 items-center justify-center rounded-full font-mono text-xs', milestone.status === 'completed' ? 'bg-[#d7ed57] text-[#26302e]' : 'bg-[#e7ebdf] text-[#627052]')}>{milestone.status === 'completed' ? <Check size={15} /> : `0${index + 1}`}</span><span className="mt-2 h-full w-px bg-[#e1e3d9]" /></div><div className="min-w-0 flex-1 pb-2"><div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start"><div><h3 className="text-sm font-semibold">{milestone.name}</h3><p className="mt-1 text-xs leading-5 text-[#858e86]">{milestone.description || 'A meaningful checkpoint for the team and client.'}</p></div><StatusBadge value={milestone.status} /></div><div className="mt-4 flex items-center gap-4"><div className="flex-1"><ProgressBar value={milestone.progress} /></div><span className="font-mono text-[10px] text-[#79847b]">{milestone.progress}%</span><span className="font-mono text-[10px] text-[#909a90]">{date(milestone.dueDate)}</span>{milestone.status !== 'completed' && <button onClick={() => onComplete(milestone)} className="rounded-full bg-[#eef2da] px-2.5 py-1 text-[10px] font-semibold text-[#66772e] hover:bg-[#dfeaba]" data-testid={`button-complete-milestone-${milestone.id}`}>Complete</button>}</div></div></div>)}</div> : <EmptyState icon={Target} title="No milestones yet" description="Add the beats that will make this project's progress visible." action={<button onClick={onAdd} className="rounded-full bg-[#26302e] px-4 py-2 text-sm font-semibold text-white" data-testid="button-empty-add-milestone">Add a milestone</button>} />}</div>;
}

function ProjectTasks({ tasks, projectId }: { tasks: Task[]; projectId: string }) {
  const queryClient = useQueryClient();
  const updateTask = useUpdateTask();
  return <div><div className="mb-4"><h2 className="font-display text-2xl">Tasks</h2><p className="mt-1 text-sm text-[#879087]">The next clear actions for this project.</p></div>{tasks.length ? <div className="overflow-hidden rounded-2xl border border-[#e0e1d7]"><div className="divide-y divide-[#e5e5dc]">{tasks.map((task) => <div key={task.id} className="flex flex-wrap items-center gap-3 bg-[#fbfbf6] px-4 py-4 sm:flex-nowrap" data-testid={`task-${task.id}`}><button onClick={() => updateTask.mutate({ taskId: task.id, data: { status: task.status === 'completed' ? 'todo' : 'completed' } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) }) })} className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full border', task.status === 'completed' ? 'border-[#8ba72c] bg-[#d7ed57] text-[#26302e]' : 'border-[#bbc4b8]')} aria-label={`Toggle ${task.title}`} data-testid={`button-toggle-task-${task.id}`}>{task.status === 'completed' && <Check size={12} />}</button><div className={cn('min-w-[170px] flex-1 text-sm', task.status === 'completed' && 'text-[#9aa29b] line-through')}>{task.title}<div className="mt-1 text-[10px] text-[#99a199]">{task.owner || 'Unassigned'} · due {date(task.dueDate)}</div></div><StatusBadge value={task.priority} tone={task.priority === 'high' ? 'red' : undefined} /><span className="font-mono text-[10px] text-[#929b92]">{task.status}</span></div>)}</div></div> : <EmptyState icon={CheckCircle2} title="No tasks on the board" description="This project has room for its first next step." />}</div>;
}

function DeliverablesTab({ deliverables }: { deliverables: Deliverable[] }) {
  return deliverables.length ? <div><div className="mb-4"><h2 className="font-display text-2xl">Deliverables</h2><p className="mt-1 text-sm text-[#879087]">Files and links ready for a thoughtful handoff.</p></div><div className="grid gap-3 md:grid-cols-2">{deliverables.map((item) => <a href={item.url || '#'} target="_blank" rel="noreferrer" key={item.id} className="group flex items-center gap-4 rounded-2xl border border-[#e0e1d7] bg-[#fbfbf6] p-4 hover:border-[#b7c983]" data-testid={`deliverable-${item.id}`}><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e9eddf] text-[#63752d]"><FileCheck2 size={18} /></span><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{item.title}</div><div className="mt-1 text-xs text-[#8c958c]">{item.type} · updated {date(item.updatedAt)}</div></div><span className="font-mono text-[10px] text-[#8e998d]">{item.shareCount} shares</span><ArrowUpRight size={15} className="text-[#84917f] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></a>)}</div></div> : <EmptyState icon={FileText} title="No deliverables yet" description="Approved work and shared links will gather here as the project takes shape." />;
}

function InvoiceTable({ invoices, onPaid }: { invoices: Invoice[]; onPaid: (invoice: Invoice) => void }) {
  return invoices.length ? <div><div className="mb-4"><h2 className="font-display text-2xl">Invoices</h2><p className="mt-1 text-sm text-[#879087]">A clean line between work delivered and value captured.</p></div><div className="overflow-hidden rounded-2xl border border-[#e0e1d7] bg-[#fbfbf6]"><div className="hidden grid-cols-[1fr_130px_130px_140px] gap-4 border-b border-[#e5e5dc] px-5 py-3 font-mono text-[9px] uppercase tracking-[.13em] text-[#969f96] sm:grid"><span>Invoice</span><span>Issued</span><span>Due</span><span className="text-right">Amount</span></div>{invoices.map((invoice) => <div key={invoice.id} className="flex flex-wrap items-center gap-3 border-b border-[#e5e5dc] px-5 py-4 last:border-0 sm:grid sm:grid-cols-[1fr_130px_130px_140px] sm:gap-4" data-testid={`invoice-${invoice.id}`}><div><div className="text-sm font-semibold">{invoice.number}</div><div className="mt-1 text-xs text-[#909990]"><span className="sm:hidden">Due {date(invoice.dueDate)} · </span><StatusBadge value={invoice.status} /></div></div><div className="hidden font-mono text-xs text-[#626e65] sm:block">{date(invoice.issuedDate)}</div><div className="hidden font-mono text-xs text-[#626e65] sm:block">{date(invoice.dueDate)}</div><div className="ml-auto text-right"><div className="font-mono text-sm">{money(invoice.amount)}</div>{invoice.status !== 'paid' && <button onClick={() => onPaid(invoice)} className="mt-1 text-[10px] font-semibold text-[#697e2f] hover:text-[#26302e]" data-testid={`button-mark-paid-${invoice.id}`}>Mark paid</button>}</div></div>)}</div></div> : <EmptyState icon={ReceiptText} title="No invoices on this project" description="When you're ready to bill, the invoice will have a clear place to land." />;
}

function ClientsPage() {
  const clientsQuery = useListClients({ query: { queryKey: getListClientsQueryKey() } });
  const clients = clientsQuery.data || [];
  return <div><PageHeading eyebrow="Workspace / clients" title="Clients" description="The relationships behind the work, kept close and easy to understand." /><div className="mb-6 grid gap-3 sm:grid-cols-3"><StatCard label="Client relationships" value={`${clients.length}`} detail="active partners" icon={Users} /><StatCard label="Projects in flight" value={`${clients.reduce((sum, client) => sum + client.projectCount, 0)}`} detail="across the roster" icon={BriefcaseBusiness} /><StatCard label="Average tenure" value="2.4y" detail="built over time" icon={Sparkles} accent /></div>{clientsQuery.isLoading ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-40" />)}</div> : clients.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{clients.map((client) => <div className="group rounded-2xl border border-[#e0e1d7] bg-[#fbfbf6] p-5 transition-transform hover:-translate-y-0.5" key={client.id} data-testid={`card-client-${client.id}`}><div className="flex items-start justify-between"><Avatar name={client.company || client.name} size="lg" /><button className="rounded-lg p-2 text-[#9aa399] hover:bg-[#eceee4] hover:text-[#26302e]" aria-label={`Client menu for ${client.company}`} data-testid={`button-client-menu-${client.id}`}><MoreHorizontal size={16} /></button></div><h2 className="mt-5 text-base font-semibold">{client.company}</h2><p className="mt-1 text-xs text-[#7f8a81]">{client.name}</p><div className="mt-5 flex items-center justify-between border-t border-[#e5e5dc] pt-4"><span className="font-mono text-[10px] text-[#89938a]">{client.email}</span><span className="rounded-full bg-[#edf1df] px-2 py-1 font-mono text-[10px] text-[#63762d]">{client.projectCount} projects</span></div></div>)}</div> : <EmptyState icon={Users} title="Your client book is waiting" description="Clients appear here as your agency starts a project relationship." />}</div>;
}

function TasksPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState(false);
  const params = useMemo(() => ({ status: status || undefined, page: 1, pageSize: 50 }), [status]);
  const tasksQuery = useListTasks(params, { query: { queryKey: getListTasksQueryKey(params) } });
  const projectsQuery = useListProjects({ page: 1, pageSize: 50 }, { query: { queryKey: getListProjectsQueryKey({ page: 1, pageSize: 50 }) } });
  const updateTask = useUpdateTask();
  const tasks = tasksQuery.data?.items || [];
  return <div><PageHeading eyebrow="Workspace / tasks" title="Task tracker" description="A cross-project view for the work that keeps everything else moving." action={<button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-full bg-[#26302e] px-4 py-2.5 text-sm font-semibold text-white" data-testid="button-create-task"><Plus size={16} /> Add task</button>} /><div className="mb-5 flex gap-2 overflow-x-auto">{['', 'todo', 'in_progress', 'completed'].map((item) => <button key={item || 'all'} onClick={() => setStatus(item)} className={cn('whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-semibold', status === item ? 'border-[#26302e] bg-[#26302e] text-white' : 'border-[#d9ddd0] bg-[#fbfbf6] text-[#6e786f]')} data-testid={`filter-tasks-${item || 'all'}`}>{item ? item.replace('_', ' ') : 'All tasks'}</button>)}</div><section className="overflow-hidden rounded-2xl border border-[#e0e1d7] bg-[#fbfbf6]">{tasksQuery.isLoading ? <div className="space-y-2 p-5">{[1, 2, 3, 4, 5].map((item) => <Skeleton key={item} className="h-14" />)}</div> : tasks.length ? <div className="divide-y divide-[#e5e5dc]">{tasks.map((task) => <div key={task.id} className="flex flex-wrap items-center gap-3 px-5 py-4 sm:flex-nowrap" data-testid={`row-task-${task.id}`}><button onClick={() => updateTask.mutate({ taskId: task.id, data: { status: task.status === 'completed' ? 'todo' : 'completed' } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTasksQueryKey(params) }) })} className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full border', task.status === 'completed' ? 'border-[#8ba72c] bg-[#d7ed57]' : 'border-[#bbc4b8]')} aria-label={`Complete ${task.title}`} data-testid={`button-complete-task-${task.id}`}>{task.status === 'completed' && <Check size={12} />}</button><div className={cn('min-w-[180px] flex-1 text-sm font-medium', task.status === 'completed' && 'text-[#989f98] line-through')}>{task.title}<div className="mt-1 text-xs font-normal text-[#98a199]">{projectsQuery.data?.items.find((project) => project.id === task.projectId)?.name || 'Project'} · {task.owner || 'Unassigned'}</div></div><StatusBadge value={task.priority} tone={task.priority === 'high' ? 'red' : undefined} /><span className="font-mono text-[10px] text-[#89958b]">due {date(task.dueDate)}</span></div>)}</div> : <div className="p-5"><EmptyState icon={CheckCircle2} title="Nothing on your plate" description="A clear task list is a good day. Add the next action when it arrives." action={<button onClick={() => setOpen(true)} className="rounded-full bg-[#26302e] px-4 py-2 text-sm font-semibold text-white" data-testid="button-empty-create-task">Add a task</button>} /></div>}</section>{open && <TaskForm projects={projectsQuery.data?.items || []} onClose={() => setOpen(false)} onCreated={() => { setOpen(false); queryClient.invalidateQueries({ queryKey: getListTasksQueryKey(params) }); }} />}</div>;
}

function TaskForm({ projects, onClose, onCreated }: { projects: Project[]; onClose: () => void; onCreated: () => void }) {
  const create = useCreateTask();
  const [form, setForm] = useState({ projectId: projects[0]?.id || '', title: '', owner: '', dueDate: '', priority: 'medium' });
  return <Modal title="Add a task" description="Make the next move obvious." onClose={onClose}><div className="mt-6 space-y-4"><Field label="Task"><input className={inputClass} placeholder="What needs to happen?" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="input-task-title" /></Field><Field label="Project"><select className={inputClass} value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} data-testid="select-task-project">{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Owner"><input className={inputClass} placeholder="Name" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} data-testid="input-task-owner" /></Field><Field label="Priority"><select className={inputClass} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} data-testid="select-task-priority"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></Field></div><Field label="Due date"><input type="date" className={inputClass} value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} data-testid="input-task-due-date" /></Field><button onClick={() => create.mutate({ data: form }, { onSuccess: onCreated })} disabled={create.isPending || !form.title || !form.projectId} className="h-11 w-full rounded-full bg-[#26302e] text-sm font-semibold text-white disabled:opacity-50" data-testid="button-submit-task">{create.isPending ? 'Adding…' : 'Add task'}</button></div></Modal>;
}

function InvoicesPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const invoicesQuery = useListInvoices(undefined, { query: { queryKey: getListInvoicesQueryKey() } });
  const projectsQuery = useListProjects({ page: 1, pageSize: 50 }, { query: { queryKey: getListProjectsQueryKey({ page: 1, pageSize: 50 }) } });
  const markPaid = useMarkInvoicePaid();
  const invoices = invoicesQuery.data || [];
  const outstanding = invoices.filter((invoice) => invoice.status !== 'paid').reduce((sum, invoice) => sum + invoice.amount, 0);
  return <div><PageHeading eyebrow="Workspace / billing" title="Invoices" description="Billing that feels like a natural extension of the work, never an afterthought." action={<button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-full bg-[#26302e] px-4 py-2.5 text-sm font-semibold text-white" data-testid="button-create-invoice"><Plus size={16} /> New invoice</button>} /><div className="mb-6 grid gap-3 sm:grid-cols-3"><StatCard label="Outstanding" value={money(outstanding)} detail="awaiting payment" icon={WalletCards} accent /><StatCard label="Paid this quarter" value={money(invoices.filter((invoice) => invoice.status === 'paid').reduce((sum, invoice) => sum + invoice.amount, 0))} detail="cash captured" icon={CheckCircle2} /><StatCard label="Open invoices" value={`${invoices.filter((invoice) => invoice.status !== 'paid').length}`} detail="in the loop" icon={ReceiptText} /></div>{invoicesQuery.isLoading ? <Skeleton className="h-72" /> : invoices.length ? <InvoiceTable invoices={invoices} onPaid={(invoice) => markPaid.mutate({ invoiceId: invoice.id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() }) })} /> : <EmptyState icon={ReceiptText} title="Your billing slate is clear" description="New invoices will show here, alongside their payment state." action={<button onClick={() => setOpen(true)} className="rounded-full bg-[#26302e] px-4 py-2 text-sm font-semibold text-white" data-testid="button-empty-create-invoice">Create invoice</button>} />}{open && <InvoiceForm projects={projectsQuery.data?.items || []} onClose={() => setOpen(false)} onCreated={() => { setOpen(false); queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() }); }} />}</div>;
}

function InvoiceForm({ projects, onClose, onCreated }: { projects: Project[]; onClose: () => void; onCreated: () => void }) {
  const create = useCreateInvoice();
  const [form, setForm] = useState({ projectId: projects[0]?.id || '', amount: '', dueDate: '' });
  return <Modal title="New invoice" description="Keep the commercial side as considered as the creative side." onClose={onClose}><div className="mt-6 space-y-4"><Field label="Project"><select className={inputClass} value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} data-testid="select-invoice-project">{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></Field><Field label="Amount"><input type="number" className={inputClass} placeholder="12000" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} data-testid="input-invoice-amount" /></Field><Field label="Due date"><input type="date" className={inputClass} value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} data-testid="input-invoice-due-date" /></Field><button onClick={() => create.mutate({ data: { projectId: form.projectId, amount: Number(form.amount), dueDate: form.dueDate } }, { onSuccess: onCreated })} disabled={create.isPending || !form.projectId || !form.amount || !form.dueDate} className="h-11 w-full rounded-full bg-[#26302e] text-sm font-semibold text-white disabled:opacity-50" data-testid="button-submit-invoice">{create.isPending ? 'Creating…' : 'Create invoice'}</button></div></Modal>;
}

function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [whiteLabel, setWhiteLabel] = useState(true);
  return <div><PageHeading eyebrow="Manage / settings" title="Studio settings" description="Make the portal feel like yours, then keep your attention on the work." action={<button onClick={() => { setSaved(true); window.setTimeout(() => setSaved(false), 2500); }} className="rounded-full bg-[#26302e] px-4 py-2.5 text-sm font-semibold text-white" data-testid="button-save-settings">{saved ? 'Saved' : 'Save changes'}</button>} />{saved && <div className="mb-5 flex items-center gap-2 rounded-xl bg-[#e4efc1] px-4 py-3 text-sm text-[#5d702c]" data-testid="status-settings-saved"><CheckCircle2 size={16} /> Your studio settings are saved.</div>}<div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]"><section className="rounded-2xl border border-[#e0e1d7] bg-[#fbfbf6] p-5 sm:p-7"><div className="flex items-start gap-4 border-b border-[#e5e5dc] pb-6"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d7ed57] font-display text-xl">N</span><div><h2 className="font-display text-2xl">Agency profile</h2><p className="mt-1 text-sm text-[#879087]">The details clients see when they work with you.</p></div></div><div className="mt-6 space-y-5"><Field label="Agency name"><input className={inputClass} defaultValue="Northstar Studio" data-testid="input-agency-name" /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Website"><div className="relative"><Globe2 className="absolute left-3 top-3 text-[#909a91]" size={15} /><input className={`${inputClass} pl-9`} defaultValue="northstar.studio" data-testid="input-agency-website" /></div></Field><Field label="Support email"><input className={inputClass} defaultValue="hello@northstar.studio" data-testid="input-agency-email" /></Field></div><Field label="Portal intro"><textarea className={`${inputClass} h-24 py-3`} defaultValue="Clear work. Considered decisions. A shared view of what happens next." data-testid="input-portal-intro" /></Field></div></section><div className="space-y-6"><section className="rounded-2xl border border-[#e0e1d7] bg-[#fbfbf6] p-5 sm:p-7"><div className="flex items-start gap-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e9eddf] text-[#66782f]"><Palette size={18} /></span><div><h2 className="font-display text-xl">White-label portal</h2><p className="mt-1 text-sm leading-5 text-[#879087]">Put your studio's signature on the client experience.</p></div></div><div className="mt-6 flex items-center justify-between border-t border-[#e5e5dc] pt-5"><div><div className="text-sm font-semibold">Show Northstar branding</div><div className="mt-1 text-xs text-[#8e978e]">Clients see your name and colors.</div></div><button onClick={() => setWhiteLabel(!whiteLabel)} className={cn('relative h-6 w-11 rounded-full transition-colors', whiteLabel ? 'bg-[#8da633]' : 'bg-[#c5cbc1]')} aria-pressed={whiteLabel} data-testid="toggle-white-label"><span className={cn('absolute top-1 h-4 w-4 rounded-full bg-white transition-transform', whiteLabel ? 'left-6' : 'left-1')} /></button></div></section><section className="rounded-2xl border border-[#e0e1d7] bg-[#fbfbf6] p-5 sm:p-7"><div className="flex items-center justify-between"><div><h2 className="font-display text-xl">Team access</h2><p className="mt-1 text-sm text-[#879087]">3 people with a seat in the studio.</p></div><button className="rounded-full border border-[#d9ddd0] px-3 py-2 text-xs font-semibold hover:bg-[#eef0e5]" data-testid="button-invite-team"><Plus size={13} className="mr-1 inline" /> Invite</button></div><div className="mt-5 space-y-3"><div className="flex items-center gap-3"><Avatar name="Maya Chen" /><div className="flex-1"><div className="text-sm font-semibold">Maya Chen</div><div className="text-xs text-[#8e978e]">Creative director</div></div><span className="font-mono text-[9px] uppercase tracking-[.12em] text-[#87928a]">Admin</span></div><div className="flex items-center gap-3"><Avatar name="Jon Bell" /><div className="flex-1"><div className="text-sm font-semibold">Jon Bell</div><div className="text-xs text-[#8e978e]">Producer</div></div><span className="font-mono text-[9px] uppercase tracking-[.12em] text-[#87928a]">Member</span></div></div></section></div></div></div>;
}

function Router() {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><Switch><Route path="/sign-in" component={SignInPage} /><Route path="/sign-up" component={SignUpPage} /><Route path="/accept-invite" component={AcceptInvitePage} /><Route path="/"><AuthProvider><Shell><Switch><Route path="/" component={DashboardPage} /><Route path="/projects" component={ProjectsPage} /><Route path="/projects/:id" component={ProjectWorkspace} /><Route path="/clients" component={ClientsPage} /><Route path="/tasks" component={TasksPage} /><Route path="/invoices" component={InvoicesPage} /><Route path="/settings" component={SettingsPage} /><Route component={NotFound} /></Switch></Shell></AuthProvider></Route></Switch></ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><AuthTokenProvider><TooltipProvider><Router /><Toaster /></TooltipProvider></AuthTokenProvider></QueryClientProvider>;
}

export default App;