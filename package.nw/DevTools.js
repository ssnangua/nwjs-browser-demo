/**
 * 开发者工具
 * TODO：在DevTools里修改设置后，重新加载DevTools，会加载到最外层的窗口（而不是DevTools所在的WebView）
 */
import WebViewExtra from "./WebViewExtra.js";

const $devToolsContainer = document.querySelector("#devtools-container");
const $resizer = document.querySelector(".resize-handler-h");

export default class DevTools extends WebViewExtra {
  constructor(webview) {
    super({ url: "about:blank" });
    this.el.classList.add("devtools");
    this.el.setAttribute("data-tab-id", webview.tabId);
    $devToolsContainer.appendChild(this.el);

    this.on("load", (src) => {
      webview.el.showDevTools(true, this.el);
      if (src !== "about:blank") {
        this.executeScript({
          mainWorld: true,
          code: `
          // NW.js开发者工具的关闭按钮默认被隐藏，需要手动显示出来
          (function init() {
            // 获取关闭按钮
            const pane = document.querySelector('.main-tabbed-pane')?.shadowRoot;
            const toolbar = pane?.querySelector('.tabbed-pane-right-toolbar')?.shadowRoot;
            const closeBtn = toolbar?.querySelector('.close-devtools');
            // 循环检测，直到关闭按钮被创建
            if (!closeBtn) return setTimeout(init, 10);
            // 显示被隐藏的关闭按钮
            closeBtn.style.cssText = "display: flex !important; position: relative;";
            // 点击关闭按钮，通知应用关闭开发者工具
            closeBtn.firstChild.onclick = () => NW.sendMessage("WV_closeDevtools");
          })();
        `,
        });
      }
      // 开发者工具的开发者工具？？
      // this.showDevTools(true);
    });
  }

  get active() {
    return this.el.getAttribute("active") === "";
  }
  set active(active) {
    if (active) {
      this.el.setAttribute("active", "");
      $devToolsContainer.classList.remove("hide");
      $resizer.classList.remove("hide");
    } else {
      this.el.removeAttribute("active");
      $devToolsContainer.classList.add("hide");
      $resizer.classList.add("hide");
    }
  }
}
