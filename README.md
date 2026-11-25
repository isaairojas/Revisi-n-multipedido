# Revisión multipedido — demo de la HH

Demo web de la HandHeld para la ronda multipedido V2, **de la finalización del surtido al cierre de la tarea 35**:

1. **Finalizar el surtido** de la ronda (último producto, avisos al finalizar, sacar un corporativo, promociones
   incompletas, pedidos cancelados y fallas al guardar).
2. **Revisión** (tarea 34): cada pedido de la ronda se revisa uno tras otro, en el orden del surtido (A, B, C).
3. **Facturación y embarque** (tarea 35): cada pedido de cliente se factura y se embarca por separado; los traspasos no
   se facturan.

El surtido (toma de tarea, escaneo, negar, corregir, imagen y familia) y el simulador del armado de la ronda están en la
[demo de surtido multipedido](https://github.com/isaairojas/HH-Surtido-Multiorden).

> La revisión, la facturación y el embarque son una **propuesta para validar con negocio**: todavía no tienen spec. La
> finalización del surtido sigue las specs de surtido multipedido V2.

## Abrir la demo

- GitHub Pages: https://isaairojas.github.io/Revisi-n-multipedido/
- En datos móviles: https://raw.githack.com/isaairojas/Revisi-n-multipedido/demo/index.html

Sin escenario en la liga, la demo arranca en el último producto del surtido de la ronda G-500 y sigue sin cortes con la
revisión, la facturación y el embarque. El panel de la derecha tiene todos los escenarios, con sus pasos y el resultado
esperado; el de la izquierda, las lecturas para pegar en el lector.

## Desarrollo

```bash
npm ci
npm run dev          # http://localhost:5182
npm run test:domain  # reglas del dominio, semillas y alineación con las specs
npm run build
```

Cada push a `main` publica la demo en GitHub Pages y en la rama `demo` (para githack).
