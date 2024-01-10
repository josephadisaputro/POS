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

app.get('/page/:path', async function (req, res, next) {
    console.log("================================")
    console.log(req.query.pageToken)
    console.log(req.params.path)
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

app.post('/api/v1/sales-order/create', async function (req, res, next) {
    try{
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token == null){
            res.sendStatus(401)
            return
        }

        if(typeof req.body === 'object' && req.body !== null){
            res.json({
                menus: await inventoryObject
            })
        }
    }catch(e){
        res.json({
            error: e
        })
    }
})

app.listen(80, function () {
    console.log('CORS-enabled web server listening on port 80')
})