const previewDock = document.querySelector("#previewDock");
const previewImage = previewDock.querySelector("img");

document.body.append(previewDock);

function showPreview(target) {
  const isLandscape = target.naturalWidth > target.naturalHeight;

  previewDock.classList.toggle("is-landscape", isLandscape);
  previewDock.classList.toggle("is-portrait", !isLandscape);
  previewImage.src = target.src;
  previewImage.alt = target.alt || "商店图大图预览";
  previewDock.hidden = false;
}

function hidePreview() {
  previewDock.hidden = true;
  previewDock.classList.remove("is-landscape", "is-portrait");
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
