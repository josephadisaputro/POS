const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')
require('dotenv').config()

class Token{
    constructor() {
        this.secret = process.env.jwtSecretKey;
    }

    async getNewUUID(){
        const myUUID = uuidv4();
        return myUUID;
    }
    
    async getNewJWTToken(payload){
        try {
            return jwt.sign(payload, this.secret, { expiresIn: 900000 });
        } catch (err) {
            console.log('Failed generating new token: ', err);
            return err;
        }
    }

    async verifyToken(token) {
        try {
            return jwt.verify(token, this.secret);
        } catch (err) {
            console.log('Token verification failed: ', err);
            return err;
        }
    }
}
module.exports = Token;