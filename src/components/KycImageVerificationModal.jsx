import { useState, useEffect, useCallback } from 'react'
import './Modal.css'

const ZOOM_MIN = 0.5
const ZOOM_MAX = 4
const ZOOM_STEP = 0.25

/**
 * Modal for KYC image verification.
 * - View: horizontal layout for Aadhaar/images; Aadhaar number at top; click image to zoom.
 * - Reject: admin selects one or more images (checkboxes) and enters KycRejectedReason, then confirms.
 * allImageItems: array of { imageType, imageUrl, label } from getAllKycImageItems(kyc).
 * aadhaarNumber: optional – displayed at top so admin can verify on the modal.
 */
export default function KycImageVerificationModal({
  open,
  onClose,
  allImageItems = [],
  aadhaarNumber = '',
  onApprove,
  onReject,
  loading = false,
}) {
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [selectedUrls, setSelectedUrls] = useState(new Set())
  const [kycRejectedReason, setKycRejectedReason] = useState('')
  const [rejectFormError, setRejectFormError] = useState('')
  const [zoomOverlay, setZoomOverlay] = useState(null)
  const [zoomScale, setZoomScale] = useState(1)

  useEffect(() => {
    if (!open) {
      setShowRejectForm(false)
      setSelectedUrls(new Set())
      setKycRejectedReason('')
      setRejectFormError('')
      setZoomOverlay(null)
      setZoomScale(1)
    }
  }, [open])

  const openZoom = useCallback((item) => {
    setZoomOverlay(item)
    setZoomScale(1)
  }, [])
  const closeZoom = useCallback(() => setZoomOverlay(null), [])
  const zoomIn = useCallback(() => {
    setZoomScale((s) => Math.min(ZOOM_MAX, s + ZOOM_STEP))
  }, [])
  const zoomOut = useCallback(() => {
    setZoomScale((s) => Math.max(ZOOM_MIN, s - ZOOM_STEP))
  }, [])
  const zoomReset = useCallback(() => setZoomScale(1), [])
  const handleZoomBackdropClick = (e) => {
    if (e.target === e.currentTarget) closeZoom()
  }
  const handleZoomWheel = (e) => {
    if (!e.ctrlKey && !e.metaKey) return
    e.preventDefault()
    if (e.deltaY < 0) zoomIn()
    else zoomOut()
  }

  if (!open) return null

  const hasImages = allImageItems.length > 0

  const handleRejectClick = () => {
    setShowRejectForm(true)
    setSelectedUrls(new Set())
    setRejectFormError('')
  }

  const handleCancelRejectForm = () => {
    setShowRejectForm(false)
    setSelectedUrls(new Set())
    setKycRejectedReason('')
    setRejectFormError('')
  }

  const toggleImage = (imageUrl) => {
    setSelectedUrls((prev) => {
      const next = new Set(prev)
      if (next.has(imageUrl)) next.delete(imageUrl)
      else next.add(imageUrl)
      return next
    })
  }

  const handleConfirmReject = () => {
    const reasonTrim = (kycRejectedReason || '').trim()
    const rejectedImages = allImageItems
      .filter((item) => selectedUrls.has(item.imageUrl))
      .map((item) => ({ imageType: item.imageType, imageUrl: item.imageUrl }))
    if (!reasonTrim) {
      setRejectFormError('Please provide a reason for rejection (required).')
      return
    }
    setRejectFormError('')
    onReject(rejectedImages, reasonTrim)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-box kycm-modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '920px', width: '100%' }}
      >
        <div className="modal-header">
          <h2 className="modal-title">
            {showRejectForm ? 'Reject KYC images' : 'Verify KYC images'}
          </h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
            disabled={loading}
          >
            &times;
          </button>
        </div>
        <div className="modal-body kycm-modal-body">
          {(aadhaarNumber || '').trim() && (
            <div className="kycm-aadhaar-row">
              <span className="kycm-aadhaar-label">Aadhaar number</span>
              <span className="kycm-aadhaar-value">{(aadhaarNumber || '').trim()}</span>
            </div>
          )}
          {showRejectForm ? (
            <div className="kycm-reject-form">
              <p className="kycm-reject-intro">Optionally select which image(s) to reject; then provide the reason (required).</p>
              <div className="kycm-form-group">
                <label className="kycm-checkbox-label">Select image(s) to reject (optional)</label>
                <div className="kycm-image-checkbox-list">
                  {allImageItems.map((item) => (
                    <label key={item.imageUrl + item.label} className="kycm-image-checkbox-item">
                      <input
                        type="checkbox"
                        checked={selectedUrls.has(item.imageUrl)}
                        onChange={() => toggleImage(item.imageUrl)}
                        disabled={loading}
                      />
                      <span className="kycm-checkbox-label-text">{item.label}</span>
                      <div className="kycm-checkbox-thumb">
                        <img src={item.imageUrl} alt={item.label} />
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="kycm-form-group">
                <label htmlFor="kycm-rejected-reason">KycRejectedReason <span className="required">*</span></label>
                <textarea
                  id="kycm-rejected-reason"
                  className="kycm-textarea"
                  placeholder="Reason for rejection (required)"
                  value={kycRejectedReason}
                  onChange={(e) => setKycRejectedReason(e.target.value)}
                  rows={4}
                  maxLength={500}
                  disabled={loading}
                />
                <span className="kycm-char-count">{kycRejectedReason.length}/500</span>
              </div>
              {rejectFormError && (
                <p className="kycm-reject-error" role="alert">{rejectFormError}</p>
              )}
            </div>
          ) : !hasImages ? (
            <p className="kycm-empty">No KYC images to verify.</p>
          ) : (
            <div className="kycm-images kycm-images-horizontal">
              {allImageItems.map((item) => (
                <div key={item.imageUrl + item.label} className="kycm-image-block">
                  <div className="kycm-image-label">{item.label}</div>
                  <button
                    type="button"
                    className="kycm-image-wrap kycm-image-clickable"
                    onClick={() => openZoom(item)}
                    title="Click to zoom"
                  >
                    <img src={item.imageUrl} alt={item.label} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        {zoomOverlay && (
          <div
            className="kycm-zoom-backdrop"
            onClick={handleZoomBackdropClick}
            onWheel={handleZoomWheel}
            role="dialog"
            aria-label="Zoomed image"
          >
            <div className="kycm-zoom-toolbar">
              <span className="kycm-zoom-label">{zoomOverlay.label}</span>
              <div className="kycm-zoom-buttons">
                <button type="button" className="kycm-zoom-btn" onClick={zoomOut} title="Zoom out">−</button>
                <span className="kycm-zoom-scale">{Math.round(zoomScale * 100)}%</span>
                <button type="button" className="kycm-zoom-btn" onClick={zoomIn} title="Zoom in">+</button>
                <button type="button" className="kycm-zoom-btn" onClick={zoomReset} title="Reset zoom">1:1</button>
                <button type="button" className="kycm-zoom-btn kycm-zoom-close" onClick={closeZoom} title="Close">×</button>
              </div>
            </div>
            <div className="kycm-zoom-content">
              <img
                src={zoomOverlay.imageUrl}
                alt={zoomOverlay.label}
                className="kycm-zoom-img"
                style={{ transform: `scale(${zoomScale})` }}
                draggable={false}
              />
            </div>
          </div>
        )}
        <div className="modal-actions kycm-actions">
          {showRejectForm ? (
            <>
              <button
                type="button"
                className="modal-btn secondary"
                onClick={handleCancelRejectForm}
                disabled={loading}
              >
                Back
              </button>
              <button
                type="button"
                className="modal-btn danger"
                onClick={handleConfirmReject}
                disabled={loading}
              >
                {loading ? '…' : 'Confirm reject'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="modal-btn secondary"
                onClick={onClose}
                disabled={loading}
              >
                Close
              </button>
              {hasImages && (
                <>
                  <button
                    type="button"
                    className="modal-btn danger"
                    onClick={handleRejectClick}
                    disabled={loading}
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    className="modal-btn primary"
                    onClick={onApprove}
                    disabled={loading}
                  >
                    {loading ? '…' : 'Approve'}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
