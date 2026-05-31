const SUPABASE_URL = "https://ulpybjsdogyfdawfikmu.supabase.co";
const SUPABASE_KEY = "sb_publishable_eNa9BtBpXWDs0vM_IXNg-g_72ls9pYe";

const tableBody = document.querySelector("#assetTableBody");
const toast = document.querySelector("#toast");

function showToast(message, type = "success") {
  toast.textContent = message;
  toast.className = `toast is-visible ${type}`;

  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.className = "toast";
  }, 2400);
}

function formatDate(value) {
  if (!value) {
    return "未知";
  }

  return value.replaceAll("-", "/");
}

function sanitizeFilename(value) {
  return String(value).replace(/[\\/:*?"<>|]/g, "_").slice(0, 80) || "image";
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function fetchAssetRecords() {
  const query = new URLSearchParams({
    select: "id,app_id,captured_date,category,note,asset_images(image_url,sort_order)",
    order: "captured_date.desc,created_at.desc",
  });

  const response = await fetch(`${SUPABASE_URL}/rest/v1/asset_records?${query}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase 请求失败：${response.status}`);
  }

  return response.json();
}

function renderEmpty(message) {
  tableBody.replaceChildren();

  const row = document.createElement("tr");
  const cell = document.createElement("td");
  cell.className = "empty-cell";
  cell.colSpan = 6;
  cell.textContent = message;

  row.append(cell);
  tableBody.append(row);
}

function createTextCell(className, text) {
  const cell = document.createElement("td");
  cell.className = className;
  cell.textContent = text;
  return cell;
}

function createImageCell(record) {
  const cell = document.createElement("td");
  const strip = document.createElement("div");
  const images = [...(record.asset_images || [])].sort((a, b) => a.sort_order - b.sort_order).slice(0, 8);

  strip.className = "store-images";

  for (const [index, image] of images.entries()) {
    const img = document.createElement("img");
    img.src = image.image_url;
    img.alt = `${record.app_id} 商店图 ${index + 1}`;
    img.loading = "lazy";
    strip.append(img);
  }

  cell.append(strip);
  return cell;
}

function createActionCell(record) {
  const cell = document.createElement("td");
  const downloadButton = document.createElement("button");
  const deleteButton = document.createElement("button");

  downloadButton.className = "download-record";
  downloadButton.type = "button";
  downloadButton.textContent = "下载全部";
  downloadButton.addEventListener("click", () => downloadRecordImages(record));

  deleteButton.className = "remove-record";
  deleteButton.type = "button";
  deleteButton.textContent = "删除";
  deleteButton.disabled = true;
  deleteButton.title = "当前公开看板只开放读取，删除需要后台权限";

  cell.append(downloadButton, deleteButton);
  return cell;
}

function renderRecords(records) {
  tableBody.replaceChildren();

  if (records.length === 0) {
    renderEmpty("暂无素材数据。等插件或后台写入 Supabase 后，这里会自动显示。");
    return;
  }

  for (const record of records) {
    const row = document.createElement("tr");

    row.append(
      createTextCell("appid-cell", record.app_id),
      createTextCell("captured-cell", formatDate(record.captured_date)),
      createTextCell("category-cell", record.category || "未填写"),
      createImageCell(record),
      createTextCell("note-cell", record.note || "无"),
      createActionCell(record),
    );

    tableBody.append(row);
  }
}

async function downloadRecordImages(record) {
  const images = [...(record.asset_images || [])].sort((a, b) => a.sort_order - b.sort_order);
  let count = 0;

  if (images.length === 0) {
    showToast("这一行没有可下载图片。", "error");
    return;
  }

  for (const [index, image] of images.entries()) {
    try {
      const response = await fetch(image.image_url);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = objectUrl;
      link.download = `${sanitizeFilename(record.app_id)}-${String(index + 1).padStart(2, "0")}.png`;
      link.style.display = "none";
      document.body.append(link);
      link.click();
      link.remove();

      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      count += 1;
      await wait(180);
    } catch {
      // Continue downloading other images if one image fails.
    }
  }

  if (count === 0) {
    showToast("下载失败：图片源暂时无法读取。", "error");
    return;
  }

  showToast(`已触发下载 ${count} 张图片。`);
}

async function initBoard() {
  try {
    const records = await fetchAssetRecords();
    renderRecords(records);
  } catch (error) {
    renderEmpty(error.message);
  }
}

initBoard();
