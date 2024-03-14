import express, { json } from "express"
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import iniciar from "./iniciar.js";
import { PORT } from "./const.js"
import conectarABaseDeDatos from "./conexionMongo.js";

import routerUsuario from "./router/router.usuario.js";
import routerRol from "./router/router.rol.js";
import routerToken from "./router/router.token.js";
import routerCarpeta from "./router/router.carpeta.js";

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(json());
app.use(cors());
dotenv.config();

app.use(routerToken)
app.use("/usuario", routerUsuario);
app.use("/rol", routerRol);
app.use("/carpeta", routerCarpeta);

conectarABaseDeDatos();

iniciar();

app.listen(PORT, ()=>{
    console.log("app express corriendo");
})
