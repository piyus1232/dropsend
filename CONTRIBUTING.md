## Commit and Branch Naming Conventions

To keep the project history clean and easy to understand, we follow consistent naming conventions for branches and commits.

### Branch Naming

Create a new branch for every feature, bug fix, documentation change, or other contribution. Avoid making changes directly on `main`.

Use the following format:

```text
<type>/<short-description>
```

#### Branch Types

| Type       | Use for                                          | Example                          |
| ---------- | ------------------------------------------------ | -------------------------------- |
| `feat`     | New features or functionality                    | `feat/add-dark-mode`             |
| `fix`      | Bug fixes                                        | `fix/login-validation`           |
| `refactor` | Code changes that don't add features or fix bugs | `refactor/auth-service`          |
| `docs`     | Documentation changes                            | `docs/update-contributing-guide` |
| `test`     | Adding or updating tests                         | `test/add-auth-tests`            |
| `chore`    | Maintenance and tooling changes                  | `chore/update-dependencies`      |
| `perf`     | Performance improvements                         | `perf/optimize-query`            |
| `build`    | Build system or dependency changes               | `build/update-vite-config`       |
| `ci`       | CI/CD configuration changes                      | `ci/add-github-actions`          |

#### Branch Naming Guidelines

* Use lowercase letters.
* Separate words with hyphens (`-`).
* Keep branch names short and descriptive.
* Use the appropriate type prefix.
* Do not use spaces or special characters.
* Avoid vague names such as `changes`, `update`, or `my-branch`.

**Good:**

```text
feat/add-user-profile
fix/invalid-date-validation
docs/setup-instructions
refactor/api-client
test/user-authentication
```

**Avoid:**

```text
feature
my-changes
new-stuff
Update
john-branch
```

---

### Commit Messages

We follow the **Conventional Commits** format for commit messages.

Use:

```text
<type>: <short-description>
```

For example:

```text
feat: add user profile page
fix: handle invalid authentication token
docs: update installation instructions
```

#### Commit Types

| Type       | Use for                                               | Example                                  |
| ---------- | ----------------------------------------------------- | ---------------------------------------- |
| `feat`     | Introduces a new feature                              | `feat: add password reset`               |
| `fix`      | Fixes a bug                                           | `fix: prevent duplicate form submission` |
| `docs`     | Documentation-only changes                            | `docs: add API usage examples`           |
| `refactor` | Code restructuring without changing behavior          | `refactor: simplify auth middleware`     |
| `test`     | Adding or modifying tests                             | `test: add validation tests`             |
| `chore`    | Maintenance tasks                                     | `chore: update dependencies`             |
| `perf`     | Performance improvements                              | `perf: reduce database queries`          |
| `build`    | Build system or dependency changes                    | `build: update node version`             |
| `ci`       | CI/CD changes                                         | `ci: add lint workflow`                  |
| `style`    | Formatting or styling changes that don't affect logic | `style: format api handlers`             |
| `revert`   | Reverts a previous commit                             | `revert: feat: add experimental cache`   |

#### Commit Message Guidelines

* Use the imperative mood: `add`, `fix`, `update`, not `added`, `fixed`, `updated`.
* Keep the subject short and descriptive.
* Start the description with a lowercase letter.
* Do not end the subject with a period.
* Keep each commit focused on a single logical change.

**Good:**

```text
feat: add email notifications
fix: handle expired sessions
docs: improve local setup guide
refactor: extract validation logic
test: add tests for webhook handler
```

**Avoid:**

```text
Fixed some bugs
updates
Added new feature.
changes
final changes
fix
```

### Scope (Optional)

For larger changes, a scope can be included:

```text
<type>(<scope>): <description>
```

Examples:

```text
feat(auth): add password reset
fix(api): handle missing request body
docs(contributing): update development setup
test(auth): add login tests
```

Scopes are optional. Use them when they make the commit easier to understand.

### Pull Requests

Pull requests should generally be created from a feature branch into `main`.

Example:

```text
feat/add-user-profile
        ↓
    Pull Request
        ↓
       main
```

Before opening a pull request:

1. Make sure your branch is up to date with `main`.
2. Run the project's tests and checks locally.
3. Make sure your changes are focused on the purpose of the branch.
4. Write a clear pull request title and description.
5. Link any relevant issues using GitHub's issue references.

A pull request title should follow the same Conventional Commits format as commit messages.

For example:

```text
feat: add user profile page
fix: handle expired authentication sessions
docs: improve contributing guide
```
