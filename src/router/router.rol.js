import express from "express"
import {crearRol,obtenerTodosLosRoles} from "../controller/cotrolador.rol.js";
const routerRol = express.Router()


routerRol.get("/", obtenerTodosLosRoles);

routerRol.post("/", crearRol);


export default routerRol;