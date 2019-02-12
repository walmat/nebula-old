const DsmParser = require('./dsmParser');

class DsmUsParser extends DsmParser {
  constructor(request, task, proxy, logger) {
    super(request, task, proxy, logger, 'DsmUsParser');
  }

  parseProductInfoPageForHash($) {
    const regex = /\$\(\s*atob\(\s*'PGlucHV0IHR5cGU9ImhpZGRlbiIgbmFtZT0icHJvcGVydGllc1tfSEFTSF0iIC8\+'\s*\)\s*\)\s*\.val\(\s*'(.+)'\s*\)/;
    if (!regex) {
      this._logger.debug(
        '%s: Parsing for hash is not required for this site, skipping...',
        this._name,
      );
      return null;
    }
    try {
      const hashes = [];
      $('#MainContent > script').each((i, e) => {
        // should match only one, but just in case, let's loop over all possibilities
        this._logger.silly('%s: parsing script element %d for hash...', this._name, i);
        if (e.children) {
          // check to see if we can find the hash property
          const elements = regex.exec(e.children[0].data);
          if (elements) {
            this._logger.debug('%s: Found match %s', this._name, elements[0]);
            hashes.push(elements[1]);
          } else {
            this._logger.debug('%s: No match found %s', this._name, e.children[0].data);
          }
        }
      });
      switch (hashes.length) {
        case 0: {
          this._logger.debug('%s: No Hash Found, returning null...', this._name);
          return null;
        }
        case 1: {
          const [hash] = hashes;
          this._logger.debug('%s: Found 1 Hash: %s, returning...', this._name, hash);
          return hash;
        }
        default: {
          const [hash] = hashes;
          this._logger.debug(
            '%s: Found %d Hashes! using the first one: %s',
            this._name,
            hashes.length,
            hash,
          );
          return hash;
        }
      }
    } catch (err) {
      this._logger.debug(
        '%s: ERROR parsing %s hash property: %s %s',
        this._name,
        this._task.site.name,
        err.statusCode || err.status,
        err.message,
      );
      return null;
    }
  }
}

module.exports = DsmUsParser;
