// GDPR Cookie Consent — Da Mesa
// Stores consent in localStorage. Blocks analytics until accepted.

const CONSENT_KEY = 'damesa_cookie_consent'
const CONSENT_VERSION = '1'

export function getConsent() {
  try {
    const raw = localStorage.getItem(CONSENT_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function hasConsented() {
  const c = getConsent()
  return c?.version === CONSENT_VERSION && c?.decided === true
}

export function analyticsAllowed() {
  const c = getConsent()
  return c?.analytics === true
}

function saveConsent(analytics) {
  localStorage.setItem(CONSENT_KEY, JSON.stringify({
    version: CONSENT_VERSION,
    decided: true,
    analytics,
    date: new Date().toISOString()
  }))
}

function removeBanner() {
  document.getElementById('cookie-banner')?.remove()
}

export function initCookieBanner() {
  if (hasConsented()) return

  const banner = document.createElement('div')
  banner.id = 'cookie-banner'
  banner.innerHTML = `
    <div id="cookie-banner-inner">
      <div id="cookie-text">
        <strong>Utilizamos cookies</strong>
        <p>Usamos cookies essenciais para o funcionamento do site. Com o seu consentimento, usamos também cookies analíticos para melhorar a experiência. Consulte a nossa <a href="privacy.html">Política de Privacidade</a>.</p>
      </div>
      <div id="cookie-actions">
        <button id="cookie-reject">Apenas essenciais</button>
        <button id="cookie-accept">Aceitar todos</button>
      </div>
    </div>
  `

  const style = document.createElement('style')
  style.textContent = `
    #cookie-banner {
      position: fixed;
      bottom: 0; left: 0; right: 0;
      background: #1c1612;
      color: #fff;
      z-index: 9999;
      padding: 20px 24px;
      box-shadow: 0 -4px 24px rgba(0,0,0,0.15);
    }
    #cookie-banner-inner {
      max-width: 1100px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      gap: 32px;
      flex-wrap: wrap;
    }
    #cookie-text { flex: 1; min-width: 260px; }
    #cookie-text strong { font-size: 15px; display: block; margin-bottom: 4px; }
    #cookie-text p { font-size: 13px; color: #b0a090; line-height: 1.5; margin: 0; }
    #cookie-text a { color: #e8dfd4; text-decoration: underline; }
    #cookie-actions { display: flex; gap: 10px; flex-shrink: 0; }
    #cookie-reject {
      background: transparent;
      border: 1px solid #4a3a2e;
      color: #b0a090;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 13px;
      cursor: pointer;
      white-space: nowrap;
    }
    #cookie-reject:hover { border-color: #7a6a5e; color: #fff; }
    #cookie-accept {
      background: #c0392b;
      border: none;
      color: #fff;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 13px;
      cursor: pointer;
      white-space: nowrap;
    }
    #cookie-accept:hover { background: #a93226; }
  `

  document.head.appendChild(style)
  document.body.appendChild(banner)

  document.getElementById('cookie-accept').addEventListener('click', () => {
    saveConsent(true)
    removeBanner()
  })

  document.getElementById('cookie-reject').addEventListener('click', () => {
    saveConsent(false)
    removeBanner()
  })
}
