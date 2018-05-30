/**
 * Container for all state reducers. Reducers are available in their specific
 * files, this is just a shared import point.
 */
import { combineReducers } from 'redux'
import { locationReducer } from './profiles/LocationReducer';

 const topLevelReducer = combineReducers({
   shipping: locationReducer
 });

export default topLevelReducer;
