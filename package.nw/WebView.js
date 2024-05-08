/**
 * WebView + DevTools
 */
import WebViewExtra from "./WebViewExtra.js";
import DevTools from "./DevTools.js";

const fs = require("node:fs");
const getCode = (file) => fs.readFileSync(file).toString();
const webview_inject_js = getCode("./webview_inject.js");
const webview_inject_css = getCode("./webview_inject.css");
// WebView的事件无法冒泡到主窗口，包括快捷键操作，
// 所以把和主窗口的快捷键逻辑也注入到WebView中（部分有区别的逻辑，通过关键词替换）
const shortcut_js = getCode("./shortcut.js")
  .replace(/\/\*webview_inject_remove\*\//g, "//")
  .replace(/\/\/webview_inject_add\/\//g, "");

const $webviewContainer = document.querySelector("#webview-container");

const contentScriptList = [
  {
    name: "NW_inject",
    matches: ["<all_urls>"],
    css: {
      code: webview_inject_css,
      // files: ["webview_inject.css"],
    },
    // world: "MAIN", // 脚本注入到真实环境，NW.js貌似不支持该特性
    // 不支持注入到真实环境，所以在contentload后通过executeScript来注入
    js: {
      // code: webview_inject_js + shortcut_js,
      // files: ["webview_inject.js"],
    },
    run_at: "document_start", // 在DOM加载之前注入
    all_frames: true,
  },
];
const executeScriptList = [
  {
    name: "NW_inject",
    mainWorld: true,
    code: webview_inject_js + shortcut_js,
  },
];

export default class WebView extends WebViewExtra {
  #tabId;
  #devTools;
  #imageDataHandler;

  constructor({ tabId, url }) {
    super({
      url,
      contentScriptList,
      executeScriptList,
      canDialog: true,
      partitionTrusted: true,
      nodeEnabled: false,
    });

    this.#tabId = tabId;
    this.el.classList.add("webview");
    this.el.setAttribute("data-tab-id", tabId);
    $webviewContainer.appendChild(this.el);

    this.el.addEventListener("drop", (e) => {
      console.log(e);
    });

    this.onMessage("WV_imageData", (data) => {
      this.#imageDataHandler(data);
      this.#imageDataHandler = null;
    });
  }

  get tabId() {
    return this.#tabId;
  }
  get active() {
    return this.el.getAttribute("active") === "";
  }
  set active(active) {
    if (active) this.el.setAttribute("active", "");
    else this.el.removeAttribute("active");
    if (this.#devTools) this.#devTools.active = active;
  }
  get devTools() {
    return this.#devTools;
  }
  remove() {
    this.closeDevtools();
    this.destory();
  }

  // 显示开发者工具
  showDevTools() {
    if (!this.#devTools) {
      this.#devTools = new DevTools(this);
      this.#devTools.active = true;
      this.#devTools.onMessage("WV_closeDevtools", () => this.closeDevtools());
    }
  }
  // 关闭开发者工具
  closeDevtools() {
    if (this.#devTools) {
      this.#devTools.destory();
      this.#devTools = null;
    }
  }
  // 切换显示或隐藏开发者工具
  toggleDevTools() {
    if (this.#devTools) this.closeDevtools();
    else this.showDevTools();
  }

  // 检查指定位置的元素
  inspectElementAt(x, y) {
    if (!this.#devTools) {
      this.showDevTools();
      this.#devTools.on("load", () => {
        super.inspectElementAt(x, y);
      });
    } else {
      super.inspectElementAt(x, y);
    }
  }

  // 获取页面基本信息
  getInfo(callback) {
    this.executeScript(
      {
        code: `[
          {
            favicon:
              document.querySelector('link[rel="shortcut icon"],link[rel="icon"]')?.href ||
              location.origin + "/favicon.ico",
            title: document.title,
            url: location.href,
          }
        ]`,
      },
      ([[info]]) => callback(info)
    );
  }

  // 获取页面里的图片数据（考虑到有些网站的图片会有防盗链，在网页里获取比较保险）
  getImageData(url, callback) {
    this.#imageDataHandler = callback;
    this.postMessage("NW_getImageData", url);
  }
}
