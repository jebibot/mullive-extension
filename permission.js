document.getElementById("grant").addEventListener("click", () => {
  chrome.permissions
    .request({
      origins: [
        "*://*.mul.live/*",
        "*://*.naver.com/*",
        "*://*.chzzk.naver.com/*",
        "*://*.sooplive.com/*",
      ],
    })
    .then((granted) => {
      if (granted) {
        window.close();
      }
    });
});
