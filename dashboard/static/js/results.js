// Panel de resultados: pestañas (mostrar/ocultar, sin recargar página) y
// simulador vía fetch() -- no necesita una vuelta al servidor con
// recarga completa.

document.addEventListener("DOMContentLoaded", () => {
    window.initResultsPage();
});

// #tab-resumen es el ancla de "esta es la página de resultados" para
// static/js/main.js:navigateTo() -- se renderiza siempre, sea cual sea
// la pestaña que el usuario tenga abierta después.
//
// Destruye cualquier instancia previa de Chart.js ANTES de re-inicializar:
// _trendsChart es un singleton a nivel de módulo con guarda
// "if (_trendsChart) return;" en initTrendsChart() -- asumía que esta
// página se inicializaba UNA sola vez en toda la vida de la app. Eso
// dejó de ser cierto con la navegación sin recarga: navegar de la
// cámara A (con Tendencias ya abierta) a la cámara B deja "vivo" el
// gráfico de A en la variable, y al abrir Tendencias en B esa guarda
// impedía crear un gráfico nuevo sobre el <canvas> nuevo de B -- el
// usuario se quedaba con un canvas vacío en vez de los datos de B.
window.initResultsPage = function initResultsPage() {
    if (!document.getElementById("tab-resumen")) return;
    const fontFamily = getComputedStyle(document.documentElement)
        .getPropertyValue("--font-body")
        .trim();
    if (window.Chart && fontFamily) Chart.defaults.font.family = fontFamily;
    if (_trendsChart) {
        _trendsChart.destroy();
        _trendsChart = null;
    }
    _interactionCharts.forEach((c) => c.destroy());
    _interactionCharts = [];
    if (_interactionCompareChart) {
        _interactionCompareChart.destroy();
        _interactionCompareChart = null;
    }
    _interactionChartsInitialized = false;
    initTabs();
    initSimulator();
};

function initTabs() {
    // [data-tab] excluye enlaces de navegación real (ej. "Datos") que
    // reusan la clase .tab-btn por estilo pero no cambian de pestaña
    // localmente -- deben navegar normalmente, no intentar togglear un
    // panel que no existe.
    const buttons = document.querySelectorAll(".tab-btn[data-tab]");
    buttons.forEach((btn) => {
        btn.addEventListener("click", () => {
            buttons.forEach((b) => b.classList.remove("active"));
            document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
            btn.classList.add("active");
            document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
            if (btn.dataset.tab === "tendencias") initTrendsChart();
            if (btn.dataset.tab === "interaccion") initInteractionCharts();
        });
    });
}

// Dona por zona + barra horizontal comparativa (Chart.js) en la pestaña
// "Interacción con producto" -- igual que initTrendsChart(), se inicializa
// recién al ABRIR la pestaña por primera vez, no al cargar la página: un
// <canvas> dentro de un .tab-panel oculto (display:none) mide 0x0.
let _interactionCharts = [];
let _interactionCompareChart = null;
let _interactionChartsInitialized = false;
function initInteractionCharts() {
    if (_interactionChartsInitialized) return;
    const dataEl = document.getElementById("interaction-cards-data");
    if (!dataEl || !window.Chart) return;
    _interactionChartsInitialized = true;

    const cards = JSON.parse(dataEl.textContent);
    const style = getComputedStyle(document.documentElement);
    const colorBreves = style.getPropertyValue("--color-cold").trim();
    const colorMedias = style.getPropertyValue("--color-zone-paso").trim();
    const colorProlongadas = style.getPropertyValue("--color-hot").trim();
    const panelBg = style.getPropertyValue("--color-panel").trim();
    const inkMuted = style.getPropertyValue("--color-ink-muted").trim();
    const gridLine = style.getPropertyValue("--color-line").trim();
    // Misma paleta (mismo orden) que ya usa initTrendsChart() para sus
    // líneas -- una zona = un color, consistente entre pestañas.
    const zonePalette = [
        "--color-hot", "--color-cold", "--color-zone-paso",
        "--color-info", "--color-zone-nicho", "--color-success",
    ].map((v) => style.getPropertyValue(v).trim());

    document.querySelectorAll(".cc-donut-canvas").forEach((canvas) => {
        const card = cards[Number(canvas.dataset.zoneIndex)];
        if (!card) return;

        // Los segmentos en 0 (ej. "0 medias") se OMITEN del todo, no se
        // dibujan como un hueco gris -- así la dona nunca se ve rota o
        // como si faltara un dato.
        const allLabels = ["Breves", "Medias", "Prolongadas"];
        const allValues = [card.toques_breves, card.interacciones_medias, card.interacciones_prolongadas];
        const allColors = [colorBreves, colorMedias, colorProlongadas];
        const labels = [], values = [], colors = [];
        allValues.forEach((v, i) => {
            if (v > 0) { labels.push(allLabels[i]); values.push(v); colors.push(allColors[i]); }
        });
        if (values.length === 0) return;

        _interactionCharts.push(new Chart(canvas.getContext("2d"), {
            type: "doughnut",
            data: { labels, datasets: [{ data: values, backgroundColor: colors, borderColor: panelBg, borderWidth: 2 }] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "62%",
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.parsed} interacción(es)` } },
                },
            },
        }));
    });

    const compareCanvas = document.getElementById("interaction-compare-chart");
    if (compareCanvas && cards.length > 1) {
        _interactionCompareChart = new Chart(compareCanvas.getContext("2d"), {
            type: "bar",
            data: {
                labels: cards.map((c) => c.zone_label),
                datasets: [{
                    label: "Interacciones totales",
                    data: cards.map((c) => c.total_interactions),
                    backgroundColor: cards.map((_, i) => zonePalette[i % zonePalette.length]),
                    borderRadius: 4,
                }],
            },
            options: {
                indexAxis: "y",
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { color: gridLine }, ticks: { color: inkMuted, font: { size: 11 } }, beginAtZero: true },
                    y: { grid: { display: false }, ticks: { color: inkMuted, font: { size: 11 } } },
                },
            },
        });
    }
}

// Gráfico de evolución histórica (Chart.js) -- se inicializa recién la
// PRIMERA vez que se abre la pestaña Tendencias, no al cargar la
// página: un <canvas> dentro de un .tab-panel oculto (display:none)
// mide 0x0, y Chart.js calcula su tamaño en el momento de crearse.
let _trendsChart = null;
function initTrendsChart() {
    if (_trendsChart) return;
    const dataEl = document.getElementById("trend-history-data");
    const canvas = document.getElementById("trend-history-chart");
    const metricSelect = document.getElementById("trend-metric-select");
    const agrupacionSelect = document.getElementById("trend-agrupacion-select");
    const msgDiv = document.getElementById("trend-agrupacion-msg");
    const captionEl = document.getElementById("trend-agrupacion-caption");
    if (!dataEl || !canvas || !metricSelect || !window.Chart) return;

    // {"dia": {...}, "semana": {...}, "mes": {...}} -- misma forma que
    // get_history_series()/get_history_series_agrupada() en trends.py.
    const byAgrupacion = JSON.parse(dataEl.textContent);
    const style = getComputedStyle(document.documentElement);
    const palette = [
        "--color-hot", "--color-cold", "--color-zone-paso",
        "--color-info", "--color-zone-nicho", "--color-success",
    ].map((v) => style.getPropertyValue(v).trim());
    const inkMuted = style.getPropertyValue("--color-ink-muted").trim();
    const gridLine = style.getPropertyValue("--color-line").trim();

    function datasetsFor(series, metricKey) {
        return (series[metricKey] || []).map((zs, i) => ({
            label: zs.zone_label,
            data: zs.data,
            borderColor: palette[i % palette.length],
            backgroundColor: palette[i % palette.length],
            spanGaps: true,
            tension: 0.3,
            pointRadius: 3,
            pointHoverRadius: 5,
            borderWidth: 2,
        }));
    }

    function render() {
        const agrupacion = agrupacionSelect ? agrupacionSelect.value : "dia";
        const data = byAgrupacion[agrupacion];

        // Semana/mes con menos de 2 buckets distintos: un mensaje
        // honesto en vez de un gráfico vacío o engañoso con un solo punto.
        if (agrupacion !== "dia" && !data.has_enough_buckets) {
            canvas.style.display = "none";
            captionEl.style.display = "none";
            msgDiv.innerHTML = window.alertHtml(
                "info",
                `Hace falta más historial acumulado para ver la tendencia por ${agrupacion === "semana" ? "semana" : "mes"} ` +
                `(hoy las fechas guardadas caen en ${data.n_buckets} ${agrupacion === "semana" ? "semana(s)" : "mes(es)"} distinto(s), ` +
                `se necesitan al menos 2). Probá con "Día" mientras tanto, o seguí guardando corridas.`
            );
            window.refreshIcons();
            return;
        }

        canvas.style.display = "";
        captionEl.style.display = "";
        msgDiv.innerHTML = "";
        captionEl.textContent = agrupacion === "dia"
            ? `Cada línea es una zona calibrada; los puntos son las fechas en las que se guardó una corrida en el historial (${data.labels.length} en total).`
            : `Cada línea es una zona calibrada; cada punto agrupa todas las fechas guardadas que caen en ${agrupacion === "semana" ? "esa semana ISO" : "ese mes calendario"} (${data.labels.length} ${agrupacion === "semana" ? "semana(s)" : "mes(es)"} en total).`;

        const datasets = datasetsFor(data.series, metricSelect.value);
        if (_trendsChart) {
            _trendsChart.data.labels = data.labels;
            _trendsChart.data.datasets = datasets;
            _trendsChart.update();
            return;
        }

        _trendsChart = new Chart(canvas.getContext("2d"), {
            type: "line",
            data: { labels: data.labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: "index", intersect: false },
                plugins: {
                    legend: { position: "bottom", labels: { color: inkMuted, usePointStyle: true, font: { size: 12 } } },
                },
                scales: {
                    x: { grid: { color: gridLine }, ticks: { color: inkMuted, font: { size: 11 } } },
                    y: { grid: { color: gridLine }, ticks: { color: inkMuted, font: { size: 11 } }, beginAtZero: true },
                },
            },
        });
    }

    render();
    metricSelect.addEventListener("change", render);
    if (agrupacionSelect) agrupacionSelect.addEventListener("change", render);
}

// Arma el panel de resultado -- compartido entre "Simular" (destino
// elegido a mano) y "Recomendarme el mejor destino" (destino elegido
// por recommend_best_destination()) para no duplicar el mensaje/HTML.
// recommendMeta (opcional): { nEvaluados } -- cuando viene, antepone un
// aviso explícito de qué zona se recomendó y contra cuántas se comparó
// (transparencia total sobre qué se comparó, nunca solo el resultado).
function buildSimResultHtml(data, recommendMeta) {
    const r = data.result;
    const positive = r.cambio_pct > 0;
    const messageKind = positive ? "success" : "info";
    const message = positive
        ? `Si el producto de '${data.from_label}' generara el mismo interés por visitante en ` +
          `'${data.to_label}' (que tiene más tráfico: ${data.visits_to.toFixed(0)} vs ${data.visits_from.toFixed(0)} ` +
          `visitas), podría pasar de ${r.interacciones_actuales.toFixed(0)} a ${r.interacciones_simuladas.toFixed(1)} ` +
          `interacciones -- un aumento estimado de ${r.cambio_pct.toFixed(0)}%.`
        : `'${data.to_label}' tiene menos tráfico que '${data.from_label}' ` +
          `(${data.visits_to.toFixed(0)} vs ${data.visits_from.toFixed(0)} visitas), así que este movimiento ` +
          `probablemente reduciría la interacción total, no la aumentaría.`;

    const recommendBanner = recommendMeta
        ? `<div style="margin-bottom:var(--space-4);">${window.alertHtml(
              "success",
              `Recomendación: comparamos '${escapeHtml(data.from_label)}' contra ${recommendMeta.nEvaluados} ` +
              `zona(s) candidata(s) disponibles -- el mejor destino encontrado es <strong>'${escapeHtml(data.to_label)}'</strong>.`
          )}</div>`
        : "";

    return `
        <div class="panel">
            <h4>Resultado de la simulación</h4>
            ${recommendBanner}
            <div class="metric-row">
                <div class="metric"><div class="metric-label">Interacciones actuales</div><div class="metric-value">${r.interacciones_actuales.toFixed(0)}</div></div>
                <div class="metric"><div class="metric-label">Interacciones estimadas en '${escapeHtml(data.to_label)}'</div><div class="metric-value">${r.interacciones_simuladas.toFixed(1)}</div></div>
                <div class="metric"><div class="metric-label">Cambio estimado</div><div class="metric-value">${r.cambio_pct >= 0 ? "+" : ""}${r.cambio_pct.toFixed(0)}%</div></div>
            </div>
            <div style="margin-top:var(--space-4);">${window.alertHtml(messageKind, message)}</div>
            <p class="caption">Recuerda: esta es una extrapolación basada en el patrón de tráfico observado, asumiendo que el interés del producto por visitante no cambia entre zonas.</p>
        </div>`;
}

function initSimulator() {
    const runBtn = document.getElementById("sim-run-btn");
    if (!runBtn) return;

    runBtn.addEventListener("click", async () => {
        const store = runBtn.dataset.store;
        const fromId = document.getElementById("sim-from").value;
        const toId = document.getElementById("sim-to").value;
        const resultDiv = document.getElementById("sim-result");

        if (fromId === toId) {
            resultDiv.innerHTML = window.alertHtml("warning", "Elige dos zonas distintas.");
            window.refreshIcons();
            return;
        }

        resultDiv.innerHTML = '<p class="caption">Simulando...</p>';
        try {
            const resp = await fetch(`/api/store/${encodeURIComponent(store)}/simulate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ from_id: fromId, to_id: toId }),
            });
            const data = await resp.json();

            if (!data.ok) {
                resultDiv.innerHTML = window.alertHtml("warning", escapeHtml(data.error));
                window.refreshIcons();
                return;
            }

            resultDiv.innerHTML = buildSimResultHtml(data);
            window.refreshIcons();
        } catch (err) {
            resultDiv.innerHTML = window.alertHtml("error", "No se pudo calcular la simulación. Intenta de nuevo.");
            window.refreshIcons();
        }
    });

    const recommendBtn = document.getElementById("sim-recommend-btn");
    if (!recommendBtn) return;

    recommendBtn.addEventListener("click", async () => {
        const store = recommendBtn.dataset.store;
        const fromId = document.getElementById("sim-from").value;
        const toSelect = document.getElementById("sim-to");
        const resultDiv = document.getElementById("sim-result");

        resultDiv.innerHTML = '<p class="caption">Comparando contra todas las zonas candidatas...</p>';
        try {
            const resp = await fetch(`/api/store/${encodeURIComponent(store)}/simulate/recommend`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ from_id: fromId }),
            });
            const data = await resp.json();

            if (!data.ok) {
                // no_improvement: la zona ya está bien ubicada -- es una
                // respuesta honesta, no un error real, así que se muestra
                // como "info" en vez de "warning".
                resultDiv.innerHTML = window.alertHtml(data.no_improvement ? "info" : "warning", escapeHtml(data.error));
                window.refreshIcons();
                return;
            }

            // Auto-completa el selector manual con el destino recomendado
            // -- el control manual sigue ahí para quien prefiera elegir
            // otra combinación después de ver la recomendación.
            if (data.to_id != null && toSelect) toSelect.value = data.to_id;

            resultDiv.innerHTML = buildSimResultHtml(data, { nEvaluados: data.n_candidatos_evaluados });
            window.refreshIcons();
        } catch (err) {
            resultDiv.innerHTML = window.alertHtml("error", "No se pudo calcular la recomendación. Intenta de nuevo.");
            window.refreshIcons();
        }
    });
}

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
}
