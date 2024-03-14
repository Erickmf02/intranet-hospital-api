import fs from "fs/promises";
import mime from "mime"
const ARCHIVOS_DIRECTORIO = "src/archivos/";

export async function leerArchivo(rutaArchivo) {
  try {
      const contenidoArchivo = await fs.readFile(rutaArchivo, null);
      return contenidoArchivo;
  } catch (error) {
      console.error("Error al leer el archivo:", error);
      return null;
  }
}
export async function renombrarArchivo(archivoActual, nuevoNombre) {
  try {
      const rutaActual = `${ARCHIVOS_DIRECTORIO}${archivoActual}`;
      const rutaNuevoArchivo = `${ARCHIVOS_DIRECTORIO}${nuevoNombre}`;

      await fs.rename(rutaActual, rutaNuevoArchivo);
      return true;
  } catch (error) {
      console.error("Error al renombrar el archivo:", error);
      return false;
  }
}
export async function eliminarArchivo(rutaArchivo) {
  try {
      await fs.unlink(rutaArchivo);
      return true;
  } catch (error) {
      console.error("Error al eliminar el archivo:", error);
      return false;
  }
}

export function prepararParaEnviar(archivosCarpeta){
  const archivosRellenos = [];
  for (const archivo of archivosRellenos.archivos) {

      const {extension, mimetype} = obtenerDatosAdicionales(archivo.rutaArchivo);

      const archivoRelleno = {
          ...archivo._doc,
          extension,
          mimetype
      }
      archivosRellenos.push(archivoRelleno);
  }
  const nuevoProtocoloItemRelleno = {
      ...archivosCarpeta._doc,
      archivos: archivosRellenos
  }
  return nuevoProtocoloItemRelleno;
}

export function obtenerDatosAdicionales(rutaArchivo){
  const nombreArchivo = rutaArchivo.split('/').pop();
  const extension = nombreArchivo.split(".").pop();
  const mimetype = mime.getType(extension);

  return { extension, mimetype};
}