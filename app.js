const CONFIG = {
  adminPassword: "1234",
  firstNumber: 0,
  defaultTotal: 120,
  numberPadding: 2,
  sheetCsvUrl: "",
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
  adminLogin: document.querySelector("#adminLogin"),
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
  clearSelection: document.querySelector("#clearSelection")
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
  const local = readLocalData();
  if (local) return local;

  if (CONFIG.sheetCsvUrl) {
    try {
      const response = await fetch(CONFIG.sheetCsvUrl);
      const csv = await response.text();
      return csvToData(csv);
    } catch (error) {
      console.warn("Não foi possível carregar a planilha publicada.", error);
    }
  }

  try {
    const response = await fetch("rifa-dados.json", { cache: "no-store" });
    if (response.ok) return response.json();
  } catch (error) {
    console.warn("Usando dados padrão porque rifa-dados.json não carregou.", error);
  }

  return createDefaultData();
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
  els.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value.trim();
    renderGrid();
  });

  els.statusFilter.addEventListener("change", (event) => {
    state.filter = event.target.value;
    renderGrid();
  });

  els.clearFilters.addEventListener("click", () => {
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

  els.adminLogin?.addEventListener("click", () => {
    if (state.isAdmin) {
      state.isAdmin = false;
      els.adminPanel.hidden = true;
      renderGrid();
      return;
    }

    const password = prompt("Senha de administrador:");
    if (password === CONFIG.adminPassword) {
      state.isAdmin = true;
      els.adminPanel.hidden = false;
      renderGrid();
    } else if (password !== null) {
      alert("Senha incorreta.");
    }
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
      if (state.isAdmin) {
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
  const rows = csv.trim().split(/\r?\n/).map((line) => line.split(",").map((item) => item.trim()));
  const header = rows.shift().map((item) => item.toLowerCase());
  const index = {
    number: header.indexOf("numero"),
    status: header.indexOf("status"),
    buyer: header.indexOf("nome")
  };

  return {
    meta: {},
    tickets: rows.map((row) => ({
      number: Number(row[index.number]),
      status: row[index.status] || "available",
      buyer: row[index.buyer] || ""
    }))
  };
}
