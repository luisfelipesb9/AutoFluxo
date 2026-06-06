/**
 * core/table.js
 * ============================================================
 * Módulo reutilizável para renderização de tabelas de dados.
 *
 * Uso:
 *   const t = new DataTable({
 *     container: document.getElementById('tableWrapper'),
 *     columns: [{ key: 'nome', label: 'Nome' }, ...],
 *     rowRenderer: (item) => '<td>...</td>',
 *     onEmpty: 'Nenhum registro encontrado.',
 *     itemsPerPage: 10,
 *   });
 *   t.setData(myArray);
 *   t.setFilter('busca');
 * ============================================================ */

export class DataTable {
  /**
   * @param {{
   *   container: HTMLElement,
   *   columns: Array<{key:string, label:string}>,
   *   rowRenderer: (item: any, index: number) => string,
   *   onEmpty?: string,
   *   itemsPerPage?: number,
   * }} config
   */
  constructor(config) {
    this._container    = config.container;
    this._columns      = config.columns;
    this._rowRenderer  = config.rowRenderer;
    this._emptyMsg     = config.onEmpty || 'Nenhum registro encontrado.';
    this._perPage      = config.itemsPerPage || 10;

    this._allData      = [];
    this._filtered     = [];
    this._currentPage  = 1;

    this._build();
  }

  /** Monta a estrutura DOM da tabela. */
  _build() {
    this._container.innerHTML = `
      <div class="table-scroll">
        <table class="data-table">
          <thead><tr id="${this._uid('head')}"></tr></thead>
          <tbody id="${this._uid('body')}"></tbody>
        </table>
      </div>
      <div class="table-footer">
        <span class="table-count" id="${this._uid('count')}"></span>
        <div class="pagination" id="${this._uid('pag')}"></div>
      </div>
    `;

    this._head  = this._container.querySelector(`#${this._uid('head')}`);
    this._body  = this._container.querySelector(`#${this._uid('body')}`);
    this._count = this._container.querySelector(`#${this._uid('count')}`);
    this._pag   = this._container.querySelector(`#${this._uid('pag')}`);

    this._renderHeaders();
  }

  _uid(suffix) {
    if (!this.__uid) this.__uid = Math.random().toString(36).slice(2, 7);
    return `dt-${this.__uid}-${suffix}`;
  }

  _renderHeaders() {
    this._head.innerHTML = this._columns
      .map(col => `<th>${col.label}</th>`)
      .join('');
  }

  /** Define ou substitui todos os dados. */
  setData(data) {
    this._allData     = data;
    this._filtered    = data;
    this._currentPage = 1;
    this._render();
  }

  /**
   * Filtra os dados por um termo de busca em todos os campos string.
   * @param {string} term
   */
  setFilter(term) {
    const t = term.toLowerCase().trim();
    this._filtered    = t
      ? this._allData.filter(item =>
          Object.values(item).some(v =>
            String(v).toLowerCase().includes(t)
          )
        )
      : this._allData;
    this._currentPage = 1;
    this._render();
  }

  /** Força re-render (útil após mutação de dados). */
  refresh() {
    this._render();
  }

  _render() {
    const total  = this._filtered.length;
    const start  = (this._currentPage - 1) * this._perPage;
    const slice  = this._filtered.slice(start, start + this._perPage);
    const colLen = this._columns.length;

    if (!slice.length) {
      this._body.innerHTML = `
        <tr>
          <td colspan="${colLen}">
            <div class="table-empty">${this._emptyMsg}</div>
          </td>
        </tr>`;
    } else {
      this._body.innerHTML = slice
        .map((item, i) => `<tr>${this._rowRenderer(item, start + i)}</tr>`)
        .join('');
    }

    const showing = slice.length;
    this._count.textContent =
      total ? `Exibindo ${start + 1}–${start + showing} de ${total}` : '';

    this._renderPagination(total);
  }

  _renderPagination(total) {
    const pages = Math.ceil(total / this._perPage);
    this._pag.innerHTML = '';
    if (pages <= 1) return;

    const cur = this._currentPage;

    // Prev
    const prev = this._makePageBtn('‹', cur > 1, () => this._goTo(cur - 1));
    this._pag.appendChild(prev);

    // Page numbers (show max 5 around current)
    const range = this._pageRange(cur, pages);
    range.forEach(p => {
      if (p === '…') {
        const el = document.createElement('span');
        el.className = 'page-ellipsis';
        el.textContent = '…';
        this._pag.appendChild(el);
      } else {
        const btn = this._makePageBtn(p, true, () => this._goTo(p));
        if (p === cur) btn.classList.add('active');
        btn.setAttribute('aria-current', p === cur ? 'page' : 'false');
        this._pag.appendChild(btn);
      }
    });

    // Next
    const next = this._makePageBtn('›', cur < pages, () => this._goTo(cur + 1));
    this._pag.appendChild(next);
  }

  _makePageBtn(label, enabled, onClick) {
    const btn = document.createElement('button');
    btn.className   = 'page-btn';
    btn.textContent = label;
    btn.disabled    = !enabled;
    if (enabled) btn.addEventListener('click', onClick);
    return btn;
  }

  _pageRange(cur, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (cur <= 4)   return [1, 2, 3, 4, 5, '…', total];
    if (cur >= total - 3) return [1, '…', total-4, total-3, total-2, total-1, total];
    return [1, '…', cur - 1, cur, cur + 1, '…', total];
  }

  _goTo(page) {
    this._currentPage = page;
    this._render();
    this._container.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
