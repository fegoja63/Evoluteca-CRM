/*
 * Chat web de Evoluteca CRM. Se pega en la página del cliente:
 *   <script src="https://<crm>/agente-web.js" data-chat="<token>" async></script>
 * Pone un botón redondo en la esquina inferior derecha que abre el chat
 * (/chat/<token>) en un panel. Opcional: data-color="#RRGGBB" para el botón.
 */
(function () {
  var script = document.currentScript;
  if (!script) return;
  var token = script.getAttribute("data-chat");
  if (!token || !/^[0-9a-f]{32}$/.test(token) || window.__evolutecaChat) return;
  window.__evolutecaChat = true;

  var origen = new URL(script.src).origin;
  var color = /^#[0-9a-fA-F]{6}$/.test(script.getAttribute("data-color") || "") ? script.getAttribute("data-color") : "#0b1c26";
  var abierto = false;
  var panel = null;

  var boton = document.createElement("button");
  boton.type = "button";
  boton.setAttribute("aria-label", "Abrir chat");
  boton.style.cssText = "position:fixed;right:20px;bottom:20px;z-index:2147483000;width:56px;height:56px;border-radius:50%;border:0;cursor:pointer;" +
    "background:" + color + ";color:#fff;box-shadow:0 6px 20px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;padding:0";
  var ICONO_CHAT = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 20l1.3-3.9A9 8 0 1 1 7.7 19L3 20"/></svg>';
  var ICONO_CERRAR = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>';
  boton.innerHTML = ICONO_CHAT;

  function crearPanel() {
    panel = document.createElement("iframe");
    panel.title = "Chat";
    panel.src = origen + "/chat/" + token + "?pagina=" + encodeURIComponent(location.href.slice(0, 300));
    var movil = window.innerWidth < 480;
    panel.style.cssText = "position:fixed;z-index:2147483000;border:0;background:#fff;box-shadow:0 10px 40px rgba(0,0,0,.25);" +
      (movil
        ? "left:0;right:0;top:0;bottom:88px;width:100%;height:calc(100% - 88px);border-radius:0"
        : "right:20px;bottom:88px;width:370px;height:min(560px,calc(100vh - 110px));border-radius:16px");
    document.body.appendChild(panel);
  }

  boton.addEventListener("click", function () {
    abierto = !abierto;
    if (abierto && !panel) crearPanel();
    if (panel) panel.style.display = abierto ? "block" : "none";
    boton.innerHTML = abierto ? ICONO_CERRAR : ICONO_CHAT;
    boton.setAttribute("aria-label", abierto ? "Cerrar chat" : "Abrir chat");
  });

  function montar() { document.body.appendChild(boton); }
  if (document.body) montar(); else document.addEventListener("DOMContentLoaded", montar);
})();
