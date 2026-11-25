/**
 * Foto del producto con la imagen por defecto si no carga (2389475 no tiene foto en el catálogo), como la fila del
 * surtido (`ProductoRondaRow`). `ProductSummary` no expone `onError`, por eso se resuelve antes de pasarle la ruta.
 */
import { useEffect, useState } from 'react';
import sinImagen from '@assets/productos/producto-sin-imagen.svg';

export const FOTO_POR_DEFECTO = sinImagen;

export function useFoto(src: string): string {
  const [rota, setRota] = useState(false);
  useEffect(() => {
    setRota(false);
    const img = new Image();
    img.onerror = () => setRota(true);
    img.src = src;
  }, [src]);
  return rota ? sinImagen : src;
}
