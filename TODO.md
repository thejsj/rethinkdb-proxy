# TODO

[ ] Allow only a single database/table
  [ ] database `--db test,hello`
  [ ] tables `--table people, trains`, `--table test.people, hello.trains`

### Future

[ ] Use from browser
  [ ] Replace `net` library with websockets
[ ] Authentication
[ ] Convert queries back to strings. Re-build AST.

### Done

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
