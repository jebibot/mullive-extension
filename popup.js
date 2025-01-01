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

  const getMetadata = async ({ nameQueries }) => {
    let scriptInjectionResults;
    try {
      scriptInjectionResults = await chrome.scripting.executeScript({
        target: { tabId: activeTab[0].id },
        func: function (nameQueries) {
          let streamerName = null;
          try {
            for (const nameQuery of nameQueries) {
              const nameElement = document.querySelector(nameQuery);
              if (nameElement != null) {
                streamerName = nameElement.innerText.trim();
                // SOOP 모바일 레이아웃은 닉네임만 담겨져 있는 요소가 없음
                if (streamerName.includes("\n")) {
                  streamerName = streamerName.split("\n")[0];
                }
                break;
              }
            }
          } catch(e) {
            console.error(`Failed to get streamer name: ${e}`);
          } finally {
            return {
              name: streamerName,
            }
          }
        },
        args: [nameQueries],
      });
      return scriptInjectionResults[0].result;
    } catch (e) {
      console.error(`Script execution failed: ${e}`);
    }
  }

  let current;
  let currentMetadata;
  switch (parsedUrl.hostname) {
    case "chzzk.naver.com":
    case "m.chzzk.naver.com": {
      const id = parts[1] === "live" ? parts[2] : parts[1];
      if (/^[0-9a-f]{32}$/i.test(id)) {
        current = id;
        currentMetadata = await getMetadata({
          nameQueries: ["div[class^=video_information_name__] span[class^=name_text__]"]
        });
      }
      break;
    }
    case "www.twitch.tv":
    case "m.twitch.tv":
      if (/^[a-z0-9_]{4,25}$/i.test(parts[1])) {
        current = `t:${parts[1]}`;
        currentMetadata = await getMetadata({
          nameQueries: ["#live-channel-stream-information a h1", "#channel-live-overlay .tw-title"]
        });
      }
      break;
    case "ch.sooplive.co.kr":
    case "play.sooplive.co.kr":
      if (/^[a-z0-9]{3,12}$/i.test(parts[1])) {
        current = parts[1];
        currentMetadata = await getMetadata({
          nameQueries: ["#infoNickName", ".txt_bj"]
        });
      }
      break;
    case "m.sooplive.co.kr":
      if (
        parts[1] === "#" &&
        parts[2] === "player" &&
        /^[a-z0-9]{3,12}$/i.test(parts[3])
      ) {
        current = parts[3];
        currentMetadata = await getMetadata({
          nameQueries: ["#infoNickName", ".txt_bj"]
        });
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

      if (current != null) {
        currentMetadata = await getMetadata({
          nameQueries: ["ytd-channel-name", "ytm-slim-owner-renderer .slim-owner-channel-name"]
        });
      }
      break;
  }

  let { streams, streamMetadata: rawStreamMetadata } = await chrome.storage.local.get({ streams: [], streamMetadata: [] });
  let streamsSet = new Set(streams);
  let streamMetadata = new Map(rawStreamMetadata);
  if (current) {
    streamsSet.add(current);
    streamMetadata.set(current, currentMetadata);
    await chrome.storage.local.set({ streams: [...streamsSet], streamMetadata: [...streamMetadata.entries()] });
  }

  const list = document.getElementById("streams");
  for (const stream of streamsSet) {
    const item = document.createElement("div");
    item.dataset.id = stream;
    list.appendChild(item);

    const move = document.createElement("button");
    move.textContent = "⠿";
    move.classList.add("handle");
    item.appendChild(move);

    const span = document.createElement("span");
    const streamName = streamMetadata.get(stream)?.name;
    span.textContent = streamName != null ? `${streamName} (${stream})` : stream;
    item.appendChild(span);

    const remove = document.createElement("button");
    remove.textContent = "X";
    remove.addEventListener("click", async () => {
      streamsSet.delete(stream);
      await chrome.storage.local.set({ streams: [...streamsSet] });
      item.remove();
    });
    item.appendChild(remove);
  }

  document.getElementById("watch").addEventListener("click", () => {
    chrome.tabs.create({
      url: `https://mul.live/${[...streamsSet].join("/")}`,
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
