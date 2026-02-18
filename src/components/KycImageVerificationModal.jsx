import { useState, useEffect } from 'react'
import './Modal.css'

/**
 * Modal for KYC image verification.
 * - View: shows all uploaded images (multiple per type: Aadhaar front 1, 2… back 1… Profile image 1, 2…).
 * - Reject: admin selects one or more images (checkboxes) and enters KycRejectedReason, then confirms.
 * allImageItems: array of { imageType, imageUrl, label } from getAllKycImageItems(kyc).
 */
export default function KycImageVerificationModal({
  open,
  onClose,
  allImageItems = [],
  onApprove,
  onReject,
  loading = false,
}) {
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [selectedUrls, setSelectedUrls] = useState(new Set())
  const [kycRejectedReason, setKycRejectedReason] = useState('')
  const [rejectFormError, setRejectFormError] = useState('')

  useEffect(() => {
    if (!open) {
      setShowRejectForm(false)
      setSelectedUrls(new Set())
      setKycRejectedReason('')
      setRejectFormError('')
    }
  }, [open])

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
    if (rejectedImages.length === 0) {
      setRejectFormError('Please select at least one image to reject.')
      return
    }
    if (!reasonTrim) {
      setRejectFormError('Please provide a reason for rejection (KycRejectedReason is required).')
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
        style={{ maxWidth: '560px', width: '100%' }}
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
          {showRejectForm ? (
            <div className="kycm-reject-form">
              <p className="kycm-reject-intro">Select one or more images to reject, then provide the reason.</p>
              <div className="kycm-form-group">
                <label className="kycm-checkbox-label">Select image(s) to reject <span className="required">*</span></label>
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
            <div className="kycm-images">
              {allImageItems.map((item) => (
                <div key={item.imageUrl + item.label} className="kycm-image-block">
                  <div className="kycm-image-label">{item.label}</div>
                  <div className="kycm-image-wrap">
                    <img src={item.imageUrl} alt={item.label} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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
