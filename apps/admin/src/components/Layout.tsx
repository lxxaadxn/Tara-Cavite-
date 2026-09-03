import { Outlet } from 'react-router-dom';
import { PageHeaderProvider } from '../contexts/PageHeaderContext';
import { TopNav } from './TopNav';
import { Sidebar } from './Sidebar';
import styles from './Layout.module.css';

export function Layout() {
  return (
    <PageHeaderProvider>
      <div className={styles.root}>
        <div className={styles.shell}>
          <Sidebar />
          <div className={styles.content}>
            <TopNav />
            <main className={styles.main}>
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </PageHeaderProvider>
  );
}
