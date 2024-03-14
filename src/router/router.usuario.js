import express from "express"
import { crearUsuario, iniciarSesion, verUsuarios, verUsuario, cambiarNombre, eliminarUsuario, obtenerUsuarioToken, cambiarPassword} from "../controller/controlador.usuario.js";
import { verificarRolAdmin, verificarToken} from "../middleware.js";
const routerUsuario = express.Router()

routerUsuario.get("/", [verificarToken], verUsuarios);
routerUsuario.get("/token", [verificarToken], obtenerUsuarioToken);
routerUsuario.get("/:id", [verificarToken], verUsuario);

routerUsuario.post("/", [verificarRolAdmin], crearUsuario);
routerUsuario.post("/sesion", iniciarSesion);

routerUsuario.put("/password/:id", [verificarRolAdmin], cambiarPassword);
routerUsuario.put("/:id", [verificarRolAdmin], cambiarNombre)


routerUsuario.delete("/:id", [verificarRolAdmin], eliminarUsuario);


export default routerUsuario;