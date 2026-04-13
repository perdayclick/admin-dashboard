import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from 'recharts'
import { jobsApi, paymentApi, workersApi } from '../services/api'
import { getErrorMessage } from '../utils/format'
import { jobStatusLabel } from '../constants/jobEnums'
import { formatTrendDayLabel } from './payments/paymentsShared'
import './Dashboard.css'

const KPI_ICON = {
  workers: '#2563eb',
  jobs: '#10b981',
  earnings: '#7c3aed',
  tasks: '#047857',
}

const PIE_COLORS = ['#2563eb', '#10b981', '#a855f7', '#f97316', '#6b7280']

const WORK_TYPE_LABEL = {
  FULL_TIME: 'Full time',
  PART_TIME: 'Part time',
  TASK: 'Task',
  PER_DAY: 'Per day',
}

function unwrap(res) {
  return res?.data !== undefined ? res.data : res
}

function formatRelativeAgo(value) {
  const d = value ? new Date(value) : null
  if (!d || Number.isNaN(d.getTime())) return '—'
  const sec = Math.floor((Date.now() - d.getTime()) / 1000)
  if (sec < 10) return 'Just now'
  if (sec < 60) return `${sec} sec ago`
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`
  if (sec < 86400) return `${Math.floor(sec / 3600)} hr ago`
  if (sec < 604800) return `${Math.floor(sec / 86400)} day${Math.floor(sec / 86400) === 1 ? '' : 's'} ago`
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

/** Last 6 calendar months as { key: 'YYYY-MM', label: 'Jan' } */
function last6MonthSeries() {
  const out = []
  const now = new Date()
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-IN', { month: 'short' })
    out.push({ key, label })
  }
  return out
}

function monthKeyFromDate(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function bucketCountsByMonth(workers, series) {
  const map = Object.fromEntries(series.map((s) => [s.key, 0]))
  for (const w of workers) {
    const k = monthKeyFromDate(w.createdAt)
    if (k && map[k] !== undefined) map[k] += 1
  }
  return series.map((s) => ({ name: s.label, workers: map[s.key] || 0, monthKey: s.key }))
}

function momPercentFromBuckets(buckets) {
  if (!buckets || buckets.length < 2) return null
  const cur = buckets[buckets.length - 1]?.workers ?? 0
  const prev = buckets[buckets.length - 2]?.workers ?? 0
  if (prev === 0 && cur === 0) return null
  if (prev === 0) return null
  return ((cur - prev) / prev) * 100
}

function aggregateWorkTypes(jobs) {
  const map = {}
  for (const j of jobs || []) {
    const wt = j.workType || 'OTHER'
    map[wt] = (map[wt] || 0) + 1
  }
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1])
  return entries.map(([name, value]) => ({
    name: WORK_TYPE_LABEL[name] || name,
    value,
  }))
}

function activityBadgeClass(status) {
  if (status === 'COMPLETED') return 'dash-activity-badge dash-activity-badge--done'
  if (status === 'LIVE' || status === 'HIRED' || status === 'APPROVED') {
    return 'dash-activity-badge dash-activity-badge--progress'
  }
  return 'dash-activity-badge dash-activity-badge--neutral'
}

function activityBadgeLabel(status) {
  if (status === 'COMPLETED') return 'Completed'
  if (status === 'LIVE' || status === 'HIRED') return 'In progress'
  return jobStatusLabel(status)
}

function TrendArrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M7 17L17 7M17 7H9M17 7v8" />
    </svg>
  )
}

function KpiCard({ label, value, iconBg, icon, trendText, trendMuted }) {
  return (
    <div className="dash-kpi-card">
      <p className="dash-kpi-label">{label}</p>
      <p className="dash-kpi-value">{value}</p>
      <div className="dash-kpi-icon" style={{ background: iconBg }}>
        {icon}
      </div>
      {trendText != null && trendText !== '' && (
        <div className={trendMuted ? 'dash-kpi-trend dash-kpi-trend--muted' : 'dash-kpi-trend'}>
          {!trendMuted && <TrendArrow />}
          {trendText}
        </div>
      )}
    </div>
  )
}

const barTooltipStyle = {
  backgroundColor: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  padding: '8px 12px',
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [paymentDenied, setPaymentDenied] = useState(false)

  const [totalWorkers, setTotalWorkers] = useState(0)
  const [workerSampleSize, setWorkerSampleSize] = useState(0)
  const [workerMonthly, setWorkerMonthly] = useState([])

  const [activeJobs, setActiveJobs] = useState(0)
  const [completedJobs, setCompletedJobs] = useState(0)

  const [totalEarnings, setTotalEarnings] = useState(null)
  const [earningsTrend, setEarningsTrend] = useState([])

  const [jobDist, setJobDist] = useState([])
  const [activities, setActivities] = useState([])

  const monthSeries = useMemo(() => last6MonthSeries(), [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    setPaymentDenied(false)

    try {
      const workerPages = await Promise.all(
        [1, 2, 3, 4, 5].map((page) =>
          workersApi.list({ page, limit: 100 }).then(unwrap).catch(() => null)
        )
      )

      const seen = new Set()
      const mergedWorkers = []
      let totalFromApi = 0
      for (const payload of workerPages) {
        if (!payload?.workers) continue
        if (typeof payload.pagination?.total === 'number') totalFromApi = payload.pagination.total
        for (const w of payload.workers) {
          const id = w?._id != null ? String(w._id) : null
          if (id && seen.has(id)) continue
          if (id) seen.add(id)
          mergedWorkers.push(w)
        }
      }

      const buckets = bucketCountsByMonth(mergedWorkers, monthSeries)

      let jobsLive = 0
      let jobsDone = 0
      try {
        const liveRes = unwrap(await jobsApi.list({ page: 1, limit: 1, status: 'LIVE' }))
        jobsLive = liveRes?.pagination?.total ?? 0
      } catch {
        jobsLive = 0
      }
      try {
        const doneRes = unwrap(await jobsApi.list({ page: 1, limit: 1, status: 'COMPLETED' }))
        jobsDone = doneRes?.pagination?.total ?? 0
      } catch {
        jobsDone = 0
      }

      let pieRaw = []
      try {
        const pieRes = unwrap(await jobsApi.list({ page: 1, limit: 100 }))
        pieRaw = pieRes?.jobs || []
      } catch {
        pieRaw = []
      }

      let recentJobs = []
      try {
        const actRes = unwrap(await jobsApi.list({ page: 1, limit: 12 }))
        recentJobs = actRes?.jobs || []
      } catch {
        recentJobs = []
      }

      let revenue = null
      let daily = []
      try {
        const payRes = await paymentApi.getDashboardStats()
        const stats = unwrap(payRes)
        revenue = stats?.revenue?.totalCollected
        daily = Array.isArray(stats?.dailyTrend) ? stats.dailyTrend : []
      } catch (err) {
        if (err?.status === 403) setPaymentDenied(true)
        revenue = null
        daily = []
      }

      setTotalWorkers(totalFromApi || mergedWorkers.length)
      setWorkerSampleSize(mergedWorkers.length)
      setWorkerMonthly(buckets)
      setActiveJobs(jobsLive)
      setCompletedJobs(jobsDone)
      setTotalEarnings(revenue != null ? Number(revenue) : null)
      setEarningsTrend(
        daily.map((d) => ({
          name: formatTrendDayLabel(d._id),
          earnings: Number(d.amount) || 0,
        }))
      )
      setJobDist(aggregateWorkTypes(pieRaw))

      setActivities(
        recentJobs.map((job) => {
          const worker = Array.isArray(job.assignedWorkers) && job.assignedWorkers.length
            ? job.assignedWorkers[0]
            : null
          const employer = job.employer
          const name =
            worker?.fullName ||
            employer?.businessName ||
            employer?.companyName ||
            '—'
          const desc = `${jobStatusLabel(job.status)} · ${job.jobTitle || 'Job'}`
          return {
            id: job._id,
            name,
            desc,
            time: formatRelativeAgo(job.updatedAt || job.createdAt),
            status: job.status,
          }
        })
      )
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load dashboard'))
    } finally {
      setLoading(false)
    }
  }, [monthSeries])

  useEffect(() => {
    load()
  }, [load])

  const workerTrendText = useMemo(() => {
    const mom = momPercentFromBuckets(workerMonthly)
    if (mom == null) return 'Not enough history in sample'
    const sign = mom >= 0 ? '+' : ''
    return `${sign}${mom.toFixed(1)}% vs prior month (sample)`
  }, [workerMonthly])

  const workerTrendMuted = useMemo(() => momPercentFromBuckets(workerMonthly) == null, [workerMonthly])

  const formatWorkers = (n) => (typeof n === 'number' ? n.toLocaleString('en-IN') : '—')
  const formatJobs = (n) => (typeof n === 'number' ? n.toLocaleString('en-IN') : '—')

  const earningsDisplay =
    totalEarnings != null && Number.isFinite(totalEarnings)
      ? `₹${Math.round(totalEarnings).toLocaleString('en-IN')}`
      : '—'

  const pieData = jobDist.filter((d) => d.value > 0)

  return (
    <div className="dash-page">
      <header className="dash-header">
        <div>
          <h1 className="dash-title">Overview</h1>
          <p className="dash-subtitle">Platform health, jobs, and payments at a glance.</p>
        </div>
        <button type="button" className="dash-refresh" onClick={() => load()} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh data'}
        </button>
      </header>

      {error && <div className="dash-banner dash-banner--error">{error}</div>}
      {paymentDenied && !error && (
        <div className="dash-banner">
          Payment metrics need the <strong>payment approve</strong> permission. Other tiles still use live job and worker
          data.
        </div>
      )}

      <section className="dash-kpi-grid" aria-label="Key metrics">
        <KpiCard
          label="Total workers"
          value={loading ? '…' : formatWorkers(totalWorkers)}
          iconBg={KPI_ICON.workers}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
          trendText={loading ? '' : workerTrendText}
          trendMuted={workerTrendMuted}
        />
        <KpiCard
          label="Active jobs"
          value={loading ? '…' : formatJobs(activeJobs)}
          iconBg={KPI_ICON.jobs}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
          }
          trendText={loading ? '' : 'Live listings'}
          trendMuted
        />
        <KpiCard
          label="Total earnings (captured)"
          value={loading ? '…' : earningsDisplay}
          iconBg={KPI_ICON.earnings}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
          trendText={loading ? '' : paymentDenied || totalEarnings == null ? 'Payments stats unavailable' : 'All time (platform)'}
          trendMuted={paymentDenied || totalEarnings == null}
        />
        <KpiCard
          label="Completed jobs"
          value={loading ? '…' : formatJobs(completedJobs)}
          iconBg={KPI_ICON.tasks}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          }
          trendText={loading ? '' : 'Completed lifecycle'}
          trendMuted
        />
      </section>

      <section className="dash-charts-row" aria-label="Charts">
        <div className="dash-chart-card">
          <h2 className="dash-chart-title">Worker sign-ups by month</h2>
          <p className="dash-chart-hint">
            From the latest {workerSampleSize.toLocaleString('en-IN')} worker records loaded for this chart
            {totalWorkers > workerSampleSize ? ` (platform total ${totalWorkers.toLocaleString('en-IN')})` : ''}.
          </p>
          {workerMonthly.some((r) => r.workers > 0) ? (
            <div className="dash-recharts-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={workerMonthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} allowDecimals={false} />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
                    formatter={(v) => [v, 'New workers']}
                  />
                  <Line type="monotone" dataKey="workers" stroke="#2563eb" strokeWidth={2} dot={{ r: 4, fill: '#2563eb' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="dash-empty-chart">No worker sign-ups in this window (or sample empty).</div>
          )}
        </div>

        <div className="dash-chart-card">
          <h2 className="dash-chart-title">Job distribution</h2>
          <p className="dash-chart-hint">By work type — sample of up to 100 recent jobs.</p>
          {pieData.length ? (
            <div className="dash-recharts-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    paddingAngle={2}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={`${entry.name}-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <RechartsTooltip formatter={(v, n) => [v, n]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="dash-empty-chart">No jobs in sample.</div>
          )}
        </div>
      </section>

      <section className="dash-chart-card dash-chart-full" aria-label="Earnings trend">
        <h2 className="dash-chart-title">Captured earnings (₹)</h2>
        <p className="dash-chart-hint">Last 7 days (IST) — same window as Payments overview.</p>
        {earningsTrend.length > 0 ? (
          <>
            <div className="dash-recharts-wrap dash-recharts-wrap--tall">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={earningsTrend} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    tickFormatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`}
                  />
                  <RechartsTooltip
                    cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                    contentStyle={barTooltipStyle}
                    formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Earnings (₹)']}
                    labelFormatter={(label) => label}
                  />
                  <Bar dataKey="earnings" fill="#10b981" name="Earnings (₹)" radius={[6, 6, 0, 0]} maxBarSize={56} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="dash-bar-legend">
              <span className="dash-bar-legend-swatch" aria-hidden />
              Earnings (₹)
            </p>
          </>
        ) : (
          <div className="dash-empty-chart">
            {paymentDenied
              ? 'Connect with payment permissions to see captured volume.'
              : 'No captured payments in this window.'}
          </div>
        )}
      </section>

      <section className="dash-activities" aria-label="Recent activity">
        <h2 className="dash-activities-title">Recent activity</h2>
        {activities.length === 0 && !loading && (
          <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>No recent jobs to show.</p>
        )}
        <div className="dash-activity-list">
          {activities.map((a) => (
            <div key={String(a.id)} className="dash-activity-item">
              <div className="dash-activity-icon" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              </div>
              <div className="dash-activity-name">{a.name}</div>
              <div className="dash-activity-time">{a.time}</div>
              <div className="dash-activity-desc">{a.desc}</div>
              <span className={activityBadgeClass(a.status)}>{activityBadgeLabel(a.status)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
