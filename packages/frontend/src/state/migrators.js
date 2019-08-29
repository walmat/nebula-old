import semver from 'semver';

// TODO: Are there better names for these? Not exactly sure how to name versioned variables.
// For now, this is the best I can do, but we have to disable the eslint for camelcase
/* eslint-disable camelcase */
import v0_0_0_migrator from './migrators/v0.0.0';
import v0_1_0_migrator from './migrators/v0.1.0';
import v0_1_1_migrator from './migrators/v0.1.1';
import v0_2_0_migrator from './migrators/v0.2.0';
import v0_2_1_migrator from './migrators/v0.2.1';
import v0_3_0_migrator from './migrators/v0.3.0';
import v0_3_1_migrator from './migrators/v0.3.1';
import v0_4_0_migrator from './migrators/v0.4.0';
import v0_5_0_migrator from './migrators/v0.5.0';
import v0_6_0_migrator from './migrators/v0.6.0';
import v0_6_1_migrator from './migrators/v0.6.1';
import v0_7_0_migrator from './migrators/v0.7.0';
import v0_7_1_migrator from './migrators/v0.7.1';
import v0_7_2_migrator from './migrators/v0.7.2';
import v0_7_3_migrator from './migrators/v0.7.3';
import v0_7_4_migrator from './migrators/v0.7.4';

/* eslint-enable camelcase */

const trackedMigrators = {
  '0.0.0': v0_0_0_migrator,
  '0.1.0': v0_1_0_migrator,
  '0.1.1': v0_1_1_migrator,
  '0.2.0': v0_2_0_migrator,
  '0.2.1': v0_2_1_migrator,
  '0.3.0': v0_3_0_migrator,
  '0.3.1': v0_3_1_migrator,
  '0.4.0': v0_4_0_migrator,
  '0.5.0': v0_5_0_migrator,
  '0.6.0': v0_6_0_migrator,
  '0.6.1': v0_6_1_migrator,
  '0.7.0': v0_7_0_migrator,
  '0.7.1': v0_7_1_migrator,
  '0.7.2': v0_7_2_migrator,
  '0.7.3': v0_7_3_migrator,
  '0.7.4': v0_7_4_migrator,
};

const getInitialState = () => {
  const versions = Object.keys(trackedMigrators).sort((a, b) => (semver.gt(a, b) ? 1 : -1));
  const latest = versions[versions.length - 1];
  return trackedMigrators[latest]();
};

export const initialState = getInitialState();

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
 *                      NOTE: this is exposed for testing purposes and should
 *                      not be used in production the default value includes all
 *                      tracked versions for use in production.
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
  } else if (!state) {
    // If no state is given use the latest version's migrator to create an initial state tree.
    // This shortciruits the process of creating a redundant chain when the last migrator
    // is all we need.
    startVersion = versions[versions.length - 1];
    // Call the migrator with no state so we get the initial values
    return migrators[startVersion]();
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
