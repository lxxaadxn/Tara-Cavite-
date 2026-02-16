import { useState } from 'react';
import { touristSpots } from '../data/mockData';
import { useToast } from '../components/Toast';
import styles from './TouristSpots.module.css';

export function TouristSpots() {
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('All Cities');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', description: '', category: '', city: '' });
  const toast = useToast();

  const filtered = touristSpots.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) &&
      (cityFilter === 'All Cities' || s.city === cityFilter) &&
      (typeFilter === 'All Types' || s.category === typeFilter)
  );

  const handleSave = () => {
    if (!form.name.trim()) {
      toast('Please enter a spot name', 'error');
      return;
    }
    toast('Tourist spot saved successfully!');
    setModalOpen(false);
    setForm({ name: '', address: '', description: '', category: '', city: '' });
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Tourist Spots</h1>
          <p>Manage all tourist destinations and attractions</p>
        </div>
        <button className={styles.addBtn} onClick={() => setModalOpen(true)}>
          <span>+</span> Add New Spot
        </button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.search}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            placeholder="Search by name, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className={styles.filters}>
          <button className={styles.iconBtn} title="Filter">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
          </button>
          <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
            <option>All Cities</option>
            <option>Cavite</option>
            <option>Batangas</option>
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option>All Types</option>
            <option>Historical</option>
            <option>Mountain</option>
            <option>Beach</option>
            <option>Cultural</option>
          </select>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Image</th>
              <th>Name</th>
              <th>Category</th>
              <th>City</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((spot) => (
              <tr key={spot.id} className={styles.row}>
                <td>
                  <div className={styles.thumb}>{spot.image}</div>
                </td>
                <td>{spot.name}</td>
                <td>{spot.category}</td>
                <td>{spot.city}</td>
                <td>
                  <span className={`${styles.badge} ${spot.status === 'active' ? styles.active : styles.hidden}`}>
                    {spot.status}
                  </span>
                </td>
                <td>
                  <button className={styles.actionBtn} title="Actions">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="6" r="1.5" />
                      <circle cx="12" cy="12" r="1.5" />
                      <circle cx="12" cy="18" r="1.5" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className={styles.overlay} onClick={() => setModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2>Add New Spot</h2>
            <div className={styles.form}>
              <div className={styles.upload}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span>Upload image</span>
              </div>
              <input
                placeholder="Spot name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
              <input
                placeholder="Address"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
              <textarea
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                <option value="">Select category</option>
                <option>Historical</option>
                <option>Mountain</option>
                <option>Beach</option>
                <option>Cultural</option>
              </select>
              <input placeholder="City" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setModalOpen(false)}>Cancel</button>
              <button className={styles.saveBtn} onClick={handleSave}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
