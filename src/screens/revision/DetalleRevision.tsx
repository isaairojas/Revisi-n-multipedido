/**
 * "Detalle del producto" de la revisión (propuesta sin spec: docs/REVISION-MULTIPEDIDO-INTENT.md · R14).
 * Figma "🔎 Revisión - Independiente" › Detalle de producto; `AssortmentCheckProductDetailScreen` de exodus-gtm-pwa:
 * - Simplificada (misceláneo) sin revisar: "Cantidad revisada:" con contador y "Confirmar revisión".
 * - Simplificada ya revisada: el contador queda fijo y el botón es "Cancelar revisión".
 * - Escaneable: "Surtido" y "Revisado" de solo lectura; "Cancelar revisión" inhabilitado si no hay revisión.
 */
import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { AppHeader } from '@ds/components/organisms/AppHeader/AppHeader';
import { ContentPanel } from '@ds/components/organisms/ContentPanel/ContentPanel';
import { BottomBar } from '@ds/components/organisms/BottomBar/BottomBar';
import { Button } from '@ds/components/atoms/Button/Button';
import { LabeledField } from '@ds/components/molecules/LabeledField/LabeledField';
import { ProductSummary } from '@ds/components/molecules/ProductSummary/ProductSummary';
import { AVISOS_REVISION, pedidoEnCurso } from '../../domain/revision';
import { sonar } from '../../domain/sonidos';
import { useStore } from '../../store/AppStore';
import { CantidadSurtida } from '../surtido/CantidadSurtida';
import { useFoto } from './useFoto';
import styles from './Revision.module.css';

export function DetalleRevision() {
  const { codigo } = useParams();
  const navigate = useNavigate();
  const { revision, dispatchRevision, mostrarToast } = useStore();
  const pedido = revision ? pedidoEnCurso(revision) : null;
  const partida = pedido?.partidas.find((x) => x.codigo === codigo);
  const [valor, setValor] = useState(partida ? (partida.revisado > 0 ? partida.revisado : partida.surtido) : 0);
  const foto = useFoto(partida?.imagen ?? '');

  if (!partida) return <Navigate to="/revision" replace />;

  const volver = () => navigate('/revision');
  const revisado = partida.revisado > 0;

  const confirmar = () => {
    if (valor > partida.surtido) {
      sonar('error');
      return mostrarToast({ kind: 'error', ...AVISOS_REVISION.sobrante });
    }
    dispatchRevision({ type: 'fijar', codigo: partida.codigo, cantidad: valor });
    sonar('ok');
    volver();
  };

  const cancelar = () => {
    dispatchRevision({ type: 'fijar', codigo: partida.codigo, cantidad: 0 });
    volver();
  };

  return (
    <div className={styles.screen}>
      <AppHeader onBack={volver} />
      <ContentPanel title="Detalle del producto" bottom={124} scroll>
        <div className={styles.detalle}>
          <ProductSummary foto={foto} codigo={partida.codigo} descripcion={partida.descripcion} photoStyle="framed" />
          {partida.simplificada ? (
            <>
              <div className={styles.mitadAncho}>
                <LabeledField label="Surtido" value={partida.surtido} />
              </div>
              <div className={styles.cantidadRevisada}>
                <span>Cantidad revisada:</span>
                <CantidadSurtida valor={valor} maximo={partida.surtido} habilitada={!revisado} onCambiar={setValor} />
              </div>
            </>
          ) : (
            <div className={styles.par}>
              <LabeledField label="Surtido" value={partida.surtido} />
              <LabeledField label="Revisado" value={partida.revisado} />
            </div>
          )}
        </div>
      </ContentPanel>
      <BottomBar>
        <div className="row">
          <Button variant="default" label="Regresar" className={styles.mitad} onClick={volver} />
          {partida.simplificada && !revisado ? (
            <Button variant="success" label="Confirmar revisión" className={styles.mitad} disabled={valor < 1} onClick={confirmar} />
          ) : (
            <Button variant="error" label="Cancelar revisión" className={styles.mitad} disabled={!revisado} onClick={cancelar} />
          )}
        </div>
      </BottomBar>
    </div>
  );
}
