try {
  window.parent.location.hostname;
} catch {
  const style = document.createElement("style");
  style.textContent = `
.embeded_mode #webplayer.chat_open #chatting_area {
  display: none !important;
}

.popout_chat #chatting_area {
  min-width: auto !important;
}`;
  (document.head || document.documentElement).append(style);

  const params = new URLSearchParams(location.search);
  if (params.get("vtype") === "chat") {
    if (window.opener == null) {
      const path = location.pathname.split("/");
      window.opener = window.parent[path[1]];
    }
  }
}
