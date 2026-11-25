/**
 * Modales de facturación y embarque (propuesta sin spec: docs/REVISION-MULTIPEDIDO-INTENT.md · R23, R25–R27).
 * Base: los del prototipo hermano "Solicitud anticipada Uber" (mismo design system), ajustados a Figma "🚚 Embarque":
 *   Nuevo embarque 6157:11984 (paquetería y comentario obligatorios) · Embarque creado 6157:13886
 *   Agregar embarque 6166:14379 · Selector 6166:14971 / 6166:15187 · Factura agregada 6178:15407
 *   Factura sin timbrar (🧾 Facturación 6953:10868)
 * `SiguienteFacturaModal` es nuevo (R27): el aviso entre pedidos de la ronda, igual al de la revisión.
 */
import { useState } from 'react';
import iconoPlus from '@assets/icons/modal-icono-embarque-plus.svg';
import iconoCheck from '@assets/icons/modal-icono-embarque-check.svg';
import iconoPregunta from '@assets/icons/modal-icono-pregunta.svg';
import grupo45 from '@assets/icons/grupo-45-cancelar.svg';
import { ModalHeader, ModalIcon, ModalSheet } from '@ds/components/organisms/ModalSheet/ModalSheet';
import { Button } from '@ds/components/atoms/Button/Button';
import { FloatingLabelInput } from '@ds/components/molecules/FloatingLabelInput/FloatingLabelInput';
import { MAX_COMENTARIO, PAQUETERIAS, textoEmbarque, type Embarque, type PedidoFacturacion } from '../../domain/facturacion';
import { ContenedorLetra } from '../surtido/Contenedores';
import overlays from '../surtido/overlays/overlays.module.css';
import styles from './FacturacionModals.module.css';

const ICONO = '-2.84% -2.27% -0.56% -1.14%';
const iconPlus = <ModalIcon src={iconoPlus} inset={ICONO} />;
const iconCheck = <ModalIcon src={iconoCheck} inset={ICONO} />;

/** Lista desplegable sencilla con el estilo de los selectores de la demo. */
function Selector({ etiqueta, valor, opciones, onElegir }: { etiqueta: string; valor: string | null; opciones: string[]; onElegir: (v: string) => void }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className={styles.campo}>
      <FloatingLabelInput label={etiqueta} placeholder={etiqueta} value={valor ?? ''} isSelect labelFont="select" onClick={() => setAbierto((a) => !a)} />
      {abierto && (
        <div className={styles.opciones} role="listbox" aria-label={etiqueta}>
          {opciones.map((o) => (
            <button
              type="button"
              role="option"
              aria-selected={o === valor}
              key={o}
              className={styles.opcion}
              onClick={() => {
                onElegir(o);
                setAbierto(false);
              }}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Campo "Comentario" (multilínea, obligatorio, hasta 50 caracteres). */
function Comentario({ valor, onCambiar, soloLectura }: { valor: string; onCambiar?: (v: string) => void; soloLectura?: boolean }) {
  return (
    <label className={styles.comentario}>
      <span className={styles.comentarioEtiqueta}>Comentario</span>
      <textarea
        value={valor}
        maxLength={MAX_COMENTARIO}
        placeholder="Campo obligatorio"
        readOnly={soloLectura}
        onChange={(e) => onCambiar?.(e.target.value)}
        aria-label="Comentario"
      />
    </label>
  );
}

/* ---------- Nuevo embarque — 6157:11984 ---------- */
export function NuevoEmbarqueModal({
  hayActivos,
  onCancel,
  onConfirm,
}: {
  /** Se llegó desde "Agregar embarque" (sí hay activos): no se dice que no existen. */
  hayActivos: boolean;
  onCancel: () => void;
  onConfirm: (paqueteria: string, comentario: string) => void;
}) {
  const [paqueteria, setPaqueteria] = useState<string | null>(null);
  const [comentario, setComentario] = useState('');
  const listo = !!paqueteria && comentario.trim().length > 0;
  return (
    <ModalSheet icon={iconPlus} gap={10} doubleShadow>
      <div className={styles.col} style={{ gap: 16 }}>
        <ModalHeader title="Nuevo embarque" />
        <div className={styles.text}>
          {!hayActivos && <p>No existe un embarque activo para este cliente.</p>}
          <p>¿Continuar con la creación de un nuevo embarque?</p>
        </div>
        <Selector etiqueta="Paquetería" valor={paqueteria} opciones={PAQUETERIAS} onElegir={setPaqueteria} />
        <Comentario valor={comentario} onCambiar={setComentario} />
        <div className={styles.buttons}>
          <Button asset={grupo45} label="Cancelar" className={styles.flex1} onClick={onCancel} />
          <Button
            variant="success"
            icon="check"
            label="Aceptar"
            disabled={!listo}
            className={styles.flex1}
            onClick={() => listo && onConfirm(paqueteria!, comentario.trim())}
          />
        </div>
      </div>
    </ModalSheet>
  );
}

/* ---------- Embarque creado — 6157:13886 ---------- */
export function EmbarqueCreadoModal({ numero, onConfirm }: { numero: string; onConfirm: () => void }) {
  return (
    <ModalSheet icon={iconCheck} gap={10} doubleShadow>
      <div className={styles.col} style={{ gap: 18 }}>
        <ModalHeader title="Embarque creado" />
        <p className={styles.text}>Se registró correctamente el embarque para esta factura.</p>
        <div className={styles.box}>
          <p className={styles.boxTitle}>No. de embarque</p>
          <p className={styles.boxValue}>{numero}</p>
        </div>
        <Button variant="success" icon="check" checkWidth={31.012} label="Aceptar" className={styles.full} onClick={onConfirm} />
      </div>
    </ModalSheet>
  );
}

/* ---------- Agregar embarque (elección) — 6166:14379 ---------- */
export function AgregarEmbarqueEleccionModal({
  cantidad,
  onNuevo,
  onAgregar,
  onCancel,
}: {
  cantidad: number;
  onNuevo: () => void;
  onAgregar: () => void;
  onCancel: () => void;
}) {
  return (
    <ModalSheet icon={iconPlus} gap={10} doubleShadow>
      <div className={styles.col} style={{ gap: 18 }}>
        <ModalHeader title="Agregar embarque" />
        <div className={styles.text}>
          <p>
            {cantidad === 1 ? 'Existe 1 embarque activo para este mismo cliente.' : `Existen ${cantidad} embarques activos para este mismo cliente.`}
          </p>
          <p>¿Deseas agregar esta factura a uno existente o generar uno nuevo?</p>
        </div>
        <div className={styles.buttons}>
          <Button variant="default" label="Nuevo embarque" className={styles.flex1} onClick={onNuevo} />
          <Button variant="success" label="Agregar existente" className={styles.flex1} onClick={onAgregar} />
        </div>
        <Button variant="error" icon="cross" label="Cancelar" className={styles.full} onClick={onCancel} />
      </div>
    </ModalSheet>
  );
}

/* ---------- Agregar embarque (selector) — 6166:14971 / 6166:15187 ---------- */
export function AgregarEmbarqueSelectorModal({
  embarques,
  onCancel,
  onConfirm,
}: {
  embarques: Embarque[];
  onCancel: () => void;
  onConfirm: (embarqueId: string) => void;
}) {
  // Con un solo embarque compatible viene preseleccionado.
  const [seleccion, setSeleccion] = useState<string | null>(embarques.length === 1 ? embarques[0].id : null);
  const sel = embarques.find((e) => e.id === seleccion) ?? null;
  return (
    <ModalSheet icon={iconPlus} gap={10} doubleShadow>
      <div className={styles.col} style={{ gap: 16 }}>
        <ModalHeader title="Agregar embarque" />
        <p className={styles.text}>Seleccione el embarque al que desea agregar la factura:</p>
        <Selector
          etiqueta="Embarque"
          valor={sel ? textoEmbarque(sel) : null}
          opciones={embarques.map(textoEmbarque)}
          onElegir={(t) => setSeleccion(embarques.find((e) => textoEmbarque(e) === t)?.id ?? null)}
        />
        {/* Paquetería y comentario del embarque elegido, de solo lectura. */}
        <div className={styles.campo}>
          <FloatingLabelInput label="Paquetería" placeholder="Paquetería" value={sel?.paqueteria ?? ''} isSelect labelFont="select" />
        </div>
        <Comentario valor={sel?.comentario ?? ''} soloLectura />
        <div className={styles.buttons}>
          <Button asset={grupo45} label="Cancelar" className={styles.flex1} onClick={onCancel} />
          <Button variant="success" icon="check" label="Aceptar" disabled={!sel} className={styles.flex1} onClick={() => sel && onConfirm(sel.id)} />
        </div>
      </div>
    </ModalSheet>
  );
}

/* ---------- Factura agregada — 6178:15407 ---------- */
export function FacturaAgregadaModal({ embarque, onConfirm }: { embarque: Embarque; onConfirm: () => void }) {
  return (
    <ModalSheet icon={iconCheck} gap={10} doubleShadow>
      <div className={styles.col} style={{ gap: 18 }}>
        <ModalHeader title="Factura agregada" />
        <p className={styles.text}>Factura agregada correctamente al embarque:</p>
        <div className={styles.box}>
          <p className={styles.boxTitle}>No. de embarque</p>
          <p className={styles.boxValue}>{embarque.id}</p>
          <p className={styles.boxDetail}>
            ({embarque.facturas} facturas) {embarque.fecha}
          </p>
        </div>
        <Button variant="success" icon="check" checkWidth={31.012} label="Aceptar" className={styles.full} onClick={onConfirm} />
      </div>
    </ModalSheet>
  );
}

/* ---------- Factura sin timbrar — 6953:10868 (Intent revisión · R23) ---------- */
export function FacturaSinTimbrarModal({ onContinuar }: { onContinuar: () => void }) {
  return (
    <ModalSheet icon={<ModalIcon src={iconoPregunta} inset={ICONO} />} gap={10} doubleShadow>
      <div className={styles.col} style={{ gap: 18 }}>
        <ModalHeader title="Factura sin timbrar" />
        <div className={styles.text}>
          <p>La factura se generó correctamente, pero no pudimos timbrarla.</p>
          <p>Puedes adjuntarla a un embarque mientras tanto.</p>
          <p>
            <b>Asegúrate de timbrar la factura en la plataforma SIC antes de enviarla.</b>
          </p>
        </div>
        <Button variant="success" label="Continuar a impresión" className={styles.full} onClick={onContinuar} />
      </div>
    </ModalSheet>
  );
}

/* ---------- Aviso entre pedidos de la ronda — Intent revisión · R27 (nuevo, sin nodo en Figma) ---------- */
export function SiguienteFacturaModal({
  terminado,
  embarqueId,
  siguiente,
  onContinuar,
}: {
  terminado: PedidoFacturacion;
  embarqueId: string;
  siguiente: PedidoFacturacion;
  onContinuar: () => void;
}) {
  return (
    <ModalSheet icon={iconCheck} gap={10} doubleShadow>
      <div className={styles.col} style={{ gap: 18 }}>
        <ModalHeader title={`Pedido ${terminado.letra} facturado y embarcado`} />
        <p className={styles.text}>
          El pedido <b>{terminado.id}</b> quedó en el embarque <b>{embarqueId}</b>.
        </p>
        <div className={overlays.transicion}>
          <span className={overlays.transicionEtiqueta}>Continúa con</span>
          <span className={`${overlays.transicionPedido} ${styles.conLetra}`}>
            <ContenedorLetra letra={siguiente.letra} size={26} /> Pedido {siguiente.id}
          </span>
          <span className={overlays.transicionCliente}>
            {siguiente.cliente.id} · {siguiente.cliente.nombre}
          </span>
        </div>
        <Button variant="success" icon="check" label="Continuar" className={styles.full} onClick={onContinuar} />
      </div>
    </ModalSheet>
  );
}
