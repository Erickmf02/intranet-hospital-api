import mongoose from "mongoose";

const archivoSchema = new mongoose.Schema({
    carpeta: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Carpeta'
    },
    nombre: {
        type: String,
        required: true,
    },
    ruta: {
        type: String,
        required: false
    },
    fechaActualizacion: {
        type: Date,
        required: true,
    },
    fechaSubida: {
        type: Date,
        required: true,
    }
});

const Archivo = mongoose.model('Archivo', archivoSchema);

export default Archivo;
