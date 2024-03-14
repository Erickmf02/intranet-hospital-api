import express from 'express';
import jwt from 'jsonwebtoken';
import Usuario from '../model/usuario.js'; 

const routerToken = express.Router();

routerToken.post('/validar-token', async (req, res) => {
    try {
        const BearerToken = req.headers.authorization;

        if (!BearerToken) {
            return res.status(401).json({ mensaje: 'Token no proporcionado' });
        }

        const token = BearerToken.replace("Bearer ", "");

        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const rut = decoded.rut;

        const usuario = await Usuario.findOne({ rut });

        if (usuario) {
            return res.json({ valido: true });
        } else {
            return res.json({ valido: false });
        }
    } catch (error) {
        return res.status(401).json({ mensaje: 'Token inválido' });
    }
});

export default routerToken;
