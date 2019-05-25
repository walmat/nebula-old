/* global describe it expect beforeEach */
import getAllSizes, {
  getSize,
  getCategory,
  buildSizesForCategory,
} from '../../constants/getAllSizes';

describe('getAllSizes', () => {
  let expectedSizes;

  beforeEach(() => {
    expectedSizes = [
      {
        label: 'Generic',
        options: [{ value: 'OS', label: 'One Size' }, { value: 'Random', label: 'Random' }],
      },
      {
        label: 'Clothing',
        options: [
          { value: 'CL FSR', label: 'Full Size Run' },
          { value: 'XXS', label: 'Extra Extra Small' },
          { value: 'XS', label: 'Extra Small' },
          { value: 'S', label: 'Small' },
          { value: 'M', label: 'Medium' },
          { value: 'L', label: 'Large' },
          { value: 'XL', label: 'Extra Large' },
          { value: 'XXL', label: 'Extra Extra Large' },
        ],
      },
      {
        label: "US/UK Men's",
        options: [
          { value: 'FSR', label: 'Full Size Run' },
          { value: 'BS', label: 'Bae Sizes' },
          { value: '4', label: '4.0' },
          { value: '4.5', label: '4.5' },
          { value: '5', label: '5.0' },
          { value: '5.5', label: '5.5' },
          { value: '6', label: '6.0' },
          { value: '6.5', label: '6.5' },
          { value: '7', label: '7.0' },
          { value: '7.5', label: '7.5' },
          { value: '8', label: '8.0' },
          { value: '8.5', label: '8.5' },
          { value: '9', label: '9.0' },
          { value: '9.5', label: '9.5' },
          { value: '10', label: '10.0' },
          { value: '10.5', label: '10.5' },
          { value: '11', label: '11.0' },
          { value: '11.5', label: '11.5' },
          { value: '12', label: '12.0' },
          { value: '12.5', label: '12.5' },
          { value: '13', label: '13.0' },
          { value: '13.5', label: '13.5' },
          { value: '14', label: '14.0' },
          { value: '14.5', label: '14.5' },
          { value: '15', label: '15.0' },
          { value: '16', label: '16.0' },
          { value: '17', label: '17.0' },
          { value: '18', label: '18.0' },
        ],
      },
      // TODO: add this back in when multi region size support is available
      // {
      //   label: "UK Men's",
      //   options: [
      //     { value: 'UK FSR', label: 'Full Size Run' },
      //     { value: '3.5', label: '3.5' },
      //     { value: '4', label: '4' },
      //     { value: '4.5', label: '4.5' },
      //     { value: '5', label: '5.0' },
      //     { value: '5.5', label: '5.5' },
      //     { value: '6', label: '6.0' },
      //     { value: '6.5', label: '6.5' },
      //     { value: '7', label: '7.0' },
      //     { value: '7.5', label: '7.5' },
      //     { value: '8', label: '8.0' },
      //     { value: '8.5', label: '8.5' },
      //     { value: '9', label: '9.0' },
      //     { value: '9.5', label: '9.5' },
      //     { value: '10', label: '10.0' },
      //     { value: '10.5', label: '10.5' },
      //     { value: '11', label: '11.0' },
      //     { value: '11.5', label: '11.5' },
      //     { value: '12', label: '12.0' },
      //     { value: '12.5', label: '12.5' },
      //     { value: '13', label: '13.0' },
      //     { value: '13.5', label: '13.5' },
      //     { value: '14', label: '14.0' },
      //     { value: '14.5', label: '14.5' },
      //     { value: '15', label: '15.0' },
      //     { value: '16', label: '16.0' },
      //     { value: '17', label: '17.0' },
      //   ],
      // },
      {
        label: "EU Men's",
        options: [
          { value: 'EU FSR', label: 'Full Size Run' },
          { value: '36', label: '36' },
          { value: '36 1/3', label: '36 1/3' },
          { value: '36 1/2', label: '36 1/2' },
          { value: '36 2/3', label: '36 2/3' },
          { value: '37', label: '37' },
          { value: '37 1/3', label: '37 1/3' },
          { value: '37 1/2', label: '37 1/2' },
          { value: '37 2/3', label: '37 2/3' },
          { value: '38', label: '38' },
          { value: '38 1/3', label: '38 1/3' },
          { value: '38 1/2', label: '38 1/2' },
          { value: '38 2/3', label: '38 2/3' },
          { value: '39', label: '39' },
          { value: '39 1/3', label: '39 1/3' },
          { value: '39 1/2', label: '39 1/2' },
          { value: '39 2/3', label: '39 2/3' },
          { value: '40', label: '40' },
          { value: '40 1/3', label: '40 1/3' },
          { value: '40 1/2', label: '40 1/2' },
          { value: '40 2/3', label: '40 2/3' },
          { value: '41', label: '41' },
          { value: '41 1/3', label: '41 1/3' },
          { value: '41 1/2', label: '41 1/2' },
          { value: '41 2/3', label: '41 2/3' },
          { value: '42', label: '42' },
          { value: '42 1/3', label: '42 1/3' },
          { value: '42 1/2', label: '42 1/2' },
          { value: '42 2/3', label: '42 2/3' },
          { value: '43', label: '43' },
          { value: '43 1/3', label: '43 1/3' },
          { value: '43 1/2', label: '43 1/2' },
          { value: '43 2/3', label: '43 2/3' },
          { value: '44', label: '44' },
          { value: '44 1/3', label: '44 1/3' },
          { value: '44 1/2', label: '44 1/2' },
          { value: '44 2/3', label: '44 2/3' },
          { value: '45', label: '45' },
          { value: '45 1/3', label: '45 1/3' },
          { value: '45 1/2', label: '45 1/2' },
          { value: '45 2/3', label: '45 2/3' },
          { value: '46', label: '46' },
          { value: '46 1/3', label: '46 1/3' },
          { value: '46 1/2', label: '46 1/2' },
          { value: '46 2/3', label: '46 2/3' },
          { value: '47', label: '47' },
          { value: '47 1/3', label: '47 1/3' },
          { value: '47 1/2', label: '47 1/2' },
          { value: '47 2/3', label: '47 2/3' },
          { value: '48', label: '48' },
          { value: '48 1/3', label: '48 1/3' },
          { value: '48 1/2', label: '48 1/2' },
          { value: '48 2/3', label: '48 2/3' },
          { value: '49', label: '49' },
          { value: '49 1/3', label: '49 1/3' },
          { value: '49 1/2', label: '49 1/2' },
          { value: '49 2/3', label: '49 2/3' },
        ],
      },
    ];
  });

  it('should return all sizes correctly', () => {
    expect(getAllSizes()).toEqual(expectedSizes);
  });

  it('should return correct category', () => {
    expectedSizes.forEach(category => expect(getCategory(category.label)).toEqual(category));
  });

  it('should lookup correct size categories', () => {
    expectedSizes.forEach(category => {
      const expectedSizeGroups = category.options.filter(
        ({ label }) => label !== 'Random' && label !== 'Full Size Run' && label !== 'Bae Sizes',
      );
      expect(buildSizesForCategory(category.label)).toEqual(expectedSizeGroups);
    });
  });

  it('should lookup the correct sizes', () => {
    expectedSizes.forEach(category => {
      category.options.forEach(size => {
        expect(getSize(size.label, category.label)).toEqual(size.label);
      });
    });
  });

  test("should build the correct sizes for US/UK Men's category", () => {
    const category = "US/UK Men's";

    const expected = expectedSizes[2].options.filter(
      s => s.label !== 'Random' && s.label !== 'Full Size Run' && s.label !== 'Bae Sizes',
    );
    const actual = buildSizesForCategory(category);
    expect(actual).toEqual(expected);
  });

  test('should build the correct sizes for Clothing category', () => {
    const category = 'Clothing';

    const expected = expectedSizes[1].options.filter(
      s => s.label !== 'Random' && s.label !== 'Full Size Run',
    );
    const actual = buildSizesForCategory(category);
    expect(actual).toEqual(expected);
  });

  test("should build the correct sizes for EU Men's category", () => {
    const category = "EU Men's";

    const expected = expectedSizes[3].options.filter(
      s => s.label !== 'Random' && s.label !== 'Full Size Run',
    );
    const actual = buildSizesForCategory(category);
    expect(actual).toEqual(expected);
  });

  test('should build the correct sizes for Generic category', () => {
    const category = 'Generic';

    const expected = expectedSizes[0].options.filter(
      s => s.label !== 'Random' && s.label !== 'Full Size Run',
    );
    const actual = buildSizesForCategory(category);
    expect(actual).toEqual(expected);
  });
});
