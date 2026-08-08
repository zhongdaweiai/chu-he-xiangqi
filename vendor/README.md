# Vendored rules core

`vendor/xiangqiops` contains the runtime rule modules from `xiangqiops` 1.0.10.
Only the rule engine is included; its unrelated `chessgroundxx` build dependency
is intentionally omitted. The upstream license is included alongside the code.

Local correctness patches fix upstream attack detection that treated pawns as
bishops and advisors, and enforce the river boundary for bishops.
