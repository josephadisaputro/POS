const xlsx = require('xlsx')
let tempDatabaseClass = require('./tempDatabase.js')
let tokenClass = require('./token.js')
let uamClass = require('./uam.js')
require('dotenv').config()

class Inventory {
    constructor(userObject) {
        this.companyFilename =  process.env.companyTable
        this.userObject = userObject
        this.tokenObject = new tokenClass()
        this.tempDatabaseObject = new tempDatabaseClass()
        this.uamObject = new uamClass()
    }

    async createNewCustomer(token, payload) {
        try {
            // Verify the token
            await this.userObject.verifyToken(token);
    
            // Check if payload is an object
            if (typeof payload !== 'object') {
                throw new Error('Payload must be an object');
            }
    
            // Check if payload has the required keys and their types
            const requiredKeys = ['companyUUID', 'customerID', 'customerFullName', 'customerGender', 'customerDateOfBirth', 'customerMonthOfBirth', 'customerYearOfBirth', 'customerAddressLine1', 'customerAddressPostcode', 'customerContactNumber1', 'customerEmailAddress1', 'editorEmail'];
            const validGenders = ["female", "male"];
            for (const key of requiredKeys) {
                if (!payload.hasOwnProperty(key)) {
                    throw new Error(`Payload is missing key: ${key}`);
                }
                if (payload[key] === null || payload[key] === undefined) {
                    throw new Error(`Key ${key} must have a value`);
                }
                if ((key === 'customerFullName' || key === 'customerAddressLine1' || key === 'customerEmailAddress1' || key === 'editorEmail') && typeof payload[key] !== 'string') {
                    throw new Error(`Key ${key} must be a string`);
                }
                if ((key === 'customerDateOfBirth' || key === 'customerMonthOfBirth' || key === 'customerYearOfBirth') && !Number.isInteger(payload[key])) {
                    throw new Error(`Key ${key} must be an integer`);
                }
                if (key === 'customerGender' && !validGenders.includes(payload[key])) {
                    throw new Error(`Key ${key} must be one of the following genders: ${validGenders.join(', ')}`);
                }
                if (key === 'editorEmail' && !/^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(payload[key])) {
                    throw new Error(`Key ${key} must be a valid email address`);
                }
            }
    
            // Check if the user has the necessary permissions
            const findCompanyUUID = await this.tempDatabaseObject.read(this.companyFilename, -1, -1, "uuid", payload.companyUUID);
            const employees = JSON.parse(findCompanyUUID[0].employees);
            const findEmployee = employees.findIndex(obj => obj.email == payload.editorEmail);
            if (findEmployee == -1) {
                throw new Error('Not an employee');
            } else {
                if (!await this.uamObject.verifyAccess(employees[findEmployee].uam, "customerManagement", "Write")) {
                    throw new Error('Access not granted');
                }
            }
    
            // Append additional keys to payload
            payload.lastUpdated = new Date();
            payload.isDeleted = false;
            payload.history = JSON.stringify([]);
    
            // Write to database
            let writeResult;
            try {
                writeResult = await this.tempDatabaseObject.write(payload.companyUUID, payload);
            } catch (error) {
                throw new Error(`Error writing to database: ${error.message}`);
            }
    
            if (!writeResult) {
                throw new Error('Database write operation failed');
            }
    
            return payload;
        } catch (error) {
            console.error(error.message);
        }
    }    

    async editExistingCustomer(token, payload) {
        try {
            // Verify the token
            await this.userObject.verifyToken(token);
    
            // Check if payload is an object
            if (typeof payload !== 'object') {
                throw new Error('Payload must be an object');
            }
    
            // Check if customer with same ID exists and is not deleted
            let customers;
            try {
                customers = await this.tempDatabaseObject.read(payload.companyUUID, -1, -1, "customerID", payload.customerID);
            } catch (error) {
                throw new Error(`Error reading from database: ${error.message}`);
            }
            if (customers.length === 0 || customers[0].isDeleted === true) {
                throw new Error('No customer found with the provided UUID or the customer is deleted');
            }
    
            // Check if companyUUID in payload is the same as before
            if (customers[0].companyUUID !== payload.companyUUID) {
                throw new Error('companyUUID in payload is not the same as before');
            }
    
            // Check if keys in payload are the same as existing customer
            for (const key in payload) {
                if (!customers[0].hasOwnProperty(key)) {
                    throw new Error(`Key ${key} does not exist in the existing customer`);
                }
            }
    
            // Check if editorEmail is valid
            if (payload.editorEmail && !/^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(payload.editorEmail)) {
                throw new Error(`editorEmail must be a valid email address`);
            }
    
            // Check if the user has the necessary permissions
            const findCompanyUUID = await this.tempDatabaseObject.read(this.companyFilename, -1, -1, "uuid", payload.companyUUID);
            const employees = JSON.parse(findCompanyUUID[0].employees);
            const findEmployee = employees.findIndex(obj => obj.email == payload.editorEmail);
            if (findEmployee == -1) {
                throw new Error('Not an employee');
            } else {
                if (!await this.uamObject.verifyAccess(employees[findEmployee].uam, "customerManagement", "Edit")) {
                    throw new Error('Access not granted');
                }
            }
    
            // Update lastUpdated field
            payload.lastUpdated = new Date();
    
            // Update history field
            if (payload.history) {
                let history = JSON.parse(payload.history);
                customers[0].lastUpdated = new Date();
                customers[0].action = "edited-by-user";
                history.push(customers[0]);
                payload.history = JSON.stringify(history);
            }
    
            // Update the customer in the database
            let updateResult;
            try {
                updateResult = await this.tempDatabaseObject.update(payload.companyUUID, payload, "customerID", payload.customerID);
            } catch (error) {
                throw new Error(`Error updating the database: ${error.message}`);
            }
    
            if (!updateResult) {
                throw new Error('Database update operation failed');
            }
    
            return payload;
        } catch (error) {
            console.error(error.message);
        }
    }    
    
    async deleteCustomer(token, payload) {
        try {
            // Verify the token
            await this.userObject.verifyToken(token);

            // Check if payload is an object
            if (typeof payload !== 'object') {
                throw new Error('Payload must be an object');
            }
    
            // Check if customer with same UUID exists and is not deleted
            let customers;
            try {
                customers = await this.tempDatabaseObject.read(payload.companyUUID, -1, -1, "customerID", payload.customerID);
            } catch (error) {
                throw new Error(`Error reading from database: ${error.message}`);
            }
            if (customers.length === 0 || customers[0].isDeleted === true) {
                throw new Error('No customer found with the provided UUID or the customer is deleted');
            }

            // Check if editorEmail is valid
            if (payload.editorEmail && !/^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(payload.editorEmail)) {
                throw new Error(`editorEmail must be a valid email address`);
            }

            // Check if the user has the necessary permissions
            const findCompanyUUID = await this.tempDatabaseObject.read(this.companyFilename, -1, -1, "uuid", payload.companyUUID);
            const employees = JSON.parse(findCompanyUUID[0].employees);
            const findEmployee = employees.findIndex(obj => obj.email == payload.editorEmail);
            if (findEmployee == -1) {
                throw new Error('Not an employee');
            } else {
                if (!await this.uamObject.verifyAccess(employees[findEmployee].uam, "customerManagement", "Delete")) {
                    throw new Error('Access not granted');
                }
            }
    
            // Set isDeleted to true and keep the rest of the keys from the existing customer
            customers[0].isDeleted = true;
            customers[0].lastUpdated = new Date();
            customers[0].editorEmail = payload.editorEmail;
    
            // Update history field
            if (customers[0].history) {
                let history = JSON.parse(customers[0].history);
                customers[0].action = "deleted-by-user";
                history.push(customers[0]);
                customers[0].history = JSON.stringify(history);
            }
    
            // Update the customer in the database
            let updateResult;
            try {
                updateResult = await this.tempDatabaseObject.update(payload.companyUUID, customers[0], "customerID", payload.customerID);
            } catch (error) {
                throw new Error(`Error updating the database: ${error.message}`);
            }
    
            if (!updateResult) {
                throw new Error('Database update operation failed');
            }
    
            return customers[0];
        } catch (error) {
            console.error(error.message);
        }
    }

    async getCustomerDetail(token, editorEmail, companyUUID, customerID) {
        try {
            // Verify the token
            await this.userObject.verifyToken(token);
    
            // Check if customerID is provided
            if (!customerID) {
                throw new Error('customerID must be provided');
            }
    
            // Read the customer from the database
            let customers;
            try {
                customers = await this.tempDatabaseObject.read(companyUUID, -1, -1, "customerID", customerID);
            } catch (error) {
                throw new Error(`Error reading from database: ${error.message}`);
            }
    
            // Check if customer exists and is not deleted
            if (customers.length === 0 || customers[0].isDeleted === true) {
                throw new Error('No customer found with the provided UUID or the customer is deleted');
            }
    
            // Check if the user has the necessary permissions
            const findCompanyUUID = await this.tempDatabaseObject.read(this.companyFilename, -1, -1, "uuid", companyUUID);
            const employees = JSON.parse(findCompanyUUID[0].employees);
            const findEmployee = employees.findIndex(obj => obj.email == editorEmail);
            if (findEmployee == -1) {
                throw new Error('Not an employee');
            } else {
                if (!await this.uamObject.verifyAccess(employees[findEmployee].uam, "customerManagement", "View")) {
                    throw new Error('Access not granted');
                }
            }
    
            // Parse the history field
            if (customers[0].history) {
                customers[0].history = JSON.parse(customers[0].history);
            }
    
            // Return the customer details
            return customers[0];
        } catch (error) {
            console.error(error.message);
        }
    }

    async getCustomerList(token, editorEmail, companyUUID, page, size) {
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
            const findCompanyUUID = await this.tempDatabaseObject.read(this.companyFilename, -1, -1, "uuid", companyUUID);
            const employees = JSON.parse(findCompanyUUID[0].employees);
            const findEmployee = employees.findIndex(obj => obj.email == editorEmail);
            if (findEmployee == -1) {
                throw new Error('Not an employee');
            } else {
                if (!await this.uamObject.verifyAccess(employees[findEmployee].uam, "customerManagement", "View")) {
                    throw new Error('Access not granted');
                }
            }
    
            // Read the customers from the database
            let customers;
            try {
                customers = await this.tempDatabaseObject.read(companyUUID, page, size, null, null);
            } catch (error) {
                throw new Error(`Error reading from database: ${error.message}`);
            }
    
            // Check if customers exist
            if (customers.length === 0) {
                throw new Error('No customers found');
            }
    
            // Return the customers
            return customers;
        } catch (error) {
            console.error(error.message);
        }
    }
}

module.exports = Inventory;
