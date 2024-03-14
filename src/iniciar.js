import Rol from "./model/rol.js";
import Usuario from "./model/usuario.js";
import mongoose from "mongoose";
import bcrypt from "bcryptjs"
import Carpeta from "./model/carpeta.js";

async function iniciar(){
    try {
        let rolAdministrador = await Rol.findById("000000000000000000000001");
        if(!rolAdministrador){
            rolAdministrador = await Rol.create({
                _id: new mongoose.Types.ObjectId("000000000000000000000001"),
                nombre: "Administrador"
            })
        }
        
        let carpetaHome = await Carpeta.findById("100000000000000000000001");
        if(!carpetaHome){
            carpetaHome = await Carpeta.create({
                _id: new mongoose.Types.ObjectId("100000000000000000000001"),
                nombre: "Home",
                tipo: "carpetas"
            })
        }
        let carpetaCalidad = await Carpeta.findById("100000000000000000000002");
        if(!carpetaCalidad){
            carpetaCalidad = await Carpeta.create({
                _id: new mongoose.Types.ObjectId("100000000000000000000002"),
                padre: carpetaHome._id,
                nombre: "Calidad",
                tipo: "carpetas",
                conPortada: true,
                descripcion: "Busca el protocolo al cual nesecites acceder a su informacion."
            })
            carpetaHome.hijos.push(carpetaCalidad._id);
            await carpetaHome.save();
        }

        let carpetaComiteParietario = await Carpeta.findById("100000000000000000000003");
        if(!carpetaComiteParietario){
            carpetaComiteParietario = await Carpeta.create({
                _id: new mongoose.Types.ObjectId("100000000000000000000003"),
                padre: carpetaHome._id,
                nombre: "Comite parietario",
                tipo: "carpetas",
                conPortada: true,
                descripcion: "carpeta de comite parietario"
            })
            carpetaHome.hijos.push(carpetaComiteParietario._id);
            await carpetaHome.save();
        }   
    } catch (error) {
        console.log(error);
    }
}

export default iniciar;