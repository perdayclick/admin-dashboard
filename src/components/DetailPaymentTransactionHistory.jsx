import { useCallback, useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { paymentApi } from '../services/api'
import { getErrorMessage } from '../utils/format'
import { isMongoObjectIdString } from '../utils/mongoId'
import {
  paymentStatusLabel,
  paymentStatusBadgeClass,
  payoutStatusLabel,
  payoutStatusBadgeClass,
} from '../constants/paymentEnums'
import { formatCurrency } from '../pages/payments/paymentsShared'

const DETAIL_TX_LIMIT = 8

function jobIdStr(jobOrId) {
  if (!jobOrId) return ''
  if (typeof jobOrId === 'object' && jobOrId._id != null) return String(jobOrId._id)
  return String(jobOrId)
}

function shortenId(id) {
  const s = String(id)
  if (s.length <= 12) return s
  return `${s.slice(0, 6)}…${s.slice(-4)}`
}

function typePillClass(t) {
  if (t === 'ONLINE') return 'detail-pay-type detail-pay-type--online'
  if (t === 'CASH') return 'detail-pay-type detail-pay-type--cash'
  return 'detail-pay-type detail-pay-type--na'
}

/**
 * Employer profile: payments grouped by job (same checkout split across workers).
 */
export function EmployerDetailPaymentHistory({ payerUserId }) {
  const uid = (payerUserId && String(payerUserId).trim()) || ''
  const [page, setPage] = useState(1)
  const [groups, setGroups] = useState([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async (p) => {
    if (!uid || !isMongoObjectIdString(uid)) {
      setGroups([])
      setTotal(0)
      setPages(0)
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await paymentApi.listAdminAll({
        payerUserId: uid,
        groupByJob: true,
        page: p,
        limit: DETAIL_TX_LIMIT,
      })
      if ((res?.mode || '') !== 'grouped_by_job') {
        setError('Unexpected response from payments API.')
        setGroups([])
        setTotal(0)
        setPages(0)
        return
      }
      setGroups(Array.isArray(res.data) ? res.data : [])
      setTotal(typeof res.total === 'number' ? res.total : 0)
      setPages(typeof res.pages === 'number' ? res.pages : 0)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load payment history'))
      setGroups([])
      setTotal(0)
      setPages(0)
    } finally {
      setLoading(false)
    }
  }, [uid])

  useEffect(() => {
    setPage(1)
  }, [uid])

  useEffect(() => {
    load(page)
  }, [load, page])

  if (!uid || !isMongoObjectIdString(uid)) {
    return null
  }

  const ledgerHref = `/payments/transactions?payerUserId=${encodeURIComponent(uid)}&groupByJob=true`

  return (
    <section className="job-view-card detail-page-jobs-section detail-payment-history">
      <h3 className="view-section-title">Payment transaction history</h3>
      <p className="view-detail-section-subtitle" style={{ marginTop: 0 }}>
        Jobs this employer paid for: <strong>number of worker payment lines</strong>, gross per line, total platform fee, and total credited to workers (same Razorpay order is often shared across lines).
      </p>
      {error && (
        <p className="detail-payment-history__error" role="alert">{error}</p>
      )}
      {loading && !error && (
        <p className="view-detail-empty-kyc">Loading payment history…</p>
      )}
      {!loading && !error && groups.length === 0 && (
        <p className="view-detail-empty-kyc">No payment records for this employer yet.</p>
      )}
      {!loading && groups.length > 0 && (
        <div className="detail-payment-history__groups">
          {groups.map((group) => {
            const jid = jobIdStr(group.jobId)
            const title = group.job?.jobTitle || (jid ? `Job ${shortenId(jid)}` : 'Job')
            const t = group.totals || {}
            return (
              <article key={jid || String(group.jobId)} className="detail-payment-history__card">
                <div className="detail-payment-history__card-head">
                  <div>
                    {jid ? (
                      <NavLink to={`/jobs/${jid}`} className="detail-payment-history__job-link">{title}</NavLink>
                    ) : (
                      <span className="detail-payment-history__job-title">{title}</span>
                    )}
                    <div className="detail-payment-history__meta">
                      <span>{t.workerCount ?? 0} worker payment line{(t.workerCount ?? 0) === 1 ? '' : 's'}</span>
                      {group.razorpayOrderId && (
                        <span title={group.razorpayOrderId}>
                          Order <code className="detail-payment-history__mono">{shortenId(group.razorpayOrderId)}</code>
                        </span>
                      )}
                    </div>
                  </div>
                  <dl className="detail-payment-history__dl">
                    <div>
                      <dt>Total line ₹</dt>
                      <dd>{formatCurrency(t.sumEmployerLineAmount)}</dd>
                    </div>
                    <div>
                      <dt>Platform cut</dt>
                      <dd>{formatCurrency(t.sumPlatformFee)}</dd>
                    </div>
                    <div>
                      <dt>To workers</dt>
                      <dd>{formatCurrency(t.sumWorkerAmount)}</dd>
                    </div>
                  </dl>
                </div>
              </article>
            )
          })}
        </div>
      )}
      {pages > 1 && (
        <div className="detail-payment-history__pager">
          <button
            type="button"
            className="mgmt-link"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span className="detail-payment-history__page-label">
            Page {page} / {pages} ({total} job{total === 1 ? '' : 's'})
          </span>
          <button
            type="button"
            className="mgmt-link"
            disabled={page >= pages || loading}
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
          >
            Next
          </button>
        </div>
      )}
      <p className="detail-payment-history__footer-link">
        <NavLink to={ledgerHref} className="mgmt-link">Open full ledger in Payments →</NavLink>
      </p>
    </section>
  )
}

/**
 * Worker profile: payment rows where this worker earned from a job (employer line → platform fee → worker share).
 * Excludes commission-to-platform and penalty rows via API (`jobEarningsOnly`).
 */
export function WorkerDetailPaymentHistory({ workerId }) {
  const wid = (workerId && String(workerId).trim()) || ''
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async (p) => {
    if (!wid || !isMongoObjectIdString(wid)) {
      setRows([])
      setTotal(0)
      setPages(0)
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await paymentApi.listAdminAll({
        workerId: wid,
        jobEarningsOnly: true,
        page: p,
        limit: DETAIL_TX_LIMIT,
      })
      if ((res?.mode || 'flat') !== 'flat') {
        setError('Unexpected response from payments API.')
        setRows([])
        setTotal(0)
        setPages(0)
        return
      }
      setRows(Array.isArray(res.data) ? res.data : [])
      setTotal(typeof res.total === 'number' ? res.total : 0)
      setPages(typeof res.pages === 'number' ? res.pages : 0)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load payment history'))
      setRows([])
      setTotal(0)
      setPages(0)
    } finally {
      setLoading(false)
    }
  }, [wid])

  useEffect(() => {
    setPage(1)
  }, [wid])

  useEffect(() => {
    load(page)
  }, [load, page])

  if (!wid || !isMongoObjectIdString(wid)) {
    return null
  }

  const ledgerHref = `/payments/transactions?workerId=${encodeURIComponent(wid)}&jobEarningsOnly=true`

  return (
    <section className="job-view-card detail-page-jobs-section detail-payment-history">
      <h3 className="view-section-title">Payment transaction history</h3>
      <p className="view-detail-section-subtitle" style={{ marginTop: 0 }}>
        Amounts this worker <strong>received from jobs</strong> (per line: employer pays, platform fee, net credited to worker). Commission and penalty payments are not listed here.
      </p>
      {error && (
        <p className="detail-payment-history__error" role="alert">{error}</p>
      )}
      {loading && !error && (
        <p className="view-detail-empty-kyc">Loading payment history…</p>
      )}
      {!loading && !error && rows.length === 0 && (
        <p className="view-detail-empty-kyc">No job payment records for this worker yet.</p>
      )}
      {!loading && rows.length > 0 && (
        <div className="detail-jobs-table-wrap">
          <table className="mgmt-table detail-jobs-table detail-payment-history__table">
            <thead>
              <tr>
                <th>Job</th>
                <th>Type</th>
                <th>Line ₹</th>
                <th>Fee</th>
                <th>Worker ₹</th>
                <th>Payout</th>
                <th>Status</th>
                <th aria-label="Detail" />
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const jid = jobIdStr(p.jobId)
                const jtitle = typeof p.jobId === 'object' && p.jobId?.jobTitle
                  ? p.jobId.jobTitle
                  : (jid ? shortenId(jid) : '—')
                return (
                  <tr key={p._id}>
                    <td>
                      {jid ? (
                        <NavLink to={`/jobs/${jid}`} className="mgmt-link">{jtitle}</NavLink>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <span className={typePillClass(p.paymentType)}>{p.paymentType || '—'}</span>
                    </td>
                    <td>{formatCurrency(p.amount)}</td>
                    <td className="view-muted">{formatCurrency(p.platformFee)}</td>
                    <td>{formatCurrency(p.workerAmount)}</td>
                    <td>
                      <span className={`mgmt-badge ${payoutStatusBadgeClass(p.payoutStatus)}`}>
                        {payoutStatusLabel(p.payoutStatus)}
                      </span>
                    </td>
                    <td>
                      <span className={`mgmt-badge ${paymentStatusBadgeClass(p.status)}`}>
                        {paymentStatusLabel(p.status)}
                      </span>
                    </td>
                    <td>
                      <NavLink to={`/payments/transactions/${p._id}`} className="mgmt-link">Detail</NavLink>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 && (
        <div className="detail-payment-history__pager">
          <button
            type="button"
            className="mgmt-link"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span className="detail-payment-history__page-label">
            Page {page} / {pages} ({total} row{total === 1 ? '' : 's'})
          </span>
          <button
            type="button"
            className="mgmt-link"
            disabled={page >= pages || loading}
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
          >
            Next
          </button>
        </div>
      )}
      <p className="detail-payment-history__footer-link">
        <NavLink to={ledgerHref} className="mgmt-link">Open full ledger in Payments →</NavLink>
      </p>
    </section>
  )
}
