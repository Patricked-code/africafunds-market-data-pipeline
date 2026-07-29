const API_BASE = window.AFRICAFUNDS_API_BASE || 'https://api.sadiaaf.wealthtechinnovations.com';
const byId = (id) => document.getElementById(id);
const formatNumber = (value) => new Intl.NumberFormat('fr-FR').format(Number(value || 0));
const formatDate = (value) => value ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';

async function fetchJson(path) {
  const response = await fetch(`${API_BASE}${path}`, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`API ${response.status}`);
  return response.json();
}

function setHealth(ok, text) {
  byId('health-dot').className = `dot ${ok ? 'ok' : 'bad'}`;
  byId('health-label').textContent = text;
}

function showError(message) {
  const node = byId('error');
  node.textContent = message;
  node.style.display = 'block';
}

function hideError() {
  byId('error').style.display = 'none';
}

function renderLastRun(run) {
  if (!run) {
    byId('last-run').textContent = 'Aucune exécution enregistrée.';
    return;
  }
  const statusClass = run.status === 'SUCCESS' ? 'ok' : run.status === 'FAILED' ? 'bad' : 'warn';
  byId('last-run').innerHTML = `
    <div><strong>${run.job_type || 'Tâche'}</strong> · <span class="status ${statusClass}">${run.status || 'INCONNU'}</span></div>
    <div class="label">Début : ${formatDate(run.started_at)} · Fin : ${formatDate(run.finished_at)}</div>
    ${run.error_message ? `<div class="status bad">${String(run.error_message)}</div>` : ''}
  `;
}

async function load() {
  hideError();
  setHealth(false, 'Connexion à l’API…');
  try {
    const [health, status, marketPayload] = await Promise.all([
      fetchJson('/health'),
      fetchJson('/api/v1/status'),
      fetchJson('/api/v1/markets'),
    ]);

    setHealth(Boolean(health.ok), health.ok ? 'API et base opérationnelles' : 'API dégradée');
    const counts = status.counts || {};
    byId('markets-count').textContent = formatNumber(counts.markets);
    byId('sources-count').textContent = formatNumber(counts.enabled_sources);
    byId('rates-count').textContent = formatNumber(counts.rate_observations);
    byId('indices-count').textContent = formatNumber(counts.index_values);

    const backfill = status.backfill || {};
    byId('backfill-pending').textContent = formatNumber(backfill.pending);
    byId('backfill-success').textContent = formatNumber(backfill.success);
    byId('backfill-retry').textContent = formatNumber((backfill.retry || 0) + (backfill.failed || 0));
    byId('backfill-blocked').textContent = formatNumber(backfill.blocked_adapter);
    renderLastRun(status.last_run);

    const rows = Array.isArray(marketPayload.data) ? marketPayload.data : [];
    byId('markets-body').innerHTML = rows.length ? rows.map((market) => `
      <tr>
        <td><strong>${market.market_name}</strong><br><span class="label">${market.market_code}</span></td>
        <td>${market.currency_code}</td>
        <td>${market.all_share_index_name || 'À définir'}</td>
        <td>${formatNumber(market.source_count)}</td>
        <td>${formatNumber(market.official_index_count)}</td>
        <td>${formatNumber(market.rate_series_count)}</td>
      </tr>
    `).join('') : '<tr><td colspan="6">Aucun marché configuré.</td></tr>';
  } catch (error) {
    setHealth(false, 'API indisponible');
    showError(`Impossible de charger les indicateurs : ${error instanceof Error ? error.message : String(error)}`);
  }
}

byId('refresh').addEventListener('click', load);
load();
setInterval(load, 60_000);
