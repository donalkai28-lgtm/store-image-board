const SUPABASE_URL = "https://ulpybjsdogyfdawfikmu.supabase.co";
const SUPABASE_KEY = "sb_publishable_eNa9BtBpXWDs0vM_IXNg-g_72ls9pYe";

const tableBody = document.querySelector("#assetTableBody");
const toast = document.querySelector("#toast");
const categoryOptions = document.querySelector("#categoryOptions");
const prevPageBtn = document.querySelector("#prevPageBtn");
const nextPageBtn = document.querySelector("#nextPageBtn");
const pageInfo = document.querySelector("#pageInfo");
const storeImagesFilter = document.querySelector("#storeImagesFilter");
const iconFilter = document.querySelector("#iconFilter");
const categoryFilterBtn = document.querySelector("#categoryFilterBtn");
const categoryFilterMenu = document.querySelector("#categoryFilterMenu");
const PAGE_SIZE = 15;
let currentRecords = [];
let currentPage = 1;
let totalRecords = 0;
let categoryValues = [];
let selectedCategories = new Set();
let currentContentType = "store-images";

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

async function fetchAssetRecords(page = 1) {
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const query = new URLSearchParams({
    select: "id,app_id,product_url,product_alias,captured_date,category,note,created_at,asset_images(image_url,sort_order)",
    order: "created_at.desc",
  });

  if (selectedCategories.size > 0) {
    query.set("category", `in.(${Array.from(selectedCategories).map((category) => `"${category.replaceAll('"', '\\"')}"`).join(",")})`);
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/asset_records?${query}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: "count=exact",
      Range: `${from}-${to}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase 请求失败：${response.status}`);
  }

  const records = await response.json();
  const contentRange = response.headers.get("content-range") || "";
  const count = Number(contentRange.split("/")[1]);

  return {
    records,
    total: Number.isFinite(count) ? count : from + records.length,
  };
}

async function fetchCategoryValues() {
  const query = new URLSearchParams({
    select: "category",
    category: "not.is.null",
  });

  const response = await fetch(`${SUPABASE_URL}/rest/v1/asset_records?${query}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });

  if (!response.ok) {
    return [];
  }

  const rows = await response.json();
  return [...new Set(rows.map((row) => row.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-CN"));
}

function renderEmpty(message) {
  tableBody.replaceChildren();

  const row = document.createElement("tr");
  const cell = document.createElement("td");
  cell.className = "empty-cell";
  cell.colSpan = 7;
  cell.textContent = message;

  row.append(cell);
  tableBody.append(row);
}

function createSerialCell(index) {
  const cell = document.createElement("td");
  cell.className = "serial-cell";
  cell.textContent = String(totalRecords - ((currentPage - 1) * PAGE_SIZE + index));
  return cell;
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
  const productWrap = document.createElement("div");
  const alias = document.createElement("div");

  cell.className = "product-cell";
  productWrap.className = "product-main";

  if (record.product_url) {
    const link = document.createElement("a");
    link.href = record.product_url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = productName;
    productWrap.append(link);
  } else {
    productWrap.textContent = productName;
  }

  if (record.product_alias) {
    alias.className = "product-alias";
    alias.textContent = record.product_alias;
    cell.append(productWrap, alias);
    return cell;
  }

  cell.append(productWrap);
  return cell;
}

function createCategoryCell(record) {
  const cell = document.createElement("td");
  const wrap = document.createElement("div");
  const input = document.createElement("input");
  const button = document.createElement("button");
  const menu = document.createElement("div");

  cell.className = "category-cell";
  wrap.className = "category-editor";
  input.dataset.field = "category";
  input.className = "category-input";
  input.type = "text";
  input.value = record.category || "";
  input.placeholder = "填写品类";

  button.className = "category-dropdown-btn";
  button.type = "button";
  button.textContent = "⌄";
  button.title = "选择已有品类";
  menu.className = "category-menu";
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    closeCategoryMenus(menu);
    renderCategoryMenu(menu, input, record.id, cell.closest("tr"));
    menu.classList.toggle("is-open");
  });

  input.addEventListener("change", () => {
    const categories = getCategoryValues(currentRecords);
    if (categories.includes(input.value.trim()) && input.value.trim() !== (record.category || "")) {
      saveRecordEdits(record.id, cell.closest("tr"));
    }
  });

  wrap.append(input, button, menu);
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
  const deleteButton = document.createElement("button");

  saveButton.className = "save-record";
  saveButton.type = "button";
  saveButton.textContent = "保存";
  saveButton.addEventListener("click", () => saveRecordEdits(record.id, cell.closest("tr")));

  downloadButton.className = "download-record";
  downloadButton.type = "button";
  downloadButton.textContent = "下载";
  downloadButton.addEventListener("click", () => downloadRecordImages(record));

  deleteButton.className = "remove-record";
  deleteButton.type = "button";
  deleteButton.textContent = "删除";
  deleteButton.addEventListener("click", () => deleteRecord(record.id));

  cell.append(saveButton, downloadButton, deleteButton);
  return cell;
}

function getCategoryValues(records) {
  if (categoryValues.length > 0) {
    return categoryValues;
  }

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

function updateCategoryFilterLabel() {
  if (selectedCategories.size === 0) {
    categoryFilterBtn.textContent = "全部品类";
    return;
  }

  categoryFilterBtn.textContent = `已选 ${selectedCategories.size} 个品类`;
}

function renderCategoryFilterMenu() {
  categoryFilterMenu.replaceChildren();

  if (categoryValues.length === 0) {
    const empty = document.createElement("div");
    empty.className = "category-filter-empty";
    empty.textContent = "暂无品类";
    categoryFilterMenu.append(empty);
    return;
  }

  const allItem = document.createElement("label");
  const allCheckbox = document.createElement("input");
  allCheckbox.type = "checkbox";
  allCheckbox.checked = selectedCategories.size === 0;
  allCheckbox.addEventListener("change", () => {
    selectedCategories.clear();
    updateCategoryFilterLabel();
    renderCategoryFilterMenu();
    loadPage(1);
  });
  allItem.append(allCheckbox, document.createTextNode("全部"));
  categoryFilterMenu.append(allItem);

  for (const category of categoryValues) {
    const item = document.createElement("label");
    const checkbox = document.createElement("input");

    checkbox.type = "checkbox";
    checkbox.checked = selectedCategories.has(category);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        selectedCategories.add(category);
      } else {
        selectedCategories.delete(category);
      }

      updateCategoryFilterLabel();
      renderCategoryFilterMenu();
      loadPage(1);
    });

    item.append(checkbox, document.createTextNode(category));
    categoryFilterMenu.append(item);
  }
}

function setContentType(type) {
  currentContentType = type;
  storeImagesFilter.classList.toggle("is-active", type === "store-images");
  iconFilter.classList.toggle("is-active", type === "icon");

  if (type === "icon") {
    renderEmpty("icon 页面暂未接入数据。");
    totalRecords = 0;
    renderPagination();
    return;
  }

  loadPage(1);
}

function closeCategoryMenus(exceptMenu = null) {
  for (const menu of document.querySelectorAll(".category-menu.is-open")) {
    if (menu !== exceptMenu) {
      menu.classList.remove("is-open");
    }
  }
}

function renderCategoryMenu(menu, input, recordId, row) {
  const categories = getCategoryValues(currentRecords);
  menu.replaceChildren();

  if (categories.length === 0) {
    const empty = document.createElement("div");
    empty.className = "category-menu-empty";
    empty.textContent = "暂无已保存品类";
    menu.append(empty);
    return;
  }

  for (const category of categories) {
    const item = document.createElement("button");
    item.type = "button";
    item.textContent = category;
    item.addEventListener("click", () => {
      input.value = category;
      menu.classList.remove("is-open");
      saveRecordEdits(recordId, row);
    });
    menu.append(item);
  }
}

function renderRecords(records) {
  currentRecords = records;
  tableBody.replaceChildren();
  renderCategoryOptions(records);

  if (records.length === 0) {
    renderEmpty("暂无素材数据。等插件或后台写入 Supabase 后，这里会自动显示。");
    return;
  }

  for (const [index, record] of records.entries()) {
    const row = document.createElement("tr");
    row.dataset.recordId = record.id;

    row.append(
      createSerialCell(index),
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

function renderPagination() {
  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));

  prevPageBtn.disabled = currentPage <= 1;
  nextPageBtn.disabled = currentPage >= totalPages;
  pageInfo.textContent = `第 ${currentPage} / ${totalPages} 页，共 ${totalRecords} 条`;
}

async function loadPage(page) {
  if (currentContentType !== "store-images") {
    return;
  }

  currentPage = page;
  renderEmpty("正在读取素材数据...");

  const { records, total } = await fetchAssetRecords(currentPage);
  totalRecords = total;

  if (records.length === 0 && currentPage > 1) {
    await loadPage(currentPage - 1);
    return;
  }

  renderRecords(records);
  renderPagination();
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

  categoryValues = await fetchCategoryValues();
  await loadPage(currentPage);
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

async function deleteRecord(recordId) {
  if (!window.confirm("确定删除这一行素材记录吗？")) {
    return;
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/asset_records?id=eq.${recordId}`, {
    method: "DELETE",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: "return=minimal",
    },
  });

  if (!response.ok) {
    showToast(`删除失败：${response.status}`, "error");
    return;
  }

  categoryValues = await fetchCategoryValues();
  await loadPage(currentPage);
  showToast("已删除该行记录。");
}

async function initBoard() {
  try {
    categoryValues = await fetchCategoryValues();
    updateCategoryFilterLabel();
    renderCategoryFilterMenu();
    await loadPage(1);
  } catch (error) {
    renderEmpty(error.message);
  }
}

initBoard();

prevPageBtn.addEventListener("click", () => {
  if (currentPage > 1) {
    loadPage(currentPage - 1);
  }
});

nextPageBtn.addEventListener("click", () => {
  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));
  if (currentPage < totalPages) {
    loadPage(currentPage + 1);
  }
});

storeImagesFilter.addEventListener("click", () => setContentType("store-images"));
iconFilter.addEventListener("click", () => setContentType("icon"));

categoryFilterBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  categoryFilterMenu.classList.toggle("is-open");
});

categoryFilterMenu.addEventListener("click", (event) => {
  event.stopPropagation();
});

document.addEventListener("click", () => {
  closeCategoryMenus();
  categoryFilterMenu.classList.remove("is-open");
});
