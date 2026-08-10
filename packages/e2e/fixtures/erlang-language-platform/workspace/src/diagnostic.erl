-module(diagnostic).
-export([main/0]).

main() ->
    missing_module:missing_function().
