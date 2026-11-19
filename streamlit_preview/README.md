# Preview de Retailytics en Streamlit

Esta app presenta una vista ligera del dashboard usando los artefactos de muestra versionados en `data/output/`. Sirve para revisar jerarquía visual, navegación y gráficos durante las iteraciones de UX. Incluye una pantalla de carga lineal que es solo un prototipo: no procesa ni guarda videos. El archivo seleccionado se transmite a Streamlit durante la sesión, así que no subas grabaciones sensibles.

No ejecuta modelos de visión ni escribe en los datos del proyecto. El prototipo de carga acepta un archivo solo para mostrar el estado visual del formulario; no analiza ni conserva el archivo.

## Ejecutar localmente

Desde la raíz del repositorio:

```bash
python -m pip install -r streamlit_preview/requirements.txt
streamlit run streamlit_preview/app.py
```

## Desplegar en Streamlit Community Cloud

1. Conecta GitHub a Streamlit Community Cloud.
2. Crea una app desde este repositorio.
3. Selecciona la rama de UX que se quiere revisar.
4. Usa `streamlit_preview/app.py` como archivo de entrada.

Los paquetes de esta app se declaran en `streamlit_preview/requirements.txt`; así Community Cloud no instala el stack de visión artificial del dashboard Flask. La configuración de tema vive en `.streamlit/config.toml`, en la raíz del repositorio.
