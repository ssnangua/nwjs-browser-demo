/**
 * 标签页
 */
const EventEmitter = require("node:events");

const loadingIcon = "./assets/loading.gif";
const defaultTitle = "新建标签页";
let __tabId = 0;

export default class Tab extends EventEmitter {
  #tabId;
  #el;
  #favicon = "";
  #title = "";
  #url = "";
  #loading = true;
  #snapshoot;

  #tabs;
  #chromeTabs;
  constructor({ favicon, title, url, insertAfter }, { tabs, chromeTabs }) {
    super();
    this.#tabId = ++__tabId;
    this.#favicon = favicon || loadingIcon;
    this.#title = title || url || defaultTitle;
    this.#url = url || "";
    this.#el = chromeTabs.addTab(
      { id: this.#tabId, title: this.#title, favicon: this.#favicon },
      { background: true }
    );
    this.#tabs = tabs;
    this.#chromeTabs = chromeTabs;

    // 插入到指定标签页后面
    if (insertAfter && tabs[insertAfter]) {
      const insertBefore = tabs[insertAfter].el.nextSibling;
      if (insertBefore) chromeTabs.tabContentEl.insertBefore(this.#el, insertBefore);
    }
  }

  update({ favicon, title } = {}) {
    if (favicon) this.#favicon = favicon;
    if (title) this.#title = title;
    this.#chromeTabs.updateTab(this.#el, {
      favicon: this.#loading ? loadingIcon : this.#favicon,
      title: this.#title,
    });
  }
  active() {
    this.#chromeTabs.setCurrentTab(this.#el);
  }
  remove() {
    this.#chromeTabs.removeTab(this.#el);
  }

  get tabId() {
    return this.#tabId;
  }
  get el() {
    return this.#el;
  }
  get favicon() {
    return this.#favicon;
  }
  set favicon(favicon) {
    if (favicon !== this.#favicon) this.update({ favicon });
  }
  get title() {
    return this.#title;
  }
  set title(title) {
    if (title !== this.#title) this.update({ title });
  }
  get url() {
    return this.#url;
  }
  set url(url) {
    this.#url = url;
  }
  get isActive() {
    return this.#chromeTabs.activeTabEl === this.#el;
  }
  get loading() {
    return this.#loading;
  }
  set loading(loading) {
    if (loading !== this.#loading) {
      this.#loading = loading;
      this.update();
    }
  }
  get snapshoot() {
    return this.#snapshoot;
  }
  set snapshoot(snapshoot) {
    this.#snapshoot = snapshoot;
  }
  get previousTab() {
    return this.#tabs[this.#el.previousSibling?.dataset.tabId];
  }
  get nextTab() {
    return this.#tabs[this.#el.nextSibling?.dataset.tabId];
  }
}
