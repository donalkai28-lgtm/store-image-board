const SUPABASE_URL = "https://ulpybjsdogyfdawfikmu.supabase.co";
const SUPABASE_KEY = "sb_publishable_eNa9BtBpXWDs0vM_IXNg-g_72ls9pYe";

const tableBody = document.querySelector("#assetTableBody");
const toast = document.querySelector("#toast");
const categoryOptions = document.querySelector("#categoryOptions");
let currentRecords = [];

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

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value).replaceAll("-", "/");
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
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
    select: "id,app_id,product_url,captured_date,category,note,created_at,asset_images(image_url,sort_order)",
    order: "created_at.desc",
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

function createProductCell(record) {
  const cell = document.createElement("td");
  const productName = record.app_id || "未命名产品";

  cell.className = "product-cell";

  if (record.product_url) {
    const link = document.createElement("a");
    link.href = record.product_url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = productName;
    cell.append(link);
    return cell;
  }

  cell.textContent = productName;
  return cell;
}

function createCategoryCell(record) {
  const cell = document.createElement("td");
  const wrap = document.createElement("div");
  const input = document.createElement("input");
  const button = document.createElement("button");

  cell.className = "category-cell";
  wrap.className = "category-editor";
  input.dataset.field = "category";
  input.className = "category-input";
  input.type = "text";
  input.list = "categoryOptions";
  input.value = record.category || "";
  input.placeholder = "填写品类";

  button.className = "category-dropdown-btn";
  button.type = "button";
  button.textContent = "⌄";
  button.title = "选择已有品类";
  button.addEventListener("click", () => {
    input.focus();
    if (typeof input.showPicker === "function") {
      input.showPicker();
    }
  });

  input.addEventListener("change", () => {
    const categories = getCategoryValues(currentRecords);
    if (categories.includes(input.value.trim()) && input.value.trim() !== (record.category || "")) {
      saveRecordEdits(record.id, cell.closest("tr"));
    }
  });

  wrap.append(input, button);
  cell.append(wrap);
  return cell;
}

function createNoteCell(record) {
  const cell = document.createElement("td");
  const textarea = document.createElement("textarea");

  cell.className = "note-cell";
  textarea.className = "note-input";
  textarea.value = record.note || "";
  textarea.placeholder = "填写备注";
  textarea.dataset.field = "note";

  cell.append(textarea);
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
    img.alt = `${record.app_id || "产品"} 商店图 ${index + 1}`;
    img.loading = "lazy";
    strip.append(img);
  }

  cell.append(strip);
  return cell;
}

function createActionCell(record) {
  const cell = document.createElement("td");
  const saveButton = document.createElement("button");
  const downloadButton = document.createElement("button");

  saveButton.className = "save-record";
  saveButton.type = "button";
  saveButton.textContent = "保存";
  saveButton.addEventListener("click", () => saveRecordEdits(record.id, cell.closest("tr")));

  downloadButton.className = "download-record";
  downloadButton.type = "button";
  downloadButton.textContent = "下载";
  downloadButton.addEventListener("click", () => downloadRecordImages(record));

  cell.append(saveButton, downloadButton);
  return cell;
}

function getCategoryValues(records) {
  return [...new Set(records.map((record) => record.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-CN"));
}

function renderCategoryOptions(records) {
  const categories = getCategoryValues(records);

  categoryOptions.replaceChildren(
    ...categories.map((category) => {
      const option = document.createElement("option");
      option.value = category;
      return option;
    }),
  );
}

function renderRecords(records) {
  currentRecords = records;
  tableBody.replaceChildren();
  renderCategoryOptions(records);

  if (records.length === 0) {
    renderEmpty("暂无素材数据。等插件或后台写入 Supabase 后，这里会自动显示。");
    return;
  }

  for (const record of records) {
    const row = document.createElement("tr");
    row.dataset.recordId = record.id;

    row.append(
      createProductCell(record),
      createTextCell("captured-cell", formatDate(record.created_at || record.captured_date)),
      createCategoryCell(record),
      createImageCell(record),
      createNoteCell(record),
      createActionCell(record),
    );

    tableBody.append(row);
  }
}

async function saveRecordEdits(recordId, row) {
  const category = row.querySelector('[data-field="category"]').value.trim();
  const note = row.querySelector('[data-field="note"]').value.trim();

  const response = await fetch(`${SUPABASE_URL}/rest/v1/asset_records?id=eq.${recordId}`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      category: category || null,
      note: note || null,
    }),
  });

  if (!response.ok) {
    showToast(`保存失败：${response.status}`, "error");
    return;
  }

  if (category && !Array.from(categoryOptions.options).some((option) => option.value === category)) {
    const option = document.createElement("option");
    option.value = category;
    categoryOptions.append(option);
  }

  const records = await fetchAssetRecords();
  renderRecords(records);
  showToast("已保存品类和备注。");
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
      link.download = `${sanitizeFilename(record.app_id || "product")}-${String(index + 1).padStart(2, "0")}.png`;
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
