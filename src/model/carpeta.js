import mongoose from "mongoose";

const carpetaSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
    },
    fechaCreacion: {
        type: Date,
        default: Date.now
    },
    fechaActualizacion: {
        type: Date,
        default: Date.now
    },
    tipo: {
        type: "String",
        required: true,
    },
    conPortada:{
        type: Boolean,
        required: true,
        default: false,
    },
    descripcion: {
        type: String,
    },
    administradores: {
        type: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Usuario'
            }
        ],
        default: [],
    },
    padre: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Carpeta',
        default: null,
    },
    hijos: {
        type: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Carpeta',
            }
        ],
        default: [],
    },
    archivos: {
        type: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Archivo'
            }
        ],
        default: [],
    },
    
});

const Carpeta = mongoose.model('Carpeta', carpetaSchema);

export default Carpeta;
