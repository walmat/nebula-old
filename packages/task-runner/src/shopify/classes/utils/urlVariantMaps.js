// Generate the correct "option<index>" from the optionIndex map
const urlToVariantOption = (site) => {
    return `option${site.sizeOptionIndex}`;
};

// Generate the correct title segment test for the site
const urlToTitleSegment = (site, title) => {
    // split the title into segments based the `/` delimiter
    const segments = title.split('/');
    // Check if we have a valid number of segments
    if (segments.length >= site.sizeOptionIndex) {
        // return the correct 0-indexed segment (trimming the surrounding whitespace)
        return segments[site.sizeOptionIndex - 1].trim();
    }
    // Invalid segment length, return null
    return null;
}

const validateVariantSize = (variant, expectedSize, url) => {
    return variant[urlToVariantOption[url]].trim().includes(expectedSize.trim()) ||
        urlToVariantOption[url].trim().includes(expectedSize.trim());
}

module.exports = {
    urlToTitleSegment,
    urlToVariantOption,
    validateVariantSize,
};
