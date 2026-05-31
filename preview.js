const preview = document.querySelector("#imagePreview");
const previewImage = preview.querySelector("img");

const PREVIEW_MAX_WIDTH = 520;
const PREVIEW_MAX_HEIGHT = 462;
const GAP = 16;
const EDGE = 16;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function placePreview(triggerImage) {
  const stripRect = triggerImage.closest(".store-images").getBoundingClientRect();
  const rowRect = triggerImage.closest("tr").getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const ratio = triggerImage.naturalWidth && triggerImage.naturalHeight ? triggerImage.naturalWidth / triggerImage.naturalHeight : 9 / 16;
  let previewWidth = PREVIEW_MAX_WIDTH;
  let previewHeight = PREVIEW_MAX_HEIGHT;

  if (ratio >= 1) {
    previewHeight = Math.round(previewWidth / ratio);
  } else {
    previewWidth = Math.round(previewHeight * ratio);
  }

  preview.style.width = `${previewWidth}px`;
  preview.style.height = `${previewHeight}px`;

  let x = stripRect.right + GAP;
  let y = clamp(rowRect.top, EDGE, viewportHeight - previewHeight - EDGE);

  if (x + previewWidth > viewportWidth - EDGE) {
    x = stripRect.left - previewWidth - GAP;
  }

  if (x < EDGE) {
    x = clamp(triggerImage.getBoundingClientRect().left - previewWidth - GAP, EDGE, viewportWidth - previewWidth - EDGE);
  }

  preview.style.left = `${x}px`;
  preview.style.top = `${y}px`;
}

function hidePreview() {
  preview.classList.remove("is-visible");
  preview.setAttribute("aria-hidden", "true");
  previewImage.removeAttribute("src");
}

document.addEventListener("click", (event) => {
  const target = event.target;

  if (!(target instanceof HTMLImageElement) || !target.closest(".store-images")) {
    hidePreview();
    return;
  }

  event.stopPropagation();
  previewImage.src = target.src;
  previewImage.alt = target.alt || "商店图大图预览";
  placePreview(target);
  preview.classList.add("is-visible");
  preview.setAttribute("aria-hidden", "false");
});

window.addEventListener("scroll", hidePreview, { passive: true });
window.addEventListener("resize", hidePreview);
