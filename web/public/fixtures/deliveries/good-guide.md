# Contributor guide

## Set up the project
1. Clone the repository: `git clone https://github.com/example/harbor.git`.
2. Install Python 3.12 and run `pip install -r requirements-dev.txt`.
3. Copy `.env.example` to `.env` and fill in the two API keys described in the README.

## Run the tests
1. From the repository root run `python3 -m pytest -q`.
2. All tests must pass before you push; a failing test lists the file and line.
3. To run one file use `python3 -m pytest tests/test_api.py -q`.

## Open a pull request
1. Create a branch: `git checkout -b fix/short-description`.
2. Push it and open a pull request against `main` with a one-paragraph summary.
3. Link the issue it closes and wait for the CI checks; a maintainer reviews within two days.
