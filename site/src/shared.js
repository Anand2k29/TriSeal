/* Shared utilities for TriSeal pages */

/** Simple SHA-256 hash simulation (client-side, deterministic) */
export function hashString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  let hex = '';
  for (let j = 0; j < 16; j++) {
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b + j);
    hex += ((h >>> 0) & 0xff).toString(16).padStart(2, '0');
    h = Math.imul(h ^ (h >>> 13), 0x45d9f3b + j * 3);
    hex += ((h >>> 0) & 0xff).toString(16).padStart(2, '0');
  }
  return hex.slice(0, 64);
}

/** Toast notification system */
let toastContainer = null;
export function showToast(title, message, type = 'emerald') {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toastContainer';
    toastContainer.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;max-width:400px;width:100%;pointer-events:none;padding:0 16px;';
    document.body.appendChild(toastContainer);
  }
  const colors = {
    emerald: { bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.4)', text: '#34D399' },
    rose: { bg: 'rgba(244, 63, 94, 0.1)', border: 'rgba(244, 63, 94, 0.4)', text: '#FB7185' },
    amber: { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.4)', text: '#FBBF24' },
    violet: { bg: 'rgba(168, 85, 247, 0.1)', border: 'rgba(168, 85, 247, 0.4)', text: '#C084FC' },
    cyan: { bg: 'rgba(6, 182, 212, 0.1)', border: 'rgba(6, 182, 212, 0.4)', text: '#22D3EE' },
  };
  const c = colors[type] || colors.emerald;
  const el = document.createElement('div');
  el.style.cssText = `background:${c.bg};border:1px solid ${c.border};border-radius:8px;padding:12px 16px;pointer-events:auto;backdrop-filter:blur(12px);animation:fadeInUp 0.4s ease forwards;font-family:'JetBrains Mono',monospace;`;
  el.innerHTML = `<div style="font-size:0.75rem;font-weight:700;color:${c.text};margin-bottom:4px">${title}</div><div style="font-size:0.6875rem;color:#CBD5E1;line-height:1.5">${message}</div>`;
  toastContainer.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 0.3s'; setTimeout(() => el.remove(), 300); }, 4000);
}

/** Scroll reveal observer */
export function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

/** Typing animation */
export function typeText(element, text, speed = 40) {
  let i = 0;
  element.textContent = '';
  element.classList.add('typing-text');
  return new Promise(resolve => {
    const interval = setInterval(() => {
      if (i < text.length) {
        element.textContent += text.charAt(i);
        i++;
      } else {
        clearInterval(interval);
        element.classList.remove('typing-text');
        resolve();
      }
    }, speed);
  });
}

/** Particle system */
export function createParticles(container, count = 20) {
  const particlesDiv = document.createElement('div');
  particlesDiv.className = 'particles-container';
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = Math.random() * 100 + '%';
    p.style.top = Math.random() * 100 + '%';
    p.style.animationDelay = (Math.random() * 6) + 's';
    p.style.animationDuration = (4 + Math.random() * 4) + 's';
    const colors = ['#10B981', '#06B6D4', '#A855F7', '#3B82F6'];
    p.style.background = colors[Math.floor(Math.random() * colors.length)];
    p.style.width = (2 + Math.random() * 3) + 'px';
    p.style.height = p.style.width;
    particlesDiv.appendChild(p);
  }
  container.style.position = 'relative';
  container.appendChild(particlesDiv);
}

/** Counter animation */
export function animateCounter(element, target, duration = 2000, suffix = '') {
  const start = 0;
  const startTime = performance.now();
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(start + (target - start) * eased);
    element.textContent = current + suffix;
    if (progress < 1) requestAnimationFrame(update);
    else element.textContent = target + suffix;
  }
  requestAnimationFrame(update);
}

/** Navbar component (shared across pages) */
export function renderNav(activePage = 'home') {
  const pages = [
    { id: 'home', label: 'Home', href: '/' },
    { id: 'airlock', label: '01 Airlock', href: '/mvp-airlock.html' },
    { id: 'ledger', label: '02 Ledger', href: '/mvp-ledger.html' },
    { id: 'conformance', label: '03 Conformance', href: '/conformance.html' },
    { id: 'leakhunter', label: '04 Leak Hunter', href: '/leakhunter.html' },
    { id: 'deploy', label: '05 Deploy', href: '/deploy.html' },
  ];

  return `
    <nav class="nav-bar">
      <div class="container nav-inner">
        <a href="/" class="nav-brand">
          <div class="nav-brand-icon">TS</div>
          <span class="nav-brand-text">TRISEAL</span>
          <span class="badge badge-emerald" style="font-size:0.5625rem">PS-4 v2.4</span>
        </a>
        <ul class="nav-links">
          ${pages.map(p => `
            <li><a href="${p.href}" class="nav-link ${activePage === p.id ? 'active' : ''}" ${p.id !== 'home' ? 'target="_blank"' : ''}>${p.label}</a></li>
          `).join('')}
        </ul>
        <div class="nav-status">
          <div class="status-dot"></div>
          <span style="color:var(--neon-emerald)">SEALED</span>
          <span style="color:var(--text-dim)">gVisor runsc</span>
        </div>
      </div>
    </nav>
  `;
}

/** Footer component */
export function renderFooter() {
  return `
    <footer class="site-footer">
      <div class="container footer-inner">
        <div style="display:flex;align-items:center;gap:8px">
          <div class="nav-brand-icon" style="width:24px;height:24px;font-size:0.625rem">TS</div>
          <span>TRISEAL PS-4 · Team Pinnacle</span>
        </div>
        <div style="display:flex;gap:16px">
          <a href="https://github.com/Anand2k29/TriSeal" target="_blank" rel="noopener" style="color:var(--text-muted);text-decoration:none;transition:color 0.2s" onmouseover="this.style.color='var(--neon-emerald)'" onmouseout="this.style.color='var(--text-muted)'">GitHub ↗</a>
          <span style="color:var(--text-dim)">Hack in Hills PS-4</span>
        </div>
        <div>© 2026 Team Pinnacle · MIT License</div>
      </div>
    </footer>
  `;
}
