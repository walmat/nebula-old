function toJSONPointerPath(pathParts) {
    return `/${pathParts.join('/')}`;
}

module.exports = function convertJoiErrorsToJSONPointer(errors) {
    return errors.details.reduce((grouped, detail) => {
        let path = toJSONPointerPath(detail.path);
        (grouped[path] = grouped[path] || [])
            .push(detail.message);
        return grouped;
    }, {});
}