import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { game } from './appGame';
import { GameProvider } from './store/gameContext';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('index.html has no #root element');

createRoot(root).render(
  <GameProvider game={game}>
    <App />
  </GameProvider>,
);
