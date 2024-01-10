const xlsx = require('xlsx')

class UAM {
    constructor() {
        this.defaultUamMatrixFilePath = __dirname + "/db/permanent/uam.xlsx";
    }

    async readMatrix() {
        return new Promise((resolve, reject) => {
            try {
                const workbook = xlsx.readFile(this.defaultUamMatrixFilePath);
                const sheet_name_list = workbook.SheetNames;
                const uamMatrix = xlsx.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);
                resolve(uamMatrix);
            } catch (error) {
                reject(new Error(`An error occurred while reading the matrix: ${error.message}`));
            }
        });
    }    

    async verifyAccess(role, menu, action){
        try{
            const matrix = await this.readMatrix()
            const findAccess = matrix.findIndex(obj => obj.Role == role && obj.Menu == menu && obj[action] == true)
            if(findAccess != -1){
                return true
            }else{
                return false
            }
        }catch(e){
            throw e
        }
    }

    async getMenuNamesBasedOnRole(role){
        try{
            const matrix = await this.readMatrix()
            let findAccess = matrix.filter(obj => obj.Role == role && obj.AccessDashboard == true)
            if(findAccess.length > 0){
                const menuNames = findAccess.map(obj => ({
                    menuNames: obj['Menu Names'],
                    menu: obj['Menu Names']
                }));
                return menuNames
            }else{
                findAccess = matrix.filter(obj => obj.Role == role && obj.AccessDashboard == false)
                if(findAccess.length > 0){
                    const menuNames = findAccess.map(obj => ({
                        menuName: obj['Menu Names'],
                        menu: obj['Menu Names']
                    }));
                    return menuNames
                }else{
                    throw `No menu is available for access`
                }
            }
        }catch(e){
            throw e
        }
    }
}

module.exports = UAM;
