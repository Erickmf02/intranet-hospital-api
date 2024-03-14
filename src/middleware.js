import jwt from 'jsonwebtoken';
import Usuario from './model/usuario.js';
import { usuarioEsAdministrador } from './utils/roles.js';

export async function verificarToken(req, res, next) {
    try {
        const authorizationHeader = req.headers.authorization;

        if (!authorizationHeader) {
            return res.status(401).json({ error: 'Token no proporcionado' });
        }

        const token = authorizationHeader.replace("Bearer ", "");

        const secretKey = process.env.SECRET_KEY;
        const decoded = jwt.verify(token, secretKey);

        const rut = decoded.rut;

        const usuario = await Usuario.findOne({ rut }).select("-password").populate("roles");

        if (!usuario) return res.status(401).json({ error: 'No autorizado: usuario no encontrado' });

        req.usuario = usuario;

        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido' });
    }
};

export async function verificarRolAdmin(req, res, next){
    try {
        const authorizationHeader = req.headers.authorization;

        if (!authorizationHeader) return res.status(401).json({ error: 'Token no proporcionado' });

        const token = authorizationHeader.replace("Bearer ", "");

        const secretKey = process.env.SECRET_KEY;
        const decoded = jwt.verify(token, secretKey);

        const rut = decoded.rut;

        const usuario = await Usuario.findOne({ rut }).select("-password").populate("roles");

        if (!usuario) return res.status(401).json({ error: 'No autorizado: usuario no encontrado' });

        const esAdministrador = usuarioEsAdministrador(usuario);

        if (!esAdministrador) return res.status(401).json({ error: 'No autorizado' });

        req.usuario = usuario;

        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido' });
    }
}