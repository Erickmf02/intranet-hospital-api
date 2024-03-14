import express from "express"
import { crearCarpeta, editarCarpeta, eliminarCarpeta, verCarpetas, verCarpetaPorId, agregarArchivo, verContenidoArchivo, editarArchivo, eliminarArchivo, ordenarArchivos } from "../controller/controlador.carpeta.js";
import {verificarToken} from "../middleware.js";
import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'src/archivos/');
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now());
    },
});

const upload = multer({ storage });

const routerCarpeta = express.Router()

routerCarpeta.get("/todos", [verificarToken], verCarpetas);
routerCarpeta.get("/", [verificarToken], verCarpetaPorId);

routerCarpeta.post("/", [verificarToken], crearCarpeta);

routerCarpeta.put("/:id", [verificarToken], editarCarpeta)

routerCarpeta.delete("/:id", [verificarToken], eliminarCarpeta)

//archivos
routerCarpeta.get("/archivo/contenido/:id", verContenidoArchivo);

routerCarpeta.post("/archivo/:id", [ verificarToken, upload.single("archivo")], agregarArchivo);

routerCarpeta.put("/archivo/:id", [ verificarToken, upload.single("archivo")], editarArchivo);
routerCarpeta.put("/archivo/ordenar/:id", [verificarToken], ordenarArchivos);


routerCarpeta.delete("/archivo/:id", [verificarToken], eliminarArchivo);



export default routerCarpeta;