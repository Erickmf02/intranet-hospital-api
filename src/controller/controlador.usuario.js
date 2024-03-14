import Usuario from "../model/usuario.js";
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import moment from "moment-timezone";
import Rol from "../model/rol.js";
import { cleanRut, validateRut } from "rutlib";
import { TOKEN_DURATION } from "../const.js";

export async function iniciarSesion(req, res){
    try {
        const { rut, password } = req.body;
        if (!rut || !password) return res.status(400).json({ error: "El rut o contraseña son obligatorios.", sugerencia: "Por favor, asegúrate de completar todos los campos obligatorios." });

        const rutLimpio = cleanRut(rut).toLowerCase();
        const usuario = await Usuario.findOne({ rut: rutLimpio }).populate("roles");

        if (!usuario) return res.status(400).json({ error: "El usuario no está registrado en el sistema.", sugerencia: "Por favor, revisa una segunda vez el rut ingresado." });

        const correcto = await bcrypt.compare(password, usuario.password);
        if (!correcto) return res.status(400).json({ error: "Credenciales incorrectas", sugerencia: "Por favor, revise sus credenciales de nuevo." });

        const secretKey = process.env.SECRET_KEY;

        const token = jwt.sign({ rut: usuario.rut }, secretKey, { expiresIn: TOKEN_DURATION });

        const fechaToken = moment().tz("America/Santiago").toISOString();

        const respuesta = {
            token,
            id: usuario._id,
            roles: usuario.roles,
            fechaToken
        };

        return res.status(200).json(respuesta);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error interno del servidor', sugerencia: 'Por favor, inténtalo de nuevo más tarde.' });
    }
}

export async function obtenerUsuarioToken(req, res){
    try {
        const { usuario } = req;
        return res.status(200).json(usuario);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
}

export async function verUsuarios(req, res){
    try {
        const usuarios = await Usuario.find().select("-password").populate("roles");
        return res.status(200).json(usuarios);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
}

export async function verUsuario(req, res){
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ error: "El ID del usuario es obligatorio.", sugerencia: "Por favor, proporciona un ID válido." });

        const usuario = await Usuario.findById(id).select("-password").populate("roles");
        if (!usuario) return res.status(404).json({ error: "El usuario no fue encontrado.", sugerencia: "Por favor, verifica que el ID del usuario sea correcto." });

        return res.status(200).json(usuario);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error interno del servidor', sugerencia: 'Por favor, inténtalo de nuevo más tarde.' });
    }
}


export async function crearUsuario(req, res) {
    try {
        const { nombre, rut, password, roles } = req.body;
        if (!nombre || !rut || !password || !roles) return res.status(400).json({ error: "El nombre, rut, roles o contraseña son obligatorios.", sugerencia: "Por favor, asegúrate de completar todos los campos obligatorios." });

        const rutLimpio = cleanRut(rut).toLowerCase();
        if (!validateRut(rutLimpio)) return res.status(400).json({ error: "El RUT es invalido.", sugerencia: "Por favor, Verifica el RUT nuevamente para crear un nuevo usuario." });

        const usuarioExistente = await Usuario.findOne({ rut: rutLimpio });
        if (usuarioExistente) return res.status(400).json({ error: "Ya existe un usuario con este RUT.", sugerencia: "Por favor, utiliza un RUT diferente para crear un nuevo usuario." });

        const hashedPassword = await bcrypt.hash(password, 8);
        const rolesEnServer = await Promise.all(roles.map(async rolId => {
            const serverRol = await Rol.findById(rolId);
            if (!serverRol) {
                throw new Error('Un rol no existe en el servidor');
            }
            return serverRol;
        }));

        const usuario = await Usuario.create({
            nombre,
            rut: rutLimpio,
            password: hashedPassword,
            roles: rolesEnServer
        });
        
        const objetoUsuario = usuario.toObject();
        delete objetoUsuario.password;

        return res.status(201).json(objetoUsuario);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error interno del servidor', sugerencia: 'Por favor, inténtalo de nuevo más tarde.' });
    }
}

export async function cambiarNombre(req, res){
    try {
        const { id } = req.params;
        const { nombre } = req.body;

        if (!nombre) return res.status(400).json({ error: "No se ha proporcionado un nuevo nombre.", sugerencia: "Por favor, proporciona un nombre." });

        if (!id) return res.status(400).json({ error: "El ID del usuario es obligatorio.", sugerencia: "Por favor, proporciona un ID válido." });

        const usuario = await Usuario.findById(id).select("-password").populate("roles");
        if (!usuario) return res.status(404).json({ error: "El usuario no fue encontrado.", sugerencia: "Por favor, verifica que el ID del usuario sea correcto." });
        
        usuario.nombre = nombre;
        await usuario.save();

        return res.status(200).json(usuario);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error interno del servidor', sugerencia: 'Por favor, inténtalo de nuevo más tarde.' });
    }
}

export async function eliminarUsuario(req, res){
    try {
        const {usuario} = req;
        const { id } = req.params;
        if(usuario._id == id) return res.status(400).json({ error: "Error al eliminar usuario", sugerencia: "No puedes eliminarte a ti mismo." });
        if (!id) return res.status(400).json({ error: "El ID del usuario es obligatorio.", sugerencia: "Por favor, proporciona un ID válido." });

        const deleteUsuario = await Usuario.findByIdAndDelete(id).select("-password").populate("roles");
        if (!usuario) return res.status(404).json({ error: "El usuario no fue encontrado.", sugerencia: "Por favor, verifica que el ID del usuario sea correcto." });
        
        return res.status(200).json(deleteUsuario);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error interno del servidor', sugerencia: 'Por favor, inténtalo de nuevo más tarde.' });
    }
}

//extra
export async function cambiarPassword(req, res){
    try {
        const { id } = req.params;
        const {password} = req.body;
        if (!id) return res.status(400).json({ error: "El ID del usuario es obligatorio.", sugerencia: "Por favor, proporciona un ID válido." });

        if (!password) {
            return res.status(400).json({ error: "La contraseña es obligatoria.", sugerencia: "Por favor, proporciona una contraseña." });
        }

        const usuario = await Usuario.findById(id).select("-password").populate("roles");
        if (!usuario) return res.status(404).json({ error: "El usuario no fue encontrado.", sugerencia: "Por favor, verifica que el ID del usuario sea correcto." });

        const hashedPassword = await bcrypt.hash(password, 8);
        usuario.password = hashedPassword;
        await usuario.save();

        const objetoUsuario = usuario.toObject();

        delete objetoUsuario.password;

        return res.status(200).json(objetoUsuario);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error interno del servidor', sugerencia: 'Por favor, inténtalo de nuevo más tarde.' });
    }
}

