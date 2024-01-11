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
            // jwt.sign() creates a new token with the given payload.
            // The token is set to expire 900 seconds (15 minutes) after it's issued.
            return jwt.sign(payload, this.secret, { expiresIn: 900 });
        } catch (err) {
            // If there's an error when generating the token, it's caught here.
            console.log('Failed generating new token: ', err);
            // The error is returned by your function.
            return err;
        }
    }
    
    async checkAndRenewToken(token) {
        try {
            // Verify the token. If it's not valid, jwt.verify() will throw an error.
            const decoded = jwt.verify(token, this.secret);
            
            // If the token is valid, renew it for another 15 minutes.
            const newToken = jwt.sign(decoded, this.secret, { expiresIn: 900 });
            
            return newToken;
        } catch (err) {
            // If the token is not valid (e.g., it's expired), log the error and return it.
            console.log('Token verification failed: ', err);
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