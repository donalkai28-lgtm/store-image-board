const previewDock = document.querySelector("#previewDock");
const previewImage = previewDock.querySelector("img");

function hidePreview() {
  previewDock.hidden = true;
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
  previewDock.hidden = false;
  previewDock.scrollIntoView({ block: "nearest", behavior: "smooth" });
});

window.addEventListener("scroll", hidePreview, { passive: true });
window.addEventListener("resize", hidePreview);
