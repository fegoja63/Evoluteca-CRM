-- Objeciones sugeridas: de español de España a español de Latinoamérica, tratando de "usted".
-- Solo cambia los textos que el equipo NO editó (coinciden exacto con el original),
-- así se respetan las adaptaciones de cada tenant.

UPDATE "objeciones" SET objecion = 'Escríbame en 3 meses' WHERE objecion = 'Escríbeme en 3 meses';
UPDATE "objeciones" SET respuesta = 'Claro… solo una cosa más: ¿qué va a cambiar en esos 3 meses que hoy no tenga ya?' WHERE respuesta = 'Vale… solo una cosa más: ¿qué va a cambiar en esos 3 meses que hoy no tienes ya?';
UPDATE "objeciones" SET "loQueNoDecir" = 'Listo, le escribo entonces.' WHERE "loQueNoDecir" = 'Vale, te aviso entonces.';
UPDATE "objeciones" SET "loQueNoDecir" = '¿O sea que no quieren resolver [problema]?' WHERE "loQueNoDecir" = '¿O sea que no queréis resolver [problema]?';
UPDATE "objeciones" SET respuesta = 'Entiendo. ¿Hay algo que cambiarías de lo que tienen hoy?' WHERE respuesta = 'Vale. ¿Hay algo que cambiarías de lo que tenéis ahora mismo?';
UPDATE "objeciones" SET "loQueNoDecir" = 'Le muestro algo mejor y vemos cómo salir del contrato.' WHERE "loQueNoDecir" = 'Te enseño algo mejor y vemos cómo salir del contrato.';
UPDATE "objeciones" SET respuesta = 'Es buena herramienta, sobre todo para ABC. ¿Le cuento 3 cosas en las que somos distintos?' WHERE respuesta = 'Es buena herramienta, sobre todo para ABC. ¿Te cuento 3 cosas en las que somos distintos?';
UPDATE "objeciones" SET "loQueNoDecir" = 'Nosotros somos muchísimo mejores en XYZ.' WHERE "loQueNoDecir" = 'Nosotros les damos mil vueltas en XYZ.';
UPDATE "objeciones" SET respuesta = 'Suena a que lo está comparando con lo que ya tiene… o el valor simplemente no le ha llegado. ¿Cuál de las dos?' WHERE respuesta = 'Suena a que lo estás comparando con lo que ya tienes… o el valor simplemente no te ha llegado. ¿Cuál de las dos?';
UPDATE "objeciones" SET "loQueNoDecir" = 'Le hago un descuento.' WHERE "loQueNoDecir" = 'Te hago un descuento.';
UPDATE "objeciones" SET objecion = 'Mándeme un correo' WHERE objecion = 'Mándame un email';
UPDATE "objeciones" SET respuesta = 'No quiero ser insistente si esto no es su prioridad ahora… ¿le cuento primero por qué lo llamé, y luego usted decide si vale la pena que le llene el correo?' WHERE respuesta = 'No quiero ser pesado si esto no es tu prioridad ahora… ¿te cuento antes por qué llamé, y luego tú decides si vale la pena que te llene el correo?';
UPDATE "objeciones" SET "loQueNoDecir" = 'Listo, se lo mando después de la llamada.' WHERE "loQueNoDecir" = 'Vale, te lo mando después de la llamada.';
UPDATE "objeciones" SET respuesta = 'Entiendo. Antes de colgar… ¿[problema] es prioridad en este momento? Si no, ¿cuál lo es?' WHERE respuesta = 'Lo pillo. Antes de colgar… ¿[problema] es prioridad ahora mismo? Si no, ¿cuál lo es?';
UPDATE "objeciones" SET "loQueNoDecir" = 'Le muestro qué podría haber hecho diferente.' WHERE "loQueNoDecir" = 'Te enseño qué podrías haber hecho distinto.';
UPDATE "objeciones" SET respuesta = 'Claro. ¿Quién más participa en esa decisión, para darle los detalles que necesiten?' WHERE respuesta = 'Claro. ¿Quién más entra ahí, para darte los detalles que necesiten?';
UPDATE "objeciones" SET "loQueNoDecir" = 'Perfecto, quedo atento a su respuesta.' WHERE "loQueNoDecir" = 'Perfecto, espero tu respuesta.';
UPDATE "objeciones" SET objecion = '¿En qué se diferencian de [competidor]?' WHERE objecion = '¿En qué os diferenciáis de [competidor]?';
UPDATE "objeciones" SET respuesta = 'Si no le molesta la pregunta… ¿qué es lo que mejor le funciona hoy de su solución actual?' WHERE respuesta = 'Si no te importa la pregunta… ¿qué es lo que mejor te funciona hoy de tu solución actual?';
UPDATE "objeciones" SET respuesta = 'Buena pregunta. Si [reto] es prioridad para usted, le cuento cómo hemos ayudado a otros con eso.' WHERE respuesta = 'Buena pregunta. Si [reto] es prioridad para ti, te cuento cómo hemos ayudado a otros con eso.';
UPDATE "objeciones" SET "loQueNoDecir" = 'Impacta en su estado de resultados.' WHERE "loQueNoDecir" = 'Impacta en tu cuenta de resultados.';
UPDATE "objeciones" SET respuesta = 'Perfecto. Solo para tenerlo claro… ¿qué es lo que lo tiene tranquilo con cómo va todo ahora?' WHERE respuesta = 'Vale. Solo para tenerlo claro… ¿qué es lo que te tiene tranquilo con cómo va todo ahora?';
UPDATE "objeciones" SET "loQueNoDecir" = 'Bueno… ¿pero ha pensado en…?' WHERE "loQueNoDecir" = 'Vale… ¿pero has pensado en…?';
UPDATE "objeciones" SET respuesta = 'Se mueve entre A y B, según lo que necesite. ¿Encaja con lo que esperabas o no?' WHERE respuesta = 'Se mueve entre A y B, según lo que necesites. ¿Encaja con lo que esperabas o no?';
UPDATE "objeciones" SET "loQueNoDecir" = 'Es confidencial hasta que sepamos sus necesidades.' WHERE "loQueNoDecir" = 'Es confidencial hasta que sepamos tus necesidades.';
UPDATE "objeciones" SET objecion = 'En este momento estoy muy ocupado' WHERE objecion = 'Ahora mismo ando muy liado';
UPDATE "objeciones" SET respuesta = 'Lo entiendo. ¿Hay un mejor momento, o prefiere que le mande algo rápido por correo?' WHERE respuesta = 'Lo entiendo. ¿Hay mejor momento, o prefieres que te mande algo rápido por email?';
UPDATE "objeciones" SET "loQueNoDecir" = 'Lo llamo más tarde.' WHERE "loQueNoDecir" = 'Te llamo luego.';
UPDATE "objeciones" SET respuesta = 'Me alegra que les funcione. ¿Le interesaría ver otras opciones solo para comparar antes de renovar?' WHERE respuesta = 'Me alegra que os funcione. ¿Te apetece ver otras opciones solo para comparar antes de renovar?';
UPDATE "objeciones" SET "loQueNoDecir" = 'Ellos están bien, pero nosotros somos mejores en XYZ.' WHERE "loQueNoDecir" = 'Ellos bien, pero nosotros mejor en XYZ.';
