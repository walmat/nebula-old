const dynamodb = require('../../../db.config');
const docClient = dynamodb.DocumentClient();

const validateTask = require('./validateTask');

module.exports = function(app) {
    app.get('/tasks', async function(req, res) {
        if (req.statusCode === 200) {
            let params = {
                TableName: 'tasks',
                Key: {
                    registrationKey: req.registrationKey,
                    taskNum: req.taskNum
                }
            };
            let result = await docClient.get(params).promise();
            return res.send(result);
        }
    });

    app.post('/tasks', async function(req, res) {
        if (req.statusCode === 200) {
            let taskData = req.body;
            let validation = validateTask(taskData);

            if (validation.fail) {
                console.log(validation.fail);
                res.status(400);
                return res.send({
                    message: 'Invalid Task',
                    errors: validation.fail
                });
            }

            let params = {
                TableName: 'tasks',
                Item: taskData
            };
            let result = await docClient.put(params).promise();
            return res.send(result);
        } else {
            // return the req status code and do something with it
            return res.send(req.statusCode);
        }
    });
};