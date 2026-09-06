/**
 * SavinTree GitHub Sync
 * Пушит смёрженные данные (base + локальные правки) напрямую в репозиторий
 * через GitHub REST API (Contents API), без бэкенда.
 *
 * Требования к токену:
 *  - Fine-grained Personal Access Token
 *  - Repository access: только этот репозиторий
 *  - Permissions: Contents -> Read and write
 *
 * Хранение:
 *  - Конфиг (owner/repo/branch/path) — localStorage, ключ SavinTree_gh_config
 *  - Токен — localStorage, ключ SavinTree_gh_token
 *  Токен используется только в заголовке Authorization запросов к api.github.com.
 */

(function(){
  const CONFIG_KEY = 'SavinTree_gh_config';
  const TOKEN_KEY = 'SavinTree_gh_token';

  const DEFAULT_CONFIG = {
    owner: 'savinelectro-art',
    repo: 'family-tree',
    branch: 'main',
    path: 'data/people.json'
  };

  function getConfig(){
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      return raw ? Object.assign({}, DEFAULT_CONFIG, JSON.parse(raw)) : Object.assign({}, DEFAULT_CONFIG);
    } catch (e) {
      return Object.assign({}, DEFAULT_CONFIG);
    }
  }

  function setConfig(cfg){
    localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
  }

  function getToken(){
    return localStorage.getItem(TOKEN_KEY) || '';
  }

  function setToken(token){
    if (token) localStorage.setItem(TOKEN_KEY, token);
  }

  function clearToken(){
    localStorage.removeItem(TOKEN_KEY);
  }

  function isConfigured(){
    const cfg = getConfig();
    return !!(cfg.owner && cfg.repo && cfg.branch && cfg.path && getToken());
  }

  // Корректная base64-кодировка UTF-8 строки (обычный btoa падает на кириллице)
  function utf8ToBase64(str){
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    bytes.forEach(b => { binary += String.fromCharCode(b); });
    return btoa(binary);
  }

  function apiUrl(cfg){
    const segs = cfg.path.split('/').filter(Boolean).map(encodeURIComponent).join('/');
    return `https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${segs}`;
  }

  /**
   * Получает текущий sha файла в репозитории (нужен для обновления существующего файла).
   * Возвращает null, если файла ещё нет (тогда будет создан новый).
   */
  async function getFileSha(cfg, token){
    const res = await fetch(`${apiUrl(cfg)}?ref=${encodeURIComponent(cfg.branch)}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json'
      }
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      const body = await safeJson(res);
      throw new GhError(res.status, body?.message || `Ошибка чтения файла (HTTP ${res.status})`);
    }
    const data = await res.json();
    return data.sha || null;
  }

  async function safeJson(res){
    try { return await res.json(); } catch (e) { return null; }
  }

  class GhError extends Error {
    constructor(status, message){
      super(message);
      this.status = status;
    }
  }

  /**
   * Пушит переданную JSON-строку в файл на GitHub.
   * @param {string} jsonString - содержимое файла
   * @param {string} message - текст коммита
   * @returns {Promise<{commitUrl: string}>}
   */
  async function pushData(jsonString, message){
    const cfg = getConfig();
    const token = getToken();
    if (!token) throw new GhError(401, 'Токен не задан. Откройте настройки GitHub.');
    if (!cfg.owner || !cfg.repo || !cfg.path) throw new GhError(400, 'Не заполнены настройки репозитория.');

    const sha = await getFileSha(cfg, token);

    const res = await fetch(apiUrl(cfg), {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: message || 'SavinTree: обновление данных дерева',
        content: utf8ToBase64(jsonString),
        branch: cfg.branch,
        ...(sha ? { sha } : {})
      })
    });

    if (!res.ok) {
      const body = await safeJson(res);
      let msg = body?.message || `Ошибка записи (HTTP ${res.status})`;
      if (res.status === 401) msg = 'Токен недействителен или истёк.';
      else if (res.status === 403) msg = 'Нет доступа. Проверьте права токена (Contents: Read and write) и что он выдан именно на этот репозиторий.';
      else if (res.status === 404) msg = 'Репозиторий, ветка или путь не найдены. Проверьте настройки.';
      else if (res.status === 409) msg = 'Конфликт версий: файл изменился в репозитории. Попробуйте ещё раз.';
      throw new GhError(res.status, msg);
    }

    const data = await res.json();
    return { commitUrl: data.commit?.html_url || null };
  }

  window.SavinTreeGitHub = {
    getConfig,
    setConfig,
    getToken,
    setToken,
    clearToken,
    isConfigured,
    pushData,
    DEFAULT_CONFIG
  };

  /* =====================================================================
     UI: панель настроек + кнопка отправки
     ===================================================================== */

  function setStatus(text, kind){
    const el = document.getElementById('gh-status');
    if (!el) return;
    el.textContent = text;
    el.classList.remove('ok', 'err');
    if (kind) el.classList.add(kind);
  }

  function openSettings(){
    const cfg = getConfig();
    document.getElementById('gh-owner').value = cfg.owner || '';
    document.getElementById('gh-repo').value = cfg.repo || '';
    document.getElementById('gh-branch').value = cfg.branch || 'main';
    document.getElementById('gh-path').value = cfg.path || 'data/people.json';
    document.getElementById('gh-token').value = getToken();

    const panel = document.getElementById('github-panel');
    if (panel) {
      panel.style.display = 'flex';
      panel.setAttribute('aria-hidden', 'false');
    }
  }

  function closeSettings(){
    const panel = document.getElementById('github-panel');
    if (panel) {
      panel.style.display = 'none';
      panel.setAttribute('aria-hidden', 'true');
    }
  }

  function isSettingsOpen(){
    const panel = document.getElementById('github-panel');
    return !!panel && panel.style.display === 'flex';
  }

  function saveSettings(){
    const cfg = {
      owner: document.getElementById('gh-owner').value.trim(),
      repo: document.getElementById('gh-repo').value.trim(),
      branch: document.getElementById('gh-branch').value.trim() || 'main',
      path: document.getElementById('gh-path').value.trim() || 'data/people.json'
    };
    setConfig(cfg);
    const token = document.getElementById('gh-token').value.trim();
    if (token) setToken(token);
    closeSettings();
    setStatus('Настройки сохранены', 'ok');
  }

  function forgetToken(){
    clearToken();
    document.getElementById('gh-token').value = '';
    setStatus('Токен удалён', null);
  }

  async function handlePushClick(){
    if (!isConfigured()) {
      setStatus('Заполните настройки GitHub', null);
      openSettings();
      return;
    }
    const btn = document.getElementById('github-push-btn');
    if (btn) btn.disabled = true;
    setStatus('Отправка…', null);
    try {
      const json = await window.SavinTreeData.exportJSON();
      await pushData(json, 'SavinTree: обновление данных дерева через веб-редактор');
      setStatus('✅ Отправлено (обновление сайта — до пары минут)', 'ok');
    } catch (err) {
      console.error('GitHub push failed:', err);
      setStatus(`⚠ ${err.message || 'Ошибка отправки'}`, 'err');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function init(){
    const pushBtn = document.getElementById('github-push-btn');
    const settingsBtn = document.getElementById('github-settings-btn');
    const saveBtn = document.getElementById('gh-save-settings');
    const cancelBtn = document.getElementById('gh-cancel-settings');
    const forgetBtn = document.getElementById('gh-forget-token');
    const panel = document.getElementById('github-panel');

    if (pushBtn) pushBtn.addEventListener('click', handlePushClick);
    if (settingsBtn) settingsBtn.addEventListener('click', openSettings);
    if (saveBtn) saveBtn.addEventListener('click', saveSettings);
    if (cancelBtn) cancelBtn.addEventListener('click', closeSettings);
    if (forgetBtn) forgetBtn.addEventListener('click', forgetToken);
    if (panel) {
      panel.addEventListener('click', e => { if (e.target === panel) closeSettings(); });
    }
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && isSettingsOpen()) closeSettings();
    });
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
