Version 1.3.9:

- Fixed some frontend state discrepencies
  - PROFILES
    - Deleting a profile now removes it from:
      - Selected profile in create task modal
      - Selected profile in shipping manager
    - Updating a profile now updates it in:
      - Create task modal (if updated profile was selected)
      - Shipping manager (if updated profile was selected)
  - ACCOUNTS
    - Deleting an account now removes it from:
      - Selected account in create task modal
    - Updating an account now updates it in:
      - Create task modal (if account was selected)
- Added cross-region Supreme form generator/parser
- Added faster restock mode
- Small Shopify updates (PLEASE DO NOT RUN UNTIL I SAY TO DO SO)