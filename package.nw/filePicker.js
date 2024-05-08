/**
 * 文件选择器
 */
const $input = document.createElement("input");
$input.type = "file";

function setAttribute(attr, value) {
  if (value === false) $input.removeAttribute(attr);
  else $input.setAttribute(attr, value);
}

function showFilePicker({
  type = "open",
  filename = "",
  multiple = false,
  accept = "",
  defaultPath = "",
  openDirectory = false,
  title = "",
}) {
  return new Promise((resolve, reject) => {
    setAttribute("nwsaveas", type === "save" ? filename : false);
    setAttribute("multiple", multiple);
    setAttribute("accept", accept);
    setAttribute("nwworkingdir", defaultPath);
    setAttribute("nwdirectory", openDirectory);
    setAttribute("nwdirectorydesc", title);
    $input.onchange = () => {
      resolve([...$input.files]);
      $input.value = "";
    };
    $input.oncancel = () => {
      reject();
      $input.value = "";
    };
    $input.click();
  });
}

export function showOpenDialog(options = {}) {
  return showFilePicker({ ...options, type: "open" });
}

export function showSaveDialog(options = {}) {
  return showFilePicker({ ...options, type: "save" });
}

export default { showOpenDialog, showSaveDialog };
