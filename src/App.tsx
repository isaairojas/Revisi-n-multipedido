/**
 * Rutas de la demo de revisión multipedido: de la finalización del surtido de la ronda al cierre de la tarea 35.
 * Los modales no son rutas: viven como estado de la pantalla que los abre.
 *
 * - `/surtido` y `/detalle/:codigo`: el listado del surtido, para surtir lo último y finalizar la ronda.
 * - `/surtido-anterior` y `/login`: pantallas de referencia a las que enruta la toma de tarea.
 * - `/revision` y `/revision/detalle/:codigo`: revisión multipedido, propuesta sin spec
 *   (docs/REVISION-MULTIPEDIDO-INTENT.md). `/tareas` muestra la tarea de revisión cuando es la que está cargada.
 * - `/facturacion`: facturación y embarque de la ronda (tarea 35), misma propuesta (R18–R27).
 */
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AsignacionTareas } from './screens/tareas/AsignacionTareas';
import { DetalleRonda } from './screens/surtido/DetalleRonda';
import { SurtidoRonda } from './screens/surtido/SurtidoRonda';
import { DetalleProducto } from './screens/surtido/DetalleProducto';
import { InicioSesion, SurtidoAnterior } from './screens/referencia/PantallaReferencia';
import { ToastHost } from './navigation/ToastHost';
import { VozHost } from './navigation/VozHost';
import { EscenariosPanel } from './navigation/EscenariosPanel';
import { CodigosCheatsheet } from './navigation/CodigosCheatsheet';
import { CodigosRevision } from './navigation/CodigosRevision';
import { AsignacionRevision } from './screens/revision/AsignacionRevision';
import { RevisionPedido } from './screens/revision/RevisionPedido';
import { DetalleRevision } from './screens/revision/DetalleRevision';
import { AsignacionFacturacion } from './screens/facturacion/AsignacionFacturacion';
import { FacturacionPedido } from './screens/facturacion/FacturacionPedido';
import { useStore } from './store/AppStore';

/** La asignación muestra la tarea cargada: la ronda por surtir, su revisión o su facturación y embarque (tarea 35). */
function TareasRuta() {
  const { tarea } = useStore();
  if (tarea === 'facturacion') return <AsignacionFacturacion />;
  return tarea === 'revision' ? <AsignacionRevision /> : <AsignacionTareas />;
}

export function App() {
  const { pathname } = useLocation();
  // La hoja de códigos solo tiene sentido donde se escanea.
  const simulando = pathname === '/surtido' || pathname.startsWith('/detalle');
  const revisando = pathname.startsWith('/revision');

  return (
    <>
      <div className="app-frame">
        <Routes>
          <Route path="/tareas" element={<TareasRuta />} />
          <Route path="/revision" element={<RevisionPedido />} />
          <Route path="/revision/detalle/:codigo" element={<DetalleRevision />} />
          <Route path="/facturacion" element={<FacturacionPedido />} />
          <Route path="/ronda" element={<DetalleRonda />} />
          <Route path="/surtido" element={<SurtidoRonda />} />
          <Route path="/detalle/:codigo" element={<DetalleProducto />} />
          <Route path="/surtido-anterior" element={<SurtidoAnterior />} />
          <Route path="/login" element={<InicioSesion />} />
          <Route path="*" element={<Navigate to="/tareas" replace />} />
        </Routes>
        <ToastHost />
        <VozHost />
      </div>
      <EscenariosPanel />
      {simulando && <CodigosCheatsheet />}
      {revisando && <CodigosRevision />}
    </>
  );
}
