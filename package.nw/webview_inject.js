/**
 * 注入WebView的脚本
 */
(() => {
  // 标题或图标发生变更时，向应用发送最新的信息
  const observer = new MutationObserver(() => {
    NW.sendMessage("WV_infoChange", {
      favicon:
        document.querySelector('link[rel="shortcut icon"],link[rel="icon"]')?.href ||
        location.origin + "/favicon.ico",
      title: document.title,
      url: location.href,
    });
  });
  function observe(target, options) {
    if (target) observer.observe(target, options);
  }
  observe(document.querySelector("title"), { childList: true });
  observe(document.querySelector('link[rel="shortcut icon"]'), { attributes: true });
  observe(document.querySelector('link[rel="icon"]'), { attributes: true });

  // 相对路径转换为绝对路径
  function absolutePath(url) {
    return new URL(url, location.origin + location.pathname).href;
  }

  // 右键菜单
  window.addEventListener("contextmenu", (e) => {
    // console.log(e.target);
    const tagName = e.target.tagName.toLowerCase();
    const types = [];
    if (tagName === "input" || tagName === "textarea") {
      const hasValue = !!e.target.value;
      const hasSelection = e.target.selectionStart !== e.target.selectionEnd;
      types.push({ type: "input", hasSelection, hasValue });
    } else if (tagName === "img" && e.target.src) {
      const valid = e.target.complete && e.target.naturalWidth;
      types.push({ type: "image", url: absolutePath(e.target.src), valid });
    } else if (tagName === "video") {
      const url = e.target.src || e.target.querySelector("source")?.src;
      if (url) types.push({ type: "video", url });
    }
    const a = e.target.closest("a");
    if (a && a.href) {
      types.push({ type: "link", url: absolutePath(a.href) });
    }
    const selection = window.getSelection().toString();
    if (selection) {
      types.push({ type: "selection", text: selection });
    }
    /*
    // TODO：execCommand指令对contenteditable没有效果，不知道怎么处理
    const contenteditable = e.target.closest("[contenteditable]");
    if (contenteditable) {}
    // TODO：WebView内嵌的iframe也不知道怎么处理
    */
    NW.sendMessage("WV_contextmenu", { x: e.x, y: e.y, types });
    e.preventDefault();
  });

  // 获取图像数据
  NW.onMessage("NW_getImageData", (url) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      const data = canvas.toDataURL("image/jpeg", 1.0);
      NW.sendMessage("WV_imageData", { url, type: "jpeg", data });
    };
  });

  // 链接预览
  let link;
  document.body.addEventListener("mouseover", (event) => {
    const a = event.target.closest("a");
    if (a && a.href !== link) {
      link = a.href;
      NW.sendMessage("WV_targetUrl", link);
    }
  });
  document.body.addEventListener("mouseout", (event) => {
    const a = event.target.closest("a");
    if (a) {
      link = null;
      NW.sendMessage("WV_targetUrl");
    }
  });
})();
