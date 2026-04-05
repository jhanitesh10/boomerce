import React, { useState, useEffect, useRef } from 'react';
import SkuMasterForm from './SkuMasterForm';
import { skuApi, refApi } from '../api';
import {
  Plus, Edit2, Trash2, Search, Image as ImageIcon,
  ChevronLeft, ChevronRight, Check, X, ArrowUpDown,
  Filter, MoreVertical, Save
} from 'lucide-react';

const STATUS_COLORS = {
  active:   { bg: '#dcfce7', color: '#16a34a', label: 'Active' },
  inactive: { bg: '#fee2e2', color: '#dc2626', label: 'Inactive' },
  draft:    { bg: '#fef9c3', color: '#ca8a04', label: 'Draft' },
  default:  { bg: '#f3f4f6', color: '#6b7280', label: 'Unknown' },
};

function StatusBadge({ label }) {
  const key = label?.toLowerCase();
  const style = STATUS_COLORS[key] || STATUS_COLORS.default;
  return (
    <span className="status-badge" style={{ backgroundColor: style.bg, color: style.color }}>
      {label || 'Unknown'}
    </span>
  );
}

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export default function MasterTab() {
  const [skus, setSkus] = useState([]);
  const [references, setReferences] = useState({ BRAND: {}, CATEGORY: {}, STATUS: {} });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Sorting
  const [sortCol, setSortCol] = useState('product_name');
  const [sortDir, setSortDir] = useState('asc');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSku, setEditingSku] = useState(null);

  // Inline Edit
  const [inlineEditId, setInlineEditId] = useState(null);
  const [inlineEditData, setInlineEditData] = useState({});
  const [inlineSaving, setInlineSaving] = useState(false);

  // Row menu
  const [menuOpenId, setMenuOpenId] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    loadAll();
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleOutsideClick = (e) => {
    if (menuRef.current && !menuRef.current.contains(e.target)) {
      setMenuOpenId(null);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [skuData, brands, cats, statuses] = await Promise.all([
        skuApi.getAll(),
        refApi.getAll('BRAND'),
        refApi.getAll('CATEGORY'),
        refApi.getAll('STATUS'),
      ]);
      setSkus(skuData);
      const toMap = (arr) => arr.reduce((acc, r) => ({ ...acc, [r.id]: r.label }), {});
      setReferences({ BRAND: toMap(brands), CATEGORY: toMap(cats), STATUS: toMap(statuses) });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Derived data
  const filtered = skus
    .filter(s => {
      const q = search.toLowerCase();
      const matches = !q ||
        s.product_name?.toLowerCase().includes(q) ||
        s.sku_code?.toLowerCase().includes(q) ||
        s.barcode?.toLowerCase().includes(q);

      const statusLabel = references.STATUS[s.status_reference_id]?.toLowerCase() || '';
      const statusMatch = statusFilter === 'all' || statusLabel === statusFilter;

      return matches && statusMatch;
    })
    .sort((a, b) => {
      let va = a[sortCol] ?? '';
      let vb = b[sortCol] ?? '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
    setPage(1);
  };

  const handleDelete = async (id) => {
    setMenuOpenId(null);
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await skuApi.delete(id);
      loadAll();
    } catch (err) {
      alert('Failed to delete product.');
    }
  };

  const startInlineEdit = (sku) => {
    setMenuOpenId(null);
    setInlineEditId(sku.id);
    setInlineEditData({
      product_name: sku.product_name || '',
      sku_code: sku.sku_code || '',
      mrp: sku.mrp || '',
    });
  };

  const cancelInlineEdit = () => {
    setInlineEditId(null);
    setInlineEditData({});
  };

  const saveInlineEdit = async (sku) => {
    setInlineSaving(true);
    try {
      await skuApi.update(sku.id, { ...sku, ...inlineEditData });
      await loadAll();
      cancelInlineEdit();
    } catch (err) {
      alert('Failed to save.');
    } finally {
      setInlineSaving(false);
    }
  };

  const statusCounts = skus.reduce((acc, s) => {
    const label = references.STATUS[s.status_reference_id]?.toLowerCase() || 'unknown';
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});

  const SortIcon = ({ col }) => (
    <ArrowUpDown
      size={13}
      className="sort-icon"
      style={{ opacity: sortCol === col ? 1 : 0.3, color: sortCol === col ? 'var(--primary)' : undefined }}
    />
  );

  return (
    <div className="master-tab">
      {/* Header */}
      <div className="mt-header">
        <div>
          <h2 className="mt-title">Product Master</h2>
          <p className="mt-subtitle">Manage all your SKUs, pricing, and product references.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingSku(null); setIsFormOpen(true); }}>
          <Plus size={16} /> Add Product
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="filter-tabs">
        {[
          { key: 'all', label: `All (${skus.length})` },
          { key: 'active', label: `Active (${statusCounts['active'] || 0})` },
          { key: 'inactive', label: `Inactive (${statusCounts['inactive'] || 0})` },
          { key: 'draft', label: `Draft (${statusCounts['draft'] || 0})` },
        ].map(t => (
          <button
            key={t.key}
            className={`filter-tab ${statusFilter === t.key ? 'active' : ''}`}
            onClick={() => { setStatusFilter(t.key); setPage(1); }}
          >
            {t.label}
          </button>
        ))}

        {/* Search */}
        <div className="mt-search ml-auto">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            placeholder="Search product, SKU, barcode..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="search-input"
          />
        </div>
      </div>

      {/* Table card */}
      <div className="table-card">
        <div className="table-wrapper">
          <table className="mt-table">
            <thead>
              <tr>
                <th style={{ width: 56 }}>Image</th>
                <th onClick={() => handleSort('product_name')} className="th-sortable">
                  Product Name <SortIcon col="product_name" />
                </th>
                <th onClick={() => handleSort('sku_code')} className="th-sortable">
                  SKU Code <SortIcon col="sku_code" />
                </th>
                <th>Brand</th>
                <th>Category</th>
                <th>Status</th>
                <th onClick={() => handleSort('mrp')} className="th-sortable text-right">
                  MRP (₹) <SortIcon col="mrp" />
                </th>
                <th className="text-right" style={{ width: 100 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="table-empty">Loading products...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={8} className="table-empty">No products found. Try adjusting your filters.</td></tr>
              ) : paginated.map(sku => {
                const isEditing = inlineEditId === sku.id;
                const brandLabel = references.BRAND[sku.brand_reference_id] || '—';
                const catLabel = references.CATEGORY[sku.category_reference_id] || '—';
                const statusLabel = references.STATUS[sku.status_reference_id] || null;

                return (
                  <tr key={sku.id} className={`mt-row ${isEditing ? 'editing' : ''}`}>
                    {/* Image */}
                    <td>
                      {sku.primary_image_url ? (
                        <img src={sku.primary_image_url} alt={sku.product_name} className="row-img" />
                      ) : (
                        <div className="row-img-placeholder"><ImageIcon size={18} /></div>
                      )}
                    </td>

                    {/* Product Name */}
                    <td>
                      {isEditing ? (
                        <input
                          className="inline-input"
                          value={inlineEditData.product_name}
                          onChange={e => setInlineEditData(p => ({ ...p, product_name: e.target.value }))}
                          autoFocus
                        />
                      ) : (
                        <span className="row-product-name">{sku.product_name || '—'}</span>
                      )}
                    </td>

                    {/* SKU Code */}
                    <td>
                      {isEditing ? (
                        <input
                          className="inline-input mono"
                          value={inlineEditData.sku_code}
                          onChange={e => setInlineEditData(p => ({ ...p, sku_code: e.target.value }))}
                        />
                      ) : (
                        <span className="sku-code-badge">{sku.sku_code || '—'}</span>
                      )}
                    </td>

                    {/* Brand */}
                    <td><span className="row-meta">{brandLabel}</span></td>

                    {/* Category */}
                    <td><span className="row-meta">{catLabel}</span></td>

                    {/* Status */}
                    <td>
                      {statusLabel ? <StatusBadge label={statusLabel} /> : <span className="row-meta">—</span>}
                    </td>

                    {/* MRP */}
                    <td className="text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          className="inline-input text-right"
                          style={{ width: 90 }}
                          value={inlineEditData.mrp}
                          onChange={e => setInlineEditData(p => ({ ...p, mrp: e.target.value }))}
                        />
                      ) : (
                        <span className="row-mrp">{sku.mrp != null ? `₹${sku.mrp.toLocaleString('en-IN')}` : '—'}</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="text-right">
                      {isEditing ? (
                        <div className="inline-actions">
                          <button
                            className="action-btn save"
                            title="Save"
                            onClick={() => saveInlineEdit(sku)}
                            disabled={inlineSaving}
                          >
                            {inlineSaving ? '…' : <Check size={15} />}
                          </button>
                          <button className="action-btn cancel" title="Cancel" onClick={cancelInlineEdit}>
                            <X size={15} />
                          </button>
                        </div>
                      ) : (
                        <div className="row-actions" ref={menuOpenId === sku.id ? menuRef : null}>
                          <button
                            className="action-btn edit"
                            title="Quick Edit"
                            onClick={() => startInlineEdit(sku)}
                          >
                            <Edit2 size={15} />
                          </button>
                          <div className="more-menu-wrapper">
                            <button
                              className="action-btn more"
                              onClick={() => setMenuOpenId(menuOpenId === sku.id ? null : sku.id)}
                            >
                              <MoreVertical size={15} />
                            </button>
                            {menuOpenId === sku.id && (
                              <div className="more-menu">
                                <button className="more-menu-item" onClick={() => { setMenuOpenId(null); setEditingSku(sku); setIsFormOpen(true); }}>
                                  <Edit2 size={14} /> Full Edit
                                </button>
                                <button className="more-menu-item danger" onClick={() => handleDelete(sku.id)}>
                                  <Trash2 size={14} /> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="table-footer">
          <div className="table-info">
            Showing {Math.min((page - 1) * pageSize + 1, filtered.length)}–{Math.min(page * pageSize, filtered.length)} of {filtered.length} products
            <select
              className="page-size-select"
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
            >
              {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n} / page</option>)}
            </select>
          </div>
          <div className="pagination">
            <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
              .reduce((acc, n, idx, arr) => {
                if (idx > 0 && n - arr[idx - 1] > 1) acc.push('…');
                acc.push(n);
                return acc;
              }, [])
              .map((n, i) =>
                n === '…' ? (
                  <span key={`gap-${i}`} className="page-gap">…</span>
                ) : (
                  <button
                    key={n}
                    className={`page-btn ${page === n ? 'active' : ''}`}
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </button>
                )
              )}
            <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Full Modal Form */}
      {isFormOpen && (
        <SkuMasterForm
          initialData={editingSku}
          onClose={() => setIsFormOpen(false)}
          onSaved={() => { setIsFormOpen(false); loadAll(); }}
        />
      )}
    </div>
  );
}
