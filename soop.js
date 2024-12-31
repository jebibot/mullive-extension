try {
  window.parent.location.hostname;
} catch {
  const style = document.createElement("style");
  style.textContent = `
.embeded_mode #webplayer.chat_open #chatting_area {
  display: none !important;
}

.embeded_mode #webplayer #player div.quality_box {
  display: block !important;
}

.popout_chat #chatting_area {
  min-width: auto !important;
}`;
  (document.head || document.documentElement).append(style);

  const params = new URLSearchParams(location.search);
  if (params.get("vtype") === "chat") {
    if (window.opener == null) {
      const id = location.pathname.split("/")[1];
      window.opener = window.parent[isNaN(Number(id)) ? id : `#${id}`];

      document.documentElement.setAttribute("dark", "true");

      window.addEventListener("DOMContentLoaded", () => {
        const modal = document.getElementById("modal");
        if (modal == null) {
          return;
        }
        const modalObserver = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            for (const n of mutation.addedNodes) {
              if (n.querySelector?.("#layerLogin")) {
                window.open(
                  "https://login.sooplive.co.kr/afreeca/login.php",
                  "_blank"
                );
                window.parent.postMessage(
                  { cmd: "showRefreshOverlay" },
                  "https://mul.live"
                );
                return;
              }
            }
          }
        });
        modalObserver.observe(modal, { childList: true });
      });
    }
  }
}
