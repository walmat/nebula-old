const Recaptcha = require('recaptcha-verify');

function setupCaptchaRoutes(app) {
  app.get('/captcha', (req, res) => {
    // get the user response (from reCAPTCHA)
    const userResponse = req.query['g-recaptcha-response'];

    const recaptcha = new Recaptcha({
      secret: req.secretKey,
      verbose: true,
    });

    recaptcha.checkResponse(userResponse, (error, response) => {
      if (error) {
        // an internal error?
        res.status(400).render('400', {
          message: error.toString(),
        });
        return;
      }
      if (response.success) {
        res.status(200).send('the user is a HUMAN :)');
        // save session.. create user.. save form data.. render page, return json.. etc.
      } else {
        res.status(200).send('the user is a ROBOT :(');
        // show warning, render page, return a json, etc.
      }
    });
  });
}

module.exports = setupCaptchaRoutes;
