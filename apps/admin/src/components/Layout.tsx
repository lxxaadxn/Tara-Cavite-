import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { TopNav } from './TopNav';
import { Sidebar } from './Sidebar';
import { ActivityPanel } from './ActivityPanel';
import styles from './Layout.module.css';

export function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);

  return (
    <div className={styles.root}>
      <TopNav
        onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
        onTogglePanel={() => setPanelOpen((v) => !v)}
        panelOpen={panelOpen}
      />
      <div className={styles.body}>
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <main className={styles.main}>
          <Outlet />
        </main>
        {panelOpen && <ActivityPanel onClose={() => setPanelOpen(false)} />}
      </div>
    </div>
  );
}
