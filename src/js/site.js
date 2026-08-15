import {api, post} from './api.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

let authUser = null;
let googleScriptPromise = null;

function setAccountState(user) {
  authUser = user || null;
  const skeleton = $('#accountSkeleton');
  const login = $('#loginButton');
  const userButton = $('#userButton');
  const userName = $('#userName');
  const userAvatar = $('#userAvatar');
  if (skeleton) skeleton.hidden = true;
  if (login) login.hidden = Boolean(user);
  if (userButton) userButton.hidden = !user;
  if (userName) userName.textContent = user?.display_name || 'Player';
  if (userAvatar) {
    userAvatar.src = user?.avatar_url || '/brand/avatar-placeholder.svg';
    userAvatar.alt = user?.display_name ? `${user.display_name} avatar` : 'Player avatar';
  }
  window.SnapokiAuth = {user: authUser};
  window.dispatchEvent(new CustomEvent('snapoki:auth-changed', {detail: {user: authUser}}));
}

async function refreshAuth() {
  try {
    const data = await api('/api/me');
    setAccountState(data.user || null);
  } catch (error) {
    console.warn('Auth state unavailable', error);
    setAccountState(null);
  }
}

function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (googleScriptPromise) return googleScriptPromise;
  googleScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-google-identity]');
    if (existing) {
      existing.addEventListener('load', resolve, {once: true});
      existing.addEventListener('error', reject, {once: true});
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = '1';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return googleScriptPromise;
}

function trapModal(modal) {
  const focusables = () => $$('button,[href],input,[tabindex]:not([tabindex="-1"])', modal).filter(el => !el.hidden && !el.disabled);
  const handler = event => {
    if (event.key === 'Escape') {
      closeLoginModal();
      return;
    }
    if (event.key !== 'Tab') return;
    const items = focusables();
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  modal._trapHandler = handler;
  document.addEventListener('keydown', handler);
}

function closeLoginModal() {
  const modal = $('#loginModal');
  if (!modal || modal.hidden) return;
  modal.hidden = true;
  document.body.classList.remove('modal-open');
  if (modal._trapHandler) document.removeEventListener('keydown', modal._trapHandler);
  $('#loginButton')?.focus();
}

async function openLoginModal() {
  const modal = $('#loginModal');
  const host = $('#googleSignInHost');
  const message = $('#loginMessage');
  if (!modal || !host) return;
  modal.hidden = false;
  document.body.classList.add('modal-open');
  trapModal(modal);
  $('#loginClose')?.focus();
  if (host.dataset.ready === '1') return;
  message.textContent = 'Loading secure sign-in…';
  try {
    const config = await api('/api/config');
    if (!config.googleClientId) {
      message.textContent = 'Google sign-in is not configured yet.';
      return;
    }
    await loadGoogleScript();
    window.google.accounts.id.initialize({
      client_id: config.googleClientId,
      callback: async response => {
        message.textContent = 'Signing you in…';
        try {
          const out = await post('/api/auth/google', {credential: response.credential});
          setAccountState(out.user);
          closeLoginModal();
        } catch (error) {
          message.textContent = error.message || 'Sign-in failed. Please try again.';
        }
      }
    });
    host.replaceChildren();
    window.google.accounts.id.renderButton(host, {
      theme: 'filled_black',
      size: 'large',
      shape: 'pill',
      text: 'continue_with',
      width: 280
    });
    host.dataset.ready = '1';
    message.textContent = 'Use your Google account to save scores and join rankings.';
  } catch (error) {
    console.warn(error);
    message.textContent = 'Sign-in is temporarily unavailable. Please try again.';
  }
}

function setupNavigation() {
  const mobileToggle = $('#mobileMenuToggle');
  const mobileMenu = $('#mobileMenu');
  const gamesToggle = $('#gamesMenuToggle');
  const gamesMenu = $('#gamesMenu');
  const accountButton = $('#userButton');
  const accountMenu = $('#accountMenu');

  mobileToggle?.addEventListener('click', () => {
    const open = mobileToggle.getAttribute('aria-expanded') === 'true';
    mobileToggle.setAttribute('aria-expanded', String(!open));
    if (mobileMenu) mobileMenu.hidden = open;
  });

  gamesToggle?.addEventListener('click', event => {
    event.stopPropagation();
    const open = gamesToggle.getAttribute('aria-expanded') === 'true';
    gamesToggle.setAttribute('aria-expanded', String(!open));
    if (gamesMenu) gamesMenu.hidden = open;
  });

  accountButton?.addEventListener('click', event => {
    event.stopPropagation();
    if (accountMenu) accountMenu.hidden = !accountMenu.hidden;
  });

  document.addEventListener('click', () => {
    if (gamesMenu) gamesMenu.hidden = true;
    gamesToggle?.setAttribute('aria-expanded', 'false');
    if (accountMenu) accountMenu.hidden = true;
  });

  $$('#mobileMenu a').forEach(link => link.addEventListener('click', () => {
    if (mobileMenu) mobileMenu.hidden = true;
    mobileToggle?.setAttribute('aria-expanded', 'false');
  }));
}

function setupAuthActions() {
  $('#loginButton')?.addEventListener('click', openLoginModal);
  $('#loginClose')?.addEventListener('click', closeLoginModal);
  $('#loginModal')?.addEventListener('click', event => {
    if (event.target === event.currentTarget) closeLoginModal();
  });
  $('#logoutButton')?.addEventListener('click', async () => {
    try { await post('/api/logout'); } catch (error) { console.warn(error); }
    setAccountState(null);
    if ($('#accountMenu')) $('#accountMenu').hidden = true;
  });
}

function setupFooter() {
  const year = $('#footerYear');
  if (year) year.textContent = String(new Date().getFullYear());
}

setupNavigation();
setupAuthActions();
setupFooter();
refreshAuth();
