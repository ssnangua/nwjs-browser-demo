/**
 * 下载
 * @reference https://developer.chrome.com/docs/extensions/mv2/reference/downloads
 */
import { compileHTML, humanBytes, createMenu, delay } from "./common.js";
import setting from "./setting.js";
import filePicker from "./filePicker.js";

const fs = require("node:fs");
const path = require("node:path");
const EventEmitter = require("node:events");
const emitter = new EventEmitter();

// 用户下载目录
const downloadFolder = path.join(process.env.USERPROFILE, "Downloads");

chrome.downloads.setShelfEnabled(false);

const $downloads = document.querySelector("#downloads");
const $searchInput = document.querySelector("#downloads-search-input");
const $downloadsList = document.querySelector("#downloads-list");
const itemTemplate = document.querySelector("#download-item-template").innerHTML;

const MS = 200;
const prevBytes = {};

// 获取下载项数据
function searchDownloads(query = {}) {
  return new Promise((resolve) => chrome.downloads.search(query, resolve));
}

// 获取下载项图标
function getIcon(downloadId) {
  return new Promise((resolve) => {
    chrome.downloads.getFileIcon(downloadId, { size: 16 }, resolve);
  });
}

const moreMenu = createMenu([
  {
    label: "清除所有下载历史记录",
    icon: "./assets/delete.png",
    async click() {
      const items = await searchDownloads();
      items.forEach((item) => {
        if (!item.canResume) {
          chrome.downloads.erase({ id: item.id }, () => {});
        }
      });
    },
  },
]);

$downloads.querySelectorAll("[downloads-button]").forEach((el) => {
  const cmd = el.getAttribute("downloads-button");
  el.addEventListener("click", (e) => {
    if (cmd === "showDefaultFolder") {
      nw.Shell.openItem(setting.get("downloadsFolder"));
    } else if (cmd === "search") {
      startSearch();
    } else if (cmd === "end-search") {
      endSearch();
    } else if (cmd === "more") {
      const { right, bottom } = el.getBoundingClientRect();
      moreMenu.popup(right - 188, bottom);
    }
  });
});

function startSearch() {
  $downloads.classList.add("search");
  $searchInput.focus();
}
function endSearch() {
  $searchInput.value = "";
  doSearch();
  $downloads.classList.remove("search");
}
function doSearch() {
  const text = $searchInput.value.trim();
  [...$downloadsList.children].forEach(($item) => {
    $item.classList[!text || $item.dataset.name.indexOf(text) > -1 ? "remove" : "add"]("hide");
  });
  updateSize();
}
$searchInput.addEventListener("input", doSearch);

// 获取下载项数据
async function getItemData(item) {
  const name = item.filename || item.finalUrl || item.url;
  const bytesReceived = humanBytes(item.bytesReceived);
  const totalBytes = humanBytes(item.totalBytes);
  let bytesInfo;
  if (item.state !== "in_progress") {
    bytesInfo = "";
  } else if (prevBytes[item.id]) {
    const speed = item.bytesReceived - prevBytes[item.id].bytes;
    const remain = speed ? Math.round((item.totalBytes - item.bytesReceived) / speed) : 0;
    bytesInfo =
      `${humanBytes(speed)}/s - ${bytesReceived}/${totalBytes}, ` +
      (item.paused ? "已暂停" : `剩余 ${remain} 秒`);
  } else {
    bytesInfo = `${bytesReceived}/${totalBytes}`;
  }
  return {
    id: item.id,
    state: item.state,
    paused: item.paused ? "paused" : "",
    canResume: item.canResume ? "canResume" : "",
    deleted: item.exists ? "" : "deleted",
    icon: (item.mime && (await getIcon(item.id))) || "./assets/file.png",
    path: item.filename || "",
    name: name ? path.basename(name) : "",
    progress: Math.round((item.bytesReceived / item.totalBytes) * 100) || 0,
    bytesInfo,
  };
}

// 更新下载项信息
async function updateItem(item) {
  const data = await getItemData(item);
  let $item = $downloadsList.querySelector(`[data-id="${item.id}"]`);
  if ($item) {
    $item.dataset.path = data.path;
    $item.dataset.name = data.name;
    $item.className = `download-item ${data.state} ${data.paused} ${data.canResume} ${data.deleted}`;
    $item.querySelector(".download-icon>img").src = data.icon;
    $item.querySelector(".download-name").textContent = data.name;
    $item.querySelector(".download-progress").value = data.progress;
    $item.querySelector(".download-bytes-info").textContent = data.bytesInfo;
    updateSize();
  }
}

async function updateSize() {
  await delay();
  $downloads.style.height = $downloadsList.offsetHeight + 42 + "px";
}

let $selectedItem;
$downloadsList.addEventListener("click", async (e) => {
  if ($selectedItem) $selectedItem.classList.remove("selected");
  const $item = e.target.closest("[data-id]");
  if (!$item || $item.classList.contains("deleted")) return;
  $selectedItem = $item;
  $selectedItem.classList.add("selected");

  const id = +$item.dataset.id;
  const cmd = e.target.getAttribute("download-button");
  if (cmd === "pause") {
    // 暂停下载
    chrome.downloads.pause(id, () => $item.classList.add("paused"));
  } else if (cmd === "resume") {
    // 恢复下载
    chrome.downloads.resume(id, () => $item.classList.remove("paused"));
  } else if (cmd === "cancel") {
    // 取消下载
    chrome.downloads.cancel(id, () => {
      // 清除记录
      chrome.downloads.erase({ id }, () => {});
    });
  }
  const [item] = await searchDownloads({ id });
  if (!item?.exists) return updateItem(item);
  if (cmd === "showInFolder") {
    // 在文件夹中显示
    // nw.Shell.showItemInFolder($item.dataset.path);
    chrome.downloads.show(id);
  } else if (cmd === "delete") {
    // 删除文件
    chrome.downloads.removeFile(id, () => $item.classList.add("delete"));
  } else {
    // 打开文件
    nw.Shell.openItem($item.dataset.path);
    // chrome.downloads.open(id, () => {});
  }
});

// 轮询下载进度
let isPollProgress = false;
async function pollProgress() {
  isPollProgress = true;
  const items = await searchDownloads();
  const options = {
    downloadingCount: 0, // 处于“下载中”的下载项数量
    anyMissingTotalBytes: false, // 有字节数丢失
    anyInProgress: false, // 有下载项处于“下载中”
    anyPaused: false, // 有下载项处于“暂停中”
    anyDangerous: false, // 有下载项存在风险
    totalBytesReceived: 0, // 已下载的字节数
    totalTotalBytes: 0, // 总字节数
  };
  items.forEach((item) => {
    if (item.state == "in_progress") {
      updateItem(item);
      // 处于“下载中”的下载项数量
      options.downloadingCount += 1;
      // 有下载项处于“下载中”
      if (!item.paused) options.anyInProgress = true;
      if (item.totalBytes) {
        // 总字节数
        options.totalTotalBytes += item.totalBytes;
        // 已下载的字节数
        options.totalBytesReceived += item.bytesReceived;
        // 记录已下载字节数（用于计算下载速度）
        if (!prevBytes[item.id] || Date.now() - prevBytes[item.id].time >= 1000) {
          prevBytes[item.id] = { time: Date.now(), bytes: item.bytesReceived };
        }
      } else {
        // 有字节数丢失
        options.anyMissingTotalBytes = true;
      }
      // 有下载项存在风险
      const dangerous = item.danger != "safe" && item.danger != "accepted";
      options.anyDangerous = options.anyDangerous || dangerous;
      // 有下载项处于“暂停中”
      options.anyPaused = options.anyPaused || item.paused;
    } else if (item.state == "complete" && item.endTime && !item.error) {
      delete prevBytes[item.id];
      // maybeOpen(item.id);
    }
  });

  emitter.emit("change", {
    downloading: options.anyInProgress,
    count: options.downloadingCount,
    bytesReceived: options.totalBytesReceived,
    totalBytes: options.totalTotalBytes,
  });

  // 如果有下载项处于“下载中”，继续轮询下载进度
  if (options.anyInProgress) setTimeout(pollProgress, MS);
  else isPollProgress = false;
}
pollProgress();

// 有下载项被创建
const _div = document.createElement("div");
chrome.downloads.onCreated.addListener((downloadItem) => {
  // console.log(downloadItem);
  _div.innerHTML = compileHTML(itemTemplate, downloadItem);
  const $item = _div.firstElementChild;
  $downloadsList.insertBefore($item, $downloadsList.firstElementChild);
  updateSize();
  // 开始轮询下载进度
  if (!isPollProgress) pollProgress();
});

// 下载项信息更新
chrome.downloads.onChanged.addListener(async (downloadDelta) => {
  // console.log(downloadDelta);
  if (downloadDelta?.error?.current === "USER_CANCELED") {
    // 如果是用户取消下载，清除记录
    chrome.downloads.erase({ id: downloadDelta.id }, () => {});
  } else {
    // 更新下载项信息
    const [item] = await searchDownloads({ id: downloadDelta.id });
    if (item) updateItem(item);
    // 如果是恢复下载，开始轮询下载进度
    if (downloadDelta?.paused?.current === false && !isPollProgress) pollProgress();
  }
});

// 下载项从历史记录中清除
chrome.downloads.onErased.addListener((downloadId) => {
  delete prevBytes[downloadId];
  // 移除下载项节点
  const $item = $downloadsList.querySelector(`[data-id="${downloadId}"]`);
  $item?.remove();
  updateSize();
});

// 在下载面板外部按下鼠标，关闭下载面板
//   WebView会吞掉鼠标事件，导致无法侦听到window的鼠标事件，所以加个全屏蒙版
const $modal = document.querySelector(".modal");
$modal.addEventListener("mousedown", hide);
function hide() {
  $modal.classList.add("hide");
  $downloads.classList.add("hide");
  endSearch();
}

// 解决文件名冲突
function getNoConflictPath(folder, filename, count = 0) {
  const { name, ext } = path.parse(filename);
  const postfix = count > 0 ? ` (${count})` : "";
  let filePath = path.join(folder, `${name}${postfix}${ext}`);
  return fs.existsSync(filePath) ? getNoConflictPath(folder, filename, count + 1) : filePath;
}

// 下载文件
async function download({ url, filePath, dirname, filename, onProgress, onComplete }) {
  if (filePath) {
    const { dir, base } = path.parse(filePath);
    dirname = dirname || dir;
    filename = filename || base;
  } else {
    filename = filename || path.basename(url);
  }
  const savePath = getNoConflictPath(dirname || downloadFolder, filename);
  const response = await fetch(url);
  const reader = response.body.getReader();
  const totalBytes = response.headers.get("content-length"); // 文件总字节数
  const chunks = []; // 所有数据块
  let bytesReceived = 0; // 已下载字节数
  while (true) {
    const result = await reader.read();
    if (result.done) break; // 下载完成，退出循环
    chunks.push(result.value); // 缓存数据块
    bytesReceived += result.value.length; // 已下载字节数
    if (onProgress) onProgress({ totalBytes, bytesReceived }); // 下载进度回调
  }
  const arrayBuffer = new Uint8Array(bytesReceived); // 拼接数据块
  let offset = 0;
  for (const chunk of chunks) {
    arrayBuffer.set(chunk, offset);
    offset += chunk.length;
  }
  const buffer = Buffer.from(arrayBuffer);
  fs.writeFileSync(savePath, buffer);
  if (onComplete) onComplete(savePath);
}

// TODO：保存页面
function savePageAs(url, title) {
  const { origin, pathname } = new URL(url);
  const baseUrl = origin + pathname;
  console.log({ url, title });
  // filePicker
  //   .showSaveDialog({ filename: title + ".html", accept: ".htm,.html" })
  //   .then(([file]) => {
  //     let filename = path.basename(file.path);
  //     if (!path.extname(filename)) filename += ".html";
  //     download({
  //       url,
  //       filePath: file.path,
  //       onProgress({ totalBytes, bytesReceived }) {
  //         console.log(((bytesReceived / totalBytes) * 100) << 0);
  //       },
  //       onComplete(savePath) {
  //         console.log(savePath);
  //       },
  //     });
  //   })
  //   .catch(() => {});
}

export default {
  on: (type, listener) => emitter.on(type, listener),
  get isShow() {
    return !$downloads.classList.contains("hide");
  },
  async show() {
    if (this.isShow) return;
    // 获取下载项列表
    const items = await searchDownloads();
    // console.log(items);
    // 渲染下载面板
    const list = await Promise.all(items.map((item) => getItemData(item)));
    $downloadsList.innerHTML = list.map((item) => compileHTML(itemTemplate, item)).join("");
    // 显示下载面板
    $modal.classList.remove("hide");
    $downloads.classList.remove("hide");
    updateSize();
  },
  hide,
  download(url) {
    // TODO：NW.js该方法有bug，始终会弹出另存为对话框，即使把saveAs设为false
    // @reference https://github.com/nwjs/nw.js/issues/5599
    chrome.downloads.download({ url, saveAs: false });
  },
  savePageAs,
};
