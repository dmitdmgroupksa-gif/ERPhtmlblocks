"""The live ERP Server Script sandbox has no _unpack_sequence_ guard: `a, b = f()` raises
NameError: name '_unpack_sequence_' is not defined (CEO Command Centre overview/approvals, 17 Nov 2026).
Loop and comprehension unpacking (`for a, b in ...`) use _iter_unpack_sequence_, which exists."""
import ast
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[3]


def scripts():
    for p in sorted(ROOT.glob("[01]*/**/server_scripts/*.py")) + sorted(ROOT.glob("[01]*/**/install/*.py")):
        if "legacy" not in p.parts:
            yield p


def unpacking_lines(source):
    tree = ast.parse(source)
    return sorted(n.lineno for n in ast.walk(tree)
                  if isinstance(n, ast.Assign) and any(isinstance(t, (ast.Tuple, ast.List)) for t in n.targets))


def test_no_tuple_unpacking_assignment_in_server_scripts():
    bad = {p.relative_to(ROOT).as_posix(): unpacking_lines(p.read_text(encoding="utf-8")) for p in scripts()}
    bad = {k: v for k, v in bad.items() if v}
    assert bad == {}


def test_checker_sees_the_failing_pattern():
    assert unpacking_lines("a, b = f()\nfor x, y in z:\n    pass\n") == [1]
