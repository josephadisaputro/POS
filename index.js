let express = require('express')
let cors = require('cors')
let app = express()
let userClass = require('./user.js')
let inventoryClass = require('./inventory.js')
let customerManagementClass = require('./customerManagement.js')
let userObject = new userClass()
let inventoryObject = new inventoryClass(userObject)
let customerManagementObject = new customerManagementClass(userObject)

app.use(express.json())
app.use(cors())

app.get('/', async function (req, res, next) {
    
    res.sendFile(__dirname + "/views/sign-up-desktop.html")
})

app.get('/sub-page/:menu', async function (req, res, next) {
    if(req.query.pageToken){
        try{
            await userObject.verifyToken(req.query.pageToken)
            if(req.params.menu){
                res.sendFile(__dirname + "/views/dynamic/" + req.params.menu + ".html")
                return
            }else{
                res.sendFile("")
                return
            }
        }catch(e){
            console.log(e)
            res.sendFile("")
            return
        }
    }
    res.sendFile("")
    return
})

app.get('/page/:path', async function (req, res, next) {
    if(req.query.pageToken){
        try{
            await userObject.verifyToken(req.query.pageToken)
            if(req.params.path){
                res.sendFile(__dirname + "/views/" + req.params.path + ".html")
                return
            }else{
                res.redirect("/")
                return
            }
        }catch(e){
            console.log(e)
            res.redirect("/")
            return
        }
    }
    res.redirect("/")
    return
})

app.post('/api/v1/sign-up', async function (req, res, next) {
    try{
        if(typeof req.body === 'object' && req.body !== null){
            res.json({
                token: await userObject.createNewUserAccount(req.body)
            })
        }
    }catch(e){
        res.json({
            error: e
        })
    }
})

app.post('/api/v1/sign-in', async function (req, res, next) {
    try{
        if(typeof req.body === 'object' && req.body !== null){
            res.json({
                token: await userObject.loginRequest(req.body)
            })
        }
    }catch(e){
        res.json({
            error: e
        })
    }
})

app.post('/api/v1/enter/company', async function (req, res, next) {
    try{
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token == null){
            res.sendStatus(401)
            return
        }

        if(typeof req.body === 'object' && req.body !== null){
            res.json({
                token: await userObject.verifyAccessToCompany(req.body, token)
            })
        }
    }catch(e){
        res.json({
            error: e
        })
    }
})

app.post('/api/v1/company/view', async function (req, res, next) {
    try{
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token == null){
            res.sendStatus(401)
            return
        }

        if(typeof req.body === 'object' && req.body !== null){
            res.json({
                company: await userObject.viewCompany(req.body, token)
            })
        }
    }catch(e){
        res.json({
            error: e
        })
    }
})

app.post('/api/v1/company/view/list', async function (req, res, next) {
    try{
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token == null){
            res.sendStatus(401)
            return
        }

        if(typeof req.body === 'object' && req.body !== null){
            res.json({
                companies: await userObject.viewListCompany(req.body, token)
            })
        }
    }catch(e){
        res.json({
            error: e
        })
    }
})

app.post('/api/v1/company/edit', async function (req, res, next) {
    try{
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token == null){
            res.sendStatus(401)
            return
        }

        if(typeof req.body === 'object' && req.body !== null){
            res.json({
                uuid: await userObject.editCompany(req.body, token)
            })
        }
    }catch(e){
        res.json({
            error: e
        })
    }
})

app.post('/api/v1/company/delete', async function (req, res, next) {
    try{
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token == null){
            res.sendStatus(401)
            return
        }

        if(typeof req.body === 'object' && req.body !== null){
            res.json({
                uuid: await userObject.deleteCompany(req.body, token)
            })
        }
    }catch(e){
        res.json({
            error: e
        })
    }
})

app.post('/api/v1/create/company', async function (req, res, next) {
    try{
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token == null) return res.sendStatus(401);

        if(typeof req.body === 'object' && req.body !== null){
            res.json({
                uuid: await userObject.createNewCompanyAccount(req.body, token)
            })
        }
    }catch(e){
        res.json({
            error: e
        })
    }
})

app.post('/api/v1/menu/view/list', async function (req, res, next) {
    try{
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token == null){
            res.sendStatus(401)
            return
        }

        if(typeof req.body === 'object' && req.body !== null){
            res.json({
                menus: await userObject.viewListMenu(req.body, token)
            })
        }
    }catch(e){
        res.json({
            error: e
        })
    }
})

app.post('/api/v1/item/create', async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const payload = req.body;
        const result = await inventoryObject.createNewItem(token, payload);
        res.json({
            itemUUID: result
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/v1/item/edit', async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const payload = req.body;
        const result = await inventoryObject.editExistingItem(token, payload);
        res.json({
            item: result
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/v1/item/view', async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const payload = req.body;
        const result = await inventoryObject.getItemDetail(token, payload.companyUUID, payload.editorEmail, payload.itemSKU, payload.itemUUID);
        res.json({
            item: result
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/v1/item/view/list', async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const payload = req.body;
        const result = await inventoryObject.getItemList(token, payload.companyUUID, payload.editorEmail, payload.page, payload.size);
        res.json({
            items: result
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.listen(80, function () {
    console.log('CORS-enabled web server listening on port 80')
})