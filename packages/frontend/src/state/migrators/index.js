import semver from 'semver';

// TODO: Are there better names for these? Not exactly sure how to name versioned variables.
// For now, this is the best I can do, but we have to disable the eslint for camelcase
/* eslint-disable camelcase */
import v0_0_0_migrator from './v0.0.0/migrator';
import v0_1_0_migrator from './v0.1.0/migrator';
/* eslint-enable camelcase */

const trackedMigrators = {
  '0.0.0': v0_0_0_migrator,
  '0.1.0': v0_1_0_migrator,
};

/**
 * Top Level Migrator
 *
 * This migrator combines all the lower level migrators to fully migrate a state
 * from its current version to the latest version. If the state doesn't exist or
 * the state doesn't have a version, it will start at the earliest version and
 * receive all migration changes
 *
 * @param {*} state given state to migrate
 * @param {*} migrators a map of migrators keyed by valid semver versions.
 *                      NOTE: this is exposed for
 *                      testing purposes and should not be used in production
 *                      the default valud includes all tracked versions for use
 *                      in production.
 * @return a state valid with the latest tracked version
 */
const topLevelMigrator = (state, migrators = trackedMigrators) => {
  // Sort versions by semver so we can access migrators sequentially
  // ASSUME: there are no equal semvers in the migrators map
  const versions = Object.keys(migrators).sort((a, b) => (semver.gt(a, b) ? 1 : -1));
  // Assign a starting version
  let startVersion = '0.0.0';
  if (state && state.version) {
    startVersion = state.version;
  }

  // Make sure version exists in our tracked versions before performing migration
  let startIndex = versions.indexOf(startVersion);
  if (startIndex === -1) {
    throw new Error(
      `Invalid Version! The given state's version (${startVersion})` +
        'was not found in the list of versions tracked for migration. Not attempting' +
        'to migrate the state',
    );
  }

  // If the start version is anything other than 0.0.0, we assume the given state
  // is a valid state of that version. Thus, we don't need to run the migrator at
  // that index. Instead, we should start 1 migrator later.
  //
  // Ex: if the startVersion is '0.1.0', we already have a valid 0.1.0 state, so
  // there is no need to run the 0.1.0 migrator. Instead, we should start at the
  // next migrator available.
  if (startVersion !== '0.0.0') {
    startIndex += 1;
  }

  // Generate the subset of migrators to run on the given state
  const migratorsToRun = versions.slice(startIndex);

  // Sequentially call the migrators to end up at our final migrated state
  return migratorsToRun.reduce((currentState, version) => migrators[version](currentState), state);
};

export default topLevelMigrator;
