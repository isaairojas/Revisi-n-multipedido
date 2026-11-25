/**
 * Panel izquierdo de la revisión: lecturas listas para copiar y pegar en el lector (ayuda de la demo, como
 * `CodigosCheatsheet` en el surtido). Solo el pedido en curso, que es el único que se revisa a la vez, y las lecturas
 * para probar los rechazos (Intent revisión · R12).
 */
import { useState } from 'react';
import { etiqueta } from '../domain/codigos';
import { estadoRevision, ordenarPartidas, pedidoEnCurso } from '../domain/revision';
import { useStore } from '../store/AppStore';
import styles from './CodigosCheatsheet.module.css';

async function alPortapapeles(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    /* sin permiso: vía antigua */
  }
  const ta = document.createElement('textarea');
  ta.value = texto;
  ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
  document.body.appendChild(ta);
  try {
    ta.select();
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    ta.remove();
  }
}

export function CodigosRevision() {
  const { revision } = useStore();
  const [copiado, setCopiado] = useState<string | null>(null);
  const pedido = revision ? pedidoEnCurso(revision) : null;
  if (!revision || !pedido) return null;

  const copiar = async (texto: string, marca: string) => {
    if (!(await alPortapapeles(texto))) return;
    setCopiado(marca);
    window.setTimeout(() => setCopiado((c) => (c === marca ? null : c)), 1400);
  };

  const boton = (texto: string, valor: string, marca: string, titulo: string, etiquetaLarga = false) => (
    <button
      type="button"
      className={`${styles.copiar} ${etiquetaLarga ? styles.copiarEtiqueta : ''} ${copiado === marca ? styles.copiado : ''}`}
      onClick={() => copiar(valor, marca)}
      title={titulo}
    >
      {copiado === marca ? '¡Copiado!' : texto}
    </button>
  );

  // Un código de otro pedido de la ronda que este pedido no tiene: "Producto incorrecto".
  const propios = new Set(pedido.partidas.map((x) => x.codigo));
  const ajenoDeRonda = revision.pedidos.flatMap((p) => p.partidas).find((x) => !propios.has(x.codigo));
  const escaneable = pedido.partidas.find((x) => !x.simplificada);

  return (
    <aside className={styles.panel} aria-label="Lecturas de la revisión">
      <header className={styles.header}>
        <span className={styles.badge}>Simulación</span>
        <h2 className={styles.title}>
          Pedido {pedido.letra} · {pedido.id}
        </h2>
        <p className={styles.subtitle}>Click para copiar y pegar en el lector de la revisión.</p>
        <ul className={styles.leyenda}>
          <li>
            <b>×N</b> (18 díg.) → etiqueta escaneada: suma N piezas.
          </li>
          <li>
            <b>Código</b> (7 díg.) → tecleado: "Ingreso manual no permitido", salvo en la revisión simplificada.
          </li>
          <li>
            <b>Simplificada</b>: cualquier lectura abre el contador.
          </li>
        </ul>
      </header>

      <div className={styles.lista}>
        {ordenarPartidas(pedido.partidas).map((x) => {
          const faltan = x.surtido - x.revisado;
          return (
            <article key={x.codigo} className={styles.ficha}>
              <div className={styles.fichaTop}>
                <span className={styles.codigoTitulo}>{x.codigo}</span>
                <div className={styles.marcas}>
                  {x.simplificada && <span className={styles.tipoMisc}>Simplificada</span>}
                  <span className={styles.total}>
                    {x.revisado} de {x.surtido}
                  </span>
                </div>
              </div>
              <p className={styles.descripcion}>{x.descripcion}</p>
              <div className={styles.botones}>
                {boton(x.codigo, x.codigo, `c-${x.codigo}`, 'Código de 7 dígitos (tecleado)')}
                {!x.simplificada && boton(`×1 · ${etiqueta(x.codigo, 1)}`, etiqueta(x.codigo, 1), `e1-${x.codigo}`, 'Etiqueta de 1 pieza', true)}
                {!x.simplificada &&
                  faltan > 1 &&
                  boton(`×${faltan} · ${etiqueta(x.codigo, faltan)}`, etiqueta(x.codigo, faltan), `en-${x.codigo}`, 'Etiqueta con lo que falta', true)}
              </div>
              {estadoRevision(x) === 'completo' && <p className={styles.destino}>Revisado completo.</p>}
            </article>
          );
        })}

        <article className={styles.ficha}>
          <div className={styles.fichaTop}>
            <span className={styles.codigoTitulo}>Para probar rechazos</span>
          </div>
          <div className={styles.botones}>
            {boton('Código inválido · 12345', '12345', 'inv', 'Lectura que no es código ni etiqueta')}
            {boton(`Fuera de la ronda · ${etiqueta('9999999', 1)}`, etiqueta('9999999', 1), 'aj', 'Producto incorrecto', true)}
            {ajenoDeRonda &&
              boton(
                `De otro pedido · ${etiqueta(ajenoDeRonda.codigo, 1)}`,
                etiqueta(ajenoDeRonda.codigo, 1),
                'otro',
                `${ajenoDeRonda.codigo} está en otro pedido de la ronda: Producto incorrecto`,
                true,
              )}
            {escaneable &&
              boton(
                `Sobrante · ${etiqueta(escaneable.codigo, escaneable.surtido + 1)}`,
                etiqueta(escaneable.codigo, escaneable.surtido + 1),
                'sob',
                'Más piezas de las surtidas: Escaneo sobrante',
                true,
              )}
          </div>
        </article>
      </div>
    </aside>
  );
}
