/**
 * 标签栏
 */
import Tab from "./Tab.js";

const EventEmitter = require("node:events");
const emitter = new EventEmitter();

const $tabBar = document.querySelector("#tab-bar");
const $tabsRightArea = document.querySelector(".tabs-right-area");
const $addTab = document.querySelector("#add-tab-button");

// ChromeTabs库（非原版，加了些事件钩子，具体改动在源码中有“HACK”标记）
const chromeTabs = new ChromeTabs();
chromeTabs.init($tabBar);
// console.log(chromeTabs);

// 标签页数据
const tabs = {};
let activeTab;
// 根据tabId获取标签页
function getTab(tabId) {
  return tabId ? tabs[tabId] : activeTab;
}
// 根据url获取标签页
function getTabByUrl(url) {
  return Object.values(tabs).find((tab) => tab.url === url);
}

// 新建标签页
function addTab({ favicon, title, url, background, insertAfter }) {
  const tab = new Tab({ favicon, title, url, insertAfter }, { tabs, chromeTabs });
  tabs[tab.tabId] = tab;
  // 鼠标移上
  tab.el.addEventListener("mouseenter", (event) => {
    if (!chromeTabs.isDragging) emitter.emit("tabMouseenter", tab, event);
  });
  // 右键菜单
  tab.el.addEventListener("contextmenu", (event) => {
    emitter.emit("tabContextmenu", tab, event);
  });
  emitter.emit("tabAdded", tab);
  if (!background) tab.active();
  updateTabsRightArea();
}

// 设置当前激活的标签页
function setActiveTab(tabId) {
  tabs[tabId].active();
}

// 关闭标签页
function closeTab(tabId) {
  const tab = tabId ? tabs[tabId] : activeTab;
  tab.remove();
}
// 关闭其他标签页
function closeOtherTabs(tabId) {
  const tab = tabs[tabId];
  while (tab.previousTab) tab.previousTab.remove();
  while (tab.nextTab) tab.nextTab.remove();
}
// 关闭右侧标签页
function closeRightTabs(tabId) {
  const tab = tabs[tabId];
  while (tab.nextTab) tab.nextTab.remove();
}

// 标签页被移除
$tabBar.addEventListener("tabRemove", ({ detail }) => {
  const { tabId } = detail.tabEl.dataset;
  emitter.emit("tabClosed", tabs[tabId]);
  delete tabs[tabId];
  updateTabsRightArea();
  if (chromeTabs.tabEls.length === 0) emitter.emit("allTabsClosed");
});

// 激活标签页变更
$tabBar.addEventListener("activeTabChange", ({ detail }) => {
  const { tabId } = detail.tabEl.dataset;
  activeTab = tabs[tabId];
  emitter.emit("activeTabChange", activeTab);
});

// 相关事件冒泡出去
function bubble(type) {
  $tabBar.addEventListener(type, ({ detail }) => {
    emitter.emit(type, tabs[detail.tabEl.dataset.tabId], detail.event);
  });
}
bubble("tabMousedown");
bubble("dragStart");
bubble("dragMove");
bubble("dragEnd");
$tabBar.addEventListener("mouseleave", () => emitter.emit("tabBarMouseleave"));
$addTab.addEventListener("click", () => emitter.emit("addTab"));

// 更新标签页右侧区域的位置
let rightAreaX;
function updateTabsRightArea() {
  rightAreaX = chromeTabs.tabContentWidths.reduce((total, tab) => total + tab - 1, 0) + 12;
  $tabsRightArea.style.left = rightAreaX + "px";
}
window.addEventListener("resize", () => updateTabsRightArea());
function tabDragging({ detail }) {
  const { right } = detail.tabEl.getBoundingClientRect();
  $tabsRightArea.style.left = Math.max(rightAreaX, right - 10) + "px";
}
$tabBar.addEventListener("dragStart", (e) => {
  tabDragging(e);
  document.body.classList.add("is-dragging");
});
$tabBar.addEventListener("dragMove", tabDragging);
$tabBar.addEventListener("dragEnd", () => {
  updateTabsRightArea();
  document.body.classList.remove("is-dragging");
});

export default {
  on: (type, listener) => emitter.on(type, listener),
  addTab,
  getTab,
  getTabByUrl,
  closeTab,
  closeOtherTabs,
  closeRightTabs,
  get activeTab() {
    return activeTab;
  },
  setActiveTab,
};
