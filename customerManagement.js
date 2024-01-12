const xlsx = require('xlsx')
let tempDatabaseClass = require('./tempDatabase.js')
let tokenClass = require('./token.js')
let uamClass = require('./uam.js')
require('dotenv').config()

class customerManagement {
    constructor(userObject) {
        this.companyFilename =  process.env.companyTable
        this.userObject = userObject
        this.tokenObject = new tokenClass()
        this.tempDatabaseObject = new tempDatabaseClass()
        this.uamObject = new uamClass()
    }

    async checkAccessValidity(companyUUID, editorEmail, action){
        try {
            // Check if the user has the necessary permissions
            const findCompanyUUID = await this.tempDatabaseObject.read(this.companyFilename + "-crm", -1, -1, "uuid", companyUUID);
            const employees = JSON.parse(findCompanyUUID[0].employees);
            const findEmployee = employees.findIndex(obj => obj.email == editorEmail);
            if (findEmployee == -1) {
                throw new Error('Not an employee');
            } else {
                if (!await this.uamObject.verifyAccess(employees[findEmployee].uam, "customerManagement", action)) {
                    throw new Error('Access not granted');
                }
            }
        } catch (error) {
            throw error;
        }
    }

    async getCustomerList(token, companyUUID, editorEmail, page, size, sort = null) {
        try {
            // Verify the token
            await this.userObject.verifyToken(token);
    
            // Check if companyUUID, page, and size are provided
            if (!companyUUID || !page || !size) {
                throw new Error('companyUUID, page, and size must be provided');
            }
    
            // Check if page and size are at least 1
            if (page < 1 || size < 1) {
                throw new Error('page and size must be at least 1');
            }
    
            // Check if the user has the necessary permissions
            await this.checkAccessValidity(companyUUID, editorEmail, "View")
    
            // If sort is provided, it can only be 'asc' or 'desc'
            if (sort && sort !== 'asc' && sort !== 'desc') {
                throw new Error('sort can only be asc or desc');
            }
    
            // Read the customers from the database
            let customers;
            try {
                customers = await this.tempDatabaseObject.read(companyUUID + "-crm", page, size, null, null, sort, "isDeleted", false);
            } catch (error) {
                throw new Error(`Error reading from database: ${error.message}`);
            }
    
            // Return the customers
            return items;
        } catch (error) {
            throw error.message;
        }
    }      

    async getCustomerDetail(token, companyUUID, editorEmail, customerID, customerUUID) {
        try {
            await this.userObject.verifyToken(token);

            if (!customerID || !customerUUID) {
                throw new Error('Both customerID and customerUUID must be provided');
            }

            await this.checkAccessValidity(companyUUID, editorEmail, "View")
    
            let customers;
            try {
                customers = await this.tempDatabaseObject.read(companyUUID + "-crm", -1, -1, "customerUUID", customerUUID);
            } catch (error) {
                throw new Error(`Error reading from database: ${error.message}`);
            }
    
            if (customers.length === 0 || customers[0].isDeleted === true) {
                throw new Error('No customer found with the provided UUID or customer is deleted');
            }
    
            if (customers[0].customerID !== customerID) {
                throw new Error('The provided ID does not match the ID of the customer with the provided UUID');
            }
    
            if (customers[0].history) {
                customers[0].history = JSON.parse(customers[0].history);
            }
    
            return customers[0];
        } catch (error) {
            throw error.message;
        }
    }    

    async validatePayload(payload) {
        const requiredKeys = ['companyUUID', 'customerID', 'customerFullName', 'customerDateOfBirth', 'customerMonthOfBirth', 'customerYearOfBirth', 'customerOccupation', 'customerFlaggedStatus', 'customerAddress', 'customerPostcode', 'customerGender', 'customerContactNumber1', 'customerContactNumber2', 'customerEmailAddress1', 'customerEmailAddress2', 'editorEmail'];
        const validGenders = ['Male', 'Female', 'Other'];
        const validFlaggedStatus = ["New Customer", "Returning Customer", "Banned Customer", "VIP Customer"];
    
        for (let key of requiredKeys) {
            if (!payload.hasOwnProperty(key)) {
                if (key === 'customerOccupation' || key === 'customerContactNumber2' || key === 'customerEmailAddress2') {
                    payload[key] = null;
                } else {
                    return `Missing required key: ${key}`;
                }
            }
        }
    
        if (!validGenders.includes(payload['customerGender'])) {
            return 'Invalid gender';
        }
    
        if (!validFlaggedStatus.includes(payload['customerFlaggedStatus'])) {
            return 'Invalid flagged status';
        }
    
        const dob = payload['customerDateOfBirth'];
        const mob = payload['customerMonthOfBirth'];
        const yob = payload['customerYearOfBirth'];
    
        if (!Number.isInteger(dob) || dob < 1 || dob > 31) {
            return 'Invalid date of birth';
        }
    
        if (!Number.isInteger(mob) || mob < 1 || mob > 12) {
            return 'Invalid month of birth';
        }
    
        if (!Number.isInteger(yob) || yob < 1900) {
            return 'Invalid year of birth';
        }
    
        return 'Payload is valid';
    }
    
    async createNewCustomer(token, payload) {
        return new Promise(async (resolve, reject) => {
            try {
                await this.userObject.verifyToken(token);
    
                if (typeof payload !== 'object') {
                    throw new Error('Payload must be an object');
                }
    
                await this.validatePayload(payload)
    
                await this.checkAccessValidity(payload.companyUUID, payload.editorEmail, "Create")
    
                payload.isDeleted = false;
                payload.history = JSON.stringify([]);
                payload.customerUUID = await this.tokenObject.getNewUUID();
                payload.createdDate = new Date();
                payload.lastUpdated = new Date();
                payload.action = "created-by-user";

                let customers;
                try {
                    customers = await this.tempDatabaseObject.read(payload.companyUUID + "-crm", -1, -1, "customerID", payload.customerID);
                } catch (error) {
                    throw new Error(`Error reading from database: ${error.message}`);
                }
                if (customers.length > 0) {
                    if (customers[0].isDeleted === false) {
                        throw new Error('Duplicate customer ID found, please use a different customer ID');
                    }
                }

                let writeResult;
                try {
                    writeResult = await this.tempDatabaseObject.write(payload.companyUUID + "-crm", payload);
                } catch (error) {
                    throw new Error(`Error writing to database: ${error.message}`);
                }
    
                resolve(payload.customerID);
            } catch (error) {
                reject(error);
            }
        });
    }    

    async editExistingCustomer(token, payload) {
        return new Promise(async (resolve, reject) => {
            try {
                await this.userObject.verifyToken(token);

                if (typeof payload !== 'object') {
                    throw new Error('Payload must be an object');
                }
    
                let customers;
                try {
                    customers = await this.tempDatabaseObject.read(payload.companyUUID + "-crm", -1, -1, "customerUUID", payload.customerUUID);
                } catch (error) {
                    throw new Error(`Error reading from database: ${error.message}`);
                }
                if (customers.length === 0 || customers[0].isDeleted === true) {
                    throw new Error('No item found with the provided UUID or the customer is deleted');
                }
    
                let customersWithTheSameID;
                try {
                    customersWithTheSameID = await this.tempDatabaseObject.read(payload.companyUUID + "-crm", -1, -1, "customerID", payload.customerID);
                } catch (error) {
                    throw new Error(`Error reading from database: ${error.message}`);
                }
                if (customersWithTheSameID.length > 0 && customersWithTheSameID[0].customerUUID !== payload.customerUUID) {
                    throw new Error('There is a customer with the same customerID, but different UUID');
                }
    
                for (const key in payload) {
                    if (!customers[0].hasOwnProperty(key)) {
                        throw new Error(`Key ${key} does not exist in the existing customer`)
                    }
                }

                for (const key in customers[0]) {
                    if (!payload.hasOwnProperty(key)) {
                        payload[key] = customers[0].key
                    }
                }

                await this.checkAccessValidity(payload.companyUUID, payload.editorEmail, "Edit")
    
                payload.lastUpdated = new Date();
                payload.editorEmail = payload.editorEmail;
    
                let history = JSON.parse(customers[0].history);
                customers[0].lastUpdated = new Date();
                customers[0].action = "last-edited-by-user";
                payload.action = "edited-by-user";
                history.push(customers[0]);
                payload.history = JSON.stringify(history);
                payload.isDeleted = customers[0].isDeleted;
    
                let updateResult;
                try {
                    updateResult = await this.tempDatabaseObject.update(payload.companyUUID + "-crm", payload, "customerUUID", payload.customerUUID);
                } catch (error) {
                    throw new Error(`Error updating the database: ${error.message}`);
                }
    
                resolve(payload);
            } catch (error) {
                reject(new Error(`${error.message}`));
            }
        });
    }    
    
    async deleteCustomer(token, payload) {
        return new Promise(async (resolve, reject) => {
            try {
                await this.userObject.verifyToken(token);

                if (typeof payload !== 'object') {
                    throw new Error('Payload must be an object');
                }
    
                const requiredKeys = ['customerID', 'customerUUID', 'editorEmail'];
                for (const key of requiredKeys) {
                    if (!payload.hasOwnProperty(key)) {
                        throw new Error(`Payload is missing key: ${key}`);
                    }
                    if (payload[key] === null || payload[key] === undefined) {
                        throw new Error(`Key ${key} must have a value`);
                    }
                    if (key === 'editorEmail' && !/^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(payload[key])) {
                        throw new Error(`Key ${key} must be a valid email address`);
                    }
                }
    
                let customers;
                try {
                    customers = await this.tempDatabaseObject.read(payload.companyUUID + "-crm", -1, -1, "customerUUID", payload.customerUUID);
                } catch (error) {
                    throw new Error(`Error reading from database: ${error.message}`);
                }
                if (customers.length === 0 || customers[0].isDeleted === true) {
                    throw new Error('No customer found with the provided UUID or the customer is already deleted');
                }
    
                let customersWithSameID;
                try {
                    customersWithSameID = await this.tempDatabaseObject.read(payload.companyUUID + "-crm", -1, -1, "customerID", payload.customerID);
                } catch (error) {
                    throw new Error(`Error reading from database: ${error.message}`);
                }
                if (customersWithSameID.length > 0 && customersWithSameID[0].itemUUID !== payload.itemUUID) {
                    throw new Error('There is a customer with the same ID, but different UUID');
                }

                await this.checkAccessValidity(payload.companyUUID, payload.editorEmail, "Edit")
    
                customers[0].isDeleted = true;
                customers[0].lastUpdated = new Date();
                customers[0].editorEmail = payload.editorEmail;
    
                if (customers[0].history) {
                    let history = JSON.parse(customers[0].history);
                    customers[0].action = "deleted-by-user";
                    history.push(customers[0]);
                    customers[0].history = JSON.stringify(history);
                }
    
                let updateResult;
                try {
                    updateResult = await this.tempDatabaseObject.update(payload.companyUUID + "-crm", customers[0], "customerUUID", payload.customerUUID);
                } catch (error) {
                    throw new Error(`Error updating the database: ${error.message}`);
                }

                resolve(customers[0]);
            } catch (error) {
                reject(new Error(`${error.message}`));
            }
        });
    }    
    
}

module.exports = customerManagement;
