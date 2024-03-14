import Rol from "../model/rol.js";

async function obtenerTodosLosRoles(req, res){
    try {
        const roles = await Rol.find();
        return res.status(200).json(roles); 
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
}
async function crearRol(req, res){
    try {
        const { nombre } = req.body;

        if(!nombre) return res.status(400).json({ error: "el nombre es obligatorios." });
        
        const rol = await Rol.create({ nombre });

        return res.status(201).json(rol); 
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
}

export {obtenerTodosLosRoles, crearRol};