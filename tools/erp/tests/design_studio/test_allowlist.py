"""Graphic Design Studio scripts may only use what Frappe v14.100's Server Script sandbox provides.

Allowlists copied from ceopanel integrations/frappe/tests/test_sandbox_allowlist.py (frappe/utils/safe_exec.py
v14.100.0). This site also rejects augmented assignment (+=) and del, so those are checked too.
"""
import ast
import builtins
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[4]
GDS = ROOT / "10. Communication & Productivity" / "Graphic Design Studio"
CHECKED = [GDS / "server_scripts" / "design_studio_api.py", GDS / "install" / "install_design_studio.py"]

FRAPPE = {
    "call", "flags", "format", "format_value", "date_format", "time_format", "format_date", "form_dict",
    "bold", "copy_doc", "errprint", "qb", "get_meta", "new_doc", "get_doc", "get_mapped_doc",
    "get_last_doc", "get_cached_doc", "get_list", "get_all", "get_system_settings", "rename_doc",
    "delete_doc", "utils", "get_url", "render_template", "msgprint", "throw", "sendmail", "get_print",
    "attach_print", "user", "get_fullname", "get_gravatar", "full_name", "request", "session",
    "make_get_request", "make_post_request", "make_put_request", "make_patch_request",
    "make_delete_request", "socketio_port", "get_hooks", "enqueue", "sanitize_html", "log_error",
    "log", "db", "lang", "response",
}
DB = {
    "get_list", "get_all", "get_value", "set_value", "get_single_value", "get_default", "exists",
    "count", "escape", "sql", "commit", "rollback", "add_index",
}
SESSION = {"user", "csrf_token"}
UTILS = set(['DATETIME_FORMAT', 'DATE_FORMAT', 'TIME_FORMAT', 'add_days', 'add_months', 'add_to_date', 'add_years', 'ceil', 'cint', 'comma_and', 'comma_or', 'comma_sep', 'compare', 'convert_utc_to_system_timezone', 'convert_utc_to_user_timezone', 'cstr', 'date_diff', 'encode', 'escape_html', 'evaluate_filters', 'expand_relative_urls', 'filter_strip_join', 'floor', 'flt', 'fmt_money', 'format_date', 'format_datetime', 'format_duration', 'format_time', 'formatdate', 'generate_hash', 'get_abbr', 'get_absolute_url', 'get_date_str', 'get_datetime', 'get_datetime_in_timezone', 'get_datetime_str', 'get_eta', 'get_filter', 'get_first_day', 'get_first_day_of_week', 'get_host_name', 'get_host_name_from_request', 'get_last_day', 'get_last_day_of_week', 'get_link_to_form', 'get_link_to_report', 'get_month', 'get_number_format_info', 'get_quarter_ending', 'get_quarter_start', 'get_system_timezone', 'get_time', 'get_time_str', 'get_time_zone', 'get_timedelta', 'get_timespan_date_range', 'get_timestamp', 'get_url', 'get_url_to_form', 'get_url_to_list', 'get_url_to_report', 'get_url_to_report_with_filters', 'get_user_date_format', 'get_user_info_for_avatar', 'get_user_time_format', 'get_weekday', 'get_weekdays', 'get_year_start', 'getdate', 'global_date_format', 'has_common', 'in_words', 'is_html', 'is_image', 'is_invalid_date_string', 'is_subset', 'make_filter_dict', 'make_filter_tuple', 'markdown', 'md_to_html', 'money_in_words', 'month_diff', 'new_line_sep', 'now', 'now_datetime', 'nowdate', 'nowtime', 'parse_val', 'pretty_date', 'quote_urls', 'quoted', 'remainder', 'round_based_on_smallest_currency_fraction', 'rounded', 'safe_div', 'sanitize_column', 'scrub_urls', 'strip', 'strip_html', 'time_diff', 'time_diff_in_hours', 'time_diff_in_seconds', 'to_markdown', 'to_timedelta', 'today', 'unique', 'url_contains_port'])
# Exception classes (for example PermissionError) are also added to frappe from frappe.exceptions.
BUILTINS = {
    "abs", "all", "any", "bool", "dict", "enumerate", "isinstance", "issubclass", "list", "max", "min",
    "range", "set", "sorted", "sum", "tuple",
    # RestrictedPython's safe_builtins
    "callable", "chr", "complex", "divmod", "float", "hash", "hex", "id", "int", "len", "oct", "ord",
    "pow", "repr", "round", "slice", "str", "zip", "None", "True", "False", "Exception", "ValueError",
    "TypeError", "KeyError", "IndexError", "AttributeError", "ZeroDivisionError", "frozenset",
    "reversed", "map", "filter", "bytes", "bytearray", "type", "object",
}


def frappe_paths(tree):
    paths = set()
    for node in ast.walk(tree):
        if not isinstance(node, ast.Attribute):
            continue
        chain = []
        current = node
        while isinstance(current, ast.Attribute):
            chain.append(current.attr)
            current = current.value
        if isinstance(current, ast.Name) and current.id == "frappe":
            paths.add(tuple(reversed(chain)))
    return paths


def problems(source):
    tree = ast.parse(source)
    found = []
    for path in sorted(frappe_paths(tree)):
        top = path[0]
        if top in FRAPPE:
            for sub, allowed in (("db", DB), ("utils", UTILS), ("session", SESSION)):
                if top == sub and len(path) > 1 and path[1] not in allowed:
                    found.append("frappe." + ".".join(path[:2]))
        elif not top[:1].isupper():
            found.append("frappe." + top)
    for node in ast.walk(tree):
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            found.append("import")
        if isinstance(node, ast.AugAssign):
            found.append("augmented assignment at line " + str(node.lineno))
        if isinstance(node, ast.Delete):
            found.append("del at line " + str(node.lineno))
        if isinstance(node, ast.Attribute) and (node.attr in ("format", "format_map") or node.attr.startswith("_")):
            found.append("attribute " + node.attr + " at line " + str(node.lineno))
        if isinstance(node, ast.JoinedStr):
            found.append("f-string at line " + str(node.lineno))
    defined = {n.name for n in ast.walk(tree) if isinstance(n, ast.FunctionDef)}
    for node in ast.walk(tree):
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
            called = node.func.id
            if called not in defined and called in vars(builtins) and called not in BUILTINS:
                found.append(called + "() is not in the sandbox")
    return found


def test_scripts_use_only_the_sandbox():
    for path in CHECKED:
        assert problems(path.read_text(encoding="utf-8")) == [], path.name


def test_checker_catches_known_failures():
    assert problems("frappe.get_roles('x')") == ["frappe.get_roles"]
    assert problems("x += 1") == ["augmented assignment at line 1"]
    assert problems("frappe.utils.nope()") == ["frappe.utils.nope"]
    assert any("open()" in p for p in problems("open('x')"))
    assert problems("frappe.db.get_value('User', 'a', 'email')") == []
