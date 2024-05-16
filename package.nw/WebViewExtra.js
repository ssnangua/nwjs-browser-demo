/**
 * WebView封装
 * @reference https://developer.chrome.com/docs/apps/reference/webviewTag
 * @reference https://nwjs.readthedocs.io/en/latest/References/webview%20Tag/
 */
const EventEmitter = require("node:events");

const webview_inject_js_base = `
  /**
   * 注入WebView的依赖脚本（构建通信通道）
   *   其他注入的脚本，可以通过以下方式和应用进行通信
   *     - NW.onMessage(type, handler) 侦听来自应用的消息
   *     - NW.sendMessage(type, data) 向应用发送消息
   *   应用的页面，可以通过注册一个全局事件来得到相关的事件钩子
   *     - window.NWHook = ({ onMessage, sendMessage }) => {}
   */
  const NW = {
    source: null, // 窗口引用
    instanceId: null, // WebView实例id
    messageQuery: [], // 未发送的消息
    handlers: {}, // 侦听应用消息的事件处理器
    onMessage(type, handler) {
      if (!this.handlers[type]) this.handlers[type] = [];
      this.handlers[type].push(handler);
    },
    sendMessage(type, data) {
      if (this.source) this.source.postMessage({ instanceId: this.instanceId, type, data }, "*");
      // 如果通信通道还没构建，把消息存进队列
      else messageQuery.push({ type, data });
    },
  };

  // 侦听来自应用的消息
  window.addEventListener("message", (event) => {
    if (!event?.data?.type) return;
    const { instanceId, type, data } = event.data;
    // 初始化消息，WebView加载完成后，由应用发送，构建通信通道
    if (type === "NW_init") {
      NW.source = event.source; // 窗口引用
      NW.instanceId = instanceId; // WebView实例id
      // 处理队列里的消息
      NW.messageQuery.forEach(({ type, data }) => NW.sendMessage(type, data));
      NW.messageQuery = [];
      // 如果是应用的页面，调用页面里的事件钩子
      if (location.origin === event.origin) window.NWHook?.(NW);
    } else {
      // 其他消息，调用相应的侦听器
      NW.handlers[type]?.forEach((handler) => handler(data));
    }
  });
`;

const messageHandlers = {};
window.addEventListener("message", (event) => {
  const { instanceId, type, data } = event.data || {};
  messageHandlers[instanceId]?.[type]?.forEach((handler) => handler(data));
});

let __instanceId = 0;
export default class WebViewExtra extends EventEmitter {
  #instanceId = ++__instanceId;
  #loaded = false;
  #executeScriptQuery = [];
  #executeScriptList = {};
  #el;

  constructor({
    url,
    contentScriptList, // 要在页面中注入css样式和js脚本列表
    executeScriptList, // WebView每次loadstop都会执行的js脚本
    canDialog = false, // 是否自动代理dialog
    partitionTrusted = false, // 是否信任本地url
    nodeEnabled = false, // 是否启用Node支持
  }) {
    super();
    this.#el = new WebView();
    if (partitionTrusted) this.#el.setAttribute("partition", "trusted");
    if (nodeEnabled) this.#el.setAttribute("allownw", "");
    this.#el.src = url;

    if (contentScriptList) this.addContentScripts(contentScriptList);
    if (executeScriptList) this.addExecuteScripts(executeScriptList);

    messageHandlers[this.#instanceId] = {};

    let needInject = false;

    /**
     * 加载开始
     * @param url {string}
     * @param isTopLevel {boolean}
     */
    this.#el.addEventListener("loadstart", (e) => {
      this.emit("loadstart", e);
    });

    /**
     * 文档发生导航
     * @param url {string}
     * @param isTopLevel {boolean}
     */
    this.#el.addEventListener("loadcommit", (e) => {
      needInject = e.isTopLevel;
      this.emit("loadcommit", e);
      // 只处理最外层框架
      if (e.isTopLevel) {
        this.#loaded = false;
        this.emit("navigate", e.url);
      }
    });

    /**
     * 文档加载完成（文档内部的导航“不”会触发）
     *   如果在contentload之前停止加载（如webview.stop()），contentload不会触发，
     *   而loadstop能正常触发，所以注入逻辑最好也放在loadstop里
     */
    this.#el.addEventListener("contentload", (e) => {
      this.emit("contentload", e);
    });

    // 文档加载完成（文档内部的导航“也”会触发）
    this.#el.addEventListener("loadstop", (e) => {
      this.#loaded = true;
      this.emit("loadstop", e);
      this.emit("load", e.target.src);

      if (needInject) {
        this.executeScript({ mainWorld: true, code: webview_inject_js_base });
        Object.values(this.#executeScriptList).forEach((item) => this.executeScript(item));
        this.#executeScriptQuery.forEach(({ details, callback }) => {
          this.executeScript(details, callback);
        });
        this.#executeScriptQuery = [];
      }

      // 发送初始化消息（主要是为了把外层窗口的引用传给WebView）
      this.postMessage("NW_init");
    });

    /**
     * 发生重定向
     * @param oldUrl {string}
     * @param newUrl {string}
     * @param isTopLevel {boolean}
     */
    this.#el.addEventListener("loadredirect", (e) => {
      this.emit("loadredirect", e);
      this.emit("redirect", e);
    });

    /**
     * 文档取消加载或加载失败
     * @param url {string}
     * @param isTopLevel {boolean}
     * @param code {number}
     * @param reason {string}
     */
    this.#el.addEventListener("loadabort", (e) => {
      this.emit("loadabort", e);
      this.emit("stop", e);
      e.preventDefault(); // 阻止默认行为，否则会在控制台输出一条警告信息
    });

    /**
     * 打开窗口
     * @param window {NewWindow}
     * @param targetUrl {string}
     * @param initialWidth {number}
     * @param initialHeight {number}
     * @param name {string}
     * @param windowOpenDisposition {string}
     *   - "ignore"|"save_to_disk"|"current_tab"|"new_background_tab"|"new_foreground_tab"|"new_window"|"new_popup"
     */
    this.#el.addEventListener("newwindow", (e) => {
      this.emit("newwindow", e);
      this.emit("open", e.targetUrl);
      e.preventDefault(); // 阻止默认行为，否则会在控制台输出一条警告信息
    });

    // 自行关闭
    this.#el.addEventListener("close", () => this.emit("close"));

    /**
     * 退出（好像不触发）
     * @param processID {number}
     * @param reason {string} "normal"|"abnormal"|"crash"|"kill"
     */
    this.#el.addEventListener("exit", (e) => {
      this.destory();
      this.emit("exit", e);
    });

    // 模态弹框
    this.#el.addEventListener("dialog", (e) => {
      if (canDialog) {
        const { dialog, messageType, messageText, defaultPromptText } = e;
        switch (messageType) {
          case "alert":
            alert(messageText);
            dialog.ok();
            break;
          case "confirm":
            dialog[confirm(messageText) ? "ok" : "cancel"]();
            break;
          case "prompt":
            const result = prompt(messageText, defaultPromptText);
            dialog[typeof result === "string" ? "ok" : "cancel"](result);
            break;
        }
      }
      this.emit("dialog", e);
    });

    /**
     * 控制台消息
     * @param message {string}
     * @param level {number}
     * @param line {number}
     * @param sourceId {string}
     */
    this.#el.addEventListener("consolemessage", (e) => this.emit("consolemessage", e));

    /**
     * 查找结果更新
     * @param searchText {string} 查找的字符串
     * @param numberOfMatches {number} 匹配项总数
     * @param activeMatchOrdinal {number} 当前匹配项索引
     * @param canceled {boolean} 查找请求是否已取消
     * @param selectionRect {SelectionRect} 当前匹配项的区域矩形（即高亮范围）
     * @param finalUpdate {string}
     */
    this.#el.addEventListener("findupdate", (e) => this.emit("findupdate", e));

    /**
     * 权限请求
     * @param permission {string}
     *   - "media"|"geolocation"|"pointerLock"|"download"|"loadplugin"|"filesystem"|"fullscreen"|"hid"
     * @param request {object}
     */
    this.#el.addEventListener("permissionrequest", (e) => this.emit("permissionrequest", e));

    /**
     * 从无响应中恢复
     * @param processID {number}
     */
    this.#el.addEventListener("responsive", (e) => this.emit("responsive", e));
    /**
     * 无响应
     * @param processID {number}
     */
    this.#el.addEventListener("unresponsive", (e) => this.emit("unresponsive", e));

    /**
     * WebView大小调整
     * @param oldWidth {number}
     * @param oldHeight {number}
     * @param newWidth {number}
     * @param newHeight {number}
     */
    this.#el.addEventListener("sizechanged", (e) => this.emit("sizechanged", e));
    /**
     * 网页缩放比例调整
     * @param oldZoomFactor {number}
     * @param newZoomFactor {number}
     */
    this.#el.addEventListener("zoomchange", (e) => this.emit("zoomchange", e));
  }

  /**
   * 自定义 API
   */
  get el() {
    return this.#el;
  }
  get src() {
    return this.#el?.src;
  }
  set src(src) {
    if (this.#el) this.#el.src = src;
  }
  get url() {
    return this.src;
  }
  set url(url) {
    this.src = url;
  }

  /**
   * WebView每次loadstop都会执行的js脚本
   * @param executeScriptList {Array}
   *   @param name {string} 脚本名（移除时要用到）
   *   @param code {string} 要执行的js代码
   *   @param file {string} 要执行的js文件
   *   @param mainWorld {boolean} 是否注入到真是环境
   */
  addExecuteScripts(executeScriptList) {
    executeScriptList.forEach(({ name, ...script }) => {
      this.#executeScriptList[name] = script;
    });
  }
  removeExecuteScripts(scriptNameList = []) {
    if (scriptNameList.length > 0) {
      scriptNameList.forEach((name) => delete this.#executeScriptList[name]);
    } else this.#executeScriptList = {};
  }

  get #messageHandlers() {
    return messageHandlers[this.#instanceId];
  }
  // 清空或删除消息侦听器
  clearMessageHandlers() {
    messageHandlers[this.#instanceId] = {};
  }
  // 向WebView发送消息（WARN：页面本身也能侦听到这些消息）
  postMessage(type, data) {
    this.#el?.contentWindow.postMessage({ instanceId: this.#instanceId, type, data }, "*");
  }
  // 侦听来自WebView的消息（可以在注入的脚本中发送）
  onMessage(type, handler) {
    if (!this.#messageHandlers[type]) this.#messageHandlers[type] = [];
    this.#messageHandlers[type].push(handler);
  }

  // 销毁（移除WebView时需要要调用）
  destory() {
    this.#el?.remove();
    this.#el = null;
    delete messageHandlers[this.#instanceId];
  }

  execCommand(command) {
    this.executeScript({
      code: `document.execCommand("${command}")`,
    });
  }

  // 获取选中的文本
  getSelection(callback) {
    this.executeScript(
      {
        code: `window.getSelection().toString()`,
      },
      ([text]) => callback(text)
    );
  }

  /**
   * WebView 原生 API
   */

  // 可以向WebView发送消息（contentWindow.postMessage）
  get contentWindow() {
    return this.#el?.contentWindow;
  }

  // 可以在右键菜单中添加自定义的菜单项
  get contextMenus() {
    return this.#el?.contextMenus;
  }

  // 页面上的webRequest事件的接口
  get request() {
    return this.#el?.request;
  }

  // 是否可以向后导航（返回）
  get canGoBack() {
    return this.#el?.canGoBack();
  }

  // 是否可以向前导航（前进）
  get canGoForward() {
    return this.#el?.canGoForward();
  }

  // 重新加载（刷新）
  reload() {
    return this.#el?.reload();
  }

  // 停止加载
  stop() {
    return this.#el?.stop();
  }

  /**
   * 向后导航
   * @param callback
   *   @param success {boolean} 是否导航成功
   */
  back(callback) {
    return this.#el?.back(callback);
  }

  /**
   * 向前导航
   * @param callback
   *   @param success {boolean} 是否导航成功
   */
  forward(callback) {
    return this.#el?.forward(callback);
  }

  /**
   * 导航到相对历史记录索引
   * @param relativeIndex {number} 相对索引，正值为向前导航，负值为向后导航
   * @param callback
   *   @param success {boolean} 是否导航成功
   */
  go(relativeIndex, callback) {
    return this.#el?.go(relativeIndex, callback);
  }

  /**
   * 要在页面中注入css样式和js脚本（导航到符合匹配规则的URL时会自动注入）
   * @param contentScriptList {Array}
   *   @param name {string} 名字（移除该项的时候用到）
   *   @param css 要注入的css代码或文件
   *     @param code {string}
   *     @param files {string[]}
   *   @param js 要注入的js代码或文件
   *     @param code {string}
   *     @param files {string[]}
   *   @param matches {string[]} 匹配规则
   *   @param run_at {string} 注入时机
   *     - "document_start" 在css加载之后、DOM和其他脚本加载之前
   *     - "document_end" 在DOM加载之后、图片和iframe加载之前
   *     - "document_idle" 根据情况，在"document_end"之后或window.onload之后注入
   *   @param all_frames {boolean} 页面内的iframe是否也要注入
   *   @param exclude_matches {string[]} 排除规则
   *   @param include_globs {string[]} 匹配规则
   *   @param exclude_globs {string[]} 排除规则
   *   @param match_about_blank {boolean} 是否匹配“about:blank”
   */
  addContentScripts(contentScriptList) {
    return this.#el?.addContentScripts(contentScriptList);
  }

  /**
   * 移除addContentScripts注入的内容
   * @param scriptNameList {string[]} 项的name的列表，如果列表为空，会移除所有注入的内容
   */
  removeContentScripts(scriptNameList) {
    return this.#el?.removeContentScripts(scriptNameList);
  }

  /**
   * 在WebView中执行js脚本
   * @param details code和file二选一
   *   @param code {string} 要执行的js代码
   *   @param file {string} 要执行的js文件（可能是文件需要加载，似乎是异步执行的？）
   *   // NW添加
   *   @param mainWorld {boolean} 是否注入到真是环境
   * @param callback
   *   @param result {any[]} 执行结果
   */
  executeScript(details, callback) {
    if (this.#loaded) return this.#el?.executeScript(details, callback);
    else this.#executeScriptQuery.push({ details, callback });
  }

  /**
   * 在WebView中注入css代码
   * @param details code和file二选一
   *   @param code {string} 要注入的css代码
   *   @param file {string} 要注入的css文件
   * @param callback
   */
  insertCSS(details, callback) {
    return this.#el?.insertCSS(details, callback);
  }

  /**
   * 发起“在网页上查找”请求
   * @param searchText {string} 要查找的字符串
   * @param options {FindOptions}
   *   @param backward {boolean} 反向查找
   *   @param matchCase {boolean} 区分大小写
   * @param callback
   *   @param numberOfMatches {number} 匹配项总数
   *   @param activeMatchOrdinal {number} 当前匹配项索引
   *   @param canceled {boolean} 查找请求是否已取消
   *   @param selectionRect {SelectionRect} 当前匹配项的区域矩形（即高亮范围）
   */
  find(searchText, options, callback) {
    return this.#el?.find(searchText, options, callback);
  }

  /**
   * 结束查找
   * @param action {string}
   *   - "keep" 保留当前匹配项的选中状态（默认值）
   *   - "clear" 清除当前匹配项的选中状态
   *   - "activate" 保留当前匹配项的选中状态，并模拟用户点击该匹配项
   */
  stopFinding(action) {
    return this.#el?.stopFinding(action);
  }

  /**
   * 加载数据网址
   * @param dataUrl {string} 数据网址
   * @param baseUrl {string} 用于相对链接的基础网址
   * @param virtualUrl {string} 向用户显示的虚拟网址
   */
  loadDataWithBaseUrl(dataUrl, baseUrl, virtualUrl) {
    return this.#el?.loadDataWithBaseUrl(dataUrl, baseUrl, virtualUrl);
  }

  /**
   * 清除WebView分区的浏览器数据
   * @param options
   *   @param since {number} 清除在此时间之后的数据
   * @param types 要清除哪些类型的数据
   *   @param appcache {boolean}
   *   @param cache {boolean} 清除所有缓存，无视其他类型选项
   *   @param cookies {boolean}
   *   @param fileSystems {boolean}
   *   @param indexedDB {boolean}
   *   @param localStorage {boolean}
   *   @param persistentCookies {boolean}
   *   @param sessionCookies {boolean}
   *   @param webSQL {boolean}
   * @param callback
   */
  clearData(options, types, callback) {
    return this.#el?.clearData(options, types, callback);
  }

  /**
   * 缩放比例
   * @param zoomFactor {number}
   */
  set zoom(zoomFactor) {
    this.#el?.setZoom(zoomFactor);
  }
  get zoom() {
    return this.#el?.getZoom();
  }

  /**
   * 缩放模式
   * @param zoomMode {string} "per-origin"|"per-view"|"disabled"
   */
  set zoomMode(zoomMode) {
    this.#el?.setZoomMode(zoomMode);
  }
  get zoomMode() {
    return this.#el?.getZoomMode();
  }

  /**
   * 音频是否静音
   * @param mute {boolean}
   */
  set audioMuted(mute) {
    this.#el?.setAudioMuted(mute);
  }
  get audioMuted() {
    return this.#el?.isAudioMuted();
  }
  /**
   * 查询音频状态
   * @param audible {boolean}
   */
  getAudioState(callback) {
    return this.#el?.getAudioState(callback);
  }

  /**
   * userAgent
   * @param userAgent {string}
   */
  set userAgent(userAgent) {
    this.#el?.setUserAgentOverride(userAgent);
  }
  get userAgent() {
    return this.#el?.getUserAgent();
  }
  get isUserAgentOverridden() {
    return this.#el?.isUserAgentOverridden();
  }

  /**
   * WebView空间导航
   * @param enabled {boolean}
   */
  set spatialNavigationEnabled(enabled) {
    this.#el?.setSpatialNavigationEnabled(enabled);
  }
  get spatialNavigationEnabled() {
    return this.#el?.isSpatialNavigationEnabled();
  }

  /**
   * 捕获可见区域（截图）
   * @param format  {"jpeg"|"png"}
   * @param quality {number} 1-100，format为png时会被忽略
   * @param callback
   *   @param dataUrl {string} 数据URL，可以用于给<img>的src
   */
  captureVisibleRegion({ format = "jpeg", quality }, callback) {
    return this.#el?.captureVisibleRegion({ format, quality }, callback);
  }

  // 打印WebView内容
  print() {
    return this.#el?.print();
  }

  // 获取WebView的进程ID
  get processId() {
    return this.#el?.getProcessId();
  }

  // 强制终止WebView的渲染进程
  terminate() {
    return this.#el?.terminate();
  }

  /**
   * NW WebView API
   */

  /**
   * 显示开发者工具
   * @param show {boolean}
   * @param container {WebView Element} 开发者工具容器
   */
  showDevTools(show, container) {
    return this.#el?.showDevTools(show, container);
  }

  // 检查指定位置的元素
  inspectElementAt(x, y) {
    return this.#el?.inspectElementAt(x, y);
  }

  // 是否信任本地URL
  get isPartitionTrusted() {
    return this.#el?.getAttribute("partition") === "trusted";
  }

  // 是否启用Node.js支持
  get isNodeEnabled() {
    return this.#el?.getAttribute("allownw") === "";
  }
}
