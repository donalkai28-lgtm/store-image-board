const previewDock = document.querySelector("#previewDock");
const previewImage = previewDock.querySelector("img");

const PREVIEW_MAX_WIDTH = 520;
const PREVIEW_MAX_HEIGHT = 462;
const GAP = 4;
const EDGE = 16;

document.body.append(previewDock);

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function placePreview(triggerImage) {
  const strip = triggerImage.closest(".store-images");
  const firstImage = strip.querySelector("img");
  const firstRect = firstImage.getBoundingClientRect();
  const ratio = triggerImage.naturalWidth && triggerImage.naturalHeight ? triggerImage.naturalWidth / triggerImage.naturalHeight : 9 / 16;
  const viewportWidth = window.innerWidth;
  let previewWidth = PREVIEW_MAX_WIDTH;
  let previewHeight = PREVIEW_MAX_HEIGHT;

  if (ratio >= 1) {
    previewHeight = Math.round(previewWidth / ratio);
  } else {
    previewWidth = Math.round(previewHeight * ratio);
  }

  const left = clamp(firstRect.left, EDGE, viewportWidth - previewWidth - EDGE);
  const top = firstRect.bottom + GAP;

  previewDock.style.width = `${previewWidth}px`;
  previewDock.style.height = `${previewHeight}px`;
  previewDock.style.left = `${left}px`;
  previewDock.style.top = `${top}px`;
}

function showPreview(target) {
  previewImage.src = target.src;
  previewImage.alt = target.alt || "商店图大图预览";
  placePreview(target);
  previewDock.hidden = false;
}

function hidePreview() {
  previewDock.hidden = true;
  previewImage.removeAttribute("src");
}

document.addEventListener("mouseover", (event) => {
  const target = event.target;

  if (!(target instanceof HTMLImageElement) || !target.closest(".store-images")) {
    return;
  }

  showPreview(target);
});

document.addEventListener("mouseout", (event) => {
  const target = event.target;

  if (!(target instanceof HTMLImageElement) || !target.closest(".store-images")) {
    return;
  }

  const nextTarget = event.relatedTarget;
  if (nextTarget instanceof HTMLImageElement && nextTarget.closest(".store-images")) {
    return;
  }

  hidePreview();
});

window.addEventListener("resize", hidePreview);
