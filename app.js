const CONFIG = {
  adminPassword: "1234",
  firstNumber: 0,
  defaultTotal: 120,
  numberPadding: 2,
  sheetCsvUrl: "https://docs.google.com/spreadsheets/d/1AHWfMZH3vjHFnESDL-IpOyA8Ay14RluC1U7a49oqjD0/export?format=csv&gid=0",
  sheetEditUrl: "https://docs.google.com/spreadsheets/d/1AHWfMZH3vjHFnESDL-IpOyA8Ay14RluC1U7a49oqjD0/edit?usp=sharing",
  whatsappNumber: "5521972249846",
  whatsappMessage: "Olá! Quero reservar o(s) número(s) {number} da rifa da Camisa da Seleção Brasileira Amarela (Tamanho a combinar).",
  storageKey: "rifa-camisa-selecao-v3"
};

const state = {
  meta: {},
  tickets: [],
  isAdmin: document.body.dataset.admin === "true",
  filter: "all",
  search: "",
  selectedNumbers: new Set()
};

const els = {
  totalNumbers: document.querySelector("#totalNumbers"),
  availableCount: document.querySelector("#availableCount"),
  reservedCount: document.querySelector("#reservedCount"),
  soldCount: document.querySelector("#soldCount"),
  prizeName: document.querySelector("#prizeName"),
  ticketPrice: document.querySelector("#ticketPrice"),
  drawDate: document.querySelector("#drawDate"),
  paymentInfo: document.querySelector("#paymentInfo"),
  whatsappHero: document.querySelector("#whatsappHero"),
  searchInput: document.querySelector("#searchInput"),
  statusFilter: document.querySelector("#statusFilter"),
  clearFilters: document.querySelector("#clearFilters"),
  numbersGrid: document.querySelector("#numbersGrid"),
  resultNote: document.querySelector("#resultNote"),
  adminPanel: document.querySelector("#adminPanel"),
  adminAction: document.querySelector("#adminAction"),
  buyerName: document.querySelector("#buyerName"),
  rangeInput: document.querySelector("#rangeInput"),
  applyRange: document.querySelector("#applyRange"),
  exportData: document.querySelector("#exportData"),
  importData: document.querySelector("#importData"),
  selectionPanel: document.querySelector("#selectionPanel"),
  selectedNumbers: document.querySelector("#selectedNumbers"),
  reserveSelected: document.querySelector("#reserveSelected"),
  clearSelection: document.querySelector("#clearSelection"),
  openSheet: document.querySelector("#openSheet")
};

init();

async function init() {
  const data = await loadData();
  state.meta = data.meta || {};
  state.tickets = normalizeTickets(data);
  bindEvents();
  render();
}

async function loadData() {
  if (CONFIG.sheetCsvUrl) {
    try {
      const response = await fetch(addCacheBuster(CONFIG.sheetCsvUrl), { cache: "no-store" });
      if (!response.ok) throw new Error(`Planilha retornou HTTP ${response.status}`);
      const csv = await response.text();
      return csvToData(csv);
    } catch (error) {
      console.warn("Não foi possível carregar a planilha por CSV. Tentando JSONP.", error);
    }

    try {
      return await loadGoogleSheetJsonp();
    } catch (error) {
      console.warn("Não foi possível carregar a planilha por JSONP.", error);
    }
  }

  const local = readLocalData();
  if (local) return local;

  try {
    const response = await fetch("rifa-dados.json", { cache: "no-store" });
    if (response.ok) return response.json();
  } catch (error) {
    console.warn("Usando dados padrão porque rifa-dados.json não carregou.", error);
  }

  return createDefaultData();
}

function addCacheBuster(url) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}_=${Date.now()}`;
}

function getSheetId() {
  return CONFIG.sheetCsvUrl.match(/\/spreadsheets\/d\/([^/]+)/)?.[1] || "";
}

function getSheetGid() {
  return CONFIG.sheetCsvUrl.match(/[?&]gid=(\d+)/)?.[1] || "0";
}

function loadGoogleSheetJsonp() {
  const sheetId = getSheetId();
  if (!sheetId) {
    return Promise.reject(new Error("ID da planilha não encontrado."));
  }

  return new Promise((resolve, reject) => {
    const callbackName = `googleSheetCallback_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Tempo limite ao carregar a planilha."));
    }, 12000);

    function cleanup() {
      window.clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
    }

    window[callbackName] = (response) => {
      try {
        cleanup();
        if (response.status !== "ok") {
          reject(new Error(response.errors?.[0]?.detailed_message || "Resposta inválida da planilha."));
          return;
        }
        resolve(googleTableToData(response.table));
      } catch (error) {
        reject(error);
      }
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("Falha ao carregar o script da planilha."));
    };

    const gid = encodeURIComponent(getSheetGid());
    const tqx = encodeURIComponent(`responseHandler:${callbackName}`);
    script.src = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?gid=${gid}&tqx=${tqx}&_=${Date.now()}`;
    document.head.appendChild(script);
  });
}

function readLocalData() {
  try {
    const raw = localStorage.getItem(CONFIG.storageKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveLocalData() {
  localStorage.setItem(CONFIG.storageKey, JSON.stringify(toExportData()));
}

function createDefaultData() {
  return {
    meta: {
      prize: "Camisa da Seleção Brasileira Amarela (Tamanho a combinar)",
      price: "R$ 5,00",
      drawDate: "Pela Loteria Federal após todos os números serem vendidos",
      payment: "PIX após reserva"
    },
    firstNumber: CONFIG.firstNumber,
    tickets: Array.from({ length: CONFIG.defaultTotal }, (_, index) => ({
      number: CONFIG.firstNumber + index,
      status: "available",
      buyer: ""
    }))
  };
}

function normalizeTickets(data) {
  const total = data.total || data.tickets?.length || CONFIG.defaultTotal;
  const firstNumber = Number.isInteger(data.firstNumber) ? data.firstNumber : CONFIG.firstNumber;
  const incoming = new Map((data.tickets || []).map((ticket) => [Number(ticket.number), ticket]));

  return Array.from({ length: total }, (_, index) => {
    const number = firstNumber + index;
    const ticket = incoming.get(number) || {};
    return {
      number,
      status: normalizeStatus(ticket.status),
      buyer: ticket.buyer || ""
    };
  });
}

function bindEvents() {
  els.searchInput?.addEventListener("input", (event) => {
    state.search = event.target.value.trim();
    renderGrid();
  });

  els.statusFilter?.addEventListener("change", (event) => {
    state.filter = event.target.value;
    renderGrid();
  });

  els.clearFilters?.addEventListener("click", () => {
    state.search = "";
    state.filter = "all";
    els.searchInput.value = "";
    els.statusFilter.value = "all";
    renderGrid();
  });

  els.reserveSelected?.addEventListener("click", () => {
    if (state.selectedNumbers.size === 0) return;
    window.open(makeWhatsappLink(getSelectedNumbersText()), "_blank", "noopener");
  });

  els.clearSelection?.addEventListener("click", () => {
    state.selectedNumbers.clear();
    renderGrid();
  });

  els.applyRange?.addEventListener("click", () => {
    const range = parseRange(els.rangeInput.value);
    if (!range) {
      alert("Digite um intervalo válido, por exemplo: 00-20.");
      return;
    }

    state.tickets.forEach((ticket) => {
      if (ticket.number >= range.start && ticket.number <= range.end) {
        updateTicket(ticket);
      }
    });
    saveLocalData();
    state.selectedNumbers.clear();
    render();
  });

  els.exportData?.addEventListener("click", exportDataFile);
  els.importData?.addEventListener("change", importDataFile);
}

function render() {
  renderMeta();
  renderSummary();
  renderSheetLink();
  renderGrid();
}

function renderMeta() {
  els.prizeName.textContent = state.meta.prize || "Camisa da Seleção Brasileira Amarela (Tamanho a combinar)";
  els.ticketPrice.textContent = state.meta.price || "R$ 5,00";
  els.drawDate.textContent = state.meta.drawDate || "Pela Loteria Federal após todos os números serem vendidos";
  els.paymentInfo.textContent = state.meta.payment || "PIX após reserva";
  if (els.whatsappHero) {
    els.whatsappHero.href = "#numeros";
  }
}

function renderSummary() {
  const counts = getCounts();
  els.totalNumbers.textContent = String(state.tickets.length);
  els.availableCount.textContent = String(counts.available);
  els.reservedCount.textContent = String(counts.reserved);
  els.soldCount.textContent = String(counts.sold);
}

function renderSheetLink() {
  if (!els.openSheet) return;

  if (CONFIG.sheetEditUrl) {
    els.openSheet.href = CONFIG.sheetEditUrl;
    els.openSheet.removeAttribute("aria-disabled");
  } else {
    els.openSheet.href = "#";
    els.openSheet.setAttribute("aria-disabled", "true");
  }
}

function renderGrid() {
  const visible = getVisibleTickets();
  els.numbersGrid.innerHTML = "";
  els.resultNote.textContent = `${visible.length} número(s) encontrados`;

  const fragment = document.createDocumentFragment();
  visible.forEach((ticket) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `ticket ticket--${ticket.status}`;
    if (state.selectedNumbers.has(ticket.number)) {
      button.classList.add("ticket--selected");
    }
    button.textContent = formatNumber(ticket.number);
    button.title = getTicketTitle(ticket);
    button.setAttribute("aria-label", getTicketTitle(ticket));

    button.addEventListener("click", () => {
      if (state.isAdmin && !CONFIG.sheetCsvUrl) {
        updateTicket(ticket);
        saveLocalData();
        state.selectedNumbers.delete(ticket.number);
        render();
        return;
      }

      if (ticket.status === "available") {
        toggleTicketSelection(ticket);
      } else {
        alert(`O número ${formatNumber(ticket.number)} está ${translateStatus(ticket.status)}.`);
      }
    });

    fragment.appendChild(button);
  });
  els.numbersGrid.appendChild(fragment);
  renderSelection();
}

function renderSelection() {
  if (!els.selectionPanel) return;

  const hasSelection = state.selectedNumbers.size > 0;
  els.selectionPanel.hidden = !hasSelection;
  els.selectedNumbers.textContent = getSelectedNumbersText() || "Nenhum número selecionado";
  els.reserveSelected.disabled = !hasSelection;
}

function toggleTicketSelection(ticket) {
  if (state.selectedNumbers.has(ticket.number)) {
    state.selectedNumbers.delete(ticket.number);
  } else {
    state.selectedNumbers.add(ticket.number);
  }
  renderGrid();
}

function getSelectedNumbersText() {
  return [...state.selectedNumbers]
    .sort((a, b) => a - b)
    .map(formatNumber)
    .join(", ");
}

function getCounts() {
  return state.tickets.reduce((acc, ticket) => {
    acc[ticket.status] += 1;
    return acc;
  }, { available: 0, reserved: 0, sold: 0 });
}

function getVisibleTickets() {
  const search = state.search.replace(/\D/g, "");
  return state.tickets.filter((ticket) => {
    const matchesStatus = state.filter === "all" || ticket.status === state.filter;
    const matchesSearch = !search || formatNumber(ticket.number).includes(search.padStart(Math.min(search.length, CONFIG.numberPadding), "0"));
    return matchesStatus && matchesSearch;
  });
}

function updateTicket(ticket) {
  if (!els.adminAction) return;
  ticket.status = els.adminAction.value;
  ticket.buyer = els.buyerName?.value.trim() || "";
}

function getTicketTitle(ticket) {
  const buyer = ticket.buyer ? ` - ${ticket.buyer}` : "";
  return `Número ${formatNumber(ticket.number)}: ${translateStatus(ticket.status)}${buyer}`;
}

function translateStatus(status) {
  return {
    available: "disponível",
    reserved: "reservado",
    sold: "vendido"
  }[status] || "disponível";
}

function normalizeStatus(status) {
  const clean = String(status || "available").trim().toLowerCase();
  return {
    available: "available",
    disponivel: "available",
    disponível: "available",
    livre: "available",
    reserved: "reserved",
    reservado: "reserved",
    reserva: "reserved",
    sold: "sold",
    vendido: "sold",
    paga: "sold",
    pago: "sold"
  }[clean] || "available";
}

function formatNumber(number) {
  return String(number).padStart(CONFIG.numberPadding, "0");
}

function makeWhatsappLink(numbersText) {
  const text = CONFIG.whatsappMessage.replace("{number}", numbersText || "que estiverem disponíveis");
  return `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(text)}`;
}

function parseRange(value) {
  const match = value.trim().match(/^(\d+)\s*-\s*(\d+)$/);
  if (!match) return null;
  const minNumber = state.tickets[0]?.number ?? CONFIG.firstNumber;
  const maxNumber = state.tickets[state.tickets.length - 1]?.number ?? CONFIG.defaultTotal - 1;
  const start = Math.max(minNumber, Number(match[1]));
  const end = Math.min(maxNumber, Number(match[2]));
  if (start > end) return null;
  return { start, end };
}

function toExportData() {
  return {
    meta: state.meta,
    firstNumber: state.tickets[0]?.number ?? CONFIG.firstNumber,
    total: state.tickets.length,
    tickets: state.tickets
  };
}

function exportDataFile() {
  const blob = new Blob([JSON.stringify(toExportData(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "rifa-dados.json";
  link.click();
  URL.revokeObjectURL(url);
}

function importDataFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      state.meta = data.meta || state.meta;
      state.tickets = normalizeTickets(data);
      state.selectedNumbers.clear();
      saveLocalData();
      render();
    } catch {
      alert("Arquivo inválido.");
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

function csvToData(csv) {
  const rows = csv.trim().split(/\r?\n/).map(parseCsvLine);
  const header = rows.shift().map(normalizeHeader);
  return rowsToData(header, rows);
}

function googleTableToData(table) {
  const header = table.cols.map((column) => normalizeHeader(column.label || column.id));
  const rows = table.rows.map((row) => row.c.map((cell) => cell?.v ?? ""));
  return rowsToData(header, rows);
}

function rowsToData(header, rows) {
  const index = {
    number: header.indexOf("numero"),
    status: header.indexOf("status"),
    buyer: header.indexOf("nome")
  };
  if (index.buyer === -1) index.buyer = header.indexOf("comprador");

  const tickets = rows
    .map((row) => ({
      number: Number(String(row[index.number] || "").replace(/\D/g, "")),
      status: row[index.status] || "available",
      buyer: index.buyer >= 0 ? row[index.buyer] || "" : ""
    }))
    .filter((ticket) => Number.isInteger(ticket.number));

  const numbers = tickets.map((ticket) => ticket.number);
  const firstNumber = numbers.length ? Math.min(...numbers) : CONFIG.firstNumber;
  const total = numbers.length ? Math.max(...numbers) - firstNumber + 1 : CONFIG.defaultTotal;

  return {
    meta: createDefaultData().meta,
    firstNumber,
    total,
    tickets
  };
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
