import { PROFILE_ACTIONS } from '../../actions';

// TODO this is only temporary until we get registration key stuff implemented
// profile.registrationKey = process.env.REACT_APP_REGISTRATION_KEY

// TEMPERARILY DISABLED FOR TESTING
/* Store the profile in the db */
// try {
//     let response = await fetch('http://localhost:8080/profiles',
//     {
//         method: "POST",
//         headers: {
//             'Accept': 'application/json',
//             'Content-Type': 'application/json'
//         },
//         body: JSON.stringify(profile)
//     });

//     let result = await response.json();
//     if (!result.ok) {
//         // TODO: Deal with this
//     }
// } catch (err) {
//     console.log(err);
// }

// Temporarily return same thing with a timeout.
const _addProfile = profile => new Promise((resolve) => {
  setTimeout(() => {
    resolve(Object.assign({}, profile));
  }, 1000);
});

// TODO this is only temporary until we get registration key stuff implemented
// profile.registrationKey = process.env.REACT_APP_REGISTRATION_KEY

// TEMPORARILY DISABLED FOR TESTING
/* Update the profile in the db */
// try {
//     let response = await fetch('http://localhost:8080/profiles',
//     {
//         method: "PATCH",
//         headers: {
//             'Accept': 'application/json',
//             'Content-Type': 'application/json'
//         },
//         body: JSON.stringify({
//             profile: profile,
//             id: id,
//         }),
//     });

//     let result = await response.json();
//     if (!result.ok) {
//         // TODO: Deal with this
//     }
// } catch (err) {
//     console.log(err);
// }

// Temporarily return same thing with a timeout.
const _updateProfile = async (profile, id) => new Promise((resolve) => {
  setTimeout(() => {
    resolve(Object.assign({}, profile));
  }, 1000);
});

// TODO this is only temporary until we get registration key stuff implemented
// profile.registrationKey = process.env.REACT_APP_REGISTRATION_KEY
// TEMPORARILY DISABLED FOR TESTING
/* Store the profile in the db */
// try {
//     let response = await fetch('http://localhost:8080/profiles',
//     {
//         method: "DELETE",
//         headers: {
//             'Accept': 'application/json',
//             'Content-Type': 'application/json'
//         },
//         body: JSON.stringify({
//             id: id,
//         }),
//     });

//     let result = await response.json();
//     if (!result.ok) {
//         // TODO: Deal with this
//     }
// } catch (err) {
//     console.log(err);
// }

// Temporarily return same thing with a timeout.
const _deleteProfile = async id => new Promise((resolve) => {
  setTimeout(() => {
    resolve(id);
  }, 1000);
});

const profileFormApiMiddleware = store => next => (action) => {
  // Only Intercept actions that interact with the profile page and
  // require an api endpoint to be called
  if (action.type !== PROFILE_ACTIONS.ADD &&
    action.type !== PROFILE_ACTIONS.EDIT &&
    action.type !== PROFILE_ACTIONS.UPDATE) {
    return next(action);
  }

  // If we already have a response, continue on to the next middleware
  if (action.response !== undefined) {
    return next(action);
  }

  // If Validation Errors, Set a response and move on to next middleware.
  if (action.errors !== undefined) {
    const newAction = JSON.parse(JSON.stringify(action));
    newAction.response = {
      errorType: 'VALIDATION',
      error: 'Validation Errors, please correct and try again!',
    };
    return next(newAction);
  }

  switch (action.type) {
    case PROFILE_ACTIONS.ADD: {
      _addProfile(action.profile).then((newProfile) => {
        const newAction = Object.assign({}, action, {
          response: newProfile,
        });
        store.dispatch(newAction);
      });
      break;
    }
    case PROFILE_ACTIONS.UPDATE: {
      _updateProfile(action.profile, action.editId).then((newProfile) => {
        const newAction = Object.assign({}, action, {
          response: newProfile,
        });
        store.dispatch(newAction);
      });
      break;
    }
    case PROFILE_ACTIONS.REMOVE: {
      _deleteProfile(action.id).then((id) => {
        const newAction = Object.assign({}, action, {
          response: id,
        });
        store.dispatch(newAction);
      });
      break;
    }
    default:
      // Not a relevant action -- pass on to the next middleware
      return next(action);
  }

  return null;
};

export default profileFormApiMiddleware;
