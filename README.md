# Club Elbio Fernández — Gestión LUD

Sistema de gestión deportiva del Club Elbio Fernández para la Liga Universitaria de Deportes: fichas médicas, tesorería y cuotas, planilla de partido y convocatorias.

Stack: React 19 + TypeScript + Vite + Tailwind CSS 4.

## Correr en local

Requisitos: Node.js 20 o superior.

```bash
npm install
npm run dev      # http://localhost:3000
```

Otros comandos:

- `npm run build` genera la versión de producción en `dist/`
- `npm run lint` corre el chequeo de tipos de TypeScript

## Pantallas

- **Alertas y vencimientos**: carnés de salud por vencer, reglas de aviso automático y envíos por WhatsApp
- **Tesorería y cuotas**: estado de pago por jugador, registro de cobros y recordatorios
- **Planilla (DT)**: titulares, suplentes, bajas y PDF de planilla
- **Mi ficha**: perfil del jugador y confirmación de asistencia
- **Club admin**: roles y configuración general
- **Nuevo jugador**: alta de jugador paso a paso

## Estado actual

Los datos son de ejemplo (`src/data/initialData.ts`) y viven en memoria: se reinician al recargar la página.

## Próximos pasos

- Deploy en Vercel (ya incluye `vercel.json`)
- Base de datos en Supabase (variables en `.env.example`)
