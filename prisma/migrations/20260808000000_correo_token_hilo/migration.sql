-- Correo bidireccional PR 2 (entrante): token de hilo.
-- Cada correo ENVIADO genera un token único que viaja en el Reply-To
-- (`ingest+<tokenHilo>@gmail.com`). El cron de entrada lee ese token de la
-- dirección de destino de la respuesta del cliente para vincularla a la misma
-- oportunidad/contacto/empresa. Es opcional: los correos RECIBIDOS y los
-- ENVIADOS antiguos (anteriores a esta función) lo dejan en NULL.

ALTER TABLE "correos_registrados" ADD COLUMN "tokenHilo" TEXT;

CREATE UNIQUE INDEX "correos_registrados_tokenHilo_key" ON "correos_registrados"("tokenHilo");
