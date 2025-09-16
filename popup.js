(async () => {
  const activeTab = await chrome.tabs.query({
    currentWindow: true,
    active: true,
  });
  if (activeTab[0] == null) {
    return;
  }
  const url = activeTab[0].pendingUrl || activeTab[0].url;
  if (!url) {
    return;
  }
  const parsedUrl = new URL(url);
  const parts = parsedUrl.pathname.split("/");

  let current;
  switch (parsedUrl.hostname) {
    case "chzzk.naver.com":
    case "m.chzzk.naver.com": {
      const id = parts[1] === "live" ? parts[2] : parts[1];
      if (/^[0-9a-f]{32}$/i.test(id)) {
        current = id;
      }
      break;
    }
    case "www.twitch.tv":
    case "m.twitch.tv":
      if (/^[a-z0-9_]{4,25}$/i.test(parts[1])) {
        current = `t:${parts[1]}`;
      }
      break;
    case "www.sooplive.co.kr":
      if (parts[1] === "station" && /^[a-z0-9]{3,12}$/i.test(parts[2])) {
        current = parts[2];
      }
      break;
    case "ch.sooplive.co.kr":
    case "play.sooplive.co.kr":
      if (/^[a-z0-9]{3,12}$/i.test(parts[1])) {
        current = parts[1];
      }
      break;
    case "m.sooplive.co.kr":
      if (
        parts[1] === "#" &&
        parts[2] === "player" &&
        /^[a-z0-9]{3,12}$/i.test(parts[3])
      ) {
        current = parts[3];
      }
      break;
    case "www.youtube.com":
    case "m.youtube.com":
      if (
        (parts[1] === "channel" && /^UC[a-zA-Z0-9_\-]{22}$/.test(parts[2])) ||
        (parts[1] === "c" && /^[a-zA-Z0-9]{1,100}$/.test(parts[2])) ||
        (parts[1] === "embed" && /^[a-zA-Z0-9_\-]{11}$/.test(parts[2]))
      ) {
        current = `y:${parts[2]}`;
      } else if (/^@[a-zA-Z0-9_\-.%]{3,270}$/.test(parts[1])) {
        current = `y:${parts[1]}`;
      } else if (parts[1] === "watch") {
        const id = parsedUrl.searchParams.get("v");
        if (/^[a-zA-Z0-9_\-]{11}$/.test(id)) {
          current = `y:${id}`;
        }
      }
      break;
  }

  let { streams, data } = await chrome.storage.local.get({
    streams: [],
    data: {},
  });
  let streamsSet = new Set(streams);
  if (current) {
    streamsSet.add(current);
    await chrome.storage.local.set({ streams: [...streamsSet] });
  }

  const list = document.getElementById("streams");
  for (const s of streamsSet) {
    let nick = data[s]?.nick;
    if (!nick) {
      try {
        if (/^[a-z0-9]{3,12}$/i.test(s)) {
          const res = await fetch(
            `https://st.sooplive.co.kr/api/get_station_status.php?szBjId=${s}`
          );
          const result = await res.json();
          if (res.ok && result.RESULT === 1 && result.DATA?.user_nick) {
            nick = result.DATA.user_nick;
          }
        } else if (/^[0-9a-f]{32}$/i.test(s)) {
          const res = await fetch(
            `https://api.chzzk.naver.com/service/v1/channels/${s}`
          );
          const result = await res.json();
          if (res.ok && result.code === 200 && result.content?.channelName) {
            nick = result.content.channelName;
          }
        }
      } catch { }
      if (nick) {
        data[s] ||= {};
        data[s].nick = nick;
        await chrome.storage.local.set({ data });
      }
    }

    const item = document.createElement("div");
    item.dataset.id = s;
    list.appendChild(item);

    const move = document.createElement("button");
    move.textContent = "⠿";
    move.classList.add("handle");
    item.appendChild(move);

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = !data[s]?.disabled;
    checkbox.addEventListener("change", async (e) => {
      data[s] ||= {};
      data[s].disabled = !e.currentTarget.checked;
      await chrome.storage.local.set({ data });
    });
    item.appendChild(checkbox);

    const span = document.createElement("span");
    span.textContent = nick ? `${nick} (${s})` : s;
    item.appendChild(span);

    const remove = document.createElement("button");
    remove.textContent = "X";
    remove.addEventListener("click", async () => {
      streamsSet.delete(s);
      delete data[s];
      await chrome.storage.local.set({ streams: [...streamsSet], data });
      item.remove();
    });
    item.appendChild(remove);
  }

  document.getElementById("watch").addEventListener("click", () => {
    chrome.tabs.create({
      url: `https://mul.live/${[...streamsSet]
        .filter((s) => !data[s]?.disabled)
        .join("/")}`,
    });
  });

  Sortable.create(list, {
    animation: 150,
    handle: ".handle",
    store: {
      set(sortable) {
        streamsSet = new Set(sortable.toArray());
        chrome.storage.local.set({ streams: [...streamsSet] });
      },
    },
  });
})();
