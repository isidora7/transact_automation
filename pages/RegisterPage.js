const { BasePage } = require('./BasePage');

class RegisterPage extends BasePage {

    constructor(page) {
        super(page);
        this.firstNameInput = this.byLabel('First name');
        this.lastNameInput = this.byLabel('Last name');
        this.emailInput = this.byLabel('Email');
        this.passwordInput = this.byLabel('Password', { exact: true });
        this.confirmPasswordInput = this.byLabel('Confirm password');
        this.orgNameInput = this.byLabel('Organisation name');
        this.submitButton = this.byRole('button', { name: 'Create account' });
        this.errorMessage = this.$('.login-error');
        this.passwordMismatchHint = this.byText('Passwords do not match.');
        this.confirmationHeading = this.byRole('heading', { name: 'Confirm your email' });
        this.signInLink = this.byRole('link', { name: 'Sign in' });
    }

    async goto() {
        await super.goto('/register');
    }

    async register({ firstName, lastName, email, password, confirmPassword, orgName }) {
        await this.firstNameInput.fill(firstName);
        await this.lastNameInput.fill(lastName);
        await this.emailInput.fill(email);
        await this.passwordInput.fill(password);
        await this.confirmPasswordInput.fill(confirmPassword);
        await this.orgNameInput.fill(orgName);
        await this.submitButton.click();
    }

}
module.exports = { RegisterPage };
