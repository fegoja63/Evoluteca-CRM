-- Objeciones sugeridas: de español de España a español de Latinoamérica.
-- Solo cambia los textos que el equipo NO editó (coinciden exacto con el original),
-- así se respetan las adaptaciones de cada tenant.

UPDATE "objeciones" SET respuesta = 'Claro… solo una cosa más: ¿qué va a cambiar en esos 3 meses que hoy no tengas ya?' WHERE respuesta = 'Vale… solo una cosa más: ¿qué va a cambiar en esos 3 meses que hoy no tienes ya?';
UPDATE "objeciones" SET "loQueNoDecir" = 'Listo, te escribo entonces.' WHERE "loQueNoDecir" = 'Vale, te aviso entonces.';
UPDATE "objeciones" SET "loQueNoDecir" = '¿O sea que no quieren resolver [problema]?' WHERE "loQueNoDecir" = '¿O sea que no queréis resolver [problema]?';
UPDATE "objeciones" SET respuesta = 'Entiendo. ¿Hay algo que cambiarías de lo que tienen hoy?' WHERE respuesta = 'Vale. ¿Hay algo que cambiarías de lo que tenéis ahora mismo?';
UPDATE "objeciones" SET "loQueNoDecir" = 'Te muestro algo mejor y vemos cómo salir del contrato.' WHERE "loQueNoDecir" = 'Te enseño algo mejor y vemos cómo salir del contrato.';
UPDATE "objeciones" SET "loQueNoDecir" = 'Nosotros somos muchísimo mejores en XYZ.' WHERE "loQueNoDecir" = 'Nosotros les damos mil vueltas en XYZ.';
UPDATE "objeciones" SET objecion = 'Mándame un correo' WHERE objecion = 'Mándame un email';
UPDATE "objeciones" SET respuesta = 'No quiero ser insistente si esto no es tu prioridad ahora… ¿te cuento primero por qué te llamé, y luego tú decides si vale la pena que te llene el correo?' WHERE respuesta = 'No quiero ser pesado si esto no es tu prioridad ahora… ¿te cuento antes por qué llamé, y luego tú decides si vale la pena que te llene el correo?';
UPDATE "objeciones" SET "loQueNoDecir" = 'Listo, te lo mando después de la llamada.' WHERE "loQueNoDecir" = 'Vale, te lo mando después de la llamada.';
UPDATE "objeciones" SET respuesta = 'Entiendo. Antes de colgar… ¿[problema] es prioridad en este momento? Si no, ¿cuál lo es?' WHERE respuesta = 'Lo pillo. Antes de colgar… ¿[problema] es prioridad ahora mismo? Si no, ¿cuál lo es?';
UPDATE "objeciones" SET "loQueNoDecir" = 'Te muestro qué podrías haber hecho diferente.' WHERE "loQueNoDecir" = 'Te enseño qué podrías haber hecho distinto.';
UPDATE "objeciones" SET objecion = '¿En qué se diferencian de [competidor]?' WHERE objecion = '¿En qué os diferenciáis de [competidor]?';
UPDATE "objeciones" SET "loQueNoDecir" = 'Impacta en tu estado de resultados.' WHERE "loQueNoDecir" = 'Impacta en tu cuenta de resultados.';
UPDATE "objeciones" SET respuesta = 'Perfecto. Solo para tenerlo claro… ¿qué es lo que te tiene tranquilo con cómo va todo ahora?' WHERE respuesta = 'Vale. Solo para tenerlo claro… ¿qué es lo que te tiene tranquilo con cómo va todo ahora?';
UPDATE "objeciones" SET "loQueNoDecir" = 'Bueno… ¿pero has pensado en…?' WHERE "loQueNoDecir" = 'Vale… ¿pero has pensado en…?';
UPDATE "objeciones" SET objecion = 'En este momento estoy muy ocupado' WHERE objecion = 'Ahora mismo ando muy liado';
UPDATE "objeciones" SET respuesta = 'Lo entiendo. ¿Hay un mejor momento, o prefieres que te mande algo rápido por correo?' WHERE respuesta = 'Lo entiendo. ¿Hay mejor momento, o prefieres que te mande algo rápido por email?';
UPDATE "objeciones" SET "loQueNoDecir" = 'Te llamo más tarde.' WHERE "loQueNoDecir" = 'Te llamo luego.';
UPDATE "objeciones" SET respuesta = 'Me alegra que les funcione. ¿Te interesaría ver otras opciones solo para comparar antes de renovar?' WHERE respuesta = 'Me alegra que os funcione. ¿Te apetece ver otras opciones solo para comparar antes de renovar?';
UPDATE "objeciones" SET "loQueNoDecir" = 'Ellos están bien, pero nosotros somos mejores en XYZ.' WHERE "loQueNoDecir" = 'Ellos bien, pero nosotros mejor en XYZ.';
