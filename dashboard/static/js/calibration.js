// Calibración de zonas: el polígono en progreso vive ENTERAMENTE en el
// navegador (sin ida y vuelta al servidor por cada clic, a diferencia
// de la versión anterior en Streamlit) -- solo al presionar "Guardar
// todas las zonas" se envían las coordenadas finales al backend.

document.addEventListener("DOMContentLoaded", () => {
    window.initCalibrationPage();
});

// #calibration-root es propio de setup.html (mismo ancla que
// window.initSetupPage() en setup.js) -- se re-ejecuta junto con esa
// función tras cada navegación sin recarga (ver main.js:navigateTo()),
// ya que calibración vive en un <script> aparte con su propia
// inicialización histórica.
window.initCalibrationPage = function initCalibrationPage() {
    const root = document.getElementById("calibration-root");
    if (!root) return;

    const store = root.dataset.store;
    const video = root.dataset.video;
    const hasHeatPreview = root.dataset.hasHeatPreview === "true";
    if (!video) return;

    const recalibrateCheck = document.getElementById("recalibrate-check");
    const area = document.getElementById("calibration-area");

    function showCalibration() {
        area.style.display = "block";
        initCanvas(area, store, video, hasHeatPreview);
    }

    if (recalibrateCheck) {
        recalibrateCheck.addEventListener("change", () => {
            if (recalibrateCheck.checked) showCalibration();
            else area.style.display = "none";
        });
    } else if (area) {
        showCalibration();
    }
};

function initCanvas(container, store, video, hasHeatPreview) {
    if (container.dataset.initialized === "true") return;
    container.dataset.initialized = "true";

    container.innerHTML = `
        <ol class="setup-instructions">
            <li>Haz clic en la imagen para marcar las esquinas de una góndola (necesitas al menos 3 puntos).</li>
            <li>Escribe un nombre fácil de reconocer para esta zona.</li>
            <li>Presiona «Guardar esta zona» y repite para cada góndola.</li>
        </ol>
        <canvas id="calibration-canvas"></canvas>
        <div class="form-field" style="margin-top:0.75rem;">
            <label for="zone-name-input">Nombre de esta góndola/zona</label>
            <input type="text" id="zone-name-input" placeholder="Ej.: Lácteos, Pasillo 1, Snacks">
            <p class="caption">Usa un nombre corto para identificarla en los resultados.</p>
        </div>
        <div style="display:flex; gap:var(--space-2); margin-bottom:var(--space-4); flex-wrap:wrap;">
            <button class="btn" id="undo-point-btn"><i data-lucide="undo-2" class="icon"></i> Deshacer último punto</button>
            <button class="btn" id="close-zone-btn"><i data-lucide="shapes" class="icon"></i> Guardar esta zona</button>
            <button class="btn btn-primary" id="save-zones-btn" disabled><i data-lucide="save" class="icon"></i> Guardar todas las zonas</button>
        </div>
        <div id="zone-list"></div>
        <div id="calibration-msg"></div>
    `;
    window.refreshIcons();

    const canvas = document.getElementById("calibration-canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    let currentPoints = [];
    let completedZones = [];
    let frameWidth = 0, frameHeight = 0;

    const frameUrl = `/api/frame?video=${encodeURIComponent(video)}&at=0&heat=${hasHeatPreview ? "1" : "0"}`;
    img.onload = () => {
        frameWidth = img.naturalWidth;
        frameHeight = img.naturalHeight;
        canvas.width = frameWidth;
        canvas.height = frameHeight;
        redraw();
    };
    img.src = frameUrl;

    function redraw() {
        ctx.drawImage(img, 0, 0);

        // Zonas ya cerradas: contorno verde.
        ctx.strokeStyle = "#0EA35F";
        ctx.lineWidth = 2;
        ctx.fillStyle = "#0EA35F";
        ctx.font = "16px sans-serif";
        completedZones.forEach((zone) => {
            ctx.beginPath();
            zone.polygon.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
            ctx.closePath();
            ctx.stroke();
            const cx = zone.polygon.reduce((s, p) => s + p[0], 0) / zone.polygon.length;
            const cy = zone.polygon.reduce((s, p) => s + p[1], 0) / zone.polygon.length;
            ctx.fillText(zone.label, cx - 20, cy);
        });

        // Polígono en progreso: puntos y líneas en rojo.
        ctx.strokeStyle = "#E8543E";
        ctx.fillStyle = "#E8543E";
        currentPoints.forEach(([x, y], i) => {
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fill();
            if (i > 0) {
                ctx.beginPath();
                ctx.moveTo(currentPoints[i - 1][0], currentPoints[i - 1][1]);
                ctx.lineTo(x, y);
                ctx.stroke();
            }
        });
    }

    function scalePoint(evt) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return [Math.round((evt.clientX - rect.left) * scaleX), Math.round((evt.clientY - rect.top) * scaleY)];
    }

    canvas.addEventListener("click", (evt) => {
        currentPoints.push(scalePoint(evt));
        redraw();
    });

    document.getElementById("undo-point-btn").addEventListener("click", () => {
        currentPoints.pop();
        redraw();
    });

    document.getElementById("close-zone-btn").addEventListener("click", () => {
        const msg = document.getElementById("calibration-msg");
        if (currentPoints.length < 3) {
            msg.innerHTML = window.alertHtml("warning", "Necesitas al menos 3 puntos para cerrar una zona.");
            window.refreshIcons();
            return;
        }
        const nameInput = document.getElementById("zone-name-input");
        const label = nameInput.value.trim() || `zona_${completedZones.length + 1}`;
        completedZones.push({ label, polygon: currentPoints });
        currentPoints = [];
        nameInput.value = "";
        msg.innerHTML = "";
        document.getElementById("save-zones-btn").disabled = false;
        renderZoneList();
        redraw();
    });

    function renderZoneList() {
        const list = document.getElementById("zone-list");
        list.innerHTML = completedZones
            .map((z, i) => `<div class="zone-list-item"><span>${escapeHtmlLocal(z.label)}</span>
                <button class="btn btn-sm" data-idx="${i}" onclick="window.__removeZone(${i})"><i data-lucide="x" class="icon"></i> Quitar</button></div>`)
            .join("");
        window.refreshIcons();
        window.__removeZone = (idx) => {
            completedZones.splice(idx, 1);
            renderZoneList();
            redraw();
            document.getElementById("save-zones-btn").disabled = completedZones.length === 0;
        };
    }

    document.getElementById("save-zones-btn").addEventListener("click", async () => {
        const msg = document.getElementById("calibration-msg");
        msg.innerHTML = '<p class="caption">Guardando...</p>';
        try {
            const resp = await fetch(`/api/store/${encodeURIComponent(store)}/save-zones`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    video_path: video, frame_width: frameWidth, frame_height: frameHeight,
                    zones: completedZones,
                }),
            });
            const data = await resp.json();
            if (data.ok) {
                msg.innerHTML = window.alertHtml("success", `¡Zonas guardadas! (${completedZones.length} zona(s))`);
                completedZones = [];
                document.getElementById("save-zones-btn").disabled = true;
                renderZoneList();
                redraw();
            } else {
                msg.innerHTML = window.alertHtml("error", escapeHtmlLocal(data.error));
            }
        } catch (err) {
            msg.innerHTML = window.alertHtml("error", "No se pudo guardar. Intenta de nuevo.");
        } finally {
            window.refreshIcons();
        }
    });
}

function escapeHtmlLocal(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
}
