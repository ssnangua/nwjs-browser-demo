/**
 * 链接预览
 */
const $hrefPreview = document.querySelector("#href-preview");

export default {
  show(url) {
    $hrefPreview.innerText = url;
    $hrefPreview.style.opacity = 1;
  },
  hide() {
    $hrefPreview.style.opacity = 0;
  },
};
