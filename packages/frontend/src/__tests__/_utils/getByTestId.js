// Given an enzyme wrapper, return the element specified by the given test id
const getByTestId = (wrapper, id) => wrapper.find(`[data-testid="${id}"]`);

export default getByTestId;
