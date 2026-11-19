"""Vista de UX de Retailytics para Streamlit Community Cloud.

Esta app usa solo artefactos de demostración que ya están versionados.
No recibe videos, no ejecuta modelos y no modifica archivos de datos.
"""

from pathlib import Path

import pandas as pd
import streamlit as st


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "data" / "output"
STORE_NAME = "Principal"


def load_csv(filename: str) -> pd.DataFrame:
    """Carga un CSV de la demo y muestra un estado claro si falta."""
    path = OUTPUT_DIR / filename
    if not path.exists():
        return pd.DataFrame()
    return pd.read_csv(path)


def load_image(filename: str) -> Path | None:
    """Devuelve una imagen de resultados solo cuando está disponible."""
    path = OUTPUT_DIR / filename
    return path if path.exists() else None


def render_page_header(eyebrow: str, title: str, description: str) -> None:
    st.markdown(
        f"""
        <section class="page-hero">
            <div class="eyebrow">{eyebrow}</div>
            <h1>{title}</h1>
            <p>{description}</p>
        </section>
        """,
        unsafe_allow_html=True,
    )


def render_summary(summary: pd.DataFrame, interactions: pd.DataFrame) -> None:
    render_page_header(
        "VISTA GENERAL · CÁMARA PRINCIPAL",
        "Tu tienda, de un vistazo",
        "Observa dónde se detienen las personas y qué zonas generan más interacción.",
    )

    total_visits = int(summary["total_visits"].sum()) if not summary.empty else 0
    zone_count = len(summary)
    interaction_count = (
        int(interactions["total_interactions"].sum())
        if not interactions.empty
        else 0
    )
    average_dwell = (
        float(summary["avg_dwell_seconds"].mean()) if not summary.empty else 0.0
    )

    metric_columns = st.columns(4, gap="medium")
    metrics = [
        ("Visitas", f"{total_visits:,}", "En las zonas configuradas"),
        ("Interacciones", f"{interaction_count:,}", "Eventos estimados"),
        ("Zonas activas", str(zone_count), "En esta cámara"),
        ("Permanencia promedio", f"{average_dwell:.1f} s", "Promedio simple por zona"),
    ]
    for column, (label, value, hint) in zip(metric_columns, metrics):
        with column:
            st.metric(label, value, help=hint)

    left, right = st.columns([1.2, 0.8], gap="large")
    with left:
        st.subheader("Visitas por zona")
        if summary.empty:
            st.info("Aún no hay datos de visitas para mostrar.")
        else:
            chart_data = summary.set_index("zone_label")[["total_visits"]]
            st.bar_chart(chart_data, height=300, color="#5B4FD6")
            st.caption("El volumen de visitas ayuda a comparar el interés entre zonas.")

    with right:
        st.subheader("Resumen de zonas")
        if summary.empty:
            st.info("No se encontró el resumen de zonas.")
        else:
            display = summary[
                ["zone_label", "total_visits", "stop_rate_pct", "avg_dwell_seconds"]
            ].rename(
                columns={
                    "zone_label": "Zona",
                    "total_visits": "Visitas",
                    "stop_rate_pct": "Detención (%)",
                    "avg_dwell_seconds": "Permanencia (s)",
                }
            )
            st.dataframe(display, hide_index=True)

    st.info(
        "Vista de demostración: las interacciones son estimaciones de proximidad; "
        "no confirman una compra ni distinguen si un producto fue tomado o devuelto."
    )


def render_zones(summary: pd.DataFrame) -> None:
    render_page_header(
        "EXPLORACIÓN",
        "Rendimiento por zona",
        "Compara la afluencia, las detenciones y el tiempo de permanencia.",
    )
    if summary.empty:
        st.warning("No se encontró el archivo de resumen de zonas de la demo.")
        return

    left, right = st.columns(2, gap="large")
    with left:
        st.subheader("Tasa de detención")
        stop_data = summary.set_index("zone_label")[["stop_rate_pct"]]
        st.bar_chart(stop_data, height=300, color="#E8543E")
    with right:
        st.subheader("Permanencia media")
        dwell_data = summary.set_index("zone_label")[["avg_dwell_seconds"]]
        st.bar_chart(dwell_data, height=300, color="#0EA5A0")
    st.dataframe(summary, hide_index=True)


def render_interactions(interactions: pd.DataFrame) -> None:
    render_page_header(
        "ACTIVIDAD EN GÓNDOLA",
        "Interacciones estimadas",
        "Consulta la frecuencia y duración de los eventos detectados por zona.",
    )
    if interactions.empty:
        st.warning("No se encontró el archivo de interacciones de la demo.")
        return

    event_columns = [
        "toques_breves",
        "interacciones_medias",
        "interacciones_prolongadas",
    ]
    chart_data = interactions.set_index("zone_label")[event_columns]
    st.bar_chart(chart_data, height=360)
    st.dataframe(interactions, hide_index=True)
    st.caption(
        "Las interacciones se estiman por proximidad entre la mano y la zona del estante. "
        "No representan compras confirmadas."
    )


def render_maps() -> None:
    render_page_header(
        "MAPAS Y TRAYECTORIAS",
        "Entiende el recorrido",
        "Usa los mapas como referencia visual para encontrar zonas de concentración y flujo.",
    )
    heatmap = load_image(f"heatmap_{STORE_NAME}.png")
    paths = load_image(f"spaghetti_{STORE_NAME}.png")

    map_columns = st.columns(2, gap="large")
    for column, title, image_path, caption in [
        (map_columns[0], "Mapa de flujo", heatmap, "Concentración de recorridos en la cámara."),
        (map_columns[1], "Trayectorias", paths, "Trazos de recorridos detectados en la demo."),
    ]:
        with column:
            st.subheader(title)
            if image_path:
                alt_text = (
                    "Mapa de calor de flujo"
                    if title == "Mapa de flujo"
                    else "Trayectorias detectadas"
                )
                st.image(str(image_path), width="stretch", alt=alt_text)
                st.caption(caption)
            else:
                st.info("La imagen de demostración no está disponible.")


def render_upload_preview() -> None:
    """Muestra el flujo lineal de carga sin ejecutar el procesamiento real."""
    render_page_header(
        "ASISTENTE DE CARGA · PROTOTIPO",
        "Analiza un video, paso a paso",
        "Completa cada sección en orden. Las opciones recomendadas ya están listas para empezar.",
    )
    st.info(
        "Este preview solo demuestra la interfaz: no procesa ni guarda videos. "
        "El archivo elegido se transmite a Streamlit durante la sesión; usa solo "
        "un video de prueba y no subas grabaciones sensibles."
    )

    st.markdown("### 1. Selecciona el video")
    st.caption("Elige una grabación corta de una tienda. Formatos admitidos: MP4, MOV o AVI.")
    video = st.file_uploader(
        "Video de la cámara",
        type=["mp4", "mov", "avi"],
        help="Prototipo visual. El archivo no se analiza ni se conserva después de la sesión.",
    )
    if video:
        st.success(f"Video listo: {video.name}")

    st.markdown("### 2. Elige qué parte analizar")
    st.caption("Si el video tiene tiempo sin actividad, puedes seleccionar un tramo.")
    trim_video = st.checkbox("Quiero analizar solo una parte del video")
    if trim_video:
        trim_start, trim_end = st.slider(
            "Tramo de ejemplo (minutos)",
            min_value=0,
            max_value=60,
            value=(0, 10),
            help="En la aplicación completa verás una imagen del inicio y del final.",
        )
        st.caption(f"Tramo seleccionado: minuto {trim_start} a {trim_end}.")
    else:
        st.caption("Se usaría la grabación completa.")

    st.markdown("### 3. Indica dónde están las góndolas")
    st.caption("En la aplicación, marcarás cada zona sobre un fotograma del video.")
    zone_count = st.selectbox("¿Cuántas zonas quieres marcar?", [1, 2, 3, 4, 5], index=1)
    for zone_index in range(zone_count):
        st.text_input(
            f"Nombre de la zona {zone_index + 1}",
            value="" if zone_index else "Góndola principal",
            placeholder="Ej.: Lácteos, Snacks, Pasillo 1",
            key=f"preview_zone_{zone_index}",
        )

    st.markdown("### 4. Confirma y comienza")
    st.caption("La configuración automática es la recomendada para la mayoría de los casos.")
    record_history = st.checkbox("Guardar el análisis para comparar resultados", value=True)
    run_date = st.date_input("Día de la grabación") if record_history else None
    skip_interactions = st.checkbox(
        "Omitir el cálculo de interacciones para terminar más rápido"
    )
    with st.expander("Opciones técnicas (puedes dejarlas como están)"):
        st.selectbox("Equipo de procesamiento", ["Automático (recomendado)", "CPU", "GPU"])
        st.caption("Los valores avanzados se mantienen en su configuración recomendada.")

    if st.button("Iniciar análisis de prueba", type="primary", disabled=video is None):
        st.success(
            "Formulario completo. Esta vista previa no inicia el análisis; "
            "la aplicación local realiza el procesamiento real."
        )
    st.caption(
        "Configuración de prueba: "
        f"{zone_count} zona(s), interacciones {'omitidas' if skip_interactions else 'incluidas'}, "
        f"historial {'activado' if record_history else 'desactivado'}."
    )


st.set_page_config(
    page_title="Retailytics · Preview UX",
    page_icon="🛍️",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown(
    """
    <style>
    :root {
        --retail-accent: #5B4FD6;
        --retail-muted: #65656F;
    }
    body, button, input, select, textarea { font-family: "Oxanium", sans-serif; }
    [data-testid="stAppViewContainer"] { background: #F7F7F9; font-family: "Oxanium", sans-serif; }
    [data-testid="stSidebar"] { background: #FFFFFF; }
    .block-container { max-width: 1440px; padding-top: 2.2rem; padding-bottom: 3rem; }
    .page-hero {
        padding: 1.7rem 2rem; margin: 0 0 1.5rem 0;
        border: 1px solid #E1E1E8; border-radius: 16px;
        background: linear-gradient(120deg, #F0EEFF 0%, #FFFFFF 68%);
    }
    .page-hero .eyebrow {
        color: var(--retail-accent); font-size: .75rem; font-weight: 700;
        letter-spacing: .09em; margin-bottom: .45rem;
    }
    .page-hero h1 { font-size: 2rem; line-height: 1.2; margin: 0; color: #1C1C24; }
    .page-hero p { color: var(--retail-muted); margin: .5rem 0 0 0; font-size: 1rem; }
    [data-testid="stMetric"] {
        background: #FFFFFF; border: 1px solid #E1E1E8;
        padding: 1rem 1.1rem; border-radius: 14px;
    }
    [data-testid="stMetricLabel"] { color: #65656F; }
    [data-testid="stMetricValue"] { color: #1C1C24; }
    [data-testid="stDataFrame"] { border: 1px solid #E1E1E8; border-radius: 12px; }
    @media (max-width: 800px) {
        .block-container { padding-top: 1rem; }
        .page-hero { padding: 1.25rem; }
        .page-hero h1 { font-size: 1.6rem; }
    }
    </style>
    """,
    unsafe_allow_html=True,
)

with st.sidebar:
    st.markdown("# Retailytics")
    st.caption("Retail insights, con una interfaz más clara.")
    st.divider()
    st.selectbox("Tienda", ["Principal · tienda demo"], index=0)
    st.selectbox("Cámara", ["Principal"], index=0)
    page = st.radio(
        "Explorar",
        ["Resumen", "Zonas", "Interacciones", "Mapas", "Nueva carga (demo)"],
        label_visibility="collapsed",
    )
    st.divider()
    st.caption("Demo de UX · los videos no se procesan")

summary_df = load_csv(f"zone_summary_{STORE_NAME}.csv")
interaction_df = load_csv(f"interaction_summary_{STORE_NAME}.csv")

if page == "Resumen":
    render_summary(summary_df, interaction_df)
elif page == "Zonas":
    render_zones(summary_df)
elif page == "Interacciones":
    render_interactions(interaction_df)
elif page == "Mapas":
    render_maps()
else:
    render_upload_preview()
