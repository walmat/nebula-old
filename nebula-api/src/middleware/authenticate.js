const jwt = require('jsonwebtoken');

async function isValidUser(discordId, registrationKey) {
    let params = {
        TableName : 'Users',
        KeyConditionExpression: '#discordId = :discordId AND #registrationKey = :registrationKey',
        ExpressionAttributeNames:{
            '#discordId': 'discordId',
            '#registrationKey': 'registrationKey'
        },
        ExpressionAttributeValues: {
            ":discordId": discordId,
            ":registrationKey": registrationKey
        }
    };
    let result = await docClient.query(params).promise();
    return result.Items.length;
}

module.exports = async function(req, res, next) {
    let token = req.headers['x-access-token'];

    if (!token) {
        return res.status(401).json({
            error: {
                name: 'NoJWTProvided',
                message: 'No auth token provided'
            }
        });
    }

    jwt.verify(token, process.env.NEBULA_API_JWT_SECERT, async function(error, decoded) {
        if (error) {
            return res.status(401).json({
                error
            });
        }

        let discordId = decoded.discordId;
        let registrationKey = decoded.registrationKey;

        if (await isValidUser(discordId, registrationKey)) {
            let user = {
                discordId,
                registrationKey
            }
            return next(user);
        }

        return res.status(404).send({
            error: {
                name: 'InvalidUser',
                message: 'Not a valid user'
            }
        });
    });

};