const types = [
  {
    id: 1, value: 'GENERAL_PURPOSE', label: 'General Purpose', sizes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  },
  {
    id: 2, value: 'COMPUTE_OPTIMIZED', label: 'Compute Optimized', sizes: [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31],
  },
  {
    id: 3, value: 'MEMORY_OPTIMIZED', label: 'Memory Optimized', sizes: [32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45],
  },
  {
    id: 4, value: 'STORAGE_OPTIMIZED', label: 'Storage Optimized', sizes: [46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64],
  },
];

const sizes = [
  // TYPE 1 Sizes
  {
    id: 1, value: 't2.micro', label: 'T2 - Micro', types: [1],
  },
  {
    id: 2, value: 't2.small', label: 'T2 - Small', types: [1],
  },
  {
    id: 3, value: 't2.medium', label: 'T2 - Medium', types: [1],
  },
  {
    id: 4, value: 't2.large', label: 'T2 - Large', types: [1],
  },
  {
    id: 5, value: 't2.xlarge', label: 'T2 - XL', types: [1],
  },
  {
    id: 6, value: 't2.2xlarge', label: 'T2 - 2XL', types: [1],
  },
  {
    id: 7, value: 'm5d.large', label: 'M5D - Large', types: [1],
  },
  {
    id: 8, value: 'm5d.2xlarge', label: 'M5D - 2XL', types: [1],
  },
  {
    id: 9, value: 'm5d.4xlarge', label: 'M5D - 4XL', types: [1],
  },
  {
    id: 10, value: 'm5d.12xlarge', label: 'M5D - 12XL', types: [1],
  },
  {
    id: 11, value: 'm5d.24xlarge', label: 'M5D - 24XL', types: [1],
  },
  {
    id: 12, value: 'm5.large', label: 'M5 - Large', types: [1],
  },
  {
    id: 13, value: 'm5.2xlarge', label: 'M5 - 2XL', types: [1],
  },
  {
    id: 14, value: 'm5.4xlarge', label: 'M5 - 4XL', types: [1],
  },
  {
    id: 15, value: 'm5.12xlarge', label: 'M5 - 12XL', types: [1],
  },

  // TYPE 2 Sizes
  {
    id: 16, value: 'c5d.xlarge', label: 'C5D - XL', types: [2],
  },
  {
    id: 17, value: 'c5d.2xlarge', label: 'C5D - XL', types: [2],
  },
  {
    id: 18, value: 'c5d.4xlarge', label: 'C5D - XL', types: [2],
  },
  {
    id: 19, value: 'c5d.9xlarge', label: 'C5D - XL', types: [2],
  },
  {
    id: 20, value: 'c5d.18xlarge', label: 'C5D - XL', types: [2],
  },
  {
    id: 21, value: 'c5.large', label: 'C5 - Large', types: [2],
  },
  {
    id: 22, value: 'c5.xlarge', label: 'C5 - XL', types: [2],
  },
  {
    id: 23, value: 'c5.2xlarge', label: 'C5 - 2XL', types: [2],
  },
  {
    id: 24, value: 'c5.4xlarge', label: 'C5 - 4XL', types: [2],
  },
  {
    id: 25, value: 'c5.9xlarge', label: 'C5 - 9XL', types: [2],
  },
  {
    id: 26, value: 'c5.18xlarge', label: 'C5 - 18XL', types: [2],
  },
  {
    id: 27, value: 'c4.large', label: 'C4 - Large', types: [2],
  },
  {
    id: 28, value: 'c4.xlarge', label: 'C4 - XL', types: [2],
  },
  {
    id: 29, value: 'c4.2xlarge', label: 'C4 - 2XL', types: [2],
  },
  {
    id: 30, value: 'c4.4xlarge', label: 'C4 - 4XL', types: [2],
  },
  {
    id: 31, value: 'c4.8xlarge', label: 'C4 - 8XL', types: [2],
  },

  // TYPE 3 Sizes
  {
    id: 32, value: 'r4.large', label: 'R4 - Large', types: [3],
  },
  {
    id: 33, value: 'r4.xlarge', label: 'R4 - XL', types: [3],
  },
  {
    id: 34, value: 'r4.2xlarge', label: 'R4 - 2XL', types: [3],
  },
  {
    id: 35, value: 'r4.4xlarge', label: 'R4 - 4XL', types: [3],
  },
  {
    id: 36, value: 'r4.8xlarge', label: 'R4 - 8XL', types: [3],
  },
  {
    id: 37, value: 'r4.16xlarge', label: 'R4 - 16XL', types: [3],
  },
  {
    id: 38, value: 'x1.16xlarge', label: 'X1 - 16XL', types: [3],
  },
  {
    id: 39, value: 'x1e.xlarge', label: 'X1E - XL', types: [3],
  },
  {
    id: 40, value: 'x1e.2xlarge', label: 'X1E - 2XL', types: [3],
  },
  {
    id: 41, value: 'x1e.4xlarge', label: 'X1E - 4XL', types: [3],
  },
  {
    id: 42, value: 'x1e.8xlarge', label: 'X1E - 8XL', types: [3],
  },
  {
    id: 43, value: 'x1e.16xlarge', label: 'X1E - 16XL', types: [3],
  },
  {
    id: 44, value: 'x1e.32xlarge', label: 'X1E - 32XL', types: [3],
  },
  {
    id: 45, value: 'x1.32xlarge', label: 'X1 - 32XL', types: [3],
  },

  // TYPE 4 Sizes
  {
    id: 46, value: 'd2.xlarge', label: 'D2 - XL', types: [4],
  },
  {
    id: 47, value: 'd2.2xlarge', label: 'D2 - 2XL', types: [4],
  },
  {
    id: 48, value: 'd2.4xlarge', label: 'D2 - 4XL', types: [4],
  },
  {
    id: 49, value: 'd2.8xlarge', label: 'D2 - 8XL', types: [4],
  },
  {
    id: 50, value: 'i2.xlarge', label: 'I2 - XL', types: [4],
  },
  {
    id: 51, value: 'i2.2xlarge', label: 'I2 - 2XL', types: [4],
  },
  {
    id: 52, value: 'i2.4xlarge', label: 'I2 - 4XL', types: [4],
  },
  {
    id: 53, value: 'i2.8xlarge', label: 'I2 - 8XL', types: [4],
  },
  {
    id: 54, value: 'h1.2xlarge', label: 'H1 - 2XL', types: [4],
  },
  {
    id: 55, value: 'h1.4xlarge', label: 'H1 - 4XL', types: [4],
  },
  {
    id: 56, value: 'h1.8xlarge', label: 'H1 - 8XL', types: [4],
  },
  {
    id: 57, value: 'h1.16xlarge', label: 'H1 - 16XL', types: [4],
  },
  {
    id: 58, value: 'i3.large', label: 'I3 - Large', types: [4],
  },
  {
    id: 59, value: 'i3.xlarge', label: 'I3 - XL', types: [4],
  },
  {
    id: 60, value: 'i3.2xlarge', label: 'I3 - 2XL', types: [4],
  },
  {
    id: 61, value: 'i3.4xlarge', label: 'I3 - 4XL', types: [4],
  },
  {
    id: 62, value: 'i3.8xlarge', label: 'I3 - 8XL', types: [4],
  },
  {
    id: 63, value: 'i3.16xlarge', label: 'I3 - 16XL', types: [4],
  },
  {
    id: 64, value: 'i3.metal', label: 'I3 - Metal', types: [4],
  },
];

const locations = [
  { id: 1, value: 'USE_NV', label: 'US East (N. Virginia)' },
  { id: 2, value: 'USE_OO', label: 'US East (Ohio)' },
  { id: 3, value: 'USW_NC', label: 'US West (N. California' },
  { id: 4, value: 'USW_ON', label: 'US West (Oregon)' },
  { id: 5, value: 'AP_MI', label: 'Asia Pacific (Mumbai)' },
  { id: 6, value: 'AP_SL', label: 'Asia Pacific (Seoul)' },
  { id: 7, value: 'AP_SE', label: 'Asia Pacific (Singapore)' },
  { id: 8, value: 'AP_SY', label: 'Asia Pacific (Sydney)' },
  { id: 9, value: 'AP_TO', label: 'Asia Pacific (Tokyo)' },
  { id: 10, value: 'CA_CEN', label: 'Canada (Central)' },
  { id: 11, value: 'EU_FT', label: 'EU (Frankfurt)' },
  { id: 12, value: 'EU_ID', label: 'EU (Ireland)' },
  { id: 13, value: 'EU_LN', label: 'EU (London)' },
  { id: 14, value: 'EU_PS', label: 'EU (Paris)' },
  { id: 15, value: 'SA_SP', label: 'South America (Sao Paolo)' },
];

const serverFieldOptions = {
  types,
  sizes,
  locations,
};
export default serverFieldOptions;
