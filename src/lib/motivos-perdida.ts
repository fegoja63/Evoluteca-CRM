// Motivos de pérdida estándar que ofrece el CRM al marcar una oportunidad como
// perdida (misma lista que usa la ficha del negocio). Se centraliza aquí para
// poder ofrecerlos también al asociar una objeción a un motivo en la Guía de
// objeciones. El tenant puede además tener motivos propios (texto libre), que se
// suman a estos donde aplique.
export const MOTIVOS_PERDIDA = [
  "Precio muy alto",
  "Eligió a la competencia",
  "El evento fue cancelado",
  "Sin respuesta del cliente",
  "Presupuesto insuficiente",
  "Fuera de fechas disponibles",
  "Otro",
];
