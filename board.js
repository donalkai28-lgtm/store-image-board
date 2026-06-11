const SUPABASE_URL = "https://ulpybjsdogyfdawfikmu.supabase.co";
const SUPABASE_KEY = "sb_publishable_eNa9BtBpXWDs0vM_IXNg-g_72ls9pYe";

const tableBody = document.querySelector("#assetTableBody");
const tablePanel = document.querySelector(".table-panel");
const iconPanel = document.querySelector("#iconPanel");
const iconGrid = document.querySelector("#iconGrid");
const singleImagePanel = document.querySelector("#singleImagePanel");
const singleImageGrid = document.querySelector("#singleImageGrid");
const toast = document.querySelector("#toast");
const categoryOptions = document.querySelector("#categoryOptions");
const pagination = document.querySelector(".pagination");
const prevPageBtn = document.querySelector("#prevPageBtn");
const nextPageBtn = document.querySelector("#nextPageBtn");
const pageInfo = document.querySelector("#pageInfo");
const storeImagesFilter = document.querySelector("#storeImagesFilter");
const iconFilter = document.querySelector("#iconFilter");
const singleImageFilter = document.querySelector("#singleImageFilter");
const categoryFilterBtn = document.querySelector("#categoryFilterBtn");
const categoryFilterMenu = document.querySelector("#categoryFilterMenu");
const collectorFilterBtn = document.querySelector("#collectorFilterBtn");
const collectorFilterMenu = document.querySelector("#collectorFilterMenu");
const refreshPageBtn = document.querySelector("#refreshPageBtn");
const STORE_PAGE_SIZE = 20;
const SINGLE_IMAGE_LAYOUT = {
  columnWidth: 180,
  gap: 16,
  averageItemHeight: 220,
  screensPerBatch: 3,
};
const ICON_LAYOUT = {
  columnWidth: 140,
  rowHeight: 220,
  gap: 24,
  panelPadding: 28,
  bottomPadding: 48,
};
let currentRecords = [];
let currentPage = 1;
let totalRecords = 0;
let categoryValues = [];
let collectorValues = [];
let selectedCategories = new Set();
let selectedCollector = "";
let currentContentType = "store-images";
const loadedContentTypes = new Set();
let resizeTimer = 0;
let singleImageOffset = 0;
let singleImageHasMore = true;
let isSingleImageLoading = false;

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

function getIconPageSize() {
  const panelRect = iconPanel.getBoundingClientRect();
  const paginationHeight = document.querySelector(".pagination")?.getBoundingClientRect().height || 0;
  const panelWidth = panelRect.width || iconPanel.parentElement?.getBoundingClientRect().width || window.innerWidth;
  const innerWidth = Math.max(ICON_LAYOUT.columnWidth, panelWidth - ICON_LAYOUT.panelPadding * 2);
  const availableHeight = Math.max(
    ICON_LAYOUT.rowHeight,
    window.innerHeight - panelRect.top - paginationHeight - ICON_LAYOUT.bottomPadding - ICON_LAYOUT.panelPadding * 2,
  );
  const columns = Math.max(1, Math.floor((innerWidth + ICON_LAYOUT.gap) / (ICON_LAYOUT.columnWidth + ICON_LAYOUT.gap)));
  const rows = Math.max(1, Math.floor((availableHeight + ICON_LAYOUT.gap) / (ICON_LAYOUT.rowHeight + ICON_LAYOUT.gap)));

  return columns * rows;
}

function getSingleImageBatchSize() {
  const panelRect = singleImagePanel.getBoundingClientRect();
  const panelWidth = panelRect.width || singleImagePanel.parentElement?.getBoundingClientRect().width || window.innerWidth;
  const columns = Math.max(1, Math.floor((panelWidth + SINGLE_IMAGE_LAYOUT.gap) / (SINGLE_IMAGE_LAYOUT.columnWidth + SINGLE_IMAGE_LAYOUT.gap)));
  const rowsPerScreen = Math.max(1, Math.ceil(window.innerHeight / SINGLE_IMAGE_LAYOUT.averageItemHeight));

  return Math.max(12, columns * rowsPerScreen * SINGLE_IMAGE_LAYOUT.screensPerBatch);
}

function getCurrentPageSize() {
  if (currentContentType === "icon") {
    return getIconPageSize();
  }

  if (currentContentType === "single-image") {
    return getSingleImageBatchSize();
  }

  return STORE_PAGE_SIZE;
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function fetchAssetRecords(page = 1) {
  const from = (page - 1) * STORE_PAGE_SIZE;
  const to = from + STORE_PAGE_SIZE - 1;
  const query = new URLSearchParams({
    select: "id,app_id,product_url,product_alias,captured_date,category,note,created_at,asset_images(image_url,sort_order)",
    order: "created_at.desc",
  });

  if (selectedCategories.size > 0) {
    query.set("category", `in.(${Array.from(selectedCategories).map((category) => `"${category.replaceAll('"', '\\"')}"`).join(",")})`);
  }

  if (selectedCollector) {
    query.set("collector_name", `eq.${selectedCollector}`);
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

async function fetchIconRecords(page = 1) {
  const pageSize = getIconPageSize();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const query = new URLSearchParams({
    select: "id,app_id,product_url,product_alias,category,icon_url,created_at",
    order: "created_at.desc",
  });

  if (selectedCategories.size > 0) {
    query.set("category", `in.(${Array.from(selectedCategories).map((category) => `"${category.replaceAll('"', '\\"')}"`).join(",")})`);
  }

  if (selectedCollector) {
    query.set("collector_name", `eq.${selectedCollector}`);
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/icon_records?${query}`, {
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

async function fetchSingleImageRecords(offset = 0, limit = getSingleImageBatchSize()) {
  const from = offset;
  const to = from + limit - 1;
  const query = new URLSearchParams({
    select: "id,image_url,created_at",
    order: "created_at.desc",
  });

  if (selectedCollector) {
    query.set("collector_name", `eq.${selectedCollector}`);
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/single_images?${query}`, {
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
  const tables = ["asset_records", "icon_records"];
  const results = await Promise.all(
    tables.map(async (table) => {
      const query = new URLSearchParams({
        select: "category",
        category: "not.is.null",
      });

      const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      });

      if (!response.ok) {
        return [];
      }

      return response.json();
    }),
  );

  return [
    ...new Set(
      results
        .flat()
        .map((row) => row.category)
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b, "zh-CN"));
}

async function fetchCollectorValues() {
  const tables = ["asset_records", "icon_records", "single_images"];
  const results = await Promise.all(
    tables.map(async (table) => {
      const query = new URLSearchParams({
        select: "collector_name",
        collector_name: "not.is.null",
      });

      const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      });

      if (!response.ok) {
        return [];
      }

      return response.json();
    }),
  );

  return [
    ...new Set(
      results
        .flat()
        .map((row) => row.collector_name)
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b, "zh-CN"));
}

function renderIconEmpty(message) {
  iconGrid.replaceChildren();

  const empty = document.createElement("div");
  empty.className = "icon-empty";
  empty.textContent = message;
  iconGrid.append(empty);
}

function createIconCategorySelect(record) {
  const select = document.createElement("select");
  const emptyOption = document.createElement("option");

  select.className = "icon-category-select";
  emptyOption.value = "";
  emptyOption.textContent = "选择品类";
  select.append(emptyOption);

  for (const category of categoryValues) {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    option.selected = category === record.category;
    select.append(option);
  }

  select.addEventListener("change", () => {
    saveIconCategory(record.id, select.value);
  });

  return select;
}

function getIconPreviewDock() {
  let dock = document.querySelector("#iconPreviewDock");
  if (dock) {
    return dock;
  }

  dock = document.createElement("section");
  dock.id = "iconPreviewDock";
  dock.className = "icon-preview-dock";
  dock.hidden = true;

  const image = document.createElement("img");
  image.alt = "";
  dock.append(image);
  document.body.append(dock);

  return dock;
}

function placeIconPreview(dock, target) {
  const rect = target.getBoundingClientRect();
  const previewSize = 250;
  const gap = 12;
  const pagePadding = 16;
  const rightX = rect.right + gap;
  const leftX = rect.left - previewSize - gap;
  const hasRightSpace = rightX + previewSize <= window.innerWidth - pagePadding;
  const x = hasRightSpace ? rightX : Math.max(pagePadding, leftX);
  const y = Math.min(
    Math.max(pagePadding, rect.top + rect.height / 2 - previewSize / 2),
    window.innerHeight - previewSize - pagePadding,
  );

  dock.style.left = `${x}px`;
  dock.style.top = `${y}px`;
}

function showIconPreview(record, target) {
  const dock = getIconPreviewDock();
  const image = dock.querySelector("img");
  image.src = record.icon_url;
  image.alt = record.app_id || "icon 预览";
  placeIconPreview(dock, target);
  dock.hidden = false;
}

function hideIconPreview() {
  const dock = document.querySelector("#iconPreviewDock");
  if (dock) {
    dock.hidden = true;
  }
}

function createIconCard(record) {
  const card = document.createElement("article");
  const imageWrap = document.createElement("div");
  const image = document.createElement("img");
  const deleteBadge = document.createElement("button");
  const name = document.createElement("a");
  const developer = document.createElement("div");
  const meta = document.createElement("div");
  const label = document.createElement("span");

  card.className = "icon-card";
  imageWrap.className = "icon-image-wrap";
  image.className = "icon-image";
  image.src = record.icon_url;
  image.alt = record.app_id || "产品 icon";
  image.loading = "lazy";
  image.addEventListener("mouseenter", () => showIconPreview(record, image));
  image.addEventListener("mousemove", () => showIconPreview(record, image));
  image.addEventListener("mouseleave", hideIconPreview);
  deleteBadge.className = "icon-delete-badge";
  deleteBadge.type = "button";
  deleteBadge.textContent = "删";
  deleteBadge.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    deleteIcon(record.id);
  });
  imageWrap.append(image, deleteBadge);

  name.className = "icon-name";
  name.textContent = record.app_id || "未命名产品";
  name.href = record.product_url || "#";
  name.target = "_blank";
  name.rel = "noopener noreferrer";

  developer.className = "icon-developer";
  developer.textContent = record.product_alias || "未知开发者";

  meta.className = "icon-meta";
  label.textContent = "品类";
  meta.append(label, createIconCategorySelect(record));
  card.append(imageWrap, name, developer, meta);

  return card;
}

function renderIconRecords(records) {
  currentRecords = records;
  iconGrid.replaceChildren();

  if (records.length === 0) {
    renderIconEmpty("暂无 icon 数据。");
    return;
  }

  for (const record of records) {
    iconGrid.append(createIconCard(record));
  }
}

function renderSingleImageEmpty(message) {
  singleImageGrid.replaceChildren();

  const empty = document.createElement("div");
  empty.className = "single-image-empty";
  empty.textContent = message;
  singleImageGrid.append(empty);
}

function createSingleImageCard(record) {
  const card = document.createElement("article");
  const image = document.createElement("img");
  const deleteBadge = document.createElement("button");

  card.className = "single-image-card";
  card.dataset.recordId = record.id;
  image.src = record.image_url;
  image.alt = "单图素材";
  image.loading = "lazy";
  image.addEventListener("click", () => showSingleImagePreview(record.image_url));
  deleteBadge.className = "single-image-delete-badge";
  deleteBadge.type = "button";
  deleteBadge.textContent = "删";
  deleteBadge.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    deleteSingleImage(record.id);
  });

  card.append(image, deleteBadge);
  return card;
}

function renderSingleImageRecords(records, { append = false } = {}) {
  if (!append) {
    currentRecords = records;
    singleImageGrid.replaceChildren();
  } else {
    currentRecords = [...currentRecords, ...records];
  }

  if (currentRecords.length === 0) {
    renderSingleImageEmpty("暂无单图数据。");
    return;
  }

  for (const record of records) {
    singleImageGrid.append(createSingleImageCard(record));
  }
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
  cell.textContent = String(totalRecords - ((currentPage - 1) * STORE_PAGE_SIZE + index));
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
    const item = document.createElement("div");
    const img = document.createElement("img");
    const markImageOrientation = () => {
      const isLandscape = img.naturalWidth > img.naturalHeight;
      img.classList.toggle("is-landscape", isLandscape);
      item.classList.toggle("is-landscape", isLandscape);
    };

    item.className = "store-image-item";
    img.alt = `${record.app_id || "产品"} 商店图 ${index + 1}`;
    img.loading = "lazy";
    img.addEventListener("load", markImageOrientation);
    img.src = image.image_url;
    if (img.complete) {
      markImageOrientation();
    }
    item.append(img);
    strip.append(item);
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
    reloadCurrentContentFromFilters();
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
      reloadCurrentContentFromFilters();
    });

    item.append(checkbox, document.createTextNode(category));
    categoryFilterMenu.append(item);
  }
}

function updateCollectorFilterLabel() {
  collectorFilterBtn.textContent = selectedCollector || "全部";
}

function renderCollectorFilterMenu() {
  collectorFilterMenu.replaceChildren();

  const allItem = document.createElement("button");
  allItem.type = "button";
  allItem.textContent = "全部";
  allItem.className = selectedCollector ? "" : "is-selected";
  allItem.addEventListener("click", () => {
    selectedCollector = "";
    updateCollectorFilterLabel();
    renderCollectorFilterMenu();
    collectorFilterMenu.classList.remove("is-open");
    reloadCurrentContentFromFilters();
  });
  collectorFilterMenu.append(allItem);

  if (collectorValues.length === 0) {
    const empty = document.createElement("div");
    empty.className = "collector-filter-empty";
    empty.textContent = "暂无角色";
    collectorFilterMenu.append(empty);
    return;
  }

  for (const collector of collectorValues) {
    const item = document.createElement("button");
    item.type = "button";
    item.textContent = collector;
    item.className = selectedCollector === collector ? "is-selected" : "";
    item.addEventListener("click", () => {
      selectedCollector = collector;
      updateCollectorFilterLabel();
      renderCollectorFilterMenu();
      collectorFilterMenu.classList.remove("is-open");
      reloadCurrentContentFromFilters();
    });
    collectorFilterMenu.append(item);
  }
}

function setContentType(type) {
  currentContentType = type;
  storeImagesFilter.classList.toggle("is-active", type === "store-images");
  iconFilter.classList.toggle("is-active", type === "icon");
  singleImageFilter.classList.toggle("is-active", type === "single-image");
  tablePanel.hidden = type !== "store-images";
  iconPanel.hidden = type !== "icon";
  singleImagePanel.hidden = type !== "single-image";
  pagination.hidden = type === "single-image";
  document.querySelector(".category-filter").hidden = type === "single-image";
  hideIconPreview();

  if (loadedContentTypes.has(type)) {
    return;
  }

  if (type === "icon" || type === "single-image") {
    loadPage(1);
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
  const totalPages = Math.max(1, Math.ceil(totalRecords / getCurrentPageSize()));

  prevPageBtn.disabled = currentPage <= 1;
  nextPageBtn.disabled = currentPage >= totalPages;
  pageInfo.textContent = `第 ${currentPage} / ${totalPages} 页，共 ${totalRecords} 条`;
}

function reloadCurrentContentFromFilters() {
  loadedContentTypes.delete(currentContentType);
  loadPage(1);
}

async function loadMoreSingleImages({ reset = false } = {}) {
  if (isSingleImageLoading || (!singleImageHasMore && !reset)) {
    return;
  }

  if (reset) {
    singleImageOffset = 0;
    singleImageHasMore = true;
    currentRecords = [];
    renderSingleImageEmpty("正在读取单图数据...");
  }

  isSingleImageLoading = true;

  try {
    const limit = getSingleImageBatchSize();
    const { records, total } = await fetchSingleImageRecords(singleImageOffset, limit);

    totalRecords = total;
    if (reset) {
      singleImageGrid.replaceChildren();
    }

    renderSingleImageRecords(records, { append: !reset });
    singleImageOffset += records.length;
    singleImageHasMore = singleImageOffset < totalRecords && records.length > 0;
    loadedContentTypes.add("single-image");
  } catch (error) {
    if (reset) {
      renderSingleImageEmpty(error.message);
    } else {
      showToast(error.message, "error");
    }
  } finally {
    isSingleImageLoading = false;
  }
}

async function loadPage(page) {
  currentPage = page;
  try {
    if (currentContentType === "icon") {
      renderIconEmpty("正在读取 icon 数据...");
      const { records, total } = await fetchIconRecords(currentPage);
      totalRecords = total;

      if (records.length === 0 && currentPage > 1) {
        await loadPage(currentPage - 1);
        return;
      }

      renderIconRecords(records);
      renderPagination();
      loadedContentTypes.add("icon");
      return;
    }

    if (currentContentType === "single-image") {
      await loadMoreSingleImages({ reset: true });
      return;
    }

    renderEmpty("正在读取素材数据...");
    const { records, total } = await fetchAssetRecords(currentPage);
    totalRecords = total;

    if (records.length === 0 && currentPage > 1) {
      await loadPage(currentPage - 1);
      return;
    }

    renderRecords(records);
    renderPagination();
    loadedContentTypes.add("store-images");
  } catch (error) {
    totalRecords = 0;
    renderPagination();
    if (currentContentType === "icon") {
      renderIconEmpty(error.message);
      return;
    }
    if (currentContentType === "single-image") {
      renderSingleImageEmpty(error.message);
      return;
    }
    renderEmpty(error.message);
  }
}

async function saveIconCategory(recordId, category) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/icon_records?id=eq.${recordId}`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      category: category || null,
    }),
  });

  if (!response.ok) {
    showToast(`保存失败：${response.status}`, "error");
    return;
  }

  categoryValues = await fetchCategoryValues();
  renderCategoryFilterMenu();
  showToast("已保存 icon 品类。");
}

async function deleteIcon(recordId) {
  if (!window.confirm("确定删除这个 icon 记录吗？")) {
    return;
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/icon_records?id=eq.${recordId}`, {
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

  hideIconPreview();
  categoryValues = await fetchCategoryValues();
  await loadPage(currentPage);
  showToast("已删除 icon 记录。");
}

function showSingleImagePreview(imageUrl) {
  const preview = document.querySelector("#singleImagePreview");
  const image = preview.querySelector("img");

  image.src = imageUrl;
  image.alt = "单图大图预览";
  preview.hidden = false;
}

function hideSingleImagePreview() {
  const preview = document.querySelector("#singleImagePreview");
  const image = preview.querySelector("img");

  preview.hidden = true;
  image.removeAttribute("src");
}

async function deleteSingleImage(recordId) {
  if (!window.confirm("确定删除这张单图吗？")) {
    return;
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/single_images?id=eq.${recordId}`, {
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

  currentRecords = currentRecords.filter((record) => record.id !== recordId);
  Array.from(singleImageGrid.querySelectorAll(".single-image-card"))
    .find((card) => card.dataset.recordId === recordId)
    ?.remove();
  showToast("已删除单图。");
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
    collectorValues = await fetchCollectorValues();
    updateCategoryFilterLabel();
    updateCollectorFilterLabel();
    renderCategoryFilterMenu();
    renderCollectorFilterMenu();
    await loadPage(1);
  } catch (error) {
    renderEmpty(error.message);
  }
}

async function refreshCurrentContent() {
  refreshPageBtn.disabled = true;
  refreshPageBtn.textContent = "刷新中";

  try {
    categoryValues = await fetchCategoryValues();
    collectorValues = await fetchCollectorValues();
    renderCategoryFilterMenu();
    renderCollectorFilterMenu();

    if (currentContentType === "single-image") {
      await loadMoreSingleImages({ reset: true });
    } else {
      await loadPage(currentPage);
    }

    showToast("已刷新当前页面。");
  } catch (error) {
    showToast(`刷新失败：${error.message}`, "error");
  } finally {
    refreshPageBtn.disabled = false;
    refreshPageBtn.textContent = "刷新";
  }
}

initBoard();

prevPageBtn.addEventListener("click", () => {
  if (currentPage > 1) {
    loadPage(currentPage - 1);
  }
});

nextPageBtn.addEventListener("click", () => {
  const totalPages = Math.max(1, Math.ceil(totalRecords / getCurrentPageSize()));
  if (currentPage < totalPages) {
    loadPage(currentPage + 1);
  }
});

storeImagesFilter.addEventListener("click", () => setContentType("store-images"));
iconFilter.addEventListener("click", () => setContentType("icon"));
singleImageFilter.addEventListener("click", () => setContentType("single-image"));
refreshPageBtn.addEventListener("click", refreshCurrentContent);

categoryFilterBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  categoryFilterMenu.classList.toggle("is-open");
});

collectorFilterBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  collectorFilterMenu.classList.toggle("is-open");
});

categoryFilterMenu.addEventListener("click", (event) => {
  event.stopPropagation();
});

collectorFilterMenu.addEventListener("click", (event) => {
  event.stopPropagation();
});

document.addEventListener("click", () => {
  closeCategoryMenus();
  categoryFilterMenu.classList.remove("is-open");
  collectorFilterMenu.classList.remove("is-open");
});

document.querySelector("#singleImagePreview").addEventListener("click", (event) => {
  if (event.target.id === "singleImagePreview") {
    hideSingleImagePreview();
  }
});

window.addEventListener("resize", () => {
  if (currentContentType !== "icon") {
    return;
  }

  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    const nextTotalPages = Math.max(1, Math.ceil(totalRecords / getIconPageSize()));
    loadPage(Math.min(currentPage, nextTotalPages));
  }, 180);
});

window.addEventListener("scroll", () => {
  if (currentContentType !== "single-image" || isSingleImageLoading || !singleImageHasMore) {
    return;
  }

  const scrollBottom = window.scrollY + window.innerHeight;
  const triggerLine = document.documentElement.scrollHeight - window.innerHeight * 1.2;

  if (scrollBottom >= triggerLine) {
    loadMoreSingleImages();
  }
});
