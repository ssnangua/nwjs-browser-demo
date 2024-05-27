/**
 * 历史记录
 * @reference https://developer.chrome.com/docs/extensions/reference/api/history
 */
import {
  compileHTML,
  formatDate,
  expandDate,
  getImageBase64,
  createMenu,
  delay,
} from "./common.js";

const EventEmitter = require("node:events");
const emitter = new EventEmitter();

const $history = document.querySelector("#history");
const $historyList = document.querySelector("#history-list");
const itemTemplate = document.querySelector("#history-item-template").innerHTML;

let history = await new Promise((resolve) => {
  chrome.storage.local.get(["history"], ({ history }) => resolve(history || []));
});

// storage发生变更时（可能来自其他窗口的修改），同步最新数据
chrome.storage.onChanged.addListener((data) => {
  if (data.history) history = data.history.newValue;
});

function search({ startTime, endTime, text, maxResults = 100 }) {
  let results = history.filter((item) => {
    if (startTime && item.lastVisitTime < startTime) return false;
    if (endTime && item.lastVisitTime > endTime) return false;
    if (text && item.title.indexOf(text) === -1) return false;
    return true;
  });
  if (maxResults > 0) results = results.slice(0, maxResults);
  return results;
}

async function addUrl({ url, title, favicon }) {
  if (url.startsWith(location.origin)) return;
  const oldItem = _deleteUrl({ url });
  if (oldItem) favicon = oldItem.favicon;
  else if (favicon.startsWith("http")) favicon = await getImageBase64(favicon);
  const newItem = {
    url,
    title,
    favicon,
    lastVisitTime: +Date.now(),
  };
  history.unshift(newItem);
  chrome.storage.local.set({ history });
}

function _deleteUrl({ url }) {
  const index = history.findIndex((item) => item.url === url);
  if (index > -1) return history.splice(index, 1)[0];
}
function deleteUrl({ url }) {
  _deleteUrl({ url });
  chrome.storage.local.set({ history });
}

function deleteRange({ startTime, endTime }) {
  history = history.filter((item) => {
    return item.lastVisitTime < startTime || item.lastVisitTime > endTime;
  });
  chrome.storage.local.set({ history });
}

function deleteAll() {
  history = [];
  chrome.storage.local.set({ history });
}

async function updateSize() {
  await delay();
  $history.style.setProperty("--height", $historyList.offsetHeight + 42 + "px");
}

// 搜索
function doSearch(text = "") {
  text = text.trim();
  // TODO：没有做节流处理，数据较大时会有性能问题
  $historyList.querySelectorAll(".history-item").forEach(($item) => {
    $item.classList[!text || $item.dataset.title.indexOf(text) > -1 ? "remove" : "add"]("hide");
  });
  updateSize();
}
$history.addEventListener("search", ({ detail }) => doSearch(detail));
$history.addEventListener("end-search", () => doSearch(""));

// 更多选项
const moreMenu = createMenu([
  {
    label: "清除所有浏览数据",
    icon: "./assets/delete.png",
    click() {
      deleteAll();
      $historyList.innerHTML = "";
      updateSize();
    },
  },
]);
$history.addEventListener("more", ({ detail }) => {
  const { right, bottom } = detail.el.getBoundingClientRect();
  moreMenu.popup(right - 164, bottom);
});

// 列表项点击
$historyList.addEventListener("click", (e) => {
  const isDelete = e.target.getAttribute("history-button") === "delete";
  const $item = e.target.closest("[data-url]");
  if ($item) {
    if (isDelete) {
      // 删除一条历史记录
      deleteUrl({ url: $item.dataset.url });
      // 如果相邻的两个元素都是日期节点，移除上一个日期节点
      if (
        $item.previousElementSibling.classList.contains("history-date") &&
        $item.nextElementSibling.classList.contains("history-date")
      )
        $item.previousElementSibling.remove();
      // 移除列表项节点
      $item.remove();
      updateSize();
    } else {
      // 打开历史记录
      emitter.emit("openHistory", $item.dataset.url);
    }
  } else if (isDelete) {
    // 删除一天的历史记录
    const $date = e.target.closest("[data-date]");
    const { date: formatedDate, lastVisitTime } = $date.dataset;
    const { year, month, date } = expandDate(+lastVisitTime);
    const startTime = +new Date([year, month + 1, date].join("-"));
    const endTime = startTime + 1000 * 60 * 60 * 24 - 1;
    deleteRange({ startTime, endTime });
    // 移除节点
    [...$historyList.children].forEach((el) => {
      if (el.dataset.date === formatedDate) el.remove();
    });
    updateSize();
  }
});

export default {
  on: (type, listener) => emitter.on(type, listener),
  get isShow() {
    return $history.isShow;
  },
  show() {
    if (this.isShow) return;
    // 渲染历史记录列表
    // TODO：没有做滚动加载，数据较大时会有性能问题
    const dateMap = {};
    // 按日期分组
    history.forEach((item) => {
      const [date, time] = formatDate(item.lastVisitTime, "yyyy年M月d日D hh:mm").split(" ");
      if (!dateMap[date]) dateMap[date] = [];
      dateMap[date].push({ ...item, date, time });
    });
    $historyList.innerHTML = Object.entries(dateMap)
      .map(([date, list]) => {
        return (
          `<div class="history-date" data-date="${date}" data-last-visit-time="${list[0].lastVisitTime}">
            <span>${date}<span>
            <i title="删除" class="iconfont icon-close history-delete" history-button="delete"></i>
          </div>` + list.map((item) => compileHTML(itemTemplate, item)).join("")
        );
      })
      .join("");
    // 显示历史记录面板
    $history.show();
    updateSize();
  },
  hide() {
    $history.hide();
  },
  search,
  addUrl,
  deleteUrl,
  deleteRange,
  deleteAll,
};
