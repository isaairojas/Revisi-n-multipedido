/**
 * Catálogo de escenarios de la demo de revisión multipedido para QA: de la finalización del surtido de la ronda al
 * cierre de la tarea 35. Tiene dos partes:
 * - La finalización del surtido: un caso por escenario de las specs de exodus-gtm-pwa (`sdd/changes/`) que están en
 *   `tests/alineacion/alcance-revision.json`, con la semilla que lo prepara, los pasos y el resultado esperado (el THEN
 *   del escenario). Lo vigila `tests/domain/alineacion.test.mjs`. El resto del surtido vive en la demo de surtido
 *   multipedido (https://github.com/isaairojas/HH-Surtido-Multiorden).
 * - La revisión (tarea 34) y la facturación y el embarque (tarea 35): propuesta sin spec, con las reglas R1–R27 del
 *   intent local `docs/REVISION-MULTIPEDIDO-INTENT.md`.
 *
 * Los datos son los de la spec (`src/mocks/ronda.ts`): ronda G-500 con 1001 (A) y 1003 (C), del mismo
 * cliente, y 1002 (B). Se escanean 0486600 y 1365800 (etiqueta de 18 dígitos); los demás son misceláneos (se
 * teclea el código y se captura la cantidad). 9999999 no está en la ronda.
 *
 * `extra`: regla escrita en el requisito que no tiene escenario propio en la spec.
 *
 * Etiqueta única: los QR de la demo (E1, E2…) los genera `qrEtiquetaUnica`; el servicio de etiqueta única se simula
 * (da por buena toda etiqueta que no se haya escaneado ya). Guía por voz: se oye con la voz del navegador y se ve
 * como subtítulo "Voz". Lo que la HH manda al servidor no se ve en la demo: los casos solo describen lo que se ve.
 */
import { etiqueta } from '../domain/codigos';

export type CambioId = 'listado' | 'revision' | 'facturacion' | 'fallas';

/**
 * En el orden del flujo: finalizar el surtido, revisar la ronda (34), facturar y embarcar (35) y, al final, las fallas y
 * validaciones de la revisión y la facturación. Simplificación del 2026-11-26 (demo para el usuario final): del surtido
 * solo queda la ronda de 3 pedidos con todo surtido; los avisos y fallas al finalizar el surtido y los pedidos retenidos
 * o cancelados durante el surtido salieron del catálogo (`tests/alineacion/fuera-demo-usuario.json`).
 */
export const CAMBIOS: { id: CambioId; titulo: string; carpeta: string }[] = [
  { id: 'listado', titulo: 'Finalizar el surtido de la ronda', carpeta: '2026-10-26-multipedido-surtido-listado' },
  // Propuesta sin spec (2026-11-25): sus casos siguen las reglas R1–R27 del intent local (el número va en `R(n, …)`).
  { id: 'revision', titulo: 'Revisión de la ronda', carpeta: 'docs/REVISION-MULTIPEDIDO-INTENT.md' },
  { id: 'facturacion', titulo: 'Facturación y embarque', carpeta: 'docs/REVISION-MULTIPEDIDO-INTENT.md' },
  { id: 'fallas', titulo: 'Fallas y validaciones', carpeta: 'docs/REVISION-MULTIPEDIDO-INTENT.md' },
];

export type Codigo = { etiqueta: string; valor: string };

export type Caso = {
  id: string;
  cambio: CambioId;
  requisito: string;
  /** Nombre exacto del escenario en el spec. */
  escenario: string;
  /** Semilla de `escenarios.ts` y pantalla (hash) donde arranca. */
  semilla?: string;
  ruta?: string;
  pasos: string[];
  esperado: string;
  /** Lecturas listas para copiar y pegar en el lector. */
  codigos?: Codigo[];
  extra?: boolean;
  /**
   * Caso de una propuesta que todavía no tiene spec (revisión multipedido): `requisito` y `escenario` son los del
   * intent local y `alineacion.test.mjs` no los compara con la foto de las specs.
   */
  propuesta?: boolean;
};

const c = (valor: string, texto?: string): Codigo => ({ etiqueta: texto ?? valor, valor });
const e18 = (codigo: string, n: number): Codigo => ({ etiqueta: `${n} ${n === 1 ? 'pieza' : 'piezas'} de ${codigo}`, valor: etiqueta(codigo, n) });

const ESCANEA = (codigo: string, n: number) =>
  `Pega ${codigo} en el lector (o tócalo en ⌨ y tecléalo), captura ${n} y acepta.`;

/** Finalización del surtido: solo la ronda de 3 pedidos con todo surtido (alcance en `tests/alineacion/alcance-revision.json`). */
const CASOS_FINALIZAR: Caso[] = [
  {
    id: 'finalizar-ronda-3',
    cambio: 'listado',
    requisito: 'Finalizar el surtido del pedido',
    escenario: 'Finalizar una ronda de 3 pedidos',
    semilla: 'revision-fin-surtido',
    ruta: '/surtido',
    pasos: ['Los pedidos A y B ya están surtidos y al C solo le falta 2010000.', ESCANEA('2010000', 1), 'En "Finalizar surtido" toca ✓.'],
    esperado:
      'Sale "Surtido finalizado" y la Asignación de tareas muestra la revisión de la misma ronda ("REVISAR PEDIDO CLIENTE" G-500) con los pedidos A · 1001, B · 1002 y C · 1003 por revisar.',
    codigos: [c('2010000')],
  },
];

/* ================= Revisión multipedido · propuesta sin spec (docs/REVISION-MULTIPEDIDO-INTENT.md) ================= */
/** Regla del intent (Rn): el número queda en el código para rastrearla; en pantalla solo se ve el título. */
const R = (_n: number, titulo: string) => titulo;
const ACEPTA_TAREA = 'En Asignación de tareas toca ✓ (Aceptar).';
const CASOS_REVISION: Caso[] = [
  {
    id: 'rev-recorrido',
    cambio: 'revision',
    requisito: R(4, 'Un pedido a la vez en el orden del surtido'),
    escenario: 'La revisión abre el primer pedido de la ronda',
    semilla: 'revision-tareas',
    ruta: '/tareas',
    pasos: [ACEPTA_TAREA],
    esperado:
      'Se abre "Revisión de pedido" con "Ronda G-500 · Pedido 1 de 3", la letra A junto a "Pedido 1001" en "Avance de la revisión" (0 %) y solo los productos de 1001: 0486600, 1365800, 1394010 y 2389475.',
    propuesta: true,
  },
  {
    id: 'rev-escaneo',
    cambio: 'revision',
    requisito: R(12, 'Escaneo dentro del pedido'),
    escenario: 'Escanear una etiqueta suma lo revisado',
    semilla: 'revision',
    ruta: '/revision',
    pasos: ['Pega la etiqueta de 11 piezas de 0486600.'],
    esperado: 'Beep de acierto; 0486600 queda en 11 con el chip verde y la fila marcada en azul claro; el avance sube.',
    codigos: [e18('0486600', 11), e18('0486600', 1)],
    propuesta: true,
  },
  {
    id: 'rev-errores',
    cambio: 'fallas',
    requisito: 'Revisión', // R12
    escenario: 'Rechazos del escaneo',
    semilla: 'revision',
    ruta: '/revision',
    pasos: [
      'Pega "12345" → "Código inválido".',
      'Pega la etiqueta de 9999999 → "Producto incorrecto".',
      'Pega la etiqueta de 2012000 (está en B y C, no en A) → "Producto incorrecto".',
      'Teclea 0486600 (7 dígitos) → "Ingreso manual no permitido".',
      'Pega la etiqueta de 12 piezas de 0486600 → "Escaneo sobrante".',
    ],
    esperado: 'Cada lectura suena el beep de error y muestra su toast rojo; lo revisado no cambia.',
    codigos: [c('12345', 'Código inválido'), e18('9999999', 1), e18('2012000', 1), c('0486600', '0486600 tecleado'), e18('0486600', 12)],
    propuesta: true,
  },
  {
    id: 'rev-simplificada',
    cambio: 'revision',
    requisito: R(13, 'Revisión simplificada'),
    escenario: 'Un misceláneo se revisa con el contador',
    semilla: 'revision',
    ruta: '/revision',
    pasos: ['Pega 1394010.', 'En "Revisión simplificada de producto" deja 4 y toca ✓.', 'Vuelve a pegar 1394010.'],
    esperado:
      'El contador arranca en lo surtido (4); al confirmar, 1394010 queda en 4 con chip verde. La segunda vez el modal muestra "Cantidad revisada previamente:".',
    codigos: [c('1394010')],
    propuesta: true,
  },
  {
    id: 'rev-detalle',
    cambio: 'revision',
    requisito: R(14, 'Detalle del producto'),
    escenario: 'Confirmar y cancelar la revisión desde el detalle',
    semilla: 'revision',
    ruta: '/revision',
    pasos: ['Toca la fila de 2389475 (simplificada) → "Confirmar revisión".', 'Toca otra vez 2389475 → "Cancelar revisión".', 'Toca la fila de 0486600 (sin revisar).'],
    esperado:
      '2389475 queda en 2 y luego regresa a 0. En 0486600 se ven "Surtido" y "Revisado" de solo lectura y "Cancelar revisión" inhabilitado.',
    propuesta: true,
  },
  {
    id: 'rev-siguiente',
    cambio: 'revision',
    requisito: R(7, 'Paso entre pedidos con aviso y palomita'),
    escenario: 'Al finalizar un pedido se abre el siguiente',
    semilla: 'revision-a-casi',
    ruta: '/revision',
    pasos: ['A solo le falta 1365800: pega su etiqueta de 1 pieza.', 'En "Finalizar revisión" (Revisión sin diferencias) toca ✓.', 'En el aviso toca ✓.'],
    esperado:
      'Aviso "Pedido A revisado": "Terminaste la revisión del pedido 1001" y "Continúa con B · Pedido 1002 · 51077 · REFACCIONARIA LA ÚNICA". Con ✓ se abre la revisión de 1002 con "Pedido 2 de 3" y la letra B.',
    codigos: [e18('1365800', 1)],
    propuesta: true,
  },
  {
    id: 'rev-ultimo',
    cambio: 'revision',
    requisito: R(8, 'Último pedido de la ronda'),
    escenario: 'Al finalizar el último pedido se regresa a la asignación',
    semilla: 'revision-c-ultimo',
    ruta: '/revision',
    pasos: ['A C (Pedido 3 de 3) solo le falta 2010000: pégalo y confirma 1 con ✓.', 'En "Finalizar revisión" toca ✓.'],
    esperado:
      'Toast "Revisión finalizada" y la Asignación de tareas muestra, sin cortes, la tarea 35 "FACTURAR Y EMBARCAR PEDIDO" de la misma G-500 con A, B y C "Por facturar" (ver el grupo "Facturación y embarque de la ronda").',
    codigos: [c('2010000')],
    propuesta: true,
  },
  {
    id: 'rev-salir-retomar',
    cambio: 'revision',
    requisito: R(10, 'Salir y retomar'),
    escenario: 'Salir pierde el avance del pedido en curso y al retomar solo quedan los que faltan',
    semilla: 'revision-retomar',
    ruta: '/revision',
    pasos: ['Estás en B (Pedido 2 de 3) con 2 de 5 de 0486600.', 'Toca la flecha "Menú".', ACEPTA_TAREA],
    esperado:
      'La asignación muestra "2 de 3 pedidos por revisar", A · 1001 "Revisado" y B, C "Por revisar". Al aceptar se abre B otra vez en 0 % (el avance de B se perdió, como hoy).',
    propuesta: true,
  },
  {
    id: 'rev-sin-b',
    cambio: 'revision',
    requisito: R(5, 'Solo los pedidos surtidos en la ronda'),
    escenario: 'Un pedido retirado en el surtido no entra y las letras no cambian',
    semilla: 'revision-sin-b',
    ruta: '/tareas',
    pasos: ['B (1002) se retiró de la ronda durante el surtido.', ACEPTA_TAREA],
    esperado:
      'La tarea lista Contenedor A · 1001 y Contenedor C · 1003. La revisión abre A con "Pedido 1 de 2"; después sigue C (con su letra C), "Pedido 2 de 2".',
    propuesta: true,
  },
  {
    id: 'rev-b-negado',
    cambio: 'revision',
    requisito: R(5, 'Solo los pedidos surtidos en la ronda'),
    escenario: 'Un pedido negado por completo no entra',
    semilla: 'revision-b-negado',
    ruta: '/tareas',
    pasos: ['Todas las partidas de B (1002) se negaron en el surtido.'],
    esperado: 'La tarea de revisión solo lista Contenedor A · 1001 y Contenedor C · 1003.',
    propuesta: true,
  },
  {
    id: 'rev-discrepancias',
    cambio: 'revision',
    requisito: R(16, 'Finalizar manual desde el menú'),
    escenario: 'Gestor de discrepancias: marcar parcialidad y negar',
    semilla: 'revision-discrepancias',
    ruta: '/revision',
    pasos: [
      'Toca ⋮ → "Finalizar revisión".',
      'En "Gestor discrepancias" de 0486600 (8 de 11, diferencia −3) toca "Marcar parcialidad", elige un motivo y ✓.',
      'En 1365800 (0 de 1) toca "Negar", elige un motivo y ✓.',
      'En "Finalizar revisión" toca ✓.',
    ],
    esperado:
      'Las discrepancias salen una por una; al terminar, "Finalizar revisión" sin la leyenda "Revisión sin diferencias". Al confirmar, aviso "Pedido A revisado" y sigue B. "Regresar" después de negar pregunta "¿Regresar a revisión?" y restablece lo negado.',
    propuesta: true,
  },
  {
    id: 'rev-promocion',
    cambio: 'revision',
    requisito: R(16, 'Finalizar manual desde el menú'),
    escenario: 'Una promoción incompleta bloquea el cierre',
    semilla: 'revision-promocion',
    ruta: '/revision',
    pasos: ['El Kit afinación de A lleva 0486600 en 5 de 11.', 'Toca ⋮ → "Finalizar revisión".'],
    esperado: '"No es posible finalizar este pedido" con "Códigos de la promoción": 0486600 5 de 11 y 2389475 2 de 2. Solo se puede cerrar (✕).',
    propuesta: true,
  },
  {
    id: 'rev-corporativo',
    cambio: 'revision',
    requisito: R(16, 'Finalizar manual desde el menú'),
    escenario: 'Corporativo incompleto: se saca de la ronda y se sigue con el siguiente',
    semilla: 'revision-corporativo',
    ruta: '/revision',
    pasos: ['B (1002) es corporativo con orden de compra y está incompleto.', 'Toca ⋮ → "Finalizar revisión".', 'En "¿Deseas sacar el pedido de la ronda?" toca ✓.'],
    esperado: 'Aviso "Pedido B retirado de la ronda" con "Continúa con C · Pedido 1003". Con ✓ se abre C, "Pedido 3 de 3".',
    propuesta: true,
  },
  {
    id: 'rev-falla-red',
    cambio: 'fallas',
    requisito: 'Revisión', // R17
    escenario: 'Reintentar sin avanzar al siguiente pedido',
    semilla: 'revision-falla-red',
    ruta: '/revision',
    pasos: ['Pega la etiqueta de 1365800 y confirma "Finalizar revisión" con ✓.', 'En "Tarea incompleta" toca "Reintentar".'],
    esperado: 'La primera vez sale "Tarea incompleta" (error de red) y se queda en A. Con "Reintentar" se envía y sale el aviso para seguir con B.',
    codigos: [e18('1365800', 1)],
    propuesta: true,
  },
  {
    id: 'rev-sin-bandera',
    cambio: 'fallas',
    requisito: 'Revisión', // R3
    escenario: 'La sucursal todavía no revisa varios pedidos en la HH',
    semilla: 'revision-sin-bandera',
    ruta: '/tareas',
    pasos: [ACEPTA_TAREA],
    esperado:
      '"Tarea incompleta": "Esta tarea aún no ha sido finalizada en Exodus Sucursales. Por favor, conclúyela desde ese sistema para poder continuar."',
    propuesta: true,
  },
  {
    id: 'rev-no-surtida',
    cambio: 'fallas',
    requisito: 'Revisión', // R2
    escenario: 'La orden no está surtida',
    semilla: 'revision-no-surtida',
    ruta: '/tareas',
    pasos: [ACEPTA_TAREA],
    esperado: '"No es posible iniciar esta tarea": "La orden no se encuentra surtida, es necesario que se surta para poder revisarla."',
    propuesta: true,
  },
  {
    id: 'rev-iniciada-en-otro',
    cambio: 'fallas',
    requisito: 'Revisión', // R2
    escenario: 'La revisión se inició desde Exodus Sucursales',
    semilla: 'revision-iniciada-en-otro',
    ruta: '/tareas',
    pasos: [ACEPTA_TAREA, 'Toca ✓ para continuar en este dispositivo.'],
    esperado:
      '"Tarea iniciada previamente" pregunta si se continúa en este dispositivo; con ✓ se abre la revisión de A, con ✕ se queda en la asignación.',
    propuesta: true,
  },
];

/* ============ Facturación y embarque de la ronda · tarea 35 · propuesta sin spec (R18–R27) ============ */
const GENERA = 'Toca "Generar factura" (espera "Generando factura…").';
const CASOS_FACTURACION: Caso[] = [
  {
    id: 'fac-desde-revision',
    cambio: 'facturacion',
    requisito: R(18, 'Orden de tareas: revisión de toda la ronda y luego la 35'),
    escenario: 'Al cerrar la revisión de la ronda queda cargada la tarea 35',
    semilla: 'facturacion-desde-revision',
    ruta: '/revision',
    pasos: ['A C (Pedido 3 de 3) solo le falta 2010000: pégalo y confirma 1 con ✓.', 'En "Finalizar revisión" toca ✓.'],
    esperado:
      'Toast "Revisión finalizada" y la Asignación de tareas muestra "FACTURAR Y EMBARCAR PEDIDO" de la misma G-500 con Contenedor A · 1001, B · 1002 y C · 1003 "Por facturar".',
    codigos: [c('2010000')],
    propuesta: true,
  },
  {
    id: 'fac-flujo-completo',
    cambio: 'facturacion',
    requisito: R(18, 'Orden de tareas: revisión de toda la ronda y luego la 35'),
    escenario: 'Recorrido completo: surtido, revisión, facturación y embarque',
    semilla: 'flujo-completo',
    ruta: '/surtido',
    pasos: [
      'Termina el surtido (a C le falta 2010000: pégalo, captura 1, acepta y confirma con ✓).',
      'Revisa A, B y C (usa las lecturas del panel izquierdo) y confirma el paso entre pedidos.',
      'Toma la tarea 35 y factura y embarca A, B y C.',
    ],
    esperado: 'Las tres tareas de la G-500 se hacen seguidas en la HH; al terminar el último embarque la asignación muestra la G-501.',
    codigos: [c('2010000')],
    propuesta: true,
  },
  {
    id: 'fac-traspaso',
    cambio: 'facturacion',
    requisito: R(18, 'Orden de tareas: revisión de toda la ronda y luego la 35'),
    escenario: 'Un traspaso de la ronda no se factura',
    semilla: 'facturacion-con-traspaso',
    ruta: '/revision',
    pasos: ['B (1002) es un traspaso. A y B ya se revisaron; a C le falta 2010000: pégalo, confirma 1 con ✓ y finaliza con ✓.'],
    esperado:
      'La tarea 35 de la G-500 solo lista Contenedor A · 1001 y Contenedor C · 1003 (pedidos de cliente): el traspaso no se mezcla con la facturación. Se facturan y embarcan A y C por separado ("Pedido 1 de 2", "Pedido 2 de 2").',
    codigos: [c('2010000')],
    propuesta: true,
  },
  {
    id: 'fac-recorrido',
    cambio: 'facturacion',
    requisito: R(19, 'Un pedido a la vez dentro de la tarea 35'),
    escenario: 'La tarea 35 abre la factura del primer pedido',
    semilla: 'facturacion-tareas',
    ruta: '/tareas',
    pasos: ['En Asignación de tareas toca ✓ (Aceptar).'],
    esperado:
      '"Datos de la factura" de 1001 con "Ronda G-500 · Pedido 1 de 3" y la letra A, el total, los siete campos de solo lectura (la dirección de entrega no se puede cambiar) y "Impresión · Copias".',
    propuesta: true,
  },
  {
    id: 'fac-generar',
    cambio: 'facturacion',
    requisito: R(22, 'Generar factura'),
    escenario: 'Factura generada y timbrada',
    semilla: 'facturacion',
    ruta: '/facturacion',
    pasos: [GENERA],
    esperado: 'Toast "Imprimiendo factura" y el formulario muestra "Folio factura 1099204" con "Reimprimir factura" y "Continuar a embarque".',
    propuesta: true,
  },
  {
    id: 'fac-error',
    cambio: 'fallas',
    requisito: 'Facturación y embarque', // R22
    escenario: 'Error al generar la factura',
    semilla: 'facturacion-error',
    ruta: '/facturacion',
    pasos: [GENERA, 'Vuelve a tocar "Generar factura".'],
    esperado: 'La primera vez sale el toast "Error al generar la factura" y el formulario queda igual; el reintento factura.',
    propuesta: true,
  },
  {
    id: 'fac-sin-timbrar',
    cambio: 'fallas',
    requisito: 'Facturación y embarque', // R23
    escenario: 'La factura se crea sin timbrar y se puede reintentar el timbrado',
    semilla: 'facturacion-sin-timbrar',
    ruta: '/facturacion',
    pasos: [GENERA, 'En "Factura sin timbrar" toca "Continuar a impresión".', 'Toca "Reintentar timbrado".'],
    esperado:
      'Modal "Factura sin timbrar"; después el folio con "Timbrado: Pendiente" y "Reintentar timbrado". Al reintentar: "Timbrando factura…" y toast "Factura timbrada". También se puede reimprimir o continuar al embarque sin timbrar.',
    propuesta: true,
  },
  {
    id: 'fac-impresora-no-configurada',
    cambio: 'fallas',
    requisito: 'Facturación y embarque', // R24
    escenario: 'Impresora no configurada',
    semilla: 'facturacion-impresora-no-configurada',
    ruta: '/facturacion',
    pasos: ['Toca "Reimprimir factura".'],
    esperado: 'Toast "Impresora no configurada": "No podrás imprimir hasta que asignes una impresora a este proceso."',
    propuesta: true,
  },
  {
    id: 'fac-impresora-sin-conexion',
    cambio: 'fallas',
    requisito: 'Facturación y embarque', // R24
    escenario: 'Impresora sin conexión',
    semilla: 'facturacion-impresora-sin-conexion',
    ruta: '/facturacion',
    pasos: ['Toca "Reimprimir factura".'],
    esperado: 'Toast rojo "Impresora sin conexión". La factura no cambia.',
    propuesta: true,
  },
  {
    id: 'emb-nuevo',
    cambio: 'facturacion',
    requisito: R(25, 'Embarque compatible: mismo cliente y misma dirección'),
    escenario: 'Sin embarque compatible se crea uno nuevo',
    semilla: 'embarque-nuevo',
    ruta: '/facturacion',
    pasos: ['Toca "Continuar a embarque".', 'Elige una paquetería, escribe un comentario y toca ✓.', 'En "Embarque creado" toca ✓.', 'En el aviso toca ✓.'],
    esperado:
      '"Nuevo embarque" con ✓ inhabilitado hasta llenar paquetería y comentario. Toast "Factura ligada al embarque", "Embarque creado · No. de embarque 147707" y aviso "Pedido A facturado y embarcado · Continúa con B · Pedido 1002".',
    propuesta: true,
  },
  {
    id: 'emb-otra-direccion',
    cambio: 'facturacion',
    requisito: R(25, 'Embarque compatible: mismo cliente y misma dirección'),
    escenario: 'Un embarque del mismo cliente en otra dirección no es compatible',
    semilla: 'embarque-otra-direccion',
    ruta: '/facturacion',
    pasos: ['48213 ya tiene el embarque 147655 activo en otra dirección.', 'Toca "Continuar a embarque".'],
    esperado: 'Sale "Nuevo embarque" ("No existe un embarque activo para este cliente"): el 147655 no se ofrece.',
    propuesta: true,
  },
  {
    id: 'emb-previo',
    cambio: 'facturacion',
    requisito: R(25, 'Embarque compatible: mismo cliente y misma dirección'),
    escenario: 'Embarque activo previo del cliente: agregar o generar nuevo',
    semilla: 'embarque-previo-b',
    ruta: '/facturacion',
    pasos: ['B (1002) está facturado y 51077 tiene el embarque 147650 activo en su dirección.', 'Toca "Continuar a embarque" y luego "Agregar existente".', 'Toca ✓.'],
    esperado:
      '"Agregar embarque": "Existe 1 embarque activo para este mismo cliente". El selector trae 147650 preseleccionado con su paquetería y comentario. Resultado "Factura agregada · 147650 (2 facturas)".',
    propuesta: true,
  },
  {
    id: 'emb-mismo-cliente-ronda',
    cambio: 'facturacion',
    requisito: R(27, 'Paso entre pedidos y cierre de la tarea 35'),
    escenario: 'C se agrega al embarque de A y la tarea 35 se cierra',
    semilla: 'embarque-c-mismo-cliente',
    ruta: '/facturacion',
    pasos: [
      'A (147707) y B (147708) ya están embarcados; C está facturado.',
      'Toca "Continuar a embarque" → "Agregar existente" → ✓ → ✓.',
      'Toca "Regresar a tareas".',
    ],
    esperado:
      'Solo se ofrece 147707 (el de A: mismo cliente 48213 y misma dirección). "Factura agregada · 147707 (2 facturas)", el formulario muestra "No. de embarque 147707" y "Regresar a tareas" cierra con el toast "Factura y embarque finalizados" y la G-501.',
    propuesta: true,
  },
  {
    id: 'emb-falla-ligar',
    cambio: 'fallas',
    requisito: 'Facturación y embarque', // R26
    escenario: 'Falla al ligar la factura al embarque',
    semilla: 'embarque-falla-ligar',
    ruta: '/facturacion',
    pasos: ['Toca "Continuar a embarque", llena paquetería y comentario y toca ✓.', 'Repite.'],
    esperado: 'La primera vez sale el toast "Se produjo un error" y se queda en la factura; al repetir se crea el embarque.',
    propuesta: true,
  },
  {
    id: 'fac-retomar',
    cambio: 'facturacion',
    requisito: R(27, 'Paso entre pedidos y cierre de la tarea 35'),
    escenario: 'Retomar con un pedido facturado sin embarque',
    semilla: 'facturacion-retomar',
    ruta: '/tareas',
    pasos: ['En Asignación de tareas toca ✓ (Aceptar).'],
    esperado:
      'La tarea muestra A "Embarcado", B "Facturado, sin embarque" y C "Por facturar". Se abre B ("Pedido 2 de 3") ya facturado, con "Continuar a embarque".',
    propuesta: true,
  },
  {
    id: 'fac-sin-bandera',
    cambio: 'fallas',
    requisito: 'Facturación y embarque', // R20
    escenario: 'La sucursal todavía no factura en la HH',
    semilla: 'facturacion-sin-bandera',
    ruta: '/tareas',
    pasos: ['En Asignación de tareas toca ✓ (Aceptar).'],
    esperado: '"Tarea incompleta": la tarea se concluye en Exodus Sucursales.',
    propuesta: true,
  },
  {
    id: 'fac-concluida-en-otro',
    cambio: 'fallas',
    requisito: 'Facturación y embarque', // R20
    escenario: 'La tarea 35 ya se finalizó en otro sistema',
    semilla: 'facturacion-concluida-en-otro',
    ruta: '/tareas',
    pasos: ['En Asignación de tareas toca ✓ (Aceptar).'],
    esperado: 'Toast "Tarea finalizada": "Ya se facturó y embarcó el pedido correctamente desde otro sistema." y la asignación muestra la G-501.',
    propuesta: true,
  },
];

/** En el orden de los grupos (las fallas van al final), para que "Anterior / Siguiente" siga la lista. */
const ORDEN = CAMBIOS.map((x) => x.id);
export const CASOS: Caso[] = [...CASOS_FINALIZAR, ...CASOS_REVISION, ...CASOS_FACTURACION].sort(
  (a, b) => ORDEN.indexOf(a.cambio) - ORDEN.indexOf(b.cambio),
);

export const casoPorId = (id: string | null) => (id ? CASOS.find((x) => x.id === id) : undefined);

/** Liga de un caso: la semilla va en la query y la pantalla en el hash. */
export function urlCaso(x: Caso): string {
  return `?escenario=${x.semilla}&caso=${x.id}#${x.ruta}`;
}

