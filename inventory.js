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

    async checkAccessValidity(companyUUID, editorEmail, action){
        try {
            // Check if the user has the necessary permissions
            const findCompanyUUID = await this.tempDatabaseObject.read(this.companyFilename + "-inventory", -1, -1, "uuid", companyUUID);
            const employees = JSON.parse(findCompanyUUID[0].employees);
            const findEmployee = employees.findIndex(obj => obj.email == editorEmail);
            if (findEmployee == -1) {
                throw new Error('Not an employee');
            } else {
                if (!await this.uamObject.verifyAccess(employees[findEmployee].uam, "inventory", action)) {
                    throw new Error('Access not granted');
                }
            }
        } catch (error) {
            throw error;
        }
    }

    async getItemList(token, companyUUID, editorEmail, page, size, sort = null) {
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
    
            // Read the items from the database
            let items;
            try {
                items = await this.tempDatabaseObject.read(companyUUID + "-inventory", page, size, null, null, sort, "isDeleted", false);
            } catch (error) {
                throw new Error(`Error reading from database: ${error.message}`);
            }
    
            // Return the items
            return items;
        } catch (error) {
            throw error.message;
        }
    }      

    async getItemDetail(token, companyUUID, editorEmail, itemSKU, itemUUID) {
        try {
            // Verify the token
            await this.userObject.verifyToken(token);

            // Check if itemSKU and itemUUID are provided
            if (!itemSKU || !itemUUID) {
                throw new Error('Both itemSKU and itemUUID must be provided');
            }

            // Check if the user has the necessary permissions
            await this.checkAccessValidity(companyUUID, editorEmail, "View")
    
            // Read the item from the database
            let items;
            try {
                items = await this.tempDatabaseObject.read(companyUUID + "-inventory", -1, -1, "itemUUID", itemUUID);
            } catch (error) {
                throw new Error(`Error reading from database: ${error.message}`);
            }
    
            // Check if item exists and is not deleted
            if (items.length === 0 || items[0].isDeleted === true) {
                throw new Error('No item found with the provided UUID or the item is deleted');
            }
    
            // Check if itemSKU matches
            if (items[0].itemSKU !== itemSKU) {
                throw new Error('The provided SKU does not match the SKU of the item with the provided UUID');
            }
    
            // Parse the history field
            if (items[0].history) {
                items[0].history = JSON.parse(items[0].history);
            }
    
            // Return the item details
            return items[0];
        } catch (error) {
            throw error.message;
        }
    }    

    async createNewItem(token, payload) {
        return new Promise(async (resolve, reject) => {
            try {
                // Verify the token
                await this.userObject.verifyToken(token);
    
                // Check if payload is an object
                if (typeof payload !== 'object') {
                    throw new Error('Payload must be an object');
                }
    
                // Check if payload has the required keys and their types
                const requiredKeys = ['companyUUID', 'itemSKU', 'itemName', 'itemQty', 'itemQtyUnit', 'itemNotes', 'itemSellPrice', 'itemPurchasePrice', 'itemCurrencySellPrice', 'itemCurrencyBuyPrice', 'editorEmail', 'storageLocationName', 'storageLocationAddress'];
                const validCurrencies = ["USD", "IDR", "CNY", "MYR", "SGD", "AUD", "EUR", "GBP", "HKD"];
                for (const key of requiredKeys) {
                    if (!payload.hasOwnProperty(key)) {
                        throw new Error(`Payload is missing key: ${key}`);
                    }
                    if (payload[key] === null || payload[key] === undefined || payload[key] === '') {
                        throw new Error(`Key ${key} must have a value`);
                    }
                    if ((key === 'itemName' || key === 'itemQtyUnit' || key === 'itemNotes' || key === 'itemCurrencySellPrice' || key === 'itemCurrencyBuyPrice' || key === 'editorEmail' || key === 'storageLocationName' || key === 'storageLocationAddress') && typeof payload[key] !== 'string') {
                        throw new Error(`Key ${key} must be a string`);
                    }
                    if (key === 'itemQty' && !Number.isInteger(payload[key])) {
                        throw new Error(`Key ${key} must be an integer`);
                    }
                    if ((key === 'itemSellPrice' || key === 'itemPurchasePrice') && (typeof payload[key] !== 'number' || payload[key] < 0)) {
                        throw new Error(`Key ${key} must be a non-negative number`);
                    }
                    if ((key === 'itemCurrencySellPrice' || key === 'itemCurrencyBuyPrice') && !validCurrencies.includes(payload[key])) {
                        throw new Error(`Key ${key} must be one of the following currencies: ${validCurrencies.join(', ')}`);
                    }
                    if (key === 'editorEmail' && !/^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(payload[key])) {
                        throw new Error(`Key ${key} must be a valid email address`);
                    }
                }
    
                // Check if the user has the necessary permissions
                await this.checkAccessValidity(payload.companyUUID, payload.editorEmail, "Create")
    
                // Append additional keys to payload
                payload.isDeleted = false;
                payload.history = JSON.stringify([]);
                payload.itemUUID = await this.tokenObject.getNewUUID();
                payload.lastUpdated = new Date();
                payload.action = "created-by-user";
    
                // Check if item with same SKU exists
                let items;
                try {
                    items = await this.tempDatabaseObject.read(payload.companyUUID + "-inventory", -1, -1, "itemSKU", payload.itemSKU);
                } catch (error) {
                    throw new Error(`Error reading from database: ${error.message}`);
                }
                if (items.length > 0) {
                    // for future where we allow multiple storage location for the same item
                    // let storageLocationName = payload.storageLocationName.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").toLowerCase().trim();
                    // let storageLocationAddress = payload.storageLocationAddress.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").toLowerCase().trim();
                    // let existingStorageLocationName = items[0].storageLocationName.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").toLowerCase().trim();
                    // let existingStorageLocationAddress = items[0].storageLocationAddress.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").toLowerCase().trim();
                    // if (items[0].isDeleted === false && (storageLocationName === existingStorageLocationName && storageLocationAddress === existingStorageLocationAddress)) {
                    //     throw new Error('There is an item with the same SKU and storage location, please use a different SKU or storage location');
                    // }
                    if (items[0].isDeleted === false) {
                        throw new Error('Duplicate SKU found, please use a different SKU');
                    }
                }
    
                // Write to database
                let writeResult;
                try {
                    writeResult = await this.tempDatabaseObject.write(payload.companyUUID + "-inventory", payload);
                } catch (error) {
                    throw new Error(`Error writing to database: ${error.message}`);
                }
    
                resolve(payload.itemUUID);
            } catch (error) {
                reject(error);
            }
        });
    }    

    async editExistingItem(token, payload) {
        return new Promise(async (resolve, reject) => {
            try {
                // Verify the token
                await this.userObject.verifyToken(token);

                // Check if payload is an object
                if (typeof payload !== 'object') {
                    throw new Error('Payload must be an object');
                }
    
                // Check if item with same UUID exists and is not deleted
                let items;
                try {
                    items = await this.tempDatabaseObject.read(payload.companyUUID + "-inventory", -1, -1, "itemUUID", payload.itemUUID);
                } catch (error) {
                    throw new Error(`Error reading from database: ${error.message}`);
                }
                if (items.length === 0 || items[0].isDeleted === true) {
                    throw new Error('No item found with the provided UUID or the item is deleted');
                }
    
                // Check if item with same SKU exists and has the same UUID
                let itemsWithSameSKU;
                try {
                    itemsWithSameSKU = await this.tempDatabaseObject.read(payload.companyUUID + "-inventory", -1, -1, "itemSKU", payload.itemSKU);
                } catch (error) {
                    throw new Error(`Error reading from database: ${error.message}`);
                }
                if (itemsWithSameSKU.length > 0 && itemsWithSameSKU[0].itemUUID !== payload.itemUUID) {
                    throw new Error('There is an item with the same SKU, but different UUID');
                }
    
                // Check if items[0] has all keys that payload has
                for (const key in payload) {
                    if (!items[0].hasOwnProperty(key)) {
                        throw new Error(`Key ${key} does not exist in the existing item`)
                    }
                }

                for (const key in items[0]) {
                    if (!payload.hasOwnProperty(key)) {
                        payload[key] = item[0].key
                    }
                }

                // Check if the user has the necessary permissions
                await this.checkAccessValidity(payload.companyUUID, payload.editorEmail, "Edit")
    
                // Update lastUpdated and editorEmail fields
                payload.lastUpdated = new Date();
                payload.editorEmail = payload.editorEmail;
    
                // Update history field
                let history = JSON.parse(items[0].history);
                items[0].lastUpdated = new Date();
                items[0].action = "last-edited-by-user";
                payload.action = "edited-by-user";
                history.push(items[0]);
                payload.history = JSON.stringify(history);
                payload.isDeleted = items[0].isDeleted;
    
                // Update the item in the database
                let updateResult;
                try {
                    updateResult = await this.tempDatabaseObject.update(payload.companyUUID + "-inventory", payload, "itemUUID", payload.itemUUID);
                } catch (error) {
                    throw new Error(`Error updating the database: ${error.message}`);
                }
    
                resolve(payload);
            } catch (error) {
                reject(new Error(`${error.message}`));
            }
        });
    }    
    
    async editItemQTY(payload) {
        return new Promise(async (resolve, reject) => {
            try {
                // Check if payload is an object
                if (typeof payload !== 'object') {
                    throw new Error('Payload must be an object');
                }
    
                // Check if payload has the required keys and their types
                const requiredKeys = ['itemSKU', 'itemUUID', 'itemQty'];
                for (const key of requiredKeys) {
                    if (!payload.hasOwnProperty(key)) {
                        throw new Error(`Payload is missing key: ${key}`);
                    }
                    if (payload[key] === null || payload[key] === undefined) {
                        throw new Error(`Key ${key} must have a value`);
                    }
                    if (key === 'itemQty' && !Number.isInteger(payload[key])) {
                        throw new Error(`Key ${key} must be an integer`);
                    }
                }
    
                // Check if item with same UUID exists and is not deleted
                let items;
                try {
                    items = await this.tempDatabaseObject.read(payload.companyUUID + "-inventory", -1, -1, "itemUUID", payload.itemUUID);
                } catch (error) {
                    throw new Error(`Error reading from database: ${error.message}`);
                }
                if (items.length === 0 || items[0].isDeleted === true) {
                    throw new Error('No item found with the provided UUID or the item is deleted');
                }
    
                // Check if item with same SKU exists and has the same UUID
                let itemsWithSameSKU;
                try {
                    itemsWithSameSKU = await this.tempDatabaseObject.read(payload.companyUUID + "-inventory", -1, -1, "itemSKU", payload.itemSKU);
                } catch (error) {
                    throw new Error(`Error reading from database: ${error.message}`);
                }
                if (itemsWithSameSKU.length > 0 && itemsWithSameSKU[0].itemUUID !== payload.itemUUID) {
                    throw new Error('There is an item with the same SKU, please use a different SKU');
                }
    
                // Update lastUpdated and editorEmail fields
                payload.lastUpdated = new Date();
                payload.editorEmail = "system-update-based-on-seperate-action";
    
                // Update history field
                if (payload.history) {
                    let history = JSON.parse(payload.history);
                    items[0].lastUpdated = new Date();
                    history.push(items[0]);
                    payload.history = JSON.stringify(history);
                }
    
                // Only allow itemQty to be updated, keep the rest of the keys from the existing item
                payload = {
                    ...items[0],
                    action: "edited-by-system",
                    itemQty: payload.itemQty,
                    lastUpdated: payload.lastUpdated,
                    editorEmail: payload.editorEmail,
                    history: payload.history
                };
    
                // Update the item in the database
                let updateResult;
                try {
                    updateResult = await this.tempDatabaseObject.update(payload.companyUUID + "-inventory", payload, "itemUUID", payload.itemUUID);
                } catch (error) {
                    throw new Error(`Error updating the database: ${error.message}`);
                }

                resolve(payload);
            } catch (error) {
                reject(new Error(`${error.message}`));
            }
        });
    }

    async deleteItem(token, payload) {
        return new Promise(async (resolve, reject) => {
            try {
                // Verify the token
                await this.userObject.verifyToken(token);

                // Check if payload is an object
                if (typeof payload !== 'object') {
                    throw new Error('Payload must be an object');
                }
    
                // Check if payload has the required keys
                const requiredKeys = ['itemSKU', 'itemUUID', 'editorEmail'];
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
    
                // Check if item with same UUID exists and is not deleted
                let items;
                try {
                    items = await this.tempDatabaseObject.read(payload.companyUUID + "-inventory", -1, -1, "itemUUID", payload.itemUUID);
                } catch (error) {
                    throw new Error(`Error reading from database: ${error.message}`);
                }
                if (items.length === 0 || items[0].isDeleted === true) {
                    throw new Error('No item found with the provided UUID or the item is already deleted');
                }
    
                // Check if item with same SKU exists and has the same UUID
                let itemsWithSameSKU;
                try {
                    itemsWithSameSKU = await this.tempDatabaseObject.read(payload.companyUUID + "-inventory", -1, -1, "itemSKU", payload.itemSKU);
                } catch (error) {
                    throw new Error(`Error reading from database: ${error.message}`);
                }
                if (itemsWithSameSKU.length > 0 && itemsWithSameSKU[0].itemUUID !== payload.itemUUID) {
                    throw new Error('There is an item with the same SKU, but different UUID');
                }

                // Check if the user has the necessary permissions
                await this.checkAccessValidity(payload.companyUUID, payload.editorEmail, "Edit")
    
                // Set isDeleted to true and keep the rest of the keys from the existing item
                items[0].isDeleted = true;
                items[0].lastUpdated = new Date();
                items[0].editorEmail = payload.editorEmail;
    
                // Update history field
                if (items[0].history) {
                    let history = JSON.parse(items[0].history);
                    items[0].action = "deleted-by-user";
                    history.push(items[0]);
                    items[0].history = JSON.stringify(history);
                }
    
                // Update the item in the database
                let updateResult;
                try {
                    updateResult = await this.tempDatabaseObject.update(payload.companyUUID + "-inventory", items[0], "itemUUID", payload.itemUUID);
                } catch (error) {
                    throw new Error(`Error updating the database: ${error.message}`);
                }

                resolve(items[0]);
            } catch (error) {
                reject(new Error(`${error.message}`));
            }
        });
    }    
    
}

module.exports = Inventory;
