# TODO

[x] Allow only a single database/table
  [x] database `--db test,hello`
  [x] Prevent connection if database is passed that is not allowed (Throw error)
  [x] tables `--table people, trains`, `--table test.people, hello.trains`
  [ ] Prevent `r.args`
  [ ] Prevent getting the dbName, tableName dynamically
[ ] README
  [ ] Wrap allow around code
  [ ] Add api links to docs
[ ] API
  [ ] Better name for allowSysDbAccess
[ ] Test changefeeds
[ ] Test cursors

## Future

[ ] Use from browser
  [ ] Replace `net` library with websockets
[ ] Authentication
[ ] Convert queries back to strings. Re-build AST.

### Done

[x] Refactor
  [x] Refactor code so that it uses classes
  [x] Break up codes into more modular structure
[x] Opt-in Options:
  [x] Allow Insert `--allow-insert`
  [x] Allow Delete`--allow-delete`
  [x] Allow Update`--allow-update`
  [x] Allow Database Create `--allow-db-create`
  [x] Database Drop `--allow-db-drop`
  [x] Table Creation `--allow-table-create`
  [x] Table Drop `--allow-table-drop`
  [x] HTTP `--allow-http`
  [x] JavaScript `--allow-javascript`
  [x] Reconfigure `--allow-reconfigure`
  [x] Rebalance `--allow-rebalance`
[x] Add token/connection parser
[x] Prevent `insert`, `update`, `replace`, `delete`
[x] Fix corner cases
  [x] `update` with `null`: does nothing.
  [x] `update` with `r.literal()`: throws Error.
  [x] `insert` with `conflict: replace`. `allowReplace` must be allowed.
  [x] `insert` with `conflict: replace` with `null` will deleted the document. `allowDelete` must be allowed. (Throw error)
  [x] `insert` with `conflict: update`. `allowUpdate` must be allowed.
  [x] `replace` with `null` deletes the document.
  [x] `replace` with `r.literal`: Throws error.


#
