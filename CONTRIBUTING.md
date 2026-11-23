# Contributing to Ahsaan Labs

Thank you for helping. Good first contributions:

- Report a mistake or unclear explanation (open an issue).
- Suggest a new lab, with the topic and the example you would teach.
- Improve wording, accessibility or phone layout.
- Build a new lab in the same style.

## Style of a lab

- One operation per step, with the real numbers shown.
- Colour-paired operands, so learners see which values are multiplied.
- Concepts explained before the calculation, in plain English, with formulas in LaTeX.
- A custom tab, so learners can change the example.
- Works offline as one HTML file (no frameworks).

## How to work

1. Fork the repo and create a branch.
2. Edit files in `src/` (never edit `dl/*.html` by hand), then run `python src/build.py <lab>`.
3. Check the lab in your browser and compare your numbers against a small Python reference.
4. Open a pull request and describe what you changed.
