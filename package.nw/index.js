import setting from "./setting.js";
import win from "./window.js";
import { pages, isAppPage } from "./common.js";
import tabBar from "./tabBar.js";
import tabContextmenu from "./tabContextmenu.js";
import tabPreview from "./tabPreview.js";
import addressBar from "./addressBar.js";
import findBar from "./findBar.js";
import webviews from "./webviews.js";
import webviewContextmenu from "./webviewContextmenu.js";
import hrefPreview from "./hrefPreview.js";
import appMenu from "./appMenu.js";
import "./contextmenu.js";
import shortcut from "./shortcut.js";
import downloader from "./downloader.js";

await setting.init(); // 设置数据初始化

const clipboard = nw.Clipboard.get();

const { name: appName } = nw.App.manifest;

const urlPattern = /^((file:|https?:)\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6}).*/;
const withoutProtocol = /^([\da-z\.-]+)\.([a-z\.]{2,6}).*/;
const getUrl = (url) => url || setting.getHomeUrl() || pages.blank.url;
const pagesArray = Object.values(pages);
function getTitle(url) {
  return url.startsWith(location.origin)
    ? pagesArray.find((page) => page.url.startsWith(url))?.title
    : null;
}

const browser = {
  /**
   * 标签页
   */
  // 新增标签页
  addTab({ favicon, title, url, insertAfter, background } = {}) {
    url = getUrl(url);
    title = title || getTitle(url);
    tabBar.addTab({ favicon, title, url, insertAfter, background });
  },
  // 关闭标签页
  closeTab: (tabId) => tabBar.closeTab(tabId),
  // 关闭其他标签页
  closeOtherTabs: (tabId) => tabBar.closeOtherTabs(tabId),
  // 关闭右侧标签页
  closeRightTabs: (tabId) => tabBar.closeRightTabs(tabId),

  /**
   * WebView操作
   */
  back: (tabId) => webviews.getWebview(tabId).back(), // 返回
  forward: (tabId) => webviews.getWebview(tabId).forward(), // 前进
  reload: (tabId) => webviews.getWebview(tabId).reload(), // 刷新
  forward: (tabId) => webviews.getWebview(tabId).forward(), // 前进
  // 停止
  stop(tabId) {
    webviews.getWebview(tabId).stop();
    const tab = tabBar.getTab(tabId);
    tab.loading = false;
    if (tab.isActive) addressBar.loading = false;
  },
  // 导航
  navigate(url) {
    const tab = tabBar.activeTab;
    if (withoutProtocol.test(url)) url = "https://" + url;
    if (!isAppPage(url) && !urlPattern.test(url)) {
      url = setting.getSearchUrl(url);
    }
    if (url !== tab.url) {
      tab.url = url;
      webviews.activeWebview.src = url;
    }
  },

  /**
   * 查找
   */
  _find({ text, backward, newFind }) {
    webviews.activeWebview.find(
      text,
      { backward, matchCase: false },
      ({ activeMatchOrdinal, numberOfMatches }) => {
        findBar.show({ text, index: activeMatchOrdinal, total: numberOfMatches });
        if (newFind) this._find({ text, backward: true });
      }
    );
  },
  find(data = {}) {
    if (data.text) this._find({ text: data.text, newFind: data.text !== findBar.text });
    else if (data.text === "") findBar.show();
    else
      webviews.activeWebview.getSelection((text) => {
        if (text === "" || text === findBar.text) findBar.show();
        else this._find({ text, newFind: true || !findBar.isShow });
      });
  },
  findPrev() {
    if (!findBar.isShow) findBar.show();
    else this._find({ text: findBar.text, backward: true });
  },
  findNext() {
    if (!findBar.isShow) findBar.show();
    else this._find({ text: findBar.text, backward: false });
  },
  stopFinding() {
    webviews.activeWebview.stopFinding();
  },
  esc() {
    if (findBar.isShow) {
      findBar.hide();
      browser.stopFinding();
    }
  },

  // WebView输入框指令
  execCommand(command) {
    webviews.activeWebview.execCommand(command);
  },
  // 复制文本
  copyText: ({ text }) => clipboard.set(text, "text"),
  // 页面另存为
  savePageAs() {
    const { url, title } = tabBar.activeTab;
    downloader.savePageAs(url, title);
  },
  // 链接另存为
  saveLinkAs: ({ url }) => downloader.saveLinkAs(url),
  // 将图片另存为
  saveImageAs: ({ url }) => downloader.saveImageAs(url),
  // 复制图像
  copyImage: ({ url }) => {
    webviews.activeWebview.getImageData(url, ({ type, data }) => {
      clipboard.set(data, type);
    });
  },
  // 打印
  print: () => webviews.activeWebview.print(),
  // 检查页面元素
  inspect: ({ x, y }) => webviews.activeWebview.inspectElementAt(x, y),
  // 打开/关闭WebView开发者工具
  toggleWebviewDevTools: () => webviews.activeWebview.toggleDevTools(),
  // 打开/关闭应用开发者工具
  toggleAppDevTools: () => nw.Window.get().showDevTools(),

  // 显示设置页
  showSettingPage() {
    const { url, title } = pages.setting;
    const tab = tabBar.getTabByUrl(url);
    if (tab) tabBar.setActiveTab(tab.tabId);
    else browser.addTab({ url, title });
  },

  // 显示应用菜单
  showAppMenu: ({ x, y }) => appMenu.popup(x, y),
  // 关于
  showAbout() {
    const os = require("node:os");
    alert(
      [
        nw.App.manifest.name,
        "",
        "版本：" + nw.App.manifest.version,
        "主页：" + nw.App.manifest.repository.url,
        "",
        "系统：" + [os.version(), os.arch(), os.release()].join(" "),
        "NW：" + process.versions.nw,
        "Chromium：" + process.versions.chromium,
        "Node：" + process.versions.node,
        "V8：" + process.versions.v8,
      ].join("\r\n")
    );
  },
  // 退出
  quit: () => nw.App.closeAllWindows(),
};

/**
 * 标签栏
 */
// 新建标签页
tabBar.on("addTab", (tab) => {
  browser.addTab({ insertAfter: tab?.tabId }); // 创建新的标签页
});
// 标签页创建完成
tabBar.on("tabAdded", (tab) => {
  webviews.addWebview(tab.tabId, tab.url); // 创建新的WebView
});
// 标签页切换
tabBar.on("activeTabChange", (tab) => {
  webviews.setActiveWebview(tab.tabId); // 显示对应的WebView
  updateAddressBar(tab.tabId); // 更新地址栏
  addressBar.loading = tab.loading; // 是否正在加载
  tab.snapshoot = null; // 清除预览缓存
  tabPreview.hide(); // 隐藏标签页预览
  document.title = tab.title || appName; // 更新窗口标题
});
// 标签页关闭
tabBar.on("tabClosed", ({ tabId }) => {
  webviews.closeWebview(tabId); // 关闭对应的WebView
});
// 所有标签页关闭
tabBar.on("allTabsClosed", () => {
  nw.Window.get().close(); // 关闭应用窗口
});
// 标签页右键菜单
tabBar.on("tabContextmenu", (tab, event) => {
  tabPreview.hide(); // 隐藏标签页预览
  // 弹出右键菜单
  tabContextmenu.popup(event.x, event.y, {
    closeOtherTabsEnabled: !!tab.el.nextSibling || !!tab.el.previousSibling, // 是否有其他标签页
    closeRightTabsEnabled: !!tab.el.nextSibling, // 是否有右侧标签页
    tab,
  });
});
// 标签页右键菜单项点击
tabContextmenu.on("itemClick", (cmd, data) => browser[cmd]?.(data));
// 标签页鼠标移入，显示标签页预览
tabBar.on("tabMouseenter", (tab) => {
  tabPreview.show({
    tab: tabBar.getTab(tab.tabId),
    webview: webviews.getWebview(tab.tabId),
  });
});
// 鼠标移出标签栏或在标签页上按下，隐藏标签页预览
tabBar.on("tabBarMouseleave", () => tabPreview.hide());
tabBar.on("tabMousedown", () => tabPreview.hide());

/**
 * 地址栏
 */
// 更新地址栏信息
function updateAddressBar(tabId) {
  const webview = webviews.getWebview(tabId);
  addressBar.update({
    url: webview.url, // 输入框url
    canGoBack: webview.canGoBack, // 是否可返回
    canGoForward: webview.canGoForward, // 是否可前进
  });
  setTimeout(() => {
    if (webview.url === pages.blank.url) addressBar.focus(); // 如果是空白页，地址栏输入框自动获得焦点
  }, 0);
}
// 地址栏按钮点击
addressBar.on("buttonClick", (cmd, data) => browser[cmd]?.(data));
// 地址栏导航
addressBar.on("navigate", (url) => browser.navigate(url));

// 应用菜单
appMenu.on("itemClick", (cmd, data) => browser[cmd]?.(data));

/**
 * WebView
 */
// 页面信息变更
webviews.on("infoUpdate", (tabId, { favicon, title }) => {
  const tab = tabBar.getTab(tabId);
  tab.favicon = favicon; // 更新标签页图标
  tab.title = title; // 更新标签页标题
  tab.loading = false; // 隐藏loading图标
  if (tab.isActive) {
    addressBar.loading = false; // 地址栏隐藏停止按钮，显示刷新按钮
    document.title = title || appName; // 更新窗口标题（任务栏标题）
  }
  if (tab.url === pages.blank.url) addressBar.focus(); // 如果是空白页，地址栏输入框自动获得焦点
});
// WebView文档发生导航
webviews.on("navigate", (tabId, url) => {
  const tab = tabBar.getTab(tabId);
  tab.url = url; // 更新标签页url
  tab.snapshoot = null; // 清除标签页预览
  tab.loading = true; // 显示loading图标
  updateAddressBar(tabId); // 更新地址栏
  if (tab.isActive) addressBar.loading = true; // 地址栏隐藏刷新按钮，显示停止按钮
  hrefPreview.hide(); // 隐藏链接预览
});
// WebView加载中断
webviews.on("stop", (tabId) => {
  const tab = tabBar.getTab(tabId);
  tab.loading = false; // 隐藏标签页loading图标
  if (tab.isActive) addressBar.loading = false; // 地址栏隐藏停止按钮，显示刷新按钮
});
// 打开新标签页
webviews.on("open", (tabId, url) => browser.addTab({ url, insertAfter: tabId }));
// 关闭标签页
webviews.on("close", (tabId) => browser.closeTab(tabId));
// 搜索
webviews.on("search", (keyword) => browser.navigate(keyword));
// 获取设置信息
webviews.on("getSettingData", (tabId) => {
  webviews.activeWebview.postMessage("NW_settingData", setting.get(), tabId); // 返回设置信息
});
// 保存设置信息
webviews.on("setSettingData", (data) => setting.set(data));

/**
 * WebView右键菜单
 */
webviews.on("contextmenu", (tabId, data) => {
  const webview = webviews.activeWebview;
  const { x, y } = webview.el.getBoundingClientRect(); // 获取WebView左上角的绝对坐标
  webviewContextmenu.popup({
    tabId,
    x: x + data.x, // 将WebView内部的相对坐标，转换为窗口的全局坐标
    y: y + data.y,
    types: data.types, // 右键菜单包含哪些类型的菜单项（链接、图片等的右键菜单不相同）
    canGoBack: webview.canGoBack, // 是否可按返回
    canGoForward: webview.canGoForward, // 是否可前进
    canPaste: clipboard.get("text"), // 是否可粘贴
  });
});
// WebView右键菜单项点击
webviewContextmenu.on("itemClick", (cmd, data) => browser[cmd]?.(data));

/**
 * 链接预览
 */
webviews.on("update-target-url", (url) => {
  if (url) hrefPreview.show(url); // 有url，显示链接预览
  else hrefPreview.hide(); // 没有url，隐藏链接预览
});

/**
 * 快捷键
 */
function handleShortcut({ cmd, data }) {
  browser[cmd]?.(data);
}
shortcut.on("shortcut", handleShortcut); // 应用窗口的快捷键操作
webviews.on("shortcut", handleShortcut); // 代理WebView的快捷键操作

/**
 * 在页面上查找
 */
findBar.on("find", (cmd, { text }) => browser[cmd]({ text })); // 查找
findBar.on("stopFinding", () => browser.stopFinding()); // 停止查找

/**
 * 拖动标签页到窗口外，新建窗口
 * TODO：WebView需要重新加载，页面内容和状态无法同步
 */
tabBar.on("dragEnd", (tab, e) => {
  if (e.x < 0 || e.y < 0 || e.x > window.innerWidth || e.y > window.innerHeight) {
    const { tabId, url } = tab;
    // 打开新窗口
    nw.Window.open(location.href, nw.App.manifest.window, (win) => {
      win.on("loaded", () => {
        browser.closeTab(tabId); // 关闭当前标签页
        win.window.postMessage({ type: "WV_navigate", data: url }, "*"); // 通知新窗口加载当前标签页的url
        win.removeAllListeners("loaded");
      });
    });
  }
});
window.addEventListener("message", (event) => {
  if (event.data?.type === "WV_navigate") browser.navigate(event.data.data);
});

// 文件拖放
win.on("addTab", (data) => browser.addTab(data));

// 初始化打开首页
browser.addTab();
