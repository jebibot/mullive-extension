document.getElementById("grant").addEventListener("click", () => {
  chrome.permissions
    .request({
      origins: [
        "*://*.mul.live/*",
        "*://*.naver.com/*",
        "*://*.chzzk.naver.com/*",
        "*://*.sooplive.co.kr/*",
      ],
    })
    .then((granted) => {
      if (granted) {
        window.close();
      }
    });
});
