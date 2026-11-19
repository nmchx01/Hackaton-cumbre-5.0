# Retailytics

**Entiende cómo se mueven e interactúan tus clientes con las góndolas.** Retailytics procesa video de tienda en el equipo local y convierte la actividad alrededor de los estantes en métricas y recomendaciones prácticas.

El proyecto combina visión por computadora con un dashboard web en español. Está pensado para explorar flujo, permanencia e interacción por zona sin identificar a las personas ni enviar los videos a un servicio externo.

<p align="center">
  <img src="docs/screenshots/02_resultados_historia.png" alt="Panel de resultados de Retailytics" width="800">
</p>

## Qué puedes hacer

- Analizar videos de una o varias cámaras por tienda.
- Calibrar las zonas de góndola desde un asistente visual.
- Explorar visitas, tasa de detención, permanencia, mapas de calor y trayectorias.
- Revisar eventos estimados de interacción entre manos y zonas de producto.
- Comparar tendencias guardadas y consultar resultados históricos.
- Probar escenarios en el simulador y obtener recomendaciones basadas en reglas.
- Usar el dashboard en tema claro u oscuro, con navegación adaptable a móvil.
- Ejecutar la aplicación localmente o en Docker, con CPU y una opción GPU para equipos compatibles.

<details>
  <summary>Ver más pantallas</summary>

  <p align="center">
    <img src="docs/screenshots/03_resultados_mapas.png" alt="Mapas de calor y trayectorias" width="800">
  </p>

  <p align="center">
    <img src="docs/screenshots/11_asistente_paso4_procesar.png" alt="Asistente de configuración y procesamiento" width="800">
  </p>
</details>

## Inicio rápido

### Opción 1: Docker

Necesitas Docker Desktop. Desde la raíz del repositorio:

```powershell
.\docker-run.ps1
```

El script selecciona la configuración disponible y abre el dashboard en [http://localhost:5000](http://localhost:5000). En macOS, Linux o Git Bash, usa `./docker-run.sh`. Para iniciar directamente la variante CPU:

```bash
docker-compose up --build
```

La primera construcción descarga dependencias y modelos y puede tardar varios minutos. Los datos de `config/` y `data/` permanecen en el checkout y sobreviven a la reconstrucción del contenedor. La guía de [Docker](DOCKER.md) describe almacenamiento, GPU y solución de problemas.

### Opción 2: Python

Recomendado: Python 3.13. Crea un entorno virtual e instala las dependencias:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

En macOS/Linux, activa el entorno con `source .venv/bin/activate`. Luego, desde la raíz del repositorio:

```bash
python dashboard/app.py
```

Abre [http://127.0.0.1:5000](http://127.0.0.1:5000). En la primera visita crea la cuenta local de la instalación. Los pesos de los modelos se descargan al necesitarlos; para CPU se intenta usar OpenVINO cuando está disponible y se conserva PyTorch como alternativa.

Para escuchar en otra interfaz o puerto, configura `FLASK_HOST` y `FLASK_PORT`. `FLASK_DEBUG` está desactivado por defecto; actívalo únicamente durante desarrollo. `FLASK_SECRET_KEY` permite definir una clave estable para la sesión de Flask. Sin ella se genera una clave aleatoria al arrancar.

### Preview de interfaz con Streamlit

Para revisar cambios de UX en una app ligera, el repositorio incluye un preview separado que usa datos e imágenes de demostración. Incluye un prototipo lineal de carga para probar la interfaz, pero no procesa ni guarda los videos seleccionados. El archivo se transmite a Streamlit durante la sesión; no uses grabaciones sensibles.

```bash
pip install -r streamlit_preview/requirements.txt
streamlit run streamlit_preview/app.py
```

Para publicarlo en Streamlit Community Cloud, crea una app con esta rama y usa `streamlit_preview/app.py` como archivo de entrada. El archivo de dependencias está junto a la app y la configuración visual está en `.streamlit/config.toml`. Community Cloud también permite elegir la rama y la ruta de entrada al crear una app ([guía oficial](https://docs.streamlit.io/deploy/streamlit-community-cloud/deploy-your-app/deploy)).

El preview es una superficie de iteración de interfaz, no reemplaza el dashboard Flask ni permite procesar videos. El flujo real de carga y análisis está en el dashboard Flask.

## Flujo de trabajo

1. Crea o selecciona una tienda y una cámara.
2. Sube un video y, si hace falta, recórtalo desde el asistente.
3. Marca en el canvas las zonas de interés de la cámara.
4. Ejecuta el procesamiento y explora el panel de resultados.
5. Guarda ejecuciones en el historial para comparar periodos.

También puedes ejecutar el pipeline desde la terminal:

```bash
python pipeline/run_pipeline.py --help
```

## Cómo funciona

```text
Video local
   │
   ├── Detección y tracking de personas
   ├── Unión de tracks fragmentados
   ├── Métricas por zona y mapas de flujo
   ├── Estimación de interacción mano-estante
   └── Dashboard Flask con análisis e historial
```

La aplicación está organizada en tres áreas principales:

| Ruta | Responsabilidad |
| --- | --- |
| `dashboard/` | Aplicación Flask, rutas, servicios de negocio, plantillas y recursos de interfaz. |
| `pipeline/` | Detección, tracking, calibración, métricas y generación de artefactos. |
| `config/` y `data/` | Configuración de tiendas y resultados locales del procesamiento. |

Las vistas se registran como Blueprints y delegan el trabajo a servicios del dashboard y módulos del pipeline. La factoría `dashboard.app.create_app(config)` permite proporcionar configuración al construir la aplicación. Consulta [docs/architecture.md](docs/architecture.md) para las decisiones y el recorrido técnico completo.

## Privacidad y alcance

- El análisis de video se ejecuta en el equipo donde corre la aplicación. Los videos no se suben a una API de análisis.
- La interfaz puede solicitar Google Fonts, Lucide y Chart.js desde sus CDNs para mostrar tipografía, iconos y gráficos. Esos recursos no reciben los videos.
- Los identificadores de tracking son temporales y pertenecen a una ejecución; no están diseñados para reconocer a alguien entre videos.
- La aplicación persiste métricas, configuraciones y archivos de resultados locales. La carpeta `.secrets/` contiene credenciales de la instalación y está excluida de Git.
- Las interacciones son estimaciones de proximidad y duración entre manos y zonas de estante. **No permiten asegurar que una persona tomó o devolvió un producto, ni confirman una compra.**
- La detección puede variar según ángulo, iluminación, oclusión y calidad del video. Los resultados apoyan el análisis operativo; no sustituyen una medición transaccional.

Lee la [lista de privacidad](docs/privacy_checklist.md) antes de usar videos en un entorno real.

## Estructura del repositorio

```text
dashboard/                 Aplicación Flask y frontend
pipeline/                  Procesamiento de video y análisis
streamlit_preview/          Preview ligero para iterar la UX en Streamlit
config/                    Configuración de tiendas y zonas
data/                      Entradas y artefactos de análisis locales
docs/                      Arquitectura, privacidad y capturas
_legacy_streamlit/         Prototipo anterior conservado como referencia
```

## Documentación

- [Arquitectura y decisiones técnicas](docs/architecture.md)
- [Guía de Docker](DOCKER.md)
- [Lista de verificación de privacidad](docs/privacy_checklist.md)
- [Índice de capturas](docs/screenshots/README.md)

## Licencia

Este repositorio no incluye actualmente un archivo de licencia. Añade una licencia antes de redistribuir o reutilizar el código fuera de los permisos que te haya concedido su autor.
