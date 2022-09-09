const express = require('express')
const app = express()
var cors = require('cors')
var axios = require('axios')
var NoSQL = require('nosql')
require('dotenv').config()
const port = 3000

app.use(cors())
app.use(express.json());

var viewDir = __dirname + '/views/';

app.get('/', function (req, res, next) {
    res.sendFile(viewDir + 'index.html');
})

app.get('/pos', function (req, res, next) {
    res.sendFile(viewDir + 'pos.html');
})

let signUpDTO = [
    "businessName",
    "businessAddress",
    "userEmail",
    "userPhoneNumber",
    "userPassword",
    "businessId"
]

let loginDTO = [
    "userEmail",
    "userPassword",
    "businessId"
]

let logoutDTO = [
    "userEmail",
    "uuid"
]

let adminMenusDTO = [
    "uuid",
    "userEmail"
]

let generalAccountMenusDTO = [
    "uuid",
    "userEmail"
]

let generalAccountMenus = [
    "view/edit profile",
    "logout",
]

let adminMenus = [
    "view/edit categories",
    "view/edit items",
    "view businessId",
]

let adminCategoryGETDTO = [
    "userEmail",
    "uuid",
    "page",
    "limit"
]

let adminCategoryItemGETDTO = [
    "userEmail",
    "uuid",
    "page",
    "limit",
    "categoryName"
]

let adminCategoryPOSTDTO = [
    "userEmail",
    "uuid",
    "categoryName"
]

let adminCategoryPUTDTO = [
    "userEmail",
    "uuid",
    "categoryName",
    "oldCategoryName"
]

let adminCategoryDELETEDTO = [
    "userEmail",
    "uuid",
    "categoryName"
]

let adminItemGETDTO = [
    "userEmail",
    "uuid",
    "page",
    "limit"
]

let adminItemPOSTDTO = [
    "userEmail",
    "uuid",
    "itemName",
    "itemSKU",
    "itemPrice",
    "itemStock",
    "itemDesc",
    "categoryName"
]

let adminItemPUTDTO = [
    "userEmail",
    "uuid",
    "oldItemSKU",
    "itemName",
    "itemSKU",
    "itemPrice",
    "itemStock",
    "itemDesc",
    "categoryName"
]

let adminItemDELETEDTO = [
    "userEmail",
    "uuid",
    "itemSKU"
]

app.post('/sign-up', async function (req, res, next) {
    const getObjectKeys = Object.keys(req.body)
    if (await arrayEquals(getObjectKeys, signUpDTO)){
        const getSignUps = await getDb('signUps')
        if(getSignUps){
            const signUps = getSignUps
            if(req.body.businessId){
                const checkExistingBusiness = signUps.find(a=> a.businessId === req.body.businessId)
                if(checkExistingBusiness){
                    res.json({
                        found: checkExistingBusiness,
                        status: false
                    })
                }else{
                    res.json(await createNewSignUp(req.body))
                }
                return
            }else{
                req.body.businessId = await generateUID()
                req.body.status = 'admin'
                res.json(await createNewSignUp(req.body))
                return
            }
        }
    }
    res.json({
        status: false
    });
    return
})

app.post('/login', async function (req, res, next) {
    const getObjectKeys = Object.keys(req.body)
    if (await arrayEquals(getObjectKeys, loginDTO)){
        const getSignUps = await getDb('signUps')
        if(getSignUps){
            const signUps = getSignUps
            if(req.body.businessId){
                const hashedPassword = await stringToHash(req.body.userPassword)
                const checkExistingBusiness = signUps.find(a=> a.userEmail === req.body.userEmail && a.businessId === req.body.businessId && a.userPassword === hashedPassword)
                if(checkExistingBusiness){
                    req.body.uuid = await generateUID()
                    req.body.status = checkExistingBusiness.status
                    await createNewLogin(req.body)
                    res.json({
                        found: checkExistingBusiness,
                        uuid: req.body.uuid,
                        status: true
                    })
                }else{
                    res.json({
                        reason: `user not found`,
                        status: false
                    });
                }
                return
            }else{
                res.json({
                    reason: `businessId not found`,
                    status: false
                });
                return
            }
        }
    }
    res.json({
        status: false
    });
    return
})

app.post('/logout', async function (req, res, next) {
    const getObjectKeys = Object.keys(req.body)
    if (await arrayEquals(getObjectKeys, logoutDTO)){
        const getSignUps = await getDb('signUps')
        if(getSignUps){
            const signUps = getSignUps
            const getLogins = await getDb('login')
            if(getLogins){
                const logins = getLogins
                const checkExisting = logins.find(a=> a.userEmail === req.body.userEmail && a.uuid === req.body.uuid)
                const checkExistingBusiness = signUps.find(a=> a.userEmail === req.body.userEmail && a.businessId === checkExisting.businessId)
                if(checkExistingBusiness){
                    await removeLogin(req.body)
                    res.json({
                        found: checkExistingBusiness,
                        uuid: req.body.uuid,
                        status: true
                    })
                }else{
                    res.json({
                        reason: `user not found`,
                        status: true
                    });
                }
                return
            }else{
                res.json({
                    reason: `user not found`,
                    status: true
                });
            }
        }
    }
    res.json({
        status: false
    });
    return
})

// category management

app.post('/admin/category/get', async function (req, res, next) {
    const getObjectKeys = Object.keys(req.body)
    if (await arrayEquals(getObjectKeys, adminCategoryGETDTO)){
        const getLogins = await getDb('login')
        if(getLogins){
            const logins = getLogins
            const checkExisting = logins.find(a=> a.userEmail === req.body.userEmail && a.uuid === req.body.uuid)
            if(checkExisting){
                let getCategories = (await getDb('categories')).filter(a=> a.businessId === checkExisting.businessId)
                getCategories = getCategories.slice(req.body.page,req.body.page+req.body.limit)
                res.json({
                    categories: getCategories,
                    status: true
                })
            }else{
                res.json({
                    reason: `user not found`,
                    status: false
                });
            }
            return
        }
    }
    res.json({
        status: false
    });
    return
})

app.post('/admin/category/get-item', async function (req, res, next) {
    const getObjectKeys = Object.keys(req.body)
    if (await arrayEquals(getObjectKeys, adminCategoryItemGETDTO)){
        const getLogins = await getDb('login')
        if(getLogins){
            const logins = getLogins
            const checkExisting = logins.find(a=> a.userEmail === req.body.userEmail && a.uuid === req.body.uuid)
            if(checkExisting){
                let getTheCategory = (await getDb('categories')).find(a=> a.businessId === checkExisting.businessId && a.categoryName === req.body.categoryName)
                if(getTheCategory){
                    getItems = (await getDb('items')).filter(a=> a.businessId === checkExisting.businessId && a.categoryName === req.body.categoryName)
                    res.json({
                        items: getItems,
                        status: true
                    })
                }else{
                    res.json({
                        reason: `category not found`,
                        status: false
                    });
                }
                return
            }else{
                res.json({
                    reason: `user not found`,
                    status: false
                });
            }
            return
        }
    }
    res.json({
        status: false
    });
    return
})

app.post('/admin/category', async function (req, res, next) {
    const getObjectKeys = Object.keys(req.body)
    if (await arrayEquals(getObjectKeys, adminCategoryPOSTDTO)){
        const getLogins = await getDb('login')
        if(getLogins){
            const logins = getLogins
            const checkExisting = logins.find(a=> a.userEmail === req.body.userEmail && a.uuid === req.body.uuid)
            if(checkExisting){
                req.body.businessId = checkExisting.businessId
                if(!(await checkExistingCategory(req.body.categoryName, checkExisting.businessId))){
                    await createNewCategory(req.body)
                    res.json({
                        newCategory: req.body,
                        status: true
                    })
                }else{
                    res.json({
                        reason: `category not found`,
                        status: false
                    });
                }
            }else{
                res.json({
                    reason: `user not found`,
                    status: false
                });
            }
            return
        }
    }
    res.json({
        status: false
    });
    return
})

app.put('/admin/category', async function (req, res, next) {
    const getObjectKeys = Object.keys(req.body)
    if (await arrayEquals(getObjectKeys, adminCategoryPUTDTO)){
        const getLogins = await getDb('login')
        if(getLogins){
            const logins = getLogins
            const checkExisting = logins.find(a=> a.userEmail === req.body.userEmail && a.uuid === req.body.uuid)
            if(checkExisting){
                req.body.businessId = checkExisting.businessId
                await updateCategory(req.body, checkExisting.businessId)
                await updateAllItemsCategory(req.body.oldCategoryName ,req.body.categoryName, checkExisting.businessId)
                res.json({
                    newCategory: req.body,
                    status: true
                })
            }else{
                res.json({
                    reason: `user not found`,
                    status: false
                });
            }
            return
        }
    }
    res.json({
        status: false
    });
    return
})

app.delete('/admin/category', async function (req, res, next) {
    const getObjectKeys = Object.keys(req.body)
    if (await arrayEquals(getObjectKeys, adminCategoryDELETEDTO)){
        const getLogins = await getDb('login')
        if(getLogins){
            const logins = getLogins
            const checkExisting = logins.find(a=> a.userEmail === req.body.userEmail && a.uuid === req.body.uuid)
            if(checkExisting){
                req.body.businessId = checkExisting.businessId
                await removeCategory({
                    categoryName: req.body.categoryName,
                    businessId: checkExisting.businessId
                })
                res.json({
                    removed: req.body.categoryName,
                    status: true
                })
            }else{
                res.json({
                    reason: `user not found`,
                    status: false
                });
            }
            return
        }
    }
    res.json({
        status: false
    });
    return
})

// item management

app.post('/admin/item/get', async function (req, res, next) {
    const getObjectKeys = Object.keys(req.body)
    if (true){//(await arrayEquals(getObjectKeys, adminItemGETDTO)){
        const getLogins = await getDb('login')
        if(getLogins){
            const logins = getLogins
            const checkExisting = logins.find(a=> a.userEmail === req.body.userEmail && a.uuid === req.body.uuid)
            if(checkExisting){
                let getItems;
                if(req.body.itemSKU){
                    getItems = (await getDb('items')).find(a=> a.businessId === checkExisting.businessId && a.itemSKU === req.body.itemSKU)
                }else{
                    getItems = (await getDb('items')).filter(a=> a.businessId === checkExisting.businessId)
                    getItems = getItems.slice(req.body.page,req.body.page+req.body.limit)
                }
                res.json({
                    categories: getItems,
                    status: true
                })
            }else{
                res.json({
                    reason: `user not found`,
                    status: false
                });
            }
            return
        }
    }
    res.json({
        status: false
    });
    return
})

app.post('/admin/item', async function (req, res, next) {
    const getObjectKeys = Object.keys(req.body)
    if (await arrayEquals(getObjectKeys, adminItemPOSTDTO)){
        const getLogins = await getDb('login')
        if(getLogins){
            const logins = getLogins
            const checkExisting = logins.find(a=> a.userEmail === req.body.userEmail && a.uuid === req.body.uuid)
            if(checkExisting){
                req.body.businessId = checkExisting.businessId
                await createNewitem(req.body)
                res.json({
                    newCategory: req.body,
                    status: true
                })
            }else{
                res.json({
                    reason: `user not found`,
                    status: false
                });
            }
            return
        }
    }
    res.json({
        status: false
    });
    return
})

app.put('/admin/item', async function (req, res, next) {
    const getObjectKeys = Object.keys(req.body)
    if (await arrayEquals(getObjectKeys, adminItemPUTDTO)){
        const getLogins = await getDb('login')
        if(getLogins){
            const logins = getLogins
            const checkExisting = logins.find(a=> a.userEmail === req.body.userEmail && a.uuid === req.body.uuid)
            if(checkExisting){
                req.body.businessId = checkExisting.businessId
                if(await checkExistingCategory(req.body.categoryName, checkExisting.businessId)){
                    await updateItem(req.body, checkExisting.businessId)
                    res.json({
                        newCategory: req.body,
                        status: true
                    })
                }else{
                    res.json({
                        reason: `category not found`,
                        status: false
                    });
                }
            }else{
                res.json({
                    reason: `user not found`,
                    status: false
                });
            }
            return
        }
    }
    res.json({
        status: false
    });
    return
})

app.delete('/admin/item', async function (req, res, next) {
    const getObjectKeys = Object.keys(req.body)
    if (await arrayEquals(getObjectKeys, adminItemDELETEDTO)){
        const getLogins = await getDb('login')
        if(getLogins){
            const logins = getLogins
            const checkExisting = logins.find(a=> a.userEmail === req.body.userEmail && a.uuid === req.body.uuid)
            if(checkExisting){
                req.body.businessId = checkExisting.businessId
                await removeItem({
                    itemSKU: req.body.itemSKU,
                    businessId: checkExisting.businessId
                })
                res.json({
                    removed: req.body.itemSKU,
                    status: true
                })
            }else{
                res.json({
                    reason: `user not found`,
                    status: false
                });
            }
            return
        }
    }
    res.json({
        status: false
    });
    return
})

// menu management

app.post('/admin/menu/get', async function (req, res, next) {
    const getObjectKeys = Object.keys(req.body)
    if (await arrayEquals(getObjectKeys, adminMenusDTO)){
        const getLogins = await getDb('login')
        if(getLogins){
            const logins = getLogins
            const checkExistingBusiness = logins.find(a=> a.userEmail === req.body.userEmail && a.uuid === req.body.uuid && a.status === 'admin')
            if(checkExistingBusiness){
                res.json({
                    menu: adminMenus,
                    status: true
                })
            }else{
                res.json({
                    reason: `user not found`,
                    status: false
                });
            }
            return
        }
    }
    res.json({
        status: false
    });
    return
})

app.post('/general/menu/account/get', async function (req, res, next) {
    const getObjectKeys = Object.keys(req.body)
    if (await arrayEquals(getObjectKeys, generalAccountMenusDTO)){
        const getLogins = await getDb('login')
        if(getLogins){
            const logins = getLogins
            const checkExistingBusiness = logins.find(a=> a.userEmail === req.body.userEmail && a.uuid === req.body.uuid)
            if(checkExistingBusiness){
                res.json({
                    menu: generalAccountMenus,
                    status: true
                })
            }else{
                res.json({
                    reason: `user not found`,
                    status: false
                });
            }
            return
        }
    }
    res.json({
        status: false
    });
    return
})

async function generateUID() {
    var firstPart = (Math.random() * 46656) | 0;
    var secondPart = (Math.random() * 46656) | 0;
    firstPart = ("000" + firstPart.toString(36)).slice(-3);
    secondPart = ("000" + secondPart.toString(36)).slice(-3);
    return firstPart + secondPart;
}

async function stringToHash(string) {
                  
    var hash = 0;
      
    if (string.length == 0) return hash;
      
    for (i = 0; i < string.length; i++) {
        char = string.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
      
    return hash;
}

async function getDb(db){
    var db = NoSQL.load(`./db/${db}.nosql`);
    return await new Promise(async (resolve, reject) => {
            db.find().make(function(filter) {
            filter.callback(function(err, response) {
                resolve(response)
            });
        });
    })
}

async function checkExistingCategory(categoryName, businessId){
    var db = NoSQL.load('./db/categories.nosql');
    let getCategories = (await getDb('categories')).find(a=> a.businessId === businessId && a.categoryName === categoryName)
    if(getCategories){
        return true
    }else {
        return false
    }
}

async function updateAllItemsCategory(oldCategoryName ,categoryName, businessId){
    var db = NoSQL.load('./db/items.nosql');
    let getItems = (await getDb('items')).filter(a=> a.businessId === businessId && a.categoryName === oldCategoryName)
    if(getItems){
        for(const eachItem of getItems){
            await removeItem({
                itemSKU: eachItem.itemSKU,
                businessId
            })
            eachItem.timeStamp = new Date()
            delete eachItem.oldItemSKU
            await db.insert(eachItem)
        }
        return getItems
    }else {
        return false
    }
}

async function createNewitem(newData){
    var db = NoSQL.load('./db/items.nosql');
    newData.timeStamp = new Date()
    db.insert(newData)
    return newData
}

async function updateItem(newData, businessId){
    var db = NoSQL.load('./db/items.nosql');
    let getCategories = (await getDb('items')).filter(a=> a.businessId === businessId)
    let findCategory = getCategories.find(a=> a.itemSKU === newData.oldItemSKU)
    await removeItem(findCategory);
    newData.timeStamp = new Date()
    delete newData.oldItemSKU
    db.insert(newData)
    return newData
}

async function removeItem(newData){
    var db = NoSQL.load('./db/items.nosql');
    return await new Promise(async (resolve, reject) => {
            db.remove().make(function(filter) {
                filter.where('itemSKU', newData.categoryName);
                filter.where('businessId', newData.businessId);
                filter.callback(function(err, response) {
                    resolve(response)
                });
        });
    })
}

async function updateCategory(newData, businessId){
    var db = NoSQL.load('./db/categories.nosql');
    let getCategories = (await getDb('categories')).filter(a=> a.businessId === businessId)
    let findCategory = getCategories.find(a=> a.categoryName === newData.oldCategoryName)
    await removeCategory(findCategory);
    newData.timeStamp = new Date()
    delete newData.oldCategoryName
    db.insert(newData)
    return newData
}

async function removeCategory(newData){
    var db = NoSQL.load('./db/categories.nosql');
    return await new Promise(async (resolve, reject) => {
            db.remove().make(function(filter) {
                filter.where('categoryName', newData.categoryName);
                filter.where('businessId', newData.businessId);
                filter.callback(function(err, response) {
                    resolve(response)
                });
        });
    })
}

async function createNewCategory(newData){
    var db = NoSQL.load('./db/categories.nosql');
    newData.timeStamp = new Date()
    db.insert(newData)
    return newData
}

async function createNewSignUp(newData){
    var db = NoSQL.load('./db/signUps.nosql');
    newData.userPassword = await stringToHash(newData.userPassword)
    newData.timeStamp = new Date()
    db.insert(newData)
    return newData
}

async function createNewLogin(newData){
    var db = NoSQL.load('./db/login.nosql');
    newData.userPassword = await stringToHash(newData.userPassword)
    newData.timeStamp = new Date()
    db.insert(newData)
    return newData
}

async function removeLogin(newData){
    var db = NoSQL.load('./db/login.nosql');
    return await new Promise(async (resolve, reject) => {
            db.remove().make(function(filter) {
                filter.where('userEmail', newData.userEmail);
                filter.where('businessId', newData.businessId);
                filter.callback(function(err, response) {
                    resolve(response)
                });
        });
    })
}

async function arrayEquals(a, b) {
    return Array.isArray(a) &&
        Array.isArray(b) &&
        a.length === b.length &&
        a.every((val, index) => val === b[index]);
}

async function setPantryConfig(method, basket, data = null){
    let config = {
        method: method,
        url: `https://getpantry.cloud/apiv1/pantry/${process.env.pantryId}/basket/${basket}`,
        headers: { },
        data : data
    };
    return config
}

async function axiosCall(config){
    return await new Promise(async (resolve, reject) => {
        await axios(config)
        .then(async function (response) {
            resolve(response.data) 
        })
        .catch(async function (error) {
            reject(error);
        });
    });
}

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})