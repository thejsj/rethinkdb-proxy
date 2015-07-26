# TODO

[x] Add token/connection parser
[x] Prevent `insert`, `update`, `replace`, `delete`
[ ] Allow only a single database/table
  [ ] database `--db test,hello`
  [ ] tables `--table people, trains`, `--table test.people, hello.trains`
[ ] Opt-in Options:
  [ ] Allow Insert `--allow-insert`
  [ ] Allow Delete`--allow-delete`
  [ ] Allow Update`--allow-update`
  [ ] Allow Database Create `--allow-db-create`
  [ ] Database Drop `--allow-db-drop`
  [ ] Table Creation `--allow-table-create`
  [ ] Table Drop `--allow-table-drop`
  [ ] HTTP `--allow-http`
  [ ] JavaScript `--allow-javascript`
  [ ] Reconfigure `--allow-reconfigure`
  [ ] Rebalance `--allow-rebalance`

### Future

[ ] Use from browser
  [ ] Replace `net` library
[ ] Convert queries back to strings. Re-build AST.
[ ] Authentication
