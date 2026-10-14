-- Objeciones sugeridas: dos respuestas que quedaron tratando de "tú" pasan a "usted".
-- Solo cambia los textos que el equipo NO editó.

UPDATE "objeciones" SET respuesta = 'Entiendo. ¿Hay algo que cambiaría de lo que tienen hoy?' WHERE respuesta = 'Entiendo. ¿Hay algo que cambiarías de lo que tienen hoy?';
UPDATE "objeciones" SET respuesta = 'Se mueve entre A y B, según lo que necesite. ¿Encaja con lo que esperaba o no?' WHERE respuesta = 'Se mueve entre A y B, según lo que necesite. ¿Encaja con lo que esperabas o no?';
