module.exports = async function(app) {
    app.get('/core', async function(req, res) {
        let tasks = req.params['tasks'];
        console.log(tasks);
    });

    app.post('/core', async function(req, res) {
        let tasks = req.body.tasks;
        console.log(tasks);
    });
};