# Simple Search Language

The module is a parser for complex search strings.

It allows deriving a structured representation from a serach string
that can contain complex operators. It is intended for sitations
where a complex query against a text field is inut as a string.

## Search Language representations

A query in this language has roughly this grammer:

    token = list | "-" token | text | Label text
    list  = "(" expr ")"
    expr  = token | token OR expr | token (AND) expr
    Label = (from: | to: | cc: | bcc: | subject:) text
    text  = "a-z"+ | '"' [^"]+ '"'

- The (AND) is implicit (but should maybe be explicit?)

## License

simple-search-language is licensed under a standard
3-clause BSD license -- see the `LICENSE`-file for details.
