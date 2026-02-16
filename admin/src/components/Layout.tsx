import { useState } from 'react';
import { TopNav } from './TopNav';
import { Sidebar } from './Sidebar';
import styles from './Layout.module.css';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className={styles.root}>
      <TopNav />
      <div className={styles.body}>
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
