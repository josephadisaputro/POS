let tempDatabaseClass = require('./tempDatabase.js')
let tokenClass = require('./token.js')
let uamClass = require('./uam.js')
require('dotenv').config()

class User{
    constructor(){
        this.tempDatabaseObject = new tempDatabaseClass()
        this.tokenObject = new tokenClass()
        this.userFilename = process.env.userTable
        this.companyFilename =  process.env.companyTable
        this.uamObject = new uamClass()
        this.activeUsers = []
    }

    async viewListMenu(payload, token){
        try{
            await this.verifyToken(token)
            if(payload.email && payload.uuid){
                const findCompanyUUID = await this.tempDatabaseObject.read(this.companyFilename, -1, -1, "uuid", payload.uuid)
                if(findCompanyUUID.length > 0){
                    if(findCompanyUUID[0].isDeleted){
                        if(findCompanyUUID[0].isDeleted == true){
                            throw `Company was deleted`
                        }
                    }
                    const employees = JSON.parse(findCompanyUUID[0].employees);
                    findCompanyUUID[0].employees = employees;
                    const findEmployee = employees.findIndex(obj => obj.email == payload.email)
                    if(findEmployee == -1){
                        throw `Not employee`
                    }else{
                        return await this.uamObject.getMenuNamesBasedOnRole(employees[findEmployee].uam)
                    }
                }else{
                    throw `Company not found`
                }
            }else{ 
                throw `Payload provided is not complete`
            }
        }catch(e){
            throw e
        }
    }

    async viewAllowAccessToMenu(payload, token){
        try{
            await this.verifyToken(token)
            if(payload.email && payload.uuid){
                const findCompanyUUID = await this.tempDatabaseObject.read(this.companyFilename, -1, -1, "uuid", payload.uuid)
                if(findCompanyUUID.length > 0){
                    if(findCompanyUUID[0].isDeleted){
                        if(findCompanyUUID[0].isDeleted == true){
                            throw `Company was deleted`
                        }
                    }
                    const employees = JSON.parse(findCompanyUUID[0].employees);
                    findCompanyUUID[0].employees = employees;
                    const findEmployee = employees.findIndex(obj => obj.email == payload.email)
                    if(findEmployee == -1){
                        throw `Not employee`
                    }else{
                        return await this.uamObject.getAvailableActionsForTheMenu(employees[findEmployee].uam, payload.menu)
                    }
                }else{
                    throw `Company not found`
                }
            }else{ 
                throw `Payload provided is not complete`
            }
        }catch(e){
            throw e
        }
    }

    async editCompany(payload, token){
        try{
            await this.verifyToken(token)
            
            // Define required keys
            const requiredKeys = ["uuid", "email"];
            
            // Check if required keys exist and are not empty strings
            for (let key of requiredKeys) {
                if (!payload[key] || typeof payload[key] !== 'string' || payload[key].trim() === '') {
                    throw new Error(`Missing or invalid value for ${key}`);
                }
            }
            
            // Check if email is valid
            const emailRegex = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;
            if (!emailRegex.test(payload.email)) {
                throw new Error(`Invalid email address`);
            }
            
            const findCompanyUUID = await this.tempDatabaseObject.read(this.companyFilename, -1, -1, "uuid", payload.uuid)
            if(findCompanyUUID.length > 0){
                if(findCompanyUUID[0].isDeleted){
                    if(findCompanyUUID[0].isDeleted == true){
                        throw new Error(`Company was deleted`);
                    }
                }
                const employees = JSON.parse(findCompanyUUID[0].employees);
                const findEmployee = employees.findIndex(obj => obj.email == payload.email)
                if(findEmployee == -1){
                    throw new Error(`Not employee`);
                }else{
                    if(await this.uamObject.verifyAccess(employees[findEmployee].uam, "companyProfile", "Edit")){
                        // Compare keys of payload with existing data
                        const existingKeys = Object.keys(findCompanyUUID[0]);
                        for (let key of existingKeys) {
                            if (!payload.hasOwnProperty(key)) {
                                throw new Error(`Payload is missing key: ${key}`);
                            }
                        }
                        payload.employees = JSON.stringify(payload.employees)
                        await this.tempDatabaseObject.update(this.companyFilename, payload, "uuid", payload.uuid)
                        return payload.uuid
                    }else{
                        throw new Error(`Access not granted`);
                    }
                }
            }else{
                throw new Error(`Company not found`);
            }
        }catch(e){
            throw e.message;
        }
    }
    
    async deleteCompany(payload, token){
        try{
            await this.verifyToken(token)
            
            // Define required keys
            const requiredKeys = ["uuid", "email"];
            
            // Check if required keys exist and are not empty strings
            for (let key of requiredKeys) {
                if (!payload[key] || typeof payload[key] !== 'string' || payload[key].trim() === '') {
                    throw new Error(`Missing or invalid value for ${key}`);
                }
            }
            
            // Check if email is valid
            const emailRegex = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;
            if (!emailRegex.test(payload.email)) {
                throw new Error(`Invalid email address`);
            }
            
            const findCompanyUUID = await this.tempDatabaseObject.read(this.companyFilename, -1, -1, "uuid", payload.uuid)
            if(findCompanyUUID.length > 0){
                if(findCompanyUUID[0].isDeleted){
                    if(findCompanyUUID[0].isDeleted == true){
                        throw new Error(`Company was deleted`);
                    }
                }
                const employees = JSON.parse(findCompanyUUID[0].employees);
                const findEmployee = employees.findIndex(obj => obj.email == payload.email)
                if(findEmployee == -1){
                    throw new Error(`Not employee`);
                }else{
                    if(await this.uamObject.verifyAccess(employees[findEmployee].uam, "companyProfile", "Delete")){
                        findCompanyUUID[0].isDeleted = true
                        await this.tempDatabaseObject.update(this.companyFilename, findCompanyUUID[0], "uuid", findCompanyUUID[0].uuid)
                        return payload.uuid
                    }else{
                        throw new Error(`Access not granted`);
                    }
                }
            }else{
                throw new Error(`Company not found`);
            }
        }catch(e){
            throw e.message;
        }
    }    

    async viewListCompany(payload, token){
        try{
            await this.verifyToken(token)
            if(payload.email){
                const findAllCompanies = await this.tempDatabaseObject.read(this.companyFilename, -1, -1)
                const findCompaniesWhereEmployeeIsEmail = await findAllCompanies.filter(obj => 
                    JSON.parse(obj.employees).some(objE => objE.email === payload.email)
                );
                if(findCompaniesWhereEmployeeIsEmail.length > 0){
                    const activeCompanies = findCompaniesWhereEmployeeIsEmail.filter(obj => !obj.isDeleted);
                    const simplifiedCompanies = activeCompanies.map(obj => ({
                        uuid: obj.uuid,
                        companyName: obj.companyName
                    }));
                    return simplifiedCompanies
                }else{
                    throw `No company is not found`
                }
            }else{ 
                throw `Payload provided is not complete`
            }
        }catch(e){
            throw e
        }
    }

    async viewCompany(payload, token){
        try{
            await this.verifyToken(token)
            
            // Define required keys
            const requiredKeys = ["uuid", "email"];
            
            // Check if required keys exist and are not empty strings
            for (let key of requiredKeys) {
                if (!payload[key] || typeof payload[key] !== 'string' || payload[key].trim() === '') {
                    throw new Error(`Missing or invalid value for ${key}`);
                }
            }
            
            // Check if email is valid
            const emailRegex = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;
            if (!emailRegex.test(payload.email)) {
                throw new Error(`Invalid email address`);
            }
            
            const findCompanyUUID = await this.tempDatabaseObject.read(this.companyFilename, -1, -1, "uuid", payload.uuid)
            if(findCompanyUUID.length > 0){
                if(findCompanyUUID[0].isDeleted){
                    if(findCompanyUUID[0].isDeleted == true){
                        throw new Error(`Company was deleted`);
                    }
                }
                const employees = JSON.parse(findCompanyUUID[0].employees);
                findCompanyUUID[0].employees = employees;
                const findEmployee = employees.findIndex(obj => obj.email == payload.email)
                if(findEmployee == -1){
                    throw new Error(`Not employee`);
                }else{
                    if(await this.uamObject.verifyAccess(employees[findEmployee].uam, "companyProfile", "View")){
                        return findCompanyUUID[0]
                    }else{
                        throw new Error(`Access not granted`);
                    }
                }
            }else{
                throw new Error(`Company not found`);
            }
        }catch(e){
            throw e.message;
        }
    }

    async verifyAccessToCompany(payload, token){
        try{
            await this.verifyToken(token)
            
            // Define required keys
            const requiredKeys = ["uuid", "email"];
            
            // Check if required keys exist and are not empty strings
            for (let key of requiredKeys) {
                if (!payload[key] || typeof payload[key] !== 'string' || payload[key].trim() === '') {
                    throw new Error(`Missing or invalid value for ${key}`);
                }
            }
            
            // Check if email is valid
            const emailRegex = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;
            if (!emailRegex.test(payload.email)) {
                throw new Error(`Invalid email address`);
            }
            
            const findCompanyUUID = await this.tempDatabaseObject.read(this.companyFilename, -1, -1, "uuid", payload.uuid)
            if(findCompanyUUID.length > 0){
                if(findCompanyUUID[0].isDeleted){
                    if(findCompanyUUID[0].isDeleted == true){
                        throw new Error(`Company was deleted`);
                    }
                }
                const employees = JSON.parse(findCompanyUUID[0].employees);
                const findEmployee = employees.findIndex(obj => obj.email == payload.email)
                if(findEmployee == -1){
                    throw new Error(`Not employee`);
                }else{
                    const token = await this.tokenObject.getNewJWTToken({email : payload.email})
                    this.appendOrUpdateActiveUsers({
                        email : payload.email,
                        token
                    }, payload.email)
                    return token
                }
            }else{
                throw new Error(`Company not found`);
            }
        }catch(e){
            throw e.message;
        }
    }    

    async createNewCompanyAccount(payload, token){
        try{
            await this.verifyToken(token)
            
            // Define required keys
            const requiredKeys = ["companyName", "npwp", "email", "companyAddress1", "companyAddress2", "companyContactNumber1", "companyContactNumber2"];
            
            // Remove keys that are not required
            Object.keys(payload).forEach(key => {
                if (!requiredKeys.includes(key)) {
                    delete payload[key];
                }
            });
            
            // Check if required keys exist and are not empty strings
            for (let key of requiredKeys) {
                if (!payload[key] || typeof payload[key] !== 'string' || payload[key].trim() === '') {
                    throw new Error(`Missing or invalid value for ${key}`);
                }
            }
            
            // Check if email is valid
            const emailRegex = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;
            if (!emailRegex.test(payload.email)) {
                throw new Error(`Invalid email address`);
            }
            
            const findDuplicateCompanyName = await this.tempDatabaseObject.read(this.companyFilename, -1, -1, "companyName", payload.companyName)
            const findDuplicateNPWP = await this.tempDatabaseObject.read(this.companyFilename, -1, -1, "npwp", payload.npwp)
            if(findDuplicateCompanyName.length != 0){
                if(findDuplicateCompanyName[0].isDeleted){
                    if(findDuplicateCompanyName[0].isDeleted == true){
                        await this.tempDatabaseObject.deleteRow(this.companyFilename, "uuid", findDuplicateCompanyName.uuid)
                        return await this.createNewCompanyAccount(payload, token)
                    }
                }
                throw new Error(`Duplicate company found: Company Name`);
            }else if(findDuplicateNPWP.length != 0){
                throw new Error(`Duplicate company found: NPWP`);
            }else{
                payload.uuid = await this.tokenObject.getNewUUID()
                payload.employees = JSON.stringify([{
                    email: payload.email,
                    uam: "admin"
                }])
                // Add lastUpdated and isDeleted fields
                payload.lastUpdated = new Date()
                payload.isDeleted = false
                await this.tempDatabaseObject.write(this.companyFilename, payload)
                return payload.uuid
            }
        }catch(e){
            throw e.message;
        }
    }       

    async createNewUserAccount(payload){
        try{
            // Define required keys
            const requiredKeys = ["email", "password", "phoneNumber", "fullName"];
            
            // Remove keys that are not required
            Object.keys(payload).forEach(key => {
                if (!requiredKeys.includes(key)) {
                    delete payload[key];
                }
            });
            
            // Check if required keys exist and are not empty strings
            for (let key of requiredKeys) {
                if (!payload[key] || typeof payload[key] !== 'string' || payload[key].trim() === '') {
                    throw new Error(`Missing or invalid value for ${key}`);
                }
            }
            
            // Check if email is valid
            if (!await this.validateEmailFormat(payload.email)) {
                throw new Error(`Invalid email address`);
            }
            
            // Check if password is valid
            if (!await this.validatePasswordFormat(payload.password)) {
                throw new Error(`Invalid password format`);
            }
            
            const findDuplicateEmail = await this.tempDatabaseObject.read(this.userFilename, -1, -1, "email", payload.email)
            if(findDuplicateEmail.length == 0){
                // Add lastUpdated and isDeleted fields
                payload.lastUpdated = new Date();
                payload.isDeleted = false;
                
                await this.tempDatabaseObject.write(this.userFilename, payload)
                const token = await this.tokenObject.getNewJWTToken({email : payload.email})
                this.appendOrUpdateActiveUsers({
                    email : payload.email,
                    token
                }, payload.email)
                return token
            }else{
                if(findDuplicateEmail[0].isDeleted){
                    if(findDuplicateEmail[0].isDeleted == true){
                        await this.tempDatabaseObject.deleteRow(this.userFilename, "email", payload.email)
                        return await this.createNewUserAccount(payload)
                    }
                }
                throw new Error(`Duplicate user found: email address`);
            }
        }catch(e){
            throw e.message;
        }
    }    

    async loginRequest(payload){
        try {
            if(payload.email && payload.password){
                const findDuplicateEmail = await this.tempDatabaseObject.read(this.userFilename, -1, -1, "email", payload.email)
                if(findDuplicateEmail.length > 0){
                    if(findDuplicateEmail[0].isDeleted){
                        if(findDuplicateEmail[0].isDeleted == true){
                            throw `Account does exist but was deleted`
                        }
                    }
                    if(findDuplicateEmail[0].password == payload.password){
                        const token = await this.tokenObject.getNewJWTToken({email : payload.email})
                        this.appendOrUpdateActiveUsers({
                            email : payload.email,
                            token
                        }, payload.email)
                        return token
                    }else{
                        throw `Password invalid`
                    }
                }else{
                    throw `Email not found`
                }
            }else{
                throw `Payload provided is not complete`
            }
        } catch (error) {
            throw error;
        }
    }

    async verifyToken(token){
        try {
            let index = this.activeUsers.findIndex(obj => obj.token === token)
            if (index !== -1) {
                const savedEmailToken = await this.tokenObject.verifyToken(token)
                if(savedEmailToken.email == this.activeUsers[index].email){
                    return true
                }else{
                    throw new Error(`Email associated with token does not match active user email`);
                }
            } else{
                throw new Error(`Token not found in active users`);
            }
        } catch (error) {
            throw error.message;
        }
    }    

    async appendOrUpdateActiveUsers(newObj, email) {
        try {
            let index = this.activeUsers.findIndex(obj => obj.email == email);
            if (index !== -1) {
                this.activeUsers[index] = newObj;
            } 
            else {
                this.activeUsers.push(newObj);
            }
        } catch (error) {
            throw error;
        }
    }

    async validatePasswordFormat(password) {
        try {
            if (password.length < 6 || password.length > 24) {
                throw new Error("Password must be between 6 and 24 characters.");
            }
            if (!/[a-z]/.test(password)) {
                throw new Error("Password must contain at least one lowercase letter.");
            }
            if (!/[A-Z]/.test(password)) {
                throw new Error("Password must contain at least one uppercase letter.");
            }
            if (!/[0-9]/.test(password)) {
                throw new Error("Password must contain at least one number.");
            }
            return true;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }
    
    async validateEmailFormat(email) {
        try {
            var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            var testResult = re.test(String(email).toLowerCase());
            if (!testResult) {
                throw new Error("Invalid email format.");
            }
            return testResult;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }
    
}
module.exports = User;