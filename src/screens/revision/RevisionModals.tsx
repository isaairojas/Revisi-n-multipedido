/**
 * Modales de la revisión (propuesta sin spec: docs/REVISION-MULTIPEDIDO-INTENT.md).
 *
 * Réplica de los de la revisión independiente de hoy (Figma "🔎 Revisión - Independiente", componentes
 * `SimplifiedReviewModal` y `DiscrepancyManagerModal` y modales de `AssortmentCheckScreen` en exodus-gtm-pwa), con los
 * textos de `es.ts`. Lo único nuevo es `SiguientePedidoModal` (Intent revisión · R7): el aviso entre pedidos de la
 * ronda, que se confirma con la palomita.
 */
import { useState } from 'react';
import iconoRevision from '@assets/icons/modal-icono-revision.svg';
import iconoNegado from '@assets/icons/modal-icono-negado.svg';
import iconoPregunta from '@assets/icons/modal-icono-pregunta.svg';
import iconoMenu from '@assets/icons/modal-icono-menu.svg';
import { ModalHeader, ModalIcon, ModalSheet } from '@ds/components/organisms/ModalSheet/ModalSheet';
import { Button } from '@ds/components/atoms/Button/Button';
import { FloatingLabelInput } from '@ds/components/molecules/FloatingLabelInput/FloatingLabelInput';
import { LabeledField } from '@ds/components/molecules/LabeledField/LabeledField';
import { ProductSummary } from '@ds/components/molecules/ProductSummary/ProductSummary';
import { MOTIVOS_NEGACION } from '../../domain/ronda';
import type { Negacion, PartidaRevision, PedidoRevision } from '../../domain/revision';
import { CantidadSurtida } from '../surtido/CantidadSurtida';
import { ContenedorLetra } from '../surtido/Contenedores';
import overlays from '../surtido/overlays/overlays.module.css';
import { useFoto } from './useFoto';
import styles from './Revision.module.css';

const ICONO = '-2.84% -2.27% -0.56% -1.14%';

/** ✕ y ✓ de los modales de confirmación de la app. */
function Confirmar({ onCancelar, onConfirmar, deshabilitado }: { onCancelar: () => void; onConfirmar: () => void; deshabilitado?: boolean }) {
  return (
    <div className={overlays.buttons}>
      <Button variant="error" icon="cross" label="Cancelar" className={overlays.flex1} onClick={onCancelar} />
      <Button variant="success" icon="check" label="Aceptar" className={overlays.flex1} disabled={deshabilitado} onClick={onConfirmar} />
    </div>
  );
}

/* ---------- Revisión simplificada de producto (SimplifiedReviewModal) — Intent revisión · R13 ---------- */
export function SimplificadaModal({
  partida,
  onCancelar,
  onConfirmar,
}: {
  partida: PartidaRevision;
  onCancelar: () => void;
  /** Devuelve false si la cantidad no es válida (el modal sigue abierto). */
  onConfirmar: (cantidad: number) => void;
}) {
  // Inicia en lo ya revisado o, si no hay revisión, en lo surtido (como la app).
  const [valor, setValor] = useState(partida.revisado > 0 ? partida.revisado : partida.surtido);
  const foto = useFoto(partida.imagen);
  return (
    <ModalSheet icon={<ModalIcon src={iconoRevision} inset={ICONO} offsetX={-1} />} gap={10} doubleShadow>
      <div className={overlays.col} style={{ gap: 16 }}>
        <ModalHeader title="Revisión simplificada de producto" gap={16} />
        <ProductSummary foto={foto} codigo={partida.codigo} descripcion={partida.descripcion} />
        {partida.revisado > 0 && <p className={styles.previo}>Cantidad revisada previamente:</p>}
        <div className={styles.contadorAncho}>
          <CantidadSurtida valor={valor} maximo={partida.surtido} habilitada onCambiar={setValor} />
        </div>
        <Confirmar onCancelar={onCancelar} onConfirmar={() => onConfirmar(valor)} />
      </div>
    </ModalSheet>
  );
}

/* ---------- Menú ⋮ de la revisión ---------- */
export function MenuRevision({ onFinalizar, onCerrar }: { onFinalizar: () => void; onCerrar: () => void }) {
  return (
    <ModalSheet icon={<ModalIcon src={iconoMenu} inset={ICONO} />} gap={10} doubleShadow>
      <div className={overlays.col} style={{ gap: 18 }}>
        <ModalHeader title="Menú" gap={18} />
        <Button variant="error" label="Finalizar revisión" className={overlays.full} onClick={onFinalizar} />
        <Button variant="error" icon="cross" label="Cerrar" className={overlays.full} onClick={onCerrar} />
      </div>
    </ModalSheet>
  );
}

/* ---------- Gestor discrepancias (DiscrepancyManagerModal) — Intent revisión · R16 ---------- */
export function DiscrepanciaModal({
  partida,
  onRegresar,
  onNegar,
}: {
  partida: PartidaRevision;
  onRegresar: () => void;
  onNegar: (tipo: Negacion['tipo']) => void;
}) {
  // Sin nada revisado se niega; con una parte revisada se marca la parcialidad.
  const tipo: Negacion['tipo'] = partida.revisado > 0 ? 'parcialidad' : 'negado';
  const foto = useFoto(partida.imagen);
  return (
    <ModalSheet icon={<ModalIcon src={iconoRevision} inset={ICONO} offsetX={-1} />} gap={10} doubleShadow>
      <div className={overlays.col} style={{ gap: 14 }}>
        <ModalHeader title="Gestor discrepancias" gap={14} />
        <span className={styles.faltante}>
          <span aria-hidden>!</span> Faltante
        </span>
        <ProductSummary foto={foto} codigo={partida.codigo} descripcion={partida.descripcion} />
        <div className={styles.par}>
          <LabeledField label="Surtido" value={partida.surtido} />
          <LabeledField label="Revisado" value={partida.revisado} />
        </div>
        <div className={styles.diferencia}>
          <span>DIFERENCIA</span>
          <b>{partida.revisado - partida.surtido}</b>
        </div>
        <div className={overlays.buttons}>
          <Button variant="default" label="Regresar" className={overlays.flex1} onClick={onRegresar} />
          <Button variant="error" label={tipo === 'negado' ? 'Negar' : 'Marcar parcialidad'} className={overlays.flex1} onClick={() => onNegar(tipo)} />
        </div>
      </div>
    </ModalSheet>
  );
}

/* ---------- Selección de motivo negado / parcialidad ---------- */
export function MotivoModal({
  partida,
  tipo,
  onCancelar,
  onConfirmar,
}: {
  partida: PartidaRevision;
  tipo: Negacion['tipo'];
  onCancelar: () => void;
  onConfirmar: (motivo: string) => void;
}) {
  const [motivo, setMotivo] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);
  return (
    <ModalSheet icon={<ModalIcon src={iconoNegado} inset={ICONO} />} gap={10} doubleShadow>
      <div className={overlays.col} style={{ gap: 18 }}>
        <ModalHeader title={tipo === 'negado' ? 'Selección de motivo negado' : 'Selección de motivo parcialidad'} gap={18} />
        <div className={overlays.datos}>
          <div className={overlays.datoFila}>
            <b>Código</b>
            <span className={overlays.datoValor}>{partida.codigo}</span>
          </div>
          <div className={overlays.datoFila}>
            <b>Descripción</b>
            <span className={overlays.datoValor} title={partida.descripcion}>
              {partida.descripcion}
            </span>
          </div>
        </div>
        <div className={overlays.dropdown}>
          {abierto && (
            <div className={overlays.dropdownLista} role="listbox" aria-label="Motivos">
              {MOTIVOS_NEGACION.map((m) => (
                <button
                  key={m}
                  type="button"
                  role="option"
                  aria-selected={motivo === m}
                  className={`${overlays.dropdownOpcion} ${motivo === m ? overlays.dropdownOpcionActiva : ''}`}
                  onClick={() => {
                    setMotivo(m);
                    setAbierto(false);
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
          <FloatingLabelInput
            label="Motivo"
            placeholder="Seleccionar una opción"
            value={motivo ?? ''}
            isSelect
            labelFont="select"
            onClick={() => setAbierto((a) => !a)}
          />
        </div>
        <Confirmar onCancelar={onCancelar} onConfirmar={() => motivo && onConfirmar(motivo)} deshabilitado={motivo === null} />
      </div>
    </ModalSheet>
  );
}

/* ---------- Aviso entre pedidos de la ronda — Intent revisión · R7 (nuevo, sin nodo en Figma) ---------- */
export function SiguientePedidoModal({
  terminado,
  retirado,
  siguiente,
  onContinuar,
}: {
  terminado: PedidoRevision;
  /** El pedido no se revisó: se sacó de la ronda (corporativo incompleto). */
  retirado?: boolean;
  siguiente: PedidoRevision;
  onContinuar: () => void;
}) {
  return (
    <ModalSheet icon={<ModalIcon src={iconoPregunta} inset={ICONO} />} gap={10} doubleShadow>
      <div className={overlays.col} style={{ gap: 18 }}>
        <ModalHeader title={retirado ? `Pedido ${terminado.letra} retirado de la ronda` : `Pedido ${terminado.letra} revisado`} gap={18} />
        <p className={overlays.text}>
          {retirado ? (
            <>
              El pedido <b>{terminado.id}</b> se sacó de la ronda.
            </>
          ) : (
            <>
              Terminaste la revisión del pedido <b>{terminado.id}</b>.
            </>
          )}
        </p>
        <div className={overlays.transicion}>
          <span className={overlays.transicionEtiqueta}>Continúa con</span>
          <span className={`${overlays.transicionPedido} ${styles.transicionConLetra}`}>
            <ContenedorLetra letra={siguiente.letra} size={26} /> Pedido {siguiente.id}
          </span>
          <span className={overlays.transicionCliente}>
            {siguiente.cliente.id} · {siguiente.cliente.nombre}
          </span>
        </div>
        {/* Decisión de Producto (2026-11-25): el paso al siguiente pedido se confirma con la palomita. */}
        <Button variant="success" icon="check" label="Continuar" className={overlays.full} onClick={onContinuar} />
      </div>
    </ModalSheet>
  );
}
