import { useEffect, useRef } from 'react'
import { getBookmarkletHref } from '../utils/bookmarklet'
import './BookmarkletModal.css'

export default function BookmarkletModal({ onClose }) {
  const linkRef = useRef(null)

  // React blocks javascript: hrefs as an XSS precaution.
  // We bypass it by setting the attribute directly on the DOM node after render.
  useEffect(() => {
    if (linkRef.current) {
      linkRef.current.setAttribute('href', getBookmarkletHref())
    }
  }, [])

  return (
    <div className="bm-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bm-modal">
        <button className="bm-close" onClick={onClose}>✕</button>
        <h2 className="bm-title">Redfin Import Bookmarklet</h2>
        <p className="bm-desc">
          While on any Redfin listing, click the bookmarklet and it will open your app
          with the house data pre-filled — price, tax, HOA, insurance, beds, baths, sqft.
        </p>

        <div className="bm-drag-area">
          <div className="bm-drag-label">Drag this to your bookmarks bar:</div>
          <a ref={linkRef} className="bm-link" onClick={e => e.preventDefault()}>
            📎 Import from Redfin
          </a>
          <div className="bm-drag-hint">↑ drag me to your bookmarks bar</div>
        </div>

        <div className="bm-steps">
          <div className="bm-step-title">Safari instructions</div>
          <ol className="bm-step-list">
            <li>Show your Favorites Bar: <strong>View → Show Favorites Bar</strong></li>
            <li>Drag the button above to the Favorites Bar</li>
            <li>Go to any Redfin listing and click <em>Import from Redfin</em></li>
            <li>Your app opens in a new tab with the form pre-filled — review and save</li>
          </ol>
          <div className="bm-step-title" style={{marginTop: 12}}>Chrome / Edge instructions</div>
          <ol className="bm-step-list">
            <li>Show the bookmarks bar: <strong>⌘+Shift+B</strong></li>
            <li>Drag the button above to the bookmarks bar</li>
            <li>Same steps 3–4 as above</li>
          </ol>
        </div>

        <div className="bm-note">
          ℹ️ The bookmarklet only reads the page — it never sends data anywhere except your own app.
        </div>
      </div>
    </div>
  )
}
