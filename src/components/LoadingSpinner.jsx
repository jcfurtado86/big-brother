import { useLoadingCount } from '../contexts/LoadingContext';

const style = {
  position: 'fixed',
  bottom: 16,
  left: 36,
  width: 22,
  height: 22,
  border: '3px solid rgba(255,255,255,0.12)',
  borderTop: '3px solid #5b9bf5',
  borderRadius: '50%',
  animation: 'bb-spin 0.8s linear infinite',
  zIndex: 10,
  pointerEvents: 'none',
  filter: 'drop-shadow(0 0 4px rgba(91,155,245,0.5))',
};

export default function LoadingSpinner() {
  const count = useLoadingCount();
  if (count === 0) return null;
  return <div style={style} />;
}
