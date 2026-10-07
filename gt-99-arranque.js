// ═══════════════════════════════════════════════════════════
//  ARRANQUE — SIEMPRE el último archivo en cargarse (v3.0.0)
//  Estas tres líneas antes estaban sueltas dentro del código y se
//  ejecutaban al leerse el archivo. Ahora que el código está en varios
//  archivos, deben correr cuando TODOS ya cargaron; por eso viven aquí.
//  No cambies el orden de estas líneas.
// ═══════════════════════════════════════════════════════════
iniciarApp();

rangoRapido("hoy"); // por defecto al cargar la pantalla de Reportes

horRangoRapido("semana"); // rango por defecto del Corte semanal del Horómetro
