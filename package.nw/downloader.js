/**
 * 下载
 */
import filePicker from "./filePicker.js";
const fs = require("node:fs");
const path = require("node:path");

// 用户下载目录
const downloadFolder = path.join(process.env.USERPROFILE, "Downloads");

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
}

// 链接另存为
function saveLinkAs(url) {
  let filename = path.basename(new URL(url).pathname);
  if (!path.extname(filename)) filename += ".htm";
  filePicker
    .showSaveDialog({ filename })
    .then(([file]) => {
      download({
        url,
        filePath: file.path,
        onProgress({ totalBytes, bytesReceived }) {
          console.log(((bytesReceived / totalBytes) * 100) << 0);
        },
        onComplete(savePath) {
          console.log(savePath);
        },
      });
    })
    .catch(() => {});
}

// 图片另存为
function saveImageAs(url) {
  let filename = path.basename(new URL(url).pathname);
  if (!path.extname(filename)) filename += ".webp";
  filePicker
    .showSaveDialog({ filename })
    .then(([file]) => {
      download({
        url,
        filePath: file.path,
        onProgress({ totalBytes, bytesReceived }) {
          console.log(((bytesReceived / totalBytes) * 100) << 0);
        },
        onComplete(savePath) {
          console.log(savePath);
        },
      });
    })
    .catch(() => {});
}

export default {
  download,
  savePageAs,
  saveLinkAs,
  saveImageAs,
};
