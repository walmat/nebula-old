import prevState from '../v0.0.0/state';

/**
 * v0.1.0 State
 *
 * This state represents the first "versioned" state. Nothing
 * changes with this version except the addition of a "version"
 * key at the root of the state tree. This tag represents a valid
 * semver version that is used by migrators to identify the current
 * state of the tree and upgrade the tree to the latest.
 */
export default {
  version: '0.1.0',
  ...prevState,
};
