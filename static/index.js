class InsiderTransactionsManager {
  constructor(baseUrl = '') { this.baseUrl = baseUrl; }
  async fetchTransactions(symbol) {
    const trimmed = String(symbol || '').trim();
    if (!trimmed) throw new Error('Please enter a stock symbol.');
    const url = `${this.baseUrl}/api/finnhub/insider-transactions?symbol=${encodeURIComponent(trimmed.toUpperCase())}`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Request failed (${res.status}). ${text}`);
    }
    return res.json();
  }
}

class InsiderTransactionsView {
  constructor(resultsEl, statusEl, errorEl) {
    this.resultsEl = resultsEl; this.statusEl = statusEl; this.errorEl = errorEl;
  }
  setLoading(symbol) {
    this.errorEl.style.display = 'none';
    this.errorEl.textContent = '';
    this.statusEl.textContent = `Loading insider transactions for ${symbol.toUpperCase()}...`;
  }
  setIdle(message = '') { this.statusEl.textContent = message; }
  showError(message) {
    this.errorEl.style.display = 'block';
    this.errorEl.textContent = message;
  }
  render(data) {
    const { symbol, from, to, count, transactions } = data || {};
    this.resultsEl.innerHTML = '';
    const header = document.createElement('div');
    header.className = 'muted';
    header.textContent = `${symbol || ''} • ${count || 0} transactions • ${from || ''} → ${to || ''}`;
    this.resultsEl.appendChild(header);

    if (!Array.isArray(transactions) || transactions.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'card';
      empty.textContent = 'No insider transactions found for this period.';
      this.resultsEl.appendChild(empty);
      return;
    }

    transactions.slice(0, 50).forEach(item => {
      const card = document.createElement('div');
      card.className = 'card';
      const parts = [];
      if (item.transactionDate) parts.push(`Date: ${item.transactionDate}`);
      if (item.insiderName) parts.push(`Insider: ${item.insiderName}${item.role ? ' (' + item.role + ')' : ''}`);
      if (item.code) parts.push(`Code: ${item.code}`);
      if (item.shares != null) parts.push(`Shares: ${item.shares}`);
      if (item.price != null) parts.push(`Price: $${item.price}`);
      if (item.totalValue != null) parts.push(`Total: $${item.totalValue}`);
      card.innerHTML = `<strong>${symbol || ''}</strong> — ${parts.join(' • ')}`;
      this.resultsEl.appendChild(card);
    });
  }
}

class InsiderTransactionsCoordinator {
  constructor(manager, view, inputEl, buttonEl) {
    this.manager = manager; this.view = view; this.inputEl = inputEl; this.buttonEl = buttonEl;
    this.attach();
  }
  attach() {
    this.buttonEl.addEventListener('click', () => this.search());
    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.search();
    });
  }
  async search() {
    const symbol = this.inputEl.value;
    if (!symbol.trim()) { this.view.showError('Please enter a stock symbol.'); return; }
    try {
      this.buttonEl.disabled = true;
      this.view.setLoading(symbol);
      const data = await this.manager.fetchTransactions(symbol);
      this.view.render(data);
      this.view.setIdle('');
    } catch (err) {
      const msg = err && err.message ? err.message : 'Unknown error';
      this.view.showError(msg);
      this.view.setIdle('');
    } finally {
      this.buttonEl.disabled = false;
    }
  }
}

(function init() {
  const inputEl = document.getElementById('symbolInput');
  const buttonEl = document.getElementById('searchBtn');
  const resultsEl = document.getElementById('results');
  const statusEl = document.getElementById('status');
  const errorEl = document.getElementById('error');

  const manager = new InsiderTransactionsManager('');
  const view = new InsiderTransactionsView(resultsEl, statusEl, errorEl);
  new InsiderTransactionsCoordinator(manager, view, inputEl, buttonEl);
})();


