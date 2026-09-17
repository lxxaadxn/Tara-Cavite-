import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ItineraryAiChat } from '../../components/ItineraryAiChat';
import {
  deleteChatSession,
  fetchChatSessions,
  renameChatSession,
  type ChatSession,
} from '../../lib/adminItineraryChats';
import { useAdminPathPrefix } from '../../contexts/AdminPathPrefixContext';
import { usePageHeader } from '../../contexts/PageHeaderContext';
import styles from './ItineraryAiPage.module.css';

function relativeDay(iso: string | null): string {
  if (!iso) return '';
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '';
  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return then.toLocaleDateString();
}

export function ItineraryAiPage() {
  usePageHeader('AI Itinerary Generator', null);

  const { sessionId: routeSessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const prefix = useAdminPathPrefix();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  /**
   * Held here rather than read straight from the URL: a session created
   * mid-turn must not swap the route out from under an in-flight generation.
   */
  const [activeId, setActiveId] = useState<string | null>(routeSessionId ?? null);

  const refresh = useCallback(() => {
    fetchChatSessions()
      .then(setSessions)
      .catch(() => setSessions([]));
  }, []);

  useEffect(refresh, [refresh]);

  const openSession = (id: string | null) => {
    setActiveId(id);
    const base = `${prefix.replace(/\/$/, '')}/web/itineraries/ai`;
    navigate(id ? `${base}/${id}` : base);
  };

  const rename = async (session: ChatSession) => {
    const next = window.prompt('Rename this chat', session.title);
    if (next == null) return;
    await renameChatSession(session.id, next);
    refresh();
  };

  const remove = async (session: ChatSession) => {
    if (!window.confirm(`Delete "${session.title}"? The transcript cannot be recovered.`)) return;
    await deleteChatSession(session.id);
    if (session.id === activeId) openSession(null);
    refresh();
  };

  return (
    <div className={styles.page}>
      <aside className={styles.rail} aria-label="Chat history">
        <div className={styles.railHead}>
          <h3>Chat history</h3>
          <button type="button" className={styles.newBtn} onClick={() => openSession(null)}>
            New chat
          </button>
        </div>

        {sessions.length === 0 ? (
          <p className={styles.railEmpty}>Past conversations show up here once you send a prompt.</p>
        ) : (
          <ul className={styles.railList}>
            {sessions.map((session) => (
              <li key={session.id}>
                <div
                  className={`${styles.railItem} ${session.id === activeId ? styles.railItemActive : ''}`}
                >
                  <button
                    type="button"
                    className={styles.railOpen}
                    onClick={() => openSession(session.id)}
                  >
                    <span className={styles.railTitle}>{session.title}</span>
                    <span className={styles.railWhen}>{relativeDay(session.updatedAt)}</span>
                  </button>
                  <span className={styles.railActions}>
                    <button
                      type="button"
                      title="Rename"
                      aria-label={`Rename ${session.title}`}
                      onClick={() => void rename(session)}
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      title="Delete"
                      aria-label={`Delete ${session.title}`}
                      onClick={() => void remove(session)}
                    >
                      Delete
                    </button>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <ItineraryAiChat
        fullPage
        sessionId={activeId}
        onSessionCreated={(id) => {
          setActiveId(id);
          refresh();
        }}
        onActivity={refresh}
      />
    </div>
  );
}
