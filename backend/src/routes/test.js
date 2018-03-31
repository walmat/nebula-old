module.exports = function(app) {
    app.route('/test').get(() => {
        console.log('Someone hit me');
    })
}