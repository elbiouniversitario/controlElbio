import React from 'react';
import { createPortal } from 'react-dom';

/**
 * Ventana flotante con algo para imprimir (planilla, acta, recibo, cartel).
 * Va directo en <body>: al imprimir se oculta el resto de la app y sale una
 * sola hoja (ver .portal-impresion en index.css). Adentro, el bloque a
 * imprimir lleva la clase .area-impresion.
 */
export const VentanaImprimible: React.FC<{ className: string; children: React.ReactNode }> = ({ className, children }) =>
  createPortal(<div className={`portal-impresion ${className}`}>{children}</div>, document.body);
