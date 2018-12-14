/* global describe it test expect jest */
import configureStore from '../../state/configureStore';

describe('configure store', () => {
  it('should return a store', () => {
    const store = configureStore();
    expect(store.getState).toBeDefined();
    expect(store.dispatch).toBeDefined();
  });
});
