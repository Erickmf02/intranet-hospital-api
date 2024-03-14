import Carpeta from "../model/carpeta.js";
import Archivo from "../model/archivo.js";
import Usuario from "../model/usuario.js";
import * as serverFiles from "../utils/archivos.js";
import moment from "moment-timezone"
import { usuarioEsAdministrador } from "../utils/roles.js";

import jwt from "jsonwebtoken"

const tipos = ["archivos", "carpetas"];

export async function verCarpetas(req, res){
    try {
        const carpetas = await Carpeta.find()
            .populate({
                path: "administradores",
                select: "-password",
                populate: {
                    path: "roles"
                }
            })
            .populate("archivos")
            .populate({
                path: "hijos",
                select: "-padre",
                populate: {
                    path: "administradores",
                    select: "-password",
                    populate: "roles"
                }
            });
        
        const carpetasFormateadas = await Promise.all(carpetas.map(async (carpeta) => {
            const carpetaObjeto = carpeta.toObject();
            carpetaObjeto.padre = await popularPadresRecursivamente(carpeta.padre);
            return carpetaObjeto;
        }));

        res.status(200).json(carpetasFormateadas);
    } catch (error) {
        console.error("Error en verCarpetas", error);
        res.status(500).json({ error: "Error interno del servidor.", sugerencia: "Por favor, inténtalo de nuevo más tarde." });
    }
}

export async function verCarpetaPorId(req, res){
    try {
        const carpetaHomeId = "100000000000000000000001";

        let { id } = req.query;
        id = id ? id : carpetaHomeId;

        const carpeta = await Carpeta.findById(id).populate([
            {
                path: "administradores",
                select: "-password",
                populate:{
                    path: "roles"
                }
            },
            {
                path: "archivos"
            },
            {
                path: "hijos",
                select: "-padre",
                populate: {
                    path: "administradores",
                    select: "-password",
                    populate: {
                        path: "roles"
                    }
                }
            }
        ])

        if(!carpeta){
            return res.status(400).json({error: `La carpeta con ID ${id} no existe.`, sugerencia: "Por favor, verifica el ID de la carpeta e intenta de nuevo."});
            
        }

        const objeto = carpeta.toObject();

        objeto.padre = await popularPadresRecursivamente(carpeta.padre)

        for (const archivo of objeto.archivos) {
            const { extension, mimetype } = serverFiles.obtenerDatosAdicionales(archivo.ruta);
            archivo.extension = extension;
            archivo.mimetype = mimetype;
        }

        res.status(200).json(objeto);
    } catch (error) {
        console.error("Error en verCarpetaPorId", error);
        res.status(500).json({ error: "Error interno del servidor.", sugerencia: "Por favor, inténtalo de nuevo más tarde." });
    }
}


export async function crearCarpeta(req, res){
    try {
        //validaciones
        const { padre, nombre, tipo, conPortada, descripcion } = req.body;
        const { usuario } = req;

        if( !padre || !nombre || !tipo ){
            return res.status(400).json({error: "El padre, nombre y tipo son obligatorios.", sugerencia: "Por favor, asegúrate de completar todos los campos obligatorios."})
        }

        const tiposPermitidos = ["archivos", "carpetas"];
        if(!tiposPermitidos.includes(tipo)){
            return res.status(400).json({error: `Solo los tipos "archivos" y "carpetas" son válidos.`, sugerencia: "Por favor, selecciona un tipo de carpeta válido."})
        }

        const carpetaPadre = await Carpeta.findById(padre)
            .populate({
                path: "administradores",
                select: "-password"
            });

        if (!carpetaPadre) return res.status(404).json({ error: "Carpeta padre no encontrada.", sugerencia: "Por favor, verifica la carpeta padre e intenta de nuevo." });


        const carpetaPadreObjeto = carpetaPadre.toObject();
        carpetaPadreObjeto.padre = await popularPadresRecursivamente(carpetaPadre._id);

        const tienePermisos = tienePermisosSobreCarpeta(usuario, carpetaPadreObjeto);

        if(!tienePermisos) return res.status(400).json({error: `No tienes los permisos necesarios para crear una carpeta dentro de la carpeta ${carpetaPadre.nombre}.`, sugerencia: "Por favor, contacta al administrador para solicitar permisos necesarios."});

        //crear carpeta
        const carpeta = {
            nombre,
            tipo,
            padre : carpetaPadre._id,
        }

        if(conPortada == true){
            if(!descripcion){
                return res.status(400).json({error: "La descripción es obligatoria en carpetas con portada.", sugerencia: "Por favor, agrega una descripción para la carpeta con portada."})
            }
            carpeta.conPortada = true;
            carpeta.descripcion = descripcion;
        }

        const nuevaCarpeta = await Carpeta.create(carpeta);
        carpetaPadre.hijos.unshift(nuevaCarpeta._id);
        await carpetaPadre.save();
        
        const respuesta = {
            ...nuevaCarpeta._doc,
            padre: await popularPadresRecursivamente(nuevaCarpeta.padre)
        }

        res.status(201).json(respuesta);
    } catch (error) {
        console.error("Error en crearCarpeta", error);
        res.status(500).json({ error: "Error interno del servidor.", sugerencia: "Por favor, inténtalo de nuevo más tarde." });
    }
}


export async function editarCarpeta(req, res) {
    try {
        const { id } = req.params;
        const { usuario } = req;
        const { nombre, administradores, tipo, conPortada, descripcion} = req.body;

        const carpeta = await Carpeta.findById(id)
            .populate({
                path: "administradores",
                select: "-password"
            })
            .populate("archivos")
            .populate({
                path: "hijos",
                select: "-padre",
                populate: {
                    path: "administradores",
                    select: "-password",
                    populate: "roles"
                }
            });

        if (!carpeta) return res.status(404).json({ error: "Carpeta no encontrada.", sugerencia: "Por favor, verifica la carpeta e intenta de nuevo." });
        
        let carpetaObjeto = carpeta.toObject();

        carpetaObjeto.padre = await popularPadresRecursivamente(carpeta.padre);

        const tienePermisos = tienePermisosSobreCarpeta(usuario, carpetaObjeto);

        if(!tienePermisos) return res.status(400).json({error: `No tienes los permisos necesarios para editar esta carpeta.` , sugerencia: "Por favor, contacta al administrador para solicitar permisos necesarios."});
        //edicion
        let cambiosRealizados  = false;

        if(nombre){
            carpeta.nombre = nombre;
            cambiosRealizados  = true;
        }

        if (conPortada != undefined) {
            if (conPortada) {
                if (!descripcion) {
                    return res.status(400).json({ error: "La descripción es obligatoria en carpetas con portada.", sugerencia: "Por favor, agrega una descripción para la carpeta con portada." });
                }
                carpeta.conPortada = true;
                carpeta.descripcion = descripcion;
            } else {
                carpeta.conPortada = false;
                carpeta.descripcion = null;
            }
            cambiosRealizados = true;
        }

        if (administradores) {
            for (const usuarioId of administradores) {
                const usuario = await Usuario.findById(usuarioId);
                if (!usuario) {
                    return res.status(404).json({ error: "Uno de los usuarios es inexistente.", sugerencia: "Por favor, verifica los usuarios y asegúrate de que sean válidos." });
                }
            }
            carpeta.administradores = administradores;
            cambiosRealizados = true;
        }

        const tiposPermitidos = ["archivos", "carpetas"];
        if (tipo && !tiposPermitidos.includes(tipo)) {
            return res.status(400).json({ error: `El tipo "${tipo}" no es válido. Solo se permiten los tipos "archivos" y "carpetas".`, sugerencia: "Por favor, selecciona un tipo de carpeta válido." });
        }

        if (tipo && carpeta.tipo !== tipo) {
            if (carpeta.tipo === "carpetas") {
                await eliminarCarpetasHijas(carpeta);
            } else if (carpeta.tipo === "archivos") {
                await eliminarArchivosDeCarpeta(carpeta);
            }
            carpeta.tipo = tipo;
            cambiosRealizados = true;
        }

        if(cambiosRealizados){
            carpeta.fechaActualizacion = new Date();
            await carpeta.save();
            
        }
        await carpeta.populate({
            path: "administradores",
            select: "-password",
            populate: {
                path: "roles"
            }
        });
        
        carpetaObjeto = carpeta.toObject();

        carpetaObjeto.padre = await popularPadresRecursivamente(carpeta.padre);

        res.status(200).json(carpetaObjeto);
    } catch (error) {
        console.error("Error en editarCarpeta", error);
        res.status(500).json({ error: "Error interno del servidor.", sugerencia: "Por favor, inténtalo de nuevo más tarde." });
    }
}

export async function eliminarCarpeta(req, res) {
    try {
        const { id } = req.params;

        const carpetasNoEliminablesId = ["100000000000000000000001", "100000000000000000000002", "100000000000000000000003"];
        if(carpetasNoEliminablesId.includes(id)){
            return res.status(404).json({ error: "Las carpetas raíces no pueden ser eliminadas.", sugerencia: "Prueba eliminando las carpetas dentro de esta." });
        }
        const { usuario } = req;

        const carpeta = await Carpeta.findById(id)
            .populate({
                path: "administradores",
                select: "-password",
                populate: {
                    path: "roles"
                }
            });

        if (!carpeta) {
            return res.status(404).json({ error: "Carpeta no encontrada.", sugerencia: "Por favor, verifica la carpeta e intenta de nuevo." });
        }

        const carpetaObjeto = carpeta.toObject();

        carpetaObjeto.padre = popularPadresRecursivamente(carpeta.padre);

        const tienePermisos = tienePermisosSobreCarpeta(usuario, carpetaObjeto);

        if(!tienePermisos) return res.status(401).json({error: `No tienes los permisos necesarios para eliminar esta carpeta.` , sugerencia: "Por favor, contacta al administrador para solicitar permisos necesarios."});

        const carpetaEliminada = await eliminarCarpetaRecursiva(carpeta._id)

        res.status(200).json({ carpeta: carpetaEliminada });
    } catch (error) {
        console.error("Error en eliminarCarpeta", error);
        res.status(500).json({ error: "Error interno del servidor.", sugerencia: "Por favor, inténtalo de nuevo más tarde." });
    }
}

//archivos

export async function verContenidoArchivo(req, res) {
    try {
        const { id } = req.params;
        const {token} = req.query;

        if( !id ){
            return res.status(400).json({error: "El id es obligatorio.", sugerencia: "Por favor, proporciona un ID de archivo válido."})
        }

        if(!token) return res.status(400).json({error: "El token es obligatorio.", sugerencia: "Por favor, proporciona un token válido para acceder al archivo."});

        const secretKey = process.env.SECRET_KEY;
        let decoded;
        try {
            decoded = jwt.verify(token, secretKey);
        } catch (error) {
            return res.status(401).json({error: "El token es inválido.", sugerencia: "Por favor, asegúrate de que el token proporcionado sea válido."});
            
        }

        const rut = decoded.rut;

        const usuario = await Usuario.findOne({ rut }).select("-password").populate("roles");

        if (!usuario) return res.status(401).json({ error: 'No autorizado: usuario no encontrado', sugerencia: "Por favor, asegúrate de estar autenticado correctamente." });

        const archivo = await Archivo.findById(id);

        if (!archivo) {
            return res.status(404).json({ error: `El archivo con id ${id} no fue encontrado`, sugerencia: "Por favor, verifica el ID del archivo e intenta de nuevo." });
        }

        const rutaArchivo = archivo.ruta;
        
        const contenidoArchivo = await serverFiles.leerArchivo(rutaArchivo);
        if (!contenidoArchivo){
            return res.status(500).json({error: "Se produjo un error leyendo el archivo", sugerencia: "Por favor, inténtalo de nuevo más tarde."});
        }
        const {nombre} = archivo;
        const {extension, mimetype} = serverFiles.obtenerDatosAdicionales(rutaArchivo);
        
        res.setHeader('Content-Type', mimetype);

        const esAudioOVideo = ['mp3', 'ogg', 'wav', 'mp4', 'webm', 'ogg'].includes(extension);

        if (esAudioOVideo) {
            res.setHeader('Content-Disposition', `attachment; filename="${nombre}.${extension}"`);
        } else {
            res.setHeader('Content-Disposition', `inline; filename="${nombre}.${extension}"`);
        }

        res.send(contenidoArchivo);
    } catch (error) {
        console.error("Error al obtener el archivo:", error);
        res.status(500).json({ error: 'Error al obtener el archivo', sugerencia: "Por favor, inténtalo de nuevo más tarde." });
    }
}


export async function agregarArchivo(req, res){
    try {
        const { file, params } = req;

        if ( !file || !params.id ) {
            return res.status(400).json({ error: "El ID de la carpeta o el archivo son obligatorios.", sugerencia: "Por favor, asegúrate de proporcionar tanto el archivo como el ID de la carpeta." });
        }

        const { filename, mimetype, originalname } = file;
        const { id } = params;

        const carpeta = await Carpeta.findById(id).populate({
            path: "administradores",
            select: "-password",
            populate: {
                path: "roles"
            }
        });

        if (!carpeta) {
            return res.status(404).json({ error: 'Carpeta no encontrada.', sugerencia: "Por favor, verifica la carpeta e intenta de nuevo." });
        }

        if(carpeta.tipo !== "archivos"){
            return res.status(400).json({ error: "Esta carpeta no puede contener archivos.", sugerencia: "Por favor, selecciona una carpeta válida para agregar el archivo." });
        }

        const fecha = moment().tz("America/Santiago").toISOString();

        const ultimoPuntoIndex = originalname.lastIndexOf(".");
        const extension = ultimoPuntoIndex !== -1 ? originalname.slice(ultimoPuntoIndex + 1) : '';  
        const originalNameWithoutExtension = ultimoPuntoIndex !== -1 ? originalname.slice(0, ultimoPuntoIndex) : originalname;

        const archivo = await Archivo.create({
            carpeta: carpeta._id,
            nombre: originalNameWithoutExtension,
            fechaActualizacion: fecha,
            fechaSubida: fecha,
        })

        const nuevoNombreArchivo = `${archivo._id}.${extension}`;

        const renombrarExitoso = await serverFiles.renombrarArchivo(filename,nuevoNombreArchivo)

        if(!renombrarExitoso){
            return res.status(500).json({ error: "Error renombrando archivo", sugerencia: "Por favor, inténtalo de nuevo más tarde." });
        }

        archivo.ruta = `src/archivos/${nuevoNombreArchivo}`;
        await archivo.save()
        
        carpeta.archivos.unshift(archivo);
        await carpeta.save();

        let archivoObject = archivo.toObject();
        archivoObject = {
            ...archivoObject,
            extension,
            mimetype
        }

        return res.status(200).json(archivoObject); 
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error interno del servidor', sugerencia: "Por favor, inténtalo de nuevo más tarde." });
    }
}

export async function editarArchivo(req, res) {
    try {
        const { file, body, params } = req;

        if (!params.id) {
            return res.status(400).json({ error: "El ID es obligatorio.", sugerencia: "Por favor, proporciona un ID de archivo válido." });
        }

        const { id } = params;
        const { nombre } = body;

        const archivo = await Archivo.findById(id);;

        if(!archivo){
            return res.status(404).json({ error: `El archivo con id ${id} no fue encontrado`, sugerencia: "Por favor, verifica el ID del archivo e intenta de nuevo." });
        }
        let cambiosRealizados = false;

        if( file ){

            const eliminacionExitosa = await serverFiles.eliminarArchivo(archivo.ruta);

            if(!eliminacionExitosa){
                console.error(`Error eliminando el archivo de la ruta: ${archivo.ruta}`);
            }
            
            const { filename, originalname } = file;

            const ultimoPuntoIndex = originalname.lastIndexOf(".");
            const extension = ultimoPuntoIndex !== -1 ? originalname.slice(ultimoPuntoIndex + 1) : '';
            
            const nuevoNombreArchivo = `${archivo._id}.${extension}`;

            const renombrarExitoso = await serverFiles.renombrarArchivo(filename,nuevoNombreArchivo)
            if(!renombrarExitoso){
                console.error("Error renombrando archivos");
                return res.status(500).json({ error: "Error renombrando archivos", sugerencia: "Por favor, inténtalo de nuevo más tarde." });
            }

            archivo.ruta = `src/archivos/${nuevoNombreArchivo}`;

            cambiosRealizados = true;
        }

        if(nombre){
            archivo.nombre = nombre;
            cambiosRealizados = true;
        }

        if(cambiosRealizados){
            const fecha = moment().tz("America/Santiago").toISOString();
            archivo.fechaActualizacion = fecha;
            await archivo.save();
        }

        const { extension, mimetype } = serverFiles.obtenerDatosAdicionales(archivo.ruta) 

        let archivoObject = archivo.toObject();

        archivoObject = {
            ...archivoObject,
            extension,
            mimetype
        }

        return res.status(200).json(archivoObject);
    } catch (error) {
        console.error("Error interno del servidor:", error);
        return res.status(500).json({ error: 'Error interno del servidor', sugerencia: "Por favor, inténtalo de nuevo más tarde." });
    }
}


export async function ordenarArchivos(req, res) {
    try {
        const { id } = req.params;
        const { orden } = req.body;

        const carpeta = await Carpeta.findById(id);

        if (!carpeta) {
            return res.status(404).json({ error: 'Documento no encontrado' });
        }

        carpeta.archivos.sort((a, b) => {
            return orden.indexOf(a._id.toString()) - orden.indexOf(b._id.toString());
        });

        await carpeta.save();
        await carpeta.populate("archivos");

        const respuesta = {
            ...carpeta._doc,
            archivos: []
        };

        for (const archivo of carpeta.archivos) {
            const {extension, mimetype} = serverFiles.obtenerDatosAdicionales(archivo.ruta);
            respuesta.archivos.push({
                ...archivo._doc,
                extension,
                mimetype
            })
        }
        
        return res.status(200).json(respuesta);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
}

export async function eliminarArchivo(req, res) {
    try {
        const { id } = req.params;

        if(!id){
            return res.status(400).json({ error: "El ID es obligatorio.", sugerencia: "Por favor, proporciona un ID de archivo válido." });
        }

        const archivo = await Archivo.findById(id);

        if(!archivo){
            return res.status(404).json({ error: `El archivo con id ${id} no fue encontrado`, sugerencia: "Por favor, verifica el ID del archivo e intenta de nuevo." });
        }
        const carpeta = await Carpeta.findById(archivo.carpeta);

        if(!carpeta){
            return res.status(404).json({ error: "El archivo no pertenece a ninguna carpeta.", sugerencia: "Por favor, verifica la carpeta del archivo e intenta de nuevo." });
        }

        const archivoIndex = carpeta.archivos.findIndex(a => a.equals(archivo._id));

        if(archivoIndex != -1){
            carpeta.archivos.splice(archivoIndex, 1);
        }else{
            return res.status(404).json({ error: "El archivo no pertenece a ninguna carpeta.", sugerencia: "Por favor, verifica la carpeta del archivo e intenta de nuevo." });
        }

        const elimidadoDelContenidoExitoso = await serverFiles.eliminarArchivo(archivo.ruta);

        if(!elimidadoDelContenidoExitoso){
            console.error("Error eliminando el archivo en el servidor");
            return res.status(500).json({ error: "Error eliminando el archivo en el servidor", sugerencia: "Por favor, inténtalo de nuevo más tarde." });
        }

        const archivoEliminado = await Archivo.findByIdAndDelete(archivo._id);

        if(!archivoEliminado){
            return res.status(404).json({ error: "No se pudo eliminar el archivo.", sugerencia: "Por favor, verifica el ID del archivo e intenta de nuevo." });
        }

        await carpeta.save();

        const {extension, mimetype} = serverFiles.obtenerDatosAdicionales(archivoEliminado.ruta);

        let archivoEliminadoObject = archivoEliminado.toObject();
        
        archivoEliminadoObject = {
            ...archivoEliminadoObject,
            extension,
            mimetype
        }

        return res.status(200).json(archivoEliminadoObject);
    } catch (error) {
        console.error("Error interno del servidor:", error);
        return res.status(500).json({ error: 'Error interno del servidor', sugerencia: "Por favor, inténtalo de nuevo más tarde." });
    }
}

//extra
async function popularPadresRecursivamente(padreId) {
    try {
        const idCarpetaHome = "100000000000000000000001"

        if( !padreId || padreId == idCarpetaHome){
            return null;
        }

        const carpeta = await Carpeta.findById(padreId)
            .populate({
                path: "administradores",
                select: "-password",
                populate: {
                    path: "roles"
                }
            });
        
        const carpetaObjeto = carpeta.toObject();
        carpetaObjeto.padre = await popularPadresRecursivamente(carpeta.padre);

        return carpetaObjeto;
    } catch (error) {
        console.error("Error en popularPadresRecursivamente", error);
        return;
    }
}

async function eliminarCarpetaRecursiva(carpetaId) {
    try {
        const carpeta = await Carpeta.findById(carpetaId)
            .select("-nombre -fechaCreacion -fechaActualizacion -tipo -conPortada -descripcion")
            .populate([
                {
                    path: "archivos"
                },
                {
                    path: "padre",
                    select: "-nombre -fechaCreacion -fechaActualizacion -tipo -conPortada -descripcion -padre"
                }
            ]);

        for (const carpetaHija of carpeta.hijos) {
            await eliminarCarpetaRecursiva(carpetaHija);
        }

        for (const archivo of carpeta.archivos) {
            const eliminadoDelContenidoExitoso = await serverFiles.eliminarArchivo(archivo.ruta);

            if (!eliminadoDelContenidoExitoso) {
                console.log(`Error eliminando el archivo en el servidor: ${archivo.ruta}`);
            }

            await Archivo.findByIdAndDelete(archivo._id);
        }

        const padre = carpeta.padre;

        const carpetaEliminada = await Carpeta.findByIdAndDelete(carpeta._id);

        padre.hijos = padre.hijos.filter(hijo => hijo !== carpetaEliminada._id.toHexString());

        await padre.save();
        return carpetaEliminada;
    } catch (error) {
        console.error("Error en eliminarCarpetaRecursiva:", error);
        throw new Error("Error al eliminar la carpeta y su contenido.");
    }
}
function tienePermisosSobreCarpeta(usuario, carpetaObjeto){
    try {
        const esAdministrador = usuarioEsAdministrador(usuario);
        
        if(esAdministrador) return true;

        const esAdministradorDeCarpeta = usuarioEsAdministradorEnCarpeta(usuario, carpetaObjeto);
        
        return esAdministradorDeCarpeta;
    } catch (e) {
        console.log(e);
        return false;
    }
}

function usuarioEsAdministradorEnCarpeta(usuario, carpetaObjeto) {

    const { administradores } = carpetaObjeto;

    if (administradores.some(administrador => administrador._id.toHexString() === usuario._id.toHexString())) return true;
    
    if (carpetaObjeto.padre === null) return false;

    const carpetaPadre = carpetaObjeto.padre;
    
    return usuarioEsAdministradorEnCarpeta(usuario, carpetaPadre);
}