import './Modal.css'

/**
 * Modal showing Aadhaar front, Aadhaar back, and Selfie for KYC image verification.
 * Buttons: Approve (sets kycImageVerification to verified), Reject (sets to failed), Close (no change).
 */
export default function KycImageVerificationModal({
  open,
  onClose,
  aadhaarFrontImage,
  aadhaarBackImage,
  selfieImage,
  onApprove,
  onReject,
  loading = false,
}) {
  if (!open) return null

  const hasImages = aadhaarFrontImage || aadhaarBackImage || selfieImage

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-box kycm-modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '560px', width: '100%' }}
      >
        <div className="modal-header">
          <h2 className="modal-title">Verify KYC images</h2>
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
          {!hasImages ? (
            <p className="kycm-empty">No KYC images to verify.</p>
          ) : (
            <div className="kycm-images">
              {aadhaarFrontImage && (
                <div className="kycm-image-block">
                  <div className="kycm-image-label">Aadhaar front</div>
                  <div className="kycm-image-wrap">
                    <img src={aadhaarFrontImage} alt="Aadhaar front" />
                  </div>
                </div>
              )}
              {aadhaarBackImage && (
                <div className="kycm-image-block">
                  <div className="kycm-image-label">Aadhaar back</div>
                  <div className="kycm-image-wrap">
                    <img src={aadhaarBackImage} alt="Aadhaar back" />
                  </div>
                </div>
              )}
              {selfieImage && (
                <div className="kycm-image-block">
                  <div className="kycm-image-label">Selfie</div>
                  <div className="kycm-image-wrap">
                    <img src={selfieImage} alt="Selfie" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="modal-actions kycm-actions">
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
                onClick={onReject}
                disabled={loading}
              >
                {loading ? '…' : 'Reject'}
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
        </div>
      </div>
    </div>
  )
}
