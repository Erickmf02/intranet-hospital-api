export function usuarioEsAdministrador(usuario){
    try {
        const rolAdminId = "000000000000000000000001";
        const { roles } = usuario;
        return roles.some(rol => rol._id == rolAdminId);
    } catch (e) {
        console.log(e);
    }
}