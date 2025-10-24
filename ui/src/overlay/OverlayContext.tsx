import React from 'react';

type OverlayContextType = {
  visible: boolean;
  text?: string;
  show: (text?: string) => void;
  hide: () => void;
  /** Envuela una promesa y muestra/oculta el overlay automáticamente */
  withOverlay: <T>(work: Promise<T>, text?: string) => Promise<T>;
};

const OverlayContext = React.createContext<OverlayContextType | null>(null);

export function OverlayProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = React.useState(false);
  const [text, setText] = React.useState<string | undefined>(undefined);

  // ref-count para múltiples operaciones concurrentes sin parpadeos
  const counterRef = React.useRef(0);

  const show = React.useCallback((msg?: string) => {
    counterRef.current += 1;
    if (!visible) setVisible(true);
    if (msg !== undefined) setText(msg);
  }, [visible]);

  const hide = React.useCallback(() => {
    counterRef.current = Math.max(0, counterRef.current - 1);
    if (counterRef.current === 0) {
      setVisible(false);
      setText(undefined);
    }
  }, []);

  const withOverlay = React.useCallback(async <T,>(work: Promise<T>, msg?: string) => {
    show(msg);
    try {
      return await work;
    } finally {
      hide();
    }
  }, [show, hide]);

  // lock scroll cuando visible
  React.useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [visible]);

  const value = React.useMemo(() => ({ visible, text, show, hide, withOverlay }), [visible, text, show, hide, withOverlay]);

  return (
    <OverlayContext.Provider value={value}>
      {children}
    </OverlayContext.Provider>
  );
}

export function useOverlay() {
  const ctx = React.useContext(OverlayContext);
  if (!ctx) throw new Error('useOverlay must be used within an OverlayProvider');
  return ctx;
}

/** UI del overlay global (spinner + tarjeta) */
export function GlobalOverlay() {
  const { visible, text } = useOverlay();
  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .gl-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,.35);
          display: flex; align-items: center; justify-content: center;
          z-index: 9999;
        }
        .gl-card {
          background: #fff; padding: 16px 20px; border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0,0,0,.2); font-size: 14px;
          display: flex; align-items: center; gap: 10px;
        }
        .gl-spinner {
          width: 1.2em; height: 1.2em; border: 2px solid #333; border-right-color: transparent;
          border-radius: 50%; animation: spin .6s linear infinite;
        }
      `}</style>
      <div className="gl-overlay" role="alert" aria-busy="true" aria-live="assertive">
        <div className="gl-card">
          <span className="gl-spinner" />
          <span>{text || 'Procesando…'}</span>
        </div>
      </div>
    </>
  );
}
