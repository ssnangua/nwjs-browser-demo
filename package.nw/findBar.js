/**
 * 查找栏
 */
const EventEmitter = require("node:events");
const emitter = new EventEmitter();

const $findBar = document.querySelector("#find-bar");
const $input = document.querySelector("#find-input");
const $result = document.querySelector("#find-result");
const $prev = document.querySelector('[find-button="prev"]');
const $next = document.querySelector('[find-button="next"]');
const $close = document.querySelector('[find-button="close"]');

let isShow = false;
function show(data) {
  if (data) {
    const { text, index, total } = data;
    $input.value = text;
    $result.innerText = index + "/" + total;
    $result.classList[text ? "remove" : "add"]("hide");
  }
  $findBar.classList.remove("hide");
  if (document.activeElement !== $input) focus();
  isShow = true;
}
function hide() {
  $findBar.classList.add("hide");
  emitter.emit("stopFinding");
  isShow = false;
}
function focus() {
  $input.focus();
  $input.setSelectionRange(0, $input.value.length);
}
function find(cmd) {
  emitter.emit("find", cmd, { text: $input.value });
  $input.focus();
}
$input.addEventListener("input", () => find("find"));
$prev.addEventListener("click", () => find("findPrev"));
$next.addEventListener("click", () => find("findNext"));
$close.addEventListener("click", hide);

export default {
  on: (type, listener) => emitter.on(type, listener),
  get isShow() {
    return isShow;
  },
  get text() {
    return $input.value;
  },
  show,
  hide,
  focus,
};
