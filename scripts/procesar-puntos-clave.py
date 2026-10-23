#!/usr/bin/env python3
"""
Script para procesar archivos de Puntos Clave / Key Points
(KMZ, KML y Excel) y generar capas GeoJSON normalizadas en /public/data/puntos-clave/.
"""
import os
import re
import json
import zipfile
import xml.etree.ElementTree as ET
import openpyxl

SOURCE_DIR = "/Users/daniel/Library/CloudStorage/OneDrive-SYMSERVICIOSINTEGRALESSADECV 2/2026/Innovación/Key points"
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "public", "data", "puntos-clave")

def parse_coord(val, is_lon=False):
    if val is None:
        return None
    if isinstance(val, (int, float)):
        # Si la longitud es un entero grande sin punto (ej. -92135024)
        if abs(val) > 1000:
            val = val / 1000000.0
        # En México la longitud siempre es negativa (-85 a -118)
        if is_lon and val > 0:
            val = -val
        return round(float(val), 6)
    
    s = str(val).strip().upper()
    if not s:
        return None
    
    # Manejar grados ej: 16.091001° o con N/W
    is_neg = ('W' in s or 'O' in s or 'S' in s or '-' in s)
    clean = re.sub(r'[^\d.]', '', s)
    if not clean:
        return None
    try:
        num = float(clean)
        if abs(num) > 1000:
            num = num / 1000000.0
        if is_neg or (is_lon and num > 0):
            num = -abs(num)
        return round(num, 6)
    except:
        return None

def validar_mexico(lat, lon):
    if lat is None or lon is None:
        return False
    return (14.0 <= lat <= 33.0) and (-118.5 <= lon <= -85.0)

def procesar_kmz(kmz_path):
    features = []
    with zipfile.ZipFile(kmz_path) as z:
        kml_name = next((n for n in z.namelist() if n.lower().endswith(".kml")), None)
        if not kml_name:
            return features
        with z.open(kml_name) as f:
            tree = ET.parse(f)
            root = tree.getroot()
            ns = {"kml": "http://www.opengis.net/kml/2.2"}
            # Si no tiene namespace o varía
            placemarks = root.findall(".//kml:Placemark", ns) or root.findall(".//Placemark")
            for p in placemarks:
                name_el = p.find("kml:name", ns) if p.find("kml:name", ns) is not None else p.find("name")
                desc_el = p.find("kml:description", ns) if p.find("kml:description", ns) is not None else p.find("description")
                coords_el = p.find(".//kml:coordinates", ns) if p.find(".//kml:coordinates", ns) is not None else p.find(".//coordinates")
                
                nombre = name_el.text.strip() if name_el is not None and name_el.text else "Punto sin nombre"
                desc = desc_el.text.strip() if desc_el is not None and desc_el.text else ""
                
                if coords_el is not None and coords_el.text:
                    parts = coords_el.text.strip().split(",")
                    if len(parts) >= 2:
                        lon = parse_coord(parts[0], is_lon=True)
                        lat = parse_coord(parts[1], is_lon=False)
                        if validar_mexico(lat, lon):
                            features.append({
                                "type": "Feature",
                                "geometry": {"type": "Point", "coordinates": [lon, lat]},
                                "properties": {
                                    "nombre": nombre,
                                    "descripcion": desc,
                                    "categoria": "Punto de Monitoreo",
                                    "region": "Morelos",
                                }
                            })
    return features

def procesar_kml(kml_path, categoria="Sitio", region="Puebla"):
    features = []
    tree = ET.parse(kml_path)
    root = tree.getroot()
    ns = {"kml": "http://www.opengis.net/kml/2.2"}
    placemarks = root.findall(".//kml:Placemark", ns) or root.findall(".//Placemark")
    for p in placemarks:
        name_el = p.find("kml:name", ns) if p.find("kml:name", ns) is not None else p.find("name")
        desc_el = p.find("kml:description", ns) if p.find("kml:description", ns) is not None else p.find("description")
        coords_el = p.find(".//kml:coordinates", ns) if p.find(".//kml:coordinates", ns) is not None else p.find(".//coordinates")
        
        nombre = name_el.text.strip() if name_el is not None and name_el.text else "Sitio SICOM"
        desc = desc_el.text.strip() if desc_el is not None and desc_el.text else ""
        
        if coords_el is not None and coords_el.text:
            parts = coords_el.text.strip().split(",")
            if len(parts) >= 2:
                lon = parse_coord(parts[0], is_lon=True)
                lat = parse_coord(parts[1], is_lon=False)
                if validar_mexico(lat, lon):
                    features.append({
                        "type": "Feature",
                        "geometry": {"type": "Point", "coordinates": [lon, lat]},
                        "properties": {
                            "nombre": nombre,
                            "descripcion": desc,
                            "categoria": categoria,
                            "region": region,
                        }
                    })
    return features

def procesar_excel(xlsx_path, categoria, region, nombre_cols=None, muni_col=None, desc_col=None):
    features = []
    wb = openpyxl.load_workbook(xlsx_path, data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return features
    
    headers = [str(c).strip().upper() if c is not None else "" for c in rows[0]]
    lat_idx = next((i for i, h in enumerate(headers) if "LAT" in h), None)
    lon_idx = next((i for i, h in enumerate(headers) if "LON" in h), None)
    
    if lat_idx is None or lon_idx is None:
        return features

    for r in rows[1:]:
        if not any(r):
            continue
        lat = parse_coord(r[lat_idx], is_lon=False)
        lon = parse_coord(r[lon_idx], is_lon=True)
        if not validar_mexico(lat, lon):
            continue
        
        nombre = None
        if nombre_cols:
            for col_name in nombre_cols:
                col_idx = next((i for i, h in enumerate(headers) if col_name.upper() in h), None)
                if col_idx is not None and r[col_idx] is not None and str(r[col_idx]).strip():
                    nombre = str(r[col_idx]).strip()
                    break
        if not nombre:
            nombre = f"{categoria} #{len(features) + 1}"
            
        municipio = ""
        if muni_col:
            muni_idx = next((i for i, h in enumerate(headers) if muni_col.upper() in h), None)
            if muni_idx is not None and r[muni_idx] is not None:
                municipio = str(r[muni_idx]).strip()
                
        observaciones = ""
        if desc_col:
            desc_idx = next((i for i, h in enumerate(headers) if desc_col.upper() in h), None)
            if desc_idx is not None and r[desc_idx] is not None:
                observaciones = str(r[desc_idx]).strip()
                
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lon, lat]},
            "properties": {
                "nombre": nombre,
                "municipio": municipio,
                "descripcion": observaciones,
                "categoria": categoria,
                "region": region,
            }
        })
    return features

def parse_wkt_point(wkt_str):
    if not wkt_str:
        return None, None
    m = re.search(r"POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)", wkt_str, re.IGNORECASE)
    if m:
        lon = parse_coord(m.group(1), is_lon=True)
        lat = parse_coord(m.group(2), is_lon=False)
        return lat, lon
    return None, None

def procesar_csv_wkt(csv_path, categoria, region, nombre_cols, muni_cols=None, desc_cols=None, enc="utf-8"):
    import csv
    features = []
    if not os.path.exists(csv_path):
        return features

    encodings = [enc, "latin1", "cp1252", "utf-8"]
    rows = []
    for e in encodings:
        try:
            with open(csv_path, "r", encoding=e) as f:
                reader = csv.DictReader(f)
                rows = list(reader)
                break
        except Exception:
            continue

    for idx, r in enumerate(rows, start=1):
        wkt = r.get("WKT", "")
        lat, lon = parse_wkt_point(wkt)
        if not validar_mexico(lat, lon):
            continue

        nombre = None
        for ncol in nombre_cols:
            val = r.get(ncol)
            if val and str(val).strip():
                nombre = str(val).strip()
                break
        if not nombre:
            nombre = f"{categoria} #{idx}"

        municipio = ""
        if muni_cols:
            for mcol in muni_cols:
                val = r.get(mcol)
                if val and str(val).strip():
                    municipio = str(val).strip()
                    break

        descripcion = ""
        if desc_cols:
            desc_parts = []
            for dcol in desc_cols:
                val = r.get(dcol)
                if val and str(val).strip():
                    desc_parts.append(f"{dcol}: {str(val).strip()}")
            descripcion = " · ".join(desc_parts)

        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lon, lat]},
            "properties": {
                "nombre": nombre,
                "municipio": municipio,
                "descripcion": descripcion,
                "categoria": categoria,
                "region": region,
            }
        })
    return features

def guardar_geojson(features, filename):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    filepath = os.path.join(OUTPUT_DIR, filename)
    data = {
        "type": "FeatureCollection",
        "features": features
    }
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  ✓ {filename}: {len(features)} puntos")
    return len(features)

def main():
    print("Iniciando procesamiento de puntos clave...")
    capas = []

    # 1. Morelos KMZ
    morelos_kmz = os.path.join(SOURCE_DIR, "PMC_Morelos_1000_puntos.kmz")
    if os.path.exists(morelos_kmz):
        f = procesar_kmz(morelos_kmz)
        cnt = guardar_geojson(f, "morelos-puntos-monitoreo.json")
        capas.append({
            "id": "morelos-pmc",
            "nombre": "Morelos — Puntos de Monitoreo (1,000 pts)",
            "archivo": "morelos-puntos-monitoreo.json",
            "region": "Morelos",
            "categoria": "Punto de Monitoreo",
            "icono": "Video",
            "color": "#ea580c", # Naranja
            "totalPuntos": cnt,
            "activoPorDefecto": False,
        })

    # 2. Puebla / SICOM KML
    sicom_kml = os.path.join(SOURCE_DIR, "SItios SICOM.kml")
    if os.path.exists(sicom_kml):
        f = procesar_kml(sicom_kml, categoria="Sitio de Telecomunicaciones", region="Puebla")
        cnt = guardar_geojson(f, "sicom-sitios-telecom.json")
        capas.append({
            "id": "sicom-sitios",
            "nombre": "SICOM — Sitios Telecom",
            "archivo": "sicom-sitios-telecom.json",
            "region": "Puebla",
            "categoria": "Sitio de Telecomunicaciones",
            "icono": "Radio",
            "color": "#0284c7", # Celeste
            "totalPuntos": cnt,
            "activoPorDefecto": True,
        })

    # 3. Michoacán — Subcentros C4/C5
    subcentros_xlsx = os.path.join(SOURCE_DIR, "Michoacán", "Subcentros.xlsx")
    if os.path.exists(subcentros_xlsx):
        f = procesar_excel(subcentros_xlsx, categoria="Subcentro C4", region="Michoacán", nombre_cols=["SUBCENTRO"])
        cnt = guardar_geojson(f, "michoacan-subcentros.json")
        capas.append({
            "id": "michoacan-subcentros",
            "nombre": "Michoacán — Subcentros C4",
            "archivo": "michoacan-subcentros.json",
            "region": "Michoacán",
            "categoria": "Subcentro C4",
            "icono": "Building2",
            "color": "#1d4ed8", # Azul rey
            "totalPuntos": cnt,
            "activoPorDefecto": True,
        })

    # 4. Michoacán — Arcos Carreteros
    arcos_xlsx = os.path.join(SOURCE_DIR, "Michoacán", "arcos michoacan.xlsx")
    if os.path.exists(arcos_xlsx):
        f = procesar_excel(arcos_xlsx, categoria="Arco Carretero (LPR)", region="Michoacán", nombre_cols=["ARCO"], muni_col="MUNICIPIO", desc_col="SUBCENTRO")
        cnt = guardar_geojson(f, "michoacan-arcos.json")
        capas.append({
            "id": "michoacan-arcos",
            "nombre": "Michoacán — Arcos Carreteros",
            "archivo": "michoacan-arcos.json",
            "region": "Michoacán",
            "categoria": "Arco Carretero (LPR)",
            "icono": "ScanLine",
            "color": "#7c3aed", # Violeta
            "totalPuntos": cnt,
            "activoPorDefecto": True,
        })

    # 5. Michoacán — Red Estatal (Torres)
    red_estatal_xlsx = os.path.join(SOURCE_DIR, "Michoacán", "Red Estatal Michoacán.xlsx")
    if os.path.exists(red_estatal_xlsx):
        f = procesar_excel(red_estatal_xlsx, categoria="Torre Red Estatal", region="Michoacán", nombre_cols=["TORRES"], muni_col="MUNICIPIO")
        cnt = guardar_geojson(f, "michoacan-red-estatal.json")
        capas.append({
            "id": "michoacan-red-estatal",
            "nombre": "Michoacán — Red Estatal de Telecom",
            "archivo": "michoacan-red-estatal.json",
            "region": "Michoacán",
            "categoria": "Torre Red Estatal",
            "icono": "TowerControl",
            "color": "#0d9488", # Verde azulado / Teal
            "totalPuntos": cnt,
            "activoPorDefecto": False,
        })

    # 6. Michoacán — Red Municipal (Torres)
    red_muni_xlsx = os.path.join(SOURCE_DIR, "Michoacán", "Red municipal Michoacán.xlsx")
    if os.path.exists(red_muni_xlsx):
        f = procesar_excel(red_muni_xlsx, categoria="Torre Red Municipal", region="Michoacán", nombre_cols=["TORRES"], muni_col="MUNICIPIO")
        cnt = guardar_geojson(f, "michoacan-red-municipal.json")
        capas.append({
            "id": "michoacan-red-municipal",
            "nombre": "Michoacán — Red Municipal de Telecom",
            "archivo": "michoacan-red-municipal.json",
            "region": "Michoacán",
            "categoria": "Torre Red Municipal",
            "icono": "Radio",
            "color": "#059669", # Esmeralda
            "totalPuntos": cnt,
            "activoPorDefecto": False,
        })

    # 7. Michoacán — PMIs
    pmis_xlsx = os.path.join(SOURCE_DIR, "Michoacán", "PMIs Michoacán.xlsx")
    if os.path.exists(pmis_xlsx):
        f = procesar_excel(pmis_xlsx, categoria="PMI (Poste con Cámara)", region="Michoacán", nombre_cols=["PMI"], muni_col="MUNICIPIO")
        cnt = guardar_geojson(f, "michoacan-pmis.json")
        capas.append({
            "id": "michoacan-pmis",
            "nombre": "Michoacán — PMIs Postes (1,300 pts)",
            "archivo": "michoacan-pmis.json",
            "region": "Michoacán",
            "categoria": "PMI (Poste con Cámara)",
            "icono": "Video",
            "color": "#d97706", # Ámbar
            "totalPuntos": cnt,
            "activoPorDefecto": False,
        })

    # 8. Chiapas — Ubicaciones
    chiapas_xlsx = os.path.join(SOURCE_DIR, "Chiapas", "Chiapas ubicaciones_V2.xlsx")
    if os.path.exists(chiapas_xlsx):
        f = procesar_excel(chiapas_xlsx, categoria="Instalación Chiapas", region="Chiapas", nombre_cols=["NOMBRE"], muni_col="MUNICIPIO2", desc_col="OBSERVACIONES")
        cnt = guardar_geojson(f, "chiapas-ubicaciones.json")
        capas.append({
            "id": "chiapas-ubicaciones",
            "nombre": "Chiapas — Ubicaciones (1,100 pts)",
            "archivo": "chiapas-ubicaciones.json",
            "region": "Chiapas",
            "categoria": "Instalación Chiapas",
            "icono": "MapPin",
            "color": "#2563eb", # Azul
            "totalPuntos": cnt,
            "activoPorDefecto": False,
        })

    # 9. Tamaulipas — Puertas de Acceso
    tamps_dir = os.path.join(SOURCE_DIR, "Tamaulipas")
    puertas_csv = os.path.join(tamps_dir, "C5 TAMPS- PUERTAS DE ACCESO.csv")
    if os.path.exists(puertas_csv):
        f = procesar_csv_wkt(puertas_csv, categoria="Puerta de Acceso Carret.", region="Tamaulipas", nombre_cols=["Nombre"], desc_cols=["Descripción"])
        cnt = guardar_geojson(f, "tamaulipas-puertas-acceso.json")
        capas.append({
            "id": "tamaulipas-puertas",
            "nombre": "Tamaulipas — Puertas de Acceso",
            "archivo": "tamaulipas-puertas-acceso.json",
            "region": "Tamaulipas",
            "categoria": "Puerta de Acceso Carret.",
            "icono": "Building2",
            "color": "#1d4ed8", # Azul rey
            "totalPuntos": cnt,
            "activoPorDefecto": True,
        })

    # 10. Tamaulipas — Arcos Carreteros (LPR)
    lpr_csv = os.path.join(tamps_dir, "C5 TAMPS- LPR's NUEVO.csv")
    if os.path.exists(lpr_csv):
        f = procesar_csv_wkt(lpr_csv, categoria="Arco Carretero (LPR)", region="Tamaulipas", nombre_cols=["ID"], muni_cols=["MUNICIPIO"], desc_cols=["ZONA"], enc="latin1")
        cnt = guardar_geojson(f, "tamaulipas-arcos.json")
        capas.append({
            "id": "tamaulipas-arcos",
            "nombre": "Tamaulipas — Arcos Carreteros (LPR)",
            "archivo": "tamaulipas-arcos.json",
            "region": "Tamaulipas",
            "categoria": "Arco Carretero (LPR)",
            "icono": "ScanLine",
            "color": "#7c3aed", # Violeta
            "totalPuntos": cnt,
            "activoPorDefecto": True,
        })

    # 11. Tamaulipas — Red de Radio (Torres)
    radio_csv = os.path.join(tamps_dir, "C5 TAMPS- RED RADIO (1).csv")
    if os.path.exists(radio_csv):
        f = procesar_csv_wkt(radio_csv, categoria="Torre Red Radio", region="Tamaulipas", nombre_cols=["NOMBRE"], muni_cols=["MUNICIPIO"], desc_cols=["ALTURA", "STATUS PROYECTO"])
        cnt = guardar_geojson(f, "tamaulipas-red-radio.json")
        capas.append({
            "id": "tamaulipas-red-radio",
            "nombre": "Tamaulipas — Red de Radio Telecom",
            "archivo": "tamaulipas-red-radio.json",
            "region": "Tamaulipas",
            "categoria": "Torre Red Radio",
            "icono": "Radio",
            "color": "#0284c7", # Celeste
            "totalPuntos": cnt,
            "activoPorDefecto": False,
        })

    # 12. Tamaulipas — Tótems y Cámaras Urbanas
    totem_csv = os.path.join(tamps_dir, "C5 TAMPS- ESCBAZ  PTZLA  TÓTEM.csv")
    if os.path.exists(totem_csv):
        f = procesar_csv_wkt(totem_csv, categoria="Tótem / Cámara Urbana", region="Tamaulipas", nombre_cols=["Nombre"], muni_cols=["MUNICIPIO"], desc_cols=["TIPO / STATUS", "DEPENDENCIA"])
        cnt = guardar_geojson(f, "tamaulipas-totems.json")
        capas.append({
            "id": "tamaulipas-totems",
            "nombre": "Tamaulipas — Tótems y Cámaras",
            "archivo": "tamaulipas-totems.json",
            "region": "Tamaulipas",
            "categoria": "Tótem / Cámara Urbana",
            "icono": "TowerControl",
            "color": "#059669", # Esmeralda
            "totalPuntos": cnt,
            "activoPorDefecto": False,
        })

    # 13. Tamaulipas — PMIs Postes
    pmis_tamps_csv = os.path.join(tamps_dir, "C5 TAMPS- PMI's.csv")
    if os.path.exists(pmis_tamps_csv):
        f = procesar_csv_wkt(pmis_tamps_csv, categoria="PMI (Poste con Cámara)", region="Tamaulipas", nombre_cols=["ID"], muni_cols=["MUNICIPIO"], desc_cols=["TIPO", "ZONA"])
        cnt = guardar_geojson(f, "tamaulipas-pmis.json")
        capas.append({
            "id": "tamaulipas-pmis",
            "nombre": "Tamaulipas — PMIs Postes (1,700 pts)",
            "archivo": "tamaulipas-pmis.json",
            "region": "Tamaulipas",
            "categoria": "PMI (Poste con Cámara)",
            "icono": "Video",
            "color": "#d97706", # Ámbar
            "totalPuntos": cnt,
            "activoPorDefecto": False,
        })

    # Guardar manifest index
    manifest_path = os.path.join(OUTPUT_DIR, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump({
            "actualizado": "2026-10-23",
            "totalCapas": len(capas),
            "totalPuntosGlobal": sum(c["totalPuntos"] for c in capas),
            "capas": capas
        }, f, ensure_ascii=False, indent=2)
    print(f"\nManifest generado en {manifest_path} con {len(capas)} capas y {sum(c['totalPuntos'] for c in capas)} puntos en total.")

if __name__ == "__main__":
    main()
