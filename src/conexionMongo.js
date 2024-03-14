import mongoose from "mongoose";
import { URL_DB } from "./const.js";

async function conectarABaseDeDatos() {
    try {
        await mongoose.connect(URL_DB);
        console.log("Conexión exitosa a MongoDB");
    } catch (error) {
        console.error("Error de conexión a MongoDB:", error.message);
    }
}
export default conectarABaseDeDatos;