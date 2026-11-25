import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import '@fontsource/roboto/100.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/700.css';
import './styles/global.css';
import { App } from './App';
import { AppStoreProvider } from './store/AppStore';
import { idEscenario, semillaDesdeUrl } from './navigation/escenarios';

// Sin escenario ni pantalla en la liga, la demo arranca en el último producto del surtido de la G-500 y sigue con la
// revisión, la facturación y el embarque de la ronda (caso "Recorrido completo").
if (!idEscenario() && window.location.hash.replace(/^#\/?/, '') === '') {
  window.history.replaceState(null, '', `${window.location.pathname}?escenario=flujo-completo&caso=fac-flujo-completo#/surtido`);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Rutas en el hash (#/surtido), como una sola página: el servidor siempre entrega index.html con
        200. Con rutas reales, GitHub Pages respondía 404 a /surtido, /tareas… y en celular y HH la
        app no cargaba. */}
    <HashRouter>
      <AppStoreProvider semilla={semillaDesdeUrl()}>
        <App />
      </AppStoreProvider>
    </HashRouter>
  </StrictMode>,
);
