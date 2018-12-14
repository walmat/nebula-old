var Recaptcha = require('recaptcha-verify');

app.get('/captcha', function(req, res){
    // get the user response (from reCAPTCHA)
    var userResponse = req.query['g-recaptcha-response'];

    var recaptcha = new Recaptcha({
        secret: req.secretKey,
        verbose: true
    });
 
    recaptcha.checkResponse(userResponse, function(error, response){
        if(error){
            // an internal error?
            res.status(400).render('400', {
                message: error.toString()
            });
            return;
        }
        if(response.success){
            res.status(200).send('the user is a HUMAN :)');
            // save session.. create user.. save form data.. render page, return json.. etc.
        }else{
            res.status(200).send('the user is a ROBOT :(');
            // show warning, render page, return a json, etc.
        }
    });
});