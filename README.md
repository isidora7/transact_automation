# Transact Automation

End-to-end test automation project for a web application used to manage trucking loads and dispatcher/driver workflows.

The test suite is built with **Playwright and JavaScript** and focuses on testing realistic business scenarios, authentication, role-based access, load management, driver workflows, document review, and cost approval processes.

## Key Features

- Page Object Model (POM) for reusable and maintainable test code
- Role-based testing for admin and dispatcher users
- Reusable authenticated sessions using Playwright `storageState`
- Multi-user end-to-end testing with isolated browser contexts
- Load creation and lifecycle workflow testing
- Driver portal testing through token-based access
- Cost approval and rejection workflow coverage
- BOL/POD document upload and review testing
- Authentication, session, and logout validation
- Cross-browser testing with Chromium, Firefox, and WebKit
- Playwright HTML and Allure test reporting
- Continuous integration with GitHub Actions
- Regression tests for discovered application defects

## Tech Stack

- **JavaScript** – test implementation
- **Playwright** – end-to-end browser automation
- **Node.js** – test project runtime
- **Page Object Model (POM)** – test architecture
- **Allure Report** – test reporting
- **Playwright HTML Report** – built-in execution reports
- **GitHub Actions** – continuous integration
- **dotenv** – environment variable management
- **Git & GitHub** – version control and repository management

## Project Structure

```text
transact_automation/
├── .github/
│   └── workflows/
│       └── playwright.yml
├── docs/
│   └── bugs/
├── pages/
│   ├── BasePage.js
│   ├── CreateLoadPage.js
│   ├── DashboardPage.js
│   ├── DriverPortalPage.js
│   ├── LoadDetailPanelPage.js
│   ├── LoginPage.js
│   └── OrganisationPage.js
├── scripts/
│   └── cleanupTestLoads.js
├── tests/
│   ├── dashboard/
│   ├── loads/
│   ├── login/
│   ├── register/
│   ├── session/
│   ├── auth.setup.js
│   └── authStorage.js
├── .env.sample
├── package.json
└── playwright.config.js
```

The project follows the Page Object Model pattern to separate page-specific locators and actions from test scenarios.

- `pages/` contains page objects and reusable UI interactions.
- `tests/` contains test specifications grouped by application functionality.
- `scripts/` contains supporting utilities such as test-data cleanup.
- `docs/bugs/` contains documentation for defects discovered during automated testing.
- `.github/workflows/` contains the GitHub Actions configuration for automated test execution.

## Test Coverage

### Authentication

- Successful login with valid credentials
- Invalid login attempts
- Required-field validation
- Redirect protection for unauthenticated users

### Session Management

- Logout functionality
- Verification that the session is cleared after logout
- Redirect of authenticated users away from the login page

### Role-Based Access

- Admin-specific navigation and functionality
- Dispatcher-specific access
- Verification that restricted functionality is not available to unauthorized roles

### Registration

- Registration page smoke testing
- Input and form validation
- Registration workflow coverage

### Load Management

- Load creation
- Required-field and form validation
- Load cancellation
- Load completion workflow
- Load status transitions

### Driver Portal

- Token-based driver portal access
- Driver access without application login
- Stop check-in and check-out workflows
- Interaction between driver and dispatcher sessions

### Cost Workflows

- Driver cost submission
- Dispatcher cost review and approval
- Cost rejection/decline scenarios
- Verification of cost status changes

### Document Workflows

- BOL/POD document upload
- Dispatcher document review
- Document approval
- Document rejection and resubmission
- Proof-photo review workflows

## Authentication Strategy

Authentication is handled through a dedicated Playwright setup project.

Instead of logging in before every test, the setup authenticates the required user roles once and saves their session state using Playwright `storageState`. The stored sessions are then reused by tests that require authenticated access.

Separate authentication states are maintained for:

- **Admin** – used for administrative and organization-level workflows
- **Dispatcher** – used for dispatcher-specific workflows

This approach reduces repeated login requests, improves test execution efficiency, and keeps authentication logic separate from individual test scenarios.

Tests that specifically verify login or logout behavior use fresh authentication flows instead of the shared stored sessions.

## Multi-User Testing

Some end-to-end scenarios require interaction between different users, such as a dispatcher and a driver.

Dispatcher workflows use an authenticated session, while driver interactions are executed in a separate browser context created with `browser.newContext()`. This provides an isolated session and simulates a driver accessing the portal independently through a token-based link.

This approach is used to test workflows such as:

- Dispatcher creates and manages a load
- Driver accesses the portal through a unique token
- Driver checks in and out at stops
- Driver submits costs or documents
- Dispatcher reviews and processes the submitted information

## Cross-Browser Testing

The test suite is configured to run across all three browser engines supported by Playwright:

- **Chromium**
- **Firefox**
- **WebKit**

Browser projects are defined in `playwright.config.js`, allowing the same test scenarios to be executed across different browser environments.

## Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/isidora7/transact_automation.git
cd transact_automation
```

### 2. Install dependencies

```bash
npm ci
```

### 3. Install Playwright browsers

```bash
npx playwright install
```

### 4. Configure environment variables

Create a `.env` file in the project root based on the provided `.env.sample` file.

The test suite uses environment variables for application URLs and test-user credentials. Sensitive values should be stored only in the local `.env` file and should never be committed to the repository.

## Running Tests

### Run the complete test suite

```bash
npx playwright test
```

### Run login tests

```bash
npm run test:login
```

### Run a specific test file

```bash
npx playwright test tests/loads/loadLifecycle.spec.js
```

### Run tests in headed mode

```bash
npx playwright test --headed
```

### Run Playwright UI mode

```bash
npx playwright test --ui
```

By default, the configured Playwright projects allow the test suite to run across Chromium, Firefox, and WebKit.

## Test Reports

The project supports both Playwright HTML reports and Allure reports for reviewing test execution results.

### Playwright HTML Report

After running the tests, open the Playwright report with:

```bash
npx playwright show-report
```

### Allure Report

Generate the Allure report:

```bash
npm run allure:generate
```

Open the generated report:

```bash
npm run allure:open
```

Or generate and open the report in one command:

```bash
npm run allure:report
```

Playwright tracing is also enabled on the first retry, providing additional debugging information for failed tests.

## Continuous Integration

The project includes a GitHub Actions workflow for automated Playwright test execution.

The CI workflow:

- Runs on pushes and pull requests to the `main` and `master` branches
- Installs Node.js dependencies
- Installs the required Playwright browsers
- Executes the automated test suite
- Uploads the Playwright HTML report as a workflow artifact

The workflow configuration is located in:

```text
.github/workflows/playwright.yml
```

Environment-specific values and credentials should be provided securely through CI configuration rather than committed to the repository.

## Defect Documentation

Defects discovered during automated testing are documented in the `docs/bugs/` directory.

The documentation includes information such as:

- Defect description and severity
- Steps and conditions required to reproduce the issue
- Expected and actual behavior
- Technical investigation notes
- Related automated regression coverage

When an application defect prevents an expected workflow from completing, the corresponding automated test can be retained as a regression guard until the issue is resolved.

## Project Status

This project is actively maintained as an end-to-end test automation project, with new scenarios and regression coverage added as the application evolves.